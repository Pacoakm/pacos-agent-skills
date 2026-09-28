// LOGOUT x2 — "Blackboard, please don’t log me out" (the pre-chorus; ink, quiet, no drums).
// A session-timeout dialog of our own hairline design, set like a figure: no logo, no product look;
// the word "Blackboard" exists only as the sung lyric.
//  - The cut: the dialog opens from a hairline; the countdown `00:59` (n = 1: `00:30`) ticks once per
//    beat and a hairline under the header drains with it.
//  - "Blackboard," is held: the word stretches across the dialog, Archivo width 62 → 125 over the held
//    note, measured by a dimension line (`wdth 62 … 125`) like a type specimen.
//  - "please don’t log me out" is typed as the plea over the two buttons, each word on its sung start.
//  - The cursor is the spark, idling in the gap between `stay signed in` and `log out`. On "out" it
//    drifts toward `log out`; after the line the countdown stops ticking per beat and runs, faster and
//    faster, while the cursor hovers over `log out`… and on the last beat it snaps onto
//    `stay signed in` (click), the countdown freezing at 00:01.
// n = 1 (second time): the same dialog, one notch worse: a first notice left behind it, the countdown
// starts at 00:30, the cursor actually presses `log out` halfway, footnote `inactivity detected: again`.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { rgba } from '../../engine/palette';
import { F, font, layout, measure, ARCHIVO_WIDTHS, type TextLayout } from '../../engine/type';
import { type Word } from '../../engine/lyrics';
import { clamp, ease, lerp, noise1, prog, pulse, frameIdx, keys, type Key } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';

// ------------------------------------------------------------------ layout (world px at zoom 1)
const DX0 = 232, DX1 = 1688; // dialog
const PAD = 72; // inner margin
const HEAD_H = 60; // header strip
const R = 10; // corner radius
const BTN = { h: 74, padX: 34, gap: 44, size: 24 };
const PLEA_MAX = 82;
const CD_SIZE = 104; // the countdown figure

interface Tick { t: number; v: number }
interface Btn { x0: number; x1: number; label: string }
type P2 = { x: number; y: number };

export default class Logout extends Scene {
  L = new Layer2D();
  glow = new LineBatch(3000);
  comp!: FSPass;
  n = 0;

  // lyric
  wB!: Word; plea: Word[] = [];
  tHold1 = 0; // end of the held "Blackboard,"
  tOut = 0; tLineEnd = 0;
  // beat grid
  beats: number[] = [];
  tSnap = 0; tRoll = 0;
  ticks: Tick[] = [];
  count0 = 59;

  // type
  fMono = F.mono(400);
  fMonoM = F.mono(500);
  fPlea = F.archivo(100, 700);
  wordSize = 0;
  wordLays: TextLayout[] = []; // "Blackboard," at each Archivo width instance
  wordCap = 0;
  pleaText = ''; pleaLay!: TextLayout; pleaWordCi: number[] = [];

  // geometry
  DY0 = 0; DY1 = 0; wordBase = 0; pleaBase = 0; btnY0 = 0; pleaSize = PLEA_MAX; cdBase = 0; cdCap = 0;
  stay!: Btn; out!: Btn;
  cdX = 0; // countdown digits x

