---
name: paco-interactive-educator
description: Design and build Codex-native interactive lessons that teach one concept through visual intuition and guided discovery. Use when the user invokes `$paco-interactive-educator`, types `/aha [topic]` or `/3b1b [topic]`, or explicitly asks for an interactive explainer, simulator, lab, manipulable lesson, or 3Blue1Brown-style learning experience. Do not trigger for passive requests to explain or teach a topic, static documents, ordinary slide decks, or non-interactive prose.
---

# Paco Interactive Educator

Create one focused, interactive learning experience that earns an “aha” through manipulation. Use exactly four stages: Puzzle → Explore → Name → Challenge. Default to a Codex in-conversation visualization; build a standalone page or project component only when the user asks for one.

## Choose the delivery surface

1. For an in-conversation interactive lesson, load `$visualize`, read its full instructions, and follow its inline HTML contract. Do not copy Claude-specific paths or tools such as `/mnt/user-data`, `ask_user_input_v0`, or `present_files`.
2. For a requested standalone page, app component, or existing-project change, work in the user’s project and follow its local instructions. Preserve the four-stage learning design but use the project’s framework and validation commands.
3. For a code-only request, provide the requested source without pretending it was rendered or tested.

## Phase 1 — Profile the target learner

Gather only missing information. Ask one compact, tailored round rather than a generic questionnaire.

1. **Target learner and prior knowledge.** Ask what the learner can already recognize or do with this exact concept. Distinguish the user from the audience: an expert teacher may be creating for a zero-knowledge student.
2. **Current mental model.** Ask only when the target learner has prior exposure. Offer one roughly correct but shallow intuition, one common misconception, and one adjacent confusion.
3. **Anchor domain.** Offer contexts where the concept naturally behaves differently enough to change the scenario, values, and interaction—not cosmetic skins.
4. **Visual direction.** Offer three or four concept-specific directions, each with palette, material, diagram language, and motion feel.
5. Ask for lesson language only when it is genuinely ambiguous.

Use tailored options, not “beginner / intermediate / advanced” or “light / dark / colorful.” Skip questions already answered. If an interaction-capable question tool is unavailable, ask in ordinary conversation. Do not begin the build until the learner profile is usable.

## Phase 2 — Lock the insight

State one sentence beginning with “The aha:” or the user’s language equivalent before writing code.

Choose a perspective shift, not a fact or formula. If one sentence cannot capture it, narrow the lesson or ask which sub-concept matters first. When the learner holds a misconception, make the first interaction produce evidence that conflicts with it.

## Phase 3 — Design and build

Read [build-spec.md](references/build-spec.md) in full before creating the lesson.

Build exactly four stages:

1. **Puzzle:** present a manipulable mystery in the anchor domain without terminology or definitions.
2. **Explore:** let the learner discover the governing pattern through guided interaction.
3. **Name:** connect the discovered behavior to the formal name, definition, symbols, or equation.
4. **Challenge:** present a new situation where the visualization itself reveals whether the learner’s attempt works.

Keep one visual stage mounted across all four steps when the concept has a central object. Every stage must contain one Socratic question, a meaningful manipulation, and immediate visible feedback. Use progressive hints in Challenge; do not use a multiple-choice quiz, “check answer” button, or congratulatory banner as proof of understanding.

## Phase 4 — Validate and deliver

For a Codex inline fragment:

1. Run `python3 scripts/validate_lesson_fragment.py <fragment.html> --strict`.
2. Render with the helper supplied by `$visualize` when available and inspect the result for layout, runtime, interaction, and theme failures.
3. Exercise the primary control on every stage, including the Challenge hint path.
4. Fix every failed check before sharing. Resolve warnings or explain why they are intentional.

For project output, run the project’s relevant syntax, type, build, and browser checks. Never claim that a lesson rendered successfully based only on static inspection.

End with the aha sentence and the interactive result. Keep implementation commentary out of the learner-facing lesson.

## Bundled resources

- Read [build-spec.md](references/build-spec.md) for the learning, interaction, accessibility, performance, and Codex delivery contract.
- Run `scripts/validate_lesson_fragment.py` for deterministic checks on Codex inline lesson fragments.
