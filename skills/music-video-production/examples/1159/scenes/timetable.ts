// 11:59 `timetable` — "Discrete math at nine a.m., nothing's what it seems". The light plate after
// the dark canteen: bone paper, ink hairlines, one orange.
//
// A weekly timetable of our own hairline design (days as rows, MON–FRI; time as columns,
// 08:30–18:30 in half hours; mono headers). The spark is the now-cursor: on the cut it draws the
// orange now-line up the 09:00 column and parks on the time axis.
//  - The cut (drums out): the grid draws in, the other courses (hatched blocks) pop in, the
//    Monday 09:00 slot is an empty dashed box. The camera is close on Monday morning.
//  - "Discrete" (the drums come back): the DISCRETE MATH block slams into the slot, printed
//    orange, the lyric set on it ("Discrete math / at nine a.m.,"), each word inking as sung.
//  - "nothing's": the block's label gains a ¬ (Cormorant), the camera pulls back to the whole
//    week, and the grid turns into logic: the slots are rearranged by a bijection, on the beats —
//    hairline arrows f : slot → slot draw, the blocks travel along them (first the courses clear
//    Wednesday, then four blocks land in a row and read "nothing's what it seems"; each word is
//    shown dim at most ~0.4 s before it is sung).
//  - With the second wave (the downbeat) the header is rewritten as ∀ day ∃ lecture (Cormorant has
//    no ∀/∃: they are its own A turned and E reversed); the next beat types the footnote
//    ¬(what it seems).
//  - "seems" is a rubber stamp; hard cut to `linkedlist` on the next beat.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { type Word, norm } from '../../engine/lyrics';
import { F, font, glyphX, layout, measure } from '../../engine/type';
import { ease, lerp, prog, hash, pulse, frameIdx } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { LIN } from '../../engine/palette';
import { PAPER_FRAG } from './timetable-paper';

type Ctx2 = CanvasRenderingContext2D;
type P2 = { x: number; y: number };

// channel-coded inks, drawn with 'lighter' onto opaque black (see timetable-paper.ts)
const PRINT = (a = 1) => `rgba(255,0,0,${a})`;
const FILL = (a = 1) => `rgba(0,255,0,${a})`;
const STAMP = (a = 1) => `rgba(0,0,255,${a})`;

