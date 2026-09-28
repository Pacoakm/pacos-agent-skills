// `stack2` (11:59): shaders for the call stack rebuilt as a 3D tower of slabs on bone paper.
//  - PAPER_BG: the sheet (screen space): bone, a low cloud, short fibres, light raking.
//  - PAGE: the page plane (y = 0) in perspective: the printed figure (footprint, caption) and the
//    tower's cast shadow as 45° hatching, multiplied onto the paper like print.
//  - SLAB: one call frame. Flat bone faces, hairline ink edges, engraved hatching that follows each side
//    face (fixed tone per face: no lamp gradients), fog into paper with distance. The front face prints
//    the frame from a static atlas (R: printed ink, G: the lyric words, B: hatch knock-out) and stamps
//    the words in as they are sung: faint print, then a slam (scaled sample) in orange, then ink, with
//    rubber-stamp voids; ink and orange overprint Beer–Lambert, like the 2D plate.
//  - STAMP: the error stamp lying on the top face (multiplied orange).
import { GLSL_COMMON } from '../../engine/glsl/common';

export const MAX_SH = 3;

export const PAPER_BG = /* glsl */ `
uniform vec2 drift;
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

export const VERT = /* glsl */ `
precision highp float;
in vec3 position; in vec3 normal; in vec2 uv;
uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix;
out vec3 vWorld; out vec3 vLocal; out vec3 vNl; out vec3 vNw; out vec2 vUv2;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vLocal = position;
  vNl = normal;
  vNw = normalize(mat3(modelMatrix) * normal);
  vUv2 = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const SH_GLSL = /* glsl */ `
uniform mat4 shInv[${MAX_SH}];
uniform vec3 shHalf[${MAX_SH}];
uniform float shOn[${MAX_SH}];
uniform vec3 lightDir;
bool hitBox(vec3 ro, vec3 rd, int i) {
  mat4 m = shInv[i];
  vec3 o = (m * vec4(ro, 1.0)).xyz;
  vec3 d = (m * vec4(rd, 0.0)).xyz;
  d = mix(d, vec3(1e-5), step(abs(d), vec3(1e-5)));
  vec3 t0 = (-shHalf[i] - o) / d, t1 = (shHalf[i] - o) / d;
  vec3 tn = min(t0, t1), tf = max(t0, t1);
  float a = max(max(tn.x, tn.y), tn.z), b = min(min(tf.x, tf.y), tf.z);
  return b > max(a, 0.0);
}
float shadowAt(vec3 p) {
  for (int i = 0; i < ${MAX_SH}; i++) {
    if (shOn[i] < 0.5) continue;
    if (hitBox(p, lightDir, i)) return 1.0;
  }
  return 0.0;
}`;

