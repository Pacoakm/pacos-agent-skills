# SmartQuest video theme

One theme for the whole library. A student should recognise a SmartQuest lesson before the
title appears. Import `scripts/smartquest_theme.py`; do not redefine colours per video.

The overall look follows 3Blue1Brown: a dark field, and Computer Modern for everything on the
frame including the titles. What stays SmartQuest is the **colour set**, `brand_rule()`, and the
sans caption track.

## Field — flat dark

| Token | Value | |
|---|---|---|
| `BG` | `#0B0E14` | cool near-black — the whole field, flat |
| `INK` | `#E9EDF7` | cool near-white · 16.48:1 |
| `MUTED` | `#98A3BA` | secondary notes, DSE reasons · 7.62:1 |
| `LINE` | `#6B7893` | neutral geometry · 4.35:1 |

Near-black rather than pure black: the slight cool lift keeps the brand's indigo temperature and
is gentler on a phone at night, at almost no cost in contrast.

**One colour, no gradient.** `setup_stage()` sets `camera.background_color = BG` and adds no
background mobject; there is no wash rectangle behind the drawing. The earlier top-to-bottom
gradient (`BG_LIFT → BG`) is gone, and `BG_LIFT` with it. Two reasons it had to go: every ratio in
this file became a *range* rather than a number, since a colour measured against `#0B0E14` at the
foot of the frame sat on `#141926` at the head of it; and `halo()` paints a `BG`-coloured stroke
under the glyphs, which only vanishes where the background is exactly `BG` — on a graded field a
label near the top of the frame carried a visible dark patch around it. Flat makes the halo
invisible everywhere and the measurements exact. `setup_stage()` still accepts a `gradient=`
keyword so older scenes import, but it does nothing.

**Everything was re-measured when the theme went dark, and the old palette did not survive it.**
The light theme's 700-level inks all fail on this field — blue-700 3.13:1, violet-700 2.96:1,
rose-700 3.34:1, emerald-700 3.83:1, orange-700 4.06:1. Reusing them would have looked plausible
and been unreadable. The pens below are the same hues one tonal step lighter.

## Teaching semantics

A colour means one thing for a whole video **and across the whole library**. Never reassign.

| Token | Value | Meaning | on field |
|---|---|---|---|
| `GIVEN` | `#60A5FA` blue-400 | what the question gives you | 7.60:1 |
| `UNKNOWN` | `#FB923C` orange-400 | what you are solving for | 8.53:1 |
| `RESULT` | `#34D399` emerald-400 | a confirmed result, a correct step | 10.05:1 |
| `WARN` | `#FB7185` rose-400 | the misconception, the trap, the wrong turn | 7.18:1 |
| `AUX` | `#A78BFA` violet-400 | construction, first-use English terms | 7.10:1 |

Five inks at the **same tonal step**, so they read as one set of pens rather than five unrelated
colours. Hue separation was chosen first and contrast measured second. These hues are what keeps
the theme SmartQuest rather than a 3Blue1Brown clone. The field and the type now follow his
entirely, so the colour set is carrying the identity nearly on its own — which makes rule 6,
never reassign a colour, the load-bearing rule of the whole theme.

`GIVEN` and `UNKNOWN` share almost every frame, so they are **complementary** — blue against
burnt orange — instead of two neighbouring blues. An earlier version used brand indigo and brand
purple side by side and they were genuinely hard to tell apart in the figure.

Measure before adopting a colour, and **re-measure after any change of field**. Going dark
invalidated every ratio in this file at once: the previous 700-level set measured 2.96–4.06:1 on
the new background, all failing, while looking perfectly reasonable in the editor.

This is the mechanism that makes a series feel like a series. A student who has watched three
SmartQuest videos already knows purple is the unknown before you say so.

### Colour names a thing, and is spent on nothing else

The five inks above are **roles**. On any frame that has a figure, they are handed out as
**referents**: the given side takes `GIVEN`, the angle being solved for takes `UNKNOWN`, the
construction takes `AUX`. One assignment carries both meanings, so role and referent never
compete.

Once assigned, that colour appears at **every** occurrence of the thing — on the figure, in every
formula, and in every later line of the derivation. This is what lets a student *locate* a symbol
instead of hunting for it, and it is the whole difference between a frame and a marking scheme.

Two consequences:

