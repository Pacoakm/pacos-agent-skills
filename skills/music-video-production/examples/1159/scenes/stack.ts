// 11:59 `stack` — "Coffee in my veins and a stack I can't unwind". The light plate.
// Bone paper, ink hairlines: a call stack drawn like a textbook figure (FIG. 2). On every kick a
// frame is pushed on top with a mechanical snap (coffee(), coffee(), proof_by_induction(n+1), …),
// each a hairline box with its mono label; the lyric words are pre-printed faint in the frame they
// belong to and stamped in (Archivo 900) as they are sung, the sung word in orange. The stack
// pointer (orange arrow + the spark) rides the top frame. "stack": the stack has outgrown the sheet
// and the camera tilts up after it. "unwind": pop() is attempted — the top frame lifts, strains,
// the tower sways, the pop is refused (slams back on the kick) and an orange rubber stamp lands:
// RecursionError: maximum caffeine depth exceeded.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { type Line, type Word, norm } from '../../engine/lyrics';
import { F, font, measure } from '../../engine/type';
import { clamp, ease, lerp, prog, hash, pulse, TAU, frameIdx } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { LIN } from '../../engine/palette';
import { PAPER_FRAG } from './stack-paper';

type Ctx2 = CanvasRenderingContext2D;

// channel-coded inks, drawn with 'lighter' onto opaque black (see stack-paper.ts)
const PRINT = (a = 1) => `rgba(255,0,0,${a})`;
const STAMP = (a = 1) => `rgba(0,255,0,${a})`;
const ORANGE = (a = 1) => `rgba(0,0,255,${a})`;

// ---- page layout (page px: x = screen x at rest, y up the stack is negative; the stack's floor is y = 0)
const X0 = 440, X1 = 1220;            // the stack's column
const BASE_H = 56, FRAME_H = 128;     // caller frames (already on the stack) / pushed frames
export const WORD_SIZE = 78, WORD_BASE = 104; // lyric stamp size and baseline (from the frame's top)
export const WORD_FAMILY = F.archivo(112.5, 900);
const FLOOR_SCREEN = 880;              // the stack's floor never rises above this screen y
const TOP_SCREEN = 290;                // the camera keeps the top frame's top edge here
const Z_MAX = 1.45;                    // closest framing (the young stack)
const Z_MIN = 1.15;                    // widest framing (once it has outgrown the sheet)
const STAMP_ROOM = 150;                // how far the top frame drops on screen when the error stamp lands
const DROP = 0.075;                    // a pushed frame falls for this long and lands on the kick

export const BASE: [string, string][] = [
  ['main()', 'argv = ["--all-nighter"]'],
  ['semester_2026()', 'weeks_left = 0'],
  ['finish_everything(deadline="23:59")', 'done = False'],
];
export const PUSHED: [string, string][] = [
  ['coffee()', 'shot = 1'],
  ['coffee()', 'shot = 2'],
  ['proof_by_induction(n+1)', 'base_case = TODO'],
  ['essay_v7_final_FINAL()', 'words = 212 / 2000'],
  ['coffee()', 'shot = 3'],
  ['linked_list_of_worries()', 'head->next->next->...'],
  ['coffee()', 'shot = 4  # max 4'],
];

interface Slot { w: Word; x: number; rot: number; jx: number; jy: number }
interface Fr {
  label: string; local: string; base: boolean; coffee: boolean;
  t: number;        // push (landing) time; -Infinity for the caller frames
  y0: number; y1: number; // page top / bottom at rest
  addr: string;
  words: Slot[];
}
interface Cam { cx: number; cy: number; z: number; k: number }

/** The cup glyph (body, handle, saucer) around its centre, in glyph px; the caller sets stroke style and width. */
export function cupBody(c: Ctx2) {
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-24, -16);
  c.lineTo(24, -16);
  c.lineTo(19, 16);
  c.quadraticCurveTo(0, 23, -19, 16);
  c.closePath();
  c.stroke();
  // handle
  c.beginPath();
  c.arc(26, -2, 9, -1.25, 1.35);
  c.stroke();
  // saucer
  c.beginPath();
  c.moveTo(-38, 25); c.quadraticCurveTo(0, 31, 38, 25);
  c.stroke();
}
/** A point on steam wisp s (0 or 1) at u (0 = the rim, 1 = the top), in glyph px. */
export function steamXY(s: number, u: number, t: number, seed: number) {
  return { x: -8 + s * 14 + Math.sin(u * 5.2 - t * 7 + s * 2.1 + seed) * 4.2 * (0.4 + u), y: -21 - u * 25 };
}

