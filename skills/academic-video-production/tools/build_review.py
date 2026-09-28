"""Build the beat-review page: tools/review.html.

Pulls one still per planned beat out of the draft, folds in whatever the label
audit and the join inspector found, and writes a page you scrub, annotate and
export a punch list from — instead of scrubbing a 12-minute file and typing
timestamps by hand.

    python3 tools/build_review.py                 # shot starts + beats
    python3 tools/build_review.py --subs          # every subtitle cue too
    python3 tools/build_review.py --video out/picture-subbed.mp4

Then serve it (the notes are PUT back to tools/review-notes.json):

    python3 tools/serve.py 8777 ../../..
    open http://127.0.0.1:8777/<path-to-project>/tools/review.html
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def beats(plan, want, with_subs):
    out = []
    for s in plan["shots"]:
        if want and s["id"] not in want:
            continue
        out.append((s["start"] + 0.05, s["id"], "opens — " + (s.get("visual") or "")))
        for b in s.get("beats") or []:
            out.append((float(b["at"]) + 0.3, s["id"],
                        b.get("figure") or b.get("line") or "beat"))
        if with_subs:
            for c in s.get("subtitles") or []:
                out.append((float(c["start"]) + 0.3, s["id"], "「" + c["text"] + "」"))
        out.append((s["end"] - 0.1, s["id"], "closes"))
    return sorted(out, key=lambda r: r[0])


def load_faults():
    """Label-audit findings, if a render has written them."""
    f = ROOT / "out" / "label-faults.json"
    if not f.exists():
        return {}
    try:
        return json.loads(f.read_text(encoding="utf-8"))
    except ValueError:
        return {}


def load_joins():
    f = ROOT / "out" / "joins.json"
    if not f.exists():
        return {}
    try:
        return {j["after"]: j for j in json.loads(f.read_text(encoding="utf-8"))}
    except (ValueError, KeyError):
        return {}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--video", default="out/draft.mp4")
    ap.add_argument("--shots", default="")
    ap.add_argument("--subs", action="store_true")
    a = ap.parse_args()

    video = ROOT / a.video
    if not video.exists():
        print(f"no {a.video} — render a draft first")
        return 1
    newest = max(f.stat().st_mtime for f in (ROOT / "src").glob("*.py"))
    stale = video.stat().st_mtime < newest

    plan = json.loads((ROOT / "video-plan.json").read_text(encoding="utf-8"))
    want = {x.strip() for x in a.shots.split(",") if x.strip()}
    rows = beats(plan, want, a.subs)
    faults, joins = load_faults(), load_joins()

    frames = ROOT / "out" / "review-frames"
    frames.mkdir(parents=True, exist_ok=True)
    for old in frames.glob("*.jpg"):
        old.unlink()

    items = []
    for i, (t, sid, what) in enumerate(rows):
        name = f"{i:03d}.jpg"
        r = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{t:.3f}",
                            "-i", str(video), "-frames:v", "1", "-vf", "scale=480:-1",
                            "-q:v", "5", "-y", str(frames / name)])
        if r.returncode:
            continue
        near = [m for (ft, m) in faults.get(sid, []) if abs(ft - (t - 0.3)) < 1.2]
        j = joins.get(sid)
        if j and what == "closes":
            for gone in j.get("disappears", [])[:3]:
                near.append(f"gone at the cut into {j['before']}: {gone}")
        items.append({"id": f"{sid}@{t:.1f}", "t": round(t, 2), "shot": sid,
                      "what": what, "file": name, "faults": near})

    data = {"video": a.video, "dir": "../out/review-frames", "beats": items,
            "stale": stale}
    tpl = (ROOT / "tools" / "review-template.html").read_text(encoding="utf-8")
    html = tpl.replace('"__REVIEW__"', json.dumps(data, ensure_ascii=False,
                                                  separators=(",", ":")))
    (ROOT / "tools" / "review.html").write_text(html, encoding="utf-8")

    print(f"{len(items)} beats -> tools/review.html")
    if stale:
        print(f"  NOTE: {a.video} is older than src/ — these stills are not current")
    if faults:
        print(f"  {sum(len(v) for v in faults.values())} label fault(s) folded in")
    if joins:
        print(f"  {len(joins)} join report(s) folded in")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
