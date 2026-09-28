// CLOCK — "Eleven fifty-nine, I'm running out of time" (11:59 clip, plate 1).
//
// One world, one camera. Lead-in (no drums): near-black, a hairline is drawn by the spark and a mono
// footnote types itself in; the spark idles at the hairline's end, breathing with the rising synth. On
// the beat before "Eleven" a split-flap clock (our own hairline housing, bone flaps, ink figures)
// cascades on at 23:58, small in the dark; its seconds flap clacks once per syllable of "E-le-ven
// fif-ty-" (:55 … :59), the flips tightening. The words label the digits they name, like dimensions on
// a drawing (ELEVEN over the hours, FIFTY-NINE over the minutes).
// The drop (the downbeat on "-nine"): the minute flap lands on 9 and the camera slams in until 23:59
// fills the frame; flash, shake; from here the colon pulses orange on every kick.
// "I'm running out of time": the hairline has become a thick "time remaining" bar the lyric stands on,
// one segment per word. The words light left to right while the bar burns down right to left behind
// the spark, a segment per sung word, so the two meet and the bar is gone on "time". The seconds flap
// ticks once per beat (after an unexplained leap from :00 to :52); footnote: time remaining is an
// estimate. The camera pushes in on the downbeat.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { LIN, rgba, type PaletteKey } from '../../engine/palette';
import { F, font, layout, glyphX, measure, type TextLayout } from '../../engine/type';
import { Lyrics, type Word } from '../../engine/lyrics';
import { clamp, ease, lerp, noise1, prog, pulse, smoothstep, hash, frameIdx } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';

// ------------------------------------------------------------------ world layout (camera zoom 1)
const X0 = 160, X1 = 1760; // content margins (title-safe holds up to ~7% push-in)
const CW = 356, CH = 440, GG = 18, CC = 140; // flap card w/h, gap inside a group, colon column
const CY = 218; // card top
const LBL = { base: 180, size: 64, br: 200 }; // digit labels (the first half of the lyric)
const SEC = { w: 72, h: 100, gap: 8, top: 678 }; // seconds flaps
const ROW = { base: 866, size: 104 }; // the lyric row that stands on the bar
const BAR = { y: 902, h: 14, gap: 4, pad: 5 };
const FOOT = 944; // footnote baseline
const FOCUS = { x: 960, y: 548 }; // world point at the screen centre
const Z_PRE = 0.64; // pre-drop camera zoom

const CARDX = [X0, X0 + CW + GG, X0 + 2 * CW + GG + CC, X0 + 3 * CW + 2 * GG + CC];
const COLON_X = X0 + 2 * CW + GG + CC / 2;
const SECX = [X1 - 2 * SEC.w - SEC.gap, X1 - SEC.w];

interface Flip { t: number; ch: string; dur: number }
interface Module { x: number; y: number; w: number; h: number; r: number; fam: string; size: number; ev: Flip[]; tremble?: { t0: number; t1: number; next: string } }
interface Seg { x0: number; x1: number }

export default class Clock extends Scene {
  L = new Layer2D();
  glow = new LineBatch(4000);
  comp!: FSPass;

  // times
  D = 0; tIn = 0; tDraw0 = 0; tDraw1 = 0; tType0 = 0; tType1 = 0; tNote0 = 0;
  syl: number[] = [];
  beats: number[] = []; // beats from the drop to the end of the window
  downs: number[] = []; // downbeats after the drop inside the window
  wEl!: Word; wFif!: Word; row: Word[] = [];

  // type
  fDigit = F.archivo(125, 900);
  fLabel = F.archivo(100, 800);
  fRow = F.archivo(100, 900);
  fMono = F.mono(400);
  fMonoM = F.mono(500);
  digitAsc = 0; secAsc = 0; digitSize = 0; secSize = 0;
  rowLay!: TextLayout;
  rowText = '';
  wordX: number[] = [];
  segs: Seg[] = [];
  fifStr = 'FIFTY-NINE,'; nineAt = 6;

  mods: Module[] = [];
  secMods: Module[] = [];

