// TABS — "Lecture notes in fifteen tabs, and I have read them nil" (11:59, ink plate, no drums).
//
// A document viewer of our own hairline design: a header (reading list, 10:15), a strip of square
// hairline cells hanging off a rail, and the active page, a dark sheet joined to its tab like a
// folder. The active tab is Lec01.pdf and it never changes: every other lecture is opened in the
// background. The lyric is the page's text, one word lighting per sung word.
//  - On the beat grid a tab opens at the strip's end (beats, then eighths, then sixteenths into the
//    downbeat), the spark pushing each one in; the strip crams until the titles are slivers.
//  - "read them": the spark sweeps the strip left to right and the read counter races up.
//  - "nil": the counter slams back to 0, every tab gets an unread dot, and a big Cormorant ∅ lands
//    on the page.
//  - The page's greeked body retracts on "nil" too: the page is empty.
//  - The cut: on the last snare (the fill into the drums) bone paper wipes down the frame and the
//    whole viewer is redrawn ink on bone underneath it; the camera releases its push, so the plate
//    ends on a square, still light frame (the next plate is a bone proof page).
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { FSPass, Layer2D, W, H } from '../../engine/gl';
import { LineBatch } from '../../engine/lines';
import { rgba } from '../../engine/palette';
import { F, font, glyphX, measure } from '../../engine/type';
import { type Word } from '../../engine/lyrics';
import { clamp, ease, lerp, prog, pulse } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';

// ---------------------------------------------------------------- layout (world px at zoom 1)
const L0 = 96, R0 = 1824;
const HEAD_B1 = 150, HEAD_B2 = 182; // header baselines
const STRIP_Y = 224, STRIP_H = 70; // the tab row (the rail is its top edge)
const PAGE_Y0 = STRIP_Y + STRIP_H, PAGE_Y1 = 900;
const FOOT_B = 950;
const TAB_FAM = F.mono(500), TAB_SIZE = 26;
const TAB_B = STRIP_Y + 45; // tab label baseline
const PAD = 20;
const TMAX = 238; // widest a background tab gets
const N_TABS = 15;
// tab opens in beats after the plate's first beat: beats, eighths, then sixteenths into the downbeat
const OPEN_BEATS = [0, 1, 2, 2.5, 3, 3.5, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6];
const PAGES = [48, 36, 52, 41, 60, 33, 45, 38, 57, 29, 44, 50, 39, 47, 62]; // p. 1 / n
const FOCUS = { x: W / 2, y: 540 };

type Cam = { x: number; y: number; z: number };
interface Tab { x: number; w: number; p: number }
interface PWord { w: Word; line: number; x: number; wd: number }

const BG = /* glsl */ `
uniform vec3 cam; // world x, y, zoom
void main() {
  vec2 p = vec2(FRAG_PX.x, ${H.toFixed(1)} - FRAG_PX.y);
  vec2 w = (p - vec2(${(W / 2).toFixed(1)}, ${(H / 2).toFixed(1)})) / cam.z + cam.xy;
  vec2 q = (fract(w / 48.0 + 0.5) - 0.5) * 48.0 * cam.z;
  float d = length(q);
  float dot = 1.0 - smoothstep(0.9 * cam.z, 0.9 * cam.z + 1.0, d);
  vec3 col = C_INK + (C_GRAPHITE - C_INK) * 0.14 * dot;
  fragColor = vec4(col, 1.0);
}`;

const INV: Record<string, string> = { bone: 'ink', ink: 'bone', ink2: 'bone', ash: 'graphite', graphite: 'ash' };
const pad2 = (n: number) => String(n).padStart(2, '0');

export default class Tabs extends Scene {
  bg = new FSPass(BG, { cam: { value: new THREE.Vector3(W / 2, H / 2, 1) } });
  layer = new Layer2D();
  glow = new LineBatch(3000, { screen2D: false });
  glowCam = new THREE.OrthographicCamera(0, W, 0, H, -1, 1);

  // times
  tOpen: number[] = [];
  downs: number[] = [];
  beats: number[] = [];
  tRead = 0; tNil = 0; tWipe = 0; tFoot = 0; tFull = 0;
  nil!: Word;