  override init() {
    const { lyrics, audio: au, start, end, params } = this.ctx;
    this.n = (params.n as number) ?? 0;
    const line = lyrics.get('Blackboard, please', this.n);
    const ws = line.words;
    this.wB = ws[0]!; this.plea = ws.slice(1);
    this.tHold1 = this.plea[0]!.start;
    const last = ws[ws.length - 1]!;
    this.tOut = last.start; this.tLineEnd = last.end;
    this.count0 = this.n === 1 ? 30 : 59;

    // beats inside the window
    const b0 = Math.ceil(au.beatAt(start) - 1e-3);
    for (let k = b0; ; k++) { const tb = au.timeOfBeat(k); if (tb > end + 1e-3) break; this.beats.push(tb); }
    // the snap: the last beat with room for the click before the cut
    this.tSnap = [...this.beats].reverse().find((b) => b <= end - 0.35) ?? end - 0.45;
    // the roll: the first beat after the line is sung
    this.tRoll = this.beats.find((b) => b > this.tLineEnd + 0.05) ?? this.tSnap - 1.8;
    // countdown: −1 per beat until the roll, then accelerating ticks down to 00:01 landing on the snap
    let v = this.count0;
    for (const b of this.beats) {
      if (b < start + 0.1) continue;
      if (b >= this.tRoll) break;
      v -= 1; this.ticks.push({ t: b, v });
    }
    const N = v - 1;
    for (let k = 1; k <= N; k++) this.ticks.push({ t: this.tRoll + (this.tSnap - this.tRoll) * Math.pow(k / N, 0.55), v: v - k });

    // ---- type
    const mc = document.createElement('canvas').getContext('2d')!;
    const inner = DX1 - DX0 - 2 * PAD;
    const txt = this.wB.w;
    const w125 = measure(txt, F.archivo(125, 900), 100) / 100;
    this.wordSize = Math.floor(inner / w125);
    this.wordLays = ARCHIVO_WIDTHS.map((w) => layout(txt, F.archivo(w / 10, 900), this.wordSize));
    mc.font = font(F.archivo(100, 900), this.wordSize);
    this.wordCap = mc.measureText('B').actualBoundingBoxAscent;
    this.pleaText = this.plea.map((w) => w.w).join(' ');
    // two columns under the word: the plea over the buttons (left), the countdown (right)
    const x0 = DX0 + PAD;
    this.cdX = DX1 - PAD - measure('00:00', this.fMonoM, CD_SIZE);
    this.pleaSize = Math.min(PLEA_MAX, Math.floor((this.cdX - 56 - x0) / (measure(this.pleaText, this.fPlea, 100) / 100)));
    this.pleaLay = layout(this.pleaText, this.fPlea, this.pleaSize);
    let ci = 0;
    for (const w of this.plea) { this.pleaWordCi.push(ci); ci += Array.from(w.w).length + 1; }
    mc.font = font(this.fPlea, this.pleaSize);
    const pleaCap = mc.measureText('H').actualBoundingBoxAscent;
    mc.font = font(this.fMonoM, CD_SIZE);
    this.cdCap = mc.measureText('0').actualBoundingBoxAscent;

    // ---- vertical rhythm (dialog centred on the frame)
    const hgt = HEAD_H + 58 + this.wordCap + 100 + pleaCap + 56 + BTN.h + 64;
    this.DY0 = Math.round(540 - hgt / 2 - 14);
    this.wordBase = this.DY0 + HEAD_H + 58 + this.wordCap;
    this.pleaBase = this.wordBase + 100 + pleaCap;
    this.btnY0 = this.pleaBase + 56;
    this.DY1 = this.btnY0 + BTN.h + 64;
    this.cdBase = this.btnY0 + BTN.h;
    const bw = (s: string) => measure(s, this.fMonoM, BTN.size) + 2 * BTN.padX;
    this.stay = { x0, x1: x0 + bw('stay signed in'), label: 'stay signed in' };
    this.out = { x0: this.stay.x1 + BTN.gap, x1: this.stay.x1 + BTN.gap + bw('log out'), label: 'log out' };

    this.comp = new FSPass(COMP, { tex: { value: this.L.texture }, hot: { value: 0.3 } });
  }

  // ------------------------------------------------------------------ time helpers
  private countAt(t: number) {
    let v = this.count0, tt = -1e9;
    for (const k of this.ticks) { if (k.t > t) break; v = k.v; tt = k.t; }
    return { v, tt };
  }

  private btnMid() { return this.btnY0 + BTN.h / 2; }

