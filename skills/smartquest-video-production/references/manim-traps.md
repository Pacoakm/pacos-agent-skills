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

## 25. `set_opacity()` switches a fill ON

`Mobject.set_opacity()` sets **fill and stroke**. An arc or a right-angle mark is stroke-only
with `fill_opacity` 0, so dimming it to context with `set_opacity(0.3)` gives it a **30% fill** —
the arc renders as a solid grey lens sitting in the corner of the figure.

It is the most confusing one in this file, because the geometry is right, the colour is right,
and the shape is unrecognisable. It was reported three separate times as "the arc looks strange"
before it was measured.

**Fix:** `plane_arc()` and `right_mark()` set `set_fill(opacity=0)` at build time, and every
dimming call goes through `dim_arc()`, which touches only the stroke:

```python
m.set_stroke(opacity=OP_CONTEXT)          # correct
m.animate.set_stroke(opacity=OP_CONTEXT)  # correct, animated
m.set_opacity(OP_CONTEXT)                 # WRONG — fills the arc
```

## 26. `move_camera` interpolates `focal_distance`

A move from the default perspective (`focal_distance=20`) to the near-orthographic setting
trap #18 requires (`90`) **animates the focal length**. If the figure is also translating during
that move, points swing through extreme perspective on the way and the figure visibly **tears
apart** mid-move — edges detach, the solid comes to pieces, and it reassembles at the end.

**Fix:** give **every** camera in the film the same `focal_distance`, so there is nothing to
interpolate. Near-orthographic (90) throughout is the right choice for a lesson, and if the hero
camera was fitted to a printed textbook figure with an orthographic projection, 90 is the
projection that fit was actually solved for.

## 27. A parent's transform and a child's style in one `play()` — the transform is dropped

```python
self.play(card.animate.shift(d),                       # parent moves
          card["PQ"].animate.set_opacity(0.15))        # child restyles
```

`card["PQ"]` **does not move.** Its animation is built from its own current (un-shifted) state
and overwrites what the parent's shift did to it. The rest of the card moves, two edges stay
behind, and the figure comes apart on screen with no error.

**Fix:** never animate a parent transform and a child style in the same call. Style first, in
its own `play()`, then move whole mobjects only:

```python
self.play(card["PQ"].animate.set_stroke(opacity=0.15), run_time=0.8)
self.move_camera(..., added_anims=[m.animate.shift(d) for m in (ground, card)])
```

The same applies in reverse when restoring: move first, then restore styles.

## 28. A changing `DecimalNumber` cannot be fixed in frame, and deadlocks on `FadeIn`

Two distinct failures from one widget, both in a `ThreeDScene`:

**It gets projected.** `set_value()` **rebuilds the number's glyph submobjects every frame**. The
new children were never registered by `add_fixed_in_frame_mobjects`, so the camera projects them
like ordinary 3D geometry. Measured: the value landed exactly where world coordinates
`(5.05, 1.75, 0)` project — 42 px below its own `θ =`.

**It hangs the render.** A `DecimalNumber` carrying a value-updater, registered fixed-in-frame and
entered with `FadeIn`, **deadlocks**: 0% CPU, no error, no partial movie files, forever. Isolated
by bisection against a control scene.

**Fix:** do not use a live counter as fixed-in-frame UI in a 3D scene. A growing arc already
carries the variation; the numbers only have to mark the ends of the range, so make them **static
labels on their beats** (`θ = 0°` → `θ = 32°`) and transform one into the other.

## 29. `add_fixed_in_frame_mobjects` → `remove` → `add` loses the fixed status

The usual pattern is to register UI, remove it, then bring it back with an entrance animation.
Bringing it back with a plain `Scene.add()` instead re-adds it as an **ordinary 3D mobject that
the camera projects**, silently. Re-registering (`add_fixed_in_frame_mobjects(m)`, which also
adds) is what puts it back correctly.

## 30. A hung render looks exactly like a slow one

Traps #28 and #16 both hang rather than crash. Waiting is the wrong response and costs 10–20
minutes each time. **Two checks separate a hang from progress, and both take one second:**

