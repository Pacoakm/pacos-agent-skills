# Manim traps

Every one of these was hit while building this pipeline. They share a shape: **Manim renders
without an error and the output is wrong.** That is why they are written down — nothing here is
discoverable from a stack trace.

## 1. `-r 1080,1920` does not give you a vertical video

`--resolution` changes the pixel canvas only. `config.frame_width` stays at 14.222 and
`frame_height` at 8, so a 16:9 layout is squeezed into a portrait canvas.

**Fix:** `smartquest_theme` calls `sync_frame()` at **import** time. It must run before the
Scene is instantiated, because Manim builds the camera from `config` then — calling it inside
`construct()` fixes the layout tokens but not the camera, which looks *almost* right and is not.

## 2. `font_size` is scene units, not pixels

`frame_height` stays 8 in both aspects while `frame_width` changes, so the same `font_size`
covers **15% of the frame width at 16:9 and 47.5% at 9:16** — portrait type comes out about
three times too big.

**Fix:** `TYPE_SCALE`, applied inside `title()`, `body()`, `label()`, `mtex()`, `step()`.

## 3. `stroke_width` is scene units too

Same defect, different property. Measured: `stroke_width=4` renders **5 px at 1920×1080 and
10 px at 1080×1920**, while the portrait figure is *smaller* (299 px radius against 352 px).
Lines read about 2.4× too heavy in a short.

**Fix:** `STROKE_SCALE`, and the tokens `SW_HAIRLINE / SW_FIGURE / SW_EMPHASIS / SW_MARK`. Name
a weight, never a number.

## 4. The Tex cache does not know the template changed

`media/Tex/*.svg` is keyed by the **expression**, not the preamble. Change the TeX template, the
font, anything in the preamble — the old SVGs are silently reused and the render looks
unchanged. `--disable_caching` does **not** help; it only covers partial movie files.

**Fix:** `rm -rf media/Tex media/texts` after any font or template change. Two rebuilds were
lost to this before it was found.

## 5. `config.tex_template` does not survive between scenes

Manim re-initialises `config` between scenes when several are rendered in one command. Only
**4 of 11** generated `.tex` files carried the sans preamble; the rest silently fell back to
Computer Modern.

**Fix:** `mtex()` and `step()` pass `tex_template=TEX_SANS` explicitly. Scene code must never
call `MathTex` directly.

## 6. `always_redraw` throws away outer positioning

The lambda is re-evaluated every frame, so an outer `VGroup(...).arrange()` or `.move_to()` is
discarded after the first frame and the mobject snaps to ORIGIN. Two live counters ended up
stacked on top of a vertex.

**Fix:** position **inside** the lambda, anchored to a static reference:

```python
val = always_redraw(lambda: DecimalNumber(...).next_to(head, RIGHT, buff=0.18))
```

## 7. `\phantom{}` has no width in Manim

The bounding box comes from drawn glyphs, so phantom-based indentation silently collapses.
Indent continuation lines explicitly.

## 8. `Text()` left-aligns its own lines

A multi-line string is left-aligned inside the mobject, which reads as ragged in a caption.

**Fix:** build one `Text` per line and `arrange(DOWN)`, which centres.

## 9. A scene's end state must equal the next scene's start state

Scenes render independently, so if scene N+1 rebuilds the previous *figure* but not the previous
*on-screen text*, the cut drops content. **Invisible at draft resolution**, obvious in the
master. Four of seven cuts in the first long-form film had it.

**Fix:** build both from a shared helper so they cannot drift, and clear the previous state as
the new scene's first beat. `verify_master.py` measures the luma jump at every cut.

## 10. Never scale a caption to make it fit

A `scale_to_fit_width` fallback fires only on the long cues, so the caption changes size through
the film. Wrap instead, and size the type so a wrapped cue still fits.

Wrapping must be **measured**, not estimated from character counts — English words are wider
than the count implies, and a line ran off both edges of a 9:16 frame. Estimate to choose the
break, then measure and tighten until it truly fits.

## 11. DM Sans breaks below about 44pt under Pango

Word spacing collapses: `angles in the same segment` renders with the space after `angles`
eaten. Verified by rendering, not assumed.

**Fix:** DM Sans is display-only, `DISPLAY_MIN = 44`. PingFang HK is the text face at every
size, and it sets 繁體中文 and inline Latin cleanly.

## 12. ffmpeg often ships without libass

`ass`, `subtitles` and `drawtext` need libass and libfreetype, which many Homebrew builds omit.
`ffmpeg -vf ass=subs.ass` then fails outright.

**Fix:** captions are a transparent Manim track composited with `overlay`, which is always
present. Check with `ffmpeg -h filter=ass` before assuming otherwise.

## 13. TinyTeX is not on the global PATH

`which latex` fails, so an agent concludes LaTeX is unavailable and falls back to `Text()`.
See the toolchain section of `SKILL.md`. Export the path; never conclude LaTeX is missing
without looking in `~/Library/TinyTeX`.

## 14. `manim-chemistry`'s `ChemicalFormula` renders the wrong compound

`Ca(OH)2` → **CaO**. `Al2(SO4)3` → **Al₂SO₄**. `CuSO4.5H2O` → **CuSO**. No exception, no
warning, and it only fails on brackets and hydrates — exactly what a DSE paper uses.

**Fix:** `chem()` via mhchem. See `references/engines-and-plugins.md`.

## 15. A camera angle can be geometrically degenerate

Two labelled points landing on the same pixel, or a segment pointing at the lens, produces a
figure that is simply wrong to read. A cuboid at `phi=65, theta=35` collapses A onto G.

**Fix:** `scripts/check_camera.py` before rendering. See `references/3d-geometry.md`.

---

## The pattern

Manim fails loudly on syntax and silently on everything else in this list. Two habits catch
almost all of it:

1. **Measure rather than assume** — contrast ratios, glyph widths, pixel thickness, frame units,
   camera separations. Every number in these references came from a measurement on this machine.
2. **Look at full-resolution frames.** Draft resolution hid defects 3, 9 and 10 completely.
