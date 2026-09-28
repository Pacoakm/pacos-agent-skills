// `bus` (11:59): the real campus — terrain grid, the bus route, roads and buildings — loaded from
// data/1159/terrain.json and campus.json (local metres: X east, Y north, Z above datum), and the
// choice of the stretch of route the plate shows (scored from the data, not hard-coded).
import { DATA_DIR } from '../../song';
import { clamp } from '../../engine/util';

export interface TerrainJSON {
  credit: string;
  grid: { cell: number; nx: number; ny: number; x0: number; y0: number; z: number[] };
  contours: { z: number; pts: [number, number][] }[];
}
export interface CampusJSON {
  credit: string;
  route: [number, number, number][];
  roads: { cls: string; bridge: boolean; tunnel: boolean; pts: [number, number, number][] }[];
  buildings: { pts: [number, number][]; base: number; h: number; h_known: boolean }[];
  university_station: [number, number];
}

export async function loadGeo() {
  const [t, c] = await Promise.all([
    fetch(`${DATA_DIR}terrain.json`).then((r) => r.json() as Promise<TerrainJSON>),
    fetch(`${DATA_DIR}campus.json`).then((r) => r.json() as Promise<CampusJSON>),
  ]);
  return new Geo(t, c);
}

const bs = (u: number) => {
  // uniform cubic B-spline weights for offsets -1, 0, 1, 2
  const u2 = u * u, u3 = u2 * u;
  return [(1 - 3 * u + 3 * u2 - u3) / 6, (4 - 6 * u2 + 3 * u3) / 6, (1 + 3 * u + 3 * u2 - 3 * u3) / 6, u3 / 6];
};

export class Geo {
  nx: number; ny: number; cell: number; gx0: number; gy0: number;
  z: Float32Array;
  constructor(public t: TerrainJSON, public c: CampusJSON) {
    const g = t.grid;
    this.nx = g.nx; this.ny = g.ny; this.cell = g.cell; this.gx0 = g.x0; this.gy0 = g.y0;
    // a separable Gaussian (sigma 15 m) takes the canopy speckle out of the surface model: the
    // figure draws the lie of the land, not the treetops
    const src = Float32Array.from(g.z), tmp = new Float32Array(src.length), z = new Float32Array(src.length);
    const K = [-3, -2, -1, 0, 1, 2, 3].map((k) => Math.exp(-(k * k) / (2 * 1.5 * 1.5)));
    const ks = K.reduce((a, b) => a + b, 0);
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
      let s = 0;
      for (let k = -3; k <= 3; k++) s += K[k + 3]! * src[j * g.nx + clamp(i + k, 0, g.nx - 1)]!;
      tmp[j * g.nx + i] = s / ks;
    }
    for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++) {
      let s = 0;
      for (let k = -3; k <= 3; k++) s += K[k + 3]! * tmp[clamp(j + k, 0, g.ny - 1) * g.nx + i]!;
      z[j * g.nx + i] = s / ks;
    }
    this.z = z;
  }
  /** Smooth (cubic B-spline) height in metres at local (X east, Y north). */
  h(X: number, Y: number): number {
    const fi = (X - this.gx0) / this.cell, fj = (this.gy0 - Y) / this.cell; // row 0 = north
    const i0 = Math.floor(fi), j0 = Math.floor(fj);
    const wi = bs(fi - i0), wj = bs(fj - j0);
    const { nx, ny, z } = this;
    let s = 0;
    for (let b = 0; b < 4; b++) {
      const j = clamp(j0 - 1 + b, 0, ny - 1);
      let r = 0;
      for (let a = 0; a < 4; a++) r += wi[a]! * z[j * nx + clamp(i0 - 1 + a, 0, nx - 1)]!;
      s += wj[b]! * r;
    }
    return s;
  }
}

// ------------------------------------------------------------------ the route, resampled
export interface RouteS { X: number[]; Y: number[]; S: number[]; len: number }
export function resampleRoute(pts: [number, number, number][], step = 2): RouteS {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const len = cum[cum.length - 1]!;
  const X: number[] = [], Y: number[] = [], S: number[] = [];
  let k = 0;
  for (let s = 0; s <= len; s += step) {
    while (k < cum.length - 2 && cum[k + 1]! < s) k++;
    const u = (s - cum[k]!) / Math.max(1e-6, cum[k + 1]! - cum[k]!);
    X.push(pts[k]![0] + (pts[k + 1]![0] - pts[k]![0]) * u);
    Y.push(pts[k]![1] + (pts[k + 1]![1] - pts[k]![1]) * u);
    S.push(s);
  }
  // soften the corners a little (a bus does not turn on a point): a few passes of a 5-tap average
  for (let pass = 0; pass < 3; pass++) {
    const X2 = X.slice(), Y2 = Y.slice();
    for (let i = 2; i < X.length - 2; i++) {
      X2[i] = (X[i - 2]! + 2 * X[i - 1]! + 3 * X[i]! + 2 * X[i + 1]! + X[i + 2]!) / 9;
      Y2[i] = (Y[i - 2]! + 2 * Y[i - 1]! + 3 * Y[i]! + 2 * Y[i + 1]! + Y[i + 2]!) / 9;
    }
    X.splice(0, X.length, ...X2); Y.splice(0, Y.length, ...Y2);
  }
  return { X, Y, S, len };
}

