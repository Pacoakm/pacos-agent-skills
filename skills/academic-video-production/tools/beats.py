"""Every beat of the video on one page.

The slow part of this job is not rendering, it is LOOKING. Finding "the label
appeared two beats early" meant scrubbing a 12-minute file; five of today's
faults were found that way, one at a time.

This pulls one still per planned beat out of `out/draft.mp4` and tiles them into
contact sheets, captioned with the shot, the plan time and what the beat is
supposed to show. The whole lesson becomes a few pages you can scan in a minute.

Beats come from `video-plan.json`: each shot's `beats[]`, plus the first frame
of every shot, plus the moment each subtitle cue starts (with `--subs`).

    python3 tools/beats.py                 # shot starts + declared beats
    python3 tools/beats.py --subs          # every subtitle cue too
    python3 tools/beats.py --shots S13,S14 # just those
    python3 tools/beats.py --video out/picture-subbed.mp4

Frames come from a file that already exists, so this costs seconds. It does not
render — if the draft is older than `src/`, it says so and stops.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
COLS, THUMB_W = 4, 420
PAD, LABEL_H = 10, 34


def beat_list(plan, want_shots, with_subs):
    """(time, shot id, one line saying what should be on screen)."""
    out = []
    for s in plan["shots"]:
        if want_shots and s["id"] not in want_shots:
            continue
        out.append((s["start"] + 0.05, s["id"], "opens: " + (s.get("visual") or "")))
        for b in s.get("beats") or []:
            out.append((float(b["at"]) + 0.3, s["id"],
                        b.get("figure") or b.get("line") or "beat"))
        if with_subs:
            for c in s.get("subtitles") or []:
                out.append((float(c["start"]) + 0.3, s["id"], "“" + c["text"] + "”"))
        out.append((s["end"] - 0.1, s["id"], "closes"))
    return sorted(out, key=lambda r: r[0])


def grab(video, t, dest):
    r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{t:.3f}",
                        "-i", str(video), "-frames:v", "1", "-y", str(dest)])
    return r.returncode == 0 and dest.exists()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", default="out/draft.mp4")
    ap.add_argument("--shots", default="")
    ap.add_argument("--subs", action="store_true")
    ap.add_argument("--out", default="out/beats")
    ap.add_argument("--per-page", type=int, default=12)
    a = ap.parse_args()

    video = ROOT / a.video
    if not video.exists():
        print(f"no {a.video} — render a draft first")
        return 1
    newest_src = max(f.stat().st_mtime for f in (ROOT / "src").glob("*.py"))
    if video.stat().st_mtime < newest_src:
        print(f"{a.video} is older than src/ — re-render before trusting these stills")

    plan = json.loads((ROOT / "video-plan.json").read_text(encoding="utf-8"))
    want = {x.strip() for x in a.shots.split(",") if x.strip()}
    beats = beat_list(plan, want, a.subs)
    if not beats:
        print("no beats matched")
        return 1

    tmp = ROOT / "out" / ".beats-tmp"
    tmp.mkdir(parents=True, exist_ok=True)
    outdir = ROOT / a.out
    outdir.mkdir(parents=True, exist_ok=True)

    tiles = []
    for i, (t, sid, what) in enumerate(beats):
        f = tmp / f"{i:03d}.png"
        if not grab(video, t, f):
            continue
        tiles.append((Image.open(f), sid, t, what))

    pages, per = [], a.per_page
    for start in range(0, len(tiles), per):
        chunk = tiles[start:start + per]
        rows = (len(chunk) + COLS - 1) // COLS
        w0, h0 = chunk[0][0].size
        th = round(THUMB_W * h0 / w0)
        W = COLS * (THUMB_W + PAD) + PAD
        H = rows * (th + LABEL_H + PAD) + PAD
        page = Image.new("RGB", (W, H), (16, 18, 24))
        d = ImageDraw.Draw(page)
        for j, (im, sid, t, what) in enumerate(chunk):
            r, c = divmod(j, COLS)
            x = PAD + c * (THUMB_W + PAD)
            y = PAD + r * (th + LABEL_H + PAD)
            page.paste(im.resize((THUMB_W, th)), (x, y))
            d.rectangle([x, y, x + THUMB_W, y + th], outline=(60, 66, 82))
            head = f"{sid}  {t:.1f}s"
            d.text((x + 3, y + th + 3), head, fill=(200, 210, 235))
            d.text((x + 3, y + th + 17), what[:66], fill=(140, 150, 175))
        p = outdir / f"beats-{start // per + 1:02d}.png"
        page.save(p)
        pages.append(p)

    for f in tmp.glob("*.png"):
        f.unlink()
    tmp.rmdir()
    print(f"{len(tiles)} beats -> {len(pages)} sheet(s)")
    for p in pages:
        print("  " + str(p.relative_to(ROOT)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
