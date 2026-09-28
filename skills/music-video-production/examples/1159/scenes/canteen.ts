// 11:59 `canteen` — "Canteen at two a.m.? No, that's just a dream". Ink; the drum break.
//
// A school canteen after hours, drawn as a hairline figure with hidden lines removed: counter, rows of
// pedestal tables with fixed stools, ceiling panels, and over the counter a hanging board. Its front is
// the sign — `Canteen · 07:30 – 21:00`, a service-day hours bar (06:00 → 06:00) with the open span
// filled — and the time `02:00`, far right, out in the closed hours. The spark (the student's cursor)
// sits on that 02:00 mark, blinking.
//  52.67 (drums out): dark; the room in dashed outlines; the camera pushes in through the tables.
//  "Canteen" (held): the lights flicker on and the dashes fill in to solid lines; the spark grabs the
//   closing edge of the open span and drags it out to 02:00 (the header's closing time rolls with it);
//   three menu cards ghost in, dashed, in the air above the counter.
//  54.52 (drums back) "at two a.m.?": cut low among the tables; the status flap flips to OPEN; the
//   spark zaps down onto the first card and hops card to card, each card popping in on its kick
//   (`fish-ball noodles $32`, `milk tea $18`, `pineapple bun $9`), the camera snapping with it.
//  "No,": the board flips over on its axle, the camera whips round to face it: CLOSED, and the lyric
//   carries on on the back: "No, that's / just a dream.¹".
//  56.36 (drums out again): the lights snap off, the room falls back to dashed outlines, the cards
//   collapse into dotted outlines and dissolve, the camera pulls back; footnote
//   `¹ menu shown for illustrative purposes only`. Hard cut into `timetable` (bone paper) at 57.28.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, W, H, clearRT } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { Lyrics, norm, type Line, type Word } from '../../engine/lyrics';
import { LIN, rgba, type PaletteKey } from '../../engine/palette';
import { F, font, measure, layout, type TextLayout } from '../../engine/type';
import { clamp, ease, hash, lerp, noise1, prog, pulse, smoothstep, frameIdx, TAU } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { buildRoom, ROOM, COUNTER, BOARD, BS, CARDS, CARD_W, TABLE_X, TABLE_Z, TABLE, BAR, barU, barU2, KIND, LAMPS, type Edges } from './canteen-geo';
import { MENU_ITEMS, CARD, menuCard, menuTagPoint, dashPattern, dashPolyline, menuTypeAlpha, type MenuStyle } from './canteen-menu';
import { FACE_VERT, FACE_FRAG } from './canteen-glsl';