```bash
ps -p <pid> -o %cpu=                                    # 0.0 = hung; >15 = working
find media/videos/**/partial_movie_files -name '*.mp4' -newermt '-2 minutes' | wc -l
```

A working render burns CPU and writes partial movie files. A hung one does neither. If both are
zero, kill it and bisect against a control scene — do not wait, and do not re-run it unchanged.

## 31. Rebinding a module's colours does not reach its DEFAULT ARGUMENTS

Re-theming by assigning to `smartquest_theme`'s globals works for every colour
the helpers read at CALL time — `mtex(reason, color=MUTED, ...)` inside
`step()` picks up the new value. It does **not** reach a colour captured in a
signature:

```python
def step(statement, reason=None, color=INK, size=SIZE_HEADING):
```

`INK` there was evaluated once, when `def` ran. Every caller that does not name
a colour keeps the old one, and on an inverted field that is near-white type on
a near-white page — invisible, with no error.

The fingerprint is unmistakable once you know it: in lesson 08 the derivation
panels rendered blank while the grey DSE-reason line *underneath* them was
perfectly readable, because the reason line's colour is read inside the body
and the statement's colour is a default.

**Fix:** `use_light()` rewrites `__defaults__` and `__kwdefaults__` as well, and
asserts that `title`, `body`, `label`, `mtex`, `mtex_ref` and `step` were all
reached. Any re-theming that skips this ships ghost type.

## 32. `manim -s` renders an EMPTY frame once scenes hand over

Trap #17 says a still skips animations and applies end states. The corollary
bites as soon as scenes are written to hand over cleanly: a shot whose last
beat fades everything out so its final frame matches the next shot's first has
an END STATE OF NOTHING, so `-s` produces a blank png.

That breaks the Gate 2 workflow, which renders panels with `-s`. Render the
scene as a movie and extract a frame by INDEX instead:

```bash
manim -ql src/script.py S14Parabola
ffmpeg -i media/videos/script/480p15/S14Parabola.mp4 \
  -vf "select=eq(n\,320)" -vsync 0 -frames:v 1 panel.png
```

## 33. `structural()` fills a stroke-only mobject, exactly as `set_opacity` does

`structural()` calls `set_opacity()`, so trap #25 applies to it one tier down:
a `Circle` or a `ParametricFunction` pushed to `OP_STRUCTURE` acquires a 15%
FILL and renders as a soft blob instead of an outline. It is invisible on a
`Line`, which has no area — which is why a set of axes looks correct while the
mini-diagram beside it does not.

**Fix:** for anything stroke-only, set the stroke alone:

```python
for sub in m.family_members_with_points():
    sub.set_stroke(opacity=OP_STRUCTURE)
```

## 34. A cut is only clean if the previous shot ENDS on the next shot's opening

Invariant 10 is usually read as "the next scene should rebuild what the last
one had". The cheaper and more reliable direction is the other one: each shot
declares what it hands over and fades everything else BEFORE the cut. A shot
that hands over nothing ends on the empty field, which is exactly what the next
shot's first frame is.

Two failures come with it, both of which shipped in lesson 08 before being
measured:

- **No room to hand over.** If the choreography fills the shot to its last
  frame there is no time left to fade, and a silently skipped fade means a full
  frame handed to a scene that opens empty — a white flash. Reserve the fade
  when spacing the reveals, and make the missing room an assertion, not a
  skip.
- **A parent faded whole.** Keeping one CHILD of a group and fading the parent
  takes the kept child with it. Fade the group's non-kept children instead.

Measure it per cut, on the per-scene clips, before assembling anything:
`verify_master.py` catches this only on the finished master, where the fix
costs a full re-render. Compare the last frame of scene N against the first of
N+1 by frame INDEX, and gate on mean absolute luma.

---

## The pattern

Manim fails loudly on syntax and silently on everything else in this list. Four habits catch
almost all of it:

1. **Measure rather than assume** — contrast ratios, glyph widths, pixel thickness, frame units,
   camera separations. Every number in these references came from a measurement on this machine.
