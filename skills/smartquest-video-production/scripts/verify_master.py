#!/usr/bin/env python3
"""Final quality gate for a SmartQuest master.

    python3 verify_master.py --plan video-plan.json --master out/final.mp4 \
        [--scene-dir media/videos/script/1080p60] [--require-audio]

Measures rather than assumes. Every check prints what it actually found, and the
exit code is non-zero if anything fails, so it can gate a delivery.

Checks
  1. duration, dimensions, fps, frame count, codec against the plan
  2. an audio stream exists (only with --require-audio; the picture master has none)
  3. no black frames
  4. scene-boundary continuity — the last frame of each shot against the first
     frame of the next. A jump here means a scene rebuilt the previous figure but
     not the previous on-screen text. It is invisible at draft resolution.
  5. per-scene frame counts, if --scene-dir is given

Needs ffprobe and ffmpeg. Pillow is used for the boundary comparison; if it is
missing that check is skipped and says so.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

OK, BAD = "  ok  ", " FAIL "


def probe(path: str, entries: str, stream: bool = True) -> dict:
    cmd = ["ffprobe", "-v", "error"]
    if stream:
        cmd += ["-select_streams", "v:0"]
    cmd += ["-show_entries", entries, "-of", "default=nw=1", str(path)]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    return dict(l.split("=", 1) for l in out.strip().splitlines() if "=" in l)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--master", required=True)
    ap.add_argument("--scene-dir")
    ap.add_argument("--require-audio", action="store_true")
    args = ap.parse_args()

    plan = json.loads(Path(args.plan).read_text())
    master = Path(args.master)
    if not master.is_file():
        print(f"{BAD} master not found: {master}")
        return 1

    failures = 0

    def check(label: str, good: bool, detail: str) -> None:
        nonlocal failures
        if not good:
            failures += 1
        print(f"{OK if good else BAD} {label:<26} {detail}")

    # ---------------------------------------------------------- container --
    v = probe(master, "stream=codec_name,width,height,r_frame_rate,nb_frames,pix_fmt")
    f = probe(master, "format=duration,nb_streams", stream=False)
    want_frames = int(round(plan["durationSeconds"] * plan["fps"]))
    dur = float(f.get("duration", 0))
    frames = int(v.get("nb_frames", 0))

    print(f"\n{master}")
    check("duration", abs(dur - plan["durationSeconds"]) < 0.02,
          f'{dur:.6f}s (plan {plan["durationSeconds"]:.3f}s)')
    check("dimensions", (int(v.get("width", 0)), int(v.get("height", 0)))
          == (plan["width"], plan["height"]),
          f'{v.get("width")}x{v.get("height")} (plan {plan["width"]}x{plan["height"]})')
    check("frame rate", v.get("r_frame_rate") == f'{plan["fps"]}/1',
          f'{v.get("r_frame_rate")} (plan {plan["fps"]})')
    check("frame count", frames == want_frames, f"{frames} (expected {want_frames})")
    check("pixel format", v.get("pix_fmt") == "yuv420p",
          f'{v.get("pix_fmt")} — yuv420p is required for wide playback')

    if args.require_audio:
        a = probe(master, "stream=codec_name,channels,sample_rate", stream=False)
        has = int(f.get("nb_streams", 1)) >= 2
        check("audio stream", has, "present" if has else
              "MISSING — the teacher's recording has not been muxed")

    # ------------------------------------------------------- black frames --
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(master),
                        "-vf", "blackdetect=d=0.1:pix_th=0.05", "-an", "-f", "null", "-"],
                       capture_output=True, text=True)
    blacks = [l for l in r.stderr.splitlines() if "black_start" in l]
    check("black frames", not blacks, "none" if not blacks else f"{len(blacks)} stretch(es)")

    # ------------------------------------------------ boundary continuity --
    try:
        from PIL import Image, ImageStat
    except ImportError:
        print("  skip  boundary continuity     Pillow not installed")
    else:
        with tempfile.TemporaryDirectory() as td:
            def luma(ts: float, name: str) -> float:
                p = Path(td) / f"{name}.png"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{ts:.6f}",
                                "-i", str(master), "-frames:v", "1", str(p)], check=True)
                return ImageStat.Stat(Image.open(p).convert("L")).mean[0]

            worst, where = 0.0, None
            step = 1.0 / plan["fps"]
            for shot in plan["shots"][:-1]:
                t = shot["end"]
                d = abs(luma(t - step, "a") - luma(t, "b"))
                if d > worst:
                    worst, where = d, shot["id"]
            check("boundary continuity", worst < 0.5,
                  f"largest jump {worst:.2f} luma at {where} "
                  f"(>0.5 means a scene dropped content at the cut)")

    # ------------------------------------------------------- per-scene ----
    if args.scene_dir:
        d = Path(args.scene_dir)
        total = 0
        for shot in plan["shots"]:
            clip = d / f'{shot["manimScene"]}.mp4'
            if not clip.is_file():
                check(f'scene {shot["id"]}', False, f"missing {clip}")
                continue
            n = int(probe(clip, "stream=nb_frames").get("nb_frames", 0))
            want = int(round((shot["end"] - shot["start"]) * plan["fps"]))
            total += n
            check(f'scene {shot["id"]}', n == want, f"{n} frames (expected {want})")
        check("scene total", total == want_frames, f"{total} (expected {want_frames})")

    # ---------------------------------------------------------- narration --
    st = plan.get("narration", {}).get("status")
    if st and st != "audio-received" and args.require_audio:
        check("narration status", False,
              f'plan says "{st}" — do not deliver before the recording exists')

    print(f'\n{"all checks passed" if not failures else f"{failures} check(s) FAILED"}')
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