export default class Stack extends Scene {
  ink = new Layer2D();
  paper = new FSPass(PAPER_FRAG, {
    inkTex: { value: null }, camA: { value: new THREE.Vector3() }, camB: { value: new THREE.Vector3() },
    keystone: { value: 0 }, zoom: { value: 1 },
    stp: { value: new THREE.Vector4() }, stpB: { value: new THREE.Vector4() },
  });
  glow = new LineBatch(600);
  dots = new LineBatch(3000, { blend: 'normal' }); // on paper, orange sparks are ink-like: they cover, not add

  line!: Line;
  frames: Fr[] = [];
  pushes: number[] = [];
  kicks: number[] = [];
  tStack = 0; tPop = 0; tErr = 0; tFoot = 0; wUnwind!: Word;
  cam0 = { lz: 0, cy: 0, cx: 960 };
  camSteps: { t: number; lz: number; cy: number; cx: number }[] = [];
  cyTilt0 = 0;
  stampC = { x: 0, y: 0, hw: 390, hh: 98, rot: -0.045 };

  override async init() {
    const { lyrics, audio, start, end } = this.ctx;
    this.ink.texture.colorSpace = THREE.NoColorSpace;
    this.line = lyrics.get('Coffee in my veins');
    const words = this.line.words;
    const find = (q: string) => words.find((w) => norm(w.w) === norm(q)) ?? words[words.length - 1]!;
    this.wUnwind = find('unwind');
    this.tStack = find('stack').start;
    this.tPop = this.wUnwind.start;

    this.kicks = audio.events('kick', start - 0.03, end - 0.03).map((k) => k[0]);
    if (this.kicks.length < 4) {
      // no onsets: fall back to the beat grid
      this.kicks = [];
      for (let b = Math.ceil(audio.beatAt(start)); audio.timeOfBeat(b) < end - 0.03; b++) this.kicks.push(audio.timeOfBeat(b));
    }
    // a frame is pushed on every kick until the pop; the refused pop resolves on the next kick
    this.pushes = this.kicks.filter((k) => k < this.tPop - 0.05);
    this.tErr = this.kicks.find((k) => k > this.tPop + 0.12) ?? this.tPop + 0.25;
    this.tFoot = this.kicks.find((k) => k > this.tErr + 0.1) ?? this.tErr + 0.45;

    // ---- the frames
    let y = 0, addr = 0x7ffe4000;
    const mkAddr = () => `0x${addr.toString(16)}`;
    BASE.forEach(([label, local], i) => {
      this.frames.push({ label, local, base: true, coffee: false, t: -Infinity, y0: y - BASE_H, y1: y, addr: mkAddr(), words: [] });
      y -= BASE_H; addr -= 0x40 + 0x10 * Math.floor(hash(i, 3) * 4);
    });
    this.pushes.forEach((t, i) => {
      const [label, local] = PUSHED[i] ?? ['coffee()', `shot = ${i}`];
      this.frames.push({ label, local, base: false, coffee: label === 'coffee()', t, y0: y - FRAME_H, y1: y, addr: mkAddr(), words: [] });
      y -= FRAME_H; addr -= 0x30 + 0x10 * Math.floor(hash(i, 5) * 6);
    });
    // each word lives in the frame on top when it is sung
    const pushed = this.frames.filter((f) => !f.base);
    for (const w of words) {
      let fr = pushed[0]!;
      for (const f of pushed) if (f.t <= w.start + 0.03) fr = f;
      fr.words.push({ w, x: 0, rot: (hash(w.gi, 1) - 0.5) * 0.035, jx: (hash(w.gi, 2) - 0.5) * 6, jy: (hash(w.gi, 3) - 0.5) * 4 });
    }
    const space = measure(' ', WORD_FAMILY, WORD_SIZE) * 1.15;
    for (const f of pushed) {
      let x = X0 + 30;
      for (const s of f.words) { s.x = x; x += measure(s.w.w, WORD_FAMILY, WORD_SIZE) + space; }
    }

    // ---- camera: one framing per landed frame (critically damped steps between them). Close on the
    // young stack, pulling back a notch on each kick while it fits; once it has outgrown the sheet the
    // camera stops pulling back and tilts up after the top instead.
    const frameFor = (T: number) => {
      const z = clamp((FLOOR_SCREEN - TOP_SCREEN) / -T, Z_MIN, Z_MAX);
      const cy = Math.min(T + (540 - TOP_SCREEN) / z, -(FLOOR_SCREEN - 540) / z);
      const cx = lerp(880, 892, (z - Z_MIN) / (Z_MAX - Z_MIN));
      return { lz: Math.log(z), cy, cx };
    };
    this.cam0 = frameFor(this.topRest(-1e9));
    let cur = this.cam0;
    for (const p of this.pushes) {
      const nx = frameFor(this.topRest(p));
      this.camSteps.push({ t: p, lz: nx.lz - cur.lz, cy: nx.cy - cur.cy, cx: nx.cx - cur.cx });
      cur = nx;
    }
    this.cyTilt0 = frameFor(-(FLOOR_SCREEN - TOP_SCREEN)).cy;
    // the error stamp lands in the free space where the next frame would have gone; the camera
    // tilts up with the pop's pull, which leaves room for it
    const top = this.frames[this.frames.length - 1]!;
    this.stampC.x = (X0 + X1) / 2 + 40;
    this.stampC.y = top.y0 - 62 - this.stampC.hh;
    const zE = Math.exp(cur.lz);
    this.camSteps.push({ t: this.tPop + 0.06, lz: 0, cy: -(STAMP_ROOM / zE), cx: 0 }); // tilts up with the pull
  }

