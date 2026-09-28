// `outro` (11:59): the submission receipt, drawn flat in card px (CW × CH, y down) onto the canvas
// that textures its parts. Our own generic hairline design (the portal idiom of `submit`: Plex Mono
// chrome, hairline rules, an orange stamp), no logo, no real product UI.
//
//   ASSIGNMENT 4 · SUBMISSION RECEIPT                         LOCAL TIME 23:59 → 00:00
//   ───────────────────────────────────────────────────────────────── (the spark's rule, 3D)
//   Upload complete.                                     [ COMPLETE ✓ ]
//   …wrong file.
//   FILE essay_v7_final_FINAL.pdf  │ SIZE 38.0 MB │ SUBMITTED 23:59:59.99
//   PREVIEW · …
//   [ five page skeletons + spinner + loading bar  →  the canteen dream menu ]
//   receipt no.                                         resubmissions are not accepted
import { rgba } from '../../engine/palette';
import { F, font, glyphX, measure } from '../../engine/type';
import type { Word } from '../../engine/lyrics';
import { clamp, ease, prog, TAU, lerp } from '../../engine/util';
import { drawDreamMenu } from './canteen-menu';

export const CW = 1640, CH = 920;
export const PAD = 48;
export const RULE_Y = 108;
// title (the lyric)
export const T1_Y = 246, T2_Y = 370;
export const STAMP = { x: 1392, y: 262, w: 340, h: 112, rot: -0.06 };
// the metadata row
export const META = { y0: 412, y1: 502, lab: 440, val: 481, c1: 48, c2: 904, c3: 1184, d1: 880, d2: 1160 };
export const VAL_SIZE = 28;
// the preview
export const PREV = { x0: 48, x1: 1592, y0: 560, y1: 858, lab: 542 };
export const PAGES = { n: 5, w: 146, h: 190, gap: 30, y: 578 };
export const BAR = { y: 800, x0: 0, x1: 0 }; // x set from the pages
export const SPIN = { r: 24 };
export const FOOT_Y = 900;
export const MENU_W = 1010;

export const OLD = 'essay_v7_final_FINAL.pdf';
export const NEW = 'canteen_menu.jpg';

const fMono = F.mono(400), fMonoM = F.mono(500), fMonoS = F.mono(600), fMonoB = F.mono(700);

{
  const total = PAGES.n * PAGES.w + (PAGES.n - 1) * PAGES.gap;
  BAR.x0 = CW / 2 - total / 2; BAR.x1 = CW / 2 + total / 2;
}
export const pageX = (i: number) => BAR.x0 + i * (PAGES.w + PAGES.gap);
export const SPIN_C = { x: CW / 2, y: PAGES.y + PAGES.h / 2 };

/** Everything the card needs to know about time (song seconds), filled in by the scene. */
export interface CardTimes {
  s0: number;
  docks: number[]; // header, file, size, time, preview, footer
  up: Word[]; // "Upload", "complete."
  wr: Word[]; // "…wrong", "file."
  tAnt: number; // title anticipation
  tStamp: number;
  tClock: number; // 23:59 → 00:00
  tBar0: number; // loading starts
  tStop: number; // the drums stop: everything freezes
  tRev: number; // "…wrong": the preview opens
  tStrike0: number; tStrike1: number; // the strike across the old name
  tType0: number; tType1: number; // the new name typed
  tFoot: number;
  etas: [number, string][];
  beats: number[];
}

export interface CardLayout { titleFam: string; titleSize: number; t1x: number[]; t2x: number[]; oldW: number; newX: number }

export function cardLayout(T: CardTimes): CardLayout {
  const fam = F.archivo(100, 900);
  const l1 = T.up.map((w) => w.w).join(' '), l2 = T.wr.map((w) => w.w).join(' ');
  const w100 = Math.max(measure(l1, fam, 100), measure(l2, fam, 100));
  const size = Math.min(118, (1080 / w100) * 100);
  // word spaces opened a touch (Archivo 900's space is tight at display size)
  const xs = (ws: Word[], line: string) => { let ci = 0; return ws.map((w, i) => { const x = PAD - 4 + glyphX(line, ci, fam, size) + i * size * 0.05; ci += Array.from(w.w).length + 1; return x; }); };
  const oldW = measure(OLD, fMonoM, VAL_SIZE);
  return { titleFam: fam, titleSize: size, t1x: xs(T.up, l1), t2x: xs(T.wr, l2), oldW, newX: META.c1 + oldW + 26 };
}

