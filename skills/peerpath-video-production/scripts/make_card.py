#!/usr/bin/env python3
"""Make the image assets a PeerPath reel places in Palmier — pre-cut to the exact slot shape.

Palmier's clip `crop` trims the rendered box instead of refilling it (a 9:16 clip cropped to 3:2
came out as a thin strip), so every asset is cut to its slot's aspect here and placed uncropped.
Palmier also caches media by path: when you rebuild a card, write it under a NEW file name.

  image  SRC DST [--size 960x640] [--focus X,Y] [--zoom Z]
         Cover-crop a still to the card (3:2 by default). --focus is the point to keep centred,
         0–1 of the source (0.5,0.35 keeps a face in the upper third). --zoom >1 crops tighter.
  video  SRC DST [--size 960x640] [--focus X,Y] [--zoom Z] [--start S] [--dur D]
         Same for motion b-roll: silent H.264 8-bit, 30 fps, CRF 18.
  badge  SRC DST [--size 680] [--focus X,Y] [--zoom Z]
         Square crop for a round badge (the PeerPath logo). Place it square and set
         edgeRounding 1.0 — the corners are masked away, so a logo flattened onto black shows as a
         clean circle.
  panel  DST --size 900x368
         Solid black PNG behind a list; in Palmier set opacity 0.52 and edgeRounding 0.12.
         (import_media's `matte` only makes project-shaped mattes, hence a file.)
  plaque PHOTO LOGO DST [--size 960x640] [--focus X,Y]
         Institution card: the real place, darkened, with the official logo on a white plaque —
         how a mark is meant to be reproduced (clear space, light ground). LOGO must be PNG/JPG
         (rasterise SVG via the Wikimedia API's thumburl). Record licence + trademark in the ledger.
  doc    DST --title "PERSONAL STATEMENT" [--kicker ABSTRACT] [--highlight "The moment I realised…"]
         [--tags "NOT PUBLISHED,STILL COUNTS"] [--accent 2E6BFF] [--ink 0E0E12] [--header accent|ink]
         An authored document mock-up in the reel's palette (Antony's card-research / card-ps-anchor):
         a page with a title bar, placeholder text lines, an optional highlighted sentence and tag
         chips. Use it where stock has nothing honest to show — an essay, a research abstract, a form.

Every command prints the output size so the placement numbers can be read straight off it.
Dependencies: ffmpeg/ffprobe + Pillow.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

CONDENSED = "/System/Library/Fonts/Avenir Next Condensed.ttc"  # index 8 = Heavy, 0 = Bold (4 is Italic!)
HELVETICA = "/System/Library/Fonts/Helvetica.ttc"             # index 1 = Bold


def size_arg(s: str) -> tuple[int, int]:
    w, h = s.lower().split("x")
    return int(w), int(h)


def xy_arg(s: str) -> tuple[float, float]:
    x, y = s.split(",")
    return float(x), float(y)


def hex_rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def font(size: int, heavy: bool = True) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(CONDENSED, size, index=8 if heavy else 5)
    except OSError:
        return ImageFont.truetype(HELVETICA, size, index=1)


def crop_box(sw: int, sh: int, tw: int, th: int, focus: tuple[float, float], zoom: float) -> tuple[int, int, int, int]:
    """Largest box of the target aspect inside the source, shrunk by zoom, centred on focus, clamped."""
    aspect = tw / th
    cw, ch = (sw, sw / aspect) if sw / sh < aspect else (sh * aspect, sh)
    cw, ch = cw / zoom, ch / zoom
    x = min(max(focus[0] * sw - cw / 2, 0), sw - cw)
    y = min(max(focus[1] * sh - ch / 2, 0), sh - ch)
    return int(round(x)), int(round(y)), int(round(cw)), int(round(ch))


def cmd_image(a) -> Path:
    tw, th = a.size
    im = Image.open(a.src).convert("RGB")
    x, y, w, h = crop_box(im.width, im.height, tw, th, a.focus, a.zoom)
    im.crop((x, y, x + w, y + h)).resize((tw, th), Image.LANCZOS).save(a.dst, quality=92)
    return a.dst


def probe_wh(path: Path) -> tuple[int, int]:
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                          "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    s = json.loads(out)["streams"][0]
    return int(s["width"]), int(s["height"])


def cmd_video(a) -> Path:
    tw, th = a.size
    sw, sh = probe_wh(a.src)
    x, y, w, h = crop_box(sw, sh, tw, th, a.focus, a.zoom)
    w -= w % 2
    h -= h % 2
    cmd = ["ffmpeg", "-v", "error", "-y"]
    if a.start:
        cmd += ["-ss", str(a.start)]
    if a.dur:
        cmd += ["-t", str(a.dur)]
    cmd += ["-i", str(a.src), "-an", "-vf", f"crop={w}:{h}:{x}:{y},scale={tw}:{th}:flags=lanczos,fps=30,setsar=1",
            "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(a.dst)]
    subprocess.run(cmd, check=True)
    return a.dst


def cmd_badge(a) -> Path:
    a.size = (a.px, a.px)
    return cmd_image(a)


def cmd_panel(a) -> Path:
    Image.new("RGB", a.size, (0, 0, 0)).save(a.dst)
    return a.dst


def cmd_plaque(a) -> Path:
    tw, th = a.size
    photo = Image.open(a.photo).convert("RGB")
    x, y, w, h = crop_box(photo.width, photo.height, tw, th, a.focus, 1.0)
    bg = photo.crop((x, y, x + w, y + h)).resize((tw, th), Image.LANCZOS)
    bg = ImageEnhance.Color(ImageEnhance.Brightness(bg).enhance(0.45)).enhance(0.7)
    bg = Image.blend(bg, Image.new("RGB", (tw, th), (10, 18, 46)), 0.28)
    logo = Image.open(a.logo).convert("RGBA")
    pw = int(tw * 0.79)
    lw = int(pw * 0.86)
    lh = int(logo.height * lw / logo.width)
    ph = lh + int(pw * 0.14)
    if ph > th * 0.8:  # tall logo: fit by height instead
        lh = int(th * 0.8 - pw * 0.14)
        lw = int(logo.width * lh / logo.height)
        ph = lh + int(pw * 0.14)
    logo = logo.resize((lw, lh), Image.LANCZOS)
    plaque = Image.new("RGBA", (pw, ph), (0, 0, 0, 0))
    ImageDraw.Draw(plaque).rounded_rectangle((0, 0, pw - 1, ph - 1), radius=int(ph * 0.08), fill=(255, 255, 255, 255))
    plaque.alpha_composite(logo, ((pw - lw) // 2, (ph - lh) // 2))
    out = bg.convert("RGBA")
    out.alpha_composite(plaque, ((tw - pw) // 2, (th - ph) // 2))
    out.convert("RGB").save(a.dst, quality=92)
    return a.dst


def cmd_doc(a) -> Path:
    W, H = a.size
    s = W / 960
    ink, accent = hex_rgb(a.ink), hex_rgb(a.accent)
    grey, paper = (178, 182, 192), (255, 255, 255)
    im = Image.new("RGB", (W, H), paper)
    d = ImageDraw.Draw(im)
    bar_h = int(96 * s)
    d.rectangle((0, 0, W, bar_h), fill=accent if a.header == "accent" else ink)
    d.text((int(40 * s), bar_h // 2), a.title.upper(), font=font(int(46 * s)), fill=paper, anchor="lm")
    y = bar_h + int(44 * s)
    if a.kicker:
        d.text((int(40 * s), y), a.kicker.upper(), font=font(int(26 * s), heavy=False), fill=grey, anchor="lm")
        y += int(46 * s)
    lines = 5 if not a.highlight else 3
    widths = [0.86, 0.92, 0.74, 0.88, 0.62]
    for i in range(lines):
        d.rounded_rectangle((int(40 * s), y, int(40 * s + (W - 80 * s) * widths[i % 5]), y + int(16 * s)),
                            radius=int(8 * s), fill=(214, 217, 224))
        y += int(38 * s)
    if a.highlight:
        y += int(6 * s)
        box_h = int(92 * s)
        tint = tuple(int(c + (255 - c) * 0.84) for c in accent)
        d.rectangle((int(40 * s), y, W - int(40 * s), y + box_h), fill=tint)
        d.rectangle((int(40 * s), y, int(48 * s), y + box_h), fill=accent)
        d.text((int(72 * s), y + box_h // 2), a.highlight, font=font(int(34 * s)), fill=ink, anchor="lm")
        y += box_h + int(28 * s)
        d.rounded_rectangle((int(40 * s), y, int(40 * s + (W - 80 * s) * 0.7), y + int(16 * s)), radius=int(8 * s),
                            fill=(214, 217, 224))
    if a.tags:
        x = int(40 * s)
        ty = H - int(70 * s)
        for i, tag in enumerate(t.strip() for t in a.tags.split(",") if t.strip()):
            f = font(int(26 * s))
            tw = int(d.textlength(tag.upper(), font=f)) + int(40 * s)
            d.rounded_rectangle((x, ty, x + tw, ty + int(48 * s)), radius=int(10 * s), fill=ink if i == 0 else accent)
            d.text((x + tw // 2, ty + int(24 * s)), tag.upper(), font=f, fill=paper, anchor="mm")
            x += tw + int(18 * s)
    im.save(a.dst, quality=95)
    return a.dst


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    def common(p, default_size="960x640", with_focus=True):
        p.add_argument("--size", type=size_arg, default=size_arg(default_size))
        if with_focus:
            p.add_argument("--focus", type=xy_arg, default=(0.5, 0.5))
            p.add_argument("--zoom", type=float, default=1.0)

    p = sub.add_parser("image"); p.add_argument("src", type=Path); p.add_argument("dst", type=Path); common(p)
    p = sub.add_parser("video"); p.add_argument("src", type=Path); p.add_argument("dst", type=Path); common(p)
    p.add_argument("--start", type=float); p.add_argument("--dur", type=float)
    p = sub.add_parser("badge"); p.add_argument("src", type=Path); p.add_argument("dst", type=Path)
    p.add_argument("--px", type=int, default=680); p.add_argument("--focus", type=xy_arg, default=(0.5, 0.5))
    p.add_argument("--zoom", type=float, default=1.0)
    p = sub.add_parser("panel"); p.add_argument("dst", type=Path); p.add_argument("--size", type=size_arg, required=True)
    p = sub.add_parser("plaque"); p.add_argument("photo", type=Path); p.add_argument("logo", type=Path)
    p.add_argument("dst", type=Path); common(p);
    p = sub.add_parser("doc"); p.add_argument("dst", type=Path); common(p, with_focus=False)
    p.add_argument("--title", required=True); p.add_argument("--kicker"); p.add_argument("--highlight")
    p.add_argument("--tags"); p.add_argument("--accent", default="2E6BFF"); p.add_argument("--ink", default="0E0E12")
    p.add_argument("--header", choices=["accent", "ink"], default="ink")
    a = ap.parse_args()

    for attr in ("dst",):
        out = getattr(a, attr)
        for src_attr in ("src", "photo", "logo"):
            src = getattr(a, src_attr, None)
            if src is not None and Path(src).resolve() == Path(out).resolve():
                raise SystemExit("refusing to overwrite a source file")
        Path(out).parent.mkdir(parents=True, exist_ok=True)
    dst = {"image": cmd_image, "video": cmd_video, "badge": cmd_badge, "panel": cmd_panel,
           "plaque": cmd_plaque, "doc": cmd_doc}[a.cmd](a)
    if dst.suffix.lower() in {".mp4", ".mov"}:
        w, h = probe_wh(dst)
    else:
        with Image.open(dst) as im:
            w, h = im.size
    ratio = (h / w) * (1080 / 1920)  # normalized height per unit of normalized width on a 9:16 canvas
    example = 0.4444 if a.cmd != "badge" else 0.3148
    print(f"{dst}  {w}×{h} (aspect {w / h:.3f}). In Palmier keep it undistorted with height = width × {ratio:.4f}"
          f" — e.g. width {example} → height {example * ratio:.4f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
