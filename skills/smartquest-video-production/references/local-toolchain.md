# The local toolchain

A lesson is rendered on whatever machine it is opened on, and every failure in this file
renders **without an error** and produces a wrong file. Read this before Gate 3 on a machine
you have not rendered on before.

The stack this skill has actually been verified against, and the versions to reproduce:

| | Verified |
|---|---|
| Animation | **Manim Community Edition 0.20.1**, cairo renderer (`pip3 install "manim==0.20.1"`) |
| Python | 3.13 |
| LaTeX | TinyTeX + `standalone preview doublestroke relsize fundus-calligra wasysym physics dvisvgm rsfs jknapltx` |
| ffmpeg | 8.1.1 (Homebrew), **built without `drawtext`, `ass` and `subtitles`** |
| Fonts | `Songti TC` and `PingFang HK` — ship with macOS, nothing to install |
| SVG raster | headless Google Chrome — see below |

Pin the Manim version. A minor bump moves glyph metrics and stroke joins, and a series whose
lesson 1 and lesson 7 were rendered on different Manim versions has furniture that shifts under
a student who is watching them back to back.

## Preflight — run it, and let it stop you

Never start a render on an unchecked machine. Each of these fails silently if you skip it:

```bash
python3 -c "import manim; print(manim.__version__)"          # expect 0.20.1
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
which latex dvisvgm ffmpeg                                    # all three must resolve
python3 -c "
from matplotlib import font_manager as fm
have = {f.name for f in fm.fontManager.ttflist}
missing = [n for n in ('Songti TC','PingFang HK') if n not in have]
print('MISSING FONTS:', missing) if missing else print('fonts ok')"
ffmpeg -hide_banner -h filter=drawtext >/dev/null 2>&1 && echo "drawtext ok" || echo "no drawtext"
```

A project that ships its own `render_all.sh` runs this as step 1 and refuses to continue.
Write that behaviour into any new runner: a preflight that warns and proceeds is not a preflight.

## Fonts substitute silently — this is the expensive one

Manim sets type through Pango, and **Pango substitutes a missing font without a warning**.
A 中文 caption track rendered on a machine without `Songti TC` comes out in a fallback face,
looks plausible in a thumbnail, and is only obvious beside a lesson that was rendered
correctly — which is usually at delivery, after the master. Fail the preflight on a missing
font; never let the render decide.

## This ffmpeg has no `drawtext`, no `ass`, no `subtitles`

```bash
ffmpeg -h filter=drawtext     # → Unknown filter 'drawtext'
```

Homebrew's build carries no libass and no drawtext, so **nothing can be burned into a video by
ffmpeg** — captions, guide-track shot markers, timecode, watermark, none of it.

- Draft subtitles are a **soft** `mov_text` stream anyway (hard rule 24), so the draft is
  unaffected.
- Any burned-in text must be a **transparent Manim `.mov`** (`-t qtrle` / prores4444) composited
  with `overlay`, which is always present. That is what the caption track already is.
- Do not write a pipeline step that assumes `-vf subtitles=...` works. Test the filter first, on
  the machine, and take the overlay route when it is absent.

## TinyTeX is not on the global PATH

`which latex` fails in a fresh shell. Every render command, every runner script and every agent
session exports it first:

```bash
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
```

A missing `latex` surfaces as a Manim `Tex` failure several minutes into a render, so it costs a
whole scene each time it is forgotten.

## Rasterising an SVG

`cairosvg` is installed but its cairo library is broken (`libcairo-2` not found), and
`rsvg-convert`, ImageMagick and Inkscape are all absent. The route that works is headless Chrome:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --force-device-scale-factor=1 --window-size=<W>,<H> \
  --screenshot="$PWD/out.png" "file://$PWD/in.svg"
```

`--window-size` must match the SVG's pixel size or the sheet is cropped rather than scaled, and
the path must be absolute with a `file://` scheme.

**`build_storyboard.py` is fixed at 3×3 and slices each image to fill its cell.** Pick
`sheetHeight` so that a cell's image area is exactly 16:9; anything else silently crops the top
off every panel, and a Gate 2 approval given on a cropped sheet binds nothing.

## Rendering on another machine — the portable bundle

Scenes are independent, so a lesson renders in parallel and is worth moving to a faster box. A
bundle that another Mac can run without this skill installed contains:

```
src/              the scenes, kit.py, theme_boot.py, and geometry.py where the lesson is 3D
tools/            the project's copy of the browser tools and checks, plus camera-poses.json
vendor/           smartquest_theme.py and friends, copied in — theme_boot.py prefers vendor/
                  over ~/.claude/skills/... so the bundle is self-contained
video-plan.json   the timing authority
out/subtitles.srt the caption track, already built
brief.md          the design record, including the camera decisions
render_all.sh     preflight → parallel render → frame check
SETUP.md          dependencies, exact versions, and how to run
BUNDLE.md         what is in the bundle and what was deliberately left out
```

Leave out `media/` (Manim's cache — it rebuilds, and a stale cache is trap #4) and any existing
`out/*.mp4`. Default parallelism to `ncpu / 2`; one Manim process per core starves the LaTeX
subprocesses and the run gets slower, not faster. Keep per-scene logs in `logs/`.

## Render economics, and the two rules that come out of them

| | Draft | Master |
|---|---|---|
| Size | 854×480 @ 15 fps | 1920×1080 @ 60 fps |
| Cost | minutes | hours |
| What it is for | pacing, motion, continuity, the Gate 3 approval | delivery |

Because the master costs hours and Manim imports the scene modules **once, at start**:

- **Never edit `src/` while a render is running.** The run finishes with the code it began with,
  so everything it produced is stale. Three full renders were thrown away this way in one session.
- **Never start a master render without being asked**, and only from a draft the user approved.

Draft frame-rate rounding makes a shot look 0.03 s out at 15 fps when it is exact at 60 — read
`references/manim-traps.md` #21 before chasing a timing bug that only exists in the draft.
