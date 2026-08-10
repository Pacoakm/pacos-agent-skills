---
name: paco-video-production
description: Plan and produce premium videos from concept to verified render using continuity references, adaptive visual grids, review storyboards, animatics, voiceovers, and the right engine. Use for videos, explainers, tutorials, mathematical, physics, science, or technical teaching videos, 3Blue1Brown-style visual explanations, promotions, campaigns, storyboards, shot lists, motion scripts, TTS narration, Remotion, Manim, HyperFrames, Seedance prompt handoffs, or edits from raw footage. Default deterministic presentations, slides, explainers, and motion graphics to Remotion; route concepts that depend on equations, geometry, graphs, transformations, or visual intuition through `$manim-video`; use Seedance only as a manual external-generation handoff for named shots requiring invented live action, character animation, or complex organic motion.
---

# Paco Video Production

Create visually ambitious videos through four gates: (1) brief, narrative, sound, and continuity system; (2) adaptive visual grids plus an exact review storyboard; (3) a timed animatic; (4) shot production, assembly, and verified render. Keep one master timeline and one finishing engine as the source of truth from the animatic through export.

## Start with the creative brief

Before generating assets or writing the full script, obtain these decisions. Do not silently invent missing answers:

1. Ask for the target or approximate duration. Lock the exact duration before the animatic, not before low-cost visual exploration.
2. Ask for the video type, such as explainer, tutorial, comedy, product promotion, documentary, interview package, or social campaign.
3. Ask for the subject and the single outcome the audience should remember or take.
4. Ask for the platform/aspect ratio and whether source footage, a hero image, or brand assets already define the look.
5. If no clear visual reference exists, offer 4–6 tailored visual directions and ask the user to select one or combine at most two. Describe each direction by references, palette, materials, typography, motion grammar, and emotional effect. Read [style-directions.md](references/style-directions.md) for a starting library.

Ask one compact follow-up for any essential production facts not already supplied: target audience, language, resolution, voiceover, captions, deadline, or delivery variants. Recommend a default instead of asking open-ended technical questions. Use 30 fps unless the content or delivery platform calls for another rate.

Allow a low-cost reference or three-shot style test before every production detail is final. Do not begin full storyboard production until the brief, direction, platform, and approximate duration are known. If the user already supplied an answer, ask only for missing decisions.

## Gate 1 — Lock narrative, sound, and continuity

### 1. Lock the creative system

- State the selected direction in a short style bible: palette, texture, type, lighting, depth, frame treatment, and allowed motion motifs.
- Define one motion grammar for the whole video. Favor motivated push/pull moves, controlled rotation, parallax, match movement, masks, aperture wipes, object-led transitions, and spatial travel-throughs.
- Use spectacle to clarify hierarchy or causality. Insert visual rests; do not make every element move at once.
- For recurring characters, products, or locations, approve one hero reference first. Record immutable identity details, reusable angle references, and `continuityGroup` IDs before generating shot art.
- For factual videos, verify claims and keep a source ledger. Separate facts from creative metaphors and label uncertain claims.

### 2. Write the timed narrative

- Design the hook, development, payoff, and final action before writing individual shots.
- For spoken videos, create or time a temporary voiceover before final shot timing. Lock the exact duration after a read-through.
- When synthetic narration is requested or acceptable, read [tts-routing.md](references/tts-routing.md) and load `$edge-tts` before creating or promising audio. Generate a short voice audition before the full narration and time the animatic from the actual audio file.
- Allocate every second after the duration is locked. Make the final shot end at the requested duration, with no overlap or uncovered gap.
- For each shot, write: start/end time, purpose, visual action, composition, on-screen copy, voiceover, camera/lens or 2.5D movement, subject animation, transition in/out, sound cue, and required assets.
- Keep on-screen text concise and readable within platform-safe areas. Do not duplicate the full voiceover on screen unless captions are requested.
- Save the approved structure as `video-plan.json`; follow [production-contract.md](references/production-contract.md).

### 3. Build reusable assets and continuity grids

