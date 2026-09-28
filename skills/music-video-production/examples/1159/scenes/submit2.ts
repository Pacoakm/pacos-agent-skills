// `submit2` — "Eleven fifty-nine, submit before the line" (chorus 2): chorus 1's upload strip
// rebuilt in 3D, one notch worse.
// The ruler is a runway on the floor of the ink void, graduated from 23:59:55 and running away to
// the deadline: an orange gate standing across the track at the end of 23:59:59. The spark is the
// upload head riding the ruler's baseline; the camera chases it low, from the side, over the track.
// The lyric's chunks lie face up on the far half of the runway, queued; each one stands up on its
// hinge as its word is sung and fills as it uploads (orange, then committed to bone), exactly as in
// chorus 1, now cards in space. "submit": the SUBMIT slam. "before the": the head lunges and brakes
// hard into the gate. "line": it reaches the gate plane on the word, everything freezes (the sparks
// hang in the air), the gate flares, the camera snaps round in front of it; on the downbeat the
// stamp `SUBMITTED 23:59:59.99`, footnote `10 ms to spare`.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H, SCALE, clearRT, makeRT } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { HEX, LIN, rgba } from '../../engine/palette';
import { F, font, measure } from '../../engine/type';
import { norm, type Word } from '../../engine/lyrics';
import { clamp, ease, hexToLinear, lerp, prog, pulse, smoothstep } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { GROUND, cardMaterial, textGeometry } from './submit2-glsl';
import { drawChrome, drawStamp, VP_Y0, VP_Y1 } from './submit2-chrome';

type RGB = [number, number, number];
type P3 = { x: number; y: number; z: number };
type Proj = { x: number; y: number; s: number; w: number };
type Cam = { pos: P3; tgt: P3; fov: number; roll: number };

// ---------------------------------------------------------------- the figure (chorus 1's, in world units)
const K = 1 / 156; // world units per chorus-1 px: a chunk card is 1 unit tall
const SIZE = 118; // lyric size (chorus-1 px)
const BH = 1; // card height
const BASE = (156 / 2 - SIZE * 0.35) * K; // text baseline above the card's bottom edge
const PAD_L = SIZE * 0.2 * K, PAD_R = SIZE * 0.3 * K, GAP = 10 * K;
const CLK0 = 55; // the ruler starts at 23:59:55 (clock2 left off there)
const CLK_HEAD = 56; // the head's clock when the plate opens
const SPARE = 0.01; // seconds to spare: one notch worse than chorus 1's 30 ms
const TOTAL_MB = 38.0, PRE_MB = 4.2;
const RW = 1.3; // runway half-width
const GZ = 1.42, GH = 1.85, GT = 0.06; // gate half-width, height, frame depth
const DIM_Y = 1.42; // height of the dimension line over the cards
const FOG = { start: 7, len: 9 };

interface Chunk {
  w: Word; text: string; fam: string;
  xa: number; xb: number; t0: number; t1: number; mb: number;
  grp: THREE.Group; card: THREE.RawShaderMaterial; glyph: THREE.RawShaderMaterial;
}

/** sRGB alpha-over of palette colour `a` at alpha `k` on colour `b`, in linear (as Canvas2D would mix). */
function over(a: string, k: number, b = 'ink'): THREE.Vector3 {
  const ha = (HEX as Record<string, string>)[a]!, hb = (HEX as Record<string, string>)[b]!;
  const pa = parseInt(ha.slice(1), 16), pb = parseInt(hb.slice(1), 16);
  const ch = (s: number) => Math.round(lerp((pb >> s) & 255, (pa >> s) & 255, k));
  const hex = '#' + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('');
  const l = hexToLinear(hex);
  return new THREE.Vector3(l[0], l[1], l[2]);
}
const V = (c: RGB) => new THREE.Vector3(c[0], c[1], c[2]);
const hermite = (u: number, m0: number, m1: number) => {
  const u2 = u * u, u3 = u2 * u;
  return (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) + (u3 - u2) * m1;
};

export default class Submit2 extends Scene {
  cam = new THREE.PerspectiveCamera(40, W / H, 0.05, 200);
  vp = new THREE.Matrix4();
  inv = new THREE.Matrix4();
  v4 = new THREE.Vector4();
  ground = new FSPass(GROUND, { invVP: { value: new THREE.Matrix4() }, camPos: { value: new THREE.Vector3() }, fogStart: { value: FOG.start }, fogLen: { value: FOG.len } });
  world = new THREE.Scene();
  floorDepth!: THREE.Mesh;
  lines = new LineBatch(20000, { screen2D: false, depthTest: true, blend: 'max' });
  glow = new LineBatch(2000, { screen2D: false, depthTest: true }); // HDR orange: the hot run, the gate's flare
  spark = new LineBatch(4000, { screen2D: false, depthTest: true });
  L = new Layer2D();
  rt = makeRT(W, H, { samples: SCALE > 1 ? 2 : 4 }); // the world, multisampled: the cards' and glyphs' edges are geometry

