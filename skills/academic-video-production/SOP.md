# Academic video — standard operating procedure

The order of operations for producing one concept video from Paco's lecture notes, for whoever
is doing it: Paco, or an agent running the skill. `SKILL.md` says what an academic video **is**
and holds the hard rules; the `references/` files hold the craft. **This file says what to do,
in what order, and where to stop.** When this file and `SKILL.md` disagree, `SKILL.md` wins.

Read once before your first video: `SKILL.md`, `references/production-contract.md`,
`references/local-toolchain.md`, `references/palmier-assembly.md`. Read the rest when the run
sheet points you at them.

## 0. Who decides what

The single most common failure in this pipeline is an operator deciding something that was not
theirs to decide. These belong to Paco, always:

| Belongs to Paco | Never done on his behalf |
|---|---|
| **Which concepts get animated** | If he has not said, read the notes and *recommend* two to five, one line each on why — then he picks. Never animate a whole lecture by default |
| **Approval at Gates 1, 2 and 3** | No phrasing of the request removes these stops. Silence, a partial comment or your own confidence is not approval |
| **The 3D camera poses he picks by hand** | Use the picked values verbatim. `check_poses.py` may *report* that a pose breaks a geometric guarantee and by how much; `snap_poses.py` only runs when he asks for that run |
| **Starting the master render** | It costs real time. Only on an explicit instruction, only from an approved draft |
| **The export** | It happens in Palmier Pro and only on his word — `export_project` when he says "export" / "出片", or he exports from the app by hand. Approving the timeline is not an instruction to export. Until an exported file has passed `verify_master.py`, the state is `awaiting-export` |
| **A voice or music track** | None by default — the bilingual captions carry the explanation. Only if he asks for one on that video — see `references/sound-and-voice.md` |

Everything else — reading the notes, the design, the code, the checks, the reports — is yours,
and you are expected to do it fully rather than ask. Ask only what is missing (SKILL.md, "Ask
only what is missing"): the notes and slide range, which concepts, dark or light field (recommend
dark), and depth only if the notes are proof-heavy. Never ask for a target duration or what the
exam covers.

## 1. Once per machine

```bash
export SKILL=~/.claude/skills/academic-video-production   # bound once, used throughout this SOP
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
python3 -c "import manim; print(manim.__version__)"       # expect 0.20.1
which latex dvisvgm ffmpeg pdftotext pdftoppm
```

Then run the font and filter checks in `references/local-toolchain.md`, including both caption
fonts. **A missing font does not raise — Pango substitutes silently.** Do not skip this because
the last video rendered fine; it is the machine that changed, not the video.