/** Loading progress of the preview (0..1) at t: a chunk per beat, stuck at 99 %, frozen at the stop. */
export function loadProgress(T: CardTimes, t: number): number {
  if (t >= T.tRev) return 1;
  const te = Math.min(t, T.tStop);
  if (te < T.tBar0) return 0;
  // one chunk per beat, easing in on the hit; the chunks shrink (the estimate lies)
  const bs = T.beats.filter((b) => b >= T.tBar0 - 1e-3 && b < T.tStop - 0.3);
  const n = bs.length;
  let p = 0;
  for (let i = 0; i < n; i++) {
    const share = 0.99 * (Math.pow(0.88, i) * 0.12) / (1 - Math.pow(0.88, n));
    p += share * ease.outExpo(prog(te, bs[i]!, bs[i]! + 0.3));
  }
  return Math.min(0.99, p);
}

/** Card px x of the loading bar's head. */
export const barHeadX = (p: number) => lerp(BAR.x0, BAR.x1, p);

export function drawCard(c: CanvasRenderingContext2D, t: number, T: CardTimes, L: CardLayout) {
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  drawHeader(c, t, T);
  drawTitle(c, t, T, L);
  drawStamp(c, t, T);
  drawMeta(c, t, T, L);
  drawPreview(c, t, T);
  drawFooter(c, t, T);
}

function drawHeader(c: CanvasRenderingContext2D, t: number, T: CardTimes) {
  c.font = font(fMonoS, 26); c.fillStyle = rgba('bone', 0.95);
  c.fillText('ASSIGNMENT 4', PAD, 74);
  const w = measure('ASSIGNMENT 4', fMonoS, 26);
  c.font = font(fMono, 22); c.fillStyle = rgba('ash', 1);
  c.fillText('·  SUBMISSION RECEIPT', PAD + w + 18, 74);
  // time of day, top right
  const R = CW - PAD;
  const tm = t >= T.tClock ? '00:00' : '23:59';
  const flip = t >= T.tClock ? 1 - ease.outExpo(prog(t, T.tClock, T.tClock + 0.2)) : 0;
  c.font = font(fMonoS, 26);
  const tw = measure('00:00', fMonoS, 26);
  c.save();
  c.fillStyle = flip > 0.02 ? rgba('signal', 1) : rgba('bone', 0.95);
  c.translate(R - tw, 74 - 8 * flip);
  c.fillText(tm, 0, 0);
  c.restore();
  c.font = font(fMonoM, 14); c.fillStyle = rgba('ash', 0.9);
  c.textAlign = 'right';
  c.fillText('LOCAL TIME', R - tw - 16, 72);
  c.textAlign = 'left';
}

function drawTitle(c: CanvasRenderingContext2D, t: number, T: CardTimes, L: CardLayout) {
  const size = L.titleSize;
  // before the lyric: the upload's status line, in the machine's voice, where the title will land
  const st = 1 - prog(t, T.tAnt - 0.3, T.tAnt - 0.08);
  if (st > 0 && t >= T.docks[0]!) {
    c.font = font(fMono, 24);
    c.fillStyle = rgba('ash', 0.9 * st);
    const s = 'upload 38.0 / 38.0 MB · verifying';
    const dots = t >= T.tBar0 ? '.'.repeat(1 + (Math.floor((t - T.tBar0) / 0.23) % 3)) : '';
    c.fillText(s + dots, PAD, T1_Y - 50);
  }
  c.font = font(L.titleFam, size);
  // line 1: "Upload complete." — dim ahead, the sung word orange, then bone
  const ant = prog(t, T.tAnt, T.tAnt + 0.2);
  if (ant > 0) {
    T.up.forEach((w, i) => {
      const sung = t >= w.start;
      const next = T.up[i + 1];
      const lineDone = t >= T.up[T.up.length - 1]!.end + 0.12;
      const cur = sung && !lineDone && (!next || t < next.start);
      const pop = sung ? 1 - ease.outExpo(clamp((t - w.start) / 0.16)) : 0;
      c.fillStyle = cur ? rgba('signal', 1) : sung ? rgba('bone', 1) : rgba('bone', 0.3 * ant);
      c.fillText(w.w, L.t1x[i]!, T1_Y - 10 * pop);
    });
  }
  // line 2: "…wrong file." — slams in on "…wrong"; "file." waits dim, then lights
  if (t >= T.tRev) {
    T.wr.forEach((w, i) => {
      const sung = t >= w.start;
      const e = t - w.start;
      // lands with a short scale-down from its own centre
      const k = sung ? 1 + 0.12 * Math.pow(0.5, e / 0.045) : 1;
      const ww = measure(w.w, L.titleFam, size), yc = T2_Y - size * 0.35;
      c.save();
      c.translate(L.t2x[i]! + ww / 2, yc); c.scale(k, k);
      c.fillStyle = sung ? rgba('signal', 1) : rgba('bone', 0.3);
      c.fillText(w.w, -ww / 2, T2_Y - yc);
      c.restore();
    });
  }
}

