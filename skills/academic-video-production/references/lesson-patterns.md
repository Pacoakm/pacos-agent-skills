# Lesson patterns

How a video is *sequenced*, as distinct from what is on the frame
(`on-screen-language.md`), how long things take (`pacing.md`), or how they look
(`brand-theme.md`).

Patterns 1–5 are adapted from 3Blue1Brown's practice. A caveat worth keeping: he has published
no style guide, so these are observations of the work rather than rules he stated. They are here
because they survive the translation to a video made from someone's lecture notes, not because
they are anyone's authority.

**Pattern 11 sets the level everything else is written at.** He writes for curious adults who
came looking; these videos are for one viewer — Paco, who has the course's prerequisites, has at
least skimmed the notes, and does not yet understand *this* concept. Where a borrowed habit and
pattern 11 disagree, pattern 11 wins.

Answer these in `brief.md`, per knowledge point. They are part of what is approved at Gate 1.

| Pattern | Answer it |
|---|---|
| 1–6, 11 | always |
| 7 — a worked computation | whenever the knowledge point computes something |
| 8 — algorithms | whenever the concept is a procedure that runs |
| 9 — proofs | whenever a proof or proof sketch is in the video |
| 10 — the gap in the slides | whenever `notes-map.md` lists a skipped step for this knowledge point |
| 12 — long videos | once, for the whole video, when the concept map is drawn |

---

## 1. Pause and ponder

**Hand the question over before showing the answer.**

The single highest-value pattern to borrow, because watching someone else's reasoning produces a
strong illusion of understanding. Every step looks obvious as it lands, and none of it was
predicted. A prediction that is then checked against the picture is what makes the picture stick.

Place a ponder beat before the answer to a question the video has posed — *what happens to the
area when this column rotates?*, *which element does the pivot end up next to?* — not in the
middle of a derivation. At the beat:

- everything except the question stills — no new information, nothing moving
- the question and whatever it needs stay on screen; the viewer needs them to think with
- the caption says it plainly: 「暫停一下，先自己想想。」 / `Pause here and predict it first.`
- hold **≥ 3.0 s** (`REST_PONDER`) even though pausing is expected. The hold is what makes pausing
  feel invited rather than awkward, and a viewer who does not pause still gets a beat to guess

Record it as `ponder` on the shot: `{"prompt": "What happens to det A?", "holdSeconds": 3.5}` —
the prompt is on the picture, so it is English like everything else there (rule 29); the caption
says it in 中文 and English. A knowledge point whose aha arrives with no ponder beat before it
should be questioned at Gate 1.

Do not stack them. One or two per knowledge point at most; a video that keeps stopping is a
worksheet.

## 2. Behaviour before name

**Show the thing doing its thing, then name it.** Never open a section with a definition.

| | |
|---|---|
| ✅ | a linear map acts on a fan of vectors; almost all are knocked off their lines, two are only stretched along them — *then* the `eigenvector` card appears and binds to their colour |
| ❌ | `Av = λv` first, then a picture of one vector that satisfies it |

A name given before the behaviour is a label on something not yet met, so it has nothing to
attach to and must be memorised. A name given after is a handle for something already seen —
which is the difference between recall and understanding.

`bind_term()` is the mechanism; this is the ordering rule that decides *when* to call it.

Pattern 11 is the strong form of this: not just behaviour before the name, but **a concrete
case, a question or a small puzzle** before the name.

## 3. Concrete before general

**Work a real instance first, then lift to the statement.** This is the **concrete** example role
(pattern 6), and it is the one role that is mandatory: every knowledge point has one, and it comes
before the general statement.

Lecture notes run the other way — definition, theorem, then perhaps an example two slides later.
The video reverses it: the 2×2 matrix `[[2,1],[0,1]]` acting on the actual grid, *then* `A` in
general; the eight-element array being partitioned, *then* `PARTITION(A, p, r)`; the fair die,
*then* `\mathbb{E}[X] = \sum_x x\,p(x)`. The general statement lands better once the specific case
has already been seen working.

If the notes only ever give the general form, ask at Gate 1 what the smallest honest instance of
it is — and put that instance in the video. "Smallest honest" means small enough to see all of it
and large enough that it is not degenerate: a 2×2 with distinct eigenvalues, not the identity.

## 4. The title card first, then an opening that is a question

