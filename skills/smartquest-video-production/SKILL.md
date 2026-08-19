---
name: smartquest-video-production
description: Produce SmartQuest DSE teaching videos — Manim-animated lessons for HKDSE Maths, Physics, Chemistry and Biology, with bilingual subtitles (繁體中文書面語 above, English below) that put the exam's subject terms on screen, a locked SmartQuest brand theme, and a picture-first workflow that hands a finished silent cut to a human narrator. Use for SmartQuest lessons, DSE explainers, concept animations, exam-technique videos, 16:9 long-form lessons, and 9:16 shorts. Animation and subtitles are built first; the teacher records to picture afterwards. Manim is the only animation engine; no Remotion, no HTML/CSS/JS, no TTS, no stock or generated live action.
---

# SmartQuest Video Production

Teaching videos for HKDSE students, animated in Manim, narrated later by a real teacher.

## What we are making

**The 3Blue1Brown of the DSE syllabus — every subject, not only Maths.**

Plenty of Hong Kong students already watch 3Blue1Brown. What stops it being enough is not the
craft, it is the fit: he goes deeper than a syllabus needs, chooses topics for their beauty, and
owes nothing to a marking scheme. So a student gets the intuition and still cannot answer Q11.

SmartQuest takes his standard and binds it to the syllabus. That sets the bar in both directions:

- **The reference point is 3Blue1Brown, not a typical tutorial video.** A talking head over a
  worked past paper is not the thing being aimed at, even though it is what the market supplies.
- **Every lesson is syllabus-bound and mark-aware.** DSE reasons on screen, the marker's exact
  wording, no beautiful digression that earns nothing.

### It has to work outside Maths

The rules in this skill are written in the language of a geometry lesson — the figure, the angle,
the derivation. They are not Maths-only, but they need translating, and the translation is part of
designing a Physics, Chemistry or Biology lesson rather than an afterthought.

| | The "figure" is | The referent a colour names | The mathematical register carries |
|---|---|---|---|
| **Maths** | the diagram | a point, side, angle | the derivation |
| **Physics** | the free-body diagram, the ray path, the graph | a force, a component, a body | the equation of motion, the graph gradient |
| **Chemistry** | the structure, the apparatus, the energy profile | a species, a bonding pair, an electron | the balanced equation, the mole calculation |
| **Biology** | the structure, the cycle, the pathway | an organ, a molecule, a stage of a process | far less — see below |

**Biology is the honest exception.** It carries much less symbolic content, so its lessons lean
harder on the **verbal register** — the enumerated list of stages — and on the figure changing over
time. That is a legitimate shift, not a failure to follow the rules. What does not shift: a colour
still names one thing everywhere it appears, the figure is still built in step with the narration,
and loose explanatory prose still belongs to the subtitle.

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
| End of Gate 2 | The rendered storyboard panels | Every frame's composition and continuity |
| End of Gate 3 | The draft video, with its subtitles as a soft track | The real motion and pacing |

**All three are shown from the browser dashboard, which is installed at the start
of Gate 1 and stays open for the whole build.** Send the file as well when it is
a video, but the page is where the user reads the script, clicks through the
storyboard, plays the draft with captions on, and sees every check. See
`references/browser-tools.md`.

```bash
python3 ~/.claude/skills/smartquest-video-production/tools/install.py <project>
python3 <project>/tools/serve.py 8777 <dir above videos/>
```

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
| Subtitles | **Bilingual, always** — 繁體中文**書面語** on top, **English** underneath at 0.78× the size. The 中文 line is written in Chinese; the subject terms live in the English line (see `references/narration-and-subtitles.md`) |
| Long form | 1920×1080 · 16:9 · **60 fps** · 5 min or longer |
| Shorts | 1080×1920 · 9:16 · 60 fps · about 60 s |
| Typography | **Computer Modern throughout** in the 3Blue1Brown manner — mathematics, titles and Latin figure labels alike. Songti TC for on-frame Chinese, PingFang HK Bold for the caption track. Not a per-project decision |
| Identity | Carried by the **colour set**, `brand_rule()` and the sans caption track — never by a display face |
| Audience | Hong Kong secondary students sitting the **English-language** DSE papers, taught in Cantonese |