function drawCheck(c: CanvasRenderingContext2D, x: number, y: number, s: number, k: number) {
  // a drawn tick (the fonts have no ✓): short stroke down, long stroke up
  c.beginPath();
  c.moveTo(x - 10 * s, y);
  const a = Math.min(1, k * 2);
  c.lineTo(x - 10 * s + 7 * s * a, y + 8 * s * a);
  if (k > 0.5) { const b = (k - 0.5) * 2; c.lineTo(x - 3 * s + 16 * s * b, y + 8 * s - 20 * s * b); }
  c.stroke();
}

function drawStamp(c: CanvasRenderingContext2D, t: number, T: CardTimes) {
  const e = t - T.tStamp;
  if (e < 0) return;
  const k = 1 + 0.5 * Math.pow(0.5, e / 0.035);
  const a = prog(e, 0, 0.03);
  const { x, y, w, h, rot } = STAMP;
  // on "…wrong" the stamp goes cold
  const cold = prog(t, T.tRev, T.tRev + 0.35, ease.inOutQuad);
  const ink = cold > 0 ? lerpRGB([255, 77, 18], [94, 91, 87], cold) : rgba('signal', 1);
  c.save();
  c.translate(x, y); c.rotate(rot); c.scale(k, k);
  c.globalAlpha = a;
  c.strokeStyle = ink;
  c.lineWidth = 4; c.strokeRect(-w / 2, -h / 2, w, h);
  c.lineWidth = 1.5; c.strokeRect(-w / 2 + 9, -h / 2 + 9, w - 18, h - 18);
  c.fillStyle = ink;
  c.font = font(fMonoB, 44);
  const lab = 'COMPLETE';
  const lw = measure(lab, fMonoB, 44);
  const cx0 = -(lw + 44) / 2;
  c.fillText(lab, cx0, 15);
  c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
  drawCheck(c, cx0 + lw + 30, -2, 1.25, prog(e, 0.02, 0.14));
  c.restore();
}

function drawMeta(c: CanvasRenderingContext2D, t: number, T: CardTimes, L: CardLayout) {
  const { y0, y1, lab, val, c1, c2, c3, d1, d2 } = META;
  // rules: each cell carries its own stretch (the cells dock separately)
  c.fillStyle = rgba('graphite', 1);
  for (const [a, b] of [[PAD, d1], [d1, d2], [d2, CW - PAD]] as const) { c.fillRect(a, y0, b - a, 1.5); c.fillRect(a, y1, b - a, 1.5); }
  c.fillRect(d1 - 0.75, y0 + 14, 1.5, y1 - y0 - 28);
  c.fillRect(d2 - 0.75, y0 + 14, 1.5, y1 - y0 - 28);
  c.font = font(fMonoM, 14); c.fillStyle = rgba('ash', 0.9);
  c.letterSpacing = '2px';
  c.fillText('FILE', c1, lab); c.fillText('SIZE', c2, lab); c.fillText('SUBMITTED', c3, lab);
  c.letterSpacing = '0px';
  c.font = font(fMonoM, VAL_SIZE);
  // the file name: struck through on "…wrong", the real one typed on "file."
  const sp = prog(t, T.tStrike0, T.tStrike1, ease.inOutQuad);
  c.fillStyle = sp > 0 ? rgba('ash', lerp(1, 0.62, sp)) : rgba('bone', 1);
  c.fillText(OLD, c1, val);
  if (sp > 0) {
    c.fillStyle = rgba('signal', 1);
    c.fillRect(c1 - 6, val - VAL_SIZE * 0.34 - 1.75, (L.oldW + 12) * sp, 3.5);
  }
  if (t >= T.tType0) {
    const n = Math.floor(prog(t, T.tType0, T.tType1) * NEW.length + 1e-6);
    c.fillStyle = rgba('bone', 1);
    c.fillText(NEW.slice(0, Math.max(1, n)), L.newX, val);
  }
  c.fillStyle = rgba('bone', 1);
  c.fillText('38.0 MB', c2, val);
  c.fillText('23:59:59.99', c3, val);
}

