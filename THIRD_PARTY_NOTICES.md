# Third-party notices

This repository keeps local snapshots of companion skills and Codex plugin bundles referenced by `paco-video-production`. Upstream licenses continue to apply to their respective files. Inclusion here does not relicense the associated runtimes or online services.

For compatibility with the current Codex skill schema, unsupported top-level `version` fields are omitted from vendored `SKILL.md` frontmatter. Upstream or bundle versions remain documented here, in plugin metadata, or in the surrounding package files.

## edge-tts skill

- Source: <https://github.com/aahl/skills/tree/main/skills/edge-tts>
- Snapshot path: `skills/edge-tts/`
- License: MIT; the upstream license is preserved at `skills/edge-tts/LICENSE`.
- The skill invokes the separately distributed `edge-tts` client and an online Microsoft service. Their terms are not replaced by the skill license.

## video-use and manim-video skills

- Source: <https://github.com/browser-use/video-use>
- Snapshot paths: `skills/video-use/` and the installable copy at `skills/manim-video/`
- License: MIT; upstream license files are preserved in both paths.
- Manim Community Edition, LaTeX, FFmpeg, ElevenLabs, and other runtimes or services are not vendored and retain their own licenses and terms.

## HyperFrames Codex plugin bundle

- Source: <https://github.com/heygen-com/hyperframes>
- Snapshot path: `plugins/hyperframes/`
- Bundled version: `0.1.2`
- License: Apache-2.0; the upstream license is preserved at `plugins/hyperframes/LICENSE`.
- The separately installed HyperFrames CLI and its dependencies retain their upstream licenses.

## Remotion Codex plugin bundle

- Plugin author and source: Remotion, <https://github.com/remotion-dev/remotion>
- Snapshot path: `plugins/remotion/`
- Bundled version: `1.0.7`
- The installed plugin metadata declares the plugin bundle license as MIT and is preserved at `plugins/remotion/.codex-plugin/plugin.json`.
- The Remotion runtime is not included in this snapshot. Remotion uses a separate runtime license with eligibility and company-license conditions; consult <https://github.com/remotion-dev/remotion/blob/main/LICENSE.md> before use.

## seedance skill

- Snapshot path: `skills/seedance/`
- This is the locally installed Paco workflow for writing Seedance／即夢 prompt packets. It does not include or redistribute the Seedance model, platform, or client.
- No separate license is granted for this local skill unless the repository owner adds one later.
