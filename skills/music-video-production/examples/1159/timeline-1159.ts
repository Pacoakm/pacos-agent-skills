// The edit for the "11:59" test clip (?song=1159): the first chorus, one plate per line.
// Boundaries are anchored to lyric lines and snapped to the beat grid, like src/timeline.ts.
import type { TimelineEntry } from './engine/engine';
import type { SceneClass } from './engine/scene';
import type { Lyrics } from './engine/lyrics';
import type { AudioData } from './engine/audio';

const modules = import.meta.glob<{ default: SceneClass }>('./scenes/1159/*.ts');
const scene = (name: string) => () => {
  const m = modules[`./scenes/1159/${name}.ts`];
  return m ? m() : Promise.reject(new Error(`scene module not found: scenes/1159/${name}.ts`));
};

export function makeTimeline(ly: Lyrics, au: AudioData): TimelineEntry[] {
  /** Cut on the last beat at/before the first word of the matching line. */
  const cut = (q: string, nth = 0, tol = 0.02) => {
    const s = ly.get(q, nth).words[0]!.start;
    return au.timeOfBeat(Math.floor(au.beatAt(s + tol)));
  };
  /** First downbeat at/after t. */
  const bar = (t: number) => au.downbeats.find((d) => d >= t - 0.02) ?? au.duration;

  const b = {
    clock: bar(28.5), // the pre-chorus's last bar: a lead-in before the pickup "Eleven"
    stack: cut('Coffee in my veins', 0),
    submit: cut('submit before the line', 0),
    bigo: cut('O of n squared', 0),
    end: bar(ly.get('O of n squared', 0).end + 0.3),
  };

  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });

  return [
    E('clock', 'clock', b.clock, b.stack),
    E('stack', 'stack', b.stack, b.submit),
    E('submit', 'submit', b.submit, b.bigo),
    E('bigo', 'bigo', b.bigo, b.end),
  ];
}
