"""Timing data for a new song -> data/<song>/{lyrics,audio}.json  (one command, any song)

    uv run python song_analysis.py --song <id> --audio <path to mp3/m4a/wav> [--lyrics lyrics.txt]
                                   [--prompt "names, jargon"] [--language en] [--plot-from 26 --plot-to 47]

What it does, in order (each step is cached, rerun freely):

  1. decodes the input to audio/<id>.wav (44.1 kHz) — the app plays and the renderer muxes this file;
     if the input carries an embedded subtitle track (Suno m4a downloads do: timed lyric LINES), it is
     extracted to audio/<id>.srt;
  2. separates stems with Demucs htdemucs into analysis/stems/htdemucs/<id>/ (vocals, drums, bass, other);
  3. word timestamps with Whisper on the vocal stem (mlx-whisper on Apple Silicon, faster-whisper
     elsewhere if installed), cached in analysis/work/<id>/whisper.json;
  4. lyric LINE windows: from the .srt when present, otherwise from --lyrics (plain text, one sung line
     per row, [Section] tags allowed) aligned to the Whisper words over the whole song;
     WORDS inside each line: matched to Whisper words, gaps interpolated, starts snapped to vocal onsets;
  5. music: constant-tempo beat grid fitted to the drum stem; kicks looked up beat by beat (low band);
     bar phase voted by the drum RE-ENTRIES after >= 1 s of drum silence (a drop lands on a downbeat),
     falling back to snare-on-2-and-4; sections from the [Section] tags snapped to downbeats;
     100 fps envelopes (rms/low/mid/high + per stem) and onsets, in the schema the app expects;
  6. a QA plot (analysis/work/<id>/qa.png): vocal spectrogram with word lines, drum envelope with
     kicks, snares and downbeats. LOOK AT IT before building scenes on the data.

Pitfalls this script already handles (each cost an iteration once):
  * SR // 1000 is 44 samples, not 1 ms at 44.1 kHz — convert indices with hop / SR or times drift
    ~70 ms by 30 s and every kick is "missed";
  * the kick's click puts 1.5-5 kHz energy on every beat, so a snare band cannot find the bar phase in
    four-on-the-floor pop — use the drum re-entries;
  * Whisper splits or merges words ("fifty-nine,", "a.m.?"): compare normalised tokens only.
"""
import common  # noqa: F401  (sets model cache dirs to analysis/.cache — import first)
import argparse, json, platform, re, shutil, subprocess, sys
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
import librosa
import soundfile as sf
from scipy.ndimage import uniform_filter1d
from scipy.signal import butter, find_peaks, sosfiltfilt

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SR = 44100
FPS = 100

ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("--song", required=True, help="short id, e.g. 1159 (used in ?song=<id>, data/<id>/, audio/<id>.wav)")
ap.add_argument("--audio", help="input song file (mp3/m4a/wav); default audio/<id>.wav")
ap.add_argument("--lyrics", help="plain-text lyrics, one sung line per row, [Section] tags allowed (needed when there is no .srt)")
ap.add_argument("--language", default="en")
ap.add_argument("--prompt", default="", help="Whisper initial prompt: unusual words, names, jargon in the song")
ap.add_argument("--bpm-hint", type=float, default=120)
ap.add_argument("--plot-from", type=float)
ap.add_argument("--plot-to", type=float)
ap.add_argument("--demucs-device", default=None, help="mps / cuda / cpu (default: mps on Apple Silicon, else cpu)")
A = ap.parse_args()

MIX = ROOT / "audio" / f"{A.song}.wav"
SRT = ROOT / "audio" / f"{A.song}.srt"
STEMS = HERE / "stems" / "htdemucs" / A.song
WORK = HERE / "work" / A.song
OUT = ROOT / "data" / A.song
WORK.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)