  // ------------------------------------------------------------------ timing / geometry
  /** Page y of the stack's top once every frame pushed by t has landed. */
  topRest(t: number) {
    let y = -BASE.length * BASE_H;
    for (const p of this.pushes) if (p <= t) y -= FRAME_H;
    return y;
  }
  /** The stack pointer (page y): rises to meet each frame as it lands; lifts on the pop attempt. */
  spY(t: number) {
    let y = -BASE.length * BASE_H;
    for (const p of this.pushes) y -= FRAME_H * prog(t, p - 0.03, p + 0.12, ease.outExpo);
    return y - this.lift(t);
  }
  /** pop(): the top frame is pulled up, strains, and is slammed back down on the kick. */
  lift(t: number) {
    if (t < this.tPop) return 0;
    const up = 46 * prog(t, this.tPop, this.tPop + 0.16, ease.outCubic);
    const strain = t < this.tErr ? 2.2 * (hash(frameIdx(t), 7) - 0.5) * prog(t, this.tPop + 0.1, this.tPop + 0.2) : 0;
    const back = prog(t, this.tErr - 0.045, this.tErr, ease.inQuad);
    return (up + strain) * (1 - back);
  }
  /** Tower sway (radians of lean at the floor): builds while the pop strains, rings out after the slam. */
  sway(t: number) {
    let a = 0;
    if (t > this.tPop && t < this.tErr) a += 0.011 * Math.sin(TAU * 2.4 * (t - this.tPop)) * prog(t, this.tPop, this.tPop + 0.25);
    if (t >= this.tErr) {
      const u = t - this.tErr;
      a += 0.024 * Math.exp(-u / 0.32) * Math.sin(TAU * 3.1 * u + 0.4) + 0.006 * Math.exp(-u / 0.2) * Math.sin(TAU * 1.3 * (this.tErr - this.tPop));
    }
    return a;
  }
  /** Stack compression after each landing (px, down), 0..1 of it applied by height. */
  impact(t: number) {
    let v = 0;
    for (const p of [...this.pushes, this.tErr]) {
      const u = t - p;
      if (u >= 0 && u < 0.4) v += Math.exp(-u / 0.05) * Math.cos(TAU * 7 * u);
    }
    return v;
  }
  camAt(t: number): Cam {
    let { lz, cy, cx } = this.cam0;
    const w = 15;
    for (const s of this.camSteps) {
      const u = t - s.t + 0.02;
      if (u <= 0) continue;
      const r = 1 - (1 + w * u) * Math.exp(-w * u);
      lz += s.lz * r; cy += s.cy * r; cx += s.cx * r;
    }
    const { start, end } = this.ctx;
    let z = Math.exp(lz) * (1 + 0.02 * prog(t, start, end, ease.linear));
    let kp = 0;
    for (const k of this.kicks) kp = Math.max(kp, pulse(t, k, 0.07));
    z *= 1 + 0.011 * kp;
    z *= 1 + 0.045 * prog(t, this.tErr - 0.01, this.tErr + 0.3, ease.outExpo);
    // tilted up = the sheet's top recedes (keystone), growing with how far the camera has tilted
    const tiltFrac = clamp((this.cyTilt0 - cy) / 450);
    return { cx, cy, z, k: 0.04 * tiltFrac };
  }
  /** page -> screen, including the keystone (for things drawn in GL on top of the paper). */
  toScreen(cam: Cam, x: number, y: number) {
    const sx = (x - cam.cx) * cam.z + 960, sy = (y - cam.cy) * cam.z + 540;
    const yN = (sy - 540) / 540;
    return { x: 960 + (sx - 960) / (1 - cam.k * yN), y: sy };
  }
  shake(t: number): [number, number] {
    const amp = 13 * pulse(t, this.tErr, 0.07) + 2.2 * Math.max(...this.pushes.map((p) => pulse(t, p, 0.04)), 0);
    const ph = frameIdx(t);
    return [amp * (hash(ph, 11) - 0.5) * 2, amp * (hash(ph, 12) - 0.5) * 2];
  }

