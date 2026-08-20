"""Render a video project — draft or master — and leave the result in out/.

Replaces the two shell scripts, which hardcoded this lesson's module names and
one machine's paths. Everything here comes from `video-plan.json` and from the
source, so the same command serves any SmartQuest lesson.

    python3 tools/render.py draft                 # 480p15  -> out/draft.mp4
    python3 tools/render.py master                # 1080p60 -> out/master.mp4
    python3 tools/render.py draft --scenes S07,S09
    python3 tools/render.py master --no-captions  # picture only

`master` also renders the transparent caption track from `src/captions.py` and
burns it on, when the plan asks for it (`captions.burnedIn`).

Only scenes whose file is older than `src/` are rendered unless you pass
`--all`; a re-render of two scenes then stitches against the other sixteen.
"""
from __future__ import annotations

import argparse
import atexit
import concurrent.futures as cf
import json
import os
import shutil
import re
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import project as P                                            # noqa: E402


QUAL = ["draft"]        # set once from argv; the retry needs it
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]|\x1b\]8;[^\x07\x1b]*(\x07|\x1b\\)")


def log(msg):
    """Plain text only — this goes to a file the dashboard tails, and manim's
    rich output turns into unreadable escape soup there."""
    print(ANSI.sub("", str(msg)).rstrip(), flush=True)


def newest_source(root):
    m = max(f.stat().st_mtime for f in (root / "src").glob("*.py"))
    poses = root / "tools" / "camera-poses.json"
    if poses.exists():
        m = max(m, poses.stat().st_mtime)
    return m


def manim_env():
    env = dict(os.environ)
    extra = [str(P.skill_scripts())]
    tex = Path.home() / "Library/TinyTeX/bin/universal-darwin"
    env["PYTHONPATH"] = os.pathsep.join(extra + [env.get("PYTHONPATH", "")])
    env["PATH"] = os.pathsep.join(["/opt/homebrew/bin", str(tex), env.get("PATH", "")])
    return env


def worker_config(root, i):
    """A private Tex and text cache for one worker.

    Manim caches both by content hash under `media/`. Two workers needing the
    same uncached string race on the same filename — one deletes an
    intermediate the other is about to read, and that worker dies mid-render.
    Warming the cache first helps and does not close it. Separate caches do.
    `video_dir` still comes from --media_dir, so the mp4s land where they belong.
    """
    d = root / "media" / f".worker{i}"
    d.mkdir(parents=True, exist_ok=True)
    cfg = d / "manim.cfg"
    cfg.write_text(f"[CLI]\ntex_dir = {d / 'Tex'}\ntext_dir = {d / 'texts'}\n",
                   encoding="utf-8")
    return cfg


def run_manim(root, module, scenes, flag, env, tag="", config=None):
    cmd = [sys.executable, "-m", "manim", flag, "--media_dir", "./media"]
    if config:
        cmd += ["--config_file", str(config)]
    cmd += [f"src/{module}.py", *scenes]
    p = subprocess.Popen(cmd, cwd=str(root), env=env, stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True, bufsize=1)
    bad = []
    for line in p.stdout:
        s = ANSI.sub("", line).strip()
        if "Rendered" in s:
            log(f"  {tag}rendered " + s.split("Rendered")[-1].strip())
        elif "Error" in s or "error:" in s:
            bad.append(s)
            log(f"  {tag}! " + s[:400])
    p.wait()
    return p.returncode, bad


def warm_tex(root, tasks, env):
    """Build every LaTeX string this run needs, single-threaded, first.

    Manim caches Tex by content hash in `media/Tex`, writing `.tex`, running
    latex, then deleting the intermediates. Two workers that need the SAME
    uncached string race: one removes the `.dvi` the other is about to read, and
    that worker dies with `FileNotFoundError` halfway through the render.

    `-s` runs the whole `construct` and only skips writing frames, so it creates
    every Tex the real render will ask for — in about a tenth of the time.

    Workers now hold private caches (`worker_config`), so this is no longer what
    keeps them from colliding; it is what stops four of them each compiling the
    same LaTeX from scratch.
    """
    tmp = root / "media" / ".warm"
    for mod, group in group_by_module([(m, s) for m, s in tasks]):
        subprocess.run([sys.executable, "-m", "manim", "-ql", "-s",
                        "--media_dir", "./media", f"src/{mod}.py", *group],
                       cwd=str(root), env=env, capture_output=True, text=True)
    shutil.rmtree(tmp, ignore_errors=True)
    shutil.rmtree(root / "media" / "images", ignore_errors=True)


