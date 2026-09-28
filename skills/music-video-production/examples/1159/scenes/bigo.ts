// `bigo` — "O of n squared panic, but I'm doing fine".
// Graph paper (ink, bone hairlines, mono axis labels): x = n (assignments due), y = panic. The
// spark draws O(n²) one step per sung word, and the lyric builds the curve's label as maths:
// O / ( / n / ²) in Cormorant. On "panic" the spark shoots off the top and the camera whips up
// after it (the world streaks). On the 43.45 downbeat the view snaps back down past the origin
// onto the flat O(1) line, which the spark lands on and ignites; "but I'm doing fine¹" is set
// calmly along it, with a footnote. The spark rests there, breathing, to the end.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, makeRT } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { LIN, rgba } from '../../engine/palette';
import { F, font, layout, measure, type TextLayout } from '../../engine/type';
import { Lyrics, norm, type Line, type Word } from '../../engine/lyrics';
import { clamp, ease, lerp, prog, pulse, TAU, hash } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { makeGridPass, makeStreakPass, UX, UY } from './bigo-glsl';

type Cam = { cx: number; cy: number; z: number };
type P2 = { x: number; y: number };
type RGB = [number, number, number];

const NA = 12; // n reached by the spark at the top of the whip
const CFLAT = 2; // the O(1) line: panic = 2, forever
const YFLAT = CFLAT * UY;
const REF_N = 3; // the O(n) reference: panic = 3n
const SPX = 1480; // screen x of the spark after the snap (its resting place)
const OXF = 236, OYF = 900; // screen position of the origin after the snap
const SNAP_DUR = 0.17;
const EXPOSURE = 1 / 90; // stylised streak exposure (s)

const mix3 = (a: RGB, b: RGB, k: number): RGB => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const mul3 = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

function wordOf(l: Line, q: string): Word {
  const n = norm(q);
  const w = l.words.find((x) => norm(x.w) === n);
  if (!w) throw new Error(`bigo: word not found: ${q}`);
  return w;
}

export interface Piece { txt: string; fam: string; x: number; dy: number; s: number; word: Word }

/** The O(n²) label typeset as maths (size-100 units): O and n italic, ( ) and ² roman. Shared with bigo2. */
export function buildHero(wO: Word, wOf: Word, wN: Word, wSq: Word): { pieces: Piece[]; width: number } {
  const fi = F.serif(600, true), fr = F.serif(600, false);
  const m = (s: string, f: string, sz = 100) => measure(s, f, sz);
  const xO = 0, xP = xO + m('O', fi) + 1.5;
  const xn = xP + m('(', fr) + 0.5;
  const x2 = xn + m('n', fi) + 1.2;
  const xC = x2 + m('2', fr, 58) + 2.5;
  return {
    pieces: [
      { txt: 'O', fam: fi, x: xO, dy: 0, s: 1, word: wO },
      { txt: '(', fam: fr, x: xP, dy: 0, s: 1, word: wOf },
      { txt: 'n', fam: fi, x: xn, dy: 0, s: 1, word: wN },
      { txt: '2', fam: fr, x: x2, dy: -36, s: 0.58, word: wSq },
      { txt: ')', fam: fr, x: xC, dy: 0, s: 1, word: wSq },
    ],
    width: xC + m(')', fr),
  };
}

/** A small "O(x)" in Cormorant: O italic, parentheses roman, argument italic (or a lining figure). */
export function mathLabel(c: CanvasRenderingContext2D, x: number, y: number, size: number, arg: string, col: string) {
  const fi = F.serif(400, true), fr = F.serif(400, false);
  const argFam = /\d/.test(arg) ? fr : fi;
  c.fillStyle = col;
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  let xx = x;
  c.font = font(fi, size); c.fillText('O', xx, y); xx += measure('O', fi, size) + size * 0.015;
  c.font = font(fr, size); c.fillText('(', xx, y); xx += measure('(', fr, size) + size * 0.005;
  c.font = font(argFam, size); c.fillText(arg, xx, y); xx += measure(arg, argFam, size) + size * 0.02;
  c.font = font(fr, size); c.fillText(')', xx, y);
  return xx + measure(')', fr, size) - x;
}

export default class BigO extends Scene {
  grid = makeGridPass();
  streak = makeStreakPass();
  rtW = makeRT();
  ink = new LineBatch(30000, { blend: 'normal' });
  glowW = new LineBatch(12000);
  fx = new LineBatch(6000);
  wl = new Layer2D();
  sl = new Layer2D();

  L!: Line;
  wO!: Word; wOf!: Word; wN!: Word; wSq!: Word; wPanic!: Word;
  wBut!: Word; wIm!: Word; wDoing!: Word; wFine!: Word;
  T0 = 0; T1 = 0;
  tPanic = 0; tArr = 0; tExit = 0; tSnap = 0; tLand = 0;
  steps: number[] = [];
  hero: Piece[] = [];
  heroW = 0;
  row!: TextLayout;
  rowWords: { w: Word; i0: number; i1: number }[] = [];
  famRow = F.archivo(112.5, 300);
  rowSize = 88;
  rowX = 560;