  override init() {
    const { lyrics, audio: au, start, end } = this.ctx;
    const line = lyrics.get('running out of time');
    const ws = line.words;
    this.wEl = ws[0]!; this.wFif = ws[1]!; this.row = ws.slice(2);
    // the drop: the downbeat inside "fifty-nine" (drums enter on "-nine")
    this.D = au.downbeats.find((d) => d > this.wFif.start && d < this.wFif.end) ?? au.nearestBeat(lerp(this.wFif.start, this.wFif.end, 0.4));
    const bi = (t: number) => au.beatAt(t);
    this.tIn = au.timeOfBeat(Math.round(bi(this.wEl.start)) - 1);
    this.tDraw0 = start + 0.05; this.tDraw1 = start + 0.55;
    this.tType0 = start + 0.2; this.tType1 = Math.min(this.tIn, start + 0.2 + 0.45);
    this.tNote0 = this.row[0]!.start;
    // syllables of "E-le-ven fif-ty-" (no syllable data: thirds of "Eleven", "fif" and "ty" split before the drop)
    const e = this.wEl, fi = this.wFif;
    this.syl = [e.start, lerp(e.start, e.end, 1 / 3), lerp(e.start, e.end, 2 / 3), fi.start, lerp(fi.start, this.D, 0.5)];
    const b0 = Math.round(bi(this.D));
    for (let k = 0; ; k++) { const tb = au.timeOfBeat(b0 + k); if (tb > end + 1e-3) break; this.beats.push(tb); }
    this.downs = au.downbeats.filter((d) => d > this.D + 0.1 && d < end);

    // ---- measure type
    const mc = document.createElement('canvas').getContext('2d')!;
    const asc = (fam: string, size: number) => { mc.font = font(fam, size); return mc.measureText('0123456789').actualBoundingBoxAscent; };
    const adv = measure('0', this.fDigit, 100) / 100;
    this.digitSize = Math.min((CW - 56) / adv, (CH * 0.66) / (asc(this.fDigit, 100) / 100));
    this.digitAsc = asc(this.fDigit, this.digitSize);
    this.secSize = Math.min((SEC.w - 20) / adv, (SEC.h * 0.58) / (asc(this.fDigit, 100) / 100));
    this.secAsc = asc(this.fDigit, this.secSize);

    // the lyric row: one kerned run, each word's x from the run's own glyph positions
    this.rowText = this.row.map((w) => w.w).join(' ');
    let size = ROW.size;
    const w1 = measure(this.rowText, this.fRow, 100) / 100;
    size = Math.min(size, (X1 - X0 - 150) / w1);
    this.rowLay = layout(this.rowText, this.fRow, size);
    let ci = 0;
    for (const w of this.row) { this.wordX.push(X0 + glyphX(this.rowText, ci, this.fRow, size)); ci += Array.from(w.w).length + 1; }
    // segment k runs from its word's x to just before the next word (the last one to X1)
    const n = this.row.length;
    this.segs = this.row.map((_, k) => ({ x0: k === 0 ? X0 : this.wordX[k]!, x1: k + 1 < n ? this.wordX[k + 1]! - BAR.gap : X1 }));
    this.nineAt = this.fifStr.indexOf('NINE');

    // ---- flap modules and their flip schedules
    const mk = (x: number, y: number, w: number, h: number, r: number, size: number, ev: Flip[]): Module => ({ x, y, w, h, r, fam: this.fDigit, size, ev });
    const tI = this.tIn;
    const land = (t: number, ch: string, dur: number): Flip => ({ t: t - dur, ch, dur }); // flap lands at t
    this.mods = [
      mk(CARDX[0]!, CY, CW, CH, 12, this.digitSize, [{ t: tI - 0.02, ch: '2', dur: 0.16 }]),
      mk(CARDX[1]!, CY, CW, CH, 12, this.digitSize, [{ t: tI + 0.03, ch: '3', dur: 0.16 }]),
      mk(CARDX[2]!, CY, CW, CH, 12, this.digitSize, [{ t: tI + 0.08, ch: '5', dur: 0.16 }]),
      mk(CARDX[3]!, CY, CW, CH, 12, this.digitSize, [{ t: tI + 0.13, ch: '8', dur: 0.16 }, land(this.D, '9', 0.075)]),
    ];
    this.mods[3]!.tremble = { t0: this.syl[3]!, t1: this.D - 0.075, next: '9' };
    // seconds: :54 on, a clack per syllable (:55 … :59), :00 on the drop, then (first beat after the drop)
    // an unexplained leap to :52, then one tick per beat
    const tens: Flip[] = [{ t: tI + 0.18, ch: '5', dur: 0.12 }, land(this.D, '0', 0.075)];
    const units: Flip[] = [{ t: tI + 0.22, ch: '4', dur: 0.12 }];
    this.syl.forEach((ts, i) => {
      const gap = i === 0 ? 0.3 : ts - this.syl[i - 1]!;
      units.push(land(ts, String(5 + i), Math.min(0.11, gap * 0.6)));
    });
    units.push(land(this.D, '0', 0.075));
    const b1 = this.beats[1];
    if (b1 !== undefined) {
      const rollDur = Math.min(0.34, (this.beats[2] ?? b1 + 0.46) - b1 - 0.08);
      for (let k = 1; k <= 5; k++) tens.push({ t: b1 + ((k - 1) / 5) * rollDur, ch: String(k), dur: rollDur / 5.5 });
      const n = 22; // units spin: 1,2,…,9,0,1,… landing on 2
      for (let k = 1; k <= n; k++) units.push({ t: b1 + (k - 1) * (rollDur / n), ch: String((k + (12 - n) + 100) % 10), dur: (rollDur / n) * 1.6 });
      for (let k = 2; k < this.beats.length; k++) if (this.beats[k]! < end - 0.05) units.push(land(this.beats[k]!, String((2 + k - 1) % 10), 0.085)); // no flip that would still be in the air at the cut
    }
    this.secMods = [
      mk(SECX[0]!, SEC.top, SEC.w, SEC.h, 5, this.secSize, tens),
      mk(SECX[1]!, SEC.top, SEC.w, SEC.h, 5, this.secSize, units),
    ];

    this.comp = new FSPass(COMP, { tex: { value: this.L.texture }, hot: { value: 0.9 } });
  }