Only reach outside Manim when Manim genuinely cannot produce the shot — a screen recording, a
photograph, a past-paper scan. Say so explicitly and keep it to named shots.

## Mathematics and motion first, and one register per frame

Two rules govern everything the picture shows.

**1. Say it in mathematics and motion if it can be said that way.** A concept that has a
mathematical form and gets written out in Chinese has been translated away from the very thing
the student is examined on.

| On the frame | Not as a sentence |
|---|---|
| `AO : OM = 2 : 1` | ~~較長一段連着頂點~~ |
| tick marks on two segments | ~~這兩段相等~~ |
| a `median` term card, flashed with the purple lines | ~~這條紫色線是 median~~ |
| a vertex dragged while the point stays inside | ~~centroid 永遠在 triangle 內~~ |

The last row is the general form: **a property that holds under variation is shown by varying
it** — the one thing a textbook cannot do.

**2. A frame speaks mathematics or it speaks words, never both.** The two are read differently,
and mixing them makes the student switch modes mid-shot so neither gets read. That mixture is the
defect; text beside a *figure* is not.

| | Mathematical register | Verbal register |
|---|---|---|
| Carries | equations, formulae, ratios, derivations | an enumerated list of steps or conditions |
| Figure | yes | **yes** — and it should react as each item lands |
| Never | an explanatory sentence | a displayed equation |
| Budget | non-mathematical text ≤ 12 字 | ≤ 5 items, each ≤ 20 字 |

Most lessons need both registers; they just take separate shots, with the figure carrying across.
Words are for what genuinely cannot be said in mathematics — chiefly an **enumerated procedure**,
which narration cannot carry because a subtitle is linear and transient, so by step ③ the student
has lost step ① and never sees the shape of the procedure. Reveal such a list one item at a time,
and let each item act on the figure as it lands.

Full rules, the translation table and a worked before/after in
`references/on-screen-language.md`.

## Worked examples: the question is on screen, in full, in English

Whenever the lesson works an example — a past paper, a textbook question, one you wrote — **the
question text is on the frame, complete, in the English the DSE paper uses**, for as long as the
example runs.

This is not the prose ban being relaxed. Banned prose is *your* explanation of the mathematics;
the question is the **object of study**, and it is the exact text the student has to parse in the
exam hall. A student who watches a solution to a question they cannot see is watching a
mechanism with no problem attached to it, and reading the English question under time pressure is
half of what the paper actually tests. So the question band is exempt from the ≤ 12 字 budget and
from the one-register rule — see `references/on-screen-language.md`, "The question band".

**The stem never leaves.** Parts (a) and (b) may each take their own screen, but the main
question stays up on both, above the part:

| | |
|---|---|
| **Stem** | every shot of the example, top of the frame, `MUTED`, never re-wrapped between shots |
| **Part** | only the part being answered right now, under the stem, `INK`. It is what changes when the example moves from (a) to (b) |
| **Never** | a part on screen whose stem is not, and never a 中文 translation of either — the paper is in English |

`Stage.question(stem, part)` builds both and reserves the band, so the figure and the derivation
lay out underneath instead of behind. Call it before `figure_box()`. It **raises** if the stem
plus the part would take more than about five lines — that is the signal to quote only the
sentences this part needs, or to split the part across two shots, never to shrink the type.

**The solution appears against the question, and it moves.** The derivation is not a block of
finished algebra revealed next to a static diagram:

- every step lands on its own beat, with its figure event, in one `play()` — hard rule 18
- a step that names a quantity draws that quantity onto the figure at the same instant
- when the derivation is longer than the panel holds, **split the shot** rather than shrinking the
  steps: carry the figure and the question across, and open the second screen with the line the
  first one ended on, so nothing has to be remembered across the cut