// ---------------------------------------------------------------- layout (page px = screen px at the wide framing)
const L0 = 96, R0 = 1824;
const GX0 = 250, GX1 = R0, NH = 20; // time axis: 08:30 → 18:30 in half hours
const HW = (GX1 - GX0) / NH;
const GY0 = 240, GY1 = 920, ND = 5; // days
const RH = (GY1 - GY0) / ND;
const INSET = 5;
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const hx = (h: number) => GX0 + h * HW;
const dy = (d: number) => GY0 + d * RH;
const pad2 = (n: number) => String(n).padStart(2, '0');
const hhmm = (h: number) => { const m = 8 * 60 + 30 + h * 30; return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`; };
const span = (h0: number, n: number) => `${hhmm(h0)}–${hhmm(h0 + n)}`;

const WORD_FAM = F.archivo(87.5, 900);
const L2_FAM = F.archivo(100, 700);
const PAD = 22;
const DM = { d: 0, h0: 1, n: 8 }; // DISCRETE MATH: Monday 09:00–13:00
const SENT_DAY = 2;               // the sentence lands on Wednesday, from 09:00
const NEG_K = 1.55, NEG_DY = 0.5;   // the ¬ (Cormorant) against Archivo: size factor, baseline drop

interface Blk {
  name: string;      // the course (hatched, mono) before the bijection
  n: number;         // length in half hours (a bijection of slots keeps the size)
  d0: number; h0: number; // source slot
  d1: number; h1: number; // image slot
  wave: 1 | 2;       // which beat moves it
  bend: number;      // arrow curvature (signed)
  word?: Word;       // the lyric word it carries after the remap
  ww?: number;       // word width
}
interface Rect { x: number; y: number; w: number; h: number }
interface Cam { cx: number; cy: number; z: number; r: number }

export default class Timetable extends Scene {
  ink = new Layer2D();
  paper = new FSPass(PAPER_FRAG, {
    inkTex: { value: null }, camA: { value: new THREE.Vector3() }, camB: { value: new THREE.Vector3() }, zoom: { value: 1 },
  });
  glow = new LineBatch(600);
  dots = new LineBatch(3000, { blend: 'normal' }); // on paper the sparks cover, they don't add

  words: Word[] = [];
  wSeems!: Word;
  tHit = 0; tDown = 0; tNot = 0; tW1 = 0; tW2 = 0; tLogic = 0; tHead = 0; tSeems = 0; tNine = 0;
  beats: number[] = [];
  blocks: Blk[] = [];
  // DISCRETE MATH block type
  S = 60; S2 = 36; negW = 0; negSize = 0;
  l1 = 'Discrete math'; l2 = 'at nine a.m.,';
  l1x: number[] = []; l2x: number[] = [];
  stampC = { x: 0, y: 0, hw: 176, hh: 60, rot: -0.07 };

  override init() {
    const { lyrics, audio, start, end } = this.ctx;
    this.ink.texture.colorSpace = THREE.NoColorSpace;
    const line = lyrics.get('Discrete math');
    const ws = line.words;
    this.words = ws;
    const find = (q: string, from = 0) => ws.slice(from).find((w) => norm(w.w).startsWith(norm(q))) ?? ws[ws.length - 1]!;
    const wNot = find('nothing');
    const iNot = ws.indexOf(wNot);
    this.wSeems = find('seems', iNot);
    this.tNot = wNot.start;
    this.tSeems = this.wSeems.start;
    this.tNine = find('nine').start;

    // the drums come back on "Discrete": the first rise of the drum envelope after the cut, on its beat
    let th = ws[0]!.start;
    for (let t = start; t < ws[0]!.start + 0.5; t += 0.005) if (audio.env('drums', t) > 0.3) { th = t; break; }
    const nb = audio.nearestBeat(th);
    this.tHit = Math.abs(nb - th) < 0.07 ? nb : th - 0.02;
    this.beats = audio.beats.filter((b) => b > this.tHit + 0.05 && b < end - 0.02);
    this.tDown = audio.downbeats.find((d) => d > this.tHit + 0.1) ?? this.tHit + 0.46;
    const after = (t: number) => audio.beats.find((b) => b > t) ?? t + 0.46;
    this.tW1 = after(this.tNot + 0.1);
    this.tW2 = after(this.tW1 + 0.1);
    this.tLogic = after(this.tW2 + 0.1);
    if (this.tLogic > this.tSeems - 0.12) this.tLogic = (this.tW2 + this.tSeems) / 2;
    this.tHead = this.tW2; // the header is rewritten with the second wave (the downbeat)

    // ---- the DISCRETE MATH block: fit line 1 (with room for the ¬) into the slot
    const bw = DM.n * HW - 2 * INSET;
    this.negSize = 1;
    const negW1 = measure('¬', F.serif(600), 100) / 100 * NEG_K + 0.06; // per px of S (glyph + a small gap)
    const w1 = measure(this.l1, WORD_FAM, 100) / 100;
    this.S = Math.min(68, Math.floor((bw - 2 * PAD) / (w1 + negW1)));
    this.negW = negW1 * this.S;
    this.S2 = Math.round(this.S * 0.52);
    const idx = (s: string) => { const out: number[] = []; let ci = 0; for (const p of s.split(' ')) { out.push(ci); ci += Array.from(p).length + 1; } return out; };
    this.l1x = idx(this.l1).map((i) => glyphX(this.l1, i, WORD_FAM, this.S));
    this.l2x = idx(this.l2).map((i) => glyphX(this.l2, i, L2_FAM, this.S2));

    // ---- the bijection. Sentence blocks are sized to their word (whole half hours) and land in a row.
    const sent = ws.slice(iNot);
    const sizes = sent.map((w) => { const ww = measure(w.w, WORD_FAM, this.S); return { ww, n: Math.max(2, Math.ceil((ww + 2 * PAD) / HW)) }; });
    // where the sentence blocks start the plate (hatched courses, scattered through the week)
    const src: [string, number, number][] = [['CALCULUS', 1, 4], ['PROGRAMMING', 3, 11], ['TUTORIAL', 4, 2], ['ESSAY WRITING', 0, 12]];
    let h = 1;
    sent.forEach((w, i) => {
      const [name, d0, h0] = src[i] ?? ['SEMINAR', 4, 14];
      const { ww, n } = sizes[i]!;
      this.blocks.push({ name, n, d0, h0, d1: SENT_DAY, h1: h, wave: 2, bend: [0.22, -0.2, 0.26, 0.18][i] ?? 0.2, word: w, ww });
      h += n;
    });
    // the other courses permute among themselves on the first beat (clearing Wednesday)
    this.blocks.push(
      { name: 'STATISTICS', n: 3, d0: 2, h0: 5, d1: 3, h1: 2, wave: 1, bend: -0.3 },
      { name: 'PHYSICS LAB', n: 4, d0: 1, h0: 12, d1: 4, h1: 8, wave: 1, bend: 0.24 },
      { name: 'OFFICE HOURS', n: 2, d0: 4, h0: 13, d1: 1, h1: 13, wave: 1, bend: -0.16 },
      { name: 'SEMINAR', n: 3, d0: 3, h0: 5, d1: 0, h1: 16, wave: 1, bend: 0.2 },
    );
    const last = this.blocks[sent.length - 1]!;
    const r = this.rectOf(last.d1, last.h1, last.n);
    this.stampC.x = r.x + r.w / 2 + 34;
    this.stampC.y = r.y + r.h / 2 + 2;
  }

  // ---------------------------------------------------------------- geometry
  rectOf(d: number, h0: number, n: number): Rect {
    return { x: hx(h0) + INSET, y: dy(d) + INSET, w: n * HW - 2 * INSET, h: RH - 2 * INSET };
  }
  /** Arrow curve of a block's mapping: a quadratic from the source centre to the image centre. */
  curve(b: Blk) {
    const a = this.rectOf(b.d0, b.h0, b.n), c = this.rectOf(b.d1, b.h1, b.n);
    const p0 = { x: a.x + a.w / 2, y: a.y + a.h / 2 }, p1 = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
    const dx = p1.x - p0.x, dyy = p1.y - p0.y, L = Math.hypot(dx, dyy) || 1;
    const k = { x: (p0.x + p1.x) / 2 - (dyy / L) * b.bend * L, y: (p0.y + p1.y) / 2 + (dx / L) * b.bend * L };
    const at = (u: number): P2 => ({
      x: (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * k.x + u * u * p1.x,
      y: (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * k.y + u * u * p1.y,
    });
    return { a, c, at };
  }
  waveT(b: Blk) { return b.wave === 1 ? this.tW1 : this.tW2; }
  /** 0..1 travel of a block along its arrow (departs on its beat). */
  travel(b: Blk, t: number) { const tw = this.waveT(b); return ease.outExpo(prog(t, tw, tw + 0.26)); }
  /** 0..1 how much of its arrow is drawn (the beat before it moves). */
  arrowDraw(b: Blk, t: number) {
    const a0 = b.wave === 1 ? this.tNot + 0.02 : this.tW1 + 0.06;
    const a1 = this.waveT(b) - 0.03;
    return ease.inOutCubic(prog(t, a0, a1));
  }
  /** The block carries its lyric word from this time. */
  remapT(b: Blk) { return b.word && b.word === this.words.find((w) => norm(w.w).startsWith('nothing')) ? this.tNot : this.tW2; }

  // ---------------------------------------------------------------- camera
  camAt(t: number): Cam {
    const { start, end } = this.ctx;
    // close on Monday morning, drifting in; steps in on the drum hit and on the downbeat
    const step = (t0: number, w = 16) => { const u = t - t0; return u <= 0 ? 0 : 1 - (1 + w * u) * Math.exp(-w * u); };
    const lzC = Math.log(1.5) + 0.035 * prog(t, start, this.tNot, ease.linear) + 0.06 * step(this.tHit, 18) + 0.03 * step(this.tDown, 14);
    const zc = Math.exp(lzC);
    const cC = { x: 72 + 960 / zc + 14 * prog(t, this.tHit, this.tNot, ease.inOutQuad), y: 96 + 540 / zc }; // the close frame keeps the day gutter and the header in
    const rC = lerp(-0.018, -0.006, step(this.tHit, 14));
    // "nothing's": pull back to the whole week, then a slow push toward the sentence
    const k = ease.outExpo(prog(t, this.tNot, this.tNot + 0.75));
    const lzW = Math.log(1.0 + 0.03 * prog(t, this.tNot + 0.3, end, ease.inOutQuad));
    const cW = { x: lerp(960, 945, prog(t, this.tNot + 0.3, end)), y: lerp(540, 552, prog(t, this.tNot + 0.3, end)) };
    let z = Math.exp(lerp(lzC, lzW, k));
    const cx = lerp(cC.x, cW.x, k), cy = lerp(cC.y, cW.y, k);
    const r = lerp(rC, 0, k);
    // punches: the hit, the beats, the stamp
    let bp = 0;
    for (const b of this.beats) bp = Math.max(bp, pulse(t, b, 0.07));
    z *= 1 + 0.03 * pulse(t, this.tHit, 0.09) + 0.008 * bp + 0.035 * pulse(t, this.tSeems, 0.08);
    return { cx, cy, z, r };
  }
  toScreen(cam: Cam, x: number, y: number): P2 {
    const c = Math.cos(cam.r), s = Math.sin(cam.r);
    const dx = (x - cam.cx) * cam.z, dyy = (y - cam.cy) * cam.z;
    return { x: 960 + c * dx - s * dyy, y: 540 + s * dx + c * dyy };
  }
  shake(t: number): [number, number] {
    let bp = 0;
    for (const b of this.beats) bp = Math.max(bp, pulse(t, b, 0.04));
    const amp = 11 * pulse(t, this.tHit, 0.06) + 5 * pulse(t, this.tDown, 0.05) + 1.6 * bp + 9 * pulse(t, this.tSeems, 0.05);
    const ph = frameIdx(t);
    return [amp * (hash(ph, 11) - 0.5) * 2, amp * (hash(ph, 12) - 0.5) * 2];
  }

  // ---------------------------------------------------------------- the spark (the now-cursor)
  sparkPage(t: number): P2 {
    const s = this.ctx.start;
    const u = ease.inOutCubic(prog(t, s + 0.01, s + 0.34));
    return { x: hx(DM.h0), y: lerp(GY1 + 12, GY0, u) };
  }

  // ---------------------------------------------------------------- render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer } = this.ctx;
    const t = f.t;
    const cam = this.camAt(t);

    const L = this.ink;
    L.clear('#000');
    const c = L.ctx;
    c.globalCompositeOperation = 'lighter';
    const co = Math.cos(cam.r), si = Math.sin(cam.r);
    c.setTransform(cam.z * co, cam.z * si, -cam.z * si, cam.z * co,
      960 - cam.z * (co * cam.cx - si * cam.cy), 540 - cam.z * (si * cam.cx + co * cam.cy));
    c.textBaseline = 'alphabetic';
    this.drawSheet(c, t);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';

    const P = this.paper.u;
    P.inkTex!.value = L.upload();
    // screen -> page: the inverse of the canvas transform above
    (P.camA!.value as THREE.Vector3).set(co / cam.z, si / cam.z, cam.cx - (co * 960 + si * 540) / cam.z);
    (P.camB!.value as THREE.Vector3).set(-si / cam.z, co / cam.z, cam.cy - (-si * 960 + co * 540) / cam.z);
    P.zoom!.value = cam.z;
    this.paper.render(renderer, out);

    // ---- the spark: the now-cursor's head
    const headAt = (tb: number) => { const p = this.sparkPage(tb); return this.toScreen(this.camAt(tb), p.x, p.y); };
    const hp = headAt(t);
    const s0 = this.ctx.start;
    const burst = (tb: number) => {
      let b = 0;
      for (const bt of this.beats) b = Math.max(b, 0.4 * pulse(tb, bt, 0.05));
      b = Math.max(b, 1.5 * pulse(tb, this.tHit, 0.07), 0.8 * pulse(tb, this.tDown, 0.06), 1.1 * pulse(tb, this.tSeems, 0.06));
      const climb = tb > s0 && tb < s0 + 0.34 ? 120 : 0;
      return 14 + climb + 230 * b;
    };
    const d = this.dots;
    d.clear();
    const zs = Math.sqrt(cam.z);
    sparkParticles(d, t, headAt, { rate: burst, rateMax: 490, life: 0.4, speed: 240 * zs, gravity: 620, intensity: 0.5, seed: 57, width: 1.6 * zs });
    const kk = (1 + 0.35 * f.a.kick) * zs;
    d.seg2(hp.x, hp.y, hp.x + 0.01, hp.y, 14 * kk, [LIN.signal[0], LIN.signal[1], LIN.signal[2]], 1);
    d.render(renderer, out);
    const g = this.glow;
    g.clear();
    sparkHead(g, hp.x, hp.y, t, 0.7 * kk, 0.7 * (1 + 0.6 * pulse(t, this.tHit, 0.08)));
    g.render(renderer, out);

    return {
      paper: 1, hud: 0,
      bloom: 0.22, bloomThreshold: 1.8, bloomKnee: 0.4, halation: 0.03,
      vignette: 0.14, grain: 0.042, ca: 0.35,
      shake: this.shake(t),
    };
  }

  // ---------------------------------------------------------------- drawing (page space)
  /** Knock the inks out of a rectangle (a block covers the grid under it). */
  ko(c: Ctx2, r: Rect) {
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#000';
    c.fillRect(r.x, r.y, r.w, r.h);
    c.globalCompositeOperation = 'lighter';
  }

  drawSheet(c: Ctx2, t: number) {
    const s = this.ctx.start;
    this.drawHeader(c, t, s);
    this.drawGrid(c, t, s);
    // the now-line: orange, drawn up the 09:00 column by the spark
    const sp = this.sparkPage(t);
    c.fillStyle = FILL(1);
    c.fillRect(sp.x - 1.1, sp.y, 2.2, GY1 + 12 - sp.y);
    // the bijection: ghosts of the vacated slots and the arrows, under the blocks
    for (const b of this.blocks) this.drawArrow(c, t, b);
    // the courses and the sentence
    this.blocks.forEach((b, i) => this.drawBlock(c, t, b, i));
    this.drawDM(c, t);
    // the now-line crosses on top of the blocks it passes (not the orange one: same ink)
    c.fillStyle = FILL(1);
    c.fillRect(sp.x - 1.1, sp.y, 2.2, GY1 + 12 - sp.y);
    if (t >= this.tSeems) this.drawStamp(c, t);
    this.drawNotes(c, t);
  }

  drawHeader(c: Ctx2, t: number, s: number) {
    const k = prog(t, s + 0.02, s + 0.25);
    const type = (str: string, u: number) => str.slice(0, Math.round(u * str.length));
    // title: TIMETABLE — WEEK 3, rewritten as ∀ day ∃ lecture on the beat after the bijection
    const lk = ease.outExpo(prog(t, this.tHead, this.tHead + 0.2));
    if (lk < 1) {
      c.save();
      c.globalAlpha = 1 - prog(t, this.tHead, this.tHead + 0.04);
      c.font = font(F.mono(600), 24);
      c.fillStyle = PRINT(1);
      c.fillText(type('TIMETABLE — WEEK 3', k), L0, 146 + 14 * lk);
      c.restore();
    }
    if (t >= this.tHead) {
      c.save();
      c.beginPath(); c.rect(L0 - 10, 88, 900, 72); c.clip();
      this.drawForall(c, L0, 150 - 26 * (1 - lk), 50);
      c.restore();
    }
    c.font = font(F.mono(400), 17);
    c.fillStyle = PRINT(0.62);
    const sub = t >= this.tHead ? 'semester 1 · rearranged without notice' : 'semester 1 · subject to change';
    c.fillText(type(sub, t >= this.tHead ? prog(t, this.tHead + 0.02, this.tHead + 0.2) : prog(t, s + 0.06, s + 0.3)), L0, 176);
    // the time label (right)
    c.textAlign = 'right';
    const nine = pulse(t, this.tNine, 0.08);
    c.save();
    c.translate(R0, 150);
    c.scale(1 + 0.08 * nine, 1 + 0.08 * nine);
    c.font = font(F.mono(600), 46);
    c.fillStyle = PRINT(1);
    c.fillText('09:00', 0, 0);
    c.restore();
    c.font = font(F.mono(400), 17);
    c.fillStyle = PRINT(0.62);
    c.fillText(type('MON · now', prog(t, s + 0.1, s + 0.3)), R0, 176);
    c.textAlign = 'left';
  }

  /** "∀ day ∃ lecture": Cormorant has no ∀ or ∃, so they are its own A turned and its own E reversed. */
  drawForall(c: Ctx2, x: number, y: number, size: number) {
    const up = F.serif(600), it = F.serif(400, true);
    const capH = size * 0.63;
    const aw = measure('A', up, size), ew = measure('E', up, size);
    const sp = measure(' ', it, size);
    c.fillStyle = PRINT(1);
    c.font = font(up, size);
    // ∀: the A rotated a half turn about the centre of its cap box
    c.save();
    c.translate(x + aw / 2, y - capH / 2);
    c.rotate(Math.PI);
    c.fillText('A', -aw / 2, capH / 2);
    c.restore();
    let xx = x + aw + sp * 0.55;
    c.font = font(it, size);
    c.fillText('day', xx, y);
    xx += measure('day', it, size) + sp * 1.5;
    // ∃: the E mirrored
    c.save();
    c.font = font(up, size);
    c.translate(xx + ew / 2, y);
    c.scale(-1, 1);
    c.fillText('E', -ew / 2, 0);
    c.restore();
    xx += ew + sp * 0.9;
    c.font = font(it, size);
    c.fillText('lecture', xx, y);
  }

  drawGrid(c: Ctx2, t: number, s: number) {
    // horizontal rules grow from the left, one after another
    for (let i = 0; i <= ND; i++) {
      const u = ease.outExpo(prog(t, s - 0.03 + 0.012 * i, s + 0.2 + 0.012 * i));
      if (u <= 0) continue;
      const edge = i === 0 || i === ND;
      c.fillStyle = PRINT(edge ? 1 : 0.62);
      const lw = edge ? 1.7 : 1.1;
      c.fillRect(L0, dy(i) - lw / 2, (GX1 - L0) * u, lw);
    }
    // verticals drop from the top
    for (let h = 0; h <= NH; h++) {
      const u = ease.outExpo(prog(t, s + 0.0 + 0.005 * h, s + 0.22 + 0.005 * h));
      if (u <= 0) continue;
      const x = hx(h);
      const y1 = GY0 + (GY1 - GY0) * u;
      if (h === 0 || h === NH) { c.fillStyle = PRINT(0.9); c.fillRect(x - 0.6, GY0, 1.2, y1 - GY0); }
      else if (h % 2 === 1) { c.fillStyle = PRINT(0.34); c.fillRect(x - 0.5, GY0, 1, y1 - GY0); c.fillStyle = PRINT(0.8); c.fillRect(x - 0.6, GY0 - 7, 1.2, 7); }
      else {
        c.strokeStyle = PRINT(0.26);
        c.lineWidth = 1;
        c.setLineDash([2, 5]);
        c.beginPath(); c.moveTo(x, GY0 + 3); c.lineTo(x, y1); c.stroke();
        c.setLineDash([]);
      }
    }
    // time axis labels
    c.font = font(F.mono(400), 15);
    const la = prog(t, s + 0.08, s + 0.3);
    for (let h = 0; h <= NH; h++) {
      if (!(h === 0 || h === NH || h % 2 === 1) || h === NH - 1) continue;
      if (h / NH > la * 1.05) continue;
      const lab = hhmm(h);
      const now = h === DM.h0;
      if (now) {
        const k = 1 + 0.25 * pulse(t, this.tNine, 0.08);
        c.save();
        c.translate(hx(h) + 7, GY0 - 13);
        c.scale(k, k);
        c.font = font(F.mono(600), 15);
        c.fillStyle = FILL(1);
        c.fillText(lab, 0, 0);
        c.restore();
        c.font = font(F.mono(400), 15);
        continue;
      }
      c.fillStyle = PRINT(0.75);
      if (h === NH) { c.textAlign = 'right'; c.fillText(lab, hx(h) - 6, GY0 - 13); c.textAlign = 'left'; }
      else c.fillText(lab, hx(h) + 6, GY0 - 13);
    }
    // day labels
    c.font = font(F.mono(600), 19);
    for (let d = 0; d < ND; d++) {
      const u = prog(t, s + 0.05 + 0.03 * d, s + 0.2 + 0.03 * d);
      if (u <= 0) continue;
      c.fillStyle = PRINT(u);
      c.fillText(DAYS[d]!, L0, dy(d) + 34);
      c.font = font(F.mono(400), 13);
      c.fillStyle = PRINT(0.5 * u);
      c.fillText(`d${d + 1}`, L0, dy(d) + 56);
      c.font = font(F.mono(600), 19);
    }
  }

  drawArrow(c: Ctx2, t: number, b: Blk) {
    const a = this.arrowDraw(b, t);
    if (a <= 0) return;
    const { a: ra, c: rc, at } = this.curve(b);
    const inside = (p: P2, r: Rect, m: number) => p.x > r.x - m && p.x < r.x + r.w + m && p.y > r.y - m && p.y < r.y + r.h + m;
    // clip the curve to where it runs between the two slots
    const N = 60;
    let u0 = 0, u1 = 1;
    for (let i = 0; i <= N; i++) { const u = i / N; if (!inside(at(u), ra, 4)) { u0 = u; break; } }
    for (let i = N; i >= 0; i--) { const u = i / N; if (!inside(at(u), rc, 10)) { u1 = u; break; } }
    const tw = this.waveT(b);
    const alpha = lerp(0.85, 0.2, prog(t, tw + 0.15, tw + 0.5));
    // the vacated slot: a dashed ghost
    if (t >= tw) {
      c.strokeStyle = PRINT(0.4 * prog(t, tw, tw + 0.08) * lerp(1, 0.45, prog(t, tw + 0.2, tw + 0.6)));
      c.lineWidth = 1;
      c.setLineDash([4, 5]);
      c.strokeRect(ra.x + 0.5, ra.y + 0.5, ra.w - 1, ra.h - 1);
      c.setLineDash([]);
    }
    const ue = lerp(u0, u1, a);
    c.strokeStyle = PRINT(alpha);
    c.lineWidth = 1.3;
    c.beginPath();
    const M = 40;
    for (let i = 0; i <= M; i++) {
      const p = at(lerp(u0, ue, i / M));
      if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
    }
    c.stroke();
    // the arrowhead rides the tip
    const p = at(ue), q = at(Math.max(u0, ue - 0.02));
    const ang = Math.atan2(p.y - q.y, p.x - q.x);
    c.fillStyle = PRINT(alpha);
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(p.x - 13 * Math.cos(ang - 0.3), p.y - 13 * Math.sin(ang - 0.3));
    c.lineTo(p.x - 13 * Math.cos(ang + 0.3), p.y - 13 * Math.sin(ang + 0.3));
    c.closePath();
    c.fill();
    // f, on the first arrow of each wave (Cormorant italic, beside the curve's apex)
    if (b === this.blocks.find((x) => x.wave === b.wave) && a > 0.5) {
      const m = at(0.5);
      c.font = font(F.serif(600, true), 30);
      c.fillStyle = PRINT(alpha * prog(a, 0.5, 0.7));
      c.fillText('f', m.x + 10, m.y - 8);
    }
  }

  drawBlock(c: Ctx2, t: number, b: Blk, i: number) {
    const s = this.ctx.start;
    const pop = prog(t, s + 0.12 + 0.025 * i, s + 0.2 + 0.025 * i, ease.outCubic);
    if (pop <= 0) return;
    const { a: ra, at } = this.curve(b);
    const u = this.travel(b, t);
    const ctr = at(u);
    const sc = lerp(0.94, 1, pop) * (1 + 0.04 * Math.sin(Math.PI * u)); // lifts a little in flight
    const w = ra.w, h = ra.h;
    const lyric = !!b.word && t >= this.remapT(b);
    c.save();
    c.translate(ctr.x, ctr.y);
    c.scale(sc, sc);
    c.globalAlpha = pop;
    const r: Rect = { x: -w / 2, y: -h / 2, w, h };
    this.ko(c, r);
    c.strokeStyle = PRINT(1);
    c.lineWidth = lyric ? 1.6 : 1.3;
    c.strokeRect(r.x, r.y, r.w, r.h);
    const h1 = b.h1;
    const arrived = u >= 1;
    const meta = arrived || (lyric && b.wave === 2 && t >= this.tW2) ? span(h1, b.n) : span(b.h0, b.n);
    if (!lyric) {
      // a course: hatched, mono label on a knocked-out strip
      c.save();
      c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
      c.strokeStyle = PRINT(0.17);
      c.lineWidth = 1;
      c.beginPath();
      for (let x = r.x - h; x < r.x + w; x += 8) { c.moveTo(x, r.y + h); c.lineTo(x + h, r.y); }
      c.stroke();
      c.restore();
      c.font = font(F.mono(600), 15);
      const lw = Math.max(measure(b.name, F.mono(600), 15), measure(meta, F.mono(400), 12));
      this.ko(c, { x: r.x + 8, y: r.y + 8, w: lw + 12, h: 44 });
      c.fillStyle = PRINT(0.95);
      c.fillText(b.name, r.x + 14, r.y + 28);
      c.font = font(F.mono(400), 12);
      c.fillStyle = PRINT(0.6);
      c.fillText(meta, r.x + 14, r.y + 45);
    } else {
      const wd = b.word!;
      const stamped = wd === this.wSeems && t >= this.tSeems;
      c.font = font(F.mono(400), 12);
      c.fillStyle = PRINT(0.55);
      if (!stamped) c.fillText(meta, r.x + 12, r.y + 22);
      if (!stamped && t >= wd.start - 0.4) {
        const bx = r.x + PAD, by = r.y + r.h / 2 + this.S * 0.36 + 6;
        this.drawWord(c, t, wd, wd.w, WORD_FAM, this.S, bx, by, false);
      }
    }
    c.restore();
  }

  /** One lyric word: dim until sung, orange while sung (ink on the orange block), ink after. */
  drawWord(c: Ctx2, t: number, w: Word, txt: string, fam: string, size: number, x: number, y: number, onOrange: boolean) {
    c.font = font(fam, size);
    if (t < w.start) {
      c.fillStyle = PRINT(onOrange ? 0.3 : 0.24);
      c.fillText(txt, x, y);
      return;
    }
    const k = prog(t, w.start, w.start + 0.07, ease.outCubic);
    const sc = lerp(1.12, 1, k);
    const ww = measure(txt, fam, size);
    c.save();
    c.translate(x + ww / 2, y - size * 0.35);
    c.scale(sc, sc);
    if (!onOrange && t < w.end + 0.02) c.fillStyle = FILL(1);
    else c.fillStyle = PRINT(1);
    c.fillText(txt, -ww / 2, size * 0.35);
    c.restore();
  }

  drawDM(c: Ctx2, t: number) {
    const s = this.ctx.start;
    const r = this.rectOf(DM.d, DM.h0, DM.n);
    const ws = this.words;
    const on = t >= this.tHit;
    // text origin: slides right to make room for the ¬ on "nothing's"
    const nk = ease.outExpo(prog(t, this.tNot, this.tNot + 0.12));
    const tx = r.x + PAD + this.negW * nk;
    const b1 = r.y + 14 + this.S * 0.72, b2 = b1 + this.S2 + 8;
    if (!on) {
      // the empty slot
      const a = prog(t, s + 0.1, s + 0.2);
      c.strokeStyle = PRINT(0.55 * a);
      c.lineWidth = 1.3;
      c.setLineDash([6, 6]);
      c.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
      c.setLineDash([]);
      c.font = font(F.mono(400), 13);
      c.fillStyle = PRINT(0.6 * a);
      c.textAlign = 'right';
      c.fillText(`${span(DM.h0, DM.n)} · TBA`, r.x + r.w - PAD, b2);
      c.textAlign = 'left';
      // line 1 pre-printed faint just before it is sung; "Discrete" inks on the voice
      const pre = prog(t, ws[0]!.start - 0.3, ws[0]!.start - 0.15);
      if (pre > 0) {
        for (let i = 0; i < 2; i++) {
          const w = ws[i]!;
          if (t >= w.start) this.drawWord(c, t, w, w.w, WORD_FAM, this.S, tx + this.l1x[i]!, b1, true);
          else { c.font = font(WORD_FAM, this.S); c.fillStyle = PRINT(0.2 * pre); c.fillText(w.w, tx + this.l1x[i]!, b1); }
        }
      }
      return;
    }
    // the slam: the printed block drops into its slot on the hit
    const k = prog(t, this.tHit, this.tHit + 0.07, ease.outCubic);
    let bp = 0;
    for (const b of this.beats) bp = Math.max(bp, pulse(t, b, 0.06));
    const sc = lerp(1.1, 1, k) * (1 + 0.008 * bp);
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    // landing ticks at the corners
    if (t < this.tHit + 0.2) {
      const u = prog(t, this.tHit, this.tHit + 0.2, ease.outCubic);
      c.strokeStyle = PRINT(0.85 * (1 - u));
      c.lineWidth = 1.4;
      c.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
        const x = cx + sx * r.w / 2, y = cy + sy * r.h / 2;
        for (const a of [0.35, 0.8, 1.25]) {
          const dx = Math.cos(a) * sx, dyy = Math.sin(a) * sy;
          const r0 = 10 + 22 * u, r1 = r0 + 14 * (1 - u) + 4;
          c.moveTo(x + dx * r0, y + dyy * r0); c.lineTo(x + dx * r1, y + dyy * r1);
        }
      }
      c.stroke();
    }
    c.save();
    c.translate(cx, cy); c.scale(sc, sc); c.translate(-cx, -cy);
    this.ko(c, r);
    c.fillStyle = FILL(1);
    c.fillRect(r.x, r.y, r.w, r.h);
    c.strokeStyle = PRINT(0.8);
    c.lineWidth = 1.3;
    c.strokeRect(r.x, r.y, r.w, r.h);
    // meta
    c.font = font(F.mono(500), 13);
    c.fillStyle = PRINT(0.78);
    c.textAlign = 'right';
    c.fillText(`${span(DM.h0, DM.n)} · LT 2`, r.x + r.w - PAD, b2);
    c.textAlign = 'left';
    // ¬
    if (t >= this.tNot) {
      const pk = prog(t, this.tNot, this.tNot + 0.08, ease.outCubic);
      const ps = lerp(1.5, 1, pk);
      const nx = r.x + PAD, ny = b1;
      c.save();
      c.translate(nx + this.negW * 0.4, ny - this.S * 0.36);
      c.scale(ps, ps);
      c.font = font(F.serif(600), this.S * NEG_K);
      c.fillStyle = PRINT(1);
      c.fillText('¬', -this.negW * 0.45, this.S * NEG_DY);
      c.restore();
    }
    // the lyric
    for (let i = 0; i < 2; i++) this.drawWord(c, t, ws[i]!, ws[i]!.w, WORD_FAM, this.S, tx + this.l1x[i]!, b1, true);
    for (let i = 0; i < 3; i++) this.drawWord(c, t, ws[2 + i]!, ws[2 + i]!.w, L2_FAM, this.S2, tx + this.l2x[i]!, b2, true);
    c.restore();
  }

  drawStamp(c: Ctx2, t: number) {
    const st = this.stampC;
    const k = prog(t, this.tSeems, this.tSeems + 0.05, ease.outCubic);
    const sc = lerp(1.25, 1, k);
    c.save();
    c.translate(st.x, st.y);
    c.rotate(st.rot);
    c.scale(sc, sc);
    c.strokeStyle = STAMP(1);
    c.lineWidth = 6;
    c.strokeRect(-st.hw, -st.hh, st.hw * 2, st.hh * 2);
    c.lineWidth = 2;
    c.strokeRect(-st.hw + 10, -st.hh + 10, st.hw * 2 - 20, st.hh * 2 - 20);
    const fam = F.archivo(100, 900), size = 66;
    const lay = layout('SEEMS', fam, size, 6);
    c.font = font(fam, size);
    c.fillStyle = STAMP(1);
    for (const g of lay.glyphs) c.fillText(g.ch, -lay.width / 2 + g.x, size * 0.36);
    c.restore();
  }

  drawNotes(c: Ctx2, t: number) {
    const yb = 972;
    // bottom right: the mapping, typed on "nothing's"
    const fs = 'f : slot → slot  (bijective)';
    const n = Math.round(prog(t, this.tNot + 0.04, this.tNot + 0.3) * fs.length);
    if (n > 0) {
      c.font = font(F.mono(400), 16);
      c.fillStyle = PRINT(0.72);
      c.textAlign = 'right';
      c.fillText(fs.slice(0, n).padEnd(fs.length, ' '), R0, yb);
      c.textAlign = 'left';
    }
    // bottom left: the footnote, on the beat after the bijection
    if (t >= this.tLogic) {
      const u = prog(t, this.tLogic, this.tLogic + 0.18);
      c.fillStyle = PRINT(0.7);
      c.fillRect(L0, yb - 30, 140 * ease.outExpo(u), 1);
      c.font = font(F.serif(600), 34);
      c.fillStyle = PRINT(1);
      c.fillText('¬', L0, yb + 5);
      const rest = '(what it seems)';
      const m = Math.round(prog(t, this.tLogic + 0.03, this.tLogic + 0.2) * rest.length);
      c.font = font(F.mono(400), 17);
      c.fillStyle = PRINT(0.85);
      c.fillText(rest.slice(0, m), L0 + measure('¬', F.serif(600), 34) + 1, yb);
    }
  }
}
