---
name: academic-video-production
description: Produce Paco's personal academic concept videos — 3Blue1Brown-style Manim animations that visualise the lecture notes of the CUHK courses he is taking, so a hard concept is understood by watching it move instead of by reading PPT slides. Built from his lecture notes (PDF/PPT), the picture entirely in the lecture's English and notation, bilingual captions (繁體中文書面語 above, English below) carrying the explanation, the same locked colour theme as SmartQuest, no duration limit, and always assembled and exported in Palmier Pro. Use for "academic video", "lecture video", "visualise this lecture / concept / slide", "make a video of <course> lecture N", CUHK course concepts, or turning lecture notes into an animated explainer. Not for SmartQuest, not for DSE, not for exam preparation — use smartquest-video-production for those.
---

# Academic Video Production

Concept videos for **one viewer — Paco, a CUHK student** — made from his own lecture notes,
animated in Manim, assembled and exported in Palmier Pro.

## What we are making

**3Blue1Brown for the course I am taking this term.**

A lecture PPT hands over the concept as finished statements: a definition, a theorem, a
formula, a diagram that never moves. Sometimes that is enough. When it is not — the concept is
abstract, the slide skips the mechanism, or I simply do not want to read forty slides — this
skill turns the notes into a video where the concept is **built in front of me, varied, and
broken**, so the understanding comes from watching rather than from re-reading.

That sets the bar:

- **The reference point is 3Blue1Brown.** Not a narrated slide deck, not a lecture recording,
  not a summary sheet with transitions. If a shot could have been a static slide, it has failed.
- **Understanding, not exam preparation.** The video exists so the concept makes sense. It does
  not guess what the final will ask, does not drill question types, does not rehearse marking
  schemes. I do not revise from videos; I revise from the notes and past papers, afterwards.
- **Animation carries the teaching.** Every knowledge point has a picture that moves, and the
  movement *is* the argument — a quantity that stays fixed while everything else varies, a
  construction that assembles the formula, a limit that visibly closes in.
- **Examples serve the concept.** There are still examples, and plenty of them, but each one is
  chosen because it makes the idea visible — the smallest concrete case, a case that varies, a
  case that breaks — never because it resembles an exam question.
- **Length follows the concept.** There is no target duration and no cap. A simple idea gets
  four minutes; a hard one gets twenty-five. Cutting an explanation short to hit a number is the
  one false economy this skill forbids.
- **Faithful to the lecture.** The video uses the lecture's definitions, notation, symbols and
  variable names, so that after watching I can open the notes and read them fluently. Where the
  notes are wrong, ambiguous or skip a step, the brief says so; the video never silently
  substitutes a different convention.

### What carries over from SmartQuest, and what does not

This skill was forked from `smartquest-video-production`. The craft is the same; the purpose is
not.

| | SmartQuest | Academic |
|---|---|---|
| Viewer | HKDSE band 2–3 students | Paco, a CUHK undergraduate, watching alone |
| Source of truth | DSE syllabus and marking scheme | **The lecture notes** (PDF / PPT) of the course |
| Goal | pass the paper, earn the marks | understand the concept |
| Examples | a climbing ladder ending at exam level, full-solution page | **concept examples**: concrete → varied → broken → connected. No exam ladder |
| Justification under a step | the DSE reason a marker wants | the theorem, lemma or definition the lecture uses — named as the notes name it |
| Opening | title card with `subject · paper · code` | title card with `COURSE · Lecture N` |
| Duration | 5 min or longer, planned to a number | **none** — as long as the concept needs |
| Narration | human teacher records to picture at Gate 5 | **no voice by default** — the bilingual captions carry the explanation |
| Assembly | Palmier Pro *if* its MCP answers, else ffmpeg | **Palmier Pro, always.** Export happens in Palmier |
| Formats | 16:9 long form and 9:16 shorts | 16:9 only |
| Colours, fonts, motion grammar | the SmartQuest theme | **identical** — dark or light field, same palette, Computer Modern, same caption faces |

### It has to work across disciplines

The rules are written in the language of a geometry figure, but the courses are not all maths.
Translating them is part of designing the video.

