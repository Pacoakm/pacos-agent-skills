# Production engine routing

Choose tools per project and per shot. Pick one primary finishing engine; use other tools only to create inputs for its master timeline.

Companion engines and agent skills are optional. Inspect the current device before selecting them. Keep planning portable with authored SVG, PNG, JSON, and the standard-library storyboard builder; resolve missing production integrations before the animatic or production gate.

## Decision table

| Need | Primary choice | Why | Typical handoff |
|---|---|---|---|
| Asset-led explainer, branded motion system, reusable React components, many aspect/language variants | Remotion | Exact frame-based React composition and repeatable rendering | MP4 master; optional stills and variants |
| Kinetic typography, UI/website motion, CSS layouts, shader transitions, audio-reactive visuals | HyperFrames | HTML/CSS/GSAP authoring with lint, contrast, layout, choreography, and render checks | MP4 master or transparent WebM overlay |
| Interviews, talking heads, tutorials, travel, montage, multiple takes | video-use | Transcript-led EDL, word-boundary cuts, FFmpeg render, subtitle and cut-boundary checks | `edit/final.mp4`; animation slots from other engines |
| Newly invented live action, character performance, narrative animation, complex organic motion or generative environments | Seedance prompt skill + manual user submission | Produces structured prompts for an external video model when deterministic authoring is not practical | User-generated clips returned to the master timeline |
| Mathematics, physics, science, algorithms, or technical concepts requiring equations, geometry, graphs, transformations, simulations, or progressive visual reasoning | `$manim-video` with Manim Community Edition | Precise programmatic animation and 3Blue1Brown-style intuition-building | Verified full picture master or exact-length scene clips into Remotion/FFmpeg |
| Simple static card, counter, or draw-on overlay | SVG/PNG/PIL + FFmpeg | Faster and more reliable than scaffolding a full engine | Alpha image sequence or short overlay clip |

## Routing rules

1. Preserve the approved `video-plan.json` IDs and timings across every tool.
2. Choose the primary finishing engine before the animatic and keep the animatic, audio, captions, and final export on that timeline.
3. Use Remotion as the default for a new fully graphical video unless HyperFrames better matches the HTML/GSAP nature of the design.
4. Use video-use as the master when editorial selection from raw speech footage is the core problem.
5. Use `$manim-video` when progressive mathematical or scientific visualization materially improves understanding. Do not select it merely because a lesson belongs to a STEM subject.
6. Default to no Seedance. Use it only for named shots that require newly generated live action, character performance, narrative animation, complex organic motion, or generative environments that cannot be authored deterministically with available assets.
7. Use cropped continuity panels for important shots. Treat whole-grid video generation as exploration, montage, or supporting material, never as the master timeline.
8. Do not maintain full master compositions in both Remotion and HyperFrames. That creates timing drift and duplicate fixes.
9. Require every secondary render to declare width, height, fps, duration, alpha mode, codec, and audio ownership and to pass shot-level QA.
10. Prefer transparent WebM or image sequences for overlays. Prefer mezzanine-quality clips for opaque generated shots when storage permits.
11. Do not assume a named plugin or skill exists because this document mentions it. Verify availability and installation state first.

## Manim teaching gate

Choose Manim from the learning mechanism, not the academic subject label.

| Project or scene | Manim? | Route |
|---|---|---|
| Geometric intuition, equation derivation, proof, function or graph transformation | Yes | `$manim-video`; build the visual argument before or alongside the symbols |
| Physics relationships expressed through vectors, fields, waves, motion, forces, phase space, or parameter changes | Yes | `$manim-video`; animate causality and changing quantities |
| Algorithm, data structure, state machine, or technical system whose state must evolve visibly | Usually | `$manim-video` when mathematical primitives clarify it; otherwise Remotion/HyperFrames |
| Slide-based lecture, definitions recap, simple worked-example cards, or branded educational presentation | Usually no | Remotion with authored text, SVG, charts, and transitions |
| Recorded experiment, teacher demonstration, talking head, or software tutorial | No as master | video-use; add bounded Manim inserts only when they explain an invisible concept |
| Photoreal reenactment or fictional character scene | No | Seedance only if the Seedance necessity gate passes |

When the gate passes, load `$manim-video` and preserve its misconception → visual journey → aha-moment pedagogy. Verify Manim Community Edition, LaTeX, and FFmpeg before production. Draft at low quality, review representative stills and equation accuracy, then render production quality. A fully graphical lesson may use the verified Manim stitch as its picture master. Otherwise, render each scene to the dimensions, fps, duration, codec, and audio-ownership contract of the single Remotion or FFmpeg finishing timeline.

## Seedance necessity gate

Do not route by genre name alone. Decide from the required pixels and available source assets.

