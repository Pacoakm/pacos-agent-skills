#!/usr/bin/env python3
"""Verify an exported PeerPath reel before calling it delivered.

    verify_export.py FILE [--expect hdr|sdr] [--frames 1325] [--source A-ROLL ...]
                          [--sheet OUT.png --at 60,260,740,1290 | --every 3]

Checks, with what each one caught before:
  format    codec / profile / bit depth / fps / size; with --expect hdr it must be HEVC Main 10,
            hvc1, BT.2020 + ARIB STD-B67 (HLG). Palmier's MCP H.265 export silently gives 8-bit
            BT.709 in .mp4 — not the "HEVC 10-bit HDR" the user picks in the export dialog.
  frames    exact count against the timeline (--frames), so a wrong preset can't slip through.
  loudness  integrated LUFS and true peak: the reels ship at ≈ −15 LUFS, TP ≤ −1 dBTP
            (Antony −14.9 / −3.3). Alex went out at the camera's −27 LUFS.
  black     blackdetect runs — a black A-roll (HEVC Main 10 in Palmier) or a gap.
  hdr peak  10-bit HLG: graphics should sit near reference white (Y ≈ 726/1023), not at peak.
  sources   byte-compares against each --source: an export once overwrote `antony.mp4`, and the
            next master rendered the finished reel through the timeline again (doubled captions).
  sheet     exact-frame contact sheet (select=eq(n,N) — `-ss` returns a keyframe) to look at and
            to send the user.
Exit 1 on any FAIL. Dependencies: ffmpeg/ffprobe + Pillow.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import tempfile
from fractions import Fraction
from pathlib import Path


def ffprobe(path: Path) -> dict:
    out = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def md5(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 22), b""):
            h.update(chunk)
    return h.hexdigest()


def loudness(path: Path) -> dict:
    text = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-map", "0:a:0",
                           "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    s = text[text.rfind("Summary:"):]
    g = lambda p: (lambda m: float(m.group(1)) if m else None)(re.search(p, s))
    return {"I": g(r"I:\s+(-?[\d.]+) LUFS"), "TP": g(r"Peak:\s+(-?[\d.]+) dBFS"), "LRA": g(r"LRA:\s+(-?[\d.]+) LU")}


def black_runs(path: Path) -> list[tuple[float, float]]:
    text = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vf",
                           "blackdetect=d=0.1:pix_th=0.08", "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    return [(float(a), float(b)) for a, b in re.findall(r"black_start:([\d.]+) black_end:([\d.]+)", text)]


def peak_luma(path: Path) -> float | None:
    text = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-vf",
                           "signalstats,metadata=print:key=lavfi.signalstats.YMAX", "-an", "-f", "null", "-"],
                          capture_output=True, text=True).stderr
    vals = [float(v) for v in re.findall(r"YMAX=([\d.]+)", text)]
    return max(vals) if vals else None


def sheet(path: Path, frames: list[int], out: Path, fps: float) -> None:
    from PIL import Image, ImageDraw
    tiles = []
    with tempfile.TemporaryDirectory() as tmp:
        for n in frames:
            png = Path(tmp) / f"{n}.png"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vf", f"select=eq(n\\,{n}),scale=360:-2",
                            "-vsync", "0", "-frames:v", "1", str(png)], check=True)
            if png.exists():
                tiles.append((n, Image.open(png).convert("RGB")))
    if not tiles:
        raise SystemExit("no frames extracted for the sheet")
    cols = min(6, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    tw, th = tiles[0][1].size
    im = Image.new("RGB", (cols * tw, rows * (th + 26)), "white")
    d = ImageDraw.Draw(im)
    for i, (n, t) in enumerate(tiles):
        x, y = (i % cols) * tw, (i // cols) * (th + 26)
        im.paste(t, (x, y + 26))
        d.text((x + 6, y + 6), f"f{n}  {n / fps:.2f}s", fill="black")
    im.save(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", type=Path)
    ap.add_argument("--expect", choices=["hdr", "sdr"], help="the delivery class the user asked for")
    ap.add_argument("--frames", type=int, help="timeline length in frames")
    ap.add_argument("--source", nargs="*", type=Path, default=[], help="source files that must NOT equal the export")
    ap.add_argument("--lufs", type=float, default=-15.0)
    ap.add_argument("--sheet", type=Path, help="write an exact-frame contact sheet here")
    ap.add_argument("--at", help="comma-separated frame numbers for the sheet")
    ap.add_argument("--every", type=float, help="or one frame every N seconds")
    ap.add_argument("--skip-slow", action="store_true", help="skip blackdetect and peak-luma passes")
    args = ap.parse_args()

    res = {"FAIL": [], "WARN": [], "OK": []}
    add = lambda lvl, m: res[lvl].append(m)
    info = ffprobe(args.file)
    v = next((s for s in info["streams"] if s.get("codec_type") == "video"), None)
    a = next((s for s in info["streams"] if s.get("codec_type") == "audio"), None)
    if not v:
        print(f"FAIL  {args.file}: no video stream")
        return 1
    fps = float(Fraction(v.get("r_frame_rate", "30/1")))
    nb = int(v["nb_frames"]) if str(v.get("nb_frames", "")).isdigit() else round(float(info["format"]["duration"]) * fps)
    trc, prim = v.get("color_transfer"), v.get("color_primaries")
    tenbit = "10" in v.get("pix_fmt", "")
    desc = (f"{v.get('codec_name')} {v.get('profile')} [{v.get('codec_tag_string')}] {v.get('pix_fmt')} "
            f"{v.get('width')}×{v.get('height')} @ {fps:g} · {nb} frames · {prim}/{trc}")
    add("OK", desc)
    if (v.get("width"), v.get("height")) != (1080, 1920):
        add("FAIL", f"{v.get('width')}×{v.get('height')} — reels deliver 1080×1920")
    if abs(fps - 30) > 0.01:
        add("FAIL", f"{fps:g} fps — the timeline is 30")
    if args.frames is not None and nb != args.frames:
        add("FAIL", f"{nb} frames, timeline has {args.frames}")
    if args.expect == "hdr":
        want = (v.get("codec_name") == "hevc" and tenbit and v.get("codec_tag_string") == "hvc1"
                and prim == "bt2020" and trc == "arib-std-b67")
        if not want:
            add("FAIL", "not HEVC Main 10 hvc1 BT.2020/HLG — the MCP H.265 export is 8-bit BT.709; use the ProRes master"
                        " + x265 route (picture-and-delivery.md)")
        if args.file.suffix.lower() != ".mov":
            add("WARN", "HDR preset the user chose is QuickTime .mov")
    elif args.expect == "sdr":
        if trc not in ("bt709", None) or tenbit:
            add("FAIL", f"SDR expected, got {v.get('pix_fmt')} {prim}/{trc}")
    if trc in ("arib-std-b67", "smpte2084") and not tenbit:
        add("FAIL", "HDR transfer on 8-bit video — banding; HDR must be 10-bit end to end")

    if a:
        L = loudness(args.file)
        add("OK", f"audio {a.get('codec_name')} {a.get('sample_rate')} Hz · {L['I']} LUFS · TP {L['TP']} · LRA {L['LRA']}")
        if L["I"] is not None and abs(L["I"] - args.lufs) > 1.5:
            add("WARN", f"integrated {L['I']} LUFS, house level ≈ {args.lufs} (voice stem ≈ −15, bed 12–18 LU under)")
        if L["TP"] is not None and L["TP"] > -1.0:
            add("FAIL", f"true peak {L['TP']} dBTP > −1 — will clip after platform encoding")
    else:
        add("FAIL", "no audio stream")

    if not args.skip_slow:
        runs = black_runs(args.file)
        if runs:
            add("FAIL" if any(e - s > 0.5 for s, e in runs) else "WARN",
                "black runs at " + ", ".join(f"{s:.2f}–{e:.2f}s" for s, e in runs[:6]))
        if tenbit and trc == "arib-std-b67":
            y = peak_luma(args.file)
            if y is not None:
                lvl = "WARN" if y > 900 else "OK"
                add(lvl, f"HLG peak luma Y={y:.0f}/1023 (reference white ≈ 726; graphics above ~900 glare on HDR phones)")

    for src in args.source:
        if not src.exists():
            add("WARN", f"source {src} missing — the Palmier project references it in place")
            continue
        if src.resolve() == args.file.resolve():
            add("FAIL", f"the export IS the source path {src}")
        elif src.stat().st_size == args.file.stat().st_size and md5(src) == md5(args.file):
            add("FAIL", f"byte-identical to source {src} — an export has overwritten a source; restore it before any re-render")
        else:
            add("OK", f"differs from source {src.name}")

    if args.sheet:
        if args.at:
            frames = [int(x) for x in args.at.split(",") if x.strip()]
        else:
            step = max(1, round((args.every or 3.0) * fps))
            frames = list(range(step // 2, nb, step))
        sheet(args.file, [f for f in frames if 0 <= f < nb], args.sheet, fps)
        add("OK", f"contact sheet → {args.sheet} ({len(frames)} frames)")

    for lvl in ("FAIL", "WARN", "OK"):
        for m in res[lvl]:
            print(f"{lvl:4}  {m}")
    return 1 if res["FAIL"] else 0


if __name__ == "__main__":
    sys.exit(main())
