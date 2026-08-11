---
name: smartquest-video-production
description: Produce SmartQuest DSE teaching videos — Manim-animated lessons for HKDSE Maths, Physics, Chemistry and Biology, with 繁體中文書面語 subtitles that keep English subject terms, a locked SmartQuest brand theme, and a picture-first workflow that hands a finished silent cut to a human narrator. Use for SmartQuest lessons, DSE explainers, concept animations, exam-technique videos, 16:9 long-form lessons, and 9:16 shorts. Animation and subtitles are built first; the teacher records to picture afterwards. Manim is the only animation engine; no Remotion, no HTML/CSS/JS, no TTS, no stock or generated live action.
---

# SmartQuest Video Production

Teaching videos for HKDSE students, animated in Manim, narrated later by a real teacher.

Five gates: **(1)** lesson design + narration script + subtitle draft → **(2)** storyboard →
**(3)** silent draft render → **(4)** picture master + caption track → **(5)** narration
handoff, recording returned, audio mux, verified delivery.

`video-plan.json` is the single timing authority from Gate 1 to delivery.

## Three mandatory approval stops

Gates 1, 2 and 3 each end by **showing the user the actual work and stopping**. These are not
optional checkpoints and not "unless the user asked for an uninterrupted run" — a request to
"just build it" still stops at all three. Rendering the master before the user has seen and
approved the script, the storyboard and the draft wastes the expensive part of the pipeline on
a lesson that may be wrong.

| Stop | What the user sees | What they are approving |
|---|---|---|
| End of Gate 1 | `brief.md` + the full narration/subtitle script + the shot timeline | The teaching, the wording, the timing |
| End of Gate 2 | The rendered storyboard sheets, as files | Every frame's composition and continuity |
| End of Gate 3 | The concatenated draft video, as a file | The real motion and pacing |

At each stop: present the work, state what you want checked, set the matching status in
`video-plan.json`, and **stop the turn**. Do not proceed to the next gate on your own judgement,
and never treat silence, a partial comment, or your own confidence as approval.

When the user comes back with changes instead of approval, apply them, **regenerate and show the
artifact again**, and stop again. Loop until they approve. A changed script means a changed
`video-plan.json` first; a changed storyboard means re-rendered panels; a changed draft means an
actual re-render, not a description of what would change.

## What is already decided — do not re-ask

| | Locked |
|---|---|
| Animation engine | **Manim Community Edition.** No Remotion, HyperFrames, HTML/CSS/JS, After Effects. ManimGL only with permission — see rule 9 |
| Narration | **A human teacher records it.** Never TTS. This skill writes the script, never the audio |
| Order of work | **Picture first, voice second.** Animation and subtitles are finished, then the teacher records to picture |
| Subtitle language | 繁體中文**書面語**, with subject terms kept in **English** (see `references/narration-and-subtitles.md`) |
| Long form | 1920×1080 · 16:9 · **60 fps** · 5 min or longer |
| Shorts | 1080×1920 · 9:16 · 60 fps · about 60 s |
| Theme | The SmartQuest theme in `references/brand-theme.md`. Not 3Blue1Brown's black field |
| Audience | Hong Kong secondary students sitting the **English-language** DSE papers, taught in Cantonese |

Only reach outside Manim when Manim genuinely cannot produce the shot — a screen recording, a
photograph, a past-paper scan. Say so explicitly and keep it to named shots.

## The frame speaks mathematics, not prose

**Explanatory sentences do not belong on the picture.** They belong in the subtitle and in the
teacher's mouth. The frame carries the figure, the symbols, the equation, the ratio and the
marks — the things a student is actually being taught to read.

| On the frame | In the subtitle and narration |
|---|---|
| `AO : OM = 2 : 1` | 「較長一段連着頂點」 |
| tick marks on two segments | 「這兩段相等」 |
| a `median` term card, flashed with the purple lines | 「這條紫色線是 median」 |
| a vertex being dragged while the point stays inside | 「centroid 永遠在 triangle 內」 |

Per shot, on the picture: **explanatory prose = 0 字**, and title + labels + term cards
**≤ 12 字** in total (a Latin word counts as 2 字). Mathematics is unlimited — it is the point.

