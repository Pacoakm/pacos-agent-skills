// 11:59 — the dream menu (shared by `canteen`, where it floats over the counter at 02:00, and
// `outro`, where it turns out to be the file that was uploaded: `canteen_menu.jpg`).
//
// Three generic dishes on hairline cards: a line-art icon (our own drawing), the name in Plex Mono,
// a dotted leader and an orange price tag. No real canteen, brand or institution.
//
// The drawing is kept as data — polylines and text runs in card units (CARD.w × CARD.h, y down) —
// so it can be drawn flat (`drawDreamMenu`, `drawMenuCard`) or mapped into 3D by a scene
// (`menuCard` + `dashPolyline`: `canteen` projects the strokes as 3D hairlines and sets the text
// with a local affine, so it keeps true perspective).
//
// Style: `dash` 0 = solid hairlines … 1 = dashed (the dream); `dotted` 0 … 1 = strokes collapse into
// dots and the type fades (the dream dissolving); `lit` scales all ink; `phase` marches the dashes.
import { F, font, measure } from '../../engine/type';
import { rgba, type PaletteKey } from '../../engine/palette';
import { lerp, clamp, TAU } from '../../engine/util';

export type MenuIcon = 'noodles' | 'tea' | 'bun';
export interface MenuItem { code: string; name: string; price: string; icon: MenuIcon }

/** The menu. Generic dishes, prices in dollars (no currency code, no venue). */
export const MENU_ITEMS: MenuItem[] = [
  { code: 'A1', name: 'fish-ball noodles', price: '$32', icon: 'noodles' },
  { code: 'A2', name: 'milk tea', price: '$18', icon: 'tea' },
  { code: 'A3', name: 'pineapple bun', price: '$9', icon: 'bun' },
];

/** Card size in card units (the drawing's own coordinate system, y down). */
export const CARD = { w: 520, h: 340 } as const;

export type MenuRole = 'frame' | 'icon' | 'tag' | 'leader' | 'code' | 'name' | 'price';
export interface MenuStroke { kind: 'stroke'; pts: [number, number][]; closed: boolean; w: number; ink: PaletteKey; a: number; role: MenuRole }
export interface MenuText { kind: 'text'; s: string; fam: string; size: number; x: number; y: number; align: 'left' | 'center'; ink: PaletteKey; a: number; role: MenuRole }
export type MenuPrim = MenuStroke | MenuText;

export interface MenuStyle {
  /** 0..1 overall ink (lights). Default 1. */
  lit?: number;
  /** 0 = solid hairlines, 1 = dashed. Default 0. */
  dash?: number;
  /** 0..1: strokes become dots, type fades. Default 0. */
  dotted?: number;
  /** dash phase in card units (march the dashes). Default 0. */
  phase?: number;
}

const F_NAME = F.mono(500);
const F_PRICE = F.mono(600);
const F_CODE = F.mono(500);

// ---------------------------------------------------------------- geometry helpers (card units)
type P = [number, number];
const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 32): P[] => {
  const o: P[] = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
  return o;
};
const wave = (x: number, y0: number, y1: number, amp: number, turns: number, n = 20): P[] => {
  const o: P[] = [];
  for (let i = 0; i <= n; i++) { const u = i / n; o.push([x + amp * Math.sin(u * TAU * turns) * (1 - 0.3 * u), lerp(y0, y1, u)]); }
  return o;
};
/** Straight lines of a hatch at angle `ang`, spacing `sp`, clipped to inside(x, y) (sampled). */
const hatchIn = (x0: number, y0: number, x1: number, y1: number, ang: number, sp: number, inside: (x: number, y: number) => boolean): P[][] => {
  const out: P[][] = [];
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2;
  for (let o = -R; o <= R; o += sp) {
    let cur: P[] = [];
    for (let s = -R; s <= R; s += 2) {
      const x = cx + nx * o + dx * s, y = cy + ny * o + dy * s;
      if (inside(x, y)) cur.push([x, y]);
      else if (cur.length) { if (cur.length > 1) out.push(cur); cur = []; }
    }
    if (cur.length > 1) out.push(cur);
  }
  return out;
};