/** Card px x at the end of the typed part of the new file name (where the spark sits). */
export function typedEndX(t: number, T: CardTimes, L: CardLayout) {
  const n = Math.floor(prog(t, T.tType0, T.tType1) * NEW.length + 1e-6);
  return L.newX + measure(NEW.slice(0, Math.max(1, n)), fMonoM, VAL_SIZE);
}

function drawPreview(c: CanvasRenderingContext2D, t: number, T: CardTimes) {
  const { x0, x1, y0, y1 } = PREV;
  const rev = t >= T.tRev;
  const named = t >= T.wr[1]!.start;
  // label
  c.font = font(fMonoM, 14); c.fillStyle = rgba('ash', 0.9);
  c.letterSpacing = '2px';
  c.fillText('PREVIEW', x0, PREV.lab);
  const lw = measure('PREVIEW', fMonoM, 14) + 2 * 7;
  c.letterSpacing = '0px';
  c.font = font(fMono, 16); c.fillStyle = rgba('graphite', 1);
  c.fillText(named ? `·  ${NEW}  ·  1 image` : `·  ${OLD}  ·  12 pages`, x0 + lw + 14, PREV.lab);
  // box
  c.strokeStyle = rgba('graphite', 1); c.lineWidth = 1.5;
  c.strokeRect(x0, y0, x1 - x0, y1 - y0);
  // corner ticks inside the box
  c.strokeStyle = rgba('ash', 0.7);
  for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
    c.beginPath(); c.moveTo(x + sx * 8, y + sy * 22); c.lineTo(x + sx * 8, y + sy * 8); c.lineTo(x + sx * 22, y + sy * 8); c.stroke();
  }
  if (rev) {
    // the preview opens: it is the canteen's dream menu
    const k = (i: number) => ease.outExpo(prog(t, T.tRev + 0.02 * i, T.tRev + 0.1 + 0.02 * i));
    drawDreamMenu(c, CW / 2 - MENU_W / 2, y0 + 16, MENU_W, { pop: k, title: 'MENU' });
    return;
  }
  const tf = Math.min(t, T.tStop); // frozen at the stop
  // five page skeletons: the essay we expect
  const bs = T.beats;
  let lastB = T.tBar0;
  for (const b of bs) if (b <= tf) lastB = b;
  const sweep = prog(tf, lastB, lastB + 0.42, ease.inOutQuad); // a shimmer band per beat
  for (let i = 0; i < PAGES.n; i++) {
    const px = pageX(i), py = PAGES.y, w = PAGES.w, h = PAGES.h;
    c.strokeStyle = rgba('graphite', 1); c.lineWidth = 1.5;
    c.strokeRect(px, py, w, h);
    // dog-ear
    c.beginPath(); c.moveTo(px + w - 18, py); c.lineTo(px + w - 18, py + 18); c.lineTo(px + w, py + 18); c.stroke();
    const bars: [number, number, number][] = i === 0
      ? [[16, 30, 0.72], [16, 44, 0.45], [16, 66, 0.86], [16, 76, 0.8], [16, 86, 0.84], [16, 96, 0.6], [16, 114, 0.86], [16, 124, 0.82], [16, 134, 0.86], [16, 144, 0.7], [16, 162, 0.5]]
      : [[16, 30, 0.86], [16, 40, 0.82], [16, 50, 0.86], [16, 60, 0.55], [16, 78, 0.86], [16, 88, 0.84], [16, 98, 0.86], [16, 108, 0.8], [16, 118, 0.62], [16, 136, 0.86], [16, 146, 0.83], [16, 156, 0.72]];
    for (const [bx, by, f] of bars) {
      const bw = (w - 32) * f * (0.94 + 0.06 * Math.sin(i * 7.1 + by));
      const th = i === 0 && by === 30 ? 7 : 4;
      // shimmer: brighter where the band passes (it runs across the whole strip)
      const u = (px + bx + bw / 2 - BAR.x0) / (BAR.x1 - BAR.x0);
      const sh = t >= T.tBar0 ? Math.exp(-(((u - lerp(-0.2, 1.2, sweep)) / 0.1) ** 2)) : 0;
      c.fillStyle = rgba(sh > 0.3 ? 'ash' : 'graphite', 0.55 + 0.4 * sh);
      c.fillRect(px + bx, py + by, bw, th);
    }
  }
  // the spinner, over the middle page
  if (t >= T.tBar0 - 0.2) {
    const a = prog(t, T.tBar0 - 0.2, T.tBar0);
    const { x, y } = SPIN_C;
    c.fillStyle = rgba('ink2', 0.94 * a);
    c.beginPath(); c.arc(x, y, SPIN.r + 16, 0, TAU); c.fill();
    c.strokeStyle = rgba('graphite', a); c.lineWidth = 2;
    c.beginPath(); c.arc(x, y, SPIN.r, 0, TAU); c.stroke();
    const a0 = (tf - T.tBar0) * 5.2;
    c.strokeStyle = rgba('bone', 0.95 * a); c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.arc(x, y, SPIN.r, a0, a0 + 1.7); c.stroke();
    c.lineCap = 'butt';
  }
  // the loading bar: track, orange fill (the spark rides its head)
  if (t >= T.tBar0 - 0.1) {
    const p = loadProgress(T, t);
    const y = BAR.y;
    c.fillStyle = rgba('graphite', 1);
    c.fillRect(BAR.x0, y - 0.75, BAR.x1 - BAR.x0, 1.5);
    for (let i = 0; i <= 10; i++) c.fillRect(BAR.x0 + (i / 10) * (BAR.x1 - BAR.x0) - 0.75, y + 4, 1.5, i % 5 === 0 ? 10 : 5);
    c.fillStyle = rgba('signal', 1);
    c.fillRect(BAR.x0, y - 1.5, barHeadX(p) - BAR.x0, 3);
    // readouts
    c.font = font(fMono, 17);
    let eta = T.etas[0]![1];
    for (const [te, s] of T.etas) if (tf >= te) eta = s;
    c.fillStyle = rgba('ash', 1);
    c.fillText(`rendering preview · ${eta}`, BAR.x0, y + 40);
    // 99 % strains: the tenths flicker while it is stuck
    let pct = Math.floor(p * 100);
    let s = `${pct} %`;
    if (p >= 0.989) {
      const k = Math.floor((tf - T.tBar0) * 12);
      s = t >= T.tStop ? '99 %' : `99.${Math.floor(9 * fr(k * 0.618))} %`;
      pct = 99;
    }
    c.textAlign = 'right';
    c.fillStyle = rgba(p >= 0.989 ? 'bone' : 'ash', 1);
    c.fillText(s, BAR.x1, y + 40);
    c.textAlign = 'left';
  }
}
const fr = (x: number) => x - Math.floor(x);
const lerpRGB = (a: number[], b: number[], k: number) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i]!, k))).join(',')})`;

function drawFooter(c: CanvasRenderingContext2D, t: number, T: CardTimes) {
  c.font = font(fMono, 18);
  c.fillStyle = rgba('graphite', 1);
  c.fillText('receipt 4-235959-99', PAD, FOOT_Y);
  c.textAlign = 'right';
  const a = 'keep this receipt for your records';
  const b = 'resubmissions are not accepted';
  if (t < T.tFoot) {
    c.fillText(a, CW - PAD, FOOT_Y);
  } else {
    const n = Math.floor(prog(t, T.tFoot, T.tFoot + 0.3) * b.length + 1e-6);
    c.fillStyle = rgba('ash', 1);
    // typed from the left of its final extent
    const w = measure(b, fMono, 18);
    c.textAlign = 'left';
    c.fillText(b.slice(0, n), CW - PAD - w, FOOT_Y);
    if (n < b.length) { c.fillStyle = rgba('bone', 0.85); c.fillRect(CW - PAD - w + measure(b.slice(0, n), fMono, 18) + 2, FOOT_Y - 14, 10, 17); }
  }
  c.textAlign = 'left';
}

