// "Eleven fifty-nine, submit before the line". Back to ink on the beat.
// An upload strip across the frame, graduated like a ruler from 23:59:55 to the orange deadline
// (submissions close at the end of 23:59:59). The spark is the upload progress head: behind it
// the lyric is laid on the strip as file chunks, one block per word, each filled as it is sung
// (orange while it uploads, committed to bone). A byte counter ticks in the portal chrome.
//  "submit": the portal's hairline SUBMIT button is pressed with a slam.
//  "before the": the head lunges, then brakes hard, creeping at the deadline.
//  "line": it touches the deadline exactly on the word; everything freezes (sparks hang in the
//   air), flash, the camera snaps in; SUBMITTED 23:59:59.97 is stamped on the downbeat,
//   footnote: 30 ms to spare.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { rgba } from '../../engine/palette';
import { F, font, measure } from '../../engine/type';
import { Lyrics, norm, type Line, type Word } from '../../engine/lyrics';
import { clamp, ease, lerp, prog, pulse } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';

// ---------------------------------------------------------------- world layout (px at zoom 1)
const BAND_Y = 452; // top of the chunk band
const BAND_H = 156;
const TRACK_Y = BAND_Y + BAND_H; // the ruler / progress track (the head rides it)
const SIZE = 118; // lyric size
const X0 = 150; // first chunk
const CLK0 = 55; // the ruler starts at 23:59:55 (where the clock plate's seconds readout left off)
const CLK_HEAD = 56; // the head's clock time when the plate opens
const GAP = 10; // between chunks
const SPARE = 0.03; // seconds to spare
const TOTAL_MB = 38.0, PRE_MB = 4.2;
const FILE = 'essay_v7_final_FINAL.pdf';
const VP_Y0 = 180, VP_Y1 = 901; // the portal's viewport (screen), between the chrome's rules

type Cam = { x: number; y: number; z: number };

interface Chunk {
  w: Word;
  text: string;
  fam: string;
  xa: number; xb: number; // block extent
  tx: number; // text origin x
  t0: number; t1: number; // head enters / leaves (commit)
  mb: number;
}

/** Cubic Hermite on [0,1] from 0 to 1 with end slopes m0, m1 (monotone for 0 <= m <= 3). */
const hermite = (u: number, m0: number, m1: number) => {
  const u2 = u * u, u3 = u2 * u;
  return (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) + (u3 - u2) * m1;
};

const BG = /* glsl */ `
uniform vec3 cam; // world x, y, zoom
void main() {
  vec2 p = vec2(FRAG_PX.x, ${H.toFixed(1)} - FRAG_PX.y);
  vec2 w = (p - vec2(${(W / 2).toFixed(1)}, ${(H / 2).toFixed(1)})) / cam.z + cam.xy;
  // a faint dot grid on the sheet (every 48 world px), crisp at any zoom
  vec2 q = (fract(w / 48.0 + 0.5) - 0.5) * 48.0 * cam.z;
  float d = length(q);
  float dot = 1.0 - smoothstep(0.9 * cam.z, 0.9 * cam.z + 1.0, d);
  vec3 col = C_INK + (C_GRAPHITE - C_INK) * 0.16 * dot;
  fragColor = vec4(col, 1.0);
}`;

export default class Submit extends Scene {
  bg = new FSPass(BG, { cam: { value: new THREE.Vector3(W / 2, H / 2, 1) } });
  layer = new Layer2D();
  glow = new LineBatch(4000, { screen2D: false });
  glowCam = new THREE.OrthographicCamera(0, W, 0, H, -1, 1);
  line!: Line;
  chunks: Chunk[] = [];
  last!: Word; // "line"
  lineFam = F.archivo(125, 900);
  lineSize = SIZE * 1.12;
  XE = 0; // end of the last chunk = where the head stops
  XD = 0; // the deadline
  RX0 = 0; // ruler start (23:59:55)
  pps = 0; // ruler px per clock second
  tSub = 0; tLine = 0; tStamp = 0; tDown = 0; tFoot = 0;
  kicks: number[] = [];
  tagIn = 1; // set per frame from the camera: the deadline tag is in view
  m0 = 1; // entry slope of the braking chunk

