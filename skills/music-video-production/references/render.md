# Render and deliver

```bash
CHROME_PATH=... <skill>/scripts/render_clip.sh <project> <id> <from> <to> [--draft] [--scale 2]
```

- **Clip range**: from ~0.3 s before the first sung word to ~0.4 s after the last one ends (the scaffold
  prints it). A held last note needs its full length.
- **Master**: 1920×1080, 60 fps, x264 CRF 16, `-tune grain`, BT.709 tagged, AAC 320k.
- **Motion blur**: `--samples auto --shutter 0.2`: each frame averages 4 → 12 → 36 → 108 → 324 sub-frames
  until more stop changing it (still frames stop at 12, whips reach 108–324). `--draft` uses a fixed 4 (fast,
  stepped copies on fast motion) — the YouTube upload of the P(doom) video was such a render.
- **4K**: `--scale 2` renders every line, canvas and shader at 3840×2160 (not an upscale). GPU-bound, files
  ~8× larger (CRF 16 ≈ 670 Mbit/s); use `--crf 18`–`20` for 4K masters you'll upload.
- **Share copy**: CRF 20 (~40 MB for 16 s at 1080p60): for phones, chat, review.

Measured on an M4 MacBook: the 16.5 s clip at 1080p60 with adaptive motion blur took 4 min 54 s (master 122 MB).

## Before handing it over

1. Open the cut sheet.
2. Pull frames from the **MP4** (not the app) at the drop and at every whip:
   `ffmpeg -ss <t - from> -i out/<id>.mp4 -frames:v 1 f.png` — check the blur is a streak, not copies,
   and that the drop frame is the hit (A/V sync).
3. Check the audio track: `ffmpeg -i out/<id>.mp4 -map 0:a -af volumedetect -f null /dev/null`.
4. Send the share copy with a short list: what each plate does, what you'd revise next.

## Git hygiene

Don't commit or push unless asked. Keep `out/`, stems, `.cache/` out of git. If the repo/fork is public,
don't push the song audio or `data/<id>/` unless the user owns the rights; code (scenes, timeline,
treatment) is fine under the upstream MIT licence.
