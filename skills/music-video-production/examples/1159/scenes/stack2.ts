// 11:59 `stack2` — "Coffee in my veins and a stack I can't unwind", the second time: the call stack of
// FIG. 2 rebuilt as a 3D tower of hatched slabs on bone paper (the light plate between two ink plates).
// The stack never unwound: chorus 1's frames are still on it as compact caller frames, two deeper
// (depth 12 at the cut). Every kick drops a new frame onto the tower from above and it lands on the
// kick (coffee(), coffee(), proof_by_induction(n+1), …, the same labels, the shots still counting). The
// words are stamped onto the front faces as they are sung (faint print → orange slam → ink). The stack
// pointer (an orange 3D arrow and the spark) rides the top. The camera orbits the tower and whips round
// on the downbeat; "stack" gets its own move: a crane up past the top, the lens widening so the tower
// plunges away underneath. "unwind": pop() is attempted, the top slab lifts and strains, the tower
// sways, the pop is refused (slams back on the next kick) and the error stamp lands on the top face:
// RecursionError: maximum caffeine depth exceeded (again)¹, then the footnote.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { type Line, type Word, norm } from '../../engine/lyrics';
import { F, font, measure } from '../../engine/type';
import { LIN, rgba } from '../../engine/palette';
import { clamp, ease, hash, lerp, noise2, prog, pulse, TAU, frameIdx } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { BASE, PUSHED, WORD_BASE, WORD_FAMILY, WORD_SIZE, steamXY } from './stack';
import { buildAtlas, buildStamp, FACE_W, CUP_AT, type FaceDef } from './stack2-atlas';
import { PAPER_BG, VERT, PAGE_FRAG, SLAB_FRAG, STAMP_FRAG, MAX_SH, MAX_W } from './stack2-glsl';

const INK = (a = 1) => rgba('ink', a);
const OR = (a = 1) => rgba('signal', a);

// ---- the tower (world units; the floor is y = 0, the front faces look down +z)
const SW = 7.8, SD = 3.0;             // slab width and depth
const H_OLD = 0.56, H_NEW = 1.28;     // caller frames / pushed frames (the 2D plate's 56 / 128 px)
const PX = SW / FACE_W;               // world units per face px
const DROP = 0.09, DROP_H = 2.6;      // a pushed frame falls this long, from this high, and lands on the kick
const LIGHT = new THREE.Vector3(-0.55, 0.72, 0.42).normalize();

// chorus 1's frames are still on the stack, plus the two the night added since
const CALLERS: [string, string][] = [
  ...BASE, ...PUSHED,
  ['refresh_portal()', 'count = 9'],
  ['canteen_at_2am()', 'open = False'],
];
// the same frames get pushed again; the shots keep counting
let shotN = 4;
const AGAIN: [string, string][] = PUSHED.map(([l, v]) => {
  if (l !== 'coffee()') return [l, v];
  shotN++;
  return [l, shotN === 8 ? 'shot = 8  # max 4' : `shot = ${shotN}`];
});

interface WordSlot { w: Word; x: number; wpx: number }
interface Slab {
  label: string; local: string; caller: boolean; coffee: boolean;
  h: number; y0: number;       // height and resting bottom
  t: number;                   // landing time (-Infinity for the callers)
  words: WordSlot[];
  addr: string;
  mesh: THREE.Mesh; mat: THREE.RawShaderMaterial;
  m: THREE.Matrix4;            // current world matrix
}
interface CS { tx: number; ty: number; tz: number; yaw: number; pitch: number; dist: number; fov: number; roll: number }
type Step = { t: number; w: number; d: Partial<CS> };
const KEYS: (keyof CS)[] = ['tx', 'ty', 'tz', 'yaw', 'pitch', 'dist', 'fov', 'roll'];