def balance(tasks, jobs, plan):
    """Longest-processing-time first: the 84 s shot must not be last in line.

    Cost is the shot's own length — a 3D scene at 15 fps costs roughly its
    duration, and the spread across this lesson is 16 s to 84 s.
    """
    length = {s["manimScene"]: s["end"] - s["start"] for s in plan["shots"]}
    order = sorted(tasks, key=lambda t: -length.get(t[1], 30))
    buckets = [[] for _ in range(jobs)]
    load = [0.0] * jobs
    for mod, scene in order:
        i = load.index(min(load))
        buckets[i].append((mod, scene))
        load[i] += length.get(scene, 30)
    return [b for b in buckets if b], load


def render_parallel(root, tasks, flag, env, jobs, plan):
    """One manim process per worker, each taking its own disjoint scenes.

    They share `media/`, which is safe once the Tex cache is warm: two workers
    that need the same LaTeX string write identical bytes to the same hashed
    filename. Cold, they race, so the caller warms it first.
    """
    buckets, load = balance(tasks, jobs, plan)
    log(f"  {len(buckets)} worker(s), "
        + ", ".join(f"w{i+1}:{len(b)} scenes/{load[i]:.0f}s"
                    for i, b in enumerate(buckets)))
    failed = []

    def work(i, bucket):
        cfg = worker_config(root, i + 1)
        out = []
        for mod, group in group_by_module(bucket):
            code, bad = run_manim(root, mod, group, flag, env,
                                  tag=f"[w{i+1}] ", config=cfg)
            if code:
                out += bad or [f"w{i+1} {mod} exited {code}"]
        return out

    with cf.ThreadPoolExecutor(max_workers=len(buckets)) as ex:
        for r in cf.as_completed([ex.submit(work, i, b)
                                  for i, b in enumerate(buckets)]):
            failed += r.result()

    # A worker that died leaves its scenes unwritten. Anything still missing gets
    # one serial retry: a race that costs a slower render beats a failed one.
    missing = [(m, sc) for m, sc in tasks
               if not P.scene_file(sc, QUAL[0], root).exists()]
    if missing and failed:
        log(f"  retrying {len(missing)} scene(s) serially")
        failed = []
        for mod, group in group_by_module(missing):
            code, bad = run_manim(root, mod, group, flag, env, tag="[retry] ")
            if code:
                failed += bad or [f"{mod} exited {code}"]
    return failed


def group_by_module(bucket):
    out = {}
    for mod, scene in bucket:
        out.setdefault(mod, []).append(scene)
    return list(out.items())


def stitch(root, qual, dest, plan):
    files = []
    for s in plan["shots"]:
        f = P.scene_file(s["manimScene"], qual, root)
        if not f.exists():
            log(f"  missing {f.name} — cannot stitch")
            return None
        files.append(f.resolve())
    listing = P.out_dir(root) / f"concat-{qual}.txt"
    listing.write_text("\n".join(f"file '{f}'" for f in files) + "\n", encoding="utf-8")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-f", "concat", "-safe", "0",
                    "-i", str(listing), "-c", "copy", str(dest)],
                   check=True, capture_output=True)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                              "format=duration", "-of", "csv=p=0", str(dest)],
                             capture_output=True, text=True).stdout)
    want = plan["durationSeconds"]
    log(f"  {dest.name}  {d:.3f}s   plan {want}s   "
        + ("ok" if abs(d - want) < 0.05 else f"OFF BY {d - want:+.3f}s"))
    return dest


def soft_subs(root, picture, plan, env):
    """Mux the SRT in as a soft track — every draft carries its subtitles.

    Burned-in captions belong to the master only; a draft you can toggle is what
    the user reviews, and a draft with no subtitles at all hides half the work.
    """
    srt = root / (plan.get("captions", {}).get("sidecar") or "out/subtitles.srt")
    if not srt.exists():
        build = P.skill_scripts() / "build_captions.py"
        if build.exists():
            subprocess.run([sys.executable, str(build), "--plan", "video-plan.json",
                            "--out-dir", "src", "--srt", str(srt)],
                           cwd=str(root), env=env, capture_output=True, text=True)
    if not srt.exists():
        log("  no subtitle sidecar — draft goes out without a soft track")
        return picture
    dest = P.out_dir(root) / "draft.mp4"
    tmp = P.out_dir(root) / "draft-picture.mp4"
    picture.replace(tmp)
    r = subprocess.run(["ffmpeg", "-nostdin", "-y", "-i", str(tmp), "-i", str(srt),
                        "-c:v", "copy", "-c:s", "mov_text",
                        "-metadata:s:s:0", "language=zho",
                        "-disposition:s:0", "default", str(dest)],
                       capture_output=True, text=True)
    if r.returncode:
        tmp.replace(dest)
        log("  subtitle mux failed; draft has picture only")
        return dest
    streams = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "s",
                              "-show_entries", "stream=index", "-of", "csv=p=0",
                              str(dest)], capture_output=True, text=True).stdout
    log("  soft subtitle track: " + ("present" if streams.strip() else "MISSING"))
    return dest


