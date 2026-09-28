---
name: peerpath-video-production
description: Edit PeerPath promo reels — 9:16 Instagram talking-head reels where a PeerPath mentor (a student at a top UK university) gives admissions tips to camera, already cut by the user, which Claude packages in Palmier Pro through its MCP server — hook, TIP structure, lists, image cards, captions, reframe punches, grade, voice clean-up, music bed, sound effects, the comment-keyword CTA, and HDR/SDR export. Use it whenever the user mentions PeerPath, a reel/Reels/短片 for PeerPath, a mentor or student talking-head clip, an existing reel like alex.palmier or antony.palmier, or asks to add text, images, subtitles/字幕, 畫面文字, BGM/配樂, sound effects/音效 or zooms to a promo clip, or to fix, restyle or export one — even if they never say "skill". Not for SmartQuest DSE lessons (smartquest-video-production) or explainers animated from scratch (paco-video-production).
---

# PeerPath Video Production

PeerPath is a Hong Kong overseas-study consultancy. Its reels are one mentor — a current student at
Imperial, LSE, Oxbridge — giving three admissions tips to camera in 40–80 s. **The user shoots and
cuts the performance; Claude packages it in Palmier Pro**: every word of on-screen text, every image,
the captions, the picture moves, the grade, the voice, the bed, the sound effects and the delivery.

Three reels were made this way — `0824`, `alex` and `antony` — and almost every rule below is a
correction the user had to make on one of them. Read `references/past-reels.md` once: it is the
record of what the user asked for, in their words, and what they rejected.

## What a PeerPath reel is

| Beat | Where | What the picture does |
|---|---|---|
| **Hook** | 0–4 s | A 2–3 line question or promise over the chest, lines popping in on their words. Captions off — the title says it |
| **Credential** | ~4–7 s | Who is talking: an institution card — the real place, the real mark (LSE logo on Houghton Street) |
| **"N things"** | ~1 s | Name the N items as rows, cued as they are spoken — a lone "3" says nothing the caption doesn't |
| **Tip 1…N** | 8–15 s each | A TIP chip (+ progress badge) opens the section, then one graphic per phrase: card, row, list, a struck-through myth |
| **Pivot** | 2–4 s | A question display, then the answer in the accent ("THE MOST VALUABLE PREP?" → "PRACTISE WITH A MENTOR") |
| **Brand** | 2–4 s | `PEERPATH MENTORS` chip, then the round logo badge |
| **CTA** | last 4–8 s | `COMMENT "KEYWORD"` in the accent + the offer rows. Captions off. Held to the last frame — reels loop. If the spoken CTA is under 2 s, bring the chip in on the sentence before it; never lengthen the user's cut |

## Already decided — do not re-ask

| | Locked |
|---|---|
| Editor | **Palmier Pro through its MCP server** (`http://127.0.0.1:19789/mcp`). The whole edit lives in one `.palmier` project the user can open and change. Tool names may be `mcp__palmier-pro__*` or `mcp__Palmier_Pro__*` — load the schemas with ToolSearch before the first call |
| The cut | The user's. Never trim, retime or re-cut the performance; its jump cuts are the rhythm |
| The speaker | **On screen every frame.** No full-screen cutaways, nothing over the face — 「全程要看到alex在說話，內容可以遮住一部分，但不要全屏」 |
| The slot | Graphics sit in the lower-middle, over the chest; the caption line sits just under the chin, above them. The top band carries only a progress badge or TIP label |
| One at a time | Caption + **one** element. Text rows and image cards swap on the beat; they never share the slot |
| On-screen text | Only what captions can't do: **structure** (TIP chips, badge), a **complete scannable list**, **brand**, the **CTA**, a **meaning-changing device** (a struck-through myth). Never re-type the sentence being spoken — 「很多字幕和畫面文字有相同的地方很confuse」. The two **displays** — the hook and the pivot's question → answer — are the exception: the idea condensed to ≤ 5 words ("PRACTISE WITH A MENTOR"), never the sentence |
| Captions | Transcript-timed, every ASR error fixed, British spelling. **The caption is the anchor: move graphics, never the caption** |
| Style | Designed by you **for this footage** — 「reels風格不用跟peerpath網站，自己設計」: white + ink + **one** accent, one heavy sans, uppercase, 「簡單一點，不用花里胡哨」. Never the PeerPath website palette (navy/cream/gold). An earlier reel's approved system may carry over as a series look if it suits the footage — say which you chose and why. A cool acid green on warm skin was 「好醜」 |
| Images | Topic-accurate and varied: authored cards, motion b-roll, real institution imagery, stock stills — 「not only from pexel」. Every file in the ledger |
| Watermark | None. The `@PEERPATH` pill was removed on request |
| Sound | Processed voice ≈ −15 LUFS; a chill, sparse bed the user picked **by ear** from measured candidates; one sound per element type |
| Delivery | HDR source → the user's preset **HEVC 10-bit HDR, QuickTime .mov, match timeline, 30 fps**, plus an H.264 SDR fallback. SDR source → H.264. Versioned files in `~/PeerPath/output/` |
| Spelling & copy | English on screen, British spelling, uppercase, ≤ 22 characters a row. Talk to the user in their language |