  /** The cursor (the spark): idles in the gap, drifts to `log out` on "out", snaps to `stay signed in`. */
  cursorAt(t: number): P2 | null {
    const { start } = this.ctx;
    if (t < start + 0.12) return null;
    const my = this.btnMid();
    const gap = { x: (this.stay.x1 + this.out.x0) / 2, y: my + 4 };
    const outC = { x: lerp(this.out.x0, this.out.x1, 0.6), y: my + 19 };
    const stayC = { x: lerp(this.stay.x0, this.stay.x1, 0.62), y: my + 19 };
    // idle: a slow, small wander (a hand on a trackpad)
    const idle = (k: number) => ({ x: noise1(t * 0.9, 11) * 9 * k, y: noise1(t * 0.8, 12) * 5 * k });
    let p: P2;
    if (t < this.tOut) {
      const i = idle(1);
      p = { x: gap.x + i.x, y: gap.y + i.y };
    } else if (t < this.tSnap) {
      const T = this.tSnap - this.tOut;
      const u = prog(t, this.tOut, this.tOut + 0.72 * T, ease.inOutCubic);
      const hov = prog(t, this.tOut + 0.6 * T, this.tSnap);
      const i = idle(1 - u);
      // n = 1: the press — the cursor sinks into the button
      const press = this.n === 1 ? 5 * prog(t, this.tSnap - 0.25, this.tSnap - 0.04, ease.inCubic) : 0;
      p = {
        x: lerp(gap.x, outC.x, u) + i.x + noise1(t * 14, 13) * 2.4 * hov,
        y: lerp(gap.y, outC.y, u) + i.y + noise1(t * 13, 14) * 1.6 * hov + press,
      };
    } else {
      const from = { x: outC.x, y: outC.y };
      const k = ease.outExpo(clamp((t - this.tSnap) / 0.1));
      const settle = Math.pow(0.5, (t - this.tSnap) / 0.06) * Math.sin((t - this.tSnap) * 60) * 5;
      p = { x: lerp(from.x, stayC.x, k) + settle * (k > 0.98 ? 1 : 0), y: lerp(from.y, stayC.y, k) };
    }
    return p;
  }

  /** Camera: zoom + focus (world → screen: C + (p − focus)·z). */
  cam(t: number) {
    const { start } = this.ctx;
    const dcy = (this.DY0 + this.DY1) / 2;
    const lowY = (this.DY0 - (this.n === 1 ? 26 : 0) + this.DY1 + 44) / 2; // the whole figure, footnote included
    const tP = this.tHold1, tO = this.tOut, tS = this.tSnap;
    const zK: Key[] = [
      [start, 0.93], [start + 0.5, 0.985, ease.outExpo], [tP, 1.0, ease.linear],
      [tP + 0.9, 1.1, ease.inOutCubic], [tO, 1.13, ease.linear],
      [tS - 0.2, 1.22, ease.inOutCubic], [tS, 1.23, ease.linear], [tS + 0.45, 1.2, ease.outCubic],
    ];
    const yK: Key[] = [
      [start, dcy], [tP, dcy], [tP + 0.9, lowY + 6, ease.inOutCubic], [tO, lowY + 8],
      [tS - 0.2, lowY + 22, ease.inOutCubic], [tS, lowY + 23], [tS + 0.45, lowY + 20, ease.outCubic],
    ];
    const z = keys(t, zK) * (1 + 0.012 * pulse(t, tS, 0.08)); // the click
    return { z, x: 960, y: keys(t, yK) };
  }

  // ------------------------------------------------------------------ render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const t = f.t;
    const { renderer, start } = this.ctx;
    const cam = this.cam(t);
    const z = cam.z;
    const toS = (p: P2, c = cam) => ({ x: W / 2 + (p.x - c.x) * c.z, y: H / 2 + (p.y - c.y) * c.z });

