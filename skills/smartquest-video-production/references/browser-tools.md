# The browser tools

Every gate is an approval stop, and an approval given on a description is worth
nothing. These put the *actual artifact* in front of the user — the script as
written, the storyboard panels themselves, the draft with its subtitles, the 3D
camera you can drag — and put the measurements next to them.

Install at the **start of Gate 1**, before writing any scene code:

```bash
python3 ~/.claude/skills/smartquest-video-production/tools/install.py <project>
python3 <project>/tools/serve.py 8777 <the dir above videos/>
```

Then open the dashboard and keep it open for the whole build. Every gate is
shown from it.

```
http://127.0.0.1:8777/<path>/<project>/tools/dashboard.html
```

## The three pages

| Page | What it is for |
|---|---|
| `dashboard.html` | Gates 1–3, both renders, and every check. The home page. |
| `camera-picker.html` | Pick 3D camera angles by hand. 3D lessons only. |
| `review.html` | One still per beat, click to seek, annotate, export a punch list. |

## dashboard.html

**Gate 1** — tabs over the plan summary, `brief.md`, the narration script and the
shot timeline. The aha shot is highlighted. This is what the user reads before
approving the teaching.

**Gate 2** — the storyboard panels, from `storyboard/frames/`, each with its
visual and time range; click one for full size. Do not build PNG contact sheets
for the user any more — the panels are here.

**Gate 3** — the draft plays in the page with its **soft** subtitle track (the
builder converts the SRT sidecar to WebVTT, because a `<track>` will not take
SRT). Toggle the captions in the player.

**Draft render / Master render** — two separate cards, each with Start, Stop and
a live log tail. Renders run detached: closing the browser does not stop them.
The draft card shows a progress bar built from the mp4 files themselves, because
manim prints nothing until a scene finishes and a piped run buffers until it
ends.

**Camera poses / Cuts / Labels** — the checks, with a Run button each. The label
and cut data are written by the render itself, so they are current without
anyone remembering to run anything.

## The checks, and what each one exists because of

| Check | Catches | Written by |
|---|---|---|
| Camera poses | a label off frame, under the panel column or in the caption band; a solved camera that no longer satisfies its guarantee | `check_poses.py` (per lesson) |
| Cuts | camera or figure mismatch at a join, and anything that appears or vanishes in one frame | `check_joins.py` |
| Labels | a label far from the thing it names, a label on screen before that thing exists, two labels overlapping | the render, every beat |

**Do not diff pixels at a cut.** It was tried and it was wrong twice — once
calling a seamless join a jump because the incoming shot had one more vector on
screen, once calling a real jump seamless. Compare the camera and the stage
inventory instead; both are things the renderer knows and pixels do not.

## Rendering

```bash
python3 tools/render.py draft                 # 480p15 + soft subs -> out/draft.mp4
python3 tools/render.py master                # 1080p60 + burned captions -> out/master.mp4
python3 tools/render.py draft --scenes S07,S09
```

Only scenes older than `src/` are rendered; the rest are stitched as they are.
So a two-scene fix costs two scenes, not eighteen. `--all` forces everything.

The stitch checks the total against `durationSeconds` and says so if it is off —
a scene that renders one frame long is invisible until the whole thing is 0.2 s
out of step with the plan.

**Do not edit `src/` while a render runs.** Manim imports the modules once at
start, so the run finishes with the code it began with, and every scene it
produced is then older than the source. Three separate renders were thrown away
this way in one session.

## Working for any lesson

`project.py` is the only file that knows where anything is. It finds the project
by walking up for `video-plan.json`, and works out which module holds which scene
by **reading the class definitions in `src/*.py`** — never by mapping shot ids to
file names, which silently rots the moment a scene is renamed.

Generic tools live in the skill and are copied in by `install.py`. Three things
stay with the lesson because they encode its content, and `install.py` never
overwrites them:

* `camera-poses.json` — the user's hand-picked cameras
* `extract_3d.py` — which figure each 3D shot draws
* `check_poses.py` — the geometric guarantees this lesson leans on

## The server

`serve.py` is `http.server` plus four things it needs:

* **PUT** for `camera-poses.json` and `review-notes.json`, with an ETag/If-Match
  check so two open tabs cannot silently overwrite each other — they did.
* **Range** requests, so the draft player can seek. Plain `http.server` answers a
  range request with the whole file and `currentTime` never moves.
* **`POST /run/<check>`** and **`POST /start|stop|job/<job>`**, each a fixed argv
  vector from a whitelist. Nothing from the request reaches a shell.
* Threading, because a video connection stays open and a single-threaded server
  then blocks every other request, including the next seek.

It is bound to localhost.

## Camera picker — see `references/3d-geometry.md`

Hand-picked camera angles are **the user's**. Tools may measure them and report
that a pose breaks a geometric guarantee; nothing may change them without being
asked. See `3d-geometry.md` for the workflow and for what the picker does and
does not model (its projection is exact; its depth sorting is not).
