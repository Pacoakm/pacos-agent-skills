"""Run the skill's final quality gate, with a log the dashboard can tail.

`verify_master.py` measures rather than assumes — duration, dimensions, frame
rate, frame count, codec, black frames, shot-boundary continuity, per-scene
frame counts, subtitle rate. It decodes every frame to do it, so on a 1080p60
master it takes minutes. Run as a job, not as a request that hangs.

    python3 tools/verify.py                    # picture-subbed.mp4, no audio yet
    python3 tools/verify.py --master out/final.mp4 --require-audio
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import project as P                                            # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--master", default="")
    ap.add_argument("--require-audio", action="store_true")
    a = ap.parse_args()

    root = P.root()
    plan = P.plan(root)
    out = P.out_dir(root)
    master = root / (a.master or ("out/final.mp4"
                                  if (out / "final.mp4").exists()
                                  else "out/picture-subbed.mp4"))
    if not master.exists():
        print(f"no {master.name} yet — render the master first", flush=True)
        return 1

    script = P.skill_scripts() / "verify_master.py"
    if not script.exists():
        print("verify_master.py is not in the skill scripts", flush=True)
        return 1

    # the scene folder for per-scene frame counts, taken from the plan's format
    _, folder = P.quality("master", root)
    mods = {P.scene_modules(root).get(s["manimScene"]) for s in plan["shots"]}
    scene_dir = None
    for m in sorted(x for x in mods if x):
        d = root / "media" / "videos" / m / folder
        if d.exists():
            scene_dir = d
            break

    cmd = [sys.executable, str(script), "--plan", "video-plan.json",
           "--master", str(master.relative_to(root))]
    if scene_dir:
        cmd += ["--scene-dir", str(scene_dir.relative_to(root))]
    if a.require_audio:
        cmd.append("--require-audio")

    started = time.time()
    print(f"{plan['title']}", flush=True)
    print(f"verifying {master.name}"
          + (f" against {scene_dir.name} scenes" if scene_dir else ""), flush=True)
    print("decoding every frame — minutes, not seconds\n", flush=True)

    stage = out / "jobs"
    stage.mkdir(exist_ok=True)
    (stage / "verify-stage.json").write_text(
        f'{{"stage": "running", "at": {time.time()}}}', encoding="utf-8")

    p = subprocess.Popen(cmd, cwd=str(root), stdout=subprocess.PIPE,
                         stderr=subprocess.STDOUT, text=True, bufsize=1)
    for line in p.stdout:
        print(line.rstrip(), flush=True)
    p.wait()

    (stage / "verify-stage.json").write_text(
        f'{{"stage": "done", "ok": {str(p.returncode == 0).lower()}, '
        f'"at": {time.time()}}}', encoding="utf-8")
    print(f"\n{'PASS' if p.returncode == 0 else 'FAIL'} in {time.time() - started:.0f}s",
          flush=True)
    return p.returncode


if __name__ == "__main__":
    raise SystemExit(main())
