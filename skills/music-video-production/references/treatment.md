# Treatment and timeline

The treatment is the **brief every scene author works from**. The P(doom) video looks like one studio made
it because all plates obey one document; the 11:59 clip did the same. Scaffold it, then write it.

```bash
python3 <project>/analysis/scaffold_song.py --song <id> --section chorus1     # or --from 29.3 --to 45.8 / --full
```

This writes `app/src/timeline-<id>.ts` (one plate per lyric line; each cut on the last beat at/before the
line's first word; the first plate starts on the downbeat of the bar the pickup sits in) and
`docs/TREATMENT-<id>.md` with the timing section filled: every word's start time, the downbeats, the drum
drop(s), the plate windows, the clip range. Rename the plate ids to meaningful names (`clock`, `stack`…)
in both files; merge or split plates if a line is very short or very long.

## What you write (the creative half)

1. **One concept for the whole video**, in one sentence. P(doom): "plates from an illustrated treatise on
   the end of the world". 11:59: "a student's last minute before a deadline, as technical figures".
2. **A running motif** that crosses every plate (P(doom)'s orange spark: pen → loss curve → fuse; in 11:59
   the spark is the upload/progress head). It is what makes different styles read as one film.
3. **Style**: reuse the P(doom) system (`docs/TREATMENT.md` → Tone, Palette, Typography, Karaoke rules) or
   state your own: ≤ 3 colours + one accent and **which one is allowed to bloom**, type roles (display for
   the lyric, mono for "the machine", a serif for rare solemn/maths moments), motion rules (hard cuts on
   downbeats, hits on kicks, strong eases, hold-then-snap, something always moving), humour register
   (deadpan footnotes, stamps, error messages), a **not-slop list** (no neon cyberpunk, glowing brains,
   code rain, particle nebulae, lens-flare soup, stock "AI" imagery) and **originality** (no logos, no
   look-alikes of real product UIs, no copyrighted characters).
4. **Per plate**, 4–8 sentences:
   - one concrete visual idea that is a **pun or transformation** of the line, not an illustration of it;
   - how **every word** becomes part of the image (labels on a drawing, blocks on a progress bar, frames on
     a stack, glyphs of a formula) and lights exactly on its time;
   - what happens on **the drop**, each downbeat, each kick;
   - the **camera** (push, tilt up after something, whip, snap back) — even on 2D plates;
   - one **deadpan detail** (a footnote, a stamp, a wrong-but-plausible number);
   - the **hand-off**: continuity with the next plate (a clock must not run backwards across a cut).
5. **Rhythm across plates**: alternate dark and light plates (bone paper vs ink) so every cut is a jolt;
   vary scale (tiny → full-frame) and density.

## Ask the user before building

Give a short plate-by-plate summary (what we see, the hit, the joke) and wait for "OK". Offer the knobs:
another joke per plate, more of their world (school, city), light vs dark, 3D on a plate.

## 2D vs 3D

Half of the P(doom) plates are 2D graphic design; they still feel filmic because of camera moves, hits and
the global post (bloom only on the accent, halation, grain, vignette, CA, motion blur), which every plate
gets automatically. Ask for 3D (raymarched SDFs, a three.js camera) only where the idea needs space:
a tower to orbit, a room to fly through. It costs render time and review rounds.
