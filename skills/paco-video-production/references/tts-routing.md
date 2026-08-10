# Narration and Edge TTS

Use Edge TTS as an online audio companion, not as the finishing timeline. Load `$edge-tts` before running it.

## Choose the narration source

- Prefer supplied or professionally recorded narration for brand-critical performance, confidential scripts, acting, or pronunciation that synthetic voices cannot reproduce reliably.
- Use Edge TTS for rapid voice auditions, animatic timing, accessibility, language variants, and final synthetic narration the user has approved.
- Treat all text submitted to Edge TTS as leaving the local device. Do not submit confidential or unreleased copy without approval, and verify current service terms when commercial delivery depends on them.

## Check readiness

1. Verify `uvx` is available.
2. Run `uvx edge-tts --list-voices` before choosing a voice; the online list can change.
3. For Hong Kong Cantonese, shortlist the currently returned `zh-HK-*` voices and audition them. Do not rely only on a hard-coded voice list.
4. If the runtime or service is unavailable, preserve the script and offer a configured alternative or human recording. Do not claim audio was generated.

## Generate an audition and the locked narration

Write a spoken-form script with punctuation that reflects intended pauses. Spell out ambiguous numbers, abbreviations, equations, names, and technical terms as they should be spoken.

Generate one or two representative lines first. After approval, synthesize from a UTF-8 script file so long text and punctuation do not require unsafe shell quoting:

```shell
uvx edge-tts \
  --file "public/assets/audio/voiceover/narration.txt" \
  --voice zh-HK-HiuGaaiNeural \
  --rate=+0% \
  --volume=+0% \
  --pitch=+0Hz \
  --write-media "public/assets/audio/voiceover/narration.mp3" \
  --write-subtitles "public/assets/audio/voiceover/narration.srt"
```

Use the user-approved voice and parameters; the example voice is not a universal default. Record the provider, voice, rate, volume, pitch, script path, media path, subtitle path, and approval status in `video-plan.json` under `audioPlan`.

## Integrate and verify

- Probe the output for duration, codec, sample rate, and channels; listen to the complete narration.
- Check pronunciation, pauses, clipping, artifacts, loudness consistency, and sentence joins. Regenerate from the script when synthesis parameters change.
- Proofread and reflow the generated SRT. Treat its timings as a useful starting point, not automatically final caption segmentation.
- Update the shot plan and animatic from the actual audio duration and cue timings. Do not stretch the approved narration merely to repair an outdated timeline.
- Keep music ducking, final loudness, captions, and export ownership in the primary finishing engine.
