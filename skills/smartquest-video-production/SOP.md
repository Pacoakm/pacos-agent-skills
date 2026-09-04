# SmartQuest video — standard operating procedure

The order of operations for producing one lesson, for whoever is doing it: a person, or an agent
running the skill. `SKILL.md` says what a SmartQuest lesson **is** and holds the hard rules; the
`references/` files hold the craft. **This file says what to do, in what order, and where to
stop.** When this file and `SKILL.md` disagree, `SKILL.md` wins.

Read once before your first lesson: `SKILL.md`, `references/production-contract.md`,
`references/local-toolchain.md`. Read the rest when the run sheet points you at them.

## 0. Who decides what

The single most common failure in this pipeline is an operator deciding something that was not
theirs to decide. Five things belong to the user, always:

| Belongs to the user | Never done on their behalf |
|---|---|
| **Approval at Gates 1, 2 and 3** | No phrasing of the request removes these stops. Silence is not approval |
| **The 3D camera poses they pick by hand** | Use the picked values verbatim. `check_poses.py` may *report* that a pose breaks a geometric guarantee and by how much; `snap_poses.py` only runs when they ask for that run |
| **Starting the master render** | It costs hours. Only on an explicit instruction, only from an approved draft |
| **The export, on the Palmier route** | You assemble a timeline; they encode. Until then the state is `awaiting-user-export` |
| **The narration** | A person records it. There is no synthetic fallback — see `references/sound-and-voice.md` |

Everything else — the design, the code, the checks, the reports — is yours, and you are expected
to do it fully rather than ask.

## 1. Once per machine

```bash
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
python3 -c "import manim; print(manim.__version__)"        # expect 0.20.1
which latex dvisvgm ffmpeg
```

Then run the font and filter checks in `references/local-toolchain.md`. **A missing font does not
raise — Pango substitutes silently.** Do not skip this because the last lesson rendered fine; it
is the machine that changed, not the lesson.

## 2. Once per lesson — Gate 0, the setup

```bash
mkdir -p videos/<subject>/<nn>-<topic>
python3 ~/.claude/skills/smartquest-video-production/tools/install.py videos/<subject>/<nn>-<topic>
python3 videos/<subject>/<nn>-<topic>/tools/serve.py 8777 <dir above videos/>
```

Copy from the **most recent lesson of the same subject**, not from a template:
`src/theme_boot.py`, `src/kit.py`, `make_plan.py`, `check_plan.py`, `make_script.py`. The layout
helpers inside `kit.py` are carried over **unchanged** — see `references/project-scaffold.md`.
Then open the dashboard and leave it open for the whole build; every gate is shown from it.

The 3D pose tools are **project-owned, not shipped by the skill** — `install.py` deliberately
leaves them alone so a lesson's hand-picked poses are never overwritten. For a solid-geometry
lesson, copy `check_poses.py`, `pose_guarantees.py` and `snap_poses.py` from the most recent 3D
lesson (`videos/dse-math/13-vector-product/tools/`) along with that lesson's `camera-poses.json`
as a shape reference — then clear the poses and pick this lesson's own.

## 3. The run sheet

### Gate 1 — design, script, subtitles

1. Write `brief.md` first: objective, the misconception, the aha, the DSE reasons in the marker's
   wording, the colour assignment, the fact check. A lesson designed in code is a lesson that
   cannot be argued with.
2. Author `make_plan.py` — **shot and cue durations only**; every timecode is derived.
3. `python3 make_plan.py && python3 check_plan.py` — fix until it is clean.
4. `python3 make_script.py` → `講稿.md`.
5. `python3 ~/.claude/skills/.../scripts/build_captions.py --plan video-plan.json --out-dir src`

**Exit criteria:** `check_plan.py` clean · every cue ≤ 4.0 字/秒 · every shot ≥ 25% still · shot 1
is a 3–4 s title card · the picture is 100% English · every example carries its question.

**Then stop.** Set the plan status to `plan-awaiting-approval`, show `講稿.md` and the shot
timeline on the dashboard, say what you want checked, and end the turn.

### Gate 2 — storyboard

