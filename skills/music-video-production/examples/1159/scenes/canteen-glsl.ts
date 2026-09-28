// `canteen` (11:59): the occluding faces of the room's solid parts (counter, table tops, the board).
// Flat ink (or ink2 for the board's panel), engraved hatching whose weight follows the face's angle to
// one fixed light (no lamp gradients), fog into ink. They write depth so the hairlines behind them
// are hidden, like a technical drawing with hidden lines removed.
import { GLSL_COMMON } from '../../engine/glsl/common';

export const FACE_VERT = /* glsl */ `
precision highp float;
in vec3 position; in vec3 normal;
uniform mat4 modelMatrix; uniform mat4 viewMatrix; uniform mat4 projectionMatrix;
out vec3 vWorld; out vec3 vNw;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vNw = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const FACE_FRAG = /* glsl */ `
precision highp float;
in vec3 vWorld; in vec3 vNw;
out vec4 fragColor;
${GLSL_COMMON}
uniform vec3 camPos;
uniform vec2 fog;        // start (m past the camera's target distance), falloff (m)
uniform float light;     // 0..1 the room's lights
uniform vec3 base;       // face colour (linear)
uniform float hatchK;    // 0..1 hatching presence
uniform float freq;      // hatch lines per metre
uniform vec3 lightDir;
void main() {
  vec3 n = normalize(vNw);
  vec3 an = abs(n);
  float ndl = dot(n, lightDir);
  float dark = pow(sat((0.95 - ndl) / 1.3), 1.2);
  vec3 tU = an.y > 0.5 ? vec3(0.7071, 0.0, 0.7071) : normalize(cross(vec3(0.0, 1.0, 0.0), n));
  float u = dot(vWorld, tU) * freq;
  float h = hatch(u, 0.12 + dark * 0.4);
  float lod = smoothstep(0.3, 0.6, fwidth(u) * PX_SCALE);
  h = mix(h, (0.12 + dark * 0.4) * 0.6, lod) * hatchK;
  vec3 col = mix(base, C_GRAPHITE * 0.8, h * (0.25 + 0.75 * light));
  float d = length(vWorld - camPos);
  float fk = exp(-max(0.0, d - fog.x) / fog.y) * smoothstep(0.3, 1.2, d);
  fragColor = vec4(mix(C_INK, col, fk), 1.0);
}`;