    const L = this.L; L.clear();
    const c = L.ctx;
    c.setTransform(z, 0, 0, z, W / 2 - z * cam.x, H / 2 - z * cam.y);
    c.textBaseline = 'alphabetic';

    const open = ease.outExpo(prog(t, start, start + 0.24));
    this.drawDialog(c, t, z, open);
    if (open > 0.6) {
      this.drawWord(c, t, z);
      this.drawBody(c, t, z);
      this.drawPlea(c, t, z);
      this.drawButtons(c, t, z);
    }
    this.drawFootnote(c, t, z);
    L.upload();
    this.comp.render(renderer, out);

    // ---- the cursor spark
    const g = this.glow; g.clear();
    const cp = this.cursorAt(t);
    if (cp) {
      const p = toS(cp);
      const snapK = pulse(t, this.tSnap, 0.12);
      sparkParticles(g, t, (tb) => { const q = this.cursorAt(tb); return q ? toS(q, this.cam(tb)) : null; }, {
        rate: (tb) => (tb >= this.tSnap && tb < this.tSnap + 0.22 ? 160 : tb >= this.tOut && tb < this.tSnap ? 40 : 16),
        rateMax: 160, life: 0.45, speed: 200, gravity: 800, intensity: 0.8, seed: 23,
      });
      const breathe = 0.5 + 0.5 * Math.sin((f.beat - 0.25) * Math.PI);
      const hov = t >= this.tOut && t < this.tSnap ? prog(t, this.tOut, this.tSnap) : 0;
      const I = (0.7 + 0.2 * breathe + 0.5 * hov + 1.6 * snapK) * clamp((t - start - 0.12) / 0.15);
      sparkHead(g, p.x, p.y, t, 0.72 * Math.sqrt(z) * (1 + 0.4 * snapK), I);
    }
    if (g.count) g.render(renderer, out);