  override init() {
    const ly = this.ctx.lyrics, au = this.ctx.audio;
    this.T0 = this.ctx.start; this.T1 = this.ctx.end;
    const L = (this.L = ly.get('O of n squared'));
    this.wO = L.words[0]!;
    this.wOf = wordOf(L, 'of');
    this.wN = wordOf(L, 'n');
    this.wSq = wordOf(L, 'squared');
    this.wPanic = wordOf(L, 'panic');
    this.wBut = wordOf(L, 'but');
    this.wIm = wordOf(L, "I'm");
    this.wDoing = wordOf(L, 'doing');
    this.wFine = wordOf(L, 'fine');
    this.steps = [this.wO.start, this.wOf.start, this.wN.start, this.wSq.start];
    this.tPanic = this.wPanic.start;
    // the camera arrives at the top of the whip on the third beat after "panic"
    this.tArr = au.timeOfBeat(Math.floor(au.beatAt(this.tPanic)) + 4);
    this.tExit = au.timeOfBeat(Math.floor(au.beatAt(this.tPanic)) + 3);
    // the snap: first downbeat at/after "but"
    this.tSnap = au.downbeats.find((d) => d >= this.wBut.start - 0.02) ?? this.wBut.start + 0.4;
    // spark lands when the snap's ease reaches 1/1.12 (see sparkWorld)
    this.tLand = this.tSnap + SNAP_DUR * (Math.log2(1 / (1 - 1 / 1.12)) / 10);

    // ---- the O(n²) label, typeset as maths (size-100 units): O and n italic, ( ) and ² roman
    ({ pieces: this.hero, width: this.heroW } = buildHero(this.wO, this.wOf, this.wN, this.wSq));

    // ---- "but I'm doing fine" (one kerned run; words drawn from its glyphs)
    const ws = [this.wBut, this.wIm, this.wDoing, this.wFine];
    const txt = ws.map((w) => w.w.replace(/[,.]$/, '')).join(' ');
    this.row = layout(txt, this.famRow, this.rowSize, 1);
    let ci = 0;
    for (const w of ws) {
      const len = Array.from(w.w.replace(/[,.]$/, '')).length;
      this.rowWords.push({ w, i0: ci, i1: ci + len });
      ci += len + 1;
    }
  }

  // ------------------------------------------------------------------ time → space
  /** Steps completed by t (0..4, continuous): one outExpo step per sung word. */
  stepsAt(t: number) {
    let k = 0;
    for (const s of this.steps) k += ease.outExpo(clamp((t - s) / 0.22));
    return k;
  }

  camFromOrigin(ox: number, oy: number, z: number): Cam {
    return { cx: (960 - ox) / z, cy: (oy - 540) / z, z };
  }

  introCam(t: number): Cam {
    const k = this.stepsAt(t);
    const open = prog(t, this.T0, this.T0 + 0.6, ease.outCubic);
    return this.camFromOrigin(262 - 6 * k, 900 + 10 * k + 14 * (1 - open), 0.97 + 0.03 * open + 0.024 * k);
  }

  /** Spark height at the top of the whip (and its slow drift while the camera hangs there). */
  sparkApexY(t: number) {
    return UY * NA * NA + 70 * Math.max(0, t - this.tArr);
  }

  whipCam(t: number): Cam {
    const c0 = this.introCam(this.tPanic);
    const u = prog(t, this.tPanic + 0.02, this.tArr);
    const e = ease.outExpo(u * u);
    const cyA = UY * NA * NA - (540 - 250);
    const z = lerp(c0.z, 1.0, e) * (1 - 0.06 * Math.sin(Math.PI * clamp(u / 0.5)));
    const cy = lerp(c0.cy, cyA, e) + 55 * Math.max(0, t - this.tArr);
    // track the curve: the point that will sit at screen y 250 is held near x = SPX
    const nT = Math.sqrt(Math.max(0, cy + (540 - 250) / z) / UY);
    const cxT = nT * UX - (SPX - 960) / z;
    const w = prog(t, this.tPanic + 0.12, this.tPanic + 0.95, ease.inOutCubic);
    return { cx: lerp(c0.cx, cxT, w), cy, z };
  }

  finalCam(): Cam {
    const xs = this.sparkX0();
    return this.camFromOrigin(OXF, OYF, (SPX - OXF) / xs);
  }
  /** The spark's world x at the snap (it falls straight down from there). */
  sparkX0() {
    return UX * Math.sqrt(this.sparkApexY(this.tSnap) / UY);
  }

  /** Screen-space overshoot after the snap (positive = the world rides up: the camera went past). */
  overshoot(t: number) {
    const v = t - this.tSnap - 0.09;
    if (v <= 0) return 0;
    return 46 * Math.sin(TAU * 2.4 * v) * Math.exp(-v / 0.14);
  }
  /** Slow push-in during the hold (applied around a screen anchor). */
  settle(t: number) {
    return 1 + 0.028 * prog(t, this.tSnap + 0.25, this.T1, ease.linear);
  }
  static ANCHOR = { x: 900, y: 780 };

