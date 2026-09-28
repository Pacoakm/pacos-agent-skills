// `outro` — "Upload complete. … wrong file." (ink, 3D; the last 13.7 s of the video).
//
// A submission receipt of our own hairline design, drawn as an exploded-view assembly figure in the
// ink void. The receipt is a thin engraved slab; its printed parts (header, file, size, timestamp,
// preview, footer) float out in front of it along dashed leader lines, numbered like a parts list.
//  - 100.64 (hard cut from `bigo2`'s flat line): one orange rule, the spark resting at its right end.
//    The camera cranes out and round: the parts hang in space in front of the rule.
//  - Every beat one part docks (outExpo, a clack), while the spark runs the card's outline one edge
//    per beat and the rule cools to bone. The vocal's pitch slide (~102.2) sets the whole card down
//    with a spring. The slab extrudes behind the closed outline; the spark hops onto the preview's
//    loading bar; the downbeat (104.33) locks the figure and the camera swings round to face it.
//  - "Upload complete.": the title lights word by word; `COMPLETE ✓` is stamped on "complete.".
//  - 106.2 → 111.7 (drums, no vocal): LOCAL TIME rolls to 00:00; the camera orbits slowly and pushes
//    onto the preview while it keeps loading — five page skeletons of the essay shimmer on the beat,
//    the spinner turns, the spark creeps along the loading bar to 99 % and strains there; the time
//    estimate gets worse every bar.
//  - 111.7, the drums stop: everything freezes (spinner, 99 %, the camera brakes dead).
//  - "…wrong" (112.24): the preview opens — it is the canteen's dream menu — the camera snaps back
//    flat to the whole receipt, "…wrong" slams in under the title in orange, and the spark leaps to
//    the file name and strikes it through. "file.": the real name is typed after it,
//    `canteen_menu.jpg`, the spark sputters out at its end. Footnote: `resubmissions are not accepted`.
//    The last ~1.2 s carry the map/terrain credit line. The final frame is still.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, W, H, clearRT } from '../../engine/gl';
import { SCALE } from '../../engine/scale';
import { LineBatch } from '../../engine/lines';
import { LIN, rgba } from '../../engine/palette';
import { F, font, measure } from '../../engine/type';
import { clamp, ease, frameIdx, hash, lerp, noise1, polylineLengths, pointAtLength, prog, pulse, springStep } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { VERT, SLAB_FRAG, PART_FRAG } from './outro-glsl';
import {
  CW, CH, RULE_Y, META, VAL_SIZE, BAR, cardLayout, drawCard, loadProgress, barHeadX, typedEndX,
  type CardTimes, type CardLayout,
} from './outro-card';

type RGB = [number, number, number];
type V3 = { x: number; y: number; z: number };
interface Pose { tx: number; ty: number; tz: number; yaw: number; pitch: number; d: number; roll: number }

const U = 100; // card px per world unit
const wx = (px: number) => (px - CW / 2) / U;
const wy = (py: number) => -(py - CH / 2) / U;
const FOV = 30;
const TAN = Math.tan((FOV / 2) * Math.PI / 180);
const deg = Math.PI / 180;
const SLAB_D = 0.34;
const LIGHT = new THREE.Vector3(-0.45, 0.65, 0.6).normalize();
const TEXK = 1.5; // card texture px per card px (× SCALE)
const CREDIT = 'map data © OpenStreetMap contributors · terrain © HKSAR Government, Lands Department (DATA.GOV.HK)';

// final framing: the whole receipt flat to camera, 0.93 screen px per card px, sitting a little high
const FIN_PPU = 93;
const D_FIN = (H / 2) / (FIN_PPU * TAN);

interface PartDef { name: string; r: [number, number, number, number]; off: [number, number, number]; rot: [number, number, number]; dock: number }
// card px rects; exploded offsets (world units, +z toward the viewer) and rotations (rad)
const PARTS: PartDef[] = [
  { name: 'header', r: [0, 0, CW, 100], off: [0.2, 1.3, 3.4], rot: [0.12, -0.1, 0.02], dock: 0 },
  { name: 'file', r: [40, 408, 880, 508], off: [-1.1, 0.35, 5.6], rot: [-0.06, 0.16, -0.03], dock: 1 },
  { name: 'size', r: [880, 408, 1160, 508], off: [0.25, 0.05, 4.4], rot: [0.05, -0.12, 0.05], dock: 2 },
  { name: 'timestamp', r: [1160, 408, 1600, 508], off: [1.2, 0.3, 6.4], rot: [-0.04, -0.2, -0.04], dock: 3 },
  { name: 'preview', r: [40, 512, 1600, 870], off: [0.1, -0.5, 2.6], rot: [-0.05, 0.05, 0.0], dock: 4 },
  { name: 'footer', r: [0, 872, CW, CH], off: [-0.4, -1.15, 3.7], rot: [0.08, 0.1, 0.03], dock: 5 },
];
const TITLE_R: [number, number, number, number] = [0, 100, CW, 408];