**Shot 1 is always the title card** — the concept, the brand rule, `COURSE · Lecture N`, 3–4
seconds (hard rule 30, `title_card()`). It places the video against the notes: which course, which
lecture, which concept, so what follows can be mapped back onto the right slides.

**Shot 2 is the opening, and it poses something worth wanting the answer to.** 「今日講特徵向量」
is a table of contents, not an opening — and after the card it is also redundant, because the card
has just said it. That is the point of the ordering: the card takes the announcement off the
opening's hands, so the opening is free to be a question.

**Test:** after the opening, could the viewer say in one sentence what they are about to find out?
If not, rewrite it.

## 5. The animation is the argument, not an illustration of it

The highest bar here, and the one that separates a video from a slide deck with transitions.

**Test:** after the animation runs, is the result *established*, or merely *displayed*?

| | |
|---|---|
| **Argument** | a column vector of `A` is dragged round; the parallelogram's area and `det A` move together, and the sign flips at the instant the two columns line up — orientation, not just area, is now visible |
| **Illustration** | the sentence `det A is the signed area scale factor` beside a static picture of one parallelogram |

Not every step can reach this bar; algebraic manipulation often genuinely cannot. That is fine —
but say so in `brief.md` rather than assuming. Naming which beats are arguments and which are
illustrations is usually enough to find one beat that could be promoted, and one promoted beat
per knowledge point is a large difference.

This is also where the **aha** sits. If the aha is a sentence rather than something watched
happening, the knowledge point has an aha in name only.

## 6. Concept examples: concrete, varied, broken, connected

**An example is chosen for what it makes visible.** Not for resemblance to a question that might
be set, and not to climb towards one. This skill builds no example ladder and predicts no exam
(rule 28).

