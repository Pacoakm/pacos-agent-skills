#!/usr/bin/env python3
"""Measure candidate music beds for a talking-head reel — Claude cannot listen, so it measures.

    music_profile.py TRACK [TRACK ...] [--seconds 80] [--offset 0] [--voice VOICE] [--target TRACK] [--json]

Every column below decided a real choice on the Alex and Antony reels:

  speech%   share of energy in 300 Hz–3.5 kHz, where the voice lives. The single most important
            number: Stylz put 18.8 % there and was replaced; Baileys 3.5 %, Sweet September 4.4 %.
  cons%     share in 2–5 kHz (consonants). A bed busy here smears intelligibility.
  <300%     share below 300 Hz. Bass-led beds leave the voice in clear air — but a bass-led SFX
            (sweep-fast, 96 % below 300 Hz) will then be masked by them (see sfx_profile.py --bed).
  onsets/s  spectral-flux events per second. A pause-heavy speaker (Alex spoke 46 % of the time)
            needs a sparse bed; a busy one "rushes ahead in the gaps". Sweet September 1.60 was the
            sparsest ever measured; R&B Vibes 1 2.60 was accepted.
  swing dB  P90−P10 of 3 s short-term level: how much the bed surges. >8 dB reads as dipping and
            surging (Sweet September 9.8 dB needed a compressor); ≤6 dB can be used raw.
  bpm       onset-autocorrelation tempo. Only a hint — the same track measured 96 and 126 in two
            past scripts. Never choose on BPM; the user's "faster" meant forward motion, not a
            harder beat ("我要節奏快一點不是節奏感強一點").
  drum%     percussive share (median-filter HPSS). High = "節奏感強", which the user rejected.
  LUFS      integrated loudness, for setting the clip gain (see sound.md: bed sits 12–18 LU under
            the processed voice).

--voice VOICE  also measures the speaker: speaking share and mean pause, which set how sparse the
               bed must be.
--target TRACK ranks the others by distance to a bed the user liked ("這個bgm節奏不錯，但我想換一個").

Dependencies: ffmpeg + numpy + scipy (no librosa needed).
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.ndimage import median_filter
from scipy.signal import find_peaks

SR = 22050
N_FFT, HOP = 2048, 512


def decode(path: Path, seconds: float, offset: float) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-ss", str(offset), "-t", str(seconds), "-i", str(path),
           "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def lufs(path: Path, seconds: float, offset: float) -> float | None:
    out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-ss", str(offset), "-t", str(seconds), "-i", str(path),
                          "-af", "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    m = re.search(r"I:\s+(-?[\d.]+) LUFS", out[out.rfind("Summary:"):])
    return float(m.group(1)) if m else None


def stft_power(x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    win = np.hanning(N_FFT)
    frames = 1 + max(0, (len(x) - N_FFT) // HOP)
    idx = np.arange(N_FFT)[None, :] + HOP * np.arange(frames)[:, None]
    spec = np.abs(np.fft.rfft(x[idx] * win, axis=1)) ** 2
    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    return spec, freqs


def band_share(spec: np.ndarray, freqs: np.ndarray, lo: float, hi: float) -> float:
    total = spec.sum()
    return float(spec[:, (freqs >= lo) & (freqs < hi)].sum() / total) if total > 0 else 0.0


def onset_envelope(spec: np.ndarray) -> np.ndarray:
    mag = np.log1p(10 * np.sqrt(spec))
    flux = np.maximum(0, np.diff(mag, axis=0)).sum(axis=1)
    return np.concatenate([[0.0], flux])


def onsets_per_second(x: np.ndarray) -> float:
    """Event density on the scale the reel docs quote.

    Calibrated against the six beds measured on the Alex reel (Sweet September 1.60, Sleepy Cat
    2.34, Baileys 2.44, R&B Vibes 1 2.60, New York 2.74, Curiosity 3.21): 1024/768 STFT, linear
    magnitude flux, peaks above mean + 0.5 σ at least 0.15 s apart. It reproduces their order
    exactly and their values to ±0.3, so a number here can be compared with a number in the docs.
    """
    n_fft, hop = 1024, 768
    win = np.hanning(n_fft)
    frames = 1 + max(0, (len(x) - n_fft) // hop)
    idx = np.arange(n_fft)[None, :] + hop * np.arange(frames)[:, None]
    mag = np.abs(np.fft.rfft(x[idx] * win, axis=1))
    env = np.maximum(0, np.diff(mag, axis=0)).sum(axis=1)
    if env.max() <= 0:
        return 0.0
    fr = SR / hop
    peaks, _ = find_peaks(env, height=env.mean() + 0.5 * env.std(), distance=max(1, int(fr * 0.15)))
    return len(peaks) / (len(env) / fr)


def tempo(env: np.ndarray) -> float | None:
    fr = SR / HOP
    e = env - env.mean()
    if not e.any():
        return None
    ac = np.correlate(e, e, mode="full")[len(e) - 1:]
    lags = np.arange(len(ac))
    ok = (lags >= fr * 60 / 180) & (lags <= fr * 60 / 60)
    if not ok.any():
        return None
    lag = lags[ok][np.argmax(ac[ok])]
    bpm = 60 * fr / lag
    while bpm < 80:
        bpm *= 2
    while bpm > 170:
        bpm /= 2
    return round(bpm, 1)


def swing_db(x: np.ndarray) -> float:
    win = int(SR * 3.0)
    hop = int(SR * 0.5)
    if len(x) < win:
        return 0.0
    lv = [10 * np.log10(np.mean(x[i:i + win] ** 2) + 1e-12) for i in range(0, len(x) - win, hop)]
    lv = np.array(lv)
    lv = lv[lv > lv.max() - 40]  # ignore silent tails
    return float(np.percentile(lv, 90) - np.percentile(lv, 10))


def drum_share(spec: np.ndarray) -> float:
    s = np.sqrt(spec[:, : spec.shape[1] // 2])  # 0–5.5 kHz is plenty for HPSS
    h = median_filter(s, size=(31, 1))
    p = median_filter(s, size=(1, 31))
    mask = p ** 2 / (h ** 2 + p ** 2 + 1e-12)
    return float((s * mask).sum() / (s.sum() + 1e-12))


def profile(path: Path, seconds: float, offset: float) -> dict:
    x = decode(path, seconds, offset)
    if len(x) < SR:
        raise RuntimeError("less than 1 s of audio decoded")
    spec, freqs = stft_power(x)
    env = onset_envelope(spec)
    return {
        "track": path.name, "path": str(path), "seconds": round(len(x) / SR, 1),
        "speech%": round(100 * band_share(spec, freqs, 300, 3500), 1),
        "cons%": round(100 * band_share(spec, freqs, 2000, 5000), 1),
        "<300%": round(100 * band_share(spec, freqs, 0, 300), 1),
        "onsets/s": round(onsets_per_second(x), 2),
        "swing dB": round(swing_db(x), 1),
        "bpm": tempo(env),
        "drum%": round(100 * drum_share(spec), 1),
        "LUFS": lufs(path, seconds, offset),
    }


def voice_profile(path: Path, seconds: float) -> dict:
    """Speaking share and pause length of a DRY voice (A-roll audio or voice stem, no music).

    300–3500 Hz band-pass → Hilbert envelope → 50 ms smoothing → 10 ms frames, voiced when within
    14 dB of the loud speech (P95). Calibrated on the Alex A-roll: 45 % here against the 46 %
    measured syllable-by-syllable in the session that chose the bed. A mix with music under it
    reads high — measure before the bed goes in.
    """
    from scipy.signal import butter, filtfilt, hilbert
    x = decode(path, seconds, 0.0)
    b, a = butter(4, [300 / (SR / 2), 3500 / (SR / 2)], btype="band")
    env = np.abs(hilbert(filtfilt(b, a, x)))
    k = int(SR * 0.05)
    env = np.convolve(env, np.ones(k) / k, mode="same")
    hop = int(SR * 0.01)
    e = env[: len(env) // hop * hop].reshape(-1, hop).mean(axis=1)
    db = 20 * np.log10(e + 1e-9)
    voiced = median_filter((db > np.percentile(db, 95) - 14).astype(float), size=15) > 0.5
    pauses, run = [], 0
    for v in np.append(voiced, True):
        if not v:
            run += 1
            continue
        if run * 0.01 >= 0.25:
            pauses.append(run * 0.01)
        run = 0
    return {"voice": path.name, "speaking%": round(100 * voiced.mean(), 1),
            "pauses≥0.25s": len(pauses), "mean pause s": round(float(np.mean(pauses)), 2) if pauses else 0.0}


COLUMNS = ["speech%", "cons%", "<300%", "onsets/s", "swing dB", "bpm", "drum%", "LUFS"]


def distance(a: dict, b: dict) -> float:
    # scaled so one unit ≈ a noticeable difference in each measure
    scale = {"speech%": 3.0, "<300%": 4.0, "onsets/s": 0.5, "swing dB": 2.0, "drum%": 8.0}
    return float(np.sqrt(sum(((a[k] - b[k]) / s) ** 2 for k, s in scale.items())))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("tracks", nargs="+", type=Path)
    ap.add_argument("--seconds", type=float, default=80, help="analyse this much (use the reel length)")
    ap.add_argument("--offset", type=float, default=0, help="start here (where the bed will actually start)")
    ap.add_argument("--voice", type=Path, help="the processed voice stem or A-roll, to measure speaking share")
    ap.add_argument("--target", type=Path, help="a bed the user liked; rank others by distance to it")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    rows = []
    for t in args.tracks:
        try:
            rows.append(profile(t, args.seconds, args.offset))
        except Exception as e:
            print(f"!! {t}: {e}", file=sys.stderr)
    target = profile(args.target, args.seconds, args.offset) if args.target else None
    if target:
        for r in rows:
            r["dist"] = round(distance(r, target), 2)
        rows.sort(key=lambda r: r["dist"])
    else:
        rows.sort(key=lambda r: (r["speech%"], r["swing dB"]))
    voice = voice_profile(args.voice, args.seconds) if args.voice else None

    if args.json:
        print(json.dumps({"tracks": rows, "target": target, "voice": voice}, indent=2, ensure_ascii=False))
        return 0
    cols = COLUMNS + (["dist"] if target else [])
    names = [r["track"] for r in rows] + ([f"(target) {target['track']}"] if target else [])
    name_w = max([12, *(len(n) for n in names)])
    print(f"{'track':<{name_w}} " + " ".join(f"{c:>9}" for c in cols))
    if target:
        print(f"{'(target) ' + target['track']:<{name_w}} " + " ".join(f"{str(target.get(c, '')):>9}" for c in cols))
    for r in rows:
        print(f"{r['track']:<{name_w}} " + " ".join(f"{str(r.get(c, '')):>9}" for c in cols))
    print(f"\nanalysed {args.seconds:g} s from {args.offset:g} s. Sorted by "
          + ("distance to target." if target else "speech-band share, then swing."))
    print("rules of thumb: speech% ≤ 6 and swing ≤ 6 dB usable raw; onsets/s ≤ 2.6 for a pause-heavy speaker;"
          " drum% high = 節奏感強 (rejected before). Send the top 2–3 to the user as 25 s excerpts — they choose by ear.")
    if voice:
        print(f"\nvoice {voice['voice']}: speaking {voice['speaking%']} % of the time, "
              f"{voice['pauses≥0.25s']} pauses ≥0.25 s, mean {voice['mean pause s']} s."
              + ("  Pause-heavy (<60 %): pick the sparsest bed, not the fastest." if voice['speaking%'] < 60 else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