## Workspace

```
~/PeerPath/
├── .video-edit-staging/         plans and memory — read before touching anything
│   ├── project.md               session log, appended every session
│   ├── sources.md               licence ledger for every asset
│   └── <name>-reel-plan.md      the reel's spec (template: assets/reel-plan-template.md)
├── reel-assets/                 Brand/ Cards*/ Stills*/ Broll/ Music/ SFX/ Voice/ Panels/ …
│                                referenced IN PLACE by the projects — never move or rename
└── output/                      <name>-reel-vN.mp4, -vN-HDR.mov, -vN-SDR.mp4, <name>-master-hdr.mov
~/Documents/Palmier Pro/<name>.palmier     the projects
~/Downloads/                     where the user drops sources (antony.mp4 + antony-raw.mov)
```

Scripts are in this skill's `scripts/` folder — call them as `python3 <skill>/scripts/<name>.py`.

## The workflow

### 0 · Connect (every session)

1. `ToolSearch` "palmier" and load the schemas you need. Never guess a parameter — a session that
   guessed hit eleven schema errors. `set_clip_properties` places by **centre** (`centerX`/`centerY`);
   `update_text`/`add_texts` place by `x`/`y`.
2. `manage_project {action:"list"}`, then `open` the reel by **path**. The session is bound to one
   project: if the user switches projects in the app, calls fail — reopen by path; never retarget.
3. `get_timeline` once (fps, tracks, `canGenerate` — false means no AI generation). Read the reel's
   plan and the last `project.md` entry: one review was written against a stale plan.
4. If the server refuses connections, say so and ask the user to restart Palmier/the session; plan
   offline meanwhile. Don't spend the session probing the port.

### 1 · Intake — know what the source really is

```bash
python3 scripts/probe_source.py ~/Downloads/<source> --loudness --md5
```

- **HEVC Main 10 renders as black frames in Palmier** (0824 and Alex). Transcode first: ProRes 422
  10-bit keeping the HLG tags if the source is HDR, H.264 8-bit if SDR — the script prints the command.
- **HDR is common**: both iPhone sources (Alex, Antony) were HLG. If the file you were handed is 8-bit
  SDR and the script finds a same-length 10-bit/HDR/ProRes twin, **ask whether that is the original
  before grading anything**. Antony v1–v7 were built on an HLG→SDR conversion; the grade stacked on
  it turned the skin orange, and the user had to ask 「為什麼顏色好像不對」.
- Confirm it is **this** take before anything else: its frame count matches the timeline, and its
  visible jump cuts fall on the transcript's word gaps. Offline, a sheet shows both —
  `verify_export.py SOURCE --skip-slow --sheet <scratchpad>/src.png --every 2` (HLG looks flat on the
  sheet: judge framing and wardrobe there, not colour).
- Record path, format and MD5 of the A-roll in the plan. Palmier references it in place.

### 2 · Read the performance

- `get_transcript` (words) → every cue lands on a **word boundary** in project frames.
- Gaps in the word timing are the user's jump cuts (Antony: f120, 233, 576, 769, 972, 1106) — they
  become the chapters for reframe punches.
- List the ASR errors now and confirm the speaker's name spelling. Seen so far: LSC→**LSE**,
  Emissions→**Admissions** officers, "30 year"→**3rd year**, "come in the word"→**comment the word**,
  "from our"→**for more**, Anthony→**Antony**, US spellings (memorize, practice as a verb).
- Measure the framing on one frame (`inspect_media`, or the offline sheet): chin line, hairline, where
  the hands move, what the speaker wears. That sets the caption
  line and the slot (Antony: chin 0.48, hands 0.72–1.00; Alex was framed too wide and needed a 1.15×
  push-in to open his chest as the graphics zone).

### 3 · Plan, and show it before building a NEW reel

Write `<name>-reel-plan.md` from `assets/reel-plan-template.md`: style tokens, grid, beat map
(frame → element → copy → sound), image list with sources, picture moves, sound plan. Then build
**three style frames** in Palmier — the hook, one TIP beat with a card, the CTA — capture them at full
resolution and show the user the plan plus the frames. **Stop for a yes.** Every reel so far was rebuilt
at least once for a direction the user would have rejected from a single frame (full-screen cutaways,
navy/gold, lime). Change requests on an existing reel need no stop — just do them.

