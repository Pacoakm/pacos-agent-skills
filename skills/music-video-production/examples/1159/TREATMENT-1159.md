# "11:59" — full music video treatment

The whole song (0 → 114.33 s): an original electro-pop song about a university student racing midnight deadlines (Suno, female lead, 130.09 BPM, four-on-the-floor). Preview: `http://localhost:5173/?song=1159&t=0`. Renders: add `--song 1159` to every `render.ts` command. The first chorus (`clock`, `stack`, `submit`, `bigo`) was made and approved first as a test clip; this document extends it to the full song.

## The idea

**One student's day and night, drawn as figures from a textbook** — transit diagrams, tab strips, proofs, forms, timetables, data structures, charts. Every plate is a technical figure of a small disaster, typeset with a straight face. The story climbs to a deadline twice (chorus 1, chorus 2) and ends on a joke (the outro).

Two running devices tie the plates together:

1. **The spark** = the student's cursor / progress head (the bus on its route, the reading position, the proof's pointer, the upload head, the traversal pointer). It appears in every plate.
2. **The time of day**, staged inside each plate in its own idiom (a timetable cell, a dialog countdown, a flap display, a receipt timestamp): 08:57 → 10:15 → 16:40 → 23:41 → 23:58 → **23:59** → 00:00…02:00 → 02:00 → 09:00 → 18:30 → 23:41 → 23:58 → **23:59** → 00:00. It never runs backwards across a cut.

Light/dark rhythm: bone-paper plates (`bus`, `induction`, `stack`, `timetable`) alternate with ink plates.

## Style (inherits `docs/TREATMENT.md`)

Same palette, type system, grain and dry humour as the P(doom) video: read its sections *Tone*, *Palette*, *Typography* and *Karaoke rules* — they apply here unchanged. In short:

- ink `#0A0A0B` / bone `#EEE9DF` / one hazard orange (signal `#FF4D12`, ember `#FF8A3D`). No other hues. Only orange blooms.
- Archivo (lyric voice, animate width/weight), IBM Plex Mono (the machine: timestamps, code, labels, footnotes), Cormorant Garamond italic (rare, for maths like *O*(*n*²)).
- Big changes land on the beat: cuts on downbeats, hits on kicks, strong eases (`outExpo`, springs), holds then snaps. Something always moves.
- Deadpan scientist humour: tiny mono footnotes, stamps, error messages. No emoji, no cartoon faces, no mascots.
- **Not slop**: no neon cyberpunk, glowing brains, code rain, particle nebulae, lens-flare soup.
- **Originality**: no logos or imitation of real product UIs (no CUHK crest, no Blackboard/Moodle/Canvas look-alikes: the "submission portal" is our own generic hairline design); no copyrighted characters.
- **The spark** (`_motifs.ts`: `sparkHead`, `sparkParticles`): here it is *the upload progress head*. It appears in every plate.
- Karaoke: every word appears/highlights exactly at its `start` (`Lyrics.wordProgress`), never early; unsung words dim (30–40% bone). The words are part of the image, not subtitles. Title-safe ≥ 96 px from the edges. The HUD is off (no P(doom) readout).

## 3D (half the plates)

Ten of the twenty plates are 3D: `bus`, `induction`, `night`, `canteen`, `linkedlist`, the whole **second chorus** (`clock2`, `stack2`, `submit2`, `bigo2`) and `outro`. The second chorus is the first chorus **rebuilt in 3D**: the same deadline comes back, one dimension worse. That is the escalation (like the P(doom) hooks), so chorus-2 plates must read as the same figures as chorus 1, now with depth, not as new ideas.

How 3D looks here — a **technical figure with depth**, never "default 3D":
- Build with three.js: `LineBatch` in 3D with a `THREE.PerspectiveCamera` (see `loss.ts`, `open.ts`, `spacetime.ts`), meshes with a custom `ShaderMaterial` using `hatch()` / `engrave()` for shaded faces (see `stack.ts` + `stack-kit.ts`), or `room.ts`'s own pinhole projection of 3D segments. Raymarching (`shoggoth-glsl.ts`, `ilya-glsl.ts`) only if a plate truly needs it.
- **Never** `MeshStandardMaterial` / `MeshPhongMaterial` / default lights: no plastic, no gradients from a lamp. Faces are flat bone or ink with hatching; edges are hairlines; depth reads through line weight, fog into ink, and hatch density.
- Same palette: ink void (or bone paper), bone lines, one orange accent that alone may bloom.
- Text stays readable and flat to camera unless the joke needs it on a surface (then it is still legible at its sung moment).
- The camera is the star: slow push/orbit between hits, snaps and whips on downbeats, cranes on the drop; always eased (`outExpo`, springs). Keep motion inside what the adaptive motion blur makes smooth.
- Budget: < 25 ms/frame at 1080p in the preview (single sample).

