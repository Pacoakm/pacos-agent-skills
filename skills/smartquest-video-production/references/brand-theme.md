# SmartQuest video theme

One theme for the whole library. A student should recognise a SmartQuest lesson before the
title appears. Import `scripts/smartquest_theme.py`; do not redefine colours per video.

Derived from `SmartQuestApp/DESIGN.md`. The brand hues are lifted for legibility — the web
palette is tuned for a white page and is too dark to draw thin lines on a dark field.

## Field

| Token | Value | |
|---|---|---|
| `BG` | `#0F172A` | SmartQuest navy. **Not** 3Blue1Brown's neutral `#1C1C1C` |
| `BG_LIFT` | `#152037` | a very slight vertical lift, so the frame is not a flat slide |
| `INK` | `#F1F5F9` | primary text |
| `MUTED` | `#94A3B8` | secondary notes, DSE reasons |
| `LINE` | `#64748B` | neutral geometry, axes, unemphasised strokes |

The navy is the single strongest brand signal. Keep it. If a topic genuinely needs a light
field (an optics ray diagram, a titration colour change), invert locally inside the figure and
keep the frame navy.

## Teaching semantics

A colour means one thing for a whole video **and across the whole library**. Never reassign.

| Token | Value | Meaning |
|---|---|---|
| `GIVEN` | `#7C8CF8` | what the question gives you |
| `UNKNOWN` | `#C084FC` | what you are solving for |
| `RESULT` | `#34D399` | a confirmed result, a correct step |
| `WARN` | `#F87171` | the misconception, the trap, the wrong turn |
| `AUX` | `#FBBF24` | construction: added lines, radii, tick marks, first-use English terms |

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
| Body, captions, all Chinese | **PingFang HK** | 22–32 | renders 繁中 and inline Latin cleanly under Pango |
| Display titles | **DM Sans Bold** | **≥ 44 only** | brand face; its Latin kerning breaks under Pango below ~44 |
| Mathematics, point labels, DSE reasons | `MathTex` | — | LaTeX, always |

Use **PingFang HK, not PingFang SC** — SC sets 全形 punctuation centred, which reads as
Mainland typesetting to a Hong Kong student.

Never set DM Sans below `DISPLAY_MIN`. If a label is small, it is `body()` or `MathTex`.

`SIZE_MIN` is 22. Nothing smaller survives a phone screen.

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
