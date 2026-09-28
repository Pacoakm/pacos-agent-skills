# On-screen language

Two rules, in this order.

1. **Say it in mathematics and motion if it can be said that way.** Reach for words only for what
   genuinely cannot be.
2. **One register per frame.** A frame may speak mathematics, or it may speak words. Never both
   at once. The figure belongs to neither — it accompanies whichever register is speaking.

## Why

**On rule 1.** A concept that has a mathematical form and is written out as a sentence instead
has been translated *away* from the thing the notes actually say. The lecture notes are in English
and in symbols: after watching an explanation carried by `\det(AB) = \det A \cdot \det B`, with
both unit squares scaling on screen, I open the slides and read that line fluently; after watching
`determinants multiply`, I have met a paraphrase the notes never print. Motion is the second half
of this — a property that holds under variation is *shown by varying it*, which no slide can do
and no sentence needs to claim.

**On rule 2.** Mathematics and prose are read differently — one is scanned as structure, the
other as a line. Putting both on one frame forces a switch of modes mid-shot, and neither gets read
properly. This is the defect that reads as 「混雜」: an equation and a prose sentence sharing a
margin, each spoiling the other.

Note what rule 2 does **not** say. It does not ban text beside a figure — a list of steps
alongside the diagram those steps act on is good teaching, and better than either alone. What it
bans is text beside *displayed mathematics*.

## The two registers

| | **Mathematical register** | **Verbal register** |
|---|---|---|
| Carries | definitions, equations, derivations, bounds, **pseudo-code** | an enumerated list of steps, conditions or cases |
| Figure | yes — the figure the mathematics describes | yes — the figure the steps act on |
| Also allowed | figure labels, term cards, justifications | figure labels, term cards, inline symbols (`⊥`, `∈`, `A_{ij}`) |
| Never | an explanatory sentence | a displayed equation |
| Budget | non-mathematical text: as few words as the idea needs, no fixed cap | ≤ 5 items, each ≤ 8 words and one line |

Both registers are welcome in the same *video* — most knowledge points need both. They just take
separate shots. When a beat needs the list and the equation, that is two shots, and the figure
carries across between them.

### Pseudo-code is mathematics

Pseudo-code is a formal object, like an equation, so it lives in the mathematical register and
shares no frame with an explanatory sentence. It appears **verbatim from the notes** — same
keywords, same indexing, same variable names — beside the state it acts on (`lesson-patterns.md`,
pattern 8), and it is never on screen with nothing running: **the executing line is highlighted
at the instant its step happens on the state**, in the same `play()`. Code on a frame with nothing
moving is a slide.

## The picture is in English, in the lecture's notation

**Every string on the frame is English, and it is the English the notes use.** Title, figure
label, term card, list item, justification, problem statement, recap page — all of it. The
**caption track is the only place 中文 appears**: 繁體中文書面語 on top, English underneath.

| | |
|---|---|
| **The picture** | English only, in the notes' notation. `title()`, `body()`, `label()`, `term()`, `section_tag()` and `question_text()` **raise** on a CJK character |
| **The caption track** | bilingual, 中文 first — `caption_text()`, `build_captions.py`, `subtitles.srt`. See `narration-and-subtitles.md` |
| **The narration** | **none by default** — the captions carry the explanation. A voice track only on request, speaking the 中文 line |

Three reasons, in order of weight:

1. **The notes and the course are in English, and the video has to map straight back onto
   them.** The point of watching is that afterwards I can open the slides and read them. The words
   on the frame are the words I will meet there — and in the tutorial sheets, the homework and the
   next lecture. A Chinese gloss beside a term teaches a word the notes never show me, and leaves
   the English one I actually have to read unpractised.
2. **In the notes' notation, exactly.** A term is met in the form the notes write it: `eigenvector`,
   not 「特徵向量」; and a symbol in the notes' convention — `\mathbf{v}` if the lecture bolds,
   `\vec{v}` if it arrows, indices from 0 or 1 as the notes count, `\log` in the notes' base. A frame
   in a different convention is a second notation to translate back from (rule 40). If another
   convention is genuinely clearer, show the notes' form first and map it on screen.
3. **Two scripts in one frame is the register problem again.** Chinese and Latin are read
   differently and set in different faces, so a mixed frame makes the eye switch twice — the same
   defect as mixing an equation with a sentence, in different clothes.

This does **not** remove anything from the explanation. Everything that would have been a 中文
line on the frame still gets said — on the caption line, in 中文 and in English. It just leaves the
picture.

## What may appear on the frame