    const o: PostOverrides = { bloomThreshold: 1.0, bloomKnee: 0.05, halation: 0.12, bloom: 0.75, bloomRadius: 0.6, ca: 1.0, vignette: 0.42, grain: 0.055, hud: 0 };
    const sh = 5 * pulse(t, this.tSnap, 0.05) + 1.2 * pulse(t, start, 0.05);
    if (sh > 0.05) o.shake = [noise1(t * 55, 1) * sh, noise1(t * 55, 2) * sh];
    o.bloom = 0.75 + 0.25 * pulse(t, this.tSnap, 0.1);
    return o;
  }

  // ------------------------------------------------------------------ the dialog
  private drawDialog(c: CanvasRenderingContext2D, t: number, z: number, open: number) {
    const hw = 1.25 / z;
    const cy = (this.DY0 + this.DY1) / 2;
    const hh = ((this.DY1 - this.DY0) / 2) * open;
    const y0 = cy - hh, y1 = cy + hh;
    // n = 1: the first notice, still there behind this one
    if (this.n === 1) {
      const k = ease.outExpo(prog(t, this.ctx.start + 0.05, this.ctx.start + 0.4));
      const o = 26 * k;
      c.fillStyle = rgba('ink2', 0.9 * k);
      c.strokeStyle = rgba('graphite', 0.7 * k);
      c.lineWidth = hw;
      c.beginPath(); c.roundRect(DX0 - o, this.DY0 - o, DX1 - DX0, this.DY1 - this.DY0, R); c.fill(); c.stroke();
      c.font = font(this.fMonoM, 15);
      c.fillStyle = rgba('graphite', k);
      c.fillText('SESSION TIMEOUT', DX0 - o + PAD - 24, this.DY0 - o + 36);
    }
    c.fillStyle = rgba('ink2', 1);
    c.strokeStyle = rgba('bone', 0.55);
    c.lineWidth = hw;
    c.beginPath(); c.roundRect(DX0 + 0.5 * hw, y0, DX1 - DX0 - hw, Math.max(1 / z, y1 - y0), R * open); c.fill(); c.stroke();
    if (open < 0.6) return;
    const k = prog(open, 0.6, 1);
    // header strip
    const hy = this.DY0 + HEAD_H;
    c.fillStyle = rgba('graphite', 0.9 * k);
    c.fillRect(DX0, hy - 0.5 * hw, DX1 - DX0, hw);
    c.font = font(this.fMonoM, 15);
    const head = this.n === 1 ? 'SESSION TIMEOUT  ·  SECOND NOTICE' : 'SESSION TIMEOUT';
    const nh = Math.floor(prog(t, this.ctx.start + 0.06, this.ctx.start + 0.36) * head.length);
    c.fillStyle = rgba('ash', k);
    c.fillText(head.slice(0, nh), DX0 + PAD - 24, this.DY0 + 36);
    const tl = '23:41';
    c.fillStyle = rgba('bone', k);
    c.fillText(tl, DX1 - PAD + 24 - measure(tl, this.fMonoM, 15), this.DY0 + 36);
    c.fillStyle = rgba('graphite', k);
    const lt = 'LOCAL TIME  ';
    c.fillText(lt, DX1 - PAD + 24 - measure(tl + '  ' + lt, this.fMonoM, 15) + measure('  ', this.fMonoM, 15), this.DY0 + 36);
    // the session drains along the header rule, a step per tick
    const { v, tt } = this.countAt(t);
    const prev = v + 1;
    const step = ease.outExpo(clamp((t - tt) / 0.14));
    const frac = lerp(prev, v, t >= tt ? step : 1) / this.count0;
    const frozen = t >= this.tSnap;
    c.fillStyle = frozen ? rgba('signal', 1) : rgba('bone', 0.85);
    c.fillRect(DX0 + 1, hy - 1, (DX1 - DX0 - 2) * clamp(frac) * k, 2);
  }

  /** "Blackboard," — stretched across the dialog while the note is held. */
  private drawWord(c: CanvasRenderingContext2D, t: number, z: number) {
    const w = this.wB;
    if (t < w.start) return;
    const u = prog(t, w.start, this.tHold1 - 0.04);
    const wd = lerp(62, 125, ease.inOutQuad(u));
    // the width lands between two static instances: set the nearer one, scaled to the interpolated advance
    const ws = ARCHIVO_WIDTHS.map((x) => x / 10);
    let i = 0;
    while (i < ws.length - 2 && wd > ws[i + 1]!) i++;
    const v = clamp((wd - ws[i]!) / (ws[i + 1]! - ws[i]!));
    const target = lerp(this.wordLays[i]!.width, this.wordLays[i + 1]!.width, v);
    const lay = this.wordLays[v < 0.5 ? i : i + 1]!;
    const sx = target / lay.width;
    const x0 = DX0 + PAD, base = this.wordBase;
    const cur = t < this.tHold1;
    const pop = 1 - ease.outExpo(clamp((t - w.start) / 0.2));
    c.save();
    c.translate(x0, base - pop * 14);
    c.scale(sx, 1);
    c.font = font(lay.family, lay.size);
    c.fillStyle = cur ? rgba('signal', 1) : rgba('bone', 1);
    c.fillText(w.w, 0, 0);
    c.restore();
    // specimen dimension line: the word's measured advance, and the width axis it is set at
    const dk = cur ? 1 : 0.45 + 0.55 * Math.pow(0.5, (t - this.tHold1) / 0.3);
    const y = base + 48;
    const hw = 1 / z;
    c.strokeStyle = rgba('ash', 0.75 * dk);
    c.lineWidth = hw;
    c.beginPath();
    c.moveTo(x0, y - 7); c.lineTo(x0, y + 7);
    c.moveTo(x0, y); c.lineTo(x0 + target, y);
    c.moveTo(x0 + target, y - 7); c.lineTo(x0 + target, y + 7);
    c.stroke();
    c.font = font(this.fMono, 14);
    const lab = `wdth ${Math.round(wd)}`;
    c.fillStyle = cur ? rgba('signal', 0.95) : rgba('ash', 0.8 * dk);
    const lw = measure(lab, this.fMono, 14);
    c.fillText(lab, Math.min(x0 + target - lw, DX1 - PAD - lw), y + 22);
  }

  /** "Your session will expire in 00:59": ticks once per beat, then runs; freezes at 00:01 on the click. */
  private drawBody(c: CanvasRenderingContext2D, t: number, z: number) {
    const x = this.cdX, y = this.cdBase;
    const labY = y - this.cdCap - 30;
    c.font = font(this.fMono, 21);
    c.fillStyle = rgba('ash', 1);
    c.fillText('Your session will expire in', x + 4, labY);
    const { v, tt } = this.countAt(t);
    const frozen = t >= this.tSnap;
    const hot = v <= 10 || frozen;
    const fam = this.fMonoM, size = CD_SIZE;
    const adv = measure('0', fam, size);
    const s = `00:${String(v).padStart(2, '0')}`;
    const ps = `00:${String(Math.min(this.count0, v + 1)).padStart(2, '0')}`;
    const k = t >= tt ? ease.outExpo(clamp((t - tt) / 0.09)) : 1;
    c.font = font(fam, size);
    const col = hot ? rgba('signal', 1) : rgba('bone', 1);
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]!, pch = ps[i]!;
      const gx = x + i * adv;
      if (ch === pch || k >= 1) { c.fillStyle = col; c.fillText(ch, gx, y); continue; }
      // the changed digits roll: the old one out below, the new one in from above
      c.save();
      c.beginPath(); c.rect(gx - 4, y - this.cdCap - 10, adv + 8, this.cdCap + 20); c.clip();
      c.fillStyle = col;
      c.fillText(pch, gx, y + k * (this.cdCap + 14));
      c.fillText(ch, gx, y - (1 - k) * (this.cdCap + 14));
      c.restore();
    }
    // a hairline under the figure; after the click, the dialog's deadpan receipt
    c.fillStyle = rgba('graphite', 1);
    c.fillRect(x + 4, y + 18, s.length * adv - 4, 1 / z);
    if (frozen) {
      const note = 'session extended';
      const nn = Math.floor(prog(t, this.tSnap + 0.08, this.tSnap + 0.3) * note.length);
      c.font = font(this.fMono, 18);
      c.fillStyle = rgba('ash', 1);
      c.fillText(note.slice(0, nn), x + 4, y + 46);
    }
  }

  /** The plea, typed on the sung word starts; the current word in orange; a caret. */
  private drawPlea(c: CanvasRenderingContext2D, t: number, z: number) {
    const x0 = DX0 + PAD, y = this.pleaBase;
    const lay = this.pleaLay;
    c.font = font(this.fPlea, this.pleaSize);
    let caretX = x0, typedAny = false;
    for (let wi = 0; wi < this.plea.length; wi++) {
      const w = this.plea[wi]!;
      if (t < w.start) break;
      typedAny = true;
      const chars = Array.from(w.w);
      const dur = Math.min(0.16, Math.max(0.05, (w.end - w.start) * 0.6));
      const nc = Math.max(1, Math.ceil(clamp((t - w.start) / dur) * chars.length));
      const next = this.plea[wi + 1];
      const cur = next ? t < next.start : t < this.tSnap;
      c.fillStyle = cur ? rgba('signal', 1) : rgba('bone', 1);
      const ci = this.pleaWordCi[wi]!;
      for (let j = 0; j < nc; j++) {
        const g = lay.glyphs[ci + j]!;
        c.fillText(g.ch, x0 + g.x, y);
      }
      const lg = lay.glyphs[ci + nc - 1]!;
      caretX = x0 + lg.x + lg.w;
    }
    // caret: solid while typing, blinking when idle, gone after the click
    if (t < this.tSnap && t > this.ctx.start + 0.3) {
      const lastStart = [...this.plea].reverse().find((w) => w.start <= t)?.start ?? -1e9;
      const typing = t - lastStart < 0.3;
      const on = typing || Math.floor((t - lastStart) * 2.4) % 2 === 0;
      if (on) {
        c.fillStyle = rgba('bone', typedAny ? 0.9 : 0.5);
        c.fillRect(caretX + 8, y - this.pleaSize * 0.74, Math.max(3, 4 / z), this.pleaSize * 0.86);
      }
    }
  }

  private drawButtons(c: CanvasRenderingContext2D, t: number, z: number) {
    const cp = this.cursorAt(t);
    const y0 = this.btnY0, h = BTN.h;
    const hw = 1.25 / z;
    for (const b of [this.stay, this.out]) {
      const isStay = b === this.stay;
      const over = cp && cp.x > b.x0 - 6 && cp.x < b.x1 + 6 && cp.y > y0 - 6 && cp.y < y0 + h + 6;
      const clicked = isStay && t >= this.tSnap;
      // the click: a solid orange flash, then the chosen button stays inverted (bone, ink label)
      const flash = clicked && t < this.tSnap + 0.11;
      // n = 1: `log out` pressed halfway before the snap
      const half = !isStay && this.n === 1 ? prog(t, this.tSnap - 0.25, this.tSnap - 0.04) * (t < this.tSnap ? 1 : 0) : 0;
      const press = clicked ? 3 * pulse(t, this.tSnap, 0.08) : 3 * half;
      const x0 = b.x0 + press * 0.5, x1 = b.x1 - press * 0.5, yy0 = y0 + press * 0.5, yy1 = y0 + h - press * 0.5;
      c.beginPath(); c.roundRect(x0, yy0, x1 - x0, yy1 - yy0, 6);
      if (clicked) { c.fillStyle = rgba(flash ? 'signal' : 'bone', 1); c.fill(); }
      else if (over) { c.fillStyle = rgba('bone', 0.07 + 0.08 * half); c.fill(); }
      c.strokeStyle = rgba('bone', over || clicked ? 0.95 : 0.5);
      c.lineWidth = hw * (over || clicked ? 1.4 : 1);
      c.stroke();
      c.font = font(this.fMonoM, BTN.size);
      c.fillStyle = rgba(clicked ? 'ink' : 'bone', over || clicked ? 1 : 0.8);
      c.fillText(b.label, x0 + BTN.padX - press * 0.5, (yy0 + yy1) / 2 + BTN.size * 0.34);
    }
  }

  private drawFootnote(c: CanvasRenderingContext2D, t: number, _z: number) {
    const s = this.n === 1 ? 'inactivity detected: again' : 'inactivity detected: 3 h 12 min';
    const t0 = this.ctx.start + 0.45;
    if (t < t0) return;
    const nn = Math.floor(prog(t, t0, t0 + 0.5) * s.length);
    c.font = font(this.fMono, 17);
    c.fillStyle = rgba('ash', 1);
    c.fillText(s.slice(0, nn), DX0, this.DY1 + 40);
    const fig = this.n === 1 ? 'last activity: this dialog' : 'last activity 20:29';
    c.fillStyle = rgba('graphite', 1);
    c.fillText(fig, DX1 - measure(fig, this.fMono, 17), this.DY1 + 40);
  }
}

const COMP = /* glsl */ `
uniform sampler2D tex; uniform float hot;
void main() {
  vec4 s = texture(tex, vUv);
  // signal-orange paint glows (only the signal colour exceeds the bloom threshold)
  float h = smoothstep(0.25, 0.7, s.r - s.g * 1.3);
  vec3 col = mix(C_INK, s.rgb * (1.0 + hot * h), s.a);
  fragColor = vec4(col, 1.0);
}`;