# ----------------------------------------------------------------------------- 1-3: inputs, stems, whisper
def prepare_audio():
    if A.audio and Path(A.audio).resolve() != MIX.resolve():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", A.audio, "-map", "0:a:0", "-ar", str(SR), str(MIX)], check=True)
        probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "s", "-show_entries", "stream=index",
                                "-of", "csv=p=0", A.audio], capture_output=True, text=True).stdout.strip()
        if probe and not SRT.exists():
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", A.audio, "-map", "0:s:0", str(SRT)], check=True)
            print("embedded timed lyrics ->", SRT)
    if not MIX.exists():
        sys.exit(f"no audio: pass --audio or put the song at {MIX}")


def separate():
    if all((STEMS / f"{k}.wav").exists() for k in ("vocals", "drums", "bass", "other")):
        return
    dev = A.demucs_device or ("mps" if platform.system() == "Darwin" and platform.machine() == "arm64" else "cpu")
    print(f"demucs htdemucs on {dev} (first run downloads the model) ...")
    tmp = HERE / "stems"
    subprocess.run([sys.executable, "-m", "demucs", "-n", "htdemucs", "-d", dev, "-o", str(tmp), str(MIX)], check=True)
    produced = tmp / "htdemucs" / MIX.stem
    if produced.resolve() != STEMS.resolve():
        shutil.move(str(produced), str(STEMS))


def whisper_words():
    cache = WORK / "whisper.json"
    if cache.exists():
        return json.loads(cache.read_text())
    y, _ = librosa.load(STEMS / "vocals.wav", sr=16000, mono=True)
    wav16 = WORK / "vocals16k.wav"
    sf.write(wav16, y, 16000)
    words = []
    try:
        import mlx_whisper  # Apple Silicon
        res = mlx_whisper.transcribe(
            str(wav16), path_or_hf_repo="mlx-community/whisper-large-v3-turbo", language=A.language,
            word_timestamps=True, condition_on_previous_text=False, temperature=0.0,
            initial_prompt=A.prompt or None, no_speech_threshold=None, hallucination_silence_threshold=None)
        words = [dict(w=w["word"].strip(), start=float(w["start"]), end=float(w["end"]))
                 for seg in res["segments"] for w in seg.get("words", [])]
    except ImportError:
        try:
            from faster_whisper import WhisperModel  # Linux / Windows / Intel: `uv pip install faster-whisper`
        except ImportError:
            sys.exit("needs mlx-whisper (Apple Silicon) or faster-whisper (`uv pip install faster-whisper`)")
        model = WhisperModel("large-v3-turbo", compute_type="auto")
        segs, _ = model.transcribe(str(wav16), language=A.language, word_timestamps=True,
                                   condition_on_previous_text=False, temperature=0.0, initial_prompt=A.prompt or None)
        words = [dict(w=w.word.strip(), start=float(w.start), end=float(w.end)) for s in segs for w in (s.words or [])]
    cache.write_text(json.dumps(words, indent=1))
    return words


def vocal_onsets():
    y, _ = librosa.load(STEMS / "vocals.wav", sr=22050, mono=True)
    env = librosa.onset.onset_strength(y=y, sr=22050, hop_length=110)  # 5 ms hop
    return np.asarray(librosa.onset.onset_detect(onset_envelope=env, sr=22050, hop_length=110, units="time", backtrack=True))


# ----------------------------------------------------------------------------- 4: lyrics
def srt_time(s):
    return sum(float(x) * m for x, m in zip(s.replace(",", ".").split(":"), (3600, 60, 1)))


def tag_name(s):
    return re.sub(r"[^a-z]", "", s.lower())


def norm(w):
    return re.sub(r"[^a-z0-9]", "", w.lower())


