# Assembling the picture master in Palmier Pro

An alternative to the `ffmpeg concat` + `overlay` route in Gate 4, for when the user has
**Palmier Pro** installed with its MCP server running. Gates 1, 2 and 3 are untouched: the
plan, the storyboard, the draft and all three approval stops happen exactly as before, and
`build_captions.py` still runs at Gate 3 and still gates the build.

What changes is only the last assembly step. Instead of flattening the scenes into
`out/picture.mp4` and burning the caption track into `out/picture-subbed.mp4`, the scenes go
into a Palmier project as **separate clips** with the subtitles as **live caption tracks**, and
the user exports by hand from the app.

## Why this route exists

The ffmpeg route produces one flat file. Every later change — a re-rendered shot, a typo in a
cue, a different caption colour — costs a re-encode of the whole master.

In Palmier the master stays editable: each scene is its own clip, so a re-rendered shot is a
`swap_clip_media` call, and a subtitle fix is `update_text` on a caption group. Nothing
re-encodes until the user exports. The teacher can also trim a hold or nudge a cue themselves
without touching Manim.

The cost is that the deliverable is no longer produced by us. **The export is the user's
manual action** — we prepare the timeline and stop.

## When to take it

Take this route when **both** are true:

- `manage_project` with `action: "list"` answers — the MCP server is up.
- The user has not asked for a flat file specifically.

If the MCP server is not reachable, do not ask the user to start it and do not wait: fall
straight through to the ffmpeg route in SKILL.md Gate 4 and say which route you took. A
missing editor is not a reason to stall a finished picture.

Say which route you are on **before** you start assembling, because the two end differently:
one hands over `out/picture-subbed.mp4`, the other hands over an open project.

## The procedure

### 1. Render the scenes exactly as before

Unchanged from Gate 4 — same command, same 1080p60, same layout tokens:

```bash
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"   # if TinyTeX is used
manim -r 1920,1080 --fps 60 src/script.py <every scene>
```

Do **not** run the concat. Do **not** render `captions.py` to a `.mov` — Palmier draws the
captions live from the sidecar `.srt`, so the caption scene is not needed on this route. The
`.srt` that `build_captions.py` already wrote is the input.

### 2. Create the project and set 60 fps first

```
manage_project  action: "create"  name: "<lesson-slug>"  fps: 60  aspectRatio: "16:9"  quality: "1080p"
```

**Set the fps before any clip is placed.** A project left at the default 30 fps will accept the
60p scenes and then discard every second frame on export — every sweep and every `Write` loses
half its motion, and nothing in the UI announces it. If you inherited a project at the wrong
rate, `set_project_settings` rescales existing clip frames, so re-read `get_timeline` before
doing any frame arithmetic afterwards.

### 3. Import each scene file individually

```
import_media  source: {path: "<abs>/media/videos/script/1080p60/S01Hook.mp4"}  folder: "Scenes"
```

**Never import the `1080p60` directory itself.** A directory import is recursive, and Manim
leaves a `partial_movie_files/` tree beside the finished scenes holding hundreds of fragments —
they all land in the library and bury the 20-odd files that matter.

Local paths are referenced in place, not copied, so the project depends on the render output
staying where it is. Say so when handing over.

### 4. Place the clips back-to-back on one track

Take the frame count from the file, never from its duration:

```bash
ffprobe -v error -select_streams v:0 -show_entries stream=nb_frames -of csv=p=0 <scene>.mp4
```

Manim scene lengths are not whole seconds — a 2099-frame scene is 34.983 s, and
`round(34.983 × 60)` is right only by luck. Accumulate `nb_frames` to get each start frame, and
place the whole batch in one `add_clips` call so it is a single undo step:

```
add_clips entries: [
  {mediaRef: "…", startFrame: 0,    endFrame: 2040},
  {mediaRef: "…", startFrame: 2040, endFrame: 2519},
  …
]
```

Order comes from `video-plan.json`, the same order `out/concat.txt` would have had. The scenes
are silent, so no linked audio clips appear — the narration track is added at Gate 5.

Verify the result with `get_timeline`: the track must report no `gaps` key, and `totalFrames`
must equal the sum of the scene frame counts.

### 5. Split the bilingual sidecar into two SRTs

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

### 6. Place and style the two caption tracks

```
import_media   source: {path: "<abs>/out/subtitles-zh.srt"}   name: "subtitles-zh"
add_captions   subtitleMediaRef: "<zh asset id>"
update_text    captionGroupId: "<zh group>"
               style: {fontName: "PingFangHK-Semibold", fontSize: 48,
                       color: "#2A241E", alignment: "center"}
               transform: {x: 0.5, y: 0.8633}
```

and the same for English at `fontSize: 38`, `y: 0.9245`.

`add_captions` with `subtitleMediaRef` is mutually exclusive with every other parameter, so the
styling is always a second `update_text` call. Each call creates its own new track at index 0,
so add both first, then style by `captionGroupId` — never by track index, which shifts.

Name the tracks (`manage_tracks`): `Chinese`, `English`, `Scenes`.

#### The values, and where they come from

| | 中文 | English |
|---|---|---|
| Font | `PingFangHK-Semibold` | `PingFangHK-Semibold` |
| `fontSize`, 16:9 | 48 | 38 |
| `transform.y`, 16:9 | 0.8633 | 0.9245 |
| Colour, light theme | `#2A241E` | `#2A241E` |
| Colour, dark theme | `#F2F5FC` | `#F2F5FC` |
| Alignment | center, `x: 0.5` | center, `x: 0.5` |