| Role | What it is for | The test | Example — the Mean Value Theorem |
|---|---|---|---|
| **Concrete** — mandatory, first | the smallest real instance, with actual values, before the general statement | Could the viewer point at every object in it? | `f(x) = x^2` on `[0, 2]`: the secant of slope 2, the tangent at `c = 1` parallel to it |
| **Varied** | change one thing continuously; watch what depends on it and what does not | Can the viewer name what stayed fixed? | slide the right endpoint `b`; the secant swings and `c` slides to keep its tangent parallel — there is always one |
| **Broken** | the case where a hypothesis fails and the conclusion fails with it | Can the viewer say which hypothesis this case removed? | `f(x) = \lvert x \rvert` on `[-1, 1]`: secant slope 0, and no point has tangent slope 0 — the corner is why *differentiable on (a, b)* is in the theorem |
| **Connected** | where the concept turns up again, in this course or the next | Is the link a picture, not a remark? | the same parallel-tangent picture as the order-0 case of Taylor's theorem with Lagrange remainder — `f(b) = f(a) + f'(c)(b − a)`, grown into the higher-order terms |

**Concrete is mandatory and comes first** (pattern 3). The other three are chosen per knowledge
point; not every one needs all four.

**Broken is the most under-used and usually the most illuminating.** A theorem's hypotheses are
there because something goes wrong without them, and the notes rarely show what. Go through the
statement hypothesis by hypothesis and ask what the smallest case is that drops *only* that one:
a discontinuous function for the Intermediate Value Theorem, a non-square system for invertibility,
an unsorted array for binary search, dependent events for `P(A ∩ B) = P(A)P(B)`, a negative edge
for Dijkstra. Showing that case is how a condition stops being a line to memorise.

**Varied is where Manim beats the slide.** A `ValueTracker` on the parameter, the dependent
quantities redrawn with `always_redraw`, and the invariant held still on screen while everything
else moves. Vary slowly enough that the fixed thing can be *seen* to be fixed (`pacing.md`).

**Connected must be a picture.** "This comes back in Lecture 11" is a remark; the same figure,
recoloured, turning into the later object is a connection.

Record each example's role in `brief.md`, its actual values, and one line saying what it makes
visible. If that line is hard to write, the example is not earning its place.

**What an example is not:** a past-paper question, a "type of question that might come up", a
drill, or a speed-run of a technique.

## 7. A worked computation: general form first, the problem in view

Some examples are computations, because watching the computation *is* the understanding — a
convolution sliding, a Gaussian elimination, a recurrence unrolling. When one is, this is its
shape. If it is a problem taken from the notes or a tutorial sheet, its statement is on the frame
throughout (rule 23, `on-screen-language.md`); this is how the time around it is spent.

| Beat | What is on the frame | Why |
|---|---|---|
| **Read** | the statement lands first, alone, and is given time to be read | A problem cannot be thought about before it has been read. Budget it (`pacing.md`) |
| **Set up** | the figure draws from the **givens only** | The figure at this moment is what the viewer would have drawn themselves |
| **Ponder** | everything stills, statement and givens up | Pattern 1 — optional here, but this is where it goes if the knowledge point has one |
| **Compute** | the general form alone on its own beat, then each step with its figure event in the same `play()` | Rules 27 and 18 — the general line is what transfers, the synchrony is what makes it an explanation |
| **Land** | the result, then stillness | `REST_AHA`, `pacing.md` |
| **Recap** *(optional)* | every step at once, still, general form first | Only when the computation is long enough that pausing on the whole of it is worth having. Not a closing ritual |

**The recap still is optional.** The animated computation never exists as a whole — by the last
step the first has left the frame — so a long one can earn a still frame of every line, held
≥ `REST_RECAP` (4.0 s), built with `solution_page()`. A short one does not need it, and no
computation ends on one by default.

**Split a long computation rather than compressing it.** Two screens with the figure and the
statement carried across, the second opening on the line the first ended on, beats one screen of
shrunken steps — and it costs nothing but a cut. The failure to avoid is a wall of finished
algebra, fitted rather than split.

## 8. Algorithms: run it on a small input

**The figure is the state of the machine.** An algorithm is taught by running it, not by
displaying its pseudo-code and describing it.

| | |
|---|---|
| **The input** | small enough to see all of it, chosen so the run visits every branch that matters. For quicksort: 8 elements, with a duplicate and a run already in order. Record in `brief.md` which branch each part of the input exercises |
| **The state** | the array with its indices, the tree with its pointers, the stack as it grows, the priority queue with its keys — drawn as the figure, in the lecture's indexing (0 or 1, as the notes use) |
| **One step per `play()`** | a comparison, a swap, a pointer move, a relaxation — each its own beat, the state changing in the same `play()` as the step that changes it (rule 18) |
| **The invariant** | drawn **on the state**, not stated beside it: the `≤ pivot` region shaded one pen and the `> pivot` region another, the finalised vertices in Dijkstra filled, the sorted prefix bracketed. The viewer watches the invariant being maintained at every step |
| **The pseudo-code** | the notes' pseudo-code, verbatim, beside the state, with **the executing line highlighted** at the instant its step happens on the state. Never code with nothing running |
| **Speed** | slow for the first pass through the loop, every step its own beat; once the pattern is seen, later iterations may run faster — but the invariant stays drawn |

The example roles map straight across. **Concrete** is the small input. **Varied** is a second
input that changes one property — already sorted, all equal, reversed — so the viewer sees what the
running time depends on. **Broken** is the input that violates a precondition (binary search on an
unsorted array, Dijkstra with a negative edge) or breaks a naive version the notes improve on.
**Connected** is the same state shape reused: the partition step reappearing in quickselect.

For a complexity argument, the figure is the work: the recursion tree drawn level by level with
each level's cost written beside it, the levels summing in front of the viewer. `T(n) = 2T(n/2) + n`
comes first, as the general form; the tree for `n = 8` second.

## 9. Proofs: animate the idea, then write the statement

**The picture makes it obvious; then the formal version is written, and it reads as a
description of what was just seen.**

A proof in the notes is a sequence of lines, each checkable, whose idea is usually one picture the
lecturer drew on the board: the ε-band that the tail of the sequence must fall into, the
pigeonholes, the construction that doubles the triangle, the shrinking nested intervals. That
picture is what the video animates.

| Beat | What happens |
|---|---|
| **1 · The claim, concretely** | the statement on an instance — this sequence, this ε, this graph — as a picture, no quantifiers yet |
| **2 · The idea** | the construction or the move that makes it true, animated. This is the aha, and it must be an argument (pattern 5) |
| **3 · Vary it** | the idea surviving variation — ε shrinks and `N` jumps right to keep the tail inside the band — so the "for all" is *seen* rather than read |
| **4 · The formal statement** | the notes' theorem, verbatim, written *after* the picture — each quantifier and symbol bound to the part of the picture it names (`bind_term()`, `mtex_ref()`) |
| **5 · The formal proof** *(if in scope)* | the notes' lines, one per beat, each lighting the part of the picture it formalises, with its justification named as the notes name it |

Not every proof has a geometric idea. A purely algebraic proof may only reach illustration — say so
in `brief.md`, animate the one step that has a picture, and let the rest be the notes' lines landing
one at a time. Whether proofs are animated at all is the depth question in `SKILL.md`; ask only if
the notes are proof-heavy and it is unclear.

**Never write the formal statement first and then "visualise" it.** That is the definition-first
opening (pattern 11) in a different place, and it turns the picture into an illustration of a line
already read.

## 10. The gap in the slides

**Target the step the notes skip.** It is usually where the video earns its keep.

`notes-map.md` records what the slides skip: the step between two displayed lines, the "clearly"
that is not clear, the picture the lecturer drew on the board that the PDF does not have, the
"similarly" that hides a different case. Each one is a candidate for the aha of its knowledge point.

The shape:

1. **Show the notes' two lines as the notes print them**, in the notes' notation — so the viewer
   recognises exactly where in the slides this is.
2. **Open the gap between them.** The lines move apart; the missing step is built in the space, as
   motion — the substitution landing, the picture that justifies the inequality, the case the
   "similarly" hid.
3. **Close it back up.** The lines return to the notes' layout, the new step now visibly between
   them. The viewer can go back to that slide and read across the gap.

The justification for the missing step is named the way the notes name things elsewhere —
`(Cauchy–Schwarz)`, `(Lemma 4.2)`, `(def. of span)` — so the gap is filled in the course's own
terms, not a different textbook's.

If a gap is actually an error in the notes — a wrong index, a missing hypothesis — `brief.md`
flags it, and the video shows the notes' version first and then the corrected one, never a silent
fix (SKILL.md, rule 3).

## 11. Pitch at the viewer: prerequisites known, this concept not

**The house standard, and the one that sets the level everything else is written at.**

The viewer knows the course's prerequisites and has seen the slides once. They are not to be
talked down to — no re-teaching of what a matrix is in a linear-algebra course — and they are
not to be talked past either: every word that belongs to *this* concept is new until the video
has bridged to it.

Two things follow, and they are separate.

### 11a. Open from something concrete, never from the definition

**Every knowledge point opens on a concrete case, a question, a small puzzle, or a familiar
phenomenon, before its technical word.** It does not have to be something physically felt — for a
university concept it rarely is — but it has to be something the viewer can *see* and has a stake
in: a specific matrix doing something odd to the grid, a sum that should obviously converge and
does not, a sorting run that is suspiciously fast, a coin that keeps landing heads.

The order is always the same, and the term arrives **last**:

| Beat | What happens |
|---|---|
| **1 · The case** | the concrete situation, question or puzzle, shown happening. Plain words in the caption, short sentences |
| **2 · Vary it** | change it — rotate, enlarge, perturb, run it again — so *what it depends on* is seen before anything is named |
| **3 · The plain word** | the plain 中文 word for what was just seen — 「方向不變」, 「越來越貼近」, 「撐不住」 — in the **caption only** |
| **4 · The term** | *that* is what the lecture calls it: the bold English term card, bound to the thing on screen (`term()`, `bind_term()`) |
| **5 · The statement** | only now the notes' formal definition or formula, with each symbol tied back to a part of the case |

**Worked example — eigenvectors:**

| Beat | The picture | Caption 中文 (書面語) | Caption English | On the frame |
|---|---|---|---|---|
| 1 | the grid under `A = [[3,1],[1,3]]`; a fan of vectors, each carried to its image | 「把這個矩陣作用在每一個向量上。」 | `Apply this matrix to every vector.` | the matrix `A` |
| 2 | most images swing off their original lines; the viewer's eye catches two that do not | 「大部分向量都被扭離原來的方向。」 | `Most vectors are knocked off their line.` | nothing new |
| 3 | the two survivors pulse; one stretched by 4, the other by 2 | 「但有兩個方向不變，只是被拉長。」 | `But two directions only get stretched.` | nothing new — 「方向不變」 is on the **caption line** |
| 4 | the term card lands and pulses with the two lines | 「這種向量稱為特徵向量。」 | `These are called eigenvectors.` | **eigenvector** |
| 5 | `A\mathbf{v} = \lambda\mathbf{v}`; `\mathbf{v}` in the lines' colour, `\lambda` beside each stretch factor | 「寫成數學式就是這樣。」 | `In symbols, this is the definition.` | `A\mathbf{v} = \lambda\mathbf{v}` |

The symbols in beat 5 are the notes' symbols — if the lecture writes `\vec{x}` and `\lambda_i`, so
does the frame.

The **section tag** obeys the same order. It is a section title, so an `Eigenvectors` tag over
beats 1–3 hands over the word the opening exists to make the viewer see first, and the opening
becomes an illustration of a term already named. The tag lands at beat 4, with the term card; the
shots before it keep the previous section's tag, or none. See hard rule 34.

Note beat 3. **「方向不變」 never goes on the picture** — it is Chinese, and the picture is English
(rule 29). The plain word lives in the caption; the picture waits and then shows the English term.
That is not a compromise: the idea is met in the language it is thought in and the word in the
language the notes use, a second apart, which is exactly the split the whole caption track is
built on.

**The test:** could the viewer — prerequisites known, this concept not — follow the first twenty
seconds without opening the notes? If any word in there needs this concept's definition, it is in
the wrong place.

### 11b. Then keep the language plain, and let the terms in one at a time

After the bridge, use the term — that is what it was introduced for, and hiding it afterwards
teaches nothing. What stays banned is everything *around* it:

| | |
|---|---|
| Sentences | short, one clause, one idea. If a cue needs a comma to hold two thoughts, it is two cues |
| Words | the plain word wherever the technical one is not the thing being taught. Prerequisite terms are fine — the viewer has them |
| New terms | **one per cue**, and never before its bridge. Two new terms in one sentence is a sentence nobody finishes |
| Never | a term used casually before it is introduced — including in a cue that is "just setting up" |

## 12. Long videos: chapters, and split rather than compress

There is no duration target (rule 39), so a hard concept can run long. What keeps a long video
usable is structure, not speed.

**One chapter per knowledge point.** Each knowledge point is a section with its own tag, and at
Gate 4 each gets a Palmier chapter marker named with that tag (`palmier-assembly.md`). A viewer
coming back to one idea next week jumps to it, and lands on a shot whose tag says where they are.

So each chapter should stand up on its own:

- it opens on its own concrete case (pattern 11a), not mid-thought from the previous chapter
- if it leans on an earlier chapter's result, it re-shows that result as a picture for a beat —
  the figure, not a sentence referring back
- it ends on a still beat (`pacing.md`) before the next chapter's opening

**When the concept map gets long, split into two videos at a knowledge-point boundary.** Never
compress an explanation to keep one file — cutting the varied example, running the algorithm
faster, dropping the broken case. Signals that it is time to consider a split:

- the knowledge points fall into two groups, and the first group is a complete understanding on
  its own (the definition and its geometry; then the applications)
- the second half needs the first half's result but not its details
- the video would still run well past the length of the lecture segment it explains

Split at the boundary where the first video ends on a complete understanding, and let the second
open (after its title card) on the first one's central picture for a few seconds. Each is its own
project, `…/07-eigenvectors/` and `…/08-diagonalisation/`, sharing the course's `kit.py` and colour
assignments (rules 6, 37).

---

## Already elsewhere in this skill

The rest of what is worth borrowing is recorded where it is enforced, not here:

| Pattern | Where |
|---|---|
| Colour = referent, and constant across a course's series | hard rules 6 and 17, `brand-theme.md` |
| Built in step with the caption beats, never all at once | hard rule 18, `on-screen-language.md` |
| Almost no explanatory prose on the frame — the captions explain | hard rule 15, `on-screen-language.md` |
| The picture is English, in the lecture's notation; 中文 only on the caption track | hard rules 29 and 40, `on-screen-language.md` |
| Shot 1 is the locked title card | hard rule 30, `brand-theme.md` |
| The concrete opening, and plain language throughout | hard rule 31, `narration-and-subtitles.md` |
| A concept term is bold wherever it appears | hard rule 26, `on-screen-language.md` |
| A computation's first line is the general form | hard rule 27, `on-screen-language.md` |
| No exam ladder, no past-paper framing | hard rule 28, `SKILL.md` |
| Transform rather than erase and redraw | motion grammar 2, `brand-theme.md` |
| Stillness after an insight | `REST_AHA` = 1.8 s, `pacing.md` |