When a frame seems to need a sentence, the frame needs a better picture, not smaller type. A
property that holds under variation is shown **by varying it**, which is the one thing a textbook
cannot do. Full rules, the translation table and a worked before/after in
`references/on-screen-language.md`.

## Ask only what is missing

1. Subject and topic, and the **single thing** a student should be able to do afterwards.
2. Long form or shorts (or both from one lesson).
3. Target duration. Lock it exactly before the storyboard, not before.
4. Whether a past-paper question should anchor the lesson.

Recommend a default rather than asking an open question. If the user already said it, do not ask again.

## Gate 1 — Lesson design, script, subtitles

### 1. Design the lesson before any code

Write `brief.md` covering, in this order:

- **Learning objective** — what the student can do afterwards, in one sentence.
- **Prerequisites** — what they must already know. Name them; do not assume.
- **The misconception** — the specific wrong model students hold. A lesson that corrects nothing is a recap, not a lesson.
- **The aha moment** — the one beat where the misconception breaks. Mark its timecode later.
- **Marks and reasons** — for Maths and Physics, state every reason a DSE marker expects
  (`ext. ∠ of △`, `base ∠s, isos. △`, `alt. ∠s, AB // CD`). Getting the animation right and the
  reason wrong is still a wrong lesson.
- **Known limitations** — cases the video does not cover. Say so on the record; never let the
  video imply completeness it does not have.

Verify every formula, constant, unit, and worked number independently before animating. Record
the check in `brief.md`. A wrong number that reaches the render is the most expensive defect
in this pipeline.

### 2. Write the narration script and the subtitles together

Narration and subtitles are the same text. Follow `references/narration-and-subtitles.md` for
書面語 style and the English-term rule.

For every shot, the script must fit the shot. The pacing budget is a hard check, not advice:

```
中文字數 ≤ 鏡頭秒數 × 4.0          # ~4 字/秒 是教學朗讀速度，非新聞速度
```

Then leave breathing room on top of that — see `references/pacing.md`. A shot whose subtitle
fills its whole duration has no room for the teacher to pause, and no room for the student to
look at the diagram.

### 3. Lock the plan

Save `video-plan.json` per `references/production-contract.md`. Timeline invariants: sorted by
`start`, first shot starts at `0`, last shot ends exactly at `durationSeconds`, no gaps, no
overlaps, every duration a whole number of frames at 60 fps (a multiple of 0.05 s is always safe).

### 4. Show the user and stop for approval

Nothing gets animated until the user has read the lesson. Present, in the reply itself so it can
be read without opening files:

- **The lesson** — learning objective, prerequisites, the misconception, where the aha lands, the
  DSE reasons, and the stated limitations. Say which formulas and numbers you verified and how.
- **The full script** — every shot in order, as a table: shot ID, timecode, allotted seconds, the
  exact 書面語 subtitle text, 字數, and the pacing verdict against both the reading budget
  (`字數 ≤ 秒數 × 4.0`) and the breathing budget (`stillSeconds ≥ 秒數 × 0.25`).
- **What is on the picture** — per shot, the `onScreenText` list and its 字數 against the ≤ 12 字
  limit, so the split between picture and narration is visible before anything is drawn. Any
  sentence you moved off the frame: say where it went, and what mathematics replaced it.
- **The timeline** — section structure, total duration, and the knowledge-point count.
- **Open questions** — anything you decided by assumption rather than instruction.

Also point at `brief.md` and `video-plan.json` on disk for the full detail.

Ask the user to check the teaching and the wording specifically — a wrong DSE reason or an
awkward 書面語 line is far cheaper to fix here than after a storyboard exists. Set
`"status": "plan-awaiting-approval"` and **stop**.

On revisions: edit `video-plan.json` and the script, re-run the pacing check, show the changed
shots again, and stop again.

## Gate 2 — Storyboard

One frame per shot, **rendered as a Manim still from the real scene**, then assembled into review
sheets with `scripts/build_storyboard.py`. Each panel carries: shot ID, time range, the visual,
the motion, the transition, and **the subtitle text with its character count and the pacing
verdict**.

```bash
manim -ql -s --format=png -o S01.png src/script.py S01Hook     # → storyboard/frames/
```

