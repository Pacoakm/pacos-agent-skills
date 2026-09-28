// `timetable` (11:59): the bone-paper shader. The Canvas2D ink layer is channel-coded coverage,
// drawn with 'lighter' onto opaque black:
//   R = printed ink (hairlines, mono, the lyric),
//   G = printed orange (the DISCRETE MATH block's flat fill, the now-line, the sung word),
//   B = rubber-stamped orange (the SEEMS stamp: mottled pressure, voids).
// The inks are laid onto procedural paper with a Beer–Lambert overprint (ink over orange stays
// readable, the way two inks print). The camera is an affine map (zoom, pan, a slight roll): the
// paper's fibres are generated in page space so they move with the sheet.

export const PAPER_FRAG = /* glsl */ `
uniform sampler2D inkTex;
uniform vec3 camA; uniform vec3 camB;   // screen px (y down) -> page px
uniform float zoom;

// short paper fibres: a jittered cell of hairline dashes
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
    acc += (hash12(c + 9.1) - 0.5) * (1.0 - smoothstep(0.2, 0.85 + 0.4 / zoom, dist));
  }
  return acc;
}

// rubber-stamp ink: mottled pressure, voids
float stampInk(vec2 p, float cov, float seed, float voidAmt) {
  float n = snoise(p * 0.08 + seed) * 0.5 + snoise(p * 0.27 + seed * 1.7) * 0.32 + snoise(p * 0.95 - seed) * 0.18;
  float press = smoothstep(-0.8, 0.4, snoise(p * 0.006 + seed * 2.3));
  float voids = smoothstep(-0.62 + voidAmt, -0.4 + voidAmt, n + 0.22 * press);
  return sat(cov * voids * (0.8 + 0.2 * press) * 1.2);
}

void main() {
  vec2 sp = vec2(vUv.x * 1920.0, (1.0 - vUv.y) * 1080.0);
  vec2 pp = vec2(dot(camA, vec3(sp, 1.0)), dot(camB, vec3(sp, 1.0)));

  // ---- paper: bone, low-frequency cloud, fibres, rare specks
  float cloud = fbm(pp * 0.0019, 4);
  float fib = fibres(pp, 21.0) + 0.55 * fibres(pp * 1.63 + 17.0, 21.0);
  float speck = step(0.99972, hash12(floor(pp * 0.5)));
  vec3 paper = C_BONE * (0.972 + 0.03 * cloud + 0.045 * fib);
  paper *= 1.0 - speck * 0.3;
  paper *= 0.965 + 0.035 * (1.0 - vUv.y * 0.55 - (1.0 - vUv.x) * 0.35); // light raking from the top right

  // ---- inks
  vec4 ink = texture(inkTex, vUv);
  float dPrint = 0.0, dFill = 0.0, dStamp = 0.0;
  if (ink.r > 0.002) dPrint = sat(ink.r) * (0.93 + 0.07 * snoise(pp * 0.4));
  // printed orange: a flat screen-print, faintly mottled, a touch heavier where it is dense
  if (ink.g > 0.002) dFill = sat(ink.g) * (0.93 + 0.07 * smoothstep(-0.6, 0.6, snoise(pp * 0.035 + 3.0)) - 0.035 * snoise(pp * 0.6));
  if (ink.b > 0.002) dStamp = stampInk(pp, sat(ink.b), 5.7, 0.02);

  vec3 col = paper;
  vec3 tInk = clamp(C_INK / C_BONE * 1.15, 0.004, 1.0);
  vec3 tOr = clamp(C_SIGNAL / C_BONE, 0.004, 1.0);
  col *= pow(tOr, vec3(sat(dFill + dStamp)));
  col *= pow(tInk, vec3(dPrint));

  // soft falloff at the sheet's corners
  vec2 dc = vUv - 0.5;
  col *= 1.0 - 0.12 * pow(length(dc * vec2(1.0, 0.85)) * 1.5, 2.6);
  fragColor = vec4(col, 1.0);
}`;