- a screen of steps that could have been printed on paper has failed the marking-scheme test,
  question band or no question band

Sequencing — the hook, the ponder beat before the answer, and how a part is split — is in
`references/lesson-patterns.md`, pattern 6.

## Ask only what is missing

1. Subject and topic, and the **single thing** a student should be able to do afterwards.
2. Long form or shorts (or both from one lesson).
3. Target duration. Lock it exactly before the storyboard, not before.
4. Whether a past-paper question should anchor the lesson.
5. **Dark field or light field.** Both are measured and documented in
   `references/brand-theme.md`; neither is a default that can be assumed. The dark one is the
   library's usual look; the light one exists and is switched on with `sq.use_light()` before
   anything is built. Ask it at Gate 1, with the dark field as the recommendation, and record the
   answer in `video-plan.json` as `"theme": "dark"` or `"theme": "light"` — a theme discovered at
   Gate 4 costs the whole picture master.

Recommend a default rather than asking an open question. If the user already said it, do not ask again.

## Gate 1 — Lesson design, script, subtitles

### 0. Install the browser tools first

Before writing anything, run `install.py` and start the server (above), then give
the user the dashboard URL. Everything from here — the script, the storyboard,
the draft, the renders, the checks — is shown there. Building the lesson first
and bolting a review page on afterwards means the early gates get approved on
prose instead of on the artifact.

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
- **The lesson patterns** — answer each explicitly, per `references/lesson-patterns.md`:
  1. **The hook question** — what the student wants to know after the opening shot, in one
     sentence. 「今日我們講 X」 is a table of contents, not a hook.
  2. **Behaviour before name** — for each term, the beat where the student *sees* it before it is
     named. Never open a section with a definition.
  3. **The concrete case** — the real numbers worked before any general form. If the lesson only
     shows the general form, name the specific case it came from and put that case in the video.
  4. **The ponder beat** — where the student is handed the problem before the answer, and for how
     long. A worked example with no ponder beat needs a reason.
  5. **Argument or illustration** — for each beat, does the animation *establish* the result or
     merely display it? Say which, and promote at least one. The aha must be an argument; an aha
     the student is told rather than shown is an aha in name only.
  6. **The worked example** — if the lesson works one: the question text verbatim in English,
     which part goes on which screen, the reading time the stem is given, and where any part is
     split. Skip only if there is no worked example.

Verify every formula, constant, unit, and worked number independently before animating. Record
the check in `brief.md`. A wrong number that reaches the render is the most expensive defect
in this pipeline.

### 2. Write the narration script and the subtitles together

**Every cue is bilingual: 中文 on top, English underneath and smaller.** Write both — `text` and
`en` — for every cue. Follow `references/narration-and-subtitles.md` for 書面語 style and for
what each line may contain. Three rules catch people:

- the **中文 line carries no English word**, only its Chinese name — `SAS`-type abbreviations,
  single letters and notations like `pH` are the exceptions. The term lives in the English line
- **numbers are Arabic** — 「2 個」, not 「兩個」. A numeral inside a word (三角形, 二次方程) stays
- the **English line is one line**, and in 16:9 that is a hard gate

The teacher speaks the Chinese line with the terms said in English — that is the narration, and
it is why the term is on screen in English at the same moment.

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
  exact 書面語 subtitle text **and its English line**, 字數, and the pacing verdict against both
  the reading budget (`字數 ≤ 秒數 × 4.0`) and the breathing budget (`stillSeconds ≥ 秒數 × 0.25`).
- **What is on the picture** — per shot, the `onScreenText` list and its 字數 against the ≤ 12 字
  limit, so the split between picture and narration is visible before anything is drawn. Any
  sentence you moved off the frame: say where it went, and what mathematics replaced it.
