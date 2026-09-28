# Sound and voice

The default video is **silent**, and stays silent through delivery. The bilingual captions carry
the explanation. Sound enters only when Paco asks for it on a particular video, only at Gate 4,
and only as its own track in Palmier Pro: a voice first, music or effects afterwards and only if
asked.

## Why silent is the default

It is a decision, not a gap waiting to be filled.

- **There is no narrator in this pipeline.** The skill this one was forked from handed a silent
  cut to a human who recorded to picture. Here nobody records; the only voice available is a
  synthetic one, and a synthetic voice reading a caption adds a copy of what is already on
  screen, not information.
- **One viewer, watching alone, can pause.** Captions are read at Paco's speed; a voice is
  heard at its own. With a voice, the picture, two caption lines and the sound are three streams
  competing for one person's attention — silent, the eye moves between figure and caption and
  nothing moves on without it.
- **The captions were written to be read.** They are 書面語, one idea per cue, paced against
  `中文字數 ≤ 鏡頭秒數 × 4.0` and the 25% still floor (`references/pacing.md`). Read aloud, 書面語
  sounds like a document being read out, because it is one.
- **Every change stays cheap.** A cue edited after Gate 3 is a plan edit and a caption rebuild. With
  a voice it is also a regeneration, a fit check and a re-placement on the timeline.

So: never generate a voice unasked, and never describe a silent video as narrated (hard rule 2).
`narration.source` stays `"none"`.

## The optional voice — `edge-tts`, only when asked

If Paco asks for a voice on a video, it is generated with the **`edge-tts` skill** (`uvx
edge-tts`) and placed in Palmier as an audio track under the scenes. The procedure is in
`references/palmier-assembly.md`, "Optional: a voice track"; what matters for the sound itself:

