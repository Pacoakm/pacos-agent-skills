// UPLOAD x2 — "I’m one upload from figuring it out" (the pre-chorus build; ink).
// One huge progress bar, a bone slab filled to 99 % and stuck there. The lyric is set inside the fill
// (ink on bone, the sung word orange), in two lines, the second ending against the last percent. The
// spark is the upload head, straining at the fill edge. The "time remaining" estimate under the bar
// jumps absurdly on the beats (2 s → 5 min → 3 h → calculating…).
//  - The held "out": the camera leans in on the last percent; the edge strains and flickers 99.9 %.
//  - n = 0, the build (after "out" to the downbeat): the chrome drops away, the bar is crushed into a
//    single hairline while the camera pulls back to the `clock` plate's framing, then the spark runs
//    the hairline back into itself and idles at its start: the first image of `clock` (black, the
//    spark at the start of the hairline it is about to draw), matched to its screen position and size.
//  - n = 1: the drums enter (the bar jolts on every kick); a snare roll under "out": the percentage
//    creeps 99.0 → 99.9 in accelerating steps and the bar shakes; on the roll's last hit (the silence
//    follows) everything collapses to the hairline at the same framing, the spark at its end.
import type * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { rgba } from '../../engine/palette';
import { F, font, layout, measure, type TextLayout } from '../../engine/type';
import { norm, type Word } from '../../engine/lyrics';
import { clamp, ease, hash, lerp, noise1, prog, pulse, frameIdx, keys, type Key } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';

// ------------------------------------------------------------------ layout (world px at zoom 1)
const BX0 = 160, BX1 = 1760; // the bar (and clock's hairline, X0..X1)
const BH = 300, CY = 540; // bar height, centre line (the hairline)
const BY0 = CY - BH / 2, BY1 = CY + BH / 2;
const IN = 52; // text inset inside the bar
// DETAIL A: the last percent at 10:1, in an inset under the bar's right end
const MAG = 10;
const DW = 56, DH = 15; // detail window (world)
const DWX0 = BX1 - 40, DWY0 = CY - DH / 2;
const INS = { x0: BX1 - DW * MAG, y0: BY1 + 72, w: DW * MAG, h: DH * MAG };
// clock's lead-in framing: world zoom 0.64 about (960, 548), its hairline at world y 909 → screen y 771.04
const Z_END = 0.64;
const SCREEN_Y_END = 540 + Z_END * (909 - 548);
const FY_END = CY - (SCREEN_Y_END - 540) / Z_END;

const EST0 = ['2 s', '5 min', '3 h', 'calculating…', '14 s', '2 days', 'calculating…', '1 s', '6 h', 'calculating…', '40 min', '3 weeks', 'calculating…', '9 s', 'calculating…'];
const EST1 = ['1 s', '8 min', '5 h', 'calculating…', '3 s', '4 days', 'calculating…', '2 s', '1 year', 'calculating…', '12 min', 'calculating…', '6 s', '2 weeks', 'calculating…', '1 s', 'calculating…'];

type P2 = { x: number; y: number };
interface Cam { z: number; x: number; y: number }
interface Row { words: Word[]; text: string; lay: TextLayout; x: number; base: number; ci: number[] }

export default class Upload extends Scene {
  L = new Layer2D();
  glow = new LineBatch(4000);
  comp!: FSPass;
  n = 0;

  words: Word[] = [];
  wOut!: Word;
  rows: Row[] = [];
  fWord = F.archivo(100, 900);
  size = 120;
  fMono = F.mono(400);
  fMonoM = F.mono(500);

  beats: number[] = [];
  kicks: number[] = [];
  est: { t: number; s: string }[] = [];
  steps: number[] = []; // n = 1: the creep 99.0 → 99.9
  tFill1 = 0; // fill reaches 99 %
  tC0 = 0; tC1 = 0; // the collapse
  tR0 = 0; tR1 = 0; // n = 0: the rewind to the hairline's start
  tDrums = 0; tRoll = 0;
  downs: number[] = [];

