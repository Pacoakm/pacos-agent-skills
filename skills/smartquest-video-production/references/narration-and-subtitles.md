# Narration and subtitles

## Who is watching

Hong Kong secondary students preparing for **English-language** DSE papers, taught in Cantonese.
They think about the subject in Cantonese but must read and answer in English. The subtitle
style follows that reality exactly.

## Every cue is bilingual

**繁體中文書面語 on top. English underneath, and smaller.**

```
        同一弧上的圓周角相等。               ← 中文, SIZE_CAPTION
   Inscribed angles on the same arc are equal.   ← English, SIZE_CAPTION_EN (0.78×)
```

Two lines, two jobs. The Chinese is the line the student **reads** — it is in the language they
think in, so understanding costs them nothing. The English is the line they must **recognise in
the paper**, in the paper's own words. The size difference is what says which is which: set them
equal and the block reads as two competing sentences instead of one cue with its exam wording
underneath.

Both come from one cue in `video-plan.json`: `text` is the Chinese, `en` is the English. A cue
missing `en` fails the build.

### The 中文 line is written in Chinese

Use the Chinese name of the term. **No English words in this line** — the English line directly
underneath is where the term lives now.

| Write | Not |
|---|---|
| 同一弧上的圓周角相等。 | 同一弧上的 inscribed angle 相等。 |
| 兩個等腰三角形的底角相等。 | 兩個 isosceles triangle 的 base angles 相等。 |
| 沉澱物是硫酸鋇。 | precipitate 是 barium sulphate。 |

This changed when the caption became bilingual, and the reason is that the old form now prints
the term **twice**, two lines apart, in a caption that has to fit a phone. It also wrecks the
line: 「同一弧上的 inscribed angle 相等。」 is 12 字 and wraps to two lines in a 9:16 frame,
while 「同一弧上的圓周角相等。」 is 11 字 and fits on one.

**What stays Latin in the 中文 line**, because it has no Chinese form a DSE student would
recognise:

| | Examples |
|---|---|
| ALL-CAPS abbreviations | `SAS`, `ASA`, `SSS`, `RHS`, `AAS`, `ATP`, `DNA` |
| Single letters — point labels, variables | `O`, `A`, `x`, `n` |
| Notations and units | `pH`, `mol`, `sin`, `cos`, `log` |
| Symbols and formulae | always, via `MathTex` |

`build_captions.py` enforces this: any other Latin word in `text` fails the build, naming the
word. The allowed notations are the `LATIN_OK_IN_ZH` set there — extend it in the script if a
subject genuinely needs another, do not work around it per cue.

**This rule is about the caption, not about the picture.** On the frame, point labels, DSE
reasons and named results stay in English exactly as before — `base ∠s, isos. △` is what the
student writes in the paper, so it is what the figure shows. See `on-screen-language.md`. The
caption changed because it gained a second line to put the English on; the frame did not.

Write 書面語, not 口語. The teacher reads it aloud in Cantonese, so it must be natural to read,
but it is written Chinese on the page.

| Write | Not |
|---|---|
| 我們可以看到⋯ | 我哋可以睇到⋯ |
| 因此 | 所以咁 |
| 這條題目要求 | 呢條題目要求 |
| 首先 | 首先我哋 |

### The English line is the paper's English

The same sentence, in the words an examiner would use — not a word-by-word translation of the
書面語. It carries the subject terms **verbatim**: `sine law`, `ext. ∠ of △`, `inscribed angle`,
`homologous series`, `precipitate`, and the command words `state`, `explain`, `deduce`, `hence`.

The terms declared in `terms` are coloured `CAPTION_TERM` wherever they occur, and the theme
matches the form actually written — `inscribed angle` in the plan marks `Inscribed angles` in the
sentence, capital and plural included.

Never bracket one language inside the other. `圓周角（inscribed angle）` on the Chinese line is
the worst of both: it doubles the reading load on the line that exists to be easy, and the
English line beneath already says it.

## Subtitle format

| Rule | Value |
|---|---|
| One cue on screen at a time | always |
| Languages | both, always — 中文 above, English below |
| Maximum length, 中文 | **24 全形字** per line in 16:9, **12** in 9:16 · 2 lines maximum |
| Maximum length, English | **42 characters** per line in 16:9, **32** in 9:16 · 2 lines maximum |
| Minimum time on screen | **2.0 s**, even for a short cue |
| Reading rate | ≤ **4.0 字/秒** on the 中文 line, counting a Latin word as 2 字 |
| Cue boundaries | break at a 語義 boundary — never mid-term, never mid-formula |
| Punctuation | 全形（，。？：) in the 中文 line, no 空格 before or after; ordinary English punctuation in the English line |
| Position | inside the caption band from `Stage.caption_bottom` — never over the diagram |

**Line length is a property of the frame, not of the format.** The usable width holds 34 全形字
in 16:9 but only **12.6** in 9:16, so the single 24-字 limit that used to apply to both was a
landscape number: in a short it silently wrapped every line in two and pushed the block onto the
figure. Portrait is the binding case in everything below.

**Only the 中文 line is rate-gated.** It is the line being read; the English is the same sentence
in the exam's words, there to be recognised rather than read through. Rate-gating it as well
would make it the binding constraint on every cue in the film and stretch a five-minute lesson by
a third, to slow down a line nobody reads word by word. What the English must not do is take a
third line — hence the length limit, which is what actually pushes the block onto the figure.

`build_captions.py` also lays every cue out for real and measures the block against the reserved
band, so a cue that would sit on the diagram fails the build instead of surfacing in the
composite.

## The narration is spoken from the 中文 line

The teacher reads the Chinese, and **says the subject term in English** where the English line
supplies it — 「同一弧上嘅 inscribed angle 相等」. That is how the subject is actually taught in a
Hong Kong classroom, and it is why the term is on screen in English at the same moment.

So the cue is one piece of writing with three uses: the Chinese is printed and read, the English
is printed and recognised, and the spoken line is the Chinese with the terms in English. Write
the cue once; `narration-sheet.md` carries the spoken form, with the pronunciation of every term.

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

The sidecar carries **both** languages in one cue, 中文 first, the same order as the burned-in
track. It is also what makes the lesson findable in English at all, now that the Chinese line no
longer contains the terms: the English line is the indexable text.

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

What is not negotiable is the text itself — the 書面語 rules, both language rules and the format
table above apply whichever renderer draws it. A renderer that can only carry one line is not an
option: the cue is two lines.

## Handing the script to the teacher

The teacher records **to picture**, after the animation is locked. Produce `narration-sheet.md`.
The 稿 column is the **spoken** form — the Chinese line with its terms said in English — so the
teacher never has to work it out from two printed lines while recording:

| Shot | 時間碼 | 可用秒數 | 字數 | 稿 | 字幕英文 |
|---|---|---|---|---|---|
| S03 | 00:18.000–00:30.000 | 12.0 | 41 | 現在把 P 沿着 major arc 移動⋯ | Now move P along the major arc… |

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
