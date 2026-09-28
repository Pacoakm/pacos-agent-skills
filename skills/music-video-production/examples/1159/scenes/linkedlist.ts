// `linkedlist` — "Linked list of my worries, each one points to the next / Null at the end means I
// finally rest" (ink, 3D, drums on, a kick on every beat).
//
// A singly linked list drawn like a CS textbook figure, then given depth: each node is a thin ink
// slab `[ value | • ]` with bone hairline edges (hidden edges drop out: the lines are depth-tested
// against the slabs) and engraved top and side faces, floating in a line through the ink void and
// fogging away into it. The lyric words are the node values, printed on the slabs' faces: each worry
// is a node that pops in on its first word (words light on their own sung times: orange while sung,
// then bone). The spark is the traversal pointer `p`, with a mono `p = p->next` riding it; it hops
// to the next node on every kick and the camera rides it like a train, 3/4 from the front, snapping
// to a new angle on each downbeat.
//  - 60.97 the cut from bone paper: only `head` and the spark, the loop in the corner readout.
//  - "points" (the downbeat): the camera pulls back over the list and every arrow draws on at once,
//    a wave running down the chain; later nodes arrive with their arrow.
//  - the kick after "next": the camera looks ahead into the void where the list ends.
//  - "Null": the last arrow runs down into a hairline ground symbol, `NULL` under it.
//  - the next kick: p = p->next lands on NULL; the spark bounces smaller on three kicks and settles.
//  - "means": the loop exits (`while (p) { … }   // exited`); "I finally": the camera comes to rest;
//    "rest": the spark dims, nothing moves but a slow push. `sleep(8 h)  // scheduled`.
// Line 2 is set flat beside the terminus, the figure's callout. Time label 18:30.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, W, H, clearRT } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { type Word, type Line } from '../../engine/lyrics';
import { LIN, rgba } from '../../engine/palette';
import { F, font, measure, glyphX } from '../../engine/type';
import { SCALE } from '../../engine/scale';
import { clamp, ease, lerp, prog, pulse, noise1, smoothstep, hash, frameIdx } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { NODE_VERT, NODE_FRAG, FLAT_FRAG } from './linkedlist-glsl';

type RGB = [number, number, number];
type P3 = { x: number; y: number; z: number };
type Proj = { x: number; y: number; s: number; w: number };
type Ctx2 = CanvasRenderingContext2D;

// ------------------------------------------------------------------ the figure (world units)
const NV = 2.45;           // value cell width
const NN = 0.95;           // next cell width
const NWD = NV + NN;       // node width
const NH = 1.0;            // node height
const ND = 0.42;           // slab depth
const SP = 5.35;           // node pitch
const HX = -3.35;          // the `head` pointer cell
const PPU = 400;           // texture px per world unit (logical)
// the nodes float a little off the line (static; the figure itself is exact)
const OFF_Y = [0, 0.16, -0.1, 0.2, 0.04, -0.12, 0.14, 0.0];
const OFF_Z = [0, -0.4, 0.22, -0.28, 0.3, -0.18, 0.12, 0.0];
// the value of each node: word indices of line 1 (one or two words per node)
const GROUPS = [[0], [1], [2, 3], [4], [5, 6], [7], [8, 9], [10]];
const deg = Math.PI / 180;

interface NodeT {
  i: number; c: P3; words: Word[]; appear: number; hop: number; addr: string;
  mesh: THREE.Mesh; mat: THREE.RawShaderMaterial;
}
interface CamS { yaw: number; pitch: number; dist: number; fov: number; roll: number; ax: number; ay: number }
interface CamKey { t: number; dur: number; s: CamS; ez?: (x: number) => number }
interface Cam { pos: P3; tgt: P3; roll: number; fov: number; ref: number }

const S = (yaw: number, pitch: number, dist: number, fov: number, roll: number, ax: number, ay: number): CamS =>
  ({ yaw: yaw * deg, pitch: pitch * deg, dist, fov, roll: roll * deg, ax, ay });
const add = (a: P3, b: P3, k = 1): P3 => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const sub = (a: P3, b: P3): P3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const lerp3 = (a: P3, b: P3, k: number): P3 => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
const V = (x: number, y: number, z: number): P3 => ({ x, y, z });
function bez(a: P3, b: P3, c: P3, d: P3, u: number): P3 {
  const v = 1 - u;
  const k0 = v * v * v, k1 = 3 * v * v * u, k2 = 3 * v * u * u, k3 = u * u * u;
  return { x: a.x * k0 + b.x * k1 + c.x * k2 + d.x * k3, y: a.y * k0 + b.y * k1 + c.y * k2 + d.y * k3, z: a.z * k0 + b.z * k1 + c.z * k2 + d.z * k3 };
}

export default class LinkedList extends Scene {
  cam = new THREE.PerspectiveCamera(34, W / H, 0.05, 400);
  vp = new THREE.Matrix4();
  v4 = new THREE.Vector4();
  scratch = new THREE.PerspectiveCamera(34, W / H, 0.05, 400);
  svp = new THREE.Matrix4();
  world = new THREE.Scene();
  lines = new LineBatch(20000, { screen2D: false, blend: 'normal', depthTest: true });
  glow = new LineBatch(3000, { screen2D: false, blend: 'add', depthTest: true });
  fx = new LineBatch(4000);
  L = new Layer2D();

