# Style system — the frame, the grid, the element kit

Everything here was measured on the Alex and Antony projects (`project.json`) and their exports.
Numbers are normalized canvas units on 1080×1920 unless marked px. y grows downward.

## Contents

1. The frame map
2. Measured sizes — what Palmier actually draws
3. The element kit (with style patches)
4. Two approved token sets
5. Designing a new token set
6. Legibility
7. Animation
8. Checklist before stacking anything

---

## 1. The frame map

```
y 0.000 ─────────────────────────── phone status bar / IG top gradient: keep y ≥ 0.03
y 0.062   progress badge `01 / 03`   (Antony: centre (0.19, 0.062), top-left of the frame)
y 0.230   TIP label over the hair    (Alex: `TIP 1 OF 3`, 34 pt, 3 s each — 「上面嗰舊嘢show幾秒就ok」)
          ── the face: nothing here, ever ──
y ≈ chin  CAPTION LINE — just under the chin, the anchor of the layout
          ── the slot: over the chest / hands ──
y 0.845 ─────────────────────────── FLOOR — Reels caption & UI below; the lowest drawn pixel
```

Measure the footage, don't copy numbers: the caption line and slot come from where *this* speaker's
chin and hands are.

| | Alex (after 1.15× push-in) | Antony |
|---|---|---|
| Head | y 0.16–0.60 | chin at 0.48 |
| Hands | enter below ~0.70 | move in 0.72–1.00 |
| Caption centre | 0.625 | 0.590 (band 0.569–0.615) |
| One element alone | 0.755 (card 0.762) | 0.733 |
| Two elements | — | 0.689 / 0.797 (38 px gap) |
| Three rows | 0.690 / 0.755 / 0.820 | — (three pills don't fit under a caption) |
| Four-row list | 0.685 / 0.731 / 0.777 / 0.823 on a panel | — |
| CTA stack, captions off | 0.690 / 0.755 | 0.594 / 0.696 / 0.798 (26–27 px gaps) |

**Three pills can't sit under a caption** on Antony: 3 × 0.088 = 0.264 of height against 0.2304 free
between the caption band and the floor. So the CTA suppresses its captions instead of shrinking type.

Earlier layouts, all rejected: the upper third only (0824, burned-in captions below); full-screen
cutaways (Alex v2, 「不要全屏」); a top band over the hair only (Alex v3 — worked, but the user then
asked for the reference reel's structure: graphics over the chest).

---

## 2. Measured sizes — what Palmier actually draws

**The auto-fit text box is much taller than the type**, and a pill (text with `background.enabled`)
**draws that whole box**. Measured on the Antony export — the `TIP 01` pill drew 180 px, exactly its box:

| Element | Font | Box height | Drawn |
|---|---|---|---|
| Row pill (pad 22/5) | AvenirNextCondensed-Heavy 30 pt | 0.0883 (169 px) | the whole box |
| Accent chip (pad 22/5) | 30 pt | 0.0938 (180 px) | the whole box |
| Badge (pad 14/0) | 26 pt | 0.0590 (113 px) | the whole box |
| Badge (pad 14/7) | 24 pt | 162 px tall, aspect 1.61 — read as a square | — |
| Display, plain, outline 4.5 | 54 pt | 0.1366 (262 px) | glyphs ≈ 71 px |
| Caption, plain, outline 4.5 | 46 pt | 0.1169 (224 px) | glyphs ≈ 60 px |
| 3-line display, plain | Helvetica-Bold 38 pt, lineSpacing 6 | 0.199 (382 px) | 3 × 51 px, pitch 93 px |
| Numeral | 210 pt | 0.3584 | — |

Rules of thumb (they are what `timeline_audit.py` uses):

- **Plain caps draw ≈ 1.34 × fontSize px tall**; mixed case ≈ 1.75 × (descenders).
- **Line pitch ≈ 2.1 × fontSize + 2.07 × lineSpacing px.**
- **Width per character**: AvenirNextCondensed-Heavy caps ≈ 1.08 px per pt (tracking 2–2.5);
  Helvetica-Bold caps ≈ 1.43 px per pt (tracking 2–3). So a row at 80 % of the width holds ≈ 26
  characters at 30 pt condensed, ≈ 22 at 28 pt Helvetica.
- **About 2.07 canvas px per point** on 1080×1920. The first Alex pass was sized as if 1 pt = 1 px
  and came out 1.78× too big.
- Stack pitch must be **at least the drawn box + a gap**. Antony's pills went 0.050 → 0.067 → 0.108
  pitch; the first two overlapped on screen and the 288×512 preview made it look like touching.

When in doubt, `capture_frame` at full resolution and measure the pill's pixel rows — that settles
it in one call. Then write the measured pitch into the plan.

---

## 3. The element kit

Style patches are what you pass as `style` to `add_texts` / `update_text` (Palmier stores
`outline` as `border`, `padding` as `paddingX/paddingY`, `strikethrough` as `isStruckThrough`).
Colours here are Antony's; swap in the reel's tokens.

**Display (hook, question, answer)** — plain, outlined, one line per clip so lines can cue on words
(Antony: 3 clips on Headline/Support/Footer at y 0.675/0.725/0.775, cued f4/11/18):
```json
{"fontName":"AvenirNextCondensed-Heavy","fontSize":54,"fontCase":"uppercase","tracking":2,"color":"#FFFFFF",
 "alignment":"center","outline":{"enabled":true,"color":"#0E0E12","width":4.5},
 "shadow":{"enabled":true,"color":"#000000","opacity":0.8,"blur":24,"offset":{"x":0,"y":7}}}
```

**Accent chip (TIP 01, PEERPATH MENTORS, COMMENT "FREE")**:
```json
{"fontName":"AvenirNextCondensed-Heavy","fontSize":30,"fontCase":"uppercase","tracking":3,"color":"#FFFFFF",
 "alignment":"center","background":{"enabled":true,"color":"#2E6BFF","opacity":1,"cornerRadius":10,
 "padding":{"x":22,"y":5}},"shadow":{"enabled":true,"color":"#000000","opacity":0.35,"blur":18,"offset":{"x":0,"y":6}}}
```

**Row pill (a phrase that is structure, not speech)**: as the chip but `tracking 2.5`, background
`#0E0E12` at opacity 0.88, `cornerRadius 8`, shadow 0.35 / 16 / y5.

**Struck myth** — the row with `"strikethrough": true` (`GET IT PUBLISHED`, `JUST LISTING WINS`,
`A PERFECT SCRIPT`), cued with the shutter. The one text device that changes meaning.

**Progress badge** — `01 / 03`, 26 pt, tracking 2, accent pill, `cornerRadius 8`, padding **14/0**,
**centre-aligned** at (0.19, 0.062), persisting across the tip. Padding-y 7 made it look square;
left alignment put the text 26 px off centre (「還是沒有置中」). Alternative (Alex final): one big
`TIP 1 OF 3` label at y 0.23 over the hair for ~3 s at the start of each tip.

**Big numeral** — 210 pt accent, outline 9 ink, shadow 0.5/30/y10, ≤ 1 s. Only as punctuation before
the items are named; alone it is 「don't write a 3 on screen only. Describe more」.

**List on a panel** (Alex) — plain white rows (28 pt, tracking 3, shadow 0.45/18) over a black PNG
at opacity 0.52, `edgeRounding` 0.12, on a track below the rows (`make_card.py panel`):
`900×368` for three rows (w 0.833, h 0.1917), `900×408` for four (h 0.2125 — it reached into the
caption: use the three-row panel and pitch 0.046). Rows build one at a time as spoken, each with a click.

**Image card** — 3:2 media cut by `make_card.py`, `transform {centerX 0.5, centerY <slot>, width 0.4444,
height 0.1667}`, `edgeRounding 0.06`, `fadeInFrames 4`, `fadeOutFrames 4`, linear. Keep aspect:
`height = width × (h/w) × 0.5625`.

**Logo badge** — square crop (`make_card.py badge`), shown square (w 0.3148, h 0.1771 = 340 px) with
`edgeRounding 1.0`: the black corners of the flattened logo vanish and a clean circle remains. The
logo stays navy/gold even when the reel's palette is not — a brand mark is not recoloured.

**Caption** (Antony):
```json
add_captions {"language":"en-US","maxWords":4,"maxCharacters":26,"animation":"popIn",
  "style":{"fontName":"AvenirNextCondensed-Heavy","fontSize":46,"fontCase":"uppercase","tracking":1.5,
           "color":"#FFFFFF","outline":{"enabled":true,"color":"#0E0E12","width":4.5},
           "shadow":{"enabled":true,"color":"#000000","opacity":0.85,"blur":20,"offset":{"x":0,"y":6}}},
  "transform":{"x":0.5,"y":0.59}}
```
Captions must look unlike the graphics (「區分不了字幕和畫面文字」 on 0824): different case or weight
or no plate, and **smaller than or equal to the display type** — a caption larger than the on-screen
text inverts the hierarchy.

---

## 4. Two approved token sets

Neither is a house default — build the next one for its footage. They show the level of restraint
that was approved.

**"Blue Condensed" — Antony (approved, delivered v8)**

| Token | Value |
|---|---|
| Type | `AvenirNextCondensed-Heavy`, uppercase, everything |
| Paper / ink / accent | `#FFFFFF` / `#0E0E12` / `#2E6BFF` |
| Caption | 46 pt, tracking 1.5, outline 4.5, shadow 0.85/20/y6, `popIn`, y 0.590 |
| Display | 54 pt, tracking 2, outline 4.5, shadow 0.8/24/y7 |
| Chip | 30 pt, tracking 3, accent pill r10, pad 22/5 |
| Row | 30 pt, tracking 2.5, ink pill 88 % r8, pad 22/5 |
| Badge | 26 pt, accent pill r8, pad 14/0, centre-aligned, (0.19, 0.062) |

**"Amber Helvetica" — Alex (final)**

| Token | Value |
|---|---|
| Type | `Helvetica-Bold`, uppercase |
| Paper / ink / accent | `#FFFFFF` / `#0B0B0D` / `#F5C85C` (warm amber) |
| Caption | 42 pt white, no plate, shadow 0.75/22, `highlightPop` with the amber on the active word, y 0.625 |
| TIP label | 34 pt ink on amber pill r10, pad 22/4, y 0.23, 90 frames |
| Chip | 26 pt ink on amber pill r8, pad 18/2 |
| Rows | 28 pt white, tracking 3, shadow 0.45/18, `slideUp`, on the 52 % panel |
| Display | 36–40 pt white, outline 2 ink, shadow 0.8/24, `popIn`; the answer display in amber |

**Retired and why**: navy/cream/gold/burgundy + Georgia (the website's palette — 「不要follow
peerpath網站的主題」); acid lime `#D3F84B` (「那個青色，現在好醜」 — a cool green against warm skin and a
burgundy-striped shirt); multi-colour chips from the reference reel (the user kept one accent);
colour emoji and ✓ everywhere (the colleague's notes asked for them; they read as clutter).

---

## 5. Designing a new token set

1. Look at the footage: skin tone, wardrobe, wall. Pick the accent against *those* — warm skin and a
   warm room took blue; a black studio wall and a navy-burgundy shirt took amber.
2. Paper white, ink near-black (not pure black), **one** accent. The accent marks structure (chips,
   badge, numeral, CTA, the caption's active word) and nothing else — under 5 % of the pixels.
3. One heavy sans. Condensed faces fit more per row. Installed and working in Palmier:
   `AvenirNextCondensed-Heavy`, `AvenirNextCondensed-Bold`, `Helvetica-Bold`, `HelveticaNeue-Bold`,
   `Futura-Bold`, `Futura-CondensedExtraBold`, `DINCondensed-Bold` (`fc-list : postscriptname`).
4. Offer 3–5 swatches on a real frame when the colour is the question — the amber was chosen from a
   five-swatch sheet (amber / coral `#FF8A6B` / mint `#9FE8C4` / bone `#F0EAD6` / current).
5. Write the tokens into the plan before building, then build the three style frames.

---

## 6. Legibility

- Plain white type over hands and a striped shirt read as noise at 24 pt with a shadow only
  (「list rows too faint」). Fixes in order of preference: a translucent panel behind the list;
  a 2–4.5 pt ink outline on plain display text; a stronger shadow (0.85–0.9 / 24–26 px).
- A 3 pt outline on stacked list rows looked crude (「好粗糙」) — the panel replaced it.
- Over HLG footage the graphics sit near reference white (Y ≈ 726/1023): don't push text colour past
  `#FFFFFF` or add glow.

---

## 7. Animation

| Preset | Use | Notes |
|---|---|---|
| `popIn` | chips, pills, displays, captions (Antony) | default; frames 0–7 of it look broken in a still — inspect ≥ 8 f in |
| `slideUp` | list rows (Alex) | |
| `highlightPop` | captions with an accent on the active word | lost on any caption whose text you edit |
| `wordReveal` | a two-word line that should build | replaced `typewriter` |
| `typewriter` | **never on a pill** | the plate draws full-width at once and the letters type left-aligned inside it (「打字機文字動畫有點奇怪」) |

Stagger a multi-line display by starting each line's clip on its word (4 / 11 / 18). Never animate
five things at once — the colleague's hook asked for fade + 120 % zoom + typewriter + highlight + ✓ in
1.5 s; the restrained version (lines pop on their words) is what shipped.

---

## 8. Checklist before stacking anything

- [ ] One pill measured on a full-resolution capture; pitch = drawn box + ≥ 20 px gap
- [ ] Every drawn edge between the caption band and y 0.845
- [ ] Pills centre-aligned; rows ≤ 22–26 characters (shorten the copy, never the type)
- [ ] Captions smaller than or equal to the display type, and styled differently from the graphics
- [ ] The slot holds one thing at a time
