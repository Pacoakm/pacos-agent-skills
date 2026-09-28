// 11:59 `bus` — "Missed my stop on the school bus, climbing up the hill". The first plate; light.
// FIG. 1: the real campus as a 3D contour figure on bone paper — the surveyed ground (hairline
// contours every 5 m, index every 20 m and labelled, engraved hachures on the shaded slopes), the
// roads as hairlines by class, the buildings as hatched hairline boxes to scale, and the school bus's
// route as a heavy ink road knocked out of the contours, orange behind the bus. The spark is the bus.
// Which stretch of the route the plate shows is chosen from the data (bus-geo.ts: the lyric must
// read left to right, the camera look uphill, the road climb, YOUR STOP stand among buildings).
// The lyric is set along the road, written by the bus as it drives through it (the sung word orange,
// then ink); a word whose stretch of road does not read left to right is set flat to camera instead.
//  "Missed my stop": the bus sails past YOUR STOP · LECTURE 09:00; on the downbeat an orange ✕ lands
//   on it, then the callout "not requested¹", then the footnote "¹ next bus: 23 min".
//  "climbing up the hill": on the downbeat the camera cranes up and swings to look up the route,
//   the elevation readout climbing and the index contours ticking as the bus crosses them.
// Hard cut into `tabs` (ink).
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { Layer2D, W, H, clearRT } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { LIN, rgba } from '../../engine/palette';
import { F, font, layout, measure, type TextLayout } from '../../engine/type';
import { norm, type Line, type Word } from '../../engine/lyrics';
import { sparkHead, sparkParticles } from '../_motifs';
import { clamp, ease, lerp, prog, pulse, hash, frameIdx, TAU } from '../../engine/util';
import { BG_VERT, BG_FRAG, TERRAIN_VERT, TERRAIN_FRAG, BUILD_VERT, BUILD_FRAG } from './bus-glsl';
import { loadGeo, resampleRoute, pickStretch, type Geo, type RouteS } from './bus-geo';

type P3 = { x: number; y: number; z: number };
type Proj = { x: number; y: number; s: number; w: number };
interface Cam { pos: P3; tgt: P3; fov: number; roll: number }

// ---------------------------------------------------------------- constants
const U = 10;          // metres per world unit (horizontal)
const EX = 2;          // vertical exaggeration of the ground (buildings stay to scale)
const TXT = 1.0;       // lyric em (world units)
const LYR_FAM = F.archivo(100, 800);
const SPACE_EM = 0.1;  // extra word space (em)
const PRE = 34;        // metres the bus drives before the first word
const LIFT = 1.6;      // metres the road floats over the smoothed ground (depth test)
const REG = 1700;      // side of the terrain region (m)
const HRES = 4;        // height texture spacing (m)
const CREDIT = 'map © OpenStreetMap contributors · terrain © HKSAR Gov., Lands Dept.';

const orbit = (tgt: P3, yaw: number, pitch: number, dist: number): P3 => ({
  x: tgt.x + Math.sin(yaw) * Math.cos(pitch) * dist,
  y: tgt.y + Math.sin(pitch) * dist,
  z: tgt.z + Math.cos(yaw) * Math.cos(pitch) * dist,
});
const lerp3 = (a: P3, b: P3, k: number): P3 => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
/** Critically damped step response (0 → 1, zero initial velocity). */
const crit = (u: number, w: number) => (u <= 0 ? 0 : 1 - (1 + w * u) * Math.exp(-w * u));
/** Shortest signed angle a → b. */
const dAng = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Monotone cubic interpolation (Fritsch–Carlson) through (x, y) keys; linear beyond the ends. */
class Mono {
  m: number[] = [];
  constructor(public xs: number[], public ys: number[]) {
    const n = xs.length;
    const d: number[] = [];
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!));
    this.m = [d[0]!];
    for (let i = 1; i < n - 1; i++) this.m.push(d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2);
    this.m.push(d[n - 2]!);
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { this.m[i] = 0; this.m[i + 1] = 0; continue; }
      const a = this.m[i]! / d[i]!, b = this.m[i + 1]! / d[i]!;
      const s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); this.m[i] = k * a * d[i]!; this.m[i + 1] = k * b * d[i]!; }
    }
  }
  at(x: number) {
    const { xs, ys, m } = this;
    const n = xs.length;
    if (x <= xs[0]!) return ys[0]! + m[0]! * (x - xs[0]!);
    if (x >= xs[n - 1]!) return ys[n - 1]! + m[n - 1]! * (x - xs[n - 1]!);
    let i = 0;
    while (x > xs[i + 1]!) i++;
    const h = xs[i + 1]! - xs[i]!, u = (x - xs[i]!) / h;
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i]! + (u3 - 2 * u2 + u) * h * m[i]! + (-2 * u3 + 3 * u2) * ys[i + 1]! + (u3 - u2) * h * m[i + 1]!;
  }
}

interface G { ch: string; s: number; w: number; tg: number; word: Word; gx: number }
interface Stop { s: number; label: string; kind: 'stop' | 'yours' | 'end' }
interface ElevLabel { p: P3; ang: P3; lvl: number; tc: number | null }

export default class Bus extends Scene {
  cam = new THREE.PerspectiveCamera(24, W / H, 0.5, 600);
  vp = new THREE.Matrix4();
  v4 = new THREE.Vector4();
  terrScene = new THREE.Scene();
  terrMat!: THREE.RawShaderMaterial;
  buildMat!: THREE.RawShaderMaterial;
  roadTex!: THREE.CanvasTexture;
  hTex!: THREE.DataTexture;
  statics = new LineBatch(90000, { screen2D: false, worldWidth: true, depthTest: true, blend: 'normal' });
  lines3 = new LineBatch(4000, { screen2D: false, worldWidth: true, depthTest: true, blend: 'normal' });
  text = new Layer2D();
  dots = new LineBatch(3000, { blend: 'normal' });
  glow = new LineBatch(400);

  geo!: Geo;
  R!: RouteS;
  RW: P3[] = [];           // route samples in world space (every R.step m)
  step = 2;
  OX = 0; OY = 0; OZ = 0; // world origin (local metres)
  line!: Line;
  words: Word[] = [];
  glyphs: G[] = [];
  lay!: TextLayout;
  sText0 = 0; sText1 = 0; sClimb = 0;
  motion!: Mono;
  stops: Stop[] = [];
  elev: ElevLabel[] = [];
  wStop!: Word; wClimb!: Word;
  tX = 0; tNote = 0; tFoot = 0; tCrane = 0;
  beats: number[] = [];
  camA: P3 = { x: 0, y: 0, z: 0 };
  yaw1 = 0; yaw2 = 0;
  staticsBuilt = false;
  staticsUp = false;
  TW: P3[] = [];           // the lyric's baseline: the route smoothed (text does not take hairpins)

