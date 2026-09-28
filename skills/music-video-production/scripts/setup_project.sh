#!/usr/bin/env bash
# Set up a code-rendered music video project from mexicat/pdoom-video (MIT), ready for a new song.
#
#   scripts/setup_project.sh [target-dir] [--fork] [--no-smoke]
#
#   target-dir   where to put the project (default: ./pdoom-video). Keep it OUT of cloud-synced folders
#                (Google Drive, iCloud, Dropbox): node_modules, stems and 4 GB of model weights land here.
#   --fork       fork to your GitHub account with `gh` instead of a plain clone (the fork is PUBLIC).
#   --no-smoke   skip the one-frame smoke render at the end.
#
# What it does: clone (or fork) -> apply the multi-song patch (?song=<id>, --song <id>) -> copy the
# analysis + scaffold scripts -> bun install -> uv sync -> find a browser for the headless renderer ->
# render one still of the original video to prove the pipeline works.
# It never installs system tools itself; it tells you what is missing.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="./pdoom-video"; FORK=0; SMOKE=1
for a in "$@"; do
  case "$a" in
    --fork) FORK=1 ;;
    --no-smoke) SMOKE=0 ;;
    -h|--help) sed -n 2,16p "$0"; exit 0 ;;
    *) TARGET="$a" ;;
  esac
done
UPSTREAM="https://github.com/mexicat/pdoom-video"
# The patch was made against this upstream commit; newer upstream commits usually still apply.
TESTED_COMMIT="bdbad537a7b7af3213475651774030c47568c181"

need() { command -v "$1" >/dev/null 2>&1 || { echo "MISSING: $1 — $2"; MISSING=1; }; }
MISSING=0
need git "install git"
need bun "macOS: brew install bun  |  others: https://bun.sh"
need ffmpeg "macOS: brew install ffmpeg  |  Debian/Ubuntu: apt install ffmpeg (needs libx264)"
need uv "macOS: brew install uv  |  others: https://docs.astral.sh/uv/"
[[ $FORK == 1 ]] && need gh "https://cli.github.com (then gh auth login)"
[[ $MISSING == 1 ]] && { echo "Install the missing tools, then rerun."; exit 1; }

mkdir -p "$(dirname "$TARGET")"
ABS_PARENT="$(cd "$(dirname "$TARGET")" && pwd -P)/"
case "$ABS_PARENT" in
  "$HOME/Library/CloudStorage/"*|"$HOME/Library/Mobile Documents/"*|"$HOME/Google Drive/"*|"$HOME/Dropbox/"*|"$HOME/OneDrive"*|/Volumes/GoogleDrive*)
    echo "WARNING: $TARGET is inside a cloud-synced folder. Put the project somewhere local (e.g. ~/workspace)."; exit 1 ;;
esac

if [[ -d "$TARGET/.git" ]]; then
  echo "== $TARGET already exists: reusing it"
else
  if [[ $FORK == 1 ]]; then
    parent="$(dirname "$TARGET")"; mkdir -p "$parent"
    (cd "$parent" && gh repo fork mexicat/pdoom-video --clone --fork-name "$(basename "$TARGET")")
  else
    git clone "$UPSTREAM" "$TARGET"
  fi
fi
cd "$TARGET"
ROOT="$(pwd)"
[[ "$(git rev-parse HEAD)" == "$TESTED_COMMIT" ]] || echo "note: upstream HEAD $(git rev-parse --short HEAD) differs from the tested $(echo $TESTED_COMMIT | cut -c1-7); trying the patch anyway"

echo "== multi-song patch"
if [[ -f app/src/song.ts ]]; then
  echo "already applied (app/src/song.ts exists)"
else
  git apply "$HERE/multi-song.patch" || { echo "The patch no longer applies to this upstream version. Apply the same 5 small changes by hand: see references/setup.md (\"What the patch changes\")."; exit 1; }
fi
cp "$HERE/song_analysis.py" "$HERE/scaffold_song.py" analysis/

echo "== bun install"; (cd app && bun install)
echo "== uv sync (Python analysis deps; first run is large: torch, demucs, whisper)"; (cd analysis && uv sync)

echo "== browser for the headless renderer"
CHROME_PATH_SUGGEST=""
if [[ -d "/Applications/Google Chrome.app" ]] || command -v google-chrome >/dev/null 2>&1 || command -v google-chrome-stable >/dev/null 2>&1; then
  echo "Google Chrome found: render.ts works as is."
else
  for c in "/Applications/Chromium.app/Contents/MacOS/Chromium" "$(command -v chromium 2>/dev/null || true)" "$(command -v chromium-browser 2>/dev/null || true)"; do
    [[ -n "$c" && -x "$c" ]] && { CHROME_PATH_SUGGEST="$c"; break; }
  done
  if [[ -n "$CHROME_PATH_SUGGEST" ]]; then
    echo "No Google Chrome; using Chromium. Prefix EVERY render.ts command with:"
    echo "  CHROME_PATH=\"$CHROME_PATH_SUGGEST\""
  else
    echo "No Chrome or Chromium found. Install Google Chrome, or: (cd app && bunx playwright install chromium) and set CHROME_PATH to the downloaded binary."
    SMOKE=0
  fi
fi

if [[ $SMOKE == 1 ]]; then
  echo "== smoke test: one frame of the original video"
  (cd app && CHROME_PATH="${CHROME_PATH_SUGGEST:-${CHROME_PATH:-}}" bun scripts/render.ts stills --url http://localhost:1 --t 3 --only open --out ../out/smoke) \
    && echo "OK: $ROOT/out/smoke/f_0003.00.png — open it: a TikZ-style unicorn being plotted on a dark grid with an orange spark."
fi

cat <<EOF

== ready: $ROOT
Next (see SKILL.md):
  cd "$ROOT/analysis" && uv run python song_analysis.py --song <id> --audio <song.m4a|mp3|wav> [--lyrics lyrics.txt] --prompt "<jargon>"
  python3 "$ROOT/analysis/scaffold_song.py" --song <id> --section chorus1
EOF