| Kind | Allowed | Example |
|---|---|---|
| **The section tag** | one per shot, top-left, the same on every shot of the knowledge point — see below | `Signed Area` |
| **The figure** | in either register | the unit square and its image under `A` |
| **Mathematics** | unlimited — in the mathematical register | `A\mathbf{v} = \lambda\mathbf{v}`, `\lvert a_n - L \rvert < \varepsilon` |
| **Pseudo-code** | the notes' own, verbatim, with the executing line highlighted | `if A[j] ≤ x then i ← i + 1` |
| **Figure labels** | point names, vector names, node names, indices | `\mathbf{v}_1`, `u`, `A[3]`, `P` |
| **Term cards** | the lecture's English term alone, **bold**, bound to a colour | `eigenvector`, `loop invariant` |
| **Justifications** | the theorem, lemma or definition the notes cite, named as the notes name it, with the step it justifies | `(Lemma 4.2)`, `(def. of span)`, `(Cauchy–Schwarz)` |
| **A step list** | in the verbal register, with or without a figure | `① Find the eigenvalues of A.` |
| **A problem statement** | in full, in English, on every shot of a worked problem from the notes — see below | `Let $A$ be a $2 \times 2$ real matrix.` |
| **A recap page** | optional — every step of a long computation at once, on its closing shot — see below | `\mathbb{E}[X] = \sum_x x\,p(x)` … `= 3.5` |
| **Loose explanatory prose** | **never, in either register** | ~~the vector stays on its own line~~, ~~永遠在方格內~~ |

A term card is the term and nothing else. `eigenvector` is a term card;
`a vector that only gets stretched` is a sentence wearing a term as a hat, and it goes to the
caption. It is set **bold** — see "A concept term is bold" below.

"Loose prose" means a sentence that is not an item in an enumerated list. The list earns its place
because its *structure* teaches — see below. A stray sentence has no structure to earn it.

## The section tag

**Every video says which knowledge point it is on, in the top-left of every shot that is not a
card.** There is no duration limit, so a video can hold many knowledge points; one figure usually
carries across several of them; and I will come back to a video next week and jump to one chapter.
A viewer who looks up mid-shot — or lands mid-video from a chapter marker — has nothing on the
frame telling them where they are without it. The captions cannot answer it either: a caption is
linear and transient, and by the time I wonder, the cue that would have told me is three cues back.

It is **furniture, not content**: `MUTED`, one size above the problem statement, added rather than
animated, never referred to by the captions, and identical on every shot of its section.

| | |
|---|---|
| It says | the knowledge point, in the lecture's English — `Signed Area`, `Eigenvectors`, `Partition Invariant`, `Momentum` |
| Length | ≤ 4 words and ≤ 32 characters. `Determinant as Signed Area Scale Factor` → `Signed Area` |
| Never | a sentence, a trailing stop, a 中文 gloss, a tease (`The Trick`), or the shot's job rather than the concept (`Example 2`) |
| Budget | **exempt**, like the problem statement — it is one string held across a whole section, not this shot's words |
| Changes | only where the knowledge point changes — which is also where the Palmier chapter marker goes |

**The tag arrives with the term, never ahead of it.** Rule 31 opens every knowledge point on a
concrete case and lets the technical word land last, and contract invariant 19 says the term
appears nowhere earlier — *including in a section title*. So a section's tag lands on the shot
where its term does (`termFirstShot`); the opening shots before it keep the previous section's tag,
or carry none (`"sectionTitle": null`) if the video has not reached a named section yet. Teaching
eigenvectors, the shots where a matrix knocks a fan of vectors off their lines carry no
`Eigenvectors` tag — that would name the thing the opening exists to make me see first.

Build it with `Stage.section_tag()`, and call it before `Stage.question()`. See `brand-theme.md`,
"The section tag".

## The problem band

**A worked problem from the notes carries its statement, in full, in the source's English, for as
long as the example runs.** This applies when an example *is* a stated problem — from the lecture
notes, a tutorial sheet, a homework — and it is the one exemption from both rules above. It is not
a loophole in them: the banned prose is *your explanation* of the mathematics, and the statement is
the **object being studied**. It is also the text I will find again in the notes, so reading it
here in the notes' words is part of mapping the video back onto them.

A solution shown beside a statement I cannot see is a mechanism with no problem attached — every
line can be followed and I still would not know what was being asked.

| | |
|---|---|
| **Stem** | the statement as the source prints it. On **every** shot of the example, top of the frame, `MUTED`, left-aligned and ragged-right like the notes |
| **Part** | only the part being answered in this shot — `(b) Show that $A$ is diagonalisable.` — under the stem, in `INK`, one step larger |
| **Changes between shots** | the part, and only the part. The stem is the same mobject, wrapped the same way, in the same place |
| **Never** | a part whose stem is missing; a 中文 translation of either; a stem shrunk to fit; referent colour inside the stem |

The stem stays `MUTED` and un-coloured on purpose. It is reference text read once, and the pens
are needed by the figure and the derivation — a stem in eight colours would spend the palette on
the part of the frame that needs it least.

Not every example is a stated problem. A concrete, varied, broken or connected example that the
video builds itself (`lesson-patterns.md`, pattern 6) has no stem and takes no band.

### It is exempt from the budget, and from nothing else

