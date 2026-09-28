# Gate 4 and Gate 5 in Palmier Pro

This is **the** procedure for the picture master and the export. It is not an alternative to
anything: there is no ffmpeg master route in this skill. Gates 1, 2 and 3 are untouched — the
plan, the storyboard, the draft (still an ffmpeg concat with a soft subtitle mux, via
`tools/render.py draft`) and all three approval stops happen as SKILL.md describes, and
`build_captions.py` still runs at Gate 3 and still gates the build.

From Gate 4 on, the scenes go into a Palmier project as **separate clips**, the bilingual
captions as **two live caption tracks**, each knowledge point gets a **chapter marker**, and the
deliverable, `out/final.mp4`, is **exported from Palmier** — by `export_project` when Paco says
export, or by Paco in the app.

## Why Palmier, always

A flat file makes every later change a re-encode of the whole master: a re-rendered shot, a typo
in a cue, a different caption colour. In Palmier the master stays editable — each scene is its
own clip, so a re-rendered shot is a `swap_clip_media` call, and a caption fix is `update_text`
on a caption group. Nothing re-encodes until the export. Paco can trim a hold, nudge a cue or jump
between chapters himself without touching Manim, and a 20-minute concept video is navigable by
knowledge point.

The cost is a dependency: the export has to come out of Palmier, so Palmier has to be running.

## 0. Confirm Palmier Pro is up — or stop

```
manage_project  action: "list"
```

**If it does not answer, stop and ask Paco to open Palmier Pro.** Do not fall back to an ffmpeg
concat, do not burn captions with a caption scene, do not produce any other master. Rendering the
1080p60 scenes while waiting is fine (step 1); assembling anywhere else is not. Say plainly that
Gate 4 is blocked on Palmier and what is ready.

## 1. Render the scenes

Only on Paco's instruction, and only from an approved draft:

```bash
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"   # if TinyTeX is used
manim -r 1920,1080 --fps 60 src/script.py <every scene>
```

Do **not** concat the scenes. Do **not** render `captions.py` to a `.mov` — Palmier draws the
captions live from the sidecar `.srt`, so the caption scene is not needed. The `.srt` that
`build_captions.py` already wrote is the input.

About 39 frames/second at 1080p60 on an M-series Mac. Length is never a reason to cut a scene.

## 2. Create the project and set 60 fps first

```
manage_project  action: "create"  name: "<COURSE>-<nn>-<slug>"  fps: 60  aspectRatio: "16:9"  quality: "1080p"
```

**Set the fps before any clip is placed.** A project left at the default 30 fps will accept the
60p scenes and then discard every second frame on export — every sweep and every `Write` loses
half its motion, and nothing in the UI announces it. If you inherited a project at the wrong
rate, `set_project_settings` rescales existing clip frames, so re-read `get_timeline` before
doing any frame arithmetic afterwards.

`create` takes no path. Read the `.palmier` path back from `manage_project list` — that is the
value `assembly.project` records.

## 3. Import each scene file individually

```
import_media  source: {path: "<abs>/media/videos/script/1080p60/S01Title.mp4"}  folder: "Scenes"
```

**Never import the `1080p60` directory itself.** A directory import is recursive, and Manim
leaves a `partial_movie_files/` tree beside the finished scenes holding hundreds of fragments —
they all land in the library and bury the files that matter.

Local paths are referenced in place, not copied, so the project depends on the render output
staying where it is. Say so when handing over.

## 4. Place the clips back-to-back on one track

Take the frame count from the file, never from its duration:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 <scene>.mp4
```

Manim scene lengths are not whole seconds — a 2099-frame scene is 34.983 s, and
`round(34.983 × 60)` is right only by luck. Accumulate `nb_frames` to get each start frame, and
place the whole batch in one `add_clips` call so it is a single undo step:

```
add_clips entries: [
  {mediaRef: "…", startFrame: 0,    endFrame: 210},
  {mediaRef: "…", startFrame: 210,  endFrame: 2250},
  …
]
```

Order comes from `video-plan.json`. The scenes are silent, so no linked audio clips appear.

Verify the result with `get_timeline`: the track must report no `gaps` key, and `totalFrames`
must equal the sum of the scene frame counts. **Keep the table of start frames** — step 7 places
the chapter markers from it.

## 5. Split the bilingual sidecar into two SRTs

`build_captions.py` writes one `.srt` with both languages in each cue — 中文 first, English
second. A Palmier caption clip carries **one `fontSize` for the whole clip**, so a single track
cannot set the English line at 0.78× the 中文 line. Two tracks can.

```python
import re, pathlib
raw = pathlib.Path('out/subtitles.srt').read_text(encoding='utf-8').strip()
zh, en = [], []
for b in re.split(r'\n\s*\n', raw):
    lines = [l for l in b.split('\n') if l.strip()]
    idx, tc, text = lines[0], lines[1], lines[2:]
    zh.append(f"{idx}\n{tc}\n" + "\n".join(text[:-1]))   # 中文 may be 2 lines
    en.append(f"{idx}\n{tc}\n" + text[-1])               # English is always 1
