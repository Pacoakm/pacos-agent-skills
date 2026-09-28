// `bigo2` (chorus 2): shaders for O(n²) as a 3D paraboloid over graph paper.
//  - FLOOR: the graph-paper floor (y = 0): chorus 1's grid (1 panic minor, 1 n major, + marks), fogged.
//  - BOWL: the surface panic = x² + z² (y = K·panic): an ink shell engraved with its own lifted
//    graph-paper grid (the x = const and z = const lines ride the surface as parabolas), fine contour
//    hatching where it turns from the light, a hairline rim. Depth-writes so every hairline behind it
//    is hidden (a technical figure's hidden-line drawing).
//  - SHEET: the O(1) plane (y = K): a raised ink sheet with a finer grid and a bone edge; it
//    materialises when the spark lands.
import * as THREE from 'three';
import { GLSL_COMMON } from '../../engine/glsl/common';

/** Height per unit of panic (world). */
export const K = 0.3;
/** Bowl radius (world = n). */
export const RM = 5.0;
/** The O(1) sheet: panic = 1. */
export const YS = K;
/** The cutaway wedge (toward the viewer): centre azimuth in the xz plane (atan2(z, x)) and half-width. */
export const CUT = { a: (96 * Math.PI) / 180, h: (72 * Math.PI) / 180 };
/** Sheet extent (world x0, x1, z0, z1). */
export const SHEET = { x0: -13, x1: 12.5, z0: -10, z1: 11.6 };

