# On-screen language

Two rules, in this order.

1. **Say it in mathematics and motion if it can be said that way.** Reach for words only for what
   genuinely cannot be.
2. **One register per frame.** A frame may speak mathematics, or it may speak words. Never both
   at once. The figure belongs to neither — it accompanies whichever register is speaking.

## Why

**On rule 1.** A concept that has a mathematical form and is written out as a sentence instead
has been translated *away* from the thing the student is being examined on. The DSE paper is in
English and in symbols: a student who has watched an explanation carried by `AO : OM = 2 : 1` has
practised reading the notation they will be marked on; one who watched
`the longer part touches the vertex` has not. Motion is the second half of this — a property that holds under variation is *shown by
varying it*, which no textbook can do and no sentence needs to claim.

**On rule 2.** Mathematics and prose are read differently — one is scanned as structure, the
other as a line. Putting both on one frame makes the student switch modes mid-shot, and neither
gets read properly. This is the defect that reads as 「混雜」: an equation and a prose sentence
sharing a margin, each spoiling the other.

Note what rule 2 does **not** say. It does not ban text beside a figure — a list of steps
alongside the diagram those steps act on is good teaching, and better than either alone. What it
bans is text beside *displayed mathematics*.

## The two registers

| | **Mathematical register** | **Verbal register** |
|---|---|---|
| Carries | equations, formulae, ratios, symbolic derivations | an enumerated list of steps, conditions or criteria |
| Figure | yes — the figure the mathematics describes | yes — the figure the steps act on |
| Also allowed | figure labels, term cards, DSE reasons | figure labels, term cards, inline symbols (`⊥`, `∠`, `AD`) |
| Never | an explanatory sentence | a displayed equation |
| Budget | non-mathematical text: as few 字 as the idea needs, no fixed cap | ≤ 5 items, each ≤ 20 字 and one line |

Both registers are welcome in the same *lesson* — most lessons need both. They just take separate
shots. When a beat needs the list and the equation, that is two shots, and the figure carries
across between them.

## The picture is in English

**Every string the student sees on the frame is English.** Title, figure label, term card, list
item, DSE reason, question, recap page — all of it, in the English the paper uses. The **caption
track is the only place 中文 appears**, and it is unchanged: 繁體中文書面語 on top, English
underneath, with the teacher speaking Cantonese over the whole video.

| | |
|---|---|
| **The picture** | English only. `title()`, `body()`, `label()`, `term()` and `question_text()` **raise** on a CJK character |
| **The caption track** | bilingual, 中文 first — `caption_text()`, `build_captions.py`, `subtitles.srt`. Unchanged |
| **The narration** | Cantonese, with the subject terms said in English. Unchanged |

Three reasons, in order of weight:

1. **The exam is in English.** The words on the frame are the words the student has to parse
   under time pressure in the exam hall. A Chinese gloss beside a term drills a word the paper
   will never show them, and quietly lets them off the reading that is half of what is tested.
2. **A term has to be met in the form it will be written.** The marker wants
   `alternate segment theorem` on the answer sheet, not 「弦切角定理」. Rule 26 puts that term on
   the frame in bold; translating it beside itself undoes the point.
3. **Two scripts in one frame is the register problem again.** Chinese and Latin are read
   differently and set in different faces, so a mixed frame makes the eye switch twice — the same
   defect as mixing an equation with a sentence, in different clothes.

This does **not** touch what the student hears or reads at the bottom of the screen. Everything
the old 中文 body lines used to say still gets said — in Cantonese by the teacher, and in 中文 on
the caption line. It just leaves the picture.

## What may appear on the frame