- **Never spend a colour on emphasis.** Writing the final answer in `RESULT` green says "this
  line is the result", which its position already said — and it burns one of the five hues that
  could have been naming an angle. If a colour does not help the viewer locate or distinguish
  something, it is noise.
- **Never leave a multi-part expression in one ink**, even with no figure on screen. Use
  `mtex_ref()`, which colours named sub-expressions by referent.

`REF_SERIES` is the hand-out order and runs to **eight** — the five above, then `REF_LIME`
`#A3E635` (12.81:1), `REF_FUCHSIA` `#E879F9` (7.85:1), `REF_CYAN` `#22D3EE` (10.69:1). Those
three carry no role meaning; they are further pens, for figures with more angles and sides than
five colours can name. Take as many as the figure has parts rather than making parts share.

They were picked by hue gap, not by eye, to fill the three widest gaps in the semantic five.
Measured on the dark field the eight sit at 27.0°, 82.7°, 158.1°, 187.9°, 213.1°, 255.1°, 292.0°
and 351.3°, a **minimum separation of 25.2°** (cyan against blue — the tightest pair, and cyan is
the eighth pen, so it only appears on an already-busy figure). That margin matters: an earlier
version put brand indigo beside brand purple and they were genuinely hard to tell apart.

This is the mechanism generalised from the older rule below: when a quantity is split into parts
that must be compared (two halves of an angle, two forces, two half-equations), give each part its
own colour and keep it everywhere the part appears. That is what lets the viewer *see* a
relationship instead of being told it.

## Brand signature

`brand_rule()` — the indigo→purple bar, `#4B60D6 → #9747FF`. Use it **once per video**, under
the title card. It is a signature, not a decoration; repeating it cheapens it.

## Typography

| Role | Face | Size | Note |
|---|---|---|---|
| Role | Face | Size | Note |
|---|---|---|---|
| Mathematics, point labels, DSE reasons | **Computer Modern** via `MathTex`/`Tex` | — | Manim's stock template, `TEX_MAIN` |
| On-frame Chinese | **Songti TC** | 22–32 | 明體; its stroke modulation sits with Computer Modern |
| Display titles | **Computer Modern** via `Tex` | — | same face as everything else on the frame |
| **Captions only** | **PingFang HK Bold** | fixed | sans on purpose — the caption track must read as a layer over the lesson, not part of it |

**The frame carries exactly two faces: Computer Modern, and PingFang for the captions.** DM Sans
is gone — a brand display face on the title made the top of the frame a different document from
the mathematics under it. `FONT_DISPLAY` and `DISPLAY_MIN` survive only as deprecated aliases so
older scenes still import.

`title()` routes by **script, not character set**: anything containing a CJK character goes to
Songti TC, everything else to `Tex`. A title like `1 · centroid` is mostly Latin and belongs in
TeX, so testing for non-ASCII would send it the wrong way. The `·` compiles fine in Manim's stock
template.

**Latin on the figure goes through TeX, not Pango.** `label()` sends a single symbol to `MathTex`
and a word to `Tex`, so the `A` labelling a vertex is the *same glyph* as the `A` inside
`\angle BAD` beside it. That is what rule 17 asks for, and a Pango `A` next to a TeX `A` visibly
is not the same letter. Chinese has no Computer Modern, so it falls through to Songti TC.

Use **PingFang HK, not PingFang SC** for captions — SC sets 全形 punctuation centred, which reads
as Mainland typesetting to a Hong Kong student.

### Never call `Text()` directly

Every helper builds text at `TYPE_BASE = 120` and scales to the target size, because Pango
grid-fits glyph positions to the requested `font_size` — so the same word laid out at 26 and at
52 gets **different letter spacing**, drifting by up to 0.16 of the text height per pair, enough
to make two letters touch. That is the "英文字距不一樣" defect, and it is a property of the
renderer, not of the face: every candidate Latin font drifts the same way. See
`manim-traps.md` #22 for the measurements.

So: `title()`, `body()`, `label()`, `caption_text()`, `step()`, or `_text()` — never a bare
`Text(...)`. A single stray `Text()` in a scene is visible as one word spaced differently from
the identical word elsewhere in the same video.

### Mathematics is Computer Modern

