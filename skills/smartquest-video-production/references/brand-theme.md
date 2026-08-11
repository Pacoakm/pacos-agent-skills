# SmartQuest video theme

One theme for the whole library. A student should recognise a SmartQuest lesson before the
title appears. Import `scripts/smartquest_theme.py`; do not redefine colours per video.

Derived from `SmartQuestApp/DESIGN.md`, and on the same light ground the web palette was
tuned for, so the brand hues transfer directly.

## Field — light

| Token | Value | |
|---|---|---|
| `BG` | `#FBFCFE` | barely-tinted cool white |
| `BG_LIFT` | `#FFFFFF` | a gentle white wash, top to bottom |
| `INK` | `#1B2440` | deep indigo-slate — softer than black, still brand-cool · 14.9:1 |
| `MUTED` | `#64748B` | secondary notes, DSE reasons · 4.64:1 |
| `LINE` | `#7C8AA3` | neutral geometry · 3.49:1 (WCAG non-text minimum is 3:1) |

The field is deliberately light. A dark video reads as "advanced" to a secondary student meeting
an idea for the first time; a clean near-white page reads as a well-set textbook. That is the
feeling we want, and it is the main reason this theme is not a 3Blue1Brown clone.

## Teaching semantics

A colour means one thing for a whole video **and across the whole library**. Never reassign.

| Token | Value | Meaning |
|---|---|---|
| Token | Value | Meaning | on page |
|---|---|---|---|
| `GIVEN` | `#1D4ED8` blue-700 | what the question gives you | 6.53:1 |
| `UNKNOWN` | `#C2410C` orange-700 | what you are solving for | 5.04:1 |
| `RESULT` | `#047857` emerald-700 | a confirmed result, a correct step | 5.34:1 |
| `WARN` | `#BE123C` rose-700 | the misconception, the trap, the wrong turn | 6.12:1 |
| `AUX` | `#6D28D9` violet-700 | construction, first-use English terms | 6.92:1 |

Five inks at the **same tonal step**, so they read as one set of pens rather than five unrelated
colours. Hue separation was chosen first and contrast measured second.

`GIVEN` and `UNKNOWN` share almost every frame, so they are **complementary** — blue against
burnt orange — instead of two neighbouring blues. An earlier version used brand indigo and brand
purple side by side and they were genuinely hard to tell apart in the figure.

Measure before adopting a colour. A previous `RESULT` at `#059669` looked fine and measured
**3.67:1**, which fails as text on a light page.

This is the mechanism that makes a series feel like a series. A student who has watched three
SmartQuest videos already knows purple is the unknown before you say so.

When a quantity is split into parts that must be compared (two halves of an angle, two forces,
two half-equations), give each part its own colour and **keep that colour at every place the
part appears**. That is what lets the viewer *see* a relationship instead of being told it.

## Brand signature

`brand_rule()` — the indigo→purple bar, `#4B60D6 → #9747FF`. Use it **once per video**, under
the title card. It is a signature, not a decoration; repeating it cheapens it.

## Typography

| Role | Face | Size | Note |
|---|---|---|---|
| Body, captions, all Chinese | **PingFang HK Medium** | 22–32 | 蘋方 Medium; steadier than Regular at video sizes |
| Display titles | **DM Sans Bold** | **≥ 44 only** | brand face; its Latin kerning breaks under Pango below ~44 |
| Mathematics, point labels, DSE reasons | `MathTex`, **sans-serif** | — | LaTeX via `TEX_SANS` |

Use **PingFang HK, not PingFang SC** — SC sets 全形 punctuation centred, which reads as
Mainland typesetting to a Hong Kong student.

### Mathematics is set sans-serif

Computer Modern's serif italic is the 3Blue1Brown look and clashes with a sans interface. The
theme installs `TEX_SANS` on `config.tex_template` at import, so every `MathTex`/`Tex` is sans
without touching the call sites.

`\mathsf{}` on its own is **not** enough — it converts letters but leaves Greek and anything
inside `\text{}` serif, so a single line ends up mixed. The template uses
`helvet` + `\renewcommand{\familydefault}{\sfdefault}` + `sfmath`, which converts equations,
Greek and `\text{}` together. Install once:

```bash
tlmgr install sfmath helvet
```

**The Tex cache does not know the template changed.** `media/Tex/*.svg` is keyed by the
expression string, not the preamble, so after editing `TEX_SANS` — or any font setting — old
serif SVGs are silently reused and the render looks unchanged. `--disable_caching` does not
help; it only affects partial movie files. Delete the cache:

```bash
rm -rf media/Tex media/texts
```

Never set DM Sans below `DISPLAY_MIN`. If a label is small, it is `body()` or `MathTex`.

### Verify the fonts exist before you rely on them

