"""Project 3D camera keyframes and report what lands outside the safe area.

A 3D shot is *projected*, so you cannot tell from world coordinates whether the
figure fills the frame, whether a label collides, or whether the segment the shot
exists to show is foreshortened into uselessness. This measures it, in about a
second, which is far cheaper than rendering and looking.

Import it from a project's own check script:

    from check_framing import project, report

    CAMS = [("HERO", CAM_HERO, OFF_ZERO), ("EDGE", CAM_EDGE, OFF_EDGE)]
    NAMED = {"A": PA, "B": PB, "G": PG}
    ON = {"HERO": ["A", "B"], "EDGE": ["A", "G"]}     # what is on screen when
    raise SystemExit(report(CAMS, NAMED, ON))

`report` exits non-zero if anything is off-screen or intrudes into the caption
band, so it can gate a build.

See references/manim-3d-and-camera.md for why each check exists.
"""
from __future__ import annotations

import numpy as np
from manim.camera.three_d_camera import ThreeDCamera

from smartquest_theme import Stage, sync_frame


def project(cam, points, offset=None):
    """Project world points through a real ThreeDCamera.

    `cam` is a dict of phi/theta/zoom/focal_distance — the same dict passed to
    set_camera_orientation / move_camera.

    `offset` is the figure offset, because frame_center must never be animated
    (see references/manim-3d-and-camera.md §1) and re-centring is done by
    shifting the figure instead. Shifting the figure by -P is identical to
    frame_center = P, so projecting `point + offset` with frame_center at ORIGIN
    gives the same answer.
    """
    c = ThreeDCamera()
    c.set_phi(cam["phi"])
    c.set_theta(cam["theta"])
    # gamma was silently dropped here until a rolled camera was measured against
    # a real ThreeDCamera and disagreed: S16/S17 run at gamma 323.5 deg, and
    # without this every point they report is rotated out of place.
    c.set_gamma(cam.get("gamma", 0.0))
    c.set_zoom(cam.get("zoom", 1.0))
    c.set_focal_distance(cam.get("focal_distance", 20.0))
    # project_points uses a CACHED rotation matrix. Without this every result is
    # computed against the camera's initial orientation — confident and wrong.
    c.reset_rotation_matrix()
    pts = np.array(points, dtype=float)
    if offset is not None:
        pts = pts + np.array(offset, dtype=float)
    return c.project_points(pts)


def report(cams, named_points, on_screen=None, panel_width=2.6, verbose=True):
    """Print a framing report. Returns the number of problems found.

    cams          [(name, cam_dict, offset), ...]
    named_points  {"A": PA, ...} — vertices AND label positions
    on_screen     {cam_name: [point names visible in that shot]}. Checking every
                  point at every camera is noise: a deliberate close-up has
                  points outside the frame by design. Omit to check everything.
    """
    sync_frame()
    stage = Stage()
    half_w, half_h = stage.w / 2, stage.h / 2
    cap_top = -half_h + stage.caption_band
    panel_x = half_w - stage.margin - panel_width

    names = list(named_points)
    pts = [named_points[n] for n in names]

    if verbose:
        print(f"frame {stage.w:.2f} x {stage.h:.2f}   "
              f"caption band top y = {cap_top:+.2f}   "
              f"readout column starts x = {panel_x:+.2f}\n")

    problems = 0
    for name, cam, offset in cams:
        out = project(cam, pts, offset)
        live = [(n, p) for n, p in zip(names, out)
                if on_screen is None or n in on_screen.get(name, names)]
        if not live:
            if verbose:
                print(f"{name:10s} (nothing declared on screen — skipped)")
            continue
        xs = np.array([p[0] for _, p in live])
        ys = np.array([p[1] for _, p in live])
        off = [n for n, p in live if abs(p[0]) > half_w or abs(p[1]) > half_h]
        incap = [n for n, p in live if p[1] < cap_top]
        if verbose:
            print(f"{name:10s} bbox x[{xs.min():+6.2f},{xs.max():+6.2f}] "
                  f"y[{ys.min():+6.2f},{ys.max():+6.2f}]  "
                  f"fills {(xs.max()-xs.min())/stage.w:4.0%} w / "
                  f"{(ys.max()-ys.min())/stage.h:4.0%} h")
            if off:
                print(f"           !! OFF-SCREEN: {off}")
            if incap:
                print(f"           !! IN CAPTION BAND: {incap}")
            # A shot filling ~12% of the width is almost always the wrong
            # azimuth, not the wrong zoom — you are looking along the thing.
            if (xs.max() - xs.min()) / stage.w < 0.20:
                print(f"           ?  fills < 20% of width — is the camera "
                      f"looking ALONG what this shot is meant to show?")
        problems += len(off) + len(incap)
    return problems


def screen_angle(cam, vertex, p1, p2, offset=None):
    """The angle between two rays AS RENDERED, in degrees.

    For a dihedral 'look along the line of intersection' shot, compare this with
    the true angle: they agree only when the projection is near-orthographic.
    """
    v, a, b = project(cam, [vertex, p1, p2], offset)
    ang1 = np.degrees(np.arctan2(a[1] - v[1], a[0] - v[0]))
    ang2 = np.degrees(np.arctan2(b[1] - v[1], b[0] - v[0]))
    return abs(ang1 - ang2)


def collapse(cam, p1, p2, offset=None):
    """How far apart two points that should coincide actually project.

    0 means the view axis is exactly along the line p1->p2. A perspective camera
    (focal_distance 20) will NOT collapse an offset parallel line — raise
    focal_distance to ~90 for near-orthographic.
    """
    a, b = project(cam, [p1, p2], offset)
    return float(np.hypot(a[0] - b[0], a[1] - b[1]))
