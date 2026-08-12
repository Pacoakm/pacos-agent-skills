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

Manim re-initialises `config` between scenes when several are rendered in one command. When the
theme still shipped a custom preamble, only **4 of 11** generated `.tex` files carried it and the
rest silently fell back to the stock template. The theme now *uses* the stock template, so this
particular drift is currently harmless — but it will bite again the moment any preamble is added,
so the discipline stands.

**Fix:** `mtex()`, `mtex_ref()` and `step()` pass `tex_template=TEX_MAIN` explicitly. Scene code
must never call `MathTex` directly.

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

## 11. DM Sans breaks below about 44pt under Pango — *historical*

*No longer live: the theme dropped DM Sans when the titles moved to Computer Modern. Kept because
the finding is about Pango, not about DM Sans, and it will apply to any proportional display face
someone reintroduces.*

Word spacing collapses: `angles in the same segment` renders with the space after `angles`
eaten. Verified by rendering, not assumed.

**Fix at the time:** DM Sans was display-only, `DISPLAY_MIN = 44`. The current theme avoids the
question entirely — Latin on the frame goes through TeX, and the only Pango faces left are Songti
TC for on-frame Chinese and PingFang HK for captions, both at sizes well clear of this.

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

## 16. `move_camera(frame_center=...)` does not redraw the figure

The worst one found so far. After a `move_camera()` that animates `frame_center`, every mobject
is drawn at the position implied by the **previous** `frame_center`, and stays wrong for the
rest of the scene.

What makes it vicious is that the camera is **not** wrong. Per-frame reads of
`get_phi()/get_theta()/get_zoom()/frame_center` all give the expected values, and
`camera.points_to_pixel_coords()` returns the **correct** pixel. Only the rasterised output is
wrong — by exactly the stale `frame_center`, measured at 189 px in an 854-wide frame.

Isolated by bisection on an identical scene, changing only how the camera arrived:

| arrival | error |
|---|---|
| `set_camera_orientation(...)` directly | < 1.5 px |
| same state via `move_camera(frame_center=…)` | **189 px** |

**None of these help:** `--disable_caching`; keeping `camera._frame_center` in the scene; a
no-op updater on `mobjects[0]`; an `always_redraw` first mobject; passing `frame_center` as a
Mobject; driving `frame_center` from an updater. Setting it *outside* any `play()`/`wait()`
works, but that is an instant jump, not an animation.

**Fix: never animate `frame_center`.** Keep it at ORIGIN for every keyframe and re-centre by
shifting the figure — geometrically identical, and because the mobjects are themselves animated
Manim redraws them correctly.

```python
def shift_figure(self, target):
    """Re-centre by moving the figure. Returns the animations to do it.

    Mobjects already on screen are animated, so Manim redraws them. Ones not yet
    revealed are shifted instantly — they are invisible and only need to end up
    consistent with the rest.
    """
    target = np.array(target, dtype=float)
    delta = target - self.fig_offset
    self.fig_offset = target
    if not np.any(delta):
        return []
    anims = []
    for m in self.fig.all:           # Group holding EVERY mobject in the video
        if m in self.mobjects:
            anims.append(m.animate.shift(delta))
        else:
            m.shift(delta)
    return anims

self.move_camera(**CAM_EDGE, added_anims=self.shift_figure(OFF_EDGE), run_time=1.1)
```

Two consequences: build every mobject up front inside one `Group` so late reveals carry the
accumulated offset, and add the current offset to anything computed from raw world constants
during the shot (`interpolate(PA, PF, t.get_value()) + self.fig_offset`).

## 17. `manim -s` hides every animation bug

`-s` skips animations and only applies end states, so a still render of a scene with trap 16
looks **perfectly correct** while the movie is wrong. That is how trap 16 survived several
rounds of "I checked the last frame and it's fine."

**Fix:** verify camera work on the rendered **movie**. A still proves the end state, never the
path taken to it.

## 18. `ThreeDScene`'s camera is perspective, not orthographic

`focal_distance` defaults to 20. A line parallel to the view axis but offset from it therefore
converges on a vanishing point instead of collapsing to a point.

So the "look along the line of intersection to reveal the angle between two planes" shot — the
climax of most DSE solid-geometry questions, Gate D in `references/3d-geometry.md` — **does not
work at default settings.** The points that should coincide stay visibly apart and the angle
never reads.

**Fix:** `focal_distance=90` for that shot, which is near-orthographic. Use `phi=89°` rather
than exactly 90° to avoid the pole; the error is negligible (a rendered 21.351° against a true
21.353°). Measured: the line of intersection went from visibly spread to 0.39 scene units.

## 19. `project_points()` uses a cached rotation matrix

If you project points yourself to measure a shot, call `reset_rotation_matrix()` after setting
the angles. Otherwise every projection is computed against the camera's **initial** orientation
and you get confident, precise, wrong numbers. Manim calls it internally from
`capture_mobjects`, so rendering is unaffected — only your measurements are.

The tell: two points sharing a world x,y but differing in z projecting to the *same* screen
position. If you see that, you forgot the call.

## 20. `ffmpeg -ss` before `-i` snaps to a keyframe

On a `-c copy` concat the keyframes sit at scene starts, so "extract the frame at 14.9 s"
silently returned a frame from ≈10.5 s — and invented a scene-continuity defect that did not
exist, which then cost an hour of debugging.

