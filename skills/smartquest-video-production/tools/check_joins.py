"""What actually changes at every cut.

The first version of this compared PIXELS either side of a join. It was wrong
twice: once it called a seamless cut a jump (the incoming shot simply had one
more vector on screen), and once it called a real jump seamless. Pixels cannot
separate "the camera moved" from "part of the figure vanished".

So this compares two things the renderer knows and pixels do not:

  * the CAMERA and figure offset either side — a mismatch means a visible jump;
  * the INVENTORY of what is on stage — anything present before the cut and
    absent after it disappears in a single frame, which is what made S15 -> S16
    look broken even though its camera lined up perfectly.

Both are written during a render by `Lesson3D.dump_join`, into out/joins/.

    python3 tools/check_joins.py            # report
    python3 tools/check_joins.py --json     # also write out/joins.json for the
                                            # review page to fold in
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEG = math.pi / 180.0

def declared_fades(plan):
    """Joins the plan says are fades — `join: "fade"` on the incoming shot.

    A hardcoded list of section breaks was here first, which meant this file
    knew one lesson's structure. The plan is where that belongs, and it is the
    same field `transitions.py` reads, so the check and the edit cannot drift.
    """
    out, shots = set(), plan["shots"]
    for prev, s in zip(shots, shots[1:]):
        if (s.get("join") or "cut").lower() == "fade":
            out.add((prev["manimScene"], s["manimScene"]))
    return out


def view(c):
    p, t = c["phi"] * DEG, c["theta"] * DEG
    return (math.sin(p) * math.cos(t), math.sin(p) * math.sin(t), math.cos(p))


def swing(a, b):
    va, vb = view(a), view(b)
    return math.degrees(math.acos(max(-1.0, min(1.0, sum(x * y for x, y in zip(va, vb))))))


def main() -> int:
    plan = json.loads((ROOT / "video-plan.json").read_text(encoding="utf-8"))
    d = ROOT / "out" / "joins"
    if not d.exists():
        print("no out/joins — render once so the scenes can record their stage")
        return 1
    recs = {}
    for f in d.glob("*.json"):
        r = json.loads(f.read_text(encoding="utf-8"))
        recs[r["scene"]] = r

    FADES = declared_fades(plan)
    order = [s["manimScene"] for s in plan["shots"]]
    problems, report = 0, []
    for a, b in zip(order, order[1:]):
        ra, rb = recs.get(a), recs.get(b)
        if not ra or not rb or "closing" not in ra or "opening" not in rb:
            continue
        section = (a, b) in FADES
        ca, cb = ra.get("closing_cam"), rb.get("opening_cam")
        gone = [x for x in ra["closing"] if x not in rb["opening"]]
        new = [x for x in rb["opening"] if x not in ra["closing"]]

        line = [f"\n{a[:3]} -> {b[:3]}"
                + ("   (declared a fade — continuity not expected)" if section else "")]
        if ca and cb and not section:
            sw = swing(ca, cb)
            droll = abs((cb["gamma"] - ca["gamma"] + 180) % 360 - 180)
            dz = abs(cb["zoom"] - ca["zoom"])
            doff = math.dist(ca["offset"], cb["offset"])
            bad = sw > 0.5 or droll > 0.5 or dz > 0.02 or doff > 0.02
            problems += bad
            line.append(f"   camera  swing {sw:5.2f}°  roll {droll:5.2f}°  "
                        f"zoom {dz:.3f}  figure {doff:.3f}   "
                        + ("JUMPS" if bad else "continuous"))
        if not section:
            if gone:
                problems += 1
                line.append(f"   {len(gone)} thing(s) vanish in one frame:")
                line += ["      - " + g for g in gone[:6]]
                if len(gone) > 6:
                    line.append(f"      ... and {len(gone) - 6} more")
            if new:
                problems += 1
                line.append(f"   {len(new)} thing(s) appear in one frame:")
                line += ["      + " + n for n in new[:6]]
            if not gone and not new:
                line.append("   stage carries across unchanged")
        report.append({"after": a, "before": b, "disappears": gone, "appears": new})
        print("\n".join(line))

    if "--json" in sys.argv:
        (ROOT / "out" / "joins.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
        print("\nwrote out/joins.json")
    print(f"\n{problems} problem(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
