"""TEMPLATE — copy into a lesson's tools/ and describe ITS figures.

`install.py` drops this in as `extract_3d.py` only when a project has none, and
never overwrites one you have edited.

Two things below are the lesson's and must be rewritten; everything else works
unchanged:

  FIGURES   {scene class -> () -> (elements, check_points)}
            what each 3D shot draws. `fig_ab`, `fig_ijk`, `fig_solid` here are
            one lesson's figures — replace them with yours, built by calling
            the scene module's own helpers so the picker cannot drift from the
            render.
  SWEEPS / NUDGE
            shots whose figure moves during the shot, and per-keyframe offsets.

Everything that follows — the camera scan of `construct`, the projection
reference the page checks itself against, the stage layout — is generic.

from __future__ import annotations

import ast
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL = Path.home() / ".claude/skills/smartquest-video-production/scripts"
sys.path.insert(0, str(SKILL))
sys.path.insert(0, str(ROOT / "src"))

import numpy as np                                            # noqa: E402
import part_b as PB                                           # noqa: E402
from manim.camera.three_d_camera import ThreeDCamera          # noqa: E402
from smartquest_theme import Stage, sync_frame                # noqa: E402
import smartquest_theme as TH                                 # noqa: E402

DEG = math.pi / 180.0
SRC = ROOT / "src" / "part_b.py"


# --------------------------------------------------------------- cameras -----
def camera_keyframes():
    """Read each 3D shot's cameras straight out of the source.

    Static, not simulated: walking `construct` in order and evaluating the
    argument expressions against the module's own globals keeps the numbers
    tied to the scene code, so `EDGE_ON_THETA` and `(self.THETA + 46)` come out
    as whatever the module actually computes today.
    """
    tree = ast.parse(SRC.read_text(encoding="utf-8"))
    src = SRC.read_text(encoding="utf-8")
    out = {}

    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue
        cls = getattr(PB, node.name, None)
        if not (isinstance(cls, type) and issubclass(cls, PB.Lesson3D)):
            continue
        construct = next((n for n in node.body if isinstance(n, ast.FunctionDef)
                          and n.name == "construct"), None)
        if construct is None:               # _AbFigure / _Solid base classes
            continue

        env = dict(vars(PB))
        env["self"] = cls                   # class attribute access is enough

        def ev(expr_node):
            return eval(ast.get_source_segment(src, expr_node), env)  # noqa: S307

        cams, plan_t = [], float(cls.START)

        def add(kind, kw, degrees, run_time=None):
            base = cams[-1] if cams else {}
            cam = {"phi": base.get("phi", cls.PHI),
                   "theta": base.get("theta", cls.THETA),
                   "gamma": base.get("gamma", 0.0),
                   "zoom": base.get("zoom", 1.0),
                   "focal_distance": cls.FOCAL,
                   "offset": base.get("offset", [0.0, 0.0, 0.0])}
            k = 1.0 if degrees else 1.0 / DEG
            for name in ("phi", "theta", "gamma", "zoom"):
                if name in kw:
                    cam[name] = float(ev(kw[name])) * (k if name != "zoom" else 1.0)
            if "focal_distance" in kw:
                cam["focal_distance"] = float(ev(kw["focal_distance"]))
            cam.update(kind=kind, at=plan_t, run_time=run_time)
            cams.append(cam)

        for stmt in ast.walk(construct):
            if not (isinstance(stmt, ast.Call)
                    and isinstance(stmt.func, ast.Attribute)
                    and isinstance(stmt.func.value, ast.Name)
                    and stmt.func.value.id == "self"):
                continue
            name = stmt.func.attr
            kw = {k.arg: k.value for k in stmt.keywords if k.arg}
            if name == "at" and stmt.args:
                plan_t = float(ev(stmt.args[0]))
            elif name == "setup_stage":
                add("start", kw, degrees=True)
            elif name == "move_camera":
                rt = float(ev(kw["run_time"])) if "run_time" in kw else None
                add("move", kw, degrees=False, run_time=rt)

        # ast.walk is not source order for the statement list, so re-sort by the
        # beat each call sits under; `start` always leads.
        cams.sort(key=lambda c: (c["kind"] != "start", c["at"]))
        out[node.name] = cams
    return out


# -------------------------------------------------------------- geometry -----
def P(v):
    return [round(float(x), 6) for x in np.asarray(v, dtype=float)]


def poly(mob, stroke, fill=None, opacity=0.0, width=1.0, closed=True):
    return {"type": "poly" if closed else "polyline",
            "pts": [P(p) for p in mob], "stroke": stroke,
            "fill": fill, "opacity": opacity, "width": width}


def patch_pts(u, v, org, ahead, behind):
    """The exact rectangle `span_plane` lays down, read off the mobject."""
    p = PB.span_plane(np.asarray(u, float), np.asarray(v, float),
                      np.asarray(org, float), ahead=ahead, behind=behind)
    return [P(q) for q in p.get_vertices()]


def vec(a, b, color, label=None):
    e = {"type": "vector", "a": P(a), "b": P(b), "color": color}
    if label:
        e["label"] = label
    return e


def line(a, b, color, dashed=False, width=1.0):
    return {"type": "polyline", "pts": [P(a), P(b)], "stroke": color,
            "dashed": dashed, "width": width}


def lab(text, at, color):
    return {"type": "label", "text": text, "at": P(at), "color": color}


def arc_pts(centre, p1, p2, radius, n=48):
    """Sample the 3D arc `arc3d` draws between two rays from `centre`."""
    u = np.asarray(p1, float) - centre
    v = np.asarray(p2, float) - centre
    u = u / np.linalg.norm(u)
    w = v - u * float(v @ u)
    w = w / np.linalg.norm(w)
    ang = math.acos(float(np.clip((v / np.linalg.norm(v)) @ u, -1, 1)))
    return [P(centre + radius * (math.cos(t) * u + math.sin(t) * w))
            for t in (ang * i / (n - 1) for i in range(n))]


def right_mark_pts(corner, u, v, size):
    c = np.asarray(corner, float)
    u = np.asarray(u, float) / np.linalg.norm(u)
    v = np.asarray(v, float) / np.linalg.norm(v)
    return [P(c + u * size), P(c + u * size + v * size), P(c + v * size)]


C = {n: getattr(TH, n) for n in
     ("GIVEN", "UNKNOWN", "RESULT", "WARN", "AUX", "LINE", "INK", "MUTED",
      "REF_CYAN", "REF_LIME", "REF_FUCHSIA", "BG")}


def fig_ab(*, with_n=True, b_theta=None, parallelogram=False, drop=False,
           labels="abn"):
    """S07–S10 — the abstract a / b / n figure.

    `labels` is which of a / b / n̂ the shot actually ADDS: S09 and S10 build
    all three and add only `la`, so drawing the other two here would invent a
    collision the render does not have.
    """
    b = PB.BV3 if b_theta is None else PB.b_at(b_theta)
    els = [poly(patch_pts(PB.AV3, PB.BV3, PB.ORG, 1.30, 0.40),
                C["LINE"], C["LINE"], 0.055)]
    if parallelogram:
        o = PB.ORG
        pg = poly([P(o), P(o + PB.AV3), P(o + PB.AV3 + b), P(o + b)],
                  C["UNKNOWN"], C["UNKNOWN"], 0.30, width=1.4)
        pg["sweep"] = "para"
        els.append(pg)
    if drop:                       # the height of the parallelogram, b -> a
        foot = PB.ORG + PB.AV3 * float(b @ PB.AV3) / float(PB.AV3 @ PB.AV3)
        dl = line(PB.ORG + b, foot, C["AUX"], dashed=True)
        dl["sweep"] = "drop"
        els.append(dl)
    bv = vec(PB.ORG, PB.ORG + b, C["REF_LIME"])
    bv["sweep"] = "vec"
    els += [vec(PB.ORG, PB.ORG + PB.AV3, C["GIVEN"]), bv]
    if "a" in labels:
        els.append(lab("a", PB.ORG + PB.AV3 * 1.14, C["GIVEN"]))
    if "b" in labels:
        bl = lab("b", PB.ORG + b * 1.16, C["REF_LIME"])
        bl["sweep"] = "label"
        els.append(bl)
    # check points, not drawn labels: the tips are what can collide or fold
    # back onto a shaft, which is what check_camera.py scores on the solid.
    named = {"O": P(PB.ORG), "a→": P(PB.ORG + PB.AV3),
             "b→": P(PB.ORG + b)}
    if with_n:
        n = np.array([0.0, 0.0, 2.15])
        els.append(vec(PB.ORG, PB.ORG + n, C["AUX"]))
        if "n" in labels:
            els.append(lab("n̂", PB.ORG + np.array([0, 0, 2.5]), C["AUX"]))
        named["n→"] = P(PB.ORG + n)
    return els, named


def fig_ijk():
    """S11 — the basis triad."""
    org = np.array([-2.7, -1.0, -0.6])
    els = [poly(patch_pts([1.9, 0, 0], [0, 1.9, 0], org, 1.35, 0.4),
                C["LINE"], C["LINE"], 0.055)]
    named = {}
    for nm, d, col in (("i", [1.9, 0, 0], C["REF_CYAN"]),
                       ("j", [0, 1.9, 0], C["REF_LIME"]),
                       ("k", [0, 0, 1.9], C["REF_FUCHSIA"])):
        d = np.array(d, float)
        els += [vec(org, org + d, col), lab(nm, org + d * 1.20, col)]
        named[nm] = P(org + d * 1.20)
    return els, named


def fig_resolve():
    """S12 — the 3-4-5 resolve-against-a-line figure."""
    cls = PB.S12Resolve
    O, sc = cls.ORG, cls.SC
    A = O + np.array([3.0, 4.0, 0.0]) * sc
    B = O + np.array([5.0, 0.0, 0.0]) * sc
    Cf = O + np.array([3.0, 0.0, 0.0]) * sc
    els = [poly(patch_pts(np.array([3.0, 4.0, 0.0]) * sc,
                          np.array([5.0, 0.0, 0.0]) * sc, O, 1.45, 0.4),
                C["LINE"], C["LINE"], 0.055),
           line(O, Cf, C["UNKNOWN"], width=3.4),
           vec(O, A, C["GIVEN"]), vec(O, B, C["REF_LIME"]),
           vec(A, Cf, C["AUX"]),
           poly(right_mark_pts(Cf, [-1, 0, 0], [0, 1, 0], 0.26),
                C["AUX"], closed=False)]
    named = {}
    for nm, pt, col, off in (("O", O, C["INK"], [-0.34, -0.24, 0]),
                             ("A", A, C["GIVEN"], [-0.1, 0.36, 0]),
                             ("B", B, C["REF_LIME"], [0.34, 0.05, 0]),
                             ("C", Cf, C["AUX"], [0.0, -0.38, 0])):
        els.append(lab(nm, pt + np.array(off), col))
        named[nm] = P(pt + np.array(off))
    return els, named


def fig_solid(*, vectors=False, normal=False, av=False, phi_arc=False,
              in_plane=False, height=False, triangle=False):
    """S13–S17 — the tetrahedron VABC."""
    S = PB.SOLID
    A, B, Cc, V = (S[k] for k in "ABCV")
    n = PB.NORMAL_DIR
    els = [poly(patch_pts(B - A, Cc - A, A, 1.22, 0.30),
                C["LINE"], C["LINE"], 0.055)]
    if triangle:
        els.append(poly([P(A), P(B), P(Cc)], C["UNKNOWN"], C["UNKNOWN"], 0.28,
                        width=1.4))
    for u, v in (("A", "B"), ("B", "C"), ("C", "A"),
                 ("A", "V"), ("B", "V"), ("C", "V")):
        els.append(line(S[u], S[v], C["LINE"], width=1.4))
    if vectors:
        els += [vec(A, B, C["GIVEN"]), vec(A, Cc, C["REF_LIME"])]
    if normal:
        els.append(vec(A, A + n * 2.3, C["UNKNOWN"]))
    if av:
        els.append(vec(A, V, C["REF_CYAN"]))
    ip = V - A
    ip = ip - n * float(ip @ n)
    ip = ip / np.linalg.norm(ip) * 2.0
    if phi_arc:
        els.append({"type": "polyline",
                    "pts": arc_pts(A, A + n * 2.3, V, 0.75),
                    "stroke": C["REF_FUCHSIA"], "width": 1.4})
        els.append(lab("φ", A + (n * 2.3 + (V - A)) * 0.30, C["REF_FUCHSIA"]))
    if in_plane:
        els.append(line(A, A + ip, C["AUX"], dashed=True))
        els.append({"type": "polyline", "pts": arc_pts(A, A + ip, V, 1.05),
                    "stroke": C["RESULT"], "width": 1.4})
        els.append(line(V, A + ip, C["AUX"], dashed=True))
    if height:
        foot = V - n * float((V - A) @ n)
        els.append(line(V, foot, C["AUX"], dashed=True))
    named = {}
    for k in "ABCV":
        els.append(lab(k, S[k] * 1.16, C["INK"]))
        named[k] = P(S[k] * 1.16)
    return els, named


FIGURES = {
    "S07Perpendicular": lambda: fig_ab(),
    "S08Definition": lambda: fig_ab(),
    "S09Area": lambda: fig_ab(parallelogram=True, drop=True, labels="a"),
    "S10Properties": lambda: fig_ab(with_n=False, b_theta=0.0, labels="a"),
    "S11CrossComponents": fig_ijk,
    "S12Resolve": fig_resolve,
    "S13Question": lambda: fig_solid(),
    "S14PartA": lambda: fig_solid(vectors=True, normal=True),
    "S15LinePlane": lambda: fig_solid(vectors=True, normal=True, av=True,
                                      phi_arc=True, in_plane=True),
    "S16Distance": lambda: fig_solid(vectors=True, normal=True, av=True,
                                     height=True),
    "S17Volume": lambda: fig_solid(vectors=True, normal=True, av=True,
                                   height=True, triangle=True),
}

# `b` sweeps through the whole shot in S09, and a camera that reads at the start
# angle can be useless at 150 deg — so the picker gets to drive it too.
SWEEPS = {"S09Area": {"label": "θ (a to b)", "min": 0.0, "max": 150.0,
                      "value": PB.theta_deg(),
                      "kind": "b_at", "org": P(PB.ORG), "a": P(PB.AV3),
                      "len": round(float(np.linalg.norm(PB.BV3)), 6)}}

# S16 slides the solid across the lens on its way to the edge-on camera, and
# S17 opens already slid. A world offset, exactly as check_framing.project takes.
NUDGE = {"S16Distance": ("move", P(PB.EDGE_ON_NUDGE)),
         "S17Volume": ("all", P(PB.EDGE_ON_NUDGE))}


# ------------------------------------------------------------- reference -----
def reference_projections(shots):
    """Ground truth from the real ThreeDCamera, for the HTML to check itself."""
    cases = []
    pts = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1],
           [-3.8472, -0.6583, -0.2722], [-2.2139, 0.4306, 2.45],
           [2.5, -1.75, 0.9]]
    cams = [c for s in shots for c in s["cameras"]]
    cams += [{"phi": 0.0, "theta": -90.0, "gamma": 0.0, "zoom": 1.0,
              "focal_distance": 20.0, "offset": [0, 0, 0]},
             {"phi": 119.682, "theta": -4.086, "gamma": 40.0, "zoom": 1.4,
              "focal_distance": 90.0, "offset": [0.3, -0.2, 0.1]}]
    for cam in cams:
        c = ThreeDCamera()
        c.set_phi(cam["phi"] * DEG)
        c.set_theta(cam["theta"] * DEG)
        c.set_gamma(cam["gamma"] * DEG)
        c.set_zoom(cam["zoom"])
        c.set_focal_distance(cam["focal_distance"])
        c.reset_rotation_matrix()
        got = c.project_points(np.array(pts, float)
                               + np.array(cam["offset"], float))
        cases.append({"cam": {k: cam[k] for k in
                              ("phi", "theta", "gamma", "zoom",
                               "focal_distance", "offset")},
                      "pts": pts,
                      "out": [[round(float(p[0]), 9), round(float(p[1]), 9)]
                              for p in got]})
    return cases


# ------------------------------------------------------------------ main -----
def main():
    plan = json.loads((ROOT / "video-plan.json").read_text(encoding="utf-8"))
    by_scene = {s["manimScene"]: s for s in plan["shots"]}
    cams = camera_keyframes()
    sync_frame()
    st = Stage()
    fc, fw, fh = st.figure_box()
    ptl, pw = st.panel_box()

    shots = []
    for scene, keyframes in cams.items():
        if scene not in FIGURES:
            raise SystemExit(f"no figure builder for 3D scene {scene}")
        els, named = FIGURES[scene]()
        meta = by_scene.get(scene, {})
        mode, off = NUDGE.get(scene, (None, None))
        if mode == "all":
            for c in keyframes:
                c["offset"] = off
        elif mode == "move":
            for c in keyframes:
                if c["kind"] == "move":
                    c["offset"] = off
        shots.append({
            "scene": scene,
            "id": meta.get("id", scene[:3]),
            "start": meta.get("start"),
            "end": meta.get("end"),
            "purpose": meta.get("purpose", ""),
            "visual": meta.get("visual", ""),
            "motion": meta.get("motion", ""),
            "beats": meta.get("beats", []),
            "subtitles": meta.get("subtitles", []),
            "frame": meta.get("storyboardFrame"),
            "cameras": keyframes,
            "elements": els,
            "named": named,
            "sweep": SWEEPS.get(scene),
        })
    shots.sort(key=lambda s: s["start"] if s["start"] is not None else 0)

    data = {
        "project": plan["title"],
        "source": "src/part_b.py",
        "stage": {
            "frame_w": round(float(st.w), 6), "frame_h": round(float(st.h), 6),
            "title_band": round(float(st.title_band), 6),
            "caption_band": round(float(st.caption_band), 6),
            "margin": round(float(st.margin), 6),
            "content_top": round(float(st.content_top), 6),
            "content_bottom": round(float(st.content_bottom), 6),
            "figure_box": {"cx": round(float(fc[0]), 6),
                           "cy": round(float(fc[1]), 6),
                           "w": round(float(fw), 6), "h": round(float(fh), 6)},
            "panel_box": {"x": round(float(ptl[0]), 6),
                          "top": round(float(ptl[1]), 6),
                          "w": round(float(pw), 6)},
        },
        "colors": C,
        "shots": shots,
        "reference": reference_projections(shots),
    }

    out = ROOT / "tools" / "scene3d.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1),
                   encoding="utf-8")

    tpl = (ROOT / "tools" / "picker-template.html").read_text(encoding="utf-8")
    html = tpl.replace('"__SCENE3D__"',
                       json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    (ROOT / "tools" / "camera-picker.html").write_text(html, encoding="utf-8")

    print(f"{len(shots)} 3D shots -> tools/scene3d.json "
          f"({out.stat().st_size / 1024:.0f} kB)")
    saved = ROOT / "tools" / "camera-poses.json"
    if saved.exists():
        n = len(json.loads(saved.read_text(encoding="utf-8")))
        print(f"  {n} hand-picked pose(s) kept in tools/camera-poses.json")
    for s in shots:
        moves = " ".join(
            f"{c['kind'][0]}@{c['at']:.0f}[{c['phi']:.1f},{c['theta']:.1f}"
            + (f",γ{c['gamma']:.1f}" if abs(c["gamma"]) > 1e-9 else "") + "]"
            for c in s["cameras"])
        print(f"  {s['id']} {s['scene']:<20} {moves}")


if __name__ == "__main__":
    main()
