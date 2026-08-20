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

A **button per shot** above the player switches it to that scene's own mp4, so a
picture note is checked against the shot rather than by scrubbing the whole
film. A shot older than `src/` is dotted, and **Re-render this scene** beside the
player rebuilds just it — seconds instead of tens of minutes. The scene name is
checked against the plan before it reaches a command line, so only a class this
lesson declares can be rendered. A mark made on a clip converts to plan time, so
the prompt reads the same whichever you were watching.

**Marking a fault** is the point of that player. Reporting one used to be three
chores — screenshot the frame, read the timecode off the scrubber, write a
prompt naming the shot — and that friction is why faults got batched up and
described from memory.

| | |
|---|---|
| **Mark this frame** (`m`) | marks the instant and pauses |
| **Mark range** (`M`) | first press sets the start, second the end |
| **Copy frame** | that frame to the clipboard as PNG. Single marks only — a range does not need one |
| **Copy prompt** | one line: timecode, shot, note |
| **Copy all prompts** | the whole list, ready to paste |

```
08:54        S14 (S14PartA)     AB x AC label appears a beat early
09:34-09:40  S15 (S15LinePlane) AV pops in at the cut
```

The shot is looked up from the plan's timeline, so nobody has to remember which
second belongs to which scene. Marks live in `tools/draft-marks.json` under the
same ETag guard as the poses, and are **read back on load** — writing them and
forgetting to read them is a bug that looks exactly like not saving at all. The
frame is grabbed by drawing the `<video>` to a canvas, so the page seeks there
first and returns to where you were; if the clipboard refuses the image it falls
back to downloading a PNG.

**Draft render / Master render** — two separate cards, each with Start, Stop and
a live log tail. Renders run detached: closing the browser does not stop them.

Progress is **asked of the server** (`POST /progress/<quality>`), which scans the
mp4 files each time. It is not read from a cached file: the first version was,
and that file only existed when somebody had run the tool by hand, so a render
started from a terminal showed nothing at all — and the master card, which had
no refresh button, showed nothing ever. The files themselves are the only honest
signal anyway, because manim prints nothing until a scene finishes and a piped
run buffers until it ends.

Each quality keeps its **own** start marker, `out/.render-start-<quality>`. They
shared one at first, so starting a master reset what the draft card measured
from and eighteen finished draft scenes read as zero. With no marker of its own,
every file that exists counts as done — never borrow the other quality's.

**Camera poses / Cuts / Labels** — the checks, with a Run button each. The label
and cut data are written by the render itself, so they are current without
anyone remembering to run anything.

## The checks, and what each one exists because of

| Check | Catches | Written by |
|---|---|---|
| Camera poses | a label off frame, under the panel column or in the caption band; a solved camera that no longer satisfies its guarantee | `check_poses.py` + the lesson's `pose_guarantees.py` |
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

Renders run in parallel — `min(4, cores/2)` workers by default, `--jobs N` to
choose, `--jobs 1` to debug. Scenes are dealt longest-first, because a lesson's
shots run from 16 s to 84 s and the long one must not be last in line.

**Each worker gets its own Tex and text cache**, written as a `--config_file`
override. Manim caches both by content hash, so two workers needing the same
uncached string race on one filename — one deletes an intermediate the other is
reading, and that worker dies mid-render. Warming the cache first (a `-s` pass,
which runs every `construct` without writing frames) helps and does not close
it; separate caches do. The warm pass is kept anyway, so four workers do not
each compile the same LaTeX. Anything a worker still fails to produce gets one
serial retry.

Six 2D scenes: 12 s on four workers. At 1080p60 the win is smaller — the
bottleneck moves from CPU to writing 1920x1080 partial movie files.

`render.py` writes `out/jobs/<quality>.pid` and clears it on exit, so a render
started from a terminal and one started from the dashboard both report honestly.
A pid file left behind by a dead job read as "running" — and a recycled pid
reads as running while being something else entirely.

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

Generic tools live in the skill and are copied in by `install.py`. Almost
everything is generic, **including both HTML apps** — the camera picker is
driven entirely by `scene3d.json`, so the page itself knows nothing about any
lesson.

What stays with the lesson, and is never overwritten:

| File | Why it cannot be generic |
|---|---|
| `camera-poses.json` | the user's hand-picked cameras |
| `extract_3d.py` | which figure each 3D shot draws. Seeded from `extract_3d.template.py` on first install, yours after that. Rewrite `FIGURES` (and `SWEEPS` / `NUDGE` if a figure moves during a shot) by calling the scene module's own helpers, so the picker cannot drift from the render. |
| `pose_guarantees.py` | the geometric promises this lesson's solved cameras carry — a true-size angle, an edge-on plane. `check_poses.py` measures framing for any project and runs whatever it finds here; a lesson with no solved cameras needs no such file. |
| `snap_poses.py` | solving a pose back onto its constraint. Run only when the user asks. |

## The server

`serve.py` is `http.server` plus four things it needs:

* **PUT** for `camera-poses.json`, `review-notes.json` and `draft-marks.json`,
  with an ETag/If-Match check so two open tabs cannot silently overwrite each
  other — they did. Adding a name to that whitelist needs the server restarted:
  it is read once at import, and until then the page saves nothing and says so.
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
