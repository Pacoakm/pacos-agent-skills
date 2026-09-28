# Analysis: the song as data

```bash
cd <project>/analysis
uv run python song_analysis.py --song <id> --audio <song.m4a|mp3|wav> [--lyrics lyrics.txt] \
    --prompt "unusual words in the song" [--language en] [--bpm-hint 126] [--plot-from 26 --plot-to 47]
```

Every step is cached (stems, Whisper words): rerun freely. First run downloads Demucs and Whisper weights
into `analysis/.cache/`. On an M4 the whole thing takes ~30–80 s for a 2-minute song.

## The contract it writes

`data/<id>/lyrics.json`: `lines[]` of `{i, text, start, end, words[]}`, each word `{w, start, end, conf}`
(`conf` 1.0 = heard by Whisper, 0.5 = interpolated). `data/<id>/audio.json`: `bpm`, `beat_period`,
`beats[]`, `downbeats[]`, `sections[]`, 100 fps envelopes (`rms low mid high vocal drums bass other`),
`onsets.{kick,snare,hat,vocal}` as `[time, strength]`. Same schema as the P(doom) data, so every engine
helper (`lyrics.get`, `Lyrics.wordProgress`, `audio.beatAt`, `f.a.kick`, `audio.events`) just works.

## How lyric timing is found

1. **Line texts**: from Suno's embedded `.srt` (m4a) or from `--lyrics` (plain text, one sung line per row,
   `[Section]` tags on their own rows).
2. **Heard windows**: every lyric token is matched against every Whisper word (normalised, so
   `fifty-nine,` = `fiftynine`). Whisper often misses a line's first words (pickups, held notes): the
   window is extended back to the first vocal onset where the vocal stem is sounding, at most ~0.7 s per
   missing word and never into the previous line; likewise forward at the end.
3. **Suno's windows are a hint, checked against the vocal** (printed as `NOTE:`):
   - kept when within 1 s of the heard window;
   - Suno's start is also kept when it is *earlier* and the vocal is already sounding from it without
     overlapping the previous line — a held first syllable Whisper dates late (the test song's second
     "Blackboard," at 69.25, which Whisper put at 70.38);
   - replaced otherwise — on the test song Suno placed the whole second chorus ~3 s early (80.19 vs 83.00:
     the vocal there was the previous line's held last word);
   - a line Whisper never heard takes Suno's window, clipped to the song and to where the vocal sounds
     (the test song's last line "...wrong file." at 112.24, alone after 5 s of silence).
4. **Words**: matched words take Whisper's times, gaps are interpolated, starts snap to a vocal onset
   within 60 ms.

Measured on the test song: text-only vs Suno-assisted runs agree within 0.1 s on 135/167 words and within
0.3 s on 147/167; the chorus used for the clip matched the hand-checked data within 25 ms.

## How the music is found

- **Tempo**: constant grid fitted to the drum stem's onset envelope (Suno songs don't drift).
- **Kicks**: a low-band (<120 Hz) attack looked up around every grid beat. Robust for four-on-the-floor.
- **Bar phase (which beat is "1")**: votes from every **drum re-entry** after ≥ 1 s of drum silence —
  a drop lands on a downbeat. Fallback: snare on 2 & 4 (printed as "CHECK").
- **Sections**: `[Section]` tags placed at their first line, snapped to downbeats (`chorus1`, `verse2`…).

## Read the QA plot — always

`analysis/work/<id>/qa.png` (default window: the first chorus). Top: vocal spectrogram with cyan word
lines — each should sit where a syllable's energy starts. Bottom: drum envelope with red kicks, blue
snares and orange downbeats — the big hit after a quiet stretch must carry an orange line.

Also read the console: `matched k/n` per line (`<-- few matches, check`), `NOTE:` and `WARNING:` lines.
A line Whisper never heard is squeezed between its neighbours: don't build a key moment on it without
checking. If a word is wrong in a line you'll animate, fix it in `lyrics.json` by hand and say so in the treatment.

## Pitfalls already handled (don't reintroduce them)

- `SR // 1000` is **44 samples, not 1 ms** at 44.1 kHz: converting indices with `/ 1000` drifts ~70 ms by
  30 s and makes every kick "missing". Convert with `hop / SR`.
- In four-on-the-floor pop the kick's click puts 1.5–5 kHz energy on **every** beat, so a "snare band"
  says nothing about bar phase. The drum re-entries do.
- Whisper splits/merges tokens (`a.m.?`, `fifty-nine,`): compare normalised tokens only.
- A held last word makes Whisper's end run late; line ends come from the words, not the window.
