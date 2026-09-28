// `submit2` shaders and the vector-text builder.
//  - GROUND: the ink void's floor (y = 0) as a faint dot grid in perspective, fogging into ink.
//  - PANEL: a chunk card (local x along the track, y up the card). Ink, filled from the left as it
//    uploads (orange while uploading, bone once committed), fogging into ink with distance.
//  - GLYPH: the word printed on its card as real outline geometry (crisp at any scale): bone where
//    the card is still ink, knocked out to ink where it has filled.
import * as THREE from 'three';
import { GLSL_COMMON } from '../../engine/glsl/common';
import { textPathCommands } from '../../engine/type';

export const GROUND = /* glsl */ `
uniform mat4 invVP;
uniform vec3 camPos;
uniform float fogStart, fogLen;
void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 a = invVP * vec4(ndc, -1.0, 1.0), b = invVP * vec4(ndc, 1.0, 1.0);
  vec3 ro = a.xyz / a.w, rd = normalize(b.xyz / b.w - ro);
  vec3 col = C_INK;
  if (rd.y < -1e-4) {
    float s = -ro.y / rd.y;
    vec3 p = ro + rd * s;
    // dots every 0.5 units, sized in screen px so they stay dots at any distance
    vec2 g = p.xz / 0.5;
    vec2 q = fract(g + 0.5) - 0.5;
    vec2 fw = fwidth(g) * PX_SCALE;
    float d = length(q / max(fw, vec2(1e-4)));
    float dotA = 1.0 - smoothstep(0.9, 1.9, d);
    float lod = 1.0 - smoothstep(0.12, 0.3, max(fw.x, fw.y)); // far away the grid would moire: fade it
    float fog = exp(-max(0.0, s - fogStart) / fogLen);
    col += (C_GRAPHITE - C_INK) * 0.28 * dotA * lod * fog;
  }
  fragColor = vec4(col, 1.0);
}`;

const VERT = /* glsl */ `
precision highp float;
in vec3 position;
uniform mat4 modelMatrix, viewMatrix, projectionMatrix;
uniform vec3 cameraPosition;
out vec2 vLocal;
out float vDist;
void main() {
  vLocal = position.xy;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDist = distance(wp.xyz, cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG_HEAD = /* glsl */ `
precision highp float;
precision highp int;
${GLSL_COMMON}
in vec2 vLocal;
in float vDist;
out vec4 fragColor;
uniform float fillW;      // filled length, in local units
uniform vec3 colA;        // colour of the filled part
uniform vec3 colB;        // colour of the rest
uniform float fogStart, fogLen;
float filled() {
  float w = fwidth(vLocal.x) * 0.75;
  return 1.0 - smoothstep(fillW - w, fillW + w, vLocal.x);
}
float fogK() { return exp(-max(0.0, vDist - fogStart) / fogLen); }
`;

const FRAG = FRAG_HEAD + /* glsl */ `
void main() {
  vec3 c = mix(colB, colA, filled());
  fragColor = vec4(mix(C_INK, c, fogK()), 1.0);
}`;

export function cardMaterial(fog: { start: number; len: number }, glyph = false) {
  return new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      fillW: { value: 0 }, colA: { value: new THREE.Vector3() }, colB: { value: new THREE.Vector3() },
      fogStart: { value: fog.start }, fogLen: { value: fog.len },
    },
    side: THREE.DoubleSide, depthTest: true, depthWrite: true,
    // the glyphs sit on their card: pulled toward the camera in depth so they never z-fight it
    polygonOffset: glyph, polygonOffsetFactor: glyph ? -2 : 0, polygonOffsetUnits: glyph ? -4 : 0,
  });
}

/**
 * The outline of `text` as a flat mesh in local units: origin at the left end of the baseline,
 * x right, y up; `k` = local units per font px. Returns the geometry and the advance width.
 */
export function textGeometry(text: string, fam: string, size: number, k: number) {
  const cmds = textPathCommands(text, fam, size, 0, 0);
  const sp = new THREE.ShapePath();
  for (const c of cmds) {
    if (c.type === 'M') sp.moveTo(c.x * k, -c.y * k);
    else if (c.type === 'L') sp.lineTo(c.x * k, -c.y * k);
    else if (c.type === 'Q') sp.quadraticCurveTo(c.x1 * k, -c.y1 * k, c.x * k, -c.y * k);
    else if (c.type === 'C') sp.bezierCurveTo(c.x1 * k, -c.y1 * k, c.x2 * k, -c.y2 * k, c.x * k, -c.y * k);
  }
  const shapes = sp.toShapes();
  return new THREE.ShapeGeometry(shapes, 8);
}