  override init() {
    const { lyrics, audio: au, start, end, params } = this.ctx;
    this.n = (params.n as number) ?? 0;
    const line = lyrics.get("I'm one upload", this.n);
    this.words = line.words;
    this.wOut = this.words[this.words.length - 1]!;

    const b0 = Math.ceil(au.beatAt(start) - 1e-3);
    for (let k = b0; ; k++) { const tb = au.timeOfBeat(k); if (tb > end + 1e-3) break; this.beats.push(tb); }
    this.kicks = au.events('kick', start - 0.05, end).map((e) => e[0]);
    this.tFill1 = start + 0.6;
    const beatAfter = (t: number) => au.timeOfBeat(Math.ceil(au.beatAt(t) - 1e-3));
    if (this.n === 0) {
      this.tC0 = this.wOut.end;
      this.tC1 = Math.min(beatAfter(this.tC0 + 0.25), end - 0.3);
      this.tR0 = this.tC0 + 0.3; this.tR1 = Math.min(this.tR0 + 0.36, end - 0.25);
    } else {
      this.tDrums = au.downbeats.find((d) => d > start + 0.2 && d < end) ?? start + 1;
      this.downs = au.downbeats.filter((d) => d >= this.tDrums - 0.01 && d < end - 0.5);
      this.tRoll = au.downbeats.find((d) => d > this.wOut.start + 0.05 && d < end - 0.5) ?? this.wOut.start + 0.3;
      this.tC0 = end - 0.28; this.tC1 = end - 0.05;
      for (let k = 1; k <= 9; k++) this.steps.push(this.tRoll + (this.tC0 - 0.02 - this.tRoll) * Math.pow(k / 9, 0.7));
    }
    // the estimate: a new guess on every beat (n = 1: every kick, and twice as often in the roll)
    const list = this.n === 1 ? EST1 : EST0;
    const times = this.beats.filter((b) => b > start + 0.3 && b < this.tC0 - 0.05);
    if (this.n === 1) for (const b of [...times]) if (b >= this.tRoll) { const h = b + (au.timeOfBeat(au.beatAt(b) + 1) - b) / 2; if (h < this.tC0 - 0.05) times.push(h); }
    times.sort((a, b) => a - b);
    times.forEach((t, i) => this.est.push({ t, s: list[i % list.length]! }));

    // ---- the lyric in two lines: "I’m one upload" / "from figuring it out" (split before "from")
    let split = this.words.findIndex((w) => norm(w.w) === 'from');
    if (split <= 0) split = Math.ceil(this.words.length / 2);
    const parts = [this.words.slice(0, split), this.words.slice(split)];
    const texts = parts.map((p) => p.map((w) => w.w).join(' '));
    const inner = BX1 - BX0 - 2 * IN - 40;
    const wmax = Math.max(...texts.map((s) => measure(s, this.fWord, 100) / 100));
    this.size = Math.min(128, Math.floor(inner / wmax));
    const mc = document.createElement('canvas').getContext('2d')!;
    mc.font = font(this.fWord, this.size);
    const cap = mc.measureText('H').actualBoundingBoxAscent;
    const lead = this.size * 1.02;
    const top = CY - (cap + lead) / 2;
    const fillX = BX0 + 0.99 * (BX1 - BX0);
    this.rows = parts.map((ws, r) => {
      const lay = layout(texts[r]!, this.fWord, this.size);
      const ci: number[] = []; let k = 0;
      for (const w of ws) { ci.push(k); k += Array.from(w.w).length + 1; }
      // line 1 from the bar's start, line 2 ending against the last percent
      const x = r === 0 ? BX0 + IN : fillX - IN - lay.width;
      return { words: ws, text: texts[r]!, lay, x, base: top + cap + r * lead, ci };
    });

    this.comp = new FSPass(COMP, { tex: { value: this.L.texture }, hot: { value: 0.45 } });
  }

