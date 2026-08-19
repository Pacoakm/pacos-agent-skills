"""Put the browser tools into a video project (and keep them up to date).

    python3 ~/.claude/skills/smartquest-video-production/tools/install.py [project]
    python3 .../install.py --update          # refresh an existing install

Copies the generic tools into `<project>/tools/`, leaves anything the project
owns alone, builds the dashboard data, and prints the URL to open. Run it at
the START of Gate 1 — the dashboard is where every gate is shown from then on.

What is generic and gets copied:
    project.py            finds the project, maps scenes to modules
    render.py             draft / master renders, stitching, subtitles
    serve.py              static server + save-back + run + long jobs
    render_progress.py    live progress from the mp4 files themselves
    concat_draft.py       stitch without re-rendering
    build_dashboard.py    gathers gates 1-3 into out/dashboard-data.json
    build_review.py       beat contact sheet -> tools/review.html
    check_joins.py        what changes at every cut
    dashboard.html        the page every gate is reviewed from
    review-template.html  the beat review page

    picker-template.html  the camera picker
    check_poses.py        framing for every pose

What stays with the lesson (never overwritten):
    camera-poses.json     the hand-picked cameras — the user's work
    review-notes.json     review notes
    extract_3d.py         which figure each 3D shot draws (seeded from a
                          template on first install, yours after that)
    pose_guarantees.py    the geometric promises THIS lesson's solved cameras
                          carry — true-size angle, edge-on plane
    snap_poses.py         solving a pose back onto its constraint
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
GENERIC = ["project.py", "render.py", "serve.py", "render_progress.py",
           "concat_draft.py", "build_dashboard.py", "build_review.py",
           "check_joins.py", "check_poses.py", "beats.py",
           "dashboard.html", "review-template.html", "picker-template.html"]
# dropped in once, then the lesson's own — never overwritten
SEEDS = {"extract_3d.py": "extract_3d.template.py"}
KEEP = {"camera-poses.json", "review-notes.json", "extract_3d.py",
        "pose_guarantees.py", "snap_poses.py"}


def find_project(arg):
    start = Path(arg).resolve() if arg else Path.cwd()
    for d in [start, *start.parents]:
        if (d / "video-plan.json").exists():
            return d
    raise SystemExit(f"no video-plan.json in {start} or any parent")


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    project = find_project(args[0] if args else None)
    tools = project / "tools"
    tools.mkdir(exist_ok=True)

    copied, kept = [], []
    for name in GENERIC:
        dest = tools / name
        if dest.exists() and dest.read_bytes() == (HERE / name).read_bytes():
            continue
        shutil.copy2(HERE / name, dest)
        copied.append(name)
    seeded = []
    for name, template in SEEDS.items():
        if not (tools / name).exists() and (HERE / template).exists():
            shutil.copy2(HERE / template, tools / name)
            seeded.append(name)
    for name in sorted(KEEP):
        if (tools / name).exists():
            kept.append(name)

    print(f"project  {project}")
    print(f"copied   {len(copied)} tool(s)" + (": " + ", ".join(copied) if copied else ""))
    if seeded:
        print(f"seeded   {', '.join(seeded)} — edit it to describe this lesson's figures")
    if kept:
        print(f"kept     {', '.join(kept)}")

    r = subprocess.run([sys.executable, str(tools / "build_dashboard.py")],
                       cwd=str(project), capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr.strip())

    # the server has to sit above the project so relative paths line up
    root = project.parents[2] if len(project.parents) > 2 else project
    rel = project.relative_to(root)
    print(f"\nserve it:\n  python3 {tools / 'serve.py'} 8777 {root}")
    print(f"\nthen open:\n  http://127.0.0.1:8777/{rel}/tools/dashboard.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