| Discipline | The "figure" is | A colour names | The mathematical register carries |
|---|---|---|---|
| **Maths / Stats** | the graph, the space, the distribution | a vector, a set, a region, a parameter | the definition, the derivation |
| **Physics / Engineering** | the field, the circuit, the free-body diagram, the phasor | a force, a component, a signal | the governing equation |
| **Computer Science** | the data structure's state, the memory, the automaton, the call tree | a pointer, a node, an invariant, a partition | the recurrence, the complexity bound, the pseudo-code |
| **Economics / Finance** | the curves, the surplus areas, the payoff diagram | an agent, a curve, a shift | the optimisation, the equilibrium condition |
| **Life / Chem sciences** | the structure, the pathway, the cycle | a molecule, an organ, a stage | far less — the enumerated list carries more |

For CS in particular, **the figure is the state of the machine**: the array with its indices,
the tree with its pointers, the stack as it grows. An algorithm is taught by running it on a
small input, one step per `play()`, with the invariant drawn on the state — never by displaying
the pseudo-code and describing it.

Five gates: **(1)** read the notes, design the concepts, script + captions → **(2)** storyboard
→ **(3)** silent draft render → **(4)** picture master assembled in Palmier Pro →
**(5)** export from Palmier and verify.

`video-plan.json` is the single timing authority from Gate 1 to delivery.

**`SOP.md` is the run sheet** — order of operations, exact commands, exit criteria, handover.
Read it before the first video and work from it during one. `SOP-zh.md` is the same in 繁體中文.

## Three mandatory approval stops

Gates 1, 2 and 3 each end by **showing me the actual work and stopping**. A request to "just
build it" still stops at all three: rendering a master before the script, storyboard and draft
are approved spends the expensive part of the pipeline on a video that may be explaining the
wrong thing.

| Stop | What I see | What I am approving |
|---|---|---|
| End of Gate 1 | `brief.md` + the concept map + the full caption script + the shot timeline | What is taught, in what order, with which pictures |
| End of Gate 2 | The rendered storyboard panels | Every frame's composition and continuity |
| End of Gate 3 | The draft video, captions as a soft track | Motion and pacing |

**All three are shown from the browser dashboard**, installed at the start of Gate 1 and kept
open for the whole build. See `references/browser-tools.md`.

```bash
python3 ~/.claude/skills/academic-video-production/tools/install.py <project>
python3 <project>/tools/serve.py 8777 <dir above the project>
```

At each stop: present the work, say what you want checked, set the matching status in
`video-plan.json`, and **stop the turn**. Silence, a partial comment, or your own confidence is
never approval. Changes come back → apply them, regenerate the artifact, show it again, stop
again.

## What is already decided — do not re-ask

| | Locked |
|---|---|
| Animation engine | **Manim Community Edition.** No Remotion, HyperFrames, HTML/CSS/JS. ManimGL only with permission — rule 9 |
| Source | **The lecture notes I give you** (PDF, PPTX, or pasted text). Read them in full before designing anything |
| Voice | **None by default.** The captions carry the explanation. A voice track only if I ask for one on that video — see "Sound" below |
| **The first shot** | **The title card** — the concept, the brand rule, `COURSE · Lecture N` (e.g. `MATH2010 · Lecture 7`). `title_card()`, 3–4 s. Rule 30 |
| **The section tag** | **The knowledge point, top-left of every shot that is not a card.** `Stage.section_tag()`, ≤ 4 words, never animated. Rule 34 |
| **On-screen language** | **English, in the lecture's own terms and notation**, everywhere on the picture. The caption track is the only place 中文 appears. Rule 29 |
| Captions | **Bilingual, always** — 繁體中文**書面語** on top, **English** underneath at 0.78× the size. See `references/narration-and-subtitles.md` |
| Assembly | **Palmier Pro, always** — scenes as separate clips, two live caption tracks, one chapter marker per knowledge point. See `references/palmier-assembly.md` |
| Export | **In Palmier Pro.** `export_project` only when I say "export"; otherwise I export from the app by hand. Rule 32 |
| Format | 1920×1080 · 16:9 · **60 fps** · **no duration limit** |
| Theme | Same as SmartQuest: dark field (recommended) or light field, measured palette, `brand_rule()` gradient. `scripts/academic_theme.py` |
| Typography | **Computer Modern throughout** on the picture; PingFang HK for the caption track. Not a per-project decision |
| Viewer | Me. I have the course's prerequisites and have at least skimmed the notes; I do **not** yet understand this concept. Pitch at that — rule 31 |
| Project root | `~/academic-videos/<COURSE>/<nn>-<slug>/` unless I name another place |

