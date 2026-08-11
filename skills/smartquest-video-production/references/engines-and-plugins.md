# Engines and plugins

Manim Community Edition is the production engine. Everything below is either a fallback that
needs permission, or a plugin that needs verifying before it is trusted.

## ManimGL — ask first, every time

`manimgl` (3b1b's own engine, MIT) is installed alongside ManimCE. They coexist: different
commands, different import names (`manimlib` vs `manim`), no conflict.

**Never switch a scene to ManimGL silently.** Say which shot needs it, why ManimCE cannot do it,
and wait for a yes.

Use it only when a shot genuinely needs **per-pixel depth**, which in practice means a curved
surface or an intersecting solid under a **freely orbiting camera**. ManimCE sorts by mobject,
not by pixel, so at some camera angles an axis or a grid line will draw in front of a surface
that should hide it. Verified: a ManimCE surface with `begin_ambient_camera_rotation` looks
correct at the authored angle and breaks part-way through the orbit.

Everything else stays on ManimCE, including DSE solid geometry. Verified: an opaque `Surface`
does correctly hide a `Line3D` behind it, which is all a cuboid / pyramid / prism lesson needs.

### What switching actually costs

Measured while porting one 20-line scene:

| ManimCE | ManimGL |
|---|---|
| `VGroup(Line3D(...))` | `Group(...)` — `Line3D` is not a VMobject |
| `--fps 30` | crashes (its own arg handling passes a string into a division) |
| `set_camera_orientation(phi=, theta=)` | `self.frame.reorient(theta, phi, gamma)` |
| `camera.background_color` | `camera.background_rgba` |

Four incompatibilities in twenty lines, and ManimGL ships no API reference — only a README and
`example_scenes.py`. The whole SmartQuest theme is ManimCE-specific (`config.frame_width`,
`TexTemplate`, `set_sheen_direction`, `t2c`, `config.tex_template`, `set_stroke(background=True)`),
so a port is a rewrite, not a flag.

ManimGL does render headless — no display needed — so it is a viable escape hatch, just not a
default.

## Plugins — verified state, August 2026

| Plugin | Version | Works with our Manim 0.20.1? |
|---|---|---|
| `manim-chemistry` | 0.5.1 (2025-02) | **Yes**, installs and renders |
| `manim-slides` | 5.6.0 (2026-04) | Yes, but it is a presentation tool — not our use |
| `manim-dsa` | 0.4.0 (2025-08) | Yes — data structures, not our use |
| `manim-circuit` | 0.0.3 (2025-01) | Untested; may help Physics circuits |
| **`manim-physics`** | 0.4.0 (2024-04) | **No.** Pinned `manim<0.19`, and its Shapely dependency fails to build on Python 3.13 |
| `chanim` | 1.3 (2022-03) | Stale, untested |
| `manim-ml` | 0.0.24 (2023-04) | Stale, not our use |

## Physics needs no plugin

`manim-physics` is unusable here, and it is not missed. ManimCE already ships every primitive a
DSE Physics lesson needs — verified present in 0.20.1:

`VectorField`, `ArrowVectorField`, `StreamLines` (field lines), `Axes`, `NumberPlane`,
`ValueTracker`, `FunctionGraph`, `ParametricFunction`, `Arrow`, `Vector`, `Angle`, `RightAngle`,
`Brace`, `BarChart`, plus the 3D set.

Kinematics graphs, free-body diagrams, projectiles, circular motion, waves and superposition
(`ValueTracker` + a sine function), ray optics, E/B field lines and decay curves are all plain
ManimCE. Build them from the theme like any other lesson.

## Chemistry: use the plugin for structures, never for formulae

`manim-chemistry` gives real value for things that are painful by hand:

- `BohrAtom` — atomic structure
- `PeriodicTable` — periodic trends
- `GraphMolecule` / `MMoleculeObject` — skeletal structures from `.mol` files
- `ThreeDMolecule` — VSEPR shapes
- `Orbital`, `MolParser`, `SDFParser`, `PubchemAPIManager`

### Do not use `ChemicalFormula`

It silently renders the wrong compound. Verified against 0.5.1:

| Input | Rendered | |
|---|---|---|
| `H2SO4` | H₂SO₄ | ok |
| `Fe2O3` | Fe₂O₃ | ok |
| `C6H12O6` | C₆H₁₂O₆ | ok |
| `Ca(OH)2` | **CaO** | wrong compound |
| `Al2(SO4)3` | **Al₂SO₄** | wrong compound |
| `CuSO4.5H2O` | **CuSO** | water of crystallisation dropped |

No exception, no warning. The `.formula` attribute holds the correct string, so the fault is in
typesetting, and it only bites on brackets and hydrates — exactly the formulae a DSE paper uses.

Write formulae with `mtex()` instead. Verified correct for all of the above, plus reaction
arrows and complex ions, and it comes out in the SmartQuest sans template:

```python
mtex(r"\mathrm{Ca(OH)_2}")
mtex(r"\mathrm{Al_2(SO_4)_3}")
mtex(r"\mathrm{CuSO_4\cdot 5H_2O}")
mtex(r"\mathrm{2H_2 + O_2 \rightarrow 2H_2O}")
mtex(r"\mathrm{[Cu(NH_3)_4]^{2+}}")
```

Wrap chemistry in `\mathrm{}` — element symbols are upright by convention, and plain math mode
sets them italic.

## The rule this all points at

A plugin is third-party code rendering examinable content. Treat every plugin output the same
way as a number in a caption: **render it and check it against the syllabus before it ships.**
The `ChemicalFormula` bug installs cleanly, imports cleanly, renders cleanly, and is wrong.
