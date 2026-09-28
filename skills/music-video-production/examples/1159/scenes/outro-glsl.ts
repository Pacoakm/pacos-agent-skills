// `outro` (11:59): shaders for the submission receipt in the ink void.
//  - SLAB: the receipt's backing card, a thin ink slab engraved in negative (bone hatching on the
//    sides, denser where the one fixed light falls; the face stays plain ink2), bone hairline edges.
//  - PART: one printed part of the receipt, a sub-rectangle of the card's canvas texture. While the
//    part floats (exploded view) it carries its own ink2 plate with a hairline border; docked, the
//    plate and border fade and the print sits flush on the slab. Fog into ink. Nothing here blooms:
//    only the spark does.
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

export const SLAB_FRAG = /* glsl */ `${HEAD}
uniform vec3 half3;
uniform vec3 lightDir;
uniform float on;
uniform float rim;
void main() {
  vec3 n = vNl, an = abs(n);
  vec2 ab, hs;
  if (an.x > 0.5) { ab = vLocal.zy; hs = half3.zy; }
  else if (an.z > 0.5) { ab = vLocal.xy; hs = half3.xy; }
  else { ab = vLocal.xz; hs = half3.xz; }
  vec2 fw = max(fwidth(ab), vec2(1e-5));
  vec2 ed = (hs - abs(ab)) / fw;
  float edge = pxLine(min(ed.x, ed.y), 0.6, 1.6);
  float light = sat(dot(n, lightDir));
  float isFront = step(0.5, n.z);
  float dens = (1.0 - isFront) * (0.1 + 0.4 * light);
  float u = (an.y > 0.5 ? ab.x : ab.y) * 14.0;
  float h = hatch(u, dens);
  float lod = smoothstep(0.25, 0.5, fwidth(u) * PX_SCALE);
  float lines = mix(h, dens * 0.6, lod) * 0.5 * smoothstep(0.02, 0.07, dens);
  vec3 col = C_INK2 * (1.0 + 0.2 * light * (1.0 - isFront));
  col = mix(col, C_BONE * 0.6, lines);
  col = mix(col, C_BONE * (0.55 + 0.35 * rim), edge * (1.0 - isFront * 0.35));
  col = mix(C_INK, col, fogK() * on);
  fragColor = vec4(col, 1.0);
}`;

export const PART_FRAG = /* glsl */ `${HEAD}
uniform sampler2D tex;
uniform vec4 rect;       // sub-rectangle of the card texture: u0, v0 (top), u1, v1 (bottom)
uniform vec2 sizePx;     // part size in card px (for the border)
uniform float opacity;   // print
uniform float plate;     // 0..1 the part's own plate + border (floating)
void main() {
  vec2 tuv = vec2(mix(rect.x, rect.z, vUv.x), mix(rect.w, rect.y, vUv.y));
  vec4 s = texture(tex, tuv, -0.5); // a touch of LOD bias: the print stays crisp when seen flat
  float a = s.a * opacity;
  // plate border: distance to the edge in card px, as a hairline in screen px
  vec2 q = vUv * sizePx;
  float d = min(min(q.x, sizePx.x - q.x), min(q.y, sizePx.y - q.y));
  float fw = max(fwidth(d), 1e-4);
  float border = pxLine(d / fw, 0.6, 1.6) * plate;
  float pa = 0.92 * plate;
  vec3 pc = mix(C_INK2, C_BONE * 0.5, border);
  float pA = max(pa, border * 0.9);
  float oa = a + pA * (1.0 - a);
  vec3 col = (s.rgb * a + pc * pA * (1.0 - a)) / max(oa, 1e-4);
  col = mix(C_INK, col, fogK());
  if (oa < 0.003) discard;
  fragColor = vec4(col, oa);
}`;
