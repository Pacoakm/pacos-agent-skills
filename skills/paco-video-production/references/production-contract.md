# Production contract

Use this contract to keep writing, storyboard frames, Remotion code, and renders synchronized.

## Suggested project layout

```text
video-project/
├── brief.md
├── video-plan.json
├── sources.md
├── generation-log.json
├── storyboard/
│   ├── manifest.json
│   ├── continuity-grids/
│   ├── extracted-panels/
│   ├── frames/
│   └── sheets/
├── animatic/
├── generations/
├── external-generation/          # only when seedanceDecision.required is true
│   └── seedance/
│       ├── prompt-packet.md
│       └── returned-clips/
├── public/
│   └── assets/
│       ├── svg/
│       ├── png/
│       ├── footage/
│       ├── audio/
│       │   └── voiceover/
│       └── fonts/
├── src/
└── out/
```

Adapt to an existing Remotion project rather than forcing this layout onto it.

## `video-plan.json`

Use seconds as the authoring unit and keep at least millisecond precision. Derive frames from the composition fps only inside the Remotion implementation.

```json
{
  "title": "Example",
  "durationSeconds": 31,
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "language": "zh-HK",
  "styleDirection": "Archive press × industrial cutaway",
  "audioPlan": {
    "narration": {
      "provider": "edge-tts",
      "language": "zh-HK",
      "voice": "zh-HK-HiuGaaiNeural",
      "rate": "+0%",
      "volume": "+0%",
      "pitch": "+0Hz",
      "script": "public/assets/audio/voiceover/narration.txt",
      "media": "public/assets/audio/voiceover/narration.mp3",
      "subtitles": "public/assets/audio/voiceover/narration.srt",
      "status": "approved"
    }
  },
  "animatic": {
    "path": "animatic/animatic-v01.mp4",
    "status": "approved"
  },
  "enginePlan": {
    "primary": "remotion",
    "secondary": [],
    "reason": "The visuals can be authored deterministically from SVG, PNG, typography, and motion components"
  },
  "seedanceDecision": {
    "required": false,
    "shotIds": [],
    "reason": "No shot requires newly invented live action, character performance, or generative organic motion"
  },
  "shots": [
    {
      "id": "S01",
      "start": 0,
      "end": 3.2,
      "purpose": "Hook",
      "visual": "A newspaper headline tears open to reveal a rotating GPU die",
      "composition": "Centered die, headline layers at three depths",
      "camera": "Fast push through the torn headline, then 12-degree clockwise orbit",
      "subjectMotion": "Die layers separate into an exploded view",
      "transitionIn": "Cold open",
      "transitionOut": "Fly through the silicon grid",
      "onScreenText": "顯卡戰爭",
      "voiceover": "Example narration",
      "audio": "Press slam, servo rise",
      "assets": ["public/assets/svg/gpu-die.svg", "public/assets/png/newsprint.png"],
      "continuityGroup": null,
      "gridBatchId": null,
      "gridPanelIndex": null,
      "identityReferences": [],
      "startFrame": "storyboard/frames/S01.png",
      "endFrame": null,
      "motionPriority": "GPU layers separate cleanly during the orbit",
      "negativeConstraints": ["no extra components", "no logo mutation"],
      "generationMode": "deterministic-remotion",
      "externalGeneration": null,
      "productionEngine": "remotion",
      "intermediateSpec": null,
      "storyboardFrame": "storyboard/frames/S01.png"
    }
  ]
}
```

## Timeline invariants

- Sort shots by `start`.
- Start the first shot at `0`.
- End the last shot exactly at `durationSeconds`.
- Avoid accidental gaps and overlaps. If a transition overlaps two scenes visually, keep ownership explicit in the Remotion sequence structure.
- Keep `end` greater than `start` for every shot.
- Keep IDs stable after storyboard approval so notes and code remain traceable.
- When narration timing changes, update the plan before changing the composition.
- Lock shot timing to the actual approved narration file, not an estimated reading speed. Preserve the selected provider, voice, and synthesis parameters in `audioPlan`.
- Treat the approved animatic as the timing contract. Update the plan and re-render the animatic when editorial timing changes materially.
- Declare one `enginePlan.primary`; secondary tools render intermediates into that master timeline.
- Record one `seedanceDecision`. Default it to `required: false`. Do not add Seedance to `enginePlan.secondary` or create prompt artifacts unless named shots pass the necessity gate.
- For every secondary-engine shot, record `productionEngine` and an `intermediateSpec` containing width, height, fps, duration, codec, alpha mode, and audio ownership.

## Seedance manual handoff contract

Use this only when named shots cannot be produced deterministically and require external video-model generation:

