#!/usr/bin/env python3
"""Source forensics for a PeerPath reel — what the file really is, before it goes into Palmier.

    probe_source.py FILE [FILE ...] [--loudness] [--md5] [--search DIR ...] [--json]

For every file it reports codec, bit depth, colour (SDR / HLG / PQ), frame rate, frame count,
audio format and, optionally, loudness and MD5. It then looks beside the file (and in any
--search directory) for a *same-length* video, because on the Antony reel the file we were
handed (`antony.mp4`, 8-bit SDR H.264 with AAC) was an HLG→SDR conversion of the real original
(`antony-raw.mov`, ProRes 10-bit HLG with 24-bit PCM) — and the grade had been stacked on top of
a conversion that already added contrast and saturation.

Flags it raises, each one met on a past reel:
  * HEVC Main 10 renders as black frames in Palmier (0824, Alex) — transcode first; the command
    printed depends on whether the source is HDR.
  * HDR source (HLG / PQ) — grade and deliver HDR end to end.
  * A same-length sibling with more bit depth, HDR, ProRes or PCM audio is the better original.
  * Two files with the same MD5 — an export has overwritten a source (Antony v7 → antony.mp4).
  * VFR, a non-9:16 canvas, rotation metadata, lossy low-bitrate audio.

Only ffprobe/ffmpeg are required. Exit status is 0 unless a file cannot be read.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from fractions import Fraction
from pathlib import Path

VIDEO_EXT = {".mov", ".mp4", ".m4v", ".mkv", ".mxf"}
EXPORT_HINT = re.compile(r"(reel-v\d|-master|export|-hdr\b|-sdr\b)", re.I)


def ffprobe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(out.stderr.strip() or f"ffprobe failed on {path}")
    return json.loads(out.stdout)


def bit_depth(stream: dict) -> int:
    raw = stream.get("bits_per_raw_sample")
    if raw and str(raw).isdigit():
        return int(raw)
    m = re.search(r"(9|10|12|14|16)(le|be)?$", stream.get("pix_fmt", ""))
    if m:
        return int(m.group(1))
    return 10 if stream.get("pix_fmt", "") in {"p010le", "p010be"} else 8


def colour_class(stream: dict) -> str:
    trc = (stream.get("color_transfer") or "").lower()
    if trc == "arib-std-b67":
        return "HDR (HLG)"
    if trc == "smpte2084":
        return "HDR (PQ/HDR10)"
    prim = (stream.get("color_primaries") or "").lower()
    if prim == "bt2020":
        return "wide-gamut, non-HDR transfer (check)"
    if not trc or trc == "unknown":
        return "untagged (treat as BT.709 SDR, confirm by eye)"
    return f"SDR ({trc})"


def rotation(stream: dict) -> int:
    for sd in stream.get("side_data_list", []) or []:
        if "rotation" in sd:
            try:
                return int(float(sd["rotation"]))
            except (TypeError, ValueError):
                pass
    tag = (stream.get("tags") or {}).get("rotate")
    return int(tag) if tag and tag.lstrip("-").isdigit() else 0


def fps(value: str | None) -> Fraction | None:
    try:
        f = Fraction(value) if value else None
        return f if f and f > 0 else None
    except (ValueError, ZeroDivisionError):
        return None


def loudness(path: Path) -> dict | None:
    """Integrated LUFS, true peak and LRA of the first audio stream (EBU R128)."""
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", str(path), "-map", "0:a:0",
         "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
        capture_output=True, text=True)
    text = out.stderr
    summary = text[text.rfind("Summary:"):] if "Summary:" in text else ""
    if not summary:
        return None
    grab = lambda pat: (lambda m: float(m.group(1)) if m else None)(re.search(pat, summary))
    return {"lufs": grab(r"I:\s+(-?[\d.]+) LUFS"), "lra": grab(r"LRA:\s+(-?[\d.]+) LU"),
            "true_peak": grab(r"Peak:\s+(-?[\d.]+|-inf) dBFS")}


def md5(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 22), b""):
            h.update(chunk)
    return h.hexdigest()


def describe(path: Path) -> dict:
    info = ffprobe(path)
    fmt = info.get("format", {})
    v = next((s for s in info["streams"] if s.get("codec_type") == "video"
              and not (s.get("disposition") or {}).get("attached_pic")), None)
    a = next((s for s in info["streams"] if s.get("codec_type") == "audio"), None)
    d: dict = {"path": str(path), "duration": float(fmt.get("duration", 0) or 0),
               "size_mb": round(int(fmt.get("size", 0) or 0) / 1e6, 1)}
    if v:
        r, avg = fps(v.get("r_frame_rate")), fps(v.get("avg_frame_rate"))
        rot = rotation(v)
        w, h = int(v.get("width", 0)), int(v.get("height", 0))
        if abs(rot) in (90, 270):
            w, h = h, w
        nb = v.get("nb_frames")
        d["video"] = {
            "codec": v.get("codec_name"), "profile": v.get("profile"), "tag": v.get("codec_tag_string"),
            "pix_fmt": v.get("pix_fmt"), "bit_depth": bit_depth(v), "width": w, "height": h,
            "rotation": rot, "fps": float(r) if r else None, "fps_str": v.get("r_frame_rate"),
            "vfr": bool(r and avg and abs(float(r) - float(avg)) > 0.01),
            "frames": int(nb) if nb and str(nb).isdigit() else (round(d["duration"] * float(r)) if r else None),
            "primaries": v.get("color_primaries"), "transfer": v.get("color_transfer"),
            "matrix": v.get("color_space"), "range": v.get("color_range"),
            "colour": colour_class(v),
            "dolby_vision": any("DOVI" in (sd.get("side_data_type") or "") for sd in v.get("side_data_list", []) or []),
        }
    if a:
        codec = a.get("codec_name", "")
        d["audio"] = {"codec": codec, "rate": int(a.get("sample_rate", 0) or 0),
                      "channels": a.get("channels"), "bits": a.get("bits_per_raw_sample") or a.get("sample_fmt"),
                      "kbps": round(int(a.get("bit_rate", 0) or 0) / 1000) or None,
                      "lossless": codec.startswith("pcm_") or codec in {"alac", "flac"}}
    return d


def quality_rank(d: dict) -> tuple:
    v, a = d.get("video") or {}, d.get("audio") or {}
    return (v.get("bit_depth", 8), "HDR" in v.get("colour", ""), v.get("codec") == "prores",
            bool(a.get("lossless")))


def flags(d: dict) -> list[str]:
    v, a, out = d.get("video"), d.get("audio"), []
    if not v:
        return ["no video stream"]
    hdr = "HDR" in v["colour"]
    if v["codec"] == "hevc" and v["bit_depth"] >= 10:
        out.append("HEVC Main 10: Palmier rendered this as BLACK frames on 0824 and Alex. Do not import it; transcode first:")
        if hdr:
            out.append("  (HDR) ffmpeg -i IN -map 0:v:0 -map 0:a:0 -c:v prores_ks -profile:v 2 -pix_fmt yuv422p10le "
                       "-color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc -c:a pcm_s24le OUT.mov")
            out.append("  keeps 10-bit HLG — the path Antony's ProRes original proved works in Palmier. Not 8-bit H.264:"
                       " Alex's 8-bit copy kept HLG tags on 8 bits.")
        else:
            out.append("  (SDR) ffmpeg -i IN -map 0:v:0 -map 0:a:0 -c:v libx264 -crf 15 -preset slow -pix_fmt yuv420p "
                       "-c:a copy OUT-h264.mp4")
    if hdr:
        out.append(f"{v['colour']}: grade and deliver HDR end to end (picture-and-delivery.md). Never grade an SDR conversion of it.")
    if v.get("dolby_vision"):
        out.append("Dolby Vision metadata present (iPhone). Palmier/ffmpeg ignore it; the HLG base layer is what gets edited.")
    if v["vfr"]:
        out.append(f"variable frame rate (r={v['fps_str']}): Palmier frame maths assumes CFR — conform to 30 fps first.")
    if v["fps"] and abs(v["fps"] - 30) > 0.01:
        out.append(f"{v['fps']:.3f} fps: PeerPath reels are 30 fps timelines; decide before placing clips.")
    if v["width"] * 16 != v["height"] * 9:
        out.append(f"canvas {v['width']}×{v['height']} is not 9:16.")
    if v["rotation"]:
        out.append(f"rotation metadata {v['rotation']}° — dimensions shown are post-rotation.")
    if a and not a["lossless"] and (a["kbps"] or 999) < 160:
        out.append(f"audio is {a['codec']} at {a['kbps']} kbps — build the voice stem from a PCM original if one exists.")
    if EXPORT_HINT.search(Path(d["path"]).name) or "/PeerPath/output/" in d["path"]:
        out.append("name/location looks like one of our exports, not a camera original.")
    return out


def siblings(path: Path, dur: float, dirs: list[Path]) -> list[dict]:
    seen, found = {path.resolve()}, []
    for base in [path.parent, *dirs]:
        if not base.is_dir():
            continue
        for cand in sorted(base.iterdir()):
            if cand.suffix.lower() not in VIDEO_EXT or cand.resolve() in seen:
                continue
            seen.add(cand.resolve())
            try:
                d = describe(cand)
            except Exception:
                continue
            if abs(d["duration"] - dur) <= 0.1:
                found.append(d)
    return found


def fmt_line(d: dict) -> list[str]:
    v, a = d.get("video"), d.get("audio")
    lines = [f"== {d['path']}  ({d['size_mb']} MB, {d['duration']:.3f} s)"]
    if v:
        prof = f" {v['profile']}" if v.get("profile") else ""
        lines.append(f"  video   {v['codec']}{prof} · {v['bit_depth']}-bit {v['pix_fmt']} · {v['width']}×{v['height']}"
                     f" · {v['fps_str']} fps{' (VFR)' if v['vfr'] else ''} · {v['frames']} frames")
        lines.append(f"  colour  {v['primaries']} / {v['transfer']} / {v['matrix']} → {v['colour']}")
    if a:
        quality = "lossless" if a["lossless"] else f"{a['kbps']} kbps"
        lines.append(f"  audio   {a['codec']} · {a['rate']} Hz · {a['channels']} ch · {a['bits']} · {quality}")
    if d.get("loudness"):
        L = d["loudness"]
        lines.append(f"  loud    {L['lufs']} LUFS integrated · true peak {L['true_peak']} dBTP · LRA {L['lra']} LU")
    if d.get("md5"):
        lines.append(f"  md5     {d['md5']}")
    return lines


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--loudness", action="store_true", help="measure EBU R128 loudness of the first audio stream")
    ap.add_argument("--md5", action="store_true", help="hash the files (detects an export written over a source)")
    ap.add_argument("--search", nargs="*", type=Path, default=[Path.home() / "Downloads"],
                    help="extra directories to search for same-length originals (default ~/Downloads)")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    reports, status = [], 0
    for f in args.files:
        try:
            d = describe(f)
        except Exception as e:  # unreadable file
            print(f"!! {f}: {e}", file=sys.stderr)
            status = 1
            continue
        if args.loudness and d.get("audio"):
            d["loudness"] = loudness(f)
        if args.md5:
            d["md5"] = md5(f)
        d["flags"] = flags(d)
        sib = siblings(f, d["duration"], args.search) if d.get("video") else []
        better = [s for s in sib if quality_rank(s) > quality_rank(d)]
        d["same_length_siblings"] = [{"path": s["path"], "summary": f"{s['video']['codec']} {s['video']['bit_depth']}-bit "
                                      f"{s['video']['colour']}, audio {s.get('audio', {}).get('codec')}",
                                      "better": s in better} for s in sib]
        if args.md5:
            for s in sib:
                if md5(Path(s["path"])) == d["md5"]:
                    d["flags"].append(f"BYTE-IDENTICAL to {s['path']} — an export has overwritten a source, or vice versa.")
        if better:
            d["flags"].append("a same-length sibling outranks this file (more bits / HDR / ProRes / PCM): "
                              + ", ".join(Path(s["path"]).name for s in better) + " — ask whether that is the real original.")
        reports.append(d)

    if args.json:
        print(json.dumps(reports, indent=2, ensure_ascii=False))
        return status
    for d in reports:
        print("\n".join(fmt_line(d)))
        for s in d["same_length_siblings"]:
            print(f"  twin    {s['path']}  [{s['summary']}]{'  ← better original?' if s['better'] else ''}")
        for fl in d["flags"]:
            print(f"  !  {fl}")
        if not d["flags"]:
            print("  ok  nothing to fix before import.")
        print()
    return status


if __name__ == "__main__":
    sys.exit(main())