export const PAGE_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld; in vec3 vLocal; in vec3 vNl; in vec3 vNw; in vec2 vUv2;
out vec4 fragColor;
${GLSL_COMMON}
${SH_GLSL}
uniform sampler2D printTex;
uniform vec4 printRect;   // x0, z0, x1, z1 (world) of the printed figure
uniform vec3 camPos;
uniform vec2 fog;
void main() {
  vec3 p = vWorld;
  vec2 q = vec2((p.x - printRect.x) / (printRect.z - printRect.x), 1.0 - (p.z - printRect.y) / (printRect.w - printRect.y));
  float ink = 0.0;
  if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) ink = texture(printTex, q).r;
  float sh = shadowAt(p + vec3(0.0, 1e-3, 0.0));
  if (sh > 0.0) {
    float u = (p.x - p.z) * 11.0;
    float h = hatch(u, 0.32);
    float lod = smoothstep(0.22, 0.5, fwidth(u) * PX_SCALE);
    ink = max(ink, mix(h, 0.3, lod) * sh);
  }
  float d = length(p - camPos);
  ink *= exp(-max(0.0, d - fog.x) / fog.y);
  vec3 tInk = clamp(C_INK / C_BONE * 1.15, 0.004, 1.0);
  fragColor = vec4(mix(vec3(1.0), tInk, sat(ink)), 1.0);
}`;

export const MAX_W = 3;

export const SLAB_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld; in vec3 vLocal; in vec3 vNl; in vec3 vNw; in vec2 vUv2;
out vec4 fragColor;
${GLSL_COMMON}
uniform vec3 half3;          // box half sizes (x, y, z)
uniform vec3 camPos;
uniform vec2 fog;
uniform float edgeW;
uniform sampler2D atlas;
uniform vec4 cell;           // this frame's front-face cell in the atlas (u0, v0, u1, v1; v down)
uniform float caller;        // 1: an old caller frame (front face hatched, label knocked out)
uniform float seed;
uniform vec4 wRect[${MAX_W}];  // word boxes on the face (u0, v0, u1, v1; v down)
uniform vec4 wState[${MAX_W}]; // on (0/1), stamped (0..1), orange (0..1), slam scale

vec2 cellUV(vec2 fuv) { return vec2(mix(cell.x, cell.z, fuv.x), mix(cell.y, cell.w, fuv.y)); }
// explicit gradients: the lookups sit in branches (per face, per word box), where implicit derivatives break

float stampInk(vec2 p, float cov, float s, float voidAmt) {
  float n = snoise(p * 0.08 + s) * 0.5 + snoise(p * 0.27 + s * 1.7) * 0.32 + snoise(p * 0.95 - s) * 0.18;
  float press = smoothstep(-0.8, 0.4, snoise(p * 0.006 + s * 2.3));
  float voids = smoothstep(-0.62 + voidAmt, -0.4 + voidAmt, n + 0.22 * press);
  return sat(cov * voids * (0.78 + 0.22 * press) * 1.2);
}

void main() {
  vec3 n = vNl;
  vec3 an = abs(n);
  // front-face coordinates and their derivatives, taken in uniform control flow
  vec2 fuv = vec2(vLocal.x / (2.0 * half3.x) + 0.5, 0.5 - vLocal.y / (2.0 * half3.y));
  vec2 auv = cellUV(fuv);
  vec2 gx = dFdx(auv), gy = dFdy(auv);
  vec2 fp = fuv * vec2(780.0, 780.0 * half3.y / half3.x); // face px (the 2D plate's page px)
  float uH = (fp.x + fp.y) / 9.0;                           // the callers' 45° hatch, 9 px pitch
  float uHw = fwidth(uH);
  vec2 ab, hs;
  if (an.x > 0.5) { ab = vLocal.zy; hs = half3.zy; }
  else if (an.z > 0.5) { ab = vLocal.xy; hs = half3.xy; }
  else { ab = vLocal.xz; hs = half3.xz; }
  vec2 fw = max(fwidth(ab), vec2(1e-5));
  vec2 ed = (hs - abs(ab)) / fw;
  float edge = pxLine(min(ed.x, ed.y), edgeW * 0.5, edgeW * 0.5 + 1.0);

  vec3 paper = C_BONE * 0.985;
  vec3 tInk = clamp(C_INK / C_BONE * 1.12, 0.004, 1.0);
  vec3 tOr = clamp(C_SIGNAL / C_BONE, 0.004, 1.0);
  float dInk = 0.0, dOr = 0.0;

  if (n.z > 0.5) {
    // ---- the front face: the printed frame, and the words
    vec4 a = textureGrad(atlas, auv, gx, gy);
    dInk = a.r;
    if (caller > 0.5) {
      // light 45° hatch like FIG. 2's caller frames; fades to a flat tint where it would alias
      float h = hatch(uH, 0.16);
      float lod = smoothstep(0.35, 0.7, uHw * PX_SCALE);
      dInk = max(dInk, mix(h * 0.55, 0.09, lod) * (1.0 - a.b));
    }
    for (int j = 0; j < ${MAX_W}; j++) {
      vec4 st = wState[j];
      if (st.x < 0.5) continue;
      vec4 r = wRect[j];
      vec2 c = (r.xy + r.zw) * 0.5;
      if (st.y <= 0.0) {
        // printed faint before it is sung
        if (fuv.x > r.x && fuv.x < r.z && fuv.y > r.y && fuv.y < r.w) dInk = max(dInk, a.g * 0.17);
        continue;
      }
      vec2 su = c + (fuv - c) / st.w;          // the slam: the word lands a little large
      if (su.x < r.x || su.x > r.z || su.y < r.y || su.y > r.w) continue;
      float g = textureGrad(atlas, cellUV(su), gx / st.w, gy / st.w).g;
      float cov = stampInk(fp, g, seed + float(j) * 3.1, -0.07) * sat(st.y * 4.0);
      dOr = max(dOr, cov * st.z);
      dInk = max(dInk, cov * (1.0 - st.z));
      // the faint print under the slam's edge
      if (st.y < 1.0 && fuv.x > r.x && fuv.x < r.z && fuv.y > r.y && fuv.y < r.w) dInk = max(dInk, a.g * 0.17 * (1.0 - st.y));
    }
  } else {
    // ---- sides: engraved lines along the slab, one fixed tone per face
    float dark = n.x > 0.5 ? 0.4 : n.x < -0.5 ? 0.17 : n.y > 0.5 ? 0.0 : n.y < -0.5 ? 0.7 : 0.55;
    float u = an.y > 0.5 ? ab.y * 9.0 : ab.y * 18.0;   // tops: lengthwise; sides: along the height
    float h = hatch(u, dark) * smoothstep(0.02, 0.06, dark);
    float lod = smoothstep(0.24, 0.5, fwidth(u) * PX_SCALE);
    dInk = mix(h, dark * 0.8, lod) * 0.92;
  }
  dInk = max(dInk, edge);

  vec3 col = paper * pow(tOr, vec3(sat(dOr))) * pow(tInk, vec3(sat(dInk)));
  float d = length(vWorld - camPos);
  float fk = exp(-max(0.0, d - fog.x) / fog.y);
  col = mix(C_BONE * 0.975, col, fk);
  fragColor = vec4(col, 1.0);
}`;

export const STAMP_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld; in vec3 vLocal; in vec3 vNl; in vec3 vNw; in vec2 vUv2;
out vec4 fragColor;
${GLSL_COMMON}
uniform sampler2D tex;
uniform float on;
void main() {
  float a = texture(tex, vUv2).a * on;
  vec3 tOr = clamp(C_SIGNAL / C_BONE, 0.004, 1.0);
  fragColor = vec4(pow(tOr, vec3(sat(a))), 1.0);
}`;