interface Part { def: PartDef; mesh: THREE.Mesh; mat: THREE.RawShaderMaterial; w: number; h: number; cx: number; cy: number }

export default class Outro extends Scene {
  cam = new THREE.PerspectiveCamera(FOV, W / H, 0.3, 300);
  scratch = new THREE.PerspectiveCamera(FOV, W / H, 0.3, 300);
  sceneA = new THREE.Scene(); // slab
  sceneB = new THREE.Scene(); // printed parts
  gA = new THREE.Group(); gB = new THREE.Group();
  back = new LineBatch(12000, { screen2D: false, depthTest: true, blend: 'normal' });
  glow = new LineBatch(3000);
  L = new Layer2D();
  camU = { value: new THREE.Vector3() };
  fogU = { value: new THREE.Vector2(20, 30) };

  cv!: HTMLCanvasElement; cc!: CanvasRenderingContext2D; tex!: THREE.CanvasTexture;
  slab!: THREE.Mesh; slabMat!: THREE.RawShaderMaterial;
  parts: Part[] = []; title!: Part;

  T!: CardTimes; Lay!: CardLayout;
  s0 = 0; end = 0; beats: number[] = []; downs: number[] = [];
  tSlide = 0; tSlab = 0; tHop0 = 0; tLock = 0; tOrbit = 0; tDie0 = 0; tDie1 = 0; tCredit = 0;
  edgeT: number[] = [];
  perim: { x: number; y: number }[] = []; perimL!: Float32Array; edgeEnd: number[] = [];
  lastKey = '';
  open: Pose = { tx: 0, ty: 0, tz: 0, yaw: 0, pitch: 0, d: 20, roll: 0 };

  override init() {
    const { lyrics, audio: au, start, end } = this.ctx;
    this.s0 = start; this.end = end;
    const up = lyrics.get('Upload complete').words;
    const wr = lyrics.get('wrong file').words;
    const b0 = Math.round(au.beatAt(start));
    const B = (k: number) => au.timeOfBeat(b0 + k);
    for (let k = -1; ; k++) { const tb = B(k); if (tb > end + 0.5) break; this.beats.push(tb); }
    this.downs = au.downbeats.filter((d) => d > start + 0.05 && d < end);
    const docks = [1, 2, 3, 4, 5, 6].map(B);
    this.edgeT = [B(1), B(2), B(3), B(4)];
    this.tSlide = B(3.5); // the vocal's pitch slide down
    this.tSlab = B(5);
    this.tHop0 = B(5.5);
    const tBar0 = B(6);
    this.tLock = au.downbeats.find((d) => d >= B(7.5)) ?? B(8);
    const upEnd = up[up.length - 1]!.end;
    this.tOrbit = au.downbeats.find((d) => d >= upEnd - 0.05) ?? upEnd;
    const tRev = wr[0]!.start;
    const tStop = [...au.downbeats].reverse().find((d) => d <= tRev - 0.2) ?? tRev - 0.5;
    const tType0 = wr[1]!.start, tType1 = tType0 + 0.34;
    const dAfter = (t: number) => au.downbeats.find((d) => d >= t - 0.02) ?? t;
    const d1 = dAfter(this.tOrbit + 0.5), d2 = dAfter(d1 + 0.5);
    this.T = {
      s0: start, docks, up, wr,
      tAnt: Math.max(this.tLock + 0.1, up[0]!.start - 0.4),
      tStamp: up[1]!.start,
      tClock: this.tOrbit,
      tBar0, tStop, tRev,
      tStrike0: tRev + 0.14, tStrike1: Math.min(wr[0]!.end, tType0) - 0.06,
      tType0, tType1,
      tFoot: tType1 + 0.1,
      etas: [[tBar0, 'about 2 s remaining'], [this.tLock, 'about 4 s remaining'], [this.tOrbit, 'about 5 min remaining'], [d1, 'about 3 h remaining'], [d2, 'calculating…']],
      beats: this.beats,
    };
    this.tDie0 = tType1 + 0.04; this.tDie1 = this.tDie0 + 0.55;
    this.tCredit = end - 1.2;
    this.Lay = cardLayout(this.T);
    this.solveOpen();

    // the outline the spark runs: from the rule's right end, down, along the bottom, up, across the top
    const P = (x: number, y: number) => ({ x, y });
    this.perim = [P(CW, RULE_Y), P(CW, CH), P(0, CH), P(0, 0), P(CW, 0), P(CW, RULE_Y)];
    this.perimL = polylineLengths(this.perim);
    this.edgeEnd = [this.perimL[1]!, this.perimL[2]!, this.perimL[3]!, this.perimL[5]!];

    // the card texture
    this.cv = document.createElement('canvas');
    const k = TEXK * SCALE;
    this.cv.width = Math.round(CW * k); this.cv.height = Math.round(CH * k);
    this.cc = this.cv.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.cv);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.generateMipmaps = true; this.tex.minFilter = THREE.LinearMipmapLinearFilter; this.tex.anisotropy = 8;