```json
{
  "seedanceDecision": {
    "required": true,
    "shotIds": ["S04", "S05"],
    "reason": "These shots require newly invented photoreal human performance in a location that has no source footage",
    "executionOwner": "user",
    "executionSurface": "Seedance/即梦",
    "promptPacket": "external-generation/seedance/prompt-packet.md",
    "returnedClipsDirectory": "external-generation/seedance/returned-clips/",
    "status": "awaiting-user-generated-clips"
  }
}
```

- Tell the user which shots require Seedance and why.
- Provide Chinese prompts, `@` asset mappings, generation settings, and an upload order.
- Ask the user to manually submit the prompts in Seedance/即梦, download the results, and return the clips.
- Do not claim Codex ran Seedance. Do not continue those shots until the returned files exist.
- Keep all non-Seedance shots and the master timeline in the deterministic finishing engine.

## Continuity grids

- Treat a continuity grid as a text-free visual-generation aid, not the review storyboard.
- Use one approved hero reference and one `continuityGroup` per recurring identity or location.
- Default to 3×3 batches. Use 2×2 for tests, 4×4 only when panel resolution remains useful, and 5×5 for overview rather than final hero-frame extraction.
- Declare dimensions, batch count, continuity group, and the purpose of every occupied panel in the production proposal and manifest.
- Record `gridBatchId` and `gridPanelIndex` for every extracted panel.
- Repair or regenerate identity, anatomy, product, and logo errors before approving a panel. Typeset exact text later in the finishing engine.

## Storyboard manifest

The bundled storyboard builder accepts any number of panels and emits one sheet per group of nine.

```json
{
  "title": "Example — storyboard",
  "subtitle": "31 s · 1920×1080 · 30 fps",
  "style": "Archive press × industrial cutaway",
  "sheetWidth": 3840,
  "sheetHeight": 2160,
  "panels": [
    {
      "id": "S01",
      "time": "00:00.000–00:03.200",
      "image": "frames/S01.png",
      "visual": "Newspaper tears open; GPU die appears",
      "camera": "Push through tear; 12° orbit",
      "transition": "Cold open → silicon fly-through",
      "audio": "Press slam; VO line 1"
    }
  ]
}
```

Resolve image paths relative to the manifest. PNG, JPEG, WebP, GIF, and SVG sources may be embedded. Missing images become labeled placeholders so they are visible during review; treat them as failures before final approval.

## Animatic gate

- Use the approved review frames, exact shot timings, temporary or final voiceover, and representative music or sound cues.
- Confirm the hook, reading time, narration fit, rhythm, transition logic, and final action.
- Render one low-cost animatic before paid generation or full-resolution production unless the user explicitly waives the gate.
- Record the animatic path and approval status in `video-plan.json`.

## Narration and TTS QA

- Use human-recorded audio when supplied. Use Edge TTS only after synthetic narration is requested or accepted.
- Treat Edge TTS as an online service. Do not submit confidential or unreleased scripts without user approval.
- Audition representative lines before generating the locked script. Confirm the voice, Cantonese or target-language pronunciation, names, numbers, abbreviations, and technical terms.
- Save the spoken-form script, media, and generated subtitle timing under `public/assets/audio/voiceover/`; preserve provider, voice, rate, volume, pitch, and approval status in `audioPlan`.
- Proofread and reflow generated SRT cues before using them as final captions.
- Probe and listen to the whole narration. Use its actual duration and timestamps in the animatic and final timeline.

## Generation log and shot QA

For every generated candidate, record the shot ID, model/version, prompt, references, generation mode, date, output path, and result. For the selected take, record why it was selected. For rejected takes, record concise rejection reasons.

Before insertion into the master, verify:

- First and last frames support the planned cut or transition.
- Character, product, location, lighting, and screen direction remain consistent.
- No unwanted morphing, flicker, extra objects, corrupted text, or logo mutation appears.
- The action has usable edit handles and the intended duration.
- Dimensions, fps, codec, alpha mode, and audio ownership match the intermediate specification.

## Storyboard review checklist

- Every plan shot or key beat has a traceable panel ID.
- All time ranges agree with the plan.
- Panel art is legible at normal screen size.
- Text labels are authored outside generated artwork.
- Adjacent panels preserve subject identity, screen direction, palette, and lighting.
- Camera moves declare a start and end state rather than vague words such as “dynamic.”
- Transitions name the visual object or mask that connects the two shots.

## Remotion handoff checklist

- Treat `video-plan.json` as source data, not a loose reference.
- Keep one finishing-engine master timeline; do not duplicate the full edit across engines.
- Use static, deterministic asset paths compatible with Remotion.
- Keep design tokens and camera/motion primitives reusable.
- Preview representative stills at the beginning, midpoint, and end of every scene.
- Match scene timing to the approved animatic and insert only shot-QA-approved generated takes.
- Verify audio duration and timestamps before final render.
- Render a low-cost draft first, then the delivery master.
- Probe the output for duration, dimensions, fps, codec, and audio stream; watch the full master once.