  // ------------------------------------------------------------------ time helpers
  private lastBeat(t: number) {
    let b = -1e9;
    for (const x of this.beats) if (x <= t + 1e-4) b = x;
    return b;
  }

  /** Camera: zoom and a small roll (world -> screen: C + R·(p − FOCUS)·z). */
  private cam(t: number) {
    const D = this.D;
    let z: number, rot = 0;
    if (t < D) {
      z = Z_PRE + 0.05 * Math.pow(prog(t, this.tIn, D), 2);
      // a tick of the camera on every syllable clack
      for (const s of this.syl) z += 0.006 * pulse(t, s, 0.05);
    } else {
      const k = ease.outExpo(clamp((t - D) / 0.13));
      const zPre = Z_PRE + 0.05;
      z = lerp(zPre, 1.0, k) + 0.06 * k * Math.pow(0.5, (t - D) / 0.09); // overshoot, settle
      z += 0.012 * (t - D); // slow creep
      for (const d of this.downs) z += 0.028 * ease.outExpo(clamp((t - d) / 0.4));
      rot = -0.018 * Math.pow(0.5, (t - D) / 0.07) * Math.cos((t - D) * 40);
    }
    return { z, rot };
  }

  // ------------------------------------------------------------------ render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const t = f.t, D = this.D;
    const { renderer } = this.ctx;
    const { z, rot } = this.cam(t);
    const cs = Math.cos(rot) * z, sn = Math.sin(rot) * z;
    const toS = (x: number, y: number) => {
      const dx = x - FOCUS.x, dy = y - FOCUS.y;
      return { x: W / 2 + cs * dx - sn * dy, y: H / 2 + sn * dx + cs * dy };
    };

    const L = this.L; L.clear();
    const c = L.ctx;
    c.setTransform(cs, sn, -sn, cs, W / 2 - (cs * FOCUS.x - sn * FOCUS.y), H / 2 - (sn * FOCUS.x + cs * FOCUS.y));
    c.textBaseline = 'alphabetic';