## Timing

All times come from `data/1159/*.json`: look lines up by content (`lyrics.get('first words', nth)`), never hard-code. The pre-chorus and chorus lyrics are sung twice: **nth = 0 is the first time, nth = 1 the second** — plates that play twice take `ctx.params.n` (0 or 1) and pass it as `nth`.

| line | first word | sung | notes |
|---|---|---|---|
| Missed my stop on the school bus, climbing up the hill | 0.64 | → 3.94 | the song starts singing at once; no drums |
| Lecture notes in fifteen tabs, and I have read them nil | 4.15 | → 8.30 | no drums |
| Proof by induction, step one looks alright | 8.30 | → 11.30 | **drums enter 8.39** (downbeat) on "Proof" |
| Step n plus one is due tonight | 11.96 | → 14.98 | |
| Blackboard, please don't log me out (1) | 15.90 | → 19.33 | **drums out** from ~15.8; "Blackboard," held to ~17.4 |
| I'm one upload from figuring it out (1) | 21.88 | → 27.74 | "out" held 26.62 → 27.74, then a rising build to 28.69 |
| chorus 1 (4 lines) | 29.60 | → 45.72 | see the chorus plates below; **drop 30.53** |
| (instrumental, drums on) | | 45.7 → 52.67 | |
| Canteen at two a.m.? No, that's just a dream | 53.18 | → 57.56 | **drum break** 52.67 → 54.52 (drums back on "at two"), again 56.36 → 57.74 |
| Discrete math at nine a.m., nothing's what it seems | 57.67 | → 61.34 | drums back **57.74** on "Discrete" |
| Linked list of my worries, each one points to the next | 61.40 | → 65.04 | |
| Null at the end means I finally rest | 65.36 | → 68.74 | "rest" held |
| Blackboard, please don't log me out (2) | 69.25 | → 73.30 | "Blackboard," held to ~70.3; quiet, no drums |
| I'm one upload from figuring it out (2) | 75.89 | → 81.16 | **drums enter 76.66**; a snare-roll build ~80.3 → 82.2; **silence 82.2 → ~83.9** |
| chorus 2 (4 lines) | 83.00 | → 99.12 | same words as chorus 1; the drop lands on the **84.03** downbeat ("-nine") |
| (instrumental, a vocal "ah" pad, a pitch slide down at ~102.2) | | 99.1 → 105.2 | |
| Upload complete. | 105.20 | → 106.18 | |
| (drums on, no vocal) | | 106.2 → 111.7 | drums stop ~111.7 |
| ...wrong file. | 112.24 | → 114.16 | alone, no drums; the song ends 114.33 |

Downbeats every 1.8448 s from 1.01 (… 8.39, 15.77, 28.69, 30.53, 47.14, 52.67, 54.52, 57.74*, 68.81†, 76.66, 82.19, 84.03, 100.64, 104.33, 111.71, 113.55). (*57.74 is the drum re-entry, a beat before the 58.21 downbeat. †68.81 is a beat, 69.28 the downbeat.)

## Plates

