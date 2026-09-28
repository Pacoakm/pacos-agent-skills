# Sound — voice, bed, effects

Claude cannot listen. Everything here is measured, and every taste decision went to the user as
something to hear. Scripts: `voice_chain.py`, `music_profile.py`, `sfx_profile.py`.

## 1. Voice

The camera audio is not the voice track. Build a processed stem from the **PCM original**:

```bash
python3 scripts/voice_chain.py ~/Downloads/<name>-raw.mov ~/PeerPath/reel-assets/Voice/<name>-voice.wav
```

mono → highpass 90 Hz → `afftdn` (nr 14, or 12 for a clean 24-bit source; nf = measured room tone) →
de-esser 0.35 → −1.5 dB @ 250 Hz → +2.5 dB @ 3.4 kHz → compressor 3:1 @ −20 dB → two-pass `loudnorm`
(I −14.5, TP −1.5, LRA 7) → limiter 0.87 → 48 kHz 24-bit. Antony: −20.6 LUFS / −2.85 dBTP raw (it
could not simply be gained up) → **−14.9 LUFS, −4.5 dBTP, LRA 1.5**.

In Palmier: the stem on a `Voice` track at frame 0 and 0 dB, the A-roll's linked audio at −60 dB
with the Dialogue track muted, a 6-frame fade-out at the end. Alex never had this done and shipped at
the camera's −27 LUFS — about 12 LU quieter than Antony on the same phone.

## 2. The bed

**How it was chosen, every time it went right:**

1. Pull 6–10 candidates (Mixkit chill / R&B / lo-fi pages — `assets-and-licensing.md`), longer than the reel.
   Measure the speaking share on **this** reel's voice stem (`--voice`) — a stand-in file gave a
   test run 46 % where the real transcript covered ~96 % of the runtime, and the bed choice flipped.
2. `python3 scripts/music_profile.py Music/*.mp3 --seconds <reel> --voice <voice stem>`
   (`--target <liked.mp3>` when the user liked one and wants "another like it").
3. Shortlist 2–3 by the numbers below, cut 25 s excerpts with 1 s / 2 s fades, send them with
   `SendUserFile`, and let the user choose:
   `ffmpeg -ss 12 -t 25 -i IN -af "afade=t=in:st=0:d=1,afade=t=out:st=23:d=2" clip-<name>.mp3`

| Measure | Good for a talking reel | Why |
|---|---|---|
| speech % (300 Hz–3.5 kHz) | ≤ 6 % | the voice needs that band clear; Stylz put 18.8 % there and was replaced |
| swing dB (P90−P10, 3 s windows) | ≤ 6 dB raw, ≤ 8 with care | Sweet September swung 9.8 dB and needed a compressor to stop surging |
| onsets/s | ≤ 2.6 for a pause-heavy speaker | Alex spoke 45 % of the time; a busy bed "rushes ahead in the gaps" |
| drum % | lower is calmer | Hip Hop 02 (57 %) was 「不太適合作為說話內容的bgm」 |
| bpm | a hint only | one track measured 96 and 126 in two scripts; never decide on it |

The library, measured over 80 s (`reel-assets/Music*`, all Mixkit):

| Track (Mixkit id) | speech % | <300 Hz % | onsets/s | swing dB | Outcome |
|---|---|---|---|---|---|
| Baileys (476) | 3.5 | 95.5 | 2.6 | 6.3 | Antony's bed, −22 dB |
| Sweet September (282) | 4.1 | 94.8 | 1.7 | 9.9 | liked the pacing (「這個bgm節奏不錯，但我想換一個」) |
| R&B Vibes 1 (685) | 6.4 | 92.6 | 2.6 | 7.2 | **Alex's final bed** — the user asked to try it |
| New York (427) | 12.7 | 85.5 | 2.75 | 8.6 | shortlisted |
| Curiosity (480) | 8.2 | 90.8 | 3.2 | 15.4 | shortlisted, surges |
| Sleepy Cat (135) | 15.3 | 84.6 | 2.0 | 1.3 | steady but sits on the voice |
| Stylz (102) | 18.7 | 80.1 | — | 5.4 | replaced |
| Hip Hop 02 (738) | 26.9 | 60.6 | — | 1.4 | rejected — beat too strong |
| Thinking About You (234) | 30.6 | 68.9 | — | 12.7 | rejected unheard |
| Serene View (443) | 43.4 | 56.6 | — | 2.4 | rejected unheard |

**What the user meant, in order:** 「可以chill一點」 → chill. 「節奏要比現在快一點」 then 「我要節奏快一點不是
節奏感強一點，節奏感不用太強」 → more forward motion, *not* heavier drums. Chasing the reference reel's
tempo (a 110 % time-stretch to ~106 BPM) was wrong: 「其實可以不用像reference片一樣快，因為我們的說話節奏
比它慢，換一個配合說話節奏的bgm」 — the speaker articulates as fast as the reference but pauses far
more, so the **sparsest** bed won. Don't time-stretch or compress a bed if another track fits raw.