def burn_captions(root, silent, plan, env):
    cap_src = root / "src" / "captions.py"
    if not cap_src.exists():
        log("  no src/captions.py — leaving the picture silent")
        return silent
    log("[captions] transparent track")
    w, h, fps = plan.get("width", 1920), plan.get("height", 1080), plan.get("fps", 60)
    subprocess.run([sys.executable, "-m", "manim", "-r", f"{w},{h}", "--fps", str(fps),
                    "-t", "--format=mov", "--media_dir", "./media",
                    "src/captions.py", "CaptionTrack"],
                   cwd=str(root), env=env, capture_output=True, text=True)
    hits = list((root / "media" / "videos" / "captions").rglob("CaptionTrack.mov"))
    if not hits:
        log("  caption track did not render — leaving the picture silent")
        return silent
    dest = P.out_dir(root) / "master.mp4"
    log("[captions] burning on")
    subprocess.run(["ffmpeg", "-nostdin", "-y", "-i", str(silent), "-i", str(hits[0]),
                    "-filter_complex", "[0:v][1:v]overlay=0:0:format=auto",
                    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
                    "-pix_fmt", "yuv420p", str(dest)], check=True, capture_output=True)
    return dest


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("quality", choices=["draft", "master"])
    ap.add_argument("--scenes", default="")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--no-captions", action="store_true")
    ap.add_argument("--no-stitch", action="store_true")
    ap.add_argument("--jobs", type=int, default=0,
                    help="parallel manim processes; 0 = auto, 1 = serial")
    a = ap.parse_args()

    root = P.root()
    plan = P.plan(root)
    flag, folder = P.quality(a.quality, root)
    env = manim_env()
    started = time.time()
    # per quality: a master run must not reset what the draft card measures
    (P.out_dir(root) / f".render-start-{a.quality}").write_text("", encoding="utf-8")

    # Claim the job file whatever started this run. The dashboard decides
    # "running" from it, so a render launched from a terminal used to show as
    # finished while it was still going — and a pid left behind by a job that
    # died showed as running. Owning it here makes both impossible.
    jobs = P.out_dir(root) / "jobs"
    jobs.mkdir(exist_ok=True)
    pidf = jobs / f"{a.quality}.pid"
    pidf.write_text(str(os.getpid()), encoding="utf-8")
    atexit.register(lambda: pidf.unlink(missing_ok=True))

    want = [x.strip() for x in a.scenes.split(",") if x.strip()] or \
           [s["manimScene"] for s in plan["shots"]]
    if not a.all and not a.scenes:
        cutoff = newest_source(root)
        todo = [s for s in want
                if not P.scene_file(s, a.quality, root).exists()
                or P.scene_file(s, a.quality, root).stat().st_mtime < cutoff]
    else:
        todo = want
    log(f"{plan['title']}")
    log(f"{a.quality}  {folder}  —  {len(todo)} of {len(want)} scenes need rendering")
    if not todo:
        log("  nothing to render")

    # 4 performance cores on this class of machine; manim uses one per process
    auto = max(1, min(4, (os.cpu_count() or 2) // 2))
    jobs = a.jobs or auto
    tasks = [(P.scene_modules(root).get(s, "?"), s) for s in todo]
    QUAL[0] = a.quality
    if jobs > 1 and len(tasks) > 1:
        log(f"[tex] warming the LaTeX cache before the workers start")
        warm_tex(root, tasks, env)
    failed = []
    if jobs > 1 and len(tasks) > 1:
        log(f"[render] {len(tasks)} scene(s) across {jobs} workers")
        failed = render_parallel(root, tasks, flag, env, jobs, plan)
    else:
        for mod, scenes in P.modules_for(todo, root).items():
            log(f"[{mod}] {len(scenes)} scene(s)")
            code, bad = run_manim(root, mod, scenes, flag, env)
            if code:
                failed += bad or [f"{mod} exited {code}"]

    if failed:
        log("\nRENDER FAILED")
        for f in failed[:10]:
            log("  " + f)
        return 1

    if a.no_stitch:
        log(f"\ndone in {time.time() - started:.0f}s (not stitched)")
        return 0

    log("[stitch]")
    dest = P.out_dir(root) / ("draft.mp4" if a.quality == "draft" else "master-silent.mp4")
    out = stitch(root, a.quality, dest, plan)
    if out is None:
        return 1
    if a.quality == "master" and not a.no_captions and \
            plan.get("captions", {}).get("burnedIn"):
        out = burn_captions(root, out, plan, env)
    elif a.quality == "draft" and not a.no_captions:
        out = soft_subs(root, out, plan, env)
    log(f"\ndone in {time.time() - started:.0f}s  ->  out/{out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
