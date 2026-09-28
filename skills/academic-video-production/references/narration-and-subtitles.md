# Captions — the narration

**The captions are the narration.** There is no voice by default, so every explanation the
picture does not carry itself is *read*, on the caption track, while the picture is being
watched. That makes the caption script the spoken half of the video written down: not a
transcript of something said elsewhere, not a label for the frame, but the explanation.

**This is also the only place 中文 appears.** The picture — every title, label, term card, list
item, justification and problem statement — is English, in the lecture's notation (hard rule 29).
The caption track is the exemption: 繁體中文書面語 on top, English underneath at 0.78× the size.

## Who is reading

One viewer: Paco, a CUHK undergraduate, watching alone. The course is taught and written in
English — lectures, slides, tutorials, homework — but the thinking happens fastest in 中文. The
caption style follows that exactly: the 中文 line is the one read for meaning, and the English line
is the one that maps the idea back onto the notes, in the notes' words.

He can pause, and sometimes will. The captions are still written so that pausing is never
*needed* to keep up — a video that only works paused is a slide deck with extra steps.

## The language level

**Pitch at a viewer who has the course's prerequisites and does not yet understand this concept**
(hard rule 31, `lesson-patterns.md` pattern 11). Not talked down to — no re-explaining what a
matrix is in a linear-algebra course — and not talked past either: every word that belongs to
*this* concept is new until the video has bridged to it. An unexplained word is where the
reading stops being understanding and turns into decoding.

That governs the wording of every cue, not just the opening ones:

| | |
|---|---|
| One idea per cue | If it needs a comma to hold two thoughts, it is two cues. The 4 字/秒 budget is a ceiling, not a target |
| Plain word first | `方向不變` before `特徵向量`, `越來越貼近` before `收斂`. Use the technical word when the technical word **is** the thing being taught — not to sound precise. Prerequisite terms are fine; the viewer has them |
| One new term per cue | Two new terms in one sentence is a sentence nobody finishes |
| Never early | A term never appears — captioned or on the picture — before the shot that bridges to it, including in a cue that is "just setting up" |

書面語 does not mean formal: 「把這個矩陣作用在每一個向量上。」 is written Chinese and is also how a
person explains at a whiteboard. What the register bans is 口語 particles and 助詞, not everyday
vocabulary.

### A cue is a line of spoken explanation

With no voice, nothing else says *what to notice*, *why this step*, or *what just happened*. So a
cue is written as the next thing a person explaining this at a whiteboard would say — one idea,
pointed at what is on screen at that instant — not as a note, a heading or a label.

| A spoken-explanation cue | Not |
|---|---|
| 「現在把 x 代入第 2 條方程。」 / `Now substitute x into the second equation.` | 「代入法」 / `Substitution` — a heading, not an explanation |
| 「留意面積一直沒有變。」 / `Notice that the area never changes.` | 「面積不變性」 / `Area invariance` — a slide bullet |
| 「為甚麼這一步可以這樣做？」 / `Why is this step allowed?` | 「證明：」 / `Proof:` — a label the picture already carries |

Three consequences:

- **The cue lands with its beat.** It is the sentence explaining the step that is happening, so
  its start time is the beat's start time (`on-screen-language.md`, "Three things land
  together"). A cue that arrives before its beat describes something not yet there; one that
  arrives after has to be read back against a picture that has moved on.
- **It points by timing, never by direction.** 「請看左邊」 is never needed: the cue arrives as the
  thing it names moves, in that thing's colour.
- **A sentence removed from the picture comes here.** Every entry of `movedToNarration` in the
  plan is a sentence that left the frame; with no voice, the caption track is where it lands.

### The bridge: the plain word, then the term

Every knowledge point opens on something concrete I can see, and the term arrives last — case,
vary it, the **plain 中文 word** for what was seen, then the **English term** (pattern 11a). The two
lines carry different halves of that:

```
        但有兩個方向不變，只是被拉長。            ← the plain word, on the caption line
   But two directions only get stretched.         ← the English line, still plain
        ─── next cue ───
        這種向量稱為特徵向量。                    ← the Chinese name, per the rule below
   These are called eigenvectors.                 ← the English term — and `eigenvector`
                                                     is on the PICTURE at this moment, bold
```

At that one instant the term is met three times: 特徵向量 on the 中文 line, `eigenvectors` on the
English line — both lit in `CAPTION_TERM`, so they read as one thing — and **eigenvector** bold on
the picture, bound to the two lines it names.

The plain word — 「方向不變」 — is **caption only**. It is Chinese, so it can never go on the picture
(rule 29), and it should not: the picture's job at that moment is to show the two lines holding
still, and one beat later to carry the English term the notes use.