  // ------------------------------------------------------------------ render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer } = this.ctx;
    const t = f.t;
    const cam = this.camAt(t);

    // ---- ink (page space through the camera)
    const L = this.ink;
    L.clear('#000');
    const c = L.ctx;
    c.globalCompositeOperation = 'lighter';
    c.setTransform(cam.z, 0, 0, cam.z, 960 - cam.cx * cam.z, 540 - cam.cy * cam.z);
    this.drawFigure(c, t);
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';

    // ---- paper + inks
    const P = this.paper.u;
    P.inkTex!.value = L.upload();
    // screen -> page (inverse of the camera above)
    (P.camA!.value as THREE.Vector3).set(1 / cam.z, 0, cam.cx - 960 / cam.z);
    (P.camB!.value as THREE.Vector3).set(0, 1 / cam.z, cam.cy - 540 / cam.z);
    P.keystone!.value = cam.k;
    P.zoom!.value = cam.z;
    const st = this.stampC;
    (P.stp!.value as THREE.Vector4).set(st.x, st.y, st.hw + 14, st.hh + 14);
    (P.stpB!.value as THREE.Vector4).set(st.rot, t >= this.tErr ? 1 : 0, 4.3, 0);
    this.paper.render(renderer, out);

    // ---- the spark: the stack pointer's head
    const g = this.glow;
    g.clear();
    const headAt = (tt: number) => {
      const cm = this.camAt(tt);
      const y = this.spY(tt);
      return this.toScreen(cm, X1 + 16 + this.sway(tt) * -y, y);
    };
    const hp = headAt(t);
    const burst = (tb: number) => {
      let b = 0;
      for (const p of this.pushes) b = Math.max(b, pulse(tb, p, 0.05));
      b = Math.max(b, 1.6 * pulse(tb, this.tErr, 0.06));
      return 18 + 240 * b;
    };
    const d = this.dots;
    d.clear();
    sparkParticles(d, t, headAt, { rate: burst, rateMax: 420, life: 0.42, speed: 250, gravity: 640, intensity: 0.5, seed: 21, width: 1.7 });
    // the head: a solid orange bead with a hot core (the only thing on the plate that glows)
    const kk = 1 + 0.3 * f.a.kick;
    d.seg2(hp.x, hp.y, hp.x + 0.01, hp.y, 13 * kk, [LIN.signal[0], LIN.signal[1], LIN.signal[2]], 1);
    d.render(renderer, out);
    sparkHead(g, hp.x, hp.y, t, 0.55 * kk, 0.7);
    g.render(renderer, out);