  // type
  fam = F.archivo(100, 900);
  size = 120;
  lead = 118;
  textX = 0; textB0 = 0; textW = 0;
  words: PWord[] = [];
  lineStr: string[] = [];
  A = 0; // active tab width
  stripX1 = 0; // the strip's end (the counter sits to its right)
  CX = 0; // counter x
  cw = 0; // mono advance at TAB_SIZE
  pageB = PAGE_Y1; // the page's bottom edge (it unrolls on the cut)
  held!: Word; // "tabs," (held: it widens as the strip crams)
  skel: { x: number; w: number; items: { k: 'h' | 'l' | 'f' | 'c'; y: number; w: number }[] } = { x: 0, w: 0, items: [] };
  inv = false; // drawing the light pass
  emptyX = 0; emptyB = 0; emptySize = 0;

  override init() {
    const { lyrics, audio, start, end } = this.ctx;
    const line = lyrics.get('Lecture notes in fifteen tabs');
    const ws = line.words;
    this.nil = ws[ws.length - 1]!;
    this.tNil = this.nil.start;
    this.held = ws[4]!;
    this.tRead = (ws.find((w) => w.w.toLowerCase().startsWith('read')) ?? ws[ws.length - 3]!).start;

    // beat grid: the plate's first beat (the cut)
    let b0 = Math.round(audio.beatAt(start));
    if (audio.timeOfBeat(b0) < start - 0.05) b0++;
    this.tOpen = OPEN_BEATS.map((k) => audio.timeOfBeat(b0 + k));
    this.tFull = this.tOpen[N_TABS - 1]!;
    this.downs = audio.downbeats.filter((d) => d > start + 0.1 && d < end);
    this.beats = audio.beats.filter((b) => b > start + 0.1 && b < end);
    this.tFoot = this.downs.find((d) => d >= this.tFull - 0.02) ?? this.tFull;
    // the wipe: on the strongest snare between "nil" and the cut (the fill into the drums)
    const sn = audio.events('snare', this.tNil + 0.05, end - 0.03);
    let best: [number, number] | null = null;
    for (const e of sn) if (!best || e[1] > best[1]) best = e;
    this.tWipe = best ? best[0] : end - 0.09;

    // ---- counter and strip
    const cw = measure('open: 15   read: 15 / 15', TAB_FAM, TAB_SIZE);
    this.CX = R0 - cw;
    this.cw = measure('0', TAB_FAM, TAB_SIZE);
    this.stripX1 = this.CX - 60;
    this.A = PAD + measure('Lec01.pdf', TAB_FAM, TAB_SIZE) + PAD + 14;

    // ---- the page text: four lines, one size, kerned runs
    const groups = [[0, 1], [2, 3, 4], [5, 6, 7], [8, 9, 10]];
    this.lineStr = groups.map((g) => g.map((i) => ws[i]!.w).join(' '));
    this.textX = L0 + 84;
    const maxW = 1080;
    const w1 = Math.max(...this.lineStr.map((s) => measure(s, this.fam, 100) / 100));
    this.size = Math.min(128, Math.floor(maxW / w1));
    this.lead = Math.round(this.size * 0.98);
    const cap = this.size * 0.72;
    const blockH = 3 * this.lead + cap;
    const top = PAGE_Y0 + 92, bot = PAGE_Y1 - 56;
    this.textB0 = Math.round(top + (bot - top - blockH) / 2 + cap);
    this.textW = w1 * this.size;
    groups.forEach((g, li) => {
      let ci = 0;
      const s = this.lineStr[li]!;
      for (const i of g) {
        const w = ws[i]!;
        this.words.push({ w, line: li, x: this.textX + glyphX(s, ci, this.fam, this.size), wd: measure(w.w, this.fam, this.size) });
        ci += Array.from(w.w).length + 1;
      }
    });
    // ∅: the free right column of the page
    const colL = this.textX + this.textW + 40, colR = R0 - 60;
    this.emptySize = 560;
    const mc = document.createElement('canvas').getContext('2d')!;
    mc.font = font(F.serif(400), this.emptySize);
    const m = mc.measureText('∅');
    const gw = m.actualBoundingBoxRight + m.actualBoundingBoxLeft;
    const gh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    this.emptyX = (colL + colR) / 2 - gw / 2 + m.actualBoundingBoxLeft;
    this.emptyB = (PAGE_Y0 + PAGE_Y1) / 2 + 10 + gh / 2 - m.actualBoundingBoxDescent;

    // the page's body (never read): a section head, greeked lines, a figure, in the right column
    const sx0 = colL + 50, sw = colR - 40 - sx0;
    this.skel = { x: sx0, w: sw, items: [] };
    let y = this.textB0 - cap + 4;
    const it = this.skel.items;
    it.push({ k: 'h', y: y + 14, w: 0 });
    y += 52;
    const lens = [1, 0.94, 0.98, 0.9, 0.62];
    for (const l of lens) { it.push({ k: 'l', y, w: l * sw }); y += 24; }
    y += 14;
    it.push({ k: 'f', y, w: sw });
    y += 150 + 34;
    it.push({ k: 'c', y, w: 0 });
    y += 30;
    for (const l of [0.96, 1, 0.48]) { it.push({ k: 'l', y, w: l * sw }); y += 24; }
  }