| Kind | Allowed | Example |
|---|---|---|
| **Title** | one per shot, short | `1 · centroid` |
| **The figure** | in either register | △ABC with its medians |
| **Mathematics** | unlimited — in the mathematical register | `AO : OM = 2 : 1`, `\vec{v}_1` |
| **Figure labels** | point names, short object names — either register | `A`, `B`, `C`, `O`, `M`, `P` |
| **Term cards** | the English DSE term alone, **bold**, bound to a colour | `median`, `inscribed angle` |
| **DSE reasons** | the marker's exact wording, with the step it justifies | `ext. ∠ of △` |
| **A step list** | in the verbal register, with or without a figure | `① Find the line of intersection.` |
| **The question** | in full, in English, on every shot of a worked example — see below | `Denote the locus of $P$ by $\Gamma$.` |
| **The solution page** | every step of a worked example at once, on its closing shot — see below | `T(n) = a + (n-1)d` … `= 14` |
| **Loose explanatory prose** | **never, in either register** | ~~較長一段連着頂點~~, ~~永遠在 triangle 內~~ |

A term card is the term and nothing else. `median` is a term card;
`the point where the three medians meet` is a sentence wearing a term as a hat, and it goes to
the subtitle. It is set **bold** — see "A concept
term is bold" below.

"Loose prose" means a sentence that is not an item in an enumerated list. The list earns its place
because its *structure* teaches — see below. A stray sentence has no structure to earn it.

## The question band

**A worked example carries its question, in full, in the paper's English, for as long as the
example runs.** This is the one exemption from both rules above, and it is not a loophole in
them: the banned prose is *your explanation* of the mathematics, and the question is the **object
being studied**. It is also the text the student has to parse under time pressure in an
English-language paper, so reading it is part of what the lesson teaches, not a preamble to it.

A solution shown beside a question the student cannot see is a mechanism with no problem attached
— they can follow every line and still not know what was being asked.

| | |
|---|---|
| **Stem** | the question as the paper prints it. On **every** shot of the example, top of the frame, `MUTED`, left-aligned and ragged-right like the paper |
| **Part** | only the part being answered in this shot — `(a)(i) Find the equation of $\Gamma$.` — under the stem, in `INK`, one step larger |
| **Changes between shots** | the part, and only the part. The stem is the same mobject, wrapped the same way, in the same place |
| **Never** | a part whose stem is missing; a 中文 translation of either; a stem shrunk to fit; referent colour inside the stem |

The stem stays `MUTED` and un-coloured on purpose. It is reference text the student reads once,
and the pens are needed by the figure and the derivation — a stem in eight colours would spend
the palette on the part of the frame that needs it least.

### It is exempt from the budget, and from nothing else

The stem does not count against the non-mathematical concision budget, and it may sit over a
`math` shot or a `verbal` one. Everything else still applies inside the content area: no loose
explanatory prose of your own, no sentence that a mark on the figure could have made, one
register below the band.

### Build it with `Stage.question()`

```python
st = self.setup_stage()
q = st.question(STEM, r"(a)(i) Find the equation of $\Gamma$.")   # BEFORE figure_box()
fc, fw, fh = st.figure_box()          # now laid out UNDER the question
```

`Stage.question()` reserves the band by moving `content_top` down, so the figure and the
derivation land under the question instead of behind it. Call it before any region is asked for.
The strings are LaTeX — inline mathematics in `$...$`, so `$\Gamma$` and `$3x - 4y - 37 = 0$`
set exactly as the paper prints them.

It **raises** if the stem plus the part would take more than about five lines. That error is a
design instruction, and there are exactly two legitimate answers:

1. Quote only the sentences this part actually needs — a stem with three paragraphs of setup and
   a part that uses one of them should carry that one.
2. Split the part across two shots.

Shrinking the type is not one of them. A question set below reading size on a phone is a question
that is not on the frame.

Because the stem is on every shot of the example, build it from a **shared helper the scenes
import**, never re-typed per scene: a stem that re-wraps or shifts by a few pixels between two
shots is a jump cut on the most static thing in the frame (contract invariant 10).

### Splitting a part across two screens

Two things may force a split: the question band is too tall, or the derivation is longer than the
panel holds. Both are handled the same way, and neither is handled by shrinking anything.

