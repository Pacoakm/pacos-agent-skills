---
name: paco-video-production
description: Plan and produce premium videos from concept to verified render using high-resolution nine-panel storyboards and the right production engine. Use when the user asks Codex to make a video, short-form clip, explainer, tutorial, comedy video, product promotion, campaign film, storyboard, shot list, motion script, Remotion or HyperFrames composition, AI-generated Seedance shot prompts, or an edit from raw talking-head, interview, tutorial, montage, or multi-take footage. Create SVG/PNG assets and a timed storyboard first, then route the approved plan through Remotion, HyperFrames, video-use, Seedance, or a controlled hybrid.
---

# Paco Video Production

Create visually ambitious videos in two gated phases: (1) assets, timed script, shot language, and high-resolution nine-panel storyboards; (2) a storyboard-faithful edit and verified render. Keep one master timeline and one finishing engine as the source of truth from script through export.

## Start with the creative brief

Before generating assets or writing the full script, obtain these four decisions. Do not silently invent missing answers:

1. Ask for the exact total duration.
2. Ask for the video type, such as explainer, tutorial, comedy, product promotion, documentary, interview package, or social campaign.
3. Ask for the subject and the single outcome the audience should remember or take.
4. Offer 4–6 tailored visual directions and ask the user to select one or combine at most two. Describe each direction by references, palette, materials, typography, motion grammar, and emotional effect. Include refined variations of retro newspaper collage, industrial machinery, or stop-motion papercut when relevant. Read [style-directions.md](references/style-directions.md) for a starting library.

Ask one compact follow-up for any essential production facts not already supplied: target audience, platform/aspect ratio, language, resolution, brand assets, voiceover, captions, deadline, or source footage. Recommend a default instead of asking open-ended technical questions. Use 30 fps unless the content or delivery platform calls for another rate.

Do not begin Phase 1 until the required four decisions are known. If the user already supplied any answer, acknowledge it and ask only for the missing items.

## Phase 1 — Build the storyboard package

### 1. Lock the creative system

- State the selected direction in a short style bible: palette, texture, type, lighting, depth, frame treatment, and allowed motion motifs.
- Define one motion grammar for the whole video. Favor motivated push/pull moves, controlled rotation, parallax, match movement, masks, aperture wipes, object-led transitions, and spatial travel-throughs.
- Use spectacle to clarify hierarchy or causality. Insert visual rests; do not make every element move at once.
- For factual videos, verify claims and keep a source ledger. Separate facts from creative metaphors and label uncertain claims.

### 2. Write the timed narrative

- Design the hook, development, payoff, and final action before writing individual shots.
- Allocate every second. Make the final shot end at the requested duration, with no overlap or uncovered gap.
- For each shot, write: start/end time, purpose, visual action, composition, on-screen copy, voiceover, camera/lens or 2.5D movement, subject animation, transition in/out, sound cue, and required assets.
- Keep on-screen text concise and readable within platform-safe areas. Do not duplicate the full voiceover on screen unless captions are requested.
- Save the approved structure as `video-plan.json`; follow [production-contract.md](references/production-contract.md).

### 3. Generate all reusable assets first

- Create an asset inventory from the shot plan before assembling the storyboard.
- Prefer SVG for diagrams, icons, labels, charts, paths, masks, frames, and geometry that must stay exact. Prefer PNG for generated illustrations, textures, cut-paper elements, and photographic composites. Preserve transparency when assets must be layered.
- Generate raster masters at least 2× their intended display size. Avoid baked-in text in generated imagery; typeset exact text later.
- For recurring characters, products, or locations, create one approved hero/style reference first, then reuse it as the reference for later frames.
- Keep every source asset in a predictable `public/assets/...` structure and record its path in the plan. Do not continue with missing placeholders unless the user approves them.

### 4. Produce high-resolution nine-panel storyboards

- Generate keyframe artwork per shot or per narrative beat. Use image generation for expressive raster scenes and authored SVG for exact technical visuals.
- Compose frames into 3×3 storyboard sheets; do not rely on an image model to typeset the entire grid. Use `scripts/build_storyboard.py` so timecodes and notes remain exact and readable.
- Include on every panel: shot number, time range, key visual, camera/subject movement, transition, and brief audio or voiceover cue.
- Default each sheet to 3840×2160 SVG. Use multiple numbered nine-panel sheets for more than nine key shots; never shrink an entire long video into unreadable cells.
- Check visual continuity across adjacent panels: screen direction, scale, palette, recurring object design, lighting, and transition endpoints.

Present the creative brief, timed shot table, asset inventory, and rendered storyboard sheets together. Pause for storyboard approval before Phase 2 unless the user explicitly requested uninterrupted end-to-end production.

## Phase 2 — Route, edit, and render

Read [engine-routing.md](references/engine-routing.md) and select one primary finishing engine. State the choice and reason before implementation. Do not create duplicate master timelines in Remotion and HyperFrames.