  // ---------------------------------------------------------------- the strip
  presence(i: number, t: number) {
    if (i === 0) return 1;
    const to = this.tOpen[i]!;
    return ease.outExpo(prog(t, to, to + 0.13));
  }

  tabsAt(t: number): { tabs: Tab[]; xEnd: number } {
    const P = this.tOpen.map((_, i) => this.presence(i, t));
    let n = 0;
    for (let i = 1; i < P.length; i++) n += P[i]!;
    const avail = this.stripX1 - L0 - this.A;
    const wo = n > 0 ? Math.min(TMAX, avail / n) : TMAX;
    const tabs: Tab[] = [{ x: L0, w: this.A, p: 1 }];
    let x = L0 + this.A;
    for (let i = 1; i < P.length; i++) {
      const w = P[i]! * wo;
      tabs.push({ x, w, p: P[i]! });
      x += w;
    }
    return { tabs, xEnd: x };
  }

  openCount(t: number) {
    let n = 0;
    for (const to of this.tOpen) if (t >= to - 1e-4) n++;
    return Math.max(1, n);
  }

  // ---------------------------------------------------------------- the spark
  /** The spark: the insertion point at the strip's end, then the reading position. */
  sparkAt(t: number): { x: number; y: number } {
    const y = STRIP_Y;
    const { tabs, xEnd } = this.tabsAt(Math.min(t, this.tRead));
    if (t < this.tRead) return { x: xEnd, y };
    const tw = this.tRead + 0.07;
    if (t < tw) return { x: lerp(xEnd, L0, ease.inOutCubic(prog(t, this.tRead, tw))), y };
    if (t < this.tNil) {
      const u = prog(t, tw, this.tNil);
      return { x: lerp(L0, tabs[tabs.length - 1]!.x + tabs[tabs.length - 1]!.w, u * (0.6 + 0.4 * u)), y };
    }
    return { x: xEnd, y };
  }

  readCount(t: number) {
    if (t < this.tRead + 0.07 || t >= this.tNil) return 0;
    const { tabs } = this.tabsAt(t);
    const sx = this.sparkAt(t).x;
    let n = 0;
    for (const tb of tabs) if (tb.x + tb.w <= sx + 0.5) n++;
    return n;
  }

  // ---------------------------------------------------------------- camera
  camAt(t: number): Cam {
    const s0 = this.ctx.start;
    // the cut lands pushed in and settles back; a slow push across the plate
    let z = 1 + 0.04 * (1 - ease.outExpo(prog(t, s0, s0 + 0.45))) + 0.025 * prog(t, s0 + 0.3, this.tNil, ease.inOutQuad);
    let p = 0;
    for (const d of this.downs) p = Math.max(p, pulse(t, d, 0.1));
    let q = 0;
    for (let i = 1; i < this.tOpen.length; i++) q = Math.max(q, pulse(t, this.tOpen[i]!, 0.05));
    let bq = 0;
    for (const b of this.beats) bq = Math.max(bq, pulse(t, b, 0.07));
    z *= 1 + 0.02 * p + 0.004 * q + 0.008 * bq + 0.04 * pulse(t, this.tNil, 0.07);
    let x = FOCUS.x, y = FOCUS.y;
    if (t > this.tWipe) {
      const k = ease.outExpo(prog(t, this.tWipe, this.ctx.end));
      // the wipe releases the push: the light frame lands square and still
      z = Math.exp(lerp(Math.log(z), 0, k));
    }
    return { x, y, z };
  }