export default class Stack2 extends Scene {
  cam = new THREE.PerspectiveCamera(28, W / H, 0.1, 400);
  world = new THREE.Scene();
  bg = new FSPass(PAPER_BG, { drift: { value: new THREE.Vector2() } });
  over = new Layer2D();
  ink3 = new LineBatch(3000, { screen2D: false, blend: 'normal' });
  or3 = new LineBatch(200, { screen2D: false, blend: 'normal' });
  glow = new LineBatch(600);
  dots = new LineBatch(3000, { blend: 'normal' });
  slabs: Slab[] = [];
  page!: THREE.Mesh;
  pageMat!: THREE.RawShaderMaterial;
  stamp!: THREE.Mesh;
  stampMat!: THREE.RawShaderMaterial;
  shU = {
    shInv: { value: Array.from({ length: MAX_SH }, () => new THREE.Matrix4()) },
    shHalf: { value: Array.from({ length: MAX_SH }, () => new THREE.Vector3(1, 1, 1)) },
    shOn: { value: new Array(MAX_SH).fill(0) as number[] },
    lightDir: { value: LIGHT.clone() },
  };
  camU = { value: new THREE.Vector3() };
  fogU = { value: new THREE.Vector2(20, 30) };

  line!: Line;
  kicks: number[] = [];
  pushes: number[] = [];
  tStack = 0; tPop = 0; tErr = 0; tFoot = 0; tWhip = 0;
  wStack!: Word;
  steps: Step[] = [];
  cs0!: CS;
  nOld = CALLERS.length;
  topOld = CALLERS.length * H_OLD;