  cam(t: number): Cam {
    if (t < this.tPanic) return this.introCam(t);
    if (t < this.tSnap) return this.whipCam(t);
    const A = this.whipCam(this.tSnap);
    const Fc = this.finalCam();
    const xs = this.sparkX0();
    const e = ease.outExpo(prog(t, this.tSnap, this.tSnap + SNAP_DUR));
    const z = Math.exp(lerp(Math.log(A.z), Math.log(Fc.z), e));
    const sxA = 960 + (xs - A.cx) * A.z;
    const sx = lerp(sxA, SPX, e);
    let c: Cam = { cx: xs - (sx - 960) / z, cy: lerp(A.cy, Fc.cy, e), z };
    c.cy -= this.overshoot(t) / z;
    // settle push around the anchor
    const k = this.settle(t), a = BigO.ANCHOR;
    const wa = this.s2w(a.x, a.y, c);
    const z2 = z * k;
    c = { cx: wa.x - (a.x - 960) / z2, cy: wa.y + (a.y - 540) / z2, z: z2 };
    return c;
  }

  w2s(X: number, Y: number, c: Cam): P2 { return { x: 960 + (X - c.cx) * c.z, y: 540 - (Y - c.cy) * c.z }; }
  s2w(x: number, y: number, c: Cam): P2 { return { x: c.cx + (x - 960) / c.z, y: c.cy - (y - 540) / c.z }; }
  /** A point laid out in the final (post-snap) frame, as seen now: overshoot + settle push only. */
  finalToScreen(p: P2, t: number): P2 {
    if (t < this.tSnap) return p;
    const q = { x: p.x, y: p.y - this.overshoot(t) };
    const k = this.settle(t), a = BigO.ANCHOR;
    return { x: a.x + (q.x - a.x) * k, y: a.y + (q.y - a.y) * k };
  }
  finalScale(t: number) { return t < this.tSnap ? 1 : this.settle(t); }

  sparkWorld(t: number): P2 {
    if (t < this.tPanic) {
      const n = this.stepsAt(t);
      return { x: UX * n, y: UY * n * n };
    }
    if (t < this.tSnap) {
      const y4 = UY * 16;
      const y = lerp(y4, this.sparkApexY(this.tArr), ease.outExpo(prog(t, this.tPanic, this.tArr))) + 70 * Math.max(0, t - this.tArr);
      return { x: UX * Math.sqrt(y / UY), y };
    }
    const e = Math.min(1, 1.12 * ease.outExpo(prog(t, this.tSnap, this.tSnap + SNAP_DUR)));
    return { x: this.sparkX0(), y: lerp(this.sparkApexY(this.tSnap), YFLAT, e) };
  }
  sparkScreen(t: number): P2 {
    const p = this.sparkWorld(t);
    return this.w2s(p.x, p.y, this.cam(t));
  }

  // ------------------------------------------------------------------ render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const cam = this.cam(t);

    // ---- graph paper
    const g = this.grid.u;
    (g.uCam!.value as THREE.Vector2).set(cam.cx, cam.cy);
    g.uZ!.value = cam.z;
    g.uA!.value = prog(t, this.T0 - 0.05, this.T0 + 0.3, ease.outCubic);
    g.uCross!.value = 1;
    this.grid.render(renderer, this.rtW);

    this.drawWorldLines(t, cam);
    this.ink.render(renderer, this.rtW);
    this.glowW.render(renderer, this.rtW);
    this.drawWorldText(t, cam);
    comp.draw(renderer, this.wl.upload(), this.rtW);

    // ---- streak: where was each world point EXPOSURE ago (centred)?
    const c0 = this.cam(t - EXPOSURE / 2), c1 = this.cam(t + EXPOSURE / 2);
    // screen_prev = A * s + B maps c1-screen to c0-screen; the pass samples ±1/2 of it around s
    const Aff = c0.z / c1.z;
    const Bx = 960 * (1 - Aff) + (c1.cx - c0.cx) * c0.z;
    const By = 540 * (1 - Aff) - (c1.cy - c0.cy) * c0.z;
    this.streak.u.uSrc!.value = this.rtW.texture;
    this.streak.u.uAff!.value = Aff;
    (this.streak.u.uB!.value as THREE.Vector2).set(Bx, By);
    this.streak.render(renderer, out);

    // ---- screen-space type
    this.drawScreenText(t, cam);
    comp.draw(renderer, this.sl.upload(), out);

    // ---- the spark
    this.drawSpark(t, f);
    this.fx.render(renderer, out);