Design rules: `references/style-system.md` (grid, element kit, measured sizes, two approved token
sets) and `references/editorial.md` (what earns a place on screen, copy, captions, image choice).

### 4 · Build in Palmier

In this order — each step depends on the one before:

1. **Tracks**, top to bottom: `Captions · Headline · Support · Footer · Badge · Cards · Main` |
   `Dialogue (muted) · Voice · Music · SFX · Foley`. Overlapping text needs separate tracks; name them.
2. **Picture**: the push-in or chapter punches on the A-roll (position must follow scale — formulas in
   `references/picture-and-delivery.md`), then a grade that suits the *source* (neutral on HLG).
3. **Text** with the token patches. Centre-aligned pills. **Measure one pill on a full-resolution
   capture before stacking anything**: Palmier's auto-fit box is far taller than the type (a 30 pt pill
   is 169 px, 5.6× the font size), and a pill draws its whole box.
4. **Cards**: `scripts/make_card.py` cuts every asset to its slot's exact aspect (Palmier's `crop` trims
   the rendered box, it doesn't refill it). Standard card: width 0.4444, height 0.1667, `edgeRounding`
   0.06, 4-frame linear fades.
5. **Captions**: `add_captions`, then the style patch, then the ASR corrections. Editing a caption's
   text clears its word timings, so decide before relying on `highlightPop` karaoke. Delete the caption
   clips under the hook and the CTA.

Every call shape and trap: `references/palmier-mcp.md`.

### 5 · Sound

- **Voice** — `scripts/voice_chain.py <PCM original> reel-assets/Voice/<name>-voice.wav` → a `Voice`
  track at frame 0; mute the A-roll's linked audio (−60 dB **and** the Dialogue track muted). The Alex
  reel shipped with its camera audio at −27 LUFS, 12 LU quieter than Antony.
- **Bed** — `scripts/music_profile.py <candidates> --voice <voice> [--target <liked track>]`. Shortlist
  2–3, send 25 s excerpts with `SendUserFile`; **the user picks by ear**. Measure the speaking share on
  this reel's own voice stem (or its transcript's gaps) — never a stand-in file. "Faster" meant more forward
  motion, not a harder beat (「節奏快一點不是節奏感強一點」); later, "match his pace" (Alex speaks only
  45 % of the time, so the sparsest bed won). Level the bed 12–18 LU under the voice, lift it ~4 dB
  before the first word and at the CTA, fade in 18 f / out 45 f.
- **SFX** — `scripts/sfx_profile.py SFX/*.wav --bed <bed>`. One sound per element type, every entry cued,
  no two cues within 24 f, each clip started early enough that its **peak** lands on the beat, a long
  payoff on its own track. Tables and the user's likes/dislikes: `references/sound.md`.

### 6 · Audit, then look

1. Snapshot and audit — Palmier writes `project.json` on save, not per MCP edit:
   ```
   export_project {mode:"palmier", outputPath:"<scratchpad>/audit.palmier"}
   python3 scripts/timeline_audit.py <scratchpad>/audit.palmier      # then delete the snapshot
   ```
   Fix every FAIL (collision, floor, orphan cue, plate edge, double voice); decide every WARN.
   On the finished Alex project it still finds a lost card, rows below the floor and two silent rows.
2. Look: `inspect_timeline` at every layout variant, at least 8 frames after a `popIn` starts
   (mid-animation frames look broken); `capture_frame` at full resolution for anything close — the
   288×512 preview can't tell touching from overlapping; the frame at the tightest punch; the longest
   caption; the CTA's last frame. Delete the captures from the media bin afterwards (`organize_media`).
3. Re-read the user's requests and tick each against the timeline before reporting. A past summary
   listed items that were never built.

### 7 · Deliver

- By default the user reviews in Palmier. Export when asked, in their format, never before the last
  open decision (an Alex export went stale because it started before the music was chosen).
- `export_project` **overwrites by default** — always pass `overwrite: false` and a new versioned path
  in `~/PeerPath/output/`. An export once replaced the user's source file; the next master then
  rendered the finished reel through the timeline again, captions doubled.
- HDR: the MCP's H.265 is 8-bit BT.709 `.mp4` — not the user's preset. Export ProRes (it keeps HLG) and
  encode HEVC Main 10 with ffmpeg; export the H.264 SDR fallback (Palmier tone-maps it). Commands:
  `references/picture-and-delivery.md`.