**Plain is not 口語.** The caption stays 書面語. What changes for a first meeting with a concept is
the **vocabulary**, not the register: everyday words, one clause, no 助詞.

## Every cue is bilingual

**繁體中文書面語 on top. English underneath, and smaller.**

```
        同一特徵值的特徵向量組成一個子空間。            ← 中文, SIZE_CAPTION
   Eigenvectors for one eigenvalue form a subspace.    ← English, SIZE_CAPTION_EN (0.78×)
```

Two lines, two jobs. The Chinese is the line I **read** — it is in the language I think in, so
understanding costs nothing. The English is the line I must **recognise in the notes**, in the
notes' own words. The size difference is what says which is which: set them equal and the block
reads as two competing sentences instead of one cue with its lecture wording underneath.

Both come from one cue in `video-plan.json`: `text` is the Chinese, `en` is the English. A cue
missing `en` fails the build.

### The 中文 line is written in Chinese

Use the Chinese name of the term. **No English words in this line** — the English line directly
underneath is where the term lives.

| Write | Not |
|---|---|
| 同一特徵值的特徵向量組成一個子空間。 | 同一 eigenvalue 的 eigenvector 組成 subspace。 |
| 這個數列收斂到 0。 | 這個 sequence converge 到 0。 |
| 樞軸左邊的元素都不大於它。 | pivot 左邊的 element 都不大於它。 |

The reason is that the mixed form prints the term **twice**, two lines apart, and wrecks the line:
a Latin word counts as 2 字 against the reading budget and sets wider than the Chinese it replaces,
so 「同一 eigenvalue 的 eigenvector 組成 subspace。」 costs more reading time and more width than
the all-Chinese line while telling me nothing the English line underneath does not already say.

**What stays Latin in the 中文 line**, because it has no Chinese form a reader would recognise
faster:

| | Examples |
|---|---|
| ALL-CAPS abbreviations | `DFS`, `BFS`, `SVD`, `LU`, `DNA`, `ATP` |
| Single letters — labels, variables | `A`, `P`, `x`, `n`, `O` |
| Notations and units | `pH`, `mol`, `sin`, `log`, `det`, `lim`, `mod`, `gcd`, `Var`, `Cov` — so `O(n)` and `O(n log n)` pass |
| Symbols and formulae | always |

`build_captions.py` enforces this: any other Latin word in `text` fails the build, naming the
word. The allowed notations are the `LATIN_OK_IN_ZH` set there — extend it in the script if a
course genuinely needs another, do not work around it per cue.

**This rule is about the caption, not about the picture.** On the frame, labels, justifications
and named results stay in English exactly as the notes print them — `(spectral theorem)` is what
the notes cite, so it is what the frame shows. See `on-screen-language.md`. The caption has a
second line to put the English on; the frame does not need one.

### Numbers are Arabic numerals

A count or a measurement is written `2`, not `兩`. A digit is read at a glance, which is all a
caption gets, while a spelled-out numeral has to be parsed as a word first — and quantities are
exactly what is being tracked through a computation.

| Write | Not |
|---|---|
| 由原點畫 2 個向量。 | 由原點畫兩個向量。 |
| 這個角是 30°。 | 這個角是三十度。 |
| 分 3 步做。 | 分三步做。 |

**A numeral that is part of a word stays Chinese**: 三角形, 二次方程, 一次函數, 二分搜尋, 十分重要,
一定, 一樣, 進一步. The rule is about counting, not about the character.

Put a space between a half-width numeral and the Chinese around it — `畫 2 個` — the same spacing
the Latin letters already get. Not before 全形 punctuation, and not before a unit that attaches:
`30°`, `50%`.

`build_captions.py` reports this as a **note** rather than failing the build. It looks for a
Chinese numeral bound to a measure word (`兩個`, `三條`, `五次`), which is the counting
construction; that pattern is narrow but Chinese is not, so a false positive should cost a glance
rather than a build.

### 書面語, not 口語

The line is read, not heard — and if a voice is ever asked for, the voice speaks this line as
written. So it must be natural to read aloud, but it is written Chinese on the page.

| Write | Not |
|---|---|
| 我們可以看到⋯ | 我哋可以睇到⋯ |
| 因此 | 所以咁 |
| 這一步要求 | 呢一步要求 |
| 首先 | 首先我哋 |

### The English line is the lecture's English — and it is ONE line

The same sentence, in the words the notes would use — not a word-by-word translation of the
書面語. It carries the course's terms **verbatim**: `eigenvector`, `uniformly continuous`,
`loop invariant`, `amortised`, `conditional probability`, `resultant force` — in the notes'
spelling and form, so the line can be searched for in the slides.