| | |
|---|---|
| **Voice** | Ask which language. Cantonese `zh-HK-HiuMaanNeural` (the contract's example), `zh-HK-HiuGaaiNeural`, `zh-HK-WanLungNeural`; Mandarin `zh-TW-HsiaoChenNeural`, `zh-TW-YunJheNeural`; English `en-HK-YanNeural`, `en-GB-SoniaNeural`, `en-US-AndrewNeural`. Confirm the name with `uvx edge-tts --list-voices` before generating |
| **Text** | The plan's cues — `subtitles[].text` for a Chinese voice, `subtitles[].en` for an English one. The voice reads the captions; there is no separate spoken script to drift from them |
| **Granularity** | One file per shot or per knowledge point, named by its first shot — `audio/voice/S02.mp3`. Generate per cue first so each sentence can be fitted to its cue |
| **Timing** | **The plan is the authority.** Each sentence starts at its cue's `start`; a shot's file starts at the shot's first frame, with silence up to each cue offset. Never re-time the picture to the voice |
| **Where it runs** | On Microsoft's online service, not on this Mac — it needs a network connection, and the caption text is sent to Microsoft. Say so if the notes are anything Paco would not want to leave the machine |

```bash
uvx edge-tts --voice zh-HK-HiuMaanNeural \
  --text "先看一個具體的矩陣作用在方格上。" \
  --write-media audio/voice/cues/S02-01.mp3
ffprobe -v error -show_entries format=duration -of csv=p=0 audio/voice/cues/S02-01.mp3
```

**The fit check is the measurement.** Every cue's clip must end inside its cue, and every shot's
file inside its shot — `ffprobe` each one. Nobody has measured how fast these voices read 書面語
against the 4.0 字/秒 caption budget; do not assume a rate, measure the files. A clip that
overruns is fixed by regenerating — shorten the line or split it across two cues in the plan, or
regenerate with `--rate` — never by stretching a clip, adding a hold to the picture, or letting
the voice run into the next shot.

Then record it (`narration.source: "edge-tts"`, the voice, `narration.media: "audio/voice/"`,
`narration.status: "audio-received"` once every file is placed on the `Voice` track), run
`verify_master.py` **with** `--require-audio`, and tell Paco nobody has listened to it yet —
`inspect_timeline` shows pictures, not sound, and there is no loudness check in the pipeline.
Ask him to listen to the first file and one mid-video file in Palmier before he says export.

## Local TTS — measured, and not an option

The question comes back whenever a voice is wanted, so the measurement is kept here. Measured on
this Mac (Apple Silicon, CPU-only), 2026-08-17:

| Option | Speed | Why it is not the voice |
|---|---|---|
| **CosyVoice2-Yue** (`cosyvoice-yue/`, conda env `cosyvoice`) | **~55× slower than realtime** — 1.5–4 min per short sentence, plus ~55 s model load per process | The only local model that handles Cantonese **and** embedded English terms. A minute of voice costs about an hour of wall clock, so a 20-minute video is more than a day. The repo's `load_trt` / `load_vllm` / `fp16` paths are CUDA-only and dead here |
| macOS `say -v Sinji` (zh_HK) | RTF 0.30, zero install | Reads embedded English correctly, but audibly synthetic. Fine for hearing how one line scans, never as a track |
| sherpa-onnx `vits-cantonese-hf-xiaomaiiwn` | RTF ~0.3–0.9, 112 MB | Two silent failures: 36% of its lexicon entries have empty phones — nearly all **traditional** characters, so 繁體 input loses characters with no error (run OpenCC `t2s` first and it is fixed); and **English words are dropped entirely**, so no code-switching — and a course's terms are English |

Ruled out on inspection: Qwen3-TTS and MeloTTS have no Cantonese; Fish Audio S2 does not list
Cantonese and is non-commercial; `ArkhamImp/Spark-TTS-Cantonese` publishes no weights.

`edge-tts` sidesteps the speed problem because the synthesis runs remotely; its costs are the
network dependency and the text leaving the machine, stated above. `say -v Sinji` may be used to
audition how a line scans. No local synthetic audio is ever placed on a timeline.

## Music — only when asked

No music by default. A bed under a silent video competes with exactly what the video asks Paco
to do — read two caption lines while watching a figure move.

If he asks for it:

- It goes on its own audio track in Palmier, named `Music`, **under** the voice if there is one.
  Never baked into a scene.
- It comes from a file Paco supplies or from a library whose licence is recorded. Do not use
  Palmier's paid generation tools for it without asking first — that is spending.
- Record the choice — the track, its level — in `brief.md`, so the next video of the same course
  can match it rather than re-deciding. A course's series should sound like one series, the same
  way its colours do.
- Add `--require-audio` to `verify_master.py`, as with a voice.

## The SFX library

`~/smartquest/videos/assets/sfx/` — 155 files, 44.1 kHz, **all cleared for commercial use with no
attribution required** (Kenney CC0, Mixkit licence). `LICENSES.md` records the provenance;
`manifest.json` is the full file list. It is shared with SmartQuest; nothing in it is
SmartQuest-specific. Effects follow the same rule as music: only when asked.

Six categories, each named for the animation that triggers it:

| Directory | Files | The animation it is for |
|---|---:|---|
| `01-pop-click/` | 40 | `FadeIn`, `Create`, a label or arrow arriving |
| `02-whoosh/` | 24 | camera moves, `Transform`, `ReplacementTransform`, a scene change |
| `03-pen-scribble/` | 14 | `Write`, `AddTextLetterByLetter` — a formula being written |
| `04-ding-chime/` | 33 | the key result, `Indicate`, `Circumscribe` |
| `05-riser/` | 17 | the 1–2 s before a result is revealed |
| `06-impact/` | 27 | the result landing, a title card dropping in |

Practical notes from building it:

- **Prefer the `mixkit_` files for video.** Kenney's clicks and ticks are 10–60 ms transients
  built for games; under a voice they disappear.
- Three files were made for explainers specifically: `mixkit_explainer-pop-light_3005`,
  `mixkit_explainer-writing-pencil_3011`, `mixkit_explainer-reveal_235`.
- `03-pen-scribble/mixkit_writing-blackboard-13s_2366.wav` runs 13 s — the bed for a long
  derivation. A short formula takes `mixkit_pencil-writing-short_2376`.
- Audition a whole category in one go:
  `afplay ~/smartquest/videos/assets/sfx/_audition/01-pop-click.wav`, reading filenames off
  `_audition/INDEX.md` by timecode. `_raw/` keeps the original packs (418 files) if a different
  timbre is wanted.

**Open item:** the library is **not loudness-normalised** — levels differ substantially between
sources. Normalise a chosen cue before use, and sit SFX about **12–15 dB under the voice** when
there is one. No mixing chain is built yet; say so rather than implying one exists.

## Where sound is allowed to touch the pipeline

1. **Never bake audio into a scene render.** A scene is re-rendered on its own whenever a Gate 3
   note comes back, and a shot carrying its own audio cannot be swapped without re-cutting sound.
   Voice, music and effects are laid on the Palmier timeline, each on its own track.
2. **Never add a voice, music or SFX unasked**, and never as a default pass over a finished cut.
   It is the same trap as hard rule 33: it changes a video Paco has already approved as silent.
3. Sound is a **Gate 4** activity, in Palmier, after the scene clips, both caption tracks and the
   chapter markers are placed — never in `draft.mp4`, which is approved as picture and captions
   only.
4. The plan says what the sound is. `narration.source` is `"none"` unless a voice was asked for;
   `verify_master.py` runs with `--require-audio` exactly when a voice or music track exists.