function iconStrokes(icon: MenuIcon, cx: number, cy: number): P[][] {
  const S: P[][] = [];
  if (icon === 'noodles') {
    // bowl: rim, body, foot
    S.push(arc(cx, cy + 8, 100, 17, 0, TAU, 48));
    S.push(arc(cx, cy + 8, 100, 84, 0, Math.PI, 40));
    S.push([[cx - 34, cy + 88], [cx - 38, cy + 99], [cx + 38, cy + 99], [cx + 34, cy + 88]]);
    // a broth line just inside the rim
    S.push(arc(cx, cy + 12, 84, 11, 0.15, Math.PI - 0.15, 24));
    // three fish balls sitting in it (only the part above the rim shows)
    for (const [x, y, r] of [[cx - 42, cy - 2, 17], [cx - 4, cy - 10, 19], [cx + 34, cy - 1, 16]] as const) S.push(arc(x, y, r, r, Math.PI * 0.94, Math.PI * 2.06, 20));
    // chopsticks resting across
    S.push([[cx + 22, cy - 2], [cx + 150, cy - 96]]);
    S.push([[cx + 40, cy + 4], [cx + 162, cy - 80]]);
    // steam
    for (const [x, k] of [[cx - 50, 0], [cx - 12, 1], [cx + 26, 2]] as const) S.push(wave(x, cy - 34 - k * 4, cy - 104 + k * 6, 7, 1.2));
  } else if (icon === 'tea') {
    const x = cx - 16;
    // cup: rim, the tea's surface, tapered sides, base
    S.push(arc(x, cy - 34, 60, 11, 0, TAU, 44));
    S.push(arc(x, cy - 27, 51, 8, 0.12, Math.PI - 0.12, 22));
    S.push([[x - 60, cy - 34], [x - 44, cy + 60]]);
    S.push([[x + 60, cy - 34], [x + 44, cy + 60]]);
    S.push(arc(x, cy + 60, 44, 8, 0, Math.PI, 20));
    // handle
    S.push(arc(x + 58, cy + 2, 26, 30, -Math.PI / 2 + 0.25, Math.PI / 2 - 0.25, 18));
    S.push(arc(x + 56, cy + 2, 13, 17, -Math.PI / 2 + 0.3, Math.PI / 2 - 0.3, 12));
    // saucer: front half, and the back rim either side of the cup
    S.push(arc(x, cy + 66, 108, 17, 0, Math.PI, 36));
    S.push(arc(x, cy + 66, 108, 17, Math.PI, Math.PI + 1.05, 12));
    S.push(arc(x, cy + 66, 108, 17, TAU - 1.05, TAU, 12));
    S.push(arc(x, cy + 66, 70, 9, 0.2, Math.PI - 0.2, 20));
    // steam
    S.push(wave(x - 16, cy - 48, cy - 108, 7, 1.1));
    S.push(wave(x + 18, cy - 50, cy - 100, 6, 1.3));
  } else {
    // pineapple bun: a low dome with its crackled top, on a plate
    const by = cy + 52, rx = 104, ry = 88;
    S.push(arc(cx, by, rx, ry, Math.PI, TAU, 40));
    S.push(arc(cx, by, rx, 15, 0, Math.PI, 30));
    const inside = (x: number, y: number) => {
      const q = ((x - cx) / (rx - 9)) ** 2 + ((y - by) / (ry - 9)) ** 2;
      return q < 1 && y < by - 18;
    };
    for (const s of hatchIn(cx - rx, by - ry, cx + rx, by, Math.PI / 4, 30, inside)) S.push(s);
    for (const s of hatchIn(cx - rx, by - ry, cx + rx, by, -Math.PI / 4, 30, inside)) S.push(s);
    // plate
    S.push(arc(cx, by + 10, 132, 20, 0, Math.PI, 36));
    S.push(arc(cx, by + 10, 132, 20, Math.PI, Math.PI + 0.62, 10));
    S.push(arc(cx, by + 10, 132, 20, TAU - 0.62, TAU, 10));
  }
  return S;
}

/** Price tag outline (pointed left end with a hole), right edge at xr, centred on yc. */
function tagShape(xr: number, yc: number, tw: number, th: number): { body: P[]; hole: P[] } {
  const xl = xr - tw, k = th * 0.46;
  return {
    body: [[xl, yc], [xl + k, yc - th / 2], [xr, yc - th / 2], [xr, yc + th / 2], [xl + k, yc + th / 2]],
    hole: arc(xl + k * 0.95, yc, 5.5, 5.5, 0, TAU, 12),
  };
}

