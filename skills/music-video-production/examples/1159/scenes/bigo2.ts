// `bigo2` (chorus 2) — "O of n squared panic, but I'm doing fine", one dimension worse.
// Chorus 1's figure rebuilt in 3D: the graph-paper floor, and O(n²) as a hairline paraboloid
// panic = x² + z² standing on it (its own graph-paper grid lifted onto the surface, hidden lines
// removed). The spark climbs the far wall one step per sung word ("O / of / n / squared"), each
// step lighting its level ring (1, 4, 9, 16) while the lyric builds the label O(n²) in Cormorant,
// exactly as in chorus 1. "panic,": the spark shoots up the wall and off the rim; the camera whips
// up after it (an altimeter of panic ticks streams past on the axis of symmetry). "but" (sung
// before the downbeat) waits, laid on an invisible plane; on the 96.95 downbeat the view snaps
// down past the rim onto the flat O(1) sheet at panic = 1, which materialises under the landing
// spark and caps the bowl. "but I'm doing fine¹" is laid on the sheet along an orange flat line;
// footnote "¹ amortized, allegedly". It ends resolved and still, the spark resting at the end of
// the flat line (the outro builds its receipt out of that line; hard cut at the window's end).
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, W, H, clearRT } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { LIN, rgba } from '../../engine/palette';
import { F, font, layout, type TextLayout } from '../../engine/type';
import { Lyrics, norm, type Line, type Word } from '../../engine/lyrics';
import { clamp, ease, lerp, prog, pulse, hash, noise1, TAU } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { buildHero, mathLabel, type Piece } from './bigo';
import { VERT, FLOOR_FRAG, BOWL_FRAG, SHEET_FRAG, bowlGeometry, K, RM, YS, SHEET, CUT } from './bigo2-glsl';

type RGB = [number, number, number];
type P3 = { x: number; y: number; z: number };
type Proj = { x: number; y: number; s: number; w: number };
interface Cam { tgt: P3; yaw: number; pitch: number; dist: number; fov: number }

const deg = Math.PI / 180;
const DP = { x: Math.cos(-40 * Math.PI / 180), z: Math.sin(-40 * Math.PI / 180) }; // the climb: up the back wall, seen through the cutaway
const NA = 9; // r reached at the top of the whip (panic 81), past the rim (RM)
const ZR = 7.0; // the flat line on the sheet (z)
const XS = 7.2; // the spark's resting x on the flat line
const ROW_S = 1.7; // em size of the laid lyric (world)
const SNAP_DUR = 0.2;

const C_INTRO: Cam = { tgt: { x: 0.8, y: 3.4, z: -0.6 }, yaw: -30 * deg, pitch: 24 * deg, dist: 24, fov: 36 };
const C_APEX: Cam = { tgt: { x: 6.0, y: 22.9, z: -5.0 }, yaw: -17 * deg, pitch: 11 * deg, dist: 15.5, fov: 40 };
const C_FINAL: Cam = { tgt: { x: -0.2, y: 3.0, z: 4.5 }, yaw: 2 * deg, pitch: 30 * deg, dist: 22, fov: 38 };

const mul3 = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const lerp3 = (a: P3, b: P3, k: number): P3 => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
const lerpCam = (a: Cam, b: Cam, k: number): Cam => ({
  tgt: lerp3(a.tgt, b.tgt, k), yaw: lerp(a.yaw, b.yaw, k), pitch: lerp(a.pitch, b.pitch, k),
  dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), k)), fov: lerp(a.fov, b.fov, k),
});

function wordOf(l: Line, q: string): Word {
  const n = norm(q);
  const w = l.words.find((x) => norm(x.w) === n);
  if (!w) throw new Error(`bigo2: word not found: ${q}`);
  return w;
}

export default class BigO2 extends Scene {
  cam = new THREE.PerspectiveCamera(36, W / H, 0.5, 400);
  vp = new THREE.Matrix4();
  scratch = new THREE.PerspectiveCamera(36, W / H, 0.5, 400);
  svp = new THREE.Matrix4();
  v4 = new THREE.Vector4();
  world = new THREE.Scene();
  camU = { value: new THREE.Vector3() };
  fogU = { value: new THREE.Vector2(18, 16) };
  floorMat!: THREE.RawShaderMaterial; bowlMat!: THREE.RawShaderMaterial; sheetMat!: THREE.RawShaderMaterial;
  lines = new LineBatch(40000, { screen2D: false, depthTest: true, blend: 'normal' });
  glow = new LineBatch(12000, { screen2D: false, depthTest: true, blend: 'add' });
  fx = new LineBatch(5000);
  L = new Layer2D();

