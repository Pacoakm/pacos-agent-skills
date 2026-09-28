#!/usr/bin/env python3
"""Build the processed voice stem for a PeerPath reel — the Antony chain, measured, two-pass.

    voice_chain.py SOURCE OUT.wav [--target -14.5] [--tp -1.5] [--nr 14] [--nf auto] [--dry-run]

SOURCE is the camera original (a video is fine — its first audio stream is used). Build from the
PCM original when there is one: Antony v8 was rebuilt from the ProRes file's 24-bit PCM instead
of the delivery mp4's 102 kbps AAC.

Chain (each stage earned its place on Antony, −20.6 LUFS raw → −14.97 LUFS, TP −4.5, LRA 1.8):
  mono downmix → highpass 90 Hz → afftdn (nr 14, nf = measured room tone, tn) → de-esser 0.35
  → −1.5 dB @ 250 Hz (mud) → +2.5 dB @ 3.4 kHz (presence) → compressor 3:1 @ −20 dB
  → two-pass loudnorm (I −14.5, TP −1.5, LRA 7, linear) → limiter 0.87 → 48 kHz, 24-bit, dual mono.

The source could not simply be gained up: at −20.6 LUFS it already peaked at −2.85 dBTP.
Then in Palmier: import OUT.wav, place it at frame 0 on a `Voice` track, and mute the A-roll's
linked audio (volume −60 dB and the Dialogue track muted) — two voices a frame apart comb-filter.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def probe_audio(src: Path) -> dict:
    out = run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
               "stream=codec_name,channels,sample_rate,bit_rate:format=duration", "-of", "json", str(src)])
    info = json.loads(out.stdout or "{}")
    s = (info.get("streams") or [{}])[0]
    if not s:
        raise SystemExit(f"no audio stream in {src}")
    return {"codec": s.get("codec_name"), "channels": int(s.get("channels", 1)), "rate": int(s.get("sample_rate", 48000)),
            "kbps": round(int(s.get("bit_rate", 0) or 0) / 1000), "duration": float(info["format"]["duration"])}


def ebur128(src: Path, pre: str | None = None) -> dict:
    af = (pre + "," if pre else "") + "ebur128=peak=true:framelog=quiet"
    text = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-map", "0:a:0", "-af", af, "-f", "null", "-"]).stderr
    summ = text[text.rfind("Summary:"):]
    get = lambda p: (lambda m: float(m.group(1)) if m else None)(re.search(p, summ))
    return {"I": get(r"I:\s+(-?[\d.]+) LUFS"), "LRA": get(r"LRA:\s+(-?[\d.]+) LU"), "TP": get(r"Peak:\s+(-?[\d.]+) dBFS")}


def noise_floor_db(src: Path) -> float:
    """Room tone in dBFS for afftdn's nf: the median 50 ms window that is neither speech nor an edit gap.

    A cut-together take has near-digital-silence windows at its jump cuts (−70 to −120 dB on
    Antony) — those are not the room, so anything under −60 dB is ignored, as is anything within
    12 dB of loud speech (P90). Antony measures −34.8 here; the session's hand-picked pauses read
    −32 to −34, and either value works.
    """
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(src), "-map", "0:a:0", "-ac", "1", "-ar", "16000",
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    win = 800  # 50 ms
    n = len(x) // win
    if n < 20:
        return -40.0
    db = 20 * np.log10(np.sqrt((x[: n * win].reshape(n, win) ** 2).mean(axis=1) + 1e-12))
    room = db[(db > -60) & (db < np.percentile(db, 90) - 12)]
    return float(np.clip(np.median(room), -60, -25)) if len(room) >= 10 else -40.0


def build_chain(channels: int, nr: float, nf: float) -> str:
    stages = []
    if channels >= 2:
        stages.append("pan=mono|c0=0.5*c0+0.5*c1")
    stages += [
        "highpass=f=90",
        f"afftdn=nr={nr:g}:nf={nf:.0f}:tn=1",
        "deesser=i=0.35",
        "equalizer=f=250:t=q:w=1.2:g=-1.5",
        "equalizer=f=3400:t=q:w=1.0:g=2.5",
        "acompressor=threshold=-20dB:ratio=3:attack=6:release=130:makeup=1",
    ]
    return ",".join(stages)


def loudnorm_pass1(src: Path, chain: str, target: float, tp: float) -> dict:
    af = f"{chain},loudnorm=I={target}:TP={tp}:LRA=7:print_format=json"
    text = run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-map", "0:a:0", "-af", af, "-f", "null", "-"]).stderr
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", text, re.S)
    if not m:
        raise SystemExit("loudnorm pass 1 produced no measurement:\n" + text[-2000:])
    return json.loads(m.group(0))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--target", type=float, default=-14.5, help="loudnorm I; lands ≈ −15.0 LUFS after the limiter")
    ap.add_argument("--tp", type=float, default=-1.5)
    ap.add_argument("--nr", type=float, default=14, help="afftdn noise reduction dB (12 for a clean 24-bit source)")
    ap.add_argument("--nf", default="auto", help="afftdn noise floor dBFS, or 'auto' to measure the room tone")
    ap.add_argument("--dry-run", action="store_true", help="print the measured chain and stop")
    args = ap.parse_args()

    if args.out.resolve() == args.source.resolve():
        raise SystemExit("refusing to write over the source")
    a = probe_audio(args.source)
    before = ebur128(args.source)
    nf = noise_floor_db(args.source) if args.nf == "auto" else float(args.nf)
    chain = build_chain(a["channels"], args.nr, nf)
    print(f"source  {args.source}  ({a['codec']}, {a['channels']} ch, {a['rate']} Hz"
          f"{'' if a['codec'].startswith('pcm') else f', {a['kbps']} kbps'}, {a['duration']:.3f} s)")
    if not a["codec"].startswith("pcm") and a["kbps"] and a["kbps"] < 200:
        print("  !  lossy source audio — if a PCM original of this take exists, build from that instead")
    print(f"before  {before['I']} LUFS · TP {before['TP']} dBTP · LRA {before['LRA']} LU · room tone {nf:.1f} dBFS")
    print(f"chain   {chain}")
    if args.dry_run:
        return 0

    m = loudnorm_pass1(args.source, chain, args.target, args.tp)
    second = (f"{chain},loudnorm=I={args.target}:TP={args.tp}:LRA=7:measured_I={m['input_i']}:measured_TP={m['input_tp']}"
              f":measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
              f",alimiter=limit=0.87:level=false,aresample=48000")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    res = run(["ffmpeg", "-hide_banner", "-nostats", "-y", "-i", str(args.source), "-map", "0:a:0", "-af", second,
               "-ac", "2", "-c:a", "pcm_s24le", str(args.out)])
    if res.returncode != 0:
        print(res.stderr[-2000:], file=sys.stderr)
        return 1
    after = ebur128(args.out)
    dur = probe_audio(args.out)["duration"]
    print(f"after   {after['I']} LUFS · TP {after['TP']} dBTP · LRA {after['LRA']} LU  →  {args.out}")
    drift = abs(dur - a["duration"])
    print(f"length  {dur:.3f} s (source {a['duration']:.3f} s){'  ok' if drift < 0.05 else '  !  length changed — check sync'}")
    ok = after["I"] is not None and abs(after["I"] - (args.target - 0.5)) <= 1.0 and (after["TP"] or 0) <= -1.0
    print("verdict " + ("ok — import it, place at frame 0 on `Voice`, mute the A-roll's linked audio"
                        if ok else "!  outside ±1 LU of target or TP above −1 dBTP — inspect before using"))
    return 0 if ok else 2


if __name__ == "__main__":
    sys.exit(main())