| Project or shot | Seedance? | Route |
|---|---|---|
| Presentation, slides, pitch deck video | No | Remotion using authored layouts, text, images, and transitions |
| Teaching animation, equations, charts, scientific diagrams | No | Remotion, SVG, or Manim |
| Product or service promotion using supplied assets, UI, screenshots, typography, and motion graphics | No | Remotion by default; HyperFrames when HTML/CSS/GSAP materially helps |
| Existing interview, tutorial, montage, or talking-head footage | No | video-use/FFmpeg master with optional Remotion graphics |
| Newly invented photoreal human action or cinematic lifestyle footage | Yes, only for those shots | Prepare Seedance prompts; user manually generates and returns clips |
| Newly invented character animation, narrative acting, complex organic movement, or generative world/effects | Yes, only for those shots | Prepare Seedance prompts; user manually generates and returns clips |
| Mixed video | Sometimes | Keep deterministic shots in Remotion; route only named external shots to Seedance |

When Seedance is required, tell the user before prompt production. State the shot IDs and reasons, prepare a Chinese prompt packet and asset map, instruct the user to submit them manually in Seedance/即梦, and stop with status `awaiting-user-generated-clips`. When Seedance is not required, do not mention it or create prompt artifacts.

## Audio companion routing

- Use provided or professionally recorded narration when vocal performance, brand identity, confidentiality, or exact pronunciation is critical.
- Use `$edge-tts` for rapid auditions, animatic narration, accessibility, language variants, and user-approved final synthetic voiceovers. Verify `uvx`, network availability, current voices, and delivery terms first.
- Keep TTS as an audio input to the primary finishing timeline. It never becomes a second master timeline.
- Generate a short audition before the full script, then use the actual approved audio duration and subtitle timestamps to update the animatic and `video-plan.json`.
- Follow [tts-routing.md](tts-routing.md) for commands, file handling, privacy, and QA.

## Common hybrids

### Motion-design explainer

`SVG/PNG + storyboard → Remotion master → verified exports`

Use HyperFrames only for a specialized kinetic-type, shader, UI, or transparent overlay that is materially easier in HTML/GSAP.

### 3Blue1Brown-style mathematical or physics explainer

`Learning goal + misconception → timed narration → Manim visual plan → low-quality scene drafts/stills → equation and pedagogy review → production Manim renders → optional Remotion/FFmpeg finishing → verified exports`

Keep the lesson visually cumulative: reuse objects through transformations, reveal one relationship at a time, dim context instead of removing it without reason, and pause after major insights. Use Remotion only as the finishing timeline when exact captions, branding, footage, audio mixing, or delivery variants require it. Do not introduce Seedance unless a separate named shot independently passes the Seedance necessity gate.

### Presentation or slide-based video

`Slides/content/assets → authored Remotion scenes → transitions/audio/captions → verified exports`

Do not use Seedance. Rebuild slide content as readable motion layouts or animate supplied slides and assets on the Remotion timeline.

### Web/product campaign

`Website/UI assets → Remotion or HyperFrames master → MP4/WebM exports`

Use Remotion when the brand system is React-based, when exact copy and variants dominate, or when the campaign is presentation/motion-graphics led. Add Seedance only if the approved concept contains named, newly invented live-action or narrative-animation shots that pass the necessity gate.

### Interview or launch edit

`Raw footage → video-use transcript/EDL → HyperFrames or Remotion overlay slots → video-use/FFmpeg final → captions last`

Keep source footage untouched. Confirm the editorial strategy before cutting.

### Generative cinematic short

`Hero references → adaptive continuity grids → review storyboard → timed animatic → prompt packet → user manually generates Seedance clips → returned clips → Remotion or HyperFrames master → audio/captions/final QA`

Generate clips in bounded shot lengths and use approved first/last frames or continuity notes. Allocate variants by shot risk, record selection decisions, and reject clips that fail identity, motion, or transition checks. Do not delegate exact text rendering to the generative video model.

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

### Manim video

- The `$manim-video` companion skill is installed and loaded.
- Manim Community Edition, Python, LaTeX, and FFmpeg are available.
- The learning objective, audience prerequisites, misconception, and intended aha moment are explicit.
- Equations, labels, graphs, and physical relationships have been checked for correctness before the production render.
- Draft scenes and representative stills have been reviewed for pacing, hierarchy, legibility, and continuity.

### Seedance prompt skill

- Confirm the necessity gate passed for named shots. The installed skill writes prompts but does not submit jobs or generate clips.
- Prepare reference assets and explicit `@` mappings.
- Read the current Seedance limits and remove prohibited uploads from the asset map. In particular, do not ask the user to upload realistic face references when the platform blocks them; disclose the resulting continuity tradeoff.
- Confirm whether each shot uses a cropped panel, first/last frames, or an exploratory whole grid. Use the whole-grid route only when improvisation is acceptable.
- Verify platform duration, upload, privacy, face, pricing, and output restrictions when they affect the planned generation.
- Give the user the prompt packet and manual upload/generation/download checklist, then wait for the returned clips.

## QA ownership

The primary finishing engine owns the animatic, final duration, audio mix, captions, safe areas, and exports. Secondary engines own only their rendered intermediate clips. Probe and visually inspect every intermediate before insertion; record the selected take and rejection reasons. Probe and watch the final master after rendering.
