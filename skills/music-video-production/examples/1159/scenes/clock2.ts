// CLOCK 2 — "Eleven fifty-nine, I'm running out of time", chorus 2: the chorus-1 figure rebuilt in 3D.
//
// Same layout as `clock` (its constants, 1 world unit = 100 of its px), now a physical unit on an ink
// void: an engraved ink monolith carrying four bone split-flap modules whose flaps really rotate about
// their hinge axis, a seconds pair, an orange colon, and in front of it the time-remaining bar as a
// 3D fuse-rail the lyric stands on.
//  - 82.19 hand-off from `upload2`: black, the hairline at clock's lead-in framing, the spark idling at
//    its RIGHT end. Silence. The footnote types itself in (`… · assignment 4`); the housing extrudes out
//    of the dark behind the hairline while the camera cranes slowly up and round the unit; the flaps
//    cascade on to 23:58 on the beat; the seconds clack once per syllable of "E-le-ven fif-ty-".
//  - 84.03, the drop ("-nine"): the minute flap lands on 9, the camera slams in, flash, shake; the colon
//    pulses orange on every kick; the hairline becomes a rod in a rail channel.
//  - "I'm running out of time": words light left→right on the rail while the rod burns right→left behind
//    the spark, one segment per word; the seconds leap :00 → :52 and tick per beat; the camera orbits on
//    and pushes on the downbeat. Hard cut to `stack2` at 86.34.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '../../engine/scene';
import { W, H, clearRT } from '../../engine/gl';
import { SCALE } from '../../engine/scale';
import { LineBatch } from '../../engine/lines';
import { LIN, rgba } from '../../engine/palette';
import { F, font, glyphX, measure } from '../../engine/type';
import { Lyrics, type Word } from '../../engine/lyrics';
import { clamp, ease, frameIdx, hash, lerp, noise1, prog, pulse } from '../../engine/util';
import { sparkHead, sparkParticles } from '../_motifs';
import { X0, X1, CW, CH, CY, LBL, SEC, ROW, BAR, FOOT, CARDX, COLON_X, SECX } from './clock';
import { VERT, CARD_FRAG, BOX_FRAG, PLATE_FRAG } from './clock2-glsl';

// ------------------------------------------------------------------ world (clock px → units)
const wx = (px: number) => (px - 960) / 100;
const wy = (py: number) => -(py - 548) / 100;
const ZR = 1.6; // the rail's plane, in front of the unit
const FLOOR = -4.45;
const RAIL_Y = wy(BAR.y + BAR.h / 2);
const FOV = 30;
const TAN = Math.tan((FOV / 2) * Math.PI / 180);
const D0 = (H / 2) / (64 * TAN); // hand-off: 64 px per unit on the rail plane (clock's zoom 0.64)
const HOUSE = { x0: -8.6, x1: 8.6, y0: FLOOR, y1: 4.45, depth: 1.5, front: -0.42 };
const CASE = 0.4; // module casings stand this far proud of the housing face (the cards sit on their fronts)
const LIGHT = new THREE.Vector3(-0.4, 0.7, 0.6).normalize();
const deg = Math.PI / 180;

interface Flip { t: number; ch: string; dur: number }
interface Mod {
  x: number; y: number; w: number; h: number; small: boolean; ev: Flip[];
  tremble?: { t0: number; t1: number; next: string };
  top: THREE.Mesh; bot: THREE.Mesh; flap: THREE.Mesh;
  mt: THREE.RawShaderMaterial; mb: THREE.RawShaderMaterial; mf: THREE.RawShaderMaterial;
}
interface Plate { mesh: THREE.Mesh; mat: THREE.RawShaderMaterial; cv: HTMLCanvasElement; c: CanvasRenderingContext2D; tex: THREE.CanvasTexture; px0: number; py0: number; k: number }
interface Pose { T: THREE.Vector3; phi: number; psi: number; d: number; roll: number }

const land = (t: number, ch: string, dur: number): Flip => ({ t: t - dur, ch, dur });
const CELL = (ch: string) => (ch === '' ? 10 : +ch);

export default class Clock2 extends Scene {
  cam = new THREE.PerspectiveCamera(FOV, W / H, 0.5, 300);
  scratch = new THREE.PerspectiveCamera(FOV, W / H, 0.5, 300);
  world = new THREE.Scene();
  hair = new LineBatch(9000, { screen2D: false, depthTest: true, blend: 'normal' });
  rods = new LineBatch(400, { screen2D: false, worldWidth: true, depthTest: true, blend: 'normal' });
  glow3 = new LineBatch(400, { screen2D: false, worldWidth: true, depthTest: true, blend: 'add' });
  glow = new LineBatch(3000);
  camU = { value: new THREE.Vector3() };
  gainU = { value: 1 }; rimU = { value: 0 };
  fogU = { value: new THREE.Vector2(20, 30) };

  // times
  t0 = 0; D = 0; tIn = 0; tHouse0 = 0; tHouse1 = 0; tType0 = 0; tType1 = 0; tNote0 = 0; end = 0;
  syl: number[] = []; beats: number[] = []; downs: number[] = [];
  wEl!: Word; wFif!: Word; row: Word[] = [];