**Install Palmier Pro — it is mandatory.** Every video is assembled and exported in Palmier;
there is no ffmpeg master route in this skill. Download the macOS app from
`https://palmier.io/docs` (installers are published as GitHub releases on `palmier-io/palmier-pro`,
which is also where the app's own updater points), then **leave it running**: the MCP server is
hosted by the app itself at `http://127.0.0.1:19789/mcp`, so a closed app is a dead server.
Register it as `"palmier-pro": {"type": "http", "url": "http://127.0.0.1:19789/mcp"}` and confirm
with `lsof -nP -iTCP:19789 -sTCP:LISTEN` plus a `manage_project action:"list"` call. Verified
against PalmierPro 0.8.1.

## 2. Once per video — Gate 0, the setup

```bash
P=~/academic-videos/<COURSE>/<nn>-<slug>     # unless Paco names another place
mkdir -p $P
python3 $SKILL/tools/install.py $P
python3 $P/tools/serve.py 8777 <dir above the project>
```

Give Paco the dashboard URL that `install.py` prints, and leave the dashboard open for the whole
build; every gate is shown from it.

Copy from the **most recent video of the same course**, not from a template: `src/theme_boot.py`,
`src/kit.py`, `make_plan.py`, `check_plan.py`, `make_script.py`. The layout helpers inside
`kit.py` are carried over **unchanged**, and so are the course's colour assignments — see
`references/project-scaffold.md`. For a course's first video, start from the most recent video of
any course and carry the helpers, but begin a fresh colour assignment for the new course.

The 3D pose tools are **project-owned, not shipped by the skill** — `install.py` deliberately
leaves them alone so a video's hand-picked poses are never overwritten. For a 3D figure, copy
`check_poses.py`, `pose_guarantees.py` and `snap_poses.py` from the most recent 3D video (the
first time, from the SmartQuest repo's vector-product project,
`~/smartquest/videos/*/13-vector-product/tools/`), with its `camera-poses.json` as a shape
reference — then clear the poses and pick this video's own.

## 3. The run sheet

Statuses in `video-plan.json`, in order: `plan-awaiting-approval` → `storyboard-awaiting-approval`
→ `draft-awaiting-approval` → `awaiting-export` → `delivered`. Never advance past what exists on
disk or what Paco has approved.

### Gate 1 — read the notes, design the concepts, write the captions

1. **Read the lecture notes before anything else** — the whole relevant range, every slide,
   including the ones that look like filler. For a PDF: `pdftotext -layout` for the text and
   `pdftoppm -png` for the pages, so diagrams are seen rather than guessed. For a PPTX: extract
   the text and render the slides to images (export to PDF, then the same two commands). For a
   scanned PDF, read the page images.
2. Write **`notes-map.md`**: the concepts in the lecture's order with slide numbers; every symbol
   and its convention; the definitions and theorem statements verbatim with their hypotheses;
   what the slides skip; anything that looks wrong — flagged, neither silently fixed nor silently
   copied.
3. Write **`brief.md`**, per knowledge point: what Paco should be able to *see* afterwards,
   prerequisites, the wrong or empty model, the aha (an argument, not an illustration), the
   central animation described as motion, the examples by role (**concrete first**, then varied /
   broken / connected as they earn it), the formal statement verbatim and the shot where it lands,
   justifications named as the notes name them, the section tags, the opening, known limitations,
   and the colour assignments for the course series. Record the independent check of every
   formula, value and worked number — against the notes and by computing it. A video designed in
   code is a video that cannot be argued with. `references/lesson-patterns.md` applies, minus its
   exam-ladder patterns.
4. Author `make_plan.py` — **shot and cue durations only**; every timecode is derived. The total
   duration is an output, never a target.
5. `python3 make_plan.py && python3 check_plan.py` — fix until it is clean.
6. `python3 make_script.py` → `captions.md`.
7. `python3 $SKILL/scripts/build_captions.py --plan video-plan.json --out-dir src`

**Exit criteria:** `notes-map.md` covers the whole slide range · `check_plan.py` clean · every
cue ≤ 4.0 字/秒 · every shot ≥ 25% still · shot 1 is a 3–4 s title card reading
`COURSE · Lecture N` · the picture is 100% English in the lecture's own notation · every
knowledge point opens on a concrete case, never on its definition · every example that is a
stated problem carries its statement · no exam ladder, no solution page · every formula checked
and the check recorded in `brief.md`.

**Then stop.** Set the plan status to `plan-awaiting-approval`. In the reply itself present the
concept map, the full per-shot script table with 字數 and both pacing verdicts, the on-screen text
per shot, the notation adopted and the flags from the notes, the timeline with its total
duration, and the open questions; point at `notes-map.md`, `brief.md` and `video-plan.json`, show
`captions.md` and the shot timeline on the dashboard, say what you want checked, and end the turn.

### Gate 2 — storyboard

1. Render one Manim still per shot from the **real scene**
   (`manim -ql -s --format=png -o S01.png src/script.py S01Title`). Never mock a panel by hand.
2. Build the sheets and rebuild the dashboard (`python3 tools/build_dashboard.py`). If the sheets
   are rasterised through headless Chrome, check `sheetHeight` gives a 16:9 cell area — a wrong
   value crops the top off every panel silently.
3. Check per panel: every arc's two arms are visible mobjects; no label sits on a line; the
   question band is under its cap; the section tag is present and unchanged within its section;
   no sentence on a `math` panel and no displayed equation on a `verbal` panel; every string in
   English and in the lecture's notation; each scene's end state equals the next scene's start
   state.
4. For a shot whose whole point is motion — a varied example, a limit closing in — write in the
   panel's note what moves and what stays fixed. A still proves composition, never motion.

**Then stop.** Status `storyboard-awaiting-approval`; show the sheets, and state the shot count,
total duration, which panels carry the ahas, and any composition you are unsure of.

### Gate 3 — silent draft

```bash
python3 tools/render.py draft            # 854x480 @15 -> out/draft.mp4
ffprobe -select_streams s -show_streams out/draft.mp4    # the soft track MUST be there
python3 tools/check_joins.py
```

Judge pacing and motion here, never resolution. Draft frame-rate rounding shows a 0.03 s error
that does not exist at 60 fps — `references/manim-traps.md` #21. Watch it yourself first against
`references/pacing.md`: with no voice, every caption must be readable while the picture is also
being watched, every reveal needs its still beat, and a varied example must vary slowly enough to
see what stays fixed. Fix what you already know is wrong before showing it.

**Then stop.** Status `draft-awaiting-approval`; send `out/draft.mp4`, say the captions are a
soft track that may need turning on (`out/subtitles.srt` beside it), that 854×480 @15 fps means
only motion and pacing are under review, and give the timecodes of the ahas.

**When notes come back:** change `video-plan.json` first (via `make_plan.py`), re-run
`check_plan.py`, re-render **only the affected scenes** (`--scenes S07,S09`), re-stitch, and show
it again. Loop until he approves. Never describe what a change would look like instead of
rendering it.

### Gate 4 — picture master, assembled in Palmier Pro

Only after an explicit instruction to render the master, and only from an approved draft.

1. **Confirm Palmier Pro answers** — `manage_project action:"list"`. **If it does not, stop and
   ask Paco to open Palmier Pro.** There is no ffmpeg fallback: the export has to come out of
   Palmier. You may render the scenes while waiting; you may not assemble anywhere else.
   (`tools/render.py master` is the inherited concat-and-burn route and is not used in this skill.)
2. **Render the scenes:**

   ```bash
   export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"   # if TinyTeX is used
   manim -r 1920,1080 --fps 60 src/script.py <every scene>
   ```

   About 39 frames/second at 1080p60 on an M-series Mac. **Never edit `src/` while this runs** —
   Manim imported the modules at start, so anything you change is silently not in the output.
   Do not concat and do not render `captions.py`. If the video has a 3D figure, run the extra
   gates in `references/3d-geometry.md` first.
3. **Assemble** per `references/palmier-assembly.md`: create the project at **60 fps**, 16:9,
   1080p before any clip is placed; import each scene file individually; place clips
   back-to-back from each file's `nb_frames` in one `add_clips` call; split the bilingual `.srt`
   into `subtitles-zh.srt` and `subtitles-en.srt` and place both as caption tracks styled from the
   theme (`CAPTION_INK` inverts with the theme); add **one chapter marker per knowledge point**
   with `manage_markers`, named with its section tag.
4. **Verify on the composite** with `inspect_timeline` — an early cue, the longest 中文 and
   English cues, the last cue, and one frame per chapter marker. A tool reply that says the clips
   exist does not say they are visible.
5. Record `assembly.route: "palmier"` and the project path in `video-plan.json`, set
   `status: "awaiting-export"`.

**Then stop.** Tell Paco the project path, the track layout, the chapter list with timecodes,
the total duration and frame count, and the frames you inspected.

**Never add a transition unasked.** A cross dissolve re-times everything after it and desyncs the
captions; if asked, show both costs and let him choose. **Changes:** a re-rendered shot is a
`swap_clip_media` on that clip (check `nb_frames` first — if it changed, re-derive every start
after it); a cue change goes through `video-plan.json` and `build_captions.py`, then the caption
group is replaced; caption colour or size is `update_text`.

### Gate 5 — export from Palmier and verify

1. **Export only on Paco's word.** When he says export, call `export_project` with
   `mode: "video"`, `codec: "H.264"`, `resolution: "1080p"`, `outputPath: "<project>/out/final.mp4"`,
   and poll `manage_exports list` until it finishes. If he says he will export by hand, wait for
   the path.
2. **Final gate**, from the project root, against the exported file (not the timeline):

   ```bash
   python3 $SKILL/scripts/verify_master.py --plan video-plan.json --master out/final.mp4 \
     --scene-dir media/videos/script/1080p60
   ```

   Leave out `--require-audio` — these videos are silent — and add it only when a voice or music
   track was asked for. A manual export at 30 fps is the classic defect this catches.
3. Confirm by eye: every aha lands, no text is clipped, no label collides with a figure, colour
   meanings never changed, both caption tracks are visible, and the section tag changes only at
   chapter boundaries.
4. Write `RENDER-REPORT.md`: deliverables, which file is the one to watch, the measured numbers
   with the verifier's own thresholds, how the formulas and geometry were independently checked,
   any bug found.
5. Set `status: "delivered"` only after the exported file has passed. Name any copy of the
   delivered file by course, lecture and concept, not by project number.

## 4. Reporting — the rule that costs the most when broken

**Measure against the tool's own threshold, and quote the number.**

On one SmartQuest lesson a continuity check was reported as "17 of 17 cuts continuous" using a
luma threshold of 3.0 chosen by the operator. `verify_master.py` uses **0.5** — six times
stricter. Ten cuts were actually dropping content, and it surfaced only at the final gate, after
the 1080p60 master, the caption track and the composite had all been built.

So, every time:

- Before reporting a check, grep the verifier for the constant it uses and quote **that** number.
- If no verifier exists for the thing you measured, say which threshold you chose and that it is
  yours.
- Report what you actually ran. "Verified" without a number is not a report.
- If something was not checked, say so.

## 5. Stop conditions

Stop at the last verified artifact and say exactly what is needed when:

- a decision, asset or fact from the notes is missing — never invent a formula, a definition or a
  theorem statement; where the notes look wrong or a standard reference differs, follow the notes
  on screen and flag it in `brief.md`;
- a plugin's output cannot be verified against the notes (`manim-chemistry` renders `Ca(OH)₂` as
  **CaO**, with no error);
- ManimCE genuinely cannot produce a shot — name the shot, say why, and wait for a yes before
  touching ManimGL;
- Palmier Pro's MCP server does not answer at Gate 4 — ask Paco to open the app;
- a check fails and the fix would change something Paco already approved.

## 6. Handover checklist

A video is ready to hand over when all of these are true:

- [ ] `notes-map.md` records the notation and every flag raised against the notes
- [ ] `brief.md` records the colour assignment for the course series and the camera decisions,
      not just the teaching
- [ ] `video-plan.json` is generated by `make_plan.py` and `check_plan.py` is clean
- [ ] `captions.md` regenerates from the plan without hand edits
- [ ] `src/kit.py` names the pens and builds the question band from the plan
- [ ] every scene's end state equals the next scene's start state
- [ ] `video-plan.json` records `assembly.route: "palmier"`, the project path, and a status that
      reflects whether an exported file exists and has passed
- [ ] the Palmier project has one chapter marker per knowledge point
- [ ] `RENDER-REPORT.md` exists, with measured numbers
- [ ] anything a new trap taught is written into `references/manim-traps.md`, not only into the
      report — the next video is built by someone who will not read your report
