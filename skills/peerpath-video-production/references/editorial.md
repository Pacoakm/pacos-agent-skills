# Editorial — what goes on screen, when, and in what words

## Contents

1. The one test every on-screen word must pass
2. The beat grammar, with the two finished reels
3. Copy
4. Captions
5. Images
6. Density and breathers
7. The CTA
8. The colleague's notes — the team's taste
9. Writing the beat map

---

## 1. The one test

**On-screen text must do something the caption cannot.** Only five things qualify:

| Qualifies | Example | Why the caption can't |
|---|---|---|
| Structure | `TIP 02`, `01 / 03`, `TIP 2 OF 3` | a caption is transient; structure has to persist |
| A complete, scannable list | TEAMWORK & LEADERSHIP / VALUES OF A DOCTOR / WHY MEDICINE? / MEDICAL ETHICS | captions show 2–4 words; a list shows its whole shape |
| Brand | `PEERPATH MENTORS`, the logo badge | — |
| The CTA | `COMMENT "INTERVIEW"`, `FREE QUESTION PACK` | must stay readable with the sound off, to the last frame |
| A meaning-changing device | ~~A PERFECT SCRIPT~~, ~~GET IT PUBLISHED~~ | the strike says "wrong" — the voice doesn't |

Everything else is cut and the slot gets an image instead. On Alex this removed 22 of 30 text clips
after the user said 「畫面文字可以減少和字幕有重複的內容…很confuse」: "3RD YEAR · IMPERIAL", "KNOW THE
THEMES", "STAY UP TO DATE", "MEDICAL BREAKTHROUGHS", "NHS CHALLENGES", "PANEL INTERVIEWS", "DON'T
MEMORISE", "PRACTISE OUT LOUD", "FIRST-HAND EXPERIENCE", "OR SEND US A DM"… Each was the sentence
being spoken, retyped.

