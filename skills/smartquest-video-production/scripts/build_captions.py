#!/usr/bin/env python3
"""Build the SmartQuest caption track and sidecar SRT from video-plan.json.

Cues are BILINGUAL: 繁體中文 on top, English underneath and smaller. Every cue
carries both — `text` (中文) and `en` — and a cue missing its English fails the
build rather than rendering half a caption.

Captions never live inside the lesson scenes. They are one transparent Manim
track composited by ffmpeg, so fixing a typo never re-renders the mathematics,
and the sidecar .srt comes out of the same data for free.

    python3 build_captions.py --plan video-plan.json --out-dir src

Writes:
    <out-dir>/captions.py     a Manim scene named CaptionTrack
    out/subtitles.srt         sidecar for YouTube
    (stdout)                  the pacing report

Then:
    manim -r 1920,1080 --fps 60 -t --format=mov src/captions.py CaptionTrack
    ffmpeg -y -i out/picture.mp4 -i <track>.mov \
      -filter_complex "[0:v][1:v]overlay=0:0" -c:v libx264 -crf 18 \
      -pix_fmt yuv420p out/picture-subbed.mp4

Exits non-zero if any cue breaks the pacing contract, so it can gate a build.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

MAX_CPS = 4.0        # 字/秒, Latin word counted as 2 字 — the CHINESE line only
MIN_CUE = 2.0        # seconds a cue must stay on screen
MAX_LINES = 2        # lines per language

# Line length is a property of the FRAME, not of the format, and the two aspects
# are nothing like each other. Measured at SIZE_CAPTION against the usable width
# (frame width less two margins):
#
#            fits per line          limit here        why
#   16:9     34.2 全形字 / 88.9 Latin    24 / 42     readability, well inside the frame
#   9:16     12.6 全形字 / 32.6 Latin    12 / 32     the frame itself — 4.1 units wide
#
# A single MAX_LINE of 24 was a 16:9 number applied to both, so a 24-字 line in a
# short silently wrapped to two and a 48-字 cue to four, overflowing the caption
# band onto the diagram. Portrait is the binding case: at 12.6 全形字 per line
# there is no readability margin left to spend.
MAX_LINE_LANDSCAPE, MAX_LINE_PORTRAIT = 24, 12          # 全形字
MAX_LINE_EN_LANDSCAPE, MAX_LINE_EN_PORTRAIT = 42, 32    # Latin characters
LATIN = re.compile(r"[A-Za-z][A-Za-z''\-]*")

# The 中文 line is written in Chinese. An English subject term does not belong
# in it any more — the English line directly underneath is where the term now
# lives, in the exact words of the paper. 「同一弧上的 inscribed angle 相等」was
# right when the caption was monolingual and the student had nowhere else to
# meet the term; with both lines on screen it prints the term twice, breaks the
# Chinese line for a wrap it did not need, and reads as neither language.
#
# What still stays Latin in the 中文 line, because there is no Chinese form a
# DSE student would recognise:
#   - ALL-CAPS abbreviations: SAS, ASA, SSS, RHS, AAS, DSE, ATP, DNA
#   - single letters: point labels and variables — A, B, O, x, n
#   - the notations below
# Everything else — a lowercase multi-letter English word — is a term that
# belongs in the English line instead.
LATIN_OK_IN_ZH = {"pH", "pOH", "mol", "cm", "mm", "dm", "km", "kg", "mg",
                  "Hz", "eV", "atm", "rpm", "sin", "cos", "tan", "log", "ln"}
ALLCAPS = re.compile(r"^[A-Z]{2,6}$")


def weight(text: str) -> int:
    """Reading weight in 全形字. A Latin word costs 2; CJK and punctuation cost 1."""
    latin_words = LATIN.findall(text)
    stripped = LATIN.sub("", text)
    cjk = len([c for c in stripped if not c.isspace()])
    return cjk + 2 * len(latin_words)


def srt_time(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def collect(plan: dict) -> list[dict]:
    cues = []
    for shot in plan["shots"]:
        for cue in shot.get("subtitles", []):
            cues.append({**cue, "shot": shot["id"],
                         "shotStart": shot["start"], "shotEnd": shot["end"]})
    cues.sort(key=lambda c: c["start"])
    return cues


def stray_english(text: str) -> list[str]:
    """English words in the 中文 line that belong in the English line instead.

    See LATIN_OK_IN_ZH. A word is allowed through if it is an all-caps
    abbreviation, a single letter, or a listed notation; anything else is a
    subject term that the line underneath already carries.
    """
    return [w for w in LATIN.findall(text)
            if len(w) > 1 and not ALLCAPS.match(w) and w not in LATIN_OK_IN_ZH]


def limits(plan: dict) -> tuple[int, int]:
    """(全形字 per Chinese line, characters per English line) for this aspect."""
    if plan["height"] > plan["width"]:
        return MAX_LINE_PORTRAIT, MAX_LINE_EN_PORTRAIT
    return MAX_LINE_LANDSCAPE, MAX_LINE_EN_LANDSCAPE


def check(plan: dict, cues: list[dict]) -> list[str]:
    max_line, max_line_en = limits(plan)
    problems = []
    for c in cues:
        dur = c["end"] - c["start"]
        w = weight(c["text"])
        en = (c.get("en") or "").strip()
        if not en:
            problems.append(f'{c["shot"]} {c["start"]:.2f}s: no English line — every '
                            f'cue is bilingual — "{c["text"][:20]}…"')
        stray = stray_english(c["text"])
        if stray:
            problems.append(f'{c["shot"]} {c["start"]:.2f}s: 中文 line contains English '
                            f'{stray} — write it in Chinese and let the English line '
                            f'carry the term (SAS-type abbreviations and single letters '
                            f'are fine)')
        if dur < MIN_CUE - 1e-9:
            problems.append(f'{c["shot"]} {c["start"]:.2f}s: cue is {dur:.2f}s, '
                            f'minimum is {MIN_CUE:.1f}s — "{c["text"][:20]}…"')
        if dur > 0 and w / dur > MAX_CPS + 1e-9:
            problems.append(f'{c["shot"]} {c["start"]:.2f}s: {w} 字 in {dur:.2f}s '
                            f'= {w/dur:.2f} 字/秒, limit {MAX_CPS} — needs {w/MAX_CPS:.2f}s')
        if c["start"] < c["shotStart"] - 1e-6 or c["end"] > c["shotEnd"] + 1e-6:
            problems.append(f'{c["shot"]} {c["start"]:.2f}s: cue escapes its shot '
                            f'[{c["shotStart"]:.2f}, {c["shotEnd"]:.2f}]')
        if "\n" in c["text"]:                       # author-chosen line breaks
            for line in c["text"].split("\n"):
                if weight(line) > max_line:
                    problems.append(f'{c["shot"]} {c["start"]:.2f}s: 中文 line is '
                                    f'{weight(line)} 字, limit {max_line}')
            if len(c["text"].split("\n")) > MAX_LINES:
                problems.append(f'{c["shot"]} {c["start"]:.2f}s: 中文 is more than '
                                f'{MAX_LINES} lines')
        elif w > MAX_LINES * max_line:              # will be auto-wrapped
            problems.append(f'{c["shot"]} {c["start"]:.2f}s: {w} 字 will not fit '
                            f'{MAX_LINES} lines of {max_line} — split the cue')
        # The English is gated on LENGTH but not on reading rate, and that is
        # deliberate. The Chinese is the line being read at 4 字/秒; the English
        # is the same sentence in the words the exam paper uses, there to be
        # recognised rather than read through. Rate-gating it would make the
        # English the binding constraint on every cue in the film and stretch a
        # 5-minute lesson by a third, to slow down a line nobody reads
        # word-by-word. What it must not do is take a third line — hence the
        # length limit, which is what actually pushes the block onto the figure.
        if en:
            if "\n" in en:
                for line in en.split("\n"):
                    if len(line.strip()) > max_line_en:
                        problems.append(f'{c["shot"]} {c["start"]:.2f}s: English line is '
                                        f'{len(line.strip())} chars, limit {max_line_en}')
                if len(en.split("\n")) > MAX_LINES:
                    problems.append(f'{c["shot"]} {c["start"]:.2f}s: English is more than '
                                    f'{MAX_LINES} lines')
            elif len(en) > MAX_LINES * max_line_en:
                problems.append(f'{c["shot"]} {c["start"]:.2f}s: English is {len(en)} chars, '
                                f'will not fit {MAX_LINES} lines of {max_line_en} — '
                                f'shorten it or split the cue')
    for a, b in zip(cues, cues[1:]):
        if b["start"] < a["end"] - 1e-6:
            problems.append(f'cues overlap: {a["shot"]} ends {a["end"]:.2f}s, '
                            f'{b["shot"]} starts {b["start"]:.2f}s')

    # per-shot narration room
    for shot in plan["shots"]:
        span = shot["end"] - shot["start"]
        spoken = sum(c["end"] - c["start"] for c in shot.get("subtitles", []))
        still = shot.get("stillSeconds")
        if still is not None and still < span * 0.25 - 1e-6:
            problems.append(f'{shot["id"]}: stillSeconds {still:.1f} < 25% of {span:.1f}s')
        if spoken > span * 0.9 + 1e-6:
            problems.append(f'{shot["id"]}: subtitles fill {spoken:.1f}s of {span:.1f}s '
                            f'— no room for the teacher to breathe')
    return problems


def check_layout(plan: dict, cues: list[dict]) -> list[str]:
    """Build every cue for real and check it fits the reserved caption band.

    The 字-count rules above are a proxy for how many lines a cue will take.
    This is the thing itself: it lays each cue out at the plan's own aspect with
    the same `fit_caption()` the track uses, and measures the block. A cue that
    overflows does NOT get clipped — the block is anchored by its bottom, so it
    grows upward onto the diagram, which is invisible until the composite.

    Needs manim (the theme imports it). If it will not import, the character
    rules still ran and this says so rather than passing silently.
    """
    import importlib
    import os
    os.environ.setdefault("MANIM_DISABLE_CACHING", "1")
    try:
        from manim import config as mcfg
        mcfg.pixel_width, mcfg.pixel_height = int(plan["width"]), int(plan["height"])
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        theme = importlib.import_module("smartquest_theme")
        importlib.reload(theme)          # pick up the pixel dimensions just set
    except Exception as exc:             # noqa: BLE001 — any import failure is the same answer
        return [f"layout not measured — could not import the theme ({exc.__class__.__name__}: "
                f"{exc}). The character limits still ran; render one cue and look."]

    theme.sync_frame()
    st = theme.Stage()
    max_w = st.w - 2 * st.margin
    headroom = st.content_bottom - st.caption_bottom
    problems = []
    for c in cues:
        cap = theme.fit_caption(c["text"], list(c.get("terms", [])), max_w,
                                en=(c.get("en") or "").strip() or None)
        if cap.height > headroom + 1e-6:
            problems.append(f'{c["shot"]} {c["start"]:.2f}s: caption block is '
                            f'{cap.height:.2f} units, band holds {headroom:.2f} — it would '
                            f'sit on the figure. Shorten the cue or split it.')
        if cap.width > max_w + 1e-6:
            problems.append(f'{c["shot"]} {c["start"]:.2f}s: caption block is '
                            f'{cap.width:.2f} wide, usable width {max_w:.2f}')
    return problems


SCENE_TEMPLATE = '''"""GENERATED by build_captions.py — do not hand-edit.

