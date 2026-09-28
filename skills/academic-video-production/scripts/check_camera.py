#!/usr/bin/env python3
"""Reject degenerate 3D camera angles before rendering anything.

    python3 check_camera.py --points points.json [--min-gap 0.9] [--min-len 0.6]

`points.json` holds the labelled vertices of the figure, in Manim world
coordinates, plus optionally the segments the lesson depends on:

    {
      "points": {"A": [0,0,0], "B": [2.5,0,0], "P": [0,0,1.2], "Q": [1.2,1.9,0]},
      "segments": [["A","G"], ["A","C"]]
    }

Why this exists
---------------
An agent cannot see the render while choosing a camera. Two vertices can land
on the same pixel, or a segment can point straight at the lens and project to
nothing, and the frame is then simply wrong — no error, no warning. Both are
pure arithmetic, so they are checked here rather than discovered later.

Observed: a cuboid at phi=65, theta=35 puts A and G on top of each other. The
scan below scores that camera 0.45 against 2.0+ for the usable ones, before a
single frame is rendered.

Exits non-zero if no camera in the scan passes, so it can gate a build.
"""
from __future__ import annotations

import argparse
import json
import math
from itertools import combinations
from pathlib import Path


def project(p, phi_deg, theta_deg):
    """Manim ThreeDCamera projection: phi from +z, theta azimuth. Returns (x, y)
    on screen.

    ORTHOGRAPHIC APPROXIMATION. ThreeDScene's camera is actually PERSPECTIVE
    (focal_distance=20) — see manim-traps.md #18. That is fine here, because this
    scan compares relative separations to find a non-degenerate angle, and the
    perspective factor is a near-uniform scale over a compact solid.

    It is NOT fine for two things:
      - predicting exact on-screen position or frame fill -> scripts/check_framing.py,
        which projects through a real ThreeDCamera;
      - concluding that a line parallel to the view axis collapses to a point. Under
        the real perspective camera it does not, which is why an edge-on 'look along
        the line of intersection' shot needs focal_distance ~90.
    """
    phi, theta = math.radians(phi_deg), math.radians(theta_deg)
    right = (-math.sin(theta), math.cos(theta), 0.0)
    up = (-math.cos(phi) * math.cos(theta), -math.cos(phi) * math.sin(theta),
          math.sin(phi))
    return (sum(a * b for a, b in zip(p, right)),
            sum(a * b for a, b in zip(p, up)))


def score(points, segments, phi, theta):
    """(smallest gap between two labelled points, shortest projected segment)."""
    flat = {k: project(v, phi, theta) for k, v in points.items()}
    gap = min(math.dist(flat[a], flat[b]) for a, b in combinations(flat, 2))
    seg = min((math.dist(flat[a], flat[b]) for a, b in segments), default=float("inf"))
    return gap, seg


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--points", required=True)
    ap.add_argument("--min-gap", type=float, default=0.9,
                    help="two labelled points closer than this collide on screen")
    ap.add_argument("--min-len", type=float, default=0.6,
                    help="a segment shorter than this is pointing at the lens")
    ap.add_argument("--phi", default="50,60,70,80")
    ap.add_argument("--theta", default="-140,-120,-100,-80,-60,-40,-20,0,20,40")
    ap.add_argument("--top", type=int, default=5)
    args = ap.parse_args()

    data = json.loads(Path(args.points).read_text())
    pts = {k: tuple(v) for k, v in data["points"].items()}
    segs = [tuple(s) for s in data.get("segments", [])]
    for a, b in segs:
        if a not in pts or b not in pts:
            print(f"FAIL segment {a}-{b} names a point that is not defined")
            return 2

    rows = []
    for phi in [float(x) for x in args.phi.split(",")]:
        for theta in [float(x) for x in args.theta.split(",")]:
            gap, seg = score(pts, segs, phi, theta)
            rows.append((gap, seg, phi, theta))

    ok = [r for r in rows if r[0] >= args.min_gap and r[1] >= args.min_len]
    ok.sort(reverse=True)
    bad = sorted(r for r in rows if r not in ok)[:3]

    print(f"scanned {len(rows)} cameras · {len(ok)} usable · "
          f"thresholds gap>={args.min_gap} len>={args.min_len}\n")
    if ok:
        print("best cameras (largest minimum separation first):")
        for gap, seg, phi, theta in ok[:args.top]:
            print(f"  phi={phi:>5.0f}  theta={theta:>6.0f}   "
                  f"min gap {gap:5.2f}   min segment {seg:5.2f}")
    if bad:
        print("\nworst — do not use:")
        for gap, seg, phi, theta in bad:
            why = "points collide" if gap < args.min_gap else "segment vanishes"
            print(f"  phi={phi:>5.0f}  theta={theta:>6.0f}   "
                  f"min gap {gap:5.2f}   min segment {seg:5.2f}   <- {why}")

    if not ok:
        print("\nNo camera in the scan is usable. Widen the scan, or change the "
              "figure — the labelled points may be too close together in 3D.")
        return 1
    gap, seg, phi, theta = ok[0]
    print(f"\nuse: self.set_camera_orientation(phi={phi:.0f} * DEGREES, "
          f"theta={theta:.0f} * DEGREES)")
    print("This is necessary, not sufficient — still render stills from three "
          "angles and look at them.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