pathlib.Path('out/subtitles-zh.srt').write_text("\n\n".join(zh) + "\n", encoding='utf-8')
pathlib.Path('out/subtitles-en.srt').write_text("\n\n".join(en) + "\n", encoding='utf-8')
```

The last text line is the English one and everything above it is 中文 — the 中文 line may wrap
to 2 lines in 16:9, the English line never does (`narration-and-subtitles.md` caps it at one).
Print the distribution of text-line counts as you split; anything other than 2 or 3 means the
sidecar is not in the expected shape and the split is unsafe.

Timecodes are copied verbatim, so both tracks stay cue-for-cue aligned with each other and with
the picture.

## 6. Place and style the two caption tracks

```
import_media   source: {path: "<abs>/out/subtitles-zh.srt"}   name: "subtitles-zh"
add_captions   subtitleMediaRef: "<zh asset id>"
update_text    captionGroupId: "<zh group>"
               style: {fontName: "PingFangHK-Semibold", fontSize: 48,
                       color: "#F2F5FC", alignment: "center"}      # dark theme
               transform: {x: 0.5, y: 0.8633}
```

and the same for English at `fontSize: 38`, `y: 0.9245`.

`add_captions` with `subtitleMediaRef` is mutually exclusive with every other parameter, so the
styling is always a second `update_text` call. Each call creates its own new track at index 0,
so add both first, then style by `captionGroupId` — never by track index, which shifts.

Name the tracks (`manage_tracks`, by `trackId`): `Chinese`, `English`, `Scenes`.

### The values, and where they come from

| | 中文 | English |
|---|---|---|
| Font | `PingFangHK-Semibold` | `PingFangHK-Semibold` |
| `fontSize`, 16:9 | 48 | 38 |
| `transform.y`, 16:9 | 0.8633 | 0.9245 |
| Colour, dark theme | `#F2F5FC` | `#F2F5FC` |
| Colour, light theme | `#2A241E` | `#2A241E` |
| Alignment | center, `x: 0.5` | center, `x: 0.5` |

None of these are chosen — they are read out of `scripts/academic_theme.py` so the Palmier cut
matches a Manim-rendered caption track:

- **y** is where `fit_caption()` actually lays the two lines out once the block is anchored at
  `Stage.caption_bottom` (−3.52 in 16:9), converted to Palmier's normalized canvas coordinate
  with `y_norm = (frame_height/2 − y_manim) / frame_height`. Palmier's `transform.y` is the
  **centre** of the text box, not its bottom, which is why the two lines get two separate values
  rather than one band position.
- **fontSize** is the measured ink height of each line divided by 0.885 — the fraction of the em
  box a PingFang 漢字 actually fills. `SIZE_CAPTION 24` measures 42.5 px tall at 1080, giving 48.
- **Colour** is `CAPTION_INK`, which **inverts with the theme**. Read it from the theme after
  `use_light()` / `use_dark()` rather than copying a hex from memory — the plan's `theme` says
  which.

Recompute rather than trust this table if the theme's caption sizes or band ever change:

```bash
python3 - <<'PY'
import sys; sys.path.insert(0,'scripts')
import numpy as np, academic_theme as sq
sq.use_dark()                        # or use_light() — whatever video-plan.json says
from manim import config
st = sq.Stage(); px = config.pixel_height / config.frame_height
cap = sq.fit_caption('中文', [], st.w - 2*st.margin, en='English')
cap.move_to(np.array([0.0, st.caption_bottom + cap.height/2, 0.0]))
for i, s in enumerate(cap.submobjects):
    y = s.get_center()[1]
    print(i, 'y', round((config.frame_height/2 - y)/config.frame_height, 4),
             'fontSize', round(s.height*px/0.885))
print('CAPTION_INK', sq.CAPTION_INK)
PY
```

The theme still carries 9:16 values (portrait `caption_bottom`, portrait caption sizes) inherited
from the fork. **They are not used** — this skill is 16:9 only.

## 7. One chapter marker per knowledge point

A 20-minute concept video is watched by knowledge point: to re-see the aha of the third one, not
to scrub. So every knowledge point gets exactly one marker.