- ```bash
  python3 scripts/verify_export.py output/<name>-reel-vN-HDR.mov --expect hdr --frames <N> \
      --source <A-roll original> --sheet <scratchpad>/sheet.png --every 3
  ```
  Send the sheet and the paths. Then append the session to `project.md` and the ledger to `sources.md`.

### Coming back with changes

- Turn every note into frames first. Palmier's timecode reads **seconds:frames** (`03:10` = 3 s 10 f);
  when a screenshot comes with it, the screenshot wins.
- Fix the class, not the instance: "00:08 overlaps" meant three other stacks overlapped the same way.
- A graphic that moves or goes takes its sound with it; re-run the audit after any retime — the Alex NHS
  card was lost twice and nobody saw it the second time.
- 「don't move the subtitle」 = keep it where the user last put it and move the graphics.
- Claude can't hear: when a note is about sound, offer auditions, not arguments.

## Hard rules

1. **Never import a source you haven't probed.** HEVC Main 10 renders black; an SDR file may be a
   conversion of an HDR original sitting next to it.
2. **Never grade a conversion.** Find the camera original; on HLG keep the grade neutral.
3. **Never let the speaker leave the screen** — no full-frame graphic, no card over the face.
4. **Never put a sentence on screen that the caption is already saying.**
5. **Never stack by estimate.** Measure the rendered box on a full-resolution capture: the first pass on
   Alex was 1.78× too big, and three Antony grids overlapped before one was measured.
6. **Never move the caption to fix a collision** — move the graphic.
7. **Never leave a sound without a picture, or an entry without its sound**, after a retime or delete.
8. **Never trim or place a sound before finding its peak.** A riser trimmed to its head is silent; a
   whoosh placed on the frame plays 22 frames late.
9. **Never pick music on BPM or on your own judgement.** Measure, shortlist, let the user listen.
10. **Never report from tool results.** Audit, look at composited frames, tick the request list.
11. **Never use `typewriter` on a pill or left-align a pill.** The plate draws full-width at once; left
    alignment leaves the text ~26 px off centre.
12. **Never write an export over anything.** `overwrite: false`, a new versioned path, and MD5 the A-roll
    against the intake record before a master render.
13. **Never call the MCP's H.265 export HDR.** Verify tags with `verify_export.py --expect hdr`.
14. **Never send the user's personal data to a third party.** A past session put the user's email in a
    Wikimedia User-Agent header — use a generic one.
15. **Never use offer letters, student details or a third party's logo without the user's explicit
    yes**, and log the licence *and* trademark status (the LSE logo is CC BY-SA 4.0 and trademarked).
16. **Never cut a reference reel into a deliverable.** Reference reels are for studying structure only.
17. **Never reuse a file name for a changed asset** — Palmier caches media by path and keeps showing the
    old picture.
18. **Never leave capture assets in the media bin**, and never leave your scratch exports in the project.

## Bundled resources

| File | Use it when |
|---|---|
| `references/style-system.md` | designing the look: frame map, grid, element kit with exact Palmier style patches, measured sizes, the two approved token sets |
| `references/editorial.md` | deciding what goes on screen: beat grammar, what earns a place, copy and caption rules, image choice, density |
| `references/palmier-mcp.md` | making any Palmier call: shapes, stored field names, transforms, keyframes, captions, export behaviour, known errors |
| `references/sound.md` | voice chain, choosing and levelling the bed, the SFX palette and the user's reactions to it |
| `references/picture-and-delivery.md` | HDR/SDR sources, transcodes, grade, push-ins and punches, export routes, the HDR encode, loudness, versioning |
| `references/assets-and-licensing.md` | finding images, b-roll, music and SFX; download recipes; licences, trademarks, sensitive sources; the ledger |
| `references/past-reels.md` | calibrating taste: the three reels, their final systems and every user correction, verbatim |
| `assets/reel-plan-template.md` | starting a reel's plan |
| `scripts/probe_source.py` | intake: codec, HDR, better originals, overwrites |
| `scripts/music_profile.py` | ranking beds by speech-band share, event density, swing, drums, loudness; speaker's speaking share |
| `scripts/sfx_profile.py` | peak position, pre-roll, masking against the bed, levelling gains |
| `scripts/voice_chain.py` | the processed voice stem, two-pass to ≈ −15 LUFS |
| `scripts/make_card.py` | cards, b-roll, round badge, list panel, logo plaque, authored document cards |
| `scripts/timeline_audit.py` | collisions, floor, plate edges, slot grammar, CTA, spelling, cue audit, double voice |
| `scripts/verify_export.py` | format/HDR tags, frame count, loudness, black frames, source overwrite, contact sheet |
