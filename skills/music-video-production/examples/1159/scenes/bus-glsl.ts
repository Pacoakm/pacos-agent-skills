// `bus` (11:59): the bone paper, the contour shader over the real height field, and the buildings'
// hatched faces. World: x east, y up, z south (1 unit = 10 m horizontally; heights exaggerated).
import { GLSL_COMMON } from '../../engine/glsl/common';

/** Bone paper in screen space (logical px, y up): cloud, short fibres, rare specks, raking light. */
export const PAPER_GLSL = /* glsl */ `
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
    acc += (hash12(c + 9.1) - 0.5) * (1.0 - smoothstep(0.2, 1.25, dist));
  }
  return acc;
}
vec3 paperCol(vec2 px) {
  float cloud = fbm(px * 0.0019, 4);
  float fib = fibres(px, 21.0) + 0.55 * fibres(px * 1.63 + 17.0, 21.0);
  float speck = step(0.99972, hash12(floor(px * 0.5)));
  vec3 paper = C_BONE * (0.972 + 0.03 * cloud + 0.045 * fib);
  paper *= 1.0 - speck * 0.3;
  vec2 uv = px / vec2(1920.0, 1080.0);
  paper *= 0.965 + 0.035 * (uv.y * 0.55 + uv.x * 0.35 + 0.1);
  vec2 dc = uv - 0.5;
  paper *= 1.0 - 0.12 * pow(length(dc * vec2(1.0, 0.85)) * 1.5, 2.6);
  return paper;
}`;

/** The paper where no terrain was drawn: a far-plane quad, depth-tested behind the hill. */
export const BG_VERT = /* glsl */ `
precision highp float;
in vec3 position;
void main() { gl_Position = vec4(position.xy, 0.99999, 1.0); }`;
export const BG_FRAG = /* glsl */ `
precision highp float;
precision highp int;
out vec4 fragColor;
${GLSL_COMMON}
${PAPER_GLSL}
void main() { fragColor = vec4(paperCol(FRAG_PX), 1.0); }`;

/** Height lookup: uH holds metres above the plate's datum on a regular grid over the region. */
const HEIGHT_GLSL = /* glsl */ `
uniform sampler2D uH;
uniform vec4 uReg;    // region: world x0, z0, 1/width, 1/depth
uniform float uEx;    // world y per metre of height (exaggeration / 10)
float hm(vec2 w) { return texture(uH, vec2((w.x - uReg.x) * uReg.z, (w.y - uReg.y) * uReg.w)).r; }
`;

export const TERRAIN_VERT = /* glsl */ `
precision highp float;
in vec3 position;
uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix;
out vec3 vW;
${HEIGHT_GLSL}
void main() {
  vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
  p.y = hm(p.xz) * uEx;
  vW = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

export const TERRAIN_FRAG = /* glsl */ `
precision highp float;
precision highp int;
in vec3 vW;
out vec4 fragColor;
${GLSL_COMMON}
${HEIGHT_GLSL}
${PAPER_GLSL}
uniform vec3 uCam;
uniform float uFogStart, uFogLen, uZ0;   // uZ0: the datum (m above sea level)
uniform sampler2D uRoad;                 // knockout (region space)
uniform vec4 uPulse; uniform float uPulseA; uniform float uBusZ;

float contour(float c, float wpx) {
  float fwP = max(fwidth(c), 1e-5), fw = fwP * PX_SCALE;
  float d = abs(fract(c + 0.5) - 0.5) / fwP;
  float cov = pxLine(d, wpx * 0.5 - 0.5, wpx * 0.5 + 0.5);
  float mean = clamp(wpx * fw, 0.0, 1.0);
  return mix(cov, mean * 0.5, smoothstep(0.18, 0.45, fw));
}

