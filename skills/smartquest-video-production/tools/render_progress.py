"""How far through a render are we?

Manim prints nothing useful until a scene finishes, and `render_draft.sh` pipes
its output through grep, which buffers until the whole run ends. So the only
honest live signal is the mp4 files themselves: a scene is done for this run
when its file is newer than the last source edit.

Run:  python3 tools/render_progress.py
      python3 tools/render_progress.py --watch     # redraw until it finishes
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import project as _P                                            # noqa: E402

ROOT = _P.root()
SRC = ROOT / "src"
BAR = 46


MARKER = ROOT / "out" / ".render-start"


def src_mtime():
    m = max(f.stat().st_mtime for f in SRC.glob("*.py"))
    poses = ROOT / "tools" / "camera-poses.json"
    if poses.exists():
        m = max(m, poses.stat().st_mtime)
    return m


def cutoff():
    """When this run started.

    Not "newer than the source": editing a file mid-render would then reset the
    bar to zero, which is exactly what happened the first time. The marker is
    stamped by render_draft.sh; without one, fall back to the source mtime.
    """
    if MARKER.exists():
        return MARKER.stat().st_mtime
    return src_mtime()


def scan():
    import project as P
    plan = P.plan(ROOT)
    since = cutoff()
    qual = "master" if "--master" in sys.argv else "draft"
    rows, done_times = [], []
    for s in plan["shots"]:
        f = P.scene_file(s["manimScene"], qual, ROOT)
        t = f.stat().st_mtime if f.exists() else 0
        fresh = t > since
        rows.append((s["id"], s["manimScene"], fresh, t))
        if fresh:
            done_times.append(t)
    return rows, since, done_times


def render(rows, since, done_times):
    done = sum(1 for *_, fresh, _ in ((r[0], r[1], r[2], r[3]) for r in rows) if fresh)
    total = len(rows)
    filled = round(BAR * done / total)
    now = time.time()
    started = min(done_times) if done_times else now
    elapsed = now - since
    out = []
    out.append(f"  [{'█' * filled}{'·' * (BAR - filled)}]  {done}/{total}"
               f"  {100 * done / total:.0f}%")
    if done and done < total:
        per = (max(done_times) - since) / done
        eta = per * (total - done)
        out.append(f"  elapsed {int(elapsed // 60)}m{int(elapsed % 60):02d}s"
                   f"   ~{per:.0f}s per scene"
                   f"   eta {int(eta // 60)}m{int(eta % 60):02d}s")
    elif done == total:
        span = max(done_times) - since
        out.append(f"  finished in {int(span // 60)}m{int(span % 60):02d}s")
    else:
        out.append(f"  elapsed {int(elapsed // 60)}m{int(elapsed % 60):02d}s"
                   "   (nothing finished yet)")
    out.append("")
    line = "  "
    for sid, _, fresh, _ in rows:
        line += ("\033[32m" + sid + "\033[0m " if fresh else
                 "\033[90m" + sid + "\033[0m ")
    out.append(line)
    cur = next((r[1] for r in rows if not r[2]), None)
    if cur:
        out.append(f"\n  rendering: {cur}")
    draft = ROOT / "out" / "draft.mp4"
    if done == total and draft.exists() and draft.stat().st_mtime > since:
        out.append("\n  out/draft.mp4 rebuilt")
    # a source edit DURING a run does not reset the bar, but it does mean some
    # of what this run produced is already out of date. Say so separately.
    edited = src_mtime()
    if edited > since:
        stale = [sid for sid, _, fresh, t in rows if fresh and t < edited]
        if stale:
            out.append("\n  source changed mid-run — re-render after: "
                       + " ".join(stale))
    return "\n".join(out)


def as_json():
    rows, since, done = scan()
    total = len(rows)
    n = sum(1 for r in rows if r[2])
    per = (max(done) - since) / n if n and n < total else None
    return {"done": n, "total": total,
            "elapsed": round(time.time() - since, 1),
            "per_scene": round(per, 1) if per else None,
            "eta": round(per * (total - n), 1) if per else None,
            "scenes": [{"id": r[0], "scene": r[1], "fresh": r[2]} for r in rows],
            "current": next((r[1] for r in rows if not r[2]), None)}


def main() -> int:
    if "--json" in sys.argv:
        out = json.dumps(as_json(), indent=1)
        name = "render-progress-master.json" if "--master" in sys.argv \
            else "render-progress.json"
        (ROOT / "out" / name).write_text(out, encoding="utf-8")
        print(out)
        return 0
    if "--watch" in sys.argv:
        while True:
            rows, since, dt = scan()
            print("\033[2J\033[H" + render(rows, since, dt), flush=True)
            if all(r[2] for r in rows):
                return 0
            time.sleep(5)
    print(render(*scan()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