Manim's stock TeX template, which is the 3Blue1Brown setting. The theme no longer overrides it —
`TEX_MAIN = TexTemplate()`. `TEX_SANS` survives as an alias so older scenes still import, but it
now resolves to the same stock template; the previous `helvet` + `sfmath` build is gone, and
neither package is needed any more.

**The Tex cache does not know the template changed.** `media/Tex/*.svg` is keyed by the
expression string, not the preamble, so after editing `TEX_SANS` — or any font setting — old
serif SVGs are silently reused and the render looks unchanged. `--disable_caching` does not
help; it only affects partial movie files. Delete the cache:

```bash
rm -rf media/Tex media/texts
```

### Verify the fonts exist before you rely on them

Both Pango faces ship with macOS, but neither is guaranteed elsewhere, and **Pango silently
substitutes a missing face** rather than failing — so on another machine the Chinese renders in
the wrong font with no warning. Check first:

```python
import manimpango
have = set(manimpango.list_fonts())
assert {"Songti TC", "PingFang HK"} <= have, sorted(have)
```

If either is missing and cannot be installed, say so and stop rather than letting Pango pick
something. Computer Modern is not in this list — it comes from TinyTeX, and a missing TeX install
fails loudly on its own.

`SIZE_MIN` is 22. Nothing smaller survives a phone screen.

## Captions — bilingual, 中文 over English

**Bold near-white sans type, no bar, no outline, no glow.** The caption band is reserved empty
field, so plain type already has full contrast and anything behind it is noise.

Captions are the one layer that stays **PingFang HK sans** while the lesson is set in Computer
Modern. That is deliberate: the caption is a transcript of the voice laid over the picture, not
part of the mathematics, and the change of face is what says so. The English line is set in the
same face — PingFang's Latin — so the two lines are one caption in two languages rather than two
different pieces of typography.

| Token | Value | |
|---|---|---|
| `CAPTION_INK` | `#F2F5FC` | both lines · 17.70:1 |
| `CAPTION_TERM` | `#FBBF24` amber-400 | the declared subject term. **Not** a teaching semantic |
| `SIZE_CAPTION` | 24 landscape, **20 portrait** | the 中文 line |
| `SIZE_CAPTION_EN` | 19 landscape, **16 portrait** | the English line — `CAPTION_EN_RATIO` 0.78 |
| `CAPTION_LINE_GAP` | 0.16 | between wrapped lines within one language |
| `CAPTION_LANG_GAP` | 0.21 | between the two languages — 1.30× the line gap |

**Caption size is measured as a share of frame height**, since that is what the eye subtends. The
中文 line sets at 42 px in 16:9 (**3.91%** of height) and 63 px in 9:16 (**3.26%**). Streaming
subtitles run about 4.2–4.6% and broadcast guidance floors near 3.3%, so this sits between the
two — smaller than a Netflix caption, above the floor. It came down from 28/24 when the second
line made the band start eating the lesson, and the smaller type buys line capacity as well: a
9:16 line went from 12.6 全形字 to 15.2, so an ordinary cue now sets on one line where it wrapped.

**The English is smaller, and that ratio is doing work.** The Chinese is the line being read; the
English is the exam's wording underneath it. At equal size the block reads as two competing
sentences. 0.78 rather than lower because PingFang's Latin already has a small x-height for its
em, so the English looks smaller than its nominal size before any ratio applies — below about
0.75 it stops being readable on a phone, above about 0.85 the two lines stop being
distinguishable.

The two gaps matter for the same reason: at equal spacing a wrapped two-line Chinese cue plus its
English reads as one four-line paragraph and the eye cannot tell which lines belong together. But
the gap is not the only thing marking that boundary — the size change and the change of script
carry most of it, which is why 1.30 separates as cleanly as 1.75 did. Rendered side by side at
1.75 / 1.45 / 1.25 / 1.10, it is only near 1.1 that the block starts reading as one paragraph.

Do not use `AUX` for a term inside a caption — the caption is a different track from the figure,
and the eight teaching pens belong to the figure.

**`terms` marks both languages, in the same colour.** It is a mapping — `{"isosceles triangle":
"等腰三角形"}` — and both forms are coloured, so 等腰三角形 and `isosceles triangles` light up
together and read as one thing. Marking only the English would teach the word without connecting
it to the idea the student already has.

