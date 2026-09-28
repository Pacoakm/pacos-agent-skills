// `clock2` (11:59, chorus 2): shaders for the 3D split-flap unit on the ink void.
//  - CARD: a flap half (bone card, ink figure) sampled from a card atlas. The falling flap shows the
//    old figure's top half on its front and the new figure's bottom half on its back; faces turned
//    away from the one fixed light take ink hatching across the card (no lamp gradients), and the
//    static bottom half takes the falling flap's shadow as hatching near the seam.
//  - BOX: the housing, an ink-black monolith engraved in negative: bone hatching whose density is the
//    face's light (lit faces carry more lines), bone hairline edges, fog into ink.
//  - PLATE: flat printed planes (labels, the lyric on the rail, footnotes) from canvas textures;
//    only signal orange is pushed past the bloom threshold.
import { GLSL_COMMON } from '../../engine/glsl/common';

export const VERT = /* glsl */ `
precision highp float;
in vec3 position; in vec3 normal; in vec2 uv;
uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix;
out vec3 vWorld; out vec3 vLocal; out vec3 vNl; out vec2 vUv;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz; vLocal = position; vNl = normal; vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const HEAD = /* glsl */ `
precision highp float;
in vec3 vWorld; in vec3 vLocal; in vec3 vNl; in vec2 vUv;
out vec4 fragColor;
${GLSL_COMMON}
uniform vec3 camPos;
uniform vec2 fog;   // near, falloff (world units)
float fogK() { return exp(-max(0.0, length(vWorld - camPos) - fog.x) / fog.y); }
`;

export const CARD_FRAG = /* glsl */ `${HEAD}
uniform sampler2D atlas;
uniform vec2 grid;        // atlas cols, rows
uniform float cellF, cellB; // front / back cell index
uniform float topF;       // front face: 1 = top half of the card, 0 = bottom half
uniform float shadeF, shadeB; // 0..1 hatching darkness of each face
uniform float shadow;     // 0..1 the falling flap's shadow (bottom static half, near the seam)
uniform float on;
uniform float gain;      // brief exposure kick on the flaps (the drop), bone stays under the bloom threshold
vec4 cardAt(float cell, vec2 uvc) {
  float cx = mod(cell, grid.x), cy = floor(cell / grid.x);
  return texture(atlas, vec2((cx + uvc.x) / grid.x, (cy + 1.0 - uvc.y) / grid.y));
}
void main() {
  bool front = gl_FrontFacing;
  vec2 uvc; float cell, dark;
  if (front) { cell = cellF; uvc = vec2(vUv.x, topF > 0.5 ? 0.5 + 0.5 * vUv.y : 0.5 * vUv.y); dark = shadeF; }
  else { cell = cellB; uvc = vec2(vUv.x, 0.5 * (1.0 - vUv.y)); dark = shadeB; }
  vec4 s = cardAt(cell, uvc);
  if (s.a < 0.5) discard;
  // bone paper of the card vs its ink figure
  float bone = smoothstep(0.25, 0.6, s.g);
  // shadow of the falling flap on the bottom half: strongest at the seam
  float sh = front && topF < 0.5 ? shadow * smoothstep(0.0, 1.0, uvc.y * 2.0) : 0.0;
  float d = max(dark, sh);
  float u = uvc.y * 64.0;
  float h = hatch(u, d * 0.9) * smoothstep(0.02, 0.1, d);
  float lod = smoothstep(0.25, 0.5, fwidth(u) * PX_SCALE);
  float tone = mix(h, d * 0.55, lod);
  vec3 col = mix(s.rgb * mix(1.0, gain, bone), C_INK * 1.2, tone * bone);
  col = mix(C_INK, col, fogK() * on);
  fragColor = vec4(col, 1.0);
}`;

export const BOX_FRAG = /* glsl */ `${HEAD}
uniform vec3 half3;       // box half size
uniform vec3 lightDir;
uniform float on;         // 0..1 build-out
uniform float edgeW;
uniform float rim;        // brief bone rim-light on the edges (the drop)
void main() {
  vec3 n = vNl, an = abs(n);
  vec2 ab, hs;
  if (an.x > 0.5) { ab = vLocal.zy; hs = half3.zy; }
  else if (an.z > 0.5) { ab = vLocal.xy; hs = half3.xy; }
  else { ab = vLocal.xz; hs = half3.xz; }
  vec2 fw = max(fwidth(ab), vec2(1e-5));
  vec2 ed = (hs - abs(ab)) / fw;
  float edge = pxLine(min(ed.x, ed.y), edgeW * 0.5, edgeW * 0.5 + 1.0);
  float light = sat(dot(n, lightDir));
  // engraved in negative: bone lines on ink, denser where the light falls; the front stays plain
  float isFront = step(0.5, n.z);
  float dens = (1.0 - isFront) * (0.08 + 0.34 * light);
  float u = (an.y > 0.5 ? ab.x * 0.6 + ab.y : ab.y) * 11.0;
  float h = hatch(u, dens);
  float lod = smoothstep(0.25, 0.5, fwidth(u) * PX_SCALE);
  float lines = mix(h, dens * 0.6, lod) * 0.55 * smoothstep(0.02, 0.07, dens);
  vec3 col = C_INK2 * (1.0 + 0.25 * light * (1.0 - isFront));
  col = mix(col, C_BONE * 0.72, lines);
  col = mix(col, C_BONE * (0.8 + 0.35 * rim), edge * mix(0.75, 1.0, rim));
  col = mix(C_INK, col, fogK() * on);
  fragColor = vec4(col, 1.0);
}`;

export const PLATE_FRAG = /* glsl */ `${HEAD}
uniform sampler2D tex;
uniform float opacity, hot;
void main() {
  vec4 s = texture(tex, vUv);
  float a = s.a * opacity;
  if (a < 0.003) discard;
  float h = smoothstep(0.25, 0.7, s.r - s.g * 1.3);
  vec3 col = s.rgb * (1.0 + hot * h);
  float fk = fogK();
  fragColor = vec4(col * fk, a);   // fog toward the ink void (premultiplied-style darkening)
}`;