- Create an asset inventory from the shot plan before assembling the storyboard.
- Prefer SVG for diagrams, icons, labels, charts, paths, masks, frames, and geometry that must stay exact. Prefer PNG for generated illustrations, textures, cut-paper elements, and photographic composites. Preserve transparency when assets must be layered.
- Generate raster masters at least 2× their intended display size. Avoid baked-in text in generated imagery; typeset exact text later.
- Keep every source asset in a predictable `public/assets/...` structure and record its path in the plan. Do not continue with missing placeholders unless the user approves them.
- When two or more generative shots share a character, product, or location, create a text-free continuity contact sheet from the same hero references and shot descriptions. This is mandatory unless the user explicitly opts out. Use it to establish visual consistency, not to carry timecodes or production notes.
- Choose the grid adaptively: use 2×2 for up to four tests, 3×3 as the default for up to nine related beats, and multiple 3×3 batches for longer sequences. Use 4×4 only when the model and source resolution can preserve each panel. Use 5×5 primarily as a whole-film overview; do not treat its small cells as final high-quality source frames.
- State the concrete grid plan in every user-facing production proposal for such a generative sequence: dimensions, batch count, continuity group, panel purpose, and whether any spare panels hold identity angles or transition anchors. Do not omit the grid plan or mention a generic “grid” without choosing one.
- Crop the approved grid into individual panels, repair identity or anatomy errors, and upscale or regenerate important panels before using them as storyboard or image-to-video inputs. Keep `gridBatchId` and `gridPanelIndex` traceable in the plan.

## Gate 2 — Produce the exact review storyboard

- Generate or select keyframe artwork per shot or narrative beat. Use extracted continuity panels for expressive generative scenes and authored SVG for exact technical visuals.
- Compose the approved frames into readable 3×3 review sheets with `scripts/build_storyboard.py`. Do not ask an image model to typeset the review grid; timecodes and notes must remain exact.
- Include on every panel: shot number, time range, key visual, camera/subject movement, transition, and brief audio or voiceover cue.
- Default each review sheet to 3840×2160 SVG. Use multiple numbered sheets for more than nine key shots; never shrink an entire long video into unreadable cells.
- Check visual continuity across adjacent panels: screen direction, scale, palette, recurring object design, lighting, and transition endpoints.

Present the creative brief, timed shot table, asset inventory, continuity sheets, and rendered review storyboards together. Pause for storyboard approval unless the user explicitly requested uninterrupted end-to-end production.

## Gate 3 — Validate a timed animatic

- Assemble the approved storyboard frames on the primary finishing timeline with temporary or final voiceover, music, and simple transitions.
- Validate the hook, reading time, shot duration, narration fit, emotional rhythm, transition logic, and final action before expensive generation or full-resolution scene work.
- Update `video-plan.json` when the animatic changes timing; do not patch timing only inside the composition.
- Render and review one low-cost animatic. Require approval before paid or irreversible generative shots unless the user explicitly waives this gate.

## Gate 4 — Route, produce, assemble, and render

Read [engine-routing.md](references/engine-routing.md) and select one primary finishing engine before building the animatic. State the choice and reason. Do not create duplicate master timelines in Remotion and HyperFrames.

Before routing, inventory the agent skills, plugins, CLIs, renderers, credentials, and execution surfaces actually available on the current device. Treat Remotion, HyperFrames, video-use, Seedance, Manim, and Edge TTS as optional companion integrations: their absence must not block storyboard planning. If a required companion is missing, either use an available equivalent that preserves the approved plan or stop before production and offer an explicit installation/setup step. Never claim a plugin, paid generation, TTS, transcription service, or renderer ran when only its instructions or prompt packet were available.

### Decide whether Seedance is needed

Default to **no Seedance**. Decide per shot before loading `$seedance` or mentioning it to the user.

