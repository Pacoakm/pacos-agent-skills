# Past reels — what was made, what the user said, what changed

Read this to calibrate taste. The user's words are quoted as written. Full logs:
`~/PeerPath/.video-edit-staging/project.md`, `sources.md`, `antony-reel-plan.md`.

## 1. `0824` — medical school interview tips (2026-08-30 → 09-01)

Source `~/PeerPath/0824.mov`, 78.23 s, captions already burned in. Brief: 「畫面比較沉悶，只有一個人對著
鏡頭在說話。我想你根據說話的內容，加入額外的圖片、效果、文字、sound effect等等，讓畫面豐富一點。使用palmier pro
…多上網搜索你要的素材…最後讓我手動export」.

- First built as a Remotion overlay + ffmpeg master (navy/cream/gold "academic editorial", upper third
  only, above the burned-in captions), then rebuilt natively in Palmier so the user could edit and export.
- Taught: HEVC Main 10 renders black in Palmier; Remotion's SFX had an unclear licence (→ Mixkit);
  text overflowed at first sizes; 34 capture assets cluttered the bin.

## 2. `alex` — the same talk, caption-free (2026-09-03 → 09-21)

Project `~/Documents/Palmier Pro/alex.palmier`, A-roll `reel-assets/alex-h264.mp4` (from the HLG
`Alex.mp4`), 2345 f. Rebuilt five times. In order:

| The user said | What changed |
|---|---|
| a colleague's notes (animated hook, checklist, news feed, question → answer, CTA ≥ 2 s) | adopted the structure, rejected emoji/✓/medical blue/news/shatter |
| 「影片不要從頭到尾都顯示alex的樣子，可以在中間加插full screen影片、圖片、動畫、文字…字幕最後才加」 | 8 full-screen cutaways (Alex off screen 38 s) |
| reference reel + 「多找一些和話題相關的圖片，可以有些全屏，有些疊在畫面上方…區分不了字幕和畫面文字…加入一個…bgm，可以chill一點」 | 9 new stills, subtitles restyled, first BGM |
| 「00:08 畫面文字重疊了不好看」 | re-spaced that and three similar stacks |
| 「don't memorize perfect script那段的打字機文字動畫有點奇怪」 | typewriter → wordReveal, no plate |
| 「換一個bgm，節奏要比現在快一點」 then 「我要節奏快一點不是節奏感強一點」 | beds measured for speech band and drums |
| **「不要全屏animation，全程要看到alex在說話…theme完全重新設計，不要follow peerpath網站的主題、顏色…簡單一點，不用花里胡哨」** | all cutaways deleted; "Mono + Acid" (lime), graphics in the empty top band |
| reference reel again: adopt its structure 「全套搬過去」, keep one accent | 1.15× push-in, graphics over the chest, captions high with word highlight, progress badge, cards swapping with text |
| **「畫面文字可以減少和字幕有重複的內容…很confuse」** | 22 text clips cut; the "earns its place" rule |
| 「don't write a 3 on screen only. Describe more」 | the three tips as rows |
| 「換一張圖片，和interview/mentor相關」 | panel/one-on-one photos were on each other's beats — swapped |
| outlined rows looked crude | translucent list panels |
| 「sound effect重新設計，要配合畫面文字」 | one sound per element type |
| "don't use this, a bit weird" (whoosh) · "use more mouse click sound effect" · 「是bgm和sound effect重疊了」 · picked the cinematic whoosh by audition · 「還是不要用sfx-whoosh了，和bgm不搭」 | page-turn on cards, clicks on rows, whoosh tried then removed |
| 「換一個bgm，其實可以不用像reference片一樣快，因為我們的說話節奏比它慢」 · 「這個bgm節奏不錯，但我想換一個」 · 「試一下rnb vibes」 | Sweet September → R&B Vibes 1 |
| "change to peerpath logo" | round logo badge |
| "this text overlap" | 4-row panel reached into the caption by 17 px — re-gridded; corner badge → `TIP 1 OF 3` over the hair |
| 「改一下文字顏色那個青色，現在好醜」 | lime → amber `#F5C85C` |
| 「上面嗰舊嘢show 幾秒就ok」 · 「下面subtitle 可以再放落少少？」 · 「now many text overlap, don't move the subtitle, change the screen text」 · 「check還有什麼問題」 | TIP labels 90 f; captions lowered then reverted to 0.625 (probably a misreading); graphics pushed down |

**State of `alex.palmier` now** (audited 2026-09-24): rows and list panels were pushed below the
0.845 floor (panels to 0.881); the NHS corridor card at f868–988 is missing for the second time, so
the f868 page-turn plays over nothing; the preview rows at f240/f266 lost their clicks; the voice is
unprocessed. The exports in `~/Downloads` (`peerpath-reel-v4.mp4`, `-v5-rnb.mp4`) predate the last
changes and run at −27 LUFS. Fix these before any re-export.

## 3. `antony` — showing passion in a personal statement (2026-09-22 → 09-23)

Project `~/Documents/Palmier Pro/antony.palmier`, 1325 f. 「我已經剪輯好節奏，你負責聲音、文字、字幕、效果等等」.
Its own style ("Blue Condensed"), not Alex's — the user, mid-turn: 「reels風格不用跟peerpath網站，自己設計」.

| The user said | What changed |
|---|---|
| 「參考alex.palmier，要加入一些圖片，豐富一點，不要只有文字」 | 5 cards, following Alex's card spec and swap rule |
| 「畫面的放大縮小可以明顯一點」 | ±3 % steps → chapter punches 1.00–1.11 |
| 「screen text有點重疊 / 刪除右上角@peerpath」 | pills measured (169 px), pitch 0.108, CTA captions off, watermark removed |
| "can use more variety of image, not only from pexel" | authored cards + motion b-roll + a still |
| "use LSE logo or something related to LSE" → the real logo | Houghton Street (CC0) + official logo on a plaque; licence and trademark flagged |
| 「還是沒有置中」 | badge: centre alignment, padding-y 0 |
| "use this format to export" (dialog: HEVC 10-bit HDR, QuickTime, match timeline, 30 fps) | MCP can't produce it → ProRes master + x265 |
| 「為什麼顏色好像不對 … 原片在 …antony-raw.mov … 我最後要hdr」 | the source was a conversion; swapped to the HLG original, neutral grade, voice from 24-bit PCM, HDR + SDR delivered |

**Delivered** (`~/PeerPath/output/`): `antony-reel-v8-HDR.mov` (HEVC Main 10 HLG, −14.9 LUFS),
`antony-reel-v8-SDR.mp4`, `antony-master-hdr.mov` (ProRes). **Open**: `~/Downloads/antony.mp4` is still a
byte copy of v7; the project depends on `~/Downloads/antony-raw.mov` staying put; the LSE logo's CC BY-SA
and trademark questions are the user's to decide; using the offer-letter letterhead awaits a yes.

## 4. What the three reels add up to

- The user decides by **looking and listening**; show frames and play excerpts, don't argue from numbers.
- They want the speaker, restraint and clarity: one accent, no duplication, nothing full-screen.
- They notice colour, overlap, off-centre by a few pixels, and sound that doesn't fit the bed.
- They iterate fast in short messages with screenshots: fix what they point at, then find its siblings.