Only reach outside Manim when Manim genuinely cannot produce the shot — a photograph, a figure
from the notes that must be shown exactly as printed, a screen recording of software the course
uses. Say so and keep it to named shots.

## Mathematics and motion first, and one register per frame

**1. Say it in mathematics and motion if it can be said that way.** A concept with a symbolic
form that gets written out as a sentence has been translated away from the thing the notes
actually say.

| On the frame | Not as a sentence |
|---|---|
| `\det(AB) = \det A \cdot \det B`, with both unit squares scaling | ~~Determinants multiply.~~ |
| the pivot sliding while the left block stays ≤ it | ~~Everything left of the pivot is smaller.~~ |
| a **bold** `eigenvector` term card, flashed with the vector that stays on its line | ~~This vector is an eigenvector.~~ |
| ε shrinking and N jumping right to keep the tail inside the band | ~~For any ε we can find N.~~ |

The general form: **a property that holds under variation is shown by varying it** — the one
thing a slide cannot do.

**2. A frame speaks mathematics or it speaks words, never both.** Equations with the figure, or
an enumerated list with the figure — never an equation beside an explanatory sentence.

| | Mathematical register | Verbal register |
|---|---|---|
| Carries | definitions, equations, derivations, pseudo-code, bounds | an enumerated list of steps, conditions or cases |
| Figure | yes | **yes** — and it reacts as each item lands |
| Never | an explanatory sentence | a displayed equation |
| Budget | as few non-mathematical words as the idea needs | ≤ 5 items, each ≤ 8 words, one line |

**Pseudo-code counts as the mathematical register** — it is a formal object, like an equation.
Highlight the line that is executing while the state on the figure changes; never show code with
nothing running.

**3. The picture is in English, in the lecture's notation.** Every string on the frame is the
English the notes use — title, label, term card, list item, justification. The **caption track
is the only place 中文 appears.** The notes are in English and so is the exam hall; a Chinese
gloss on the picture teaches a word the notes never show me. `title()`, `body()`, `label()`,
`term()`, `section_tag()` and `question_text()` **raise** on a CJK character.

Full rules and worked before/afters in `references/on-screen-language.md`.

## Examples: to see the concept, not to rehearse the exam

Every knowledge point gets examples. Their job is to make the concept **visible** — so each
example is picked for what it *shows*, and the brief names that.

| Role | What it is for | Example (linear maps) |
|---|---|---|
| **Concrete** | the smallest real instance, with actual numbers, **before** the general statement | the 2×2 matrix `[[2,1],[0,1]]` acting on the grid |
| **Varied** | change one thing continuously and watch what depends on it and what does not | slide the top-right entry; watch the shear grow while the area stays 2 |
| **Broken** | the case where a hypothesis fails, so the hypothesis stops being decoration | a singular matrix collapsing the plane to a line — why `det ≠ 0` is in the theorem |
| **Connected** | where the concept shows up again, in this course or the next | the same determinant as the Jacobian in change of variables |

Not every knowledge point needs all four. **Concrete** is mandatory, and it comes first.
**Broken** is the most under-used and usually the most illuminating: every hypothesis in a
theorem is there because something goes wrong without it, and showing that something is how a
condition stops being a line to memorise.

**What an example is not:** a past-paper question, a "type of question that might come up", a
drill, a speed-run of a technique. Do not guess the final exam. Do not build a question ladder
that climbs to exam level. Do not end on a mark-scheme solution page.

