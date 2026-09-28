#!/usr/bin/env python3
"""Measure sound effects before they are trimmed, levelled or cued.

    sfx_profile.py SFX [SFX ...] [--fps 30] [--bed MUSIC] [--target-peak -17] [--json]

Three past failures this prevents:

  * A riser trimmed to its silent part. `sfx-whoosh-cinematic` peaks 1.081 s in (81 % of the
    file); every clip had been cut to its first 16 frames, which hold 0.9 % of the energy, so the
    whoosh was inaudible — not quiet. `peak f` and `first16%` show this; `pre-roll` is how many
    frames before the beat the clip must start so its peak lands ON the beat.
  * A cue masked by the bed. `sweep-fast` carries 96 % of its energy below 300 Hz and Sweet
    September 94.5 %: same band, so the sweep vanished. With --bed, `mask%` is the overlap of
    the two band distributions (5 bands); ≥ 70 % means it will blur into the music.
  * A family that doesn't sit even. Levels were set from each file's measured peak so the family
    reads as one set; `gain dB` = target peak − file peak (default target −17 dBFS). Then apply
    the hierarchy on top: repeated list clicks −3 dB, payoffs (ding, strike) +3 dB.

`bright%` (> 4 kHz) flags a character clash with a chill, bass-led bed: sparkle-star was 99 %.
Dependencies: ffmpeg + numpy.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 44100
BANDS = [(0, 300), (300, 2000), (2000, 5000), (5000, 8000), (8000, 22050)]


def decode(path: Path, seconds: float | None = None) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-i", str(path)] + (["-t", str(seconds)] if seconds else []) + \
          ["-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def band_dist(x: np.ndarray) -> np.ndarray:
    n_fft, hop = 4096, 1024
    if len(x) < n_fft:
        x = np.pad(x, (0, n_fft - len(x)))
    win = np.hanning(n_fft)
    frames = 1 + (len(x) - n_fft) // hop
    idx = np.arange(n_fft)[None, :] + hop * np.arange(frames)[:, None]
    p = (np.abs(np.fft.rfft(x[idx] * win, axis=1)) ** 2).sum(axis=0)
    f = np.fft.rfftfreq(n_fft, 1 / SR)
    d = np.array([p[(f >= lo) & (f < hi)].sum() for lo, hi in BANDS])
    return d / d.sum() if d.sum() > 0 else d


def centroid(x: np.ndarray) -> float:
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x)))) if len(x) else np.zeros(1)
    f = np.fft.rfftfreq(len(x), 1 / SR) if len(x) else np.zeros(1)
    return float((f * spec).sum() / spec.sum()) if spec.sum() > 0 else 0.0


def profile(path: Path, fps: float, target_peak: float, bed: np.ndarray | None) -> dict:
    x = decode(path)
    if not len(x):
        raise RuntimeError("no audio decoded")
    dur = len(x) / SR
    win = int(SR * 0.02)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(win) / win, mode="same"))
    peak_i = int(np.argmax(rms))
    peak_s = peak_i / SR
    energy = np.cumsum(x ** 2)
    total = energy[-1] if energy[-1] > 0 else 1.0
    half_s = float(np.searchsorted(energy, total / 2) / SR)
    first16 = float(energy[min(len(x) - 1, int(16 / fps * SR))] / total)
    sample_peak = float(np.max(np.abs(x)))
    peak_db = 20 * np.log10(sample_peak + 1e-12)
    dist = band_dist(x)
    row = {
        "sfx": path.name, "dur s": round(dur, 3), "dur f": round(dur * fps, 1),
        "peak s": round(peak_s, 3), "peak f": round(peak_s * fps, 1), "peak %": round(100 * peak_s / dur, 0),
        "half-energy f": round(half_s * fps, 1), "first16%": round(100 * first16, 1),
        "peak dBFS": round(peak_db, 1), "centroid Hz": round(centroid(x)),
        "<300%": round(100 * dist[0], 1), "bright%": round(100 * (dist[3] + dist[4]), 1),
        "pre-roll f": int(round(peak_s * fps)) if peak_s * fps >= 2 else 0,
        "gain dB": round(target_peak - peak_db, 1),
    }
    if bed is not None:
        row["mask%"] = round(100 * float(np.minimum(dist, bed).sum()), 1)
    flags = []
    pre = row["pre-roll f"]
    if pre >= 8:
        kind = "riser — " if row["peak %"] >= 60 and dur * fps >= 20 else ""
        flags.append(f"{kind}peak lands {pre} f after the clip starts. Placed on the element's first frame it sounds late"
                     f" (whoosh-card did, 22 f late, on Alex and Antony). Start it {pre} f before the beat, or cut a tight"
                     f" version: ffmpeg -ss {max(0.0, peak_s - 0.36):.2f} -t {min(dur, 0.61):.2f}")
    elif pre >= 4:
        flags.append(f"peak is {pre} f in — nudge the clip {pre} f earlier so the hit lands on the beat")
    if row["first16%"] < 10 and dur * fps > 16:
        flags.append(f"only {row['first16%']} % of the energy is in the first 16 frames — never trim this from the head")
    if bed is not None and row["mask%"] >= 70:
        flags.append(f"{row['mask%']} % band overlap with the bed — it will be masked; pick a sound in a band the bed leaves empty")
    if row["bright%"] >= 80:
        flags.append("very bright (>80 % above 5 kHz) — may clash with a mellow, bass-led bed; audition before using")
    row["flags"] = flags
    return row


COLS = ["dur f", "peak f", "peak %", "first16%", "peak dBFS", "centroid Hz", "<300%", "bright%", "pre-roll f", "gain dB"]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("sfx", nargs="+", type=Path)
    ap.add_argument("--fps", type=float, default=30)
    ap.add_argument("--bed", type=Path, help="the chosen music bed, to score masking")
    ap.add_argument("--bed-seconds", type=float, default=80)
    ap.add_argument("--target-peak", type=float, default=-17.0, help="dBFS each file's peak is levelled to")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    bed = band_dist(decode(args.bed, args.bed_seconds)) if args.bed else None
    rows = []
    for f in args.sfx:
        try:
            rows.append(profile(f, args.fps, args.target_peak, bed))
        except Exception as e:
            print(f"!! {f}: {e}", file=sys.stderr)
    if args.json:
        print(json.dumps({"bed_bands": None if bed is None else [round(float(v), 3) for v in bed], "sfx": rows},
                         indent=2, ensure_ascii=False))
        return 0
    cols = COLS + (["mask%"] if bed is not None else [])
    w = max([10, *(len(r["sfx"]) for r in rows)])
    print(f"{'sfx':<{w}} " + " ".join(f"{c:>11}" for c in cols))
    for r in rows:
        print(f"{r['sfx']:<{w}} " + " ".join(f"{str(r[c]):>11}" for c in cols))
    if bed is not None:
        labels = ["<300", "300-2k", "2-5k", "5-8k", ">8k"]
        print("\nbed bands: " + ", ".join(f"{l} {100 * v:.1f}%" for l, v in zip(labels, bed)))
    for r in rows:
        for fl in r["flags"]:
            print(f"  ! {r['sfx']}: {fl}")
    print(f"\n{args.fps:g} fps. `gain dB` levels every peak to {args.target_peak:g} dBFS; then −3 dB for repeated rows, +3 dB for payoffs.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