The stem does not count against the non-mathematical concision budget, and it may sit over a
`math` shot or a `verbal` one. Everything else still applies inside the content area: no loose
explanatory prose of your own, no sentence that a mark on the figure could have made, one
register below the band.

### Build it with `Stage.question()`

```python
st = self.setup_stage()
q = st.question(STEM, r"(b) Show that $A$ is diagonalisable.")   # BEFORE figure_box()
fc, fw, fh = st.figure_box()          # now laid out UNDER the statement
```

`Stage.question()` reserves the band by moving `content_top` down, so the figure and the
derivation land under the statement instead of behind it. Call it before any region is asked for.
The strings are LaTeX — inline mathematics in `$...$`, so `$A$` and `$\lambda_1 \neq \lambda_2$`
set exactly as the notes print them.

It **raises** if the stem plus the part would take more than about five lines. That error is a
design instruction, and there are exactly two legitimate answers:

1. Quote only the sentences this part actually needs — a stem with three paragraphs of setup and
   a part that uses one of them should carry that one.
2. Split the part across two shots.

Shrinking the type is not one of them. A statement set below reading size is a statement that is
not on the frame.

Because the stem is on every shot of the example, build it from a **shared helper the scenes
import**, never re-typed per scene: a stem that re-wraps or shifts by a few pixels between two
shots is a jump cut on the most static thing in the frame (contract invariant 10).

### Splitting a part across two screens

Two things may force a split: the problem band is too tall, or the derivation is longer than the
panel holds. Both are handled the same way, and neither is handled by shrinking anything.

| | |
|---|---|
| Carries across | the stem, the figure with every mark it had earned, the part line |
| The second screen opens with | the last line of the first — so nothing has to be remembered across the cut |
| Never | a cut that drops a mark the next screen's first line refers to |
| Check it | at Gate 3, at exact frame indices — the end state of one and the start state of the next |

### The solution moves against the statement

The point of putting the statement up is lost if the working beside it is a finished block of
algebra. Every step lands on its own beat, with its figure event, in one `play()` (rule 18), and
a step that names a quantity draws that quantity onto the figure at the same instant. A screen of
steps that could have been printed on a slide has failed the slide test below — the problem band
does not exempt it.

The frame is two halves and they are wired together:

| Side | Carries | Moves |
|---|---|---|
| **Figure side** | the graph, the diagram, the axes, the data structure's state — whatever the problem is about | the mark this step produces: a vector drawn, a point plotted, a curve redrawn as a parameter changes, an array cell swapped |
| **Derivation side** | the lines of the working | one line per beat, entering at `T_REVEAL` |
| **Between them** | referent colour | the quantity named on the right takes its colour on the left **in the same instant** — `mtex_ref()` for the symbols, `bind_term()` for the pulse |

Spend animation here rather than anywhere else. A parameter that visibly moves the curve, a value
that arrives on the formula from the point it was measured at, a substitution that lands in the
slot its symbol occupied — these are the beats where a video beats the notes, and they cost nothing
but sequencing. What they must not become is decoration: every motion is a step of the working,
and colour still names a referent, never emphasis.

### A computation opens on the general form, not on the numbers

**The first line of a computation carries no data from the example.**

```
𝔼[X] = Σ x·p(x)                         ← the definition, as the notes write it
𝔼[X] = 1·(1/6) + 2·(1/6) + … + 6·(1/6)  ← the example's numbers — and now which slot each fills is visible
     = 3.5                              ← the result
```

A computation that opens on `1·(1/6) + 2·(1/6) + …` computes this case and no other. I watch
numbers land in slots with no way to see which slot is which, so nothing transfers to the next
case, and the general line — the one the notes print, and the one that transfers — never appears
at all. `derivation()` takes the general form as its **required first argument** so the rule is
hard to skip:

```python
d = sq.derivation(r"\mathbb{E}[X] = \sum_x x\,p(x)",
                  r"\mathbb{E}[X] = 1\cdot\tfrac16 + 2\cdot\tfrac16 + \cdots + 6\cdot\tfrac16",
                  r"= 3.5",
                  reason=r"\text{(def. of expectation)}")
self.play(Write(d[0]))                      # the general form, alone, on its own beat
self.play(Write(d[1]), Create(bars))        # the numbers, with the figure event
```

Give the general line its own beat. It is the line that transfers, and dropping it in silently
under the substitution wastes it. The rule holds for every formula the working reaches for later,
not only the opening one — a fraction pulled out of the air with the numbers already inside it is
the same defect three lines down. `T(n) = 2T(n/2) + n` before `T(8) = 2T(4) + 8`. See rule 27.

### A long computation may close on a recap page

**Optional.** When a computation is long enough that I would want to pause on the whole of it, its
last shot may be a **still frame carrying every step at once**: general form, substitution,
result, each justification under the line it justifies, every `=` hung under the one above it.