  line!: Line;
  wO!: Word; wOf!: Word; wN!: Word; wSq!: Word; wPanic!: Word;
  wBut!: Word; wIm!: Word; wDoing!: Word; wFine!: Word;
  T0 = 0; T1 = 0;
  tPanic = 0; tArr = 0; tExit = 0; tSnap = 0; tLand = 0;
  steps: number[] = [];
  hero: Piece[] = [];
  famRow = F.archivo(112.5, 300);
  row!: TextLayout;
  rowWords: { w: Word; i0: number; i1: number }[] = [];
  rowX0 = 0;
  heroA1: P3 = { x: 0, y: 0, z: 0 };
  heroA2: P3 = { x: 0, y: 0, z: 0 };

  override init() {
    const ly = this.ctx.lyrics, au = this.ctx.audio;
    this.T0 = this.ctx.start; this.T1 = this.ctx.end;
    const L = (this.line = ly.get('O of n squared', 1));
    this.wO = L.words[0]!;
    this.wOf = wordOf(L, 'of'); this.wN = wordOf(L, 'n'); this.wSq = wordOf(L, 'squared');
    this.wPanic = wordOf(L, 'panic');
    this.wBut = wordOf(L, 'but'); this.wIm = wordOf(L, "I'm"); this.wDoing = wordOf(L, 'doing'); this.wFine = wordOf(L, 'fine');
    this.steps = [this.wO.start, this.wOf.start, this.wN.start, this.wSq.start];
    this.tPanic = this.wPanic.start;
    const bP = Math.floor(au.beatAt(this.tPanic));
    this.tArr = au.timeOfBeat(bP + 4);
    this.tExit = au.timeOfBeat(bP + 3);
    this.tSnap = au.downbeats.find((d) => d >= this.wBut.start - 0.02) ?? this.wBut.start + 0.6;
    this.tLand = this.tSnap + SNAP_DUR * (Math.log2(1 / (1 - 1 / 1.12)) / 10);
    this.hero = buildHero(this.wO, this.wOf, this.wN, this.wSq).pieces;

    const ws = [this.wBut, this.wIm, this.wDoing, this.wFine];
    const txt = ws.map((w) => w.w.replace(/[,.]$/, '')).join(' ');
    this.row = layout(txt, this.famRow, 100, 1);
    let ci = 0;
    for (const w of ws) {
      const len = Array.from(w.w.replace(/[,.]$/, '')).length;
      this.rowWords.push({ w, i0: ci, i1: ci + len });
      ci += len + 1;
    }
    this.rowX0 = XS - 0.62 - (this.row.width / 100) * ROW_S - 0.35;

    // the hero label's world anchors: where the intro and the final framings want it on screen
    this.heroA1 = this.unproject(C_INTRO, 150, 250, 25);
    this.heroA2 = this.unproject(C_FINAL, 150, 205, 24);

    // ---- world meshes
    const mat = (frag: string, u: Record<string, THREE.IUniform>, o: Partial<THREE.ShaderMaterialParameters> = {}) =>
      new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: frag, uniforms: { camPos: this.camU, fog: this.fogU, ...u }, ...o });
    const sheetR = new THREE.Vector4(SHEET.x0, SHEET.x1, SHEET.z0, SHEET.z1);
    this.floorMat = mat(FLOOR_FRAG, { on: { value: 1 }, hide: { value: 0 }, sheetR: { value: sheetR } }, { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160).rotateX(-Math.PI / 2), this.floorMat);
    floor.frustumCulled = false;
    this.world.add(floor);
    this.bowlMat = mat(BOWL_FRAG, {
      K3: { value: K }, Rm: { value: RM }, lightDir: { value: new THREE.Vector3(-0.5, 0.75, 0.45) }, on: { value: 1 },
      lvl: { value: [1, 4, 9, 16] }, lvlA: { value: [0, 0, 0, 0] }, cut: { value: new THREE.Vector2(CUT.a, CUT.h) },
    }, { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2 });
    const bowl = new THREE.Mesh(bowlGeometry(), this.bowlMat);
    bowl.frustumCulled = false;
    this.world.add(bowl);
    this.sheetMat = mat(SHEET_FRAG, { on: { value: 0 }, sheetR: { value: sheetR } }, {
      transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    const sw = SHEET.x1 - SHEET.x0, sd = SHEET.z1 - SHEET.z0;
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(sw, sd).rotateX(-Math.PI / 2), this.sheetMat);
    sheet.position.set((SHEET.x0 + SHEET.x1) / 2, YS, (SHEET.z0 + SHEET.z1) / 2);
    sheet.renderOrder = 2;
    sheet.frustumCulled = false;
    this.world.add(sheet);
  }

  // ------------------------------------------------------------------ time → space
  stepsAt(t: number) {
    let k = 0;
    for (const s of this.steps) k += ease.outExpo(clamp((t - s) / 0.22));
    return k;
  }
  onCurve(r: number, lift = 0.02): P3 {
    // lifted along the inside normal (off the surface, toward the viewer inside the bowl)
    const s = 2 * K * r, nl = 1 / Math.sqrt(1 + s * s);
    const on = r <= RM ? 1 : 0;
    return { x: r * DP.x - on * lift * s * nl * DP.x, y: K * r * r + lift * (on ? nl : 1), z: r * DP.z - on * lift * s * nl * DP.z };
  }
  rest(): P3 { return { x: XS, y: YS + 0.02, z: ZR }; }

  panicAt(t: number) {
    if (t < this.tPanic) { const n = this.stepsAt(t); return n * n; }
    return lerp(16, NA * NA, ease.outExpo(prog(t, this.tPanic, this.tArr))) + 2.2 * Math.max(0, t - this.tArr);
  }
  sparkPos(t: number): P3 {
    if (t < this.tSnap) return this.onCurve(Math.sqrt(this.panicAt(t)));
    const e = Math.min(1, 1.12 * ease.outExpo(prog(t, this.tSnap, this.tSnap + SNAP_DUR)));
    const a = this.onCurve(Math.sqrt(this.panicAt(this.tSnap))), b = this.rest();
    return lerp3(a, b, e);
  }

  introCam(t: number): Cam {
    const k = this.stepsAt(t);
    const open = prog(t, this.T0, this.T0 + 0.7, ease.outCubic);
    const c = { ...C_INTRO, tgt: { ...C_INTRO.tgt } };
    c.dist *= (1 - 0.022 * k) * (1 + 0.05 * (1 - open));
    c.yaw += (2.2 * k - 3 * (1 - open)) * deg;
    c.tgt.y += 0.32 * k;
    return c;
  }
  whipCam(t: number): Cam {
    const c0 = this.introCam(this.tPanic);
    const u = prog(t, this.tPanic + 0.02, this.tArr);
    const c = lerpCam(c0, C_APEX, ease.outExpo(u * u));
    c.tgt.y += 0.6 * Math.max(0, t - this.tArr);
    return c;
  }
  overshoot(t: number) {
    const v = t - this.tSnap - 0.1;
    return v <= 0 ? 0 : Math.sin(TAU * 2.3 * v) * Math.exp(-v / 0.15);
  }
  /** The camera. `final`: the post-snap framing whatever t is (for type laid on the sheet before it lands). */
  camAt(t: number, final = false): Cam {
    if (!final && t < this.tPanic) return this.introCam(t);
    if (!final && t < this.tSnap) return this.whipCam(t);
    let c: Cam;
    if (final) c = { ...C_FINAL, tgt: { ...C_FINAL.tgt } };
    else c = lerpCam(this.whipCam(this.tSnap), C_FINAL, ease.outExpo(prog(t, this.tSnap, this.tSnap + SNAP_DUR)));
    if (t >= this.tSnap) {
      c.tgt.y -= 0.42 * this.overshoot(t);
      c.pitch += 0.9 * deg * this.overshoot(t);
      const s = ease.outCubic(prog(t, this.tSnap + 0.25, this.tSnap + 2.9));
      c.dist *= 1 - 0.04 * s;
      c.yaw += 1.4 * deg * s;
    }
    return c;
  }
  setCam(cam: THREE.PerspectiveCamera, vp: THREE.Matrix4, c: Cam) {
    const pos = {
      x: c.tgt.x + c.dist * Math.sin(c.yaw) * Math.cos(c.pitch),
      y: c.tgt.y + c.dist * Math.sin(c.pitch),
      z: c.tgt.z + c.dist * Math.cos(c.yaw) * Math.cos(c.pitch),
    };
    cam.fov = c.fov; cam.updateProjectionMatrix();
    cam.position.set(pos.x, pos.y, pos.z);
    cam.up.set(0, 1, 0);
    cam.lookAt(c.tgt.x, c.tgt.y, c.tgt.z);
    cam.updateMatrixWorld(true);
    vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    return pos;
  }
  projWith(cam: THREE.PerspectiveCamera, vp: THREE.Matrix4, p: P3): Proj | null {
    const v = this.v4.set(p.x, p.y, p.z, 1).applyMatrix4(vp);
    if (v.w <= 0.05) return null;
    const P11 = cam.projectionMatrix.elements[5]!;
    return { x: (v.x / v.w * 0.5 + 0.5) * W, y: (0.5 - v.y / v.w * 0.5) * H, s: (0.5 * H * P11) / v.w, w: v.w };
  }
  proj(p: P3) { return this.projWith(this.cam, this.vp, p); }
  sparkScreen(tb: number) {
    this.setCam(this.scratch, this.svp, this.camAt(tb));
    const q = this.projWith(this.scratch, this.svp, this.sparkPos(tb));
    return q ? { x: q.x, y: q.y } : null;
  }

  // ------------------------------------------------------------------ render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const cm = this.camAt(t);
    const cp = this.setCam(this.cam, this.vp, cm);
    this.camU.value.set(cp.x, cp.y, cp.z);
    this.fogU.value.set(cm.dist * 1.05, 17);

    const on = this.sheetOn(t);
    this.sheetMat.uniforms.on!.value = on;
    const lA = this.bowlMat.uniforms.lvlA!.value as number[];
    for (let i = 0; i < 4; i++) {
      const s = this.steps[i]! + 0.18;
      lA[i] = t < s ? 0 : (0.45 + 0.55 * Math.exp(-(t - s) / 0.25)) * (1 - 0.55 * prog(t, this.tSnap, this.tSnap + 0.5));
    }

    clearRT(renderer, out, LIN.ink);
    renderer.setRenderTarget(out);
    renderer.render(this.world, this.cam);

    this.drawLines(t, cp);
    this.lines.render(renderer, out, this.cam);
    this.glow.render(renderer, out, this.cam);

    this.L.clear();
    this.drawText(t, cm);
    comp.draw(renderer, this.L.upload(), out);

    this.drawSpark(t, f);
    this.fx.render(renderer, out);

    const launch = pulse(t, this.tPanic, 0.08), snap = pulse(t, this.tSnap, 0.07), land = pulse(t, this.tLand, 0.09);
    let stepP = 0;
    for (const s of this.steps) stepP = Math.max(stepP, pulse(t, s, 0.06));
    const sh = 5 * launch + 11 * snap + 5 * land + 2 * stepP;
    return {
      bloomThreshold: 1.0, bloomKnee: 0.05, bloom: 0.72, bloomRadius: 0.65, halation: 0.16,
      vignette: 0.44, grain: 0.055, hud: 0,
      ca: 1.0 + 0.25 * sh,
      shake: [noise1(t * 57, 1) * sh, noise1(t * 57, 2) * sh],
      zoom: 1 + 0.01 * stepP + 0.015 * land,
    };
  }

  sheetOn(t: number) { return prog(t, this.tLand - 0.02, this.tLand + 0.18, ease.outCubic); }

  // ------------------------------------------------------------------ 3D hairlines
  drawLines(t: number, cp: P3) {
    const lb = this.lines, gw = this.glow;
    lb.clear(); gw.clear();
    const fogS = this.fogU.value.x, fogL = this.fogU.value.y;
    const fogA = (p: P3) => Math.exp(-Math.max(0, Math.hypot(p.x - cp.x, p.y - cp.y, p.z - cp.z) - fogS) / fogL);
    const seg = (b: LineBatch, p: P3, q: P3, w: number, col: RGB, al: number) => {
      const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2, z: (p.z + q.z) / 2 };
      const a = al * fogA(m);
      if (a < 0.004) return;
      b.seg(p.x, p.y, p.z, q.x, q.y, q.z, w, col[0], col[1], col[2], a);
    };
    const dashed = (p: P3, q: P3, w: number, col: RGB, al: number, dash = 0.28, gap = 0.2) => {
      const L = Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
      for (let s = 0; s < L; s += dash + gap) {
        const a = s / L, b = Math.min(1, (s + dash) / L);
        seg(lb, lerp3(p, q, a), lerp3(p, q, b), w, col, al);
      }
    };
    const BONE = LIN.bone, ASH = LIN.ash;
    const T0 = this.T0;

    // axes draw out of the origin: n (x), n again (z), panic (y, the axis of symmetry)
    const ax = prog(t, T0 - 0.02, T0 + 0.45, ease.outExpo);
    const Y0 = 0.004;
    seg(lb, { x: 0, y: Y0, z: 0 }, { x: 11.5 * ax, y: Y0, z: 0 }, 1.5, BONE, 0.85);
    seg(lb, { x: 0, y: Y0, z: 0 }, { x: 0, y: Y0, z: 11.5 * ax }, 1.5, BONE, 0.85);
    const yTop = K * 125 * ax;
    seg(lb, { x: 0, y: 0, z: 0 }, { x: 0, y: yTop, z: 0 }, 1.3, BONE, 0.8);
    for (let i = 1; i <= 11; i++) {
      if (i > 11.5 * ax) break;
      seg(lb, { x: i, y: Y0, z: -0.14 }, { x: i, y: Y0, z: 0.14 }, 1.2, BONE, 0.7);
      seg(lb, { x: -0.14, y: Y0, z: i }, { x: 0.14, y: Y0, z: i }, 1.2, BONE, 0.7);
    }
    for (let p = 5; K * p < yTop; p += 5) {
      const y = K * p, L = p % 10 === 0 ? 0.3 : 0.17;
      seg(lb, { x: -L, y, z: 0 }, { x: L, y, z: 0 }, 1.1, BONE, 0.7);
      seg(lb, { x: 0, y, z: -L }, { x: 0, y, z: L }, 1.1, BONE, 0.7);
    }

    // the O(1) sheet: a dashed outline (a reference, like chorus 1's dashed line) until it lands
    const dim = prog(t, T0 + 0.1, T0 + 0.6) * (1 - this.sheetOn(t));
    if (dim > 0) {
      const c = [
        { x: SHEET.x0, y: YS, z: SHEET.z0 }, { x: SHEET.x1, y: YS, z: SHEET.z0 },
        { x: SHEET.x1, y: YS, z: SHEET.z1 }, { x: SHEET.x0, y: YS, z: SHEET.z1 },
      ];
      for (let i = 0; i < 4; i++) dashed(c[i]!, c[(i + 1) % 4]!, 1.2, ASH, 0.55 * dim, 0.36, 0.26);
      for (const p of c) dashed(p, { x: p.x, y: 0, z: p.z }, 1, ASH, 0.5 * dim, 0.06, 0.05);
    }
    // the sheet's corner legs once it is there (a raised plane, not a painted one)
    const on = this.sheetOn(t);
    if (on > 0) {
      for (const [x, z] of [[SHEET.x0, SHEET.z1], [SHEET.x1, SHEET.z1], [SHEET.x1, SHEET.z0], [SHEET.x0, SHEET.z0]] as const)
        seg(lb, { x, y: 0, z }, { x, y: YS, z }, 1.1, BONE, 0.6 * on);
    }

    // the cutaway's section edges: the profile of the surface, i.e. chorus 1's curve, twice
    const secA = prog(t, T0 - 0.02, T0 + 0.5, ease.outCubic);
    for (const sgn of [-1, 1]) {
      const a = CUT.a + sgn * CUT.h, ca = Math.cos(a), sa = Math.sin(a);
      let prev: P3 = { x: 0, y: 0, z: 0 };
      const rEnd = RM * secA;
      for (let i = 1; i <= 90; i++) {
        const r = (i / 90) * rEnd;
        const p = { x: r * ca, y: K * r * r, z: r * sa };
        seg(lb, prev, p, 1.8, BONE, 0.95);
        prev = p;
      }
    }

    // the n² curve the spark draws, up the far wall and off the rim (orange; cools after the snap)
    const cool = prog(t, this.tSnap + 0.05, this.tSnap + 0.6, ease.inOutQuad);
    const rH = Math.sqrt(this.panicAt(Math.min(t, this.tSnap)));
    if (rH > 0.002) {
      let prev = this.onCurve(0, 0.06);
      const n = Math.max(8, Math.ceil(rH * 60));
      for (let i = 1; i <= n; i++) {
        const r = (i / n) * rH;
        const p = this.onCurve(r, 0.06);
        if (cool < 1) {
          seg(gw, prev, p, 7, mul3(LIN.signal, 0.14 * (1 - cool)), 1);
          seg(gw, prev, p, 2.4, mul3(LIN.signal, 1.5 * (1 - cool)), 1);
          seg(gw, prev, p, 1.0, mul3(LIN.ember, 1.25 * (1 - cool)), 1);
        }
        if (cool > 0) seg(lb, prev, p, 2.0, mul3(LIN.signal, 0.5), 0.9 * cool); // a burnt-out trace, under the bloom
        prev = p;
      }
    }

    // the flat line on the sheet: lit from the landing, a front running back to the edge
    if (t >= this.tLand) {
      const x0 = lerp(XS, SHEET.x0 + 0.4, prog(t, this.tLand, this.tLand + 0.4, ease.outCubic));
      const I = 1 + 1.3 * pulse(t, this.tLand, 0.12);
      const a = { x: x0, y: YS + 0.012, z: ZR }, b = { x: XS, y: YS + 0.012, z: ZR };
      seg(gw, a, b, 7, mul3(LIN.signal, 0.11 * I), 1);
      seg(gw, a, b, 2.1, mul3(LIN.signal, 1.25 * I), 1);
      seg(gw, a, b, 0.9, mul3(LIN.ember, 1.1 * I), 1);
      dashed({ x: XS + 0.35, y: YS + 0.012, z: ZR }, { x: SHEET.x1 - 0.4, y: YS + 0.012, z: ZR }, 1.2, ASH, 0.6 * on, 0.22, 0.16);
    }
  }

  // ------------------------------------------------------------------ type
  drawText(t: number, cm: Cam) {
    const c = this.L.ctx;
    const T0 = this.T0;
    const post = t >= this.tSnap;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const fogS = this.fogU.value.x, fogL = this.fogU.value.y;
    const fogW = (w: number) => Math.exp(-Math.max(0, w - fogS) / fogL);

    // ---- axis labels (mono, flat to camera, constant size)
    const labA = prog(t, T0 + 0.15, T0 + 0.5) * (1 - this.sheetOn(t));
    if (labA > 0) {
      c.font = font(F.mono(400), 16);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 1; i <= 10; i++) {
        for (const [p, ok] of [[{ x: i, y: 0, z: 0.5 }, true], [{ x: 0.45, y: 0, z: i }, true]] as const) {
          if (!ok) continue;
          const q = this.proj(p);
          if (!q || q.x < 96 || q.x > 1824 || q.y > 1000 || q.y < 60) continue;
          c.fillStyle = rgba('ash', 0.85 * labA * fogW(q.w));
          c.fillText(String(i), q.x, q.y);
        }
      }
      // panic ticks on the axis of symmetry
      c.textAlign = 'right';
      for (let p = 10; p <= 120; p += 10) {
        const q = this.proj({ x: -0.4, y: K * p, z: 0 });
        if (!q || q.y < 60 || q.y > 1020 || q.x < 96) continue;
        c.fillStyle = rgba('ash', 0.85 * labA * fogW(q.w));
        c.fillText(String(p), q.x - 4, q.y);
      }
      c.font = font(F.mono(500), 18);
      const title = (p: P3, s: string, al: CanvasTextAlign, dx = 0, dy = 0, hot = false) => {
        const q = this.proj(p);
        if (!q) return;
        const x = q.x + dx, y = q.y + dy;
        if (x < 96 || x > 1824 || y < 80 || y > 990) return;
        c.textAlign = al;
        c.fillStyle = hot ? rgba('signal', 1) : rgba('bone', 0.85 * labA * fogW(q.w));
        c.fillText(s, x, y);
      };
      title({ x: 11.6, y: 0, z: 0 }, 'n (assignments due) →', 'left', 10, 22);
      title({ x: 0, y: 0, z: 11.6 }, 'n (assignments due, again) →', 'right', -14, 26);
      const pk = Lyrics.wordProgress(this.wPanic, t);
      title({ x: 0, y: K * 44, z: 0 }, 'panic ↑', 'right', -16, 0, pk > 0 && pk < 1);
      // the dashed sheet's label, before it lands
      const oA = prog(t, T0 + 0.35, T0 + 0.7) * (1 - this.sheetOn(t));
      const qo = this.proj({ x: SHEET.x1, y: YS, z: SHEET.z1 });
      if (oA > 0 && qo && qo.x > 190 && qo.x < 1824 && qo.y > 90 && qo.y < 990) {
        mathLabel(c, qo.x - 90, qo.y - 14, 34, '1', rgba('ash', 0.85 * oA * fogW(qo.w)));
      }
    }

    // ---- data values at the steps (n² at each)
    c.font = font(F.mono(500), 16);
    c.textAlign = 'left'; c.textBaseline = 'bottom';
    for (let i = 0; i < 4; i++) {
      const k = prog(t, this.steps[i]! + 0.1, this.steps[i]! + 0.22) * (1 - prog(t, this.tPanic + 0.1, this.tPanic + 0.3));
      if (k <= 0) continue;
      const n = i + 1;
      const q = this.proj(this.onCurve(n));
      if (!q) continue;
      c.strokeStyle = rgba('bone', 0.9 * k); c.lineWidth = 1.3;
      c.beginPath(); c.arc(q.x, q.y, 5.5 * ease.outBack(k), 0, TAU); c.stroke();
      c.fillStyle = rgba('ash', k);
      c.fillText(String(n * n), q.x + 12, q.y - 6);
    }

    // ---- the hero label O(n²), flat to camera, anchored in the world above the left rim
    this.drawHero(c, t);

    // ---- "panic," (screen): slammed, stretched by the whip, left behind at the top
    const wp = this.wPanic;
    if (t >= wp.start) {
      const e = t - wp.start;
      const fam = F.archivo(125, 900), size = 188;
      const lay = layout(wp.w, fam, size, -2);
      const exitK = prog(t, this.tExit, this.tExit + 0.34, ease.inCubic);
      const v = this.whipSpeed(t);
      const stretch = 1 + 0.5 * v;
      const x0 = 1790 - lay.width, base = 930 - exitK * 1300;
      const slam = 1 + 0.22 * Math.exp(-e / 0.06);
      const sung = Lyrics.wordProgress(wp, t);
      c.font = font(fam, size); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      for (const g of lay.glyphs) {
        if (g.ch === ' ') continue;
        const lit = sung * lay.glyphs.length - g.i;
        c.save();
        c.translate(x0 + g.x * slam, base + g.i * 10 * v);
        c.scale(slam, slam * stretch);
        c.fillStyle = t < wp.end + 0.05 ? rgba('signal', lit > 0 ? 1 : 0.55) : rgba('bone', 1);
        c.fillText(g.ch, 0, 0);
        c.restore();
      }
    }

    // ---- the laid lyric on the sheet (projected with the final framing: the words wait there)
    this.setCam(this.scratch, this.svp, this.camAt(t, true));
    const P = (p: P3) => this.projWith(this.scratch, this.svp, p);
    for (const rw of this.rowWords) {
      const w = rw.w;
      const vis = prog(t, w.start - 0.4, w.start - 0.1);
      const gate = w === this.wBut ? 1 : prog(t, this.tSnap, this.tSnap + 0.12);
      const a = vis * gate;
      if (a <= 0) continue;
      const sung = t >= w.start, hot = sung && t < w.end;
      const e = t - w.start;
      const lift = sung ? 0.3 * Math.exp(-e / 0.09) * Math.cos(e * 24) * (e < 0.02 ? e / 0.02 : 1) : 0.18;
      c.fillStyle = hot ? rgba('signal', 1) : sung ? rgba('bone', 1) : rgba('bone', 0.34 * a);
      for (let i = rw.i0; i < rw.i1; i++) {
        const g = this.row.glyphs[i]!;
        this.laidGlyph(c, P, g.ch, this.famRow, { x: this.rowX0 + (g.x / 100) * ROW_S, y: YS + 0.01 + lift, z: ZR - 0.05 }, ROW_S);
      }
    }
    // superscript ¹
    const fine = this.rowWords[this.rowWords.length - 1]!;
    const supK = prog(t, fine.w.start + 0.22, fine.w.start + 0.4, ease.outBack);
    if (supK > 0) {
      const g = this.row.glyphs[fine.i1 - 1]!;
      const x = this.rowX0 + ((g.x + g.w) / 100) * ROW_S + 0.03;
      c.fillStyle = rgba('signal', 1);
      this.laidGlyph(c, P, '1', F.archivo(100, 500), { x, y: YS + 0.01, z: ZR - 0.05 - 0.36 * ROW_S }, 0.42 * ROW_S * supK);
    }
    // O(1), laid on the sheet past the spark
    const oA = prog(t, this.tLand, this.tLand + 0.25, ease.outCubic);
    if (oA > 0) {
      const o = { x: XS + 0.55, y: YS + 0.01, z: ZR - 0.12 };
      const m = this.planeAffine(P, o, 0.95);
      if (m) {
        c.save();
        c.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
        c.globalAlpha = oA;
        mathLabel(c, 0, 0, 100, '1', rgba('bone', 1));
        c.restore();
      }
    }
    // footnote (page voice, flat)
    const fnT0 = fine.w.start + 0.3;
    const note = 'amortized, allegedly';
    if (t >= fnT0) {
      const nCh = Math.floor(clamp((t - fnT0) / 0.45) * note.length);
      const x = 150, y = 978;
      c.save();
      c.strokeStyle = rgba('graphite', 1); c.lineWidth = 1;
      c.beginPath(); c.moveTo(x, y - 38); c.lineTo(x + 100 * prog(t, fnT0 - 0.1, fnT0 + 0.1, ease.outCubic), y - 38); c.stroke();
      c.textAlign = 'left'; c.textBaseline = 'alphabetic';
      c.font = font(F.mono(500), 15); c.fillStyle = rgba('signal', 1); c.fillText('1', x, y - 10);
      c.font = font(F.mono(400), 24); c.fillStyle = rgba('bone', 0.82); c.fillText(note.slice(0, nCh), x + 14, y);
      c.restore();
    }

    // readout riding the spark
    const tagA = prog(t, this.steps[0]! - 0.05, this.steps[0]! + 0.1) * (1 - prog(t, this.tSnap - 0.02, this.tSnap + 0.04));
    if (tagA > 0) {
      const q = this.proj(this.sparkPos(t));
      if (q && q.y > 40 && q.y < 1040 && q.x < 1700) {
        c.font = font(F.mono(500), 18);
        c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillStyle = rgba('ember', 0.95 * tagA);
        c.fillText(`panic = ${this.panicAt(t).toFixed(1)}`, q.x + 26, q.y - 24);
      }
    }
    void cm; void post;
  }

  /** Affine (canvas setTransform) mapping size-100 text coordinates onto the sheet at world point o. */
  planeAffine(P: (p: P3) => Proj | null, o: P3, size: number): [number, number, number, number, number, number] | null {
    const p0 = P(o), px = P({ x: o.x + size, y: o.y, z: o.z }), pu = P({ x: o.x, y: o.y, z: o.z - size });
    if (!p0 || !px || !pu) return null;
    return [(px.x - p0.x) / 100, (px.y - p0.y) / 100, -(pu.x - p0.x) / 100, -(pu.y - p0.y) / 100, p0.x, p0.y];
  }
  laidGlyph(c: CanvasRenderingContext2D, P: (p: P3) => Proj | null, ch: string, fam: string, o: P3, size: number) {
    const m = this.planeAffine(P, o, size);
    if (!m) return;
    c.save();
    c.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    c.font = font(fam, 100);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText(ch, 0, 0);
    c.restore();
  }

  /** World point seen at screen (x, y) at distance d from the camera framing c. */
  unproject(c: Cam, x: number, y: number, d: number): P3 {
    const pos = this.setCam(this.scratch, this.svp, c);
    const v = new THREE.Vector3((x / W) * 2 - 1, 1 - (y / H) * 2, 0.5).unproject(this.scratch);
    const dir = v.sub(this.scratch.position).normalize();
    return { x: pos.x + dir.x * d, y: pos.y + dir.y * d, z: pos.z + dir.z * d };
  }
  heroAnchor(t: number): P3 { return t < this.tSnap ? this.heroA1 : this.heroA2; }
  drawHero(c: CanvasRenderingContext2D, t: number) {
    const q = this.proj(this.heroAnchor(t));
    if (!q || q.y < -400 || q.y > 1500) return;
    const appear = prog(t, this.T0 + 0.02, this.T0 + 0.3);
    if (appear <= 0) return;
    const sz = 1.9 * q.s;
    const post = t >= this.tSnap;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    for (const pc of this.hero) {
      const w = pc.word;
      const sung = t >= w.start;
      const hot = sung && t < Math.max(w.end, w.start + 0.25) && t < this.tPanic + 0.05;
      const e = sung ? t - w.start : 0;
      const pop = sung ? 1 + 0.18 * Math.exp(-e / 0.07) * (1 - Math.exp(-e / 0.012)) : 1;
      const s = sz * pc.s * pop;
      const gw0 = (sz * pc.s) * 0.5;
      const gx = q.x + (pc.x / 100) * sz, gy = q.y + (pc.dy / 100) * sz;
      c.fillStyle = !sung ? rgba('bone', 0.26 * appear) : hot ? rgba('signal', 1) : rgba('bone', post ? 0.6 : 0.96);
      c.font = font(pc.fam, s);
      c.fillText(pc.txt, gx - (pop - 1) * gw0 * 0.5, gy + (pop - 1) * sz * pc.s * 0.3);
    }
  }

  whipSpeed(t: number) {
    const a = this.camAt(t - 0.01).tgt.y, b = this.camAt(t + 0.01).tgt.y;
    return clamp(Math.abs(b - a) / 0.02 / 60);
  }

  // ------------------------------------------------------------------ the spark
  drawSpark(t: number, f: Frame) {
    const g = this.fx; g.clear();
    const q = this.proj(this.sparkPos(t));
    const rate = (tb: number) => (tb < this.tPanic ? 70 : tb < this.tArr ? 220 : tb < this.tSnap ? 90 : tb < this.tLand + 0.25 ? 260 : 18);
    sparkParticles(g, t, (tb) => (tb < this.T0 ? null : this.sparkScreen(tb)), { rate, rateMax: 260, speed: 230, life: 0.42, seed: 17, intensity: 1.0 });
    if (!q) return;
    const e = t - this.tLand;
    if (e > 0 && e < 0.5) {
      for (let i = 0; i < 26; i++) {
        const dir = hash(i, 7) < 0.5 ? -1 : 1;
        const sp0 = 380 + 900 * hash(i, 8) ** 2;
        const life = 0.18 + 0.3 * hash(i, 9);
        if (e > life) continue;
        const k = 1 - e / life;
        const at = (tt: number) => ({ x: q.x + dir * sp0 * (1 - Math.exp(-tt * 6)) / 6, y: q.y - (60 + 160 * hash(i, 10)) * tt + 520 * tt * tt });
        const a = at(Math.max(0, e - 0.02)), b = at(e);
        g.seg2(a.x, a.y, b.x, b.y, 1.6 * k + 0.4, mul3(LIN.ember, 2.2 * k), Math.min(1, k * 1.5));
      }
    }
    const rest = prog(t, this.tLand, this.tLand + 0.4);
    const breathe = 1 + rest * (0.08 * Math.sin((t - this.tLand) * 3.1) + 0.18 * f.a.kick);
    const sc = clamp(q.s / 95, 1.05, 1.6) * breathe + 0.9 * pulse(t, this.tLand, 0.1);
    const appear = prog(t, this.T0 - 0.02, this.T0 + 0.12);
    sparkHead(g, q.x, q.y, t, sc * appear, 1.35 * appear);
  }
}