| | |
|---|---|
| Carries across | the stem, the figure with every mark it had earned, the part line |
| The second screen opens with | the last line of the first — so nothing has to be remembered across the cut |
| Never | a cut that drops a mark the next screen's first line refers to |
| Check it | at Gate 3, at exact frame indices — the end state of one and the start state of the next |

### The solution moves against the question

The point of putting the question up is lost if the answer beside it is a finished block of
algebra. Every step lands on its own beat, with its figure event, in one `play()` (rule 18), and
a step that names a quantity draws that quantity onto the figure at the same instant. A screen of
steps that could have been printed on paper has failed the marking-scheme test below — the
question band does not exempt it.

The frame is two halves and they are wired together:

| Side | Carries | Moves |
|---|---|---|
| **Figure side** | the graph, the diagram, the axes — whatever the question is about | the mark this step produces: an arc drawn, a point plotted, a curve redrawn as a parameter changes, a length dimensioned |
| **Derivation side** | the lines of the solution | one line per beat, entering at `T_REVEAL` |
| **Between them** | referent colour | the quantity named on the right takes its colour on the left **in the same instant** — `mtex_ref()` for the symbols, `bind_term()` for the pulse |

Spend animation here rather than anywhere else in the lesson. A parameter that visibly moves the
curve, a value that arrives on the formula from the point it was measured at, a substitution that
lands in the slot its symbol occupied — these are the beats where a video beats a worked solution
on paper, and they cost nothing but sequencing. What they must not become is decoration: every
motion is a step of the solution, and colour still names a referent, never emphasis.

### A solution opens on the formula, not on the numbers

**The first line of a solution carries no data from the question.**

```
T(n) = a + (n-1)d        ← the formula, as the exam requires it to be written
T(3) = 10 + (3-1)(2)     ← the question's numbers — and now which slot each one fills is visible
     = 14                ← the answer
```

A solution that opens on `T(3) = 10 + 2(3-1)` answers this question and no other. The student
watches numbers land in slots with no way to see which slot is which, so nothing transfers to the
next question, and the general line — usually the one the marking scheme awards the method mark
for — never appears at all. `derivation()` takes the general form as its **required first
argument** so the rule is hard to skip:

```python
d = sq.derivation(r"T(n) = a + (n-1)d",
                  r"T(3) = 10 + (3-1)(2)",
                  r"= 14",
                  reason=r"\text{(general term of an A.S.)}")
self.play(Write(d[0]))                      # the formula, alone, on its own beat
self.play(Write(d[1]), Create(mark_at_3))   # the numbers, with the figure event
```

Give the general line its own beat. It is the line that transfers, and dropping it in silently
under the substitution wastes it. The rule holds for every formula the solution reaches for later,
not only the opening one — a fraction pulled out of the air with the numbers already inside it is
the same defect three lines down. See rule 27.

### The example closes on one full-solution page

The last shot of a worked example is a **still frame carrying every step at once**, in the order a
marker reads them: general formula, substitution, answer, with each DSE reason under the line it
justifies, and every `=` hung under the one above it.

This is not a repeat of what was just animated, and it is not the marking-scheme failure below. The
animated solve teaches the reasoning one beat at a time — but it never exists as a whole, because
by the last step the first line left the frame half a minute ago. The page is the only frame on
which the solution is an object the student can read top to bottom, check their own attempt
against, and copy.

```python
page = sq.solution_page(st, [
    (r"T(n) = a + (n-1)d", r"\text{(general term of an A.S.)}"),
    r"T(3) = 10 + (3-1)(2)",
    r"= 14",
])
self.play(FadeIn(page, shift=UP * 0.2))
self.wait(sq.REST_RECAP)          # 4.0 s, and nothing moves on it
```

| | |
|---|---|
| **Holds** | ≥ `REST_RECAP` (4.0 s) — it is read top to bottom and copied, not glanced at |
| **Carries** | every line that earns a mark, its reasons, and the answer marked as the answer |
| **Keeps** | the question band, so the page is readable against what was asked |
| **May drop** | the figure, if the steps need the width — by this shot the figure has done its work |
| **Never** | animates; shrinks to fit; or omits the general formula it opened on |