Before routing, inventory the agent skills, plugins, CLIs, renderers, credentials, and execution surfaces actually available on the current device. Treat Remotion, HyperFrames, video-use, Seedance, and Manim as optional companion integrations: their absence must not block Phase 1. If a required companion is missing, either use an already-available equivalent that preserves the approved plan or stop before Phase 2 and offer an explicit installation/setup step. Never claim a plugin, paid generation, transcription service, or renderer ran when only its instructions or prompt packet were available.

### Remotion route

Use Remotion by default for from-scratch, asset-led motion design, reusable React components, exact frame control, branded templates, captions, and aspect/language variants.

1. Load `$remotion:remotion-best-practices`, then the routed create, markup, multimedia, captions, Studio, docs, or render guidance required.
2. Drive composition duration, sequences, copy, asset paths, and shot boundaries from `video-plan.json`. Convert seconds to frames once using the composition fps.
3. Build reusable scene, camera, transition, typography, caption, texture, and audio components with deterministic frame-based animation.
4. Preview in Studio and render stills at storyboard anchor frames before the delivery render.

### HyperFrames route

Use HyperFrames for HTML/CSS/GSAP-native kinetic typography, UI motion, website-like compositions, shader transitions, audio-reactive visuals, or transparent WebM overlays.

1. Load `$hyperframes:hyperframes`, `$hyperframes:hyperframes-cli`, and `$hyperframes:gsap` when authoring GSAP animation. Follow the plugin’s required visual-identity, typography, transition, and deterministic-timeline guidance.
2. Create a `DESIGN.md` derived from the approved style bible; do not introduce generic fallback colors or fonts.
3. Build each scene’s static hero frame before animation, then add deterministic entrances and transitions.
4. Run HyperFrames lint, validate, inspect, animation-map checks for significant choreography, and a draft render before the final render.

### Raw-footage route

Use `$video-use` when source footage drives the edit: talking heads, interviews, tutorials, travel, montages, or multiple takes.

1. Preserve source files and follow video-use’s inventory → transcript → strategy confirmation → EDL → preview → self-evaluation workflow.
2. Ask for an ElevenLabs API key only when transcription is actually needed and no configured key exists. Keep credentials out of the footage/project folder and outputs.
3. Use HyperFrames or Remotion as isolated animation slots when needed; return their verified renders to the single video-use/FFmpeg master timeline.
4. Follow video-use’s hard rules for word-boundary cuts, cached transcripts, boundary fades, output-time caption offsets, and subtitles applied after overlays.

### Generative-shot route

Use `$seedance` to turn approved storyboard panels into Chinese, time-coded Seedance prompt packets when shots need generative live action, complex physical motion, one-take travel, or effects that are inefficient to build programmatically.

1. Treat Seedance as a prompt-authoring and shot-generation stage, not the finishing editor.
2. Map each reference image, video, and audio asset to explicit `@图片N`, `@视频N`, and `@音频N` roles. Preserve first/last-frame and continuity notes between segments.
3. For long videos, generate separate shot prompts or continuity-linked segments; do not ask one model generation to replace the approved master timeline.
4. Verify current platform limits before a paid or irreversible generation because third-party model capabilities may change. If no Seedance execution surface is available, deliver the prompt packet and asset map without claiming the clips were generated.

### Hybrid assembly

- Render secondary-engine shots and overlays at exact master dimensions, fps, duration, codec, and alpha requirements.
- Use one master timeline for final audio, captions, scene boundaries, and export. Treat all other engine outputs as source assets.
- Reproduce the storyboard’s framing and motion intent. Use layered depth, masks, camera rigs, tracked typography, motion blur, light/texture passes, and spatial transitions only when they support the concept.
- Add voiceover, music, sound design, and captions. Duck music under speech and tie captions to actual audio timestamps when audio exists.
- Render the requested master and variants. Verify the file rather than assuming a successful command means a good video.

## Quality gate

Before delivery, verify:

- Exact requested duration, frame rate, dimensions, codec/container, and aspect ratio.
- No missing assets, black frames, timeline gaps, clipped masks, unsafe text, spelling errors, or unintentional flashes.
- Every scene boundary, voiceover line, caption, music beat, and sound cue aligns with the plan.
- Motion remains smooth and purposeful; text stays readable during fast camera moves.
- Storyboard anchor frames and the render match in composition, palette, subject continuity, and transition logic.
- Final files open and report valid media metadata. Provide the master video, storyboard sheets, `video-plan.json`, source/project path, and a concise render report.

If a render dependency, source asset, font license, voice, music license, or user decision is missing, stop at the last verified artifact and state exactly what is needed.

## Bundled resources

- Read [style-directions.md](references/style-directions.md) when preparing the user’s style choices.
- Read [engine-routing.md](references/engine-routing.md) before choosing Remotion, HyperFrames, video-use, Seedance, or a hybrid.
- Read [production-contract.md](references/production-contract.md) before creating the plan, folders, storyboards, or handoff.
- Run `scripts/build_storyboard.py --manifest <manifest.json> --output-dir <dir>` to assemble portable 4K SVG storyboard sheets.