/** A point just above the price tag (card units): where a pointer lands to price the item. */
export function menuTagPoint(item: MenuItem): [number, number] {
  const pw = measure(item.price, F_PRICE, 30);
  const th = 48, tw = pw + 58, xr = CARD.w - 30;
  return [xr - tw * 0.42, 296 - 11 - th / 2 - 16];
}

const cache = new Map<string, MenuPrim[]>();

/**
 * One card's drawing, in card units (0..CARD.w × 0..CARD.h, y down). Text runs are left/centre
 * aligned at their baseline (x, y). Fonts must be loaded (call after the engine's font load).
 */
export function menuCard(item: MenuItem): MenuPrim[] {
  const hit = cache.get(item.code);
  if (hit) return hit;
  const o: MenuPrim[] = [];
  const st = (pts: P[], w: number, ink: PaletteKey, a: number, role: MenuRole, closed = false) => o.push({ kind: 'stroke', pts, closed, w, ink, a, role });
  const tx = (s: string, fam: string, size: number, x: number, y: number, ink: PaletteKey, a: number, role: MenuRole, align: 'left' | 'center' = 'left') =>
    o.push({ kind: 'text', s, fam, size, x, y, align, ink, a, role });
  const { w, h } = CARD;
  // frame: a rounded rectangle, corner ticks outside it
  const r = 16, fr: P[] = [];
  for (const [cx, cy, a0] of [[w - 8 - r, 8 + r, -Math.PI / 2], [w - 8 - r, h - 8 - r, 0], [8 + r, h - 8 - r, Math.PI / 2], [8 + r, 8 + r, Math.PI]] as const)
    fr.push(...arc(cx, cy, r, r, a0, a0 + Math.PI / 2, 6));
  st(fr, 1.3, 'bone', 0.55, 'frame', true);
  // code, top left
  tx(item.code, F_CODE, 24, 30, 48, 'ash', 0.9, 'code');
  // icon
  for (const s of iconStrokes(item.icon, w / 2, 138)) st(s, 1.5, 'bone', 0.95, 'icon');
  // name, leader, tag
  const yb = 296, nameSize = 32;
  tx(item.name, F_NAME, nameSize, 32, yb, 'bone', 0.95, 'name');
  const nw = measure(item.name, F_NAME, nameSize);
  const priceSize = 30;
  const pw = measure(item.price, F_PRICE, priceSize);
  const th = 48, tw = pw + 58, xr = w - 30, yc = yb - 11;
  const tg = tagShape(xr, yc, tw, th);
  const lx0 = 32 + nw + 14, lx1 = xr - tw - 14;
  if (lx1 > lx0 + 10) st([[lx0, yb - 2], [lx1, yb - 2]], 1.2, 'ash', 0.8, 'leader');
  st(tg.body, 1.6, 'signal', 1, 'tag', true);
  st(tg.hole, 1.3, 'signal', 1, 'tag', true);
  tx(item.price, F_PRICE, priceSize, xr - tw / 2 + th * 0.22, yc + priceSize * 0.36, 'signal', 1, 'price', 'center');
  cache.set(item.code, o);
  return o;
}

/**
 * Split a polyline into dash pieces (on/off lengths in the polyline's units, `phase` shifts the
 * pattern). `off <= 0` returns the polyline whole. Dots: a tiny `on` (the caller draws round caps).
 */
export function dashPolyline(pts: P[], closed: boolean, on: number, off: number, phase = 0): P[][] {
  const q = closed ? [...pts, pts[0]!] : pts;
  if (off <= 0.01 || q.length < 2) return [q];
  const per = on + off;
  const out: P[][] = [];
  let cur: P[] | null = null;
  let acc = 0;
  for (let i = 1; i < q.length; i++) {
    const a = q[i - 1]!, b = q[i]!;
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 1e-9) continue;
    const at = (s: number): P => { const u = (s - acc) / L; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u)]; };
    let s0 = acc;
    const end = acc + L;
    while (s0 < end) {
      const m = (((s0 + phase) % per) + per) % per;
      const inOn = m < on;
      const nextB = s0 + (inOn ? on - m : per - m);
      const s1 = Math.min(nextB, end);
      if (inOn) {
        if (!cur) cur = [at(s0)];
        cur.push(at(s1));
        if (s1 >= nextB - 1e-9) { out.push(cur); cur = null; }
      } else if (cur) { out.push(cur); cur = null; }
      s0 = s1 > s0 + 1e-9 ? s1 : nextB + 1e-7;
    }
    acc = end;
  }
  if (cur && cur.length > 1) out.push(cur);
  return out;
}

