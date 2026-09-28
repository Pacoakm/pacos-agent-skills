// `induction` (11:59): shaders for the 3D proof figure on bone paper.
//  - PAPER_BG: the sheet itself (screen space): bone, a low cloud, short fibres, light raking.
//  - PAGE: the page plane (y = 0) in perspective. It prints the figure (a canvas texture of hairline
//    ink: number line, footprints, frame, caption) and the dominoes' cast shadows as 45° hatching,
//    and is drawn with multiply blending over the paper, so ink is a transmittance the way print is.
//  - SLAB: the dominoes. Flat bone faces with engraved hatching that follows each face, density from
//    the face's angle to one fixed light (no lamp gradients), crosshatch in deep shade, cast shadows
//    from the other slabs, ink hairline edges. Depth reads through line weight and fog into paper.
import { GLSL_COMMON } from '../../engine/glsl/common';

export const MAX_BOX = 8;

export const PAPER_BG = /* glsl */ `
uniform vec2 drift;   // slow parallax of the grain with the camera (logical px)
float fibres(vec2 p, float cs) {
  float acc = 0.0;
  vec2 cell = floor(p / cs);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = cell + vec2(float(i), float(j));
    vec2 o = (c + hash22(c)) * cs;
    float a = hash12(c + 7.3) * TAU;
    float L = cs * (0.35 + 1.2 * hash12(c + 2.9));
    vec2 d = vec2(cos(a), sin(a));
    float dist = sdSegment(p, o - d * L * 0.5, o + d * L * 0.5);
    acc += (hash12(c + 9.1) - 0.5) * (1.0 - smoothstep(0.2, 1.1, dist));
  }
  return acc;
}
void main() {
  vec2 pp = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0) + drift;
  float cloud = fbm(pp * 0.0019, 4);
  float fib = fibres(pp, 21.0) + 0.55 * fibres(pp * 1.63 + 17.0, 21.0);
  float speck = step(0.99975, hash12(floor(pp * 0.5)));
  vec3 paper = C_BONE * (0.972 + 0.03 * cloud + 0.04 * fib);
  paper *= 1.0 - speck * 0.3;
  paper *= 0.965 + 0.035 * (1.0 - vUv.y * 0.55 - (1.0 - vUv.x) * 0.35);
  vec2 dc = vUv - 0.5;
  paper *= 1.0 - 0.12 * pow(length(dc * vec2(1.0, 0.85)) * 1.5, 2.6);
  fragColor = vec4(paper, 1.0);
}`;

const BOX_GLSL = /* glsl */ `
uniform mat4 boxInv[${MAX_BOX}];
uniform float boxOn[${MAX_BOX}];
uniform vec3 boxHalf;
uniform vec3 lightDir;
// does the ray (world) toward the light hit box i?
bool hitBox(vec3 ro, vec3 rd, int i) {
  mat4 m = boxInv[i];
  vec3 o = (m * vec4(ro, 1.0)).xyz;
  vec3 d = (m * vec4(rd, 0.0)).xyz;
  d = mix(d, vec3(1e-5), step(abs(d), vec3(1e-5)));
  vec3 t0 = (-boxHalf - o) / d, t1 = (boxHalf - o) / d;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), tn.z), b = min(min(tf.x, tf.y), tf.z);
  return b > max(a, 0.0);
}
float shadowAt(vec3 p, int skip) {
  for (int i = 0; i < ${MAX_BOX}; i++) {
    if (i == skip || boxOn[i] < 0.5) continue;
    if (hitBox(p, lightDir, i)) return 1.0;
  }
  return 0.0;
}
`;

