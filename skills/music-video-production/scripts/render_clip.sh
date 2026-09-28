#!/usr/bin/env bash
# Final checks and delivery for a song's clip: cut sheet -> final 1080p60 render with motion blur -> share copy.
#
#   scripts/render_clip.sh <project-dir> <song-id> <from-s> <to-s> [--scale 2] [--draft]
#
#   --draft    4 fixed sub-frames instead of adaptive motion blur (fast preview of the whole clip)
#   --scale 2  true 3840x2160 (every line and shader at 4K; ~4-8x slower, files ~8x larger)
#
# Outputs in <project>/out/:  <id>-cuts.png (4 frames around every plate cut — LOOK at it),
#   <id>.mp4 (master, x264 CRF 16, AAC 320k), <id>-share.mp4 (CRF 20, for phones / chat).
# Set CHROME_PATH first if the machine has Chromium but no Google Chrome.
set -euo pipefail
[[ $# -ge 4 ]] || { sed -n 2,12p "$0"; exit 1; }
PROJ="$(cd "$1" && pwd)"; SONG="$2"; FROM="$3"; TO="$4"; shift 4
SCALE=1; SAMPLES="--samples auto --shutter 0.2"; SUFFIX=""
for a in "$@"; do
  case "$a" in
    --draft) SAMPLES="--samples 4 --shutter 0.2"; SUFFIX="-draft" ;;
    --scale) ;;
    2) SCALE=2 ;;
  esac
done
X264=""; [[ $SCALE == 2 ]] && X264="--x264 aq-mode=3:rc-lookahead=30" && SUFFIX="$SUFFIX-4k"
cd "$PROJ/app"
# --url http://localhost:1: always start a private server without live reload (safe while files change)
echo "== cut sheet"
bun scripts/render.ts sheet --song "$SONG" --url http://localhost:1 --cuts --cols 4 --out "../out/$SONG-cuts.png"
echo "== render $FROM-$TO s ($SAMPLES, scale $SCALE)"
time bun scripts/render.ts video --song "$SONG" --url http://localhost:1 --from "$FROM" --to "$TO" $SAMPLES --scale $SCALE $X264 --out "../out/$SONG$SUFFIX.mp4"
echo "== share copy"
ffmpeg -v error -y -i "../out/$SONG$SUFFIX.mp4" -c:v libx264 -preset slow -crf 20 -tune grain -pix_fmt yuv420p \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a copy -movflags +faststart "../out/$SONG$SUFFIX-share.mp4"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of default=nw=1 "../out/$SONG$SUFFIX.mp4"
ls -lh "../out/$SONG$SUFFIX.mp4" "../out/$SONG$SUFFIX-share.mp4" | awk '{print $5, $9}'
echo "Now LOOK: $PROJ/out/$SONG-cuts.png, and pull frames at the drop / whips:  ffmpeg -ss <t> -i <mp4> -frames:v 1 f.png"
