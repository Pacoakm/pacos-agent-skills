// `night` — 00:00 → 02:00 (instrumental, drums on, 12 beats, +10 min per beat).
//
// A time-lapse of the night, kept as a log. The ruler is a tunnel of dial rings (one ring per
// 10 min, 00:00 … 02:00) standing on a steel rule; seen side-on on the first downbeat it is just a
// horizontal ruler whose major ticks are the rings edge-on. The spark (the cursor) dashes one ring
// per beat along the rule's top edge and hits each ring on the kick; the camera orbits round
// behind it a step per beat and, on the next downbeat, pushes into the tunnel and flies through.
// Each ring is a clock dial whose minute hand points at its own time, so flying through them
// animates the hand. As the spark hits a ring, a mono log line stamps in beside the path on a flat
// card: `00:00 submitted ✓`, `00:10 refreshed the portal` … `01:40 hungry`, `02:00 …`. A small
// split-flap readout (the `clock` idiom) rolls over from 23:59 to 00:00 on the first frame and
// flips with every step. The last step lands on 02:00 an eighth early; the tunnel ends in the void
// there and the lights go down into `canteen`'s drum break.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, W, H, clearRT } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { LIN, rgba, type PaletteKey } from '../../engine/palette';
import { F, font, measure } from '../../engine/type';
import { clamp, ease, lerp, prog, pulse, noise1, smoothstep, TAU, frameIdx } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { FlapSet, land, type FlapModule, type Flip } from './night-flap';

type RGB = [number, number, number];
type P3 = { x: number; y: number; z: number };
type Proj = { x: number; y: number; s: number; w: number };

// ------------------------------------------------------------------ world (units)
const N = 12; // steps (beats) in the plate
const D = 4; // ring spacing: 10 min
const R = 2.4; // ring radius
const RUL_Y = -1.5; // top edge of the rule (the spark rides it)
const RUL_H = 0.32; // rule height
const XMID = (N * D) / 2;
const xOfMin = (m: number) => (m * D) / 10;
// the log panel under the readout (screen px): first baseline y0, n lines of lh, right edge x1
const PANEL = { x: 120, y0: 268, lh: 38, n: 4, fs: 24, x1: 610, y1: 268 + 3 * 38 };

interface Part { s: string; c: PaletteKey }
interface LogEntry { k: number; time: string; parts: Part[] }
interface CamKey { yaw: number; pitch: number; dist: number; fov: number; roll: number; focus: number; ty: number; tz: number; ahead: number }
interface Cam { pos: P3; tgt: P3; roll: number; fov: number; ref: number }

const deg = Math.PI / 180;
const K = (yaw: number, pitch: number, dist: number, fov: number, roll: number, focus: number, ty: number, tz: number, ahead: number): CamKey =>
  ({ yaw: yaw * deg, pitch: pitch * deg, dist, fov, roll: roll * deg, focus, ty, tz, ahead });

