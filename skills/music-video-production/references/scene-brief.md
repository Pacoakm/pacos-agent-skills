# Scene authoring: the brief and the loop

One author per plate. With a harness that can spawn agents (Claude Code `Agent`, Codex/Hermes sub-agents),
brief them all at once and let them run in parallel; each isolates itself with `--only <plate>` and a
private server. Without one, run the same loop yourself, plate by plate. Either way the brief below is
self-contained: fill the `<…>` and send it as is.

## Brief template

```text
You are a scene author on a code-rendered music video (TypeScript + three.js, deterministic: every frame is
a pure function of song time). Repo: <project>. You own ONE plate: `<plate>`.

Read first, fully: docs/ENGINE.md (engine API, rules, render commands), docs/TREATMENT-<id>.md (this video's
treatment — your plate is "<plate>"), and the Tone / Palette / Typography / Karaoke rules / Motifs sections of
docs/TREATMENT.md. Then read existing scenes for idioms: <1–2 upstream scenes closest to your idea, e.g.
hook.ts (full-frame type slams), bureau.ts (light paper plate), leftturn-gantt.ts (timeline strip + stamps),
loss.ts / ascent.ts (spark drawing a curve, camera following)>, plus app/src/scenes/_motifs.ts,
app/src/engine/util.ts, type.ts, lyrics.ts, audio.ts, lines.ts. The finished example plates in
<skill>/examples/1159/scenes/ show the expected quality.

Write app/src/scenes/<id>/<plate>.ts (default-export a Scene subclass). Imports from there are
../../engine/... and ../_motifs. Helpers may be app/src/scenes/<id>/<plate>-*.ts. Do NOT edit any other file
(engine, timeline, other scenes, docs); if you need an engine change, say so in your report.

Data: data/<id>/lyrics.json and audio.json load automatically with ?song=<id>. Find lines with
this.ctx.lyrics.get('<first words of your line>'); beats, downbeats and kicks via this.ctx.audio / f.a.kick.
Never hard-code times. Your timeline entry is `<plate>`, window <start> → <end> (ctx.start / ctx.end).
<Neighbour notes: what the previous plate ends on, what the next one starts on, any continuity constraint.>

Render (from app/; <CHROME_PATH=… if no Google Chrome>):
  bun scripts/render.ts stills --song <id> --url http://localhost:1 --only <plate> --t <6–9 key times> --out ../out/wip/<plate>
  bun scripts/render.ts sheet  --song <id> --url http://localhost:1 --only <plate> --from <start> --to <end> --n 16 --cols 4 --out ../out/wip/<plate>/sheet.png
  bun scripts/render.ts perf   --song <id> --url http://localhost:1 --only <plate> --from <a> --to <b>
  bunx tsc --noEmit -p tsconfig.json 2>&1 | grep <id>/<plate>
Other authors work at the same time; --only and --url http://localhost:1 keep you isolated.

Loop: implement → typecheck → render stills + contact sheet → OPEN THE PNGs AND LOOK → critique against the
treatment (every lyric word readable, synced to its time, hits on the beat, composition, typographic craft,
palette discipline, "would a top motion-design studio ship this, or does it look like AI slop?") → fix →
repeat. At least 3 rounds. Check frames right before and right after <the key hit>. Target < 25 ms/frame.

All imagery must be your own original design: no logos, no imitation of real product UIs, no copyrighted
characters.

Report (concise): what the plate does beat by beat, the paths of your 3 best stills and the contact sheet,
known weaknesses, engine changes you'd want.
```

## Picking the reference scenes for an author

| The plate needs… | Point the author at |
|---|---|
| full-frame type slams, hook energy | `hook.ts`, `examples/1159/scenes/clock.ts` |
| a light paper plate, stamps, forms | `bureau.ts`, `examples/1159/scenes/stack.ts` + `stack-paper.ts` |
| a strip/ruler with a playhead, stamps | `leftturn-gantt.ts`, `examples/1159/scenes/submit.ts` |
| a spark drawing a curve, camera following, whips | `loss.ts`, `ascent.ts`, `examples/1159/scenes/bigo.ts` + `bigo-glsl.ts` |
| typed tokens with probabilities | `prompt.ts` |
| raymarched 3D, engraving shading | `shoggoth.ts` + `shoggoth-glsl.ts`, `paperclips-glsl.ts`, `ilya-glsl.ts` |
| 3D line geometry, camera paths | `room.ts` + `room-geo.ts` |

## What good authors did on the test clip (keep asking for it)

- Took the hit time from the **beat grid**, not the kick onsets (onsets sit ~50 ms late: they mark the
  energy peak, the grid marks the attack).
- Split words with no syllable data evenly and flipped/filled per syllable for pickups.
- Anticipated words dimly ≤ 0.4 s early; lit them exactly on time.
- Used `post` returns for camera punches (`zoom`), `shake`, small `flash`, `ca` spikes on hits — and kept
  flash tiny (it is additive and greys ink quickly).
- Rendered a few stills with `--samples 36` to see the whip as the export will blur it.
- Reported weaknesses honestly, including seams with neighbours they couldn't see.