  chunks: Chunk[] = [];
  last!: Word; // "line"
  lineGrp!: THREE.Group; lineMat!: THREE.RawShaderMaterial; lineW = 0;
  X0 = 0; XE = 0; XD = 0; RX0 = 0; pps = 1;
  tSub = 0; tLine = 0; tStamp = 0; tFoot = 0; tBefore = 0; tThe = 0; tFirst = 0;
  beats: number[] = []; downs: number[] = [];
  m0 = 1;

  override init() {
    const { lyrics, audio, start, end } = this.ctx;
    const l = lyrics.get('submit before the line', 1);
    const ws = l.words;
    this.last = ws[ws.length - 1]!;
    this.tLine = this.last.start;
    this.tFirst = ws[0]!.start;
    this.tSub = (ws.find((w) => norm(w.w) === 'submit') ?? ws[2]!).start;
    this.tBefore = (ws.find((w) => norm(w.w) === 'before') ?? ws[3]!).start;
    this.tThe = ws[ws.length - 2]!.start;
    // chunks, laid out exactly as chorus 1's (the type condenses as the deadline closes in)
    const head = ws.slice(0, -1);
    const widths = head.map((_, i) => (i < head.length - 2 ? 100 : i === head.length - 2 ? 87.5 : 75));
    let x = this.X0;
    const bone = over('bone', 1);
    head.forEach((w, i) => {
      const fam = F.archivo(widths[i]!, 900);
      const tw = measure(w.w, fam, SIZE) * K;
      const xa = x, xb = x + PAD_L + tw + PAD_R;
      const grp = new THREE.Group();
      grp.position.set(xa, 0, 0);
      const card = cardMaterial(FOG);
      const cg = new THREE.PlaneGeometry(xb - xa, BH);
      cg.translate((xb - xa) / 2, BH / 2, 0);
      const cm = new THREE.Mesh(cg, card); cm.frustumCulled = false;
      const glyph = cardMaterial(FOG, true);
      const gg = textGeometry(w.w, fam, SIZE, K);
      gg.translate(PAD_L, BASE, 0.004);
      const gm = new THREE.Mesh(gg, glyph); gm.frustumCulled = false;
      grp.add(cm, gm);
      this.world.add(grp);
      card.uniforms.colB!.value = over('ink', 1);
      glyph.uniforms.colA!.value = over('ink', 1);
      glyph.uniforms.colB!.value = bone;
      this.chunks.push({ w, text: w.w, fam, xa, xb, t0: w.start, t1: i === head.length - 1 ? this.tLine : w.end, mb: 0, grp, card, glyph });
      x = xb + GAP;
    });
    this.XE = this.chunks[this.chunks.length - 1]!.xb;
    this.pps = (this.XE - this.X0) / (60 - SPARE - CLK_HEAD);
    this.RX0 = this.X0 - (CLK_HEAD - CLK0) * this.pps;
    this.XD = this.XE + SPARE * this.pps;
    const span = this.XE - this.X0;
    for (const c of this.chunks) c.mb = ((c.xb - c.xa) / span) * (TOTAL_MB - PRE_MB);
    const n = this.chunks.length;
    const pb = this.chunks[n - 2]!, cb = this.chunks[n - 1]!;
    const vOut = 1.5 * (pb.xb - pb.xa) / (pb.t1 - pb.t0);
    this.m0 = clamp((vOut * (cb.t1 - cb.t0)) / (cb.xb - cb.xa), 0.5, 3);
    // "line": bare orange type, standing just past the gate
    const lf = F.archivo(125, 900), ls = SIZE * 1.12;
    this.lineW = measure(this.last.w, lf, ls) * K;
    this.lineGrp = new THREE.Group();
    this.lineGrp.position.set(this.XD + 34 * K, 0, 0);
    this.lineMat = cardMaterial(FOG, true);
    this.lineMat.uniforms.fillW!.value = -1;
    const lg = textGeometry(this.last.w, lf, ls, K);
    lg.translate(0, BASE, 0);
    const lm = new THREE.Mesh(lg, this.lineMat); lm.frustumCulled = false;
    this.lineGrp.add(lm);
    this.world.add(this.lineGrp);
    // a depth-only floor, so sparks falling through it are hidden
    const fg = new THREE.PlaneGeometry(400, 400); fg.rotateX(-Math.PI / 2);
    this.floorDepth = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 8 }));
    this.floorDepth.frustumCulled = false;
    // the spark lives in the cards' plane, a hair in front of it, in chorus-1 px (y down)
    this.spark.mesh.scale.set(K, -K, K);
    this.spark.mat.side = THREE.DoubleSide; // the mirrored transform would cull the billboards
    this.spark.mesh.position.set(0, 0, 0.1);
    // beat grid: the kicks sit on the beats here
    const b0 = Math.floor(audio.beatAt(start - 0.3));
    for (let b = b0; audio.timeOfBeat(b) < end + 0.1; b++) this.beats.push(audio.timeOfBeat(b));
    this.downs = audio.downbeats.filter((d) => d > start + 0.1 && d < end + 0.05);
    this.tStamp = audio.downbeats.find((d) => d >= this.tLine - 0.02) ?? this.tLine + 0.2;
    this.tFoot = this.tStamp + 0.06;
  }

  // ---------------------------------------------------------------- the head (chorus 1's motion)
  private shape(i: number, u: number) {
    const n = this.chunks.length;
    if (i === n - 2) return 0.5 * u + 0.5 * u * u;
    if (i === n - 1) return hermite(u, this.m0, 0.12);
    return u;
  }
  headX(t: number) {
    const C = this.chunks;
    if (t <= C[0]!.t0) return C[0]!.xa;
    for (let i = 0; i < C.length; i++) {
      const c = C[i]!;
      if (t < c.t0) return lerp(C[i - 1]!.xb, c.xa, prog(t, C[i - 1]!.t1, c.t0));
      if (t <= c.t1) return lerp(c.xa, c.xb, this.shape(i, (t - c.t0) / Math.max(1e-3, c.t1 - c.t0)));
    }
    return this.XE;
  }
  clockAt(x: number) { return (x - this.RX0) / this.pps; }
  fmtClock(s: number) {
    const sec = CLK0 + Math.floor(s), cs = Math.min(99, Math.floor((s - Math.floor(s)) * 100));
    return `23:59:${String(Math.min(59, sec)).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }
  mbAt(x: number) { return PRE_MB + clamp((x - this.X0) / (this.XE - this.X0)) * (TOTAL_MB - PRE_MB); }
  beatHit(t: number, hl = 0.07) {
    let p = 0;
    for (const b of this.beats) if (b < this.tLine && b > this.ctx.start + 0.02) p = Math.max(p, pulse(t, b, hl));
    return p;
  }

  // ---------------------------------------------------------------- camera
  /** Low chase from the near side: behind and left of the head, looking up the track at the cards. */
  private chase(t: number): Cam {
    let xs = 0, wsum = 0;
    for (let k = 0; k < 8; k++) { const wk = Math.exp(-k * 0.35); xs += this.headX(t - k * 0.05) * wk; wsum += wk; }
    xs /= wsum;
    const s0 = this.ctx.start;
    // opening: wide and a little higher, the runway running away to the gate; settles into the chase
    const open = 1 - ease.inOutCubic(prog(t, s0 + 0.05, this.tFirst + 0.4));
    // the approach: the camera eases back and swings to keep the gate in view
    const appr = ease.inOutQuad(prog(t, this.tBefore - 0.2, this.tLine));
    const back = lerp(3.1, 3.7, appr) - 0.6 * open;
    const side = lerp(4.8, 5.2, appr) - 3.4 * open;
    const hgt = lerp(0.95, 1.15, appr) - 0.45 * open;
    const ahead = lerp(2.2, 2.8, appr) + 7.5 * open;
    const drift = 0.25 * prog(t, s0, this.tLine); // something always moves
    return {
      pos: { x: xs - back + drift, y: hgt, z: side },
      tgt: { x: xs + ahead, y: 0.55 - 0.05 * open, z: -0.2 },
      fov: 40 - 6 * open, roll: 0.03 * open,
    };
  }

  /** "line": round in front of the gate, close. */
  private snap(t: number): Cam {
    const creep = prog(t, this.tLine + 0.18, this.ctx.end + 0.2, ease.inOutQuad);
    const X = this.XD;
    return {
      // nearly square on to the cards, a touch from the right: the gate turns edge-on into
      // chorus 1's deadline line, "the | line" either side of it
      pos: { x: X + 0.45 - 0.1 * creep, y: 1.4, z: 6.6 - 0.35 * creep },
      tgt: { x: X - 0.1, y: 0.74, z: 0 },
      fov: 38, roll: 0,
    };
  }

  camAt(t: number): Cam {
    let c = this.chase(Math.min(t, this.tLine));
    if (t > this.tLine) {
      const k = ease.outExpo(prog(t, this.tLine, this.tLine + 0.18));
      const s = this.snap(t);
      const m = (a: P3, b: P3): P3 => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
      c = { pos: m(c.pos, s.pos), tgt: m(c.tgt, s.tgt), fov: lerp(c.fov, s.fov, k), roll: lerp(c.roll, 0, k) };
    }
    // hits: every beat a hair, the downbeat and the button harder (a dip and a roll), the stamp
    let punch = 0.018 * this.beatHit(t);
    for (const d of this.downs) punch += 0.04 * pulse(t, d, 0.1);
    punch += 0.06 * pulse(t, this.tSub, 0.09);
    const dip = 0.09 * pulse(t, this.tSub, 0.08);
    const roll = 0.035 * pulse(t, this.tSub, 0.1) * Math.sin((t - this.tSub) * 40 + 1.2);
    return { pos: { ...c.pos, y: c.pos.y - dip }, tgt: c.tgt, fov: c.fov * (1 - punch), roll: c.roll + roll };
  }

  setCam(c: Cam) {
    const cam = this.cam;
    cam.fov = c.fov; cam.updateProjectionMatrix();
    cam.position.set(c.pos.x, c.pos.y, c.pos.z);
    cam.up.set(0, 1, 0);
    cam.lookAt(c.tgt.x, c.tgt.y, c.tgt.z);
    cam.rotateZ(c.roll);
    cam.updateMatrixWorld(true);
    this.vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.inv.copy(this.vp).invert();
  }
  proj(x: number, y: number, z: number): Proj | null {
    const v = this.v4.set(x, y, z, 1).applyMatrix4(this.vp);
    if (v.w <= 0.05) return null;
    const P11 = this.cam.projectionMatrix.elements[5]!;
    return { x: (v.x / v.w * 0.5 + 0.5) * W, y: (0.5 - v.y / v.w * 0.5) * H, s: (0.5 * H * P11) / v.w, w: v.w };
  }

  /** Card i's stand-up angle (0 lying face up on the far half of the runway, 1 upright). */
  upAt(t0: number, t: number) {
    const u = prog(t, t0 - 0.17, t0 - 0.01);
    return u <= 0 ? 0 : u >= 1 ? 1 + 0.04 * Math.sin((t - t0) * 30) * Math.exp(-(t - t0) / 0.08) : ease.outBack(u, 1.4);
  }
  /** World point of a card's local point for stand-up `up`. */
  cardPt(xa: number, up: number, lx: number, ly: number): P3 {
    const th = -Math.PI / 2 * (1 - up);
    return { x: xa + lx, y: ly * Math.cos(th), z: ly * Math.sin(th) };
  }

  // ---------------------------------------------------------------- render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t, s0 = this.ctx.start;
    const cm = this.camAt(t);
    this.setCam(cm);
    const hx = this.headX(t);
    const frozen = t >= this.tLine;

    const rt = this.rt;
    clearRT(renderer, rt, LIN.ink);
    (this.ground.u.invVP!.value as THREE.Matrix4).copy(this.inv);
    this.ground.render(renderer, rt);

    // ---- cards
    const bone = over('bone', 1), signal = V(LIN.signal);
    this.chunks.forEach((k) => {
      const up = this.upAt(k.t0, t);
      k.grp.rotation.x = -Math.PI / 2 * (1 - up);
      const pop = k.t0 > s0 + 0.02 ? 1 + (k === this.chunks[2] ? 0.1 : 0.03) * pulse(t, k.t0, 0.05) : 1;
      k.grp.scale.set(pop, pop, 1);
      const fillW = clamp(hx - k.xa, 0, k.xb - k.xa);
      k.card.uniforms.fillW!.value = fillW > 0 ? fillW : -1;
      k.card.uniforms.colA!.value = t >= k.t1 ? bone : signal;
      k.card.uniforms.colB!.value = over('ink2', 1 - smoothstep(0.2, 0.9, up));
      k.glyph.uniforms.fillW!.value = fillW > 0 ? fillW : -1;
      const vis = t >= k.t0 ? 1 : prog(t, k.t0 - 0.4, k.t0 - 0.1);
      k.glyph.uniforms.colB!.value = over('bone', t >= k.t0 ? 0.62 : 0.3 * vis);
    });
    // glyph fill is in the glyph mesh's local x: the glyphs were translated by PAD_L in geometry, so
    // local x is card x (translate() moved the vertices) — nothing to offset.
    {
      const up = this.upAt(this.last.start, t);
      this.lineGrp.rotation.x = -Math.PI / 2 * (1 - up);
      const e = t - this.last.start;
      const sl = e >= 0 ? 1 + 0.25 * Math.pow(0.5, e / 0.05) : 1;
      this.lineGrp.scale.set(sl, sl, 1);
      const vis = prog(t, this.last.start - 0.4, this.last.start - 0.1);
      this.lineMat.uniforms.colB!.value = e >= 0 ? signal : over('bone', 0.3 * vis);
    }
    renderer.setRenderTarget(rt);
    renderer.render(this.world, this.cam);
    // the floor's depth goes in after the cards (they stand on it), before the lines and sparks
    renderer.render(this.floorDepth, this.cam);

    // ---- hairlines
    const lb = this.lines; lb.clear();
    const gl = this.glow; gl.clear();
    this.drawWorld(lb, gl, t, cm, hx);
    lb.render(renderer, rt, this.cam);
    gl.render(renderer, rt, this.cam);

    // ---- the spark: in the cards' plane; frozen on "line" (the sparks hang in the air)
    const sp = this.spark; sp.clear();
    const tf = frozen ? this.tLine + 0.012 : t;
    const fade = 1 - prog(t, this.tLine + 0.35, this.ctx.end + 0.1);
    const beats = this.beats;
    const burst = (tb: number) => {
      let p = 0;
      for (const b of beats) if (b < this.tLine && b > s0 + 0.02) p = Math.max(p, pulse(tb, b, 0.035));
      return 110 + 520 * p;
    };
    sparkParticles(sp, tf, (tb) => ({ x: this.headX(tb) / K, y: -0.02 / K }), { rate: burst, rateMax: 630, speed: 300, life: 0.4, gravity: 420, intensity: 1.05 * fade, seed: 2159, width: 1.8 });
    const hp = this.proj(hx, 0.02, 0.1);
    const sc = hp ? clamp(hp.s / 190, 0.7, 1.6) : 1;
    sparkHead(sp, hx / K, -0.02 / K, tf, 1.25 * sc, 1.25 * (1 + 0.6 * pulse(t, this.tLine, 0.08)));
    sp.render(renderer, rt, this.cam);
    comp.draw(renderer, rt.texture, out, { mode: 'replace' });

    // ---- flat to camera: labels, flag, dimension, tag, stamp; then the chrome
    this.L.clear();
    const c = this.L.ctx;
    c.save();
    c.beginPath(); c.rect(0, VP_Y0, W, VP_Y1 - VP_Y0); c.clip();
    this.drawRulerLabels(c, t);
    this.drawChunkLabels(c, t);
    this.drawDimensionLabel(c, t, hx);
    this.drawGateTag(c, t);
    this.drawFlag(c, t, hx);
    this.drawEnd(c, t);
    c.restore();
    const dt = 0.03;
    drawChrome(c, {
      t, header: 'ASSIGNMENT 4 — UPLOAD', file: 'essay_v7_final_FINAL.pdf',
      mb: this.mbAt(hx), total: TOTAL_MB, frozen,
      rate: (this.mbAt(this.headX(t + dt)) - this.mbAt(this.headX(t - dt))) / (2 * dt),
      tSub: this.tSub, tLine: this.tLine,
    });
    comp.draw(renderer, this.L.upload(), out);

    // ---- post
    let shake = 7 * pulse(t, this.tSub, 0.06) + 9 * pulse(t, this.tStamp, 0.06) + 2.5 * this.beatHit(t, 0.05);
    for (const d of this.downs) if (d < this.tLine) shake += 4 * pulse(t, d, 0.06);
    return {
      hud: 0, bloom: 0.75, bloomThreshold: 1.0, bloomKnee: 0.1, bloomRadius: 0.65, halation: 0.14,
      vignette: 0.44, grain: 0.055,
      ca: 1.0 + 1.6 * pulse(t, this.tLine, 0.06) + 0.8 * pulse(t, this.tSub, 0.06),
      flash: 0.02 * pulse(t, this.tLine, 0.025),
      shake: [Math.sin(t * 97) * shake, Math.cos(t * 71) * shake * 0.7],
    };
  }

  // ---------------------------------------------------------------- 3D hairlines
  fog(d: number) { return Math.exp(-Math.max(0, d - FOG.start) / FOG.len) * smoothstep(0.3, 1.0, d); }

  drawWorld(lb: LineBatch, gl: LineBatch, t: number, cm: Cam, hx: number) {
    const cp = cm.pos, s0 = this.ctx.start;
    const seg = (b: LineBatch, a: P3, e: P3, w: number, col: RGB, al: number) => {
      const d = Math.hypot((a.x + e.x) / 2 - cp.x, (a.y + e.y) / 2 - cp.y, (a.z + e.z) / 2 - cp.z);
      const fa = this.fog(d) * al;
      if (fa < 0.004) return;
      const wd = clamp(0.8 + 3.0 / d, 0.9, 2.6) * w;
      b.seg(a.x, a.y, a.z, e.x, e.y, e.z, wd, col[0], col[1], col[2], fa);
    };
    const S = (a: P3, e: P3, w: number, col: RGB, al: number) => seg(lb, a, e, w, col, al);
    const P = (x: number, y: number, z: number): P3 => ({ x, y, z });
    const bone = LIN.bone, ash = LIN.ash, graph = LIN.graphite, sig = LIN.signal;
    const mul = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

    // ---- the runway: the ruler down its middle, edges, 50 ms graduations toward the camera
    const late = 0.5;
    const reveal = lerp(this.RX0, this.XD + (late + 0.1) * this.pps, ease.outExpo(prog(t, s0 - 0.03, s0 + 0.45)));
    const y0 = 0.002;
    S(P(this.RX0, y0, 0), P(Math.min(this.XD, reveal), y0, 0), 1.3, ash, 0.8);
    for (const z of [-RW, RW]) {
      // runway edges, dashed past the gate
      const xa = this.RX0 - 1.5, xb = Math.min(this.XD, reveal);
      S(P(xa, y0, z), P(xb, y0, z), 1.0, graph, 0.9);
      for (let x = this.XD; x < Math.min(reveal, this.XD + 4); x += 0.3) S(P(x, y0, z), P(x + 0.16, y0, z), 1.0, graph, 0.7);
    }
    const n = (60 - CLK0) * 20;
    for (let i = 0; i <= n + late * 20; i++) {
      const x = this.RX0 + (i / 20) * this.pps;
      if (x > reveal) break;
      const past = i > n;
      const major = i % 20 === 0, half = i % 10 === 0, tenth = i % 2 === 0;
      const len = major ? 0.5 : half ? 0.3 : tenth ? 0.17 : 0.08;
      const col = past ? graph : major ? bone : ash;
      S(P(x, y0, 0), P(x, y0, len), major ? 1.3 : 1.0, col, past ? 0.7 : major ? 0.85 : tenth ? 0.6 : 0.4);
      // major seconds: a faint line across the whole runway, like a threshold marking
      if (major && !past) S(P(x, y0, -RW), P(x, y0, RW), 0.9, graph, 0.5);
    }
    // past the deadline: dashed baseline
    for (let x = this.XD; x < Math.min(reveal, this.XD + late * this.pps); x += 0.12) S(P(x, y0, 0), P(x + 0.06, y0, 0), 1.1, graph, 0.8);
    // the drag line behind the head (paint), and its hot run (the spark's: it may glow)
    if (hx > this.X0 + 1e-3) {
      S(P(this.X0, 0.004, 0), P(hx, 0.004, 0), 2.6, mul(sig, 0.8), 1);
      const m = 10;
      for (let i = 0; i < m; i++) {
        const xa = hx - (i + 1) * 0.07, xb = hx - i * 0.07;
        if (xb <= this.X0) break;
        const k = Math.pow(1 - i / m, 2);
        seg(gl, P(Math.max(this.X0, xa), 0.006, 0), P(xb, 0.006, 0), 3, [sig[0] * 2.2 * k + 0.4 * k, sig[1] * 2.2 * k + 0.25 * k, sig[2] * 2 * k], 1);
      }
    }

    // ---- card outlines: dashed while queued (lying), solid once live; a hot rim snaps shut on commit
    this.chunks.forEach((k, i) => {
      const build = ease.outExpo(prog(t, s0 - 0.02 + 0.03 * i, s0 + 0.03 * i + 0.3));
      if (build <= 0) return;
      const up = this.upAt(k.t0, t);
      const w = (k.xb - k.xa) * build;
      const pop = k.t0 > s0 + 0.02 ? 1 + (i === 2 ? 0.1 : 0.03) * pulse(t, k.t0, 0.05) : 1;
      const q = (lx: number, ly: number) => this.cardPt(k.xa, up, lx * pop, ly * pop);
      // offset a hair off the card toward its face, so the edge wins the depth test
      const off = (p: P3): P3 => {
        const th = -Math.PI / 2 * (1 - up);
        return { x: p.x, y: p.y - 0.006 * Math.sin(th), z: p.z + 0.006 * Math.cos(th) };
      };
      const corners = [q(0, 0), q(w, 0), q(w, BH), q(0, BH)].map(off);
      const live = t >= k.t0 - 0.17;
      for (let e = 0; e < 4; e++) {
        const a = corners[e]!, b = corners[(e + 1) % 4]!;
        if (!live) {
          // dashed
          const L = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), nd = Math.max(1, Math.floor(L / 0.09));
          for (let j = 0; j < nd; j += 2) {
            const u0 = j / nd, u1 = Math.min(1, (j + 1) / nd);
            S(P(lerp(a.x, b.x, u0), lerp(a.y, b.y, u0), lerp(a.z, b.z, u0)), P(lerp(a.x, b.x, u1), lerp(a.y, b.y, u1), lerp(a.z, b.z, u1)), 1.0, ash, 0.55);
          }
        } else S(a, b, 1.2, ash, 0.75);
        if (!live && e === 0) {
          // a queued tile's far edge is its hinge: solid, so the row of tiles reads on the runway
          S(a, b, 1.0, ash, 0.35);
        }
      }
      if (t >= k.t1) {
        const st = ease.outCubic(prog(t, k.t1, k.t1 + 0.14));
        if (st < 1) {
          const g = 0.07 * (1 - st);
          const r = [q(-g, -g), q(w + g, -g), q(w + g, BH + g), q(-g, BH + g)].map(off);
          for (let e = 0; e < 4; e++) S(r[e]!, r[(e + 1) % 4]!, 2.2, mul(LIN.ember, 0.95), 1 - st);
        }
      }
    });

    // ---- the gate: an orange frame standing across the track at the end of 23:59:59
    const grow = ease.outExpo(prog(t, s0 - 0.03, s0 + 0.3));
    if (grow > 0) {
      const X = this.XD, hit = pulse(t, this.tLine, 0.07);
      const h = GH * grow;
      const paint = mul(sig, 0.82);
      for (const dx of [-GT, GT]) {
        const x = X + dx;
        const fr = [P(x, 0, -GZ), P(x, h, -GZ), P(x, h, GZ), P(x, 0, GZ)];
        for (let e = 0; e < 3; e++) S(fr[e]!, fr[e + 1]!, 2.4, paint, 1);
        // inner edge of the frame
        const ins = 0.09;
        const fi = [P(x, 0, -GZ + ins), P(x, h - ins, -GZ + ins), P(x, h - ins, GZ - ins), P(x, 0, GZ - ins)];
        for (let e = 0; e < 3; e++) S(fi[e]!, fi[e + 1]!, 1.4, paint, 0.9);
      }
      // depth of the frame at its corners
      for (const [y, z] of [[0, -GZ], [h, -GZ], [h, GZ], [0, GZ]] as const) S(P(X - GT, y, z), P(X + GT, y, z), 1.6, paint, 1);
      // the gate plane: faint hatching across the opening; on "line" a sheet of light runs up it
      const sheet = t >= this.tLine ? ease.outCubic(prog(t, this.tLine, this.tLine + 0.22)) : -1;
      for (let j = 1; j < 24; j++) {
        const yy = (j / 24) * (h - 0.09);
        const near = sheet >= 0 ? Math.exp(-Math.pow((yy / GH - sheet) / 0.1, 2)) : 0;
        const a = (j % 6 === 0 ? 0.07 : 0) + 0.7 * near * (1 - prog(t, this.tLine + 0.2, this.tLine + 0.45));
        if (a < 0.01) continue;
        S(P(X, yy, -GZ + 0.09), P(X, yy, GZ - 0.09), 0.9, paint, a);
      }
      // flare (HDR, blooms)
      if (hit > 0.01) {
        const hc: RGB = [sig[0] * 3 * hit + 0.6 * hit, sig[1] * 3 * hit + 0.3 * hit, sig[2] * 3 * hit];
        const fr = [P(X, 0, -GZ), P(X, GH, -GZ), P(X, GH, GZ), P(X, 0, GZ)];
        for (let e = 0; e < 3; e++) seg(gl, fr[e]!, fr[e + 1]!, 3.5, hc, 1);
      }
    }

    // ---- the dimension line: head → gate, up over the cards
    const da = prog(t, s0 + 0.1, s0 + 0.4);
    if (da > 0) {
      const frozen = t >= this.tLine;
      const left = frozen ? SPARE : Math.max(0, 60 - CLK0 - this.clockAt(hx));
      const col = left < 1 ? mul(sig, 0.85) : ash;
      const y = DIM_Y;
      S(P(hx, y - 0.12, 0), P(hx, y + 0.12, 0), 1.2, col, da);
      S(P(this.XD, y - 0.12, 0), P(this.XD, y + 0.12, 0), 1.2, col, da);
      const arrow = (x: number, dir: number) => {
        S(P(x, y, 0), P(x - dir * 0.12, y + 0.045, 0), 1.2, col, da);
        S(P(x, y, 0), P(x - dir * 0.12, y - 0.045, 0), 1.2, col, da);
      };
      if (this.XD - hx > 0.35) {
        S(P(hx, y, 0), P(this.XD, y, 0), 1.1, col, da);
        arrow(hx, -1); arrow(this.XD, 1);
      } else {
        S(P(hx - 0.3, y, 0), P(hx, y, 0), 1.1, col, da);
        S(P(this.XD, y, 0), P(this.XD + 0.3, y, 0), 1.1, col, da);
        arrow(hx, 1); arrow(this.XD, -1);
      }
    }
  }

  // ---------------------------------------------------------------- flat to camera
  private label(c: CanvasRenderingContext2D, p: Proj | null, text: string, size: number, col: string, align: CanvasTextAlign = 'left', dx = 0, dy = 0) {
    if (!p) return;
    c.font = font(F.mono(500), size);
    c.textAlign = align;
    c.fillStyle = col;
    c.fillText(text, p.x + dx, p.y + dy);
  }
  private fogA(p: Proj | null) { return p ? this.fog(p.w) : 0; }

  drawRulerLabels(c: CanvasRenderingContext2D, t: number) {
    const s0 = this.ctx.start;
    const reveal = ease.outExpo(prog(t, s0 - 0.03, s0 + 0.45));
    c.textBaseline = 'alphabetic';
    for (let i = 0; i < (60 - CLK0) * 2; i++) {
      const x = this.RX0 + (i / 2) * this.pps;
      if (x > lerp(this.RX0, this.XD, reveal)) break;
      const p = this.proj(x, 0, 0.62);
      if (!p || p.w < 0.6) continue;
      const a = this.fogA(p);
      if (a < 0.03) continue;
      const major = i % 2 === 0;
      const fs = clamp(p.s * (major ? 0.15 : 0.11), 10, major ? 30 : 20);
      const s = CLK0 + i / 2;
      if (major) this.label(c, p, i === 0 ? `23:59:${CLK0}` : `:${s}`, fs, rgba('ash', 0.9 * a), 'left', 4, fs * 0.9);
      else this.label(c, p, '.5', fs, rgba('graphite', a), 'left', 3, fs * 0.9);
    }
  }

  drawChunkLabels(c: CanvasRenderingContext2D, t: number) {
    const s0 = this.ctx.start;
    this.chunks.forEach((k, i) => {
      const up = this.upAt(k.t0, t);
      // labels belong to standing cards (a lying card's would float over the ones in front)
      const build = prog(t, s0 + 0.03 * i + 0.1, s0 + 0.03 * i + 0.3) * smoothstep(0.6, 0.95, up);
      if (build <= 0) return;
      const q = this.cardPt(k.xa, up, 0, BH + 0.12);
      const p = this.proj(q.x, q.y, q.z);
      if (!p) return;
      const a = this.fogA(p) * build;
      if (a < 0.03) return;
      const fs = clamp(p.s * 0.1, 10, 22);
      const lab = String(i + 1).padStart(2, '0'), mb = `${k.mb.toFixed(1)} MB`;
      c.textBaseline = 'alphabetic';
      this.label(c, p, lab, fs, rgba('ash', 0.85 * a));
      const lw = measure(lab, F.mono(500), fs) + fs * 0.7;
      this.label(c, p, mb, fs, rgba('graphite', a), 'left', lw);
      if (t >= k.t1) {
        const ck = prog(t, k.t1, k.t1 + 0.08);
        const cx = p.x + lw + measure(mb, F.mono(500), fs) + fs * 1.2, cy = p.y - fs * 0.4;
        const u = fs / 17;
        c.strokeStyle = rgba('bone', 0.9 * a); c.lineWidth = 2.2 * u; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(cx - 7 * u, cy); c.lineTo(cx - 2 * u, cy + 5 * u * Math.min(1, ck * 2));
        if (ck > 0.5) c.lineTo(cx - 2 * u + 11 * u * (ck - 0.5) * 2, cy + 5 * u - 12 * u * (ck - 0.5) * 2);
        c.stroke(); c.lineCap = 'butt';
      }
    });
  }

  drawDimensionLabel(c: CanvasRenderingContext2D, t: number, hx: number) {
    const s0 = this.ctx.start;
    const da = prog(t, s0 + 0.1, s0 + 0.4);
    if (da <= 0) return;
    const frozen = t >= this.tLine;
    const left = frozen ? SPARE : Math.max(0, 60 - CLK0 - this.clockAt(hx));
    const lab = frozen ? `${SPARE.toFixed(2)} s` : `${left.toFixed(2)} s`;
    const col = left < 1 ? rgba('signal', da) : rgba('ash', 0.9 * da);
    const tight = this.XD - hx <= 0.35;
    const p = tight ? this.proj(hx - 0.36, DIM_Y, 0) : this.proj((hx + this.XD) / 2, DIM_Y + 0.07, 0);
    if (!p) return;
    const fs = clamp(p.s * 0.11, 14, 24);
    c.textBaseline = 'alphabetic';
    // the figure sits in a gap it cuts in whatever passes behind it (the gate's posts)
    const w = measure(lab, F.mono(500), fs);
    const x0 = tight ? p.x - 8 - w : p.x - w / 2, y0 = tight ? p.y + fs * 0.35 : p.y;
    c.fillStyle = rgba('ink', 0.92 * da);
    c.fillRect(x0 - 8, y0 - fs * 0.85, w + 16, fs * 1.15);
    if (tight) this.label(c, p, lab, fs, col, 'right', -8, fs * 0.35);
    else this.label(c, p, lab, fs, col, 'center');
  }

  drawGateTag(c: CanvasRenderingContext2D, t: number) {
    const s0 = this.ctx.start;
    const a = prog(t, s0 + 0.2, s0 + 0.45);
    if (a <= 0) return;
    const p = this.proj(this.XD + GT, GH, GZ);
    if (!p) return;
    // clear of the whole frame's top: right of its rightmost top corner
    let mx = p.x, my = p.y;
    for (const [dx, z] of [[-GT, GZ], [GT, -GZ], [-GT, -GZ]] as const) {
      const q = this.proj(this.XD + dx, GH, z);
      if (q) { mx = Math.max(mx, q.x); my = Math.min(my, q.y); }
    }
    const fa = a * Math.max(0.35, this.fogA(p));
    const fs = clamp(p.s * 0.13, 14, 26);
    c.textBaseline = 'alphabetic';
    // beside the near post's top: outside the gate while there is room, else tucked inside under the lintel
    const tw = measure('closes 23:59:59', F.mono(400), fs);
    const outside = mx + fs * 0.6 + tw < W - 96;
    const x = outside ? mx + fs * 0.6 : p.x - fs * 0.6;
    const y = outside ? Math.max(my, p.y - fs * 0.2) + fs * 0.9 : p.y + fs * 1.9;
    c.textAlign = outside ? 'left' : 'right';
    c.font = font(F.mono(600), fs);
    c.fillStyle = rgba('signal', fa);
    c.fillText('DEADLINE', x, y);
    c.font = font(F.mono(400), fs); c.fillStyle = rgba('ash', fa);
    c.fillText('closes 23:59:59', x, y + fs * 1.3);
  }

  /** The playhead flag under the head: its clock, frozen on "line". */
  drawFlag(c: CanvasRenderingContext2D, t: number, hx: number) {
    const p = this.proj(hx, 0, 0.02);
    if (!p) return;
    const frozen = t >= this.tLine;
    const txt = frozen ? '23:59:59.99' : this.fmtClock(this.clockAt(hx));
    const drop = clamp(p.s * 0.3, 50, 80);
    const fs = 22;
    c.save();
    c.fillStyle = rgba('signal', 0.9);
    c.fillRect(p.x - 0.75, p.y, 1.5, drop);
    c.font = font(F.mono(600), fs);
    const tw = measure(txt, F.mono(600), fs);
    const kp = this.beatHit(t, 0.06);
    c.fillStyle = kp > 0.5 ? rgba('ember', 1) : rgba('signal', 1);
    c.fillRect(p.x - tw - 20, p.y + drop, tw + 20, 36);
    c.fillStyle = rgba('ink', 1);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText(txt, p.x - tw - 10, p.y + drop + 26);
    // footnote, typed, under the frozen clock
    const nch = Math.floor(prog(t, this.tFoot, this.tFoot + 0.14) * 15);
    if (nch > 0) {
      c.font = font(F.mono(400), 20); c.fillStyle = rgba('ash', 1); c.textAlign = 'right';
      c.fillText('10 ms to spare'.slice(0, nch), p.x - 10, p.y + drop + 70);
    }
    c.restore();
  }

  drawEnd(c: CanvasRenderingContext2D, t: number) {
    const e = t - this.tStamp;
    if (e < 0) return;
    const p = this.proj(this.XD + 1.05, 0, 1.05);
    if (!p) return;
    drawStamp(c, p.x + 120, p.y + 30, e, 'SUBMITTED', '23:59:59.99');
  }
}
