"""Stitch the rendered scenes into out/draft.mp4, in plan order.

`render_draft.sh` does this inline after a full render. Pulled out here so a
re-render of a few scenes can be stitched without re-rendering the other
fourteen — which is most of the wall clock.

Refuses to stitch a stale set: every scene must exist, and none may be older
than the sources it was rendered from.

Run:  python3 tools/concat_draft.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    plan = json.loads((ROOT / "video-plan.json").read_text(encoding="utf-8"))
    src_mtime = max((ROOT / "src" / f).stat().st_mtime
                    for f in ("common.py", "part_a.py", "part_b.py",
                              "geometry.py", "captions.py"))
    poses = ROOT / "tools" / "camera-poses.json"
    if poses.exists():
        src_mtime = max(src_mtime, poses.stat().st_mtime)

    lines, stale, missing = [], [], []
    for s in plan["shots"]:
        mod = "part_a" if s["id"] <= "S06" else "part_b"
        f = ROOT / "media" / "videos" / mod / "480p15" / f"{s['manimScene']}.mp4"
        if not f.exists():
            missing.append(s["manimScene"])
            continue
        if f.stat().st_mtime < src_mtime:
            stale.append(s["manimScene"])
        lines.append(f"file '{f}'")

    if missing:
        print("missing renders: " + ", ".join(missing))
        return 1
    if stale:
        print("older than src/ or the poses file — re-render these first:")
        print("  " + " ".join(stale))
        return 1

    listing = ROOT / "out" / "concat-draft.txt"
    listing.parent.mkdir(exist_ok=True)
    listing.write_text("\n".join(lines) + "\n", encoding="utf-8")
    out = ROOT / "out" / "draft.mp4"
    r = subprocess.run(["ffmpeg", "-nostdin", "-y", "-f", "concat", "-safe", "0",
                        "-i", str(listing), "-c", "copy", str(out)],
                       capture_output=True, text=True)
    if r.returncode:
        print(r.stderr.strip().splitlines()[-1])
        return 1
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                          "format=duration", "-of", "csv=p=0", str(out)],
                         capture_output=True, text=True).stdout.strip()
    planned = plan["durationSeconds"]
    print(f"out/draft.mp4  {float(dur):.3f}s  (plan says {planned}s)  "
          f"{'ok' if abs(float(dur) - planned) < 0.05 else 'LENGTH MISMATCH'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