  override init() {
    const { lyrics, audio } = this.ctx;
    const l = lyrics.get('submit before the line');
    this.line = l;
    const ws = l.words;
    this.last = ws[ws.length - 1]!;
    this.tLine = this.last.start;
    this.tSub = (ws.find((w) => norm(w.w) === 'submit') ?? ws[2]!).start;
    // chunks: every word but the last; the type condenses as the deadline closes in
    const head = ws.slice(0, -1);
    const widths = head.map((_, i) => (i < head.length - 2 ? 100 : i === head.length - 2 ? 87.5 : 75));
    let x = X0;
    const padL = SIZE * 0.2, padR = SIZE * 0.3;
    this.chunks = head.map((w, i) => {
      const fam = F.archivo(widths[i]!, 900);
      const tw = measure(w.w, fam, SIZE);
      const c: Chunk = { w, text: w.w, fam, xa: x, xb: x + padL + tw + padR, tx: x + padL, t0: w.start, t1: i === head.length - 1 ? this.tLine : w.end, mb: 0 };
      x = c.xb + GAP;
      return c;
    });
    this.XE = this.chunks[this.chunks.length - 1]!.xb;
    // the head runs from 23:59:56 (first chunk) to 23:59:59.97 (end of the last one), SPARE s short
    // of the deadline at the end of 23:59:59; the ruler starts a second before the head
    this.pps = (this.XE - X0) / (60 - SPARE - CLK_HEAD);
    this.RX0 = X0 - (CLK_HEAD - CLK0) * this.pps;
    this.XD = this.XE + SPARE * this.pps;
    const span = this.XE - X0;
    for (const c of this.chunks) c.mb = ((c.xb - c.xa) / span) * (TOTAL_MB - PRE_MB);
    // braking chunk: enter at the speed the previous chunk leaves with
    const n = this.chunks.length;
    const pb = this.chunks[n - 2]!, cb = this.chunks[n - 1]!;
    const vOut = 1.5 * (pb.xb - pb.xa) / (pb.t1 - pb.t0);
    this.m0 = clamp((vOut * (cb.t1 - cb.t0)) / (cb.xb - cb.xa), 0.5, 3);
    // beat grid
    const beatAfter = (t: number) => audio.timeOfBeat(Math.ceil(audio.beatAt(t) - 1e-3));
    this.tDown = audio.downbeats.find((d) => d > this.ctx.start + 0.1) ?? beatAfter(this.ctx.start + 0.5);
    this.tStamp = audio.downbeats.find((d) => d >= this.tLine - 0.02) ?? beatAfter(this.tLine);
    this.tFoot = this.tStamp + 0.06;
    this.kicks = audio.events('kick', this.ctx.start - 0.3, this.ctx.end).map((e) => e[0]);
  }

  // ---------------------------------------------------------------- the head
  private shape(i: number, u: number) {
    const n = this.chunks.length;
    if (i === n - 2) return 0.5 * u + 0.5 * u * u; // "before": gathering speed
    if (i === n - 1) return hermite(u, this.m0, 0.12); // "the": lunge, then brake hard
    return u;
  }

  /** Head x (world) at song time t. */
  headX(t: number) {
    const C = this.chunks;
    if (t <= C[0]!.t0) return C[0]!.xa;
    for (let i = 0; i < C.length; i++) {
      const c = C[i]!;
      if (t < c.t0) {
        const p = C[i - 1]!;
        return lerp(p.xb, c.xa, prog(t, p.t1, c.t0));
      }
      if (t <= c.t1) return lerp(c.xa, c.xb, this.shape(i, (t - c.t0) / Math.max(1e-3, c.t1 - c.t0)));
    }
    return this.XE;
  }