2. **Look at full-resolution frames.** Draft resolution hid defects 3, 9 and 10 completely.
3. **Reverse-project anything that lands in the wrong place.** When an element renders somewhere
   unexpected, compute where its coordinates *would* project under each candidate transform and
   compare with the measured pixel. That single step identified trap #28 after three failed
   guesses, and it disproved a confident "the arc is drawn on the wrong side" diagnosis that was
   really trap #25. Eyeballing a 480p frame produces plausible, wrong diagnoses.
4. **Compare cuts at exact frame indices, never at timestamps.** At 15 fps a frame lasts 0.0667 s,
   so sampling ±0.05 s either side of a cut can return the **same frame twice** and report a
   perfect 0.00 continuity score for a cut that is actually broken. That false negative passed a
   dropped-content cut all the way to the master:

```bash
ffmpeg -y -i master.mp4 -vf "select=eq(n\,9719)" -vsync 0 -frames:v 1 a.png
ffmpeg -y -i master.mp4 -vf "select=eq(n\,9720)" -vsync 0 -frames:v 1 b.png
```

## 35. A figure that moves between keyframes desynchronises in three ways

A shot whose figure offset differs between its opening and its closing camera has to
*travel*. Shifting "everything on stage" looks right and is wrong three separate ways.
All three were found by eye, in the video, one render at a time.

**(a) A captured origin goes stale.** `O = ORG + self.off` taken before the move still
holds the opening offset afterwards. Anything built later from `O` — a flipped normal,
a curl arc, a projection line — stays where the figure used to be. Re-read the origin
*immediately after* the move, not two beats later:

```python
self.move_camera_kf(1, run_time=7.0)
O = self.at_offset(ORG)      # re-read: the move took the figure with it
```

**(b) `always_redraw` throws the shift away.** The updater rebuilds the mobject from its
own lambda on the very next frame, at the old origin, so it parts company with the static
geometry by exactly the offset delta. Exclude updater-driven mobjects from the shift and
give them a *live* offset to read instead — a `VectorizedPoint` animated in step:

```python
b = always_redraw(lambda: vec3d(self.live_off + ORG, ..., REF_LIME))
```

**(c) Built before the move, added after it.** A mobject constructed early but only
`Create`d later is not on stage when the shift animation runs, so it never receives it.
This is how a φ arc ended up drawn on C instead of A. Build it after the move.

Sweep for (c) with a scan for `Create(x)` after a camera move where `x` was assigned
before it — it is invisible in review otherwise.

## 36. `face_camera` puts the label on screen immediately

`ThreeDScene.add_fixed_orientation_mobjects` calls `Scene.add` itself. Registering a label
so it keeps facing the lens therefore *shows* it, from frame 0 — which is how an
`AB × AC` label was on the figure a full beat before the arrow it names existed. Register
and remove, then reveal with the beat that draws the thing:

```python
def face_camera(self, *mobs, show=False):
    self.add_fixed_orientation_mobjects(*mobs)
    if not show:
        self.remove(*mobs)
```

Draw the line first, name it second — one beat apart. The only exception is a bare vertex
dot, which is not worth a beat of its own, so its letter arrives with it.

## 37. `GrowArrow` raises on `Arrow3D`

```
TypeError: VMobject.scale() got an unexpected keyword argument 'scale_tips'
```

`GrowArrow` passes `scale_tips`, which only Manim's 2D `Arrow` understands; `Arrow3D` is a
`Surface`. Use `GrowFromPoint(v, v.start)` — same reading, plain scale about the tail.
And do use it: `Create` on an `Arrow3D` traces the outline of a cylinder-and-cone mesh, so
the vector appears to be drawn as a piece of plumbing rather than to leave its origin.

## 38. `check_framing.project` silently ignored `gamma`

The helper never called `set_gamma`, so every framing check ever run on a rolled camera
was measured against an unrolled one. Two shots in this lesson ship at `gamma = 323.5°`;
their reports were confidently wrong, and it only surfaced because a browser tool computing
the same projection independently disagreed. Fixed in the script — but the lesson is that a
checking tool needs its own check: bake reference projections from a real `ThreeDCamera`
into the data and have the second implementation verify itself against them on load.