    this.drawHousing(c, t, z);
    for (const m of this.mods) this.drawModule(c, m, t);
    for (const m of this.secMods) this.drawModule(c, m, t);
    this.drawColon(c, t);
    this.drawLabels(c, t);
    const edge = this.drawBar(c, t, z);
    this.drawRow(c, t);
    this.drawFootnotes(c, t, z);
    L.upload();

    this.comp.u.hot!.value = 0.9;
    this.comp.render(renderer, out);

    // ---- glow: colon, spark, burning edge
    const g = this.glow; g.clear();
    this.glowColon(g, t, z, toS);
    const barCY = BAR.y + BAR.h / 2;
    const burning = t >= this.row[0]!.start;
    if (burning && edge.x < X1 - 1) {
      // the hot edge: a short orange run cooling to the right of the head
      for (let i = 0; i < 10; i++) {
        const a = toS(edge.x + i * 14, barCY), b = toS(edge.x + (i + 1) * 14, barCY);
        const k = Math.pow(1 - i / 10, 2) * edge.heat;
        g.seg2(a.x, a.y, b.x, b.y, 3.2 * z, [LIN.signal[0] * 2.4 * k, LIN.signal[1] * 2.4 * k, LIN.signal[2] * 2.4 * k], 1);
      }
    }
    const sp = this.sparkAt(t);
    if (sp) {
      const p = toS(sp.x, sp.y);
      const I = this.sparkI(t, f);
      sparkParticles(g, t, (tb) => {
        const q = this.sparkAt(tb);
        if (!q) return null;
        const cz = this.cam(tb);
        const c2 = Math.cos(cz.rot) * cz.z, s2 = Math.sin(cz.rot) * cz.z;
        const dx = q.x - FOCUS.x, dy = q.y - FOCUS.y;
        return { x: W / 2 + c2 * dx - s2 * dy, y: H / 2 + s2 * dx + c2 * dy };
      }, { rate: (tb) => (tb >= this.row[0]!.start && tb < this.row[this.row.length - 1]!.end ? 150 : tb >= D - 0.02 && tb < D + 0.25 ? 150 : 22), rateMax: 150, life: 0.5, speed: 240, gravity: 900, intensity: 0.85, seed: 11 });
      sparkHead(g, p.x, p.y, t, (t < D ? 0.62 : 0.85) * Math.sqrt(z), I);
    }
    if (g.count) g.render(renderer, out);