  fLabel = F.archivo(100, 800); fRow = F.archivo(100, 900); fMono = F.mono(400); fMonoM = F.mono(500); fDigit = F.archivo(125, 900);
  rowSize = 0; wordX: number[] = []; segs: { x0: number; x1: number }[] = [];
  fifStr = 'FIFTY-NINE,'; nineAt = 6;

  mods: Mod[] = [];
  house!: THREE.Mesh; houseMat!: THREE.RawShaderMaterial;
  labels!: Plate; rowP!: Plate; face!: Plate;

  override init() {
    const { lyrics, audio: au, start, end } = this.ctx;
    this.t0 = start; this.end = end;
    const line = lyrics.get('running out of time', 1);
    const ws = line.words;
    this.wEl = ws[0]!; this.wFif = ws[1]!; this.row = ws.slice(2);
    this.D = au.downbeats.find((d) => d > this.wFif.start && d < this.wFif.end) ?? au.nearestBeat(lerp(this.wFif.start, this.wFif.end, 0.5));
    this.tIn = au.timeOfBeat(Math.round(au.beatAt(this.wEl.start)) - 1);
    this.tHouse0 = start + 0.12; this.tHouse1 = this.tIn + 0.1;
    this.tType0 = start + 0.1; this.tType1 = start + 0.8;
    this.tNote0 = this.row[0]!.start;
    const e = this.wEl, fi = this.wFif;
    this.syl = [e.start, lerp(e.start, e.end, 1 / 3), lerp(e.start, e.end, 2 / 3), fi.start, lerp(fi.start, this.D, 0.5)];
    const b0 = Math.round(au.beatAt(this.D));
    for (let k = 0; ; k++) { const tb = au.timeOfBeat(b0 + k); if (tb > end + 1e-3) break; this.beats.push(tb); }
    this.downs = au.downbeats.filter((d) => d > this.D + 0.1 && d < end);

    // the lyric row, laid out exactly as in clock
    const rowText = this.row.map((w) => w.w).join(' ');
    const w1 = measure(rowText, this.fRow, 100) / 100;
    this.rowSize = Math.min(ROW.size, (X1 - X0 - 150) / w1);
    let ci = 0;
    for (const w of this.row) { this.wordX.push(X0 + glyphX(rowText, ci, this.fRow, this.rowSize)); ci += Array.from(w.w).length + 1; }
    const n = this.row.length;
    this.segs = this.row.map((_, k) => ({ x0: k === 0 ? X0 : this.wordX[k]!, x1: k + 1 < n ? this.wordX[k + 1]! - BAR.gap : X1 }));
    this.nineAt = this.fifStr.indexOf('NINE');

    this.buildHousing();
    this.buildModules();
    this.labels = this.plate(120, 112, 1800, 212, HOUSE.front + 0.006, 1.7);
    this.face = this.plate(120, 655, 1800, 745, HOUSE.front + 0.006, 1.4);
    this.rowP = this.plate(120, 778, 1800, 978, ZR, 1.7);
    this.drawFace();
  }