**When an example does work a computation** — because watching the computation *is* the
understanding (a convolution, a Gaussian elimination, a Dijkstra run) — two SmartQuest rules
survive, because they are about understanding, not marks:

- **The general form comes first, then the numbers** (rule 27). `T(n) = 2T(n/2) + n` before
  `T(8) = 2T(4) + 8`. A line that opens on numbers shows slots filling without showing which slot
  is which.
- **Each step lands with its figure event, in one `play()`** (rule 18). The value appears on the
  state at the instant its line is written.

If the example is a problem taken from the notes or a tutorial sheet, its statement stays on the
frame while it is worked (`Stage.question()`, rule 23). A recap still is optional — use one when
the computation is long enough that I would want to pause on the whole thing; it is not a
mandatory closing page.

## Ask only what is missing

1. **The lecture notes** — the file path(s), and which lecture / slide range.
2. **Which concepts.** If I do not say, read the notes and **recommend** the two to five that
   benefit most from animation (abstract, dynamic, or skipped by the slides), with one line each
   on why, and let me pick. Do not animate a whole lecture by default.
3. **Dark field or light field.** Recommend dark. Record it in `video-plan.json` as `"theme"` —
   a theme discovered at Gate 4 costs the whole master.
4. **Depth.** Default: intuition first, then the formal statement exactly as the notes give it,
   then one derivation or proof sketch where the proof *is* the understanding. Ask only if the
   notes are proof-heavy and it is unclear whether I want the proofs animated.

Do not ask for a target duration. Do not ask what the exam covers. If I already said it, do not
ask again.

## Gate 1 — Read the notes, design the concepts, write the captions

### 0. Install the browser tools first

Run `install.py` and start the server (above), then give me the dashboard URL.

### 1. Read the lecture notes before anything else

Read the whole relevant range — every slide, including the ones that look like filler. Extract
into `notes-map.md`:

- **The concepts in the order the lecture teaches them**, each with its slide numbers.
- **The notation** — every symbol, its meaning, and its convention (`\mathbf{v}` or `\vec v`,
  0-indexed or 1-indexed, `\log` base, row or column vectors). The video uses these exactly.
- **The definitions and theorem statements verbatim**, with their hypotheses.
- **What the slides skip** — the step between two lines, the picture the lecturer drew on the
  board and the PDF does not have, the "clearly" that is not clear. These gaps are usually where
  the video earns its keep.
- **Anything that looks wrong** in the notes — a typo in a formula, an inconsistent index. Flag it;
  do not silently fix it and do not silently copy it.

For a PPTX, extract text and render the slides to images so diagrams are seen, not guessed from
text. For a scanned PDF, read the page images.

### 2. Design each concept before any code

Write `brief.md`, per knowledge point, in this order:

- **What I should be able to see afterwards** — one sentence, phrased as a picture I can now hold
  in my head ("the determinant as the factor the unit square's area is scaled by"), not as a task.
- **Prerequisites** — the earlier concepts it leans on, with the slide or lecture they are from.
  If a prerequisite is shaky enough to block the concept, give it its own short knowledge point.
- **The wrong or empty model** — what the notes leave me with: a formula with no meaning, a
  procedure with no reason, a definition with no picture, or an actual misconception. A knowledge
  point that fixes nothing is a recap, and does not need a video.
- **The aha** — the one beat where the picture makes the statement obvious. It must be an
  *argument* (the animation establishes it), not an *illustration* (the animation decorates it).
- **The central animation** — the one continuous visual idea the knowledge point is built on,
  described as motion: what is on screen, what moves, what stays fixed, what gets coloured.
  Everything else in the knowledge point hangs off this.
- **The examples** — which of concrete / varied / broken / connected, the actual values, and what
  each one makes visible.
- **The formal statement** — the notes' definition or theorem, verbatim, and the shot where it
  is written *after* the picture has made it obvious.
- **Justifications** — for each derivation step, the theorem / lemma / definition the lecture
  would cite, named the way the notes name it.
- **The knowledge-point tags** — ≤ 4-word English tag per knowledge point, where it changes, and
  confirmation no tag names a term before the shot that bridges to it (rule 34).
