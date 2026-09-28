// `stack2` (11:59): the front faces of the call frames, printed once into one atlas texture.
// Channel-coded like the 2D plate (drawn with 'lighter' onto black): R = printed ink (labels, locals,
// the divider, the cup), G = the lyric words (stamped by the slab shader as they are sung), B = hatch
// knock-out behind the caller frames' labels. Each frame has its own cell with the face's aspect; the
// layout is the 2D plate's, in its page px (a face is 780 px wide), scaled up for the texture.
import * as THREE from 'three';
import { F, font, measure } from '../../engine/type';
import { cupBody, WORD_BASE, WORD_FAMILY, WORD_SIZE } from './stack';

export const FACE_W = 780;          // face width in the 2D plate's page px
export const CELL_W = 1800;         // texture px across a face
const K = CELL_W / FACE_W;
const PAD = 10;

const PRINT = (a = 1) => `rgba(255,0,0,${a})`;
const WORDS = (a = 1) => `rgba(0,255,0,${a})`;
const KNOCK = (a = 1) => `rgba(0,0,255,${a})`;

export interface FaceWord { text: string; x: number; w: number }
export interface FaceDef { label: string; local: string; caller: boolean; coffee: boolean; hPx: number; words: FaceWord[] }
export interface Cell { u0: number; v0: number; u1: number; v1: number }

/** The glyph centre of the cup on a pushed frame's face (face px from the top left). */
export const CUP_AT = { x: FACE_W - 92, y: 84 };

export function buildAtlas(faces: FaceDef[]): { tex: THREE.CanvasTexture; cells: Cell[] } {
  const hs = faces.map((f) => Math.round(f.hPx * K));
  const H = hs.reduce((s, h) => s + h + PAD * 2, 0);
  const cv = document.createElement('canvas');
  cv.width = CELL_W; cv.height = H;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000';
  c.fillRect(0, 0, CELL_W, H);
  c.globalCompositeOperation = 'lighter';
  c.textBaseline = 'alphabetic';
  const cells: Cell[] = [];
  let y = 0;
  faces.forEach((f, i) => {
    y += PAD;
    const h = hs[i]!;
    cells.push({ u0: 0, v0: y / H, u1: 1, v1: (y + h) / H });
    c.save();
    c.beginPath(); c.rect(0, y, CELL_W, h); c.clip();
    c.translate(0, y);
    c.scale(K, h / f.hPx);
    drawFace(c, f);
    c.restore();
    y += h + PAD;
  });
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.flipY = false;
  return { tex, cells };
}

function drawFace(c: CanvasRenderingContext2D, f: FaceDef) {
  const W = FACE_W, h = f.hPx;
  if (f.caller) {
    // label on a knocked-out strip (the slab shader hatches the rest of the face at 45°)
    c.font = font(F.mono(500), 14);
    const lw = measure(f.label, F.mono(500), 14);
    c.fillStyle = KNOCK(1);
    c.fillRect(12, h / 2 - 9, lw + 12, 18);
    c.fillStyle = PRINT(0.9);
    c.fillText(f.label, 18, h / 2 + 5);
    if (f.local) {
      c.font = font(F.mono(400), 12);
      const lw2 = measure(f.local, F.mono(400), 12);
      c.fillStyle = KNOCK(1);
      c.fillRect(W - 18 - lw2 - 6, h / 2 - 8, lw2 + 12, 16);
      c.fillStyle = PRINT(0.6);
      c.fillText(f.local, W - 18 - lw2, h / 2 + 4);
    }
    return;
  }
  c.font = font(F.mono(500), 15);
  c.fillStyle = PRINT(1);
  c.fillText(f.label, 18, 25);
  c.font = font(F.mono(400), 12);
  c.fillStyle = PRINT(0.6);
  c.textAlign = 'right';
  c.fillText(f.local, W - 18, 24);
  c.textAlign = 'left';
  c.fillStyle = PRINT(0.35);
  c.fillRect(18, 34, W - 36, 1);
  if (f.coffee) {
    c.save();
    c.translate(CUP_AT.x, CUP_AT.y);
    c.strokeStyle = PRINT(1);
    c.lineWidth = 1.5;
    cupBody(c);
    c.restore();
  }
  c.font = font(WORD_FAMILY, WORD_SIZE);
  c.fillStyle = WORDS(1);
  for (const w of f.words) c.fillText(w.text, w.x, WORD_BASE);
}

/** The orange rubber stamp for the top face: mottled ink with voids, in the alpha channel. */
export function buildStamp(noise2: (x: number, y: number, s: number) => number): { tex: THREE.CanvasTexture; aspect: number } {
  const w = 900, h = 250, s = 2;
  const cv = document.createElement('canvas');
  cv.width = w * s; cv.height = h * s;
  const c = cv.getContext('2d')!;
  c.scale(s, s);
  c.strokeStyle = '#000'; c.fillStyle = '#000';
  c.lineWidth = 8; c.strokeRect(8, 8, w - 16, h - 16);
  c.lineWidth = 2.4; c.strokeRect(22, 22, w - 44, h - 44);
  c.font = font(F.mono(700), 74);
  c.fillText('RecursionError:', 52, 112);
  c.font = font(F.mono(500), 34);
  c.fillText('maximum caffeine depth exceeded', 56, 172);
  c.font = font(F.mono(400, true), 34);
  c.fillText('(again)¹', 56 + measure('maximum caffeine depth exceeded ', F.mono(500), 34), 172);
  const img = c.getImageData(0, 0, cv.width, cv.height);
  const d = img.data;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    const i = (y * cv.width + x) * 4 + 3;
    if (!d[i]) continue;
    const px = x / s, py = y / s;
    const n = noise2(px * 0.08, py * 0.08, 3) * 0.5 + noise2(px * 0.27, py * 0.27, 5) * 0.32 + noise2(px * 0.95, py * 0.95, 7) * 0.18;
    const press = noise2(px * 0.006 + 4, py * 0.006, 9);
    const v = Math.min(1, Math.max(0, (n + 0.46 + 0.25 * press) / 0.22));
    d[i] = Math.round(d[i]! * v * (0.8 + 0.2 * press));
  }
  c.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 8;
  return { tex, aspect: w / h };
}