`solution_page()` **raises** rather than scaling. Two legitimate answers, same as the question
band: keep the lines a DSE marker awards and drop the algebra in between, or — if the part was
already split across two screens — give each half its own page.

## The budget

Per shot, counting only text on the picture — not captions, and not the question band.

Everything counted here is English — the picture carries no 中文 at all (above).

**Mathematical register:**

```
explanatory prose            = 0 words
non-mathematical text        = as few words as the idea needs, no fixed cap
  (title + labels + term cards)
mathematics and DSE reasons  = uncounted
```

**Verbal register:**

```
list items          ≤ 5, each ≤ 8 words and ONE line
displayed equations = 0
inline symbols (⊥ ∠ AD 2:1) uncounted, and encouraged
```

`body()` measures the line it builds and **raises** if it is wider than the frame, because an
`\mbox`-protected line cannot wrap — it just runs off the edge. That error means two items, or
fewer words, never smaller type.

If a shot in the mathematical register needs a sentence to make sense, the sentence goes to the
subtitle and the **frame needs a better picture**, not smaller type.

Count it in the storyboard, before anything is animated.

## The verbal register: a step list, with the figure beside it

An **enumerated procedure** is the one thing narration and subtitles genuinely cannot carry. A
subtitle is linear and transient: by the time the student hears step ③ the words of step ① are
gone, so they never see the *shape* of the procedure — how many steps there are, which one they
are in, what is still coming. A list persists and shows all of that at once.

**Keep the figure.** A list of steps next to the diagram those steps act on is better than either
alone: the student reads `Find the line of intersection` and that line highlights on the figure at
the same moment. That pairing is the point of the register, not a compromise.

What the list may **not** share the frame with is a displayed equation. If the beat needs both,
it is two shots, and the figure carries across.

### Rules for a list shot

| | |
|---|---|
| Items | ≤ 5. Beyond that it is a reference card, not a teaching beat |
| Each item | English, ≤ 8 words, one line, no sub-clauses — `body()` raises on a line too wide to fit |
| Inline symbols | encouraged — `⊥`, `∠`, `AD`, `2 : 1`. A symbol inside a sentence is not a displayed formula. Type the Unicode character; the theme translates it to TeX (`brand-theme.md`) |
| Displayed mathematics | **none** — if the shot needs an equation, split the shot |
| Figure | **yes**, and it should react — see below |
| Entrance | items appear **one at a time**, each on the narration beat that explains it (rule 18) |
| After | cut to the figure alone and *carry out* the steps. The list is the map; the figure is the territory |

### Animate the list against the figure

Revealing items one at a time is what makes a list teaching rather than a wall of text: the
student never reads ahead of the teacher, and the item arriving is the item being spoken.

Better still, **make each item do something to the figure as it lands** — that is what turns two
static halves into one explanation:

| As this item appears | The figure does |
|---|---|
| ① Find the line of intersection. | the intersection line lights up in the item's colour |
| ② Draw a line in each plane, ⊥ to it. | the two lines draw in, each with its right-angle mark |
| ③ They must meet at the same point. | the point `P` appears where they meet, and pulses |

Short because they are English now, and English is wider per idea than 中文 — which is a feature:
an item that will not fit in eight words is usually two steps, or narration.

Colour is the join: give the item and the thing it names the same colour, exactly as `bind_term()`
does for a single term. Keep the completed list on screen to the end of the shot, and dim earlier
items to 30% so the current one reads.

### When it is not a list

Do not reach for a list to escape the prose ban. Two checks:

1. **Is it genuinely ordered or enumerated?** ①②③ that must happen in sequence, or a fixed set of
   criteria — not three loose remarks with numbers stuck on them.
2. **Would losing the order lose the meaning?** If the items could be spoken in any order, they
   are prose, and they belong in the narration.

And before writing any of it, apply rule 1: *could this item be a mark on the figure instead of a
sentence?* `These two segments are equal` is tick marks, not a list item, even inside a list.