- **The opening** (rule 31) — the concrete situation, question or small puzzle the knowledge
  point starts from, and the plain 中文 word for the feeling before the term arrives.
- **Known limitations** — what the video does not cover (the general case, the proof, the
  pathological exceptions). Say so on the record; never imply completeness.
- **Colour assignments** — every recurring object and its pen, for the whole course series
  (rule 6). Reuse the assignments from earlier videos of the same course.

Verify every formula, value and worked number independently — against the notes, and by
computing it — before animating. Record the check in `brief.md`. A wrong number that reaches the
render is still the most expensive defect in the pipeline.

Also consult `references/lesson-patterns.md` — its patterns (behaviour before name, concrete
before general, the ponder beat, argument versus illustration) apply as written; the exam-ladder
patterns do not.

### 3. Write the captions

**The captions are the narration.** With no voice, every explanation the picture does not carry
is read, so the captions have to be written as spoken explanation — short, one idea per cue —
and paced for reading while watching. Every cue is bilingual: `text` (中文書面語) and `en`. Follow
`references/narration-and-subtitles.md`.

- the **中文 line carries no English word**, only its Chinese name — single letters, symbols and
  standard abbreviations (`DFS`, `pH`, `O(n)`) excepted
- **numbers are Arabic**
- the **English line is one line** — a hard gate in 16:9

Pacing is a hard check:

```
中文字數 ≤ 鏡頭秒數 × 4.0
stillSeconds ≥ 鏡頭秒數 × 0.25
```

Without a voice, the second budget matters more, not less: I am reading *and* watching, so every
reveal needs a beat with no new words. See `references/pacing.md`.

### 4. Lock the plan

Save `video-plan.json` per `references/production-contract.md`. Timeline invariants: sorted,
first shot at `0`, last shot ends exactly at `durationSeconds`, no gaps, no overlaps, every
duration a whole number of frames at 60 fps (a multiple of 0.05 s is always safe).
`durationSeconds` is whatever the shots add up to — it is an output, not a target.

### 5. Show me and stop

Present, in the reply itself:

- **The concept map** — the knowledge points in order, each with its slide range, its aha, its
  central animation in one sentence, and its examples by role.
- **The full script** — every shot as a table: ID, timecode, seconds, 中文 caption, English line,
  字數, and the pacing verdict against both budgets.
- **What is on the picture** — per shot, the section tag and the `onScreenText`, confirmed
  English, each entry with its reason for being there.
- **Notation and flags** — the notation adopted from the notes, and anything in the notes that
  looked wrong or skipped.
- **The timeline** — sections with their tags and shot ranges, and the total duration it came to.
- **Open questions** — anything decided by assumption.

Point at `notes-map.md`, `brief.md` and `video-plan.json` on disk. Set
`"status": "plan-awaiting-approval"` and **stop**.

## Gate 2 — Storyboard

One frame per shot, **rendered as a Manim still from the real scene** and shown in the
dashboard's Gate 2 card (click to enlarge, ← / → to step). Rebuild with
`python3 tools/build_dashboard.py`.

```bash
manim -ql -s --format=png -o S01.png src/script.py S01Title     # → storyboard/frames/
```

**Never mock a panel up as hand-authored SVG** (rule 16). The scene stub that makes the still
*becomes* the scene at Gate 3.

A still proves composition, never motion. For a shot whose whole point is motion — the varied
example, the limit closing in — say in the panel's note what moves and what stays fixed, so the
approval covers the intent.

Check across adjacent panels: the figure persists, screen direction holds, colour meaning is
constant, each end state is the next start state. Check each panel's register: no sentence on a
`math` panel, no displayed equation on a `verbal` panel, the section tag present and identical
within its section, every string in English and in the lecture's notation.

Send the panels (dashboard, and `storyboard/sheets/*.png` via `SendUserFile` if wanted), state
the shot count, total duration, which panels carry the ahas, and any composition you are unsure
of. Set `"status": "storyboard-awaiting-approval"` and **stop**.

## Gate 3 — Silent draft render

