# Paco Interactive Educator — Build Specification

Use this specification after the learner profile and one-sentence aha are locked.

## Contents

1. Learning contract
2. Four-stage structure
3. Codex inline fragment contract
4. Interaction and coordinate systems
5. Visual system and accessibility
6. Performance and motion
7. Domain adaptations
8. Preflight gate

## 1. Learning contract

The lesson must make one perspective shift observable through interaction. Do not front-load the explanation and then decorate it with controls.

Carry these inputs into the actual build:

- `TARGET_LEARNER`: the audience, not automatically the person prompting Codex
- `PRIOR_KNOWLEDGE`: the earliest safe starting point
- `MENTAL_MODEL`: a shallow intuition, misconception, adjacent confusion, or null
- `ANCHOR_DOMAIN`: the scenario, values, vocabulary, and constraints
- `VISUAL_DIRECTION`: palette, material, diagram language, and motion grammar
- `LESSON_LANGUAGE`: inferred from the conversation unless ambiguous

If changing these inputs would leave the lesson essentially unchanged, the profile was not used.

Keep prose short. Questions must precede their answers, have a discoverable answer, build on one another, and expose hidden assumptions. Never ask a question and immediately answer it in text.

## 2. Four-stage structure

Use exactly four learner-visible stages. Give each stage one Socratic question, one meaningful manipulation, and immediate visual feedback.

### 1 — Puzzle

- Open with a visual mystery or contradiction grounded in `ANCHOR_DOMAIN`.
- Avoid jargon, definitions, formulas, legends that reveal the answer, and tutorial paragraphs.
- Calibrate the first task to `PRIOR_KNOWLEDGE`.
- If `MENTAL_MODEL` is wrong, make its prediction visibly fail.

### 2 — Explore

- Let the learner vary a cause and observe its effect.
- Use realistic values and constraints from `ANCHOR_DOMAIN`.
- Make extreme or boundary cases reachable when they reveal the pattern.
- Avoid meaningless sliders, decorative animation, and controls whose effect is hard to locate.

### 3 — Name

- Introduce the formal term, definition, or equation only after the learner has experienced it.
- Map every symbol or term to a visible object or control already used.
- Explicitly bridge from the initial mental model to the refined one when applicable.
- Keep the central visualization interactive; recognition should replace re-teaching.

### 4 — Challenge

- Use a novel scenario in the same anchor domain.
- Let the visual system resolve, align, settle, balance, converge, or otherwise reveal success without a check-answer button.
- Provide at least two progressive hints behind an explicit control. Hint 1 directs attention; Hint 2 narrows the relationship. Do not reveal the final value or action.
- Do not show multiple-choice answers or a “Correct!” banner.

Prefer one persistent visual stage across all four steps. Preserve meaningful state between stages when it helps the learner see one concept from four angles.

## 3. Codex inline fragment contract

For in-conversation lessons, read and obey `$visualize` before writing the fragment. Its current contract is authoritative when this reference differs.

In addition, make the lesson validator-readable:

- Use one unique fragment root ID.
- Mark the four learner content containers with `data-lesson-screen="1"` through `data-lesson-screen="4"`.
- Mark one question in each screen with matching `data-socratic-question="1"` through `data-socratic-question="4"`.
- Mark the persistent visualization with one `data-lesson-stage` attribute.
- Mark the Challenge hint control or hint region with `data-progressive-hint`.
- Keep presentation-only state local. Do not use `localStorage`, `sessionStorage`, IndexedDB, cookies, fetch, XHR, WebSocket, or authenticated external data.
- Write an HTML fragment, not a full document, unless the user explicitly requested a standalone file.
- Use the exact inline visualization directive required by `$visualize`; do not replace it with a Markdown file link.

Use native buttons, inputs, selects, and outputs. Keep a useful first render. Ensure every queried element exists and every control changes a meaningful visible state.

## 4. Interaction and coordinate systems