## Translating prose into mathematics

This is the actual work. Each of these replaces a sentence with something the frame can show.

The sentences below are the ones you were about to set on the picture. They are barred twice
over now — as prose, and, if you were going to write them in 中文, as Chinese on the frame. Each
one is still **spoken**, in Cantonese, and still appears on the caption line. It just leaves the
picture, and what replaces it teaches better.

| Instead of the sentence | Put on the frame |
|---|---|
| "The longer part touches the vertex." | the point `O`, the point `M`, and `AO : OM = 2 : 1` |
| "These two segments are equal." | equal-length tick marks — `ticks()` |
| "This line is a median." | tick marks on the bisected side + a bold `median` term card in the line's colour |
| "These two angles are equal." | the same arc marker and the same colour on both angles |
| "The centroid is always inside the triangle." | animate it — drag a vertex, let the student watch the point stay inside |
| "Because it is an isosceles triangle." | the DSE reason itself: `base ∠s, isos. △` |
| "The area becomes three times as large." | `\det = 3` beside the parallelogram, as the area animates |
| "As x increases…" | an arrow on the axis, or a `ValueTracker` readout that the student watches move |

Note the fifth row. **A property that holds under variation is stated by varying it**, not by
asserting it in words. That is what animation is for, and it is the one thing a static textbook
cannot do.

## The marking-scheme test

Before a shot is approved, ask:

> **If I froze this frame and printed it in black and white, would it be a marking scheme?**

If yes, the shot has no reason to be a video. A marking scheme is static, monochrome and
symbol-only; a student already has one. Everything a video can add — time, colour, motion — is
exactly what turns a chain of symbols into an explanation.

The failure looks like this: the frame shows `sin ∠BAD / BD = sin ∠ABD / AD`, all in one ink, and
the figure sits alongside with only its vertices labelled. To follow it the student must hold
`∠BAD` in memory, scan the figure, find which of several angles it is, come back, and repeat for
every symbol in the line. That is not reading mathematics — that is doing a lookup exercise,
and it is the reason a correct, complete, well-typeset frame can still teach nothing.

## Colour is reference, not decoration

**A colour names a thing.** Every occurrence of that thing — on the figure, in every formula, in
every later line of the derivation — wears the same colour, so the student locates it instead of
searching for it.

| | |
|---|---|
| `∠BAD` orange in the formula **and** the arc at `B` drawn orange in the figure | ✅ the symbol is findable |
| `∠BAD ≈ 61.4°` in green because it is the answer | ❌ green says "this line is the result", which the student already knows from its position. It does nothing to help them find `∠BAD` |
| The whole derivation in one ink | ❌ every symbol costs a lookup |

That second row is the trap worth naming: **colour spent on emphasis is colour that can no longer
carry reference.** If a colour does not help the viewer locate or distinguish a thing, it is
noise, and it also burns one of the few hues the frame has.

### How referent colour and the semantic palette fit together

The five inks in `brand-theme.md` are roles — `GIVEN`, `UNKNOWN`, `RESULT`, `WARN`, `AUX`. Roles
and referents mostly coincide: assign the referent the ink of its role and one assignment carries
both meanings.

They stop coinciding as soon as two referents share a role, which is the common case — a question
usually gives you three things, not one. The rule then is:

1. **The unknown always takes `UNKNOWN` orange.** That convention is worth more than any other,
   because it holds across the whole library: a student who has watched three SmartQuest videos
   knows before you say so which thing is being solved for.
2. **Everything else takes the remaining inks in `REF_SERIES` order, one per referent** — they are
   simply distinct pens at that point, not role claims.
3. **Role beyond "unknown" is shown by position**, not colour: the givens are the things already
   written on the figure when the shot opens; the result is the last line.

So in a sine-rule shot with `BD = 12`, `AD = 13`, `∠ABD = 72°` and `∠BAD` to find: `∠BAD` is
orange, and `BD`, `AD`, `∠ABD` take blue, violet and green — three givens, three pens, all four
findable.