Both faces are installed on this machine — DM Sans via `brew install --cask font-dm-sans`
(2026-08-11), PingFang HK ships with macOS. Neither is guaranteed elsewhere, and **Pango
silently substitutes a missing face** rather than failing, so a title renders in the wrong font
with no warning. Check first:

```python
import manimpango
have = set(manimpango.list_fonts())
assert {"DM Sans", "PingFang HK"} <= have, sorted(have)
```

If DM Sans is missing and cannot be installed, use no display type at all and say so — do not
let `title()` fall back to an unknown face.

`SIZE_MIN` is 22. Nothing smaller survives a phone screen. Captions are `SIZE_CAPTION` = 23 —
small enough to stay out of the way, large enough to read on a phone.

### Captions are Shorts-style

Reels/Shorts/TikTok convention: **bold white type with a dark outline and no background bar.**
The outline is what keeps a caption readable over any part of the frame, and unlike a bar it
costs no screen area.

| Token | Value | |
|---|---|---|
| `CAPTION_INK` | `#FFFFFF` | fill |
| `CAPTION_OUTLINE` | `#0B1220` | `set_stroke(..., background=True)` |
| `CAPTION_OUTLINE_W` | `5` | heavier than this and CJK strokes clog up — 9 was visibly blobby |
| `CAPTION_TERM` | `#FDE047` | inline English term |
| `SIZE_CAPTION` | `28` | **fixed for every cue** |

Do not use `AUX` for a term inside a caption — that hue is chosen against the light page and
goes muddy against white-on-outline.

**Fixed size, wrap instead of shrink.** A caption that scales down to fit reads as inconsistent
from cue to cue. `caption_text()` never scales; if a line does not fit, `wrap_caption()` inserts
one newline near the weight midpoint at a natural boundary — after a comma-class punctuation
first, then a space, then any CJK boundary. It refuses to break inside a Latin word **or inside
a declared term**, so `inscribed angle` is never split across lines.

Captions are anchored by `Stage.caption_bottom`, their **bottom edge**, so a one-line and a
two-line cue share a baseline and the block grows upward.

`Stage.caption_band` must reserve the platform-UI margin **plus a full two-line caption**. Size
it for one line and the first wrapped cue lands on the diagram — that happened here.

## Captions

Shorts convention adapted to a light page: **bold dark type, no bar, no outline, no glow.** The
caption band is reserved empty page, so dark type already has full contrast and anything behind
it is noise. White-on-dark is the usual shorts treatment only because shorts usually sit on busy
footage.

| Token | Value |
|---|---|
| `CAPTION_INK` | `#1B2440` |
| `CAPTION_TERM` | `#B45309` — first-use English term. **Not** a teaching semantic |
| `SIZE_CAPTION` | 28 landscape, **24 portrait** |
| `CAPTION_LINE_GAP` | 0.16 |

Hard rules, each of which fixed a real defect:

- **One size for the whole film.** Never scale a caption to make it fit. Wrap instead.
- **Wrap by measured width**, not character count. Estimate the break, then measure and tighten.
- **Centre the lines.** Build one `Text` per line and `arrange(DOWN)`; a multi-line `Text` is
  left-aligned and reads as ragged.
- **Never break inside a declared term**, and never strand a maths prefix — `∠ △ ∥ ⊥ ∵ ∴` and
  opening brackets bind to the token after them.
- Captions are a separate transparent track. They never live in a lesson scene.

## Stroke weights

`stroke_width` is a scene-unit quantity, so it scales with pixels-per-unit and a short comes out
about 2.4× too heavy. `STROKE_SCALE` normalises against the 16:9 reference; name a weight rather
than a number:

| Token | For |
|---|---|
| `SW_HAIRLINE` | construction, ghosts, dimmed context |
| `SW_FIGURE` | the circle, neutral geometry |
| `SW_EMPHASIS` | coloured rays — the lines the lesson is about |
| `SW_MARK` | right-angle markers, tick marks |

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

Timing constants live in the theme (`T_DRAW`, `T_REVEAL`, `T_TRANSFORM`, `T_CLEAR`,
`REST_BEAT`, `REST_AHA`). Use them rather than inventing run times per scene.

## Title and end cards

- **Title card** — topic in `title()`, `brand_rule()` beneath, subject and paper in `label()`.
  Under 4 s. It is not a channel intro.
- **End card** — the one takeaway sentence, plus the next-video pointer if there is one. No logo
  animation, no music sting. The last thing on screen should be the thing to remember.

## What we borrow from 3Blue1Brown, and what we do not

**Borrow:** geometry before algebra, colour-coded correspondence between figure and formula,
transform instead of redraw, stillness after an insight, numbers bound to the drawing.

**Do not borrow:** the black field, Computer Modern as the interface face, the Pi creatures, the
3b1b blue/yellow palette. Those are someone else's identity.