- **The question, if the lesson works one** — the stem verbatim in English, the parts, which
  shots carry which part, and the seconds the stem gets to be read before anything else moves.
  Quote it; a mis-transcribed past-paper question is the same class of defect as a wrong number.
- **The timeline** — section structure, total duration, and the knowledge-point count.
- **Open questions** — anything you decided by assumption rather than instruction.

Also point at `brief.md` and `video-plan.json` on disk for the full detail.

Ask the user to check the teaching and the wording specifically — a wrong DSE reason or an
awkward 書面語 line is far cheaper to fix here than after a storyboard exists. Set
`"status": "plan-awaiting-approval"` and **stop**.

On revisions: edit `video-plan.json` and the script, re-run the pacing check, show the changed
shots again, and stop again.

## Gate 2 — Storyboard

One frame per shot, **rendered as a Manim still from the real scene**. The panels are then shown
in the dashboard's Gate 2 card — click one for full size — each with its shot ID, time range,
visual and motion. Rebuild the card with `python3 tools/build_dashboard.py` after rendering the
stills. `scripts/build_storyboard.py` still produces PNG sheets when a file is wanted (to paste
somewhere, or offline), but the browser is where the user reviews them.

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

**This is where on-screen prose gets caught.** Check each panel against its `register`:

- **`math` panels** — count the non-mathematical characters. Over 12 字, or any complete
  sentence, means redesign the panel, not shrink the type.
- **`verbal` panels** — one enumerated list, ≤ 5 items. A figure alongside it is good; a
  **displayed equation** alongside it means split the shot in two.
- **Both** — no loose explanatory sentence anywhere, and nothing written in words that the
  figure could have shown as a mark, a colour, or a movement.
- **Worked-example panels** — the stem is on every one of them, identical and identically
  wrapped, with this shot's part under it. The stem does not count against the 字 budget; the
  rest of the panel still does. A panel showing a part without its stem fails here.

For every sentence that is not there, name where it went (subtitle, narration, or an animated
beat), and for every term card, name the shot that bound it to its colour. Then ask of each
remaining word: *would this panel still teach without it?* If yes, delete it.
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
python3 tools/render.py draft          # renders what is stale, stitches, muxes the SRT
```

One command: it renders only the scenes older than `src/`, stitches them, checks the total
against `durationSeconds`, and muxes the subtitles in as a soft track. The dashboard's Draft
render card does the same with a Start button and a live log, and the Gate 3 card plays the
result with the captions toggleable.

**Never edit `src/` while a render is running.** Manim imports the modules once at start, so the
run finishes with the code it began with and every file it wrote is then older than the source.

The manual equivalent, if you need it:

```bash
manim -ql src/script.py <every scene>
```

Draft quality is 854×480 @15 fps and costs seconds per scene. Concatenate the scenes, then put
the subtitles in as a **soft track** — every draft carries its subtitles, and none of them are
burned in:

```bash
ffmpeg -y -f concat -safe 0 -i out/concat-draft.txt -c copy out/draft-picture.mp4
python3 scripts/build_captions.py --plan video-plan.json --out-dir src
ffmpeg -y -i out/draft-picture.mp4 -i out/subtitles.srt \
  -c:v copy -c:s mov_text -metadata:s:s:0 language=zho -disposition:s:0 default \
  out/draft.mp4