`REF_SERIES` is the hand-out order, and it runs to **eight**: the five semantic inks, then
`REF_LIME`, `REF_FUCHSIA`, `REF_CYAN`. A figure with many angles and sides needs many pens, so
take as many as the figure has parts — do not force parts to share a colour to stay inside five.

The three extras were chosen by hue gap rather than by eye: the semantic five sit at 17.5°,
162.9°, 224.3°, 263.4° and 345.3°, and these land in the middle of the three widest gaps, keeping
a minimum separation of 30° across all eight. Contrast measured against the page: 4.86:1, 6.16:1,
5.22:1. Colours rejected for sitting too close to one already in the series: amber-700 (8° from
orange), pink-700 (10° from rose), teal-700 (12° from emerald), sky-700 (23° from blue).

Past about eight it is the figure that is overloaded rather than the palette. If a question
genuinely names more parts than that, reuse a pen on the part that is **furthest away on the
figure**, and give the two different arc radii or tick counts as well so shape backs colour up.

### Spend the pens on what the student has to find, and share where a numeral distinguishes

The failure is not running out of pens — it is **leaving them idle while the frame stays grey**. A
first pass at one lesson put all eight pens on sides and special quantities and left every *angle*
MUTED grey and the hinge white. The result: correct, complete, and almost entirely achromatic, so
nearly every symbol cost a lookup. The reviewer's words were 「太多白色，填色不夠，閱讀困難」.

Two moves free pens without breaking rule 6:

- **Two givens whose numerals differ can share one pen.** `60` and `40` are self-distinguishing —
  the pen only has to link each to its side, and no formula can confuse them. That freed a pen for
  the hinge, which is the line the whole lesson measures from and had been neutral.
- **Derived angles take the pen of the construction that produced them.** The diagonal PR is
  violet, and the angles PR carves out of the figure — 95°, 25°, 88.7° — are violet too. One
  referent class, one pen, and the student sees at a glance which marks the construction created.

The givens then take a single "the question states this" pen and stop competing for individual
ones. Count the achromatic symbols on a finished panel: if the figure is mostly white and grey,
the pens are in the wrong places.

### Colour applies with no figure at all

A formula-only frame still needs it. In a determinant expansion, every `x₁ y₂ z₃` term carries the
colour of the vector each factor came from, so the student sees the pattern of the expansion
rather than a row of subscripts. Use `mtex_ref()`:

```python
REFS = {r"\angle BAD": UNKNOWN, r"\angle ABD": AUX, "BD": GIVEN, "AD": RESULT}
mtex_ref(r"\frac{\sin \angle BAD}{BD} = \frac{\sin \angle ABD}{AD}", REFS)
```

Never leave a multi-part expression in a single ink.

## Every symbol must be findable in the figure

Colour makes the link visible; **animation makes it unmissable.** When a symbol first appears,
the thing it names moves at the same instant:

```python
self.play(Write(line), *bind_term(angle_arc_at_B, line[idx_of_BAD]))
```

`bind_term()` is not only for term cards — it binds any two mobjects that are the same thing.
Use it whenever a symbol enters, and again whenever the derivation returns to it after a gap.

### Geometry: label onto the figure, not beside it

For a geometry lesson the student should **never have to look left and right**. Everything the
derivation names lives on the figure:

- every angle it names, drawn as an arc in that angle's colour
- every length it names, written **on** its side in that side's colour — `12`, `13`, not only `BD`
- every constructed point, with its own label
- equal parts marked with `ticks()`, right angles with a right-angle mark

Then a line like `sin ∠BAD = 12 sin 72° / 13` can be read straight off the picture, because `12`,
`72°` and `13` are all visible on the figure in the same colours. The formula stops being a
separate document to cross-reference and becomes a caption to what the student is already looking
at.

If the figure is too crowded to hold all of it, that is the density budget talking (`pacing.md`,
≤ 6 blocks): show the sub-triangle the step actually uses, or split the step.

