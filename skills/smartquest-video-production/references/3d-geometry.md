# 3D scene workflow

DSE solid geometry — cuboids, right pyramids, prisms, cones, spheres; angle between a line and
a plane, angle between two planes, distances. ManimCE handles all of it. The camera moving from
a slanted view to face the solving plane is the single thing paper cannot do, and it is usually
where the lesson lands.

## What is reliable here and what is not

**Numeric and symbolic 3D is reliable**, because it is not imagined — it is computed. Vectors,
dot and cross products, angles, projections, coplanarity are arithmetic that can be executed
and asserted.

**Spatial judgement is not reliable.** Nobody writing the scene can see the render. Which
vertices will overlap at a given camera, whether a label will collide, whether an edge reads as
in front or behind — none of that is predictable from the code.

So the workflow computes everything computable and *looks* at everything else. It never rests
on an intuition about what the frame will look like.

## Gate A — the mathematics lives outside the scene

Write `src/geometry.py`: every vertex, length and angle from numpy, with `assert`s against the
DSE answer. The scene imports numbers; it never derives them.

```python
V = {"A": np.array([0, 0, 0]), "B": np.array([4, 0, 0]), ...}
AC = float(np.linalg.norm(V["C"] - V["A"]))
theta = math.degrees(math.acos(np.dot(u, v) / (np.linalg.norm(u) * np.linalg.norm(v))))
assert abs(AC - 10.0) < 1e-9,        f"AC should be 10, got {AC}"
assert abs(theta - 26.5651) < 1e-4,  f"angle should be 26.5651, got {theta}"
```

If the solver fails, nothing renders. Every number that reaches the screen is formatted from
these values — never typed into a caption.

## Gate B — scan the camera before rendering

```bash
python3 scripts/check_camera.py --points points.json
```

It projects every labelled point through the camera transform over a grid of (phi, theta) and
rejects any camera where two labelled points land closer than a threshold, or where a segment
the lesson depends on projects to nearly nothing because it points at the lens. It prints the
camera with the largest minimum separation.

This is not theoretical. A cuboid at `phi=65, theta=35` puts **A and G on the same pixel**: the
space diagonal AG appears to have zero length and triangle ACG collapses to a vertical line. It
looks like a perfectly reasonable angle to pick. The scan scores it 0.21 against 1.03 for the
usable ones, before anything is rendered.

Pass `--theta=-120,-60,...` with an equals sign — a leading minus otherwise reads as an option.

## Gate C — three angles, actually looked at

Render stills from at least three cameras and inspect them. A wrong construction usually
survives one angle and falls apart at another. Draft quality is fine; this is about structure,
not finish.

## Gate D — collapse to the plane the student will use

Every DSE 3D question reduces to a right triangle in some plane. Animate the camera to look
straight at that plane and check the flat view against the hand solution.

This is both the pedagogical climax and a test: **if the flat view is not the clean right
triangle the marking scheme expects, the 3D construction is wrong.** Do this before the
production render.

**Two things make this shot fail silently — both cost an hour each. Read them before writing it.**

**1. Raise `focal_distance`.** ThreeDScene's camera is perspective (`focal_distance=20`), so a
line parallel to the view axis but offset from it converges on a vanishing point instead of
collapsing to a point. Looking along the line of intersection therefore does *not* square the
plane to the lens at default settings — the points that should coincide stay visibly apart and
the angle never reads. Use `focal_distance=90` (near-orthographic) for this shot, and `phi=89°`
rather than exactly 90° to avoid the pole. Measured: a rendered 21.351° against a true 21.353°.

**2. Get the azimuth from the geometry, not by eye.** To look along a line, `theta` must equal
that line's azimuth. A uniform scale-and-translate from world to scene coordinates preserves
directions, so the world azimuth *is* the scene azimuth — compute it:

```python
v = P_far - P_near
BF_AZIM = np.degrees(np.arctan2(v[1], v[0]))       # then theta = BF_AZIM * DEGREES
```

Verify the shot before rendering with `check_framing.screen_angle()` (the angle as it will
actually render) and `check_framing.collapse()` (how far apart two points that should coincide
land — 0 is perfectly edge-on).