| | |
|---|---|
| Tool | `manage_markers action: "create"` |
| `name` | the knowledge point's **section tag**, verbatim — the same string `Stage.section_tag()` draws (`sectionTitle` in the plan) |
| `startFrame` | the start frame of the knowledge point's **first shot** — its opening shot, not the first shot that shows the tag — taken from step 4's accumulated `nb_frames` table |
| `durationFrames` | `0` — a point marker |
| `status` | leave unset. These are chapters, not review notes; `open`/`review`/`resolved` belong to Paco's review markers |

- The **first shot of a knowledge point** is its opening (rule 31), which carries no tag because
  the term has not yet been bridged. The marker still goes there — a chapter starts where the
  knowledge point starts, and the name tells Paco what it is about even though the frame does not
  yet say it.
- The title card gets no marker of its own; it is 3–4 s before the first chapter.
- Take the frame from the placed clips, not from `start × 60` in the plan. They should agree; if
  they do not, a scene's frame count is off, and that is a verification failure to report, not a
  number to pick between.
- Write the list into `video-plan.json` under `assembly.chapters` (`knowledgePoint`, `name`,
  `firstShot`, `startFrame`) so a resumed session can check the markers against it.

After placing them, `get_timeline` and confirm the marker count equals the number of knowledge
points and every marker sits on a clip boundary.

## 8. Verify on the composite, not on the tool result

```
inspect_timeline  startFrame: <a frame inside an early cue>
```

`add_captions` reporting 97 clips means 97 clips exist, **not** that anything is readable.
Palmier's default caption style is white; the light theme's background is `#FBFBFD`; white on
near-white renders as a caption that is present in the clip list, present in the metadata, and
completely invisible on screen. `manim-traps.md` records the same collision from the other
direction — this is that trap, in a different tool. On the dark theme the default white happens
to read, which is exactly why a skipped `update_text` goes unnoticed until someone chooses the
light field.

Check at minimum:

- one early cue, for colour and position
- the **longest 中文 cue and the longest English cue** in the sidecar, for width overflow and for
  collision with the figure — find them by character count, convert the cue's mid-time to a
  frame, and look
- the last cue, for the tail
- **one frame at each chapter marker**, to confirm it lands on the knowledge point's opening
  shot and not a frame into the previous one

`inspect_timeline` lists the clip ids visible at each frame, so a caption you cannot see but
which appears in that list is a styling fault, not a placement fault.

## 9. Hand over the timeline — Gate 4 ends here

Write the state into `video-plan.json` first, per `references/production-contract.md`:
`assembly.route: "palmier"`, `assembly.project` = the `.palmier` path, `assembly.chapters`,
`captions.burnedIn: false`, `captions.track: null`, and `status: "awaiting-export"`.

Then tell Paco, in one message:

- the project path, and that the scene clips reference the render output in place
- the track layout — `Scenes`, `Chinese`, `English` (and `Voice` if one was asked for)
- the chapter list with timecodes
- total duration and frame count
- which frames you actually inspected
- that the project is still open in the session, so it needs saving in the app

Then stop. Approving the timeline is **not** an instruction to export.

## 10. Export — only on Paco's word (Gate 5)

Export when Paco explicitly says so ("export", "出片", "export 吧"). Nothing else authorises it —
not approving the timeline, not "looks good", not the end of a session. If he says he will
export it himself, wait for the path.

```
export_project  mode: "video"  codec: "H.264"  resolution: "1080p"
                outputPath: "<project>/out/final.mp4"
```

`<project>` is the video's project root (`~/academic-videos/<COURSE>/<nn>-<slug>/`), not the
`.palmier` package. The call returns a `jobId` and `status: started` or `queued`; it does not
wait. Poll:

```
manage_exports  action: "list"
```

until that `jobId` reports finished, and read its warnings and result — a warning is reported
to Paco, not skipped. **Never decide an export is stuck from elapsed time alone**, and never
cancel one he did not ask to cancel; the only self-initiated cancel is undoing an export just
queued with wrong settings.

The export renders the caption tracks into the picture, so `out/final.mp4` has the captions
burned in (and the `Voice` track mixed in, if there is one).

If Paco exports by hand, ask him to use the same settings — H.264, 1080p, **60 fps** (Match
Timeline on a 60 fps project) — and to save to `out/final.mp4`, or take the path he gives.

## 11. Verify the exported file

```bash
python3 scripts/verify_master.py --plan video-plan.json --master out/final.mp4 \
  --scene-dir media/videos/script/1080p60
```

