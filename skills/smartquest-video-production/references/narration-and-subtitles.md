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

### Numbers are Arabic numerals

A count or a measurement is written `2`, not `兩`. A digit is read at a glance, which is all a
subtitle gets, while a spelled-out numeral has to be parsed as a word first — and quantities are
exactly what the student is tracking through a worked example.

| Write | Not |
|---|---|
| 由圓心 O 畫 2 條半徑。 | 由圓心 O 畫兩條半徑。 |
| 這個 angle 是 30°。 | 這個 angle 是三十度。 |
| 分 3 步做。 | 分三步做。 |

**A numeral that is part of a word stays Chinese**: 三角形, 四邊形, 二次方程, 一次函數, 十分重要,
一定, 一樣, 進一步. The rule is about counting, not about the character.

Put a space between a half-width numeral and the Chinese around it — `畫 2 條` — the same spacing
the Latin letters already get. Not before 全形 punctuation, and not before a unit that attaches:
`30°`, `50%`.

`build_captions.py` reports this as a **note** rather than failing the build. It looks for a
Chinese numeral bound to a measure word (`兩個`, `三條`, `五次`), which is the counting
construction; that pattern is narrow but Chinese is not, so a false positive should cost a glance
rather than a build.

Write 書面語, not 口語. The teacher reads it aloud in Cantonese, so it must be natural to read,
but it is written Chinese on the page.

| Write | Not |
|---|---|
| 我們可以看到⋯ | 我哋可以睇到⋯ |
| 因此 | 所以咁 |
| 這條題目要求 | 呢條題目要求 |
| 首先 | 首先我哋 |

### The English line is the paper's English — and it is ONE line

The same sentence, in the words an examiner would use — not a word-by-word translation of the
書面語. It carries the subject terms **verbatim**: `sine law`, `ext. ∠ of △`, `inscribed angle`,
`homologous series`, `precipitate`, and the command words `state`, `explain`, `deduce`, `hence`.

**Keep it on one line.** It is the secondary line: the eye takes it in as a phrase under the
Chinese, and a second line turns that glance into a read — which is also the moment the block
starts pushing up onto the figure. A 16:9 line holds about **102 characters**, so English that
wraps there is a sentence written too long, and `build_captions.py` rejects it.

Write it shorter by cutting what the Chinese line already carried, not by dropping the term:

| One line | Two lines |
|---|---|
| Inscribed angles on the same arc are equal. | As we can see from the diagram, any two inscribed angles standing on the same arc will always be equal. |
| The two triangles satisfy SAS, so they are congruent. | Because the two triangles satisfy the SAS condition, we can conclude that they are congruent to each other. |

The openers are what to cut first — `As we can see`, `Because`, `we can conclude that`. The
Chinese line has already done the connecting; the English is there to name the thing in the
paper's words.

**9:16 takes two English lines, and that is fine.** A portrait line holds about **38 characters**
and exam English does not always fit that — `Inscribed angles on the same arc are equal.` is 43.
The band reserves two English lines in a short for exactly this reason, so write the sentence the
paper would use and let it wrap. What a short still may not do is take a **third** line; that is
a gate. Do not shrink the type to buy a line either: the caption size is fixed for the whole film.

### `terms` names both forms, and both light up

`terms` is a **mapping from the English to the Chinese**:

```json
"terms": {"isosceles triangle": "等腰三角形", "inscribed angle": "圓周角", "SAS": ""}
```

Both forms are marked in `CAPTION_TERM`, in the same colour, on their own line — so the student
sees 等腰三角形 and `isosceles triangles` light up together and reads them as one thing. That
pairing is the whole point of a bilingual caption; marking only the English would teach the word
without connecting it to the idea the student already has.

Map a term to `""` when it genuinely has no Chinese form — `SAS`, `pH` — and only the English
occurrence is marked, deliberately. A bare list still works and means English only, and the build
reports it, because it is nearly always an oversight rather than a decision.