  /** Ink at a given density as an opaque colour (overlapping capsule joints must not bead). */
  inkAt(a: number): [number, number, number] {
    const i = LIN.ink, b = LIN.bone;
    return [lerp(b[0], i[0], a), lerp(b[1], i[1], a), lerp(b[2], i[2], a)];
  }

  // ---------------------------------------------------------------- world mapping
  wx(X: number) { return (X - this.OX) / U; }
  wz(Y: number) { return -(Y - this.OY) / U; }
  wy(Z: number) { return ((Z - this.OZ) * EX) / U; }
  world(X: number, Y: number, Z: number): P3 { return { x: this.wx(X), y: this.wy(Z), z: this.wz(Y) }; }
  ground(X: number, Y: number, lift = LIFT): P3 { return this.world(X, Y, this.geo.h(X, Y) + lift); }

  override async init() {
    const { lyrics, audio, start, end } = this.ctx;
    this.geo = await loadGeo();
    const geo = this.geo;
    this.line = lyrics.get('Missed my stop');
    this.words = this.line.words;
    const find = (q: string) => this.words.find((w) => norm(w.w) === norm(q)) ?? this.words[0]!;
    this.wStop = find('stop');
    this.wClimb = find('climbing');
    this.beats = audio.beats.filter((b) => b > start - 0.5 && b < end + 0.5);
    const downs = audio.downbeats.filter((d) => d > start && d < end);
    const dX = downs.find((d) => d >= this.wStop.start - 0.03 && d < this.wStop.start + 0.35);
    this.tX = dX ?? this.wStop.start + 0.06;
    this.tNote = this.beats.find((b) => b > this.tX + 0.2) ?? this.tX + 0.45;
    this.tFoot = this.beats.find((b) => b > this.tNote + 0.2) ?? this.tNote + 0.45;
    this.tCrane = downs.find((d) => d > this.wClimb.start - 0.2 && d < this.wClimb.start + 0.5) ?? this.wClimb.start;

    // ---- the lyric: one kerned run, extra space at the comma
    const text = this.words.map((w) => w.w).join(' ');
    this.lay = layout(text, LYR_FAM, 100, 0);
    let shift = 0;
    for (const g of this.lay.glyphs) {
      g.x += shift;
      if (g.ch === ' ') {
        const extra = SPACE_EM + (this.lay.glyphs[g.i - 1]?.ch === ',' ? 0.6 : 0);
        g.w += extra * 100; shift += extra * 100;
      }
    }
    this.lay.width += shift;
    const scM = (TXT * U) / 100; // metres per font unit
    const wordAt: { word: Word; c0: number }[] = [];
    { let c = 0; for (const w of this.words) { wordAt.push({ word: w, c0: c }); c += Array.from(w.w).length + 1; } }
    const iClimb = this.words.indexOf(this.wClimb), iStop = this.words.indexOf(this.wStop);
    const xOf = (i: number) => this.lay.glyphs[wordAt[i]!.c0]!.x * scM;
    const L1 = xOf(iClimb), L2 = this.lay.width * scM - L1;

    // ---- the stretch of route: chosen from the data
    this.R = resampleRoute(geo.c.route, this.step);
    const cents = geo.c.buildings.map((b) => {
      let x = 0, y = 0; for (const p of b.pts) { x += p[0]; y += p[1]; }
      return [x / b.pts.length, y / b.pts.length] as [number, number];
    });
    const pick = pickStretch(geo, this.R, L1, L2, PRE, xOf(iStop), cents, EX);
    this.sText0 = pick.s0 + PRE;
    this.sClimb = this.sText0 + L1;
    this.sText1 = this.sText0 + L1 + L2;
    // yaw of the orbit camera for a view heading psi (clockwise from north): yaw = -psi
    this.yaw1 = -pick.psi1;
    this.yaw2 = this.yaw1 + dAng(pick.psi1, pick.psi2) * -1;
    // origin: the middle of the text
    const mid = this.sAt((this.sText0 + this.sText1) / 2);
    this.OX = mid.X; this.OY = mid.Y; this.OZ = geo.h(mid.X, mid.Y);
    for (let i = 0; i < this.R.X.length; i++) this.RW.push(this.ground(this.R.X[i]!, this.R.Y[i]!));
    {
      const n = this.R.X.length, K = 9, sig = 6;
      for (let i = 0; i < n; i++) {
        let x = 0, y = 0, ws = 0;
        for (let k = -K; k <= K; k++) { const j = clamp(i + k, 0, n - 1), w = Math.exp(-(k * k) / (2 * sig * sig)); x += w * this.R.X[j]!; y += w * this.R.Y[j]!; ws += w; }
        this.TW.push(this.ground(x / ws, y / ws));
      }
    }
    for (const lb of [this.statics, this.lines3]) { lb.mat.polygonOffset = true; lb.mat.polygonOffsetFactor = -2; lb.mat.polygonOffsetUnits = -8; }

    // ---- bus motion: the write head on every word start, eased between (monotone)
    const kt: number[] = [], ks: number[] = [];
    const first = this.words[0]!;
    const sw = (i: number) => this.sText0 + xOf(i);
    kt.push(start - 0.25); ks.push(sw(0) - PRE - 3);
    kt.push(start); ks.push(sw(0) - PRE);
    this.words.forEach((w, i) => { kt.push(w.start); ks.push(sw(i)); });
    const last = this.words[this.words.length - 1]!;
    kt.push(last.end); ks.push(this.sText1 + 2);
    kt.push(last.end + 1); ks.push(this.sText1 + 30);
    this.motion = new Mono(kt, ks);
    void first;
    for (const { word, c0 } of wordAt) {
      Array.from(word.w).forEach((ch, j) => {
        const g = this.lay.glyphs[c0 + j]!;
        const s = this.sText0 + g.x * scM;
        let lo = word.start, hi = word.end + 1.5;
        for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (this.motion.at(m) < s) lo = m; else hi = m; }
        this.glyphs.push({ ch, s, w: g.w * scM, tg: j === 0 ? word.start : Math.max(word.start, hi), word, gx: g.x - this.lay.glyphs[c0]!.x });
      });
    }