- Do not use Seedance for presentations, slide-based videos, teaching diagrams, charts, equations, UI demos, kinetic typography, product explainers, or promotional motion graphics that Codex can build from text, SVG, images, footage, and supplied brand assets. Route these through Remotion by default, or HyperFrames/Manim when they clearly fit better.
- Use Seedance only for specific shots that must invent moving pixels Codex cannot produce deterministically: newly created photoreal live-action people, cinematic character performance, narrative animation, complex organic physical motion, or generative environments/effects that are impractical to author with available assets.
- For mixed videos, identify only the Seedance shot IDs. Keep every other shot, all text, diagrams, captions, audio, timing, and the master edit in Remotion or the selected finishing engine.
- If no shot meets the Seedance threshold, do not load `$seedance`, create Seedance prompts, or ask the user to visit Seedance.
- If one or more shots meet the threshold, tell the user which shots require Seedance and why. Explain that Codex will prepare the Chinese prompt packet and reference map, but the user must manually open Seedance/即梦, upload the mapped assets, paste each prompt, generate and download the clips, then return those files to Codex. Mark production `awaiting-user-generated-clips` until the files arrive.

### Remotion route

Use Remotion by default for from-scratch, asset-led motion design, reusable React components, exact frame control, branded templates, captions, and aspect/language variants.

1. Load `$remotion:remotion-best-practices`, then the routed create, markup, multimedia, captions, Studio, docs, or render guidance required.
2. Drive composition duration, sequences, copy, asset paths, and shot boundaries from `video-plan.json`. Convert seconds to frames once using the composition fps.
3. Build reusable scene, camera, transition, typography, caption, texture, and audio components with deterministic frame-based animation.
4. Preview in Studio and render stills at storyboard anchor frames before the delivery render.

### Mathematical, physics, and technical teaching route

Use the companion `$manim-video` skill to produce a 3Blue1Brown-style visual explanation when understanding depends on mathematical structure or progressive visual reasoning: geometry, equations, proofs, graphs, functions, vectors, fields, waves, mechanics, probability, algorithms, state changes, or related scientific and technical concepts.

Do not route by the words “math”, “physics”, or “teaching” alone. Keep a slide-led lesson, simple facts recap, talking-head explanation, experiment recording, software tutorial, or branded presentation in Remotion or video-use unless programmatic concept animation materially improves understanding. Do not use Seedance for a Manim-suitable scene.

1. State why Manim adds instructional value and identify the exact scenes or the whole video it owns. Verify that `$manim-video`, Manim Community Edition, LaTeX, and FFmpeg are available before promising a render.
2. Load `$manim-video` and follow its planning, implementation, draft-render, stitching, audio, and review instructions. Frame the lesson around the learner’s misconception, prerequisite knowledge, visual journey, and one explicit aha moment. Prefer geometry and motion before symbolic derivation.
3. Carry the approved Paco style bible, shot IDs, dimensions, fps, durations, palette, narration, and storyboard anchors into the Manim plan. Let the Manim scene structure elaborate the teaching logic without creating a conflicting master timeline.
4. Build one independently renderable class per scene. Iterate with low-quality drafts and still frames first; check label safety, equation correctness, visual hierarchy, transformation continuity, pacing, and pauses before the production render.
5. For a Manim-dominant educational film, use Manim for the core visual scenes and its verified stitched output as the picture master when no further finishing is needed. When captions, title cards, supplied footage, branding, music mixing, or aspect/language variants are required, render exact-length Manim clips into a single Remotion or FFmpeg finishing timeline.
6. Synchronize animation to the actual approved narration or temporary voice track. Return any timing changes to `video-plan.json`, then verify the final lesson for both conceptual accuracy and media specifications.

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

### Narration and Edge TTS route

Use `$edge-tts` for rapid narration auditions, animatic voice tracks, accessibility, language variants, or a final synthetic voiceover the user has approved. Prefer provided or professionally recorded narration when performance, brand identity, or sensitive unreleased copy makes it the better source.

1. Verify `uvx` and the online service before relying on Edge TTS. Query the live voice list because voices can change; for Hong Kong Cantonese, audition currently available `zh-HK-*` voices instead of silently choosing one.
2. Keep confidential scripts off the online service unless the user approves submission. Verify current service terms and commercial suitability when they affect client delivery.
3. Audition one or two representative lines, then record the approved voice, rate, volume, pitch, script, media, and subtitle paths in `audioPlan`.
4. Generate the locked script as an audio file plus subtitle timing. Proofread names, numbers, scientific terms, Cantonese wording, and subtitle segmentation; use the actual audio duration to update `video-plan.json` and the animatic.
5. Probe and listen to the complete file before insertion. If the runtime or service is unavailable, stop at the script or audition stage and state the fallback instead of claiming narration was generated.

