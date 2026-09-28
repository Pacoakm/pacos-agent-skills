// The edit for "11:59" (?song=1159): the whole song, one plate per lyric line or pair of lines.
// Boundaries are anchored to lyric lines and snapped to the beat grid, like src/timeline.ts.
// The pre-chorus and chorus lyrics are sung twice: `nth` 0 is the first time, 1 the second.
// The first chorus is 2D; the second chorus is the same four figures rebuilt in 3D (clock2 … bigo2).
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
  /** Last downbeat before t (the bar a pickup sits in). */
  const barBefore = (t: number) => [...au.downbeats].reverse().find((d) => d <= t - 0.05) ?? 0;
  const first = (q: string, nth = 0) => ly.get(q, nth).words[0]!.start;
  /** Cut on the last half-beat at/before the first word (when the previous plate's last word needs the time). */
  const cutHalf = (q: string, nth = 0, tol = 0.02) => au.timeOfBeat(Math.floor(au.beatAt(first(q, nth) + tol) * 2) / 2);

  const b = {
    bus: 0,
    tabs: cut('Lecture notes in fifteen tabs'),
    induction: cut('Proof by induction'),
    logout1: cut('Blackboard, please', 0),
    upload1: cut("I'm one upload", 0),
    clock: barBefore(first('running out of time', 0)), // the bar the pickup "Eleven" sits in
    stack: cut('Coffee in my veins', 0),
    submit: cut('submit before the line', 0),
    bigo: cut('O of n squared', 0),
    night: bar(ly.get('O of n squared', 0).end + 0.3),
    canteen: barBefore(first('Canteen at two')), // the drum break
    timetable: cutHalf('Discrete math'), // half a beat later than cut(): canteen's last word "dream" (57.19) needs it
    linkedlist: cut('Linked list of my worries'),
    logout2: cut('Blackboard, please', 1),
    upload2: cut("I'm one upload", 1),
    clock2: barBefore(first('running out of time', 1)),
    stack2: cut('Coffee in my veins', 1),
    submit2: cut('submit before the line', 1),
    bigo2: cut('O of n squared', 1),
    outro: bar(ly.get('O of n squared', 1).end + 0.3),
    end: au.duration,
  };

  const E = (id: string, file: string, start: number, end: number, extra: Partial<TimelineEntry> = {}): TimelineEntry =>
    ({ id, load: scene(file), start, end, ...extra });

  return [
    E('bus', 'bus', b.bus, b.tabs),
    E('tabs', 'tabs', b.tabs, b.induction),
    E('induction', 'induction', b.induction, b.logout1),
    E('logout1', 'logout', b.logout1, b.upload1, { params: { n: 0 } }),
    E('upload1', 'upload', b.upload1, b.clock, { params: { n: 0 } }),
    E('clock', 'clock', b.clock, b.stack),
    E('stack', 'stack', b.stack, b.submit),
    E('submit', 'submit', b.submit, b.bigo),
    E('bigo', 'bigo', b.bigo, b.night),
    E('night', 'night', b.night, b.canteen),
    E('canteen', 'canteen', b.canteen, b.timetable),
    E('timetable', 'timetable', b.timetable, b.linkedlist),
    E('linkedlist', 'linkedlist', b.linkedlist, b.logout2),
    E('logout2', 'logout', b.logout2, b.upload2, { params: { n: 1 } }),
    E('upload2', 'upload', b.upload2, b.clock2, { params: { n: 1 } }),
    E('clock2', 'clock2', b.clock2, b.stack2),
    E('stack2', 'stack2', b.stack2, b.submit2),
    E('submit2', 'submit2', b.submit2, b.bigo2),
    E('bigo2', 'bigo2', b.bigo2, b.outro),
    E('outro', 'outro', b.outro, b.end),
  ];
}