    // ---- post
    const o: PostOverrides = { bloomThreshold: 1.0, bloomKnee: 0.05, halation: 0.12, bloom: 0.75, bloomRadius: 0.6, ca: 1.0, vignette: 0.42, grain: 0.055, hud: 0 };
    let shake = 0;
    for (const s of this.syl) shake += 2.5 * pulse(t, s, 0.04);
    shake += 26 * pulse(t, D, 0.06);
    const lb = this.lastBeat(t);
    if (lb > D + 0.1) shake += 4 * pulse(t, lb, 0.05);
    if (shake > 0.05) o.shake = [noise1(t * 55, 1) * shake, noise1(t * 55, 2) * shake];
    // a two-frame flash (a decaying tail would leave a grey veil over the ink for a tenth of a second)
    const fi = frameIdx(t) - frameIdx(D);
    o.flash = fi === 0 ? 0.35 : fi === 1 ? 0.1 : 0;
    if (lb >= D) o.zoom = 1 + 0.01 * pulse(t, lb, 0.07);
    o.bloom = 0.75 + 0.3 * pulse(t, D, 0.1);
    o.ca = 1.0 + 3 * pulse(t, D, 0.08);
    return o;
  }

  // ------------------------------------------------------------------ the clock
  private drawHousing(c: CanvasRenderingContext2D, t: number, z: number) {
    // hairline housing: empty card slots and the group dimension lines draw in just before the cascade
    const k = ease.outExpo(prog(t, this.tIn - 0.14, this.tIn + 0.1));
    if (k <= 0) return;
    const hw = 1 / z;
    c.lineWidth = hw;
    c.strokeStyle = rgba('bone', 0.2 * k);
    for (const m of [...this.mods, ...this.secMods]) {
      c.beginPath();
      c.roundRect(m.x + 0.5 * hw, m.y + 0.5 * hw, m.w - hw, m.h - hw, m.r);
      c.stroke();
    }
    // tiny mono unit labels under the groups
    const fs = 13 / Math.max(z, 0.75);
    c.font = font(this.fMonoM, fs);
    c.fillStyle = rgba('ash', 0.75 * k);
    const ly = CY + CH + 24;
    c.fillText('HH', CARDX[0]!, ly);
    c.fillText('MM', CARDX[2]!, ly);
    const ss = 'SS';
    c.fillText(ss, SECX[0]! - 14 - measure(ss, this.fMonoM, fs), SEC.top + SEC.h / 2 + fs * 0.35);
    const lt = 'LOCAL TIME  ·  24 H';
    c.fillStyle = rgba('graphite', k);
    c.fillText(lt, CARDX[1]! + CW - measure(lt, this.fMonoM, fs), ly);
  }

  /** One split-flap module: static top = new char, static bottom = old char, the falling flap between. */
  private drawModule(c: CanvasRenderingContext2D, m: Module, t: number) {
    let a = '', b = '', p = 1;
    for (const e of m.ev) {
      if (t < e.t) break;
      a = b; b = e.ch; p = (t - e.t) / e.dur;
    }
    if (p >= 1) a = b;
    p = ease.inQuad(clamp(p));
    if (a === '' && b === '') return;
    const tr = m.tremble;
    if (tr && p >= 1 && t >= tr.t0 && t < tr.t1) {
      // the flap strains against its latch before the drop: the next figure shows behind it
      const k = prog(t, tr.t0, tr.t1, ease.inQuad);
      const sy = 1 - (0.05 + 0.2 * k) * (0.5 + 0.5 * Math.sin((t - tr.t0) * Math.PI * 2 * 24));
      this.half(c, m, tr.next, true, 1, 0);
      this.half(c, m, b, false, 1, 0);
      this.half(c, m, b, true, sy, 0.5 * (1 - sy));
      return;
    }
    this.half(c, m, b, true, 1, 0);
    this.half(c, m, a, false, 1, 0);
    if (p < 1) {
      if (p < 0.5) this.half(c, m, a, true, Math.cos(p * Math.PI), 0.45 * (1 - Math.cos(p * Math.PI)));
      else this.half(c, m, b, false, -Math.cos(p * Math.PI), 0.55 * (1 + Math.cos(p * Math.PI)));
    }
  }

  private half(c: CanvasRenderingContext2D, m: Module, ch: string, top: boolean, sy: number, shade: number) {
    if (ch === '' && shade === 0) return;
    const mid = m.y + m.h / 2, seam = Math.max(2, m.h * 0.008);
    const y0 = top ? m.y : mid + seam / 2, y1 = top ? mid - seam / 2 : m.y + m.h;
    c.save();
    c.translate(0, mid); c.scale(1, Math.max(0.001, sy)); c.translate(0, -mid);
    c.beginPath();
    c.roundRect(m.x, y0, m.w, y1 - y0, top ? [m.r, m.r, 1, 1] : [1, 1, m.r, m.r]);
    if (ch === '') { c.fillStyle = rgba('ink2', 1); c.fill(); c.restore(); return; }
    // top half a touch darker than the bottom: the light comes from below the display
    c.fillStyle = rgba('bone', 1);
    c.fill();
    c.clip();
    if (top) { c.fillStyle = rgba('ink', 0.07); c.fillRect(m.x, y0, m.w, y1 - y0); }
    const asc = m.h === CH ? this.digitAsc : this.secAsc;
    c.font = font(m.fam, m.size);
    c.fillStyle = rgba('ink', 1);
    const w = measure(ch, m.fam, m.size);
    c.fillText(ch, m.x + (m.w - w) / 2, mid + asc / 2);
    if (shade > 0) { c.fillStyle = rgba('ink', clamp(shade)); c.fillRect(m.x, y0, m.w, y1 - y0); }
    c.restore();
    // hinge pins at the seam
    if (top && sy === 1 && shade === 0) {
      c.fillStyle = rgba('ash', 0.9);
      const pw = Math.max(3, m.w * 0.03), ph = seam + 4;
      c.fillRect(m.x - pw * 0.6, mid - ph / 2, pw, ph);
      c.fillRect(m.x + m.w - pw * 0.4, mid - ph / 2, pw, ph);
    }
  }

  private drawColon(c: CanvasRenderingContext2D, t: number) {
    // pre-drop: two dim bone dots (the glow pass lights them orange from the drop on)
    const k = smoothstep(this.tIn - 0.05, this.tIn + 0.2, t);
    if (k <= 0 || t >= this.D) return;
    const r = 17, cy = CY + CH / 2;
    c.fillStyle = rgba('bone', 0.45 * k);
    for (const s of [-1, 1]) { c.beginPath(); c.arc(COLON_X, cy + s * 82, r, 0, Math.PI * 2); c.fill(); }
  }

  private glowColon(g: LineBatch, t: number, z: number, toS: (x: number, y: number) => { x: number; y: number }) {
    if (t < this.D) return;
    const lb = this.lastBeat(t);
    const kick = pulse(t, lb, 0.09);
    const I = 0.9 + 3.2 * kick + 2.5 * pulse(t, this.D, 0.12);
    const cy = CY + CH / 2;
    for (const s of [-1, 1]) {
      const p = toS(COLON_X, cy + s * 82);
      const r = 34 * z * (1 + 0.1 * kick);
      g.seg2(p.x, p.y, p.x + 0.01, p.y, r, [LIN.signal[0] * I, LIN.signal[1] * I, LIN.signal[2] * I], 1);
      g.seg2(p.x, p.y, p.x + 0.01, p.y, r * 0.55, [LIN.ember[0] * I * 0.8 * kick, LIN.ember[1] * I * 0.8 * kick, LIN.ember[2] * I * 0.8 * kick], kick);
    }
  }

  // ------------------------------------------------------------------ the words
  private col(k: PaletteKey, a: number) { return rgba(k, a); }

  /** ELEVEN over the hours, FIFTY-NINE, over the minutes: dimension lines with the sung word on top. */
  private drawLabels(c: CanvasRenderingContext2D, t: number) {
    const el = this.wEl, fi = this.wFif, D = this.D;
    const ant = Math.max(this.tIn + 0.1, el.start - 0.4);
    const k = ease.outExpo(prog(t, ant, ant + 0.3));
    if (k <= 0) return;
    // dimension lines
    const groups: [number, number][] = [[CARDX[0]!, CARDX[1]! + CW], [CARDX[2]!, CARDX[3]! + CW]];
    c.strokeStyle = rgba('bone', 0.4 * k);
    c.lineWidth = 1.5;
    for (const [a, b] of groups) {
      const e = lerp(a, b, k);
      c.beginPath();
      c.moveTo(a, LBL.br + 9); c.lineTo(a, LBL.br); c.lineTo(e, LBL.br);
      if (k > 0.98) c.lineTo(b, LBL.br + 9);
      c.stroke();
    }
    c.font = font(this.fLabel, LBL.size);
    const baseY = LBL.base;
    // ELEVEN
    {
      const sung = t >= el.start;
      const hot = sung && t < fi.start;
      const lift = sung ? 10 * (1 - ease.outExpo(clamp((t - el.start) / 0.18))) : 0;
      c.fillStyle = hot ? this.col('signal', 1) : sung ? this.col('bone', 1) : this.col('bone', 0.3 * k);
      c.fillText('ELEVEN', CARDX[0]!, baseY + lift);
    }
    // FIFTY- | NINE,
    {
      const s = this.fifStr, i = this.nineAt;
      const x = CARDX[2]!, xn = x + glyphX(s, i, this.fLabel, LBL.size);
      const sungA = t >= fi.start, sungB = t >= D;
      const liftA = sungA ? 10 * (1 - ease.outExpo(clamp((t - fi.start) / 0.18))) : 0;
      c.fillStyle = sungA && !sungB ? this.col('signal', 1) : sungA ? this.col('bone', 1) : this.col('bone', 0.3 * k);
      c.fillText(s.slice(0, i), x, baseY + liftA);
      const hotB = sungB && t < fi.end + 0.05;
      c.fillStyle = hotB ? this.col('signal', 1) : sungB ? this.col('bone', 1) : this.col('bone', 0.3 * k);
      c.fillText(s.slice(i), xn, baseY);
    }
  }

  /** The time-remaining bar: a hairline drawn by the spark in the lead-in, a thick segmented bar from the drop. Returns the burn edge. */
  private drawBar(c: CanvasRenderingContext2D, t: number, z: number) {
    const D = this.D;
    const draw = ease.inOutCubic(prog(t, this.tDraw0, this.tDraw1));
    const edge = this.burnEdge(t);
    const thick = t < D ? 1.2 / z : lerp(1.2 / z, BAR.h, ease.outExpo(clamp((t - D) / 0.16)));
    const segK = t < D ? 0 : ease.outExpo(clamp((t - D) / 0.2)); // segment gaps open on the drop
    const cy = BAR.y + BAR.h / 2;
    // burnt remainder: a charred hairline
    if (edge.x < X1) {
      c.fillStyle = rgba('graphite', 0.9);
      c.fillRect(edge.x, cy - 0.5 / z, X1 - edge.x, 1 / z);
      // cooling ember just behind the head
      const gr = c.createLinearGradient(edge.x, 0, edge.x + 180, 0);
      gr.addColorStop(0, rgba('signal', 0.95 * edge.heat));
      gr.addColorStop(0.35, rgba('blood', 0.6 * edge.heat));
      gr.addColorStop(1, rgba('blood', 0));
      c.fillStyle = gr;
      c.fillRect(edge.x, cy - 2, 180, 4);
    }
    // the gauge's housing opens around the hairline on the drop
    if (t >= D) {
      const k = ease.outExpo(clamp((t - D) / 0.22));
      const hh = lerp(0, BAR.h / 2 + BAR.pad, k), pd = BAR.pad * k;
      c.strokeStyle = rgba('bone', 0.38);
      c.lineWidth = 1.5;
      c.strokeRect(X0 - pd, cy - hh, X1 - X0 + 2 * pd, 2 * hh);
      // readout above the right end: what is left, in percent
      const fs = 17 / Math.max(z, 0.72);
      const pct = (100 * (edge.x - X0)) / (X1 - X0);
      const v = pct >= 99.95 ? '100.0' : pct.toFixed(1).padStart(5, ' ');
      c.font = font(this.fMonoM, fs);
      const lab = 'TIME REMAINING', val = `${v} %`;
      const wv = measure(val, this.fMonoM, fs), wl = measure(lab, this.fMonoM, fs);
      const y = cy - hh - 16;
      c.fillStyle = rgba('ash', k);
      c.fillText(lab, X1 - wv - 18 - wl, y);
      const blink = pct < 0.05 && (frameIdx(t) >> 3) % 2 === 1 ? 0.25 : 1;
      c.fillStyle = pct < 99.95 ? rgba('signal', k * blink) : rgba('bone', k);
      c.fillText(val, X1 - wv, y);
    }
    const xEnd = Math.min(lerp(X0, X1, draw), edge.x);
    if (xEnd <= X0) return edge;
    c.fillStyle = rgba('bone', t < D ? 0.7 : 0.92);
    for (const sg of this.segs) {
      const a = sg.x0, b = Math.min(sg.x1 + (1 - segK) * BAR.gap, xEnd);
      if (b > a) c.fillRect(a, cy - thick / 2, b - a, thick);
    }
    return edge;
  }

  /** Burn edge: segment (n−1−k) burns right→left while word k is sung. */
  private burnEdge(t: number) {
    let x = X1, heat = 0;
    const n = this.row.length;
    for (let k = 0; k < n; k++) {
      const w = this.row[k]!;
      if (t < w.start) break;
      const s = this.segs[n - 1 - k]!;
      const pr = ease.outCubic(Lyrics.wordProgress(w, t));
      x = lerp(s.x1, s.x0, pr);
      heat = 1;
    }
    const last = this.row[n - 1]!;
    if (t > last.end) heat = Math.pow(0.5, (t - last.end) / 0.12);
    return { x, heat };
  }

  /** The spark: draws the hairline, idles at its end, then rides the burn edge. */
  private sparkAt(t: number): { x: number; y: number } | null {
    if (t < this.tDraw0) return null;
    const cy = BAR.y + BAR.h / 2;
    const draw = ease.inOutCubic(prog(t, this.tDraw0, this.tDraw1));
    if (draw < 1) return { x: lerp(X0, X1, draw), y: cy };
    return { x: this.burnEdge(t).x, y: cy };
  }

  private sparkI(t: number, f: Frame) {
    const D = this.D;
    if (t < D) {
      const breathe = 0.5 + 0.5 * Math.sin((f.beat - 0.25) * Math.PI); // one breath per two beats
      return 0.55 + 0.25 * breathe + 0.6 * clamp(f.a.other) * prog(t, this.tIn - 1, D);
    }
    const last = this.row[this.row.length - 1]!;
    const lb = this.lastBeat(t);
    let I = 1.05 + 0.5 * pulse(t, lb, 0.08) + 1.5 * pulse(t, D, 0.12);
    if (t > last.end) I *= 0.35 + 0.65 * Math.pow(0.5, (t - last.end) / 0.1) + 0.12 * hash(frameIdx(t), 3);
    return I;
  }

  /** "I’m running out of time", standing on the bar: dim from the drop, each word lit on its start. */
  private drawRow(c: CanvasRenderingContext2D, t: number) {
    const D = this.D;
    if (t < D) return;
    const k = ease.outExpo(prog(t, D, D + 0.25));
    const lay = this.rowLay;
    c.font = font(this.fRow, lay.size);
    const n = this.row.length;
    for (let i = 0; i < n; i++) {
      const w = this.row[i]!;
      const sung = t >= w.start;
      const cur = sung && (i === n - 1 || t < this.row[i + 1]!.start);
      const pop = sung ? 1 - ease.outExpo(clamp((t - w.start) / 0.16)) : 0;
      const y = ROW.base + (1 - k) * 18 - pop * 12;
      c.fillStyle = cur ? rgba('signal', 1) : sung ? rgba('bone', 1) : rgba('bone', 0.3 * k);
      c.fillText(w.w, this.wordX[i]!, y);
    }
  }

  private drawFootnotes(c: CanvasRenderingContext2D, t: number, z: number) {
    const fs = 17 / Math.max(z, 0.72);
    c.font = font(this.fMono, fs);
    // lead-in: types itself in
    const a = 'submission closes 23:59:59';
    const na = Math.floor(prog(t, this.tType0, this.tType1) * a.length + 1e-6);
    if (t >= this.tType0) {
      c.fillStyle = rgba('ash', 1);
      c.fillText(a.slice(0, na), X0, FOOT);
      if (na < a.length || (t < this.tIn + 0.4 && Math.floor(t * 3.2) % 2 === 0)) {
        const cx = X0 + measure(a.slice(0, na), this.fMono, fs) + 3 / z;
        c.fillStyle = rgba('signal', 1);
        c.fillRect(cx, FOOT - fs * 0.78, fs * 0.55, fs * 0.95);
      }
    }
    // from "I'm": the disclaimer, right-aligned under the bar's end
    const b = 'time remaining is an estimate';
    if (t >= this.tNote0) {
      const nb = Math.floor(prog(t, this.tNote0, this.tNote0 + 0.4) * b.length + 1e-6);
      const bw = measure(b, this.fMono, fs);
      c.fillStyle = rgba('ash', 1);
      c.fillText(b.slice(0, nb), X1 - bw, FOOT);
    }
  }
}

const COMP = /* glsl */ `
uniform sampler2D tex; uniform float hot;
void main() {
  vec4 s = texture(tex, vUv);
  // signal-orange paint glows (only the signal colour exceeds the bloom threshold)
  float h = smoothstep(0.25, 0.7, s.r - s.g * 1.3);
  vec3 bg = C_INK;
  vec3 col = mix(bg, s.rgb * (1.0 + hot * h), s.a);
  fragColor = vec4(col, 1.0);
}`;