```bash
python3 tools/render.py draft          # renders what is stale, stitches, muxes the SRT
```

It renders only scenes older than `src/`, stitches them, checks the total against
`durationSeconds`, and muxes the captions as a **soft** `mov_text` track. The Gate 3 card plays it
with captions toggleable and **Mark this frame** turns a note into timecode + shot ID.

- **Joins are declared in the plan** (`"join": "cut" | "dissolve"`, `joinSeconds`), not hand-built.
  A `cut` means the scene code carries continuity (`exit_to`, checked by `check_joins.py`).
- **Re-render the shot, not the film**: `python3 tools/render.py draft --scenes S14Pivot`.
- **Never edit `src/` while a render is running.**
- **Measure cuts at exact frame indices** (`select=eq(n\,N)`), never ±timestamps.
- **A render with 0 % CPU and no new partial files is hung** — kill it and bisect.

Watch it yourself first against `references/pacing.md`: can every caption be read while the
picture is also being watched? Does each reveal get its still beat? Does the aha land on its
caption? Does a varied example vary slowly enough to see what stays fixed? Fix what you already
know is wrong before showing it.

Send `out/draft.mp4` with `SendUserFile`, say the captions are a soft track (turn them on in
QuickTime / IINA / VLC; `out/subtitles.srt` beside it), that 854×480 @15 fps means only motion
and pacing are under review, and the timecodes of the ahas. Set
`"status": "draft-awaiting-approval"` and **stop**. On notes: fix `video-plan.json` first, then
the scenes, re-render, send again, stop again.

## Gate 4 — Picture master, assembled in Palmier Pro

### First, confirm Palmier Pro is up

Call `manage_project` with `action: "list"`. **If it does not answer, stop and ask me to open
Palmier Pro** — there is no ffmpeg fallback in this skill, because the export has to come out
of Palmier. You may render the scenes while waiting; you may not assemble anywhere else.

### Render the scenes

Only on my instruction, and only from an approved draft:

```bash
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"   # if TinyTeX is used
manim -r 1920,1080 --fps 60 src/script.py <every scene>
```

About 39 frames/second at 1080p60 on an M-series Mac — a 20-minute video is about 30 minutes of
rendering. Length is never a reason to cut a knowledge point.

Do not concat and do not render `captions.py`: Palmier draws the captions live from the sidecar.

### Assemble

Follow `references/palmier-assembly.md`:

1. `manage_project create` at **60 fps**, 16:9, 1080p — fps set before any clip is placed.
2. Import each scene file individually (never the `1080p60` directory).
3. Place clips back-to-back from each file's `nb_frames`, in plan order, one `add_clips` call.
4. Split the bilingual `.srt` into `subtitles-zh.srt` and `subtitles-en.srt`; place both as
   caption tracks, styled from the theme's values (`CAPTION_INK` inverts with the theme).
5. **One chapter marker per knowledge point** (`manage_markers`), named with its section tag, so
   a 20-minute video can be navigated by concept.
6. Verify on the composite with `inspect_timeline` — an early cue, the longest 中文 and English
   cues, the last cue, and one frame per chapter marker.

If the video has a 3D figure, run the extra gates in `references/3d-geometry.md` before the
master render.

Record `assembly.route: "palmier"` and the project path in `video-plan.json`, set
`"status": "awaiting-export"`, tell me the project path, the track layout, the chapter list with
timecodes, total duration and frame count, and the frames you inspected — then **stop**.

## Gate 5 — Export from Palmier and verify

**The export happens in Palmier Pro, and only on my word.** When I say export (or "出片",
"export 吧"), call `export_project` with `mode: "video"`, `codec: "H.264"`,
`resolution: "1080p"`, and `outputPath` = `<project>/out/final.mp4`; poll with
`manage_exports list` until it finishes. If I say I will export it myself, wait for the path.
Approving the timeline is not an instruction to export.

Then run the final quality gate against the exported file:

```bash
python3 scripts/verify_master.py --plan video-plan.json --master out/final.mp4 \
  --scene-dir media/videos/script/1080p60
```

