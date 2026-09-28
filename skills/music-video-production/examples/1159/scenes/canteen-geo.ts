// `canteen` (11:59): the room, in metres. x right, y up, z toward the camera.
// A school canteen after hours: a long counter against the back wall with a hanging board above it
// (the figure's subject), rows of pedestal tables with fixed round stools, ceiling light panels,
// floor tiles, a tiled dado on the back wall, windows down the left wall, a kitchen door at the back.
// Everything is hairline edges; the solid parts (counter, table tops, board) also get occluding faces
// so the drawing reads with hidden lines removed, like a technical figure.

export const ROOM = { x0: -7.5, x1: 7.5, y1: 5.8, zb: -8.5, zf: 8.5 } as const;
export const COUNTER = { x0: -3.8, x1: 3.8, z0: -7.6, z1: -6.8, h: 1.0 } as const;
/** The hanging board: centre, size (m), thickness; content is laid out in board units U × V. */
export const BOARD = { cx: 0, cy: 3.72, cz: -6.9, w: 4.8, h: 2.667, th: 0.07, U: 1800, V: 1000 } as const;
export const BS = BOARD.w / BOARD.U; // metres per board unit
/** The floating menu cards above the counter (centres, yaw), card width in metres. */
export const CARD_W = 1.3;
export const CARDS = [
  { x: -1.62, y: 1.64, z: -6.02, yaw: 0.12 },
  { x: 0, y: 1.7, z: -5.86, yaw: 0 },
  { x: 1.62, y: 1.64, z: -6.02, yaw: -0.12 },
] as const;
export const TABLE_X = [-4.6, -1.55, 1.55, 4.6];
export const TABLE_Z = [-4.3, -1.6, 1.1, 3.8];
export const TABLE = { hw: 0.6, hd: 0.37, h: 0.76, th: 0.04 } as const;

// ---- board layout (board units, v down)
export const BAR = { u0: 250, u1: 1720, v: 680, hh: 11 } as const;
/** u of an hour on the board's service-day bar (06:00 → 06:00 the next morning). */
export const barU = (hour: number) => BAR.u0 + ((((hour - 6) % 24) + 24) % 24) / 24 * (BAR.u1 - BAR.u0);
export const barU2 = (hour: number) => BAR.u0 + (hour - 6) / 24 * (BAR.u1 - BAR.u0); // unwrapped (for 26 = 02:00 next day)

export const KIND = { FLOOR: 0, STRUCT: 1, FURN: 2, LAMP: 3, TUBE: 4, TILE: 5, GLASS: 6 } as const;

export interface Edges { n: number; p: Float32Array; w: Float32Array; a: Float32Array; k: Uint8Array; id: Int16Array }

class EB {
  p: number[] = []; w: number[] = []; a: number[] = []; k: number[] = []; id: number[] = [];
  add(ax: number, ay: number, az: number, bx: number, by: number, bz: number, w: number, a: number, k: number, id = -1) {
    this.p.push(ax, ay, az, bx, by, bz); this.w.push(w); this.a.push(a); this.k.push(k); this.id.push(id);
  }
  loop(pts: number[][], w: number, a: number, k: number, id = -1) {
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!, q = pts[(i + 1) % pts.length]!;
      this.add(p[0]!, p[1]!, p[2]!, q[0]!, q[1]!, q[2]!, w, a, k, id);
    }
  }
  circle(cx: number, cy: number, cz: number, r: number, n: number, w: number, a: number, k: number, id = -1) {
    const pts: number[][] = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; pts.push([cx + r * Math.cos(t), cy, cz + r * Math.sin(t)]); }
    this.loop(pts, w, a, k, id);
  }
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, w: number, a: number, k: number, id = -1) {
    this.loop([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], w, a, k, id);
    this.loop([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], w, a, k, id);
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] as const) this.add(x, y0, z, x, y1, z, w, a, k, id);
  }
  done(): Edges {
    return { n: this.w.length, p: Float32Array.from(this.p), w: Float32Array.from(this.w), a: Float32Array.from(this.a), k: Uint8Array.from(this.k), id: Int16Array.from(this.id) };
  }
}

/** Ceiling light panels: centres (x, z); ids 0..n-1 on the TUBE/LAMP edges. */
export const LAMPS: [number, number][] = [];
for (const z of [-5.6, -2.8, 0, 2.8, 5.6]) for (const x of [-4.8, -1.6, 1.6, 4.8]) LAMPS.push([x, z]);

