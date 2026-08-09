# Production engine routing

Choose tools per project and per shot. Pick one primary finishing engine; use other tools only to create inputs for its master timeline.

Companion engines and agent skills are optional. Inspect the current device before selecting them. Keep Phase 1 portable with authored SVG, PNG, JSON, and the standard-library storyboard builder; resolve missing production integrations only at the Phase 2 gate.

## Decision table

| Need | Primary choice | Why | Typical handoff |
|---|---|---|---|
| Asset-led explainer, branded motion system, reusable React components, many aspect/language variants | Remotion | Exact frame-based React composition and repeatable rendering | MP4 master; optional stills and variants |
| Kinetic typography, UI/website motion, CSS layouts, shader transitions, audio-reactive visuals | HyperFrames | HTML/CSS/GSAP authoring with lint, contrast, layout, choreography, and render checks | MP4 master or transparent WebM overlay |
| Interviews, talking heads, tutorials, travel, montage, multiple takes | video-use | Transcript-led EDL, word-boundary cuts, FFmpeg render, subtitle and cut-boundary checks | `edit/final.mp4`; animation slots from other engines |
| Generative live action, characters, physical effects, one-take motion, reference-driven shots | Seedance prompt skill | Produces structured time-coded prompts and multimodal reference maps | Generated shot clips or prompt packet; never the master timeline |
| Formal equations, graphs, proofs, state machines | Manim when available | Mathematical animation primitives | Verified rendered clip into the master timeline |
| Simple static card, counter, or draw-on overlay | SVG/PNG/PIL + FFmpeg | Faster and more reliable than scaffolding a full engine | Alpha image sequence or short overlay clip |

## Routing rules

1. Preserve the approved `video-plan.json` IDs and timings across every tool.
2. Use Remotion as the default for a new fully graphical video unless HyperFrames better matches the HTML/GSAP nature of the design.
3. Use video-use as the master when editorial selection from raw speech footage is the core problem.
4. Use Seedance only for shots that benefit from generative motion. Keep exact typography, diagrams, captions, logos, legal copy, and final timing in the finishing engine.
5. Do not maintain full master compositions in both Remotion and HyperFrames. That creates timing drift and duplicate fixes.
6. Require every secondary render to declare width, height, fps, duration, alpha mode, codec, and audio ownership.
7. Prefer transparent WebM or image sequences for overlays. Prefer mezzanine-quality clips for opaque generated shots when storage permits.
8. Do not assume a named plugin or skill exists because this document mentions it. Verify availability and installation state first.

## Common hybrids

### Motion-design explainer

`SVG/PNG + storyboard → optional Seedance inserts → Remotion master → verified exports`

Use HyperFrames only for a specialized kinetic-type, shader, UI, or transparent overlay that is materially easier in HTML/GSAP.

### Web/product campaign

`Website/UI assets → HyperFrames master → optional Seedance lifestyle inserts → MP4/WebM exports`

Use Remotion instead when the existing brand system is already React/Remotion or when many data-driven variants dominate.

### Interview or launch edit

`Raw footage → video-use transcript/EDL → HyperFrames or Remotion overlay slots → video-use/FFmpeg final → captions last`

Keep source footage untouched. Confirm the editorial strategy before cutting.

### Generative cinematic short

`Style bible + storyboard → Seedance prompt packet/reference map → generated clips → Remotion or HyperFrames master → audio/captions/QA`

Generate clips in bounded shot lengths and use approved first/last frames or continuity notes. Do not delegate exact text rendering to the generative video model.

## Readiness checks

### Remotion

- Project-local compatible Remotion packages exist or can be scaffolded.
- The relevant Remotion plugin skills have been loaded.
- Studio and renderer can access all fonts and media.

### HyperFrames

- Node.js 22+ and FFmpeg are available.
- `DESIGN.md` or an explicit visual identity exists.
- Load typography guidance for every composition and transition guidance for multi-scene work.
- Run `npx hyperframes lint`, `validate`, and `inspect`; run the animation map for new or significantly changed choreography.

### video-use

- FFmpeg and ffprobe are available.
- Python dependencies are installed for the helper scripts.
- An ElevenLabs key is configured only if Scribe transcription is required.
- The user has approved the plain-language editing strategy before cuts are executed.

### Seedance prompt skill

- Confirm the user has or wants a Seedance execution surface; the installed skill writes prompts but does not itself submit jobs.
- Prepare reference assets and explicit `@` mappings.
- Verify platform duration, upload, privacy, face, pricing, and output restrictions when they affect the planned generation.

## QA ownership

The primary finishing engine owns final duration, audio mix, captions, safe areas, and exports. Secondary engines own only their rendered intermediate clips. Probe every intermediate before insertion and the final master after rendering.
