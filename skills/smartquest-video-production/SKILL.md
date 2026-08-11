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

## What is already decided — do not re-ask

| | Locked |
|---|---|
| Animation engine | **Manim Community Edition.** No Remotion, HyperFrames, HTML/CSS/JS, After Effects. ManimGL only with permission — see rule 8 |
| Narration | **A human teacher records it.** Never TTS. This skill writes the script, never the audio |
| Order of work | **Picture first, voice second.** Animation and subtitles are finished, then the teacher records to picture |
| Subtitle language | 繁體中文**書面語**, with subject terms kept in **English** (see `references/narration-and-subtitles.md`) |
| Long form | 1920×1080 · 16:9 · **60 fps** · 5 min or longer |
| Shorts | 1080×1920 · 9:16 · 60 fps · about 60 s |
| Theme | The SmartQuest theme in `references/brand-theme.md`. Not 3Blue1Brown's black field |
| Audience | Hong Kong secondary students sitting the **English-language** DSE papers, taught in Cantonese |

Only reach outside Manim when Manim genuinely cannot produce the shot — a screen recording, a
photograph, a past-paper scan. Say so explicitly and keep it to named shots.

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

## Gate 2 — Storyboard

One frame per shot, authored as exact SVG or rendered as a Manim still, then assembled into
review sheets with `scripts/build_storyboard.py`. Each panel carries: shot ID, time range,
the visual, the motion, the transition, and **the subtitle text with its character count and
the pacing verdict**.

Check across adjacent panels: does the figure persist, does screen direction hold, does the
colour meaning stay constant, does each shot's end state match the next shot's start state.

**Stop for approval here** unless the user asked for an uninterrupted run.

## Gate 3 — Silent draft render

```bash
manim -ql src/script.py <every scene>
```

Draft quality is 854×480 @15 fps and costs seconds per scene. Concatenate it and review the
real motion: sweep speeds, dwell after each reveal, whether a student can read every line in
time, whether any beat rushes past a knowledge point.

Fix timing in `video-plan.json` first, then in the scenes. Never let the two disagree.

**Stop for approval here.**

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

1. **Never claim audio exists.** No TTS, no placeholder voice, no "narration added".
2. **Never invent a DSE reason or a formula.** Verify against the syllabus wording.
3. **Never let the plan and the render disagree.** `video-plan.json` wins; update it first.
4. **Never bake subtitles into lesson scenes.** They live on the caption track.
5. **Never change a colour's meaning** once assigned inside a video, or across a series.
6. **Never hard-code 16:9 coordinates.** Use the layout tokens so shorts work from the same code.
7. **Stop at the last verified artifact** when a dependency, asset, or decision is missing, and
   state exactly what is needed.
8. **Never switch to ManimGL silently.** It is installed and it coexists with ManimCE, but it is
   a different, undocumented API. Name the shot, say why ManimCE cannot do it, and wait for a
   yes. See `references/engines-and-plugins.md`.
9. **Never trust a plugin's output.** A plugin is third-party code rendering examinable content.
   `manim-chemistry`'s `ChemicalFormula` renders `Ca(OH)2` as **CaO** — no error, no warning.
   Render it, check it against the syllabus, or write it yourself with `mtex()`.

## Bundled resources

- `references/brand-theme.md` — the SmartQuest palette, typography, layout and motion grammar.
- `references/3d-geometry.md` — the extra gates a solid-geometry lesson needs.
- `references/manim-traps.md` — the ways Manim renders without an error and is still wrong.
- `references/engines-and-plugins.md` — when ManimGL is allowed, and the verified plugin state.
- `references/narration-and-subtitles.md` — 書面語 rules, the English-term rule, subtitle format.
- `references/pacing.md` — teaching rhythm, dwell times, narration room, checkable limits.
- `references/production-contract.md` — `video-plan.json` schema, folder layout, invariants.
- `scripts/smartquest_theme.py` — importable Manim theme: colours, fonts, layout, helpers.
- `scripts/build_captions.py` — plan → caption scene + `.srt` + pacing report.
- `scripts/check_camera.py` — rejects degenerate 3D camera angles before rendering.
- `scripts/build_storyboard.py` — review sheets from a storyboard manifest.
- `scripts/verify_master.py` — the final quality gate, as a runnable check.
