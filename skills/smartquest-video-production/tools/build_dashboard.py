"""Gather everything the dashboard shows into out/dashboard-data.json.

The gates are approval stops, and an approval given on a description is worth
nothing — so each gate's actual artifact has to be visible in the browser:

  Gate 1  the brief, the script and the shot timeline, as written
  Gate 2  the storyboard panels themselves, not a rebuilt PNG sheet
  Gate 3  the draft with its subtitle track, playable

This reads them out of the project and writes one file the page fetches. It also
converts the SRT sidecar to WebVTT, because a browser <track> will not take SRT.

    python3 tools/build_dashboard.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import project as P                                            # noqa: E402

# Files a lesson may keep its writing in, best first. Nothing is required.
BRIEFS = ["brief.md"]
SCRIPTS = ["講稿.md", "narration-sheet.md", "script.md", "narration.md"]


def first(root, names):
    for n in names:
        f = root / n
        if f.exists():
            return {"name": n, "text": f.read_text(encoding="utf-8")}
    return None


def srt_to_vtt(srt: Path, vtt: Path):
    """A <track> needs WebVTT; the pipeline produces SRT."""
    body = srt.read_text(encoding="utf-8")
    body = re.sub(r"(\d\d:\d\d:\d\d),(\d\d\d)", r"\1.\2", body)
    body = re.sub(r"^\d+\s*$\n", "", body, flags=re.M)
    vtt.write_text("WEBVTT\n\n" + body.strip() + "\n", encoding="utf-8")


def storyboard(root):
    """The panels rendered at Gate 2, matched to their shot."""
    out = []
    frames = root / "storyboard" / "frames"
    for s in P.shots(root):
        f = s.get("storyboardFrame")
        cand = (root / f) if f else (frames / f"{s['id']}.png")
        if cand.exists():
            out.append({"id": s["id"], "scene": s["manimScene"],
                        "start": s["start"], "end": s["end"],
                        "src": "../" + str(cand.relative_to(root)),
                        "visual": s.get("visual", ""), "motion": s.get("motion", ""),
                        "transitionIn": s.get("transitionIn", ""),
                        "subtitles": s.get("subtitles", [])})
    return out


def timeline(root):
    """Each shot, plus its own rendered mp4 if there is one.

    A picture fix usually touches one shot. Watching that shot's file is
    seconds; re-rendering the whole draft to see it is minutes. So the page
    offers the scene directly, and says when it was last rendered so a stale one
    is obvious.
    """
    newest = max(f.stat().st_mtime for f in (root / "src").glob("*.py"))
    out = []
    for s in P.shots(root):
        f = P.scene_file(s["manimScene"], "draft", root)
        rec = {"id": s["id"], "scene": s["manimScene"], "start": s["start"],
               "end": s["end"], "purpose": s.get("purpose", ""),
               "knowledgePoint": s.get("knowledgePoint", ""),
               "register": s.get("register", ""), "ponder": s.get("ponder"),
               "cues": len(s.get("subtitles") or []), "clip": None, "stale": None}
        if f.exists():
            rec["clip"] = "../" + str(f.relative_to(root))
            rec["stale"] = f.stat().st_mtime < newest
            rec["rendered"] = int(f.stat().st_mtime)
        out.append(rec)
    return out


def main() -> int:
    root = P.root()
    plan = P.plan(root)
    out = P.out_dir(root)

    subs = root / (plan.get("captions", {}).get("sidecar") or "out/subtitles.srt")
    vtt = None
    if subs.exists():
        srt_to_vtt(subs, out / "subtitles.vtt")
        vtt = "../out/subtitles.vtt"

    data = {
        "title": plan.get("title"), "subject": plan.get("subject"),
        "topic": plan.get("topic"), "status": plan.get("status"),
        "format": {"w": plan.get("width"), "h": plan.get("height"),
                   "fps": plan.get("fps"), "seconds": plan.get("durationSeconds"),
                   "aspect": plan.get("aspect")},
        "learningObjective": plan.get("learningObjective"),
        "misconception": plan.get("misconception"),
        "ahaShotId": plan.get("ahaShotId"),
        "dseReasons": plan.get("dseReasons"),
        "brief": first(root, BRIEFS), "script": first(root, SCRIPTS),
        "timeline": timeline(root), "storyboard": storyboard(root),
        "vtt": vtt,
        "draft": "../out/draft.mp4" if (out / "draft.mp4").exists() else None,
        # Gate 5's names: picture.mp4 is the silent cut, picture-subbed.mp4 has
        # the caption track burned on and is what narration is muxed onto
        "picture": "../out/picture.mp4" if (out / "picture.mp4").exists() else None,
        "master": ("../out/picture-subbed.mp4"
                   if (out / "picture-subbed.mp4").exists() else None),
    }
    (out / "dashboard-data.json").write_text(
        json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"dashboard data for {data['title']}")
    print(f"  brief      {data['brief']['name'] if data['brief'] else '—'}")
    print(f"  script     {data['script']['name'] if data['script'] else '—'}")
    print(f"  timeline   {len(data['timeline'])} shots")
    print(f"  storyboard {len(data['storyboard'])} panels")
    print(f"  subtitles  {'WebVTT ready' if vtt else '— no sidecar'}")
    print(f"  draft      {'yes' if data['draft'] else 'not rendered'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