It checks duration, dimensions, **60 fps** (a manual export at 30 fps is the classic defect),
frame count, codec, black frames, scene-boundary continuity, whole-frame scenes, and caption cue
count and reading rate. Leave out `--require-audio` — these videos are silent unless a voice
track was asked for; add it when one was.

Then confirm by eye: every aha lands, no text is clipped, no label collides with a figure, colour
meanings never changed, captions are visible on both tracks, and the section tag changes only at
chapter boundaries. Report what you measured, with the verifier's own thresholds (rule 35). Set
`"status": "delivered"` only after the exported file has passed.

## Sound

Default: **silent picture, captions carry the explanation.** No TTS voice is generated unasked.

If I ask for a voice on a particular video, it goes into Palmier as an audio track under the
scenes — generated with the `edge-tts` skill (it handles English, Mandarin and Cantonese voices),
one file per shot or per section, timed to the plan. Never re-time the picture to a voice; the
plan is the authority. Local CosyVoice is too slow for this (≈55× realtime) and is not an
option. Background music likewise only when asked. See `references/sound-and-voice.md`.

## Hard rules

**Never edit `src/` while a render is running, and never start the master render without being
asked.** Manim imports the modules once at start; a render that outlives an edit produces stale
files.

1. **Never skip an approval stop.** Gates 1, 2 and 3 each end on the actual artifact and a stop.
2. **Never generate a voice unasked**, and never describe a silent video as narrated.
3. **Never invent a formula, a definition or a theorem statement.** Take it from the notes and
   verify it independently. Where the notes and a standard reference differ, follow the notes on
   screen and flag the difference in `brief.md`.
4. **Never let the plan and the render disagree.** `video-plan.json` wins; update it first.
5. **Never bake captions into lesson scenes.** They live on Palmier's caption tracks.
6. **Never change a colour's meaning** within a video or across a course's series. Record the
   assignments in `brief.md` and reuse them in the next video of the same course.
7. **Never hard-code coordinates.** Use the layout tokens in `academic_theme.py`.
8. **Stop at the last verified artifact** when a dependency, asset or decision is missing, and
   say exactly what is needed.
9. **Never switch to ManimGL silently.** Name the shot, say why ManimCE cannot do it, wait for yes.
10. **Never trust a plugin's output.** Render it and check it; write it with `mtex()` if unsure.
11. **Never verify camera work on `manim -s`.** Stills skip animations. Check the movie, and
    extract frames with `-ss` after `-i`. `references/manim-traps.md` #17, #20.
12. **Never animate `frame_center`.** Re-centre by shifting the figure. `manim-traps.md` #16.
13. **Never call `Text()` directly.** Use the theme helpers — Pango grid-fits spacing per size.
14. **Never leave a label sitting on a line.** Clear space, a hairline leader, halo only if unavoidable.
15. **Never mix displayed mathematics and explanatory words on one frame.** Two registers, two
    shots. The problem statement of a worked example is the one exemption (rule 23).
16. **Never mock up a storyboard panel by hand.** Every panel is a Manim still of the real scene.
17. **Never leave a symbol un-findable.** A symbol naming something on the figure wears that
    thing's colour everywhere it appears. Colour names; it never emphasises.
    **The test:** frozen and printed in black and white, is this frame just the lecture slide?
    If yes, it has no reason to be a video.
18. **Never draw a derived quantity before its step.** It appears on the figure in the same
    `play()` as the line that derives it.
19. **Call `soften()` on every figure; never `round_corners()`** on a figure whose angles matter.
20. **Never import a picture of text, and never `self.add()` a new string.** Every string enters
    with an animation. The caption track is exempt. A figure reproduced from the notes is an
    image and is allowed, but its labels are re-set in Manim.
21. **Never draw an angle arc without both arms visible.**
22. **Never diagnose a wrong-looking frame by eye — reverse-project it.**
23. **Never work a problem without its statement on the frame.** When an example is a stated
    problem, `Stage.question()` keeps it up for every shot of the example.