  // ------------------------------------------------------------------ state over time
  /** Fill fraction and the percentage shown. */
  fill(t: number): { f: number; label: string } {
    const { start } = this.ctx;
    const open = ease.outExpo(prog(t, start, this.tFill1));
    let f = 0.99 * open;
    let label = this.n === 1 ? `${(99 * open).toFixed(1)} %` : `${Math.floor(99 * open)} %`;
    if (open < 1) return { f, label: open > 0.9995 ? (this.n === 1 ? '99.0 %' : '99 %') : label };
    const lb = this.lastBeat(t);
    f += 0.0012 * pulse(t, lb, 0.08); // it tries, on every beat
    if (this.n === 0) {
      label = '99 %';
      const o = this.wOut;
      if (t >= o.start && t < this.tC0 + 0.1) {
        const k = prog(t, o.start, o.end);
        const on = hash(frameIdx(t) >> 1, 7) < 0.2 + 0.65 * k;
        if (on) { f = 0.999; label = '99.9 %'; }
      }
    } else {
      let s = 0;
      for (const ts of this.steps) if (t >= ts) s++;
      f = 0.99 + 0.001 * s + (s < 9 ? 0.0012 * pulse(t, lb, 0.08) : 0);
      label = `99.${s} %`;
    }
    return { f, label };
  }

  private lastBeat(t: number) {
    let b = -1e9;
    for (const x of this.beats) if (x <= t + 1e-4) b = x;
    return b;
  }
  private lastKick(t: number) {
    let b = -1e9;
    for (const x of this.kicks) if (x <= t + 1e-4) b = x;
    return b;
  }

  /** 0 → 1: the bar crushed into the hairline. */
  crush(t: number) { return this.n === 0 ? prog(t, this.tC0, this.tC0 + 0.32, ease.inOutCubic) : prog(t, this.tC0, this.tC0 + 0.16, ease.outCubic); }

  cam(t: number): Cam {
    const { start, end } = this.ctx;
    const o = this.wOut;
    const zPush = this.n === 1 ? 1.0 : 1.06, xPush = 960;
    const zK: Key[] = [[start, 1.07], [start + 0.6, 1.0, ease.outExpo], [o.start, 1.035, ease.linear], [o.start + 0.8, zPush, ease.outCubic], [this.tC0, zPush + 0.05, ease.linear]];
    const xK: Key[] = [[start, 960], [o.start, 960], [o.start + 0.8, xPush, ease.outCubic], [this.tC0, xPush + 10, ease.linear]];
    const yK: Key[] = [[start, CY], [o.start, CY], [o.start + 0.8, CY + 40, ease.outCubic], [this.tC0, CY + 42]];
    if (this.n === 0) {
      zK.push([this.tC1, Z_END, ease.inOutCubic]);
      xK.push([this.tC1, 960, ease.inOutCubic]);
      yK.push([this.tC1, FY_END, ease.inOutCubic]);
    } else {
      zK.push([this.tC1, Z_END, ease.outExpo]);
      xK.push([this.tC1, 960, ease.outExpo]);
      yK.push([this.tC1, FY_END, ease.outExpo]);
    }
    let z = keys(t, zK);
    if (this.n === 1 && t < this.tC0) {
      // the drums: a jolt on every kick, a punch on the entry
      const lk = this.lastKick(t);
      if (lk >= this.tDrums - 0.02) z *= 1 + 0.01 * pulse(t, lk, 0.07);
      z *= 1 + 0.035 * pulse(t, this.tDrums, 0.1);
      // a staircase push, a step per downbeat once the drums are in
      for (const d of this.downs) z += 0.016 * ease.outExpo(clamp((t - d) / 0.35));
      if (t >= this.tRoll) z *= 1 + 0.02 * prog(t, this.tRoll, this.tC0, ease.inQuad);
    }
    void end;
    return { z, x: keys(t, xK), y: keys(t, yK) };
  }

  /** The spark (world): the fill edge; n = 0 runs it back to the hairline's start at the end. */
  sparkAt(t: number): P2 | null {
    const { start } = this.ctx;
    if (t < start + 0.02) return null;
    const x = BX0 + this.fill(t).f * (BX1 - BX0);
    if (this.n === 0 && t >= this.tR0) return { x: lerp(x, BX0, prog(t, this.tR0, this.tR1, ease.inOutCubic)), y: CY };
    return { x, y: CY };
  }