### Generative-shot route

Enter this route only after the Seedance decision gate identifies specific external-generation shots. Load `$seedance` to write Chinese, time-coded prompt packets; do not treat the skill as a video-model execution surface.

1. List the exact Seedance shot IDs, the reason each cannot be produced deterministically, and the required returned clip specification.
2. Map each reference image, video, and audio asset to explicit `@图片N`, `@视频N`, and `@音频N` roles. Preserve first/last-frame and continuity notes between segments.
3. Read the current `$seedance` platform limits before building the upload map. Do not instruct the user to upload prohibited assets; if realistic face references are currently blocked, use text-defined fictional casting or another allowed reference strategy and warn about the continuity tradeoff.
4. Use cropped single panels or approved first/last frames for hero shots, precise continuity, and important product details only when those uploads are permitted. Use a whole continuity grid only for low-cost exploration, montage, or optional supporting material; never let a grid-generated clip replace the approved master timeline.
5. Deliver the prompt packet, upload order, platform settings, and a short manual checklist. Explicitly ask the user to run the prompts in Seedance and return the downloaded clips; do not claim Codex submitted or generated them.
6. Stop external-shot production at `awaiting-user-generated-clips`. Resume only after the user supplies the clips, then inspect them and request manual regeneration when they fail continuity or QA.
7. Allocate more variants to high-risk or high-value shots and fewer to simple inserts. Record model, prompt, references, returned clip, selected take, and rejection reasons in `generation-log.json`.
8. Verify current platform limits before the user performs paid or irreversible generation because third-party model capabilities may change.

### Hybrid assembly

- Render secondary-engine shots and overlays at exact master dimensions, fps, duration, codec, and alpha requirements.
- Inspect every generated intermediate before insertion: first/last-frame match, identity drift, unwanted morphing or flashes, action direction, usable edit handles, duration, and codec. Reject or regenerate failures instead of hiding them in the master.
- Use one master timeline for final audio, captions, scene boundaries, and export. Treat all other engine outputs as source assets.
- Reproduce the storyboard’s framing and motion intent. Use layered depth, masks, camera rigs, tracked typography, motion blur, light/texture passes, and spatial transitions only when they support the concept.
- Add voiceover, music, sound design, and captions. Duck music under speech and tie captions to actual audio timestamps when audio exists.
- Render the requested master and variants. Verify the file rather than assuming a successful command means a good video.

## Final quality gate

Before delivery, verify:

- Exact requested duration, frame rate, dimensions, codec/container, and aspect ratio.
- No missing assets, black frames, timeline gaps, clipped masks, unsafe text, spelling errors, or unintentional flashes.
- Every scene boundary, voiceover line, caption, music beat, and sound cue aligns with the plan.
- When narration exists, the approved voice, pronunciation, loudness, subtitle timing, and actual duration match `audioPlan`.
- Motion remains smooth and purposeful; text stays readable during fast camera moves.
- Storyboard anchor frames and the render match in composition, palette, subject continuity, and transition logic.
- Every selected generated take has a recorded source, selection decision, and passed shot-level QA.
- Final files open and report valid media metadata. Provide the master video, storyboard sheets, `video-plan.json`, source/project path, and a concise render report.

If a render dependency, source asset, font license, voice, music license, or user decision is missing, stop at the last verified artifact and state exactly what is needed.

## Bundled resources

- Read [style-directions.md](references/style-directions.md) when preparing the user’s style choices.
- Read [engine-routing.md](references/engine-routing.md) before choosing Remotion, HyperFrames, video-use, Seedance, or a hybrid.
- Read [production-contract.md](references/production-contract.md) before creating the plan, folders, storyboards, or handoff.
- Read [tts-routing.md](references/tts-routing.md) before generating temporary or final narration with Edge TTS.
- Run `scripts/build_storyboard.py --manifest <manifest.json> --output-dir <dir>` to assemble portable 4K SVG storyboard sheets.
