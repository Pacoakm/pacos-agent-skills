"""Gate the hand-picked cameras in tools/camera-poses.json before they go back
into src/part_b.py.

The picker checks framing live. This checks the two things it cannot:

* **Framing, independently.** Every labelled point and every vector tip is
  projected through a real `ThreeDCamera` and tested against the same bands the
  scene code lays out against. Plane patches are exempt — structure is allowed
  to run off the edge.

* **The guarantees some of these cameras carry.** Three of them were solved,
  not chosen, and the lesson leans on what they prove:

    S15 move   the angle phi must render TRUE SIZE, or the arc on screen
               disagrees with the number in the panel
    S16 move   plane ABC must be EDGE-ON (A, B, C collapse onto one line) and
               the height must stand vertical, or `d = 6` is not what is shown
    S17 start  opens at that same edge-on camera

  A hand-picked camera can look better and still break these. That is the whole
  point of measuring instead of looking.

Run:  python3 tools/check_poses.py
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL = Path.home() / ".claude/skills/smartquest-video-production/scripts"
sys.path.insert(0, str(SKILL))
sys.path.insert(0, str(ROOT / "src"))

from check_framing import project                             # noqa: E402
from smartquest_theme import Stage, sync_frame                # noqa: E402

DEG = math.pi / 180.0


def cam_dict(p):
    return {"phi": p["phi"] * DEG, "theta": p["theta"] * DEG,
            "gamma": p["gamma"] * DEG, "zoom": p["zoom"],
            "focal_distance": p["focal_distance"]}


def load_guarantees():
    """This lesson's solved cameras, if it has any.

    Framing is the same question for every project. Whether a particular pose
    still renders an angle true size, or still lays a plane edge-on, is a claim
    only the lesson can make — so it lives beside the lesson, in
    `tools/pose_guarantees.py`, and this runs whatever it finds.
    """
    try:
        import pose_guarantees
        return pose_guarantees.GUARANTEES
    except Exception:
        return {}


def framing(shot, pose, st):
    """Labels and vector tips against the reserved bands."""
    pts, names = [], []
    for el in shot["elements"]:
        if el["type"] == "label":
            pts.append(el["at"]); names.append(el["text"])
        elif el["type"] == "vector":
            pts.append(el["b"]); names.append("tip")
    if not pts:
        return []
    out = project(cam_dict(pose), pts, offset=pose["offset"])
    bad = []
    for nm, q in zip(names, out):
        if abs(q[0]) > st.w / 2 or abs(q[1]) > st.h / 2:
            bad.append(f"{nm} off frame ({q[0]:.2f}, {q[1]:.2f})")
        elif q[1] < st.content_bottom:
            bad.append(f"{nm} in caption band (y={q[1]:.2f})")
        elif not st.portrait and q[1] > st.content_top:
            # The title band is not empty any more: a long-form shot carries the
            # knowledge point in its top-left (hard rule 34). A projected solid
            # reaches up there far more often than a flat figure does.
            bad.append(f"{nm} in section-tag band (y={q[1]:.2f})")
        elif q[0] > st.panel_box()[0][0]:
            bad.append(f"{nm} under panel column (x={q[0]:.2f})")
    return bad





def main() -> int:
    poses = json.loads((ROOT / "tools" / "camera-poses.json")
                       .read_text(encoding="utf-8"))
    data = json.loads((ROOT / "tools" / "scene3d.json").read_text(encoding="utf-8"))
    shots = {s["scene"]: s for s in data["shots"]}
    sync_frame()
    st = Stage()
    GUARANTEES = load_guarantees()

    problems = 0
    rows_json = []
    print(f"{len(poses)} hand-picked cameras\n")
    for key in sorted(poses, key=lambda k: (shots[k.split('#')[0]]["start"], k)):
        pose = poses[key]
        scene, idx = key.split("#")
        shot = shots[scene]
        bad = framing(shot, pose, st)
        gname, gfn = GUARANTEES.get(key, (None, None))
        gtxt = ""
        if gfn:
            ok, msg = gfn(pose)
            gtxt = f"    {'ok  ' if ok else 'FAIL'} {gname}: {msg}"
            if not ok:
                problems += 1
        flag = "FAIL" if bad else "ok  "
        problems += len(bad)
        rows_json.append({"key": key, "framing": bad,
                          "guarantee": None if not gfn else
                          {"name": gname, "ok": bool(ok), "detail": msg},
                          "cam": {k: pose[k] for k in
                                  ("phi", "theta", "gamma", "zoom")}})
        print(f"{flag} {key:<24} phi={pose['phi']:7.2f} theta={pose['theta']:8.2f} "
              f"gamma={pose['gamma']:7.2f} zoom={pose['zoom']:.2f}")
        for b in bad:
            print(f"       framing: {b}")
        if gtxt:
            print(gtxt)

    # gamma outside one turn renders identically but reads badly in the source
    wide = [k for k, p in poses.items() if abs(p["gamma"]) > 180]
    if wide:
        print(f"\nnote: gamma outside +/-180 on {', '.join(sorted(wide))} — "
              "same picture, but normalise before pasting")

    print(f"\n{problems} problem(s)")
    if "--json" in sys.argv:
        (ROOT / "out" / "check-poses.json").write_text(
            json.dumps({"problems": problems, "poses": len(poses),
                        "rows": rows_json}, ensure_ascii=False, indent=1),
            encoding="utf-8")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