Add `--require-audio` **only** when a voice track was asked for (then `narration.status` must be
`audio-received`). A silent video run with it fails for the right reason: there is no audio.

The checks are the same whoever pressed export, and an export is exactly where a wrong preset —
30 fps, a stray letterbox, a caption track left hidden — gets introduced. Report what the
verifier measured, with **its** thresholds (rule 35), then confirm by eye as SKILL.md Gate 5
lists. Set `"status": "delivered"` only after the exported file has passed.

**Never call a timeline a delivered video.** Until an exported file has passed
`verify_master.py`, the state is `awaiting-export` — however finished the timeline looks.

## Optional: a voice track — only when asked

The default is silent: the captions carry the explanation. If Paco asks for a voice on this
video, it goes in at Gate 4 as one more track; nothing about the picture changes.

1. Generate with the `edge-tts` skill, from the plan's cues (the 中文 `text`, or the `en` line if
   he asks for English), **one file per shot or per knowledge point**, into `audio/voice/`. Never
   local CosyVoice — see `sound-and-voice.md`.
2. Import each file individually and place it with `add_clips` on its own audio track at the
   start frame of the shot (or knowledge point) it belongs to — the same frames as step 4's
   table. Name the track `Voice`.
3. **Never re-time the picture to the voice.** If a file runs longer than its slot, shorten the
   line or split it across cues in the plan and regenerate; do not stretch a clip, add a hold, or
   let the voice run over the next shot.
4. Record it in the plan: `narration.source: "edge-tts"`, the voice name, `narration.media:
   "audio/voice/"`, and `narration.status: "audio-received"` once every file is placed.
5. `inspect_timeline` shows pictures, not sound, and there is no loudness check in the pipeline.
   Check with `ffprobe` that every file fits its slot, and ask Paco to listen to the first file
   and one mid-video file in Palmier before he says export — say that nobody has heard it yet.

Music follows the same rule: only when asked, on its own track, under the voice if there is one.

## What Palmier does not have

**No transition tool.** There is no dissolve, wipe or transition primitive — a transition is
built by hand from clip overlap plus `set_clip_properties` fades.

This matters because a real cross dissolve needs the two clips to overlap in time, which means
every clip after the join moves earlier by the transition length, which **desynchronises the
`.srt` sidecar**, the chapter markers after it, and any voice clips.

So: do not add transitions on your own initiative (rule 33). If Paco asks for one, put the choice
to him explicitly, because the two answers cost different things:

| | What it does | What it costs |
|---|---|---|
| **Cross dissolve** | The two clips genuinely overlap | Everything downstream shifts; the sidecar timings, the chapter frames and any voice placement must be regenerated |
| **Fade through background** | `fadeOutFrames` on the outgoing clip, `fadeInFrames` on the incoming one | Nothing moves; the picture passes through the background colour mid-join |

Look at the two frames either side of the join before recommending one. A scene here usually ends
on a static hold, so the tail frames are free to overlap without losing animation — and where the
two scenes share a construction in the same position, a cross dissolve reads as a match dissolve
and is worth the re-timing. Where they share nothing, the fade is as good and costs nothing.

**Joins declared in the plan.** `transitions.py` builds the plan's `"join": "dissolve"` joins
for the **Gate 3 draft only** — a no-overlap dissolve that fades the incoming shot's first frame
over the outgoing tail. That dissolve was seen and approved in the draft, so it is not "unasked";
but Palmier has no primitive that reproduces it, and no equivalent has been built or measured.
At Gate 4, name each declared dissolve, say it will be a hard cut in the master unless Paco picks
one of the two options above, and let him choose.

## Coming back with changes

| Change | What to do | What does **not** happen |
|---|---|---|
| One shot re-rendered, same frame count | `swap_clip_media` on that clip | No other clip moves; nothing re-encodes |
| A cue's wording | Fix `video-plan.json`, re-run `build_captions.py`, re-split, replace that caption group | The picture is untouched |
| Caption colour or size | `update_text` on the `captionGroupId` | Both tracks stay aligned |
| A shot's length changed | Re-render, then re-place from that clip onward — regenerate the sidecar, move every chapter marker and voice clip after it | The earlier clips are unaffected |
| A section tag reworded | Re-render that knowledge point's shots, `swap_clip_media`, and `manage_markers update` the marker's `name` | Nothing moves |

A re-rendered shot whose frame count changed is the one case that ripples. Check `nb_frames`
against the clip's current length before swapping, and if it differs, re-derive every start
frame after it rather than nudging clips by hand.

**Any change after an export makes that export stale.** Set the status back to
`awaiting-export`; the new file is exported (on Paco's word) and verified again before it is
`delivered`.