export const VERT = /* glsl */ `
precision highp float;
in vec3 position;
uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix;
out vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const HEAD = /* glsl */ `
precision highp float;
precision highp int;
in vec3 vWorld;
out vec4 fragColor;
${GLSL_COMMON}
uniform vec3 camPos;
uniform vec2 fog;   // distance where fog starts, falloff length (world)
float fogK() { return exp(-max(0.0, length(vWorld - camPos) - fog.x) / fog.y); }
// a hairline at the integer lines of coordinate u, width in physical px
float gridL(float u, float a, float b) { float fw = max(fwidth(u), 1e-5); return pxLine(abs(fract(u + 0.5) - 0.5) / fw, a, b); }
`;

export const FLOOR_FRAG = /* glsl */ `${HEAD}
uniform float on;
uniform float hide;  // 0..1: the sheet covers the floor inside its extent
uniform vec4 sheetR; // x0 x1 z0 z1
void main() {
  vec2 q = vWorld.xz;
  float minor = gridL(q.x * 5.0, 0.25, 0.95);
  minor = max(minor, gridL(q.y * 5.0, 0.25, 0.95));
  float cellPx = 0.2 / max(max(fwidth(q.x), fwidth(q.y)), 1e-5) / PX_SCALE;
  float fm = smoothstep(4.0, 12.0, cellPx);
  float major = max(gridL(q.x, 0.35, 1.15), gridL(q.y, 0.35, 1.15));
  vec2 dM = abs(fract(q + 0.5) - 0.5) / max(fwidth(q), vec2(1e-5));
  float arm = 0.07 / max(max(fwidth(q.x), fwidth(q.y)), 1e-5);
  float cr = max(pxLine(dM.x, 0.5, 1.4) * step(dM.y, arm), pxLine(dM.y, 0.5, 1.4) * step(dM.x, arm));
  vec3 col = C_INK;
  col = mix(col, C_GRAPHITE, minor * 0.18 * fm);
  col = mix(col, C_GRAPHITE, major * 0.42);
  col = mix(col, C_ASH, cr * 0.5);
  float inS = step(sheetR.x, q.x) * step(q.x, sheetR.y) * step(sheetR.z, q.y) * step(q.y, sheetR.w);
  col = mix(col, C_INK, inS * hide);
  fragColor = vec4(mix(C_INK, col, fogK() * on), 1.0);
}`;

export const BOWL_FRAG = /* glsl */ `${HEAD}
uniform float K3;
uniform float Rm;
uniform vec3 lightDir;
uniform float on;
uniform float lvl[4];   // lit contour levels (panic), and their strength
uniform float lvlA[4];
uniform vec2 cut;       // the cutaway wedge: centre azimuth, half-width (rad), in the xz plane
void main() {
  vec2 q = vWorld.xz;
  float r = length(q);
  float da = abs(mod(atan(q.y, q.x) - cut.x + PI, TAU) - PI);
  if (da < cut.y) discard;
  // surface normal (up side = the inside of the bowl)
  vec3 n = normalize(vec3(-2.0 * K3 * q.x, 1.0, -2.0 * K3 * q.y));
  bool inside = gl_FrontFacing;
  vec3 nn = inside ? n : -n;
  float light = sat(dot(nn, normalize(lightDir)));
  // the lifted grid: major every 1, minor every 0.5
  float major = max(gridL(q.x, 0.35, 1.2), gridL(q.y, 0.35, 1.2));
  float minor = max(gridL(q.x * 2.0, 0.25, 0.9), gridL(q.y * 2.0, 0.25, 0.9));
  float cellPx = 0.5 / max(max(fwidth(q.x), fwidth(q.y)), 1e-5) / PX_SCALE;
  float fm = smoothstep(5.0, 14.0, cellPx);
  // contour hatching (lines of equal panic), denser where the surface turns from the light
  float pan = vWorld.y / K3;
  float dark = sat(0.85 - light) * (inside ? 0.55 : 0.8);
  float u = pan * 3.0;
  float hh = hatch(u, dark * 0.5);
  float hl = smoothstep(0.25, 0.6, fwidth(u) * PX_SCALE);
  float hatchT = mix(hh, dark * 0.25, hl) * smoothstep(0.05, 0.2, dark);
  // lit level rings (the steps)
  float ring = 0.0;
  for (int i = 0; i < 4; i++) {
    float fw = max(fwidth(pan), 1e-5);
    ring = max(ring, pxLine(abs(pan - lvl[i]) / fw, 0.6, 1.8) * lvlA[i]);
  }
  // rim
  float fr = max(fwidth(r), 1e-5);
  float rim = pxLine(abs(r - Rm + 0.012) / fr, 0.6, 1.8);
  vec3 col = inside ? C_INK2 * 1.15 : C_INK * 1.1;
  col = mix(col, C_GRAPHITE * 0.9, hatchT * 0.9);
  col = mix(col, C_GRAPHITE, minor * fm * 0.3);
  col = mix(col, C_BONE * (inside ? 0.62 : 0.42), major * 0.85);
  col = mix(col, C_BONE * 0.9, ring);
  col = mix(col, C_BONE * 0.95, rim);
  fragColor = vec4(mix(C_INK, col, fogK() * on), 1.0);
}`;

export const SHEET_FRAG = /* glsl */ `${HEAD}
uniform float on;
uniform vec4 sheetR;
void main() {
  vec2 q = vWorld.xz;
  if (on <= 0.001) discard;
  float minor = max(gridL(q.x * 4.0, 0.25, 0.9), gridL(q.y * 4.0, 0.25, 0.9));
  float cellPx = 0.25 / max(max(fwidth(q.x), fwidth(q.y)), 1e-5) / PX_SCALE;
  float fm = smoothstep(4.0, 12.0, cellPx);
  float major = max(gridL(q.x, 0.35, 1.1), gridL(q.y, 0.35, 1.1));
  vec2 fw = max(fwidth(q), vec2(1e-5));
  vec2 de = min(q - sheetR.xz, sheetR.yw - q) / fw;
  float edge = pxLine(min(de.x, de.y), 0.6, 1.7);
  vec3 col = C_INK2 * 1.05;
  col = mix(col, C_GRAPHITE, minor * 0.16 * fm);
  col = mix(col, C_GRAPHITE, major * 0.4);
  col = mix(col, C_BONE * 0.8, edge);
  fragColor = vec4(mix(C_INK, col, fogK()) * on, on);
}`;

/** The bowl surface as a polar mesh (y = K r²), r in [0, RM]. */
export function bowlGeometry(nr = 220, ns = 360) {
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= nr; i++) {
    const r = RM * Math.pow(i / nr, 0.85);
    for (let j = 0; j <= ns; j++) {
      const a = (j / ns) * Math.PI * 2;
      pos.push(r * Math.cos(a), K * r * r, r * Math.sin(a));
    }
  }
  const row = ns + 1;
  for (let i = 0; i < nr; i++) for (let j = 0; j < ns; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}