```bash
ffmpeg -i in.mp4 -ss 14.9 -frames:v 1 out.png     # accurate (output seeking)
ffmpeg -ss 14.9 -i in.mp4 -frames:v 1 out.png     # WRONG on concatenated files
```

When it matters, decode all frames (`ffmpeg -i in.mp4 /tmp/f%04d.png`) and index them. Before
believing a defect you found in an extracted still, confirm the frame is the one you think it is.

## 21. Draft frame-rate rounding looks like a timing bug

At 15 fps (`-ql`) a 0.1 s beat is 1.5 frames, so a scene planned at 5.000 s renders at 5.066 s.
That is a draft artefact, not a timing error — at 60 fps every multiple of 0.05 s is a whole
number of frames and the scenes land exactly. Do not "fix" draft drift.

Keep every `run_time` and `wait` a multiple of 0.05 s and check the timeline at 60 fps.

## 22. `font_size` changes letter spacing, not just size

Pango grid-fits glyph positions to the pixel grid of whatever `font_size` it is handed, and
Manim then scales that layout into scene units. So **the same word gets different letter
spacing at different `font_size` values.** It is not a scaled copy.

Measured on `"centroid"` in PingFang HK across `font_size` 20–60, gaps normalised by text height
(×1000):

| pair | min | max | drift |
|---|---|---|---|
| `ce` | 23 | 158 | 135 |
| `oi` | 86 | 225 | 139 |
| `id` | 45 | 206 | 162 |
| `ro` | **−24** | 111 | 134 |

A single pair moves by up to 0.162 of the text height, and `ro` goes **negative** at some sizes —
the glyphs touch. Latin shows it worst because its kerning carries meaning; CJK sits on a uniform
advance grid and hides it. On screen it reads as "英文字距不一樣，非常奇怪", and it is not fixable
by choosing a different face: DM Sans, Helvetica Neue, Avenir Next and SF Pro Text all drift the
same way.

**Fix:** lay every string out at one size and scale. `smartquest_theme` builds all `Text` at
`TYPE_BASE = 120` and scales to the target, which measures **0 drift** at every size, and gives
the well-kerned layout because grid-fitting error shrinks as size grows. Heights are preserved to
three decimals so existing layouts do not move; widths change by up to ~4%, which is the kerning
correction itself.

**Never call `Text()` directly** for anything containing Latin — use `title()`, `body()`,
`label()`, `caption_text()`, or `_text()`.

**Independently corroborated.** Nous Research's bundled `creative-manim-video` skill reports the
same defect in its own words — "Manim's Pango renderer produces broken kerning with proportional
fonts at all sizes" — and works around it by mandating a **monospace** face throughout. That
confirms the diagnosis is not local to this machine. It is a real fix, but it pays by giving up
proportional type everywhere; laying out at `TYPE_BASE` and scaling costs nothing and keeps the
face, so it is the better trade. Worth knowing a second party hit this hard enough to change their
whole type system over it.

## 23. `set_stroke(width=...)` is not in scene units

A stroke width computed from a mobject's `.height` — which *is* in scene units — comes out about
100× too thin, and the stroke silently does not appear. This is how a label halo can be present
in the code, render without error, and be invisible.

Measured at 1080p against `frame_width` 14.222:

| `stroke_width` | rendered |
|---|---|
| 10 | 14 px = 0.104 units |
| 20 | 27 px = 0.200 units |
| 40 | 54 px = 0.400 units |

**`stroke_width` 100 = 1.0 scene unit**, and the ratio is resolution independent. The theme
exposes it as `STROKE_PER_UNIT`. Remember the stroke is centred on the outline, so only half of
it sits outside the shape — a halo of visible thickness `t` needs `2 * 100 * t`.

## 24. `Angle()` draws the reflex angle half the time

`Angle(line1, line2)` sweeps **counterclockwise from line1 to line2**, so whether you get the
angle or its reflex depends on the order you happened to pass the vertices. It renders without an
error either way, and a reflex arc looks like a big circle round the vertex rather than anything
obviously broken.

Measured on one triangle, drawn arc against the true interior angle:

| call | true | drawn |
|---|---|---|
| `Angle(Line(A,B), Line(A,D))` | 52.08° | **313.74°** |
| `Angle(Line(A,B), Line(A,D), other_angle=True)` | 52.08° | 52.11° |
| `Angle(Line(A,D), Line(A,B))` | 52.08° | 52.11° |

So `other_angle=True` and swapping the operands do the same thing, and neither is "the safe one"
— the correct choice flips with the vertex ordering.

**Fix:** `angle_at(vertex, p, q)` in the theme. It takes the orientation from
`cross(p−v, q−v).z`, then **asserts the drawn arc length really is the computed angle**, so a
wrong arc raises instead of rendering. Never call `Angle()` directly in a lesson scene.

---

## The pattern

Manim fails loudly on syntax and silently on everything else in this list. Two habits catch
almost all of it:

1. **Measure rather than assume** — contrast ratios, glyph widths, pixel thickness, frame units,
   camera separations. Every number in these references came from a measurement on this machine.
2. **Look at full-resolution frames.** Draft resolution hid defects 3, 9 and 10 completely.