**And it marks the form actually written.** A Latin form is matched case-insensitively with the
match running to the end of its word, so `inscribed angle` in the plan colours `Inscribed angles`
in the sentence — capital and plural included — instead of leaving a white `s` hanging off an
amber phrase. A Chinese form is matched literally, Chinese having neither case nor inflection.

**Fixed size, wrap instead of shrink.** A caption that scales down to fit reads as inconsistent
from cue to cue. `caption_text()` never scales; `fit_caption()` wraps both languages against the
same measured width and re-measures until the block really fits. Breaks land at a natural
boundary and never inside a Latin word **or inside a declared term**, so `inscribed angle` is
never split across lines.

Captions are anchored by `Stage.caption_bottom`, their **bottom edge**, so a short cue and a
four-line bilingual one share a baseline and the block grows upward.

`Stage.caption_band` reserves the platform-UI margin **plus the largest cue the format allows**.
Measured block heights on the 8-unit frame:

| | 1zh+1en | 2zh+1en | 2zh+2en | reserves for | band |
|---|---|---|---|---|---|
| 16:9 | 0.763 | **1.231** | 1.605 | 2zh + **one** English line | **0.23** |
| 9:16 | 0.673 | 1.089 | **1.426** | 2zh + 2en | **0.37** |

16:9 reserves less because the English is held to one line there — a 16:9 line fits 102 Latin
characters, so a second English line means the sentence was too long, not that the frame was too
narrow. 9:16 reserves the full 2+2: a portrait line holds about 38 characters and exam English
does not always fit that.

**In 9:16 the band is mostly not the type.** 1.4 of its 2.96 units is platform-UI clearance
before a word is set, which is why dropping the caption from 24 to 20 moved the band only
0.40 → 0.38. The lever that would move it is the 2+2 reservation: hold a short's 中文 to one line
and it goes to 0.31.

Size the band for less and the first wrapped cue lands on the diagram, because an over-tall block
is not clipped — it grows upward. `build_captions.py` lays every cue out and measures it against
this band, so the failure is caught at build time rather than in the composite.

Hard rules, each of which fixed a real defect:

- **One size for the whole film.** Never scale a caption to make it fit. Wrap instead.
- **Wrap by measured width**, not character count. Estimate the break, then measure and tighten.
- **Centre the lines.** Build one `Text` per line and `arrange(DOWN)`; a multi-line `Text` is
  left-aligned and reads as ragged.
- **Never break inside a declared term**, and never strand a maths prefix — `∠ △ ∥ ⊥ ∵ ∴` and
  opening brackets bind to the token after them.
- Captions are a separate transparent track. They never live in a lesson scene.

## Labels on the figure

A label that sits on top of a line is the most common defect in a finished lesson, and the one a
student notices first. Handle it in this order:

**1. Move it.** Place the label in clear space and, if it must reach its point, run a hairline
leader line to it. Overlap avoided is always better than overlap mitigated.

**2. If it must overlap, halo it.** `label()` does this by default: a background-coloured stroke
drawn *behind* the glyphs, so the figure is cut away around the letterforms and the letterforms
keep their true weight.

```python
label("centroid")                    # haloed
label("centroid", halo=False)        # only when you know it sits on empty field
halo_text(some_text, ratio=0.18)     # thicker, for a very busy area
```

Three things make a halo work, and all three are already in `halo_text()`:

| | Why |
|---|---|
| `background=True` | puts the stroke **under** the fill. A foreground stroke fattens the glyphs into mush |
| `LineJointType.ROUND` | the default mitre throws spikes off every glyph corner, which reads as dirt at 1080p |
| width from `.height` | survives any later scale — and note `stroke_width` is **not** scene units, see `manim-traps.md` #23 |

`HALO_RATIO` is **0.12** of text height, chosen by rendering 0.06 / 0.09 / 0.12 / 0.16 at
`SIZE_LABEL` over crossing strokes: at 0.06 a line still grazes the glyphs, 0.09 clears them,
0.12 clears them with margin on a busy figure, and past ~0.16 the halo takes visible bites out of
the drawing (at 0.26 it erodes the letterforms themselves). Adjust locally via
`halo_text(t, ratio=…)` rather than changing the default.

Judge halo thickness on a **1080p frame at real label size**. A diagnostic render — exaggerated
ratio, high-contrast colour — makes any halo look far too heavy and is not the thing to tune
against.

