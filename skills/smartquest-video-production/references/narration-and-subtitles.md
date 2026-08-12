# Narration and subtitles

The narration and the subtitles are the same text. Write it once.

## Who is watching

Hong Kong secondary students preparing for **English-language** DSE papers, taught in Cantonese.
They think about the subject in Cantonese but must read and answer in English. The subtitle
style follows that reality exactly.

## The language rule

**繁體中文書面語 is the frame. Subject terms stay in English.**

Write 書面語, not 口語. The teacher reads it aloud in Cantonese, so it must be natural to read,
but it is written Chinese on the page.

| Write | Not |
|---|---|
| 我們可以看到⋯ | 我哋可以睇到⋯ |
| 因此 | 所以咁 |
| 這條題目要求 | 呢條題目要求 |
| 首先 | 首先我哋 |

### What stays in English

Anything the student must recognise, write, or search in the exam paper:

- **Named results and reasons** — `sine law`, `cosine law`, `ext. ∠ of △`, `base ∠s, isos. △`,
  `alt. ∠s, AB // CD`, `∠s in the same segment`
- **Quantities and units** — `acceleration`, `momentum`, `enthalpy`, `mole`, `pH`
- **Objects the paper names** — `inscribed angle`, `tangent`, `displacement`, `precipitate`,
  `homologous series`, `allele`
- **Command words** — `state`, `explain`, `deduce`, `hence`, `sketch`
- **Symbols and formulae** — always, via `MathTex`

### What is written in Chinese

Ordinary explanation, logical connectives, instructions to the viewer, and everything that is
not a term the student will meet in the paper.

> 由圓心 O 畫半徑，形成兩個 isosceles triangle，它們的 base angles 相等。

Never translate a term into Chinese and then bracket the English. `圓周角（inscribed angle）` is
worse than `inscribed angle` — it doubles the reading load and teaches the wrong word.

The first time a term appears in a video, colour it with `AUX` (the `terms=[...]` argument of
`body()` in the theme). After that, leave it plain.

## Subtitle format

| Rule | Value |
|---|---|
| One cue on screen at a time | always |
| Maximum length | 24 全形字 per line, 2 lines maximum |
| Minimum time on screen | **2.0 s**, even for a short cue |
| Reading rate | ≤ **4.0 字/秒**, counting a Latin word as 2 字 |
| Cue boundaries | break at a 語義 boundary — never mid-term, never mid-formula |
| Punctuation | 全形（，。？：), no 空格 before or after |
| Position | inside the caption safe band from `Stage.caption_y` — never over the diagram |

Latin words count as 2 全形字 because they take about that much width and reading time. A cue
of `同一弧上的 inscribed angle 相等。` is `5 + 2×2 + 3 = 12` 字, so it needs at least 3.0 s.

## Where subtitles live

**Not inside the lesson scenes.** They are a separate transparent caption track:

```
video-plan.json  ──►  build_captions.py  ──┬─►  src/captions.py  ──►  CaptionTrack.mov (alpha)
                                           └─►  out/subtitles.srt        │
                                                                          ▼
                                            out/picture.mp4  ──►  ffmpeg overlay  ──►  picture-subbed.mp4
```

The reason is iteration cost: a typo fix must never re-render the mathematics. It also gives
the sidecar `.srt` for free, which matters — YouTube indexes it, so a student searching
"DSE sine law" can find the lesson. Auto-generated captions would mangle the English terms.

### Burned or sidecar?

| Output | Subtitles |
|---|---|
| 16:9 long form, YouTube | ship **both** — a clean master plus `subtitles.srt` |
| 16:9 for 微信視頻號 / 小紅書 / IG | burned-in variant |
| 9:16 shorts | **burned-in, always** — these platforms do not take a sidecar, and the feed autoplays muted |

Both variants come from the same cue data, so they can never disagree.

### Captions are exempt from the Manim rules

Everything on a lesson frame must be a Manim mobject that enters with an animation (hard rule 18).
Captions are **not** on the frame — they are a separate track composited afterwards — so neither
rule applies to them:

- **Any renderer is fine.** The `CaptionTrack.mov` route above is the default only because
  `overlay` is always available, while `ass`/`subtitles` need a libass-enabled ffmpeg. If this
  machine's ffmpeg has libass (`ffmpeg -h filter=ass`), burning the ASS/`.srt` directly is equally
  correct and faster. What may **not** change is the source: cue data comes from
  `video-plan.json`, so the burned-in and sidecar versions can never disagree.
- **A cue cuts on and off.** Never fade, write or slide a subtitle in. The entrance would eat
  reading time the pacing budget has already given to the words, and it drifts the cue away from
  the voice it is transcribing.

What is not negotiable is the text itself — the 書面語 rules, the English-term rule and the
format table above apply whichever renderer draws it.

## Handing the script to the teacher

The teacher records **to picture**, after the animation is locked. Produce `narration-sheet.md`:

| Shot | 時間碼 | 可用秒數 | 字數 | 稿 |
|---|---|---|---|---|
| S03 | 00:18.000–00:30.000 | 12.0 | 41 | 現在把 P 沿着 major arc 移動⋯ |

Include, in the same file:

- every English term with its intended pronunciation, so `sine` is not read as `sign`
- which shots contain a deliberate silent beat, so the teacher does not fill it
- a reminder that one continuous take per section syncs far more easily than per-shot takes

`out/guide-track.mp4` accompanies it: the subbed picture with a burned shot marker and a running
timecode.

## Never

- Never synthesize narration. No TTS, no placeholder voice, not even for an animatic.
- Never describe the video as finished while the audio is missing. The status is
  `awaiting-teacher-recording`.
- Never stretch or pitch-shift a returned recording to fit a stale timeline. Change the plan,
  re-render the affected scenes, re-verify.
