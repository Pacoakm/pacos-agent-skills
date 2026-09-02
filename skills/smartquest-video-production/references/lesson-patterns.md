# Lesson patterns

How a lesson is *sequenced*, as distinct from what is on the frame
(`on-screen-language.md`), how long things take (`pacing.md`), or how they look
(`brand-theme.md`).

Patterns 1–8 are adapted from 3Blue1Brown's practice. A caveat worth keeping: he has published
no style guide, so these are observations of the work rather than rules he stated. They are here
because they survive the translation to a DSE lesson, not because they are anyone's authority.

**Pattern 9 is not his, and it outranks all of them.** He writes for curious adults who came
looking; we are teaching band 2 and 3 students who have to pass a paper. Where his register and
pattern 9 disagree, pattern 9 wins.

Answer patterns 1–5 and **9** in `brief.md` for every lesson, and patterns 6–8 as well whenever
the lesson works an example. They are part of what the user approves at Gate 1.

---

## 1. Pause and ponder

**Hand the problem to the student before showing the answer.**

The single highest-value pattern to borrow, because a DSE viewer is not a curious browser — they
have to *produce* answers under time pressure, and watching someone else solve a problem creates
a strong illusion of competence that collapses in the exam hall.

Place a ponder beat before the answer to any worked part, not in the middle of a derivation. At
the beat:

- everything except the question stills — no new information, nothing moving
- the question and the given data stay on screen; the student needs them to work with
- the narration says it plainly: 「暫停一下，自己做完再繼續。」
- hold **≥ 3.0 s** even though the student is expected to pause. The hold is what makes pausing
  feel invited rather than awkward, and a viewer who does not pause still gets a beat to think

Record it as `ponder` on the shot: `{"prompt": "Find ∠BAD", "holdSeconds": 3.5}` — the prompt is
on the picture, so it is English like everything else there (rule 29); the narration says it in
Cantonese. A long-form
lesson with a worked example and no ponder beat should be questioned at Gate 1.

Do not stack them. One or two per lesson; a video that keeps stopping is a worksheet.

## 2. Behaviour before name

**Show the thing doing its thing, then name it.** Never open a section with a definition.

| | |
|---|---|
| ✅ | the three lines are drawn, they visibly meet at one point — *then* the `median` card appears and binds to their colour |
| ❌ | `a median joins a vertex to the midpoint of the opposite side` first, then a drawing of one |

A name given before the behaviour is a label on something the student has not met, so it has
nothing to attach to and must be memorised. A name given after is a handle for something they
have already seen — which is the difference between recall and understanding.

`bind_term()` is the mechanism; this is the ordering rule that decides *when* to call it.

Pattern 9 is the strong form of this: not just *behaviour* before the name, but **an everyday
situation the student has physically felt** before the name.

## 3. Concrete before general

**Work real numbers first, then lift to the formula.**

Especially right for DSE, where the paper itself is concrete: the student meets `12`, `13` and
`72°`, not `a`, `b` and `C`. Do the numbers on the actual figure, and only then show that the
same steps hold for any triangle.

The order also protects the *marks*: the general statement is what earns the reason line
(`sine formula`), and it lands better once the student has already seen it work once.

If a lesson only ever shows the general form, ask at Gate 1 what specific case it was derived
from — and put that case in the video.

## 4. The title card first, then a hook that is a question

**Shot 1 is always the title card** — topic, brand rule, `subject · paper · syllabus code`, 3–4
seconds (hard rule 30, `title_card()`). A DSE student picks a video by whether it is their paper
and their syllabus point; a hook that lands before that answer is asking them to invest in a
lesson they cannot yet place.

**Shot 2 is the hook, and it poses something the student wants the answer to.** 「今日我們講
centroid」 is a table of contents, not a hook — and after the card it is also redundant, because
the card has just said it. That is the point of the ordering: the card takes the announcement
off the hook's hands, so the hook is free to be a question.

**Test:** after the hook, could the student say in one sentence what they are about to find out?
If not, rewrite it.

For an exam-technique lesson the strongest hook is usually the past-paper part itself, shown as
the paper poses it — the question already *is* a question.

## 5. The animation is the argument, not an illustration of it

The highest bar here, and the one that separates a lesson from a narrated worked solution.

**Test:** after the animation runs, is the result *established*, or merely *displayed*?

| | |
|---|---|
| **Argument** | a vertex is dragged and the centroid visibly never leaves the triangle — the student now believes it |
| **Illustration** | the sentence `the centroid is always inside the triangle` with a static picture of one triangle beside it |

Not every step can reach this bar; algebraic manipulation often genuinely cannot. That is fine —
but say so in `brief.md` rather than assuming. Naming which beats are arguments and which are
illustrations is usually enough to find one beat that could be promoted, and one promoted beat
per lesson is a large difference.