| id | file | params / 3D | window | line(s) |
|---|---|---|---|---|
| `bus` | `scenes/1159/bus.ts` | 3D | 0 → 3.78 | Missed my stop on the school bus… |
| `tabs` | `scenes/1159/tabs.ts` | | 3.78 → 7.93 | Lecture notes in fifteen tabs… |
| `induction` | `scenes/1159/induction.ts` | 3D | 7.93 → 15.77 | Proof by induction… / Step n plus one… |
| `logout1` | `scenes/1159/logout.ts` | `n: 0` | 15.77 → 21.77 | Blackboard, please don't log me out |
| `upload1` | `scenes/1159/upload.ts` | `n: 0` | 21.77 → 28.69 | I'm one upload from figuring it out |
| `clock` | `scenes/1159/clock.ts` | | 28.69 → 32.84 | Eleven fifty-nine, I'm running out of time |
| `stack` | `scenes/1159/stack.ts` | | 32.84 → 36.99 | Coffee in my veins… |
| `submit` | `scenes/1159/submit.ts` | | 36.99 → 40.22 | Eleven fifty-nine, submit before the line |
| `bigo` | `scenes/1159/bigo.ts` | | 40.22 → 47.14 | O of n squared panic, but I'm doing fine |
| `night` | `scenes/1159/night.ts` | 3D | 47.14 → 52.67 | (instrumental) |
| `canteen` | `scenes/1159/canteen.ts` | 3D | 52.67 → 57.28 | Canteen at two a.m.? … |
| `timetable` | `scenes/1159/timetable.ts` | | 57.28 → 60.97 | Discrete math at nine a.m.… |
| `linkedlist` | `scenes/1159/linkedlist.ts` | 3D | 60.97 → 68.81 | Linked list of my worries… / Null at the end… |
| `logout2` | `scenes/1159/logout.ts` | `n: 1` | 68.81 → 75.73 | Blackboard, please don't log me out |
| `upload2` | `scenes/1159/upload.ts` | `n: 1` | 75.73 → 82.19 | I'm one upload from figuring it out |
| `clock2` | `scenes/1159/clock2.ts` | 3D | 82.19 → 86.34 | Eleven fifty-nine, I'm running out of time |
| `stack2` | `scenes/1159/stack2.ts` | 3D | 86.34 → 90.03 | Coffee in my veins… |
| `submit2` | `scenes/1159/submit2.ts` | 3D | 90.03 → 93.72 | Eleven fifty-nine, submit before the line |
| `bigo2` | `scenes/1159/bigo2.ts` | 3D | 93.72 → 100.64 | O of n squared panic, but I'm doing fine |
| `outro` | `scenes/1159/outro.ts` | 3D | 100.64 → 114.33 | Upload complete. / ...wrong file. |

