// `linkedlist` (11:59): the node slabs. Each node is a thin box floating in the ink void:
//  - the front face is a flat raised-ink panel carrying the node's value (a canvas texture, word A
//    in the red channel and word B in the green, tinted per word so each lights on its own sung
//    time) and the next-field's dot;
//  - the top and side faces are engraved: bone hatching on ink (scratchboard: the lit top has the
//    widest lines, the sides thinner ones), no lamp gradients;
//  - fog into ink by distance. The hairline edges are LineBatch segments, depth-tested against
//    these faces, so hidden edges drop out like a hidden-line drawing.
import { GLSL_COMMON } from '../../engine/glsl/common';

export const NODE_VERT = /* glsl */ `
precision highp float;
in vec3 position; in vec3 normal;
uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix;
out vec3 vWorld; out vec3 vLocal; out vec3 vNl;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vLocal = position;
  vNl = normal;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const NODE_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld; in vec3 vLocal; in vec3 vNl;
out vec4 fragColor;
${GLSL_COMMON}
uniform sampler2D tex;
uniform float hasText;
uniform vec4 valRect;     // local x0, y0, x1, y1 of the value cell (the texture maps onto it)
uniform vec3 colA;        // word A ink (linear)
uniform vec3 colB;        // word B ink
uniform vec3 dotC;        // local x, y, radius of the next-field's dot
uniform vec3 dotCol;
uniform vec3 camPos;
uniform vec2 fog;         // start, falloff (world units)
uniform float on;         // 0..1 presence
uniform float face;       // front-face brightness (the panel lifts a little when p lands)
void main() {
  vec3 n = vNl;
  vec3 col;
  if (n.z > 0.5) {
    col = mix(C_INK, C_INK2, 0.85 + 0.6 * face);
    if (hasText > 0.5) {
      vec2 q = (vLocal.xy - valRect.xy) / (valRect.zw - valRect.xy);
      if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) {
        vec4 s = texture(tex, q);
        col = mix(col, colA, s.r);
        col = mix(col, colB, s.g);
      }
    }
    if (dotC.z > 0.0) {
      float dd = length(vLocal.xy - dotC.xy) - dotC.z;
      float fw = max(fwidth(dd), 1e-5);
      col = mix(col, dotCol, 1.0 - smoothstep(-fw, fw, dd));
    }
  } else {
    // engraving: lines follow each face; widths from the face's "light"
    float u, dark;
    if (n.y > 0.5)       { u = vLocal.z * 30.0; dark = 0.26; }   // top: lit
    else if (n.y < -0.5) { u = vLocal.z * 30.0; dark = 0.05; }   // underside
    else if (n.x < -0.5) { u = vLocal.y * 30.0; dark = 0.13; }   // left side
    else if (n.x > 0.5)  { u = vLocal.y * 30.0; dark = 0.09; }   // right side
    else                 { u = vLocal.x * 30.0; dark = 0.0; }    // back
    float h = hatch(u, dark);
    float lod = smoothstep(0.28, 0.6, fwidth(u) * PX_SCALE);
    float cov = mix(h, dark * 0.9, lod);
    col = mix(C_INK * 1.1, C_BONE * 0.46, cov);
  }
  float d = length(vWorld - camPos);
  float fk = exp(-max(0.0, d - fog.x) / fog.y);
  col = mix(C_INK, col, fk * on);
  fragColor = vec4(col, 1.0);
}`;

/** Flat bone marks in the world (the arrowheads): one colour, fogged, depth-tested. */
export const FLAT_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld; in vec3 vLocal; in vec3 vNl;
out vec4 fragColor;
uniform vec3 col;
uniform vec3 camPos;
uniform vec2 fog;
void main() {
  float d = length(vWorld - camPos);
  float fk = exp(-max(0.0, d - fog.x) / fog.y);
  fragColor = vec4(mix(vec3(0.0035), col, fk), 1.0);
}`;
