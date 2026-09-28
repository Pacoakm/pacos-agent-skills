# The song: writing for the picture, generating in Suno

## Lyrics that can be drawn

The video is made of **visual puns on the words**, so the lyrics decide how good it can look.

- Concrete nouns and objects (a clock, a stack of cups, an upload bar, a chart) beat feelings.
- Jargon from the audience's world is gold: it becomes diagrams, forms, error messages
  (`O of n squared`, `linked list`, `RecursionError`).
- A short, punchy hook line that can slam full-frame; a number or time in it is ideal (`Eleven fifty-nine`).
- Put the section you'll render (usually the first chorus) early: a 15–20 s chorus is a complete test.
- A deadpan twist at the end gives the outro a joke.
- Write original lyrics. Don't reuse someone else's.

Example written for the test clip (original, CUHK deadline humour), chorus:

```text
[Chorus]
Eleven fifty-nine, I'm running out of time
Coffee in my veins and a stack I can't unwind
Eleven fifty-nine, submit before the line
O of n squared panic, but I'm doing fine
```

Language: **English** aligns best (the Whisper and onset tools are tuned for it). Suno's Cantonese
often gets tones and diction wrong, and alignment is harder; offer `Cantonese ad-libs` in the style
instead, or warn the user before a fully Cantonese song.

## Suno settings (Create → **Advanced**, the UI as of 2026-09)

| Field | Value |
|---|---|
| Model (top-right dropdown) | newest available (`v6`); `v6-mini` on the free plan is fine for a test |
| + Audio / + Voice / + Inspo | leave alone |
| Lyrics | the full lyrics with `[Verse]`, `[Pre-Chorus]`, `[Chorus]`, `[Outro]` tags |
| Styles | e.g. `upbeat electro-pop, 126 bpm, punchy four-on-the-floor kick, synth bass, clear solo lead vocal, catchy chorus, witty, bright, minimal backing vocals` — ignore the grey placeholder and the suggested chips |
| More Options → Vocal Gender | pick one |
| Duration | Auto |
| Max Mode | Off for tests |
| Weirdness | ~30 % (fewer rewrites of melody/lyrics) |
| Style Influence | ~70 % (follow the style text) |
| Variety | Normal |
| Personalize | Off |
| Song Title | anything |

`clear solo lead vocal` and `minimal backing vocals` matter: a lead buried under backing pads is where
forced alignment fails. Each Create gives two takes; have the user listen to **the section you'll
render** for diction, a steady beat, and no skipped or rewritten lines. Regenerating 2–3 times is normal.
Suno may rewrite the style text into a longer one; that's fine.

## Download

`⋯` → Download → **m4a / MP3 / WAV**. An m4a from Suno carries:
- an embedded **subtitle track with timed lyric lines** (`song_analysis.py` extracts it automatically), and
- a `lyrics` metadata tag with the full text: `ffprobe -v error -show_entries format_tags=lyrics -of default=nw=1:nk=1 song.m4a > lyrics.txt`.

If the plan offers **stems**, download the vocal stem too (not yet wired into the script: Demucs is used).

## Rights

Suno's free plan is for non-commercial use; commercial use needs the song to have been made while on a
paid plan. Check Suno's current terms. Keep the audio out of public repos unless the user owns the rights.