def parse_srt():
    """Suno's timed lyrics: sung line texts, their (start, end) windows, and [Section] tags as (tag, line index)."""
    texts, wins, tag_at, pending = [], [], [], None
    for b in SRT.read_text().strip().split("\n\n"):
        rows = b.strip().split("\n")
        if len(rows) < 3:
            continue
        a, _, z = rows[1].partition(" --> ")
        text = " ".join(rows[2:]).strip()
        if text.startswith("["):
            pending = tag_name(text)
        elif text:
            if pending:
                tag_at.append((pending, len(texts)))
                pending = None
            texts.append(text)
            wins.append((srt_time(a), srt_time(z)))
    return texts, wins, tag_at


def parse_text():
    """Plain-text lyrics: one sung line per row, [Section] tags on their own rows."""
    texts, tag_at, pending = [], [], None
    for r in (r.strip() for r in Path(A.lyrics).read_text().splitlines()):
        if not r:
            continue
        if r.startswith("["):
            pending = tag_name(r)
        else:
            if pending:
                tag_at.append((pending, len(texts)))
                pending = None
            texts.append(r)
    return texts, tag_at


def heard_windows(ww, texts):
    """Each line's window from where Whisper heard its words, over the whole song.

    Every lyric token is matched against every Whisper word. Whisper often misses a line's first words
    (a pickup, a held note): the window is then extended back to where the singing starts — at most
    ~0.7 s per missing word, never into the previous line, on a vocal onset where the vocal stem is
    actually sounding. Same forward for missing words at the end. Returns [(start, end)] with a little
    slack around heard words and none where the window was extended (that IS the start/end)."""
    toks = [(li, t) for li, text in enumerate(texts) for t in text.split()]
    sm = SequenceMatcher(None, [norm(t) for _, t in toks], [norm(w["w"]) for w in ww], autojunk=False)
    times = {}
    for a, b, n in sm.get_matching_blocks():
        for k in range(n):
            times[a + k] = (ww[b + k]["start"], ww[b + k]["end"])
    win, lead, tail, unheard = [], [], [], set()
    for li in range(len(texts)):
        idx = [i for i, (l, _) in enumerate(toks) if l == li]
        got = [i for i in idx if i in times]
        win.append((times[got[0]][0], times[got[-1]][1]) if got else None)
        lead.append(got[0] - idx[0] if got else 0)
        tail.append(idx[-1] - got[-1] if got else 0)
    venv = envelope(librosa.load(STEMS / "vocals.wav", sr=SR, mono=True)[0], int(librosa.get_duration(path=str(MIX)) * FPS))
    von = vocal_onsets()
    sounding = lambda t: venv[min(len(venv) - 1, int(t * FPS)):min(len(venv), int(t * FPS) + 15)].mean() > 0.15
    for li, w in enumerate(win):
        if w is None:
            continue
        s, e = w
        if lead[li]:
            floor = max(s - 0.7 * lead[li], (win[li - 1][1] + 0.1) if li and win[li - 1] else 0.0)
            cands = [t for t in von if floor <= t < s - 0.1 and sounding(t)]
            s = float(cands[0]) if cands else floor
        if tail[li]:
            nxt = win[li + 1][0] - 0.1 if li + 1 < len(win) and win[li + 1] else e + 0.7 * tail[li]
            ceil = min(e + 0.7 * tail[li], nxt)
            t = e
            while t < ceil and sounding(t):
                t += 0.05
            e = max(e + 0.2, min(t, ceil))
        win[li] = (s, e)
    for li, w in enumerate(win):  # lines Whisper missed entirely: between their neighbours
        if w is None:
            prev = next((win[j][1] for j in range(li - 1, -1, -1) if win[j]), 0.0)
            nxt = next((win[j][0] for j in range(li + 1, len(win)) if win[j]), prev + 3.0)
            win[li] = (prev, max(prev + 0.5, nxt))
            lead[li] = tail[li] = 1
            unheard.add(li)
            if not SRT.exists():
                print(f"WARNING: line {li} '{texts[li]}' not heard by Whisper; placed {win[li][0]:.2f}-{win[li][1]:.2f}, check the QA plot")
    return [(s - (0 if lead[i] else 0.15), e + (0 if tail[i] else 0.15)) for i, (s, e) in enumerate(win)], unheard, sounding