None of these are chosen — they are read out of `scripts/smartquest_theme.py` so the Palmier
cut matches a Manim-rendered caption track:

- **y** is where `fit_caption()` actually lays the two lines out once the block is anchored at
  `Stage.caption_bottom` (−3.52 in 16:9), converted to Palmier's normalized canvas coordinate
  with `y_norm = (frame_height/2 − y_manim) / frame_height`. Palmier's `transform.y` is the
  **centre** of the text box, not its bottom, which is why the two lines get two separate values
  rather than one band position.
- **fontSize** is the measured ink height of each line divided by 0.885 — the fraction of the em
  box a PingFang 漢字 actually fills. `SIZE_CAPTION 24` measures 42.5 px tall at 1080, giving 48.
- **Colour** is `CAPTION_INK`, which **inverts with the theme**. Read it from the theme after
  `use_light()` / `use_dark()` rather than copying a hex from memory.

Recompute rather than trust this table when the format is not 1080p 16:9:

```bash
python3 - <<'PY'
import sys; sys.path.insert(0,'scripts')
import numpy as np, smartquest_theme as sq
sq.use_light()                       # or use_dark()
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

For 9:16 the theme gives `caption_bottom` −2.6 and line centres at **y 0.7566** and **0.8119**,
with ink heights of 62.7 px and 50.1 px on the 1920-tall canvas. The corresponding `fontSize`
depends on what Palmier treats as a canvas point in a portrait project, which has **not** been
verified — measure it on screen with `inspect_timeline` before trusting a number there.

### 7. Verify on the composite, not on the tool result

```
inspect_timeline  startFrame: <a frame inside an early cue>
```

`add_captions` reporting 97 clips means 97 clips exist, **not** that anything is readable.
Palmier's default caption style is white; the SmartQuest light theme's background is `#FBFBFD`;
white on near-white renders as a caption that is present in the clip list, present in the
metadata, and completely invisible on screen. `manim-traps.md` #593 records the same collision
from the other direction — this is that trap, in a different tool.

Check at minimum:

- one early cue, for colour and position
- the **longest 中文 cue and the longest English cue** in the sidecar, for width overflow and for
  collision with the diagram — find them by character count, convert the cue's mid-time to a
  frame, and look
- the last cue, for the tail

`inspect_timeline` lists the clip ids visible at each frame, so a caption you cannot see but
which appears in that list is a styling fault, not a placement fault.

### 8. Hand over — the export is the user's

Do not export. `export_project` exists, but on this route the point is that the user owns the
final encode: they choose the preset, watch it, and re-export after any change they make
themselves.

Write the route into `video-plan.json` first, per `references/production-contract.md`:
`assembly.route: "palmier"`, `assembly.project` = the `.palmier` path, `captions.burnedIn:
false`, `captions.track: null`, and `status: "awaiting-user-export"`.

Then tell them, in one message:

- the project path, and that the scene clips reference the render output in place
- the track layout — `Scenes` on V1, `Chinese` on V2, `English` on V3
- total duration and frame count
- which frames you actually inspected
- that the project is still open in the session, so it needs saving in the app

Then stop. The lesson is `awaiting-user-export`.

## What Palmier does not have

**No transition tool.** There is no dissolve, wipe or transition primitive — a transition is
built by hand from clip overlap plus `set_clip_properties` fades.

This matters because a real cross dissolve needs the two clips to overlap in time, which means
every clip after the join moves earlier by the transition length, which **desynchronises the
`.srt` sidecar** — and that sidecar is the same one the teacher will record against at Gate 5.

So: do not add transitions on your own initiative. If the user asks for one, put the choice to
them explicitly, because the two answers cost different things:

| | What it does | What it costs |
|---|---|---|
| **Cross dissolve** | The two clips genuinely overlap | Everything downstream shifts; the sidecar timings must be regenerated |
| **Fade through background** | `fadeOutFrames` on the outgoing clip, `fadeInFrames` on the incoming one | Nothing moves; the picture passes through the background colour mid-join |

Look at the two frames either side of the join before recommending one. A SmartQuest scene
usually ends on a static hold, so the tail frames are free to overlap without losing animation —
and where the two scenes share a construction line in the same position, a cross dissolve reads
as a match dissolve and is worth the re-timing. Where they share nothing, the fade is as good
and costs nothing.

`transitions.py` and the joins declared in `video-plan.json` are for the ffmpeg route. On the
Palmier route the joins live in the timeline instead, and `assembly.route` is what records that.

## Coming back with changes

| Change | What to do | What does **not** happen |
|---|---|---|
| One shot re-rendered | `swap_clip_media` on that clip | No other clip moves; nothing re-encodes |
| A cue's wording | Fix `video-plan.json`, re-run `build_captions.py`, re-split, replace that caption group | The picture is untouched |
| Caption colour or size | `update_text` on the `captionGroupId` | Both tracks stay aligned |
| A shot's length changed | Re-render, then re-place from that clip onward — and regenerate the sidecar | The earlier clips are unaffected |

A re-rendered shot whose frame count changed is the one case that ripples. Check `nb_frames`
against the clip's current length before swapping, and if it differs, re-derive every start
frame after it rather than nudging clips by hand.

## Gate 5 from here

Gate 5 is unchanged in substance, but its input is the file **the user exported**, not
`out/picture-subbed.mp4`. Ask for the exported path, and run `verify_master.py` against that
file — the checks are the same, and a manual export is exactly the kind of step where a wrong
preset (30 fps, a stray letterbox, a missing caption track) gets introduced.

Never describe the lesson as delivered on the strength of a timeline. Until the user has
exported and the export has passed the final quality gate, the state is `awaiting-user-export`.
