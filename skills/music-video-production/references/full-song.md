# A full song (not a clip)

Tested on the whole of "11:59" (114 s, 20 plates, half of them 3D). Everything in the clip workflow still
applies; this file is what changes when the edit covers the entire song.

## Order of work

1. **Analyse the whole song**, then open a QA plot for *every* section, not just the chorus
   (`song_analysis.py --plot-from/--plot-to`, or several windows in one figure). On the test song the
   full-song pass exposed two line-timing errors that the chorus test never touched (a held first
   syllable dated late, a final line Whisper never heard). Fix the data before anything is built on it.
2. **Treatment for the whole song** before any new scene code: one concept, a running motif, and a
   **second running device that gives the edit a direction** — 11:59 used the time of day, staged in
   every plate in its own idiom and never running backwards across a cut
   (08:57 → 10:15 → 16:40 → 23:41 → 23:59 → 02:00 → 09:00 → 18:30 → 23:41 → 23:59 → 00:00).
3. **Timeline for the whole song** (`app/src/timeline-<id>.ts`): print the windows the app actually
   computes (headless boot, read `__pdoom.timeline`) and check them against the treatment.
4. Scenes in waves, review each as it lands, then a full cut sheet, then the render.

## Repeated sections

Pre-choruses and choruses are sung twice or more with the same words:

- **One module, `params.n`**, when the plate should repeat: `E('logout2', 'logout', …, { params: { n: 1 } })`,
  and in the scene `const n = this.ctx.params.n ?? 0; this.ctx.lyrics.get('Blackboard, please', n)`.
  Escalate one notch per repeat (a "SECOND NOTICE" header, a shorter countdown, a worse footnote).
- **A new module per repeat** when the repeat should look different. 11:59's second chorus is the first
  chorus **rebuilt in 3D** (`clock2`, `stack2`, `submit2`, `bigo2`): same figures, same jokes, one
  dimension worse. That gave the 3D half a narrative reason. Give the rebuild to the author of the
  original plate (it still has its context) and let it export helpers from the original module — then
  make it prove the original renders identically (md5/PSNR on two stills).

## How many agents at once

Four authors in parallel on a 16 GB M4 was comfortable (each renders with its own headless Chromium and
Vite server). Refill a slot as soon as one plate is approved. Wall-clock on the test song: ~3.5 h from
approved treatment to approved last plate, each plate 13–27 min of agent time.

## Continuity is the lead's job

Authors can't see their neighbours. After each approval, pass the facts across the cut:

- **Positions**: "upload2 ends on black, a hairline at screen y ≈ 771 from x 448 to 1472, the spark at its
  right end" — the next author starts from exactly that. Check with a two-plate still
  (`--only a,b --t <cut−0.04>,<cut+0.02>`) or a 50/50 blend of the frames either side.
- **Numbers**: clocks, file names, assignment numbers, percentages (ASSIGNMENT 3 in chorus 1, 4 in chorus 2).
- **Reused drawings**: `canteen-menu.ts` exported `drawDreamMenu(...)` so the outro could show the same menu.
- **Order**: build a plate whose opening depends on another plate's last frame *after* that plate
  (the outro was built last; its first version guessed the hand-off and had to be fixed).

## Cut-point pitfalls

- **A plate's last word sung just before the cut.** `cut()` snaps to the beat at/before the next line's
  first word; if the previous line ends later than that (canteen's "dream" at 57.19, cut at 57.28), it
  gets ~5 frames. Cut half a beat later (`cutHalf`) or move the word to the next plate.
- **Pickups.** A chorus that starts with a pickup ("Eleven" before the drop) should start its plate on the
  downbeat of the bar the pickup sits in (`barBefore(first(...))`), so the drop lands inside the plate.
- **The drop after a silence.** If the song goes silent before a chorus (11:59: 82.2 → 83.9), let the
  previous plate collapse on the silence and the next plate build in it.

## Render

- Booting all plates at once is heavier than any single-plate test; the render script's boot timeout is
  now 10 min (`BOOT_TIMEOUT_MS`). If a full render fails at boot, first time a still with no `--only`.
- 11:59, 114 s at 1080p60 with adaptive motion blur on an M4: **40 min**, master 842 MB, share copy 270 MB.
  3D plates with whips drop the rate from ~3.6 to ~2.8 frames/s.
- Pull 15–20 frames from the MP4 (every drop, every whip, the last frame) and check the audio before sending.