**Keep it on one line.** It is the secondary line: the eye takes it in as a phrase under the
Chinese, and a second line turns that glance into a read — which is also the moment the block
starts pushing up onto the figure. A 16:9 line holds about **102 characters**, so English that
wraps there is a sentence written too long, and `build_captions.py` rejects it.

Write it shorter by cutting what the Chinese line already carried, not by dropping the term:

| One line | Two lines |
|---|---|
| Eigenvectors for one eigenvalue form a subspace. | As we can see from the diagram, all of the eigenvectors that belong to one eigenvalue will always form a subspace. |
| Every term after N lies inside the ε-band. | Because we have chosen N to be large enough, we can conclude that every term of the sequence after N lies inside the band. |

The openers are what to cut first — `As we can see`, `Because`, `we can conclude that`. The
Chinese line has already done the connecting; the English is there to name the thing in the
notes' words.

Do not shrink the type to buy room either: the caption size is fixed for the whole film.

### `terms` names both forms, and both light up

`terms` is a **mapping from the English to the Chinese**:

```json
"terms": {"eigenvector": "特徵向量", "pivot": "樞軸", "DFS": ""}
```

Both forms are marked in `CAPTION_TERM`, in the same colour, on their own line — so 特徵向量 and
`eigenvectors` light up together and read as one thing. That pairing is the whole point of a
bilingual caption; highlighting only the English would teach the word without connecting it to the
idea already understood in 中文.

Map a term to `""` when it genuinely has no Chinese form a reader would use — `DFS`, `pH` — and
only the English occurrence is marked, deliberately. A bare list still works and means English
only, and the build reports it, because it is nearly always an oversight rather than a decision.

The theme matches the form actually written: `eigenvector` in the plan marks `Eigenvectors` in
the sentence, capital and plural included, and the Chinese form is matched literally since Chinese
has neither case nor inflection. Both forms are also protected from line breaks, so `特徵向量` is
never split across two lines any more than `loop invariant` is.

Never bracket one language inside the other. `特徵向量（eigenvector）` on the Chinese line is the
worst of both: it doubles the reading load on the line that exists to be easy, and the English
line beneath already says it.

## Subtitle format

| Rule | Value |
|---|---|
| One cue on screen at a time | always |
| Languages | both, always — 中文 above, English below at 0.78× (`SIZE_CAPTION_EN`) |
| Maximum length, 中文 | **24 全形字** per line · 2 lines maximum |
| Maximum length, English | **one line**: ≤ 90 characters |
| Numbers | Arabic — 「2 個」, not 「兩個」 |
| Minimum time on screen | **2.0 s**, even for a short cue |
| Reading rate | ≤ **4.0 字/秒** on the 中文 line, counting a Latin word as 2 字 |
| Cue boundaries | break at a 語義 boundary — never mid-term, never mid-formula |
| Punctuation | 全形（，。？：) in the 中文 line, no 空格 before or after; ordinary English punctuation in the English line |
| Position | inside the caption band from `Stage.caption_bottom` — never over the diagram |

**Line length is a property of the frame.** The 16:9 usable width holds 39.9 全形字 and 102.9
Latin characters; 24 字 and 90 characters are set below those so a line never runs to the margin
and the two-line 中文 block stays compact above its English.

The character limits are a fast proxy; the build also lays each cue out and counts the lines it
really sets on, because the wrap depends on the actual glyphs. 90 characters of ordinary English
fits one line with room, but 90 characters of `m` would not — and the measurement, not the count,
is what decides.

**Only the 中文 line is rate-gated.** It is the line being read for meaning; the English is the same
sentence in the notes' words, there to be recognised rather than read through. Rate-gating it as
well would make it the binding constraint on every cue and stretch every video by about a third,
to slow down a line nobody reads word by word. What the English must not do is take a second
line — hence the length limit, which is what actually pushes the block onto the figure.

`build_captions.py` also lays every cue out for real and measures the block against the reserved
band, so a cue that would sit on the diagram fails the build instead of surfacing in the
composite.

## Cues land with reveals; stills are where they are read

The breathing budget (`pacing.md`) reserves at least a quarter of every shot with nothing new
appearing on the picture. With no voice, that still time is where the reading gets finished: the
cue lands with its beat's reveal, the reveal completes, and the picture holds while the eye
finishes the cue and comes back to the figure.

So a fresh cue lands **at a beat**, never in the middle of a still. A cue that arrives mid-still is
new information in the one moment reserved for none, and it turns the time for looking at the
figure into more time for reading. The cue that landed with the reveal stays up through the still
after it; the still after the aha carries the cue that named the aha and nothing else.