def line_windows(ww):
    """[(start, end, text)] and [(tag, time)]. With Suno's .srt, its windows are kept unless the vocal
    disagrees by more than 1 s (Suno's line times drift, e.g. a whole second chorus placed ~3 s early)."""
    if SRT.exists():
        texts, srt_win, tag_at = parse_srt()
        heard, unheard, sounding = heard_windows(ww, texts)
        dur = librosa.get_duration(path=str(MIX))
        held = lambda a, b: np.mean([sounding(t) for t in np.arange(a, b, 0.05)]) > 0.6 if b > a else False
        wins = []
        for i, ((ss, se), (hs, he)) in enumerate(zip(srt_win, heard)):
            prev_end = wins[-1][1] if wins else 0.0
            if i in unheard:
                # Whisper heard nothing: Suno's window is the only evidence. Clip it to the song and to where
                # the vocal actually sounds in it (Suno's last window often runs past the end of the audio).
                s, e = ss, min(se, dur)
                live = [t for t in np.arange(s, e, 0.05) if sounding(t)]
                if live:
                    s, e = max(s, live[0]), live[-1] + 0.15
                print(f"NOTE: line {i} '{texts[i]}' not heard by Whisper; using Suno's {ss:.2f}-{se:.2f}, check the QA plot")
            else:
                # Suno's start is kept when close to the heard one, or when it is earlier and the vocal is
                # already sounding from it (a held first syllable that Whisper dates late) without
                # overlapping the previous line (a held last word of the previous line is not this line).
                keep_s = abs(ss - hs) <= 1.0 or (ss < hs and ss >= prev_end - 0.05 and held(ss, hs))
                s = ss if keep_s else hs
                e = se if abs(se - he) <= 1.0 else he
                if (s, e) != (ss, se):
                    print(f"NOTE: line {i} Suno window {ss:.2f}-{se:.2f} disagrees with the vocal; using {s:.2f}-{e:.2f}")
            wins.append((s, max(e, s + 0.3)))
        print("line windows from", SRT.name, "checked against the vocal")
    elif A.lyrics:
        texts, tag_at = parse_text()
        wins, _, _ = heard_windows(ww, texts)
        print("line windows from --lyrics aligned to Whisper (no .srt)")
    else:
        sys.exit("no timed lyrics: pass --lyrics <file> (plain text, one sung line per row, [Section] tags allowed)")
    lines = [(s, e, t) for (s, e), t in zip(wins, texts)]
    tags = [(name, lines[li][0]) for name, li in tag_at if li < len(lines)]
    return lines, tags


def align_words(lines, ww, on):
    out = []
    for li, (ls, le, text) in enumerate(lines):
        toks = text.split()
        cand = [w for w in ww if w["end"] > ls - 0.3 and w["start"] < le + 0.3]
        sm = SequenceMatcher(None, [norm(t) for t in toks], [norm(w["w"]) for w in cand], autojunk=False)
        t0, t1 = [None] * len(toks), [None] * len(toks)
        for a, b, n in sm.get_matching_blocks():
            for k in range(n):
                t0[a + k] = max(ls, cand[b + k]["start"])
                t1[a + k] = min(le, cand[b + k]["end"])
        hit = {i for i in range(len(toks)) if t0[i] is not None}
        anchors = [(-1, ls, ls)] + [(i, t0[i], t1[i]) for i in sorted(hit)] + [(len(toks), le, le)]
        for (i, _, e), (j, s, _) in zip(anchors, anchors[1:]):
            gap = j - i - 1
            if gap > 0:
                step = (s - e) / gap
                for k in range(gap):
                    t0[i + 1 + k], t1[i + 1 + k] = e + k * step, e + (k + 1) * step
        words = []
        for i, tok in enumerate(toks):
            s = t0[i]
            near = on[np.abs(on - s) < 0.06] if len(on) else []
            if len(near):
                s = float(near[np.argmin(np.abs(near - s))])
            if words:
                s = max(s, words[-1]["start"] + 0.04)
            words.append(dict(w=tok, start=round(s, 3), end=round(float(t1[i]), 3), conf=1.0 if i in hit else 0.5))
        for a, b in zip(words, words[1:]):
            a["end"] = round(min(max(a["end"], a["start"] + 0.05), b["start"]), 3)
        words[-1]["end"] = round(max(words[-1]["end"], words[-1]["start"] + 0.15), 3)
        out.append(dict(i=li, text=text, start=words[0]["start"], end=words[-1]["end"], words=words))
        flag = "" if len(hit) >= 0.5 * len(toks) else "   <-- few matches, check"
        print(f"L{li:02d} {ls:7.2f}-{le:7.2f} matched {len(hit)}/{len(toks)}  "
              + " ".join(f"{w['w']}@{w['start']:.2f}" for w in words) + flag)
    return out