  /** Clock seconds past 23:59:55 at world x. */
  clockAt(x: number) { return (x - this.RX0) / this.pps; }
  fmtClock(s: number) {
    const sec = CLK0 + Math.floor(s), cs = Math.min(99, Math.floor((s - Math.floor(s)) * 100));
    return `23:59:${String(Math.min(59, sec)).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }
  mbAt(x: number) { return PRE_MB + clamp((x - X0) / (this.XE - X0)) * (TOTAL_MB - PRE_MB); }

  // ---------------------------------------------------------------- camera
  /** Following the head: slow push, the head held left of centre (the word being sung ahead of it). */
  private camFollow(t: number): Cam {
    const s0 = this.ctx.start;
    const z = 1.08 + 0.1 * prog(t, s0, this.tLine, ease.inOutQuad);
    // smoothed head (a short causal average: the camera lags, then catches up)
    let xs = 0, ws = 0;
    for (let k = 0; k < 8; k++) {
      const tk = t - k * 0.045, wk = Math.exp(-k * 0.35);
      xs += this.headX(tk) * wk; ws += wk;
    }
    xs /= ws;
    const want = xs - (0.42 * W - W / 2) / z;
    const lo = this.RX0 - 60 + (W / 2) / z; // the ruler never starts further in than this
    const hi = this.XD + 360 - (W / 2 - 96) / z; // room for "line" at the right
    const soft = 120;
    const a = lo + soft * Math.log1p(Math.exp((want - lo) / soft)); // smooth max(want, lo)
    const x = hi < lo ? (lo + hi) / 2 : Math.min(a, hi);
    return { x, y: H / 2 + 12, z };
  }

  /** The snap on "line": the contact point, close. */
  private camSnap(t: number): Cam {
    const z = 1.42 * (1 + 0.035 * prog(t, this.tLine + 0.16, this.ctx.end + 0.2, ease.inOutQuad));
    // the deadline at 0.6 W: "before the" to its left, "line" and the stamp to its right,
    // everything from the deadline tag to the footnote inside the portal's viewport
    return { x: this.XD - (0.6 * W - W / 2) / z, y: (BAND_Y - 132 + TRACK_Y + 160) / 2, z };
  }

  camAt(t: number): Cam {
    let c = this.camFollow(Math.min(t, this.tLine));
    if (t > this.tLine) {
      const k = ease.outExpo(prog(t, this.tLine, this.tLine + 0.16));
      const s = this.camSnap(t);
      c = { x: lerp(c.x, s.x, k), y: lerp(c.y, s.y, k), z: Math.exp(lerp(Math.log(c.z), Math.log(s.z), k)) };
    }
    // hits: every kick a hair, the downbeat and the button harder, the stamp
    let p = 0;
    for (const kt of this.kicks) if (kt < this.tLine) p = Math.max(p, pulse(t, kt, 0.07));
    const punch = 1 + 0.012 * p + 0.045 * pulse(t, this.tDown, 0.1) + 0.05 * pulse(t, this.tSub, 0.09) + 0.04 * pulse(t, this.tStamp, 0.08);
    return { x: c.x, y: c.y, z: c.z * punch };
  }

  // ---------------------------------------------------------------- render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer } = this.ctx;
    const t = f.t;
    const cam = this.camAt(t);
    const u = this.bg.u;
    (u.cam!.value as THREE.Vector3).set(cam.x, cam.y, cam.z);
    this.bg.render(renderer, out);

    const L = this.layer; L.clear();
    const c = L.ctx;
    const z = cam.z, px = 1 / z;
    // the world lives in the portal's viewport, between the chrome's rules
    c.save();
    c.beginPath(); c.rect(0, VP_Y0, W, VP_Y1 - VP_Y0); c.clip();
    c.setTransform(z, 0, 0, z, W / 2 - cam.x * z, H / 2 - cam.y * z);
    const hx = this.headX(t);
    this.tagIn = 1 - prog((this.XD - cam.x) * z + W / 2, W - 300, W - 150);
    this.drawRuler(c, t, px, hx);
    this.drawChunks(c, t, px, hx);
    this.drawDeadline(c, t, px);
    this.drawFlag(c, t, px, hx);
    this.drawStamp(c, t, px);
    c.restore();
    c.setTransform(1, 0, 0, 1, 0, 0);
    this.drawDimension(c, t, cam, hx);
    this.drawChrome(c, t, hx);
    this.ctx.comp.draw(renderer, L.upload(), out);

    // ---- the spark: world space, frozen on contact (the sparks hang in the air)
    const g = this.glow; g.clear();
    const oc = this.glowCam;
    oc.left = cam.x - W / 2 / z; oc.right = cam.x + W / 2 / z;
    oc.top = cam.y - H / 2 / z; oc.bottom = cam.y + H / 2 / z;
    oc.updateProjectionMatrix();
    const frozen = t >= this.tLine;
    const tf = frozen ? this.tLine + 0.012 : t;
    const fade = 1 - prog(t, this.tLine + 0.35, this.ctx.end + 0.1);
    // the head sputters harder on every kick
    const burst = (tb: number) => {
      let p = 0;
      for (const kt of this.kicks) if (kt < this.tLine) p = Math.max(p, pulse(tb, kt, 0.035));
      return 110 + 520 * p;
    };
    sparkParticles(g, tf, (tb) => ({ x: this.headX(tb), y: TRACK_Y }), { rate: burst, rateMax: 630, speed: 300, life: 0.4, intensity: 1.05 * fade, seed: 1159, width: 1.8 });
    const hot = 1 + 0.6 * pulse(t, this.tLine, 0.08);
    sparkHead(g, hx, TRACK_Y, tf, 1.25 * Math.sqrt(z), 1.25 * hot);
    g.render(renderer, out, oc);

    // ---- post
    const shake = 7 * pulse(t, this.tSub, 0.06) + 9 * pulse(t, this.tStamp, 0.06) + 4 * pulse(t, this.tDown, 0.06);
    return {
      hud: 0, bloom: 0.75, bloomThreshold: 0.95, bloomKnee: 0.25, vignette: 0.42, grain: 0.055,
      ca: 1.1 + 1.6 * pulse(t, this.tLine, 0.06) + 0.8 * pulse(t, this.tSub, 0.06),
      flash: 0.05 * pulse(t, this.tLine, 0.025),
      shake: [Math.sin(t * 97) * shake, Math.cos(t * 71) * shake * 0.7],
    };
  }

  // ---------------------------------------------------------------- drawing (world)
  private drawRuler(c: CanvasRenderingContext2D, t: number, px: number, hx: number) {
    const s0 = this.ctx.start;
    const y = TRACK_Y;
    // the ruler unrolls from the left on the cut
    const late = 0.5; // clock seconds drawn past the deadline
    const reveal = lerp(this.RX0, this.XD + (late + 0.1) * this.pps, ease.outExpo(prog(t, s0 - 0.03, s0 + 0.22)));
    c.save();
    c.fillStyle = rgba('ash', 0.75);
    c.fillRect(this.RX0, y - 0.75 * px, Math.min(this.XD, reveal) - this.RX0, 1.5 * px);
    c.textBaseline = 'alphabetic';
    // ticks every 50 ms: tenths, halves and whole seconds taller
    const n = (60 - CLK0) * 20;
    for (let i = 0; i <= n + late * 20; i++) {
      const x = this.RX0 + (i / 20) * this.pps;
      if (x > reveal) break;
      const past = i > n;
      const major = i % 20 === 0, half = i % 10 === 0, tenth = i % 2 === 0;
      const len = major ? 30 : half ? 18 : tenth ? 10 : 5;
      c.fillStyle = past ? rgba('graphite', 0.8) : rgba(major ? 'bone' : 'ash', major ? 0.8 : tenth ? 0.55 : 0.35);
      c.fillRect(x - 0.75 * px, y, 1.5 * px, len);
      if (i < n && half) {
        c.textAlign = 'left';
        if (major) {
          const s = CLK0 + i / 20;
          c.font = font(F.mono(i === 0 ? 500 : 400), 20);
          c.fillStyle = rgba('ash', 0.9);
          c.fillText(i === 0 ? `23:59:${CLK0}` : `:${s}`, x + 6, y + 50);
        } else {
          c.font = font(F.mono(400), 16);
          c.fillStyle = rgba('graphite', 1);
          c.fillText('.5', x + 5, y + 40);
        }
      }
    }
    // past the deadline: dashed, late
    if (reveal > this.XD) {
      c.strokeStyle = rgba('graphite', 0.9); c.lineWidth = 1.5 * px;
      c.setLineDash([8, 7]);
      c.beginPath(); c.moveTo(this.XD, y); c.lineTo(Math.min(reveal, this.XD + late * this.pps), y); c.stroke();
      c.setLineDash([]);
    }
    // the drag line behind the head
    c.fillStyle = rgba('signal', 1);
    c.fillRect(X0, y - 1.5 * px, Math.max(0, hx - X0), 3 * px);
    c.restore();
  }

  private drawChunks(c: CanvasRenderingContext2D, t: number, px: number, hx: number) {
    const s0 = this.ctx.start;
    const baseY = BAND_Y + BAND_H / 2 + SIZE * 0.35;
    c.save();
    this.chunks.forEach((k, i) => {
      const w = k.xb - k.xa;
      const build = ease.outExpo(prog(t, s0 - 0.02 + 0.025 * i, s0 + 0.025 * i + 0.16));
      if (build <= 0) return;
      const vis = t >= k.t0 ? 1 : prog(t, k.t0 - 0.38, k.t0 - 0.05);
      const fillW = clamp(hx - k.xa, 0, w);
      const committed = t >= k.t1;
      const settle = committed ? ease.outCubic(prog(t, k.t1, k.t1 + 0.14)) : 0;
      // outline: queued chunks dashed, live ones solid
      c.lineWidth = 1.5 * px;
      if (vis < 1 && fillW <= 0) {
        c.setLineDash([6, 6]);
        c.strokeStyle = rgba('graphite', build);
      } else {
        c.setLineDash([]);
        c.strokeStyle = rgba('ash', 0.7);
      }
      c.strokeRect(k.xa, BAND_Y, w * build, BAND_H);
      c.setLineDash([]);
      // fill: orange while uploading, committed to bone (a short hot flash on commit)
      if (fillW > 0) {
        c.fillStyle = committed ? rgba('bone', 1) : rgba('signal', 1);
        c.fillRect(k.xa, BAND_Y, fillW, BAND_H);
      }
      if (committed && settle < 1) {
        // the commit: a hot rim that snaps shut onto the block
        const g = 10 * (1 - settle);
        c.strokeStyle = rgba('ember', 1 - settle); c.lineWidth = 3 * px;
        c.strokeRect(k.xa - g, BAND_Y - g, w + 2 * g, BAND_H + 2 * g);
      }
      // the word: dim until sung, knocked out of the fill as it fills
      if (vis > 0) {
        c.font = font(k.fam, SIZE);
        c.textAlign = 'left';
        const live = t >= k.t0;
        // each word lands with a small pop; "submit" slams with the button
        const amp = i === 2 ? 0.16 : 0.05;
        const pop = k.t0 > s0 + 0.02 ? 1 + amp * pulse(t, k.t0, 0.045) : 1;
        const oy = baseY - SIZE * 0.36;
        const draw = () => {
          c.save();
          c.translate(k.tx, oy); c.scale(pop, pop);
          c.fillText(k.text, 0, baseY - oy);
          c.restore();
        };
        c.fillStyle = rgba('bone', live ? 0.62 : 0.3 * vis);
        draw();
        if (fillW > 0) {
          c.save();
          c.beginPath(); c.rect(k.xa, BAND_Y, fillW, BAND_H); c.clip();
          c.fillStyle = rgba('ink', 1);
          draw();
          c.restore();
        }
      }
      // chunk label above: index, size; a check once committed
      c.font = font(F.mono(500), 17);
      c.fillStyle = rgba('ash', 0.85 * build);
      const lab = `${String(i + 1).padStart(2, '0')}`;
      c.fillText(lab, k.xa, BAND_Y - 14);
      c.fillStyle = rgba('graphite', build);
      const lw = measure(lab, F.mono(500), 17);
      const ml = `${k.mb.toFixed(1)} MB`;
      c.fillText(ml, k.xa + lw + 12, BAND_Y - 14);
      if (committed) {
        const ck = prog(t, k.t1, k.t1 + 0.08);
        const cx = k.xa + lw + 12 + measure(ml, F.mono(500), 17) + 22, cy = BAND_Y - 21;
        c.strokeStyle = rgba('bone', 0.9); c.lineWidth = 2.2 * px; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(cx - 7, cy); c.lineTo(cx - 2, cy + 5 * Math.min(1, ck * 2));
        if (ck > 0.5) c.lineTo(cx - 2 + 11 * (ck - 0.5) * 2, cy + 5 - 12 * (ck - 0.5) * 2);
        c.stroke();
        c.lineCap = 'butt';
      }
    });
    c.restore();
  }

  private drawDeadline(c: CanvasRenderingContext2D, t: number, px: number) {
    const s0 = this.ctx.start;
    const x = this.XD;
    const grow = ease.outExpo(prog(t, s0 + 0.05, s0 + 0.4));
    const hit = pulse(t, this.tLine, 0.06);
    const top = BAND_Y - 132, bot = TRACK_Y + 150;
    c.save();
    c.fillStyle = rgba(hit > 0.3 ? 'ember' : 'signal', 1);
    const lw = (3 + 5 * hit) * px;
    const yc = (top + bot) / 2;
    c.fillRect(x - lw / 2, lerp(yc, top, grow), lw, (bot - top) * grow);
    // tag
    c.font = font(F.mono(600), 20);
    c.textAlign = 'left';
    // the tag takes over from the dimension line's edge marker once the deadline is in view
    const tagA = grow * this.tagIn;
    c.fillStyle = rgba('signal', tagA);
    c.fillText('DEADLINE', x + 14, top + 16);
    c.font = font(F.mono(400), 20);
    c.fillStyle = rgba('ash', tagA);
    c.fillText('closes 23:59:59', x + 14, top + 42);
    // "line", past it, on the same baseline as the chunks
    const w = this.last;
    const vis = t >= w.start ? 1 : prog(t, w.start - 0.38, w.start - 0.05);
    if (vis > 0) {
      const baseY = BAND_Y + BAND_H / 2 + SIZE * 0.35;
      const e = t - w.start;
      const k = e >= 0 ? 1 + 0.28 * Math.pow(0.5, e / 0.05) : 1;
      const lx = x + 34;
      c.save();
      c.translate(lx, baseY); c.scale(k, k);
      c.font = font(this.lineFam, this.lineSize);
      c.fillStyle = e >= 0 ? rgba('signal', 1) : rgba('bone', 0.3 * vis);
      c.fillText(w.w, 0, 0);
      c.restore();
    }
    c.restore();
  }

  /** The playhead flag under the ruler: the head's clock time. */
  private drawFlag(c: CanvasRenderingContext2D, t: number, px: number, hx: number) {
    const s0 = this.ctx.start;
    const a = 1;
    const y0 = TRACK_Y, fy = TRACK_Y + 78;
    const frozen = t >= this.tLine;
    const txt = frozen ? '23:59:59.97' : this.fmtClock(this.clockAt(hx));
    c.save();
    c.globalAlpha = a;
    c.fillStyle = rgba('signal', 0.9);
    c.fillRect(hx - 0.75 * px, y0, 1.5 * px, fy - y0);
    c.font = font(F.mono(600), 22);
    const tw = measure(txt, F.mono(600), 22);
    let kp = 0;
    for (const kt of this.kicks) if (kt < this.tLine) kp = Math.max(kp, pulse(t, kt, 0.06));
    c.fillStyle = kp > 0.5 ? rgba('ember', 1) : rgba('signal', 1);
    c.fillRect(hx - tw - 20, fy, tw + 20, 36);
    c.fillStyle = rgba('ink', 1);
    c.textAlign = 'left';
    c.fillText(txt, hx - tw - 10, fy + 26);
    c.restore();
  }

  private drawStamp(c: CanvasRenderingContext2D, t: number, px: number) {
    const e = t - this.tStamp;
    if (e < 0) return;
    const k = 1 + 0.45 * Math.pow(0.5, e / 0.035);
    const a = prog(e, 0, 0.03);
    const cx = this.XD + 214, cy = TRACK_Y + 96;
    c.save();
    c.translate(cx, cy); c.rotate(-0.07); c.scale(k, k);
    c.globalAlpha = a;
    const w = 330, h = 104;
    c.fillStyle = rgba('ink', 0.88);
    c.fillRect(-w / 2, -h / 2, w, h);
    c.strokeStyle = rgba('signal', 1);
    c.lineWidth = 4 * px; c.strokeRect(-w / 2, -h / 2, w, h);
    c.lineWidth = 1.5 * px; c.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
    c.textAlign = 'center';
    c.fillStyle = rgba('signal', 1);
    c.font = font(F.mono(700), 40);
    c.fillText('SUBMITTED', 0, -2);
    c.font = font(F.mono(500), 24);
    c.fillText('23:59:59.97', 0, 32);
    c.restore();
    // footnote, typed
    const n = Math.floor(prog(t, this.tFoot, this.tFoot + 0.14) * 15);
    if (n > 0) {
      c.save();
      c.font = font(F.mono(400), 20);
      c.fillStyle = rgba('ash', 1);
      // under the frozen clock of the head's flag
      c.textAlign = 'right';
      const s = '30 ms to spare';
      c.fillText(s.slice(0, n), this.XD - 10, TRACK_Y + 146);
      c.restore();
    }
  }

  /**
   * A dimension line from the head to the deadline, drawn like a technical drawing: the time left,
   * shrinking to the 30 ms that remain. While the deadline is off to the right it runs into a marker
   * at the viewport's edge.
   */
  private drawDimension(c: CanvasRenderingContext2D, t: number, cam: Cam, hx: number) {
    const s0 = this.ctx.start;
    const a = prog(t, s0 + 0.06, s0 + 0.3);
    if (a <= 0) return;
    const S = (x: number) => (x - cam.x) * cam.z + W / 2;
    const y = (BAND_Y - 60 - cam.y) * cam.z + H / 2;
    const R = W - 96;
    const frozen = t >= this.tLine;
    const left = frozen ? SPARE : Math.max(0, 60 - CLK0 - this.clockAt(hx));
    const xa = S(hx), xdRaw = S(this.XD);
    c.save();
    c.globalAlpha = a;
    c.textBaseline = 'alphabetic';
    // the off-screen marker
    const offK = prog(xdRaw, W - 40, W + 60);
    let xb = xdRaw;
    if (offK > 0) {
      c.font = font(F.mono(600), 20);
      const mw = measure('DEADLINE', F.mono(600), 20);
      c.globalAlpha = a * offK;
      c.fillStyle = rgba('signal', 1);
      c.beginPath(); c.moveTo(R, y); c.lineTo(R - 12, y - 7); c.lineTo(R - 12, y + 7); c.closePath(); c.fill();
      c.textAlign = 'right';
      c.fillText('DEADLINE', R - 22, y + 7);
      c.globalAlpha = a;
      xb = Math.min(xdRaw, R - 22 - mw - 16);
    }
    const col = left < 1 ? rgba('signal', 1) : rgba('ash', 0.9);
    const arrow = (x: number, dir: number) => {
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - dir * 13, y - 5); c.lineTo(x - dir * 13, y + 5); c.closePath(); c.fill();
    };
    c.fillStyle = col; c.strokeStyle = col;
    // extension line at the head
    c.fillRect(xa - 0.75, y - 14, 1.5, 28);
    const len = xb - xa;
    c.font = font(F.mono(500), 20);
    const lab = frozen ? '0.03 s' : `${left.toFixed(2)} s`;
    if (len > 60) {
      c.fillRect(xa, y - 0.75, len, 1.5);
      arrow(xa, -1);
      if (offK < 1) arrow(xb, 1);
      c.textAlign = 'center';
      c.fillText(lab, xa + len / 2, y - 12);
    } else {
      // too tight: arrows from outside, the figure beside
      c.fillRect(xa - 34, y - 0.75, 34, 1.5);
      c.fillRect(xb, y - 0.75, 34, 1.5);
      arrow(xa, 1); arrow(xb, -1);
      c.textAlign = 'right';
      c.fillText(lab, xa - 44, y + 7);
    }
    c.restore();
  }

  // ---------------------------------------------------------------- the portal chrome (screen)
  private drawChrome(c: CanvasRenderingContext2D, t: number, hx: number) {
    const L = 96, R = W - 96;
    const frozen = t >= this.tLine;
    c.save();
    c.textBaseline = 'alphabetic';
    // header
    c.font = font(F.mono(600), 22); c.fillStyle = rgba('bone', 0.95); c.textAlign = 'left';
    c.fillText('ASSIGNMENT 3 — UPLOAD', L, 122);
    c.font = font(F.mono(400), 20); c.fillStyle = rgba('ash', 1);
    c.fillText(FILE, L, 154);
    const mb = frozen ? TOTAL_MB : this.mbAt(hx);
    c.textAlign = 'right';
    c.font = font(F.mono(600), 34); c.fillStyle = rgba('bone', 1);
    const tot = ` / ${TOTAL_MB.toFixed(1)} MB`;
    c.fillText(tot, R, 124);
    const tw = measure(tot, F.mono(600), 34);
    c.fillStyle = frozen ? rgba('bone', 1) : rgba('signal', 1);
    c.fillText(mb.toFixed(1), R - tw, 124);
    // rate: from the head's speed
    const dt = 0.03;
    const rate = frozen ? 0 : ((this.mbAt(this.headX(t + dt)) - this.mbAt(this.headX(t - dt))) / (2 * dt));
    c.font = font(F.mono(400), 20); c.fillStyle = rgba('ash', 1);
    c.fillText(frozen ? 'complete' : `${rate.toFixed(1)} MB/s`, R, 154);
    c.fillStyle = rgba('graphite', 0.9);
    c.fillRect(L, 178, R - L, 1.5);
    // footer
    c.fillRect(L, 902, R - L, 1.5);
    c.textAlign = 'left';
    c.font = font(F.mono(400), 18); c.fillStyle = rgba('ash', 0.9);
    c.fillText('the server clock is authoritative', L, 948);
    c.fillStyle = rgba('graphite', 1);
    c.fillText('late submissions are not accepted', L, 976);
    this.drawButton(c, t, R);
    c.restore();
  }

  private drawButton(c: CanvasRenderingContext2D, t: number, R: number) {
    const bw = 250, bh = 66, x = R - bw, y = 984 - bh;
    const e = t - this.tSub;
    const press = e >= 0 ? Math.pow(0.5, e / 0.06) : 0;
    const s = 1 - 0.08 * press;
    const done = t >= this.tLine;
    c.save();
    c.translate(x + bw / 2, y + bh / 2); c.scale(s, s);
    c.lineWidth = 2;
    if (e < 0) {
      c.strokeStyle = rgba('bone', 0.95); c.strokeRect(-bw / 2, -bh / 2, bw, bh);
      c.fillStyle = rgba('bone', 1);
    } else {
      // pressed: a hot fill that drains back to an orange outline
      const fillA = press;
      if (fillA > 0.02) { c.fillStyle = rgba(press > 0.5 ? 'ember' : 'signal', fillA); c.fillRect(-bw / 2, -bh / 2, bw, bh); }
      c.strokeStyle = rgba(done ? 'bone' : 'signal', 1); c.strokeRect(-bw / 2, -bh / 2, bw, bh);
      c.fillStyle = press > 0.5 ? rgba('ink', 1) : rgba(done ? 'bone' : 'signal', 1);
    }
    c.font = font(F.mono(600), 26); c.textAlign = 'center';
    const pending = e >= 0;
    c.fillText('SUBMIT', pending ? 16 : 0, 9);
    if (pending) {
      // a spinner while it goes through; a check once it is in
      const ix = -bw / 2 + 40;
      c.strokeStyle = c.fillStyle; c.lineWidth = 2.5; c.lineCap = 'round';
      c.beginPath();
      if (!done) {
        const a0 = (t - this.tSub) * 11;
        c.arc(ix, 0, 10, a0, a0 + 4.4);
      } else {
        const k = ease.outCubic(prog(t, this.tLine, this.tLine + 0.1));
        c.moveTo(ix - 10, 0); c.lineTo(ix - 3, 8 * Math.min(1, k * 2));
        if (k > 0.5) c.lineTo(ix - 3 + 14 * (k - 0.5) * 2, 8 - 18 * (k - 0.5) * 2);
      }
      c.stroke();
    }
    c.restore();
  }
}