A ponder beat works the same way: the prompt — 「暫停一下，先自己想想。」 /
`Pause here and predict it first.` — lands as the hold begins, and nothing replaces it until the
hold ends (`lesson-patterns.md`, pattern 1).

## No voice by default — and if one is asked for

The default video is **silent**, and the captions carry all of it (hard rule 2: never generate a
voice unasked, never call a silent video narrated). `narration.source` in the plan is `"none"`.

If Paco asks for a voice on a particular video:

- It is generated with the **`edge-tts` skill**, speaking the **中文 line as written** — 書面語, with
  the Chinese names of the terms, since the 中文 line carries no English to code-switch into.
  `narration.voice` records the voice (e.g. `zh-HK-HiuMaanNeural`).
- One file per shot or per section, placed on Palmier's `Voice` track under the scenes, timed to
  the plan. **The plan is the authority**: never re-time the picture to a voice. A line that does
  not fit its shot is fixed in `video-plan.json` — shorter cue or longer shot — and regenerated.
- The captions do not change. They were written as the narration; the voice just reads them.
- `narration.status` is `"audio-received"` only once every file is on the `Voice` track, and
  `verify_master.py` then runs with `--require-audio`.

See `sound-and-voice.md`. Local CosyVoice is not an option (≈55× realtime).

## Where the captions live

**Not inside the lesson scenes.** They are generated from the plan and drawn separately:

```
video-plan.json ──► build_captions.py ──┬─► out/subtitles.srt ──┬─► muxed SOFT into out/draft.mp4        (Gate 3)
                                        │                       │
                                        │                       └─► split into subtitles-zh.srt
                                        │                              and subtitles-en.srt
                                        │                                   │
                                        │                                   ▼
                                        │                     two live caption tracks in Palmier Pro
                                        │                                   │
                                        │                                   ▼
                                        │                     burned in by the Palmier export ──► out/final.mp4
                                        │
                                        └─► src/captions.py (CaptionTrack scene) — quick burned-in
                                              preview outside Palmier only; the master never uses it
```

The reason is iteration cost: a typo fix must never re-render the mathematics. In Palmier a
caption fix is an `update_text` on a caption group; at Gate 3 it is a rebuilt `.srt` and a re-mux.
Neither touches a scene.

The `.srt` carries **both** languages in one cue, 中文 first. Palmier gives a caption clip one
`fontSize`, so the master splits it into two tracks, each sized from the theme
(`palmier-assembly.md`, §6). Keep `out/subtitles.srt` beside `out/final.mp4` — the English line is
also what makes the video searchable by the notes' terms later.

### Soft or burned?

| Output | Captions |
|---|---|
| **Gate 3 draft** | **soft track, always** — `mov_text` muxed into `out/draft.mp4`, never burned |
| **Master** (`out/final.mp4`) | two live caption tracks in Palmier, burned in by the Palmier export |
| **Sidecar** | `out/subtitles.srt`, bilingual, kept beside the master |

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
`-c:s` produces a video with no captions and no error. Say it is a **soft** track and may need
turning on in the player (QuickTime, IINA, VLC).

### Captions are exempt from the Manim rules

Everything on the picture must be a Manim mobject that enters with an animation (hard rule 20).
Captions are **not** on the frame — they are a separate track — so neither rule applies to them:

- **The renderer is Palmier's caption track** for the master. The `CaptionTrack` scene, or a
  libass-enabled ffmpeg (`ffmpeg -h filter=ass`) burning the `.srt`, is fine for a quick preview
  outside Palmier. What may **not** change is the source: cue data comes from `video-plan.json`,
  so every rendering of it agrees.
- **A cue cuts on and off.** Never fade, write or slide a caption in. The entrance would eat
  reading time the pacing budget has already given to the words, and it drifts the cue away from
  the beat it explains.

What is not negotiable is the text itself — the 書面語 rules, both language rules and the format
table above apply whichever renderer draws it. A renderer that can only carry one line is not an
option: the cue is two lines.

## Never

- Never generate a voice unasked — no TTS, no placeholder voice, not even for an animatic — and
  never describe a silent video as narrated (hard rule 2).
- Never write a cue as a heading, a label or a slide bullet. It is a line of explanation.
- Never put English words in the 中文 line beyond letters, symbols, listed notations and ALL-CAPS
  abbreviations; never bracket one language inside the other.
- Never let the English line wrap to a second line, and never shrink the caption type to stop it.
- Never land a fresh cue in the middle of a still beat — cues land with reveals.
- If a voice was asked for, never stretch or re-time the picture to fit it. Change the plan,
  regenerate the line, re-verify.
- Never use a subject term before the shot that bridges to it — not in an opening, not in a
  "just setting up" cue, not in the title of a section. The bridge is the only place a term is
  allowed to be new (rule 31).