This is not a closing ritual and no example is required to have one (contract invariant 16). It
earns its place for one reason: the animated working never exists as a whole, because by the last
step the first line left the frame half a minute ago. The page is the only frame on which the
working is an object I can read top to bottom — and pause on. A short computation does not need it.

```python
page = sq.solution_page(st, [
    (r"\mathbb{E}[X] = \sum_x x\,p(x)", r"\text{(def. of expectation)}"),
    r"\mathbb{E}[X] = 1\cdot\tfrac16 + 2\cdot\tfrac16 + \cdots + 6\cdot\tfrac16",
    r"= 3.5",
])
self.play(FadeIn(page, shift=UP * 0.2))
self.wait(sq.REST_RECAP)          # 4.0 s, and nothing moves on it
```

| | |
|---|---|
| **Holds** | ≥ `REST_RECAP` (4.0 s) — it is read top to bottom, not glanced at |
| **Carries** | every line that carries the argument, its justifications, and the result marked as the result |
| **Keeps** | the problem band, if the example has one, so the page is readable against what was asked |
| **May drop** | the figure, if the steps need the width — by this shot the figure has done its work |
| **Never** | animates; shrinks to fit; or omits the general form it opened on |

`solution_page()` **raises** rather than scaling. Two legitimate answers, same as the problem
band: keep the lines that carry the argument and drop the routine algebra in between, or — if the
part was already split across two screens — give each half its own page.

## The budget

Per shot, counting only text on the picture — not captions, not the problem band, and not the
section tag.

Everything counted here is English — the picture carries no 中文 at all (above).

**Mathematical register:**

```
explanatory prose                         = 0 words
non-mathematical text                     = as few words as the idea needs, no fixed cap
  (title + labels + term cards)
mathematics, pseudo-code, justifications  = uncounted
```

**Verbal register:**

```
list items          ≤ 5, each ≤ 8 words and ONE line
displayed equations = 0
inline symbols (⊥ ∈ A_ij 2:1) uncounted, and encouraged
```

`body()` measures the line it builds and **raises** if it is wider than the frame, because an
`\mbox`-protected line cannot wrap — it just runs off the edge. That error means two items, or
fewer words, never smaller type.

If a shot in the mathematical register needs a sentence to make sense, the sentence goes to the
caption and the **frame needs a better picture**, not smaller type.

Count it in the storyboard, before anything is animated.

## The verbal register: a step list, with the figure beside it

An **enumerated procedure** is the one thing captions genuinely cannot carry. A caption is linear
and transient: by the time I read step ③ the words of step ① are gone, so I never see the *shape*
of the procedure — how many steps there are, which one I am in, what is still coming. A list
persists and shows all of that at once.

**Keep the figure.** A list of steps next to the figure those steps act on is better than either
alone: I read `Find the eigenvalues of A` and the two invariant lines light up on the grid at the
same moment. That pairing is the point of the register, not a compromise.

What the list may **not** share the frame with is a displayed equation. If the beat needs both,
it is two shots, and the figure carries across.

### Rules for a list shot

| | |
|---|---|
| Items | ≤ 5. Beyond that it is a reference card, not a teaching beat |
| Each item | English, ≤ 8 words, one line, no sub-clauses — `body()` raises on a line too wide to fit |
| Inline symbols | encouraged — `⊥`, `∈`, `A`, `λ`, `2 : 1`. A symbol inside an item is not a displayed formula. Type the Unicode character; the theme translates it to TeX (`brand-theme.md`) |
| Displayed mathematics | **none** — if the shot needs an equation, split the shot |
| Figure | **yes**, and it should react — see below |
| Entrance | items appear **one at a time**, each on the caption cue that explains it (rule 18) |
| After | cut to the figure alone and *carry out* the steps. The list is the map; the figure is the territory |

### Animate the list against the figure

Revealing items one at a time is what makes a list teaching rather than a wall of text: I never
read ahead of the explanation, and the item arriving is the item the caption is explaining.

Better still, **make each item do something to the figure as it lands** — that is what turns two
static halves into one explanation:

| As this item appears | The figure does |
|---|---|
| ① Find the eigenvalues of A. | the two invariant lines light up, each in its own pen, with its stretch factor |
| ② Pick an eigenvector on each line. | one vector draws in on each line, in that line's pen |
| ③ Use them as the new basis. | the grid redraws along the two vectors, and `A` becomes a pure stretch |

Short because they are English, and English is wider per idea than 中文 — which is a feature: an
item that will not fit in eight words is usually two steps, or caption.

Colour is the join: give the item and the thing it names the same colour, exactly as `bind_term()`
does for a single term. Keep the completed list on screen to the end of the shot, and dim earlier
items to 30% so the current one reads.

### When it is not a list

Do not reach for a list to escape the prose ban. Two checks:

1. **Is it genuinely ordered or enumerated?** ①②③ that must happen in sequence, or a fixed set of
   conditions or cases — not three loose remarks with numbers stuck on them.