**3. Make it big enough.** `SIZE_LABEL` is 30 — close to body size, because a figure label is
read at a glance while the student is looking at the diagram, not the text. A label is also `INK`
by default, not `MUTED`: grey type over a coloured figure loses too much contrast.

## Stroke weights

`stroke_width` is proportional to scene units but **not equal** to them — measured, `stroke_width`
100 renders exactly 1.0 scene unit at any resolution (`STROKE_PER_UNIT`). Passing a scene-unit
number straight into `set_stroke()` gives a stroke ~100× too thin that silently does not appear.

It scales with pixels-per-unit, so a short comes out about 2.4× too heavy. `STROKE_SCALE`
normalises against the 16:9 reference; name a weight rather than a number:

| Token | For |
|---|---|
| `SW_HAIRLINE` | construction, ghosts, dimmed context |
| `SW_FIGURE` | the circle, neutral geometry |
| `SW_EMPHASIS` | coloured rays — the lines the lesson is about |
| `SW_MARK` | right-angle markers, tick marks |

### Every corner and every line end is round

Call `soften()` on the figure. It sets `joint_type = ROUND` and `cap_style = ROUND` over the
whole family, and `ticks()` and `angle_at()` already return softened mobjects.

It has to be explicit, because **Manim's default is not round.** Measured at 1080p on a triangle
apex at `stroke_width` 16:

| `joint_type` | apex |
|---|---|
| `AUTO` (default) | a **flat cut** — identical to `BEVEL` |
| `MITER` | a long sharp spike |
| `ROUND` | a dome — what we want |
| `BEVEL` | flat cut |

`cap_style=AUTO` likewise leaves line ends squared off. Round ends matter most on the coloured
rays, where a squared-off end reads as if the line continues past where it stops.

### Never `round_corners()` on a lesson figure

Manim has a second, unrelated mechanism: `Polygon.round_corners(radius)` replaces each **vertex**
with an arc fillet. That is a change to the geometry, not a finish — rendered on a triangle at
`radius=0.35` the vertices simply cease to exist, and there is no longer a corner to put an angle
arc on. It would quietly destroy the very angle a DSE question is about.

`soften()` never moves a point, so it is safe on examinable geometry. `round_corners()` is for
decorative frames, cards and panels only.

## Layout

`Stage` reads the frame and gives aspect-aware anchors, so **the same scene code renders both
the 16:9 lesson and the 9:16 short**.

| Band | 16:9 | 9:16 |
|---|---|---|
| Title | 10% of height | 11% |
| Caption safe band | 13% | **22%** — platform UI covers the lowest ~15% |
| Figure | left 52% of width | **top 60% of content height** |
| Derivation panel | right column | **below the figure** |

A side column is unreadable at 1080 px wide, which is why portrait stacks instead. Ask
`Stage.figure_box()` and `Stage.panel_box()` for regions; never hard-code a coordinate.

### Type is scaled to the frame

Manim font sizes are absolute scene units, and `frame_height` stays 8 in both aspects while
`frame_width` changes. Measured: `font_size=38` covers **15%** of the frame width at 16:9 and
**47.5%** at 9:16 — portrait type comes out about three times too big.

`TYPE_SCALE` corrects this, with a ×2 readability boost for portrait because a short is watched
on a small screen. It is applied inside `title()`, `body()`, `label()`, `mtex()` and `step()`,
so scene code just names a size. Captions pass `scale=False` — they are fitted to the frame
width instead, and taking the scale as well would make them tiny.

### The frame trap

`manim -r 1080,1920` changes the **pixel** canvas only. `config.frame_width` stays at 14.222
and `frame_height` at 8 — a 16:9 logical frame squeezed into a portrait canvas. It renders with
no error and is simply wrong.

`smartquest_theme` calls `sync_frame()` at **import time** to fix this, because Manim builds the
camera from `config` when the Scene is instantiated, which is before `construct()` runs.
Importing the theme is therefore not optional, even if you only want the colours.

## Motion grammar

Five moves for the whole library. Adding a sixth makes the series look inconsistent, not richer.

1. **Draw on** — `Create`, for a new object.
2. **Transform, never redraw** — show that two things are the same thing.
3. **Masked reveal** — a derivation appears one line at a time.
4. **Bind labels to geometry** — `always_redraw`, so a number can never disagree with the picture.
5. **Dim, do not delete** — context drops to 30% and stays.