  T0 = 0; T1 = 0;
  l1!: Line; l2!: Line;
  nodes: NodeT[] = [];
  headMesh!: THREE.Mesh; headMat!: THREE.RawShaderMaterial;
  heads: THREE.Mesh[] = [];  // arrowheads (flat triangles in the world)
  kicks: number[] = [];
  downs: number[] = [];
  hops: number[] = [];       // hop k lands on rest k+1 (0 = head → node 0, …, 8 = node 7 → NULL)
  bounces: number[] = [];    // the settling hops on NULL
  tNull = 0; tNullEnd = 0;   // "Null" (the last arrow draws)
  tPoints = 0; tPointsEnd = 0;
  tMeans = 0; tFinally = 0; tRest = 0; tRestEnd = 0;
  tLook = 0;                 // the kick after "next": look ahead into the void
  tSettle = 0;               // the last bounce: the camera starts its final glide
  G = V(0, 0, 0);            // ground-symbol stem top
  keys: CamKey[] = [];
  fMono = F.mono(400); fMonoM = F.mono(500);
  fVal = F.archivo(100, 700);
  fCall = F.archivo(100, 600);
  valSize = 180;

  override init() {
    const { audio: au, lyrics: ly, start, end } = this.ctx;
    this.T0 = start; this.T1 = end;
    this.l1 = ly.get('Linked list of my worries');
    this.l2 = ly.get('Null at the end');
    const w1 = this.l1.words, w2 = this.l2.words;
    this.kicks = au.events('kick', start - 0.2, end + 0.5).map((e) => e[0]);
    this.downs = au.downbeats.filter((d) => d > start + 0.05 && d < end - 0.05);
    const kickAfter = (t: number) => this.kicks.find((k) => k >= t) ?? t;

    // ---- node values + texture size
    const texts = GROUPS.map((g) => g.map((wi) => w1[wi]!.w.replace(/[,.]$/, '')).join(' '));
    const maxW = Math.max(...texts.map((s) => measure(s, this.fVal, 100)));
    this.valSize = Math.min(188, Math.floor((NV * PPU * 0.84 * 100) / maxW));

    const geo = new THREE.BoxGeometry(NWD, NH, ND);
    let prevHop = start;
    GROUPS.forEach((g, i) => {
      const words = g.map((wi) => w1[wi]!);
      const appear = words[0]!.start;
      const hop = Math.max(kickAfter(appear + 0.04), kickAfter(prevHop + 0.1));
      prevHop = hop;
      const c = V(i * SP, OFF_Y[i]!, OFF_Z[i]!);
      const tex = this.valueTexture(words.map((w) => w.w.replace(/[,.]$/, '')));
      const mat = this.nodeMat(tex, true, V(NWD / 2 - NN / 2, 0, 0.075));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.world.add(mesh);
      const addr = '0x' + (0x2000 + Math.floor(hash(i, 17) * 0xdfff)).toString(16).padStart(4, '0');
      this.nodes.push({ i, c, words, appear, hop, addr, mesh, mat });
    });
    // the `head` pointer cell
    const hgeo = new THREE.BoxGeometry(NN, NH, ND);
    this.headMat = this.nodeMat(null, false, V(0, 0, 0.075));
    this.headMesh = new THREE.Mesh(hgeo, this.headMat);
    this.headMesh.position.set(HX, 0, 0);
    this.headMesh.frustumCulled = false;
    this.world.add(this.headMesh);
    const tri = new THREE.BufferGeometry();
    const AL = 0.26, AW = 0.095;
    tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -AL, AW, 0, -AL, -AW, 0], 3));
    tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    for (let j = 0; j < 8; j++) {
      const m = new THREE.Mesh(tri, new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3, vertexShader: NODE_VERT, fragmentShader: FLAT_FRAG, side: THREE.DoubleSide,
        uniforms: { col: { value: new THREE.Vector3() }, camPos: { value: new THREE.Vector3() }, fog: { value: new THREE.Vector2(10, 9) } },
        depthTest: true, depthWrite: true,
      }));
      const n = this.nodes[j]!;
      m.position.set(n.c.x - NWD / 2 - 0.03, n.c.y, n.c.z + ND / 2 + 0.003);
      m.frustumCulled = false;
      this.world.add(m);
      this.heads.push(m);
    }

    // ---- beats
    this.hops = this.nodes.map((n) => n.hop);
    this.tNull = w2[0]!.start; this.tNullEnd = w2[0]!.end;
    const hn = kickAfter(this.tNull + 0.1);
    this.hops.push(hn);
    const ki = this.kicks.indexOf(hn);
    this.bounces = this.kicks.slice(ki + 1, ki + 4);
    this.tLook = this.kicks.find((k) => k > this.hops[7]! + 0.1 && k < hn - 0.1) ?? this.hops[7]! + 0.46;
    this.tPoints = w1[7]!.start; this.tPointsEnd = w1[7]!.end;
    this.tMeans = w2[4]!.start; this.tFinally = w2[5]!.start;
    this.tRest = w2[7]!.start; this.tRestEnd = w2[7]!.end;
    this.tSettle = this.bounces[this.bounces.length - 1] ?? this.tMeans;
    const n7 = this.nodes[7]!.c;
    this.G = V(n7.x + NWD / 2 + 2.25, n7.y - 0.2, n7.z + ND / 2);

    // ---- camera keys
    const dbAfter = (t: number) => this.downs.find((d) => d >= t - 0.06) ?? t;
    const H = this.hops;
    this.keys = [
      // the cut: close on `head`, easing back out of a punch-in
      { t: start, dur: 0.01, s: S(46, 13, 5.6, 40, -3, 1.6, -0.45) },
      { t: start + 0.01, dur: 0.7, s: S(44, 12, 7.6, 40, -2, 2.2, -0.45) },
      // the ride: 3/4 from the front, the list running away into the fog; a new angle per downbeat
      { t: dbAfter(w1[1]!.start), dur: 0.5, s: S(53, 6, 8.2, 40, -2.5, 2.6, -0.5) },
      { t: H[3]!, dur: 0.45, s: S(38, 15, 8.4, 40, 1.5, 2.4, -0.55) },
      // "points": pull back and up over the whole chain while every arrow draws on
      { t: dbAfter(this.tPoints), dur: 0.6, s: S(24, 23, 27, 33, 0, -10.5, -0.9) },
      { t: H[6]!, dur: 0.42, s: S(47, 9, 8.0, 40, -1, 2.6, -0.5) },
      { t: H[7]!, dur: 0.42, s: S(55, 7, 7.8, 40, 1.5, 2.8, -0.5) },
      // the kick after "next": look ahead into the void where the list ends
      { t: this.tLook, dur: 0.5, s: S(33, 10, 10.5, 38, 0, 4.2, -0.8) },
      // p -> NULL: swing round the end of the list; it recedes into the fog behind
      { t: hn, dur: 0.75, s: S(-36, 12, 11.2, 36, 0, -1.4, 0.35) },
      // the last bounce: the camera glides to its final place and is still from "rest" on
      { t: this.tSettle, dur: this.tRest - this.tSettle, s: S(-46, 11, 11.4, 35, 0, -1.9, 0.25), ez: ease.inOutCubic },
    ];
  }

  nodeMat(tex: THREE.Texture | null, hasText: boolean, dot: P3) {
    return new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: NODE_VERT, fragmentShader: NODE_FRAG,
      uniforms: {
        tex: { value: tex }, hasText: { value: hasText ? 1 : 0 },
        valRect: { value: new THREE.Vector4(-NWD / 2, -NH / 2, -NWD / 2 + NV, NH / 2) },
        colA: { value: new THREE.Vector3() }, colB: { value: new THREE.Vector3() },
        dotC: { value: new THREE.Vector3(dot.x, dot.y, dot.z) }, dotCol: { value: new THREE.Vector3(...LIN.bone) },
        camPos: { value: new THREE.Vector3() }, fog: { value: new THREE.Vector2(10, 12) },
        on: { value: 1 }, face: { value: 0 },
      },
      depthTest: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
    });
  }

  /** The value cell's print: word A in red, word B in green (kerned as one string), centred. */
  valueTexture(words: string[]) {
    const w = NV * PPU, h = NH * PPU, s = SCALE;
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * s); cv.height = Math.round(h * s);
    const c = cv.getContext('2d')!;
    c.scale(s, s);
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    const text = words.join(' ');
    const fs = this.valSize;
    c.font = font(this.fVal, fs);
    const tw = measure(text, this.fVal, fs);
    const m = c.measureText('H');
    const cap = m.actualBoundingBoxAscent;
    const x0 = (w - tw) / 2, yb = h / 2 + cap / 2;
    c.textBaseline = 'alphabetic';
    c.globalCompositeOperation = 'lighter';
    let idx = 0;
    words.forEach((wd, k) => {
      const x = x0 + glyphX(text, idx, this.fVal, fs);
      c.fillStyle = k === 0 ? 'rgb(255,0,0)' : 'rgb(0,255,0)';
      c.fillText(wd, x, yb);
      idx += wd.length + 1;
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
    return tex;
  }

  // ------------------------------------------------------------------ the pointer
  /** Where p rests: 0 = head, 1..8 = nodes, 9 = NULL. */
  rest(k: number): P3 {
    if (k <= 0) return V(HX, NH / 2 + 0.58, ND / 2);
    if (k <= 8) {
      const c = this.nodes[k - 1]!.c;
      return V(c.x - NWD / 2 + NV / 2, c.y + NH / 2 + 0.58, c.z + ND / 2);
    }
    return V(this.G.x, this.G.y - 0.62, this.G.z);
  }
  hopRun(k: number) { return k === 8 ? 0.3 : 0.17; }
  /** The pointer's hop index state at t: last landed rest and the hop in progress (u in 0..1). */
  sparkPos(t: number): P3 {
    const Hh = this.hops;
    for (let k = 0; k < Hh.length; k++) {
      const land = Hh[k]!, run = this.hopRun(k);
      if (t < land - run) return this.settle(k, t);
      if (t < land) {
        const u = ease.inOutCubic(prog(t, land - run, land));
        const a = this.rest(k), b = this.rest(k + 1);
        if (k === 8) {
          // down the last arrow into the ground
          return bez(a, add(a, V(2.2, 0.7, 0)), add(b, V(0, 1.9, 0)), b, u);
        }
        const p = lerp3(a, b, u);
        p.y += 0.85 * Math.sin(Math.PI * u) * (1 + 0.15 * Math.abs(b.x - a.x) / SP - 0.15);
        return p;
      }
    }
    return this.settle(Hh.length, t);
  }
  /** At rest on k (the NULL rest bounces, smaller each kick, and settles). */
  settle(k: number, t: number): P3 {
    const p = this.rest(k);
    if (k === 9) {
      const amp = [0.42, 0.2, 0.08];
      this.bounces.forEach((b, i) => {
        const u = prog(t, b - 0.19, b);
        if (u > 0 && u < 1) p.y += amp[i]! * Math.sin(Math.PI * u);
      });
    }
    return p;
  }
  /** The landed rest index at t. */
  landed(t: number) {
    let k = 0;
    this.hops.forEach((h, i) => { if (t >= h) k = i + 1; });
    return k;
  }

  // ------------------------------------------------------------------ camera
  focus(t: number): P3 {
    let f = this.rest(0);
    this.hops.forEach((h, k) => {
      const e = k === 8 ? ease.outCubic(prog(t, h - 0.2, h + 0.9)) : ease.outCubic(prog(t, h - 0.08, h + 0.4));
      if (e > 0) f = add(f, sub(this.rest(k + 1), this.rest(k)), e);
    });
    return f;
  }
  camAt(t: number): Cam {
    let c = { ...this.keys[0]!.s };
    let ld = Math.log(c.dist);
    for (const k of this.keys) {
      const e = (k.ez ?? ease.outExpo)(prog(t, k.t, k.t + k.dur));
      if (e <= 0) break;
      const b = k.s;
      c = { yaw: lerp(c.yaw, b.yaw, e), pitch: lerp(c.pitch, b.pitch, e), dist: 0, fov: lerp(c.fov, b.fov, e), roll: lerp(c.roll, b.roll, e), ax: lerp(c.ax, b.ax, e), ay: lerp(c.ay, b.ay, e) };
      ld = lerp(ld, Math.log(b.dist), e);
    }
    const lt = t - this.T0;
    // a slow drift between the snaps, gone once the list has ended
    const live = 1 - prog(t, this.tMeans - 0.3, this.tRest, ease.inOutQuad);
    const yaw = c.yaw + 1.1 * deg * Math.sin(lt * 0.85) * live;
    const pitch = c.pitch + 0.55 * deg * Math.sin(lt * 1.2 + 1) * live;
    // the first still moment: a slow push, nothing else
    const push = 1 - 0.05 * ease.inQuad(prog(t, this.tRest - 0.1, this.T1 + 0.3));
    const dist = Math.exp(ld) * push;
    const f = this.focus(t);
    const tgt = V(f.x + c.ax, f.y + c.ay, f.z * 0.5);
    const pos = V(tgt.x - dist * Math.sin(yaw) * Math.cos(pitch), tgt.y + dist * Math.sin(pitch), tgt.z + dist * Math.cos(yaw) * Math.cos(pitch));
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
  projWith(cam: THREE.PerspectiveCamera, vp: THREE.Matrix4, p: P3): Proj | null {
    const v = this.v4.set(p.x, p.y, p.z, 1).applyMatrix4(vp);
    if (v.w <= 0.05) return null;
    const P11 = cam.projectionMatrix.elements[5]!;
    return { x: (v.x / v.w * 0.5 + 0.5) * W, y: (0.5 - v.y / v.w * 0.5) * H, s: (0.5 * H * P11) / v.w, w: v.w };
  }
  proj(p: P3) { return this.projWith(this.cam, this.vp, p); }

  // ------------------------------------------------------------------ render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const cm = this.camAt(t);
    this.setCam(this.cam, this.vp, cm);

    clearRT(renderer, out, LIN.ink);
    this.updateNodes(t, cm);
    renderer.setRenderTarget(out);
    renderer.render(this.world, this.cam);

    const lb = this.lines; lb.clear();
    const gl = this.glow; gl.clear();
    this.drawFigure(lb, gl, t, cm);
    lb.render(renderer, out, this.cam);
    gl.render(renderer, out, this.cam);

    const c = this.L.ctx; this.L.clear();
    this.drawLabels(c, t, cm);
    this.drawReadout(c, t);
    this.drawCallout(c, t);
    this.drawFootnote(c, t);
    comp.draw(renderer, this.L.upload(), out);

    this.drawSpark(t, f);
    this.fx.render(renderer, out);

    // ---- post: a jolt on each landing, a bigger one on the downbeats; nothing once at rest
    const calm = 1 - prog(t, this.tSettle + 0.1, this.tSettle + 0.3);
    let sh = 0;
    for (const h of this.hops) sh += 3.2 * pulse(t, h, 0.05);
    for (const d of this.downs) sh += 6.5 * pulse(t, d, 0.06);
    sh += 9 * pulse(t, this.T0, 0.06);
    sh *= calm;
    const fi = frameIdx(t);
    const shake: [number, number] = [(hash(fi, 3) - 0.5) * 2 * sh, (hash(fi, 4) - 0.5) * 2 * sh];
    let zoom = 1 + 0.035 * pulse(t, this.T0, 0.09);
    for (const d of this.downs) zoom += 0.012 * pulse(t, d, 0.09) * calm;
    return {
      bloomThreshold: 1.0, bloomKnee: 0.05, bloom: 0.7, bloomRadius: 0.6, halation: 0.12,
      vignette: 0.44, grain: 0.05, ca: 0.8 + 1.2 * pulse(t, this.T0, 0.08), hud: 0, shake, zoom,
    };
  }

  // ------------------------------------------------------------------ nodes (meshes)
  wordCol(w: Word, t: number, visited: number): RGB {
    const bone = LIN.bone, sg = LIN.signal;
    if (t < w.start) return [bone[0] * 0.28, bone[1] * 0.28, bone[2] * 0.28];
    const hot = 1 - prog(t, w.end - 0.02, w.end + 0.28, ease.inOutQuad);
    const b = lerp(0.92, 0.5, visited);
    return [lerp(bone[0] * b, sg[0] * 0.95, hot), lerp(bone[1] * b, sg[1] * 0.95, hot), lerp(bone[2] * b, sg[2] * 0.95, hot)];
  }
  nodeOn(n: NodeT, t: number) { return ease.outExpo(prog(t, n.appear, n.appear + 0.2)); }
  nodeScale(n: NodeT, t: number) { return lerp(0.9, 1, this.nodeOn(n, t)); }
  /** 0 while p is on (or before) the node, → 1 once p has moved on. */
  visited(i: number, t: number) { return prog(t, this.hops[i + 1]!, this.hops[i + 1]! + 0.5, ease.outCubic); }

  updateNodes(t: number, cm: Cam) {
    const cp = cm.pos;
    const fogS = cm.ref + 2.5, fogL = 9;
    const kL = this.landed(t);
    for (const n of this.nodes) {
      const on = this.nodeOn(n, t);
      n.mesh.visible = on > 0.001;
      if (!n.mesh.visible) continue;
      const s = this.nodeScale(n, t);
      n.mesh.position.set(n.c.x, n.c.y, n.c.z);
      n.mesh.scale.setScalar(s);
      const u = n.mat.uniforms;
      const vis = this.visited(n.i, t);
      const [wa, wb] = n.words;
      (u.colA!.value as THREE.Vector3).set(...this.wordCol(wa!, t, vis));
      if (wb) (u.colB!.value as THREE.Vector3).set(...this.wordCol(wb, t, vis));
      (u.camPos!.value as THREE.Vector3).set(cp.x, cp.y, cp.z);
      (u.fog!.value as THREE.Vector2).set(fogS, fogL);
      u.on!.value = on;
      u.face!.value = kL === n.i + 1 ? pulse(t, n.hop, 0.12) : 0;
      const dI = lerp(0.85, 0.5, vis);
      (u.dotCol!.value as THREE.Vector3).set(LIN.bone[0] * dI, LIN.bone[1] * dI, LIN.bone[2] * dI);
    }
    this.heads.forEach((m, j) => {
      const r = this.arrowR(j, t);
      m.visible = r > 0.985;
      const u = (m.material as THREE.RawShaderMaterial).uniforms;
      const I = this.arrowI(j, t);
      (u.col!.value as THREE.Vector3).set(LIN.bone[0] * I, LIN.bone[1] * I, LIN.bone[2] * I);
      (u.camPos!.value as THREE.Vector3).set(cp.x, cp.y, cp.z);
      (u.fog!.value as THREE.Vector2).set(fogS, fogL);
    });
    const hu = this.headMat.uniforms;
    (hu.camPos!.value as THREE.Vector3).set(cp.x, cp.y, cp.z);
    (hu.fog!.value as THREE.Vector2).set(fogS, fogL);
    hu.on!.value = prog(t, this.T0 - 0.01, this.T0 + 0.05);
    const hI = lerp(0.85, 0.5, prog(t, this.hops[0]!, this.hops[0]! + 0.5));
    (hu.dotCol!.value as THREE.Vector3).set(LIN.bone[0] * hI, LIN.bone[1] * hI, LIN.bone[2] * hI);
  }

  // ------------------------------------------------------------------ hairlines (3D)
  fogA(d: number, ref: number) { return Math.exp(-Math.max(0, d - ref - 2.5) / 9) * smoothstep(0.3, 1.2, d); }

  drawFigure(lb: LineBatch, gl: LineBatch, t: number, cm: Cam) {
    const cp = cm.pos, ref = cm.ref;
    const bone = LIN.bone, sg = LIN.signal;
    const seg = (b: LineBatch, a: P3, c: P3, w: number, col: RGB, al: number) => {
      const d = Math.hypot((a.x + c.x) / 2 - cp.x, (a.y + c.y) / 2 - cp.y, (a.z + c.z) / 2 - cp.z);
      const fa = this.fogA(d, ref) * al;
      if (fa < 0.004) return;
      const wd = clamp(0.8 + 4.5 / d, 1.0, 2.2) * w;
      b.seg(a.x, a.y, a.z, c.x, c.y, c.z, wd, col[0], col[1], col[2], fa);
    };
    const kL = this.landed(t);
    const scl = (k: number): RGB => [bone[0] * k, bone[1] * k, bone[2] * k];

    // ---- box edges (depth-tested: hidden edges drop out)
    const box = (c: P3, w: number, s: number, col: RGB, al: number, divX: number | null) => {
      const hx = (w / 2) * s, hy = (NH / 2) * s, hz = (ND / 2) * s;
      const P = (x: number, y: number, z: number) => V(c.x + x * hx, c.y + y * hy, c.z + z * hz);
      const E: [P3, P3][] = [];
      for (const z of [-1, 1]) {
        E.push([P(-1, -1, z), P(1, -1, z)], [P(-1, 1, z), P(1, 1, z)], [P(-1, -1, z), P(-1, 1, z)], [P(1, -1, z), P(1, 1, z)]);
      }
      for (const x of [-1, 1]) for (const y of [-1, 1]) E.push([P(x, y, -1), P(x, y, 1)]);
      for (const [a, b] of E) seg(lb, a, b, 1.15, col, al);
      if (divX !== null) {
        const x = c.x + divX * s;
        seg(lb, V(x, c.y - hy, c.z + hz), V(x, c.y + hy, c.z + hz), 1.1, col, al);
        seg(lb, V(x, c.y + hy, c.z + hz), V(x, c.y + hy, c.z - hz), 1.0, col, al * 0.8);
      }
    };
    // head
    const hOn = prog(t, this.T0 - 0.01, this.T0 + 0.05);
    const hVis = prog(t, this.hops[0]!, this.hops[0]! + 0.5);
    box(V(HX, 0, 0), NN, 1, scl(lerp(0.8, 0.5, hVis)), hOn, null);
    for (const n of this.nodes) {
      const on = this.nodeOn(n, t);
      if (on <= 0.001) continue;
      const vis = this.visited(n.i, t);
      const hit = kL === n.i + 1 ? pulse(t, n.hop, 0.14) : 0;
      const k = lerp(0.82, 0.5, vis) + 0.15 * (1 - on);
      const col: RGB = [lerp(bone[0] * k, sg[0] * 0.9, hit), lerp(bone[1] * k, sg[1] * 0.9, hit), lerp(bone[2] * k, sg[2] * 0.9, hit)];
      box(n.c, NWD, this.nodeScale(n, t), col, on, -NWD / 2 + NV);
    }

    // ---- arrows: p->next (they draw on "points": a wave down the chain; later ones with their node)
    const ac = scl(0.78);
    for (let j = 0; j < 8; j++) {
      const n = this.nodes[j]!;
      const from = j === 0 ? V(HX, 0, ND / 2 + 0.004) : this.dotAt(j - 1);
      const to = V(n.c.x - NWD / 2 - 0.035, n.c.y, n.c.z + ND / 2);
      const r = this.arrowR(j, t);
      if (r <= 0) continue;
      this.arrow(seg, lb, from, add(from, V(1.25, 0, 0)), add(to, V(-1.25, 0, 0)), to, r, scl(this.arrowI(j, t)), true);
    }
    // the last arrow: down into the ground, NULL
    {
      const from = this.dotAt(7), G = this.G;
      // drawn fast on "Null", so the ground is standing before p lands on it
      const tN = this.tNull;
      const r = ease.inOutCubic(prog(t, tN, tN + 0.2));
      if (r > 0) {
        this.arrow(seg, lb, from, add(from, V(1.5, 0, 0)), add(G, V(0, 1.0, 0)), G, r, ac, false);
        const stem = prog(t, tN + 0.17, tN + 0.24);
        const yb = G.y - 0.62;
        if (stem > 0) seg(lb, G, V(G.x, lerp(G.y, yb, stem), G.z), 1.2, ac, 1);
        const bars = [0.46, 0.3, 0.14];
        bars.forEach((hw, i) => {
          const e = ease.outExpo(prog(t, tN + 0.22 + i * 0.04, tN + 0.4 + i * 0.04));
          if (e <= 0) return;
          const y = yb - i * 0.16;
          seg(lb, V(G.x - hw * e, y, G.z), V(G.x + hw * e, y, G.z), 1.7, scl(0.88), 1);
        });
      }
    }

    // ---- the line p drags through space on a hop (world space, so camera moves don't bend it)
    {
      const n = 10, dt = 0.009;
      let prev = this.sparkPos(t);
      for (let j = 1; j <= n; j++) {
        const tb = t - j * dt;
        if (tb < this.T0) break;
        const q = this.sparkPos(tb);
        const L = Math.hypot(q.x - prev.x, q.y - prev.y, q.z - prev.z);
        if (L > 1e-4) {
          const a = Math.pow(1 - (j - 1) / n, 1.6);
          seg(gl, prev, q, 1.0 + 1.6 * a, [sg[0] * 1.5 * a, sg[1] * 1.5 * a, sg[2] * 1.5 * a], a);
        }
        prev = q;
      }
    }

    // ---- the centre line of the figure (technical-drawing dash-dot), running on into the void and ending under NULL
    {
      const y = -1.5, x0 = HX - 1.2, x1 = this.G.x;
      const cl = scl(0.32);
      const grow = ease.outExpo(prog(t, this.T0, this.T0 + 0.6));
      const xe = lerp(x0, x1 + 30, grow);
      // before "Null" the line runs on into the fog; the list's end cuts it at the ground
      const cut = prog(t, this.tNull + 0.2, this.tNull + 0.5, ease.outCubic);
      const xEnd = lerp(xe, x1, cut);
      for (let x = x0; x < xEnd; x += 1.0) {
        seg(lb, V(x, y, 0), V(Math.min(x + 0.62, xEnd), y, 0), 1.0, cl, 1);
        if (x + 0.8 < xEnd) seg(lb, V(x + 0.76, y, 0), V(x + 0.84, y, 0), 1.0, cl, 1);
      }
    }

    // ---- the pointer's tick: a short hairline from p down to the node it holds
    const rest = this.landed(t);
    const sp = this.sparkPos(t);
    const at = this.rest(rest);
    const still = Math.hypot(sp.x - at.x, sp.y - at.y) < 0.02;
    if (still && rest <= 8) {
      const top = rest === 0 ? NH / 2 : this.nodes[rest - 1]!.c.y + NH / 2;
      const a0 = V(at.x, at.y - 0.16, at.z), a1 = V(at.x, top + 0.07, at.z);
      const sgc: RGB = [sg[0] * 0.8, sg[1] * 0.8, sg[2] * 0.8];
      seg(gl, a0, a1, 1.2, sgc, 0.9);
      seg(gl, a1, V(a1.x - 0.07, a1.y + 0.11, a1.z), 1.2, sgc, 0.9);
      seg(gl, a1, V(a1.x + 0.07, a1.y + 0.11, a1.z), 1.2, sgc, 0.9);
    }
  }
  /** Draw-on of arrow j (into node j): "points" runs a wave down the chain; later ones come with their node. */
  arrowR(j: number, t: number) {
    const t0 = j <= 5 ? this.tPoints + j * 0.055 : this.nodes[j]!.appear + 0.02;
    return ease.outCubic(prog(t, t0, t0 + 0.24));
  }
  arrowI(j: number, t: number) { return lerp(0.78, 0.5, j === 0 ? prog(t, this.hops[0]!, this.hops[0]! + 0.5) : this.visited(j - 1, t)); }
  dotAt(i: number): P3 {
    const c = this.nodes[i]!.c;
    return V(c.x + NWD / 2 - NN / 2, c.y, c.z + ND / 2 + 0.004);
  }
  arrow(seg: (b: LineBatch, a: P3, c: P3, w: number, col: RGB, al: number) => void, lb: LineBatch, a: P3, b: P3, c: P3, d: P3, r: number, col: RGB, head: boolean) {
    const n = 36;
    const m = Math.ceil(n * r);
    let prev = a;
    for (let i = 1; i <= m; i++) {
      const u = Math.min(i / n, r);
      const p = bez(a, b, c, d, u);
      seg(lb, prev, p, 1.25, col, 1);
      prev = p;
    }
  }

  // ------------------------------------------------------------------ flat type
  drawLabels(c: Ctx2, t: number, cm: Cam) {
    const fs = 20;
    c.textBaseline = 'alphabetic';
    // addresses under the nodes
    c.textAlign = 'left';
    c.font = font(this.fMono, fs);
    for (const n of this.nodes) {
      const on = prog(t, n.appear + 0.05, n.appear + 0.2);
      if (on <= 0) continue;
      const p = this.proj(V(n.c.x - NWD / 2, n.c.y - NH / 2 - 0.2, n.c.z + ND / 2));
      if (!p) continue;
      const a = on * this.fogA(p.w, cm.ref) * lerp(1, 0.6, this.visited(n.i, t));
      if (a < 0.02) continue;
      c.fillStyle = rgba('ash', 0.8 * a);
      c.fillText(n.addr, p.x, p.y + fs * 0.8);
    }
    // head
    {
      const p = this.proj(V(HX - NN / 2, NH / 2 + 0.2, ND / 2));
      if (p) {
        const a = prog(t, this.T0, this.T0 + 0.1) * this.fogA(p.w, cm.ref);
        c.font = font(this.fMonoM, 22);
        c.fillStyle = rgba('bone', 0.8 * a);
        c.textAlign = 'left';
        c.fillText('head', p.x, p.y);
      }
    }
    // NULL
    {
      const r = prog(t, this.tNull + 0.28, this.tNull + 0.45);
      const G = this.G;
      const p = this.proj(V(G.x, G.y - 0.62 - 0.32 - 0.38, G.z));
      if (r > 0 && p) {
        const s = 'NULL';
        const nCh = Math.ceil(r * s.length);
        c.font = font(this.fMonoM, 24);
        c.textAlign = 'left';
        const w = measure(s, this.fMonoM, 24);
        c.fillStyle = rgba('bone', 0.92);
        c.fillText(s.slice(0, nCh), p.x - w / 2, p.y + 8);
        const q = this.proj(V(G.x, G.y - 0.62 - 0.32 - 0.38, G.z));
        if (q) {
          c.font = font(this.fMono, 20);
          c.fillStyle = rgba('ash', 0.75 * r);
          const s2 = '0x0000';
          c.fillText(s2, q.x - measure(s2, this.fMono, 20) / 2, q.y + 36);
        }
      }
    }
    // the pointer's label rides the spark
    const sp = this.sparkPos(t);
    const p = this.proj(sp);
    if (p) {
      const k = this.landed(t);
      const rest = prog(t, this.tRest, this.tRestEnd, ease.inOutQuad);
      let lab: [string, string];
      if (k === 0) lab = ['p', ' = head'];
      else if (k <= 8) lab = ['p', ' = p->next'];
      else lab = ['p', ' == NULL'];
      const hopFlash = pulse(t, this.hops[Math.max(0, k - 1)]!, 0.18) * (k > 0 ? 1 : 0);
      const a = prog(t, this.T0, this.T0 + 0.08) * lerp(1, 0.55, rest);
      c.font = font(this.fMonoM, 22);
      c.textAlign = 'left';
      // at NULL the label steps clear of the ground bars
      const atNull = k >= 9 ? 1 : 0;
      const x = p.x + 30 + 44 * atNull * clamp(p.s / 150, 0.6, 1.4), y = p.y + 8 - 16 * atNull;
      c.fillStyle = rgba('bone', a);
      c.fillText(lab[0], x, y);
      c.font = font(this.fMono, 22);
      c.fillStyle = hopFlash > 0.3 ? rgba('bone', a) : rgba('ash', a);
      c.fillText(lab[1], x + measure(lab[0], this.fMonoM, 22), y);
    }
  }

  /** The loop, top left: the line p is executing is lit; on exit the body folds away. */
  drawReadout(c: Ctx2, t: number) {
    const a = t >= this.T0 - 0.01 ? 1 : 0;
    if (a <= 0) return;
    const X = 120, Y = 128, fs = 21, lh = 31;
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    // time label
    c.font = font(this.fMonoM, 26);
    c.fillStyle = rgba('bone', 0.92 * a);
    c.fillText('18:30', X, Y);
    c.font = font(this.fMono, 20);
    c.fillStyle = rgba('graphite', a);
    c.fillText('worries.c', X + 104, Y);
    c.fillStyle = rgba('graphite', 0.9 * a);
    c.fillRect(X, Y + 16, 380, 1);

    const k = this.landed(t);
    const hopK = this.hops.findIndex((h, i) => t >= h - this.hopRun(i) && t < h + 0.1);
    // which line is running
    let act = 0;
    if (hopK >= 0) act = 3;
    else if (k === 0) act = 0;
    else if (k <= 8) act = 2;
    else act = 1;
    const fold = ease.outExpo(prog(t, this.tMeans, this.tMeans + 0.35));
    const lines = ['Node *p = head;', 'while (p) {', '    worry(p->value);', '    p = p->next;', '}'];
    const y0 = Y + 52;
    const wW = measure('while (p) ', this.fMono, fs);
    lines.forEach((s, i) => {
      let y = y0 + i * lh;
      let al = a;
      if (i >= 2) {
        // the body folds up into the `while` line
        y = lerp(y, y0 + lh, fold);
        al *= 1 - clamp(fold * 1.6);
      }
      if (al <= 0.01) return;
      const on = i === act && fold < 0.5;
      c.font = font(on ? this.fMonoM : this.fMono, fs);
      c.fillStyle = on ? rgba('bone', al) : rgba('graphite', al * 1.2);
      if (i === 1 && fold > 0) {
        c.fillStyle = rgba(fold > 0.5 ? 'ash' : 'graphite', al * 1.1);
        c.fillText('while (p)', X, y);
        const s2 = '{ … }';
        const nC = Math.floor(clamp((fold - 0.3) / 0.4) * s2.length);
        c.fillText(nC > 0 ? s2.slice(0, nC) : '{', X + wW, y);
        const ex = prog(t, this.tMeans + 0.2, this.tMeans + 0.5);
        if (ex > 0) {
          const s3 = '   // exited';
          c.fillStyle = rgba('bone', 0.9 * al);
          c.fillText(s3.slice(0, Math.ceil(ex * s3.length)), X + wW + measure(s2, this.fMono, fs), y);
        }
        return;
      }
      c.fillText(s, X, y);
      if (on) {
        // the program counter: a small bone bar in the gutter
        c.fillStyle = rgba('bone', al * 0.9);
        c.fillRect(X - 18, y - fs * 0.62, 5, fs * 0.66);
      }
    });
  }

  /** Line 2 — the figure's callout, flat, beside the terminus. */
  drawCallout(c: Ctx2, t: number) {
    const ws = this.l2.words;
    const a0 = prog(t, ws[0]!.start - 0.35, ws[0]!.start);
    if (a0 <= 0) return;
    const G = this.G;
    const anchor = this.proj(V(G.x + 1.1, G.y + 0.55, G.z));
    if (!anchor) return;
    const fs = 60;
    const lh = fs * 1.08;
    const rows = [ws.slice(0, 4), ws.slice(4)];
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = font(this.fCall, fs);
    // keep the block inside title-safe
    const wMax = Math.max(...rows.map((row) => measure(row.map((w) => w.w).join(' '), this.fCall, fs)));
    const ax = Math.min(anchor.x, W - 110 - wMax);
    rows.forEach((row, r) => {
      const text = row.map((w) => w.w).join(' ');
      let idx = 0;
      const y = anchor.y + r * lh;
      for (const w of row) {
        const x = ax + glyphX(text, idx, this.fCall, fs);
        idx += w.w.length + 1;
        let col: string;
        if (t < w.start) col = rgba('bone', 0.3 * a0);
        else {
          const hot = 1 - prog(t, w.end - 0.02, w.end + 0.3, ease.inOutQuad);
          col = hot > 0.5 ? rgba('signal', 1) : rgba('bone', 0.94);
          if (w === ws[ws.length - 1]) col = t < w.end ? rgba('signal', 1) : rgba('bone', 0.94); // "rest" holds, then goes bone
        }
        c.fillStyle = col;
        c.fillText(w.w, x, y);
      }
    });
  }

  drawFootnote(c: Ctx2, t: number) {
    const r = prog(t, this.tRest + 0.05, this.tRest + 0.45);
    if (r <= 0) return;
    const s = 'sleep(8 h)  // scheduled';
    c.font = font(this.fMono, 20);
    c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    const w = measure(s, this.fMono, 20);
    c.fillStyle = rgba('ash', 0.9);
    c.fillText(s.slice(0, Math.ceil(r * s.length)), W - 120 - w, H - 110);
  }

  // ------------------------------------------------------------------ the spark (2D, additive)
  sparkScreen(tb: number): { x: number; y: number } | null {
    const c = this.camAt(tb);
    this.setCam(this.scratch, this.svp, c);
    const q = this.projWith(this.scratch, this.svp, this.sparkPos(tb));
    return q ? { x: q.x, y: q.y } : null;
  }
  drawSpark(t: number, f: Frame) {
    const g = this.fx; g.clear();
    const p = this.proj(this.sparkPos(t));
    if (!p) return;
    const hops = this.hops, tRest = this.tRest;
    const rate = (tb: number) => {
      if (tb >= tRest) return 0;
      for (const h of hops) if (tb >= h && tb < h + 0.06) return 300;
      return 34;
    };
    sparkParticles(g, t, (tb) => (tb < this.T0 ? null : this.sparkScreen(tb)), { rate, rateMax: 300, life: 0.4, speed: 220, gravity: 650, intensity: 0.85, seed: 41 });
    const k = this.landed(t);
    const hit = k > 0 ? pulse(t, hops[k - 1]!, 0.08) : 0;
    const sc = clamp(p.s / 150, 0.75, 1.3);
    const ign = prog(t, this.T0 - 0.01, this.T0 + 0.04);
    const dim = lerp(1, 0.5, prog(t, this.tRest, this.tRestEnd, ease.inOutQuad));
    const settleK = 1 - prog(t, this.tRest, this.tRestEnd);
    sparkHead(g, p.x, p.y, t, sc * (1 + 0.55 * hit + 0.8 * pulse(t, this.T0, 0.1)) * lerp(0.75, 1, settleK), ign * dim * (1 + 0.2 * f.a.kick * settleK));
  }
}