2. **Would losing the order lose the meaning?** If the items could be said in any order, they are
   prose, and they belong in the captions.

And before writing any of it, apply rule 1: *could this item be a mark on the figure instead of a
sentence?* `These two lengths are equal` is tick marks, not a list item, even inside a list.

## Translating prose into mathematics and motion

This is the actual work. Each of these replaces a sentence with something the frame can show.

The sentences below are the ones you were about to set on the picture. They are barred twice
over — as prose, and, if you were going to write them in 中文, as Chinese on the frame. Each one
still **appears on the caption line**, in 中文 and in English. It just leaves the picture, and what
replaces it teaches better.

| Instead of the sentence | Put on the frame |
|---|---|
| "This vector stays on its own line." | the vector, its line dashed in the same pen, and `A\mathbf{v} = 3\mathbf{v}` |
| "These two lengths are equal." | equal-length tick marks — `ticks()` |
| "This vector is an eigenvector." | the vector in its pen + a bold `eigenvector` term card in that pen, bound by `bind_term()` |
| "These two angles are equal." | the same arc marker and the same colour on both angles |
| "For every ε we can find an N." | animate it — shrink the ε-band and let `N` jump right to keep the tail inside |
| "Because the matrix is symmetric." | the justification the notes cite: `(spectral theorem)` or `(Thm 7.3)` |
| "The area becomes three times as large." | `\det A = 3` beside the parallelogram, as the area animates |
| "Everything left of the pivot is smaller." | the `≤ x` region of the array shaded one pen, the `> x` region another, maintained at every swap |
| "The total momentum does not change." | a `p_1 + p_2` readout that stays still while `p_1` and `p_2` visibly trade |
| "As x increases…" | an arrow on the axis, or a `ValueTracker` readout I watch move |

Note the fifth row. **A property that holds under variation is stated by varying it**, not by
asserting it in words. That is what animation is for, and it is the one thing a static slide
cannot do.

## The slide test

Before a shot is approved, ask:

> **If I froze this frame and printed it in black and white, would it just be the lecture slide?**

If yes, the shot has no reason to be a video. A slide is static, near-monochrome and symbol-only;
I already have it. Everything a video can add — time, colour, motion — is exactly what turns a
chain of symbols into an explanation.

The failure looks like this: the frame shows
`\operatorname{proj}_{\mathbf{u}}\mathbf{v} = \frac{\mathbf{v}\cdot\mathbf{u}}{\mathbf{u}\cdot\mathbf{u}}\mathbf{u}`,
all in one ink, and the figure sits alongside with two unlabelled arrows. To follow it I must hold
`\mathbf{u}` in memory, scan the figure, find which arrow it is, come back, and repeat for every
symbol in the line. That is not reading mathematics — that is a lookup exercise, and it is the
reason a correct, complete, well-typeset frame can still teach nothing.

## Colour is reference, not decoration

**A colour names a thing.** Every occurrence of that thing — on the figure, in every formula, in
every later line of the derivation — wears the same colour, so it is located instead of searched
for.

| | |
|---|---|
| `\mathbf{u}` blue in the formula **and** the arrow `\mathbf{u}` drawn blue in the figure | ✅ the symbol is findable |
| `\operatorname{proj}_{\mathbf{u}}\mathbf{v}` in green because it is the result | ❌ green says "this line is the result", which its position already says. It does nothing to help find the projection on the figure |
| The whole derivation in one ink | ❌ every symbol costs a lookup |

That second row is the trap worth naming: **colour spent on emphasis is colour that can no longer
carry reference.** If a colour does not help the viewer locate or distinguish a thing, it is
noise, and it also burns one of the few hues the frame has.

### How referent colour and the semantic palette fit together

The five inks in `brand-theme.md` are roles — `GIVEN`, `UNKNOWN`, `RESULT`, `WARN`, `AUX`. Roles
and referents mostly coincide: assign the referent the ink of its role and one assignment carries
both meanings.

They stop coinciding as soon as two referents share a role, which is the common case — a problem
usually gives you three things, not one. The rule then is:

1. **The unknown always takes `UNKNOWN` orange.** That convention is worth more than any other,
   because it holds across the whole series: after three videos of a course I know before being
   told which thing is being solved for.
2. **Everything else takes the remaining inks in `REF_SERIES` order, one per referent** — they are
   simply distinct pens at that point, not role claims.
3. **Role beyond "unknown" is shown by position**, not colour: the givens are the things already
   drawn on the figure when the shot opens; the result is the last line.

So in a projection shot with `\mathbf{u}`, `\mathbf{v}` and the angle `\theta` given and
`\operatorname{proj}_{\mathbf{u}}\mathbf{v}` to find: the projection is orange, and `\mathbf{u}`,
`\mathbf{v}`, `\theta` take blue, violet and green — three givens, three pens, all four findable.