/** The dash pattern (on, off) for a style: solid → dashed → dots. */
export function dashPattern(style: MenuStyle): [number, number] {
  const d = clamp(style.dash ?? 0), q = clamp(style.dotted ?? 0);
  if (d <= 0 && q <= 0) return [1e9, 0];
  return [lerp(lerp(80, 13, d), 0.01, q), lerp(lerp(0, 8, d), 11, q)];
}

/** Type opacity for a style (the dream dissolving: type goes before the dots do). */
export const menuTypeAlpha = (style: MenuStyle) => clamp(style.lit ?? 1) * (1 - clamp((style.dotted ?? 0) * 1.6));

/** Draw one card flat at (x, y) (its top left), `scale` px per card unit. */
export function drawMenuCard(c: CanvasRenderingContext2D, item: MenuItem, x: number, y: number, scale: number, style: MenuStyle = {}) {
  const lit = clamp(style.lit ?? 1);
  const [on, off] = dashPattern(style);
  const ta = menuTypeAlpha(style);
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  c.lineCap = 'round'; c.lineJoin = 'round';
  for (const p of menuCard(item)) {
    if (p.kind === 'stroke') {
      c.strokeStyle = rgba(p.ink, p.a * lit);
      c.lineWidth = (p.w * (1 + 0.8 * clamp(style.dotted ?? 0))) / scale;
      c.beginPath();
      for (const piece of dashPolyline(p.pts, p.closed, on, off, style.phase ?? 0)) {
        c.moveTo(piece[0]![0], piece[0]![1]);
        for (let i = 1; i < piece.length; i++) c.lineTo(piece[i]![0], piece[i]![1]);
        if (piece.length === 2 && Math.hypot(piece[1]![0] - piece[0]![0], piece[1]![1] - piece[0]![1]) < 0.05) c.lineTo(piece[0]![0] + 0.05, piece[0]![1]);
      }
      c.stroke();
    } else if (ta > 0.003) {
      c.font = font(p.fam, p.size);
      c.textAlign = p.align;
      c.textBaseline = 'alphabetic';
      c.fillStyle = rgba(p.ink, p.a * ta);
      c.fillText(p.s, p.x, p.y);
    }
  }
  c.restore();
}

/**
 * The whole dream menu, flat: an optional title row, then the three cards side by side, fitted to
 * width `w` px with its top left at (x, y). `pop(i)` (0..1) scales card i in from its centre.
 * Returns the drawn height in px. (Used by `outro` as the preview of `canteen_menu.jpg`.)
 */
export function drawDreamMenu(
  c: CanvasRenderingContext2D, x: number, y: number, w: number,
  style: MenuStyle & { title?: string | null; pop?: (i: number) => number } = {},
): number {
  const n = MENU_ITEMS.length, gap = 0.06;
  const scale = w / (CARD.w * (n + gap * (n - 1)));
  const title = style.title === undefined ? 'MENU' : style.title;
  let yy = y;
  const lit = clamp(style.lit ?? 1);
  if (title) {
    const fs = CARD.h * scale * 0.13;
    c.save();
    c.font = font(F.mono(600), fs);
    c.letterSpacing = `${(fs * 0.3).toFixed(2)}px`;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.fillStyle = rgba('bone', 0.9 * menuTypeAlpha(style));
    c.fillText(title, x + 8 * scale, yy + fs);
    c.letterSpacing = '0px';
    c.strokeStyle = rgba('bone', 0.35 * lit);
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, yy + fs * 1.6); c.lineTo(x + w, yy + fs * 1.6); c.stroke();
    c.restore();
    yy += fs * 2.3;
  }
  for (let i = 0; i < n; i++) {
    const k = clamp(style.pop ? style.pop(i) : 1);
    if (k <= 0) continue;
    const cx = x + (i * (1 + gap) + 0.5) * CARD.w * scale, cy = yy + CARD.h * scale / 2;
    const s = scale * k;
    drawMenuCard(c, MENU_ITEMS[i]!, cx - (CARD.w * s) / 2, cy - (CARD.h * s) / 2, s, style);
  }
  return yy - y + CARD.h * scale;
}
