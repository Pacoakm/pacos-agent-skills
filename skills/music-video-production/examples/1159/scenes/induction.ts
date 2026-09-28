// 11:59 `induction` — "Proof by induction, step one looks alright / Step n plus one is due tonight".
// A light plate, and the drums enter. A textbook proof on bone paper: the lyric is set as the proof's
// text (the run-in head "Proof by induction," in italic, n + 1 in Cormorant), and under it the figure:
// a row of dominoes on a number line, which turns out to be 3D. The camera starts high over the page,
// where the figure reads as print; on the 8.39 drum entry the proof box slams in, the dominoes rise out
// of the page and the camera drops to a low angle along the row. The page jolts on every kick. "step
// one": the spark checks P(1) and BASE CASE OK is stamped. "Step n plus one": the chain falls one domino
// per kick toward n + 1 (tagged `due 23:59`); on "tonight" the last domino lands flat, one domino
// short, and n + 1 wobbles, standing. The end-of-proof box stays dashed and empty.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { Lyrics, type Word, type Line, norm } from '../../engine/lyrics';
import { F, font, measure } from '../../engine/type';
import { LIN, rgba } from '../../engine/palette';
import { SCALE } from '../../engine/scale';
import { clamp, ease, hash, lerp, noise2, prog, pulse, TAU, frameIdx } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { PAPER_BG, PAGE_VERT, PAGE_FRAG, SLAB_FRAG, MAX_BOX } from './induction-glsl';
import { DOM, XS, N, LABELS, angles, rise, rock, jolt, slabMatrix, slabPoint, type ChainTimes } from './induction-chain';

type Ctx2 = CanvasRenderingContext2D;

const INK = (a = 1) => rgba('ink', a);
const OR = (a = 1) => rgba('signal', a);
const LIGHT = new THREE.Vector3(-0.72, 0.62, 0.3).normalize();

// ---- the proof text (logical px)
const TX = 150;                 // left edge of the text measure
const SIZE = 60;                // lyric size
const Y_THM = 168, Y_L1 = 268, Y_L2 = 350;
const BOX = { x0: 122, y0: 204, x1: 1798, y1: 382 };
const F_ROMAN = F.archivo(100, 700);
const F_ITAL = F.archivoItalic(100, 800);
const F_MATH_I = F.serif(600, true);
const F_MATH = F.serif(600, false);
const MATH_K = 1.34;            // Cormorant sits small: scale it to Archivo's x-height
const FIG_K = 1.16;             // …and its figures and signs to Archivo's cap height

// ---- the printed figure on the page (world units)
const PR = { x0: -2.6, z0: -2.7, x1: XS[N - 1]! + 2.6, z1: 2.9, ppu: 150 };
const Z_LINE = DOM.w / 2 + 0.45;

interface Piece { w: Word; text: string; fam: string; size: number; x: number; y: number; line: number }
interface CS { tx: number; ty: number; tz: number; yaw: number; pitch: number; dist: number; fov: number; roll: number }
interface Phase { t: number; dur: number; fn: (t: number) => CS; ez: (x: number) => number }

const mixCS = (a: CS, b: CS, k: number): CS => ({
  tx: lerp(a.tx, b.tx, k), ty: lerp(a.ty, b.ty, k), tz: lerp(a.tz, b.tz, k), yaw: lerp(a.yaw, b.yaw, k),
  pitch: lerp(a.pitch, b.pitch, k), dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), k)), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k),
});

