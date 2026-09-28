#!/usr/bin/env python3
"""Audit a Palmier reel timeline against the PeerPath layout, slot and sound rules.

    timeline_audit.py PROJECT [--timeline ID] [--floor 0.845] [--allow-silent 1141,1510] [--json]

PROJECT is a `.palmier` package (or its project.json). Palmier writes project.json when it saves,
not after every MCP edit, so audit a fresh snapshot:

    export_project {"mode": "palmier", "outputPath": "<scratchpad>/audit.palmier"}

(it copies the media into the package — delete it afterwards), or the live package right after
the user has saved. The script only reads.

What it checks, and the reel that taught it:
  FAIL  plate gap / black edge — a push-in or punch that exposes the canvas (Alex, Antony)
  FAIL  full-screen graphic — the speaker must be on screen every frame (Alex, Session 5 brief)
  FAIL  collision — two graphics, or a graphic and a caption, drawn over each other for ≥ 3 frames
        (WHO TO PRACTISE WITH on FAMILY; the 4-row panel 17 px into the caption; Antony's pills)
  FAIL  floor — anything drawn below y 0.845, where the Reels caption/UI sits
  FAIL  orphan SFX cue — a sound with nothing entering the frame (three stale cues on Alex)
  FAIL  double voice — processed Voice stem AND the A-roll's own audio both audible
  WARN  silent entry, cues < 24 f apart, a sound cut off by the next clip on its track
  WARN  text and an image card sharing the lower slot; display text on top of captions
  WARN  CTA not held to the last frame; a persistent @handle; US spellings; left-aligned pills
  INFO  runtime covered by a graphic, longest breather, element counts, music level

Drawn extents are measured, not the auto-fit box: a pill (background on) draws its WHOLE box —
180 px for a 30 pt chip — but plain text draws only its glyphs, ≈1.34 × fontSize px per line of
caps and 2.1 × fontSize + 2.07 × lineSpacing px between lines (Antony and Alex exports). Treat a
PASS as "nothing the numbers can see": still look at the frames (SKILL.md, verify).
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
from pathlib import Path

US_SPELLINGS = {
    r"\bmemoriz\w*": "memorise", r"\bpracticing\b": "practising", r"\bpracticed\b": "practised",
    r"\borganiz\w*": "organise", r"\brecogniz\w*": "recognise", r"\brealiz\w*": "realise",
    r"\banalyz\w*": "analyse", r"\bprioritiz\w*": "prioritise", r"\bspecializ\w*": "specialise",
    r"\bsummariz\w*": "summarise", r"\bemphasiz\w*": "emphasise", r"\bcolor\w*": "colour",
    r"\bfavorite\w*": "favourite", r"\bcenter\w*": "centre", r"\bbehavior\w*": "behaviour",
    r"\bhonor\w*": "honour", r"\benrollment\b": "enrolment", r"\btraveling\b": "travelling",
    r"\bmodeling\b": "modelling", r"\bdefense\b": "defence", r"\bapologiz\w*": "apologise",
}
PX_PER_PT = 2.07  # canvas px per Palmier point at 1080×1920 (measured on Alex)


class Clip:
    def __init__(self, raw: dict, track: dict, tindex: int, names: dict):
        self.raw, self.track, self.tindex = raw, track, tindex
        self.track_name = track.get("name") or f"track{tindex}"
        self.start = int(raw.get("startFrame", 0))
        self.end = self.start + int(raw.get("durationFrames", 0))
        self.media = raw.get("mediaType", "")
        self.name = names.get(raw.get("mediaRef", ""), raw.get("mediaRef", ""))
        self.text = raw.get("textContent", "") or ""
        self.caption = bool(raw.get("captionGroupId"))
        self.opacity = float(raw.get("opacity", 1))
        tr = raw.get("transform", {})
        self.cx, self.cy = tr.get("centerX", 0.5), tr.get("centerY", 0.5)
        self.w, self.h = tr.get("width", 1), tr.get("height", 1)
        self.kind = self._kind()

    def _kind(self) -> str:
        if self.track.get("type") == "audio" or self.media == "audio":
            return "audio"
        if self.media == "text":
            return "caption" if self.caption else "text"
        if self.media in ("image", "video", "sequence"):
            return "visual"
        return "other"

    @property
    def style(self) -> dict:
        return self.raw.get("textStyle", {}) or {}

    @property
    def pill(self) -> bool:
        return bool((self.style.get("background") or {}).get("enabled"))

    def label(self) -> str:
        if self.kind in ("text", "caption"):
            return repr(self.text.replace("\n", " / ")[:34])
        return self.name if isinstance(self.name, str) else str(self.name)

    def extent(self, H: int) -> tuple[float, float, float, float]:
        """(x0, y0, x1, y1) of what is actually drawn, normalized."""
        if self.kind in ("text", "caption") and not self.pill:
            st = self.style
            fs = float(st.get("fontSize", 40))
            lines = max(1, self.text.count("\n") + 1)
            upper = st.get("fontCase") == "uppercase" or self.text == self.text.upper()
            glyph = (1.34 if upper else 1.75) * fs
            pitch = 2.1 * fs + PX_PER_PT * float(st.get("lineSpacing", 0) or 0)
            border = st.get("border") or {}
            ow = PX_PER_PT * float(border.get("width", 0)) if border.get("enabled") else 0.0
            dh = (glyph + (lines - 1) * pitch + 2 * ow) / H
            return self.cx - self.w / 2, self.cy - dh / 2, self.cx + self.w / 2, self.cy + dh / 2
        return self.cx - self.w / 2, self.cy - self.h / 2, self.cx + self.w / 2, self.cy + self.h / 2


def load(path: Path, timeline_id: str | None):
    pj = path / "project.json" if path.is_dir() else path
    project = json.loads(pj.read_text())
    names = {}
    mj = pj.parent / "media.json"
    if mj.exists():
        for e in json.loads(mj.read_text()).get("entries", []):
            names[e["id"]] = e.get("name", e["id"])
    tid = timeline_id or project.get("activeTimelineId")
    tl = next((t for t in project["timelines"] if t["id"] == tid), project["timelines"][0])
    clips = [Clip(c, t, i, names) for i, t in enumerate(tl["tracks"]) for c in t.get("clips", [])]
    return pj, tl, clips


def keyframe_value(track: dict | None, frame: int, default):
    """Evaluate a Palmier keyframe track at a clip-relative frame (linear/smooth ≈ linear for bounds)."""
    if not track or not track.get("keyframes"):
        return default
    ks = sorted(track["keyframes"], key=lambda k: k["frame"])
    if frame <= ks[0]["frame"]:
        return ks[0]["value"]
    for a, b in zip(ks, ks[1:]):
        if a["frame"] <= frame < b["frame"]:
            if a.get("interpolationOut") == "hold":
                return a["value"]
            t = (frame - a["frame"]) / max(1, b["frame"] - a["frame"])
            if isinstance(a["value"], dict):
                return {k: a["value"][k] + (b["value"][k] - a["value"][k]) * t for k in a["value"]}
            return a["value"] + (b["value"] - a["value"]) * t
    return ks[-1]["value"]


def overlap_frames(a: Clip, b: Clip) -> int:
    return max(0, min(a.end, b.end) - max(a.start, b.start))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", type=Path)
    ap.add_argument("--timeline")
    ap.add_argument("--floor", type=float, default=0.845, help="lowest drawn y allowed (Reels caption/UI zone)")
    ap.add_argument("--min-overlap", type=int, default=3, help="frames two elements must share to count as together")
    ap.add_argument("--allow-silent", default="", help="comma-separated entry frames that are silent on purpose")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    pj, tl, clips = load(args.project, args.timeline)
    W, H, fps = tl.get("width", 1080), tl.get("height", 1920), tl.get("fps", 30)
    px = lambda v: round(v * H)
    out = {"FAIL": [], "WARN": [], "INFO": []}
    add = lambda lvl, msg: out[lvl].append(msg)
    silent_ok = {int(x) for x in args.allow_silent.split(",") if x.strip()}

    visuals = [c for c in clips if c.kind == "visual"]
    total = max([c.end for c in clips if c.kind in ("visual", "text", "caption")] or [0])
    add("INFO", f"{pj}  ·  {W}×{H} @ {fps} fps  ·  {total} frames ({total / fps:.2f} s)")
    if (W, H) != (1080, 1920) or fps != 30:
        add("WARN", f"canvas {W}×{H} @ {fps} fps — PeerPath reels are 1080×1920 @ 30")

    # ---- plate -------------------------------------------------------------------------------
    plates = [c for c in visuals if c.media == "video" and c.w >= 0.99 and c.h >= 0.99 and c.end - c.start >= 0.4 * total]
    others = [c for c in visuals if c not in plates]
    panels = [c for c in others if c.opacity < 0.9]
    cards = [c for c in others if c not in panels]
    if not plates:
        add("FAIL", "no full-canvas A-roll found — the speaker must be on screen every frame")
    else:
        covered = sorted((c.start, c.end) for c in plates)
        cursor = 0
        for s, e in covered:
            if s > cursor:
                add("FAIL", f"A-roll gap f{cursor}–{s}: the speaker is off screen")
            cursor = max(cursor, e)
        if cursor < total:
            add("FAIL", f"A-roll ends at f{cursor}, timeline runs to f{total}")
        for p in plates:
            raw = p.raw
            st = raw.get("transform", {})
            sw, sh = st.get("width", 1), st.get("height", 1)
            static_tl = (st.get("centerX", 0.5) - sw / 2, st.get("centerY", 0.5) - sh / 2)
            worst = None
            for f in range(0, p.end - p.start):
                sc = keyframe_value(raw.get("scaleTrack"), f, {"a": sw, "b": sh})
                pos = keyframe_value(raw.get("positionTrack"), f, {"a": static_tl[0], "b": static_tl[1]})
                x0, y0 = pos["a"], pos["b"]
                x1, y1 = x0 + sc["a"], y0 + sc["b"]
                gap = max(x0, y0, 1 - x1, 1 - y1)
                if gap > 0.0015 and (worst is None or gap > worst[1]):
                    worst = (p.start + f, gap, (round(x0, 3), round(y0, 3), round(sc["a"], 3)))
            if worst:
                add("FAIL", f"A-roll exposes the canvas at f{worst[0]} ({px(worst[1])} px; top-left {worst[2][:2]},"
                            f" scale {worst[2][2]}) — position must follow scale: x=(1−s)·0.5, y=(1−s)·0.3")
            scales = [k["value"]["a"] for k in (raw.get("scaleTrack") or {}).get("keyframes", [])]
            if scales:
                add("INFO", f"A-roll scale range {min(scales):.3f}–{max(scales):.3f} over {len(scales)} keys")

    # ---- full-screen graphics ---------------------------------------------------------------
    for c in others:
        if c.w * c.h >= 0.9:
            add("FAIL", f"f{c.start}–{c.end} {c.label()} covers {c.w * c.h:.0%} of the frame — no full-screen cutaways")

    texts = [c for c in clips if c.kind == "text"]
    caps = [c for c in clips if c.kind == "caption"]
    graphics = texts + cards  # things that must never be drawn over each other
    ext = {id(c): c.extent(H) for c in texts + caps + others}

    # ---- floor, edges ------------------------------------------------------------------------
    for c in texts + caps + others:
        x0, y0, x1, y1 = ext[id(c)]
        if y1 > args.floor + 0.002:
            add("FAIL", f"f{c.start}–{c.end} {c.label()} drawn to y {y1:.3f} — below the {args.floor} floor by {px(y1 - args.floor)} px")
        if x0 < -0.001 or x1 > 1.001:
            add("FAIL", f"f{c.start}–{c.end} {c.label()} box runs off the canvas (x {x0:.3f}–{x1:.3f}) — shorten the copy, not the type")
        elif (x0 < 0.03 or x1 > 0.97) and (c.pill or c.kind == "visual"):
            add("WARN", f"f{c.start}–{c.end} {c.label()} within 3 % of the side edge (x {x0:.3f}–{x1:.3f})")
        if y0 < 0.025:
            add("WARN", f"f{c.start}–{c.end} {c.label()} reaches y {y0:.3f} — under the phone status bar")
        if x1 > 0.88 and y1 > 0.55 and y0 < 0.85 and c.kind != "caption":
            add("WARN", f"f{c.start}–{c.end} {c.label()} reaches x {x1:.3f} in the Reels button column (right edge,"
                        " y 0.55–0.85) — keep within x 0.88 where the copy allows")

    # ---- collisions --------------------------------------------------------------------------
    def clash(a: Clip, b: Clip):
        if overlap_frames(a, b) < args.min_overlap:
            return None
        ax0, ay0, ax1, ay1 = ext[id(a)]
        bx0, by0, bx1, by1 = ext[id(b)]
        v = min(ay1, by1) - max(ay0, by0)
        h = min(ax1, bx1) - max(ax0, bx0)
        return v if v * H > 3 and h * W > 3 else None

    seen = set()
    for i, a in enumerate(graphics):
        for b in graphics[i + 1:]:
            v = clash(a, b)
            if v is not None:
                key = (a.label(), b.label())
                if key in seen:
                    continue
                seen.add(key)
                add("FAIL", f"f{max(a.start, b.start)}–{min(a.end, b.end)} {a.label()} and {b.label()} overlap by {px(v)} px")
    cap_hits = {}
    for g in graphics + panels:
        for c in caps:
            v = clash(g, c)
            if v is not None:
                cap_hits.setdefault(g.label(), []).append((c.start, px(v)))
    for lbl, hits in cap_hits.items():
        add("FAIL", f"{lbl} overlaps the caption line ({len(hits)} cues, from f{hits[0][0]}, up to {max(h for _, h in hits)} px)"
                    " — move the graphic, never the caption")
    for p in panels:
        for c in cards:
            v = clash(p, c)
            if v is not None:
                add("FAIL", f"f{max(p.start, c.start)} list panel and card {c.label()} overlap by {px(v)} px")
        inside = [t for t in texts if overlap_frames(t, p) >= args.min_overlap and clash(t, p) is not None]
        for t in inside:
            _, ty0, _, ty1 = ext[id(t)]
            _, py0, _, py1 = ext[id(p)]
            if ty0 < py0 - 0.002 or ty1 > py1 + 0.002:
                add("WARN", f"f{t.start} {t.label()} spills out of its list panel (text {ty0:.3f}–{ty1:.3f}, panel {py0:.3f}–{py1:.3f})")

    # ---- slot grammar, captions, CTA, copy ---------------------------------------------------
    lower_texts = [t for t in texts if t.cy > 0.5]
    for card in cards:
        if card.cy <= 0.5:
            continue
        for t in lower_texts:
            n = overlap_frames(card, t)
            if n >= args.min_overlap and clash(card, t) is None:
                add("WARN", f"f{max(card.start, t.start)} card {card.label()} and {t.label()} share the slot for {n} f"
                            " — text rows and image cards swap, they don't coexist")
    for t in texts:
        if float(t.style.get("fontSize", 0)) >= 44:
            together = sum(overlap_frames(t, c) for c in caps)
            if together >= args.min_overlap:
                add("WARN", f"f{t.start}–{t.end} display {t.label()} is on screen with captions for {together} f"
                            " — suppress the captions where the display carries the words (hook, CTA)")
        if t.pill and t.style.get("alignment", "left") == "left":
            add("WARN", f"f{t.start} pill {t.label()} is left-aligned — its text sits ~26 px left of centre; use center")
        if "@" in t.text and (t.end - t.start) >= 0.4 * total:
            add("WARN", f"{t.label()} persists {100 * (t.end - t.start) / max(1, total):.0f}% of the reel — no handle watermark (removed on Antony)")
        longest = max((len(l) for l in t.text.split("\n")), default=0)
        if longest > 24 and float(t.style.get("fontSize", 0)) <= 34:
            add("INFO", f"f{t.start} {t.label()} has a {longest}-character line — rows read best ≤ 22")
    ctas = [t for t in texts if "COMMENT" in t.text.upper()]
    if not ctas:
        add("WARN", "no COMMENT \"KEYWORD\" CTA found")
    elif max(c.end for c in ctas) < total - 1:
        add("WARN", f"CTA ends at f{max(c.end for c in ctas)}, reel ends at f{total} — hold it to the last frame (reels loop)")
    spell = {}
    for c in texts + caps:
        for pat, uk in US_SPELLINGS.items():
            for m in re.finditer(pat, c.text, re.I):
                spell.setdefault((m.group(0).lower(), uk), []).append(c.start)
    for (us, uk), frames in sorted(spell.items()):
        add("WARN", f"US spelling '{us}' ({len(frames)}×, first f{frames[0]}) — British: {uk}…")

    # ---- sound -------------------------------------------------------------------------------
    audio = [c for c in clips if c.kind == "audio"]
    is_sfx = lambda c: bool(re.search(r"sfx|foley|\bfx\b", c.track_name, re.I)) or str(c.name).lower().startswith("sfx")
    is_music = lambda c: bool(re.search(r"music|bgm|bed", c.track_name, re.I)) or "bgm" in str(c.name).lower()
    is_voice = lambda c: bool(re.search(r"voice|\bvo\b|narr", c.track_name, re.I)) or "voice" in str(c.name).lower()
    sfx = sorted([c for c in audio if is_sfx(c)], key=lambda c: c.start)
    music = [c for c in audio if is_music(c) and not is_sfx(c)]
    voice = [c for c in audio if is_voice(c)]
    plate_links = {p.raw.get("linkGroupId") for p in plates if p.raw.get("linkGroupId")}
    camera_audio = [c for c in audio if c.raw.get("linkGroupId") in plate_links]
    audible = lambda c: not c.track.get("muted") and float(c.raw.get("volume", 1)) > 0.002
    if voice and any(audible(c) for c in camera_audio):
        add("FAIL", "processed Voice stem and the A-roll's own audio are both audible — mute the linked audio (−60 dB + track mute)")
    if not voice and camera_audio:
        v = camera_audio[0]
        add("INFO", f"voice = camera audio at {20 * math.log10(max(1e-6, float(v.raw.get('volume', 1)))):+.1f} dB, unprocessed"
                    " — Antony's voice_chain.py stem is the standard (≈ −15 LUFS)")

    entries = sorted({c.start for c in texts + others})
    events = []
    for f in entries:
        if events and f - events[-1][-1] <= 3:
            events[-1].append(f)
        else:
            events.append([f])
    cue_starts = [c.start for c in sfx]
    if sfx:
        for ev in events:
            f = ev[0]
            if f in silent_ok or any(s in silent_ok for s in ev):
                continue
            if not any(f - 14 <= s <= f + 3 for s in cue_starts):
                what = next((c.label() for c in texts + others if c.start == f), "")
                add("WARN", f"silent entry at f{f} {what} — every element entering gets its type's sound (or --allow-silent)")
        for c in sfx:
            if not any(c.start - 3 <= ev[0] <= c.start + 14 for ev in events):
                add("FAIL", f"orphan cue f{c.start} {c.name} — nothing enters the frame; a retimed or deleted graphic left it behind")
        for a, b in zip(sfx, sfx[1:]):
            if b.start - a.start < 24 and not any(a.start - 3 <= ev[0] <= b.start + 14 and b.start - 3 <= ev[0] for ev in events):
                add("WARN", f"cues f{a.start} and f{b.start} are {b.start - a.start} f apart (< 0.8 s)")
        by_track = {}
        for c in sfx:
            by_track.setdefault(c.tindex, []).append(c)
        for lst in by_track.values():
            lst.sort(key=lambda c: c.start)
            for a, b in zip(lst, lst[1:]):
                if int(a.raw.get("trimEndFrame", 0)) > 0 and abs(b.start - a.end) <= 1 and a.end - a.start < 20:
                    add("WARN", f"f{a.start} {a.name} is cut off by the next clip on its track — give it its own track")
        add("INFO", f"{len(sfx)} SFX cues on {len(by_track)} track(s); {len(events)} element entries")
    elif events:
        add("WARN", "no SFX track found (track named SFX/Foley, or media named sfx-*)")

    if music:
        span = sum(c.end - c.start for c in music)
        m = music[0]
        kf = (m.raw.get("volumeTrack") or {}).get("keyframes") or []
        level = (f"keyframes {[(k['frame'], k['value']) for k in kf][:8]}" if kf
                 else f"{20 * math.log10(max(1e-6, float(m.raw.get('volume', 1)))):+.1f} dB static")
        add("INFO", f"music {m.name}: covers {100 * span / max(1, total):.0f}% · fades {m.raw.get('fadeInFrames', 0)}/"
                    f"{m.raw.get('fadeOutFrames', 0)} f · {level}")
        if span < 0.95 * total:
            add("WARN", f"music covers only {100 * span / max(1, total):.0f}% of the reel")
    else:
        add("INFO", "no music bed found")

    # ---- coverage ----------------------------------------------------------------------------
    busy = [False] * total
    for c in texts + others:
        if c.cy > 0.5 or c.kind == "visual":
            for f in range(max(0, c.start), min(total, c.end)):
                busy[f] = True
    gaps, run = [], 0
    for f, b in enumerate(busy + [True]):
        if not b:
            run += 1
        elif run:
            gaps.append((f - run, f))
            run = 0
    long_gaps = [g for g in gaps if g[1] - g[0] >= 3 * fps]
    add("INFO", f"{len(texts)} text, {len(cards)} cards, {len(panels)} panels, {len(caps)} caption clips · "
                f"a graphic is up {100 * sum(busy) / max(1, total):.0f}% of the runtime")
    for s, e in long_gaps:
        add("INFO", f"caption-only stretch f{s}–{e} ({(e - s) / fps:.1f} s) — deliberate breather, or an empty slot?")

    if args.json:
        print(json.dumps(out, indent=2, ensure_ascii=False))
    else:
        for lvl in ("FAIL", "WARN", "INFO"):
            for msg in out[lvl]:
                print(f"{lvl:4}  {msg}")
        print(f"\n{len(out['FAIL'])} fail · {len(out['WARN'])} warn — a clean audit still needs eyes on the frames.")
    return 1 if out["FAIL"] else 0


if __name__ == "__main__":
    sys.exit(main())
