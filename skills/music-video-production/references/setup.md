# Setup

```bash
<skill>/scripts/setup_project.sh ~/workspace/<project> [--fork] [--no-smoke]
```

Tools it expects (it reports what's missing, it doesn't install): `git`, `bun`, `ffmpeg` with libx264,
`uv`, and a Chrome or Chromium for the headless renderer (`gh` only with `--fork`). Tested on macOS on
Apple Silicon (M4). Whisper runs as `mlx-whisper` there; on Linux/Windows `song_analysis.py` falls back to
`faster-whisper` (`cd analysis && uv pip install faster-whisper`) — untested, check the QA plot.

The project must **not** live in a cloud-synced folder: `node_modules`, stems and ~4 GB of model weights
(`analysis/.cache/`) land in it and sync would thrash. The script refuses such paths.

`--fork` creates a **public** fork under the user's GitHub account: ask first, it is outward-facing.

## Browser

`render.ts` launches Google Chrome through playwright-core. Without Chrome, set `CHROME_PATH` to a
Chromium binary for every render command, e.g. `CHROME_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium`.
No browser at all: `cd app && bunx playwright install chromium`, then point `CHROME_PATH` at the downloaded binary.

## What the patch changes (apply by hand if `git apply` fails on a newer upstream)

1. `app/src/song.ts` (new): `SONG` from `?song=` (default `pdoom`), `DATA_DIR` = `data/` or `data/<id>/`,
   `AUDIO_URL` = `audio/pdoom.mp3` or `audio/<id>.wav`.
2. `app/src/engine/lyrics.ts` and `audio.ts`: `Lyrics.load()` / `AudioData.load()` fetch from `${DATA_DIR}`.
3. `app/src/main.ts`: the preview plays `AUDIO_URL`; the timeline is `./timeline.ts` for pdoom, else
   `./timeline-<id>.ts` found with `import.meta.glob` (throws a clear error if missing).
4. `app/scripts/render.ts`: `--song <id>` adds `&song=<id>` to the page URL and muxes `audio/<id>.wav`;
   `CHROME_PATH` env runs another Chromium instead of `channel: 'chrome'`.

The original video still renders unchanged without `--song`.

## Layout for a song `<id>`

```
audio/<id>.wav, audio/<id>.srt        (written by song_analysis.py)
data/<id>/lyrics.json, audio.json     (the contract the app reads)
analysis/stems/htdemucs/<id>/          vocals/drums/bass/other .wav
analysis/work/<id>/whisper.json, qa.png
docs/TREATMENT-<id>.md                 the brief
app/src/timeline-<id>.ts               the edit
app/src/scenes/<id>/<plate>.ts         one module per plate (+ <plate>-*.ts helpers)
out/<id>.mp4, out/<id>-share.mp4
```

## Everyday commands (from `app/`)

```bash
bunx vite                                    # preview: http://localhost:5173/?song=<id>&t=29.3  (space, ←/→, [ ], l, h)
bun scripts/render.ts stills --song <id> --url http://localhost:1 --only <plate> --t 30.5,31.2 --out ../out/wip/<plate>
bun scripts/render.ts sheet  --song <id> --url http://localhost:1 --only <plate> --from 29 --to 33 --n 16 --cols 4 --out ../out/wip/<plate>/sheet.png
bun scripts/render.ts sheet  --song <id> --url http://localhost:1 --cuts --cols 4 --out ../out/<id>-cuts.png
bun scripts/render.ts perf   --song <id> --url http://localhost:1 --only <plate> --from 29 --to 33
bunx tsc --noEmit -p tsconfig.json 2>&1 | grep scenes/<id>/<plate>
```

`--url http://localhost:1` is deliberately unreachable: `render.ts` then starts its **own** private Vite
server without live reload, so parallel authors never collide and a file saved mid-render can't reload
the page. `BROWSER LOG: 404` for a favicon is harmless.