    // ---- camera anchors
    const pA = this.roadAt(this.sText0), pB = this.roadAt(this.sClimb);
    this.camA = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 + 0.5, z: (pA.z + pB.z) / 2 };

    // ---- stops
    const s0 = this.motion.at(start);
    this.stops = [
      { s: s0 - 6, label: 'STOP 1', kind: 'stop' },
      { s: sw(iStop) + 2.5, label: 'YOUR STOP', kind: 'yours' },
      { s: this.R.len - 4, label: 'TERMINUS', kind: 'end' },
    ];

    // ---- the height texture and the terrain mesh over the region around the stretch
    this.buildTerrain();
    this.buildElevLabels(cents);
    this.buildBuildings(cents);
    this.buildRoadTexture();
  }

  // ---------------------------------------------------------------- build
  /** The region (local metres) centred ahead of the stretch in the view direction. */
  region() {
    const psi = -this.yaw1;
    const cx = this.OX + Math.sin(psi) * 280, cy = this.OY + Math.cos(psi) * 280;
    return { X0: cx - REG / 2, X1: cx + REG / 2, Y0: cy - REG / 2, Y1: cy + REG / 2 };
  }
  buildTerrain() {
    const { X0, X1, Y0, Y1 } = this.region();
    const n = Math.round(REG / HRES);
    // texel (i, j): X = X0 + (i + .5) * HRES, world z increasing with j (so Y decreasing)
    const data = new Uint16Array(n * n);
    for (let j = 0; j < n; j++) {
      const Y = Y1 - (j + 0.5) * HRES;
      for (let i = 0; i < n; i++) data[j * n + i] = THREE.DataUtils.toHalfFloat(this.geo.h(X0 + (i + 0.5) * HRES, Y) - this.OZ);
    }
    this.hTex = new THREE.DataTexture(data, n, n, THREE.RedFormat, THREE.HalfFloatType);
    this.hTex.minFilter = THREE.LinearFilter; this.hTex.magFilter = THREE.LinearFilter;
    this.hTex.wrapS = this.hTex.wrapT = THREE.ClampToEdgeWrapping;
    this.hTex.needsUpdate = true;
    const reg = new THREE.Vector4(this.wx(X0), this.wz(Y1), U / REG, U / REG);
    this.roadTex = new THREE.CanvasTexture(document.createElement('canvas')); // replaced in buildRoadTexture
    this.terrMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: TERRAIN_VERT, fragmentShader: TERRAIN_FRAG,
      uniforms: {
        uH: { value: this.hTex }, uReg: { value: reg }, uEx: { value: EX / U }, uZ0: { value: this.OZ },
        uCam: { value: new THREE.Vector3() }, uFogStart: { value: 45 }, uFogLen: { value: 40 },
        uRoad: { value: this.roadTex },
        uPulse: { value: new THREE.Vector4(-999, -999, -999, -999) }, uPulseA: { value: 1 }, uBusZ: { value: 0 },
      },
      depthTest: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
    });
    const segs = Math.round(REG / 5);
    const geo = new THREE.PlaneGeometry(REG / U, REG / U, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, this.terrMat);
    mesh.position.set(this.wx((X0 + X1) / 2), 0, this.wz((Y0 + Y1) / 2));
    mesh.frustumCulled = false;
    this.terrScene.add(mesh);
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const bg = new THREE.Mesh(bgGeo, new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: BG_VERT, fragmentShader: BG_FRAG, depthTest: true, depthWrite: false }));
    bg.frustumCulled = false; bg.renderOrder = 2;
    this.terrScene.add(bg);
  }

  /** Buildings near the stretch: extruded footprints (roof to scale above their highest ground). */
  buildBuildings(cents: [number, number][]) {
    const pos: number[] = [], nrm: number[] = [];
    const { X0, X1, Y0, Y1 } = this.region();
    const cx = (X0 + X1) / 2, cy = (Y0 + Y1) / 2;
    const L = this.statics, ink = LIN.ink;
    this.geo.c.buildings.forEach((b, bi) => {
      const [bx, by] = cents[bi]!;
      if (Math.hypot(bx - this.OX, by - this.OY) > 400) return;
      let pts = b.pts.slice();
      if (pts.length > 3 && Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) < 0.01) pts.pop();
      if (pts.length < 3) return;
      let area = 0;
      for (let i = 0; i < pts.length; i++) { const a = pts[i]!, c = pts[(i + 1) % pts.length]!; area += a[0] * c[1] - c[0] * a[1]; }
      // a covered walkway or footbridge over the road (a small footprint in the route's ±8 m corridor):
      // skip it, so the road and the lyric are never covered; big halls beside the road stay
      if (Math.abs(area) / 2 < 1500 && this.onRoute(pts, 8)) return;
      if (area < 0) pts = pts.reverse(); // counter-clockwise (x east, y north)
      let gmin = Infinity, gmax = -Infinity;
      for (const p of pts) { const g = this.geo.h(p[0], p[1]); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g); }
      const h = Math.max(4, b.h || 10);
      const yb = this.wy(gmin) - 0.3, yt = this.wy(gmax) + h / U;
      const P = pts.map((p) => ({ x: this.wx(p[0]), z: this.wz(p[1]), X: p[0], Y: p[1] }));
      for (let i = 0; i < P.length; i++) {
        const a = P[i]!, c = P[(i + 1) % P.length]!;
        const dx = c.X - a.X, dy = c.Y - a.Y, l = Math.hypot(dx, dy) || 1;
        const nx = dy / l, nz = dx / l; // outward (map (dy, -dx)) -> world (x, z = -north)
        const quad = [[a.x, yb, a.z], [c.x, yb, c.z], [c.x, yt, c.z], [a.x, yb, a.z], [c.x, yt, c.z], [a.x, yt, a.z]];
        for (const q of quad) { pos.push(q[0]!, q[1]!, q[2]!); nrm.push(nx, 0, nz); }
        const e1 = this.inkAt(0.85), e2 = this.inkAt(0.75);
        L.seg(a.x, yt, a.z, c.x, yt, c.z, 0.035, e1[0], e1[1], e1[2], 1);
        // vertical edges only at real corners
        const pv = P[(i - 1 + P.length) % P.length]!;
        const t1 = Math.atan2(a.Y - pv.Y, a.X - pv.X), t2 = Math.atan2(dy, dx);
        if (Math.abs(dAng(t1, t2)) > 0.45) L.seg(a.x, yb, a.z, a.x, yt, a.z, 0.028, e2[0], e2[1], e2[2], 1);
      }
      const tri = THREE.ShapeUtils.triangulateShape(P.map((p) => new THREE.Vector2(p.X, p.Y)), []);
      for (const t of tri) for (const k of t) { const p = P[k]!; pos.push(p.x, yt, p.z); nrm.push(0, 1, 0); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    this.buildMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: BUILD_VERT, fragmentShader: BUILD_FRAG,
      uniforms: { uCam: { value: new THREE.Vector3() }, uFogStart: { value: 45 }, uFogLen: { value: 40 } },
      side: THREE.DoubleSide, depthTest: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2,
    });
    const m = new THREE.Mesh(g, this.buildMat);
    m.frustumCulled = false; m.renderOrder = 1;
    this.terrScene.add(m);
  }

  /** Roads by class, draped (hairlines; footways faintest), into the static batch. */
  buildRoads() {
    const { X0, X1, Y0, Y1 } = this.region();
    const inR = (x: number, y: number) => x > X0 && x < X1 && y > Y0 && y < Y1;
    const L = this.statics, ink = LIN.ink;
    const style = (cls: string): [number, number] => {
      if (['motorway', 'trunk', 'primary', 'secondary', 'tertiary'].includes(cls)) return [0.034, 0.8];
      if (['residential', 'unclassified', 'service', 'living_street'].includes(cls)) return [0.024, 0.7];
      return [0.014, 0.35];
    };
    for (const rd of this.geo.c.roads) {
      if (rd.tunnel) continue;
      if (!rd.pts.some((p) => inR(p[0], p[1]))) continue;
      const [w, a] = style(rd.cls);
      const col = this.inkAt(a);
      let prev: P3 | null = null;
      for (let i = 1; i < rd.pts.length; i++) {
        const p = rd.pts[i - 1]!, q = rd.pts[i]!;
        const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 6));
        for (let k = i === 1 ? 0 : 1; k <= n; k++) {
          const X = lerp(p[0], q[0], k / n), Y = lerp(p[1], q[1], k / n);
          const P = this.ground(X, Y, rd.bridge ? Math.max(LIFT, q[2] - this.geo.h(X, Y)) : LIFT * 0.8);
          if (prev && inR(X, Y)) L.seg(prev.x, prev.y, prev.z, P.x, P.y, P.z, w, col[0], col[1], col[2], 1);
          prev = P;
        }
      }
    }
    // the route: a heavy hairline
    const RW = this.RW;
    for (let i = 1; i < RW.length; i++) {
      const A = RW[i - 1]!, B = RW[i]!;
      if (!inR(this.R.X[i]!, this.R.Y[i]!)) continue;
      L.seg(A.x, A.y, A.z, B.x, B.y, B.z, 0.075, ink[0], ink[1], ink[2], 1);
    }
  }

  /** Knockout (region space): the route's casing, the lyric's strip on the camera side. */
  buildRoadTexture() {
    const { X0, Y1 } = this.region();
    const N = 1600, ppm = N / REG;
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const rc = cv.getContext('2d')!;
    rc.fillStyle = '#000'; rc.fillRect(0, 0, N, N);
    const mx = (X: number) => (X - X0) * ppm, my = (Y: number) => (Y1 - Y) * ppm; // row = world z
    rc.strokeStyle = '#fff'; rc.lineCap = 'round'; rc.lineJoin = 'round';
    rc.filter = `blur(${(0.6 * ppm).toFixed(2)}px)`;
    rc.lineWidth = 6 * ppm;
    rc.beginPath();
    this.R.X.forEach((X, i) => (i ? rc.lineTo(mx(X), my(this.R.Y[i]!)) : rc.moveTo(mx(X), my(this.R.Y[i]!))));
    rc.stroke();
    // the lyric's strip: toward the camera from the text's stretch of road
    const psi = -this.yaw1, cxv = -Math.sin(psi), cyv = -Math.cos(psi);
    rc.filter = `blur(${(7 * ppm).toFixed(2)}px)`;
    rc.globalAlpha = 0.85;
    rc.lineWidth = 26 * ppm;
    rc.beginPath();
    let firstPt = true;
    for (let i = 1; i < this.R.X.length; i++) {
      const s = this.R.S[i]!;
      if (s < this.sText0 - 25 || s > this.sText1 + 10) continue;
      const tx = this.R.X[i]! - this.R.X[i - 1]!, ty = this.R.Y[i]! - this.R.Y[i - 1]!, tl = Math.hypot(tx, ty) || 1;
      let nx = -ty / tl, ny = tx / tl;
      if (nx * cxv + ny * cyv < 0) { nx = -nx; ny = -ny; }
      const X = this.R.X[i]! + nx * 12, Y = this.R.Y[i]! + ny * 12;
      if (firstPt) { rc.moveTo(mx(X), my(Y)); firstPt = false; } else rc.lineTo(mx(X), my(Y));
    }
    rc.stroke();
    this.roadTex = new THREE.CanvasTexture(cv);
    this.roadTex.colorSpace = THREE.NoColorSpace;
    this.roadTex.flipY = false;
    this.roadTex.minFilter = THREE.LinearFilter; this.roadTex.generateMipmaps = false;
    this.terrMat.uniforms.uRoad!.value = this.roadTex;
  }

  /** Index-contour labels (every 20 m) on the drawn (smoothed) ground near the stretch, off the road. */
  /** Does a footprint touch the route's corridor (within m metres of the drawn road)? */
  onRoute(pts: [number, number][], m: number) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const R = this.R, n = pts.length;
    // the stretch the lyric is written along (plus a margin ahead)
    const k0 = Math.max(0, Math.floor((this.sText0 - 10) / this.step)); // from where the lyric starts
    const k1 = Math.min(R.X.length - 1, Math.ceil((this.motion.at(this.ctx.end) + 60) / this.step));
    for (let k = k0; k <= k1; k++) {
      const X = R.X[k]!, Y = R.Y[k]!;
      if (X < x0 - m || X > x1 + m || Y < y0 - m || Y > y1 + m) continue;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const a = pts[i]!, b = pts[j]!;
        if ((a[1] > Y) !== (b[1] > Y) && X < ((b[0] - a[0]) * (Y - a[1])) / (b[1] - a[1] || 1e-9) + a[0]) inside = !inside;
        const ex = b[0] - a[0], ey = b[1] - a[1], l2 = ex * ex + ey * ey || 1e-9;
        const u = clamp(((X - a[0]) * ex + (Y - a[1]) * ey) / l2);
        if (Math.hypot(X - (a[0] + ex * u), Y - (a[1] + ey * u)) < m) return true;
      }
      if (inside) return true;
    }
    return false;
  }
  /** Is (X, Y) inside (or within m metres of) a building footprint? */
  nearBuilding(X: number, Y: number, m: number) {
    for (const b of this.geo.c.buildings) {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of b.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      if (X > x0 - m && X < x1 + m && Y > y0 - m && Y < y1 + m) return true;
    }
    return false;
  }
  buildElevLabels(cents: [number, number][]) {
    void cents;
    const psi = -this.yaw1, fx = Math.sin(psi), fy = Math.cos(psi);
    const cands: { X: number; Y: number; z: number; score: number }[] = [];
    const st = 10;
    for (let a = -140; a <= 460; a += st) for (let sd = -380; sd <= 380; sd += st) {
      const X = this.OX + fx * a + fy * sd, Y = this.OY + fy * a - fx * sd;
      const X2 = X + fx * st, Y2 = Y + fy * st;
      const h1 = this.geo.h(X, Y), h2 = this.geo.h(X2, Y2);
      const lv = Math.ceil(Math.min(h1, h2) / 20) * 20;
      if (lv > Math.max(h1, h2) || lv <= 0) continue;
      const u = (lv - h1) / (h2 - h1 || 1);
      const PX = lerp(X, X2, u), PY = lerp(Y, Y2, u);
      let dr = Infinity;
      for (let k = 0; k < this.R.X.length; k += 4) dr = Math.min(dr, Math.hypot(PX - this.R.X[k]!, PY - this.R.Y[k]!));
      if (dr < 35) continue;
      if (this.nearBuilding(PX, PY, 12)) continue;
      cands.push({ X: PX, Y: PY, z: lv, score: -Math.abs(sd) * 0.25 - Math.abs(a - 140) * 0.2 + Math.min(dr, 90) });
    }
    cands.sort((p, q) => q.score - p.score);
    const chosen: typeof cands = [];
    for (const c of cands) {
      if (chosen.length >= 7) break;
      if (chosen.some((q) => Math.hypot(q.X - c.X, q.Y - c.Y) < (q.z === c.z ? 200 : 80))) continue;
      chosen.push(c);
    }
    for (const c of chosen) {
      const e = 2;
      const gx = this.geo.h(c.X + e, c.Y) - this.geo.h(c.X - e, c.Y), gy = this.geo.h(c.X, c.Y + e) - this.geo.h(c.X, c.Y - e);
      const gl = Math.hypot(gx, gy) || 1;
      const ax = -gy / gl, ay = gx / gl; // along the contour
      this.elev.push({ p: this.world(c.X, c.Y, c.z + 0.5), ang: { x: ax, y: 0, z: -ay }, lvl: c.z, tc: this.crossTime(c.z) });
    }
  }
  /** Is world point p in sight of the camera over the ground? (a short march along the sight line) */
  visible(p: P3, cam: P3) {
    for (let k = 2; k < 28; k++) {
      const u = k / 28;
      const x = lerp(cam.x, p.x, u), y = lerp(cam.y, p.y, u), z = lerp(cam.z, p.z, u);
      if (y < this.wy(this.geo.h(x * U + this.OX, -z * U + this.OY)) - 0.1) return false;
    }
    return true;
  }

  // ---------------------------------------------------------------- route helpers
  sAt(s: number) {
    const R = this.R, n = R.X.length;
    const f = clamp(s / this.step, 0, n - 1.0001), i = Math.floor(f), u = f - i;
    return { X: lerp(R.X[i]!, R.X[i + 1]!, u), Y: lerp(R.Y[i]!, R.Y[i + 1]!, u) };
  }
  roadAt(s: number): P3 {
    const n = this.RW.length;
    const f = clamp(s / this.step, 0, n - 1.0001), i = Math.floor(f), u = f - i;
    const a = this.RW[i]!, b = this.RW[i + 1]!;
    return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) };
  }
  textAt(s: number): P3 {
    const n = this.TW.length;
    const f = clamp(s / this.step, 0, n - 1.0001), i = Math.floor(f), u = f - i;
    const a = this.TW[i]!, b = this.TW[i + 1]!;
    return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), z: lerp(a.z, b.z, u) };
  }
  busS(t: number) { return this.motion.at(t); }
  busPos(t: number): P3 { const p = this.roadAt(this.busS(t)); return { x: p.x, y: p.y + 0.08, z: p.z }; }
  busZ(t: number) { const q = this.sAt(this.busS(t)); return this.geo.h(q.X, q.Y); }
  crossTime(z: number): number | null {
    const { start, end } = this.ctx;
    let prev = this.busZ(start);
    for (let tt = start; tt <= end + 0.3; tt += 1 / 120) {
      const h = this.busZ(tt);
      if (prev < z && h >= z) return tt;
      prev = h;
    }
    return null;
  }

  // ---------------------------------------------------------------- camera
  camAt(t: number): Cam {
    const b: P3 = { x: 0, y: 0, z: 0 };
    const N = 9;
    for (let i = 0; i < N; i++) { const p = this.busPos(t - 0.5 + (0.7 * i) / (N - 1)); b.x += p.x / N; b.y += p.y / N; b.z += p.z / N; }
    const sB = this.busS(t);
    // act 1: a long lens on the stretch, framing the whole first half-line; trucks with the bus
    const lt = t - this.ctx.start;
    const tA = this.roadAt(this.sText0 - 6 + 5.5 * lt * U / 10);
    let tgt: P3 = lerp3(lerp3(this.camA, tA, 0.35), b, 0.12);
    tgt.y += 0.6;
    let yaw = this.yaw1 + 0.02 * lt, pitch = 0.38 + 0.012 * lt, dist = 31 - 0.9 * lt;
    dist -= 1.3 * crit(t - this.tX + 0.04, 10); // a nudge in on the ✕
    // the crane: up with the bus, swinging round to look up the route
    const kc = crit(t - (this.tCrane - 0.2), 4.6);
    const up = this.roadAt(sB + 45);
    const tB: P3 = { x: lerp(b.x, up.x, 0.3), y: lerp(b.y, up.y, 0.3) + 0.8, z: lerp(b.z, up.z, 0.3) };
    tgt = lerp3(tgt, tB, kc);
    pitch = lerp(pitch, 0.58, kc);
    yaw = lerp(yaw, this.yaw2, kc);
    dist = lerp(dist, 29, kc);
    return { pos: orbit(tgt, yaw, pitch, dist), tgt, fov: 24, roll: -0.015 * kc };
  }
  setCam(c0: Cam) {
    const c = this.cam;
    c.fov = c0.fov; c.updateProjectionMatrix();
    c.position.set(c0.pos.x, c0.pos.y, c0.pos.z);
    c.up.set(0, 1, 0);
    c.lookAt(c0.tgt.x, c0.tgt.y, c0.tgt.z);
    c.rotateZ(c0.roll);
    c.updateMatrixWorld(true);
    this.vp.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
  }
  proj(p: P3): Proj | null {
    const v = this.v4.set(p.x, p.y, p.z, 1).applyMatrix4(this.vp);
    if (v.w <= 0.05) return null;
    const P11 = this.cam.projectionMatrix.elements[5]!;
    return { x: (v.x / v.w * 0.5 + 0.5) * W, y: (0.5 - v.y / v.w * 0.5) * H, s: 0.5 * H * P11 / v.w, w: v.w };
  }

  // ---------------------------------------------------------------- render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer } = this.ctx;
    const t = f.t;
    if (!this.staticsBuilt) { this.buildRoads(); this.staticsBuilt = true; }
    const cm = this.camAt(t);
    this.setCam(cm);
    clearRT(renderer, out, LIN.bone);

    const u = this.terrMat.uniforms;
    (u.uCam!.value as THREE.Vector3).set(cm.pos.x, cm.pos.y, cm.pos.z);
    (this.buildMat.uniforms.uCam!.value as THREE.Vector3).set(cm.pos.x, cm.pos.y, cm.pos.z);
    const bz = this.busZ(t);
    u.uBusZ!.value = bz;
    // the synth pulses: on every beat a ring of contour levels runs up the hill from the bus
    const pv = u.uPulse!.value as THREE.Vector4;
    const hs: number[] = [];
    const bi = this.ctx.audio.beatAt(t);
    for (let i = 0; i < 4; i++) {
      const k = Math.floor(bi) - i;
      const age = t - this.ctx.audio.timeOfBeat(k);
      hs.push(age >= 0 && age < 1.2 ? bz + age * 40 : -999);
    }
    pv.set(hs[0]!, hs[1]!, hs[2]!, hs[3]!);
    u.uPulseA!.value = 0.8;
    renderer.render(this.terrScene, this.cam);

    // ---- 3D lines: roads, buildings' edges, the route (static) + the travelled route (orange)
    // the static lines (roads, building edges, the route) are uploaded once; later frames just draw them
    if (!this.staticsUp) { this.statics.render(renderer, out, this.cam); this.staticsUp = true; }
    else { renderer.setRenderTarget(out); renderer.render(this.statics.scene, this.cam); }
    const L = this.lines3; L.clear();
    this.drawTrail(t, L);
    L.render(renderer, out, this.cam);

    // ---- flat-to-camera type & marks
    const T = this.text; T.clear();
    const c = T.ctx;
    this.drawElevLabels(t, c);
    this.drawStops(t, c);
    this.drawLyric(t, c);
    this.drawBusTag(t, c);
    this.drawFurniture(t, c, cm);
    this.ctx.comp.draw(renderer, T.upload(), out);

    // ---- the bus: an orange bead with a hot core, sputtering
    const bp = this.busPos(t);
    const hp = this.proj(bp);
    const d = this.dots; d.clear();
    const g = this.glow; g.clear();
    if (hp) {
      const lb = this.ctx.audio.timeOfBeat(Math.floor(this.ctx.audio.beatAt(t) + 1e-6));
      const sc = clamp(hp.s / 85, 0.75, 1.4) * (1 + 0.22 * pulse(t, lb, 0.09)); // the synth pulse
      const headAt = (tb: number) => { const q = this.proj(this.busPos(tb)); return q ? { x: q.x, y: q.y } : null; };
      const beatAt = (tb: number) => this.ctx.audio.timeOfBeat(Math.floor(this.ctx.audio.beatAt(tb) + 1e-6));
      const rate = (tb: number) => 26 + 70 * pulse(tb, beatAt(tb), 0.07) + 200 * pulse(tb, this.tX, 0.08) + 80 * pulse(tb, this.tCrane, 0.12);
      sparkParticles(d, t, headAt, { rate, rateMax: 400, life: 0.4, speed: 210 * sc, gravity: 520, intensity: 0.5, seed: 31, width: 1.6 });
      d.seg2(hp.x, hp.y, hp.x + 0.01, hp.y, 17 * sc, [LIN.signal[0], LIN.signal[1], LIN.signal[2]], 1);
      d.render(renderer, out);
      sparkHead(g, hp.x, hp.y, t, 0.7 * sc * (1 + 0.5 * pulse(t, this.tX, 0.1)), 0.75);
      g.render(renderer, out);
    }

    const amp = 7 * pulse(t, this.tX, 0.07);
    const ph = frameIdx(t);
    return {
      paper: 1, hud: 0,
      bloom: 0.22, bloomThreshold: 1.8, bloomKnee: 0.4, halation: 0.03,
      vignette: 0.14, grain: 0.042, ca: 0.35,
      shake: [amp * (hash(ph, 11) - 0.5) * 2, amp * (hash(ph, 12) - 0.5) * 2],
    };
  }

  drawTrail(t: number, L: LineBatch) {
    const sg = LIN.signal;
    const sB = this.busS(t);
    const s0 = 0; // the whole way from the station is behind it
    const i0 = Math.max(1, Math.floor(s0 / this.step)), i1 = Math.min(this.RW.length - 1, Math.ceil(sB / this.step));
    for (let i = i0; i <= i1; i++) {
      const sa = (i - 1) * this.step, sb = i * this.step;
      const a = this.RW[i - 1]!;
      const b = sb > sB ? this.roadAt(sB) : this.RW[i]!;
      const k = Math.exp(-(sB - sb) / 12);
      L.seg(a.x, a.y + 0.01, a.z, b.x, b.y + 0.01, b.z, 0.042 + 0.016 * k, lerp(sg[0], 2.2, k * 0.5), lerp(sg[1], 0.5, k * 0.5), sg[2], 1);
    }
  }

  // ---------------------------------------------------------------- 2D
  drawLyric(t: number, c: CanvasRenderingContext2D) {
    // the baseline: the smoothed route projected to the screen and offset below it by the lyric's
    // cap height; words sit on it at their own place on the road (never overlapping), glyphs spaced
    // by the font's own advances along the screen curve
    const ds = 2, s0 = this.sText0 - 8, s1 = this.sText1 + 12;
    const P: { x: number; y: number; size: number }[] = [];
    for (let s = s0; s <= s1; s += ds) {
      const p = this.proj(this.textAt(s));
      P.push(p ? { x: p.x, y: p.y, size: clamp(p.s * TXT * 0.92, 30, 130) } : { x: NaN, y: NaN, size: 30 });
    }
    const n = P.length;
    const B: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 2)]!, b = P[Math.min(n - 1, i + 2)]!;
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      const off = P[i]!.size * 0.78 + 12;
      B.push({ x: P[i]!.x - ty * off, y: P[i]!.y + tx * off });
    }
    // smooth the offset curve (it pinches on the inside of bends)
    const Bs: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0, w = 0;
      for (let k = -4; k <= 4; k++) { const q = B[clamp(i + k, 0, n - 1)]!; const wk = 5 - Math.abs(k); x += q.x * wk; y += q.y * wk; w += wk; }
      Bs.push({ x: x / w, y: y / w });
    }
    const Lc = [0];
    for (let i = 1; i < n; i++) Lc.push(Lc[i - 1]! + Math.max(0, Math.hypot(Bs[i]!.x - Bs[i - 1]!.x, Bs[i]!.y - Bs[i - 1]!.y) * Math.sign((Bs[i]!.x - Bs[i - 1]!.x) + 1e-3)));
    const arcAt = (s: number) => { const f = clamp((s - s0) / ds, 0, n - 1.001), i = Math.floor(f); return lerp(Lc[i]!, Lc[i + 1]!, f - i); };
    const sizeAt = (s: number) => { const f = clamp((s - s0) / ds, 0, n - 1.001), i = Math.floor(f); return lerp(P[i]!.size, P[i + 1]!.size, f - i); };
    const pointAt = (a: number) => {
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Lc[m]! < a) lo = m; else hi = m; }
      const u = clamp((a - Lc[lo]!) / Math.max(1e-6, Lc[hi]! - Lc[lo]!));
      const A = Bs[lo]!, Bq = Bs[hi]!;
      return { x: lerp(A.x, Bq.x, u), y: lerp(A.y, Bq.y, u), ang: Math.atan2(Bq.y - A.y, Bq.x - A.x) };
    };
    c.save();
    c.textBaseline = 'alphabetic';
    c.font = font(LYR_FAM, 100);
    let prevEnd = -Infinity;
    for (const w of this.words) {
      const gs = this.glyphs.filter((g) => g.word === w);
      const sw = gs[0]!.s;
      const size = sizeAt(sw);
      const wpx = (measure(w.w, LYR_FAM, 100) * size) / 100;
      // set as one line (even word spaces), pulled forward only where it would fall behind its road
      const space = size * 0.28 + (/,$/.test(this.words[this.words.indexOf(w) - 1]?.w ?? '') ? size * 0.45 : 0);
      const anchor = isFinite(prevEnd) ? Math.max(prevEnd + space, arcAt(sw) - 1.4 * size) : arcAt(sw);
      prevEnd = anchor + wpx;
      if (t < gs[0]!.tg) continue;
      const sung = t < w.end + 0.04;
      const o = sung ? 1 : 1 - prog(t, w.end + 0.04, w.end + 0.14);
      for (const g of gs) {
        if (t < g.tg) break;
        const ap = prog(t, g.tg, g.tg + 0.14, ease.outBack as (x: number) => number);
        const gw = (measure(g.ch, LYR_FAM, 100) * size) / 100;
        const pa = pointAt(anchor + (g.gx * size) / 100), pc = pointAt(anchor + (g.gx * size) / 100 + gw * 0.5);
        if (!isFinite(pa.x)) continue;
        c.save();
        c.translate(pa.x, pa.y);
        c.rotate(clamp(pc.ang, -0.8, 0.8));
        c.scale(size / 100, (size / 100) * (0.35 + 0.65 * ap));
        c.globalAlpha = clamp(ap * 1.5);
        if (o < 1) { c.fillStyle = rgba('ink'); c.fillText(g.ch, 0, 0); }
        if (o > 0) { c.fillStyle = rgba('signal', o); c.fillText(g.ch, 0, 0); }
        c.restore();
      }
    }
    c.restore();
  }

  drawStops(t: number, c: CanvasRenderingContext2D) {
    c.save();
    c.textBaseline = 'alphabetic';
    for (const st of this.stops) {
      const p = this.proj(this.roadAt(st.s));
      if (!p || p.x < -200 || p.x > W + 200 || p.y < -100 || p.y > H + 100) continue;
      const k = clamp(p.s / 85, 0.6, 1.25);
      const r = (st.kind === 'yours' ? 10 : 7.5) * k;
      c.fillStyle = rgba('bone');
      c.strokeStyle = rgba('ink');
      c.lineWidth = 2.2;
      c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill(); c.stroke();
      if (st.kind === 'yours') { c.lineWidth = 1.2; c.beginPath(); c.arc(p.x, p.y, r * 0.45, 0, TAU); c.stroke(); }
      if (st.kind === 'end') { c.fillStyle = rgba('ink'); c.beginPath(); c.arc(p.x, p.y, r * 0.5, 0, TAU); c.fill(); }
      const side = st.kind === 'end';
      const lx = side ? p.x + r + 18 * k : p.x, ly = side ? p.y + 5 * k : p.y - r - (st.kind === 'yours' ? 74 : 46) * k;
      c.lineWidth = 1;
      c.beginPath();
      if (side) { c.moveTo(p.x + r, p.y); c.lineTo(lx + 2, p.y); } else { c.moveTo(p.x, p.y - r); c.lineTo(lx, ly + 6); }
      c.stroke();
      if (st.kind === 'yours') this.drawYourStop(t, c, lx, ly, k, p, r);
      else {
        const fs = Math.round(15 * k);
        c.font = font(F.mono(500), fs);
        const lw = measure(st.label, F.mono(500), fs);
        c.fillStyle = rgba('bone', 0.94);
        c.fillRect(lx + 2, ly - fs * 0.85, lw + 9, fs * 1.2);
        c.fillStyle = rgba('ink', 0.9);
        c.fillText(st.label, lx + 6, ly + 1);
      }
    }
    c.restore();
  }

  drawYourStop(t: number, c: CanvasRenderingContext2D, lx: number, ly: number, k: number, p: Proj, r: number) {
    const fs = Math.round(23 * k), fs2 = Math.round(18 * k);
    c.font = font(F.mono(600), fs2);
    const tag = '08:57';
    const tw = measure(tag, F.mono(600), fs2);
    const bx = lx + 8, by = ly - fs * 0.95;
    const w1 = measure('YOUR STOP', F.mono(600), fs), w2 = measure(' · LECTURE 09:00', F.mono(400), fs);
    const x1 = bx + tw + 24;
    // a patch of clean paper under the label (the map's own knockout)
    c.fillStyle = rgba('bone', 0.93);
    c.fillRect(bx - 6, by - fs2 * 0.45, x1 + w1 + w2 - bx + 12 + (t >= this.tNote ? measure('   — not requested¹', F.mono(400), fs) : 0), fs * 1.5);
    c.lineWidth = 1.2;
    c.strokeStyle = rgba('ink');
    c.strokeRect(bx, by - fs2 * 0.2, tw + 12, fs2 * 1.45);
    c.fillStyle = rgba('ink');
    c.fillText(tag, bx + 6, by + fs2 * 0.95);
    c.font = font(F.mono(600), fs);
    c.fillText('YOUR STOP', x1, ly - fs * 0.02);
    c.font = font(F.mono(400), fs);
    c.fillText(' · LECTURE 09:00', x1 + w1, ly - fs * 0.02);
    if (t >= this.tX) {
      const kk = prog(t, this.tX, this.tX + 0.07, ease.outCubic);
      const sc = lerp(2.2, 1, kk);
      const R = 17 * k * sc;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(lerp(0.5, 0, kk));
      c.strokeStyle = rgba('signal');
      c.lineWidth = 6 * k;
      c.lineCap = 'butt';
      c.beginPath();
      c.moveTo(-R, -R); c.lineTo(R, R);
      c.moveTo(R, -R); c.lineTo(-R, R);
      c.stroke();
      c.restore();
    }
    if (t >= this.tNote) {
      const s = 'not requested¹';
      const n = Math.round(prog(t, this.tNote, this.tNote + 0.16) * s.length);
      const xa = x1 + w1 + w2 + 16 * k;
      const kk = prog(t, this.tNote, this.tNote + 0.08, ease.outCubic);
      c.fillStyle = rgba('signal');
      c.fillRect(xa, ly - fs * 0.33, 26 * k * kk, 2 * k);
      c.font = font(F.mono(400, true), fs);
      c.fillText(s.slice(0, n), xa + 36 * k, ly - fs * 0.02);
    }
    void r;
  }

  drawElevLabels(t: number, c: CanvasRenderingContext2D) {
    c.save();
    c.textBaseline = 'middle';
    c.textAlign = 'center';
    for (const lb of this.elev) {
      const p = this.proj(lb.p);
      if (!p || p.x < -80 || p.x > W + 80 || p.y < -40 || p.y > H + 40) continue;
      if (!this.visible(lb.p, { x: this.cam.position.x, y: this.cam.position.y, z: this.cam.position.z })) continue;
      const q = this.proj({ x: lb.p.x + lb.ang.x * 0.4, y: lb.p.y, z: lb.p.z + lb.ang.z * 0.4 });
      if (!q) continue;
      let ang = Math.atan2(q.y - p.y, q.x - p.x);
      if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
      const fog = Math.exp(-Math.max(0, p.w - 45) / 40);
      const hit = lb.tc !== null && t >= lb.tc ? pulse(t, lb.tc, 0.18) : 0;
      const fs = clamp(p.s * 0.2, 11, 19) * (1 + 0.35 * hit);
      const txt = `${lb.lvl} m`;
      c.save();
      c.translate(p.x, p.y); c.rotate(ang);
      c.font = font(F.mono(500), fs);
      const w = measure(txt, F.mono(500), fs);
      c.fillStyle = rgba('bone', 0.96 * fog);
      c.fillRect(-w / 2 - 5, -fs * 0.6, w + 10, fs * 1.2);
      c.fillStyle = hit > 0.35 ? rgba('signal', fog) : rgba('ink', 0.85 * fog);
      c.fillText(txt, 0, 1);
      c.restore();
    }
    c.restore();
  }

  /** The elevation readout riding with the bus up the hill (on the side away from the lyric). */
  drawBusTag(t: number, c: CanvasRenderingContext2D) {
    const a = prog(t, this.tCrane - 0.25, this.tCrane);
    if (a <= 0) return;
    const sB = this.busS(t);
    const p = this.proj(this.roadAt(sB)), q = this.proj(this.roadAt(sB + 4));
    if (!p || !q) return;
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
    let nx = dy / l, ny = -dx / l;
    if (ny > 0) { nx = -nx; ny = -ny; } // above the road
    const x = p.x + nx * 36 - 8, y = p.y + ny * 36;
    const txt = `${Math.round(this.busZ(t))} m`;
    c.save();
    c.globalAlpha = a;
    c.textBaseline = 'alphabetic';
    c.font = font(F.mono(600), 17);
    const w = measure(txt, F.mono(600), 17);
    c.fillStyle = rgba('bone', 0.94);
    c.fillRect(x - w - 26, y - 17, w + 32, 24);
    c.fillStyle = rgba('ink');
    c.beginPath(); c.moveTo(x - w - 20, y - 1); c.lineTo(x - w - 14, y - 11); c.lineTo(x - w - 8, y - 1); c.closePath(); c.fill();
    c.fillText(txt, x - w, y);
    c.restore();
  }

  drawFurniture(t: number, c: CanvasRenderingContext2D, cm: Cam) {
    c.save();
    c.textBaseline = 'alphabetic';
    const x0 = 96, y0 = 118, bw = 600, bh = 104;
    c.fillStyle = rgba('bone', 0.92); // the legend box
    c.fillRect(x0 - 14, y0 - 30, bw, bh);
    c.strokeStyle = rgba('ink', 0.55); c.lineWidth = 1;
    c.strokeRect(x0 - 14.5, y0 - 30.5, bw, bh);
    c.fillStyle = rgba('ink', 0.9);
    c.font = font(F.mono(600), 16);
    c.fillText('FIG. 1', x0, y0);
    c.font = font(F.mono(400), 16);
    c.fillText(`the morning route · ground ×${EX}, buildings to scale`, x0 + 84, y0);
    c.fillRect(x0, y0 + 14, bw - 28, 1.2);
    if (t >= this.tFoot) {
      const s = '¹ next bus: 23 min';
      const n = Math.round(prog(t, this.tFoot, this.tFoot + 0.2) * s.length);
      c.font = font(F.mono(400), 15);
      c.fillStyle = rgba('ink', 0.8);
      c.fillText(s.slice(0, n), x0, y0 + 40);
    }
    c.font = font(F.mono(400), 12);
    c.fillStyle = rgba('ink', 0.72);
    c.fillText(CREDIT, x0, y0 + 64);
    // north arrow: true north as the camera sees it
    const o = this.proj(cm.tgt), nq = this.proj({ x: cm.tgt.x, y: cm.tgt.y, z: cm.tgt.z - 3 });
    if (o && nq) {
      const a = Math.atan2(nq.y - o.y, nq.x - o.x);
      const nx = x0 + bw - 44, ny = y0 + 44;
      c.save();
      c.translate(nx, ny); c.rotate(a + Math.PI / 2);
      c.strokeStyle = rgba('ink', 0.85); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(0, 12); c.lineTo(0, -14); c.stroke();
      c.fillStyle = rgba('ink', 0.85);
      c.beginPath(); c.moveTo(0, -18); c.lineTo(-5, -6); c.lineTo(5, -6); c.closePath(); c.fill();
      c.restore();
      c.font = font(F.mono(600), 12);
      c.fillStyle = rgba('ink', 0.85);
      c.fillText('N', nx + 12, ny - 12);
    }
    c.restore();
  }
}
