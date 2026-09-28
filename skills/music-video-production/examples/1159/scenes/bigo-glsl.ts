// Shaders for the `bigo` plate: the graph paper (world-space grid under a 2D camera) and a
// camera-driven streak pass (the whip up on "panic", the snap back down on the 43.45 downbeat).
import * as THREE from 'three';
import { FSPass } from '../../engine/gl';

/** World units: 1 n = UX, 1 panic = UY (world px at zoom 1). Minor grid = 1 panic, major = 1 n = 5 panic. */
export const UX = 200;
export const UY = 40;

const GRID_FRAG = /* glsl */ `
uniform vec2 uCam;     // world point at the screen centre
uniform float uZ;      // screen px per world px
uniform float uA;      // overall grid opacity (draw-in)
uniform float uCross;  // opacity of the + marks at major intersections
float gl1(float dPx, float a, float b) { return pxLine(dPx * PX_SCALE, a, b); }
void main() {
  vec2 px = FRAG_PX;                                   // logical px, y up
  vec2 w = uCam + (px - vec2(960.0, 540.0)) / uZ;      // world (y up)
  float minorPx = ${UY.toFixed(1)} * uZ;
  vec2 dm = abs(fract(w / ${UY.toFixed(1)} + 0.5) - 0.5) * minorPx;
  vec2 dM = abs(fract(w / ${UX.toFixed(1)} + 0.5) - 0.5) * ${UX.toFixed(1)} * uZ;
  float lm = max(gl1(dm.x, 0.25, 0.95), gl1(dm.y, 0.25, 0.95));
  float lM = max(gl1(dM.x, 0.35, 1.15), gl1(dM.y, 0.35, 1.15));
  float fadeMinor = smoothstep(7.0, 20.0, minorPx);
  // small + marks at the major intersections (they streak into dashes when the camera whips)
  float arm = 6.0;
  float cr = max(gl1(dM.x, 0.5, 1.4) * step(dM.y, arm), gl1(dM.y, 0.5, 1.4) * step(dM.x, arm));
  // the positive quadrant is the chart; the paper beyond it is dimmer
  float quad = mix(0.45, 1.0, smoothstep(-40.0, 0.0, min(w.x, w.y) * uZ));
  vec3 col = C_INK;
  col = mix(col, C_GRAPHITE, lm * 0.20 * fadeMinor * uA * quad);
  col = mix(col, C_GRAPHITE, lM * 0.46 * uA * quad);
  col = mix(col, C_ASH, cr * 0.55 * uA * uCross * quad);
  fragColor = vec4(col, 1.0);
}`;

export function makeGridPass() {
  return new FSPass(GRID_FRAG, {
    uCam: { value: new THREE.Vector2() }, uZ: { value: 1 }, uA: { value: 1 }, uCross: { value: 1 },
  });
}

/**
 * Streak: each pixel averages the world layer along the path its world point took over the
 * exposure (screen_prev = uA * screen + uB, logical px, y down). Centred on the frame time.
 */
const STREAK_FRAG = /* glsl */ `
uniform sampler2D uSrc;
uniform float uAff;
uniform vec2 uB;
uniform float uLMax;
void main() {
  vec2 s = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
  vec2 sp = uAff * s + uB;
  vec2 d = sp - s;
  float L = length(d);
  if (L < 0.75) { fragColor = texture(uSrc, vUv); return; }
  // cap the streak: a whip reads as long dashes, not as a grey veil
  if (L > uLMax) { d *= uLMax / L; L = uLMax; }
  int n = int(clamp(L / 1.5, 2.0, 64.0));
  vec2 duv = vec2(d.x, -d.y) / vec2(1920.0, 1080.0);
  float j = hash12(floor(FRAG_PX));
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 64; i++) {
    if (i >= n) break;
    float f = (float(i) + j) / float(n) - 0.5;
    acc += texture(uSrc, vUv + duv * f);
  }
  fragColor = acc / float(n);
}`;

export function makeStreakPass() {
  return new FSPass(STREAK_FRAG, { uSrc: { value: null }, uAff: { value: 1 }, uB: { value: new THREE.Vector2() }, uLMax: { value: 360 } });
}
