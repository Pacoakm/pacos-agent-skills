// A small split-flap readout for `night` (the `clock` idiom, reduced): bone flaps with ink figures,
// a static top half showing the new figure, the old one's bottom half, and the falling flap between.
import { rgba } from '../../engine/palette';
import { font, measure } from '../../engine/type';
import { clamp, ease } from '../../engine/util';

export interface Flip { t: number; ch: string; dur: number }
export interface FlapModule { x: number; y: number; w: number; h: number; r: number; ev: Flip[] }

/** A flip that lands at `t` (the flap starts falling `dur` before). */
export const land = (t: number, ch: string, dur: number): Flip => ({ t: t - dur, ch, dur });

export class FlapSet {
  size = 0;
  asc = 0;
  constructor(public fam: string, w: number, h: number) {
    const mc = document.createElement('canvas').getContext('2d')!;
    mc.font = font(fam, 100);
    const a100 = mc.measureText('0123456789').actualBoundingBoxAscent / 100;
    const adv = measure('0', fam, 100) / 100;
    this.size = Math.min((w * 0.74) / adv, (h * 0.62) / a100);
    this.asc = a100 * this.size;
  }

  /** State at t: [old, new, fall progress 0..1]. */
  state(m: FlapModule, t: number): [string, string, number] {
    let a = '', b = '', p = 1;
    for (const e of m.ev) {
      if (t < e.t) break;
      a = b; b = e.ch; p = (t - e.t) / e.dur;
    }
    if (p >= 1) a = b;
    return [a, b, ease.inQuad(clamp(p))];
  }

  draw(c: CanvasRenderingContext2D, m: FlapModule, t: number, alpha = 1) {
    const [a, b, p] = this.state(m, t);
    if (a === '' && b === '') return;
    this.half(c, m, b, true, 1, 0, alpha);
    this.half(c, m, a, false, 1, 0, alpha);
    if (p < 1) {
      if (p < 0.5) this.half(c, m, a, true, Math.cos(p * Math.PI), 0.45 * (1 - Math.cos(p * Math.PI)), alpha);
      else this.half(c, m, b, false, -Math.cos(p * Math.PI), 0.55 * (1 + Math.cos(p * Math.PI)), alpha);
    }
  }

  private half(c: CanvasRenderingContext2D, m: FlapModule, ch: string, top: boolean, sy: number, shade: number, alpha: number) {
    if (ch === '' && shade === 0) return;
    const mid = m.y + m.h / 2, seam = Math.max(1.5, m.h * 0.018);
    const y0 = top ? m.y : mid + seam / 2, y1 = top ? mid - seam / 2 : m.y + m.h;
    c.save();
    c.translate(0, mid); c.scale(1, Math.max(0.001, sy)); c.translate(0, -mid);
    c.beginPath();
    c.roundRect(m.x, y0, m.w, y1 - y0, top ? [m.r, m.r, 0.5, 0.5] : [0.5, 0.5, m.r, m.r]);
    if (ch === '') { c.fillStyle = rgba('ink2', alpha); c.fill(); c.restore(); return; }
    c.fillStyle = rgba('bone', alpha);
    c.fill();
    c.clip();
    // the top half a touch darker: light from below the display
    if (top) { c.fillStyle = rgba('ink', 0.08 * alpha); c.fillRect(m.x, y0, m.w, y1 - y0); }
    c.font = font(this.fam, this.size);
    c.fillStyle = rgba('ink', alpha);
    const w = measure(ch, this.fam, this.size);
    c.fillText(ch, m.x + (m.w - w) / 2, mid + this.asc / 2);
    if (shade > 0) { c.fillStyle = rgba('ink', clamp(shade) * alpha); c.fillRect(m.x, y0, m.w, y1 - y0); }
    c.restore();
    // hinge pins at the seam
    if (top && sy === 1 && shade === 0) {
      c.fillStyle = rgba('ash', 0.9 * alpha);
      const pw = 2.5, ph = seam + 3;
      c.fillRect(m.x - pw * 0.6, mid - ph / 2, pw, ph);
      c.fillRect(m.x + m.w - pw * 0.4, mid - ph / 2, pw, ph);
    }
  }
}
