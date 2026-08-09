# Production contract

Use this contract to keep writing, storyboard frames, Remotion code, and renders synchronized.

## Suggested project layout

```text
video-project/
├── brief.md
├── video-plan.json
├── sources.md
├── storyboard/
│   ├── manifest.json
│   ├── frames/
│   └── sheets/
├── public/
│   └── assets/
│       ├── svg/
│       ├── png/
│       ├── footage/
│       ├── audio/
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
  "enginePlan": {
    "primary": "remotion",
    "secondary": ["seedance"],
    "reason": "Remotion owns exact typography, timing, captions, and final variants; Seedance supplies two generated motion shots"
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
- Declare one `enginePlan.primary`; secondary tools render intermediates into that master timeline.
- For every secondary-engine shot, record `productionEngine` and an `intermediateSpec` containing width, height, fps, duration, codec, alpha mode, and audio ownership.

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
- Verify audio duration and timestamps before final render.
- Render a low-cost draft first, then the delivery master.
- Probe the output for duration, dimensions, fps, codec, and audio stream; watch the full master once.
