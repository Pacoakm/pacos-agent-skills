# Palmier Pro MCP — call shapes, stored fields, traps

Learned over six sessions on the 0824, Alex and Antony reels. Schemas change between app versions:
load them with ToolSearch and trust the schema over this file when they disagree.

## Contents

1. Connection and session
2. Reading state
3. Media
4. Placing clips and tracks
5. Transforms and coordinates
6. Keyframes
7. Text
8. Captions
9. Audio
10. Colour and effects
11. Looking at the result
12. Export
13. Errors seen, and what caused them
14. Shell traps on this Mac

---

## 1. Connection and session

- The app hosts an HTTP MCP server at `http://127.0.0.1:19789/mcp`. Its tools are deferred: load them
  with `ToolSearch` ("palmier", or `select:` a list) before calling. After an app restart the prefix can
  change (`mcp__palmier-pro__*` → `mcp__Palmier_Pro__*`); search again.
- If the session started while the app was down, the tools never load (ConnectionRefused). Restarting
  the session after the app is up is the only fix — don't probe the port.
- `manage_project` actions are `list`, `open`, `create`, `close` — there is no `save` (`close` saves).
  Open by `path`. The session is **bound to one project**: when the user brings another project to the
  front, calls fail with "This session is on 'alex', but 'Palmier Sample' is active… call manage_project
  with action='open'". Reopen by path; never edit a different project than the one asked for.
- `get_timeline` reports `canGenerate`. It has been `false` on every reel: `generate_image`/`video`/
  `audio` need a signed-in account with credits, even though `list_models` lists models.

## 2. Reading state

- `get_timeline` — fps, size, tracks (stable `trackId`, current index, `gaps`), clips. Defaults are
  omitted (centerX 0.5, speed 1, "smooth"). `{startFrame, endFrame}` windows it (never zero-width);
  `{captionDetail: true}` expands caption groups into `[clipId, start, end, text]` rows.
- `get_transcript` — words as `[index, word, frame]` in **project frames**, already mapped through
  trims; `{granularity: "segments"}` for cheap reading. Word-timing gaps are the user's jump cuts.
- `inspect_media {mediaRef, overview: true}` — tiles + transcription of a *source*;
  `{mediaRef}` on an image asset returns the image (how capture PNGs are viewed).
- On disk, `<name>.palmier/project.json` + `media.json` are the whole project — but written on save,
  not per MCP edit. For a fresh copy: `export_project {mode: "palmier", outputPath: <scratch>}` (it
  copies the media — delete it after). Another project's exact values can be read from its JSON.

## 3. Media

- `import_media {source: {path}, folder, name}` **references the file in place**. Moving, renaming or
  overwriting it breaks or silently changes the project (Antony's source in `~/Downloads` was
  overwritten by an export). A directory path imports recursively and mirrors its folders; passing
  `folder: "Cards"` for a directory named Cards gives `Cards/Cards`.
- `source: {url}` downloads in the background — poll `get_media {ids}` until ready.
  `source: {matte: {hex, aspectRatio}}` makes a solid PNG, project-shaped only.
- Decodes: H.264, ProRes 422 10-bit (HLG preserved), PNG/JPG/HEIC, WAV/MP3. **HEVC Main 10 imports as
  "ready" with working audio but renders black.** VP9 fails ("Could not render the frame: Cannot Open").
- **Media is cached by path**: a rebuilt card written to the same file kept showing the old picture.
  Write changed assets under a new name and swap.
- `swap_clip_media {clipId, mediaRef}` replaces the media and keeps timing, transform, rounding, fades,
  keyframes, effects, grade and the linked audio (returned in `affectedClipIds`). It swapped images,
  every BGM change, the voice stem, and Antony's A-roll to its HLG original.
- `organize_media {deletes: [ids], moves: [{items, into}], renames: [{item, name}]}`.

## 4. Placing clips and tracks

- `add_clips {entries: [{mediaRef, startFrame, endFrame, trackIndex?, source?: [inSec, outSec],
  includeAudio?: false}]}`. Without `trackIndex` each call makes a **new top video track** (or a new
  bottom audio track). Images default to 5 s but take any `endFrame`; an audio `endFrame` past the
  source fails ("endFrame spans 24 frames but the source is only 23"). An image lands fitted to the
  canvas width (480×320 → height 0.375) — set the real transform after.