    return {
      paper: 1, hud: 0,
      bloom: 0.22, bloomThreshold: 1.8, bloomKnee: 0.4, halation: 0.03,
      vignette: 0.14, grain: 0.042, ca: 0.35,
      shake: this.shake(t),
    };
  }

  // ------------------------------------------------------------------ drawing (page space)
  drawFigure(c: Ctx2, t: number) {
    const lean = this.sway(t);
    const imp = this.impact(t);
    const nLanded = this.frames.filter((f) => f.t <= t).length;
    const topNow = this.topRest(t);
    const hmax = Math.max(1, -topNow);

    // caption under the floor
    c.fillStyle = PRINT(0.85);
    c.fillRect(X0, 22, X1 - X0, 1.2);
    c.textBaseline = 'alphabetic';
    c.font = font(F.mono(600), 16);
    c.fillStyle = PRINT(1);
    c.fillText('FIG. 2', X0, 52);
    c.font = font(F.mono(400), 16);
    c.fillText('call stack at 23:59', X0 + 84, 52);
    c.font = font(F.mono(400), 13);
    c.fillStyle = PRINT(0.6);
    c.textAlign = 'right';
    c.fillText('stack grows toward lower addresses ↑', X1, 52);
    c.textAlign = 'left';
    // floor: a hatched ground line
    c.fillStyle = PRINT(1);
    c.fillRect(X0 - 24, -0.8, X1 - X0 + 48, 1.6);

    // the free region above the top: dashed continuations of the column
    {
      const yTop = this.spY(t) - 8;
      c.strokeStyle = PRINT(0.4);
      c.lineWidth = 1;
      c.setLineDash([5, 7]);
      c.beginPath();
      c.moveTo(X0, yTop); c.lineTo(X0, yTop - 1700);
      c.moveTo(X1, yTop); c.lineTo(X1, yTop - 1700);
      c.stroke();
      c.setLineDash([]);
      c.font = font(F.mono(400, true), 14);
      c.fillStyle = PRINT(0.5);
      c.textAlign = 'center';
      if (t < this.tErr) c.fillText('(free)', (X0 + X1) / 2, yTop - 46);
      c.textAlign = 'left';
    }

    // frames, bottom to top
    for (let i = 0; i < this.frames.length; i++) {
      const fr = this.frames[i]!;
      if (t < fr.t - DROP) break;
      // falling in: accelerates onto the stack and lands on the kick
      const fall = fr.base ? 0 : -(1 - prog(t, fr.t - DROP, fr.t, ease.inQuad)) * 190;
      const alpha = fr.base ? 1 : prog(t, fr.t - DROP, fr.t - DROP + 0.025);
      // compression after a landing, stronger higher up
      const hk = -(fr.y0 + fr.y1) / 2 / hmax;
      const comp = fr.t <= t ? 5 * imp * hk : 0;
      const popLift = !fr.base && i === this.frames.length - 1 ? -this.lift(t) : 0; // pop() pulls the last frame
      const yMid = (fr.y0 + fr.y1) / 2 + fall + comp + popLift;
      const xLean = lean * -yMid;
      // landing: short hairline ticks kick out of the bottom corners
      if (!fr.base && t >= fr.t && t < fr.t + 0.16) {
        const u = prog(t, fr.t, fr.t + 0.16, ease.outCubic);
        const yb = fr.y1 + comp;
        c.strokeStyle = PRINT(0.8 * (1 - u));
        c.lineWidth = 1.3;
        c.beginPath();
        for (const sx of [-1, 1]) {
          const x = sx < 0 ? X0 + xLean : X1 + xLean;
          for (const a of [0.55, 0.95, 1.35]) {
            const dx = Math.cos(a) * sx, dy = -Math.sin(a);
            const r0 = 8 + 18 * u, r1 = r0 + 12 * (1 - u) + 4;
            c.moveTo(x + dx * r0, yb + dy * r0); c.lineTo(x + dx * r1, yb + dy * r1);
          }
        }
        c.stroke();
      }
      c.save();
      c.translate((X0 + X1) / 2 + xLean, yMid);
      c.rotate(lean * (1 + 0.25 * Math.sin(i * 1.7)));
      c.globalAlpha = alpha;
      this.drawFrame(c, fr, t, i, (fr.y1 - fr.y0) / 2);
      c.restore();
      // address tick in the left margin (fixed to the floor side of each boundary)
      if (fr.t <= t || fr.base) {
        c.font = font(F.mono(400), 12);
        c.fillStyle = PRINT(0.55);
        c.textAlign = 'right';
        c.fillText(fr.addr, X0 - 44 + xLean, fr.y1 + comp + popLift + 4);
        c.textAlign = 'left';
        c.fillStyle = PRINT(0.45);
        c.fillRect(X0 - 38 + xLean, fr.y1 + comp + popLift - 0.5, 34, 1);
      }
    }

    // the stack pointer: orange arrow at the top boundary, label + depth readout
    {
      const y = this.spY(t);
      const xl = lean * -y;
      const ax = X1 + 16 + xl, bx = X1 + 150 + xl;
      c.strokeStyle = ORANGE(1);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(bx, y); c.lineTo(ax + 2, y);
      c.moveTo(ax + 13, y - 7); c.lineTo(ax + 1, y); c.lineTo(ax + 13, y + 7);
      c.stroke();
      c.font = font(F.mono(600), 19);
      c.fillStyle = PRINT(1);
      c.fillText('SP', bx + 14, y + 7);
      c.font = font(F.mono(400), 14);
      c.fillStyle = PRINT(0.6);
      c.fillText(`depth ${String(nLanded).padStart(2, '0')}`, bx + 14, y + 30);
      if (t >= this.tPop) {
        const txt = 'pop()';
        const n = Math.round(prog(t, this.tPop, this.tPop + 0.12) * txt.length);
        c.font = font(F.mono(600), 19);
        c.fillStyle = ORANGE(1);
        const px = bx + 14 + measure('SP ', F.mono(600), 19);
        c.fillText(txt.slice(0, n), px, y + 7);
        if (t >= this.tErr) {
          const s = prog(t, this.tErr, this.tErr + 0.08, ease.outCubic);
          c.fillRect(px - 3, y + 0.5, (measure(txt, F.mono(600), 19) + 6) * s, 2.2);
          c.font = font(F.mono(500), 14);
          c.fillText('refused'.slice(0, Math.round(prog(t, this.tErr + 0.04, this.tErr + 0.16) * 7)), bx + 14, y + 50);
        }
      }
    }

    // the error stamp
    if (t >= this.tErr) this.drawStamp(c, t);
  }

  drawFrame(c: Ctx2, fr: Fr, t: number, i: number, hh: number) {
    const hw = (X1 - X0) / 2;
    // box
    c.strokeStyle = PRINT(1);
    c.lineWidth = fr.base ? 1.3 : 1.6;
    c.strokeRect(-hw, -hh, hw * 2, hh * 2);
    if (fr.base) {
      // caller frames: engraved diagonal hatch
      c.save();
      c.beginPath(); c.rect(-hw, -hh, hw * 2, hh * 2); c.clip();
      c.strokeStyle = PRINT(0.2);
      c.lineWidth = 1;
      c.beginPath();
      for (let x = -hw - hh * 2; x < hw; x += 7) { c.moveTo(x, hh); c.lineTo(x + hh * 2, -hh); }
      c.stroke();
      c.restore();
      // label on a knocked-out strip so the hatch doesn't cross the text
      c.font = font(F.mono(500), 14);
      const lw = measure(fr.label, F.mono(500), 14);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#000';
      c.fillRect(-hw + 12, -9, lw + 12, 18);
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = PRINT(0.9);
      c.fillText(fr.label, -hw + 18, 5);
      c.font = font(F.mono(400), 12);
      const lw2 = measure(fr.local, F.mono(400), 12);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = '#000';
      c.fillRect(hw - 18 - lw2 - 6, -8, lw2 + 12, 16);
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = PRINT(0.6);
      c.fillText(fr.local, hw - 18 - lw2, 4);
      return;
    }
    // label strip
    const top = -hh;
    c.font = font(F.mono(500), 15);
    c.fillStyle = PRINT(1);
    c.fillText(fr.label, -hw + 18, top + 25);
    c.font = font(F.mono(400), 12);
    c.fillStyle = PRINT(0.6);
    c.textAlign = 'right';
    c.fillText(fr.local, hw - 18, top + 24);
    c.textAlign = 'left';
    c.fillStyle = PRINT(0.35);
    c.fillRect(-hw + 18, top + 34, hw * 2 - 36, 1);

    if (fr.coffee) this.drawCup(c, hw - 92, top + 84, t, i);

    // the words: printed faint, stamped as sung (orange while sung, then ink)
    for (const s of fr.words) {
      const w = s.w;
      const x = s.x - (X0 + X1) / 2; // column-relative
      const bx = x, by = top + WORD_BASE;
      c.font = font(WORD_FAMILY, WORD_SIZE);
      if (t < w.start) {
        c.fillStyle = PRINT(0.17);
        c.fillText(w.w, bx, by);
        continue;
      }
      const k = prog(t, w.start, w.start + 0.065, ease.outCubic);
      const sc = lerp(1.22, 1, k);
      const o = 1 - prog(t, w.end + 0.02, w.end + 0.1); // the sung word keeps the orange, then snaps to ink
      const ww = measure(w.w, WORD_FAMILY, WORD_SIZE);
      c.save();
      c.translate(bx + ww / 2 + s.jx * k, by - WORD_SIZE * 0.3 + s.jy * k);
      c.rotate(s.rot * k);
      c.scale(sc, sc);
      if (o > 0) { c.fillStyle = ORANGE(o); c.fillText(w.w, -ww / 2, WORD_SIZE * 0.3); }
      if (o < 1) { c.fillStyle = STAMP(1 - o); c.fillText(w.w, -ww / 2, WORD_SIZE * 0.3); }
      c.restore();
      // the faint print stays under the stamp's edges while it slams
      if (k < 1) { c.fillStyle = PRINT(0.17 * (1 - k)); c.fillText(w.w, bx, by); }
    }
  }

  /** Our own hairline coffee cup: tapered cup, loop handle, saucer, two wisps of steam. */
  drawCup(c: Ctx2, x: number, y: number, t: number, seed: number) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = PRINT(1);
    c.lineWidth = 1.5;
    cupBody(c);
    // steam: two wisps drifting up, fading at the top
    c.lineWidth = 1.2;
    for (let s = 0; s < 2; s++) {
      c.beginPath();
      for (let j = 0; j <= 14; j++) {
        const p = steamXY(s, j / 14, t, seed);
        if (j === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
      }
      c.strokeStyle = PRINT(0.55);
      c.stroke();
    }
    c.restore();
  }

  drawStamp(c: Ctx2, t: number) {
    const st = this.stampC;
    const k = prog(t, this.tErr, this.tErr + 0.06, ease.outCubic);
    const sc = lerp(1.12, 1, k);
    c.save();
    c.translate(st.x, st.y);
    c.rotate(st.rot);
    c.scale(sc, sc);
    c.strokeStyle = ORANGE(1);
    c.lineWidth = 7;
    c.strokeRect(-st.hw, -st.hh, st.hw * 2, st.hh * 2);
    c.lineWidth = 2;
    c.strokeRect(-st.hw + 12, -st.hh + 12, st.hw * 2 - 24, st.hh * 2 - 24);
    c.fillStyle = ORANGE(1);
    c.font = font(F.mono(700), 62);
    c.fillText('RecursionError:', -st.hw + 38, -st.hh + 92);
    c.font = font(F.mono(500), 31);
    c.fillText('maximum caffeine depth exceeded¹', -st.hw + 40, -st.hh + 150);
    c.restore();
    // the footnote, typed on the next kick
    if (t >= this.tFoot) {
      const txt = '¹ unwind() rescheduled to 00:00:00';
      const n = Math.round(prog(t, this.tFoot, this.tFoot + 0.22) * txt.length);
      c.font = font(F.mono(400), 15);
      c.fillStyle = PRINT(0.85);
      c.textAlign = 'right';
      c.fillText(txt.slice(0, n).padEnd(txt.length, ' '), st.x + st.hw, st.y + st.hh + 36);
      c.textAlign = 'left';
    }
  }
}
