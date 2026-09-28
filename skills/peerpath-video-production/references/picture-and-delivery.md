# Picture and delivery — sources, grade, moves, export

## 1. Sources

| Reel | File handed over | What it really was | What Palmier needed |
|---|---|---|---|
| 0824 | `0824.mov` | HEVC Main 10, **SDR** BT.709, AAC | 8-bit H.264 (Main 10 renders black) |
| Alex | `Alex.mp4` | HEVC Main 10, **HLG HDR** + Dolby Vision, AAC 111 kbps | an 8-bit H.264 copy was used — it kept HLG tags on 8 bits |
| Antony | `antony.mp4` | 8-bit H.264 SDR — an **HLG→SDR conversion** of `antony-raw.mov` | the ProRes 422 10-bit HLG original with 24-bit PCM, found only after v7 |

So: probe everything (`probe_source.py --loudness --md5`), expect iPhone HLG, and ask for the raw
file when a lossy SDR copy has a same-length 10-bit twin.

Transcodes (the script prints the right one):

```bash
# HDR (HLG) HEVC Main 10 → ProRes 422 10-bit, tags carried — edits and exports as HLG
ffmpeg -i IN -map 0:v:0 -map 0:a:0 -c:v prores_ks -profile:v 2 -pix_fmt yuv422p10le \
  -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc -c:a pcm_s24le OUT.mov
# SDR HEVC Main 10 → H.264 8-bit (h264_videotoolbox -b:v 24M is ~8× faster when time matters)
ffmpeg -nostats -i IN -c:v libx264 -crf 15 -preset slow -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart OUT.mp4
```

Sources stay where the user put them unless they agree to move them into `~/PeerPath/` — the project
references them in place. Write the intake MD5 into the plan; check it again before any master render.

## 2. Grade

- **On an HLG source: neutral.** Antony v8 after `apply_color {reset: true}`: `detail.clarity`
  clarity 0.12 / dehaze 0, `blur.sharpen` 0.30, `stylize.vignette` 0.15 (midpoint 0.55, roundness 0.2,
  feather 0.65). Measured after: 0 % highlight clipping.
- **Never stack a look on a conversion.** Antony v1–v7 carried contrast 1.12, highlights −0.18,
  vibrance +0.12, saturation 1.04, temperature 6250, dehaze 0.12 on top of an SDR file that already had
  the conversion's contrast and saturation — the skin went orange. The fix was the source, not the grade.
- A still used full-screen behind text once needed a legibility grade (exposure −0.55, saturation 0.82,
  shadows −0.12 pushed to hue 220) — not needed now that nothing is full-screen.
- `inspect_color` on HLG reads raw code values; judge HLG by eye in QuickTime, or on Palmier's H.264
  (tone-mapped) export. This ffmpeg can't tone-map HLG (no `zscale`; `colorspace` rejects
  `arib-std-b67`).

## 3. Moving the picture

Graphics are separate clips, so moving the A-roll never moves the layout.

**Push-in to open the graphics zone (Alex).** Framed too wide, head at y 0.27–0.68: the plate went to
`transform {centerX 0.53, centerY 0.43, width 1.15, height 1.15}` — head 0.16–0.60, chest free for
the slot. Emphasis keyframes on top, every value ≥ the static 1.15 so no edge can show:

| Frames | Scale | Beat |
|---|---|---|
| 0 → 76 | 1.22 → 1.15 | opens tight on the hook |
| 1190 → 1200 → 1233 → 1252 | 1.15 → 1.22 → hold → 1.15 | punch on the struck script |
| 1530 → 1560 → 1655 → 1690 | 1.15 → 1.24 → hold → 1.15 | the question and the mentor payoff |
| 2100 → 2130 → end | 1.15 → 1.20 → hold | CTA |

Position with every scale key: `x = 0.53 − s/2`, `y = 0.43 − s/2`.