1. Render one Manim still per shot from the **real scene**. Never mock a panel by hand.
2. Build the sheets. If they are rasterised through headless Chrome, check `sheetHeight` gives a
   16:9 cell area — a wrong value crops the top off every panel silently.
3. Check per panel: every arc's two arms are visible mobjects; no label sits on a line; the
   question band is under its cap; the section tag is present and unchanged within its section;
   each scene's end state equals the next scene's start state.

**Then stop.** Status `storyboard-awaiting-approval`; show the sheets.

### Gate 3 — silent draft

```bash
python3 tools/render.py draft            # 854x480 @15 -> out/draft.mp4
ffprobe -select_streams s -show_streams out/draft.mp4    # the soft track MUST be there
python3 tools/check_joins.py
```

Judge pacing and motion here, never resolution. Draft frame-rate rounding shows a 0.03 s error
that does not exist at 60 fps — `references/manim-traps.md` #21.

**Then stop.** Status `draft-awaiting-approval`; send `out/draft.mp4` and say the caption track
may need turning on.

**When notes come back:** change `video-plan.json` first (via `make_plan.py`), re-run
`check_plan.py`, re-render **only the affected scenes** (`--scenes S07,S09`), re-stitch, and show
it again. Loop until they approve. Never describe what a change would look like instead of
rendering it.

### Gate 4 — picture master and caption track

Only after an explicit instruction to render the master.

```bash
python3 tools/render.py master           # 1920x1080 @60
```

**Never edit `src/` while this runs** — Manim imported the modules at start, so anything you
change is silently not in the output. Take the Palmier route instead when its MCP server answers
(`references/palmier-assembly.md`); there, you build the timeline and **the user exports**.

### Gate 5 — narration, mux, delivery

1. Generate `narration-sheet.md` and hand it over with the guide track. The teacher speaks the
   **中文 line with the subject terms said in English**.
2. When `audio/narration.wav` comes back, mux it. Not before, and never claim audio exists until
   the file does.
3. Sound effects are optional, asked for, laid on the assembled timeline, and never baked into a
   scene — `references/sound-and-voice.md`.
4. Final gate:

```bash
python3 ~/.claude/skills/.../scripts/verify_master.py \
  --plan video-plan.json --master out/final.mp4 --require-audio
```

5. Write `RENDER-REPORT.md`: deliverables, which file is the one to watch, the measured numbers,
   how the geometry was independently checked, any bug found.
6. Copy the master to the delivery folder, named by **syllabus topic**, not project number.

## 4. Reporting — the rule that costs the most when broken

**Measure against the tool's own threshold, and quote the number.**

On one lesson a continuity check was reported as "17 of 17 cuts continuous" using a luma
threshold of 3.0 chosen by the operator. `verify_master.py` uses **0.5** — six times stricter.
Ten cuts were actually dropping content, and it surfaced only at the final gate, after the 1080p60
master, the caption track and the composite had all been built.

So, every time:

- Before reporting a check, grep the verifier for the constant it uses and quote **that** number.
- If no verifier exists for the thing you measured, say which threshold you chose and that it is
  yours.
- Report what you actually ran. "Verified" without a number is not a report.
- If something was not checked, say so.

## 5. Stop conditions

Stop at the last verified artifact and say exactly what is needed when:

- a decision, asset or syllabus fact is missing — never invent a DSE reason or a formula;
- a plugin's output cannot be verified against the syllabus (`manim-chemistry` renders
  `Ca(OH)₂` as **CaO**, with no error);
- ManimCE genuinely cannot produce a shot — name the shot, say why, and wait for a yes before
  touching ManimGL;
- a check fails and the fix would change something the user already approved.

## 6. Handover checklist

A lesson is ready to hand to someone else when all of these are true:

- [ ] `brief.md` records the colour assignment and the camera decisions, not just the teaching
- [ ] `video-plan.json` is generated by `make_plan.py` and `check_plan.py` is clean
- [ ] `講稿.md` regenerates from the plan without hand edits
- [ ] `src/kit.py` names the pens and builds the question band from the plan
- [ ] every scene's end state equals the next scene's start state
- [ ] `RENDER-REPORT.md` exists, with measured numbers
- [ ] anything a new trap taught is written into `references/manim-traps.md`, not only into the
      report — the next lesson is built by someone who will not read your report
