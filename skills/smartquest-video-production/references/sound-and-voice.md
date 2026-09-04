# Sound and voice

Everything from Gate 1 to Gate 4 is **silent**. Sound enters once, at Gate 5, and in one order:
the teacher's narration first, effects afterwards and only if asked, music never by default.

## The voice is a person, and here is why

The skill says "never TTS" as a rule. It is worth knowing it is also a measurement, because the
question comes back every time a deadline is close.

Measured on the build Mac (Apple Silicon, CPU-only), 2026-08-17:

| Option | Speed | Why it is not the narration |
|---|---|---|
| **CosyVoice2-Yue** (`cosyvoice-yue/`, conda env `cosyvoice`) | **~55× slower than realtime** — 1.5–4 min per short sentence, plus ~55 s model load per process | The only one that handles Cantonese **and** embedded English DSE terms. A minute of narration costs about an hour of wall clock, so a 10-minute lesson is a working day. The repo's `load_trt` / `load_vllm` / `fp16` paths are CUDA-only and dead here |
| macOS `say -v Sinji` (zh_HK) | RTF 0.30, zero install | Reads embedded English correctly, but audibly synthetic. Fine as a **scratch track for timing**, never as delivery |
| sherpa-onnx `vits-cantonese-hf-xiaomaiiwn` | RTF ~0.3–0.9, 112 MB | Two silent failures: 36% of its lexicon entries have empty phones — nearly all **traditional** characters, so 繁體 input loses characters with no error (run OpenCC `t2s` first and it is fixed); and **English words are dropped entirely**, so no code-switching, which is exactly what a DSE script is made of |

Ruled out on inspection: Qwen3-TTS and MeloTTS have no Cantonese; Fish Audio S2 does not list
Cantonese and is non-commercial; `ArkhamImp/Spark-TTS-Cantonese` publishes no weights.

**What this permits:** auditioning a voice, or checking how one line scans, with `say -v Sinji`.
**What it never permits:** shipping any synthetic audio, muxing a scratch track into anything the
user might mistake for a cut, or describing a file as "narrated" (hard rule 2). A scratch track,
if one is made at all, is named `out/scratch-timing.wav`, is never muxed into `draft.mp4`, and is
deleted at Gate 5.

## The SFX library

`videos/assets/sfx/` — 155 files, 44.1 kHz, **all cleared for commercial use with no attribution
required** (Kenney CC0, Mixkit licence). `LICENSES.md` records the provenance; `manifest.json` is
the full file list.

Six categories, each named for the animation that triggers it:

| Directory | Files | The animation it is for |
|---|---:|---|
| `01-pop-click/` | 40 | `FadeIn`, `Create`, a label or arrow arriving |
| `02-whoosh/` | 24 | camera moves, `Transform`, `ReplacementTransform`, a scene change |
| `03-pen-scribble/` | 14 | `Write`, `AddTextLetterByLetter` — a formula being written |
| `04-ding-chime/` | 33 | the key result, the correct answer, `Indicate`, `Circumscribe` |
| `05-riser/` | 17 | the 1–2 s before an answer is revealed |
| `06-impact/` | 27 | the answer landing, a title card dropping in |

Practical notes from building it:

- **Prefer the `mixkit_` files for video.** Kenney's clicks and ticks are 10–60 ms transients
  built for games; under narration they disappear.
- Three files were made for explainers specifically: `mixkit_explainer-pop-light_3005`,
  `mixkit_explainer-writing-pencil_3011`, `mixkit_explainer-reveal_235`.
- `03-pen-scribble/mixkit_writing-blackboard-13s_2366.wav` runs 13 s — the bed for a long
  derivation. A short formula takes `mixkit_pencil-writing-short_2376`.
- Audition a whole category in one go: `afplay videos/assets/sfx/_audition/01-pop-click.wav`,
  reading filenames off `_audition/INDEX.md` by timecode. `_raw/` keeps the original packs
  (418 files) if a different timbre is wanted.

**Open item:** the library is **not loudness-normalised** — levels differ substantially between
sources. Normalise a chosen cue before use, and sit SFX about **12–15 dB under the narration**.
No mixing chain is built yet; say so rather than implying one exists.

## Where sound is allowed to touch the pipeline

1. **Never bake audio into a scene render.** A scene is re-rendered on its own whenever a Gate 3
   note comes back (see "Coming back from Gate 3 notes"), and a shot carrying its own audio
   cannot be swapped without re-cutting sound. Effects are laid on the assembled timeline.
2. **Never add SFX unasked**, and never as a default pass over a finished cut. It is the same
   trap as hard rule 33: it changes something the teacher has already recorded against.
3. **Music is not part of this format.** A teaching bed competes with the sentence a band 2
   student is trying to parse. If it is asked for, it is one decision for the whole series, made
   with the user, not per lesson.
4. Sound is a **Gate 5** activity, after `audio/narration.wav` exists. Anything before that ships
   silent, and the plan says so.