  // ---------------------------------------------------------------- render
  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer } = this.ctx;
    const t = f.t;
    const cam = this.camAt(t);
    (this.bg.u.cam!.value as THREE.Vector3).set(cam.x, cam.y, cam.z);
    this.bg.render(renderer, out);

    const L = this.layer; L.clear();
    const c = L.ctx;
    const z = cam.z, px = 1 / z;
    c.setTransform(z, 0, 0, z, W / 2 - cam.x * z, H / 2 - cam.y * z);
    c.textBaseline = 'alphabetic';
    const st = this.tabsAt(t);
    const sp = this.sparkAt(t);

    this.pageB = lerp(PAGE_Y0 + 20, PAGE_Y1, ease.outExpo(prog(t, this.ctx.start - 0.01, this.ctx.start + 0.3)));
    this.inv = false;
    this.drawAll(c, t, px, st, sp.x);
    // the wipe: bone paper sweeps down the frame on the last snare, the viewer redrawn ink on bone
    // underneath it (the next plate is a bone page)
    if (t >= this.tWipe) {
      const wk = ease.outExpo(prog(t, this.tWipe, this.ctx.end - 0.004));
      const vx0 = cam.x - W / 2 / z, vy0 = cam.y - H / 2 / z, vw = W / z, vh = H / z;
      const yW = vy0 + wk * (vh + 4);
      c.save();
      c.beginPath(); c.rect(vx0 - 10, vy0 - 10, vw + 20, yW - vy0 + 10); c.clip();
      c.fillStyle = rgba('bone', 1);
      c.fillRect(vx0 - 10, vy0 - 10, vw + 20, vh + 20);
      this.inv = true;
      this.drawAll(c, t, px, st, sp.x);
      this.inv = false;
      c.restore();
      if (wk < 0.995) { c.fillStyle = rgba('signal', 1); c.fillRect(vx0, yW - 1.5 * px, vw, 3 * px); }
    }
    this.ctx.comp.draw(renderer, L.upload(), out);

    // ---- the spark (world space)
    const g = this.glow; g.clear();
    const oc = this.glowCam;
    oc.left = cam.x - W / 2 / z; oc.right = cam.x + W / 2 / z;
    oc.top = cam.y - H / 2 / z; oc.bottom = cam.y + H / 2 / z;
    oc.updateProjectionMatrix();
    const fade = 1 - prog(t, this.tWipe, this.tWipe + 0.03);
    const burst = (tb: number) => {
      let p = 0;
      for (let i = 1; i < this.tOpen.length; i++) p = Math.max(p, pulse(tb, this.tOpen[i]!, 0.03));
      const sweep = tb > this.tRead && tb < this.tNil ? 260 : 0;
      return 50 + 420 * p + sweep;
    };
    sparkParticles(g, t, (tb) => this.sparkAt(tb), { rate: burst, rateMax: 730, speed: 260, life: 0.38, intensity: 0.95 * fade, seed: 1015, width: 1.6 });
    const hot = 1 + 0.5 * pulse(t, this.tNil, 0.08);
    if (fade > 0) sparkHead(g, sp.x, sp.y, t, 1.05 * Math.sqrt(z), 1.1 * hot * fade);
    g.render(renderer, out, oc);

    // ---- post
    const shake = 8 * pulse(t, this.tNil, 0.05) + 2.5 * pulse(t, this.tFull, 0.05);
    return {
      hud: 0, bloom: 0.75, bloomThreshold: 0.95, bloomKnee: 0.25, vignette: 0.42, grain: 0.055,
      ca: 1.0 + 0.5 * pulse(t, this.tNil, 0.06),
      flash: 0.02 * pulse(t, this.tNil, 0.02),
      shake: [Math.sin(t * 97) * shake, Math.cos(t * 71) * shake * 0.7],
    };
  }

  // ---------------------------------------------------------------- drawing
  /** Palette lookup; in the light pass (under the wipe) the viewer is redrawn ink on bone paper. */
  private col(key: string, a = 1) { return rgba(this.inv ? INV[key] ?? key : key, a); }

  private drawAll(c: CanvasRenderingContext2D, t: number, px: number, st: { tabs: Tab[]; xEnd: number }, sx: number) {
    this.drawHeader(c, t);
    this.drawStrip(c, t, px, st, sx);
    this.drawCounter(c, t);
    this.drawPageShape(c, px, st);
    c.save(); this.pagePath(c); c.clip();
    this.drawPage(c, t, px);
    c.restore();
    this.drawFooter(c, t);
  }

  private drawHeader(c: CanvasRenderingContext2D, _t: number) {
    c.save();
    c.textAlign = 'left';
    c.font = font(F.mono(600), 22); c.fillStyle = this.col('bone', 0.95);
    c.fillText('LECTURE NOTES — WEEK 3', L0, HEAD_B1);
    c.font = font(F.mono(400), 20); c.fillStyle = this.col('ash', 1);
    c.fillText('reading: before each lecture', L0, HEAD_B2);
    c.textAlign = 'right';
    c.font = font(F.mono(600), 34); c.fillStyle = this.col('bone', 1);
    c.fillText('10:15', R0, HEAD_B1 + 4);
    c.font = font(F.mono(400), 20); c.fillStyle = this.col('ash', 1);
    c.fillText('lecture started 09:00', R0, HEAD_B2);
    c.restore();
  }

  private drawStrip(c: CanvasRenderingContext2D, t: number, px: number, st: { tabs: Tab[]; xEnd: number }, sx: number) {
    const { tabs } = st;
    const sweeping = t >= this.tRead + 0.07 && t < this.tNil;
    c.save();
    c.font = font(TAB_FAM, TAB_SIZE);
    c.textAlign = 'left';
    for (let i = 1; i < tabs.length; i++) {
      const tb = tabs[i]!;
      if (tb.w < 0.5) continue;
      const to = this.tOpen[i]!;
      // the cell: rail on top, a divider on the right
      c.fillStyle = this.col('graphite', 1);
      c.fillRect(tb.x, STRIP_Y - 0.75 * px, tb.w, 1.5 * px);
      c.fillRect(tb.x + tb.w - 0.75 * px, STRIP_Y, 1.5 * px, STRIP_H);
      // opening: the cell's rail flashes orange, the label lands bright
      const fl = pulse(t, to, 0.06);
      if (fl > 0.02) {
        c.fillStyle = this.col(fl > 0.5 ? 'ember' : 'signal', Math.min(1, fl * 1.5));
        c.fillRect(tb.x, STRIP_Y - 1.5 * px, tb.w, 3 * px);
      }
      // the label, truncated to the characters that fit: the titles collapse to slivers
      const under = sweeping && sx >= tb.x && sx < tb.x + tb.w;
      const pad = clamp(tb.w * 0.2, 10, PAD);
      const nc = Math.floor((tb.w - pad - 12) / this.cw);
      if (nc > 0) {
        const lab = `Lec${pad2(i + 1)}.pdf`.slice(0, nc);
        const fresh = under ? 0 : prog(t, to + 0.08, to + 0.3);
        if (fresh > 0) { c.fillStyle = this.col('ash', 0.9); c.fillText(lab, tb.x + pad, TAB_B); }
        if (fresh < 1) { c.fillStyle = this.col('bone', 1 - fresh); c.fillText(lab, tb.x + pad, TAB_B); }
      }
    }
    // 15 open, on the downbeat: the whole rail flashes
    const ff = pulse(t, this.tFull, 0.07);
    if (ff > 0.02) {
      c.fillStyle = this.col(ff > 0.5 ? 'ember' : 'signal', Math.min(1, ff * 1.4));
      c.fillRect(L0 + this.A, STRIP_Y - 1.5 * px, st.xEnd - L0 - this.A, 3 * px);
    }
    // the part of the rail already "read"
    if (sweeping) {
      c.fillStyle = this.col('bone', 0.9);
      c.fillRect(L0 + this.A, STRIP_Y - 0.75 * px, Math.max(0, sx - L0 - this.A), 1.5 * px);
    }
    // unread dots on "nil": a ripple outward from the spark's end
    if (t >= this.tNil) {
      for (let i = 0; i < tabs.length; i++) {
        const tb = tabs[i]!;
        const td = this.tNil + (tabs.length - 1 - i) * 0.009;
        const k = prog(t, td, td + 0.05);
        if (k <= 0) continue;
        const r = 4.5 * (1 + 0.8 * pulse(t, td + 0.02, 0.03)) * Math.min(1, k * 2);
        c.fillStyle = this.col('signal', 1);
        c.beginPath(); c.arc(tb.x + tb.w - 14, STRIP_Y + 15, r, 0, Math.PI * 2); c.fill();
      }
    }
    c.restore();
  }

  private drawCounter(c: CanvasRenderingContext2D, t: number) {
    const n = this.openCount(t);
    const read = this.readCount(t);
    const cw = this.cw;
    c.save();
    c.font = font(TAB_FAM, TAB_SIZE);
    c.textAlign = 'left';
    let x = this.CX;
    const put = (s: string, col: string) => { c.fillStyle = col; c.fillText(s, x, TAB_B); x += s.length * cw; };
    put('open: ', this.col('ash', 1));
    // the count pops on each open
    let pop = 0;
    for (let i = 1; i < this.tOpen.length; i++) pop = Math.max(pop, pulse(t, this.tOpen[i]!, 0.05));
    const ns = String(n);
    c.save();
    c.translate(x, TAB_B); c.scale(1 + 0.18 * pop, 1 + 0.18 * pop);
    c.fillStyle = pop > 0.5 ? this.col('ember', 1) : this.col('bone', 1);
    c.fillText(ns, 0, 0);
    c.restore();
    x += ns.length * cw;
    put('   read: ', this.col('ash', 1));
    const rs = String(read);
    const e = t - this.tNil;
    if (e >= 0) {
      // the slam back to 0
      const k = 1 + 1.6 * Math.pow(0.5, e / 0.028);
      c.save();
      c.translate(x + cw / 2, TAB_B - TAB_SIZE * 0.36); c.scale(k, k);
      c.fillStyle = this.col('signal', 1);
      c.font = font(F.mono(700), TAB_SIZE);
      c.fillText('0', -cw / 2, TAB_SIZE * 0.36);
      c.restore();
      x += cw;
    } else put(rs, this.col(read > 0 ? 'bone' : 'bone', read > 0 ? 1 : 0.95));
    put(' / ', this.col('ash', 1));
    put(String(n), this.col('bone', 1));
    c.restore();
  }

  /** The active page and its tab, one silhouette (a folder tab, square corners). */
  private pagePath(c: CanvasRenderingContext2D) {
    c.beginPath();
    c.moveTo(L0, this.pageB);
    c.lineTo(L0, STRIP_Y);
    c.lineTo(L0 + this.A, STRIP_Y);
    c.lineTo(L0 + this.A, PAGE_Y0);
    c.lineTo(R0, PAGE_Y0);
    c.lineTo(R0, this.pageB);
    c.lineTo(L0, this.pageB);
    c.closePath();
  }

  private drawPageShape(c: CanvasRenderingContext2D, px: number, _st: { tabs: Tab[]; xEnd: number }) {
    c.save();
    this.pagePath(c);
    c.fillStyle = this.col('ink2', 1);
    c.fill();
    c.strokeStyle = this.col('ash', 0.75);
    c.lineWidth = 1.5 * px;
    c.stroke();
    c.restore();
  }

  private drawPage(c: CanvasRenderingContext2D, t: number, px: number) {
    const fg = 'bone', dim = 'ash';
    c.save();
    c.textAlign = 'left';
    // the active tab's label
    c.font = font(TAB_FAM, TAB_SIZE);
    c.fillStyle = this.col(fg, 1);
    c.fillText('Lec01.pdf', L0 + PAD, TAB_B);
    // page meta, scroll bar (never scrolled)
    c.font = font(F.mono(400), 18);
    c.fillStyle = this.col(dim, 1);
    c.textAlign = 'right';
    c.fillText(`p. 1 / ${PAGES[0]}`, R0 - 44, PAGE_Y0 + 42);
    const ty0 = PAGE_Y0 + 64, ty1 = PAGE_Y1 - 28, sx = R0 - 22;
    c.fillStyle = this.col('graphite', 0.9);
    c.fillRect(sx - 0.75 * px, ty0, 1.5 * px, ty1 - ty0);
    c.fillStyle = this.col(dim, 1);
    c.fillRect(sx - 2, ty0, 4, Math.max(10, (ty1 - ty0) / PAGES[0]!));
    c.textAlign = 'left';

    // the lyric
    c.font = font(this.fam, this.size);
    for (const pw of this.words) {
      const w = pw.w;
      const b = this.textB0 + pw.line * this.lead;
      const sung = t >= w.start;
      let col: string;
      if (!sung) col = this.col(fg, 0.28);
      else if (t < w.end) col = this.col('signal', 1);
      else col = this.col(fg, 1);
      const pop = sung ? 1 + 0.06 * pulse(t, w.start, 0.05) : 1;
      c.save();
      c.translate(pw.x, b); c.scale(pop, pop);
      c.fillStyle = col;
      if (w === this.held && t >= w.start && t < w.end) {
        // held: widens a step on every tab that opens under it
        let k = 0;
        for (const to of this.tOpen) if (to > w.start + 0.02 && to <= t) k++;
        c.font = font(F.archivo([100, 112.5, 125][Math.min(2, k)]!, 900), this.size);
      }
      c.fillText(w.w, 0, 0);
      c.font = font(this.fam, this.size);
      c.restore();
    }

    this.drawSkeleton(c, t, px);

    // ∅ on "nil"
    const e = t - this.tNil;
    if (e >= 0) {
      const k = 1 + 0.4 * Math.pow(0.5, e / 0.03);
      const a = prog(e, 0, 0.02);
      c.save();
      const cx = this.emptyX + this.emptySize * 0.3, cy = this.emptyB - this.emptySize * 0.3;
      c.translate(cx, cy); c.scale(k, k); c.translate(-cx, -cy);
      c.globalAlpha = a;
      c.font = font(F.serif(400), this.emptySize);
      c.fillStyle = this.col(fg, 1);
      c.fillText('∅', this.emptyX, this.emptyB);
      c.restore();
    }
    c.restore();
  }

  /** Lec01's body, greeked; on "nil" it retracts and the page is empty. */
  private drawSkeleton(c: CanvasRenderingContext2D, t: number, px: number) {
    const S = this.skel;
    const col = 'graphite';
    c.save();
    S.items.forEach((it, i) => {
      const td = this.tNil - 0.03 + i * 0.002;
      const k = 1 - ease.outCubic(prog(t, td, td + 0.03));
      if (k <= 0) return;
      c.globalAlpha = k;
      if (it.k === 'h') {
        c.font = font(F.mono(600), 18); c.fillStyle = this.col('ash', 1); c.textAlign = 'left';
        c.fillText('1   Introduction', S.x, it.y);
      } else if (it.k === 'l') {
        c.fillStyle = this.col(col, 0.7);
        c.fillRect(S.x, it.y - 3, it.w * k, 5);
      } else if (it.k === 'c') {
        c.font = font(F.mono(400), 16); c.fillStyle = this.col(col, 1); c.textAlign = 'left';
        c.fillText('Fig. 1.1', S.x, it.y);
      } else {
        // a small hairline figure: axes and one curve
        const x0 = S.x, y0 = it.y, w = it.w * k, h = 150;
        c.strokeStyle = this.col(col, 0.9); c.lineWidth = 1.5 * px;
        c.strokeRect(x0, y0, w, h);
        c.beginPath();
        c.moveTo(x0 + 26, y0 + 18); c.lineTo(x0 + 26, y0 + h - 22); c.lineTo(x0 + w - 18, y0 + h - 22);
        c.stroke();
        c.beginPath();
        const n = 24;
        for (let j = 0; j <= n; j++) {
          const u = j / n;
          const xx = x0 + 26 + u * (w - 56), yy = y0 + h - 22 - (h - 48) * (0.08 + 0.92 * u * u);
          if (j === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy);
        }
        c.stroke();
      }
    });
    c.restore();
  }

  private drawFooter(c: CanvasRenderingContext2D, t: number) {
    const s = 'unread since week 1';
    const n = Math.floor(prog(t, this.tFoot, this.tFoot + 0.3) * s.length);
    c.save();
    c.font = font(F.mono(400), 20);
    c.textAlign = 'left';
    if (n > 0) {
      c.fillStyle = this.col('ash', 1);
      c.fillText(s.slice(0, n), L0 + 24, FOOT_B);
    }
    if (t >= this.tNil) {
      const k = prog(t, this.tNil + 0.14, this.tNil + 0.19);
      c.fillStyle = this.col('signal', 1);
      c.beginPath(); c.arc(L0 + 6, FOOT_B - 7, 4.5 * k, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }
}
