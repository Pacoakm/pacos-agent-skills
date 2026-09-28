# "11:59" test clip — treatment

A 16-second test of the P(doom) pipeline on a new song: the first chorus of "11:59", an original electro-pop song about a university student racing a midnight submission deadline (Suno, female lead, 130.09 BPM, four-on-the-floor). Preview: `http://localhost:5173/?song=1159&t=29.3`. Renders: add `--song 1159` to every `render.ts` command.

The clip is **29.3 → 45.8 s** of the song. Four plates, one per lyric line, hard cuts on the beat (`src/timeline-1159.ts`).

## Style (inherits `docs/TREATMENT.md`)

Same palette, type system, grain and dry humour as the P(doom) video: read its sections *Tone*, *Palette*, *Typography* and *Karaoke rules* — they apply here unchanged. In short:

- ink `#0A0A0B` / bone `#EEE9DF` / one hazard orange (signal `#FF4D12`, ember `#FF8A3D`). No other hues. Only orange blooms.
- Archivo (lyric voice, animate width/weight), IBM Plex Mono (the machine: timestamps, code, labels, footnotes), Cormorant Garamond italic (rare, for maths like *O*(*n*²)).
- Big changes land on the beat: cuts on downbeats, hits on kicks, strong eases (`outExpo`, springs), holds then snaps. Something always moves.
- Deadpan scientist humour: tiny mono footnotes, stamps, error messages. No emoji, no cartoon faces, no mascots.
- **Not slop**: no neon cyberpunk, glowing brains, code rain, particle nebulae, lens-flare soup.
- **Originality**: no logos or imitation of real product UIs (no CUHK crest, no Blackboard/Moodle/Canvas look-alikes: the "submission portal" is our own generic hairline design); no copyrighted characters.
- **The spark** (`_motifs.ts`: `sparkHead`, `sparkParticles`): here it is *the upload progress head*. It appears in every plate.
- Karaoke: every word appears/highlights exactly at its `start` (`Lyrics.wordProgress`), never early; unsung words dim (30–40% bone). The words are part of the image, not subtitles. Title-safe ≥ 96 px from the edges. The HUD is off (no P(doom) readout in this clip).

## Timing (seconds, from `data/1159/*.json` — look lines up by content in code, never hard-code)

- `Eleven fifty-nine, I'm running out of time`: Eleven 29.60, fifty-nine 30.26, I'm 30.94, running 31.41, out 31.76, of 32.10, time 32.34
- `Coffee in my veins and a stack I can't unwind`: Coffee 33.11, in 33.51, my 33.94, veins 34.20, and 34.60, a 34.88, stack 35.02, I 35.34, can't 35.53, unwind 35.88
- `Eleven fifty-nine, submit before the line`: Eleven 36.99, fifty-nine 37.62, submit 38.33, before 38.68, the 39.40, line 39.64
- `O of n squared panic, but I'm doing fine`: O 40.40, of 40.70, n 40.95, squared 41.19, panic 41.44, but 42.97, I'm 43.78, doing 44.31, fine 44.74 (held to ~45.4)
- Downbeats: 28.69, 30.53, 32.38, 34.22, 36.07, 37.91, 39.76, 41.60, 43.45, 45.29, 47.14. Beat period 0.4612 s.
- **The drop**: 28.69–30.53 is the pre-chorus tail with **no drums** (a rising synth). Drums enter at **30.53**, a downbeat, on the "-nine" of the first "fifty-nine". Kicks then land on every beat (`f.a.kick`, `audio.events('kick', …)`).

## Plates

| id | file | window | line |
|---|---|---|---|
| `clock` | `scenes/1159/clock.ts` | 28.69 → 32.84 | Eleven fifty-nine, I'm running out of time |
| `stack` | `scenes/1159/stack.ts` | 32.84 → 36.99 | Coffee in my veins and a stack I can't unwind |
| `submit` | `scenes/1159/submit.ts` | 36.99 → 40.22 | Eleven fifty-nine, submit before the line |
| `bigo` | `scenes/1159/bigo.ts` | 40.22 → 47.14 | O of n squared panic, but I'm doing fine |