export default class Induction extends Scene {
  cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 400);
  world = new THREE.Scene();
  bg = new FSPass(PAPER_BG, { drift: { value: new THREE.Vector2() } });
  over = new Layer2D();
  glow = new LineBatch(800);
  dots = new LineBatch(3000, { blend: 'normal' });
  slabs: THREE.Mesh[] = [];
  slabMats: THREE.RawShaderMaterial[] = [];
  page!: THREE.Mesh;
  pageMat!: THREE.RawShaderMaterial;
  boxU = {
    boxInv: { value: Array.from({ length: MAX_BOX }, () => new THREE.Matrix4()) },
    boxOn: { value: new Array(MAX_BOX).fill(0) as number[] },
    boxHalf: { value: new THREE.Vector3(DOM.th / 2, DOM.h / 2, DOM.w / 2) },
    lightDir: { value: LIGHT.clone() },
  };
  mats: THREE.Matrix4[] = Array.from({ length: N }, () => new THREE.Matrix4());

  l1!: Line; l2!: Line;
  pieces: Piece[] = [];
  T!: ChainTimes;
  kicks: number[] = [];
  tHit = 0; tStep = 0; tOne = 0; tOneEnd = 0; tStamp = 0; tDue = 0; tTonight = 0; tChase = 0; tEnd = 0; tQed = 0; tFoot = 0;
  phases: Phase[] = [];
  stampImg!: HTMLCanvasElement;
  printTex!: THREE.CanvasTexture;
  stampRot = -0.07;

  override async init() {
    const { lyrics, audio, start, end } = this.ctx;
    this.l1 = lyrics.get('Proof by induction');
    this.l2 = lyrics.get('Step n plus one');
    const w1 = this.l1.words, w2 = this.l2.words;
    const find = (ws: Word[], q: string, from = 0) => ws.slice(from).find((w) => norm(w.w) === norm(q)) ?? ws[ws.length - 1]!;

    // ---- times (all from the data)
    this.kicks = audio.events('kick', start - 0.05, end + 0.02).map((k) => k[0]);
    if (this.kicks.length < 8) {
      this.kicks = [];
      for (let b = Math.ceil(audio.beatAt(start)); audio.timeOfBeat(b) < end; b++) this.kicks.push(audio.timeOfBeat(b));
    }
    const kAfter = (t: number, tol = 0.06) => this.kicks.find((k) => k >= t - tol) ?? t;
    this.tHit = audio.downbeats.find((d) => d >= w1[0]!.start - 0.02) ?? w1[0]!.start;
    const drumKicks = this.kicks.filter((k) => k >= this.tHit - 0.06);
    const step1 = find(w1, 'step'), one1 = find(w1, 'one'), alright = find(w1, 'alright');
    this.tStep = step1.start; this.tOne = one1.start; this.tOneEnd = one1.end;
    this.tStamp = kAfter(alright.start);
    const due = find(w2, 'due'), tonight = find(w2, 'tonight');
    this.tDue = due.start; this.tTonight = tonight.start;
    // the chain: the spark taps domino 1 on the first kick of line 2; one contact per kick after that;
    // n lands flat on the first kick inside "tonight"
    const kLine2 = drumKicks.filter((k) => k >= w2[0]!.start - 0.02);
    const K = kLine2.slice(0, N);
    while (K.length < N) K.push((K[K.length - 1] ?? w2[0]!.start) + 0.46);
    const land = K[N - 1]!;
    this.T = { hit: this.tHit, kicks: drumKicks, K, after: drumKicks.filter((k) => k > land + 0.1) };
    this.tChase = drumKicks.filter((k) => k > alright.end - 0.05 && k < K[0]! - 0.2).pop() ?? K[0]! - 0.46;
    this.tEnd = end;
    this.tQed = this.T.after[0] ?? land + 0.46;
    this.tFoot = Math.min(end - 0.5, tonight.end + 0.02);

    this.layoutText();
    this.buildWorld();
    this.buildStamp();
    this.buildPhases();
  }

  // ------------------------------------------------------------------ layout
  layoutText() {
    const sp = measure(' ', F_ROMAN, SIZE);
    let x = TX;
    this.l1.words.forEach((w, i) => {
      const ital = i < 3;
      const last = i === this.l1.words.length - 1;
      const fam = ital ? F_ITAL : F_ROMAN;
      const text = w.w + (last ? '.' : '');
      this.pieces.push({ w, text, fam, size: SIZE, x, y: Y_L1, line: 1 });
      x += measure(text, fam, SIZE) + sp * (ital && i === 2 ? 1.15 : 1);
    });
    x = TX;
    const mSize = SIZE * MATH_K;
    this.l2.words.forEach((w, i) => {
      const k = norm(w.w);
      const last = i === this.l2.words.length - 1;
      let text = w.w + (last ? '.' : ''), fam = F_ROMAN, size = SIZE, gapAfter = sp;
      if (k === 'n') { text = 'n'; fam = F_MATH_I; size = mSize; gapAfter = mSize * 0.2; }
      else if (k === 'plus') { text = '+'; fam = F_MATH; size = SIZE * FIG_K; gapAfter = mSize * 0.2; }
      else if (k === 'one' && i > 0 && norm(this.l2.words[i - 1]!.w) === 'plus') { text = '1'; fam = F_MATH; size = SIZE * FIG_K; gapAfter = sp * 1.05; }
      this.pieces.push({ w, text, fam, size, x, y: Y_L2, line: 2 });
      x += measure(text, fam, size) + gapAfter;
    });
  }

  buildWorld() {
    // the printed figure: white-on-black coverage, world x → canvas x, world z → canvas y
    const pw = Math.round((PR.x1 - PR.x0) * PR.ppu), ph = Math.round((PR.z1 - PR.z0) * PR.ppu);
    const cv = document.createElement('canvas');
    cv.width = pw; cv.height = ph;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#000'; c.fillRect(0, 0, pw, ph);
    const X = (x: number) => (x - PR.x0) * PR.ppu, Z = (z: number) => (z - PR.z0) * PR.ppu;
    c.strokeStyle = '#fff'; c.fillStyle = '#fff';
    c.lineCap = 'butt';
    // figure frame (two hairlines, the outer heavier)
    c.lineWidth = 2.4; c.strokeRect(X(-2.3), Z(-2.4), X(XS[N - 1]! + 2.3) - X(-2.3), Z(2.6) - Z(-2.4));
    c.lineWidth = 1.1; c.strokeRect(X(-2.22), Z(-2.32), X(XS[N - 1]! + 2.22) - X(-2.22), Z(2.52) - Z(-2.32));
    // number line: solid 1…4, dotted across the ellipsis, solid n → n + 1, arrow past the end
    c.lineWidth = 2.6;
    const zl = Z(Z_LINE);
    c.beginPath(); c.moveTo(X(-1.1), zl); c.lineTo(X(XS[3]! + 0.35), zl); c.stroke();
    c.setLineDash([3, 11]); c.lineCap = 'round'; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(X(XS[3]! + 0.5), zl); c.lineTo(X(XS[4]! - 0.45), zl); c.stroke();
    c.setLineDash([]); c.lineCap = 'butt'; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(X(XS[4]! - 0.3), zl); c.lineTo(X(XS[N - 1]! + 1.45), zl); c.stroke();
    c.beginPath();
    c.moveTo(X(XS[N - 1]! + 1.25), zl - 12); c.lineTo(X(XS[N - 1]! + 1.5), zl); c.lineTo(X(XS[N - 1]! + 1.25), zl + 12); c.stroke();
    for (const x of XS) { c.beginPath(); c.moveTo(X(x), zl - 16); c.lineTo(X(x), zl + 16); c.stroke(); }
    // footprints (dashed), and the empty place between n and n + 1
    c.lineWidth = 1.5; c.setLineDash([7, 6]);
    for (const x of XS) c.strokeRect(X(x - DOM.th / 2), Z(-DOM.w / 2), DOM.th * PR.ppu, DOM.w * PR.ppu);
    c.setLineDash([]);
    // dimension line behind the row: one step
    const zd = Z(-DOM.w / 2 - 0.55);
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(X(XS[0]!), zd - 14); c.lineTo(X(XS[0]!), zd + 14);
    c.moveTo(X(XS[1]!), zd - 14); c.lineTo(X(XS[1]!), zd + 14);
    c.moveTo(X(XS[0]!) + 2, zd); c.lineTo(X(XS[1]!) - 2, zd);
    c.stroke();
    for (const [x, s] of [[X(XS[0]!) + 2, 1], [X(XS[1]!) - 2, -1]] as const) {
      c.beginPath(); c.moveTo(x, zd); c.lineTo(x + s * 16, zd - 6); c.lineTo(x + s * 16, zd + 6); c.closePath(); c.fill();
    }
    c.font = font(F.serif(400, true), 34);
    c.textAlign = 'center';
    c.fillText('k  ↦  k + 1', (X(XS[0]!) + X(XS[1]!)) / 2, zd - 16);
    c.textAlign = 'left';
    // caption, front left of the frame
    c.font = font(F.mono(600), 30);
    c.fillText('FIG. 3.2', X(-2.0), Z(2.32));
    c.font = font(F.mono(400), 30);
    c.fillText('the inductive chain', X(-2.0) + 176, Z(2.32));
    c.font = font(F.mono(400), 24);
    c.textAlign = 'right';
    c.fillText('not to scale', X(XS[N - 1]! + 2.0), Z(2.32));
    c.textAlign = 'left';
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 16;
    this.printTex = tex;

    const fogU = { value: new THREE.Vector2(8, 14) };
    const camU = { value: new THREE.Vector3() };
    this.pageMat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: PAGE_VERT, fragmentShader: PAGE_FRAG,
      uniforms: {
        ...this.boxU, printTex: { value: tex }, printRect: { value: new THREE.Vector4(PR.x0, PR.z0, PR.x1, PR.z1) },
        camPos: camU, fog: fogU, printOn: { value: 1 }, shadowOn: { value: 0 },
      },
      depthWrite: true, depthTest: true,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.DstColorFactor, blendDst: THREE.ZeroFactor,
    });
    const pg = new THREE.PlaneGeometry(120, 120);
    pg.rotateX(-Math.PI / 2);
    this.page = new THREE.Mesh(pg, this.pageMat);
    this.page.frustumCulled = false;
    this.page.renderOrder = 1;
    this.world.add(this.page);

    const geo = new THREE.BoxGeometry(DOM.th, DOM.h, DOM.w);
    for (let i = 0; i < N; i++) {
      const m = new THREE.RawShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader: PAGE_VERT, fragmentShader: SLAB_FRAG,
        uniforms: {
          ...this.boxU, self: { value: i }, camPos: camU, fog: fogU,
          edgeW: { value: 1.6 }, ink: { value: 1 }, mark: { value: 1 },
        },
      });
      const mesh = new THREE.Mesh(geo, m);
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 0;
      this.world.add(mesh);
      this.slabs.push(mesh);
      this.slabMats.push(m);
    }
  }

  /** The orange rubber stamp, rendered once with mottled ink and voids. */
  buildStamp() {
    const w = 470, h = 150, s = SCALE * 2;
    const cv = document.createElement('canvas');
    cv.width = w * s; cv.height = h * s;
    const c = cv.getContext('2d')!;
    c.scale(s, s);
    c.strokeStyle = OR(1); c.fillStyle = OR(1);
    c.lineWidth = 6; this.rrect(c, 5, 5, w - 10, h - 10, 12); c.stroke();
    c.lineWidth = 1.8; this.rrect(c, 15, 15, w - 30, h - 30, 7); c.stroke();
    c.font = font(F.mono(700), 50);
    c.textAlign = 'center';
    c.fillText('BASE CASE OK', w / 2, 86);
    c.font = font(F.mono(500), 17);
    c.letterSpacing = '4px';
    c.fillText('P(1) VERIFIED · STEP 1 OF n', w / 2, 118);
    const img = c.getImageData(0, 0, cv.width, cv.height);
    const d = img.data;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      const i = (y * cv.width + x) * 4 + 3;
      if (!d[i]) continue;
      const px = x / s, py = y / s;
      const n = noise2(px * 0.09, py * 0.09, 3) * 0.5 + noise2(px * 0.31, py * 0.31, 5) * 0.32 + noise2(px * 1.1, py * 1.1, 7) * 0.18;
      const press = noise2(px * 0.011 + 4, py * 0.011, 9);
      const v = clamp((n + 0.42 + 0.25 * press) / 0.22);
      d[i] = Math.round(d[i]! * v * (0.82 + 0.18 * press));
    }
    c.putImageData(img, 0, 0);
    this.stampImg = cv;
  }

  rrect(c: Ctx2, x: number, y: number, w: number, h: number, r: number) {
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r);
    c.closePath();
  }

  // ------------------------------------------------------------------ camera
  /** x of the falling front (for the chase): eases from domino to domino between the kicks. */
  frontX(t: number) {
    const K = this.T.K;
    if (t <= K[0]!) return XS[0]!;
    for (let i = 0; i < N - 1; i++) {
      if (t < K[i + 1]!) return lerp(XS[i]!, XS[i + 1]!, ease.inOutQuad((t - K[i]!) / (K[i + 1]! - K[i]!)));
    }
    return XS[N - 1]!;
  }

  buildPhases() {
    const { end } = this.ctx;
    const hit = this.tHit, K = this.T.K;
    const land = K[N - 1]!;
    const kOne = this.kicks.find((k) => k >= this.tStep + 0.02) ?? this.tStep;
    const mid = (XS[0]! + XS[N - 1]!) / 2;
    this.phases = [
      // the drop: from over the page to a low three-quarter view down the row
      { t: hit, dur: 0.85, ez: ease.outExpo, fn: (t) => { const s = t - hit; return { tx: mid - 1.2 + s * 0.06, ty: 0.7, tz: 0.2, yaw: -0.74 + s * 0.035, pitch: 0.3, dist: 12.6 - s * 0.35, fov: 33, roll: -0.012 }; } },
      // "step one": in on the base case
      { t: kOne, dur: 0.6, ez: ease.outExpo, fn: (t) => { const s = t - kOne; return { tx: 1.5 + s * 0.08, ty: 0.75, tz: 0.3, yaw: -0.5 + s * 0.02, pitch: 0.26, dist: 9.4 - s * 0.2, fov: 32, roll: 0 }; } },
      // before line 2: low down the row, the whole chain in shot
      { t: this.tChase, dur: 0.55, ez: ease.outExpo, fn: (t) => { const s = t - this.tChase; return { tx: mid - 0.9 + s * 0.12, ty: 0.7, tz: 0.1, yaw: -0.84 + s * 0.03, pitch: 0.23, dist: 12.2 - s * 0.3, fov: 30, roll: 0.01 }; } },
      // the chase: trucks with the falling front
      { t: K[0]! - 0.05, dur: 0.9, ez: ease.inOutCubic, fn: (t) => { const f = this.frontX(t + 0.2); const k = prog(t, K[0]!, land); return { tx: lerp(mid - 0.6, f + 0.6, 0.55), ty: 0.72, tz: 0.1, yaw: -0.9 + 0.2 * k, pitch: 0.21, dist: 11.8 - 1.2 * k, fov: 30, roll: 0.006 }; } },
      // the stop: hold on n + 1, a slow push
      { t: land - 0.02, dur: 1.0, ez: ease.outCubic, fn: (t) => { const s = prog(t, land, end, ease.linear); return { tx: XS[N - 1]! - 1.2, ty: 0.75, tz: 0.45, yaw: -0.3 + 0.04 * s, pitch: 0.24 - 0.02 * s, dist: 9.0 - 0.8 * s, fov: 30, roll: 0 }; } },
    ];
  }

  camState(t: number): CS {
    const { start } = this.ctx;
    const xm = (XS[0]! + XS[N - 1]!) / 2;
    const s = t - start;
    let st: CS = { tx: xm - 0.1, ty: 0, tz: 0.55, yaw: 0, pitch: 1.5, dist: 15.2 - s * 1.2, fov: 32, roll: 0 };
    for (const ph of this.phases) {
      const k = prog(t, ph.t, ph.t + ph.dur, ph.ez);
      if (k > 0) st = mixCS(st, ph.fn(t), k);
    }
    // a small push on every kick
    let kp = 0;
    for (const k of this.T.kicks) kp = Math.max(kp, pulse(t, k, 0.06));
    st.dist *= 1 - 0.012 * kp;
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
    // the figure sits under the proof text: shift the principal point down
    cam.setViewOffset(W, H, 0, -205, W, H);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return s;
  }

  proj(v: THREE.Vector3) {
    const p = v.clone().project(this.cam);
    return { x: (p.x * 0.5 + 0.5) * W, y: (0.5 - p.y * 0.5) * H, z: p.z };
  }
  /** Screen px per world unit at a point (for sizing the annotations with depth). */
  ppu(v: THREE.Vector3) {
    const a = this.proj(v), b = this.proj(v.clone().add(new THREE.Vector3(0, 1, 0)));
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  // ------------------------------------------------------------------ the chain at t
  pose(t: number, into: THREE.Matrix4[] = this.mats) {
    const ang = angles(t, this.T);
    const r = rock(t, this.T);
    for (let i = 0; i < N; i++) {
      const rk = rise(i, t, this.tHit);
      const j = ang[i]! === 0 && (i < N - 1 || t < this.T.K[N - 1]!) ? jolt(i, t, this.T) : { hop: 0, tw: 0 };
      const th = i === N - 1 ? r : ang[i]!;
      slabMatrix(into[i]!, i, th, rk, j.hop, j.tw);
    }
    return ang;
  }
  /** The top front corner of slab i (world). */
  tip(i: number, m: THREE.Matrix4[] = this.mats) { return slabPoint(m[i]!, DOM.th / 2, DOM.h / 2, 0); }
  tmp: THREE.Matrix4[] = Array.from({ length: N }, () => new THREE.Matrix4());

  /** The spark: the proof's pointer. Returns a screen position (or null before it exists). */
  sparkAt(t: number): { x: number; y: number } | null {
    const K = this.T.K;
    if (t < this.tHit) return null;
    // it rides the falling front once line 2 starts
    if (t >= K[0]! - 0.02) {
      const M = this.tmp;
      this.pose(t, M);
      let i = 0;
      for (let k = 0; k < N - 1; k++) if (t >= K[k]!) i = k;
      if (t >= K[N - 1]!) i = N - 2;
      const p = this.tip(i, M);
      if (i > 0 && t < K[i]! + 0.07) {
        const q = this.tip(i - 1, M);
        p.lerp(q, 1 - ease.outCubic((t - K[i]!) / 0.07));
      }
      return this.proj(p.add(new THREE.Vector3(0.02, 0.06, 0)));
    }
    const hover = (tt: number) => new THREE.Vector3(XS[0]! - 0.05, DOM.h + 0.24 + 0.05 * Math.sin(TAU * 0.9 * (tt - this.tHit)), 0.05);
    // born out of the page at domino 1 on the hit
    const born = prog(t, this.tHit, this.tHit + 0.5, ease.outExpo);
    let p = new THREE.Vector3(XS[0]! - 0.05, 0.02, 0.4).lerp(hover(t), born);
    // wind-up before the tap: up and back, then down onto the top back edge on the kick
    const wind0 = K[0]! - 0.32;
    if (t > wind0) {
      const top = new THREE.Vector3(XS[0]! - DOM.th / 2, DOM.h + 0.02, 0.05);
      const back = hover(wind0).add(new THREE.Vector3(-0.35, 0.3, 0));
      if (t < K[0]! - 0.12) p = hover(wind0).lerp(back, ease.outCubic((t - wind0) / 0.2));
      else p = back.lerp(top, ease.inQuad((t - (K[0]! - 0.12)) / 0.1));
    }
    let sp = this.proj(p);
    // "one": it writes the check of P(1)
    const cs = this.checkPath();
    if (cs && t > this.tOne - 0.12 && t < this.tOneEnd + 0.2) {
      const go = prog(t, this.tOne - 0.12, this.tOne, ease.inOutCubic);
      const wr = prog(t, this.tOne, this.tOneEnd, ease.inOutQuad);
      const back = prog(t, this.tOneEnd, this.tOneEnd + 0.2, ease.inOutCubic);
      const pen = this.pointOnCheck(cs, wr);
      const k = go * (1 - back);
      sp = { x: lerp(sp.x, pen.x, k), y: lerp(sp.y, pen.y, k), z: sp.z };
    }
    return sp;
  }

  /** Anchor of the P(1) callout (screen): the upper corner of domino 1's face, the label out to its left. */
  calloutAnchor() {
    const wp = new THREE.Vector3(XS[0]! - DOM.th / 2, DOM.h * 0.86, -DOM.w / 2);
    const top = this.proj(wp);
    const k = clamp(this.ppu(wp) / 150, 0.75, 1.3);
    return { top, k, lx: top.x - 250 * k, ly: Math.max(top.y - 6 * k, 452) };
  }
  checkPath() {
    const a = this.calloutAnchor();
    const x = a.lx + measure('P(1)', F_MATH_I, 46 * a.k) + 14 * a.k, y = a.ly - 4 * a.k;
    const k = a.k;
    return [{ x, y: y - 14 * k }, { x: x + 11 * k, y: y }, { x: x + 34 * k, y: y - 34 * k }];
  }
  pointOnCheck(p: { x: number; y: number }[], u: number) {
    const l1 = Math.hypot(p[1]!.x - p[0]!.x, p[1]!.y - p[0]!.y), l2 = Math.hypot(p[2]!.x - p[1]!.x, p[2]!.y - p[1]!.y);
    const s = u * (l1 + l2);
    if (s <= l1) return { x: lerp(p[0]!.x, p[1]!.x, s / l1), y: lerp(p[0]!.y, p[1]!.y, s / l1) };
    const v = (s - l1) / l2;
    return { x: lerp(p[1]!.x, p[2]!.x, v), y: lerp(p[1]!.y, p[2]!.y, v) };
  }

  // ------------------------------------------------------------------ render
  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer } = this.ctx;
    const t = f.t;
    const cs = this.applyCam(t);
    this.pose(t);

    // uniforms: slabs, shadows, fog
    for (let i = 0; i < N; i++) {
      this.slabs[i]!.matrix.copy(this.mats[i]!);
      this.slabs[i]!.matrixWorld.copy(this.mats[i]!);
      const up = rise(i, t, this.tHit) > 0.02;
      this.boxU.boxOn.value[i] = up ? 1 : 0;
      this.boxU.boxInv.value[i]!.copy(this.mats[i]!).invert();
      this.slabs[i]!.visible = up;
    }
    const camPos = this.cam.position;
    (this.pageMat.uniforms.camPos!.value as THREE.Vector3).copy(camPos);
    (this.pageMat.uniforms.fog!.value as THREE.Vector2).set(cs.dist * 1.05, cs.dist * 1.6);
    this.pageMat.uniforms.shadowOn!.value = prog(t, this.tHit + 0.05, this.tHit + 0.3);
    for (const m of this.slabMats) m.uniforms.ink!.value = 1;

    // paper, then the 3D figure
    (this.bg.u.drift!.value as THREE.Vector2).set(cs.tx * 14, 0);
    this.bg.render(renderer, out);
    renderer.setRenderTarget(out);
    renderer.clearDepth();
    renderer.render(this.world, this.cam);

    // the annotations and the proof (multiplied onto the page like print)
    this.drawOverlay(t);
    this.ctx.comp.draw(renderer, this.over.upload(), out, { mode: 'multiply', premult: false });

    // the spark
    this.drawSpark(t, out);

    // shake: the drum entry, the stamp, the landing
    const amp = 11 * pulse(t, this.tHit, 0.07) + 7 * pulse(t, this.tStamp, 0.06) + 6 * pulse(t, this.T.K[N - 1]!, 0.06)
      + 2.2 * Math.max(0, ...this.T.K.slice(1, N - 1).map((k) => pulse(t, k, 0.04)));
    const fi = frameIdx(t);
    return {
      paper: 1, hud: 0,
      bloom: 0.22, bloomThreshold: 1.8, bloomKnee: 0.4, halation: 0.03,
      vignette: 0.14, grain: 0.042, ca: 0.35,
      zoom: 1 + 0.025 * pulse(t, this.tHit, 0.08),
      shake: [amp * (hash(fi, 11) - 0.5) * 2, amp * (hash(fi, 12) - 0.5) * 2],
    };
  }

  drawSpark(t: number, out: THREE.WebGLRenderTarget) {
    const hp = this.sparkAt(t);
    const d = this.dots, g = this.glow;
    d.clear(); g.clear();
    if (hp) {
      const K = this.T.K;
      const stuck = t >= K[N - 1]!;
      const burst = (tb: number) => {
        let b = 0;
        for (const k of K) b = Math.max(b, pulse(tb, k, 0.05));
        b = Math.max(b, pulse(tb, this.tHit, 0.08));
        if (tb >= K[N - 1]!) b = Math.max(b, 0.25 + 0.35 * Math.abs(Math.sin(tb * 23.0)));
        return 16 + 260 * b;
      };
      // the line it drags: a fading orange hairline over its last fifth of a second
      {
        let prev: { x: number; y: number } | null = null;
        const n = 14;
        for (let j = n; j >= 0; j--) {
          const tt = t - j * 0.016;
          const q = tt >= this.tHit + 0.02 ? this.sparkAt(tt) : null;
          if (q && prev && Math.hypot(q.x - prev.x, q.y - prev.y) < 160) {
            const a = 1 - j / n;
            d.seg2(prev.x, prev.y, q.x, q.y, 1.2 + 1.3 * a, [LIN.signal[0], LIN.signal[1], LIN.signal[2]], 0.85 * a * a);
          }
          prev = q;
        }
      }
      sparkParticles(d, t, (tt) => (tt < this.tHit ? null : this.sparkAt(tt)), { rate: burst, rateMax: 420, life: 0.4, speed: 230, gravity: 700, intensity: 0.5, seed: 31, width: 1.6 });
      const kk = 1 + 0.3 * pulse(t, this.T.kicks.find((k) => k <= t) ?? -9, 0.08);
      const born = prog(t, this.tHit, this.tHit + 0.12);
      d.seg2(hp.x, hp.y, hp.x + 0.01, hp.y, 15 * kk * born, [LIN.signal[0], LIN.signal[1], LIN.signal[2]], 1);
      d.render(this.ctx.renderer, out);
      sparkHead(g, hp.x, hp.y, t, 0.72 * kk * born * (stuck ? 0.85 + 0.25 * Math.abs(Math.sin(t * 31)) : 1), 0.7);
      g.render(this.ctx.renderer, out);
    }
  }

  // ------------------------------------------------------------------ 2D: the proof and the callouts
  drawOverlay(t: number) {
    const L = this.over;
    L.clear('#fff');
    const c = L.ctx;
    c.textBaseline = 'alphabetic';
    const hit = this.tHit;
    const K = this.T.K;
    const land = K[N - 1]!;

    // ---- theorem (printed from the start)
    c.font = font(F.mono(600), 15);
    c.letterSpacing = '3px';
    c.fillStyle = INK(0.85);
    c.fillText('THEOREM 3.2', TX, Y_THM - 7);
    c.letterSpacing = '0px';
    let x = TX + measure('THEOREM 3.2', F.mono(600), 15, 3) + 26;
    const th: [string, string, number][] = [['For every ', F.serif(400, true), 36], ['n', F.serif(600, true), 38], [' ≥ 1,  ', F.serif(400), 36], ['P', F.serif(600, true), 38], ['(', F.serif(400), 36], ['n', F.serif(600, true), 38], [').', F.serif(400), 36]];
    c.fillStyle = INK(0.9);
    for (const [s, fam, sz] of th) { c.font = font(fam, sz); c.fillText(s, x, Y_THM); x += measure(s, fam, sz); }
    c.font = font(F.mono(400), 14);
    c.fillStyle = INK(0.55);
    c.fillText('where P(n): assignment n is in by 23:59', x + 24, Y_THM - 6);
    // time label (top right) and the section head
    c.textAlign = 'right';
    c.font = font(F.mono(500), 26);
    c.fillStyle = INK(0.9);
    c.fillText('16:40', BOX.x1, Y_THM - 2);
    c.font = font(F.mono(400), 13);
    c.fillStyle = INK(0.5);
    c.letterSpacing = '2px';
    c.fillText('§3.2 INDUCTION', BOX.x1 - 104, Y_THM - 7);
    c.letterSpacing = '0px';
    c.textAlign = 'left';

    // ---- the proof box: slams in on the drum entry
    {
      const k = prog(t, hit - 0.01, hit + 0.26, ease.outExpo);
      if (k > 0) {
        const { x0, y0, x1, y1 } = BOX;
        const wv = x1 - x0, hv = y1 - y0, per = 2 * (wv + hv);
        const len = per * k;
        c.strokeStyle = INK(0.95);
        c.lineWidth = 1.5;
        c.beginPath();
        // clockwise from the top left
        const segs: [number, number, number, number][] = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
        let rem = len;
        for (const [ax, ay, bx, by] of segs) {
          const sl = Math.hypot(bx - ax, by - ay);
          const u = clamp(rem / sl);
          if (u <= 0) break;
          c.moveTo(ax, ay); c.lineTo(lerp(ax, bx, u), lerp(ay, by, u));
          rem -= sl;
        }
        c.stroke();
        // corner ticks, the drafting kind
        if (k > 0.9) {
          c.lineWidth = 1;
          c.strokeStyle = INK(0.6);
          c.beginPath();
          for (const [px, py] of [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as const) {
            c.moveTo(px - 9, py); c.lineTo(px + 9, py); c.moveTo(px, py - 9); c.lineTo(px, py + 9);
          }
          c.stroke();
        }
      }
    }

    // ---- the lyric as the proof's text
    for (const p of this.pieces) this.drawPiece(c, p, t);

    // ---- end of proof: a dashed, empty box, flush right
    {
      const s = 40, qx = BOX.x1 - 34 - s, qy = Y_L2 - s + 2;
      const on = prog(t, this.l2.words[0]!.start - 0.4, this.l2.words[0]!.start - 0.05);
      if (on > 0) {
        const draw = prog(t, this.tQed, this.tQed + 0.35, ease.outCubic);
        c.strokeStyle = INK(0.25 * on + 0.7 * draw);
        c.lineWidth = 1.8;
        c.setLineDash([5, 4.3]);
        c.strokeRect(qx, qy, s, s);
        c.setLineDash([]);
        if (draw > 0) {
          c.font = font(F.serif(600), 30);
          c.fillStyle = INK(draw);
          c.fillText('¹', qx + s + 5, qy + 10);
        }
      }
    }
    // footnote, typed at the end
    if (t >= this.tFoot) {
      const txt = '¹ inductive step: TODO';
      const n = Math.round(prog(t, this.tFoot, this.tFoot + 0.3) * txt.length);
      c.font = font(F.mono(400), 16);
      c.fillStyle = INK(0.8);
      c.fillText(txt.slice(0, n), BOX.x0 + 28, BOX.y1 + 40);
    }

    // ---- the figure's annotations (anchored to the 3D figure, flat to the camera)
    const figOn = 1;
    // labels under the ticks of the number line
    for (let i = 0; i < N; i++) {
      const wp = new THREE.Vector3(XS[i]!, 0, Z_LINE + 0.34);
      const p = this.proj(wp);
      if (p.z > 1) continue;
      const ppu = this.ppu(wp);
      const sz = clamp(ppu * 0.36, 19, 48);
      const lab = LABELS[i]!;
      const pop = i === N - 1 ? 1 + 0.12 * pulse(t, this.tDue, 0.1) : 1;
      this.mathLabel(c, lab, p.x, p.y + sz * 0.62, sz * pop, INK(0.92 * figOn));
      // a small check once the domino has fallen onto the next (P(k) ⇒ P(k + 1))
      const fell = i < N - 1 && t >= K[i + 1]!;
      if (fell) {
        const u = prog(t, K[i + 1]!, K[i + 1]! + 0.12, ease.outCubic);
        const lw = this.mathWidth(lab, sz);
        this.check(c, p.x + lw / 2 + sz * 0.22, p.y + sz * 0.45, sz * 0.42, u, INK(0.9), 1.4);
      }
    }
    // impacts: short hairline ticks kick out where each domino strikes the next, and where n slaps the page
    for (let i = 1; i < N; i++) {
      const ti = K[i]!;
      if (t < ti || t > ti + 0.2) continue;
      const u = prog(t, ti, ti + 0.2, ease.outCubic);
      this.pose(ti + 1e-3, this.tmp);
      const pts = i < N - 1 ? [this.tip(i - 1, this.tmp)] : [slabPoint(this.tmp[N - 2]!, DOM.th / 2, DOM.h / 2, DOM.w / 2), slabPoint(this.tmp[N - 2]!, DOM.th / 2, -DOM.h / 2, DOM.w / 2)];
      const big = i === N - 1 ? 1.5 : 1;
      c.strokeStyle = INK(0.85 * (1 - u));
      c.lineWidth = 1.3;
      c.beginPath();
      for (const wp of pts) {
        const p = this.proj(wp);
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k - 2) * 0.55 + (i === N - 1 ? 0 : 0.3);
          const r0 = (10 + 26 * u) * big, r1 = r0 + (14 * (1 - u) + 5) * big;
          c.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0); c.lineTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1);
        }
      }
      c.stroke();
    }

    // the rise on the drum entry: ticks burst from each footprint as its domino comes up
    for (let i = 0; i < N; i++) {
      const tr = this.tHit + 0.012 + i * 0.03;
      if (t < tr || t > tr + 0.22) continue;
      const u = prog(t, tr, tr + 0.22, ease.outCubic);
      c.strokeStyle = INK(0.8 * (1 - u));
      c.lineWidth = 1.2;
      c.beginPath();
      for (const sz of [-1, 1]) {
        const p = this.proj(new THREE.Vector3(XS[i]!, 0, sz * DOM.w / 2));
        for (let k = 0; k < 3; k++) {
          const ang = (sz > 0 ? Math.PI / 2 : -Math.PI / 2) + (k - 1) * 0.6;
          const r0 = 6 + 22 * u, r1 = r0 + 12 * (1 - u) + 4;
          c.moveTo(p.x + Math.cos(ang) * r0, p.y + Math.sin(ang) * r0); c.lineTo(p.x + Math.cos(ang) * r1, p.y + Math.sin(ang) * r1);
        }
      }
      c.stroke();
    }

    // the ellipsis between 4 and n
    {
      const wp = new THREE.Vector3((XS[3]! + XS[4]!) / 2, 0, Z_LINE + 0.34);
      const p = this.proj(wp);
      const sz = clamp(this.ppu(wp) * 0.36, 19, 48);
      c.font = font(F.serif(600), sz);
      c.fillStyle = INK(0.8 * figOn);
      c.textAlign = 'center';
      c.fillText('···', p.x, p.y + sz * 0.62);
      c.textAlign = 'left';
    }

    // P(1) ✓ callout and the stamp
    if (t >= this.tStep - 0.05) {
      const a = this.calloutAnchor();
      const k = a.k;
      const lead = prog(t, this.tStep - 0.05, this.tStep + 0.15, ease.outCubic);
      c.strokeStyle = INK(0.85);
      c.lineWidth = 1.2;
      c.beginPath();
      const ex = a.lx + 150 * k, ey = a.ly + 14 * k;
      c.moveTo(a.top.x, a.top.y);
      c.lineTo(lerp(a.top.x, ex, lead), lerp(a.top.y, ey, lead));
      c.stroke();
      if (lead > 0.6) {
        c.fillStyle = INK(0.95);
        c.beginPath(); c.arc(a.top.x, a.top.y, 2.6, 0, TAU); c.fill();
        c.fillRect(a.lx - 6 * k, ey, (ex - a.lx) + 6 * k, 1.2);
        c.font = font(F_MATH_I, 46 * k);
        c.fillText('P', a.lx, a.ly);
        const pw = measure('P', F_MATH_I, 46 * k);
        c.font = font(F_MATH, 46 * k);
        c.fillText('(1)', a.lx + pw + 1, a.ly);
      }
      const cp = this.checkPath();
      const wr = prog(t, this.tOne, this.tOneEnd, ease.inOutQuad);
      if (wr > 0) this.polyPart(c, cp, wr, INK(1), 2.6 * k);
    }
    if (t >= this.tStamp) {
      const a = this.calloutAnchor();
      const k = prog(t, this.tStamp, this.tStamp + 0.06, ease.outCubic);
      const sc = lerp(1.18, 1, k) * a.k * 0.72;
      c.save();
      c.translate(a.lx + 60 * a.k, a.ly + 150 * a.k);
      c.rotate(this.stampRot);
      c.scale(sc, sc);
      c.globalAlpha = k;
      c.drawImage(this.stampImg, -235, -75, 470, 150);
      c.restore();
    }

    // n + 1: the tag `due 23:59`, tied to its top
    if (t >= this.tDue - 0.02) {
      const m = this.mats[N - 1]!;
      const topW = slabPoint(m, DOM.th / 2, DOM.h / 2, DOM.w / 2);
      const top = this.proj(topW);
      const ppu = this.ppu(topW);
      const k = clamp(ppu / 150, 0.75, 1.5);
      const u = prog(t, this.tDue - 0.02, this.tDue + 0.18, ease.outBack);
      const r = rock(t, this.T);
      const sw = 0.3 * Math.exp(-(t - this.tDue) / 0.35) * Math.sin(TAU * 1.6 * (t - this.tDue)) + r * 3;
      c.save();
      c.translate(top.x, top.y);
      c.rotate(sw);
      c.globalAlpha = clamp(u * 1.5);
      // string: from the top corner, hanging down the right side
      const hx = 64 * k, hy = 96 * k * u;
      c.strokeStyle = INK(0.9); c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(30 * k, -14 * k, hx - 6 * k, hy * 0.4, hx, hy); c.stroke();
      c.fillStyle = INK(1); c.beginPath(); c.arc(0, 0, 2.5, 0, TAU); c.fill();
      // tag: a notched card with a hole, hanging from it
      c.translate(hx, hy);
      c.rotate(0.12 + sw * 0.6);
      const tw = 180 * k, thh = 52 * k;
      c.beginPath();
      c.moveTo(0, 0); c.lineTo(16 * k, -thh / 2); c.lineTo(tw, -thh / 2); c.lineTo(tw, thh / 2); c.lineTo(16 * k, thh / 2); c.closePath();
      c.fillStyle = '#fff'; c.fill();
      c.strokeStyle = INK(0.95); c.lineWidth = 1.5; c.stroke();
      c.beginPath(); c.arc(15 * k, 0, 4.2 * k, 0, TAU); c.stroke();
      c.font = font(F.mono(600), 22 * k);
      c.fillStyle = INK(1);
      c.fillText('due', 32 * k, 8 * k);
      c.fillStyle = OR(1);
      c.fillText('23:59', 32 * k + measure('due ', F.mono(600), 22 * k), 8 * k);
      c.restore();
    }

    // the gap: ε — a small dimension on the page in front of the row, arrows outside pointing in
    if (t >= land) {
      const tipN = slabPoint(this.mats[N - 2]!, DOM.th / 2, DOM.h / 2, DOM.w / 2);
      const xb = XS[N - 1]! - DOM.th / 2;
      const zD = DOM.w / 2 + 0.3;
      const a0 = this.proj(new THREE.Vector3(tipN.x, 0.01, DOM.w / 2 + 0.04)), a = this.proj(new THREE.Vector3(tipN.x, 0.01, zD));
      const b0 = this.proj(new THREE.Vector3(xb, 0.01, DOM.w / 2 + 0.04)), b = this.proj(new THREE.Vector3(xb, 0.01, zD));
      const u = prog(t, land + 0.06, land + 0.3, ease.outCubic);
      const dx = b.x - a.x, dy = b.y - a.y, dl = Math.max(1e-3, Math.hypot(dx, dy)), ux = dx / dl, uy = dy / dl;
      const ex0 = a.x - a0.x, ey0 = a.y - a0.y, el = Math.max(1e-3, Math.hypot(ex0, ey0));
      c.globalAlpha = u;
      c.strokeStyle = INK(0.9); c.fillStyle = INK(0.9); c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(a0.x, a0.y); c.lineTo(a.x + ex0 / el * 10, a.y + ey0 / el * 10);
      c.moveTo(b0.x, b0.y); c.lineTo(b.x + ex0 / el * 10, b.y + ey0 / el * 10);
      c.moveTo(a.x - ux * 40, a.y - uy * 40); c.lineTo(b.x + ux * 40, b.y + uy * 40);
      c.stroke();
      for (const [px, py, sg] of [[a.x, a.y, -1], [b.x, b.y, 1]] as const) {
        c.beginPath(); c.moveTo(px, py);
        c.lineTo(px + sg * ux * 13 - uy * 4.5, py + sg * uy * 13 + ux * 4.5);
        c.lineTo(px + sg * ux * 13 + uy * 4.5, py + sg * uy * 13 - ux * 4.5);
        c.closePath(); c.fill();
      }
      c.font = font(F.serif(600, true), 42);
      c.fillStyle = INK(1);
      c.textAlign = 'center';
      // the label sits past the left arrow, on the dimension line's run-out
      const mx = a.x - ux * 64, my = a.y - uy * 64 + 13;
      c.fillText('ε', mx, my);
      const v = prog(t, this.tQed, this.tQed + 0.25);
      if (v > 0) {
        const txt = 'gap: ε > 0';
        c.textAlign = 'right';
        c.font = font(F.mono(400), 15);
        c.fillStyle = INK(0.75);
        c.fillText(txt.slice(0, Math.round(v * txt.length)).padEnd(txt.length, ' '), mx - 22, my - 3);
      }
      c.textAlign = 'left';
      c.globalAlpha = 1;
    }
  }

  /** "n + 1" etc. in Cormorant: letters italic, figures and signs upright, centred at x. */
  mathRuns(s: string, sz: number): [string, string, number][] {
    return s.split(/(\s+)/).filter((x) => x.length).map((tok) => {
      if (/^\s+$/.test(tok)) return [' ', F.serif(400), sz * 0.8] as [string, string, number];
      if (/^[a-z]$/i.test(tok)) return [tok, F.serif(600, true), sz * 1.1] as [string, string, number];
      return [tok, F.serif(600), sz] as [string, string, number];
    });
  }
  mathWidth(s: string, sz: number) { return this.mathRuns(s, sz).reduce((a, [tx, fam, z]) => a + measure(tx, fam, z), 0); }
  mathLabel(c: Ctx2, s: string, cx: number, y: number, sz: number, style: string) {
    let x = cx - this.mathWidth(s, sz) / 2;
    c.fillStyle = style;
    for (const [tx, fam, z] of this.mathRuns(s, sz)) { c.font = font(fam, z); c.fillText(tx, x, y); x += measure(tx, fam, z); }
  }
  check(c: Ctx2, x: number, y: number, s: number, u: number, style: string, lw: number) {
    this.polyPart(c, [{ x, y: y - s * 0.42 }, { x: x + s * 0.32, y }, { x: x + s, y: y - s }], u, style, lw);
  }
  polyPart(c: Ctx2, p: { x: number; y: number }[], u: number, style: string, lw: number) {
    const ls = p.slice(1).map((q, i) => Math.hypot(q.x - p[i]!.x, q.y - p[i]!.y));
    let rem = u * ls.reduce((a, b) => a + b, 0);
    c.strokeStyle = style; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(p[0]!.x, p[0]!.y);
    for (let i = 0; i < ls.length && rem > 0; i++) {
      const v = clamp(rem / ls[i]!);
      c.lineTo(lerp(p[i]!.x, p[i + 1]!.x, v), lerp(p[i]!.y, p[i + 1]!.y, v));
      rem -= ls[i]!;
    }
    c.stroke();
    c.lineCap = 'butt';
  }

  /** One lyric word: printed faint ahead of its line, wiped orange while sung, then ink. */
  drawPiece(c: Ctx2, p: Piece, t: number) {
    const line = p.line === 1 ? this.l1 : this.l2;
    const show = Math.max(this.ctx.start, line.words[0]!.start - 0.4);
    const vis = prog(t, show, show + 0.12);
    if (vis <= 0) return;
    const w = p.w;
    c.font = font(p.fam, p.size);
    const ww = measure(p.text, p.fam, p.size);
    const pr = Lyrics.wordProgress(w, t);
    const done = t >= w.end + 0.03 ? 1 : 0; // snap to ink: a blend of orange and ink reads brown
    if (pr <= 0) { c.fillStyle = INK(0.2 * vis); c.fillText(p.text, p.x, p.y); return; }
    // the sung word sits a hair heavier on the page: a quick press as it starts
    const press = pulse(t, w.start, 0.05);
    c.save();
    c.translate(p.x, p.y + press * 1.5);
    if (done < 1) {
      c.fillStyle = INK(0.2);
      c.fillText(p.text, 0, 0);
      c.save();
      c.beginPath(); c.rect(-10, -p.size * 1.0, (ww + 20) * Math.min(1, pr * 1.02) + 10 * (pr >= 1 ? 1 : 0), p.size * 1.3); c.clip();
      c.fillStyle = '#fff'; c.fillRect(-4, -p.size * 0.98, ww + 30, p.size * 1.26);
      c.fillStyle = OR(1 - done);
      c.fillText(p.text, 0, 0);
      c.restore();
    }
    if (done > 0) { c.fillStyle = INK(done * 0.96); c.fillText(p.text, 0, 0); }
    c.restore();
  }
}