const VERT = /* glsl */ `
precision highp float;
in vec3 position; in vec3 normal; in vec2 uv;
uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix;
out vec3 vWorld; out vec3 vLocal; out vec3 vNl; out vec3 vNw;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vLocal = position;
  vNl = normal;
  vNw = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const PAGE_VERT = VERT;

export const PAGE_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld; in vec3 vLocal; in vec3 vNl; in vec3 vNw;
out vec4 fragColor;
${GLSL_COMMON}
${BOX_GLSL}
uniform sampler2D printTex;
uniform vec4 printRect;   // x0, z0, x1, z1 (world) of the printed figure
uniform vec3 camPos;
uniform vec2 fog;         // near, falloff
uniform float printOn;    // 0..1 (the print fades up before the hit)
uniform float shadowOn;
void main() {
  vec3 p = vWorld;
  vec2 q = vec2((p.x - printRect.x) / (printRect.z - printRect.x), 1.0 - (p.z - printRect.y) / (printRect.w - printRect.y));
  float ink = 0.0;
  if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) ink = texture(printTex, q).r * printOn;
  // cast shadows: engraved 45° hatching on the page
  float sh = shadowOn > 0.0 ? shadowAt(p + vec3(0.0, 1e-3, 0.0), -1) * shadowOn : 0.0;
  if (sh > 0.0) {
    float u = (p.x - p.z) * 13.0;
    float h = hatch(u, 0.3);
    float lod = smoothstep(0.22, 0.5, fwidth(u) * PX_SCALE);
    ink = max(ink, mix(h, 0.3, lod) * sh);
  }
  float d = length(p - camPos);
  float fk = exp(-max(0.0, d - fog.x) / fog.y);
  ink *= fk;
  vec3 tInk = clamp(C_INK / C_BONE * 1.15, 0.004, 1.0);
  fragColor = vec4(mix(vec3(1.0), tInk, sat(ink)), 1.0);
}`;

export const SLAB_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld; in vec3 vLocal; in vec3 vNl; in vec3 vNw;
out vec4 fragColor;
${GLSL_COMMON}
${BOX_GLSL}
uniform int self;
uniform vec3 camPos;
uniform vec2 fog;
uniform float edgeW;      // hairline weight (px at 1x)
uniform float ink;        // 0..1 overall line presence (fades in on the hit)
uniform float mark;       // 0..1: the face divider
void main() {
  vec3 n = vNl;
  vec3 an = abs(n);
  // face-local coordinates (a across, b along the height where it has one) and half sizes
  vec2 ab, hs; float hatchA;
  if (an.x > 0.5) { ab = vLocal.zy; hs = boxHalf.zy; }
  else if (an.z > 0.5) { ab = vLocal.xy; hs = boxHalf.xy; }
  else { ab = vLocal.zx; hs = boxHalf.zx; }
  hatchA = ab.x;
  // hairline edges from the face borders, in screen px
  vec2 fw = max(fwidth(ab), vec2(1e-5));
  vec2 ed = (hs - abs(ab)) / fw;
  float e = min(ed.x, ed.y);
  float edge = pxLine(e, edgeW * 0.5, edgeW * 0.5 + 1.0);
  // the divider bar across the wide faces
  float deco = 0.0;
  if (an.x > 0.5 && mark > 0.0) {
    float dv = abs(ab.y) / fw.y;
    deco = max(deco, pxLine(dv, 0.45, 1.45) * step(abs(ab.x), hs.x * 0.72));
    deco *= mark;
  }
  // tone: the face's angle to the light; cast shadows from the other slabs are 45° hatching
  float ndl = dot(normalize(vNw), lightDir);
  float dark = pow(sat((0.92 - ndl) / 1.1), 1.3) * 0.8;
  float sh = shadowAt(vWorld + vNw * 2e-3, self);
  // engraving that follows the face: wide faces along the height, narrow sides across it, tops lengthwise
  float freq = an.x > 0.5 ? 16.0 : an.z > 0.5 ? 22.0 : 18.0;
  float u = (an.z > 0.5 ? ab.y : ab.x) * freq;
  float u2 = (ab.y - ab.x) * 13.0;
  float h1 = hatch(u, dark) * smoothstep(0.02, 0.08, dark);
  float h3 = hatch(u2, 0.34) * sh;
  float hx = hatch((ab.y + ab.x * 0.4) * freq * 0.9, sat(dark * 1.8 - 1.0)) * smoothstep(1.02, 1.1, dark * 1.8);
  float lod = smoothstep(0.24, 0.5, max(fwidth(u), fwidth(u2)) * PX_SCALE);
  float tone = mix(max(max(h1, hx), h3), max(dark * 0.8, sh * 0.3), lod);
  float cov = max(max(tone * 0.9, edge), deco) * ink;
  vec3 paper = C_BONE * 0.985;
  vec3 col = mix(paper, C_INK * 1.1, sat(cov));
  // fog into paper
  float d = length(vWorld - camPos);
  float fk = exp(-max(0.0, d - fog.x) / fog.y);
  col = mix(C_BONE * 0.975, col, fk);
  fragColor = vec4(col, 1.0);
}`;