**Level.** Sit the bed 12–18 LU under the voice: Antony −22 dB static on Baileys (≈ −32.5 LUFS against
a −15 LUFS voice); Alex keyframed −22 dB for the first 60 frames, −26.5 under speech, −23 at the CTA,
−60 at both ends. Fade in 18 f, out 45 f. A bass-led bed is what phone speakers lose first — if it
vanishes on a phone, lift it 2 dB before swapping it.

## 3. Sound effects

**The system: one sound per element type.** A cue exists only where something enters the frame, and
the same kind of element always makes the same sound. When a graphic moves or goes, its cue does too.

| Element | Alex (final) | Antony |
|---|---|---|
| Structural turn / accent chip / TIP label | `switch-select` −14/−15 | `switch-select` −14 |
| Image card | `page-turn` −17 | `whoosh-card` −18 (26 f, 8 f fade) |
| List row (each) | `click-chip` −17 | — |
| Row pill | — | `page-turn` −16; second row `pop-light` −21 |
| Hook / display | `switch-select` | `sweep-fast` −17 |
| Question display | `pop-light` −16 | — |
| Struck myth | `shutter` −13 | `shutter` −10 |
| Mentor payoff | `sparkle-star` −17 | — |
| The offer (CTA) | `ding-achievement` −13 | `ding-achievement` −16 on its **own track** (Foley) |

**Rules:**

- **No two cues within 24 frames** (0.8 s). A flash card that lands within 24 f of a chip stays silent.
- **Align the peak, not the first frame.** `sfx_profile.py` gives each file's peak frame. The cinematic
  whoosh peaks 32 f in; trimmed to its first 16 f it held 0.9 % of its energy and was inaudible. The
  fix was a tight cut (`-ss 0.72 -t 0.61`) started 11 f before the beat. `whoosh-card` peaks 22 f in —
  placed on the card's first frame it lands late, which may be why it sounded odd.
- **Check masking against the bed** (`--bed`). `sweep-fast` (96 % below 300 Hz) disappeared under a
  bed with 94.5 % below 300 Hz. Pick cues in the band the bed leaves empty — `switch-select` at ~2 kHz.
- **Level the family from measured peaks** (`gain dB` column, target −17 dBFS), then: repeated rows
  −3 dB, payoffs +3 dB.
- A long payoff (the 2.4 s ding) goes on its own track so the next cue can't cut it off.

**The user's reactions:**

| They said | Done since |
|---|---|
| 「sound effect重新設計，要配合畫面文字」 | the one-sound-per-type system |
| `whoosh-card`: "don't use this, a bit weird" | cards use `page-turn` |
| "use more mouse click sound effect" | `click-chip` on every list row |
| picked Mixkit 1492 "Cinematic whoosh" from six auditioned | used on structural turns only… |
| 「還是不要用sfx-whoosh了，和bgm不搭」 | …then removed: a bright trailer whoosh clashed with a chill bed |
| 「是bgm和sound effect重疊了」 (about the reference reel) | without stems, speech consonants and UI clicks can't be separated — audition instead of analysing |

`sparkle-star` (97 % above 5 kHz) is the remaining likely clash with a mellow bed — audition it.

**The palette** (`reel-assets/SFX/`, Mixkit Sound Effects Free License; `https://assets.mixkit.co/active_storage/sfx/<id>/<id>.wav`):

| File | Mixkit id | Length | Peak | Character |
|---|---|---|---|---|
| `sfx-click-chip.wav` | 2568 | 6 f | 0.3 f | interface click, ~4.3 kHz |
| `sfx-switch-select.wav` | 3124 | 15 f | 0.3 f | select tone, ~2 kHz |
| `sfx-page-turn.wav` | 1104 | 13.5 f | 4 f | paper, bright |
| `sfx-pop-light.wav` | 3005 | 5 f | 1 f | soft pop, half its energy < 300 Hz |
| `sfx-shutter.wav` | 1133 | 10.5 f | 6 f | camera shutter |
| `sfx-ding-achievement.wav` | 600 | 72 f | 4 f | bell payoff |
| `sfx-sparkle-star.wav` | 2350 | 105 f | 14 f | sparkle, very bright |
| `sfx-sweep-fast.wav` | 166 | 23 f | 9 f | low sweep — masked by bass beds |
| `sfx-whoosh-card.wav` | 1490 | 53 f | 22 f | whoosh — rejected on Alex |
| `sfx-whoosh-cinematic.wav` / `-tight.wav` | 1492 | 40 / 18 f | 32 / 11 f | riser — clashed with the bed |

Auditioned, unused: `SFX-audition/` (Mixkit 1489, 1491, 1486, 2918, 787). The Remotion-hosted SFX from
the first 0824 pass were dropped: their licence for commercial use was never confirmed.