Two tests for a borderline line: **does it hold more than the caption at that moment** (a list does,
a phrase doesn't)? **Would a muted viewer lose something without it** (the CTA — yes)?

The "3" case is the same test from the other side: a lone numeral repeats "three things"; the three
tips as rows (`01 — KNOW THE THEMES` / `02 — CURRENT AFFAIRS` / `03 — DON'T SCRIPT IT`) tell the viewer
*which* three — 「caption says how many, screen says which three」.

---

## 2. The beat grammar

Antony (44 s, 1325 f) — the leanest complete example:

| Frames | Element |
|---|---|
| 4–115 | display `HOW DO YOU SHOW` / `PASSION IN YOUR` / `PERSONAL STATEMENT?` (cued 4/11/18), captions off |
| 126–200 | card: LSE logo on a plaque over Houghton Street (the credential) |
| 205–233 | `3` |
| 236–292 | chip `TIP 01` · badge `01 / 03` from here to f580 |
| 296–330 | struck `GET IT PUBLISHED` |
| 338–456 | card: authored "INDEPENDENT RESEARCH — NOT PUBLISHED / STILL COUNTS" |
| 466–566 | rows `WHY THIS TOPIC?` then `HOW FAR YOU WENT` |
| 580–657 | chip `TIP 02` |
| 663–706 | row `ANCHOR: ONE MOMENT` |
| 712–767 | card: authored personal statement with one sentence highlighted |
| 772–830 | chip `TIP 03` + struck `JUST LISTING WINS` |
| 836–890 | row `WHAT YOU LEARNED` |
| 896–958 | card: b-roll books |
| 990–1105 | card: b-roll campus (the empathy beat, tightest punch) |
| 1112–1190 | chip `PEERPATH MENTORS` |
| 1196–1325 | `COMMENT "FREE"` + `FREE CONSULTATION CALL` (1240) + `+ FOLLOW FOR MORE TIPS` (1278), captions off |

Alex (78 s) follows the same spine with a four-item theme list, a three-item "who to practise with"
list, the question → answer pivot, and the logo badge after `PEERPATH MENTORS`.

Every cue sits on a transcript word boundary. Deliberate caption-only breathers of 1–2 s between
sections are fine (Antony f200–236, f330–338, f958–990); a gap of 3 s or more is usually a lost
element (`timeline_audit.py` lists them).

---

## 3. Copy

- **Uppercase, British spelling, ≤ 22 characters a row** at 28–30 pt (≈ 26 in a condensed face).
  **Shorten the copy, not the type**: "CHALLENGES FACING THE NHS" → "NHS CHALLENGES", "FREE INTERVIEW
  QUESTION PACK" → "FREE QUESTION PACK". The caption carries the full wording.
- British forms: memorise, practise (verb) / practice (noun), organise, realise, prioritise, programme,
  centre, colour, enrolment. The captions come out of transcription in US spelling — fix them too.
- No emoji, no ✓ decorations. Numbers as numerals (`TIP 1 OF 3`, `01 / 03`).
- Name the speaker exactly as they spell it (Antony, not Anthony) — confirm before it goes on screen.

---

## 4. Captions

- Generate with `add_captions` (`maxWords 4`, `maxCharacters 26`), then read every clip
  (`get_timeline {captionDetail:true}`) against the audio. Local transcription got 11 of 57 Antony
  captions wrong — names, institutions and the CTA keyword are the usual casualties ("come in the
  word" for "comment the word" would break the CTA).
- Editing a caption's text clears its word timings, and `highlightPop` karaoke falls back to plain on
  that clip. Either correct everything and use `popIn` for the whole group (Antony), or accept that the
  corrected clips lose the highlight.
- **Suppress captions** where a display carries the same words (the hook) and under the CTA stack —
  delete those caption clips. Captions and the hook title speaking the same sentence at the same
  time was the worst duplication on Alex.
- Captions sit just under the chin, above the slot, and **do not move to make room** — graphics move.
  When the user asks for the subtitle lower (「subtitle 可以再放落少少」) and then says 「don't move
  the subtitle, change the screen text」, the subtitle stays where they asked and every graphic below
  it is re-gridded — never revert their move.
- They must be visibly different from on-screen text and no larger than it.

---

## 5. Images

**Topic-accurate.** Say what the voice is talking about, precisely:
- A **panel interview** is two interviewers facing one candidate; a one-on-one reads as mentoring.
  They were on each other's beats until the user asked 「換一張圖片，和interview/mentor相關」.
- An **LSE** line gets LSE — Houghton Street, the real logo — not a gothic building that reads as
  Oxbridge. Medicine stock never goes on a non-medicine reel.
- When a crop comes back empty (a blank wall, a blurred face), re-cut it before placing.

**Varied.** 「can use more variety of image, not only from pexel」. Mix at least three of:
1. **Authored cards** (`make_card.py doc`) — a document the speaker describes, drawn in the reel's
   palette: a personal statement with one sentence highlighted, a research abstract tagged
   NOT PUBLISHED / STILL COUNTS. Honest where stock has nothing to show.
2. **Institution imagery** — the real place (CC0 street photo) and the official mark on a plaque
   (`make_card.py plaque`), licence and trademark logged. The user asked for the real logo.
3. **Motion b-roll** cut to 3:2 (`make_card.py video`).
4. **Stock stills**, cut to 3:2.
5. **PeerPath's own material** — the logo badge; offer letters **only** with the user's explicit yes
   (see `assets-and-licensing.md`).

**Density.** Alex ended at 8–11 card placements in 78 s, Antony 5 in 44 s — roughly one every 7–9 s,
alternating with text beats. The first Antony cut had none (「要加入一些圖片，豐富一點，不要只有文字」).

---

## 6. Density and breathers

- One element in the slot at a time; a new one roughly every phrase.
- A beat shorter than ~1 s doesn't register (a 0.8 s flash card was dropped on Alex) — hold an element
  at least 1.2 s, a list until all rows have been up together ~0.5 s.
- Top labels only need a few seconds (「上面嗰舊嘢show 幾秒就ok」): 90 frames.
- Leave 1–2 s caption-only breathers between sections on purpose, and say so in the plan.

---

## 7. The CTA

- Accent chip `COMMENT "KEYWORD"` (the exact word the speaker says, in quotes) + the offer as a row
  (`FREE QUESTION PACK`, `FREE CONSULTATION CALL`) + optionally `+ FOLLOW FOR MORE TIPS`.
- On screen from the moment it's spoken **to the last frame** — the reel loops, and the colleague
  asked for at least 2 s of readable hold.
- Captions off underneath it; the ding (the payoff sound) on the offer, on its own track.
- Brand just before it: `PEERPATH MENTORS` chip, then the logo badge, while the speaker describes the
  network — the only place the brand appears (no watermark).

---

## 8. The colleague's notes — the team's taste

A colleague's notes on the first cut (2026-08-29) asked for an animated hook (fade, "ACE" zoom to 120 % with
a whoosh, typewriter, highlighter on MEDICAL SCHOOL, a ✓), a big "3" then ①②③, a checklist that turns
grey→blue→ticked per theme, a news-feed look for current affairs, a struck/shattered PERFECT SCRIPT,
THE MOST VALUABLE PREP? → PRACTISE WITH A MENTOR, a CTA that is the most eye-catching thing and holds
≥ 2 s, and caption grammar fixes ("med school interviews").

What survived: the question → answer pivot, rows cued as spoken, the strike, the ≥ 2 s CTA hold,
the caption fixes, British spelling. What didn't: emoji and ✓ everywhere, medical blue/green, news
headlines, shatter, five effects in 1.5 s. The team wants **restrained, speech-synced type with the
speaker as the focus** — 「每個效果保持簡潔，避免新聞畫面搶走人物焦點」.

---

## 9. Writing the beat map

In `<name>-reel-plan.md`, one row per element:

| Frames | Element | Copy | Slot y | Track | Sound |
|---|---|---|---|---|---|
| 236–292 | chip | `TIP 01` | 0.733 | Headline | switch-select −14 |

Take the frames from `get_transcript` words, not from seconds × 30 estimates. The beat map is the
source of truth: when the timeline and the map disagree, fix one of them before moving on.