type RGB = [number, number, number];
type V3 = [number, number, number];
interface Pose { pos: V3; tgt: V3; fov: number; roll: number }
interface Proj { x: number; y: number; w: number }
interface Aff { a: number; b: number; c: number; d: number; e: number; f: number; w: number }
/** A plane in the world: origin (u = v = 0), world vectors per unit u and per unit v. */
interface Plane { o: V3; u: V3; v: V3 }

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vlerp = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const onPlane = (p: Plane, u: number, v: number): V3 => [p.o[0] + p.u[0] * u + p.v[0] * v, p.o[1] + p.u[1] * u + p.v[1] * v, p.o[2] + p.u[2] * u + p.v[2] * v];
const rotX = (p: V3, th: number): V3 => { const c = Math.cos(th), s = Math.sin(th); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };
const rotY = (p: V3, th: number): V3 => { const c = Math.cos(th), s = Math.sin(th); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
const P = (pos: V3, tgt: V3, fov: number, roll = 0): Pose => ({ pos, tgt, fov, roll });
const mixPose = (a: Pose, b: Pose, k: number): Pose => ({ pos: vlerp(a.pos, b.pos, k), tgt: vlerp(a.tgt, b.tgt, k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k) });
const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

// ---- camera poses
const A0 = P([1.1, 1.8, 5.4], [-0.15, 3.05, -6.9], 40);
const A1 = P([0.35, 2.15, -0.2], [0.0, 3.25, -6.9], 40);
const B1 = P([-2.35, 1.45, -1.25], [0.35, 2.95, -6.7], 46, 0.03);
const B2 = P([0.4, 1.12, -2.4], [0.0, 2.62, -6.6], 47, 0);
const B3 = P([1.15, 1.3, -2.05], [0.3, 2.75, -6.6], 46, -0.025);
const C0 = P([0.0, 3.0, -1.1], [0.0, 3.25, -6.9], 38);
const C1 = P([0.3, 2.5, 2.6], [0.0, 3.05, -6.9], 38);

// ---- board type
const F_LYR = F.archivo(100, 800);
const F_MONO = F.mono(500);
const F_MONO_B = F.mono(600);
const LYR_SIZE = 210;
const BACK_L1 = 392, BACK_L2 = 590; // the back's two lyric baselines
const LIGHT_DIR = new THREE.Vector3(-0.45, 0.75, 0.5).normalize();

interface BWord { w: Word; text: string; u: number; v: number; side: 0 | 1; lay: TextLayout }

export default class Canteen extends Scene {
  cam = new THREE.PerspectiveCamera(40, W / H, 0.08, 80);
  vp = new THREE.Matrix4();
  scratch = new THREE.PerspectiveCamera(40, W / H, 0.08, 80);
  svp = new THREE.Matrix4();
  v4 = new THREE.Vector4();
  faces = new THREE.Scene();
  faceMats: THREE.RawShaderMaterial[] = [];
  boardMesh!: THREE.Mesh;
  lines = new LineBatch(48000, { screen2D: false, blend: 'max', depthTest: true });
  glow = new LineBatch(8000, { screen2D: false, blend: 'add', depthTest: true });
  fx = new LineBatch(5000);
  L = new Layer2D();

  room!: Edges;
  line!: Line;
  wCan!: Word; wAt!: Word; wTwo!: Word; wAm!: Word; wNo!: Word; wThats!: Word; wJust!: Word; wA!: Word; wDream!: Word;
  T0 = 0; T1 = 0;
  tDrum = 0; tFlip0 = 0; tFlip1 = 0; tOff = 0; tGrab = 0; tDrag0 = 0; tDrag1 = 0;
  pops: number[] = [];
  kicks: number[] = [];
  breakBeats: number[] = [];
  lampOn: number[] = [];
  words: BWord[] = [];
  hoursX = 0; // u where the header's hours string starts

  camPos: V3 = [0, 0, 0];
  camRef = 10;

  override init() {
    const { lyrics, audio: au, start, end } = this.ctx;
    this.T0 = start; this.T1 = end;
    this.line = lyrics.get('Canteen at two');
    const ws = this.line.words;
    const find = (q: string, from = 0) => ws.slice(from).find((w) => norm(w.w) === norm(q)) ?? ws[Math.min(ws.length - 1, from)]!;
    this.wCan = ws[0]!;
    this.wAt = find('at'); this.wTwo = find('two'); this.wAm = find('a.m.?');
    this.wNo = find('no'); this.wThats = find("that's"); this.wJust = find('just');
    this.wDream = ws[ws.length - 1]!;
    this.wA = ws[ws.length - 2]!;

    // the drums come back on the first downbeat inside "Canteen"; they go out again on the next
    // downbeat after "No,"
    this.tDrum = au.downbeats.find((d) => d > this.wCan.start + 0.3 && d < this.wNo.start) ?? au.nearestBeat(this.wAt.start);
    this.tOff = au.downbeats.find((d) => d > this.wNo.start + 0.1) ?? au.nearestBeat(this.wThats.start + 0.3);
    this.kicks = au.events('kick', this.tDrum - 0.08, this.tOff - 0.05).map((k) => k[0]);
    if (this.kicks.length < 3) {
      this.kicks = [];
      for (let b = Math.round(au.beatAt(this.tDrum)); au.timeOfBeat(b) < this.tOff - 0.05; b++) this.kicks.push(au.timeOfBeat(b) + 0.04);
    }
    this.pops = this.kicks.filter((k) => k < this.wNo.start - 0.15).slice(0, 3);
    while (this.pops.length < 3) this.pops.push((this.pops[this.pops.length - 1] ?? this.tDrum) + 0.46);
    for (let b = Math.ceil(au.beatAt(start) - 0.02); au.timeOfBeat(b) < this.tDrum - 0.05; b++) this.breakBeats.push(au.timeOfBeat(b));
    // the board flips over on "No," (lands as it is sung)
    this.tFlip1 = this.wNo.start;
    this.tFlip0 = this.tFlip1 - 0.2;
    // the drag: the spark grabs the 21:00 edge just after "Canteen" starts and drags it to 02:00
    this.tGrab = this.wCan.start + 0.02;
    this.tDrag0 = this.tGrab + 0.3;
    this.tDrag1 = this.tDrum - 0.12;
    // lamps flicker on through the held note
    this.lampOn = LAMPS.map((_, i) => this.wCan.start + 0.04 + 0.62 * hash(i, 17) * hash(i, 19) + 0.1 * hash(i, 23));

    this.room = buildRoom();
    this.buildFaces();
    this.layoutWords();
  }

  // ------------------------------------------------------------------ setup
  buildFaces() {
    const mk = (base: RGB, hatchK: number, freq: number) => {
      const m = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3, vertexShader: FACE_VERT, fragmentShader: FACE_FRAG,
        uniforms: {
          camPos: { value: new THREE.Vector3() }, fog: { value: new THREE.Vector2(3, 8) }, light: { value: 0 },
          base: { value: new THREE.Vector3(...base) }, hatchK: { value: hatchK }, freq: { value: freq }, lightDir: { value: LIGHT_DIR.clone() },
        },
        polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
      });
      this.faceMats.push(m);
      return m;
    };
    const box = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material) => {
      const e = 0.006;
      const g = new THREE.BoxGeometry(x1 - x0 - 2 * e, y1 - y0 - 2 * e, z1 - z0 - 2 * e);
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      mesh.frustumCulled = false;
      this.faces.add(mesh);
      return mesh;
    };
    const ink = LIN.ink;
    const c = COUNTER;
    const mc = mk([ink[0] * 1.15, ink[1] * 1.15, ink[2] * 1.15], 0.3, 11);
    box(c.x0, 0, c.z0, c.x1, c.h - 0.05, c.z1, mc);
    box(c.x0 - 0.06, c.h - 0.05, c.z0, c.x1 + 0.06, c.h, c.z1 + 0.1, mc);
    const mt = mk([ink[0], ink[1], ink[2]], 0.35, 16);
    for (const tz of TABLE_Z) for (const tx of TABLE_X) box(tx - TABLE.hw, TABLE.h - TABLE.th, tz - TABLE.hd, tx + TABLE.hw, TABLE.h, tz + TABLE.hd, mt);
    const mb = mk([LIN.ink2[0], LIN.ink2[1], LIN.ink2[2]], 0, 10);
    const g = new THREE.BoxGeometry(BOARD.w, BOARD.h, BOARD.th);
    this.boardMesh = new THREE.Mesh(g, mb);
    this.boardMesh.frustumCulled = false;
    this.faces.add(this.boardMesh);
  }

  layoutWords() {
    const sp = measure(' ', F_LYR, LYR_SIZE);
    const ws = this.line.words;
    const iNo = ws.indexOf(this.wNo);
    // front: "Canteen" is the sign's name; "at two a.m.?" the dream's addition under it
    this.words.push({ w: this.wCan, text: this.wCan.w, u: 90, v: 250, side: 0, lay: layout(this.wCan.w, F_LYR, LYR_SIZE) });
    this.hoursX = 90 + measure(this.wCan.w, F_LYR, LYR_SIZE) + 34;
    let u = 90;
    for (const w of ws.slice(1, iNo)) { this.words.push({ w, text: w.w, u, v: 480, side: 0, lay: layout(w.w, F_LYR, LYR_SIZE) }); u += measure(w.w, F_LYR, LYR_SIZE) + sp; }
    // back: "No, that's" / "just a dream."
    u = 90;
    const iJust = ws.indexOf(this.wJust);
    for (let i = iNo; i < ws.length; i++) {
      const w = ws[i]!;
      if (i === iJust) u = 90;
      const text = i === ws.length - 1 && !/[.?!]$/.test(w.w) ? w.w + '.' : w.w;
      this.words.push({ w, text, u, v: i < iJust ? BACK_L1 : BACK_L2, side: 1, lay: layout(text, F_LYR, LYR_SIZE) });
      u += measure(text, F_LYR, LYR_SIZE) + sp;
    }
  }

  // ------------------------------------------------------------------ time → state
  lamp(i: number, t: number) {
    if (t >= this.tOff) {
      // one tube stutters once after the cut
      if (i === 9 && t > this.tOff + 0.16 && t < this.tOff + 0.2) return 0.6;
      return 0;
    }
    const t0 = this.lampOn[i]!;
    if (t < t0) return 0;
    if (t > t0 + 0.26) return 1;
    return hash(Math.floor((t - t0) / 0.034), i, 5) > 0.42 ? 1 : 0.08;
  }
  light(t: number) {
    let s = 0;
    for (let i = 0; i < LAMPS.length; i++) s += this.lamp(i, t);
    return s / LAMPS.length;
  }
  /** 0 = dashed outlines (dark), 1 = solid (lit). */
  fill(t: number) {
    if (t >= this.tOff) return 0;
    return prog(t, this.wCan.start + 0.05, this.tDrum - 0.05, ease.inOutCubic);
  }
  flip(t: number) {
    if (t <= this.tFlip0) return 0;
    const k = prog(t, this.tFlip0, this.tFlip1);
    let th = Math.PI * ease.inOutCubic(k) * 1.0;
    if (t > this.tFlip1) { const s = t - this.tFlip1; th = Math.PI + 0.16 * Math.exp(-s / 0.18) * Math.sin(TAU * 2.4 * s); }
    return th;
  }
  /** Hour the open span closes at, as the spark drags it (21 → 26 = 02:00 next day). */
  closeHour(t: number) {
    if (t < this.tDrag0) return 21;
    return lerp(21, 26, prog(t, this.tDrag0, this.tDrag1, ease.inOutCubic));
  }
  pop(i: number, t: number) { return prog(t, this.pops[i]!, this.pops[i]! + 0.26, (x) => ease.outBack(x, 2.2)); }
  ghost(t: number) { return prog(t, this.wCan.start + 0.35, this.tDrum - 0.2); }
  dotted(t: number) { return prog(t, this.tOff, this.tOff + 0.14); }

  // ------------------------------------------------------------------ board / cards in the world
  boardPlane(side: 0 | 1, th: number): Plane {
    const C: V3 = [BOARD.cx, BOARD.cy, BOARD.cz];
    const zf = BOARD.th / 2 + 0.004;
    const hw = BOARD.w / 2, hh = BOARD.h / 2;
    if (side === 0) return { o: add(C, rotX([-hw, hh, zf], th)), u: rotX([BS, 0, 0], th), v: rotX([0, -BS, 0], th) };
    return { o: add(C, rotX([-hw, -hh, -zf], th)), u: rotX([BS, 0, 0], th), v: rotX([0, BS, 0], th) };
  }
  boardNormal(side: 0 | 1, th: number): V3 { return rotX([0, 0, side === 0 ? 1 : -1], th); }
  /** Facing factor of a board side toward the camera (0 edge-on / away … 1 face-on). */
  facing(side: 0 | 1, th: number) {
    const C: V3 = [BOARD.cx, BOARD.cy, BOARD.cz];
    const d = sub(this.camPos, C);
    return dot(this.boardNormal(side, th), d) / Math.max(1e-6, len(d));
  }
  cardPlane(i: number, t: number): { pl: Plane; k: number } {
    const c = CARDS[i]!;
    const k = 0.84 + 0.16 * this.pop(i, t);
    const s = (CARD_W / CARD.w) * k;
    const bob = 0.022 * Math.sin(TAU * 0.55 * (t - this.T0) + i * 2.1);
    const ctr: V3 = [c.x, c.y + bob, c.z];
    const u = rotY([s, 0, 0], c.yaw), v: V3 = [0, -s, 0];
    const o = sub(sub(ctr, scl(u, CARD.w / 2)), scl(v, CARD.h / 2));
    return { pl: { o, u, v }, k };
  }
  /** The 02:00 mark's top on the board (world; the same point on either face, flipped or not). */
  markWorld(): V3 { return onPlane(this.boardPlane(0, 0), barU2(26), BAR.v - 36); }

  // ------------------------------------------------------------------ camera
  poseAt(t: number): Pose {
    const { T0, tDrum, tFlip0, tOff, T1 } = this;
    const [k1, k2] = [this.pops[1]!, this.pops[2]!];
    let p: Pose;
    if (t < tDrum) {
      const k = prog(t, T0 - 0.2, tDrum + 0.25, (x) => 0.5 - 0.5 * Math.cos(Math.PI * x));
      p = mixPose(A0, A1, k);
    } else {
      const push = (q: Pose, s: number, r: number): Pose => ({ ...q, pos: vlerp(q.pos, q.tgt, r * s) });
      p = push(B1, t - tDrum, 0.035);
      if (t >= k1 - 0.02) p = mixPose(p, push(B2, t - k1, 0.035), prog(t, k1 - 0.02, k1 + 0.26, ease.outExpo));
      if (t >= k2 - 0.02) p = mixPose(p, push(B3, t - k2, 0.035), prog(t, k2 - 0.02, k2 + 0.26, ease.outExpo));
      if (t >= tFlip0) p = mixPose(p, push(C0, t - tFlip0, 0.02), prog(t, tFlip0, tFlip0 + 0.34, ease.outExpo));
      if (t >= tOff) p = mixPose(p, C1, prog(t, tOff, T1 + 0.5, (x) => ease.inOutQuad(x) * 0.8 + 0.2 * x));
    }
    // handheld drift, a hair
    const lt = t - T0;
    const j = 0.012;
    return { ...p, tgt: add(p.tgt, [j * Math.sin(lt * 1.3), j * 0.7 * Math.sin(lt * 1.7 + 1), 0]) };
  }
  setCam(cam: THREE.PerspectiveCamera, vp: THREE.Matrix4, p: Pose) {
    cam.fov = p.fov; cam.updateProjectionMatrix();
    cam.position.set(...p.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(...p.tgt);
    cam.rotateZ(p.roll);
    cam.updateMatrixWorld(true);
    vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
  }
  projWith(vp: THREE.Matrix4, q: V3): Proj | null {
    const v = this.v4.set(q[0], q[1], q[2], 1).applyMatrix4(vp);
    if (v.w <= 0.06) return null;
    return { x: (v.x / v.w * 0.5 + 0.5) * W, y: (0.5 - v.y / v.w * 0.5) * H, w: v.w };
  }
  proj(q: V3) { return this.projWith(this.vp, q); }
  /** Local affine of a plane at (u, v): Canvas2D setTransform args mapping plane units to screen px. */
  aff(pl: Plane, u: number, v: number): Aff | null {
    const d = 12;
    const p0 = this.proj(onPlane(pl, u, v)), pu = this.proj(onPlane(pl, u + d, v)), pv = this.proj(onPlane(pl, u, v + d));
    if (!p0 || !pu || !pv) return null;
    return { a: (pu.x - p0.x) / d, b: (pu.y - p0.y) / d, c: (pv.x - p0.x) / d, d: (pv.y - p0.y) / d, e: p0.x, f: p0.y, w: p0.w };
  }

  fog(d: number) {
    return Math.exp(-Math.max(0, d - this.camRef - 1.5) / 6) * smoothstep(0.5, 2.2, d);
  }

  // ------------------------------------------------------------------ render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const pose = this.poseAt(t);
    this.setCam(this.cam, this.vp, pose);
    this.camPos = pose.pos;
    this.camRef = len(sub(pose.tgt, pose.pos));
    const lit = this.light(t);
    const th = this.flip(t);

    // faces (hidden-line occluders)
    this.boardMesh.position.set(BOARD.cx, BOARD.cy, BOARD.cz);
    this.boardMesh.rotation.set(th, 0, 0);
    this.boardMesh.updateMatrixWorld(true);
    for (const m of this.faceMats) {
      (m.uniforms.camPos!.value as THREE.Vector3).set(...pose.pos);
      (m.uniforms.fog!.value as THREE.Vector2).set(this.camRef + 1.5, 6);
      m.uniforms.light!.value = lit;
    }
    const bl = 1 + 0.35 * lit;
    (this.faceMats[this.faceMats.length - 1]!.uniforms.base!.value as THREE.Vector3).set(LIN.ink2[0] * bl, LIN.ink2[1] * bl, LIN.ink2[2] * bl);

    clearRT(renderer, out, LIN.ink);
    renderer.setRenderTarget(out);
    renderer.render(this.faces, this.cam);

    this.lines.clear(); this.glow.clear();
    this.drawRoom(t, lit);
    this.drawBoardLines(t, th, lit);
    this.drawCards(t, lit);
    this.lines.render(renderer, out, this.cam);
    this.glow.render(renderer, out, this.cam);

    const c = this.L.ctx; this.L.clear();
    this.drawBoardText(c, t, th, lit);
    this.drawCardText(c, t, lit);
    c.setTransform(1, 0, 0, 1, 0, 0);
    comp.draw(renderer, this.L.upload(), out);

    this.drawSpark(t, f);
    this.fx.render(renderer, out);

    // ---- post: the drum return hits, the kicks nudge, the flip lands
    let sh = 9 * pulse(t, this.tDrum, 0.06) + 7 * pulse(t, this.tFlip1, 0.06);
    for (const k of this.kicks) sh += 3 * pulse(t, k, 0.05);
    const fi = frameIdx(t);
    const shake: [number, number] = [sh * (hash(fi, 3) - 0.5) * 2, sh * (hash(fi, 4) - 0.5) * 2];
    let zoom = 1 + 0.02 * pulse(t, this.tDrum, 0.08) + 0.012 * pulse(t, this.tFlip1, 0.08);
    for (const k of this.pops) zoom += 0.008 * pulse(t, k, 0.07);
    return {
      bloomThreshold: 1.0, bloomKnee: 0.05, bloom: 0.8, bloomRadius: 0.6, halation: 0.14,
      vignette: 0.5, grain: 0.055, ca: 0.9 + 1.2 * pulse(t, this.tDrum, 0.08), hud: 0, shake, zoom,
    };
  }

  // ------------------------------------------------------------------ 3D hairlines
  /** Push one world segment with depth weight and fog. */
  seg(lb: LineBatch, a: V3, b: V3, w: number, col: RGB, al: number) {
    const cp = this.camPos;
    const d = Math.hypot((a[0] + b[0]) / 2 - cp[0], (a[1] + b[1]) / 2 - cp[1], (a[2] + b[2]) / 2 - cp[2]);
    const fa = this.fog(d) * al;
    if (fa < 0.004) return;
    const wd = clamp(0.8 + 3.0 / d, 0.95, 2.6) * w;
    lb.seg(a[0], a[1], a[2], b[0], b[1], b[2], wd, col[0], col[1], col[2], fa);
  }

  segS(lb: LineBatch, ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number, r: number, g: number, b: number, al: number) {
    const cp = this.camPos;
    const d = Math.hypot((ax + bx) * 0.5 - cp[0], (ay + by) * 0.5 - cp[1], (az + bz) * 0.5 - cp[2]);
    const fa = this.fog(d) * al;
    if (fa < 0.004) return;
    lb.seg(ax, ay, az, bx, by, bz, clamp(0.8 + 3.0 / d, 0.95, 2.6) * w, r, g, b, fa);
  }

  drawRoom(t: number, lit: number) {
    const e = this.room;
    const fillK = this.fill(t);
    const per = 0.3, on = lerp(0.13, per, fillK);
    const solid = fillK >= 0.999;
    const bone = LIN.bone;
    const lampS = LAMPS.map((_, i) => this.lamp(i, t));
    const kA = [0, 0, 0, 0, 0, 0, 0];
    // alpha per kind: dark → lit
    kA[KIND.FLOOR] = lerp(0.12, 0.3, lit);
    kA[KIND.STRUCT] = lerp(0.32, 0.78, lit);
    kA[KIND.FURN] = lerp(0.27, 0.7, lit);
    kA[KIND.LAMP] = lerp(0.3, 0.55, lit);
    kA[KIND.TILE] = lerp(0.05, 0.22, lit);
    kA[KIND.GLASS] = lerp(0.12, 0.4, lit);
    const p = e.p;
    for (let i = 0; i < e.n; i++) {
      const k = e.k[i]!;
      let al = e.a[i]!;
      let col: RGB = bone;
      if (k === KIND.TUBE) {
        const s = lampS[e.id[i]!]!;
        col = s > 0.5 ? mul(bone, 1.0) : mul(LIN.graphite, 1.2);
        al *= s > 0.5 ? 0.95 : 0.35;
      } else al *= kA[k]!;
      const ax = p[i * 6]!, ay = p[i * 6 + 1]!, az = p[i * 6 + 2]!;
      const dx = p[i * 6 + 3]! - ax, dy = p[i * 6 + 4]! - ay, dz = p[i * 6 + 5]! - az;
      const L = Math.hypot(dx, dy, dz);
      const w = e.w[i]!;
      const [r, g, bl] = col;
      if (solid || k === KIND.TUBE || k === KIND.TILE) {
        const m = Math.max(1, Math.ceil(L / 0.6));
        for (let j = 0; j < m; j++) { const u0 = j / m, u1 = (j + 1) / m; this.segS(this.lines, ax + dx * u0, ay + dy * u0, az + dz * u0, ax + dx * u1, ay + dy * u1, az + dz * u1, w, r, g, bl, al); }
        continue;
      }
      // dashes on a fixed period from each edge's start: they grow into solid lines as the lights come on
      const n = Math.max(1, Math.ceil(L / per));
      for (let j = 0; j < n; j++) {
        const s0 = j * per, s1 = Math.min(L, s0 + on);
        if (s1 <= s0) continue;
        const u0 = s0 / L, u1 = s1 / L;
        this.segS(this.lines, ax + dx * u0, ay + dy * u0, az + dz * u0, ax + dx * u1, ay + dy * u1, az + dz * u1, w, r, g, bl, al);
      }
    }
  }

  /** Strokes of the board's two faces: frame, hours bar, marks, the status window, the stamp. */
  drawBoardLines(t: number, th: number, lit: number) {
    for (const side of [0, 1] as const) {
      const fc = this.facing(side, th);
      if (fc <= 0.02) continue;
      const vis = smoothstep(0.02, 0.2, fc);
      const pl = this.boardPlane(side, th);
      const W3 = (u: number, v: number) => onPlane(pl, u, v);
      const bone = LIN.bone;
      const ink = (a: number) => a * vis * (side === 0 ? lerp(0.62, 1, lit) : 1);
      const S = (u0: number, v0: number, u1: number, v1: number, w: number, col: RGB, a: number, lb = this.lines) => this.seg(lb, W3(u0, v0), W3(u1, v1), w, col, a);
      const rect = (u0: number, v0: number, u1: number, v1: number, w: number, col: RGB, a: number, lb = this.lines) => {
        const n = 6;
        for (let i = 0; i < n; i++) {
          S(lerp(u0, u1, i / n), v0, lerp(u0, u1, (i + 1) / n), v0, w, col, a, lb);
          S(lerp(u0, u1, i / n), v1, lerp(u0, u1, (i + 1) / n), v1, w, col, a, lb);
        }
        for (let i = 0; i < 3; i++) {
          S(u0, lerp(v0, v1, i / 3), u0, lerp(v0, v1, (i + 1) / 3), w, col, a, lb);
          S(u1, lerp(v0, v1, i / 3), u1, lerp(v0, v1, (i + 1) / 3), w, col, a, lb);
        }
      };
      // frame: a heavy outer rule, a hairline inside it
      rect(22, 22, BOARD.U - 22, BOARD.V - 22, 1.5, bone, ink(0.8));
      rect(36, 36, BOARD.U - 36, BOARD.V - 36, 1, bone, ink(0.35));
      // the hours bar: track, hour ticks, labels' ticks, the open span filled with hatching
      const { u0, u1, v, hh } = BAR;
      for (let i = 0; i < 12; i++) {
        const a = lerp(u0, u1, i / 12), b = lerp(u0, u1, (i + 1) / 12);
        S(a, v - hh, b, v - hh, 1.1, bone, ink(0.7)); S(a, v + hh, b, v + hh, 1.1, bone, ink(0.7));
      }
      S(u0, v - hh, u0, v + hh, 1.1, bone, ink(0.7)); S(u1, v - hh, u1, v + hh, 1.1, bone, ink(0.7));
      for (let h = 0; h <= 24; h++) {
        const u = lerp(u0, u1, h / 24), big = h % 3 === 0;
        S(u, v + hh, u, v + hh + (big ? 16 : 8), 1, bone, ink(big ? 0.7 : 0.45));
      }
      const close = side === 0 ? this.closeHour(t) : 21;
      const xa = barU(7.5), xb = barU2(Math.min(close, 21));
      for (let u = xa + 3; u < xb; u += 7) S(u, v - hh + 2, u, v + hh - 2, 1, bone, ink(0.55));
      // the dream hours: the span dragged past 21:00, orange hatching (paint on the board, may glow a little)
      if (side === 0 && close > 21.001) {
        const sg = mul(LIN.signal, 0.9 + 0.3 * lit);
        const xe = barU2(close);
        for (let u = barU2(21) + 3; u < xe; u += 7) S(u, v - hh + 2, u, v + hh - 2, 1.1, sg, 0.9 * vis, this.glow);
        S(barU2(21), v - hh, xe, v - hh, 1.3, sg, 0.9 * vis, this.glow);
        S(barU2(21), v + hh, xe, v + hh, 1.3, sg, 0.9 * vis, this.glow);
      }
      // the 02:00 mark (the student's time, out in the closed hours)
      const xm = barU2(26);
      const blink = t < this.wCan.start ? this.blink(t) : 1;
      const mk = mul(LIN.signal, 1.1);
      S(xm, v - 36, xm, v + hh + 22, 1.8, mk, (0.55 + 0.45 * blink) * vis, this.glow);
      // status window (front: CLOSED → OPEN; back: the CLOSED stamp)
      if (side === 0) rect(1540, 78, 1720, 150, 1.1, bone, ink(0.7));
      else {
        const sg = mul(LIN.signal, 1.0);
        rect(90, 72, 700, 198, 2.6, sg, 0.95 * vis, this.glow);
        rect(104, 86, 686, 184, 1.1, sg, 0.8 * vis, this.glow);
      }
    }
  }

  blink(t: number) {
    // the cursor blinks on the beats of the break
    let b = 0;
    for (const bt of this.breakBeats) if (t >= bt) b = bt;
    return t - b < 0.23 ? 1 : 0.25;
  }

  cardStyle(i: number, t: number): MenuStyle & { a: number } {
    const g = this.ghost(t), pk = this.pop(i, t);
    const popped = t >= this.pops[i]!;
    const dotted = this.dotted(t);
    const a = popped ? 1 : 0.32 * g;
    return { lit: a, dash: popped ? 0.35 : 1, dotted, phase: (t - this.T0) * 22, a: a * (popped ? 0.75 + 0.25 * clamp(pk) : 1) };
  }

  drawCards(t: number, lit: number) {
    void lit;
    for (let i = 0; i < 3; i++) {
      const st = this.cardStyle(i, t);
      if (st.a <= 0.003) continue;
      const { pl } = this.cardPlane(i, t);
      const [on, off] = dashPattern(st);
      const dq = st.dotted ?? 0;
      const flash = pulse(t, this.pops[i]!, 0.12);
      for (const pr of menuCard(MENU_ITEMS[i]!)) {
        if (pr.kind !== 'stroke') continue;
        const orange = pr.ink === 'signal';
        const base: RGB = orange ? mul(LIN.signal, 1.25 + 1.2 * flash) : mul(LIN[pr.ink], 0.95 + 0.25 * flash);
        const lb = orange ? this.glow : this.lines;
        const aBase = pr.a * st.a;
        const pieces = dashPolyline(pr.pts, pr.closed, on, off, st.phase);
        let j = 0;
        for (const piece of pieces) {
          j++;
          // the dissolve: each dot drifts up and goes out on its own time
          let al = aBase, dy = 0;
          if (dq > 0) {
            const hq = hash(i, j, pr.pts.length);
            const td = t - this.tOff;
            al *= 1 - prog(td, 0.12 + 0.55 * hq, 0.45 + 0.5 * hq);
            dy = td > 0 ? -(18 + 40 * hq) * td * td : 0;
            if (al <= 0.004) continue;
          }
          for (let k = 1; k < piece.length; k++) {
            const a = piece[k - 1]!, b = piece[k]!;
            const pa = onPlane(pl, a[0], a[1] + dy), pb = onPlane(pl, b[0] + (piece.length === 2 && dq > 0.5 ? 0.6 : 0), b[1] + dy);
            this.seg(lb, pa, pb, pr.w * (1 + 0.9 * dq), base, al);
          }
        }
      }
    }
  }

  // ------------------------------------------------------------------ type on planes
  planeText(c: CanvasRenderingContext2D, pl: Plane, s: string, fam: string, size: number, u: number, v: number, style: string, align: 'left' | 'center' | 'right' = 'left', tracking = 0) {
    const A = this.aff(pl, u, v);
    if (!A) return null;
    c.setTransform(A.a, A.b, A.c, A.d, A.e, A.f);
    c.font = font(fam, size);
    c.textAlign = align;
    c.textBaseline = 'alphabetic';
    c.letterSpacing = `${tracking}px`;
    c.fillStyle = style;
    c.fillText(s, 0, 0);
    if (tracking) c.letterSpacing = '0px';
    return A;
  }

  /** One lyric word on a board face: dim ahead, wiped orange while sung, then bone. */
  lyricWord(c: CanvasRenderingContext2D, pl: Plane, bw: BWord, t: number, vis: number, dimBase: number) {
    const w = bw.w;
    const show = bw === this.words[0] ? this.T0 : Math.max(this.T0, (bw.side === 0 ? this.wAt : this.wNo).start - 0.4);
    if (t < show) return;
    const lay = bw.lay;
    const pr = Lyrics.wordProgress(w, t);
    const done = t >= w.end + 0.04;
    const xs = lay.width * pr; // sung edge (board units from the word's start)
    const press = pulse(t, w.start, 0.06) * 3;
    c.font = font(F_LYR, LYR_SIZE);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    // glyph by glyph, each under the plane's affine at its own position (true perspective across the word)
    for (const g of lay.glyphs) {
      const A = this.aff(pl, bw.u + g.x + g.w / 2, bw.v);
      if (!A) continue;
      const fa = this.fog(A.w) * vis;
      c.setTransform(A.a, A.b, A.c, A.d, A.e, A.f);
      const x = -g.w / 2;
      if (done) { c.fillStyle = rgba('bone', 0.93 * fa); c.fillText(g.ch, x, press); continue; }
      if (xs < g.x + g.w) { c.fillStyle = rgba('bone', dimBase * fa); c.fillText(g.ch, x, 0); }
      if (xs > g.x) {
        c.save();
        c.beginPath(); c.rect(x - 20, -LYR_SIZE, Math.min(g.w + 40, xs - g.x + 20), LYR_SIZE * 1.4); c.clip();
        c.fillStyle = rgba('signal', fa);
        c.fillText(g.ch, x, press);
        c.restore();
      }
    }
  }

  drawBoardText(c: CanvasRenderingContext2D, t: number, th: number, lit: number) {
    for (const side of [0, 1] as const) {
      const fc = this.facing(side, th);
      if (fc <= 0.05) continue;
      const vis = smoothstep(0.05, 0.3, fc);
      const pl = this.boardPlane(side, th);
      const A0 = this.aff(pl, BOARD.U / 2, BOARD.V / 2);
      if (!A0) continue;
      const fa = this.fog(A0.w) * vis;
      const dimL = side === 0 ? lerp(0.62, 1, lit) : 1;
      // lyric words on this face
      for (const bw of this.words) if (bw.side === side) this.lyricWord(c, pl, bw, t, vis, side === 0 && bw === this.words[0] ? lerp(0.3, 0.4, lit) : 0.3);
      // hours bar labels
      const labs = ['06', '09', '12', '15', '18', '21', '00', '03', '06'];
      labs.forEach((s, i) => this.planeText(c, pl, s, F_MONO, 30, lerp(BAR.u0, BAR.u1, i / 8), BAR.v + BAR.hh + 50, rgba('ash', 0.9 * fa * dimL), 'center'));
      this.planeText(c, pl, 'HOURS', F_MONO, 28, 90, BAR.v + 10, rgba('ash', 0.85 * fa * dimL));
      // the time, by the 02:00 mark
      this.planeText(c, pl, '02:00', F_MONO_B, 36, barU2(26) + 16, BAR.v - 22, rgba('signal', fa * (t < this.wCan.start ? 0.55 + 0.45 * this.blink(t) : 1)));
      if (side === 0) {
        // the sign's hours after its name; the closing time rolls as the spark drags it
        const ch = this.closeHour(t);
        const hh = Math.floor(ch + 1e-6) % 24, mm = Math.floor(((ch - Math.floor(ch + 1e-6)) * 60) / 10 + 1e-6) * 10;
        const close = `${String(hh).padStart(2, '0')}:${String(Math.max(0, mm)).padStart(2, '0')}`;
        const dragging = ch > 21.001;
        this.planeText(c, pl, '· 07:30 – ', F_MONO, 54, this.hoursX, 250, rgba('ash', 0.95 * fa * dimL));
        const x2 = this.hoursX + measure('· 07:30 – ', F_MONO, 54);
        this.planeText(c, pl, close, F_MONO, 54, x2, 250, dragging ? rgba('signal', fa) : rgba('ash', 0.95 * fa * dimL));
        // status window
        const open = t >= this.tDrum;
        const sq = 1 - 0.85 * (1 - clamp(Math.abs(t - this.tDrum) / 0.05));
        const A = this.aff(pl, 1630, 114);
        if (A) {
          c.setTransform(A.a, A.b, A.c * sq, A.d * sq, A.e, A.f);
          c.font = font(F_MONO_B, 40); c.textAlign = 'center'; c.textBaseline = 'middle';
          c.letterSpacing = '4px';
          c.fillStyle = open ? rgba('bone', 0.95 * fa) : rgba('ash', 0.75 * fa * dimL);
          c.fillText(open ? 'OPEN' : 'CLOSED', 2, 2);
          c.letterSpacing = '0px';
          if (open) { c.fillStyle = rgba('signal', fa); c.beginPath(); c.arc(-68, 1, 7, 0, TAU); c.fill(); }
        }
        this.planeText(c, pl, 'last order 20:30', F_MONO, 28, 90, 905, rgba('ash', 0.8 * fa * dimL));
      } else {
        // the stamp, the hours as they are, the footnote
        this.planeText(c, pl, 'CLOSED', F_MONO_B, 96, 395, 170, rgba('signal', 0.98 * fa), 'center', 14);
        this.planeText(c, pl, 'opens 07:30', F_MONO, 34, 740, 122, rgba('ash', 0.9 * fa));
        this.planeText(c, pl, 'in 5 h 30 min', F_MONO, 34, 740, 170, rgba('ash', 0.9 * fa));
        // superscript after "dream." (Archivo figure, set at the cap height)
        const dw = this.words[this.words.length - 1]!;
        if (t >= this.wDream.start - 0.4) {
          const sup = LYR_SIZE * 0.42;
          const x = dw.u + dw.lay.width + 8;
          const on = t >= this.wDream.start;
          this.planeText(c, pl, '1', F.archivo(100, 700), sup, x, dw.v - LYR_SIZE * 0.72 + sup * 0.72, on ? rgba('bone', 0.93 * fa) : rgba('bone', 0.3 * fa));
        }
        const ft = '¹ menu shown for illustrative purposes only';
        const nch = Math.round(prog(t, this.tOff + 0.08, this.tOff + 0.5) * ft.length);
        if (nch > 0) this.planeText(c, pl, ft.slice(0, nch), F_MONO, 32, 90, 905, rgba('ash', 0.95 * fa));
      }
    }
  }

  drawCardText(c: CanvasRenderingContext2D, t: number, lit: number) {
    void lit;
    for (let i = 0; i < 3; i++) {
      const st = this.cardStyle(i, t);
      const ta = menuTypeAlpha({ lit: st.a, dotted: st.dotted });
      if (ta <= 0.004) continue;
      const { pl } = this.cardPlane(i, t);
      const A = this.aff(pl, CARD.w / 2, CARD.h / 2);
      if (!A) continue;
      const fa = this.fog(A.w);
      for (const pr of menuCard(MENU_ITEMS[i]!)) {
        if (pr.kind !== 'text') continue;
        this.planeText(c, pl, pr.s, pr.fam, pr.size, pr.x, pr.y, rgba(pr.ink as PaletteKey, pr.a * ta * fa), pr.align);
      }
    }
  }

  // ------------------------------------------------------------------ the spark
  cardTagWorld(i: number, t: number): V3 {
    const { pl } = this.cardPlane(i, t);
    const [u, v] = menuTagPoint(MENU_ITEMS[i]!);
    return onPlane(pl, u, v);
  }
  sparkWorld(t: number): V3 {
    const M = this.markWorld();
    if (t < this.tGrab) return M;
    const pl = this.boardPlane(0, 0);
    const edge = (h: number) => onPlane(pl, barU2(h), BAR.v - 36);
    if (t < this.tDrum) {
      // grab the 21:00 edge, then drag it out to 02:00
      if (t < this.tDrag0) {
        const k = prog(t, this.tGrab, this.tDrag0 - 0.04, ease.inOutCubic);
        const p = vlerp(M, edge(21), k);
        return add(p, [0, 0.12 * Math.sin(Math.PI * k), 0.04 * Math.sin(Math.PI * k)]);
      }
      return edge(this.closeHour(t));
    }
    // zap onto card 1, hop card to card on the kicks
    const pts = [0, 1, 2].map((i) => this.cardTagWorld(i, t));
    const [p0, p1, p2] = this.pops as [number, number, number];
    if (t < p0) return vlerp(M, pts[0]!, ease.outCubic(prog(t, this.tDrum, p0)));
    const hop = (a: V3, b: V3, t0: number, t1: number, hgt: number) => {
      const k = prog(t, t0, t1, ease.inOutCubic);
      return add(vlerp(a, b, k), [0, hgt * Math.sin(Math.PI * k), 0.15 * Math.sin(Math.PI * k)]);
    };
    if (t < p1) return hop(pts[0]!, pts[1]!, p1 - 0.3, p1, 0.55);
    if (t < p2) return hop(pts[1]!, pts[2]!, p2 - 0.3, p2, 0.55);
    // back up to the 02:00 mark as the board goes over
    const back = this.tFlip1 - 0.02;
    if (t < back) return hop(pts[2]!, M, Math.max(p2 + 0.02, back - 0.26), back, 0.3);
    return M;
  }
  sparkScreen(tb: number): { x: number; y: number } | null {
    this.setCam(this.scratch, this.svp, this.poseAt(tb));
    const q = this.projWith(this.svp, this.sparkWorld(tb));
    return q ? { x: q.x, y: q.y } : null;
  }

  drawSpark(t: number, f: Frame) {
    const g = this.fx; g.clear();
    const q = this.proj(this.sparkWorld(t));
    if (!q) return;
    // the line it drags (a fading orange hairline over its last fifth of a second)
    let prev: { x: number; y: number } | null = null;
    const n = 12;
    for (let j = n; j >= 0; j--) {
      const tt = t - j * 0.018;
      if (tt < this.tGrab) { prev = null; continue; }
      const p = j === 0 ? { x: q.x, y: q.y } : this.sparkScreen(tt);
      if (p && prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 260) {
        const a = 1 - j / n;
        g.seg2(prev.x, prev.y, p.x, p.y, 1.2 + 1.4 * a, [LIN.signal[0] * 1.4, LIN.signal[1] * 1.4, LIN.signal[2] * 1.4], 0.8 * a * a);
      }
      prev = p;
    }
    const hits = [this.tDrum, ...this.pops, this.tFlip1];
    const rate = (tb: number) => {
      for (const h of hits) if (tb >= h && tb < h + 0.07) return 320;
      if (tb >= this.tDrag0 && tb < this.tDrag1) return 70;
      return tb >= this.tOff ? 10 : 26;
    };
    sparkParticles(g, t, (tb) => this.sparkScreen(tb), { rate, rateMax: 320, life: 0.4, speed: 220, gravity: 650, intensity: 0.85, seed: 57 });
    const blink = t < this.tGrab ? 0.35 + 0.65 * this.blink(t) : 1;
    const out = t >= this.tOff ? 0.55 + 0.25 * Math.abs(Math.sin(t * 17)) : 1;
    let hit = 0;
    for (const h of hits) hit = Math.max(hit, pulse(t, h, 0.08));
    const sc = clamp(1.6 / q.w * 3.2, 0.55, 1.25);
    sparkHead(g, q.x, q.y, t, sc * (1 + 0.6 * hit), blink * out * (1 + 0.2 * f.a.kick));
  }
}

void ROOM; void noise1;