`REF_SERIES` is the hand-out order, and it runs to **eight**: the five semantic inks, then
`REF_LIME`, `REF_FUCHSIA`, `REF_CYAN`. A figure with many parts needs many pens, so take as many as
the figure has parts — do not force parts to share a colour to stay inside five.

The three extras were chosen by hue gap rather than by eye: the semantic five sit at 17.5°,
162.9°, 224.3°, 263.4° and 345.3°, and these land in the middle of the three widest gaps, keeping
a minimum separation of 30° across all eight. Contrast measured against the page: 4.86:1, 6.16:1,
5.22:1. Colours rejected for sitting too close to one already in the series: amber-700 (8° from
orange), pink-700 (10° from rose), teal-700 (12° from emerald), sky-700 (23° from blue).

Past about eight it is the figure that is overloaded rather than the palette. If a figure
genuinely names more parts than that, reuse a pen on the part that is **furthest away on the
figure**, and give the two different arc radii, dash patterns or tick counts as well so shape
backs colour up.

The assignments are per course, not per video: record them in `brief.md` and reuse them in the
next video of the same course (rule 6). A vector that was blue in Lecture 5 is blue in Lecture 7.

### Spend the pens on what has to be found, and share where a numeral distinguishes

The failure is not running out of pens — it is **leaving them idle while the frame stays grey**. A
first pass at one geometry video in the build this skill inherits put all eight pens on sides and
special quantities and left every *angle* MUTED grey and the reference line white. The result:
correct, complete, and almost entirely achromatic, so nearly every symbol cost a lookup. The
reviewer's words were 「太多白色，填色不夠，閱讀困難」.

Two moves free pens without breaking rule 6:

- **Two givens whose numerals differ can share one pen.** `60` and `40` are self-distinguishing —
  the pen only has to link each to its part, and no formula can confuse them. That freed a pen for
  the reference line the whole figure was measured from, which had been neutral.
- **Derived quantities take the pen of the construction that produced them.** The diagonal PR is
  violet, and the angles PR carves out of the figure — 95°, 25°, 88.7° — are violet too. One
  referent class, one pen, and it is visible at a glance which marks the construction created.
  The same holds off geometry: the entries a row operation changes take that operation's pen.

The givens then take a single "the problem states this" pen and stop competing for individual
ones. Count the achromatic symbols on a finished panel: if the figure is mostly white and grey,
the pens are in the wrong places.

### Colour applies with no figure at all

A formula-only frame still needs it. In a 3×3 determinant expansion, every `a_{1}b_{2}c_{3}` term
carries the colour of the column each factor came from, so the pattern of the expansion is seen
rather than a row of subscripts. Use `mtex_ref()`:

```python
REFS = {r"\mathbf{u}": GIVEN, r"\mathbf{v}": AUX, r"\operatorname{proj}_{\mathbf{u}}": UNKNOWN}
mtex_ref(r"\operatorname{proj}_{\mathbf{u}}\mathbf{v} = "
         r"\frac{\mathbf{v}\cdot\mathbf{u}}{\mathbf{u}\cdot\mathbf{u}}\,\mathbf{u}", REFS)
```

Never leave a multi-part expression in a single ink.

## Every symbol must be findable in the figure

Colour makes the link visible; **animation makes it unmissable.** When a symbol first appears,
the thing it names moves at the same instant:

```python
self.play(Write(line), *bind_term(arrow_u, line[idx_of_u]))
```

`bind_term()` is not only for term cards — it binds any two mobjects that are the same thing.
Use it whenever a symbol enters, and again whenever the derivation returns to it after a gap.

### Label onto the figure, not beside it

The viewer should **never have to look left and right**. Everything the derivation names lives on
the figure:

- every angle it names, drawn as an arc in that angle's colour
- every length, force or weight it names, written **on** its segment, arrow or edge in that
  object's colour — `mg`, `12`, not only a letter somewhere else
- every constructed point or vector, with its own label
- every index the pseudo-code uses, under its array cell (`i`, `j`, `p`, `r`, as the notes name them)
- equal parts marked with `ticks()`, right angles with a right-angle mark

Then a line like `N = mg\cos 30°` can be read straight off a free-body diagram, because `mg`, `N`
and `30°` are all visible on the figure in the same colours. The formula stops being a separate
document to cross-reference and becomes a caption to what I am already looking at.

If the figure is too crowded to hold all of it, that is the density budget talking (`pacing.md`,
≤ 6 blocks): show the part of the figure the step actually uses, or split the step.

### An angle arc is only readable if both its arms are drawn

An arc names the angle between two rays. If one of those rays is not a visible mobject at that
moment, the arc floats against the background and names nothing — the viewer cannot tell which
angle it is, and neither can you when you review the frame.

This bites whenever the angle's arm is a **construction line rather than an edge of the figure**:

| The angle | Its arms | The trap |
|---|---|---|
| `∠PRQ = 55°` | RP and RQ | RP is the *diagonal*, not a side of the quadrilateral |
| `∠QPR = 95°` | PQ and PR | same diagonal |
| `\theta` of an incline | the slope and the horizontal | the horizontal is not part of the block-and-slope drawing |
| `\theta` between `\mathbf{u}` and `\mathbf{v}` | both vectors | one vector drawn from a different tail |