- Use Pointer Events for drag interaction. Set pointer capture on press and release it on completion.
- Set `touch-action: none` only on the draggable visual surface, not the whole lesson.
- Use responsive SVG with a `viewBox` for draggable geometric diagrams.
- Use canvas for dense wave fields, heatmaps, particles, or more than roughly 500 SVG marks. Convert pointer coordinates from the canvas bounding rectangle to logical coordinates.
- Do not position HTML hit targets over a rescaled canvas.
- Define React components at module scope when project output uses React. Keep callback props stable during continuous interaction.
- Use fine slider steps for continuous quantities and show the current value with units.
- Make controls keyboard accessible and preserve native focus styles.

Do not add controls merely to satisfy the stage count. A control earns its place only when its effect answers the stage question.

## 5. Visual system and accessibility

Define one small visual token system and use it consistently. For Codex inline output, derive all colors from the active host theme or `light-dark()` values as required by `$visualize`. For project output, follow the project’s tokens.

Maintain these semantic roles:

- background and surface
- primary text and secondary text
- interactive cause
- observed effect
- highlight or target
- grid, axis, or structure

Do not let color carry meaning alone. Pair it with shape, label, line style, position, texture, or motion. Keep labels readable at narrow widths and at approximately WCAG AA contrast. Give canvas and SVG a concise accessible name or description.

Match the selected visual direction structurally, not through a palette swap. A notebook direction may use ruled geometry and hand-drawn marks; a laboratory direction may use calibrated scales and instrument readouts; a blueprint direction may use measured lines and construction annotations.

## 6. Performance and motion

- Show the interface within one frame; defer expensive computation.
- Keep heavy calculations out of repeated DOM rendering. Use memoization, effects, workers, or an offscreen canvas when appropriate.
- Throttle display state during animation. Keep mutable per-frame physics in refs or local variables.
- Cap delta time near 32 ms after tab suspension.
- Use 2–4 physics substeps when stability needs them.
- Use damping around 0.92–0.97 for natural settling when the model allows it.
- Keep explanatory transitions around 1–3 seconds.
- Honor `prefers-reduced-motion`. Remove decorative loops and provide a meaningful static state; disable controls that would otherwise appear broken.

Never render hundreds of DOM or SVG elements per animation frame when pixels or a summarized representation will teach the same idea.

## 7. Domain adaptations

### Mathematics

Pair symbolic and geometric representations. Every variable must have a visible counterpart the learner can move or identify.

### Physics

Make units, scales, sign conventions, initial conditions, and approximations explicit by the Name stage. Prefer a model that is simple enough to manipulate but physically honest about its limits.

### Probability

Include repeatable simulation when empirical convergence or variability is the insight. Let the learner change trial count or assumptions and compare observation with theory.

### Machine learning

Use simplified but realistic data. Show what the model receives, what parameter changes, and what loss, boundary, or prediction responds.

### Programming and computer science

Make state changes concrete. Let the learner step, drag, enqueue, pop, traverse, or mutate a visible structure while preserving causality.

## 8. Preflight gate

Do not share until all applicable checks pass:

- The aha is delivered by an interaction, not a paragraph.
- The lesson has exactly four marked stages and four discoverable questions.
- Every control changes something visible and meaningful.
- Puzzle does not reveal the formal answer.
- Explore exposes the pattern through manipulation.
- Name maps every formal symbol to a prior interaction.
- Challenge uses visual resolution and has two progressive hints.
- The target learner, prior knowledge, mental model, domain, theme, and language visibly shaped the result.
- Dragging works with pointer and touch input; coordinate mapping survives resize.
- Color has a second semantic cue and text remains readable.
- Reduced-motion behavior is meaningful.
- No forbidden storage, network calls, missing elements, unavailable libraries, or full-document tags appear in an inline fragment.
- Dense visuals use an appropriate rendering method and do not stall the interface.
- `validate_lesson_fragment.py --strict` passes for Codex inline output.
- A rendered preview has been opened and the main interaction on every stage has been exercised.