### An angle arc is only readable if both its arms are drawn

An arc names the angle between two rays. If one of those rays is not a visible mobject at that
moment, the arc floats against the background and names nothing — the student cannot tell which
angle it is, and neither can you when you review the frame.

This bites whenever the angle's arm is a **construction line rather than an edge of the figure**:

| The angle | Its arms | The trap |
|---|---|---|
| `∠PRQ = 55°` | RP and RQ | RP is the *diagonal*, not a side of the quadrilateral |
| `∠QPR = 95°` | PQ and PR | same diagonal |
| `∠PRS = 88.7°` | RP and RS | same again, and in a close-up where the card is dimmed |

So the diagonal has to be on screen **before or with** the first arc that uses it, even if its own
derivation beat comes later. Draw it thin in its own pen at the earlier beat and thicken it when
the derivation reaches it — the line is then a given carrier first and a result second, which is
also what the marking scheme does.

**Check at the storyboard:** for every arc on the panel, name the two mobjects that are its arms
and confirm both are visible in that same panel. It is a five-second check that caught three
floating arcs in one lesson.

### A quantity the derivation names must be on the figure at that moment

`PN = 60 sin 30° = 30` cannot be read off a figure that shows neither `60` nor `30°`. When a shot
moves to a new camera and drops the labels to reduce clutter, the labels the *current* line needs
have to come back. Check each derivation line against its own frame: every number in the line
should be findable in the picture beside it.

Related: **name the segment the figure has, not a symbol you invented.** `h = 30 sin 32°` makes
the student hunt for `h`; `PP' = 30 sin 32°` points at two labelled points on the diagram. The
marking scheme writes the segment too.

### But mark it when the derivation reaches it, not before

**Only the givens are on the figure at the start.** Everything the derivation *produces* appears
on the figure at the moment its line appears in the derivation — never earlier.

If `∠CAD = 60°` is step ②, then the arc at `CAD` is drawn and labelled `60°` **as that line lands
on the right**. Not at step ①, and not in the opening state of the scene.

| | |
|---|---|
| **Given** — stated by the question | on the figure from the start: the sides it gives, the angles it gives, the right angles it states |
| **Derived** — produced by a step | appears with that step, in that step's moment, and stays |

A figure that already carries every angle and length before the derivation starts is a finished
diagram, and it fails twice: there is nothing left for the student to watch, and when a line
appears on the right they cannot tell which of the many marks on the left it just produced. It is
the same defect as the marking-scheme test, one layer down — the picture has been reduced to a
static answer key.

### Three things land together

Every derivation beat is **one** `play()` call carrying all three:

```python
self.play(
    Write(step_line),                      # the mathematics, on the right
    Create(arc_CAD), FadeIn(lbl_60),       # the figure event, on the left
    run_time=T_REVEAL,                     # on the narration beat for this step
)
```

Sequential plays do not do this. A figure event that arrives after its line has already been read
says "here is another thing"; arriving *with* the line says "this line is that thing". The
synchrony carries the meaning, exactly as it does in `bind_term()`.

The narration is the third strand: the beat's subtitle cue is the sentence explaining that step,
so at the instant the student hears about `∠CAD` the arc is being drawn under their eyes. Line up
the shot's cue boundaries with its beats — that is what makes the narration point at the figure
without ever saying 「請看左邊」.

When the derivation returns to a quantity marked several beats ago, re-bind rather than assume it
is remembered: `bind_term(arc_CAD, line_token)` for one pulse.

## A concept term is bold

**Every English DSE term on the picture is set bold**, wherever it appears: the term card, a term
inside a 中文 line, a term on the recap page.

```python
card = sq.term("median", color=AUX)                      # the term card — bold
line = sq.body("同一弧上的 inscribed angle 相等。",
               terms=["inscribed angle"])                # bold AND coloured inline
```