// one key per step: side view of the whole ruler → orbit round behind the spark → push in (downbeat) → fly
const KEYS: CamKey[] = [
  K(3, 5, 150, 12, 0, 0, 1.4, 0, 0),
  K(20, 9, 74, 17, 0, 0.35, 1.2, 0, 0.5),
  K(38, 11, 38, 25, -1, 0.72, 0.7, -0.8, 1.5),
  K(48, 11, 22, 30, -1.5, 1, 0.0, -1.5, 3.5),
  K(52, 12, 15, 33, 0, 1, -0.9, -2.0, 4.6), // downbeat: push in alongside the rings
  K(56, 10, 14.6, 33, 2.0, 1, -0.9, -2.0, 4.6),
  K(50, 13, 14.3, 34, -1.5, 1, -0.9, -2.1, 4.6),
  K(55, 11, 14.0, 34, 1.5, 1, -0.9, -2.0, 4.6),
  K(77, 7, 9.5, 50, -5, 1, -0.8, -0.6, 3.3), // downbeat: through the ring wall; the dutch flips on each beat
  K(80, 6, 9.3, 50, 3.5, 1, -0.8, -0.3, 3.3),
  K(76, 8, 9.2, 51, -4.5, 1, -0.8, -0.6, 3.3),
  K(79, 7, 9.1, 51, 3, 1, -0.8, -0.4, 3.3),
  K(80, 7, 9.5, 44, 0, 1, -0.3, -0.9, 0.2), // 02:00: brake, swing to face the last dial
];
export default class Night extends Scene {
  cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 600);
  vp = new THREE.Matrix4();
  v4 = new THREE.Vector4();
  scratch = new THREE.PerspectiveCamera(50, W / H, 0.05, 600);
  svp = new THREE.Matrix4();
  lines = new LineBatch(30000, { screen2D: false, blend: 'max' }); // max: edge-on rings don't pile up into glare
  fx = new LineBatch(4000);
  L = new Layer2D();

  T0 = 0; T1 = 0;
  beats: number[] = []; // b0 … b12 (b12 = the cut)
  stepT: number[] = []; // landing time of step k (00:00 + 10k min)
  downs: number[] = [];
  lapse = 1300;

  log: LogEntry[] = [];
  flaps!: FlapSet;
  mods: FlapModule[] = [];
  fMono = F.mono(400);
  fMonoM = F.mono(500);

  override init() {
    const { audio: au, start, end } = this.ctx;
    this.T0 = start; this.T1 = end;
    const b0 = Math.round(au.beatAt(start));
    for (let k = 0; k <= N; k++) this.beats.push(au.timeOfBeat(b0 + k));
    this.beats[N] = end;
    for (let k = 0; k < N; k++) this.stepT.push(this.beats[k]!);
    // the last step lands an eighth early, so 02:00 is standing when the cut comes
    this.stepT.push(lerp(this.beats[N - 1]!, end, 0.5));
    this.stepT[0] = start;
    this.downs = au.downbeats.filter((d) => d > start + 0.05 && d < end - 0.05);
    this.lapse = Math.round(600 / (this.beats[1]! - this.beats[0]!));

    const e = (k: number, parts: Part[]): LogEntry => ({ k, time: hhmm(10 * k), parts });
    const B = (s: string): Part => ({ s, c: 'bone' });
    const A = (s: string): Part => ({ s, c: 'ash' });
    this.log = [
      e(0, [B('submitted '), { s: '✓', c: 'signal' }]),
      e(1, [B('refreshed the portal')]),
      e(2, [B('refreshed the portal')]),
      e(3, [B('refreshed the portal ×9')]),
      e(7, [B('opened the fridge '), A('(empty)')]),
      e(10, [B('hungry')]),
      e(12, [B('...')]),
    ];

    // ---- the readout: rolls over 23:59 → 00:00 on the first frame, then one flip per changed figure per step
    const FW = 46, FH = 64, FG = 5, CC = 20, X0 = 120, Y0 = 104;
    this.flaps = new FlapSet(F.archivo(125, 900), FW, FH);
    const xs = [X0, X0 + FW + FG, X0 + 2 * FW + FG + CC, X0 + 3 * FW + 2 * FG + CC];
    const ev: Flip[][] = [[], [], [], []];
    const roll = '2359';
    for (let i = 0; i < 4; i++) {
      ev[i]!.push({ t: start - 1, ch: roll[i]!, dur: 0.01 });
      ev[i]!.push(land(start + 0.05 + i * 0.025, '0', 0.09));
    }
    for (let k = 1; k <= N; k++) {
      const a = hhmm(10 * (k - 1)).replace(':', ''), b = hhmm(10 * k).replace(':', '');
      for (let i = 0; i < 4; i++) if (a[i] !== b[i]) ev[i]!.push(land(this.stepT[k]!, b[i]!, 0.085));
    }
    this.mods = xs.map((x, i) => ({ x, y: Y0, w: FW, h: FH, r: 4, ev: ev[i]! }));
  }

  // ------------------------------------------------------------------ time → space
  /** The spark's minute: a dash into each ring, arriving on the step. */
  sparkMin(t: number) {
    let m = 0;
    for (let k = 1; k <= N; k++) {
      const run = k === N ? 0.16 : 0.24;
      m += 10 * ease.inQuad(prog(t, this.stepT[k]! - run, this.stepT[k]!));
    }
    return m;
  }
  /** The camera's minute: catches up after each hit. */
  camMin(t: number) {
    let m = 0;
    for (let k = 1; k <= N; k++) m += 10 * ease.outCubic(prog(t, this.stepT[k]! - 0.1, this.stepT[k]! + 0.34));
    return m;
  }
  sparkPos(t: number): P3 { return { x: xOfMin(this.sparkMin(t)), y: RUL_Y, z: 0 }; }

  camAt(t: number): Cam {
    let c = { ...KEYS[0]! };
    let ld = Math.log(c.dist);
    for (let k = 1; k <= N; k++) {
      const s = this.stepT[k]!;
      const e = ease.outExpo(prog(t, s - 0.03, s + (k === 4 || k === 8 ? 0.5 : 0.38)));
      if (e <= 0) break;
      const b = KEYS[k]!;
      c = {
        yaw: lerp(c.yaw, b.yaw, e), pitch: lerp(c.pitch, b.pitch, e), dist: 0, fov: lerp(c.fov, b.fov, e), roll: lerp(c.roll, b.roll, e),
        focus: lerp(c.focus, b.focus, e), ty: lerp(c.ty, b.ty, e), tz: lerp(c.tz, b.tz, e), ahead: lerp(c.ahead, b.ahead, e),
      };
      ld = lerp(ld, Math.log(b.dist), e);
    }
    // something always moves: a slow drift between the snaps
    const lt = t - this.T0;
    const yaw = c.yaw + 1.0 * deg * Math.sin(lt * 0.9);
    const pitch = c.pitch + 0.6 * deg * Math.sin(lt * 1.3 + 1);
    const dist = Math.exp(ld) * (1 - 0.012 * lt);
    const tx = lerp(XMID, xOfMin(this.camMin(t)) + c.ahead, c.focus);
    const tgt = { x: tx, y: c.ty, z: c.tz };
    const pos = {
      x: tgt.x - dist * Math.sin(yaw) * Math.cos(pitch),
      y: tgt.y + dist * Math.sin(pitch),
      z: tgt.z + dist * Math.cos(yaw) * Math.cos(pitch),
    };
    return { pos, tgt, roll: c.roll, fov: c.fov, ref: dist };
  }

  setCam(cam: THREE.PerspectiveCamera, vp: THREE.Matrix4, c: Cam) {
    cam.fov = c.fov; cam.updateProjectionMatrix();
    cam.position.set(c.pos.x, c.pos.y, c.pos.z);
    cam.up.set(0, 1, 0);
    cam.lookAt(c.tgt.x, c.tgt.y, c.tgt.z);
    cam.rotateZ(c.roll);
    cam.updateMatrixWorld(true);
    vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  }
  projWith(cam: THREE.PerspectiveCamera, vp: THREE.Matrix4, x: number, y: number, z: number): Proj | null {
    const v = this.v4.set(x, y, z, 1).applyMatrix4(vp);
    if (v.w <= 0.05) return null;
    const P11 = cam.projectionMatrix.elements[5]!;
    return { x: (v.x / v.w * 0.5 + 0.5) * W, y: (0.5 - v.y / v.w * 0.5) * H, s: (0.5 * H * P11) / v.w, w: v.w };
  }
  proj(x: number, y: number, z: number) { return this.projWith(this.cam, this.vp, x, y, z); }

  // ------------------------------------------------------------------ render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const cm = this.camAt(t);
    this.setCam(this.cam, this.vp, cm);
    const dim = 1 - 0.55 * prog(t, this.stepT[N]! + 0.04, this.T1 - 0.01, ease.inOutQuad); // lights going down

    clearRT(renderer, out, LIN.ink);
    const lb = this.lines; lb.clear();
    this.drawWorld(lb, t, cm, dim);
    lb.render(renderer, out, this.cam);

    const c = this.L.ctx; this.L.clear();
    this.drawRingLabels(c, t, cm, dim);
    this.drawDimension(c, t);
    this.drawReadout(c, t);
    this.drawPanel(c, t);
    comp.draw(renderer, this.L.upload(), out);

    this.drawSpark(t, f);
    this.fx.render(renderer, out);

    // ---- post
    const lb0 = this.lastStep(t);
    const kick = lb0 >= 0 ? pulse(t, this.stepT[lb0]!, 0.05) : 0;
    let sh = 3.5 * kick;
    for (const d of this.downs) sh += 7 * pulse(t, d, 0.06);
    const shake: [number, number] = [noise1(t * 53, 1) * sh, noise1(t * 53, 2) * sh];
    let zoom = 1 + 0.006 * kick;
    for (const d of this.downs) zoom += 0.018 * pulse(t, d, 0.09);
    return {
      bloomThreshold: 1.0, bloomKnee: 0.05, bloom: 0.75, bloomRadius: 0.6, halation: 0.14,
      vignette: 0.46, grain: 0.055, ca: 1.0 + 1.5 * kick, hud: 0, shake, zoom,
    };
  }

  lastStep(t: number) {
    let k = -1;
    for (let i = 0; i <= N; i++) if (t >= this.stepT[i]!) k = i;
    return k;
  }

  // ------------------------------------------------------------------ 3D hairlines
  fog(d: number, ref: number) {
    return Math.exp(-Math.max(0, d - ref - 2.0) / 7.5) * smoothstep(0.35, 1.4, d);
  }

  drawWorld(lb: LineBatch, t: number, cm: Cam, dim: number) {
    const cp = cm.pos, ref = cm.ref;
    const T0 = this.T0;
    const seg = (a: P3, b: P3, w: number, col: RGB, al: number) => {
      const mx = (a.x + b.x) / 2 - cp.x, my = (a.y + b.y) / 2 - cp.y, mz = (a.z + b.z) / 2 - cp.z;
      const d = Math.hypot(mx, my, mz);
      const fa = this.fog(d, ref) * al * dim;
      if (fa < 0.004) return;
      const wd = clamp(0.85 + 3.2 / d, 1.0, 2.8) * w;
      lb.seg(a.x, a.y, a.z, b.x, b.y, b.z, wd, col[0], col[1], col[2], fa);
    };
    const bone = LIN.bone;
    const sm = this.sparkMin(t);
    const xs = xOfMin(sm);

    // ---- the rule: a steel strip standing on edge, minute ticks hanging from its top edge
    const ruleA = prog(t, T0 - 0.01, T0 + 0.16, ease.outExpo);
    const xEnd = lerp(0, N * D + 0.6, ruleA);
    const yT = RUL_Y, yB = RUL_Y - RUL_H;
    seg({ x: -0.6, y: yT, z: 0 }, { x: xEnd, y: yT, z: 0 }, 1.2, bone, 0.7);
    seg({ x: -0.6, y: yB, z: 0 }, { x: xEnd, y: yB, z: 0 }, 1.0, bone, 0.4);
    if (ruleA > 0.99) {
      seg({ x: -0.6, y: yT, z: 0 }, { x: -0.6, y: yB, z: 0 }, 1.0, bone, 0.4);
      seg({ x: N * D + 0.6, y: yT, z: 0 }, { x: N * D + 0.6, y: yB, z: 0 }, 1.0, bone, 0.4);
    }
    for (let m = 0; m <= N * 10; m++) {
      const x = xOfMin(m);
      if (x > xEnd) break;
      const L = m % 10 === 0 ? RUL_H : m % 5 === 0 ? 0.17 : 0.09;
      seg({ x, y: yT, z: 0 }, { x, y: yT - L, z: 0 }, m % 10 === 0 ? 1.1 : 0.9, bone, m % 10 === 0 ? 0.7 : 0.45);
    }
    // elapsed time: the top edge behind the spark turns orange (paint, not light)
    if (xs > 0.01) {
      const sg = LIN.signal;
      seg({ x: 0, y: yT, z: 0 }, { x: xs, y: yT, z: 0 }, 2.0, [sg[0] * 0.7, sg[1] * 0.7, sg[2] * 0.7], 0.9);
      // hot run just behind the head (part of the spark: may glow)
      const n = 10;
      for (let i = 0; i < n; i++) {
        const x0 = xs - (i + 1) * 0.12, x1 = xs - i * 0.12;
        if (x1 <= 0) break;
        const k = Math.pow(1 - i / n, 2);
        seg({ x: Math.max(0, x0), y: yT, z: 0 }, { x: x1, y: yT, z: 0 }, 2.4, [sg[0] * 2.2 * k + 0.4 * k, sg[1] * 2.2 * k + 0.25 * k, sg[2] * 2 * k], 1);
      }
    }

    // ---- the rings: clock dials, one per 10 min, each hand pointing at its own time
    const kCur = this.lastStep(t);
    const SEG = 120;
    for (let k = 0; k <= N; k++) {
      const x = k * D;
      const grow = ease.outExpo(prog(t, T0 + k * 0.014, T0 + 0.26 + k * 0.014));
      if (grow <= 0) continue;
      const hit = pulse(t, this.stepT[k]!, 0.16);
      const passed = k < kCur, cur = k === kCur;
      const base = passed ? 0.32 : cur ? 0.8 : 0.52;
      const I = base + (1 - base) * hit; // bone stays below the bloom threshold
      const col: RGB = [bone[0] * I, bone[1] * I, bone[2] * I];
      const r = R * grow;
      // the ring grows up out of the rule's major tick
      const cy = lerp(RUL_Y, 0, grow);
      const P = (a: number, rr: number): P3 => ({ x, y: cy + rr * Math.cos(a), z: rr * Math.sin(a) });
      for (let i = 0; i < SEG; i++) {
        const a0 = (i / SEG) * TAU, a1 = ((i + 1) / SEG) * TAU;
        seg(P(a0, r), P(a1, r), 1.15 + 0.8 * hit, col, 0.95);
        if (i % 2 === 0) seg(P(a0, r * 1.035), P(a1, r * 1.035), 0.8, col, 0.4);
      }
      // minute ticks
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TAU;
        const L = i % 15 === 0 ? 0.3 : i % 5 === 0 ? 0.18 : 0.075;
        seg(P(a, r), P(a, r - L * grow), i % 5 === 0 ? 1.1 : 0.85, col, i % 5 === 0 ? 0.85 : 0.55);
      }
      // hands (clockwise as seen from behind: 12 o'clock = +y, 3 o'clock = +z)
      const am = ((10 * k) / 60) * TAU, ah = ((10 * k) / 720) * TAU;
      const hd = Math.hypot(x - cp.x, cy - cp.y, cp.z);
      const hf = smoothstep(4.5, 8.5, hd); // hands near the lens would slice the frame
      const hc: RGB = cur ? [bone[0] * (0.9 + 0.1 * hit), bone[1] * (0.9 + 0.1 * hit), bone[2] * (0.9 + 0.1 * hit)] : [bone[0] * 0.42, bone[1] * 0.42, bone[2] * 0.42];
      if (hf > 0.01) {
        seg(P(am + Math.PI, 0.12 * grow), P(am, 0.8 * r), 1.1, hc, 0.95 * hf);
        seg(P(ah, 0), P(ah, 0.48 * r), 1.8, hc, 0.9 * hf);
        for (let i = 0; i < 20; i++) seg(P((i / 20) * TAU, 0.06), P(((i + 1) / 20) * TAU, 0.06), 1, hc, 0.9 * hf);
      }
    }
  }

  // ------------------------------------------------------------------ text (flat to camera)
  drawRingLabels(c: CanvasRenderingContext2D, t: number, cm: Cam, dim: number) {
    const kCur = this.lastStep(t);
    c.textBaseline = 'top';
    c.textAlign = 'center';
    for (let k = 0; k <= N; k++) {
      const grow = prog(t, this.T0 + 0.1 + k * 0.014, this.T0 + 0.25 + k * 0.014);
      if (grow <= 0) continue;
      const p = this.proj(k * D, -R - 0.22, 0);
      if (!p || p.w < 0.8) continue;
      const fa = this.fog(p.w, cm.ref) * Math.exp(-Math.max(0, p.w - cm.ref) / 6) * grow * dim * this.clearOfPanel(p.x, p.y);
      if (fa < 0.02) continue;
      const fs = clamp(p.s * 0.2, 16, 40);
      c.font = font(this.fMonoM, fs);
      const cur = k === kCur;
      c.fillStyle = cur ? rgba('bone', fa) : rgba('ash', 0.85 * fa);
      c.fillText(hhmm(10 * k), p.x, p.y);
    }
  }

  /** 1 away from the log panel, 0 inside it (labels in the world keep out of the panel's way). */
  clearOfPanel(x: number, y: number) {
    return Math.max(clamp((y - (PANEL.y1 + 22)) / 40), clamp((x - PANEL.x1 - 40) / 40));
  }

  /** How far the log has scrolled at t: one line per entry past the panel's capacity, eased. */
  private scrollAt(t: number) {
    let s = 0;
    this.log.forEach((e, i) => { if (i >= PANEL.n) s += ease.outExpo(prog(t, this.stepT[e.k]!, this.stepT[e.k]! + 0.2)); });
    return s;
  }

  /**
   * `tail -f night.log`, flat under the readout: each line types in as its dial is hit and stays; the
   * newest bright, older ones dimming; once the panel is full the log scrolls up a line per entry.
   */
  drawPanel(c: CanvasRenderingContext2D, t: number) {
    const shown = this.log.filter((e) => t >= this.stepT[e.k]!);
    if (!shown.length) return;
    const fs = PANEL.fs, lh = PANEL.lh;
    const scroll = this.scrollAt(t);
    const nNew = shown.length - 1;
    const fT = this.fMonoM, fM = this.fMono;
    const wTime = measure('00:00', fT, fs), gap = measure('  ', fM, fs);
    c.save();
    c.beginPath();
    c.rect(PANEL.x - 20, PANEL.y0 - fs - 6, PANEL.x1 - PANEL.x + 60, PANEL.y1 - PANEL.y0 + fs + 20);
    c.clip();
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    shown.forEach((e, i) => {
      const st = this.stepT[e.k]!, age = t - st;
      const y = PANEL.y0 + (i - scroll) * lh;
      // rank from the newest: 0 bright, then 0.62, 0.48, 0.4 …
      const rank = nNew - i;
      const fresh = rank === 0 ? 1 : rank === 1 ? lerp(1, 0.62, ease.outCubic(prog(t, this.stepT[shown[i + 1]!.k]!, this.stepT[shown[i + 1]!.k]! + 0.25))) : Math.max(0.4, 0.62 - 0.14 * (rank - 1));
      // lines scrolling off the top fade out
      const topK = clamp((y - (PANEL.y0 - lh * 0.9)) / (lh * 0.9));
      const a = fresh * topK;
      if (a <= 0.01) return;
      let msg = e.parts;
      if (e.k === 3) msg = [{ s: `refreshed the portal ×${1 + Math.floor(8 * clamp((age - 0.05) / 0.36))}`, c: 'bone' }];
      const full = msg.map((q) => q.s).join('');
      const nCh = e.k === N ? 1 + Math.floor(age / ((this.T1 - st) / 3.2)) : Math.floor(clamp(age / 0.16) * full.length + 1e-6);
      const pop = rank === 0 ? 1 - ease.outExpo(clamp(age / 0.12)) : 0; // the line stamps in with a 6 px drop
      const yy = y - 6 * pop;
      c.font = font(fT, fs);
      c.fillStyle = rgba(rank === 0 ? 'ash' : 'graphite', rank === 0 ? 1 : Math.min(1, a * 1.6));
      c.fillText(e.time, PANEL.x, yy);
      let xx = PANEL.x + wTime + gap, left = nCh;
      c.font = font(fM, fs);
      for (const q of msg) {
        if (left <= 0) break;
        const sPart = q.s.slice(0, left);
        left -= q.s.length;
        c.fillStyle = rgba(q.c, q.c === 'signal' ? Math.max(a, 0.7) : a);
        c.fillText(sPart, xx, yy);
        xx += measure(sPart, fM, fs);
      }
      // the newest line carries the tail's block cursor
      if (rank === 0 && (nCh < full.length || (frameIdx(t) >> 4) % 2 === 0)) {
        c.fillStyle = rgba('bone', 0.85);
        c.fillRect(xx + 4, yy - fs * 0.78, fs * 0.55, fs * 0.95);
      }
    });
    c.restore();
  }

  /** First beat: the figure's overall dimension, 2 h across the ruler, fading as the camera swings round. */
  drawDimension(c: CanvasRenderingContext2D, t: number) {
    const a = prog(t, this.T0 + 0.04, this.T0 + 0.3) * (1 - prog(t, this.stepT[1]! + 0.1, this.stepT[2]!));
    if (a <= 0.01) return;
    const yW = R + 1.0;
    const pa = this.proj(0, yW, 0), pb = this.proj(N * D, yW, 0);
    const qa = this.proj(0, R + 0.35, 0), qb = this.proj(N * D, R + 0.35, 0);
    if (!pa || !pb || !qa || !qb) return;
    const k = ease.outExpo(prog(t, this.T0 + 0.04, this.T0 + 0.4));
    const mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
    const ax = lerp(mx, pa.x, k), ay = lerp(my, pa.y, k), bx = lerp(mx, pb.x, k), by = lerp(my, pb.y, k);
    c.save();
    c.strokeStyle = rgba('ash', 0.75 * a); c.fillStyle = rgba('ash', 0.75 * a);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(qa.x, qa.y); c.lineTo(pa.x, pa.y - 8); // extension lines
    c.moveTo(qb.x, qb.y); c.lineTo(pb.x, pb.y - 8);
    c.moveTo(ax, ay); c.lineTo(bx, by);
    c.stroke();
    // arrowheads (drawn: open ticks at 30°)
    const ang = Math.atan2(by - ay, bx - ax);
    for (const [x, y, s] of [[ax, ay, 1], [bx, by, -1]] as const) {
      c.beginPath();
      for (const d of [-1, 1]) {
        c.moveTo(x, y);
        c.lineTo(x + s * 11 * Math.cos(ang + d * 0.4), y + s * 11 * Math.sin(ang + d * 0.4));
      }
      c.stroke();
    }
    // the label sits in a gap in the dimension line
    const lab = `2 h  =  12 × 10 min`;
    c.font = font(this.fMonoM, 17);
    const w = measure(lab, this.fMonoM, 17);
    c.fillStyle = rgba('ink', a);
    c.fillRect(mx - w / 2 - 12, my - 12, w + 24, 24);
    c.fillStyle = rgba('bone', 0.85 * a * k);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(lab, mx, my + 1);
    // and the scale, under the figure's right end
    const pr = this.proj(N * D, -R - 0.9, 0);
    if (pr) {
      c.textAlign = 'right'; c.textBaseline = 'top';
      c.font = font(this.fMono, 15);
      c.fillStyle = rgba('graphite', a);
      c.fillText('1 tick = 1 min', pr.x, pr.y);
    }
    c.restore();
  }

  drawReadout(c: CanvasRenderingContext2D, t: number) {
    const a = prog(t, this.T0 - 0.01, this.T0 + 0.06);
    if (a <= 0) return;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    // the instrument's plate: log cards drifting out of frame pass under it
    const pm = this.mods[0]!;
    const x0p = pm.x - 16, y0p = pm.y - 46, x1p = PANEL.x1 + 30, y1p = PANEL.y1 + 18;
    c.fillStyle = rgba('ink', a);
    c.fillRect(x0p, y0p, x1p - x0p, y1p - y0p);
    // feathered edges, so the dials pass under the panel instead of being cut by a box
    const gr = c.createLinearGradient(x1p, 0, x1p + 70, 0);
    gr.addColorStop(0, rgba('ink', a)); gr.addColorStop(1, rgba('ink', 0));
    c.fillStyle = gr; c.fillRect(x1p, y0p, 70, y1p - y0p + 50);
    const gb = c.createLinearGradient(0, y1p, 0, y1p + 50);
    gb.addColorStop(0, rgba('ink', a)); gb.addColorStop(1, rgba('ink', 0));
    c.fillStyle = gb; c.fillRect(x0p, y1p, x1p - x0p, 50);
    // hairline rule between the instrument and its log
    c.fillStyle = rgba('graphite', 0.8 * a);
    c.fillRect(pm.x, PANEL.y0 - PANEL.fs - 16, PANEL.x1 - pm.x, 1);
    for (const m of this.mods) this.flaps.draw(c, m, t, a);
    // colon: bone dots, orange on each kick (paint, below the bloom threshold)
    const m1 = this.mods[1]!, m2 = this.mods[2]!;
    const cx = (m1.x + m1.w + m2.x) / 2, cy = m1.y + m1.h / 2;
    const k = this.lastStep(t);
    const kick = k >= 0 ? pulse(t, this.stepT[k]!, 0.1) : 0;
    c.fillStyle = kick > 0.25 ? rgba('signal', a) : rgba('bone', 0.55 * a);
    for (const s of [-1, 1]) { c.beginPath(); c.arc(cx, cy + s * 12, 3.6, 0, TAU); c.fill(); }
    // housing + labels
    const x0 = this.mods[0]!.x, x1 = this.mods[3]!.x + this.mods[3]!.w;
    const yb = m1.y + m1.h + 26;
    c.font = font(this.fMonoM, 13);
    c.fillStyle = rgba('ash', 0.8 * a);
    c.fillText('LOCAL TIME', x0, yb);
    const lap = `×${this.lapse}`;
    c.fillStyle = rgba('graphite', a);
    c.fillText(lap, x1 - measure(lap, this.fMonoM, 13), yb);
    c.font = font(this.fMono, 15);
    c.fillStyle = rgba('ash', 0.9 * a);
    c.fillText('tail -f night.log', x0, m1.y - 18);
  }

  // ------------------------------------------------------------------ the spark (2D, additive)
  sparkScreen(tb: number): { x: number; y: number } | null {
    const c = this.camAt(tb);
    this.setCam(this.scratch, this.svp, c);
    const p = this.sparkPos(tb);
    const q = this.projWith(this.scratch, this.svp, p.x, p.y, p.z);
    return q ? { x: q.x, y: q.y } : null;
  }

  drawSpark(t: number, f: Frame) {
    const g = this.fx; g.clear();
    const sp = this.sparkPos(t);
    const p = this.proj(sp.x, sp.y, sp.z);
    if (!p) return;
    const stepT = this.stepT;
    const rate = (tb: number) => {
      for (const s of stepT) if (tb >= s && tb < s + 0.07) return 260;
      return 40;
    };
    sparkParticles(g, t, (tb) => (tb < this.T0 ? null : this.sparkScreen(tb)), { rate, rateMax: 260, life: 0.42, speed: 230, gravity: 700, intensity: 0.95, seed: 23 });
    const k = this.lastStep(t);
    const hit = k >= 0 ? pulse(t, stepT[k]!, 0.08) : 0;
    const sc = clamp(p.s / 140, 0.55, 1.35);
    const ign = prog(t, this.T0 - 0.01, this.T0 + 0.05);
    const rest = 1 - 0.35 * prog(t, stepT[N]! + 0.05, this.T1, ease.inOutQuad);
    sparkHead(g, p.x, p.y, t, sc * (1 + 0.6 * hit + 0.9 * pulse(t, this.T0, 0.1)), ign * rest * (1 + 0.25 * f.a.kick));
  }
}

function hhmm(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