This is also where the **aha moment** should sit. If the aha is a sentence rather than something
the student watches happen, the lesson has an aha in name only.

## 6. A worked example is read, then pondered, then solved — with the question in view

The shape of a worked part, in order. The question is on the frame throughout (rule 23,
`on-screen-language.md`); this is how the time around it is spent.

| Beat | What is on the frame | Why |
|---|---|---|
| **Read** | the stem lands first, alone, and is given time to be read | The student cannot ponder a question they have not finished reading. Budget it: the stem is English prose, and it is the densest reading in the video |
| **Set up** | the part appears; the figure draws from the **givens only** | The figure at this moment is what the student would have drawn themselves |
| **Ponder** | everything stills, question and givens up | Pattern 1. This is the beat the whole example exists for |
| **Solve** | each step on its beat, its figure event landing in the same `play()` | Hard rule 18 — the synchrony is what makes it an explanation |
| **Land** | the answer, then stillness | `REST_AHA`, `pacing.md` |
| **Page** | every step at once, still, general formula first | Pattern 8. The solve taught the reasoning; this is the only frame on which the solution exists as a whole |

Then the next part starts from the same stem, with the figure carrying whatever (a) established.

**Read time is real time.** A 40-word DSE stem is about 12 seconds of reading for a student
working in their second language, and a narration that starts explaining over it wastes both. The
usual shape is: stem appears, the narration reads it aloud or paraphrases it in Cantonese, and
only then does the lesson start.

**Split a long part rather than compressing it.** Two screens with the figure and the question
carried across, the second opening on the line the first ended on, beats one screen of shrunken
steps — and it costs nothing but a cut. The failure to avoid is a part that ends up as a wall of
finished algebra because it was fitted rather than split.

## 7. Examples climb, and the first one barely climbs at all

**The example straight after a concept is that concept with numbers put into it.**

Same formula, same shape, nothing new to notice, solvable by substituting and evaluating. This
looks like a wasted example and is the opposite: it is the beat where the student finds out that
what they just watched is something *they* can do. An example that needs a second idea takes that
away and replaces it with a demonstration of the teacher's skill — which the student enjoys and
cannot reproduce.

| Rung | What it adds | The test |
|---|---|---|
| **1 — mirror** | nothing. The concept's own formula and shape, the question's numbers substituted straight in | Could the student solve it by copying the concept frame and putting numbers where the letters were? If not, it is not the first example |
| **2 — one step** | exactly one new move — a rearrangement, the unknown somewhere else, a unit to convert, the formula applied twice | Can the student name the one thing that changed? |
| **3 — exam** | the paper's dressing: multi-part, a given buried in prose, a distractor | Is it a real DSE part, or written like one? |

Three is a ceiling, not a quota. A 60-second short has room for the mirror alone, and that is the
right one to keep. The two failures are opening at exam level — the usual one, because the
past-paper question is what the lesson was built around — and stopping at the mirror, which sends
the student into the paper having only ever seen the easy shape.

Record the rung of each example in `brief.md`, and for the mirror, write the one line saying what
the student would copy to solve it. If that line is hard to write, the example is not a mirror.

## 8. Solve in motion, then hand over a page

**The solve is animated across both halves of the frame. The answer is one still page.** Both,
every time — they do different jobs and neither covers for the other.

| | |
|---|---|
| **While solving** | figure or graph on one side, derivation on the other, moving **together**: one step, its figure event, one `play()` (rule 18). Colour is the wire between the halves — a quantity named on the right lights the same colour on the left in the same instant |
| **After solving** | one still frame carrying **every** step in marking order, general formula first, held ≥ `REST_RECAP` (4.0 s). Nothing on it moves |

The animation is where the reasoning is taught, and it is worth spending motion and pens on: a
graph that redraws as the parameter changes, a value that slides into the formula from the figure,
a colour that appears on both sides at once. But the animated solution **never exists as a whole**
— by the last step the first has been off the frame for half a minute. A student who wants to
copy the working, or to check their own attempt against it, has nothing to look at.

That is what the page is for. `solution_page()` builds it and raises rather than shrinking; when
it raises, keep the lines a marker awards and drop the algebra in between.

**The page opens on the general formula, and so does the live solve** — see
`on-screen-language.md`, "A solution opens on the formula, not on the numbers".

## 9. Teach the weakest student you have ever taught

**The house standard, and the one that sets the level everything else is written at.**

> You guys are all very smart people, but most of the students are band 2 or 3, not really smart
> enough. Imagine teaching the weakest student you have ever faced.

That student is not stupid and is not to be talked down to. They are someone for whom every
unexplained word is a place to stop listening, and who has already decided that this subject is
not for them. The lesson has about fifteen seconds to prove otherwise.