24. **Never send a draft without its soft caption track.** `ffprobe -select_streams s` first.
25. **Never let a `str.replace()` edit go unasserted.** Assert the match count; re-grep after.
26. **Every English concept term on the picture is bold** (`term()`, `body(..., terms=[...])`) —
    and bold is for terms only.
27. **Never open a computation by substituting.** General form first, numbers second.
28. **Never build an exam ladder or predict the exam.** Examples are chosen for what they make
    visible (concrete / varied / broken / connected). No past-paper framing, no "this might be
    tested", no mark-scheme solution pages.
29. **Never put 中文 on the picture.** The caption track is the only exemption.
30. **Never open on anything but the title card** — concept, brand rule, `COURSE · Lecture N`,
    3–4 s, `title_card()`. The opening question is shot 2.
31. **Never open a concept with its definition.** Start from a concrete case, a question, or a
    small puzzle I can see; let the behaviour appear; then the plain 中文 word in the caption;
    then the bold English term; then the notes' formal statement. One new term per cue, never
    before its bridge. Pitch at *me*: the course's prerequisites are known, this concept is not.
32. **Never export without my word, and never call a timeline a delivered video.** Export happens
    in Palmier Pro — `export_project` on my instruction, or by me in the app. Until an exported
    file has passed `verify_master.py`, the state is `awaiting-export`.
33. **Never add a transition unasked in Palmier.** A cross dissolve re-times everything after
    it and desyncs the captions; if asked, show both costs and let me choose.
34. **Never leave a shot unlabelled.** The section tag sits top-left on every non-card shot,
    identical within its knowledge point, arriving with the term, never on the opening shots
    before the term is bridged.
35. **Never report a check against a threshold you chose yourself.** Quote the verifier's number.
36. **Never adjust a 3D camera pose I picked.** Report a problem; do not snap or re-solve.
37. **Never let a shared helper drift between videos of the same course.** `kit.py` carries over.
38. **Never render on an unchecked machine.** Preflight Manim, LaTeX on PATH, ffmpeg and both
    caption fonts first. `references/local-toolchain.md`.
39. **Never cut a concept to hit a length.** There is no duration target. If a video is getting
    very long, split it into two videos at a knowledge-point boundary — never compress the
    explanation.
40. **Never depart from the lecture's notation on screen.** Same symbols, same indexing, same
    names. If a different convention is genuinely clearer, show the notes' form first and map it.

## Bundled resources

- `SOP.md` / `SOP-zh.md` — the run sheet, in English and 繁體中文.
- `references/brand-theme.md` — palette (identical to SmartQuest), typography, layout, motion.
- `references/browser-tools.md` — dashboard, camera picker, beat review, render driver.
- `references/3d-geometry.md` — the extra gates for 3D figures.
- `references/manim-traps.md` — the ways Manim renders without error and is still wrong.
- `references/engines-and-plugins.md` — ManimGL policy and the verified plugin state.
- `references/palmier-assembly.md` — Gate 4 and Gate 5 in Palmier Pro, including chapters and export.
- `references/on-screen-language.md` — what may appear on the picture.
- `references/narration-and-subtitles.md` — the bilingual caption cue as the narration.
- `references/lesson-patterns.md` — sequencing patterns and the concept-example roles.
- `references/pacing.md` — rhythm, dwell, reading-while-watching limits.
- `references/production-contract.md` — `video-plan.json` schema, folder layout, invariants.
- `references/project-scaffold.md` — `theme_boot.py`, `kit.py`, plan scripts, and what carries
  between videos of one course.
- `references/local-toolchain.md` — the verified stack and preflight.
- `references/sound-and-voice.md` — silent by default; the optional voice and music tracks.
- `scripts/academic_theme.py` — importable Manim theme: colours, fonts, layout, helpers.
- `scripts/build_captions.py` — plan → `.srt` + caption scene + pacing report.
- `scripts/build_storyboard.py`, `scripts/check_camera.py`, `scripts/check_framing.py`,
  `scripts/verify_master.py`.
- `tools/` — `install.py`, `serve.py`, `render.py`, `transitions.py`, `verify.py` and the
  dashboard pages.
