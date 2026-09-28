// `submit2`: the portal chrome, flat on the glass (the same hairline design as chorus 1's `submit`):
// header card, byte counter, the rules framing the viewport, footnotes and the SUBMIT button.
import { W, H } from '../../engine/gl';
import { rgba } from '../../engine/palette';
import { F, font, measure } from '../../engine/type';
import { ease, prog } from '../../engine/util';

export const VP_Y0 = 180, VP_Y1 = 901; // the viewport between the chrome's rules (screen px)
const L = 96, R = W - 96;

export interface ChromeState {
  t: number;
  header: string;
  file: string;
  mb: number; total: number;
  rate: number;
  frozen: boolean;
  tSub: number; tLine: number;
}

export function drawChrome(c: CanvasRenderingContext2D, s: ChromeState) {
  const { t, frozen } = s;
  c.save();
  c.textBaseline = 'alphabetic';
  // the viewport is cut out of the glass: ink above and below the rules
  c.fillStyle = rgba('ink', 1);
  c.fillRect(0, 0, W, VP_Y0 - 1);
  c.fillRect(0, VP_Y1 + 1, W, H - VP_Y1 - 1);
  // header
  c.font = font(F.mono(600), 22); c.fillStyle = rgba('bone', 0.95); c.textAlign = 'left';
  c.fillText(s.header, L, 122);
  c.font = font(F.mono(400), 20); c.fillStyle = rgba('ash', 1);
  c.fillText(s.file, L, 154);
  c.textAlign = 'right';
  c.font = font(F.mono(600), 34); c.fillStyle = rgba('bone', 1);
  const tot = ` / ${s.total.toFixed(1)} MB`;
  c.fillText(tot, R, 124);
  const tw = measure(tot, F.mono(600), 34);
  c.fillStyle = frozen ? rgba('bone', 1) : rgba('signal', 1);
  c.fillText((frozen ? s.total : s.mb).toFixed(1), R - tw, 124);
  c.font = font(F.mono(400), 20); c.fillStyle = rgba('ash', 1);
  c.fillText(frozen ? 'complete' : `${s.rate.toFixed(1)} MB/s`, R, 154);
  c.fillStyle = rgba('graphite', 0.9);
  c.fillRect(L, VP_Y0 - 2, R - L, 1.5);
  // footer
  c.fillRect(L, VP_Y1, R - L, 1.5);
  c.textAlign = 'left';
  c.font = font(F.mono(400), 18); c.fillStyle = rgba('ash', 0.9);
  c.fillText('the server clock is authoritative', L, 948);
  c.fillStyle = rgba('graphite', 1);
  c.fillText('late submissions are not accepted', L, 976);
  drawButton(c, t, s.tSub, s.tLine);
  c.restore();
}

function drawButton(c: CanvasRenderingContext2D, t: number, tSub: number, tLine: number) {
  const bw = 250, bh = 66, x = R - bw, y = 984 - bh;
  const e = t - tSub;
  const press = e >= 0 ? Math.pow(0.5, e / 0.06) : 0;
  const s = 1 - 0.08 * press;
  const done = t >= tLine;
  c.save();
  c.translate(x + bw / 2, y + bh / 2); c.scale(s, s);
  c.lineWidth = 2;
  if (e < 0) {
    c.strokeStyle = rgba('bone', 0.95); c.strokeRect(-bw / 2, -bh / 2, bw, bh);
    c.fillStyle = rgba('bone', 1);
  } else {
    if (press > 0.02) { c.fillStyle = rgba(press > 0.5 ? 'ember' : 'signal', press); c.fillRect(-bw / 2, -bh / 2, bw, bh); }
    c.strokeStyle = rgba(done ? 'bone' : 'signal', 1); c.strokeRect(-bw / 2, -bh / 2, bw, bh);
    c.fillStyle = press > 0.5 ? rgba('ink', 1) : rgba(done ? 'bone' : 'signal', 1);
  }
  c.font = font(F.mono(600), 26); c.textAlign = 'center';
  const pending = e >= 0;
  c.fillText('SUBMIT', pending ? 16 : 0, 9);
  if (pending) {
    const ix = -bw / 2 + 40;
    c.strokeStyle = c.fillStyle; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath();
    if (!done) {
      const a0 = e * 11;
      c.arc(ix, 0, 10, a0, a0 + 4.4);
    } else {
      const k = ease.outCubic(prog(t, tLine, tLine + 0.1));
      c.moveTo(ix - 10, 0); c.lineTo(ix - 3, 8 * Math.min(1, k * 2));
      if (k > 0.5) c.lineTo(ix - 3 + 14 * (k - 0.5) * 2, 8 - 18 * (k - 0.5) * 2);
    }
    c.stroke();
  }
  c.restore();
}

/** The stamp (flat to camera): double hairline frame, slammed in. */
export function drawStamp(c: CanvasRenderingContext2D, x: number, y: number, e: number, l1: string, l2: string, scale = 1) {
  if (e < 0) return;
  const k = (1 + 0.45 * Math.pow(0.5, e / 0.035)) * scale;
  c.save();
  c.translate(x, y); c.rotate(-0.07); c.scale(k, k);
  c.globalAlpha = prog(e, 0, 0.03);
  const w = 330, h = 104;
  c.fillStyle = rgba('ink', 0.9);
  c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = rgba('signal', 1);
  c.lineWidth = 4; c.strokeRect(-w / 2, -h / 2, w, h);
  c.lineWidth = 1.5; c.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = rgba('signal', 1);
  c.font = font(F.mono(700), 40);
  c.fillText(l1, 0, -2);
  c.font = font(F.mono(500), 24);
  c.fillText(l2, 0, 32);
  c.restore();
}