The theme matches the form actually written: `inscribed angle` in the plan marks `Inscribed
angles` in the sentence, capital and plural included, and the Chinese form is matched literally
since Chinese has neither case nor inflection. Both forms are also protected from line breaks, so
`等腰三角形` is never split across two lines any more than `isosceles triangle` is.

Never bracket one language inside the other. `圓周角（inscribed angle）` on the Chinese line is
the worst of both: it doubles the reading load on the line that exists to be easy, and the
English line beneath already says it.

## Subtitle format

| Rule | Value |
|---|---|
| One cue on screen at a time | always |
| Languages | both, always — 中文 above, English below |
| Maximum length, 中文 | **24 全形字** per line in 16:9, **15** in 9:16 · 2 lines maximum |
| Maximum length, English | **one line**: ≤ 90 characters in 16:9. In 9:16, ≤ 36 on one line, 2 lines allowed |
| Numbers | Arabic — 「2 個」, not 「兩個」 |
| Minimum time on screen | **2.0 s**, even for a short cue |
| Reading rate | ≤ **4.0 字/秒** on the 中文 line, counting a Latin word as 2 字 |
| Cue boundaries | break at a 語義 boundary — never mid-term, never mid-formula |
| Punctuation | 全形（，。？：) in the 中文 line, no 空格 before or after; ordinary English punctuation in the English line |
| Position | inside the caption band from `Stage.caption_bottom` — never over the diagram |

**Line length is a property of the frame, not of the format.** The usable width holds 39.9 全形字
in 16:9 but only **15.2** in 9:16 — and 102.9 Latin characters against **38.7**. The single 24-字
limit that used to apply to both was a landscape number: in a short it silently wrapped every line
in two and pushed the block onto the figure. Portrait is the binding case in everything below.

The character limits are a fast proxy; the build also lays each cue out and counts the lines it
really sets on, because the wrap depends on the actual glyphs. 90 characters of ordinary English
fits one 16:9 line with room, but 90 characters of `m` would not — and the measurement, not the
count, is what decides.

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
                                           │                             │
                                           │                             ▼
                                           │     out/picture.mp4  ──►  ffmpeg overlay  ──►  picture-subbed.mp4
                                           │
                                           └─►  out/subtitles.srt ──┬─►  YouTube sidecar
                                                                    │
                                                                    └─►  muxed SOFT into out/draft.mp4
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
| **Gate 3 draft** | **soft track, always** — `mov_text` muxed into `out/draft.mp4`, never burned |
| 16:9 long form, YouTube | ship **both** — a clean master plus `subtitles.srt` |
| 16:9 for 微信視頻號 / 小紅書 / IG | burned-in variant |
| 9:16 shorts | **burned-in, always** — these platforms do not take a sidecar, and the feed autoplays muted |

All of them come from the same cue data, so they can never disagree.

The draft is soft for reasons that stop applying at the master. At 854×480 burned type would be
reviewed at a resolution the master does not have; a typo would cost a re-encode of the draft
rather than a rebuilt sidecar; and the reviewer could not switch the words off to look at the
picture alone. It is also the cheap way to run `build_captions.py`'s pacing and layout gates a
whole gate earlier — a cue that would land on the diagram then fails at Gate 3, before the
1080p60 render exists.

```bash
ffmpeg -y -i out/draft-picture.mp4 -i out/subtitles.srt \
  -c:v copy -c:s mov_text -metadata:s:s:0 language=zho -disposition:s:0 default \
  out/draft.mp4
ffprobe -v error -select_streams s -show_entries stream=index,codec_name -of csv=p=0 out/draft.mp4
```

`mov_text` is the only subtitle codec MP4 carries, and it is built into ffmpeg — unlike `ass`
and `subtitles`, it needs no libass. Check the stream is there before sending the draft: dropping
`-c:s` produces a video with no subtitles and no error. Tell the user it is a **soft** track and
may need turning on in their player.

### Captions are exempt from the Manim rules

Everything on a lesson frame must be a Manim mobject that enters with an animation (hard rule 20).
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