Three depths, not two: `OP_PRIMARY` 1.0 for what the beat is about, `OP_CONTEXT` 0.3 for the
established step still on screen, `OP_STRUCTURE` 0.15 for axes, gridlines and diagram furniture.
Structure is not dimmed context — it never had the student's attention — so `structural()` sets it
at build time rather than animating it. Left at 0.3, a grid still competes with the curve drawn
on it.

Timing constants live in the theme (`T_DRAW`, `T_REVEAL`, `T_TRANSFORM`, `T_CLEAR`,
`REST_BEAT`, `REST_AHA`). Use them rather than inventing run times per scene.

### Every mobject on the picture is built by Manim

Nothing on a lesson frame is an imported picture of text or of a figure. No `SVGMobject` of a
label, no `ImageMobject` of a formula, no pre-rendered panel. Text comes from `title()`, `body()`,
`label()`, `step()` and `mtex()`; geometry comes from Manim primitives.

The reason is that anything imported was laid out by a different engine, so it does not share the
frame's units, type scale, stroke scale, safe areas or palette — it looks right until the aspect
ratio changes or the theme moves, and it cannot be animated, transformed or bound to the figure.

The **caption track is the one exception**, because it is not on the picture — it is a separate
track composited afterwards, and it may be produced by any means (see below).

### Text enters, never appears

`self.add(text)` puts a line on screen between one frame and the next, which reads as a glitch
next to animated geometry. Every piece of on-screen text gets an entrance, at `T_REVEAL`:

| Text | Entrance |
|---|---|
| A derivation step, a formula, an equation | `Write` — it reads as being worked out |
| A title, a term card, a short label | `FadeIn`, or `Write` if it is the beat's subject |
| A label that belongs to a point | `FadeIn` with the point, so the two arrive together |

`Write` was checked on all three kinds at 480p15: 繁中 appears character by character with each
glyph solid (not stroke-scribbled), Latin runs left to right, and `MathTex` draws its outline then
fills, which is why it reads as handwriting. It is safe for CJK.

`self.add()` is for **state that was already established** — the figure carried over from the
previous scene, so that a shot's first frame matches the previous shot's last frame (invariant 9).
Establishing state and introducing information are different acts; do not use `add()` for the
second.

Captions are exempt again: a caption **cuts** on and off at its cue boundary. Fading a subtitle in
spends reading time the pacing budget already allocated, and drifts it away from the voice.

## Title and end cards

- **Title card** — topic in `title()`, `brand_rule()` beneath, subject and paper in `label()`.
  Under 4 s. It is not a channel intro.
- **End card** — the one takeaway sentence, plus the next-video pointer if there is one. No logo
  animation, no music sting. The last thing on screen should be the thing to remember.

## What we borrow from 3Blue1Brown, and what we do not

**Borrow:** geometry before algebra, colour-coded correspondence between figure and formula,
transform instead of redraw, stillness after an insight, numbers bound to the drawing.

**Now also borrowed:** the dark field and Computer Modern, adopted deliberately after the light
theme was tried and rejected.

## Rejected from other Manim skills

Reviewed Nous Research's bundled `creative-manim-video` skill (2026-08-12). Two things taken —
the `OP_STRUCTURE` tier above, and its corroboration of trap #22. Two rejected, recorded here so
they are not adopted later by someone who only reads the source:

- **`FadeOut(Group(*self.mobjects))` at every scene end.** It guarantees clean scene boundaries by
  clearing the screen, and it directly breaks invariant 10: a scene's end state must *equal* the
  next scene's start state. Wiping between shots also destroys the thing the figure is for —
  persisting and being transformed — and turns a lesson into a slide deck. Carry the figure
  across; clear only when the subject genuinely changes.
- **"Every scene needs a different dominant colour."** Sound anti-monotony advice for a general
  explainer, and incompatible with rule 17 here. Our colours are assigned by *referent*: if the
  unknown angle is orange in shot 3 it is orange in shot 9, and rotating the palette for variety
  would destroy exactly the correspondence the student is being taught to read. Variety comes from
  layout, motion and what is on screen — never from reassigning a pen.

**Do not borrow:** the Pi creatures, and the 3b1b blue/yellow palette. The colour set is what
carries SmartQuest identity now that the field and the type are shared, which makes rule 6 —
never reassign a colour — matter more than it did, not less.