    // ---- post
    const au = this.ctx.audio;
    const launch = pulse(t, this.tPanic, 0.09);
    const snap = pulse(t, this.tSnap, 0.08);
    const land = pulse(t, this.tLand, 0.1);
    let stepPunch = 0;
    for (const s of this.steps) stepPunch = Math.max(stepPunch, pulse(t, s, 0.07));
    const sh = Math.max(0.6 * launch, snap, 0.5 * land);
    const shake: [number, number] = [Math.sin(t * 93.1) * 16 * sh, Math.cos(t * 71.7) * 12 * sh];
    const whipV = this.whipSpeed(t);
    return {
      bloom: 0.62 - 0.22 * prog(t, this.tPanic - 0.02, this.tPanic + 0.05) * (1 - prog(t, this.tExit, this.tExit + 0.3)),
      vignette: 0.42,
      shake,
      zoom: 1 + 0.012 * stepPunch + 0.02 * land,
      ca: 1.1 + 2.8 * sh + 2.2 * whipV,
      grain: 0.055,
      fade: prog(t, this.T1 - 0.5, this.T1, ease.inQuad),
      halation: 0.25 + 0.1 * au.env('drums', t),
    };
  }

  /** 0..1 how hard the camera is moving vertically (for CA / streak-driven extras). */
  whipSpeed(t: number) {
    const a = this.cam(t - 0.01), b = this.cam(t + 0.01);
    return clamp(Math.abs(b.cy - a.cy) * b.z / 0.02 / 12000);
  }

  // ------------------------------------------------------------------ world lines
  drawWorldLines(t: number, cam: Cam) {
    const lb = this.ink, gw = this.glowW;
    lb.clear(); gw.clear();
    const BONE = LIN.bone, GR = LIN.graphite, ASH = LIN.ash;
    const S = (X: number, Y: number) => this.w2s(X, Y, cam);
    const vx0 = cam.cx - 980 / cam.z, vx1 = cam.cx + 980 / cam.z;
    const vy0 = cam.cy - 560 / cam.z, vy1 = cam.cy + 560 / cam.z;
    const T0 = this.T0;

    // axes draw out of the origin
    const axA = prog(t, T0 - 0.02, T0 + 0.4, ease.outExpo);
    if (axA > 0) {
      const xe = Math.min(vx1, lerp(0, 14000, axA * axA));
      const ye = Math.min(vy1, lerp(0, 60000, axA * axA));
      if (xe > Math.max(0, vx0) && vy0 < 0 && vy1 > 0) { const a = S(Math.max(0, vx0), 0), b = S(xe, 0); lb.seg2(a.x, a.y, b.x, b.y, 1.5, BONE, 0.85); }
      if (ye > Math.max(0, vy0) && vx0 < 0 && vx1 > 0) { const a = S(0, Math.max(0, vy0)), b = S(0, ye); lb.seg2(a.x, a.y, b.x, b.y, 1.5, BONE, 0.85); }
      // ticks (outside the quadrant, 9 px), every n on x, every 5 panic on y
      const tk = 9;
      for (let i = Math.max(1, Math.ceil(vx0 / UX)); i * UX < Math.min(vx1, xe); i++) {
        const p = S(i * UX, 0);
        lb.seg2(p.x, p.y, p.x, p.y + tk, 1.2, BONE, 0.75);
      }
      for (let j = Math.max(1, Math.ceil(vy0 / (5 * UY))); j * 5 * UY < Math.min(vy1, ye); j++) {
        const p = S(0, j * 5 * UY);
        lb.seg2(p.x - tk, p.y, p.x, p.y, 1.2, BONE, 0.75);
      }
    }

    // reference curves (dashed, dim): O(n) and O(1)
    const refA = prog(t, T0 + 0.08, T0 + 0.55, ease.outCubic);
    if (refA > 0) {
      // O(n): panic = REF_N * n
      const k = (REF_N * UY) / UX;
      const xEnd = lerp(0, 16000, refA * refA);
      this.dashedSeg(lb, S(0, 0), S(xEnd, k * xEnd), 1.2, ASH, 0.5, 10, 8, cam);
      // O(1): hidden where the spark has lit it
      const lit = this.flatLit(t);
      const x0 = lit ? lit.x1 : 0;
      this.dashedSeg(lb, S(x0, YFLAT), S(Math.max(x0, xEnd), YFLAT), 1.2, ASH, 0.6 * (lit ? 0.8 : 1), 10, 8, cam);
    }

    // the n² curve, drawn by the spark (orange while hot, cooling to ash after the snap)
    const sp = this.sparkWorld(Math.min(t, this.tSnap - 1e-4));
    const nHead = Math.sqrt(Math.max(0, sp.y / UY));
    const cool = prog(t, this.tSnap + 0.05, this.tSnap + 0.6, ease.inOutQuad);
    if (nHead > 0.001) {
      const pts = this.parabola(0, nHead, cam);
      const hot = mul3(LIN.signal, 1.5), core = mul3(LIN.ember, 1.25);
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1]!, b = pts[i]!;
        if (cool < 1) {
          gw.seg2(a.x, a.y, b.x, b.y, 7, mul3(LIN.signal, 0.16 * (1 - cool)), 1);
          gw.seg2(a.x, a.y, b.x, b.y, 2.2, mix3(hot, [0, 0, 0], cool), 1);
          gw.seg2(a.x, a.y, b.x, b.y, 0.9, mix3(core, [0, 0, 0], cool), 1);
        }
        if (cool > 0) lb.seg2(a.x, a.y, b.x, b.y, 1.6, ASH, 0.75 * cool);
      }
    }

    // data points at the integer steps
    for (let i = 0; i < 4; i++) {
      const k0 = prog(t, this.steps[i]! + 0.12, this.steps[i]! + 0.3);
      if (k0 <= 0) continue;
      const k = ease.outBack(k0);
      const n = i + 1;
      const p = S(n * UX, n * n * UY);
      const r = 5.5 * k;
      const col = t > this.tSnap ? ASH : BONE;
      for (let s = 0; s < 18; s++) {
        const a0 = (s / 18) * TAU, a1 = ((s + 1) / 18) * TAU;
        lb.seg2(p.x + Math.cos(a0) * r, p.y + Math.sin(a0) * r, p.x + Math.cos(a1) * r, p.y + Math.sin(a1) * r, 1.3, col, 0.9);
      }
    }

    // the O(1) line, lit by the spark's landing: a front runs from the spark back to the axis
    const lit = this.flatLit(t);
    if (lit) {
      const a = S(lit.x0, YFLAT), b = S(lit.x1, YFLAT);
      const I = 1 + 1.4 * pulse(t, this.tLand, 0.12);
      gw.seg2(a.x, a.y, b.x, b.y, 7, mul3(LIN.signal, 0.12 * I), 1);
      gw.seg2(a.x, a.y, b.x, b.y, 2.0, mul3(LIN.signal, 1.25 * I), 1);
      gw.seg2(a.x, a.y, b.x, b.y, 0.8, mul3(LIN.ember, 1.1 * I), 1);
      // the front itself
      const fr = pulse(t, this.tLand, 0.2) * (1 - prog(t, this.tLand + 0.3, this.tLand + 0.36));
      if (fr > 0.02) gw.seg2(a.x, a.y, a.x + 0.1, a.y, 14, mul3(LIN.ember, 2 * fr), 0.8);
    }

    // right-edge panic scale while the axis is out of sight (the whip)
    const scA = prog(t, this.tPanic + 0.1, this.tPanic + 0.35) * (1 - prog(t, this.tSnap, this.tSnap + 0.08));
    if (scA > 0) {
      const step = 5 * UY;
      for (let j = Math.ceil(vy0 / step); j * step < vy1; j++) {
        if (j <= 0) continue;
        const p = S(0, j * step);
        lb.seg2(1800, p.y, 1824, p.y, 1.2, BONE, 0.7 * scA);
        for (let m = 1; m < 5; m++) {
          const q = S(0, j * step + m * UY);
          lb.seg2(1814, q.y, 1824, q.y, 1, GR, 0.9 * scA);
        }
      }
      lb.seg2(1824, 0, 1824, 1080, 1, GR, 0.8 * scA);
    }
  }

  /** Lit part of the O(1) line in world x (null before the landing). */
  flatLit(t: number): { x0: number; x1: number } | null {
    if (t < this.tLand) return null;
    const xs = this.sparkX0();
    return { x0: lerp(xs, 0, prog(t, this.tLand, this.tLand + 0.34, ease.outCubic)), x1: xs };
  }

  /** Screen points along y = n² from n0 to n1, ~5 px apart, culled to the view. */
  parabola(n0: number, n1: number, cam: Cam): P2[] {
    const pts: P2[] = [];
    let n = n0;
    let last: P2 | null = null;
    while (n < n1) {
      const p = this.w2s(n * UX, UY * n * n, cam);
      const vis = p.y > -300 && p.y < 1380 && p.x > -300 && p.x < 2220;
      if (vis || (last && last.y > -300 && last.y < 1380)) pts.push(p);
      else if (pts.length) { /* left the view */ }
      last = p;
      const speed = Math.hypot(UX, 2 * n * UY) * cam.z; // screen px per unit n
      n += Math.max(1e-4, 5 / speed);
    }
    pts.push(this.w2s(n1 * UX, UY * n1 * n1, cam));
    return pts;
  }

  dashedSeg(lb: LineBatch, a: P2, b: P2, w: number, col: RGB, alpha: number, dash: number, gap: number, _cam: Cam) {
    // clip to a generous view box first
    const clip = this.clipSeg(a, b, -40, -40, 1960, 1120);
    if (!clip) return;
    const [p, q] = clip;
    // dash phase anchored to the unclipped start, so dashes stay world-fixed
    const L = Math.hypot(b.x - a.x, b.y - a.y);
    if (L < 1e-3) return;
    const dx = (b.x - a.x) / L, dy = (b.y - a.y) / L;
    const s0 = (p.x - a.x) * dx + (p.y - a.y) * dy, s1 = (q.x - a.x) * dx + (q.y - a.y) * dy;
    const per = dash + gap;
    for (let s = Math.floor(s0 / per) * per; s < s1; s += per) {
      const u0 = Math.max(s, s0), u1 = Math.min(s + dash, s1);
      if (u1 <= u0) continue;
      lb.seg2(a.x + dx * u0, a.y + dy * u0, a.x + dx * u1, a.y + dy * u1, w, col, alpha);
    }
  }

  /** Liang–Barsky clip of a segment to a box. */
  clipSeg(a: P2, b: P2, x0: number, y0: number, x1: number, y1: number): [P2, P2] | null {
    let t0 = 0, t1 = 1;
    const dx = b.x - a.x, dy = b.y - a.y;
    const pq: [number, number][] = [[-dx, a.x - x0], [dx, x1 - a.x], [-dy, a.y - y0], [dy, y1 - a.y]];
    for (const [p, q] of pq) {
      if (p === 0) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [{ x: a.x + dx * t0, y: a.y + dy * t0 }, { x: a.x + dx * t1, y: a.y + dy * t1 }];
  }

  // ------------------------------------------------------------------ world text
  drawWorldText(t: number, cam: Cam) {
    const L = this.wl; L.clear(); const c = L.ctx;
    const S = (X: number, Y: number) => this.w2s(X, Y, cam);
    const T0 = this.T0;
    const vx0 = cam.cx - 980 / cam.z, vx1 = cam.cx + 980 / cam.z;
    const vy0 = cam.cy - 560 / cam.z, vy1 = cam.cy + 560 / cam.z;
    const labA = prog(t, T0 + 0.1, T0 + 0.45);
    const mono = F.mono(400);
    const post = t >= this.tSnap;

    // tick labels (constant screen size, world-anchored)
    if (labA > 0) {
      c.font = font(mono, 17);
      c.textBaseline = 'top'; c.textAlign = 'center';
      const every = cam.z < 0.7 ? 2 : 1;
      for (let i = Math.max(1, Math.ceil(vx0 / UX)); i * UX < vx1; i++) {
        if (i % every) continue;
        const p = S(i * UX, 0);
        if (p.x > 1830) continue;
        c.fillStyle = rgba('ash', 0.9 * labA);
        c.fillText(String(i), p.x, p.y + 16);
      }
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (let j = Math.max(1, Math.ceil(vy0 / (5 * UY))); j * 5 * UY < vy1; j++) {
        if (cam.z < 0.7 && j % 2) continue;
        const p = S(0, j * 5 * UY);
        if (p.x < 60) continue;
        c.fillStyle = rgba('ash', 0.9 * labA);
        c.fillText(String(j * 5), p.x - 16, p.y);
      }
      // axis titles
      const o = S(0, 0);
      c.font = font(F.mono(500), 19);
      c.textAlign = 'right'; c.textBaseline = 'top';
      c.fillStyle = rgba('bone', 0.85 * labA);
      const xt = 'n (assignments due) →';
      c.fillText(xt, Math.min(1824, S(vx1, 0).x - 96), o.y + 44);
      // y title: rotated, reading upward, flares orange while "panic" is sung
      const pk = Lyrics.wordProgress(this.wPanic, t);
      const flare = pk > 0 && pk < 1;
      const yTop = Math.max(150, S(0, vy1).y + 150);
      if (o.x > 40) {
        c.save();
        c.translate(o.x - 52, yTop);
        c.rotate(-Math.PI / 2);
        c.textAlign = 'right'; c.textBaseline = 'middle';
        c.fillStyle = flare ? rgba('signal', 1) : rgba('bone', 0.85 * labA);
        c.fillText('panic →', 0, 0);
        c.restore();
      }
    }

    // data-point values (n² at each step)
    c.font = font(F.mono(500), 16);
    c.textAlign = 'right'; c.textBaseline = 'bottom';
    for (let i = 0; i < 4; i++) {
      const k = prog(t, this.steps[i]! + 0.1, this.steps[i]! + 0.22) * (1 - prog(t, this.tSnap, this.tSnap + 0.1));
      if (k <= 0) continue;
      const n = i + 1;
      const p = S(n * UX, n * n * UY);
      c.fillStyle = rgba(post ? 'graphite' : 'ash', k);
      c.fillText(String(n * n), p.x - 12, p.y - 8);
    }

    // reference labels
    const refL = prog(t, T0 + 0.35, T0 + 0.6) * (1 - prog(t, this.tSnap, this.tSnap + 0.1));
    if (refL > 0) {
      c.font = font(F.serif(400, true), 40);
      c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      c.fillStyle = rgba('ash', 0.85 * refL);
      const k = (REF_N * UY) / UX;
      const xr = 6.3 * UX;
      const pr = S(xr, k * xr);
      this.mathLabel(c, pr.x + 22, pr.y + 8, 40, 'n', rgba('ash', 0.85 * refL));
      const p1 = S(6.55 * UX, YFLAT);
      this.mathLabel(c, p1.x, p1.y - 12, 40, '1', rgba('ash', 0.85 * refL));
    }

    // the hero label O(n²): the lyric, typeset as the curve's label
    this.drawHero(c, t, cam);

    // panic scale labels at the right edge during the whip
    const scA = prog(t, this.tPanic + 0.1, this.tPanic + 0.35) * (1 - prog(t, this.tSnap, this.tSnap + 0.08));
    if (scA > 0) {
      c.font = font(F.mono(500), 17);
      c.textAlign = 'right'; c.textBaseline = 'middle';
      const step = 5 * UY;
      for (let j = Math.ceil(vy0 / step); j * step < vy1; j++) {
        if (j <= 0) continue;
        const p = S(0, j * step);
        c.fillStyle = rgba('ash', 0.9 * scA);
        c.fillText(String(j * 5), 1790, p.y);
      }
    }
  }

  /** A small "O(x)" in Cormorant: O italic, parentheses roman, argument italic (or a lining figure). */
  mathLabel(c: CanvasRenderingContext2D, x: number, y: number, size: number, arg: string, col: string) {
    return mathLabel(c, x, y, size, arg, col);
  }

  heroAnchor() {
    // world position of the label's baseline-left and its world size
    return { X: 0.42 * UX, Y: 13.2 * UY, size: 188 };
  }

  drawHero(c: CanvasRenderingContext2D, t: number, cam: Cam) {
    const { X, Y, size } = this.heroAnchor();
    const p = this.w2s(X, Y, cam);
    const sz = size * cam.z;
    if (p.y < -300 || p.y > 1400) return;
    const appear = prog(t, this.T0 + 0.02, this.T0 + 0.3);
    if (appear <= 0) return;
    const post = t >= this.tSnap;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    for (const pc of this.hero) {
      const w = pc.word;
      const sung = t >= w.start;
      const hot = sung && t < Math.max(w.end, w.start + 0.25) && t < this.tPanic + 0.05;
      const e = sung ? t - w.start : 0;
      const pop = sung ? 1 + 0.18 * Math.exp(-e / 0.07) * (1 - Math.exp(-e / 0.012)) : 1;
      const s = sz * pc.s * pop;
      const gx = p.x + (pc.x / 100) * sz, gy = p.y + (pc.dy / 100) * sz;
      let col: string;
      if (!sung) col = rgba('bone', 0.26 * appear);
      else if (hot) col = rgba('signal', 1);
      else col = rgba('bone', post ? 0.62 : 0.96);
      c.font = font(pc.fam, s);
      // scale the pop about the glyph's own centre
      const gw = measure(pc.txt, pc.fam, sz * pc.s);
      c.fillStyle = col;
      c.fillText(pc.txt, gx + gw / 2 - (gw * pop) / 2, gy + (pop - 1) * sz * pc.s * 0.3);
    }
  }

  // ------------------------------------------------------------------ screen text
  drawScreenText(t: number, cam: Cam) {
    const L = this.sl; L.clear(); const c = L.ctx;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';

    // ---- "panic," — slammed on the word, stretched by the whip, left behind at the top
    const wp = this.wPanic;
    if (t >= wp.start) {
      const e = t - wp.start;
      const fam = F.archivo(125, 900), size = 188;
      const txt = wp.w;
      const lay = layout(txt, fam, size, -2);
      const exitT = this.tExit;
      const exitK = prog(t, exitT, exitT + 0.34, ease.inCubic);
      const v = this.whipSpeed(t);
      const stretch = 1 + 0.55 * v;
      const x0 = 150, base = 620 - exitK * 1000;
      const slam = 1 + 0.22 * Math.exp(-e / 0.06);
      const sung = Lyrics.wordProgress(wp, t);
      c.font = font(fam, size);
      for (const gph of lay.glyphs) {
        if (gph.ch === ' ') continue;
        // letters lift one after another with the whip (a few px of stagger)
        const lag = gph.i * 10 * v;
        const lit = sung * lay.glyphs.length - gph.i;
        const col = t < wp.end + 0.05 ? (lit > 0 ? rgba('signal', 1) : rgba('signal', 0.55)) : rgba('bone', 1);
        c.save();
        c.translate(x0 + gph.x * slam, base + lag);
        c.scale(slam, slam * stretch);
        c.fillStyle = col;
        c.fillText(gph.ch, 0, 0);
        c.restore();
      }
    }

    // ---- "but I'm doing fine¹" along the O(1) line
    const lineY = OYF - YFLAT * this.finalCam().z; // final-frame screen y of the flat line
    const base = lineY - 5;
    const k = this.finalScale(t);
    for (const rw of this.rowWords) {
      const w = rw.w;
      const vis = prog(t, w.start - 0.4, w.start - 0.1);
      const isBut = w === this.wBut;
      // the rest of the row waits for the snap (the line isn't there before it)
      const gate = isBut ? 1 : prog(t, this.tSnap, this.tSnap + 0.12);
      const a = vis * gate;
      if (a <= 0) continue;
      const sung = t >= w.start;
      const hot = sung && t < w.end;
      const e = t - w.start;
      // lands on the line: a short drop with a soft spring
      const drop = sung ? -16 * Math.exp(-e / 0.09) * Math.cos(e * 26) * (e < 0.02 ? e / 0.02 : 1) : -10;
      const g0 = this.row.glyphs[rw.i0]!;
      const p = this.finalToScreen({ x: this.rowX + g0.x, y: base + drop }, t);
      const col = hot ? rgba('signal', 1) : sung ? rgba('bone', 1) : rgba('bone', 0.32 * a);
      c.font = font(this.famRow, this.rowSize * k);
      c.fillStyle = col;
      for (let i = rw.i0; i < rw.i1; i++) {
        const gph = this.row.glyphs[i]!;
        c.fillText(gph.ch, p.x + (gph.x - g0.x) * k, p.y);
      }
    }
    // superscript ¹ after "fine" (a real superscript: small lining figure, raised)
    const fine = this.rowWords[this.rowWords.length - 1]!;
    const supK = prog(t, fine.w.start + 0.22, fine.w.start + 0.4, ease.outBack);
    if (supK > 0) {
      const gl = this.row.glyphs[fine.i1 - 1]!;
      const p = this.finalToScreen({ x: this.rowX + gl.x + gl.w + 3, y: base - this.rowSize * 0.36 }, t);
      c.font = font(F.archivo(100, 500), this.rowSize * 0.42 * k * supK);
      c.fillStyle = rgba('signal', 1);
      c.fillText('1', p.x, p.y);
    }
    // O(1): the flat line's label, at its right end past the spark
    const oA = prog(t, this.tLand, this.tLand + 0.25, ease.outCubic);
    if (oA > 0) {
      const p = this.finalToScreen({ x: SPX + 46, y: lineY - 12 }, t);
      c.globalAlpha = oA;
      this.mathLabel(c, p.x, p.y, 64 * k, '1', rgba('bone', 1));
      c.globalAlpha = 1;
    }
    // footnote
    const fnT0 = fine.w.start + 0.28;
    const nCh = Math.floor(clamp((t - fnT0) / 0.22) * 9);
    if (t >= fnT0) {
      const x = OXF, y = 978;
      c.strokeStyle = rgba('graphite', 1); c.lineWidth = 1;
      const rl = 90 * prog(t, fnT0 - 0.1, fnT0 + 0.1, ease.outCubic);
      c.beginPath(); c.moveTo(x, y - 36); c.lineTo(x + rl, y - 36); c.stroke();
      c.font = font(F.mono(500), 15);
      c.fillStyle = rgba('signal', 1);
      c.fillText('1', x, y - 10);
      c.font = font(F.mono(400), 24);
      c.fillStyle = rgba('bone', 0.82);
      c.fillText('amortized'.slice(0, nCh), x + 14, y);
    }

    // readout riding the spark: (n, panic)
    const tagA = prog(t, this.steps[0]! - 0.05, this.steps[0]! + 0.1) * (1 - prog(t, this.tSnap - 0.02, this.tSnap + 0.04));
    if (tagA > 0) {
      const sp = this.sparkScreen(t), w = this.sparkWorld(t);
      if (sp.y > 30 && sp.y < 1050 && sp.x < 1700) {
        const n = w.x / UX, pan = w.y / UY;
        c.font = font(F.mono(500), 18);
        c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillStyle = rgba('ember', 0.95 * tagA);
        c.fillText(`(${n.toFixed(1)}, ${pan.toFixed(1)})`, sp.x + 26, sp.y - 24);
      }
    }
  }

  // ------------------------------------------------------------------ the spark
  drawSpark(t: number, f: Frame) {
    const lb = this.fx; lb.clear();
    const T0 = this.T0;
    const sp = this.sparkScreen(t);
    const rateAt = (tb: number) => {
      if (tb < this.tPanic) return 70;
      if (tb < this.tArr) return 220;
      if (tb < this.tSnap) return 90;
      if (tb < this.tLand + 0.25) return 260;
      return 22;
    };
    sparkParticles(lb, t, (tb) => (tb < T0 ? null : this.sparkScreen(tb)), { rate: rateAt, rateMax: 260, speed: 240, life: 0.42, seed: 11, intensity: 1.05 });
    // landing: a flat splash of sparks along the line
    const e = t - this.tLand;
    if (e > 0 && e < 0.5) {
      for (let i = 0; i < 26; i++) {
        const dir = hash(i, 7) < 0.5 ? -1 : 1;
        const sp0 = 380 + 900 * hash(i, 8) ** 2;
        const life = 0.18 + 0.3 * hash(i, 9);
        if (e > life) continue;
        const k = 1 - e / life;
        const x = sp.x + dir * sp0 * (1 - Math.exp(-e * 6)) / 6;
        const y = sp.y - (60 + 160 * hash(i, 10)) * e + 520 * e * e;
        const x0 = sp.x + dir * sp0 * (1 - Math.exp(-(Math.max(0, e - 0.02)) * 6)) / 6;
        const y0 = sp.y - (60 + 160 * hash(i, 10)) * Math.max(0, e - 0.02) + 520 * Math.max(0, e - 0.02) ** 2;
        lb.seg2(x0, y0, x, y, 1.6 * k + 0.4, mul3(LIN.ember, 2.2 * k), Math.min(1, k * 1.5));
      }
    }
    // breathing at rest (and a small beat on the kicks)
    const rest = prog(t, this.tLand, this.tLand + 0.4);
    const breathe = 1 + rest * (0.1 * Math.sin((t - this.tLand) * 3.1) + 0.22 * f.a.kick);
    const scale = (t < this.tPanic ? 1.25 : 1.45) * breathe + 0.9 * pulse(t, this.tLand, 0.1);
    const appear = prog(t, T0 - 0.02, T0 + 0.12);
    sparkHead(lb, sp.x, sp.y, t, scale * appear, 1.35 * appear);
  }
}