  override async init() {
    const { lyrics, audio, start, end } = this.ctx;
    const nth = this.ctx.params?.n ?? 1;
    this.line = lyrics.get('Coffee in my veins', nth);
    const words = this.line.words;
    const find = (q: string) => words.find((w) => norm(w.w) === norm(q)) ?? words[words.length - 1]!;
    const wUnwind = find('unwind');
    this.wStack = find('stack');
    this.tStack = this.wStack.start;
    this.tPop = wUnwind.start;

    // ---- the kicks: every beat, at its detected kick when there is one (the detector drops some)
    const det = audio.events('kick', start - 0.2, end + 0.2).map((k) => k[0]);
    const beats: number[] = [];
    for (let b = Math.ceil(audio.beatAt(start - 0.1)); audio.timeOfBeat(b) < end - 0.02; b++) beats.push(audio.timeOfBeat(b));
    const offs = beats.map((b) => det.find((k) => Math.abs(k - b) < 0.09)).map((k, i) => (k === undefined ? null : k - beats[i]!)).filter((x): x is number => x !== null).sort((a, b) => a - b);
    const off = offs.length ? offs[Math.floor(offs.length / 2)]! : 0;
    this.kicks = beats.map((b) => det.find((k) => Math.abs(k - b) < 0.09) ?? b + off);
    // a frame lands on every kick until the pop (the first one right on the cut); the refused pop
    // slams back on the next kick
    this.pushes = this.kicks.filter((k) => k >= start - 0.07 && k < this.tPop - 0.05).map((k) => Math.max(k, start + 1 / 60));
    this.tErr = this.kicks.find((k) => k > this.tPop + 0.12) ?? this.tPop + 0.26;
    this.tFoot = Math.min(this.tErr + 0.12, end - 0.3);
    this.tWhip = audio.downbeats.find((d) => d > (this.pushes[1] ?? start) + 0.1 && d < this.tStack - 0.3) ?? lerp(start, this.tStack, 0.4);

    // ---- the slabs
    const faces: FaceDef[] = [];
    let y = 0, addr = 0x7ffe4000;
    CALLERS.forEach(([label, local], i) => {
      this.slabs.push({ label, local, caller: true, coffee: false, h: H_OLD, y0: y, t: -Infinity, words: [], addr: `0x${addr.toString(16)}`, mesh: null!, mat: null!, m: new THREE.Matrix4() });
      y += H_OLD; addr -= 0x40 + 0x10 * Math.floor(hash(i, 3) * 4);
    });
    this.pushes.forEach((t, i) => {
      const [label, local] = AGAIN[i] ?? ['coffee()', `shot = ${9 + i}`];
      this.slabs.push({ label, local, caller: false, coffee: label === 'coffee()', h: H_NEW, y0: y, t, words: [], addr: `0x${addr.toString(16)}`, mesh: null!, mat: null!, m: new THREE.Matrix4() });
      y += H_NEW; addr -= 0x30 + 0x10 * Math.floor(hash(i, 5) * 6);
    });
    const pushed = this.slabs.filter((s) => !s.caller);
    for (const w of words) {
      let s = pushed[0]!;
      for (const p of pushed) if (p.t <= w.start + 0.03) s = p;
      s.words.push({ w, x: 0, wpx: 0 });
    }
    const space = measure(' ', WORD_FAMILY, WORD_SIZE) * 1.15;
    for (const s of pushed) {
      let x = 30;
      for (const ws of s.words) { ws.x = x; ws.wpx = measure(ws.w.w, WORD_FAMILY, WORD_SIZE); x += ws.wpx + space; }
    }
    for (const s of this.slabs) faces.push({
      label: s.label, local: s.local, caller: s.caller, coffee: s.coffee, hPx: s.h / PX,
      words: s.words.map((ws) => ({ text: ws.w.w, x: ws.x, w: ws.wpx })),
    });
    const { tex: atlas, cells } = buildAtlas(faces);
    const geoOld = new THREE.BoxGeometry(SW, H_OLD, SD), geoNew = new THREE.BoxGeometry(SW, H_NEW, SD);
    this.slabs.forEach((s, i) => {
      const hPx = s.h / PX;
      const rects = Array.from({ length: MAX_W }, (_, j) => {
        const ws = s.words[j];
        if (!ws) return new THREE.Vector4(0, 0, 0, 0);
        return new THREE.Vector4((ws.x - 8) / FACE_W, (WORD_BASE - WORD_SIZE * 0.95) / hPx, (ws.x + ws.wpx + 8) / FACE_W, Math.min(1, (WORD_BASE + WORD_SIZE * 0.3) / hPx));
      });
      const c = cells[i]!;
      const mat = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: VERT, fragmentShader: SLAB_FRAG,
        uniforms: {
          half3: { value: new THREE.Vector3(SW / 2, s.h / 2, SD / 2) },
          camPos: this.camU, fog: this.fogU, edgeW: { value: 1.5 },
          atlas: { value: atlas }, cell: { value: new THREE.Vector4(c.u0, c.v0, c.u1, c.v1) },
          caller: { value: s.caller ? 1 : 0 }, seed: { value: i * 1.37 },
          wRect: { value: rects },
          wState: { value: Array.from({ length: MAX_W }, () => new THREE.Vector4()) },
        },
      });
      const mesh = new THREE.Mesh(s.caller ? geoOld : geoNew, mat);
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false;
      this.world.add(mesh);
      s.mesh = mesh; s.mat = mat;
    });

    this.buildPage();
    const st = buildStamp(noise2);
    this.stampMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: STAMP_FRAG,
      uniforms: { tex: { value: st.tex }, on: { value: 0 } },
      depthTest: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor,
    });
    const sw = SW * 0.9;
    const sg = new THREE.PlaneGeometry(sw, sw / st.aspect);
    sg.rotateX(-Math.PI / 2);
    this.stamp = new THREE.Mesh(sg, this.stampMat);
    this.stamp.matrixAutoUpdate = false;
    this.stamp.frustumCulled = false;
    this.stamp.renderOrder = 2;
    this.world.add(this.stamp);

    this.buildCamera();
  }

  buildPage() {
    const PR = { x0: -9, z0: -6, x1: 9, z1: 7, ppu: 90 };
    const pw = Math.round((PR.x1 - PR.x0) * PR.ppu), ph = Math.round((PR.z1 - PR.z0) * PR.ppu);
    const cv = document.createElement('canvas');
    cv.width = pw; cv.height = ph;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#000'; c.fillRect(0, 0, pw, ph);
    const X = (x: number) => (x - PR.x0) * PR.ppu, Z = (z: number) => (z - PR.z0) * PR.ppu;
    c.strokeStyle = '#fff'; c.fillStyle = '#fff';
    // the footprint (dashed, a little proud of the tower) and the floor line along the front
    c.lineWidth = 2; c.setLineDash([10, 9]);
    c.strokeRect(X(-SW / 2 - 0.25), Z(-SD / 2 - 0.25), (SW + 0.5) * PR.ppu, (SD + 0.5) * PR.ppu);
    c.setLineDash([]);
    c.lineWidth = 3;
    c.beginPath(); c.moveTo(X(-SW / 2 - 1.2), Z(SD / 2)); c.lineTo(X(SW / 2 + 1.2), Z(SD / 2)); c.stroke();
    // hatched ground strip in front of the floor line
    c.lineWidth = 1.4;
    c.beginPath();
    for (let x = -SW / 2 - 1.2; x < SW / 2 + 1.2; x += 0.16) { c.moveTo(X(x), Z(SD / 2)); c.lineTo(X(x - 0.18), Z(SD / 2 + 0.2)); }
    c.stroke();
    // the rule the caption sits under
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(X(-SW / 2), Z(SD / 2 + 0.75)); c.lineTo(X(SW / 2), Z(SD / 2 + 0.75)); c.stroke();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 8;
    this.pageMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: PAGE_FRAG,
      uniforms: { ...this.shU, printTex: { value: tex }, printRect: { value: new THREE.Vector4(PR.x0, PR.z0, PR.x1, PR.z1) }, camPos: this.camU, fog: this.fogU },
      depthWrite: true, depthTest: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor,
    });
    const pg = new THREE.PlaneGeometry(160, 160);
    pg.rotateX(-Math.PI / 2);
    this.page = new THREE.Mesh(pg, this.pageMat);
    this.page.frustumCulled = false;
    this.page.renderOrder = 1;
    this.world.add(this.page);
  }

  // ------------------------------------------------------------------ camera
  buildCamera() {
    this.cs0 = { tx: 0.6, ty: 5.3, tz: 0, yaw: -0.55, pitch: 0.2, dist: 23, fov: 28, roll: -0.012 };
    const S = this.steps;
    // each landing: the camera rises a frame with the top (and pushes in while the tower is still short)
    this.pushes.forEach((p, i) => {
      if (i === 0) return;
      S.push({ t: p - 0.02, w: 11, d: { ty: H_NEW, dist: i <= 3 ? -0.9 : 0 } });
    });
    // the downbeat: whip round to the other side of the tower
    S.push({ t: this.tWhip - 0.03, w: 13, d: { yaw: 0.98, tx: -0.8, roll: 0.024 } });
    // "stack": crane up past the top and look down it; the lens widens so the tower plunges away
    S.push({ t: this.tStack - 0.02, w: 8.5, d: { pitch: 0.46, ty: 1.6, fov: 14, dist: -7.5, roll: -0.03, yaw: -0.22 } });
    // "unwind": in on the pop
    S.push({ t: this.tPop, w: 7, d: { dist: -1.2, ty: 0.35, tx: 1.5 } });
    // the refusal: look down onto the stamp
    S.push({ t: this.tErr - 0.02, w: 9, d: { pitch: 0.14, ty: 0.25, dist: -0.6 } });
  }

  camState(t: number): CS {
    const st: CS = { ...this.cs0 };
    for (const s of this.steps) {
      const u = t - s.t;
      if (u <= 0) continue;
      const r = 1 - (1 + s.w * u) * Math.exp(-s.w * u);
      for (const k of KEYS) { const d = s.d[k]; if (d) st[k] += d * r; }
    }
    const s = t - this.ctx.start;
    st.yaw += 0.07 * s;
    st.dist -= 0.35 * s;
    let kp = 0;
    for (const k of this.kicks) kp = Math.max(kp, pulse(t, k, 0.07));
    st.dist *= 1 - 0.012 * kp;
    st.dist *= 1 - 0.05 * prog(t, this.tErr - 0.01, this.tErr + 0.3, ease.outExpo);
    return st;
  }

  applyCam(t: number) {
    const s = this.camState(t);
    const cam = this.cam;
    cam.fov = s.fov;
    const cp = Math.cos(s.pitch);
    cam.position.set(s.tx + Math.sin(s.yaw) * cp * s.dist, s.ty + Math.sin(s.pitch) * s.dist, s.tz + Math.cos(s.yaw) * cp * s.dist);
    cam.up.set(0, 1, 0);
    cam.lookAt(s.tx, s.ty, s.tz);
    cam.rotateZ(s.roll);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return s;
  }
  proj(v: THREE.Vector3) {
    const p = v.clone().project(this.cam);
    return { x: (p.x * 0.5 + 0.5) * W, y: (0.5 - p.y * 0.5) * H, z: p.z };
  }

  // ------------------------------------------------------------------ the tower at t
  topRest(t: number) {
    let y = this.topOld;
    for (const p of this.pushes) if (p <= t) y += H_NEW;
    return y;
  }
  /** The stack pointer's height: rises to meet each frame as it lands; lifts with the pop. */
  spY(t: number) {
    let y = this.topOld;
    for (const p of this.pushes) y += H_NEW * prog(t, p - 0.03, p + 0.12, ease.outExpo);
    return y + this.lift(t);
  }
  lift(t: number) {
    if (t < this.tPop) return 0;
    const up = 0.55 * prog(t, this.tPop, this.tPop + 0.16, ease.outCubic);
    const strain = t < this.tErr ? 0.022 * (hash(frameIdx(t), 7) - 0.5) * prog(t, this.tPop + 0.1, this.tPop + 0.2) : 0;
    const back = prog(t, this.tErr - 0.045, this.tErr, ease.inQuad);
    return (up + strain) * (1 - back);
  }
  /** Lean of the tower (radians at the floor): builds while the pop strains, rings out after the slam. */
  sway(t: number) {
    // continuous through the slam (a jump here would ghost the whole tower in the motion blur)
    let a = 0;
    if (t > this.tPop && t < this.tErr) a += 0.009 * Math.sin(TAU * 2.4 * (t - this.tPop)) * prog(t, this.tPop, this.tPop + 0.25) * (1 - prog(t, this.tErr - 0.08, this.tErr, ease.inOutQuad));
    if (t >= this.tErr) {
      const u = t - this.tErr;
      a += 0.02 * Math.exp(-u / 0.32) * Math.sin(TAU * 3.1 * u);
    }
    return a;
  }
  impact(t: number) {
    let v = 0;
    for (const p of [...this.pushes, this.tErr]) {
      const u = t - p;
      if (u >= 0 && u < 0.4) v += Math.exp(-u / 0.05) * Math.cos(TAU * 7 * u);
    }
    return v;
  }
  topIndex(t: number) {
    let i = this.nOld - 1;
    this.slabs.forEach((s, j) => { if (!s.caller && t >= s.t - DROP) i = j; });
    return i;
  }
  /** World matrix of slab i at t (null while it is not in the picture yet). */
  pose(i: number, t: number, into: THREE.Matrix4): THREE.Matrix4 | null {
    const s = this.slabs[i]!;
    if (t < s.t - DROP) return null;
    const top = this.topRest(t);
    let yc = s.y0 + s.h / 2;
    let twist = 0;
    if (!s.caller) {
      const k = prog(t, s.t - DROP, s.t, ease.inQuad);
      yc += (1 - k) * DROP_H;
      twist = (1 - k) * 0.07 * (hash(i, 9) - 0.5) * 2;
    }
    if (t >= s.t) yc -= 0.045 * this.impact(t) * clamp(yc / Math.max(1, top));
    if (i === this.slabs.length - 1) yc += this.lift(t);
    const th = this.sway(t);
    const v = 1 + 0.25 * Math.sin(i * 1.7);
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.35 * th + twist, -th * v));
    into.compose(new THREE.Vector3(th * yc, yc, 0), q, new THREE.Vector3(1, 1, 1));
    return into;
  }

  // ------------------------------------------------------------------ render
  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer } = this.ctx;
    const t = f.t;
    const cs = this.applyCam(t);
    this.camU.value.copy(this.cam.position);
    this.fogU.value.set(cs.dist * 0.95, cs.dist * 1.25);

    // slabs and their faces
    const iTop = this.topIndex(t);
    for (let i = 0; i < this.slabs.length; i++) {
      const s = this.slabs[i]!;
      const m = this.pose(i, t, s.m);
      s.mesh.visible = !!m;
      if (!m) continue;
      s.mesh.matrix.copy(m);
      s.mesh.matrixWorld.copy(m);
      const ws = s.mat.uniforms.wState!.value as THREE.Vector4[];
      for (let j = 0; j < MAX_W; j++) {
        const slot = s.words[j];
        if (!slot) { ws[j]!.set(0, 0, 0, 1); continue; }
        const w = slot.w;
        const big = w === this.wStack ? 1.55 : 1.22;
        const k = prog(t, w.start, w.start + (w === this.wStack ? 0.09 : 0.065), ease.outCubic);
        const o = 1 - prog(t, w.end + 0.02, w.end + 0.1);
        ws[j]!.set(1, t >= w.start ? Math.max(k, 1e-3) : 0, o, lerp(big, 1, k));
      }
    }
    // shadows on the page: the body, the top slab, and a falling one
    {
      const sh = this.shU;
      let nb = 0;
      const body = this.slabs.filter((s, i) => i < iTop && t >= s.t);
      const bodyTop = body.length ? Math.max(...body.map((s) => s.y0 + s.h)) : 0;
      sh.shInv.value[0]!.makeTranslation(0, -bodyTop / 2, 0);
      sh.shHalf.value[0]!.set(SW / 2, bodyTop / 2, SD / 2);
      sh.shOn.value[0] = bodyTop > 0 ? 1 : 0;
      nb = 1;
      for (const i of [iTop]) {
        const s = this.slabs[i]!;
        if (!s.mesh.visible) continue;
        sh.shInv.value[nb]!.copy(s.m).invert();
        sh.shHalf.value[nb]!.set(SW / 2, s.h / 2, SD / 2);
        sh.shOn.value[nb] = 1;
        nb++;
      }
      for (; nb < MAX_SH; nb++) sh.shOn.value[nb] = 0;
    }
    // the error stamp on the top face
    {
      const s = this.slabs[this.slabs.length - 1]!;
      const on = t >= this.tErr;
      this.stamp.visible = on;
      if (on) {
        const k = prog(t, this.tErr, this.tErr + 0.06, ease.outCubic);
        const sc = lerp(1.14, 1, k);
        const local = new THREE.Matrix4().compose(new THREE.Vector3(0.1, s.h / 2 + 0.003, 0.05), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.045, 0)), new THREE.Vector3(sc, 1, sc));
        this.stamp.matrix.copy(s.m).multiply(local);
        this.stamp.matrixWorld.copy(this.stamp.matrix);
        this.stampMat.uniforms.on!.value = 1;
      }
    }

    // paper, then the tower
    (this.bg.u.drift!.value as THREE.Vector2).set(cs.yaw * 260, -cs.ty * 30);
    this.bg.render(renderer, out);
    renderer.setRenderTarget(out);
    renderer.clearDepth();
    renderer.render(this.world, this.cam);

    // ink lines in 3D: the steam over the cups, the landing ticks
    this.drawInk3(t, out);
    // the stack pointer arrow
    this.drawSP3(t, out);
    // annotations flat to camera (multiplied like print)
    this.drawOverlay(t);
    this.ctx.comp.draw(renderer, this.over.upload(), out, { mode: 'multiply', premult: false });
    // the spark
    this.drawSpark(t, f, out);

    const amp = 12 * pulse(t, this.tErr, 0.07) + 5 * pulse(t, this.tStack, 0.06) + 2.2 * Math.max(0, ...this.pushes.map((p) => pulse(t, p, 0.04)));
    const fi = frameIdx(t);
    return {
      paper: 1, hud: 0,
      bloom: 0.22, bloomThreshold: 1.8, bloomKnee: 0.4, halation: 0.03,
      vignette: 0.14, grain: 0.042, ca: 0.35,
      zoom: 1 + 0.02 * pulse(t, this.tErr, 0.08),
      shake: [amp * (hash(fi, 11) - 0.5) * 2, amp * (hash(fi, 12) - 0.5) * 2],
    };
  }

  /** A point on slab i's front face, given in face px from its top left. */
  facePoint(i: number, fx: number, fy: number, dz = 0.004) {
    const s = this.slabs[i]!;
    return new THREE.Vector3(-SW / 2 + fx * PX, s.h / 2 - fy * PX, SD / 2 + dz).applyMatrix4(s.m);
  }

  drawInk3(t: number, out: THREE.WebGLRenderTarget) {
    const L = this.ink3;
    L.clear();
    const ink = LIN.ink;
    for (let i = this.nOld; i < this.slabs.length; i++) {
      const s = this.slabs[i]!;
      if (!s.mesh.visible) continue;
      if (s.coffee) {
        for (let w = 0; w < 2; w++) {
          let prev: THREE.Vector3 | null = null;
          for (let j = 0; j <= 12; j++) {
            const p = steamXY(w, j / 12, t, i);
            const q = this.facePoint(i, CUP_AT.x + p.x, CUP_AT.y + p.y);
            if (prev) L.seg(prev.x, prev.y, prev.z, q.x, q.y, q.z, 1.3, ink[0], ink[1], ink[2], 0.55 * (1 - 0.6 * (j / 12)));
            prev = q;
          }
        }
      }
      // landing: short hairline ticks kick out of the front bottom corners
      if (t >= s.t && t < s.t + 0.16) {
        const u = prog(t, s.t, s.t + 0.16, ease.outCubic);
        const hPx = s.h / PX;
        for (const sx of [-1, 1]) {
          const cx = sx < 0 ? 0 : FACE_W;
          for (const a of [0.55, 0.95, 1.35]) {
            const dx = Math.cos(a) * sx, dy = -Math.sin(a);
            const r0 = 10 + 26 * u, r1 = r0 + 18 * (1 - u) + 6;
            const p0 = this.facePoint(i, cx + dx * r0, hPx + dy * r0), p1 = this.facePoint(i, cx + dx * r1, hPx + dy * r1);
            L.seg(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, 1.4, ink[0], ink[1], ink[2], 0.85 * (1 - u));
          }
        }
      }
    }
    L.render(this.ctx.renderer, out, this.cam);
  }

  /** The SP arrow's tip and tail (world), at the top boundary on the right front edge. */
  spPoints(t: number) {
    const y = this.spY(t);
    const lean = this.sway(t) * y;
    const tip = new THREE.Vector3(SW / 2 + 0.2 + lean, y, SD / 2);
    const tail = new THREE.Vector3(SW / 2 + 1.55 + lean, y, SD / 2);
    return { tip, tail };
  }
  drawSP3(t: number, out: THREE.WebGLRenderTarget) {
    const L = this.or3;
    L.clear();
    const { tip, tail } = this.spPoints(t);
    const c = LIN.signal;
    L.seg(tail.x, tail.y, tail.z, tip.x + 0.02, tip.y, tip.z, 2.2, c[0], c[1], c[2], 1);
    for (const s of [-1, 1]) L.seg(tip.x, tip.y, tip.z, tip.x + 0.3, tip.y + s * 0.16, tip.z, 2.2, c[0], c[1], c[2], 1);
    L.render(this.ctx.renderer, out, this.cam);
  }

  drawSpark(t: number, f: Frame, out: THREE.WebGLRenderTarget) {
    const d = this.dots, g = this.glow;
    d.clear(); g.clear();
    const headAt = (tt: number) => {
      // the head rides the tip; its camera is the one at tt
      this.applyCam(tt);
      const p = this.proj(this.spPoints(tt).tip);
      return p;
    };
    const burst = (tb: number) => {
      let b = 0;
      for (const p of this.pushes) b = Math.max(b, pulse(tb, p, 0.05));
      b = Math.max(b, 1.6 * pulse(tb, this.tErr, 0.06));
      return 18 + 240 * b;
    };
    sparkParticles(d, t, headAt, { rate: burst, rateMax: 420, life: 0.42, speed: 250, gravity: 640, intensity: 0.5, seed: 23, width: 1.7 });
    this.applyCam(t);
    const hp = this.proj(this.spPoints(t).tip);
    const kk = 1 + 0.3 * f.a.kick;
    d.seg2(hp.x, hp.y, hp.x + 0.01, hp.y, 14 * kk, [LIN.signal[0], LIN.signal[1], LIN.signal[2]], 1);
    d.render(this.ctx.renderer, out);
    sparkHead(g, hp.x, hp.y, t, 0.6 * kk, 0.7);
    g.render(this.ctx.renderer, out);
  }

  // ------------------------------------------------------------------ 2D annotations
  drawOverlay(t: number) {
    const L = this.over;
    L.clear('#fff');
    const c = L.ctx;
    c.textBaseline = 'alphabetic';

    // the caption, printed in front of the tower
    {
      const p = this.proj(new THREE.Vector3(-SW / 2, 0, SD / 2 + 0.95));
      if (p.z < 1 && p.y < H + 40) {
        c.font = font(F.mono(600), 17);
        c.fillStyle = INK(0.95);
        c.fillText('FIG. 2b', p.x, p.y + 20);
        c.font = font(F.mono(400), 17);
        c.fillText('call stack at 23:59 · assignment 4', p.x + 88, p.y + 20);
      }
    }
    // addresses at the left end of each frame boundary
    c.font = font(F.mono(400), 12);
    c.textAlign = 'right';
    for (let i = 0; i < this.slabs.length; i++) {
      const s = this.slabs[i]!;
      if (!s.mesh.visible || t < s.t) continue;
      const a = new THREE.Vector3(-SW / 2, -s.h / 2, SD / 2).applyMatrix4(s.m);
      const b = this.proj(new THREE.Vector3(-SW / 2, -s.h / 2, -SD / 2).applyMatrix4(s.m));
      const p = this.proj(a);
      if (p.z > 1 || p.y < -20 || p.y > H + 20) continue;
      if (b.z < 1 && b.x < p.x) { p.x = b.x; p.y = b.y; } // left of whichever corner shows further out
      const fade = clamp(1.4 - a.distanceTo(this.cam.position) / (this.fogU.value.x * 1.4));
      if (fade <= 0) continue;
      c.fillStyle = INK(0.55 * fade);
      c.fillText(s.addr, p.x - 44, p.y + 4);
      c.fillRect(p.x - 38, p.y - 0.5, 30, 1);
    }
    c.textAlign = 'left';

    // the stack pointer's label block
    const { tail } = this.spPoints(t);
    const p = this.proj(tail);
    if (p.z < 1) {
      const bx = clamp(p.x + 20, 96, W - 96 - 175), by = clamp(p.y, 110, H - 96 - 90);
      const depth = this.nOld + this.pushes.filter((q) => q <= t).length;
      c.font = font(F.mono(600), 20);
      c.fillStyle = INK(1);
      c.fillText('SP', bx, by + 7);
      c.font = font(F.mono(400), 15);
      c.fillStyle = INK(0.62);
      c.fillText(`depth ${String(depth).padStart(2, '0')}`, bx, by + 31);
      if (t >= this.tPop) {
        const txt = 'pop()';
        const n = Math.round(prog(t, this.tPop, this.tPop + 0.12) * txt.length);
        c.font = font(F.mono(600), 20);
        c.fillStyle = OR(1);
        const px = bx + measure('SP ', F.mono(600), 20);
        c.fillText(txt.slice(0, n), px, by + 7);
        if (t >= this.tErr) {
          const s = prog(t, this.tErr, this.tErr + 0.08, ease.outCubic);
          c.fillRect(px - 3, by + 0.5, (measure(txt, F.mono(600), 20) + 6) * s, 2.2);
          c.font = font(F.mono(500), 15);
          c.fillText('refused (again)'.slice(0, Math.round(prog(t, this.tErr + 0.04, this.tErr + 0.2) * 15)), bx, by + 53);
        }
      }
    }
    // the footnote: typed just above the stamp's far left corner, flat to camera
    if (t >= this.tFoot) {
      const s = this.slabs[this.slabs.length - 1]!;
      const q = this.proj(new THREE.Vector3(-SW * 0.45, s.h / 2, -SD * 0.36).applyMatrix4(s.m));
      const txt = '¹ unwind() rescheduled to 00:00:00';
      const n = Math.round(prog(t, this.tFoot, this.tFoot + 0.18) * txt.length);
      c.font = font(F.mono(400), 16);
      c.fillStyle = INK(0.85);
      c.fillText(txt.slice(0, n), clamp(q.x, 96, W - 96 - 330), clamp(q.y - 18, 110, H - 96));
    }
  }
}