Source of truth: {plan_name}
Render transparent, then composite:

    manim -r {w},{h} --fps {fps} -t --format=mov captions.py CaptionTrack
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import numpy as np
from manim import *
from smartquest_theme import sync_frame, Stage, fit_caption

sync_frame()

CUES = {cues!r}


class CaptionTrack(Scene):
    def construct(self):
        st = Stage()
        self.camera.background_color = "#00000000"
        max_w = st.w - 2 * st.margin
        t = 0.0
        for start, end, text, en, terms in CUES:
            if start > t:
                self.wait(start - t)
            # Fixed size for every cue — 中文 at SIZE_CAPTION, English under it
            # at SIZE_CAPTION_EN. Wraps when needed and NEVER scales. If
            # something still overflows, the layout gate in build_captions.py
            # should have rejected the cue.
            cap = fit_caption(text, terms, max_w, en=en)
            cap.move_to(np.array([0.0, st.caption_bottom + cap.height / 2, 0.0]))
            self.add(cap)
            self.wait(end - start)
            self.remove(cap)
            t = end
        if {duration!r} > t:
            self.wait({duration!r} - t)
'''


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True)
    ap.add_argument("--out-dir", default="src")
    ap.add_argument("--srt", default="out/subtitles.srt")
    ap.add_argument("--allow-pacing-failures", action="store_true",
                    help="write the files even if the pacing contract is broken")
    ap.add_argument("--skip-layout-check", action="store_true",
                    help="do not lay the cues out to measure them (skips importing manim)")
    args = ap.parse_args()

    plan_path = Path(args.plan)
    plan = json.loads(plan_path.read_text())
    cues = collect(plan)
    if not cues:
        print("No subtitles found in the plan — nothing to build.", file=sys.stderr)
        return 1

    max_line, max_line_en = limits(plan)
    problems = check(plan, cues)
    print(f"{len(cues)} cues across {len(plan['shots'])} shots   "
          f"({plan['width']}x{plan['height']}: {max_line} 全形字 / "
          f"{max_line_en} English chars per line)")
    for c in cues:
        d = c["end"] - c["start"]
        w = weight(c["text"])
        print(f'  {c["shot"]:<5} {c["start"]:7.3f}-{c["end"]:7.3f}  '
              f'{w:>3} 字 / {d:5.2f}s = {w/d:4.2f} 字/秒   {c["text"][:34]}')
        print(f'  {"":<5} {"":>15}  {len((c.get("en") or "").strip()):>3} en          '
              f'      {(c.get("en") or "— MISSING —")[:34]}')
    if not args.skip_layout_check:
        problems += check_layout(plan, cues)
    if problems:
        print(f"\n{len(problems)} problem(s):", file=sys.stderr)
        for p in problems:
            print(f"  ✗ {p}", file=sys.stderr)
        if not args.allow_pacing_failures:
            print("\nFix the plan, or re-run with --allow-pacing-failures.", file=sys.stderr)
            return 2
    else:
        print("\npacing contract: all cues pass; every cue fits the caption band")

    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    scene = SCENE_TEMPLATE.format(
        plan_name=plan_path.name, w=plan["width"], h=plan["height"], fps=plan["fps"],
        cues=[(c["start"], c["end"], c["text"], (c.get("en") or "").strip() or None,
               list(c.get("terms", []))) for c in cues],
        duration=float(plan["durationSeconds"]))
    (out_dir / "captions.py").write_text(scene)

    # The sidecar carries both languages in one cue, 中文 first — the same order
    # as the burned-in track, so a student reading the YouTube captions and a
    # student watching the short see the same two lines in the same places.
    srt_path = Path(args.srt)
    srt_path.parent.mkdir(parents=True, exist_ok=True)
    srt_path.write_text("".join(
        f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n"
        f"{c['text']}\n{(c.get('en') or '').strip()}\n\n"
        for i, c in enumerate(cues, 1)))

    print(f"\nwrote {out_dir / 'captions.py'}")
    print(f"wrote {srt_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