**Never mock a panel up as hand-authored SVG.** The panel is what the user approves at Gate 2, so
it has to be the frame, not a drawing of the intended frame. A hand-made SVG is laid out by a
different engine with different fonts, so it renders *correctly* exactly where Manim does not —
it would have shown clean letter spacing while the real render had trap #22, clean labels while
the real render had them buried in the figure, and text fitting a margin the theme cannot
actually fit. An approval given on that picture binds nothing.

It is also not extra work. The still comes from a scene stub that **becomes** the lesson scene:
build the figure and the on-screen text at Gate 2, add the animation at Gate 3. Only the
`build_storyboard.py` sheet itself is SVG, and that is review-document furniture — header, panel
chrome, notes — with each frame embedded as an image.

A still proves composition, never motion (`manim -s` skips animations entirely — see
`references/manim-traps.md` #17). Motion is Gate 3's job.

Check across adjacent panels: does the figure persist, does screen direction hold, does the
colour meaning stay constant, does each shot's end state match the next shot's start state.

**This is where on-screen prose gets caught.** Per panel, count the non-mathematical characters
on the picture. Over 12 字, or any complete sentence, means redesign the panel — not shrink the
type. For every sentence that is not there, name where it went (subtitle, narration, or an
animated beat), and for every term card, name the shot that bound it to its colour. Then ask of
each remaining word: *would this panel still teach without it?* If yes, delete it.
See `references/on-screen-language.md`.

### Show the user and stop for approval

Deliver the rendered sheets as **files the user can actually look at** — send
`storyboard/sheets/*.png` with `SendUserFile`, or if that is unavailable give the exact paths.
Do not describe the panels in prose and call that a review; the point of a storyboard is that it
is seen.

Alongside the sheets, state: the shot count, the total duration, which panel is the aha, and any
composition you are unsure about. Ask the user to check framing, label placement, and whether
each panel reads at a glance.

Set `"status": "storyboard-awaiting-approval"` and **stop**. This applies even when the user
asked for an uninterrupted run.

On revisions: re-author the affected frames, rebuild the sheets with `build_storyboard.py`, send
them again, and stop again.

## Gate 3 — Silent draft render

```bash
manim -ql src/script.py <every scene>
```

Draft quality is 854×480 @15 fps and costs seconds per scene. Concatenate the scenes into a
single reviewable file:

```bash
ffmpeg -y -f concat -safe 0 -i out/concat-draft.txt -c copy out/draft.mp4
```

Watch it yourself first, against the Gate 3 questions in `references/pacing.md`: sweep speeds,
dwell after each reveal, whether a student can read every line in time, whether any beat rushes
past a knowledge point, whether the teacher could speak the script over this without rushing.
Fix what you already know is wrong before showing it — the user's review is not your first pass.

### Show the user and stop for approval

**Send `out/draft.mp4` to the user as a file** with `SendUserFile`, so they watch the motion
rather than read your account of it. If file delivery is unavailable, give the exact path and say
it must be watched before Gate 4 begins. A written summary is never a substitute for the video.

With it, state: what you already fixed, which beats you are unsure about, the timecode of the
aha, and that draft resolution is 854×480 @15 fps so only pacing and motion are under review
here — not sharpness, not final type rendering.

Invite either an approval or a list of problems with timecodes. Set
`"status": "draft-awaiting-approval"` and **stop**.

On revisions: fix timing in `video-plan.json` first, then the scenes — never let the two
disagree — then **re-render the affected scenes, rebuild `out/draft.mp4`, and send the new video
again**. Stop again. Repeat until the user approves. Never answer a pacing note with a
description of the change instead of a re-render; the whole point of this gate is that motion
problems are only visible in motion.

Draft resolution hides real defects. Do not conclude the picture is correct from a draft; the
full-resolution checks in Gate 4 exist because low-resolution review misses them.

## Gate 4 — Picture master and caption track

### Render the animation

```bash
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"   # if TinyTeX is used
manim -r 1920,1080 --fps 60 src/script.py <every scene>          # long form
manim -r 1080,1920 --fps 60 src/script.py <every scene>          # shorts
ffmpeg -f concat -safe 0 -i out/concat.txt -c copy out/picture.mp4
```

Scenes must be authored against the layout tokens in `scripts/smartquest_theme.py` so the same
code renders both aspect ratios. Never hard-code a coordinate that assumes 16:9.

Measured throughput on an M-series Mac: about **39 frames/second at 1080p60**, so a 5-minute
lesson renders in roughly 8 minutes and a 10-minute lesson in about 16. Length is not a reason
to avoid Manim.

### Render the caption track separately

Subtitles are **not** drawn inside the lesson scenes. `scripts/build_captions.py` reads
`video-plan.json` and emits both a Manim caption scene and a sidecar `.srt`:

```bash
python3 scripts/build_captions.py --plan video-plan.json --out-dir src
manim -r 1920,1080 --fps 60 -t --format=mov src/captions.py CaptionTrack
ffmpeg -y -i out/picture.mp4 -i media/videos/captions/1080p60/CaptionTrack.mov \
  -filter_complex "[0:v][1:v]overlay=0:0" -c:v libx264 -crf 18 -pix_fmt yuv420p \
  out/picture-subbed.mp4
```

Why this and not `ffmpeg -vf ass=…`: the `ass`, `subtitles` and `drawtext` filters need libass
and libfreetype, which many Homebrew ffmpeg builds omit. `overlay` is always present. Check
with `ffmpeg -h filter=ass`; if it exists you may use the ASS route instead, but the caption
data still comes from `video-plan.json`.

Keeping captions on their own track means **a subtitle fix never re-renders the mathematics**.

### If the lesson has a 3D figure

Solid geometry gets four extra gates before the picture master, because a 3D frame can be
geometrically wrong while rendering perfectly: the mathematics is solved and asserted outside
the scene, the camera is scanned for degeneracy with `scripts/check_camera.py`, stills from
three angles are inspected, and the camera collapses to the solving plane so the flat view can
be checked against the marking scheme. Follow `references/3d-geometry.md`.

## Gate 5 — Narration handoff, recording, mux

The picture is finished before anyone speaks. Give the teacher three things:

1. `out/guide-track.mp4` — the subbed picture with a burned-in shot marker and running timecode.
2. `narration-sheet.md` — per shot: timecode, allotted seconds, the exact text, character count,
   and the English terms to pronounce in English.
3. Recording notes — one continuous take per section is easier to sync than per-shot takes.

Mark the plan `awaiting-teacher-recording` and stop. **Never synthesize a placeholder voice and
never describe the video as finished while the audio is missing.**

When the recording returns:

```bash
ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 narration.wav
ffmpeg -y -i out/picture-subbed.mp4 -i narration.wav \
  -c:v copy -c:a aac -b:a 192k -shortest out/final.mp4
```

Listen for drift against the shot boundaries. If the teacher's delivery genuinely needs more
time in a section, change `video-plan.json`, re-render the affected scenes, and re-verify —
do not stretch or pitch-shift the recording to fit a stale timeline.

## Final quality gate

Run `scripts/verify_master.py`. It checks, and reports what it actually measured:

- exact duration, dimensions, frame rate, frame count, codec, audio stream presence
- no black frames
- scene-boundary continuity — every shot's last frame against the next shot's first frame
- every scene an exact whole number of frames
- subtitle cue count and per-cue reading rate

Then confirm by eye: the aha moment lands, no text is clipped by a safe area, no label collides
with a diagram, colour meanings never changed mid-video, and the DSE reasons are correct.

Report what you verified and how. If something was not checked, say so.

## Hard rules

1. **Never skip an approval stop.** Gates 1, 2 and 3 each end by showing the user the actual
   artifact — the script, the storyboard sheets, the draft video — and stopping the turn. No
   phrasing of the request removes these three stops, and no amount of confidence in the work
   substitutes for the user's yes.
2. **Never claim audio exists.** No TTS, no placeholder voice, no "narration added".
3. **Never invent a DSE reason or a formula.** Verify against the syllabus wording.
4. **Never let the plan and the render disagree.** `video-plan.json` wins; update it first.
5. **Never bake subtitles into lesson scenes.** They live on the caption track.
6. **Never change a colour's meaning** once assigned inside a video, or across a series.
7. **Never hard-code 16:9 coordinates.** Use the layout tokens so shorts work from the same code.
8. **Stop at the last verified artifact** when a dependency, asset, or decision is missing, and
   state exactly what is needed.
9. **Never switch to ManimGL silently.** It is installed and it coexists with ManimCE, but it is
   a different, undocumented API. Name the shot, say why ManimCE cannot do it, and wait for a
   yes. See `references/engines-and-plugins.md`.
10. **Never trust a plugin's output.** A plugin is third-party code rendering examinable content.
    `manim-chemistry`'s `ChemicalFormula` renders `Ca(OH)2` as **CaO** — no error, no warning.
    Render it, check it against the syllabus, or write it yourself with `mtex()`.
11. **Never verify camera work on `manim -s`.** A still render skips animations and applies only
    end states, so it looks correct while the movie is wrong. Check the rendered movie, and
    confirm an extracted frame is really the frame you think — `ffmpeg -ss` before `-i`
    silently returns a keyframe. See `references/manim-traps.md` #17 and #20.
12. **Never animate `frame_center`.** `move_camera(frame_center=...)` does not redraw the figure;
    everything stays drawn at the old centre while the camera reports the new one. Re-centre by
    shifting the figure. See `references/manim-traps.md` #16.
13. **Never call `Text()` directly.** Use `title()` / `body()` / `label()` / `caption_text()`.
    Pango grid-fits glyph positions to the `font_size` it is handed, so a bare `Text()` gets
    letter spacing that differs from every other string in the video — visible on screen as
    英文字距不一樣. See `references/manim-traps.md` #22.
14. **Never leave a label sitting on a line.** Move it into clear space first — with a hairline
    leader to its point if it must reach one — and halo it only where overlap is genuinely
    unavoidable. `label()` haloes by default. See `references/brand-theme.md`.
15. **Never put an explanatory sentence on the picture.** The frame gets mathematics, figures,
    labels, term cards and DSE reasons; explanation goes to the subtitle and the narration. If a
    frame seems to need a sentence, it needs a better picture. See
    `references/on-screen-language.md`.
16. **Never mock up a storyboard panel by hand.** Every panel is a Manim still rendered from the
    real scene. A hand-authored SVG is laid out by a different engine, so it looks right exactly
    where the render does not, and the Gate 2 approval it earns binds nothing.
17. **Never import a picture of text, and never `self.add()` it.** Every string on the picture —
    中文, English, `MathTex` alike — is a Manim mobject from a theme helper, and it **enters with
    an animation** at `T_REVEAL`. No `SVGMobject`/`ImageMobject` of a label or formula; `add()` is
    only for state carried over from the previous scene. **The caption track is exempt** on both
    counts: it is a separate track, it may be produced outside Manim, and a cue cuts on rather
    than animating in. See `references/brand-theme.md`.

## Bundled resources

- `references/brand-theme.md` — the SmartQuest palette, typography, layout and motion grammar.
- `references/3d-geometry.md` — the extra gates a solid-geometry lesson needs.
- `references/manim-traps.md` — the ways Manim renders without an error and is still wrong.
- `references/engines-and-plugins.md` — when ManimGL is allowed, and the verified plugin state.
- `references/on-screen-language.md` — what may appear on the picture, and how to say in
  mathematics what you were about to write as a sentence.
- `references/narration-and-subtitles.md` — 書面語 rules, the English-term rule, subtitle format.
- `references/pacing.md` — teaching rhythm, dwell times, narration room, checkable limits.
- `references/production-contract.md` — `video-plan.json` schema, folder layout, invariants.
- `scripts/smartquest_theme.py` — importable Manim theme: colours, fonts, layout, helpers.
- `scripts/build_captions.py` — plan → caption scene + `.srt` + pacing report.
- `scripts/check_camera.py` — rejects degenerate 3D camera angles before rendering.
- `scripts/check_framing.py` — projects 3D camera keyframes through a real `ThreeDCamera`:
  frame fill, off-screen elements, caption-band intrusions, and the angle a shot will actually
  render. Seconds to run, and the only honest way to size a 3D shot.
- `scripts/build_storyboard.py` — review sheets from a storyboard manifest.
- `scripts/verify_master.py` — the final quality gate, as a runnable check.