Two things follow, and they are separate.

### 9a. Start with something they have felt, in words their friends use

**Every knowledge point opens on an everyday situation, in stupid-simple language, before a
single technical word.** Not an analogy invented to be clever — a thing that has actually
happened to them, on a street, in a queue, with a phone in their hand.

The order is always the same, and the term arrives **last**:

| Beat | What happens |
|---|---|
| **1 · The situation** | something they have felt, shown happening. Plain words, short sentences |
| **2 · Vary it** | make it bigger, faster, heavier — so they feel *what it depends on* before anything is measured |
| **3 · The plain word** | the everyday word for what they just felt — 「衝擊」, 「攤薄」, 「頂唔順」 — spoken, and on the caption line |
| **4 · The term** | *that* is what the subject calls it: the bold English term card, bound to the thing on screen (`term()`, `bind_term()`) |
| **5 · The symbols** | only now the formula, with each symbol tied back to a part of the situation |

**Worked example — momentum**, which is where this rule came from:

| Beat | The picture | The narration (Cantonese, plain) | On the frame |
|---|---|---|---|
| 1 | a street; someone runs into you | 「你行緊街，有個人跑過嚟撞到你。」 | nothing — the picture *is* the sentence |
| 2 | the same runner, now much heavier | 「如果撞你嗰個好肥呢？」 | nothing |
| 3 | the same runner, now much faster | 「如果佢跑得快好多呢？」 | nothing |
| 4 | the impact flashes | 「你會覺得個衝擊大好多。」 | nothing — 「衝擊」 is on the **caption line** |
| 5 | the term card lands and pulses with the runner | 「呢個『衝擊』，物理科叫 momentum。」 | **momentum** |
| 6 | `p = mv`; `m` takes the runner's colour, `v` the arrow's | 「佢係咁計嘅。」 | `p = mv` |

The narration column above is the **spoken** Cantonese. The caption's 中文 line is the same
sentence in 書面語 — 「你在街上走，有人跑過來撞到你。」 — because plain means everyday vocabulary,
not 口語 (`narration-and-subtitles.md`).

The **section tag** obeys the same order. It is a section title, so a `Momentum` tag over beats
1–4 hands the student the word the opening exists to make them feel first, and the everyday
opening becomes an illustration of a term already named. The tag lands at beat 5, with the term
card; the shots before it keep the previous section's tag, or none. See hard rule 34.

Note beat 4. **「衝擊」 never goes on the picture** — it is Chinese, and the picture is English
(rule 29). The plain word is spoken and captioned; the picture waits and then shows the English
term. That is not a compromise: the student meets the idea in the language they think in and the
word in the language they are marked in, half a second apart, which is exactly the split the
whole caption track is built on.

**The test:** could a student who has never opened the textbook follow the first fifteen seconds
with no effort? If any word in there needs a definition, it is in the wrong place.

### 9b. Then keep the language plain, and let the terms in one at a time

After the bridge, use the term — that is what it was introduced for, and hiding it afterwards
teaches nothing. What stays banned is everything *around* it:

| | |
|---|---|
| Sentences | short, one clause, one idea. If a cue needs a comma to hold two thoughts, it is two cues |
| Words | the everyday word wherever the technical one is not the thing being taught. `bang into` before `collide`, `push` before `applied force` |
| New terms | **one per cue**, and never before its bridge. Two new terms in one sentence is a sentence nobody finishes |
| Never | a term used casually before it is introduced — including in a cue that is "just setting up" |

The examples follow the same rule: pattern 7's **mirror** example is the first one, and it exists
so the student finds out they can do this. An opening example that needs cleverness has already
lost the student this pattern was written for.

---

## Already elsewhere in this skill

The rest of what is worth borrowing is recorded where it is enforced, not here:

| Pattern | Where |
|---|---|
| Colour = referent, and constant across the whole series | hard rules 6 and 17, `brand-theme.md` |
| Built in step with the narration, never all at once | hard rule 18, `on-screen-language.md` |
| Almost no explanatory prose on the frame — the voice explains | hard rule 15, `on-screen-language.md` |
| The picture is English; 中文 only on the caption track | hard rule 29, `on-screen-language.md` |
| Shot 1 is the locked title card | hard rule 30, `brand-theme.md` |
| The everyday opening, and plain language throughout | hard rule 31, `narration-and-subtitles.md` |
| A concept term is bold wherever it appears | hard rule 26, `on-screen-language.md` |
| A solution's first line is the general formula | hard rule 27, `on-screen-language.md` |
| Transform rather than erase and redraw | motion grammar 2, `brand-theme.md` |
| Stillness after an insight | `REST_AHA` = 1.8 s, `pacing.md` |