### `clock` — "Eleven fifty-nine"
Lead-in (28.69 → 29.6): near-black; one hairline and a small Plex Mono footnote `submission closes 23:59:59` types itself in; the spark idles at the end of the hairline, breathing with the rising synth. "Eleven fifty-": a split-flap clock (our own hairline design, bone flaps on ink) flips its digits from `23:58` toward `23:59`, one flap per syllable, the flaps tightening like a drum roll. **30.53, the drop**: the display slams `23:59` full-frame (Archivo 900, wide), shake + flash, the colon pulses orange on every kick from here on; "NINE" is the hit. "I'm running out of time": a seconds readout `:52 :53 :54 …` ticks one per beat under the big digits; the lyric sits on a horizontal "time remaining" bar that burns down from right to left behind the spark as each word is sung (each word a segment of the bar); footnote `time remaining is an estimate`. The camera pushes in a little on each downbeat.

### `stack` — "Coffee in my veins and a stack I can't unwind" (light plate)
Inverted: **bone paper, ink lines** (a strong light/dark cut on the beat). A technical line drawing of a call stack, drawn like a textbook figure (hairlines, a mono `FIG. 2  call stack at 23:59` caption). On every kick a new frame is **pushed** on top with a mechanical snap: `coffee()`, `coffee()`, `proof_by_induction(n+1)`, `essay_v7_final_FINAL()`, `coffee()`, `linked_list_of_worries()`, `coffee()`, … each frame a hairline box with its mono label. The lyric words are **stamped into the frames** as they are sung (Archivo, ink; the sung word takes the orange). The coffee frames carry a small hand-drawn cup glyph (our own, simple hairline). "stack": the stack grows past the top of the frame and the camera tilts up to keep up. "I can't unwind": a `pop()` is attempted on "unwind" — the stack wobbles, refuses, and a red-orange stamp / mono error lands: `RecursionError: maximum caffeine depth exceeded`. The spark here is the stack pointer (an orange arrow + spark) riding the top frame.

### `submit` — "Eleven fifty-nine, submit before the line"
Back to ink. A horizontal timeline strip across the frame, graduated in seconds like a ruler (`23:59:50 … 23:59:59`), with a vertical **orange deadline line** at `23:59:59` near the right edge. The spark is the **upload progress head** racing left→right toward it; behind it the lyric words are laid on the strip as **uploaded file chunks** (each word a block that fills as sung; a mono byte counter `12.4 / 38.0 MB` ticks up). "submit": a hairline button `SUBMIT` is pressed with a slam (on 38.33). "the line": the head decelerates hard; on "line" (39.64) it touches the deadline line exactly — freeze-frame feel, flash, and a stamp `SUBMITTED 23:59:59.97` with a mono footnote `30 ms to spare`. The camera rides with the head (slow push, then a snap on "line").

### `bigo` — "O of n squared panic, but I'm doing fine"
Graph paper (ink background, bone grid hairlines, mono axis labels): x = `n (assignments due)`, y = `panic`. The spark draws *O*(*n*²) (Cormorant italic label) one step per beat on "O / of / n / squared", accelerating upward; on "panic" it shoots off the top of the frame and the camera tilts up after it (whip), grid lines streaking. **43.45 (downbeat), "but I'm doing fine"**: hard snap back down past the origin to a perfectly flat line along the bottom labelled `O(1)`: "but I'm doing" typeset calmly along it (Archivo 300, relaxed), "fine" lands on the line with a small superscript ¹ and a footnote `¹ amortized`. Hold to the end, the spark resting on the flat line, breathing. Fade to black at the very end (the last ~0.5 s before 47.14 can fade; the clip is cut at 45.8 anyway, so the frame at ~45.5 must be a good final frame).
