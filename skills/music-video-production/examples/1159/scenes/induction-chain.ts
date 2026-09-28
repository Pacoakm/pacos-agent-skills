// `induction` (11:59): the domino chain as a pure function of time.
// Dominoes stand on the page (y = 0) in a row along +x and topple toward +x about their front bottom
// edge. The schedule is keyed to kicks: domino i starts falling at K[i] and its tip meets domino i+1
// exactly on K[i+1] (the hit lands on the kick). A falling domino can't pass through the next one: its
// angle is capped by the contact with the next domino's back face, so the chain shingles down the way a
// real one does. The last falling domino (n) lands flat, one domino short of n+1, which only wobbles.
import * as THREE from 'three';
import { clamp, ease, hash, pulse, springStep, TAU } from '../../engine/util';

export const DOM = { h: 2.0, w: 1.0, th: 0.3 };
export const LABELS = ['1', '2', '3', '4', 'n', 'n + 1'];
// centres along x: equal steps, a slightly longer one across the ellipsis, and one missing domino
// before n + 1 (n lying flat stops just short of it)
export const GAP = 0.2;
export const XS = (() => {
  const x = [0, 1.25, 2.5, 3.75, 5.3];
  x.push(x[4]! + DOM.th + DOM.h + GAP);
  return x;
})();
export const N = XS.length;
const HALF_PI = Math.PI / 2;

export interface ChainTimes {
  hit: number;       // the drum entry: the dominoes rise out of the page
  kicks: number[];   // every kick in the plate (for the table jolt)
  K: number[];       // K[0] tap on domino 1, K[i+1] contact i -> i+1, K[4 + 1] = n lands flat
  after: number[];   // kicks after the landing (n + 1 is shaken again)
}

/** Rise out of the page on the hit (0 → 1 with a little overshoot), staggered along the row. */
export function rise(i: number, t: number, hit: number) {
  const s = springStep(t - (hit + 0.012 + i * 0.03), 3.1, 0.5);
  return clamp(s, 0, 1.3);
}

function freeAngle(i: number, t: number, T: ChainTimes) {
  const K = T.K;
  if (t <= K[i]!) return 0;
  const d = XS[i + 1]! - XS[i]!;
  const target = i < N - 2 ? Math.asin((d - DOM.th) / DOM.h) : HALF_PI;
  const u = (t - K[i]!) / (K[i + 1]! - K[i]!);
  const g = u <= 1 ? 0.3 * u + 0.7 * u * u : 1 + 1.7 * (u - 1) + 2.5 * (u - 1) * (u - 1);
  let a = Math.min(HALF_PI, target * g);
  if (i === N - 2 && t > K[i + 1]!) {
    // n hits the page: a small rebound, then it lies still
    const s = t - K[i + 1]!;
    a = HALF_PI - 0.07 * Math.abs(Math.sin((Math.PI * s) / 0.12)) * Math.exp(-s / 0.07);
  }
  return a;
}

/** Topple angles (radians, toward +x) of the falling dominoes at t; the last entry is n + 1 (always 0). */
export function angles(t: number, T: ChainTimes): number[] {
  const a: number[] = [];
  for (let i = 0; i < N - 1; i++) a.push(freeAngle(i, t, T));
  a.push(0);
  for (let i = N - 3; i >= 0; i--) {
    const d = XS[i + 1]! - XS[i]!;
    const nx = a[i + 1]!;
    const lim = nx + Math.asin(clamp((d * Math.cos(nx) - DOM.th - 0.025) / DOM.h, -1, 1)); // a hair of clearance: no interpenetration
    if (a[i]! > lim) a[i] = lim;
  }
  return a;
}

/** n + 1's rocking (radians; + toward +x, rocking on its front edge; − on its back edge). */
export function rock(t: number, T: ChainTimes) {
  const land = T.K[N - 1]!;
  let r = 0;
  if (t > land) {
    const s = t - land;
    r += 0.085 * Math.exp(-s / 0.42) * Math.sin(TAU * 2.1 * s);
  }
  for (const k of T.after) if (t > k) { const s = t - k; r += 0.032 * Math.exp(-s / 0.35) * Math.sin(TAU * 2.3 * s + 0.3); }
  // never quite settles: a tremble that is still there on the cut
  if (t > land) r += 0.006 * Math.sin(TAU * 1.9 * (t - land)) * clamp((t - land) / 0.8);
  return r;
}

/** The table jolts on every kick: a small hop and twist (standing dominoes only). */
export function jolt(i: number, t: number, T: ChainTimes): { hop: number; tw: number } {
  let hop = 0, tw = 0;
  for (const k of T.kicks) {
    if (t < k || t > k + 0.4) continue;
    const s = t - k;
    const p = Math.exp(-s / 0.045);
    hop += 0.045 * p * Math.max(0, Math.sin(TAU * 4.5 * s + 0.4));
    tw += 0.011 * (hash(k * 100, i) - 0.5) * 2 * Math.exp(-s / 0.09) * Math.cos(TAU * 6 * s);
  }
  return { hop, tw };
}

const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _t = new THREE.Matrix4(), _s = new THREE.Matrix4();

/** Model matrix of domino i: rotation theta (toward +x) about its front bottom edge (back edge if theta < 0). */
export function slabMatrix(out: THREE.Matrix4, i: number, theta: number, riseK: number, hop: number, twist: number) {
  const x = XS[i]!;
  const s = Math.max(1e-3, riseK);
  const px = theta >= 0 ? x + DOM.th / 2 : x - DOM.th / 2;
  out.identity();
  out.multiply(_t.makeTranslation(px, 0, 0));
  out.multiply(_r.makeRotationZ(-theta));
  out.multiply(_t.makeTranslation(-px, 0, 0));
  out.multiply(_t.makeTranslation(x, hop + (DOM.h / 2) * s, 0));
  if (twist) out.multiply(_m.makeRotationY(twist));
  out.multiply(_s.makeScale(1, s, 1));
  return out;
}

/** World position of a local point (box units, centred) of a slab. */
export function slabPoint(m: THREE.Matrix4, lx: number, ly: number, lz: number) {
  return new THREE.Vector3(lx, ly, lz).applyMatrix4(m);
}

export const easeHit = ease.outExpo;
export { pulse };