So the construction line has to be on screen **before or with** the first arc that uses it, even
if its own derivation beat comes later. Draw it thin in its own pen at the earlier beat and thicken
it when the derivation reaches it — the line is then a given carrier first and a result second.

**Check at the storyboard:** for every arc on the panel, name the two mobjects that are its arms
and confirm both are visible in that same panel. It is a five-second check that caught three
floating arcs in one video.

### A quantity the derivation names must be on the figure at that moment

`PN = 60 \sin 30° = 30` cannot be read off a figure that shows neither `60` nor `30°`. When a shot
moves to a new camera and drops the labels to reduce clutter, the labels the *current* line needs
have to come back. Check each derivation line against its own frame: every number in the line
should be findable in the picture beside it.

Related: **name the object the figure has, not a symbol you invented.** `h = 30 \sin 32°` makes
the viewer hunt for `h`; `PP' = 30 \sin 32°` points at two labelled points on the diagram. Use the
name the notes use for it — if the notes call it `h` and draw it, draw and label `h`.

### But mark it when the derivation reaches it, not before

**Only the givens are on the figure at the start.** Everything the derivation *produces* appears
on the figure at the moment its line appears in the derivation — never earlier.

If `\lambda_1 = 4` is step ②, then the first invariant line lights and is labelled `4` **as that
line lands on the right**. Not at step ①, and not in the opening state of the scene.

| | |
|---|---|
| **Given** — stated by the notes or the problem, or built by an earlier shot | on the figure from the start |
| **Derived** — produced by a step | appears with that step, in that step's moment, and stays |

A figure that already carries every quantity before the derivation starts is a finished diagram,
and it fails twice: there is nothing left to watch, and when a line appears on the right I cannot
tell which of the many marks on the left it just produced. It is the same defect as the slide
test, one layer down — the picture has been reduced to a static answer key.

### Three things land together

Every derivation beat is **one** `play()` call carrying all three:

```python
self.play(
    Write(step_line),                      # the mathematics, on the right
    Create(line_1), FadeIn(lbl_4),         # the figure event, on the left
    run_time=T_REVEAL,                     # on the caption cue for this step
)
```

Sequential plays do not do this. A figure event that arrives after its line has already been read
says "here is another thing"; arriving *with* the line says "this line is that thing". The
synchrony carries the meaning, exactly as it does in `bind_term()`.

The caption is the third strand: the beat's cue is the sentence explaining that step, so at the
instant I read about `\lambda_1` the line is lighting under my eyes. Line up the shot's cue
boundaries with its beats — that is what makes the captions point at the figure without ever
saying 「請看左邊」.

When the derivation returns to a quantity marked several beats ago, re-bind rather than assume it
is remembered: `bind_term(line_1, line_token)` for one pulse.

## A concept term is bold

**Every English concept term on the picture is set bold**, wherever it appears: the term card, a
term inside a list item, a term on the recap page.

```python
card = sq.term("eigenvector", color=AUX)                 # the term card — bold
line = sq.body("Pick a pivot, then partition around it.",
               terms=["pivot"])                          # bold AND coloured inline
```

The reason is that the frame has no other signal left. Colour already means *reference* — a hue
names a thing in the figure and may not be spent on emphasis (rule 17) — so weight is what
remains. And the term needs a signal: it is the word I have to find again — in the notes, in the
index of the textbook, in the next lecture that builds on it.

| | |
|---|---|
| **Bold** | the lecture's concept term — `eigenvector`, `pivot`, `uniformly continuous`, `loop invariant`, `resultant force` |
| **Not bold** | a result, a step, a number, a whole line, a point label, an answer. Those are marked by colour, by stillness, or by `emphasise()` — one signal per beat |
| **Still required** | the referent colour, bound once with `bind_term()`. Weight says *this is the term*; colour says *it is that thing* |

Bold is not emphasis. A frame with three bold things has three terms on it, which is a frame with
too many terms.

## The concrete opening keeps the picture empty

A knowledge point opens on a concrete case I can see — a sequence plotted as dots, a matrix acting
on the grid, a sorting run on eight numbers — and that opening is the easiest place in the video to
break rule 15, because the temptation is to caption the picture with what is happening.

Do not. **The picture shows the case happening; the words are the caption's job.**