The reason is that the frame has no other signal left. Colour already means *reference* — a hue
names a thing in the figure and may not be spent on emphasis (rule 17) — so weight is what
remains. And the term needs a signal: it is usually the only Latin word in a frame of Chinese and
mathematics, and it is the one word the student is examined on *naming*, since the DSE answer
sheet wants `alternate segment theorem`, not 「弦切角定理」.

| | |
|---|---|
| **Bold** | the DSE subject term — `median`, `inscribed angle`, `limiting reactant`, `resultant force` |
| **Not bold** | a result, a step, a number, a whole line, a point label, an answer. Those are marked by colour, by stillness, or by `emphasise()` — one signal per beat |
| **Still required** | the referent colour, bound once with `bind_term()`. Weight says *this is the term*; colour says *it is that thing* |

Bold is not emphasis. A frame with three bold things has three terms on it, which is a frame with
too many terms.

## Binding a colour to a term

The student has to learn that the purple lines *are* the medians. Say it once, visually, then
never write it again:

1. Draw the figure with the medians in `AUX` purple.
2. Put the word `median` in the same purple in the margin — a term card, on its own.
3. **Flash the lines and the word together, twice.** The simultaneity is the sentence.

`bind_term()` does exactly this:

```python
meds = VGroup(*medians).set_color(AUX)
card = term("median", color=AUX).next_to(stage.figure_box(), RIGHT)   # term() = bold
self.play(*bind_term(meds, card))       # two synchronised pulses
```

After that binding, purple means median for the rest of the video, and no frame ever has to say
so again. This is why rule 6 — never change a colour's meaning — matters more in this style than
in a caption-heavy one: the colour is now carrying the definition.

## Worked example — the centroid frame

**Before** (five separate pieces of prose competing with the figure):

```
title:  1 · centroid — the three medians
right:  the point where the three medians meet
        2 : 1
        the longer part touches the vertex
        always inside the triangle
```

**After**:

```
title:  1 · centroid
figure: △ABC, medians in purple, centroid O marked,
        midpoint M labelled on the side AO crosses,
        tick marks on each bisected side
right:  median            ← term card, purple and BOLD, bound by a double flash
        AO : OM = 2 : 1   ← O and M are on the figure, so this reads itself
```

`the longer part touches the vertex` disappears from the frame entirely — `AO : OM = 2 : 1` says
it, because `A` is a vertex and the student can see which segment is longer. `always inside the
triangle` disappears too, and becomes a beat where a vertex is dragged and the point visibly stays
inside. Both sentences are still *spoken* in Cantonese, and both still appear on the caption line.
They just leave the picture.

On-screen non-mathematical text drops from 21 words to 1.

## Checks

At the storyboard, per panel:

- Is every string on the panel English? One 中文 character is a defect, not a style choice.
- Count the non-mathematical words. No hard cap, but a complete sentence — or a count that keeps
  climbing — → redesign the panel, do not shrink the type.
- For every sentence you removed, name where it went: subtitle, narration, or an animated beat.
- For every term card, name the shot where it was bound to its colour, and confirm it is bold
  (`term()`, not `label()`).
- Ask of each remaining word: *would the frame still teach this if I deleted it?* If yes, delete
  it.

On a worked-example panel, additionally:

- Is the **stem** there, in English, complete? Is it identical — same wrapping, same position —
  to the stem on the panel before and after?
- Is the **part** on screen the part this shot answers, and only that one?
- Does the panel show any derived quantity the question did not give and this shot has not yet
  derived?
- Is the **first line** of the solution the general formula, with none of the question's numbers
  in it?
- Does the example end on a **full-solution page** — every step, still, held ≥ `REST_RECAP`?
- On the solving shots: does each beat move something on the figure side as well as the derivation
  side, and do the two share a colour at that instant?

## What this is not

This is not minimalism for its own sake. The theme still applies — and now that the field and the
type follow 3Blue1Brown, the colour set is what carries SmartQuest identity, so the rules about
never reassigning a colour matter more, not less. A DSE reason on screen next to the step it justifies is
**required**, not prose, because the student is being marked on writing it. Keep those.