# ----------------------------------------------------------------------------- 5: music
def band(y, lo=None, hi=None):
    if lo and hi:
        sos = butter(4, [lo, hi], btype="band", fs=SR, output="sos")
    elif lo:
        sos = butter(4, lo, btype="high", fs=SR, output="sos")
    else:
        sos = butter(4, hi, btype="low", fs=SR, output="sos")
    return sosfiltfilt(sos, y)


def envelope(y, n):
    """100 fps RMS envelope (46 ms window), one-pole attack/release, normalised to its 99th pct."""
    hop = SR // FPS
    pad = np.pad(y, (1024, 1024))
    rms = np.array([np.sqrt(np.mean(pad[i * hop:i * hop + 2048] ** 2)) for i in range(n)])
    out = np.zeros_like(rms)
    a_up, a_dn = np.exp(-1 / (0.010 * FPS)), np.exp(-1 / (0.090 * FPS))
    v = 0.0
    for i, x in enumerate(rms):
        a = a_up if x > v else a_dn
        v = a * v + (1 - a) * x
        out[i] = v
    p = np.percentile(out, 99) or 1.0
    return np.clip(out / p, 0, 1)


def onsets(y, lo, hi, min_gap, thresh):
    """Attack times of a band: peaks of the positive slope of its smoothed energy."""
    e = band(y, lo, hi) ** 2
    hop = SR // 1000  # 44 samples: convert with hop / SR, never / 1000
    e = uniform_filter1d(e, 10 * hop)[::hop]
    d = np.maximum(np.diff(np.log(e + 1e-9 * e.max())), 0)
    d = uniform_filter1d(d, 3)
    pk, _ = find_peaks(d, height=thresh * d.max(), distance=min_gap)
    lvl = np.array([e[min(len(e) - 1, p + 15)] for p in pk])
    strength = np.clip(np.sqrt(lvl / (np.percentile(lvl, 95) or 1)), 0, 1) if len(pk) else lvl
    keep = strength > 0.2
    return [[round(p * hop / SR, 3), round(float(s), 3)] for p, s in zip(pk[keep], strength[keep])]