```

`out/draft.mp4` is then the file the user watches, exactly as before — it just has a subtitle
stream in it. Confirm the stream is really there before sending it; a missing `-c:s` silently
produces a video with no subtitles at all:

```bash
ffprobe -v error -select_streams s -show_entries stream=index,codec_name -of csv=p=0 out/draft.mp4
```

**Soft, never burned, at this gate.** Burning is wrong here for three separate reasons: at
854×480 the type would be judged on a resolution the master does not have, a typo fix would cost
a re-encode of the whole draft instead of a rebuilt sidecar, and the reviewer could no longer
turn the words off to look at the picture alone. Burning happens once, at Gate 4, onto the
1080p60 picture.

Running `build_captions.py` here is also the point: its pacing and layout gates then fire at
Gate 3 rather than at Gate 4, so a cue that would land on the diagram is caught before the
expensive render. It exits non-zero on a broken plan — fix `video-plan.json`, or pass
`--allow-pacing-failures` if you deliberately want to look at the motion first, and say which
you did.

Watch it yourself first, against the Gate 3 questions in `references/pacing.md`: sweep speeds,
dwell after each reveal, whether a student can read every line in time, whether any beat rushes
past a knowledge point, whether the teacher could speak the script over this without rushing.
Fix what you already know is wrong before showing it — the user's review is not your first pass.

**Check the beats here too, because synchrony is invisible in a still.** For every derived
quantity: does its mark appear on the figure at the same instant as its line, or has the figure
been carrying it since the shot opened? Does the subtitle for that step run across that instant?
A storyboard panel cannot show any of this — it is the reason a draft exists.

**Measure every cut at exact frame indices, not timestamps.** At the draft's 15 fps a frame lasts
0.0667 s, so sampling ±0.05 s either side of a boundary can return the **same frame twice** and
score a broken cut a perfect 0.00. Use `select=eq(n\,N)`. A false pass here sends a
dropped-content cut all the way into the master, where `verify_master.py` finally catches it and
the fix costs a full-resolution re-render:

```bash
ffmpeg -y -i out/draft.mp4 -vf "select=eq(n\,5999)" -vsync 0 -frames:v 1 a.png
ffmpeg -y -i out/draft.mp4 -vf "select=eq(n\,6000)" -vsync 0 -frames:v 1 b.png
```

**When a render stops producing output, decide whether it is hung before waiting.** A working
render burns CPU and writes partial movie files; a hung one does neither, and several Manim
constructs hang rather than crash (`manim-traps.md` #16, #28, #30). `ps -p <pid> -o %cpu=` reading
0.0 with no new partial movie files means kill it and bisect against a control scene — never wait
it out, never re-run it unchanged.

### Show the user and stop for approval

**Send `out/draft.mp4` to the user as a file** with `SendUserFile`, so they watch the motion
rather than read your account of it. If file delivery is unavailable, give the exact path and say
it must be watched before Gate 4 begins. A written summary is never a substitute for the video.

With it, state: what you already fixed, which beats you are unsure about, the timecode of the
aha, and that draft resolution is 854×480 @15 fps so only pacing and motion are under review
here — not sharpness, not final type rendering.

Say that the subtitles are a **soft track and may need turning on** — QuickTime, IINA and VLC
show it under their subtitle menu, and a player that ignores soft tracks will show none. Point
at `out/subtitles.srt` beside the video as the fallback, so the wording can still be read.

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
`video-plan.json` and emits both a Manim caption scene and a sidecar `.srt`, each carrying both
languages. It gates the build: a cue with no English line, with English words left in the 中文
line, over the per-aspect line limits, or whose laid-out block would sit on the figure, fails
here rather than in the composite.

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

**Never edit `src/` while a render is running, and never start the master render without
being asked.** Manim imports the modules once at start, so a run finishes with the code it
began with and everything it produced is then stale — three full renders were thrown away
this way in one session. The master costs hours; it is started only on an explicit
instruction, and only from a draft the user has approved.

1. **Never skip an approval stop.** Gates 1, 2 and 3 each end by showing the user the actual
   artifact — the script, the storyboard sheets, the draft video — and stopping the turn. No
   phrasing of the request removes these three stops, and no amount of confidence in the work
   substitutes for the user's yes.
2. **Never claim audio exists.** No TTS, no placeholder voice, no "narration added".
3. **Never invent a DSE reason or a formula.** Verify against the syllabus wording.
4. **Never let the plan and the render disagree.** `video-plan.json` wins; update it first.
5. **Never bake subtitles into lesson scenes.** They live on the caption track.
6. **Never change a colour's meaning** once assigned inside a video, or across a series — and a
   recurring object keeps its pen across the whole series, not just within one video. If the
   median is violet in lesson 1 it is violet in lesson 7, so a student arrives already knowing
   what the colour means. Record the assignment in `brief.md` and reuse it.
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
13. **Never call `Text()` directly.** Use `title()` / `body()` / `label()` / `question_text()` /
    `caption_text()`.
    Pango grid-fits glyph positions to the `font_size` it is handed, so a bare `Text()` gets
    letter spacing that differs from every other string in the video — visible on screen as
    英文字距不一樣. See `references/manim-traps.md` #22.
14. **Never leave a label sitting on a line.** Move it into clear space first — with a hairline
    leader to its point if it must reach one — and halo it only where overlap is genuinely
    unavoidable. `label()` haloes by default. See `references/brand-theme.md`.
15. **Never mix displayed mathematics and words on one frame,** and never write in words what the
    frame could say in mathematics or show by moving. A shot is in one register: equations with
    the figure, or an enumerated list with the figure — the figure is welcome in both, loose
    explanatory sentences in neither. If a beat needs the list and the equation, it is two shots.
    The **question band is the one exemption** — the DSE question is the object being studied,
    not an explanation of it, and it stays up over both registers (rule 23).
    See `references/on-screen-language.md`.
16. **Never mock up a storyboard panel by hand.** Every panel is a Manim still rendered from the
    real scene. A hand-authored SVG is laid out by a different engine, so it looks right exactly
    where the render does not, and the Gate 2 approval it earns binds nothing.
17. **Never leave a symbol un-findable.** Every symbol naming something in the figure wears that
    thing's colour at every occurrence — figure, formula, and every later line — and moves with
    it when it first appears (`mtex_ref()`, `bind_term()`). Never a multi-part expression in one
    ink, even with no figure. Never a colour spent on emphasis: colour names a thing, and
    marking the answer green burns a hue that could have named an angle. For geometry, label
    every quantity the derivation uses **onto** the figure — lengths on their sides, angles as
    coloured arcs — so the student never reads left-and-right.
    **The test:** frozen and printed in black and white, is this frame just a marking scheme? If
    yes, it has no reason to be a video. See `references/on-screen-language.md`.
18. **Never draw a derived quantity before its step.** Only the question's givens are on the
    figure at the start. When `∠CAD = 60°` lands on the right, the arc at `CAD` is drawn and
    labelled `60°` on the left **in the same `play()` call**, on that step's narration beat — not
    earlier, and not in a later play. A figure that already carries every angle before the
    derivation begins is an answer key: nothing to watch, and no way to tell which mark the
    current line just produced. See `references/on-screen-language.md`.
19. **Never leave a corner or a line end square.** Call `soften()` on every figure — Manim's
    default `joint_type=AUTO` is a flat bevel, not a round join, and `cap_style=AUTO` squares off
    line ends. But **never `round_corners()`** on a lesson figure: that replaces each vertex with
    a fillet, so the angle the question is about stops existing. `soften()` changes the finish,
    `round_corners()` changes the mathematics. See `references/brand-theme.md`.
20. **Never import a picture of text, and never `self.add()` it.** Every string on the picture —
    中文, English, `MathTex` alike — is a Manim mobject from a theme helper, and it **enters with
    an animation** at `T_REVEAL`. No `SVGMobject`/`ImageMobject` of a label or formula; `add()` is
    only for state carried over from the previous scene. **The caption track is exempt** on both
    counts: it is a separate track, it may be produced outside Manim, and a cue cuts on rather
    than animating in. See `references/brand-theme.md`.
21. **Never draw an angle arc unless both its arms are visible mobjects in that frame.** An arc
    names the angle between two rays; if one ray is missing the arc floats and names nothing. It
    bites whenever an arm is a **construction line rather than an edge** — `∠PRQ` needs the
    diagonal, not just the sides. Draw the construction thin at the first arc that uses it and
    thicken it at its own derivation beat. Check it per panel at Gate 2: name the two mobjects
    that are each arc's arms. See `references/on-screen-language.md`.
22. **Never diagnose a wrong-looking frame by eye — reverse-project it.** When something renders
    in the wrong place, compute where its coordinates *would* project under each candidate
    transform and compare against the measured pixel. Eyeballing a 480p frame produces confident,
    wrong diagnoses: it produced "the arc is drawn on the wrong side" for what was really a fill
    bug, and cost three failed fixes on a label that turned out to be projected rather than fixed
    in frame. One projection calculation settled each. See `references/manim-traps.md`, The
    pattern.
23. **Never work an example without its question on the frame.** The full question text, in the
    paper's English, from the first shot of the example to the last — the stem always up, the
    current part under it, and only the part changing between shots. A solution shown against a
    question the student cannot read teaches a mechanism with no problem attached, and skips the
    part of the exam that is reading the English. Build it with `Stage.question()`; the band is
    exempt from the ≤ 12 字 budget and from rule 15, and from nothing else.
24. **Never let a draft go out without its subtitle track.** `out/draft.mp4` carries the cues as
    a **soft** `mov_text` stream — never burned in at draft. Burned type at 854×480 is judged on
    a resolution the master does not have, a typo then costs a re-encode, and the reviewer loses
    the ability to turn the words off and look at the picture. `ffprobe -select_streams s` before
    sending it.
25. **Never let a `str.replace()` edit go unasserted.** A non-matching replacement is a silent
    no-op, and a batch script that raises before its `write_text()` discards **every** edit in that
    batch — including the ones that matched. A "deleted" beat survived that way into a render the
    user then reviewed, and the same bug was reported twice. Assert each replacement's match count,
    and re-grep the file afterwards for what should be gone.

## Bundled resources

- `references/brand-theme.md` — the SmartQuest palette, typography, layout and motion grammar.
- `references/browser-tools.md` — the dashboard, the camera picker, the beat review, the
  render driver and the checks. Install at the start of Gate 1.
- `references/3d-geometry.md` — the extra gates a solid-geometry lesson needs.
- `references/manim-traps.md` — the ways Manim renders without an error and is still wrong.
- `references/engines-and-plugins.md` — when ManimGL is allowed, and the verified plugin state.
- `references/on-screen-language.md` — what may appear on the picture, and how to say in
  mathematics what you were about to write as a sentence.
- `references/narration-and-subtitles.md` — the bilingual cue, 書面語 rules, what each language
  line may contain, subtitle format.
- `references/lesson-patterns.md` — how a lesson is sequenced: the hook question, behaviour
  before name, concrete before general, the ponder beat, argument versus illustration.
- `references/pacing.md` — teaching rhythm, dwell times, narration room, checkable limits.
- `references/production-contract.md` — `video-plan.json` schema, folder layout, invariants.
- `scripts/smartquest_theme.py` — importable Manim theme: colours, fonts, layout, helpers.
- `scripts/build_captions.py` — plan → caption scene + `.srt` + pacing report.
- `tools/install.py` — puts the browser tools into a project. Run at the start of Gate 1.
- `tools/render.py` — draft and master renders, stitching, subtitle muxing.
- `tools/serve.py` — the local server the pages need (save-back, Range, long jobs).
- `scripts/check_camera.py` — rejects degenerate 3D camera angles before rendering.
- `scripts/check_framing.py` — projects 3D camera keyframes through a real `ThreeDCamera`:
  frame fill, off-screen elements, caption-band intrusions, and the angle a shot will actually
  render. Seconds to run, and the only honest way to size a 3D shot.
- `scripts/build_storyboard.py` — review sheets from a storyboard manifest.
- `scripts/verify_master.py` — the final quality gate, as a runnable check.
