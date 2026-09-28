# Lead review

Never forward an author's report to the user unreviewed. For each plate, **open** the contact sheet and
the 1–3 best stills yourself, then decide: approve, or send back specific fixes (a time, a frame, what to
change). Small fixes go back to the same author (it keeps its context); don't rewrite their plate yourself.

## Checklist per plate

- [ ] Every lyric word is readable at 1080p in the frame where it is sung; nothing clipped by the frame or
      another element; title-safe (≥ 96 px from the edges).
- [ ] A word lights **on** its start time, never early; unsung words dim, sung ones distinct.
- [ ] The drop / downbeats / kicks produce visible hits (flip, slam, push, shake, flash, stamp).
- [ ] Something moves in every half-second; holds are deliberate.
- [ ] One accent colour, and only it blooms; paper plates never bloom.
- [ ] Typography: real kerning, typographic quotes and dashes (’ “ ” – —), real superscripts, no
      outlined/haloed type, mono only for the "machine" voice.
- [ ] The joke reads in the time it's on screen.
- [ ] Original: no logos, no product-UI look-alikes, no copyrighted characters.
- [ ] First and last frames of the window are clean (no element mid-flip exactly on the cut).
- [ ] Continuity with neighbours: numbers, clocks, the motif's position don't contradict across a cut.
- [ ] Performance < 25 ms/frame (the author's `perf` numbers).

## After all plates

```bash
bun scripts/render.ts sheet --song <id> --url http://localhost:1 --cuts --cols 4 --out ../out/<id>-cuts.png
```
Four frames around every boundary: hard cut exactly on the beat, the new plate's first frame already
reads, dark/light alternation lands, no blank frames.

## Findings from the test clip (examples of real review notes)

- `clock` started a seconds-flap flip 0.08 s before the cut, so the last frame showed a flap mid-air → skip
  flips within 0.05 s of the window end.
- `clock` ended at 23:59:55 while `submit`'s ruler began at 23:59:50 → the next plate's head starts at :56.
- `stack`: the word "stack" had no moment of its own (the camera was already tilting) — logged for a
  revision 2 rather than blocking.
- `submit`: the camera tracked the head at ~1000 px/s — acceptable only once the motion-blurred export
  was checked.
- `bigo`: `flash` greyed the whole ink frame even at 0.05 → carried the snap with streaks and shake instead.

Leave taste calls to the user after they see the render; list the candidates for "revision 2".