  /** Bar shake (world px): the strain on the held note, the roll's rattle. */
  shake(t: number): P2 {
    if (t >= this.tC0) return { x: 0, y: 0 };
    let a = 0;
    const o = this.wOut;
    if (this.n === 0) a = 1.4 * prog(t, o.start, o.end);
    else {
      a = 3 * pulse(t, this.tDrums, 0.08) + (t >= this.tRoll ? 1 + 5 * prog(t, this.tRoll, this.tC0, ease.inQuad) : 0);
      const lk = this.lastKick(t);
      if (lk >= this.tDrums - 0.02) a += 1.5 * pulse(t, lk, 0.05);
    }
    const fi = frameIdx(t);
    return { x: (hash(fi, 31) * 2 - 1) * a, y: (hash(fi, 32) * 2 - 1) * a * 0.6 };
  }

  // ------------------------------------------------------------------ render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const t = f.t;
    const { renderer, start } = this.ctx;
    const cam = this.cam(t);
    const z = cam.z;
    const toS = (p: P2, c: Cam = cam) => ({ x: W / 2 + (p.x - c.x) * c.z, y: H / 2 + (p.y - c.y) * c.z });

    const L = this.L; L.clear();
    const c = L.ctx;
    c.setTransform(z, 0, 0, z, W / 2 - z * cam.x, H / 2 - z * cam.y);
    c.textBaseline = 'alphabetic';
    const sh = this.shake(t);
    const ck = this.crush(t);
    const chromeK = 1 - prog(t, this.tC0 - 0.02, this.tC0 + 0.14, ease.inCubic);

    if (chromeK > 0) this.drawChrome(c, t, z, chromeK);
    c.save(); c.translate(sh.x, sh.y);
    this.drawBar(c, t, z, ck);
    c.restore();
    L.upload();
    this.comp.render(renderer, out);

    // ---- the spark
    const g = this.glow; g.clear();
    const sp = this.sparkAt(t);
    if (sp) {
      const p = toS({ x: sp.x + sh.x, y: sp.y + sh.y });
      const hold = t >= this.wOut.start && t < this.tC0 ? 1 : 0;
      sparkParticles(g, t, (tb) => { const q = this.sparkAt(tb); if (!q) return null; const s2 = this.shake(tb); return toS({ x: q.x + s2.x, y: q.y + s2.y }, this.cam(tb)); }, {
        rate: (tb) => this.rateAt(tb), rateMax: 160, life: 0.5, speed: 240, gravity: 900, intensity: 0.85, seed: 11,
      });
      // n = 0: the rewind sheds short-lived sparks along the hairline (gone before the cut)
      if (this.n === 0 && t >= this.tR0 && t < this.tR1 + 0.3) {
        sparkParticles(g, t, (tb) => { if (tb < this.tR0 || tb > this.tR1) return null; const q = this.sparkAt(tb)!; return toS(q, this.cam(tb)); }, {
          rate: 140, life: 0.26, speed: 170, gravity: 700, intensity: 0.8, seed: 12,
        });
      }
      // size and intensity settle to clock's lead-in values (0.62·√z, ~0.7) by the end
      const endK = this.n === 0 ? prog(t, this.tR0, this.tR1) : ck;
      const breathe = 0.5 + 0.5 * Math.sin((f.beat - 0.25) * Math.PI);
      const Iend = 0.55 + 0.25 * breathe + 0.12 * clamp(f.a.other);
      let I = 1.05 + 0.25 * breathe + 0.5 * hold * prog(t, this.wOut.start, this.wOut.end) + 0.6 * pulse(t, this.tFill1 - 0.3, 0.2);
      if (this.n === 1 && t >= this.tDrums) I += 0.4 * pulse(t, this.lastKick(t), 0.08) + (t >= this.tRoll ? 0.5 * prog(t, this.tRoll, this.tC0) : 0);
      if (this.n === 0 && t >= this.tR0 && t < this.tR1) I += 0.6 * Math.sin(Math.PI * prog(t, this.tR0, this.tR1));
      I = lerp(I, Iend, endK) * clamp((t - start) / 0.06);
      sparkHead(g, p.x, p.y, t, 0.62 * Math.sqrt(z) * lerp(1.3, 1, endK), I);
      const ds = this.detailSpark(t);
      if (ds) {
        const q = toS(ds);
        sparkHead(g, q.x, q.y, t + 0.37, 1.25 * z, I * 0.9);
      }
    }
    if (g.count) g.render(renderer, out);