**Do not re-centre the shot with `move_camera(frame_center=...)`.** It does not redraw the
figure — see `manim-traps.md` #16. Shift the figure instead.

## Gate E — verify occlusion, never assume it

ManimCE sorts by mobject, not per pixel.

Verified working: an opaque `Surface` does hide a `Line3D` behind it. That is enough for a
convex solid drawn as wireframe plus translucent faces, which is every DSE solid.

Verified failing: a freely orbiting camera over a curved surface. An axis or a grid line will
draw in front of the surface at some angles even though it is behind. If a shot truly needs
that, it is the one case for ManimGL — ask first, per `references/engines-and-plugins.md`.

Practical rules:
- Wireframe plus faces at `fill_opacity <= 0.2`.
- Labels via `add_fixed_orientation_mobjects` so they face the camera.
- Keep 2D mobjects out of the 3D stack; they do not depth-sort.
- Check the stills. Every time.

## Gate F — labels

Labels must face the camera and must not collide, **at every camera the shot uses**.

Placing them by pushing outward from the centroid is not reliable — in the first cuboid render
that put D and F on top of the edges they belonged to. Check each camera and nudge per label.

## Camera moves that break, and how to choose one

Four findings from a tilted-plane lesson, all measured.

**One focal length for the whole film.** `move_camera` interpolates `focal_distance`, so a move
from 20 to 90 while the figure is translating tears the figure apart mid-move (trap #26). Set
every camera to the near-orthographic 90 and the problem cannot arise. It is also the honest
setting when the hero camera was fitted to a printed figure, because that fit is orthographic.

**Reach a collapse camera from the near side.** A plane is edge-on from *either* side of its
normal — `theta` and `theta ± 180°`. Both give the same on-screen angle (measured 18.262° against
a true 18.264° from both sides), so pick the one nearer the current camera. Swinging 154° round
the back of the figure is disorienting and reads as losing the object; the near side was 26° away.
**Caveat:** the far side **mirrors the layout left-for-right**, so every screen-space label offset
tuned at one side is on the wrong side at the other. Re-place them all, or the labels sit across
the lines they name.

**Orbit low, not overhead.** A 360° orbit at the hero elevation (phi 34°, looking down) shows a
flat shape turning; the viewer learns nothing about the third dimension. Drop to a low elevation
first (phi ≈ 72°) and the card is visibly standing off the ground all the way round. Choose the
elevation by measuring, over the whole turn, the smallest separation between a raised point and
its own ground shadow — that separation *is* the visible tilt.

**An orbit needs the figure on the orbit axis, and scaled for the worst azimuth.** The camera
revolves about the world z-axis through ORIGIN, so a figure composed for the hero camera (offset
to leave room for a panel) **wanders around the frame** and off it. Glide the figure onto the axis
before the orbit and back afterwards, and compute the scale that fits at *every* azimuth, not the
one that fits at the start:

```python
k = 1.0
for th in range(0, 360, 5):
    r, u = proj_axes(dict(phi=ORBIT_PHI, theta=radians(th)))
    for p in card_points_centred:
        k = min(k, half_w / abs(p @ r), top / (p @ u) if p @ u > 0 else ...)
```

Constrain the **card** only; the ground rectangle is structure and may clip at the edges.

## Scene structure

```python
class S04Diagonal(ThreeDScene):
    def construct(self):
        self.camera.background_color = BG
        self.set_camera_orientation(phi=65 * DEGREES, theta=-60 * DEGREES)  # from Gate B
        ...
        self.move_camera(phi=90 * DEGREES, theta=-90 * DEGREES, run_time=3.0)  # Gate D
```

Move the camera **slowly and once**. A short controlled move to the solving plane teaches; a
continuous orbit mostly makes a student dizzy and, in ManimCE, exposes the depth-sorting
weakness. Hold still for `REST_AHA` once the plane is square to the lens.

`SQScene` is a 2D base; a 3D lesson subclasses `ThreeDScene` and applies the theme by hand —
background from `BG`, colours from the semantic palette, strokes from `SW_*`, labels from
`mtex()`. The colour contract is unchanged: `GIVEN` for what the question supplies, `UNKNOWN`
for the target, `AUX` for construction lines added to solve it.