- Index 0 composites on top. Adds and removes shift indexes ("Track indices shifted — re-read
  get_timeline"); `remove_clips` deletes a track it empties. Use `trackId`s for track operations.
- `manage_tracks {set: [{trackId, name, muted}], reorder: [{trackId, to}]}`.
- `move_clips {moves: [{clipId, toFrame}]}` or `{clipId, toTrack}`; `set_clip_properties {clipIds,
  durationFrames}` trims the length and keeps the start. Overlapping text needs separate tracks.

## 5. Transforms and coordinates

- 0–1 canvas coordinates, origin top-left.
- `set_clip_properties {clipIds: [...], transform: {centerX, centerY, width, height}}` — **centre**
  anchored; width/height are fractions of the canvas and may exceed 1 (the Alex plate at 1.15). It has
  no `x`/`y`.
- Text is different: `add_texts`/`update_text` `transform {x, y}` — `y` is the box's vertical centre,
  `x` is the **aligned edge** (left edge for `left`, centre for `center`, right edge for `right`).
  `project.json` stores the auto-fit box as centerX/centerY/width/height either way.
- `crop {left, top, right, bottom}` trims the **rendered box**; it doesn't refill it — a 9:16 clip
  cropped to 3:2 became a thin strip. Pre-cut in ffmpeg (`make_card.py`) and place uncropped.
- Undistorted placement: `height = width × (sourceH / sourceW) × 1080 / 1920`.
- `edgeRounding` 0–1 of half the shorter edge: 0.06 cards, 0.12 panels, 1.0 circle on a square.

## 6. Keyframes

`set_keyframes {clipId, property, keyframes: [[frame, ...values, interp]]}` replaces that property's
track. Frames are **clip-relative**; `interp` ∈ `linear | hold | smooth` (default smooth) and governs
the segment *leaving* the key. Values come back rounded to 3 dp.

| Property | Row | Meaning |
|---|---|---|
| `scale` | `[f, w, h]` | normalized **size** (1.0 = canvas), not a factor |
| `position` | `[f, x, y]` | the **top-left corner** |
| `volumeDb` | `[f, dB]` | −60…+15 |
| `opacity`, `rotation`, `crop`, `blur` | see schema | |

Scale alone grows from the top-left toward the bottom-right, so **always key position with scale**:

- centred zoom about (cx, cy): `x = cx − s/2`, `y = cy − s/2` (Alex, cx 0.53, cy 0.43)
- headroom-keeping punch: `x = (1 − s) × 0.5`, `y = (1 − s) × 0.3` (Antony — crops the hands, not the hair)
- chapter punches: `linear` inside a chapter, `hold` on its last frame, next chapter's scale on the
  following frame → a snap on the jump cut. Every value must keep the canvas covered
  (`timeline_audit.py` checks).

Setting a static `volumeDb`, `opacity`, rotation or crop with `set_clip_properties` clears that
property's keyframes.

## 7. Text

- `add_texts {entries: [{startFrame, endFrame, content, animation, trackIndex?, transform: {x, y},
  style}]}`. `\n` breaks lines, but one clip per line lets each line cue on its word.
- Style fields: `fontName` (PostScript), `fontSize` (12–300 canvas points ≈ 2.07 px each), `fontCase`,
  `tracking`, `lineSpacing`, `color` (`#RRGGBB` or `#RRGGBBAA`), `alignment`, `outline {enabled,
  color, width}`, `shadow {enabled, color, opacity, blur, offset {x, y}}`, `background {enabled, color,
  opacity, cornerRadius, padding {x, y}}`, `strikethrough`, `bold`, `widthScale`.
- Stored as: `outline` → `border`, padding → `paddingX/paddingY`, `strikethrough` → `isStruckThrough`,
  colours → RGBA floats.
- **`background.enabled: true` or nothing is drawn** — colour, radius and padding can all be stored on
  a clip with no plate. Check the flag, not the block.
- Style patches merge; omitted fields keep their values.
- **`update_text` with several `clipIds` and a `content` writes the same text into every one** (three
  badges all became `01 / 03`). Set content one clip per call.
- The box auto-fits and is far taller than the glyphs; a pill fills its whole box — see
  `style-system.md` §2 for measured heights. Left-aligned pills sit off-centre (trailing tracking).
- Animations: `popIn`, `slideUp`, `typewriter`, `wordReveal`, `wordSlide`, `highlightPop`,
  `highlightBlock`, `off`. `perWordFrames` is 6 and not settable.

## 8. Captions

- `add_captions {language: "en-US", maxWords: 4, maxCharacters: 26, animation, highlightColor, style,
  transform: {x: 0.5, y: <caption line>}, trackIndex?}` transcribes (cloud when there are credits,
  otherwise local) and makes one caption group on a new top track. `subtitleMediaRef` (an imported
  .srt) excludes every other parameter.
- Restyle the whole group with `update_text {captionGroupId, style | transform | animation |
  highlightColor}`. A caption group id is not a clip id — `set_clip_properties` on it says "Clip not
  found".
- Per-caption edits need the clip ids from `get_timeline {captionDetail: true, startFrame, endFrame}`.
  Changing a caption's `content` returns "Content change cleared word timings… karaoke highlighting falls
  back to plain text there".
- Suppress captions under the hook and the CTA by `remove_clips` on those caption clips.
- Output is US-spelled and mishears names — read every clip.

## 9. Audio

- `set_clip_properties {clipIds, volumeDb, fadeInFrames, fadeOutFrames}`; `project.json` stores linear
  `volume` (0.0794 = −22 dB). Fades are per clip and don't reach linked media — address the A-roll's
  nested audio id separately.
- A bed shape: `set_keyframes {property: "volumeDb", keyframes: [[0,-60,"linear"],[18,-22],[80,-26.5],
  [2090,-26.5],[2150,-23],[2320,-23],[2344,-60,"linear"]]}` (Alex final).
- Mute the camera audio twice over when a Voice stem exists: `volumeDb −60` on the linked audio and
  `manage_tracks {set: [{trackId, muted: true}]}` on Dialogue.
- `denoise_audio`, `detect_beats`, `remove_silence` exist; the voice was processed in ffmpeg instead,
  where it can be measured (`voice_chain.py`).

## 10. Colour and effects

- `apply_color {clipIds, …}` merges knobs: `exposure, contrast, highlights, shadows, blacks, whites,
  saturation, vibrance, temperature (6500 = neutral), tint, shadowsHue/Amount, highsHue/Amount`, curves,
  `hueCurves`, `lut`. `{clipIds, reset: true}` returns to neutral.
- `apply_effect {clipIds, effects: [{type, params}]}` merges by type: `detail.clarity {clarity,
  dehaze}`, `blur.sharpen {amount}`, `stylize.vignette {amount, midpoint, roundness, feather}`,
  `stylize.grain`, `blur.noiseReduction`, …
- `inspect_color {clipId, atFrame}` reports luma/saturation/clipping — on HLG media these are **raw code
  values**, not what a display shows.

## 11. Looking at the result

| | `inspect_timeline {startFrame[, endFrame, maxFrames ≤ 12]}` | `capture_frame {timelineFrame, name}` |
|---|---|---|
| Gives | 288×512 composite + the visible clip ids, top-down | full 1080×1920 PNG |
| Leaves behind | nothing | a media asset + `<project>.palmier/media/frame-XXXX.png` (hex ≠ mediaRef; take the newest by mtime) |
| Good for | layout, what is on screen, sweeps | pixel measurement, touching vs overlapping, colour |

Clean up captures with `organize_media {deletes}`. A `popIn` caught in its first ~8 frames looks
broken — sample later. A 0.25 s typewriter or a 1-frame overlap won't show at 288×512.

## 12. Export

`export_project {mode, codec, resolution, outputPath, overwrite, timelineId}` — asynchronous, returns a
`jobId`; follow it with `manage_exports {action: "list"}`.

| Asked for | What you get |
|---|---|
| `codec: "H.264"` | 8-bit BT.709 `.mp4`; an HLG timeline is tone-mapped — the SDR fallback |
| `codec: "H.265"` | **must** be `.mp4` ("H.265 exports must use .mp4"), and comes out **HEVC Main 8-bit BT.709** |
| `codec: "ProRes"` | ProRes 422 10-bit `.mov`, PCM; colour tags follow the source — HLG stays HLG |
| `mode: "palmier"` | a self-contained project package (media copied) — the audit snapshot |

- **`overwrite` defaults to true.** Always pass `false` and a new versioned path. Omitting `outputPath`
  writes into `~/Downloads`, where the sources live — don't.
- The user's own export dialog offers **HEVC 10-bit HDR / QuickTime** directly; the MCP can't. Either
  ask them to export with it, or ProRes + ffmpeg (`picture-and-delivery.md`).
- Start an export only after the last open decision; one went stale when the music changed minutes later.

## 13. Errors seen, and what caused them

| Message / symptom | Cause |
|---|---|
| "Unknown project action 'save'" | no save action; `close` saves |
| field rejected: `operation`, `clipId`, `endFrame`, transform `x`/`y` on `set_clip_properties`, `frame` on `capture_frame`, `timelineId` on `get_timeline` | guessed parameters — load the schema |
| "Clip not found" | a captionGroupId passed as a clip id |
| "This session is on 'X', but 'Y' is active" | the user switched projects; reopen by path |
| "endFrame spans N frames but the source is only M" | audio clip longer than its file |
| "Could not render the frame: Cannot Open" | undecodable media (VP9) |
| black picture, audio fine | HEVC Main 10 source |
| old image after rebuilding a card | media cached by path |
| three clips show the same text | `update_text` content with several clipIds |
| "H.265 exports must use .mp4" | MCP H.265 route; it is 8-bit SDR anyway |

## 14. Shell traps on this Mac

- zsh doesn't word-split unquoted variables, and an unmatched glob aborts the command
  (`rm *.mov` → "no matches found"); use explicit paths or `find`.
- The working directory resets between calls — use absolute paths.
- Foreground `sleep` is blocked: wait for renders/exports with `run_in_background` or Monitor, or poll
  `manage_exports`.
- Add `-nostats` to long ffmpeg runs; never probe a file that is still being written ("moov atom not
  found"). `h264_videotoolbox` transcodes ~8× faster than libx264 when quality allows.
- This ffmpeg has no `drawtext`, `subtitles`/`ass`, `zscale`, `libplacebo` or `rubberband`; it has
  libx265, hevc_videotoolbox, prores_ks, loudnorm, ebur128, afftdn, deesser. Python has numpy, scipy,
  Pillow — not librosa or cv2. `yt-dlp` runs as `uvx yt-dlp`.