    const o: PostOverrides = { bloomThreshold: 1.0, bloomKnee: 0.05, halation: 0.12, bloom: 0.75, bloomRadius: 0.6, ca: 1.0, vignette: 0.42, grain: 0.055, hud: 0 };
    let s = 3 * pulse(t, start, 0.05);
    if (this.n === 1 && t < this.tC0 + 0.05) s += 10 * pulse(t, this.tDrums, 0.06) + (t >= this.tRoll ? 2.5 * prog(t, this.tRoll, this.tC0, ease.inQuad) : 0);
    if (s > 0.05) o.shake = [noise1(t * 55, 1) * s, noise1(t * 55, 2) * s];
    if (this.n === 1) o.ca = 1.0 + 1.5 * pulse(t, this.tDrums, 0.1);
    return o;
  }

  private rateAt(tb: number) {
    const o = this.wOut;
    if (this.n === 0 && tb >= this.tR0) return 22; // clock's idle rate (the rewind's burst is drawn apart)
    if (tb >= this.tC1) return 22;
    if (tb >= this.tC0) return 60;
    if (tb < this.tFill1) return 150;
    if (tb >= o.start) return 110;
    if (this.n === 1 && tb >= this.tRoll) return 140;
    return 45;
  }

  // ------------------------------------------------------------------ drawing
  private drawBar(c: CanvasRenderingContext2D, t: number, z: number, ck: number) {
    const fl = this.fill(t);
    const hair = 1.2 / z;
    const h = lerp(BH, hair, ck);
    const y0 = CY - h / 2;
    const hw = 1.2 / z;
    // the track: a hairline housing that closes onto the line and fades
    const hk = 1 - ck;
    if (hk > 0.01) {
      const pad = 10 * hk;
      c.strokeStyle = rgba('bone', 0.4 * hk);
      c.lineWidth = hw;
      c.strokeRect(BX0 - pad, y0 - pad, BX1 - BX0 + 2 * pad, h + 2 * pad);
    }
    let x1 = BX0 + fl.f * (BX1 - BX0);
    if (this.n === 0 && t >= this.tR0) x1 = this.sparkAt(t)!.x;
    if (x1 <= BX0 + 0.01) return;
    c.fillStyle = rgba('bone', lerp(1, 0.7, ck));
    c.fillRect(BX0, y0, x1 - BX0, h);
    if (ck >= 0.999) return;
    // the fill is engraved with a fine diagonal hatch that crawls forward: still uploading
    if (ck < 0.5) {
      const sp = 26, off = ((t - this.ctx.start) * 34) % sp;
      c.save();
      c.beginPath(); c.rect(BX0, y0, x1 - BX0, h); c.clip();
      c.strokeStyle = rgba('ink', 0.07 * (1 - 2 * ck));
      c.lineWidth = 1.4 / z;
      c.beginPath();
      for (let x = BX0 - h + off; x < x1; x += sp) { c.moveTo(x, y0 + h); c.lineTo(x + h, y0); }
      c.stroke();
      c.restore();
    }
    // the words, set inside the fill and crushed with it
    c.save();
    c.beginPath(); c.rect(BX0, y0, x1 - BX0, h); c.clip();
    c.translate(0, CY); c.scale(1, Math.max(0.002, h / BH)); c.translate(0, -CY);
    c.globalAlpha = 1 - ck * ck;
    c.font = font(this.fWord, this.size);
    const all = this.words;
    for (const r of this.rows) {
      r.words.forEach((w, i) => {
        const gi = all.indexOf(w);
        const next = all[gi + 1];
        const sung = t >= w.start;
        const cur = sung && (next ? t < next.start : t < this.tC0 + 0.3);
        const lift = sung ? 12 * (1 - ease.outExpo(clamp((t - w.start) / 0.18))) : 0;
        let dx = 0;
        if (cur && w === this.wOut) dx = noise1(t * 30, 5) * 2.2 * prog(t, w.start, w.end); // straining
        c.fillStyle = cur ? rgba('signal', 1) : sung ? rgba('ink', 1) : rgba('ink', 0.2);
        const g0 = r.lay.glyphs[r.ci[i]!]!;
        c.fillText(w.w, r.x + g0.x + dx, r.base - lift);
      });
    }
    c.restore();
  }

  private drawChrome(c: CanvasRenderingContext2D, t: number, z: number, k: number) {
    const { start } = this.ctx;
    const a = ease.outExpo(prog(t, start, start + 0.3)) * k;
    if (a <= 0) return;
    const hw = 1.1 / z;
    // header
    c.font = font(this.fMonoM, 15);
    const hy = 214;
    c.fillStyle = rgba('ash', a);
    c.fillText(this.n === 1 ? 'ASSIGNMENT 4  ·  UPLOAD' : 'ASSIGNMENT 3  ·  UPLOAD', BX0, hy);
    const tl = '23:58', lt = 'LOCAL TIME   ';
    const tw = measure(tl, this.fMonoM, 15);
    c.fillStyle = rgba('bone', a);
    c.fillText(tl, BX1 - tw, hy);
    c.fillStyle = rgba('graphite', a);
    c.fillText(lt, BX1 - tw - measure(lt, this.fMonoM, 15), hy);
    c.fillRect(BX0, hy + 18, (BX1 - BX0) * ease.outExpo(prog(t, start, start + 0.5)), hw);
    // above the bar: the file and its bytes, the percentage
    const fl = this.fill(t);
    const ay = BY0 - 34;
    c.font = font(this.fMono, 22);
    c.fillStyle = rgba('bone', a);
    const file = 'essay_v7_final_FINAL.pdf';
    c.fillText(file, BX0, ay);
    c.fillStyle = rgba('ash', a);
    c.fillText(`${(38.0 * fl.f).toFixed(2)} / 38.00 MB`, BX0 + measure(file + '    ', this.fMono, 22), ay);
    c.font = font(this.fMonoM, 46);
    const flick = fl.label.includes('.') && this.n === 0;
    c.fillStyle = rgba(flick ? 'signal' : 'bone', a);
    c.fillText(fl.label, BX1 - measure(fl.label, this.fMonoM, 46), ay + 6);
    // under the bar: a percent ruler
    const ry = BY1 + 18;
    const rk = ease.outExpo(prog(t, start + 0.05, start + 0.7));
    for (let i = 0; i <= 100; i++) {
      const x = BX0 + (i / 100) * (BX1 - BX0);
      if (i / 100 > rk) break;
      const major = i % 10 === 0;
      c.fillStyle = rgba(major ? 'ash' : 'graphite', a * (major ? 0.9 : 0.7));
      c.fillRect(x - 0.5 * hw, ry, hw, major ? 12 : 6);
    }
    c.font = font(this.fMono, 13);
    c.fillStyle = rgba('graphite', a);
    c.fillText('0', BX0, ry + 32);
    c.fillText('100 %', BX1 - measure('100 %', this.fMono, 13), ry + 32);
    c.fillText('50', BX0 + 0.5 * (BX1 - BX0) - measure('50', this.fMono, 13) / 2, ry + 32);
    // the estimate
    const by = BY1 + 104;
    c.font = font(this.fMono, 20);
    c.fillStyle = rgba('ash', a);
    const lab = 'time remaining¹';
    c.fillText(lab, BX0, by);
    let e = this.est.length ? 'calculating…' : '';
    let et = -1e9;
    for (const x of this.est) if (x.t <= t) { e = x.s; et = x.t; }
    const drop = 1 - ease.outExpo(clamp((t - et) / 0.14));
    c.font = font(this.fMonoM, 30);
    c.fillStyle = rgba(frameIdx(t) - frameIdx(et) < 2 ? 'signal' : 'bone', a);
    c.fillText(e, BX0 + measure(lab + '  ', this.fMono, 20), by + 1 - drop * 10);
    // footnotes
    const fy = 962;
    c.font = font(this.fMono, 16);
    c.fillStyle = rgba('graphite', a);
    c.fillText('¹ estimates are not binding', BX0, fy);
    const dn = this.n === 1 ? 'do not close this window (again)' : 'do not close this window';
    c.fillText(dn, BX1 - measure(dn, this.fMono, 16), fy);
    this.drawDetail(c, t, z, k, fl.f);
  }

  /** 0 → 1: DETAIL A on screen (from the held note until the collapse). */
  detailK(t: number) {
    const o = this.wOut;
    return ease.outExpo(prog(t, o.start - 0.08, o.start + 0.3));
  }

  /** DETAIL A (10:1): the last percent, the fill edge straining at it. */
  private drawDetail(c: CanvasRenderingContext2D, t: number, z: number, a: number, f: number) {
    const k = this.detailK(t) * a;
    if (k <= 0.001) return;
    const hw = 1.2 / z;
    const ex = BX0 + f * (BX1 - BX0); // fill edge (world)
    const sh = this.shake(t);
    // the marker on the bar and its leader
    c.strokeStyle = rgba('signal', k);
    c.lineWidth = hw;
    c.strokeRect(DWX0 + sh.x, DWY0 + sh.y, DW, DH);
    const lx = DWX0 + DW / 2;
    const ly1 = lerp(DWY0 + DH, INS.y0, k);
    c.beginPath(); c.moveTo(lx + sh.x, DWY0 + DH + sh.y); c.lineTo(lx, ly1); c.stroke();
    // the inset opens from the leader's foot
    const w = INS.w * k, x0 = lx - (lx - INS.x0) * k;
    c.save();
    c.beginPath(); c.rect(x0, INS.y0, w, INS.h); c.clip();
    c.fillStyle = rgba('ink2', 1);
    c.fillRect(x0, INS.y0, w, INS.h);
    const mx = (wx: number) => INS.x0 + (wx - DWX0) * MAG;
    c.fillStyle = rgba('bone', 1);
    c.fillRect(INS.x0, INS.y0, mx(ex) - INS.x0, INS.h);
    // the bar's end (100 %), dashed, and the housing beyond it
    const xe = mx(BX1);
    c.strokeStyle = rgba('bone', 0.55);
    c.lineWidth = hw;
    c.setLineDash([6 / z, 6 / z]);
    c.beginPath(); c.moveTo(xe, INS.y0); c.lineTo(xe, INS.y0 + INS.h); c.stroke();
    c.setLineDash([]);
    c.strokeStyle = rgba('bone', 0.35);
    c.beginPath(); c.moveTo(mx(BX1 + 10), INS.y0); c.lineTo(mx(BX1 + 10), INS.y0 + INS.h); c.stroke();
    // dimension: what is left
    const dy = INS.y0 + INS.h - 34;
    const ax = mx(ex) + 2;
    if (xe - ax > 8) {
      c.strokeStyle = rgba('signal', 1);
      c.beginPath();
      c.moveTo(ax, dy); c.lineTo(xe, dy);
      c.moveTo(ax, dy - 6); c.lineTo(ax, dy + 6);
      c.moveTo(xe, dy - 6); c.lineTo(xe, dy + 6);
      c.stroke();
      const rem = (1 - f) * 100;
      const s = rem >= 0.95 ? '1 %' : `${rem.toFixed(1)} %`;
      c.font = font(this.fMonoM, 17);
      c.fillStyle = rgba('signal', 1);
      const sw = measure(s, this.fMonoM, 17);
      void sw;
      c.fillText(s, xe + 12, dy + 6);
    }
    c.restore();
    c.strokeStyle = rgba('bone', 0.6 * k);
    c.lineWidth = hw;
    c.strokeRect(x0, INS.y0, w, INS.h);
    c.font = font(this.fMonoM, 13);
    c.fillStyle = rgba('ash', k);
    c.fillText('DETAIL A   10 : 1', INS.x0, INS.y0 + INS.h + 24);
  }

  /** Where the spark sits inside DETAIL A (world), or null. */
  detailSpark(t: number): P2 | null {
    if (this.detailK(t) < 0.9 || t >= this.tC0) return null;
    const ex = BX0 + this.fill(t).f * (BX1 - BX0);
    return { x: INS.x0 + (ex - DWX0) * MAG, y: INS.y0 + INS.h / 2 };
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