export function buildRoom(): Edges {
  const g = new EB();
  const { x0, x1, y1, zb, zf } = ROOM;
  // shell: floor/ceiling long edges, back wall
  for (const x of [x0, x1]) for (const y of [0, y1]) g.add(x, y, zf, x, y, zb, 1.5, 0.9, KIND.STRUCT);
  g.loop([[x0, 0, zb], [x1, 0, zb], [x1, y1, zb], [x0, y1, zb]], 1.5, 0.9, KIND.STRUCT);
  // floor tiles (0.6 m)
  for (let x = x0 + 0.6; x < x1 - 0.01; x += 0.6) g.add(x, 0, zf, x, 0, zb, 1, 0.5, KIND.FLOOR);
  for (let z = zb + 0.6; z < zf - 0.01; z += 0.6) g.add(x0, 0, z, x1, 0, z, 1, 0.5, KIND.FLOOR);
  // skirting on the side walls
  for (const x of [x0, x1]) g.add(x, 0.12, zf, x, 0.12, zb, 1, 0.5, KIND.STRUCT);
  // back wall: a tiled dado up to 1.5 m, its cap rail
  g.add(x0, 1.5, zb, x1, 1.5, zb, 1.2, 0.8, KIND.STRUCT);
  for (let y = 0.3; y < 1.49; y += 0.3) g.add(x0, y, zb, x1, y, zb, 1, 0.5, KIND.TILE);
  for (let x = x0 + 0.3; x < x1 - 0.01; x += 0.3) g.add(x, 0, zb, x, 1.5, zb, 1, 0.5, KIND.TILE);
  // kitchen door (back right) with a porthole
  {
    const dx0 = 5.0, dx1 = 6.1, dh = 2.25, z = zb + 0.01;
    g.loop([[dx0, 0, z], [dx0, dh, z], [dx1, dh, z], [dx1, 0, z]], 1.3, 0.9, KIND.STRUCT);
    g.loop([[dx0 + 0.07, 0, z], [dx0 + 0.07, dh - 0.07, z], [dx1 - 0.07, dh - 0.07, z], [dx1 - 0.07, 0, z]], 1, 0.5, KIND.STRUCT);
    const pts: number[][] = [];
    for (let i = 0; i < 20; i++) { const t = (i / 20) * Math.PI * 2; pts.push([(dx0 + dx1) / 2 + 0.17 * Math.cos(t), 1.5 + 0.17 * Math.sin(t), z]); }
    g.loop(pts, 1.1, 0.8, KIND.STRUCT);
    g.add(dx0 + 0.2, 1.0, z, dx0 + 0.2, 1.12, z, 1.4, 0.8, KIND.STRUCT);
  }
  // windows down the left wall (mullions, a sill)
  for (const zc of [-5.2, -1.7, 1.8, 5.3]) {
    const x = x0 + 0.01, za = zc - 1.1, zz = zc + 1.1, ya = 1.35, yb = 3.35;
    g.loop([[x, ya, za], [x, yb, za], [x, yb, zz], [x, ya, zz]], 1.3, 0.85, KIND.STRUCT);
    g.add(x, ya, zc, x, yb, zc, 1, 0.6, KIND.STRUCT);
    g.add(x, 2.6, za, x, 2.6, zz, 1, 0.6, KIND.STRUCT);
    g.add(x + 0.12, ya - 0.04, za - 0.08, x + 0.12, ya - 0.04, zz + 0.08, 1, 0.55, KIND.STRUCT);
    // two glints on the glass
    g.add(x, 1.7, za + 0.25, x, 2.2, za + 0.6, 1, 0.35, KIND.GLASS);
    g.add(x, 1.65, za + 0.45, x, 1.95, za + 0.66, 1, 0.3, KIND.GLASS);
  }
  // notice rail on the right wall
  g.add(x1 - 0.01, 1.2, -4.5, x1 - 0.01, 1.2, 3.5, 1, 0.5, KIND.STRUCT);

  // ---- the counter: body, overhanging top, tray rail on brackets, sneeze guard, trays, a cutlery pot
  {
    const c = COUNTER;
    g.box(c.x0, 0, c.z0, c.x1, c.h - 0.05, c.z1, 1.5, 0.95, KIND.STRUCT);
    g.box(c.x0 - 0.06, c.h - 0.05, c.z0, c.x1 + 0.06, c.h, c.z1 + 0.1, 1.4, 0.95, KIND.STRUCT);
    // panel joints on the front
    for (let x = c.x0 + 0.95; x < c.x1 - 0.1; x += 0.95) g.add(x, 0.06, c.z1, x, c.h - 0.07, c.z1, 1, 0.5, KIND.STRUCT);
    g.add(c.x0, 0.1, c.z1, c.x1, 0.1, c.z1, 1, 0.5, KIND.STRUCT);
    // tray rail
    const zr = c.z1 + 0.32;
    for (const y of [0.86, 0.91]) g.add(c.x0, y, zr, c.x1, y, zr, 1.2, 0.8, KIND.STRUCT);
    for (let x = c.x0 + 0.2; x <= c.x1 - 0.19; x += 1.2) { g.add(x, 0.86, zr, x, 0.86, c.z1, 1, 0.7, KIND.STRUCT); g.add(x, 0.91, zr, x, 0.91, c.z1, 1, 0.5, KIND.STRUCT); }
    // sneeze guard: a leaning pane on two posts
    const zg0 = c.z0 + 0.42, zg1 = c.z0 + 0.62, yg0 = c.h + 0.02, yg1 = c.h + 0.5;
    g.loop([[c.x0 + 0.3, yg0, zg0], [c.x1 - 0.3, yg0, zg0], [c.x1 - 0.3, yg1, zg1], [c.x0 + 0.3, yg1, zg1]], 1.1, 0.75, KIND.STRUCT);
    for (const x of [c.x0 + 0.3, c.x1 - 0.3]) g.add(x, c.h, zg0 - 0.02, x, yg1 + 0.03, zg1 + 0.01, 1.4, 0.85, KIND.STRUCT);
    for (const xg of [-2.6, 0.9, 2.9]) g.add(xg, yg0 + 0.08, zg0 + 0.03, xg + 0.28, yg1 - 0.08, zg1 - 0.03, 1, 0.3, KIND.GLASS);
    // a stack of trays (left end) and a cutlery pot (right end)
    for (let i = 0; i < 6; i++) {
      const y = c.h + 0.012 + i * 0.022;
      g.loop([[-3.62, y, -7.1], [-3.12, y, -7.1], [-3.12, y, -6.78], [-3.62, y, -6.78]], 1, 0.75, KIND.FURN);
    }
    g.circle(3.35, c.h, -7.0, 0.09, 14, 1, 0.8, KIND.FURN);
    g.circle(3.35, c.h + 0.17, -7.0, 0.09, 14, 1, 0.8, KIND.FURN);
    for (const s of [-1, 1]) g.add(3.35 + s * 0.09, c.h, -7.0, 3.35 + s * 0.09, c.h + 0.17, -7.0, 1, 0.8, KIND.FURN);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, r = 0.05;
      const bx = 3.35 + r * Math.cos(a), bz = -7.0 + r * Math.sin(a);
      g.add(bx, c.h + 0.1, bz, bx + 0.07 * Math.cos(a) + 0.01 * i, c.h + 0.36 + 0.015 * (i % 3), bz + 0.05 * Math.sin(a), 1, 0.7, KIND.FURN);
    }
  }

  // ---- the board's hanging: two rods from the ceiling to the axle ends, a short axle stub each side
  for (const s of [-1, 1]) {
    const x = BOARD.cx + s * (BOARD.w / 2 + 0.07);
    g.add(x, y1, BOARD.cz, x, BOARD.cy, BOARD.cz, 1.3, 0.85, KIND.STRUCT);
    g.add(x, BOARD.cy, BOARD.cz, x - s * 0.07, BOARD.cy, BOARD.cz, 2.2, 0.9, KIND.STRUCT);
    g.loop([[x - 0.06, y1, BOARD.cz - 0.06], [x + 0.06, y1, BOARD.cz - 0.06], [x + 0.06, y1, BOARD.cz + 0.06], [x - 0.06, y1, BOARD.cz + 0.06]], 1, 0.6, KIND.STRUCT);
  }

  // ---- tables with fixed stools
  for (const tz of TABLE_Z) for (const tx of TABLE_X) {
    const { hw, hd, h, th } = TABLE;
    g.box(tx - hw, h - th, tz - hd, tx + hw, h, tz + hd, 1.2, 0.9, KIND.FURN);
    g.add(tx, h - th, tz, tx, 0.04, tz, 1.4, 0.85, KIND.FURN);
    g.add(tx - 0.34, 0.02, tz - 0.2, tx + 0.34, 0.02, tz + 0.2, 1.2, 0.75, KIND.FURN);
    g.add(tx - 0.34, 0.02, tz + 0.2, tx + 0.34, 0.02, tz - 0.2, 1.2, 0.75, KIND.FURN);
    for (const sx of [-0.36, 0.36]) for (const sz of [-1, 1]) {
      const x = tx + sx, z = tz + sz * 0.64;
      g.circle(x, 0.46, z, 0.17, 18, 1.1, 0.85, KIND.FURN);
      g.circle(x, 0.43, z, 0.17, 18, 1, 0.45, KIND.FURN);
      g.add(x, 0.43, z, x, 0.03, z, 1.2, 0.75, KIND.FURN);
      g.circle(x, 0.02, z, 0.12, 12, 1, 0.5, KIND.FURN);
      // the arm that fixes the stool to the pedestal
      g.add(x, 0.12, z, tx, 0.12, tz + sz * 0.02, 1, 0.45, KIND.FURN);
    }
    // a napkin box on some tables
    if ((tx * 7 + tz * 3) % 2 > 0.4) g.box(tx + 0.25, h, tz - 0.12, tx + 0.42, h + 0.09, tz - 0.02, 1, 0.6, KIND.FURN);
  }

  // ---- ceiling light panels (frame: LAMP, tubes: TUBE), id = lamp index
  LAMPS.forEach(([x, z], i) => {
    const y = y1 - 0.02, hx = 0.62, hz = 0.2;
    g.loop([[x - hx, y, z - hz], [x + hx, y, z - hz], [x + hx, y, z + hz], [x - hx, y, z + hz]], 1.2, 0.9, KIND.LAMP, i);
    for (const dz of [-0.075, 0.075]) g.add(x - hx + 0.06, y - 0.03, z + dz, x + hx - 0.06, y - 0.03, z + dz, 2.4, 1, KIND.TUBE, i);
  });
  return g.done();
}