  // ------------------------------------------------------------------ building
  private mat(frag: string, u: Record<string, THREE.IUniform>, o: Partial<THREE.ShaderMaterialParameters> = {}) {
    return new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: frag, uniforms: { camPos: this.camU, fog: this.fogU, ...u }, ...o });
  }

  private buildHousing() {
    const w = HOUSE.x1 - HOUSE.x0, h = HOUSE.y1 - HOUSE.y0, d = HOUSE.depth;
    const geo = new THREE.BoxGeometry(w, h, d);
    this.houseMat = this.mat(BOX_FRAG, { half3: { value: new THREE.Vector3(w / 2, h / 2, d / 2) }, lightDir: { value: LIGHT }, on: { value: 0 }, edgeW: { value: 1.3 }, rim: this.rimU });
    this.house = new THREE.Mesh(geo, this.houseMat);
    this.house.frustumCulled = false;
    this.world.add(this.house);
  }

  /** Card atlas: 0–9 and a dark blank, each a full card (rounded bone face, seam gap, ink figure). */
  private atlas(cw: number, ch: number, r: number, small: boolean) {
    const k = (small ? 3 : 1.35) * SCALE;
    const cols = 4, rows = 3;
    const cv = document.createElement('canvas');
    cv.width = Math.round(cw * k * cols); cv.height = Math.round(ch * k * rows);
    const c = cv.getContext('2d')!;
    c.scale(k, k);
    const mc = document.createElement('canvas').getContext('2d')!;
    const asc100 = (() => { mc.font = font(this.fDigit, 100); return mc.measureText('0123456789').actualBoundingBoxAscent / 100; })();
    const adv = measure('0', this.fDigit, 100) / 100;
    const size = small ? Math.min((cw - 20) / adv, (ch * 0.58) / asc100) : Math.min((cw - 56) / adv, (ch * 0.66) / asc100);
    const asc = asc100 * size;
    const seam = Math.max(2, ch * 0.008);
    for (let i = 0; i < 11; i++) {
      const x = (i % cols) * cw, y = Math.floor(i / cols) * ch;
      c.save();
      c.beginPath(); c.roundRect(x + 1, y + 1, cw - 2, ch - 2, r); c.clip();
      c.fillStyle = i === 10 ? rgba('ink2') : rgba('bone');
      c.fillRect(x, y, cw, ch);
      if (i < 10) {
        c.fillStyle = rgba('ink', 0.07); c.fillRect(x, y, cw, ch / 2); // top half a touch darker, as in clock
        c.font = font(this.fDigit, size);
        c.fillStyle = rgba('ink');
        const s = String(i);
        c.fillText(s, x + (cw - measure(s, this.fDigit, size)) / 2, y + ch / 2 + asc / 2);
      } else {
        c.strokeStyle = rgba('graphite', 0.9); c.lineWidth = 1.5;
        c.strokeRect(x + 1.75, y + 1.75, cw - 3.5, ch - 3.5);
      }
      c.clearRect(x, y + ch / 2 - seam / 2, cw, seam);
      c.restore();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 8;
    return { tex, grid: new THREE.Vector2(cols, rows) };
  }

  private buildModules() {
    const big = this.atlas(CW, CH, 12, false), sm = this.atlas(SEC.w, SEC.h, 5, true);
    const tI = this.tIn, D = this.D;
    const mk = (xpx: number, ypx: number, wpx: number, hpx: number, small: boolean, ev: Flip[]): Mod => {
      const A = small ? sm : big;
      const w = wpx / 100, h = hpx / 100;
      const x = wx(xpx) + w / 2, yTop = wy(ypx), mid = yTop - h / 2;
      const u = () => ({ atlas: { value: A.tex }, grid: { value: A.grid }, cellF: { value: 10 }, cellB: { value: 10 }, topF: { value: 1 }, shadeF: { value: 0 }, shadeB: { value: 0 }, shadow: { value: 0 }, on: { value: 1 }, gain: this.gainU });
      const mt = this.mat(CARD_FRAG, u()), mb = this.mat(CARD_FRAG, u()), mf = this.mat(CARD_FRAG, u(), { side: THREE.DoubleSide });
      mb.uniforms.topF!.value = 0;
      const gh = new THREE.PlaneGeometry(w, h / 2);
      const top = new THREE.Mesh(gh, mt); top.position.set(x, mid + h / 4, 0);
      const bot = new THREE.Mesh(gh, mb); bot.position.set(x, mid - h / 4, 0);
      const gf = new THREE.PlaneGeometry(w, h / 2); gf.translate(0, h / 4, 0);
      const flap = new THREE.Mesh(gf, mf); flap.position.set(x, mid, 0.006);
      for (const m of [top, bot, flap]) { m.frustumCulled = false; this.world.add(m); }
      // the module's casing: a small engraved box between the housing face and the card
      const cw2 = w + (small ? 0.08 : 0.14), ch2 = h + (small ? 0.08 : 0.14), cd = CASE - 0.012;
      const cm = this.mat(BOX_FRAG, { half3: { value: new THREE.Vector3(cw2 / 2, ch2 / 2, cd / 2) }, lightDir: { value: LIGHT }, on: this.houseMat.uniforms.on!, edgeW: { value: 1.1 }, rim: this.rimU });
      const cb = new THREE.Mesh(new THREE.BoxGeometry(cw2, ch2, cd), cm);
      cb.position.set(x, mid, -0.012 - cd / 2);
      cb.frustumCulled = false;
      this.world.add(cb);
      return { x, y: mid, w, h, small, ev, top, bot, flap, mt, mb, mf };
    };
    this.mods = [
      mk(CARDX[0]!, CY, CW, CH, false, [{ t: tI - 0.02, ch: '2', dur: 0.2 }]),
      mk(CARDX[1]!, CY, CW, CH, false, [{ t: tI + 0.03, ch: '3', dur: 0.2 }]),
      mk(CARDX[2]!, CY, CW, CH, false, [{ t: tI + 0.08, ch: '5', dur: 0.2 }]),
      mk(CARDX[3]!, CY, CW, CH, false, [{ t: tI + 0.13, ch: '8', dur: 0.2 }, land(D, '9', 0.085)]),
    ];
    this.mods[3]!.tremble = { t0: this.syl[3]!, t1: D - 0.085, next: '9' };
    const tens: Flip[] = [{ t: tI + 0.18, ch: '5', dur: 0.13 }, land(D, '0', 0.08)];
    const units: Flip[] = [{ t: tI + 0.22, ch: '4', dur: 0.13 }];
    this.syl.forEach((ts, i) => units.push(land(ts, String(5 + i), Math.min(0.12, (i === 0 ? 0.3 : ts - this.syl[i - 1]!) * 0.6))));
    units.push(land(D, '0', 0.08));
    const b1 = this.beats[1];
    if (b1 !== undefined) {
      const rollDur = Math.min(0.34, (this.beats[2] ?? b1 + 0.46) - b1 - 0.08);
      for (let k = 1; k <= 5; k++) tens.push({ t: b1 + ((k - 1) / 5) * rollDur, ch: String(k), dur: rollDur / 5.5 });
      const nn = 22;
      for (let k = 1; k <= nn; k++) units.push({ t: b1 + (k - 1) * (rollDur / nn), ch: String((k + (12 - nn) + 100) % 10), dur: (rollDur / nn) * 1.6 });
      for (let k = 2; k < this.beats.length; k++) if (this.beats[k]! < this.end - 0.05) units.push(land(this.beats[k]!, String((2 + k - 1) % 10), 0.09));
    }
    this.mods.push(mk(SECX[0]!, SEC.top, SEC.w, SEC.h, true, tens), mk(SECX[1]!, SEC.top, SEC.w, SEC.h, true, units));
  }

  /** A flat printed plane covering the clock-px rect (px0,py0)–(px1,py1) at depth z; texture k px per clock px. */
  private plate(px0: number, py0: number, px1: number, py1: number, z: number, k: number): Plate {
    const cv = document.createElement('canvas');
    const kk = k * SCALE;
    cv.width = Math.round((px1 - px0) * kk); cv.height = Math.round((py1 - py0) * kk);
    const c = cv.getContext('2d')!;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.anisotropy = 8;
    const mat = this.mat(PLATE_FRAG, { tex: { value: tex }, opacity: { value: 1 }, hot: { value: 0.9 } }, { transparent: true, depthWrite: false, depthTest: true });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry((px1 - px0) / 100, (py1 - py0) / 100), mat);
    mesh.position.set(wx((px0 + px1) / 2), wy((py0 + py1) / 2), z);
    mesh.frustumCulled = false; mesh.renderOrder = 2;
    this.world.add(mesh);
    return { mesh, mat, cv, c, tex, px0, py0, k: kk };
  }
  private begin(p: Plate) {
    const c = p.c;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, p.cv.width, p.cv.height);
    c.setTransform(p.k, 0, 0, p.k, -p.px0 * p.k, -p.py0 * p.k);
    c.textBaseline = 'alphabetic';
    return c;
  }

  private drawFace() {
    const c = this.begin(this.face);
    const fs = 14;
    c.font = font(this.fMonoM, fs);
    const ly = CY + CH + 24;
    c.fillStyle = rgba('ash', 0.8);
    c.fillText('HH', CARDX[0]!, ly);
    c.fillText('MM', CARDX[2]!, ly);
    c.fillText('SS', SECX[0]! - 14 - measure('SS', this.fMonoM, fs), SEC.top + SEC.h / 2 + fs * 0.35);
    const lt = 'LOCAL TIME  ·  24 H';
    c.fillStyle = rgba('graphite', 1);
    c.fillText(lt, CARDX[1]! + CW - measure(lt, this.fMonoM, fs), ly);
    this.face.tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ camera
  private pose(t: number): Pose {
    const D = this.D;
    // the target sits in the unit (z = TZ); the hand-off distance puts the rail plane at clock's 64 px/unit
    const TZ = -0.4, dH = D0 + (ZR - TZ);
    const T = new THREE.Vector3(0, 0, TZ);
    let phi = 0, psi = 0, d = dH, roll = 0;
    // the crane in the silence: up and round the unit, slowly, from the hand-off framing
    const k = ease.inOutCubic(prog(t, this.t0 + 0.1, D));
    phi = lerp(0, -27 * deg, k); psi = lerp(0, 14 * deg, k); d = lerp(dH, 37, k);
    T.set(lerp(0, -0.3, k), lerp(0, -0.1, k), TZ);
    for (const s of this.syl) d -= 0.3 * pulse(t, s, 0.05);
    if (t >= D) {
      const s = ease.outExpo(clamp((t - D) / 0.15));
      const lt = t - D;
      phi = lerp(-27 * deg, -21 * deg, s) + 6 * deg * lt / 2.3;
      psi = lerp(14 * deg, 8 * deg, s) - 1.5 * deg * lt / 2.3;
      d = lerp(37, 26.5, s) - 1.8 * s * Math.pow(0.5, lt / 0.09) - 0.35 * lt;
      T.set(lerp(-0.3, -0.9, s), lerp(-0.1, -0.35, s), TZ);
      for (const dd of this.downs) d -= 1.4 * ease.outExpo(clamp((t - dd) / 0.4));
      roll = -0.022 * Math.pow(0.5, lt / 0.07) * Math.cos(lt * 40);
    }
    return { T, phi, psi, d, roll };
  }
  private setCam(cam: THREE.PerspectiveCamera, p: Pose) {
    const { T, phi, psi, d } = p;
    cam.position.set(T.x + d * Math.sin(phi) * Math.cos(psi), T.y + d * Math.sin(psi), T.z + d * Math.cos(phi) * Math.cos(psi));
    cam.up.set(0, 1, 0);
    cam.lookAt(T);
    cam.rotateZ(p.roll);
    cam.updateMatrixWorld();
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  }
  private v = new THREE.Vector3();
  private project(cam: THREE.Camera, x: number, y: number, z: number) {
    const v = this.v.set(x, y, z).project(cam);
    return { x: (v.x + 1) * 0.5 * W, y: (1 - v.y) * 0.5 * H };
  }
  /** Screen px per world unit at a point (for sizes of 2D-drawn things). */
  private pxPerUnit(cam: THREE.PerspectiveCamera, x: number, y: number, z: number) {
    const v = this.v.set(x, y, z).applyMatrix4(cam.matrixWorldInverse);
    return (H / 2) / (Math.max(0.5, -v.z) * TAN);
  }

  // ------------------------------------------------------------------ timing helpers (as in clock)
  private lastBeat(t: number) { let b = -1e9; for (const x of this.beats) if (x <= t + 1e-4) b = x; return b; }
  private burnEdge(t: number) {
    let x = X1, heat = 0;
    const n = this.row.length;
    for (let k = 0; k < n; k++) {
      const w = this.row[k]!;
      if (t < w.start) break;
      const s = this.segs[n - 1 - k]!;
      x = lerp(s.x1, s.x0, ease.outCubic(Lyrics.wordProgress(w, t)));
      heat = 1;
    }
    const last = this.row[n - 1]!;
    if (t > last.end) heat = Math.pow(0.5, (t - last.end) / 0.12);
    return { x, heat };
  }
  /** The spark (world): idles at the hairline's right end, then rides the burn edge. */
  private sparkW(t: number) { return new THREE.Vector3(wx(this.burnEdge(t).x), RAIL_Y, ZR + 0.01); }

  // ------------------------------------------------------------------ render
  override render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const t = f.t, D = this.D;
    const { renderer } = this.ctx;
    const P = this.pose(t);
    this.setCam(this.cam, P);
    this.camU.value.copy(this.cam.position);
    const camDist = P.d;
    this.fogU.value.set(camDist * 0.95, camDist * 1.3);

    // housing: extrudes out of the dark behind the hairline
    const hk = ease.inOutCubic(prog(t, this.tHouse0, this.tHouse1));
    const dz = HOUSE.depth * lerp(0.03, 1, hk);
    this.house.scale.set(1, 1, dz / HOUSE.depth);
    this.house.position.set((HOUSE.x0 + HOUSE.x1) / 2, (HOUSE.y0 + HOUSE.y1) / 2, HOUSE.front - dz / 2);
    this.houseMat.uniforms.on!.value = smoothstep01(prog(t, this.tHouse0, this.tHouse0 + 0.5));
    this.house.visible = t >= this.tHouse0;

    this.gainU.value = 1 + 0.17 * pulse(t, D, 0.05);
    this.rimU.value = t >= D ? Math.pow(0.5, (t - D) / 0.07) : 0;
    this.updateModules(t);
    this.drawLabels(t);
    this.drawRow(t);
    this.face.mat.uniforms.opacity!.value = ease.outExpo(prog(t, this.tIn - 0.1, this.tIn + 0.2));

    clearRT(renderer, out, LIN.ink);
    renderer.setRenderTarget(out);
    renderer.render(this.world, this.cam);

    // lines in 3D
    this.buildLines(t, P);
    this.hair.render(renderer, out, this.cam);
    this.rods.render(renderer, out, this.cam);
    this.glow3.render(renderer, out, this.cam);

    // the spark (2D, projected)
    const g = this.glow; g.clear();
    const sw = this.sparkW(t);
    const sp = this.project(this.cam, sw.x, sw.y, sw.z);
    const ppu = this.pxPerUnit(this.cam, sw.x, sw.y, sw.z);
    const first = this.row[0]!, last = this.row[this.row.length - 1]!;
    sparkParticles(g, t, (tb) => {
      if (tb < this.t0 - 0.6) return null;
      this.setCam(this.scratch, this.pose(Math.max(tb, this.t0)));
      const q = this.sparkW(tb);
      return this.project(this.scratch, q.x, q.y, q.z);
    }, { rate: (tb) => (tb >= first.start && tb < last.end ? 150 : tb >= D - 0.02 && tb < D + 0.25 ? 150 : 22), rateMax: 150, life: 0.5, speed: 240, gravity: 900, intensity: 0.85, seed: 11 });
    sparkHead(g, sp.x, sp.y, t, (t < D ? 0.62 : 0.85) * Math.sqrt(ppu / 100), this.sparkI(t, f));
    g.render(renderer, out);

    // post
    const o: PostOverrides = { bloomThreshold: 1.0, bloomKnee: 0.05, halation: 0.12, bloom: 0.75, bloomRadius: 0.6, ca: 1.0, vignette: 0.45, grain: 0.055, hud: 0 };
    let shake = 0;
    for (const s of this.syl) shake += 2.5 * pulse(t, s, 0.04);
    shake += 26 * pulse(t, D, 0.06);
    const lb = this.lastBeat(t);
    if (lb > D + 0.1) shake += 4 * pulse(t, lb, 0.05);
    if (shake > 0.05) o.shake = [noise1(t * 55, 1) * shake, noise1(t * 55, 2) * shake];
    // no additive flash (it lifts the ink void to grey): the drop kicks the flaps' exposure and rim-lights the unit's edges
    o.flash = 0;
    if (lb >= D) o.zoom = 1 + 0.01 * pulse(t, lb, 0.07);
    o.bloom = 0.75 + 0.3 * pulse(t, D, 0.1);
    o.ca = 1.0 + 3 * pulse(t, D, 0.08);
    return o;
  }

  private sparkI(t: number, f: Frame) {
    const D = this.D;
    if (t < D) {
      const breathe = 0.5 + 0.5 * Math.sin((f.beat - 0.25) * Math.PI);
      return 0.62 + 0.2 * breathe + 0.5 * prog(t, D - 0.4, D, ease.inQuad);
    }
    const last = this.row[this.row.length - 1]!;
    let I = 1.05 + 0.5 * pulse(t, this.lastBeat(t), 0.08) + 1.5 * pulse(t, D, 0.12);
    if (t > last.end) I *= 0.35 + 0.65 * Math.pow(0.5, (t - last.end) / 0.1) + 0.12 * hash(frameIdx(t), 3);
    return I;
  }

  // ------------------------------------------------------------------ flaps
  private updateModules(t: number) {
    for (const m of this.mods) {
      let a = '', b = '', p = 1, tl = -9;
      for (const e of m.ev) { if (t < e.t) break; a = b; b = e.ch; p = (t - e.t) / e.dur; tl = e.t + e.dur; }
      const vis = b !== '' || a !== '' || t >= this.tIn - 0.15;
      m.top.visible = m.bot.visible = vis;
      const on = ease.outExpo(prog(t, this.tIn - 0.2, this.tIn + 0.05));
      for (const mm of [m.mt, m.mb, m.mf]) mm.uniforms.on!.value = on;
      if (p >= 1) a = b;
      const pe = ease.inQuad(clamp(p));
      let theta = pe * Math.PI;
      let front = a, back = b, topCell = b;
      // after landing: a small slap-back
      if (p >= 1) {
        const bt = t - tl;
        theta = bt < 0.09 ? Math.PI - 0.22 * Math.sin((Math.PI * bt) / 0.09) * (1 - bt / 0.09) : Math.PI;
        front = b; back = b;
      }
      const tr = m.tremble;
      if (tr && p >= 1 && t >= tr.t0 && t < tr.t1) {
        // the flap strains against its latch: it lifts off its stop, the next figure shows behind it
        const k = prog(t, tr.t0, tr.t1, ease.inQuad);
        theta = (0.06 + 0.3 * k) * (0.5 + 0.5 * Math.sin((t - tr.t0) * Math.PI * 2 * 22));
        topCell = tr.next; front = b; back = tr.next;
      }
      const flapOn = theta > 0.001 && theta < Math.PI - 0.001;
      m.flap.visible = vis && flapOn;
      m.flap.rotation.x = theta;
      m.mt.uniforms.cellF!.value = CELL(topCell);
      m.mb.uniforms.cellF!.value = CELL(a);
      m.mf.uniforms.cellF!.value = CELL(front);
      m.mf.uniforms.cellB!.value = CELL(back);
      // tone from the flap's angle to the one light (front normal (0, −sinθ, cosθ))
      const n0 = LIGHT.z;
      const ndl = -Math.sin(theta) * LIGHT.y + Math.cos(theta) * LIGHT.z;
      m.mf.uniforms.shadeF!.value = clamp((n0 - ndl) / 0.9) * 0.85;
      m.mf.uniforms.shadeB!.value = clamp((n0 + ndl) / 0.9) * 0.85;
      m.mb.uniforms.shadow!.value = theta < Math.PI / 2 ? 0.7 * Math.sin(theta) : 0.7 * Math.sin(theta) * 0.4;
    }
  }

  // ------------------------------------------------------------------ printed planes
  private drawLabels(t: number) {
    const c = this.begin(this.labels);
    const el = this.wEl, fi = this.wFif, D = this.D;
    const ant = Math.max(this.tIn + 0.1, el.start - 0.4);
    const k = ease.outExpo(prog(t, ant, ant + 0.3));
    if (k > 0) {
      const groups: [number, number][] = [[CARDX[0]!, CARDX[1]! + CW], [CARDX[2]!, CARDX[3]! + CW]];
      c.strokeStyle = rgba('bone', 0.45 * k);
      c.lineWidth = 1.6;
      for (const [a, b] of groups) {
        const e = lerp(a, b, k);
        c.beginPath(); c.moveTo(a, LBL.br + 9); c.lineTo(a, LBL.br); c.lineTo(e, LBL.br);
        if (k > 0.98) c.lineTo(b, LBL.br + 9);
        c.stroke();
      }
      c.font = font(this.fLabel, LBL.size);
      {
        const sung = t >= el.start, hot = sung && t < fi.start;
        const lift = sung ? 10 * (1 - ease.outExpo(clamp((t - el.start) / 0.18))) : 0;
        c.fillStyle = hot ? rgba('signal') : sung ? rgba('bone') : rgba('bone', 0.3 * k);
        c.fillText('ELEVEN', CARDX[0]!, LBL.base + lift);
      }
      {
        const s = this.fifStr, i = this.nineAt, x = CARDX[2]!, xn = x + glyphX(s, i, this.fLabel, LBL.size);
        const sa = t >= fi.start, sb = t >= D;
        const lift = sa ? 10 * (1 - ease.outExpo(clamp((t - fi.start) / 0.18))) : 0;
        c.fillStyle = sa && !sb ? rgba('signal') : sa ? rgba('bone') : rgba('bone', 0.3 * k);
        c.fillText(s.slice(0, i), x, LBL.base + lift);
        c.fillStyle = sb && t < fi.end + 0.05 ? rgba('signal') : sb ? rgba('bone') : rgba('bone', 0.3 * k);
        c.fillText(s.slice(i), xn, LBL.base);
      }
    }
    this.labels.tex.needsUpdate = true;
  }

  private drawRow(t: number) {
    const c = this.begin(this.rowP);
    const D = this.D;
    // lyric, standing on the rail
    if (t >= D) {
      const k = ease.outExpo(prog(t, D, D + 0.25));
      c.font = font(this.fRow, this.rowSize);
      const n = this.row.length;
      for (let i = 0; i < n; i++) {
        const w = this.row[i]!;
        const sung = t >= w.start, cur = sung && (i === n - 1 || t < this.row[i + 1]!.start);
        const pop = sung ? 1 - ease.outExpo(clamp((t - w.start) / 0.16)) : 0;
        c.fillStyle = cur ? rgba('signal') : sung ? rgba('bone') : rgba('bone', 0.3 * k);
        c.fillText(w.w, this.wordX[i]!, ROW.base + (1 - k) * 18 - pop * 12);
      }
      // the readout above the rail's right end
      const edge = this.burnEdge(t);
      const pct = (100 * (edge.x - X0)) / (X1 - X0);
      const v = pct >= 99.95 ? '100.0' : pct.toFixed(1).padStart(5, ' ');
      const fs = 19;
      c.font = font(this.fMonoM, fs);
      const lab = 'TIME REMAINING', val = `${v} %`;
      const wv = measure(val, this.fMonoM, fs), wl = measure(lab, this.fMonoM, fs);
      const y = BAR.y - BAR.pad - 14;
      c.fillStyle = rgba('ash', k);
      c.fillText(lab, X1 - wv - 18 - wl, y);
      const blink = pct < 0.05 && (frameIdx(t) >> 3) % 2 === 1 ? 0.25 : 1;
      c.fillStyle = pct < 99.95 ? rgba('signal', k * blink) : rgba('bone', k);
      c.fillText(val, X1 - wv, y);
    }
    // footnotes
    const fs = 26;
    c.font = font(this.fMono, fs);
    const a = 'submission closes 23:59:59 · assignment 4';
    if (t >= this.tType0) {
      const na = Math.floor(prog(t, this.tType0, this.tType1) * a.length + 1e-6);
      c.fillStyle = rgba('ash');
      c.fillText(a.slice(0, na), X0, FOOT + 4);
      if (na < a.length || (t < this.tIn + 0.6 && Math.floor(t * 3.2) % 2 === 0)) {
        c.fillStyle = rgba('signal');
        c.fillRect(X0 + measure(a.slice(0, na), this.fMono, fs) + 3, FOOT + 4 - fs * 0.78, fs * 0.55, fs * 0.95);
      }
    }
    const b = 'time remaining is still an estimate';
    if (t >= this.tNote0) {
      const nb = Math.floor(prog(t, this.tNote0, this.tNote0 + 0.4) * b.length + 1e-6);
      c.fillStyle = rgba('ash');
      c.fillText(b.slice(0, nb), X1 - measure(b, this.fMono, fs), FOOT + 4);
    }
    this.rowP.tex.needsUpdate = true;
  }

  // ------------------------------------------------------------------ hairlines, rods, glow
  private buildLines(t: number, P: Pose) {
    const hl = this.hair, rd = this.rods, gl = this.glow3;
    hl.clear(); rd.clear(); gl.clear();
    const D = this.D;
    const cp = this.cam.position;
    const fogA = (x: number, y: number, z: number) => {
      const d = Math.hypot(x - cp.x, y - cp.y, z - cp.z);
      return Math.exp(-Math.max(0, d - P.d * 0.95) / (P.d * 1.3));
    };
    const B = LIN.bone, G = LIN.graphite, A = LIN.ash;
    const seg = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, w: number, col: [number, number, number], a: number) => {
      const f = fogA((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      hl.seg(x0, y0, z0, x1, y1, z1, w, col[0] * f, col[1] * f, col[2] * f, a);
    };

    // the floor: a hairline grid fading into the void
    const fl = ease.inOutCubic(prog(t, this.tHouse0, this.tHouse1 + 0.3));
    if (fl > 0) {
      for (let i = -14; i <= 14; i++) {
        const x = i * 1.2;
        for (let z = -12; z < 9; z += 1.5) seg(x, FLOOR, z, x, FLOOR, z + 1.5, 1, G, 0.55 * fl);
      }
      for (let j = -8; j <= 6; j++) {
        const z = j * 1.5;
        for (let x = -16.8; x < 16.8; x += 1.2) seg(x, FLOOR, z, x + 1.2, FLOOR, z, 1, G, 0.55 * fl);
      }
    }

    // module slots: hairline frames on the housing face
    const sk = ease.outExpo(prog(t, this.tIn - 0.2, this.tIn + 0.1));
    if (sk > 0) {
      for (const m of this.mods) {
        const x0 = m.x - m.w / 2 - 0.04, x1 = m.x + m.w / 2 + 0.04, y0 = m.y - m.h / 2 - 0.04, y1 = m.y + m.h / 2 + 0.04, z = -0.008;
        seg(x0, y0, z, x1, y0, z, 1.1, B, 0.22 * sk); seg(x1, y0, z, x1, y1, z, 1.1, B, 0.22 * sk);
        seg(x1, y1, z, x0, y1, z, 1.1, B, 0.22 * sk); seg(x0, y1, z, x0, y0, z, 1.1, B, 0.22 * sk);
        // hinge pins: short axles at the seam, standing proud of the face
        const pw = m.small ? 0.05 : 0.09;
        for (const px of [m.x - m.w / 2 - pw * 0.6, m.x + m.w / 2 + pw * 0.6]) rd.seg(px, m.y, 0.0, px, m.y, 0.07, pw, A[0], A[1], A[2], sk);
      }
    }

    // the colon
    const cy1 = wy(CY + CH / 2 - 82), cy2 = wy(CY + CH / 2 + 82), cx = wx(COLON_X);
    const lb = this.lastBeat(t);
    const ck = smoothstepR(this.tIn - 0.05, this.tIn + 0.2, t);
    if (t < D) {
      if (ck > 0) for (const y of [cy1, cy2]) rd.seg(cx, y, -0.01, cx + 0.001, y, -0.01, 0.34, B[0] * 0.5, B[1] * 0.5, B[2] * 0.5, ck);
    } else {
      const kick = pulse(t, lb, 0.09);
      const I = 0.9 + 3.2 * kick + 2.5 * pulse(t, D, 0.12);
      for (const y of [cy1, cy2]) {
        const r = 0.34 * (1 + 0.1 * kick);
        gl.seg(cx, y, -0.005, cx + 0.001, y, -0.005, r, LIN.signal[0] * I, LIN.signal[1] * I, LIN.signal[2] * I, 1);
        if (kick > 0.02) gl.seg(cx, y, 0.0, cx + 0.001, y, 0.0, r * 0.55, LIN.ember[0] * I * 0.8 * kick, LIN.ember[1] * I * 0.8 * kick, LIN.ember[2] * I * 0.8 * kick, kick);
      }
    }

    // the rail: a hairline until the drop, then a rod in a 3D channel on two posts
    const edge = this.burnEdge(t);
    const ex = wx(edge.x), xa = wx(X0), xb = wx(X1);
    const y = RAIL_Y, z = ZR;
    const rk = t < D ? 0 : ease.outExpo(clamp((t - D) / 0.2));
    if (rk <= 0) {
      seg(xa, y, z, ex, y, z, 1.2, B, 0.7);
    } else {
      // channel: front rails, back rails, end caps, posts to the floor
      const hh = lerp(0, 0.12, rk), zb = z - lerp(0, 0.28, rk), pd = 0.05 * rk;
      const ca = 0.42;
      for (const yy of [y - hh, y + hh]) { seg(xa - pd, yy, z, xb + pd, yy, z, 1.4, B, ca); seg(xa - pd, yy, zb, xb + pd, yy, zb, 1.1, B, ca * 0.6); }
      for (const xx of [xa - pd, xb + pd]) {
        seg(xx, y - hh, z, xx, y + hh, z, 1.4, B, ca); seg(xx, y - hh, zb, xx, y + hh, zb, 1.1, B, ca * 0.6);
        seg(xx, y - hh, z, xx, y - hh, zb, 1.1, B, ca * 0.6); seg(xx, y + hh, z, xx, y + hh, zb, 1.1, B, ca * 0.6);
      }
      // posts: outboard of the channel, clear of the footnotes, down to the floor
      for (const xx of [xa - 0.45, xb + 0.45]) {
        seg(xx, y, (z + zb) / 2, xx, lerp(y, FLOOR, rk), (z + zb) / 2, 1.3, B, ca * 0.8);
        seg(xx, y, (z + zb) / 2, xx + Math.sign(xx) * -0.4, y, (z + zb) / 2, 1.1, B, ca * 0.6);
      }
      // the rod: one bone segment per word, gaps opening on the drop
      const th = lerp(0.012, BAR.h / 100, rk);
      for (const s of this.segs) {
        const a = wx(s.x0), b = Math.min(wx(s.x1 + (1 - rk) * BAR.gap), ex);
        if (b > a + 0.005) rd.seg(a + th / 2, y, z - 0.05, b - th / 2, y, z - 0.05, th, B[0] * 0.92, B[1] * 0.92, B[2] * 0.92, 1);
      }
      // burnt: a charred core, the hot run just behind the head
      if (ex < xb) {
        seg(ex, y, z - 0.05, xb, y, z - 0.05, 1, G, 0.95);
        for (let i = 0; i < 10; i++) {
          const k2 = Math.pow(1 - i / 10, 2) * edge.heat;
          gl.seg(ex + i * 0.14, y, z - 0.05, ex + (i + 1) * 0.14, y, z - 0.05, 0.035, LIN.signal[0] * 2.4 * k2, LIN.signal[1] * 2.4 * k2, LIN.signal[2] * 2.4 * k2, 1);
        }
      }
    }
  }
}

function smoothstep01(x: number) { return x * x * (3 - 2 * x); }
function smoothstepR(a: number, b: number, x: number) { return smoothstep01(clamp((x - a) / (b - a))); }