**Chapter punches on jump cuts (Antony).** Each chapter between two cuts gets its own scale and drifts
slowly inside it (`linear`), then `hold` on its last frame so the next chapter snaps on the cut.
Position `x = (1 − s) × 0.5`, `y = (1 − s) × 0.3` — the bias crops the hands, not the hairline.

| Chapter | Frames | Scale |
|---|---|---|
| Hook | 0–119 | 1.000 → 1.030 |
| Intro | 120–232 | 1.085 → 1.100 |
| Tip 1 | 233–575 | 1.010 → 1.045 |
| Tip 2 | 576–768 | 1.090 → 1.065 |
| Tip 3 | 769–971 | 1.020 → 1.045 |
| Empathy | 972–1105 | 1.095 → 1.110 — the tightest, the emotional beat |
| CTA | 1106–1324 | 1.015 → 1.040 |

Jumps of **4.5–9.5 %** at each cut. The first pass used ±3 % hold steps and the user asked
「畫面的放大縮小可以明顯一點」. Above ~1.12 the hairline goes and the 1080p upscale softens — say so
before going further. `timeline_audit.py` checks that no key exposes the canvas.

## 4. Export routes

| Deliverable | How |
|---|---|
| **HDR** — the user's preset (HEVC 10-bit HDR, QuickTime .mov, match timeline, 30 fps) | the user exports it from the dialog, **or**: MCP ProRes master → ffmpeg x265 below |
| **SDR fallback** | MCP `export_project {mode: "video", codec: "H.264", resolution: "Match Timeline"}` — Palmier tone-maps an HLG timeline to BT.709 |
| Review copy | the same H.264 |

```
export_project {"mode":"video","codec":"ProRes","resolution":"Match Timeline",
                "outputPath":"/Users/pacoakm/PeerPath/output/<name>-master-hdr.mov","overwrite":false}
```

```bash
ffmpeg -nostats -y -i output/<name>-master-hdr.mov -c:v libx265 -preset slow -crf 18 -pix_fmt yuv420p10le \
  -x265-params "profile=main10:colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc:range=limited:atc-sei=18" \
  -tag:v hvc1 -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart output/<name>-reel-vN-HDR.mov
```

x265 ran at ~6.5 fps (44 s reel ≈ 3.5 min) — run it in the background. The HDR master only exists if
the **A-roll on the timeline is HLG**; from an SDR A-roll the same commands make a mislabelled file.
Graphics in the HLG master peaked at Y 726–772 of 1023 — reference white, which is right.

**Naming.** `~/PeerPath/output/<name>-reel-v<N>.mp4`, `-v<N>-HDR.mov`, `-v<N>-SDR.mp4`,
`<name>-master-hdr.mov`. Never reuse a number, never write into `~/Downloads`, always
`overwrite: false`.

**The overwrite incident.** At 01:28 `~/Downloads/antony.mp4` became byte-identical to
`output/antony-reel-v7.mp4`. The master exported two minutes later rendered the finished reel *through
the timeline again* — captions and pills doubled — and had to be deleted. Nobody saw how it happened.
The guard: `overwrite: false`, versioned paths, and `probe_source.py --md5` on the A-roll before a
master (compare with the plan).

## 5. Verify and hand over

```bash
python3 scripts/verify_export.py output/<name>-reel-vN-HDR.mov --expect hdr --frames <N> \
  --source <A-roll original> --sheet <scratchpad>/<name>-vN-sheet.png --every 3
python3 scripts/verify_export.py output/<name>-reel-vN-SDR.mp4 --expect sdr --frames <N> --skip-slow
```

Targets: 1080×1920, 30 fps, exact frame count, ≈ −15 LUFS integrated (Antony −14.9), true peak
≤ −1 dBTP (Antony −3.3), no black runs; HDR = HEVC Main 10 `hvc1` BT.2020/HLG.

Hand over in one message: the file paths and what each is for, the contact sheet (`SendUserFile`), what
you verified with numbers, what you did not check, and anything the user must decide (licences, a
moved source). QuickTime plays the HLG `.mov` correctly; there is no faithful SDR preview of it here.