def analyse_audio(tags):
    mix, _ = librosa.load(MIX, sr=SR, mono=True)
    stems = {k: librosa.load(STEMS / f"{k}.wav", sr=SR, mono=True)[0] for k in ("vocals", "drums", "bass", "other")}
    dur = len(mix) / SR
    n = int(dur * FPS)

    # tempo + phase: constant grid fitted to the drum onset envelope
    oenv = librosa.onset.onset_strength(y=stems["drums"], sr=SR, hop_length=441)  # 100 fps
    tempo = float(librosa.feature.tempo(onset_envelope=oenv, sr=SR, hop_length=441, start_bpm=A.bpm_hint)[0])
    best = None
    for bpm in np.arange(tempo - 1.5, tempo + 1.5, 0.005):
        per = 60 / bpm
        for ph in np.arange(0, per, 0.002):
            idx = np.round((ph + np.arange(0, dur - ph, per)) * FPS).astype(int)
            idx = idx[idx < len(oenv)]
            sc = oenv[idx].mean()
            if best is None or sc > best[0]:
                best = (sc, bpm, ph)
    _, bpm, phase = best
    per = 60 / bpm
    beats = np.arange(phase, dur, per)

    # kicks: a low-band attack near each grid beat (robust for four-on-the-floor and sparse kicks alike)
    khop = SR // 1000
    lowe = uniform_filter1d(band(stems["drums"], None, 120) ** 2, SR // 100)[::khop]
    ref = np.percentile(lowe, 99) or 1.0
    kicks = []
    for b in beats:
        i0, i1 = int((b - 0.05) * SR / khop), int((b + 0.08) * SR / khop)
        if i0 < 1 or i1 >= len(lowe):
            continue
        seg = lowe[i0:i1]
        lvl = seg.max() / ref
        if lvl > 0.15 and seg.max() > 3 * lowe[max(0, i0 - 60):i0].mean():
            kicks.append([round((i0 + int(np.argmax(np.diff(seg)))) * khop / SR, 3), round(float(min(1, np.sqrt(lvl))), 3)])
    snares = onsets(stems["drums"], 1500, 5000, 150, 0.3)
    hats = onsets(stems["drums"], 7000, None, 80, 0.3)
    kt, st = np.array([k[0] for k in kicks]), np.array([s[0] for s in snares])
    hats = [h for h in hats if not ((len(kt) and np.min(np.abs(kt - h[0])) < 0.03) or (len(st) and np.min(np.abs(st - h[0])) < 0.04))]

    # bar phase: drum re-entries vote; fallback snare on 2 & 4; else 0
    drum_env = envelope(stems["drums"], n)
    before = np.convolve(drum_env, np.ones(FPS) / FPS)[:n]
    entries = []
    for i in range(FPS + 1, n):
        if before[i - 1] < 0.1 and drum_env[i] > 0.5 and (not entries or i / FPS - entries[-1] > 2):
            entries.append(i / FPS)
    if entries:
        votes = np.bincount([int(round((e - phase) / per)) % 4 for e in entries], minlength=4)
        how = f"drum re-entries {[round(e, 2) for e in entries]} votes {votes.tolist()}"
    else:
        near = lambda t: len(st) and np.min(np.abs(st - t)) < 0.05
        votes = np.array([sum(near(b) for i, b in enumerate(beats) if (i - o) % 4 in (1, 3))
                          - sum(near(b) for i, b in enumerate(beats) if (i - o) % 4 in (0, 2)) for o in range(4)])
        how = f"no drum re-entries; snare-on-2&4 scores {votes.tolist()} (CHECK the downbeats in the QA plot)"
    off = int(np.argmax(votes))
    downbeats = beats[off::4]

    snap = lambda t: float(downbeats[np.argmin(np.abs(downbeats - t))])
    count, sections = {}, []
    edges = [("intro", 0.0)] + [(name, snap(t)) for name, t in tags]
    for (name, s), nxt in zip(edges, edges[1:] + [("end", dur)]):
        count[name] = count.get(name, 0) + 1
        sections.append(dict(name=name if name == "intro" else f"{name}{count[name]}", start=round(s, 3), end=round(nxt[1], 3)))
    sections = [s for s in sections if s["end"] > s["start"]]

    env = dict(rms=envelope(mix, n), low=envelope(band(mix, None, 150), n), mid=envelope(band(mix, 150, 2000), n),
               high=envelope(band(mix, 4000, None), n), vocal=envelope(stems["vocals"], n), drums=drum_env,
               bass=envelope(stems["bass"], n), other=envelope(stems["other"], n))
    audio = dict(
        duration=round(dur, 3), bpm=round(bpm, 3), beat_period=round(per, 5), time_signature=4,
        beats=[round(float(b), 3) for b in beats], downbeats=[round(float(b), 3) for b in downbeats],
        sections=sections, fps=FPS, **{k: [round(float(x), 3) for x in v] for k, v in env.items()},
        onsets=dict(kick=kicks, snare=snares, hat=hats, vocal=[[round(float(t), 3), 1.0] for t in vocal_onsets()]),
        notes=f"song {A.song}: constant-tempo grid fitted to the htdemucs drum stem; bar phase from {how}. "
              "Lyric words from Whisper on the vocal stem (analysis/song_analysis.py).",
    )
    print(f"tempo {bpm:.3f} BPM, first beat {phase:.3f}, bar offset {off} from {how}")
    print(f"{len(kicks)} kicks, {len(snares)} snares, {len(hats)} hats")
    print("sections:", ", ".join(f"{s['name']} {s['start']:.2f}" for s in sections))
    return audio


# ----------------------------------------------------------------------------- 6: QA plot
def plot(lyrics, audio, t0, t1):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    y, _ = librosa.load(STEMS / "vocals.wav", sr=22050, mono=True, offset=t0, duration=t1 - t0)
    S = librosa.amplitude_to_db(np.abs(librosa.stft(y, n_fft=1024, hop_length=128)), ref=np.max)
    fig, ax = plt.subplots(2, 1, figsize=(22, 8), sharex=True, gridspec_kw=dict(height_ratios=[3, 1]))
    ax[0].imshow(S, origin="lower", aspect="auto", extent=[t0, t1, 0, 11025], cmap="magma", vmin=-70)
    ax[0].set_ylim(0, 5000)
    for l in lyrics:
        for w in l["words"]:
            if t0 <= w["start"] <= t1:
                ax[0].axvline(w["start"], color="cyan", lw=0.8)
                ax[0].text(w["start"], 4700, w["w"], color="white", fontsize=8, rotation=90, va="top")
    x = np.arange(len(audio["drums"])) / FPS
    ax[1].plot(x, audio["drums"], lw=0.6, color="k")
    for kind, c in (("kick", "r"), ("snare", "b")):
        for t, _ in audio["onsets"][kind]:
            if t0 <= t <= t1:
                ax[1].axvline(t, color=c, lw=0.8, alpha=0.6)
    for d in audio["downbeats"]:
        if t0 <= d <= t1:
            ax[1].axvline(d, color="orange", lw=2)
    ax[1].set_xlim(t0, t1)
    ax[0].set_title("cyan = word starts   |   red = kicks, blue = snares, orange = downbeats (bar 1)")
    fig.tight_layout()
    fig.savefig(WORK / "qa.png", dpi=90)
    print("QA plot:", WORK / "qa.png")


if __name__ == "__main__":
    prepare_audio()
    separate()
    ww = whisper_words()
    lines, tags = line_windows(ww)
    lyrics = align_words(lines, ww, vocal_onsets())
    audio = analyse_audio(tags)
    (OUT / "lyrics.json").write_text(json.dumps(dict(lines=lyrics, extras=[], notes=audio["notes"]), indent=1))
    (OUT / "audio.json").write_text(json.dumps(audio))
    print("wrote", OUT / "lyrics.json", "and", OUT / "audio.json")
    # default plot window: the first chorus (or the first 20 s of singing)
    t0, t1 = A.plot_from, A.plot_to
    if t0 is None:
        ch = next((s for s in audio["sections"] if s["name"].startswith("chorus")), None)
        t0 = max(0.0, (ch["start"] if ch else lyrics[0]["start"]) - 3)
    if t1 is None:
        t1 = min(audio["duration"], t0 + 21)
    plot(lyrics, audio, t0, t1)