    // slab
    const sw = CW / U, sh = CH / U;
    this.slabMat = this.mat(SLAB_FRAG, { half3: { value: new THREE.Vector3(sw / 2, sh / 2, SLAB_D / 2) }, lightDir: { value: LIGHT }, on: { value: 0 }, rim: { value: 0 } });
    this.slab = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, SLAB_D), this.slabMat);
    this.slab.position.set(0, 0, -SLAB_D / 2);
    this.slab.frustumCulled = false;
    this.gA.add(this.slab);
    this.sceneA.add(this.gA);
    this.sceneB.add(this.gB);
    for (const d of PARTS) this.parts.push(this.part(d, d.r));
    this.title = this.part({ name: 'title', r: TITLE_R, off: [0, 0, 0], rot: [0, 0, 0], dock: -1 }, TITLE_R);
  }

  /**
   * The hand-off from `bigo2`: its last frame leaves the orange O(1) line running in from the left
   * edge to the spark at about (1525, 835), sloping down ~2.3°. Frame the receipt's rule so its right
   * end (where the spark rests) lands there at the same slope, and the cut reads as one move.
   */
  private solveOpen() {
    const want = { x: 1525, y: 835 }, slope = Math.atan2(838 - 778, 1525 - 20);
    const m = this.groupMatrix(this.s0, new THREE.Matrix4());
    const P = this.cardW(m, CW, RULE_Y);
    const d = (H / 2) / (100 * TAN); // 100 px per unit: the rule's left end runs off the left edge
    const o: Pose = { tx: P.x, ty: P.y, tz: P.z, yaw: 0, pitch: 0, d, roll: slope };
    for (let i = 0; i < 12; i++) {
      this.setCam(this.scratch, o);
      const q = this.project(this.scratch, P);
      const ex = want.x - q.x, ey = want.y - q.y;
      // screen error back into world, through the roll
      const c = Math.cos(o.roll), s = Math.sin(o.roll);
      const wxE = (ex * c - ey * s) / 100, wyE = (ex * s + ey * c) / 100;
      o.tx -= wxE; o.ty += wyE;
      if (Math.hypot(ex, ey) < 0.05) break;
    }
    this.open = o;
  }

  private mat(frag: string, u: Record<string, THREE.IUniform>, o: Partial<THREE.ShaderMaterialParameters> = {}) {
    return new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: frag, uniforms: { camPos: this.camU, fog: this.fogU, ...u }, ...o });
  }

  private part(def: PartDef, r: [number, number, number, number]): Part {
    const [x0, y0, x1, y1] = r;
    const w = x1 - x0, h = y1 - y0;
    const mat = this.mat(PART_FRAG, {
      tex: { value: this.tex }, rect: { value: new THREE.Vector4(x0 / CW, 1 - y0 / CH, x1 / CW, 1 - y1 / CH) },
      sizePx: { value: new THREE.Vector2(w, h) }, opacity: { value: 1 }, plate: { value: 0 },
    }, { transparent: true, depthWrite: false, depthTest: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w / U, h / U), mat);
    mesh.frustumCulled = false;
    this.gB.add(mesh);
    return { def, mesh, mat, w, h, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
  }

  // ------------------------------------------------------------------ time → state
  /** 0..1 how far part i has docked. */
  dockK(i: number, t: number) { return ease.outExpo(prog(t, this.T.docks[i]!, this.T.docks[i]! + 0.3)); }

  /** The card group's transform: floating high, set down by the pitch slide, a clack per dock. */
  groupXf(t: number) {
    const s = t < this.tSlide ? 0 : springStep(t - this.tSlide, 1.25, 0.42);
    const hold = 1 - s;
    let y = 0.32 * hold + 0.04 * Math.sin((t - this.s0) * 1.9) * hold;
    let z = 0;
    for (const td of this.T.docks) z -= 0.05 * pulse(t, td + 0.05, 0.06);
    z -= 0.06 * pulse(t, this.tLock, 0.08);
    const rx = -0.07 * hold + 0.01 * Math.sin((t - this.s0) * 1.3) * hold;
    y += -0.02 * pulse(t, this.tLock, 0.1);
    return { y, z, rx, ry: 0.02 * hold };
  }
  private gm = new THREE.Matrix4(); private gq = new THREE.Quaternion(); private ge = new THREE.Euler();
  groupMatrix(t: number, m = this.gm) {
    const g = this.groupXf(t);
    this.ge.set(g.rx, g.ry, 0);
    this.gq.setFromEuler(this.ge);
    return m.compose(new THREE.Vector3(0, g.y, g.z), this.gq, new THREE.Vector3(1, 1, 1));
  }
  /** Card px (x, y) at height z above the card face → world, under the group matrix m. */
  cardW(m: THREE.Matrix4, x: number, y: number, z = 0.02): V3 {
    const v = new THREE.Vector3(wx(x), wy(y), z).applyMatrix4(m);
    return { x: v.x, y: v.y, z: v.z };
  }

  /** Part i's local transform (position of its centre, rotation) at t. */
  partXf(i: number, t: number) {
    const p = this.parts[i]!, d = p.def;
    const k = this.dockK(i, t);
    const q = 1 - k;
    const bob = (t - this.s0);
    const ox = d.off[0] + 0.07 * Math.sin(bob * 0.8 + i * 1.7);
    const oy = d.off[1] + 0.06 * Math.sin(bob * 1.1 + i * 2.3);
    const oz = d.off[2] + 0.1 * Math.sin(bob * 0.6 + i);
    return {
      x: wx(p.cx) + ox * q, y: wy(p.cy) + oy * q, z: 0.012 + oz * q,
      rx: d.rot[0] * q, ry: d.rot[1] * q, rz: d.rot[2] * q, k,
    };
  }

  // ------------------------------------------------------------------ camera
  pose(t: number): Pose {
    const T = this.T;
    const OPEN = this.open;
    const EXP: Pose = { tx: 0.4, ty: -0.2, tz: 2.2, yaw: -34 * deg, pitch: 13 * deg, d: 37, roll: -1.0 * deg };
    const ASM: Pose = { tx: 0.1, ty: -0.1, tz: 0.4, yaw: -16 * deg, pitch: 7 * deg, d: 28, roll: -0.4 * deg };
    const LOCK: Pose = { tx: 0, ty: -0.25, tz: 0, yaw: -4.5 * deg, pitch: 2.5 * deg, d: D_FIN * 1.07, roll: 0 };
    const PUSH: Pose = { tx: 0.9, ty: wy(690), tz: 0, yaw: 21 * deg, pitch: -8 * deg, d: 10.2, roll: 1.2 * deg };
    const FIN: Pose = { tx: 0, ty: -(540 - 505) / FIN_PPU, tz: 0, yaw: 0, pitch: 0, d: D_FIN, roll: 0 };
    let p = OPEN;
    p = mixPose(p, EXP, prog(t, this.s0 + 0.04, T.docks[1]!, ease.inOutCubic));
    p = mixPose(p, ASM, prog(t, T.docks[1]!, this.tLock, ease.inOutQuad));
    p = mixPose(p, LOCK, prog(t, this.tLock - 0.04, this.tLock + 0.75, ease.inOutCubic));
    // the orbit + push: smooth start, constant speed, then braked dead when the drums stop
    const span = T.tStop - this.tOrbit, ua = 0.25;
    let e: number;
    if (t <= this.tOrbit) e = 0;
    else if (t <= T.tStop) {
      const u = (t - this.tOrbit) / span;
      e = (u < ua ? (u * u) / (2 * ua) : u - ua / 2) / (1 - ua / 2);
    } else {
      const rate = 1 / ((1 - ua / 2) * span), tau = 0.08;
      e = 1 + rate * tau * (1 - Math.exp(-(t - T.tStop) / tau));
    }
    // ease the orbit's path (not its timing): the push tightens toward the end
    p = mixPose(p, PUSH, e <= 1 ? 0.35 * e + 0.65 * e * e : 1 + 1.65 * (e - 1));
    // "…wrong": snap back, flat to the whole receipt
    p = mixPose(p, FIN, prog(t, T.tRev, T.tRev + 0.42, ease.outExpo));
    // punches: docks, the lock, the stamp; gentle beats while it loads
    let k = 0;
    for (const td of T.docks) k += 0.01 * pulse(t, td, 0.08);
    k += 0.02 * pulse(t, this.tLock, 0.1) + 0.02 * pulse(t, T.tStamp, 0.08);
    for (const b of this.beats) if (b > this.tOrbit - 0.01 && b < T.tStop - 0.01) k += 0.004 * pulse(t, b, 0.1);
    k += 0.018 * pulse(t, T.tRev, 0.09);
    return { ...p, d: p.d * (1 - k) };
  }

  setCam(cam: THREE.PerspectiveCamera, p: Pose) {
    const cp = Math.cos(p.pitch);
    cam.position.set(p.tx + p.d * Math.sin(p.yaw) * cp, p.ty + p.d * Math.sin(p.pitch), p.tz + p.d * Math.cos(p.yaw) * cp);
    cam.up.set(0, 1, 0);
    cam.lookAt(p.tx, p.ty, p.tz);
    cam.rotateZ(p.roll);
    cam.updateMatrixWorld();
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  }
  private pv = new THREE.Vector3();
  project(cam: THREE.PerspectiveCamera, q: V3) {
    const v = this.pv.set(q.x, q.y, q.z).project(cam);
    return { x: (v.x + 1) * 0.5 * W, y: (1 - v.y) * 0.5 * H, ok: v.z < 1 };
  }
  ppu(cam: THREE.PerspectiveCamera, q: V3) {
    const v = this.pv.set(q.x, q.y, q.z).applyMatrix4(cam.matrixWorldInverse);
    return (H / 2) / (Math.max(0.3, -v.z) * TAN);
  }

  // ------------------------------------------------------------------ the spark
  perimS(t: number) {
    let s = 0;
    for (let i = 0; i < 4; i++) {
      if (t < this.edgeT[i]!) break;
      const a = i === 0 ? 0 : this.edgeEnd[i - 1]!, b = this.edgeEnd[i]!;
      s = lerp(a, b, ease.outExpo(prog(t, this.edgeT[i]!, this.edgeT[i]! + 0.42)));
    }
    return s;
  }
  /** The spark in card px + height above the card, at t. */
  sparkCard(t: number): { x: number; y: number; z: number } {
    const T = this.T;
    const strikeY = META.val - VAL_SIZE * 0.34;
    const barAt = (tt: number) => ({ x: barHeadX(loadProgress(T, tt)), y: BAR.y, z: 0.03 });
    if (t < this.tHop0) {
      const q = pointAtLength(this.perim, this.perimL, this.perimS(t));
      return { x: q.x, y: q.y, z: 0.03 };
    }
    if (t < T.tBar0) {
      const u = ease.inOutCubic(prog(t, this.tHop0, T.tBar0));
      return { x: lerp(CW, BAR.x0, u), y: lerp(RULE_Y, BAR.y, u), z: 0.03 + 1.2 * Math.sin(Math.PI * u) };
    }
    if (t < T.tRev) return barAt(t);
    if (t < T.tStrike0) {
      const a = barAt(T.tRev - 1e-3);
      const u = ease.inOutCubic(prog(t, T.tRev, T.tStrike0));
      return { x: lerp(a.x, META.c1 - 6, u), y: lerp(a.y, strikeY, u), z: 0.03 + 1.6 * Math.sin(Math.PI * u) };
    }
    const sp = prog(t, T.tStrike0, T.tStrike1, ease.inOutQuad);
    const xs = META.c1 - 6 + (this.Lay.oldW + 12) * sp;
    if (t < T.tType0) return { x: xs, y: strikeY, z: 0.03 };
    const xe = typedEndX(t, T, this.Lay) + 12;
    const u = ease.outCubic(prog(t, T.tType0, T.tType0 + 0.06));
    return { x: lerp(xs, xe, u), y: lerp(strikeY, strikeY, u), z: 0.03 };
  }
  sparkWorld(t: number, m: THREE.Matrix4): V3 {
    const s = this.sparkCard(t);
    return this.cardW(m, s.x, s.y, s.z);
  }
  sparkI(t: number) {
    const T = this.T;
    if (t >= this.tDie1) return 0;
    let I = 1.0;
    for (const e of this.edgeT) I += 0.5 * pulse(t, e, 0.08);
    if (t >= T.tBar0) I = 0.95 + 0.35 * this.beatPulse(t, 0.08);
    if (t >= T.tStop) I = 0.55;
    if (t >= T.tRev) I = 1.25 + 0.8 * pulse(t, T.tRev, 0.1) + 0.5 * pulse(t, T.tType0, 0.08);
    if (t >= this.tDie0) {
      // sputters: dropouts that get longer, then out
      const k = prog(t, this.tDie0, this.tDie1);
      const f = frameIdx(t);
      const on = hash(Math.floor(f / 2), 77) > 0.25 + 0.7 * k ? 1 : 0.12;
      I *= (1 - k * k) * on;
    }
    return I;
  }
  beatPulse(t: number, hl: number) { let p = 0; for (const b of this.beats) if (b <= t + 1e-4 && b < this.T.tStop - 0.01) p = Math.max(p, pulse(t, b, hl)); return p; }
  sparkRate(tb: number) {
    const T = this.T;
    if (tb < this.s0) return 0;
    if (tb < this.tHop0) { for (const e of this.edgeT) if (tb >= e && tb < e + 0.3) return 200; return 40; }
    if (tb < T.tBar0) return 90;
    if (tb < T.tStop) { for (const b of this.beats) if (tb >= b && tb < b + 0.06) return 160; return 22; }
    if (tb < T.tRev) return 0;
    if (tb < T.tType0) return 230;
    if (tb < this.tDie0) return 150;
    if (tb < this.tDie1) { const k = prog(tb, this.tDie0, this.tDie1); return hash(Math.floor(tb * 30), 5) > 0.35 + 0.6 * k ? 120 : 0; }
    return 0;
  }

  // ------------------------------------------------------------------ render
  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const t = f.t, T = this.T;
    const { renderer, comp } = this.ctx;
    const P = this.pose(t);
    this.setCam(this.cam, P);
    this.camU.value.copy(this.cam.position);
    this.fogU.value.set(P.d * 0.95, P.d * 1.4);

    // groups
    const g = this.groupXf(t);
    for (const G of [this.gA, this.gB]) { G.position.set(0, g.y, g.z); G.rotation.set(g.rx, g.ry, 0); G.updateMatrixWorld(true); }
    const m = this.groupMatrix(t);

    // slab: extrudes behind the closed outline
    const sk = ease.inOutCubic(prog(t, this.tSlab, this.tSlab + 0.4));
    this.slab.visible = sk > 0.001;
    const dz = SLAB_D * lerp(0.04, 1, sk);
    this.slab.scale.set(1, 1, dz / SLAB_D);
    this.slab.position.z = -dz / 2;
    this.slabMat.uniforms.on!.value = prog(t, this.tSlab, this.tSlab + 0.3);
    this.slabMat.uniforms.rim!.value = pulse(t, this.tLock, 0.12) + 0.6 * pulse(t, T.tRev, 0.1);

    // parts
    const on0 = (i: number) => prog(t, this.s0 + 0.12 + 0.05 * i, this.s0 + 0.55 + 0.05 * i);
    this.parts.forEach((p, i) => {
      const x = this.partXf(i, t);
      p.mesh.position.set(x.x, x.y, x.z);
      p.mesh.rotation.set(x.rx, x.ry, x.rz);
      p.mat.uniforms.opacity!.value = on0(i);
      p.mat.uniforms.plate!.value = on0(i) * (1 - this.slabMat.uniforms.on!.value * x.k);
      p.mesh.visible = on0(i) > 0;
    });
    this.title.mesh.position.set(wx(this.title.cx), wy(this.title.cy), 0.012);
    this.title.mesh.visible = t >= T.docks[0]!;

    this.redraw(t);

    clearRT(renderer, out, LIN.ink);
    renderer.setRenderTarget(out);
    renderer.render(this.sceneA, this.cam);
    this.buildBack(t, P, m);
    this.back.render(renderer, out, this.cam);
    renderer.setRenderTarget(out);
    renderer.render(this.sceneB, this.cam);

    // 2D: labels, credit
    const c = this.L.ctx; this.L.clear();
    this.drawLabels(c, t);
    this.drawCredit(c, t);
    comp.draw(renderer, this.L.upload(), out);

    // the spark (2D, projected)
    const gl = this.glow; gl.clear();
    const I = this.sparkI(t);
    if (I > 0.001) {
      const sw = this.sparkWorld(t, m);
      const sp = this.project(this.cam, sw);
      const ppu = this.ppu(this.cam, sw);
      const sm = new THREE.Matrix4();
      sparkParticles(gl, t, (tb) => {
        if (tb < this.s0) return null;
        this.setCam(this.scratch, this.pose(tb));
        const q = this.project(this.scratch, this.sparkWorld(tb, this.groupMatrix(tb, sm)));
        return { x: q.x, y: q.y };
      }, { rate: (tb) => this.sparkRate(tb), rateMax: 230, life: 0.45, speed: 230, gravity: 800, intensity: 0.9, seed: 1159 });
      sparkHead(gl, sp.x, sp.y, t, clamp(Math.sqrt(ppu / 100), 0.6, 1.6), I);
    }
    gl.render(renderer, out);

    // post
    let shake = 11 * pulse(t, T.tStamp, 0.05) + 7 * pulse(t, T.tRev, 0.05) + 5 * pulse(t, this.tLock, 0.05);
    for (const td of T.docks) shake += 2.2 * pulse(t, td, 0.04);
    const o: PostOverrides = {
      hud: 0, bloom: 0.75, bloomThreshold: 1.0, bloomKnee: 0.05, bloomRadius: 0.6, halation: 0.12,
      vignette: 0.44, grain: 0.055, ca: 1.0 + 1.6 * pulse(t, T.tRev, 0.08) + 1.2 * pulse(t, T.tStamp, 0.07), flash: 0,
    };
    if (shake > 0.05) o.shake = [noise1(t * 57, 1) * shake, noise1(t * 57, 2) * shake];
    return o;
  }

  /** Redraw the card texture when anything on it changed. */
  private redraw(t: number) {
    const T = this.T;
    // quantised state: while nothing on the card moves, the texture is left alone
    const loading = t >= T.tBar0 - 0.25 && t < T.tStop;
    const key = loading ? `L${t}` : [
      t >= T.tAnt ? Math.round(prog(t, T.tAnt, T.tAnt + 0.2) * 20) : -1,
      ...T.up.map((w) => (t >= w.start ? Math.round(clamp((t - w.start) / 0.16) * 20) : -1)),
      t >= T.up[T.up.length - 1]!.end + 0.12 ? 1 : 0,
      t >= T.tStamp ? Math.round(clamp((t - T.tStamp) / 0.3) * 40) : -1,
      t >= T.tClock ? Math.round(clamp((t - T.tClock) / 0.2) * 20) : -1,
      t >= T.tRev ? Math.round(clamp((t - T.tRev) / 0.5) * 60) : -1,
      ...T.wr.map((w) => (t >= w.start ? Math.round(clamp((t - w.start) / 0.3) * 30) : -1)),
      Math.round(prog(t, T.tStrike0, T.tStrike1) * 120),
      Math.round(prog(t, T.tType0, T.tType1) * 40),
      Math.round(prog(t, T.tFoot, T.tFoot + 0.3) * 40),
      t >= T.docks[4]! - 0.6 ? 1 : 0,
      t >= T.tStop ? 1 : 0,
    ].join(',');
    if (key === this.lastKey) return;
    this.lastKey = key;
    const c = this.cc, k = TEXK * SCALE;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.cv.width, this.cv.height);
    c.setTransform(k, 0, 0, k, 0, 0);
    drawCard(c, t, T, this.Lay);
    this.tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ 3D hairlines
  private buildBack(t: number, P: Pose, m: THREE.Matrix4) {
    const lb = this.back; lb.clear();
    const T = this.T;
    const cp = this.cam.position;
    const fogA = (x: number, y: number, z: number) => Math.exp(-Math.max(0, Math.hypot(x - cp.x, y - cp.y, z - cp.z) - P.d * 0.95) / (P.d * 1.4));
    const seg = (a: V3, b: V3, w: number, col: RGB, al: number) => {
      if (al < 0.004) return;
      const fa = fogA((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      lb.seg(a.x, a.y, a.z, b.x, b.y, b.z, w, col[0] * fa, col[1] * fa, col[2] * fa, al);
    };
    const B = LIN.bone, G = LIN.graphite, A = LIN.ash, S = LIN.signal;
    const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
    const mixc = (a: RGB, b: RGB, k: number): RGB => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    const cw = (x: number, y: number, z = 0.02) => this.cardW(m, x, y, z);

    // the sheet behind: a dot grid far back, for depth while the camera moves
    const ga = prog(t, this.s0 + 0.15, this.s0 + 0.8) * (1 - 0.6 * prog(t, T.tRev, T.tRev + 0.4));
    if (ga > 0) {
      for (let i = -16; i <= 16; i++) for (let j = -10; j <= 10; j++) {
        const x = i * 1.0, y = j * 1.0, z = -5.5;
        lb.seg(x, y, z, x + 0.001, y, z, 2.2, G[0], G[1], G[2], 0.55 * ga * fogA(x, y, z));
      }
    }

    // the rule (bigo2's flat line): orange at the cut, cooling to bone as the first part docks
    const heat = 1 - prog(t, T.docks[0]!, T.docks[0]! + 0.7, ease.inOutQuad);
    const rc = mixc(mul(B, 0.6), mul(S, 0.85), heat);
    seg(cw(0, RULE_Y), cw(CW, RULE_Y), 1.6 + 0.8 * heat, rc, 1);

    // the outline the spark has run
    const s = t < this.edgeT[0]! ? 0 : this.perimS(t);
    const slabOn = prog(t, this.tSlab, this.tSlab + 0.3);
    if (s > 0.5) {
      const L = this.perimL, pts = this.perim;
      const oa = 1 - 0.55 * slabOn;
      for (let i = 1; i < pts.length; i++) {
        const a0 = L[i - 1]!, a1 = L[i]!;
        if (s <= a0) break;
        const e = Math.min(s, a1);
        const pa = pts[i - 1]!, pb = pts[i]!;
        const u = (e - a0) / (a1 - a0);
        seg(cw(pa.x, pa.y), cw(lerp(pa.x, pb.x, u), lerp(pa.y, pb.y, u)), 1.4, mul(B, 0.62), oa);
      }
      // a hot run just behind the head
      if (t < this.tHop0 + 0.3) {
        const hk = 1 - prog(t, this.edgeT[3]! + 0.35, this.tHop0 + 0.3);
        for (let i = 0; i < 12; i++) {
          const s1 = s - i * 14, s0 = s - (i + 1) * 14;
          if (s1 <= 0) break;
          const q0 = pointAtLength(pts, L, Math.max(0, s0)), q1 = pointAtLength(pts, L, s1);
          const k = Math.pow(1 - i / 12, 2) * hk;
          seg(cw(q0.x, q0.y, 0.03), cw(q1.x, q1.y, 0.03), 2.4, mul(S, 0.4 + 1.8 * k), k);
        }
      }
    }
    // registration marks outside the corners, once the outline has closed
    const rk = ease.outExpo(prog(t, this.edgeT[3]! + 0.2, this.edgeT[3]! + 0.6));
    if (rk > 0) {
      const o = 26, l = 34 * rk;
      for (const [x, y, sx, sy] of [[0, 0, -1, -1], [CW, 0, 1, -1], [0, CH, -1, 1], [CW, CH, 1, 1]] as const) {
        seg(cw(x + sx * o, y), cw(x + sx * (o + l), y), 1.1, mul(A, 0.7), 1);
        seg(cw(x, y + sy * o), cw(x, y + sy * (o + l)), 1.1, mul(A, 0.7), 1);
      }
    }

    // exploded view: dashed leaders from each floating part's corners back to its seat
    this.parts.forEach((p, i) => {
      const x = this.partXf(i, t);
      if (x.k > 0.995) return;
      const on = prog(t, this.s0 + 0.2 + 0.05 * i, this.s0 + 0.7 + 0.05 * i);
      const a = on * (1 - x.k) * 0.8;
      if (a < 0.01) return;
      const pm = new THREE.Matrix4().compose(new THREE.Vector3(x.x, x.y, x.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(x.rx, x.ry, x.rz)), new THREE.Vector3(1, 1, 1));
      pm.premultiply(m);
      const hw = p.w / U / 2, hh = p.h / U / 2;
      const [x0, y0, x1, y1] = p.def.r;
      const corners: [number, number, number, number][] = [[-hw, hh, x0, y0], [hw, hh, x1, y0], [hw, -hh, x1, y1], [-hw, -hh, x0, y1]];
      for (const [lx, ly, cx, cy] of corners) {
        const v = new THREE.Vector3(lx, ly, 0).applyMatrix4(pm);
        const a3 = { x: v.x, y: v.y, z: v.z }, b3 = cw(cx, cy, 0.0);
        const len = Math.hypot(a3.x - b3.x, a3.y - b3.y, a3.z - b3.z);
        const n = Math.max(1, Math.floor(len / 0.22));
        for (let j = 0; j < n; j++) {
          const u0 = j / n, u1 = (j + 0.55) / n;
          seg({ x: lerp(a3.x, b3.x, u0), y: lerp(a3.y, b3.y, u0), z: lerp(a3.z, b3.z, u0) }, { x: lerp(a3.x, b3.x, u1), y: lerp(a3.y, b3.y, u1), z: lerp(a3.z, b3.z, u1) }, 1.0, mul(A, 0.8), a);
        }
      }
      // the seat: a dashed outline on the card where the part will land (before the slab exists)
      const seatA = a * (1 - slabOn);
      if (seatA > 0.01) {
        const r = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
        for (const [ax, ay, bx, by] of r) {
          const L = Math.hypot(bx! - ax!, by! - ay!), n = Math.max(1, Math.floor(L / 22));
          for (let j = 0; j < n; j++) seg(cw(lerp(ax!, bx!, j / n), lerp(ay!, by!, j / n), 0.0), cw(lerp(ax!, bx!, (j + 0.5) / n), lerp(ay!, by!, (j + 0.5) / n), 0.0), 1.0, mul(G, 1.2), seatA * 0.8);
        }
      }
    });
  }

  // ------------------------------------------------------------------ 2D
  private drawLabels(c: CanvasRenderingContext2D, t: number) {
    const m = this.gm;
    this.groupMatrix(t, m);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const fs = 15, fam = F.mono(500);
    c.font = font(fam, fs);
    this.parts.forEach((p, i) => {
      const x = this.partXf(i, t);
      const on = prog(t, this.s0 + 0.3 + 0.05 * i, this.s0 + 0.7 + 0.05 * i);
      const a = on * (1 - ease.outCubic(prog(t, this.T.docks[i]!, this.T.docks[i]! + 0.15)));
      if (a < 0.01) return;
      const pm = new THREE.Matrix4().compose(new THREE.Vector3(x.x, x.y, x.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(x.rx, x.ry, x.rz)), new THREE.Vector3(1, 1, 1));
      pm.premultiply(m);
      const v = new THREE.Vector3(-p.w / U / 2, p.h / U / 2, 0).applyMatrix4(pm);
      const q = this.project(this.cam, { x: v.x, y: v.y, z: v.z });
      if (!q.ok) return;
      const num = String(i + 1).padStart(2, '0');
      c.fillStyle = rgba('bone', 0.9 * a);
      c.fillText(num, q.x, q.y - 20);
      c.fillStyle = rgba('ash', 0.85 * a);
      c.fillText(p.def.name, q.x + measure(num, fam, fs) + 10, q.y - 20);
    });
  }

  private drawCredit(c: CanvasRenderingContext2D, t: number) {
    const a = prog(t, this.tCredit, this.tCredit + 0.3);
    if (a <= 0) return;
    c.font = font(F.mono(400), 17);
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillStyle = rgba('bone', 0.5 * a);
    c.fillText(CREDIT, W / 2, H - 44);
    c.textAlign = 'left';
  }
}

function mixPose(a: Pose, b: Pose, k: number): Pose {
  if (k <= 0) return a;
  return {
    tx: lerp(a.tx, b.tx, k), ty: lerp(a.ty, b.ty, k), tz: lerp(a.tz, b.tz, k),
    yaw: lerp(a.yaw, b.yaw, k), pitch: lerp(a.pitch, b.pitch, k),
    d: Math.exp(lerp(Math.log(a.d), Math.log(b.d), k)), roll: lerp(a.roll, b.roll, k),
  };
}