void main() {
  vec2 q = vW.xz;
  float h = hm(q);
  float Z = h + uZ0;                     // metres above sea level
  float e = 0.25;                        // 2.5 m
  float gx = (hm(q + vec2(e, 0.0)) - h) / (e * 10.0);   // dZ/dX (m/m)
  float gs = (hm(q + vec2(0.0, e)) - h) / (e * 10.0);   // dZ/d(south)
  float ex = uEx * 10.0;
  vec3 n = normalize(vec3(-gx * ex, 1.0, -gs * ex));
  float slope = length(vec2(gx, gs)) * ex;
  vec3 L = normalize(vec3(-0.55, 0.7, -0.45)); // light from the north-west, upper left
  float lamb = dot(n, L);
  vec2 nx = n.xz / max(length(n.xz), 1e-4);
  float aspect = dot(nx, normalize(L.xz));
  float shade = sat(0.5 - 0.5 * aspect) * sat(slope * 1.4);

  // contours: 2.5 m, index every 20 m (heavier on the shaded side)
  float minor = contour(Z / 2.5, 0.9);
  float index = contour(Z / 20.0, mix(1.3, 2.3, shade));
  float bus = exp(-abs(Z - uBusZ) * 0.7) * minor;
  float pulse = 0.0;
  for (int i = 0; i < 4; i++) pulse += exp(-abs(Z - uPulse[i]) * 0.5);
  float cov = minor * (0.34 + 0.2 * shade + 0.4 * pulse * uPulseA) + index * (0.62 + 0.3 * shade) + bus * 0.35;

  // hachures: short strokes down the fall line, hanging from the upper contour of each 5 m band
  // stroke direction from the lie of the land at 20 m, not from every ripple
  float E2 = 2.0;
  vec2 gd = vec2(hm(q + vec2(E2, 0.0)) - hm(q - vec2(E2, 0.0)), -(hm(q + vec2(0.0, E2)) - hm(q - vec2(0.0, E2))));
  float gl = length(gd);
  vec2 gn = gl > 1e-4 ? gd / gl : vec2(1.0, 0.0);
  float band = floor(Z / 5.0), fb = fract(Z / 5.0);
  float hu = dot(vec2(q.x, -q.y) * 10.0, vec2(-gn.y, gn.x)) / 2.6 + hash11(band * 7.13) * 0.5;
  float hd = abs(fract(hu) - 0.5) / max(fwidth(hu), 1e-5);
  float stroke = pxLine(hd, 0.1, 1.1);
  float sid = floor(hu + 0.5);
  float len = 0.35 + 0.5 * hash12(vec2(sid, band));
  float gap = smoothstep(0.9 - len, 0.98 - len, fb) * (1.0 - smoothstep(0.8, 0.9, fb));
  float dark = sat((0.66 - lamb) * 2.4) * sat(slope * 1.6 - 0.45);
  float dense = smoothstep(0.35, 0.8, fwidth(hu) * PX_SCALE);
  cov += mix(stroke * gap, 0.14, dense) * dark * 0.6;

  // the road and the lyric's strip are knocked out of the map
  cov *= 1.0 - texture(uRoad, vec2((q.x - uReg.x) * uReg.z, (q.y - uReg.y) * uReg.w)).r;

  float dist = length(vW - uCam);
  float fog = exp(-max(dist - uFogStart, 0.0) / uFogLen);
  vec2 ruv = vec2((q.x - uReg.x) * uReg.z, (q.y - uReg.y) * uReg.w);
  fog *= smoothstep(0.0, 0.08, ruv.x) * (1.0 - smoothstep(0.92, 1.0, ruv.x)) * smoothstep(0.0, 0.08, ruv.y) * (1.0 - smoothstep(0.92, 1.0, ruv.y));
  cov *= fog;
  vec3 col = mix(paperCol(FRAG_PX), C_INK * 1.1, sat(cov) * 0.92);
  fragColor = vec4(col, 1.0);
}`;

/** Buildings: bone faces on the paper, ruled hatching on the walls turned from the light. */
export const BUILD_VERT = /* glsl */ `
precision highp float;
in vec3 position; in vec3 normal;
uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix;
out vec3 vW; out vec3 vN;
void main() {
  vec4 p = modelMatrix * vec4(position, 1.0);
  vW = p.xyz; vN = normal;
  gl_Position = projectionMatrix * viewMatrix * p;
}`;
export const BUILD_FRAG = /* glsl */ `
precision highp float;
precision highp int;
in vec3 vW; in vec3 vN;
out vec4 fragColor;
${GLSL_COMMON}
${PAPER_GLSL}
uniform vec3 uCam; uniform float uFogStart, uFogLen;
void main() {
  vec3 L = normalize(vec3(-0.55, 0.7, -0.45));
  vec3 n = normalize(vN);
  float lamb = dot(n, L);
  float wall = 1.0 - step(0.5, n.y);
  float dark = wall * sat((0.05 - lamb) * 2.5);
  float hat = hatch(vW.y / 0.16, 0.08 + dark * 0.22) * smoothstep(0.05, 0.25, dark);
  float cov = hat * 0.45 + wall * 0.03 + dark * 0.05;
  float dist = length(vW - uCam);
  cov *= exp(-max(dist - uFogStart, 0.0) / uFogLen);
  fragColor = vec4(mix(paperCol(FRAG_PX), C_INK * 1.1, sat(cov)), 1.0);
}`;