| Beat | On the picture | Caption 中文 (書面語) | Caption English |
|---|---|---|---|
| The case | the terms of `a_n = 1/n` plotted as dots, marching right | 「把數列的每一項畫出來。」 | `Plot every term of the sequence.` |
| Varying it | a band round `0` drawn, then narrowed; the dots still end up inside | 「範圍收窄，後面的點仍然全部落在裏面。」 | `Narrow the band; the later terms still land inside.` |
| The plain word | still nothing new | 「數列越來越貼近 0。」 | `The terms get closer and closer to 0.` |
| The term | **`converges`**, bold, bound to the dots with `bind_term()` | 「這就稱為收斂。」 | `This is what it means to converge.` |
| The symbols | `\lvert a_n - L \rvert < \varepsilon` for all `n \ge N`, `\varepsilon` in the band's pen, `N` in the pen of the vertical line drawn at `N` | 「寫成數學式就是這樣。」 | `In symbols, this is the definition.` |

The plain Chinese word — 「越來越貼近」 — is **never** on the picture. It is Chinese (rule 29), and
the frame has a better use for that moment: showing the band closing in, and then the English word
the notes use. See `lesson-patterns.md`, pattern 11a.

## Binding a colour to a term

I have to learn that the violet lines *are* the eigenvector directions. Say it once, visually,
then never write it again:

1. Draw the grid with the two invariant lines in `AUX` violet.
2. Put the word `eigenvector` in the same violet in the margin — a term card, on its own.
3. **Flash the lines and the word together, twice.** The simultaneity is the sentence.

`bind_term()` does exactly this:

```python
eig = VGroup(*invariant_lines).set_color(AUX)
card = term("eigenvector", color=AUX).next_to(stage.figure_box(), RIGHT)   # term() = bold
self.play(*bind_term(eig, card))       # two synchronised pulses
```

After that binding, violet means eigenvector for the rest of the video — and for the rest of the
course's series — and no frame ever has to say so again. This is why rule 6 — never change a
colour's meaning — matters more in this style than in a caption-heavy one: the colour is now
carrying the definition.

## Worked example — the determinant frame

**Before** (three pieces of prose and an early formula competing with the figure):

```
tag:    2 · the determinant — what it measures
right:  the factor by which areas are scaled
        det A = ad − bc
        negative means the orientation flips
        if det A = 0 the plane is squashed flat
```

**After**:

```
tag:    Signed Area
figure: the grid, the unit square (grey) and its image under A,
        columns a₁ (blue) and a₂ (violet), the image parallelogram shaded,
        its area written inside it
right:  determinant                          ← term card, BOLD, bound by a double flash
        area(A[0,1]²) = |det A|              ← the square and its image are both on the figure
```

`the factor by which areas are scaled` disappears from the frame — the equation says it, and the
two shaded regions show it. `negative means the orientation flips` disappears too, and becomes a
beat where `a₂` is dragged across `a₁` and the readout of `det A` passes through zero and changes
sign as the parallelogram turns inside out. `if det A = 0 the plane is squashed flat` becomes the
**broken** example: a singular matrix collapsing the grid onto a line. `det A = ad − bc` moves to
its own shot, in the notes' notation, once the picture has made it worth computing. Every sentence
is still *said* — on the caption line. It just leaves the picture.

On-screen non-mathematical text (the tag is exempt) drops from 18 words to 1.

## Checks

At the storyboard, per panel:

- Is every string on the panel English, and in the notes' notation — same symbols, same indexing,
  same names? One 中文 character is a defect, not a style choice.
- Count the non-mathematical words. No hard cap, but a complete sentence — or a count that keeps
  climbing — → redesign the panel, do not shrink the type.
- For every sentence you removed, name where it went: the caption, or an animated beat
  (`movedToNarration` in the plan).
- For every term card, name the shot where it was bound to its colour, and confirm it is bold
  (`term()`, not `label()`).
- Ask of each remaining word: *would the frame still teach this if I deleted it?* If yes, delete
  it.
- Is the **section tag** there, and is it character-for-character the tag on the panel before it —
  unless this is the panel where the knowledge point changes? A tag that re-words itself
  mid-section is a jump cut in the corner of the frame. Does any tag name a term the video has not
  bridged to yet?
- On a pseudo-code panel: is the code verbatim from the notes, and is exactly one line highlighted
  — the one whose step this panel shows on the state?

On a worked-problem panel, additionally:

- Is the **stem** there, in English, complete? Is it identical — same wrapping, same position —
  to the stem on the panel before and after?
- Is the **part** on screen the part this shot answers, and only that one?
- Does the panel show any derived quantity the problem did not give and this shot has not yet
  derived?
- Is the **first line** of any computation the general form, with none of the example's numbers
  in it?
- If the example ends on a **recap page**: is it still, held ≥ `REST_RECAP`, general form first?
  (No example has to have one.)
- On the working shots: does each beat move something on the figure side as well as the derivation
  side, and do the two share a colour at that instant?

## What this is not

This is not minimalism for its own sake. The theme still applies — and now that the field and the
type follow 3Blue1Brown, the colour set is what ties a course's videos together, so the rules about
never reassigning a colour matter more, not less. A justification on screen next to the step it
justifies — `(Lemma 4.2)`, `(def. of span)` — is **required**, not prose, because it is what lets me
find the step's reason in the notes. Keep those.