export interface Pick {
  s0: number;        // route metres where the text starts
  psi1: number;      // act 1 view heading (radians clockwise from north)
  psi2: number;      // act 2 view heading
  score: number;
}
/**
 * Choose the stretch the plate shows: the lyric (act-1 length L1, act-2 length L2, in metres) must
 * run left-to-right for a camera looking along psi (and psi2 in act 2), the camera should look
 * uphill, the road should climb (most of all in act 2), and YOUR STOP (at `stopAt` metres into the
 * text) should stand among buildings.
 */
export function pickStretch(geo: Geo, R: RouteS, L1: number, L2: number, pre: number, stopAt: number, centroids: [number, number][], ex: number, pitch = 0.42): Pick {
  const n = R.X.length, step = R.S[1]! - R.S[0]!;
  const zs = R.X.map((x, i) => geo.h(x, R.Y[i]!));
  const tanAt = (i: number) => {
    const a = Math.max(0, i - 4), b = Math.min(n - 1, i + 4);
    const dx = R.X[b]! - R.X[a]!, dy = R.Y[b]! - R.Y[a]!, l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l, (zs[b]! - zs[a]!) / l] as const;
  };
  // how well the road reads left to right on screen for a camera looking along psi (pitched down)
  const readable = (i0: number, i1: number, psi: number) => {
    const rx = Math.cos(psi), ry = -Math.sin(psi), fx = Math.sin(psi), fy = Math.cos(psi);
    let s = 0, c = 0;
    for (let i = i0; i < i1; i += 2) {
      const [tx, ty, sl] = tanAt(i);
      const sx = tx * rx + ty * ry, sy = (tx * fx + ty * fy) * Math.sin(pitch) + sl * ex * Math.cos(pitch);
      const ang = Math.atan2(sy, sx);
      const v = sx > 0 ? Math.cos(ang) * (Math.abs(ang) < 0.6 ? 1 : 0.3) : -1.5;
      s += v * Math.hypot(sx, sy); c++;
    }
    return c ? s / c : -1;
  };
  let zMin = Infinity, zMax = -Infinity;
  for (const z of zs) { zMin = Math.min(zMin, z); zMax = Math.max(zMax, z); }
  let best: Pick = { s0: 0, psi1: 0, psi2: 0, score: -1e9 };
  for (let s0 = 0; s0 + pre + L1 + L2 < R.len - 1; s0 += 10) {
    const i0 = Math.round((s0 + pre) / step), i1 = Math.round((s0 + pre + L1) / step), i2 = Math.min(n - 1, Math.round((s0 + pre + L1 + L2) / step));
    const iStop = Math.round((s0 + pre + stopAt) / step);
    let dens = 0;
    for (const [x, y] of centroids) if (Math.hypot(x - R.X[iStop]!, y - R.Y[iStop]!) < 120) dens++;
    const climb = zs[i2]! - zs[i0]!;
    const im = (i0 + i2) >> 1;
    const high = (zs[im]! - zMin) / Math.max(1, zMax - zMin); // up on the campus, not down by the station
    for (let k = 0; k < 24; k++) {
      const psi = (k * Math.PI) / 12;
      const r1 = readable(i0, i1, psi);
      if (r1 < 0.7 || readable(i0, i0 + Math.round(L1 * 0.3 / step), psi) < 0.6) continue; // it must read from its first word
      let r2 = -9, p2 = psi;
      for (const dp of [-0.6, -0.3, 0, 0.3, 0.6]) { const v = readable(i1, i2, psi + dp); if (v > r2) { r2 = v; p2 = psi + dp; } }
      if (r2 < 0.7) continue;
      const dx = Math.sin(psi), dy = Math.cos(psi);
      const up = (geo.h(R.X[im]! + dx * 150, R.Y[im]! + dy * 150) - geo.h(R.X[im]! - dx * 150, R.Y[im]! - dy * 150)) / 300;
      if (up < 0.05) continue; // look up the hill, not down it
      const score = 2 * r1 + 2 * r2 + climb / 10 + Math.min(dens, 12) / 8 + 12 * up + 4 * high;
      if (score > best.score) best = { s0, psi1: psi, psi2: p2, score };
    }
  }
  return best;
}