### `bus` — "Missed my stop" (light plate, no drums)
**3D**: the hill is a real 3D contour terrain (stacked hairline contour rings, like `loss.ts`'s landscape, on bone paper with ink lines); the road winds up it; the camera flies behind and above the spark up the switchbacks, cranes up on "climbing up the hill". The stop markers and text labels stay flat to camera. Bone paper. A **transit diagram of a hill road** of our own design: the road as a thick hairline climbing in switchbacks across contour lines (elevation labels `+20 m`, `+40 m`, `+60 m`), stops as circles with mono labels `STOP 1` … and one `YOUR STOP · LECTURE 09:00`. The spark is the bus. The lyric is set **along the road** (text on path), each word appearing as the bus passes it. "Missed my stop": the spark sails straight past `YOUR STOP`; an orange ✕ lands on it and a tiny callout `not requested`. "climbing up the hill": the camera tilts up the route with the bus, the road steepening, elevation labels ticking. A small time label near the stop: `08:57`. Footnote: `next bus: 23 min`. No cartoon bus, no real route map, no university names.

### `tabs` — "Lecture notes in fifteen tabs" (ink)
A **tab strip** of our own hairline design (not any real browser's look). On each beat a tab opens (`Lec01.pdf`, `Lec02.pdf`, …) until **15** tabs are crammed so narrow their titles collapse to slivers; the words of the lyric live on the active page below the strip, one word lighting per sung word. A mono counter `open: 15   read: 0 / 15`. "and I have read them **nil**": the counter slams to `0` and the page shows an empty-set **∅** in Cormorant, big; each tab gets a tiny unread dot. Time label `10:15`. Footnote `unread since week 1`. Hand-off: the page wipes to bone paper on the cut into `induction`.

### `induction` — "Proof by induction" (light plate; the drums enter)
**3D**: the dominoes are hatched 3D slabs standing on the proof page (a paper plane in perspective); the camera starts high on the printed proof box, drops to a low angle along the domino row on the 8.39 drum entry, and tracks the falls; on "tonight" it holds on the wobbling *n* + 1 slab. A **textbook proof box** on bone paper: *Proof (by induction on n).* Two movements.
1. "Proof by induction, step one looks alright" — **8.39, drums enter**: on the downbeat the proof box draws in with a slam; a row of hairline dominoes stands on a baseline, labelled 1, 2, 3, …; "step one looks alright": domino 1 is checked `P(1) ✓` (a hairline check, then an orange stamp `BASE CASE OK`).
2. "Step n plus one is due tonight" — the dominoes fall one per kick along the row toward a domino labelled *n* + 1 (Cormorant italic), which carries a tag `due 23:59`; the fall **stops one domino short** on "tonight" and the *n* + 1 domino wobbles, standing. The end-of-proof box ∎ is drawn dashed and empty. Footnote `inductive step: TODO`. Time label `16:40`.
The lyric is typeset as the proof's text: each word lights as sung; *P*(*n*) etc. in Cormorant italic.

### `logout` (`n: 0` → `logout1`, `n: 1` → `logout2`) — "please don't log me out" (ink, quiet)
A **session-timeout dialog** of our own generic hairline design (no logo, no LMS look: the word "Blackboard" appears only as the sung lyric). "Blackboard," is held: the word stretches wide across the dialog (Archivo width 62 → 125 while the note is held). The dialog says `Your session will expire in 00:59`, the countdown ticking once per beat. "please don't log me out": typed as the plea over two buttons `[ stay signed in ]  [ log out ]`; the cursor (the spark) hovers between them, drifting toward *log out* on "out" — then snaps onto *stay signed in* at the last moment; the countdown freezes at `00:01`. Time label `23:41`. Footnote `inactivity detected: 3 h 12 min`.
`n: 1` (second time): the same dialog, one notch worse: countdown starts at `00:30`, footnote `inactivity detected: again`.

### `upload` (`n: 0` → `upload1`, `n: 1` → `upload2`) — "I'm one upload from figuring it out" (ink, a build)
One **huge progress bar**, stuck at **99 %**. The lyric sits on the bar; each word lights as sung. The "time remaining" estimate under it jumps absurdly on the beats (`2 s` → `5 min` → `3 h` → `calculating…`). The held "out" (≈ 1 s): the bar's last percent strains, flickers `99.9 %`. Then the build: everything collapses into **a single hairline with the spark at its end**, on black — exactly the first image of `clock` (read `clock.ts`: its lead-in draws one hairline with the spark idling at its end). Match its position so the cut is seamless.
`n: 1`: the drums enter at 76.66 and a snare-roll builds 80.3 → 82.2: the percentage creeps `99.0 → 99.9` with the roll, the bar shakes, then **silence at 82.2**: the collapse to the hairline happens on the silence.

### chorus 2 in 3D (`clock2`, `stack2`, `submit2`, `bigo2`)
The second chorus replays the four approved chorus-1 plates **rebuilt in 3D**: same figure, same beats, same jokes, one notch worse. Each is its own module (`scenes/1159/<plate>2.ts`, may import helpers from its chorus-1 module) and looks its lyric up with `nth = 1`. The drop is the **84.03** downbeat ("-nine"); chorus 2 has a silence 82.2 → ~83.9 before it.
- `clock2`: a **3D split-flap unit** — real flaps rotating on their hinge axis, seen at an angle; the camera cranes around the unit and slams in on the drop; the time-remaining bar becomes a burning 3D fuse-rail in front of it. Footnote `submission closes 23:59:59 · assignment 4`.
- `stack2`: the call stack as a **3D tower** of hatched slabs; each kick drops a frame onto it from above; the camera orbits and cranes up after the top on "stack"; on "unwind" the tower sways, the top slab lifts and slams back; the stamp `maximum caffeine depth exceeded (again)` lands on a slab face.
- `submit2`: the ruler as a **runway** in perspective toward a deadline **gate** (an orange frame standing across the track at 23:59:59); the camera chases the head low over the track; header card `ASSIGNMENT 4 — UPLOAD`; on "line" the head passes the gate plane exactly: `SUBMITTED 23:59:59.99` / `10 ms to spare`.
- `bigo2`: *O*(*n*²) as a **3D paraboloid** (a hairline mesh surface z = x² + y² over the graph-paper floor); the spark climbs the surface; on "panic" the camera whips up the wall; the 95.10 downbeat… "but I'm doing fine": snap down onto the flat plane at z = 1 (`O(1)`), the words laid on it; footnote `¹ amortized, allegedly`. It ends resolved and still: `outro` builds out of it.

### `night` — 00:00 → 02:00 (ink, instrumental, drums on)
**3D**: the ruler is a **tunnel of hour rings** (hairline rings with mono tick labels) the camera flies through, one ring (+10 min) per beat; the log lines hang beside the path as flat cards. After `bigo`'s fade: **a time-lapse of the night** as a log. A horizontal ruler `00:00 … 02:00`; the spark runs along it, **+10 min per beat** (12 beats = 2 h, landing on 02:00 at 52.67). As it passes, mono log lines stamp in beside it, deadpan: `00:00 submitted ✓`, `00:10 refreshed the portal`, `00:20 refreshed the portal`, `00:30 refreshed the portal ×9`, `01:10 opened the fridge (empty)`, `01:40 hungry`, `02:00` …; a small split-flap readout (the `clock` idiom, small) flips with it. Downbeats push the camera in. Hand-off: 02:00 lands on the drum break into `canteen`.

### `canteen` — "Canteen at two a.m.?" (ink, the drum break)
**3D**: a hairline wireframe canteen interior (counter, tables, stools, the board on the back wall), dark; the camera pushes in toward the board through the break, the dream menu lights up in space above the counter, and on "No, that's just a dream" the lights snap off and the room falls back to dashed outlines. **An opening-hours board** of our own design: `CANTEEN · 07:30 – 21:00`, an hours bar with the open span filled. 52.67 → 54.52 the drums are out: the board is dim, only the time `02:00` blinks on the far right of the hours bar, far outside the open span. "Canteen at two a.m.?": the menu board lights up **dream-like** — dim bone items with orange price tags (generic dishes, e.g. `fish-ball noodles  $32`, `milk tea  $18`), drawn in dashed hairlines; the drums return at 54.52 on "at two": the items pop in on the kicks. "No, that's just a dream" (drums out again 56.36): the lights snap off, the board flips to `CLOSED`, the menu dissolves into dotted outlines. Footnote `menu shown for illustrative purposes only`. Keep one small menu drawing re-usable: the `outro` shows it again.

### `timetable` — "Discrete math at nine a.m." (light plate; drums back)
**A weekly timetable** on bone paper (Mon–Fri × 08:30–18:30, hairline grid, mono headers). **57.74, drums back** on "Discrete": the `09:00 DISCRETE MATH` block slams in, filled orange, on the hit. "nothing's what it seems": the grid turns into logic — the block's label gains a ¬ (Cormorant), cells rearrange by a bijection (hairline arrows mapping cell to cell, on the beats), the headers become `∀ day ∃ lecture`; "seems" is stamped. Footnote `¬(what it seems)`. Time label `09:00`.

### `linkedlist` — "Linked list of my worries … Null at the end" (ink)
**3D**: nodes are hairline boxes floating in a line through ink space, arrows as 3D curves; the camera rides the pointer like a train through the list, node to node on the kicks; at NULL the track ends in a void and the camera comes to rest. **A singly linked list** drawn like a CS textbook figure: nodes as hairline boxes `[ value | • ]` with arrows. Each worry is a node that appears as it is sung (the lyric words go in the node values, one or two words per node): the camera trucks right along the list; the spark is the traversal pointer `p` hopping to the next node on each kick (`p = p->next`, a mono label riding it). "each one points to the next": the arrows draw on "points". "Null at the end": the last arrow ends on a grounded **NULL** (a hairline ground symbol ⏚ + `NULL`). "means I finally rest": the pointer reaches NULL, the loop exits (mono `while (p) { … }   // exited`), the spark settles and dims, the camera holds still for the first time in the video (a slow push). Footnote `sleep(8 h)  // scheduled`. Time label `18:30`.

### `outro` — "Upload complete. … wrong file." (ink)
**3D**: the receipt is a flat card in 3D space, assembled from floating hairline parts that dock together (100.6 → 104.8); the camera orbits slowly, then pushes onto the preview during 106 → 111.7; the reveal is flat to camera. 100.64 → 104.8: `bigo2`'s flat line becomes a **submission receipt** being assembled (hairline card of our own design): `ASSIGNMENT 4`, file `essay_v7_final_FINAL.pdf`, `38.0 MB`, `23:59:59.99`, a small preview thumbnail area with a spinner; the vocal pad and the pitch slide (~102.2) make the card settle. "Upload complete." (105.20): the card stamps `COMPLETE ✓`, the drums drive a slow push onto the preview (106 → 111.7) while the thumbnail keeps loading. **111.7 the drums stop.** "...wrong file." (112.24, alone): the preview opens — it is **the canteen menu** from `canteen` (`canteen_menu.jpg`); the file name in the receipt strikes through in orange and flips to `canteen_menu.jpg`. Footnote `resubmissions are not accepted`. The spark sputters out at the end of the file name; hold; the last frame (114.3) is the final image of the video. Time label `00:00`.

### `clock` (`n: 0`) — "Eleven fifty-nine" (approved)
Lead-in (28.69 → 29.6): near-black; one hairline and a small Plex Mono footnote `submission closes 23:59:59` types itself in; the spark idles at the end of the hairline, breathing with the rising synth. "Eleven fifty-": a split-flap clock (our own hairline design, bone flaps on ink) flips its digits from `23:58` toward `23:59`, one flap per syllable, the flaps tightening like a drum roll. **30.53, the drop**: the display slams `23:59` full-frame (Archivo 900, wide), shake + flash, the colon pulses orange on every kick from here on; "NINE" is the hit. "I'm running out of time": a seconds readout `:52 :53 :54 …` ticks one per beat under the big digits; the lyric sits on a horizontal "time remaining" bar that burns down from right to left behind the spark as each word is sung (each word a segment of the bar); footnote `time remaining is an estimate`. The camera pushes in a little on each downbeat.

### `stack` (`n: 0`, approved) — "Coffee in my veins and a stack I can't unwind" (light plate)
Inverted: **bone paper, ink lines** (a strong light/dark cut on the beat). A technical line drawing of a call stack, drawn like a textbook figure (hairlines, a mono `FIG. 2  call stack at 23:59` caption). On every kick a new frame is **pushed** on top with a mechanical snap: `coffee()`, `coffee()`, `proof_by_induction(n+1)`, `essay_v7_final_FINAL()`, `coffee()`, `linked_list_of_worries()`, `coffee()`, … each frame a hairline box with its mono label. The lyric words are **stamped into the frames** as they are sung (Archivo, ink; the sung word takes the orange). The coffee frames carry a small hand-drawn cup glyph (our own, simple hairline). "stack": the stack grows past the top of the frame and the camera tilts up to keep up. "I can't unwind": a `pop()` is attempted on "unwind" — the stack wobbles, refuses, and a red-orange stamp / mono error lands: `RecursionError: maximum caffeine depth exceeded`. The spark here is the stack pointer (an orange arrow + spark) riding the top frame.

### `submit` (`n: 0`, approved) — "Eleven fifty-nine, submit before the line"
Back to ink. A horizontal timeline strip across the frame, graduated in seconds like a ruler (`23:59:50 … 23:59:59`), with a vertical **orange deadline line** at `23:59:59` near the right edge. The spark is the **upload progress head** racing left→right toward it; behind it the lyric words are laid on the strip as **uploaded file chunks** (each word a block that fills as sung; a mono byte counter `12.4 / 38.0 MB` ticks up). "submit": a hairline button `SUBMIT` is pressed with a slam (on 38.33). "the line": the head decelerates hard; on "line" (39.64) it touches the deadline line exactly — freeze-frame feel, flash, and a stamp `SUBMITTED 23:59:59.97` with a mono footnote `30 ms to spare`. The camera rides with the head (slow push, then a snap on "line").

### `bigo` (`n: 0`, approved) — "O of n squared panic, but I'm doing fine"
Graph paper (ink background, bone grid hairlines, mono axis labels): x = `n (assignments due)`, y = `panic`. The spark draws *O*(*n*²) (Cormorant italic label) one step per beat on "O / of / n / squared", accelerating upward; on "panic" it shoots off the top of the frame and the camera tilts up after it (whip), grid lines streaking. **43.45 (downbeat), "but I'm doing fine"**: hard snap back down past the origin to a perfectly flat line along the bottom labelled `O(1)`: "but I'm doing" typeset calmly along it (Archivo 300, relaxed), "fine" lands on the line with a small superscript ¹ and a footnote `¹ amortized`. Hold to the end, the spark resting on the flat line, breathing. Fade to black at the very end (the last ~0.5 s before 47.14 can fade; the clip is cut at 45.8 anyway, so the frame at ~45.5 must be a good final frame).
