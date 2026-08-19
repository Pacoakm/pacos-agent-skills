"""Where the project is and what is in it — the one place that knows.

Every other tool used to hardcode this lesson: `part_a` for S01-S06, `part_b`
for the rest, one lesson's directory in the paths. None of that is a property of
the toolset, only of one video. This finds the project by walking up for a
`video-plan.json`, and works out which module holds which scene by reading the
source, so the same tools serve any SmartQuest lesson unchanged.
"""
from __future__ import annotations

import functools
import json
import os
import re
import sys
from pathlib import Path

PLAN_NAME = "video-plan.json"


def root(start: Path | str | None = None) -> Path:
    """The project directory: the nearest ancestor holding video-plan.json."""
    env = os.environ.get("SQ_PROJECT")
    here = Path(start or env or Path.cwd()).resolve()
    for d in [here, *here.parents]:
        if (d / PLAN_NAME).exists():
            return d
    # a tool run from inside tools/ still finds its own project
    here = Path(__file__).resolve().parent
    for d in [here, *here.parents]:
        if (d / PLAN_NAME).exists():
            return d
    raise SystemExit(f"no {PLAN_NAME} in {here} or any parent — "
                     "run this from inside a video project, or set SQ_PROJECT")


@functools.lru_cache(maxsize=8)
def plan(r: Path | None = None) -> dict:
    r = Path(r) if r else root()
    return json.loads((r / PLAN_NAME).read_text(encoding="utf-8"))


@functools.lru_cache(maxsize=8)
def scene_modules(r: Path | None = None) -> dict:
    """{scene class name: module stem}, read from src/*.py.

    Beats mapping shot ids to modules by hand, which broke the moment a scene
    was renamed and left `S14Distance.mp4` orphaned in the media folder.
    """
    r = Path(r) if r else root()
    out = {}
    for f in sorted((r / "src").glob("*.py")):
        src = f.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r"^class (\w+)\(", src, re.M):
            out[m.group(1)] = f.stem
    return out


def shots(r: Path | None = None) -> list:
    return plan(r)["shots"]


def quality(name: str, r: Path | None = None) -> tuple:
    """(manim flag, media folder) for 'draft' or 'master'."""
    p = plan(r)
    if name == "master":
        return "-qh", f"{p.get('height', 1080)}p{p.get('fps', 60)}"
    return "-ql", "480p15"


def scene_file(scene: str, qual: str, r: Path | None = None) -> Path:
    r = Path(r) if r else root()
    mod = scene_modules(r).get(scene)
    _, folder = quality(qual, r)
    return r / "media" / "videos" / str(mod) / folder / f"{scene}.mp4"


def modules_for(scenes, r: Path | None = None) -> dict:
    """{module stem: [scene, ...]} preserving plan order."""
    mods, sm = {}, scene_modules(r)
    for s in scenes:
        mods.setdefault(sm.get(s, "?"), []).append(s)
    return mods


def out_dir(r: Path | None = None) -> Path:
    d = (Path(r) if r else root()) / "out"
    d.mkdir(exist_ok=True)
    return d


def skill_scripts() -> Path:
    return Path.home() / ".claude/skills/smartquest-video-production/scripts"


def ensure_path():
    """Put the skill scripts and the project's src on sys.path."""
    r = root()
    for p in (skill_scripts(), r / "src", r / "tools"):
        if str(p) not in sys.path:
            sys.path.insert(0, str(p))
    return r


if __name__ == "__main__":
    r = root()
    p = plan(r)
    print(f"project   {r}")
    print(f"title     {p.get('title')}")
    print(f"format    {p.get('width')}x{p.get('height')} @ {p.get('fps')}fps, "
          f"{p.get('durationSeconds')}s, {len(p['shots'])} shots")
    for mod, sc in modules_for([s["manimScene"] for s in shots(r)], r).items():
        print(f"  {mod:<10} {len(sc)} scenes: {sc[0]} … {sc[-1]}")
