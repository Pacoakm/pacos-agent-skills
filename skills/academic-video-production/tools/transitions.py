"""Join scenes that do not match, without making the scenes match.

Scenes are rendered separately and concatenated, so every join is a hard cut and
the author has to end shot A on shot B's opening frame. That is real work, and
it is the wrong work: whether two shots dissolve or cut is an editing decision,
not something the mathematics should bend around.

Declare it in `video-plan.json`, on the shot being joined TO:

    {"id": "S11", "join": "dissolve"}                 picture into picture
    {"id": "S12", "join": "dissolve", "joinSeconds": 0.4}
    {"id": "S14", "join": "cut"}                      must be continuous (default)

## How a dissolve keeps the timeline exact

A cross-dissolve normally overlaps two clips, so the film comes out SHORTER than
the plan by the length of every transition. In a pipeline where video time IS
plan time — the subtitle sidecar, the beat review, every timecode in a note —
that is not a trade worth making.

So the dissolve does not overlap. It fades the **first frame of the incoming
shot**, as a still, up over the tail of the outgoing one. At the cut the picture
already equals that frame, and the incoming shot carries on from it. No frame is
consumed, the length does not move, and there is no dip to black — two white
scenes dissolve white to white.

The one cost: during those few frames the incoming shot is frozen on its opening
image. Scenes open on a static build, so at 6 frames it does not read as a
freeze. Raise `joinSeconds` and it will.

    python3 tools/transitions.py --dry-run
    python3 tools/transitions.py --video out/draft.mp4
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import project as P                                            # noqa: E402

# Seconds, not frames. A count of frames means one thing in the 60 fps master
# and another in the 15 fps draft — 6 frames became one and a half, too short to
# see or to measure. A dissolve is a length of TIME.
DEFAULT_SECONDS = 0.25


def joins(plan):
    """[(at, seconds, outgoing id, incoming id)] for every declared dissolve."""
    fps = plan.get("fps", 60)
    shots, out = plan["shots"], []
    for prev, s in zip(shots, shots[1:]):
        kind = (s.get("join") or "cut").lower()
        if kind == "cut":
            continue
        if kind not in ("dissolve", "fade"):
            raise SystemExit(f'{s["id"]}: join must be "cut" or "dissolve"')
        d = float(s.get("joinSeconds") or DEFAULT_SECONDS)
        if d * fps < 2:
            raise SystemExit(f'{s["id"]}: joinSeconds {d} is under two frames')
        out.append((float(s["start"]), d, prev["id"], s["id"]))
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", default="out/draft.mp4")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    root, plan = P.root(), None
    plan = P.plan(root)
    src = root / a.video
    if not src.exists():
        print(f"no {a.video} — stitch it first")
        return 1

    js = joins(plan)
    if not js:
        print("no shot declares join: dissolve — nothing to do")
        return 0
    for at, d, out_id, in_id in js:
        print(f"  {at:8.3f}s  {out_id} dissolves into {in_id} over {d:.3f}s")
    if a.dry_run:
        return 0

    tmp = Path(tempfile.mkdtemp(prefix="transitions-"))
    try:
        # the still each dissolve lands on: the incoming shot's own first frame
        stills = []
        for i, (at, d, _, in_id) in enumerate(js):
            png = tmp / f"{i}.png"
            subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{at:.4f}",
                            "-i", str(src), "-frames:v", "1", "-y", str(png)],
                           check=True)
            stills.append(png)

        parts, inputs, cursor = [], [], 0.0
        for i, (at, d, _, _) in enumerate(js):
            start = max(0.0, at - d)
            parts.append(f"[0:v]trim=start={cursor:.4f}:end={start:.4f},"
                         f"setpts=PTS-STARTPTS[p{i}]")
            parts.append(f"[0:v]trim=start={start:.4f}:end={at:.4f},"
                         f"setpts=PTS-STARTPTS[t{i}]")
            # alpha ramps with the segment's own clock, so the blend is linear
            parts.append(f"[{i+1}:v]format=yuv420p[s{i}]")
            parts.append(f"[t{i}][s{i}]blend=all_expr='A*(1-T/{d:.4f})"
                         f"+B*(T/{d:.4f})'[m{i}]")
            inputs += ["-loop", "1", "-t", f"{d:.4f}", "-i", str(stills[i])]
            cursor = at
        parts.append(f"[0:v]trim=start={cursor:.4f},setpts=PTS-STARTPTS[tail]")
        order = "".join(f"[p{i}][m{i}]" for i in range(len(js))) + "[tail]"
        parts.append(f"{order}concat=n={2 * len(js) + 1}:v=1:a=0[v]")

        dest = tmp / "out.mp4"
        cmd = (["ffmpeg", "-nostdin", "-y", "-i", str(src)] + inputs
               + ["-filter_complex", ";".join(parts), "-map", "[v]",
                  "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                  "-pix_fmt", "yuv420p", str(dest)])
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode:
            print(r.stderr.strip().splitlines()[-1])
            return 1

        def secs(f):
            return float(subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "csv=p=0", str(f)], capture_output=True, text=True).stdout)
        before, after = secs(src), secs(dest)
        if abs(before - after) > 0.02:
            print(f"REFUSED: length changed {before:.3f}s -> {after:.3f}s — "
                  "a transition must never move the timeline")
            return 1
        shutil.copy2(dest, src)
        print(f"\n{len(js)} dissolve(s) applied to {a.video}, still {after:.3f}s")
        return 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
