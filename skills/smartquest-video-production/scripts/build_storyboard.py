#!/usr/bin/env python3
"""Build portable 3x3 high-resolution SVG storyboard sheets from JSON."""

from __future__ import annotations

import argparse
import base64
import html
import json
import math
import mimetypes
from pathlib import Path
import textwrap


DEFAULT_WIDTH = 3840
DEFAULT_HEIGHT = 2160
PANELS_PER_SHEET = 9


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def data_uri(path: Path) -> str | None:
    if not path.is_file():
        return None
    mime = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def wrap(value: object, width: int, max_lines: int) -> list[str]:
    text = " ".join(str(value or "").split())
    if not text:
        return []
    lines = textwrap.wrap(text, width=max(8, width), break_long_words=True)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .") + "…"
    return lines


def text_lines(
    lines: list[str], x: float, y: float, size: int, line_height: int, css_class: str
) -> str:
    if not lines:
        return ""
    tspans = "".join(
        f'<tspan x="{x:.1f}" dy="{0 if i == 0 else line_height}">{esc(line)}</tspan>'
        for i, line in enumerate(lines)
    )
    return f'<text x="{x:.1f}" y="{y:.1f}" class="{css_class}" font-size="{size}">{tspans}</text>'


def build_sheet(
    manifest: dict, panels: list[dict], sheet_number: int, sheet_total: int, base: Path
) -> str:
    width = int(manifest.get("sheetWidth", DEFAULT_WIDTH))
    height = int(manifest.get("sheetHeight", DEFAULT_HEIGHT))
    margin = max(48, round(width * 0.018))
    header_h = max(170, round(height * 0.09))
    gap = max(24, round(width * 0.008))
    grid_top = margin + header_h
    cell_w = (width - (2 * margin) - (2 * gap)) / 3
    cell_h = (height - grid_top - margin - (2 * gap)) / 3
    label_h = cell_h * 0.35
    image_h = cell_h - label_h
    radius = max(12, round(width * 0.004))
    title_size = max(42, round(width * 0.016))
    meta_size = max(24, round(width * 0.008))
    panel_title_size = max(24, round(width * 0.0072))
    note_size = max(19, round(width * 0.0056))
    line_height = round(note_size * 1.25)

    out: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        "<defs>",
        '<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="14" flood-opacity="0.35"/></filter>',
        f'<clipPath id="frameClip"><rect width="{cell_w:.1f}" height="{image_h:.1f}" rx="{radius}"/></clipPath>',
        "</defs>",
        "<style>",
        ".title{font-family:Inter,Helvetica,Arial,sans-serif;font-weight:750;fill:#f4efe5}",
        ".meta{font-family:Inter,Helvetica,Arial,sans-serif;font-weight:450;fill:#b9afa1}",
        ".panelTitle{font-family:Inter,Helvetica,Arial,sans-serif;font-weight:700;fill:#fff8ea}",
        ".note{font-family:Inter,Helvetica,Arial,sans-serif;font-weight:450;fill:#d7cec1}",
        ".label{font-family:Inter,Helvetica,Arial,sans-serif;font-weight:700;fill:#ff6a35}",
        "</style>",
        f'<rect width="{width}" height="{height}" fill="#181614"/>',
        f'<text x="{margin}" y="{margin + title_size}" class="title" font-size="{title_size}">{esc(manifest.get("title", "Storyboard"))}</text>',
        f'<text x="{margin}" y="{margin + title_size + meta_size + 18}" class="meta" font-size="{meta_size}">{esc(manifest.get("subtitle", ""))}</text>',
        f'<text x="{width - margin}" y="{margin + title_size}" text-anchor="end" class="label" font-size="{meta_size}">SHEET {sheet_number:02d}/{sheet_total:02d}</text>',
        f'<text x="{width - margin}" y="{margin + title_size + meta_size + 18}" text-anchor="end" class="meta" font-size="{meta_size}">{esc(manifest.get("style", ""))}</text>',
    ]

    for slot in range(PANELS_PER_SHEET):
        row, col = divmod(slot, 3)
        x = margin + col * (cell_w + gap)
        y = grid_top + row * (cell_h + gap)
        out.append(f'<g transform="translate({x:.1f},{y:.1f})" filter="url(#shadow)">')
        out.append(f'<rect width="{cell_w:.1f}" height="{cell_h:.1f}" rx="{radius}" fill="#292521" stroke="#4b433b" stroke-width="2"/>')

        if slot >= len(panels):
            out.append(f'<rect width="{cell_w:.1f}" height="{image_h:.1f}" rx="{radius}" fill="#211e1b"/>')
            out.append(f'<text x="{cell_w / 2:.1f}" y="{image_h / 2:.1f}" text-anchor="middle" class="meta" font-size="{meta_size}">EMPTY PANEL</text>')
            out.append("</g>")
            continue

        panel = panels[slot]
        image_value = panel.get("image")
        image_path = (base / str(image_value)).resolve() if image_value else None
        uri = data_uri(image_path) if image_path else None
        if uri:
            out.append(f'<g clip-path="url(#frameClip)"><image href="{uri}" width="{cell_w:.1f}" height="{image_h:.1f}" preserveAspectRatio="xMidYMid slice"/></g>')
        else:
            out.append(f'<rect width="{cell_w:.1f}" height="{image_h:.1f}" rx="{radius}" fill="#302a25"/>')
            placeholder = wrap(panel.get("visual", "Missing storyboard frame"), 36, 3)
            out.append(text_lines(placeholder, 34, image_h * 0.42, panel_title_size, round(panel_title_size * 1.25), "meta"))
            out.append(f'<text x="34" y="{image_h - 28:.1f}" class="label" font-size="{note_size}">MISSING IMAGE</text>')

        pad = max(22, cell_w * 0.022)
        label_y = image_h + pad + panel_title_size
        panel_id = panel.get("id", f"P{slot + 1:02d}")
        panel_time = panel.get("time", "Time not set")
        out.append(f'<text x="{pad:.1f}" y="{label_y:.1f}" class="panelTitle" font-size="{panel_title_size}">{esc(panel_id)}  ·  {esc(panel_time)}</text>')

        max_chars = max(24, round(cell_w / (note_size * 0.58)))
        visual = wrap(f'VISUAL — {panel.get("visual", "")}', max_chars, 2)
        camera = wrap(f'CAMERA — {panel.get("camera", "")}', max_chars, 2)
        transition = wrap(f'TRANSITION — {panel.get("transition", "")}', max_chars, 1)
        audio = wrap(f'AUDIO — {panel.get("audio", "")}', max_chars, 1)
        cursor = label_y + line_height + 12
        for block in (visual, camera, transition, audio):
            if block:
                out.append(text_lines(block, pad, cursor, note_size, line_height, "note"))
                cursor += line_height * len(block) + 8
        out.append("</g>")

    out.append("</svg>")
    return "\n".join(out)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path, help="Storyboard manifest JSON")
    parser.add_argument("--output-dir", required=True, type=Path, help="Directory for SVG sheets")
    parser.add_argument("--prefix", default="storyboard", help="Output filename prefix")
    args = parser.parse_args()

    manifest_path = args.manifest.resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    panels = manifest.get("panels")
    if not isinstance(panels, list) or not panels:
        raise SystemExit("Manifest must contain a non-empty 'panels' array")

    args.output_dir.mkdir(parents=True, exist_ok=True)
    total = math.ceil(len(panels) / PANELS_PER_SHEET)
    for index in range(total):
        subset = panels[index * PANELS_PER_SHEET : (index + 1) * PANELS_PER_SHEET]
        svg = build_sheet(manifest, subset, index + 1, total, manifest_path.parent)
        output = args.output_dir / f"{args.prefix}-{index + 1:02d}.svg"
        output.write_text(svg, encoding="utf-8")
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
