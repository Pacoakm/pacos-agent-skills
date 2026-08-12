# Lesson patterns

How a lesson is *sequenced*, as distinct from what is on the frame
(`on-screen-language.md`), how long things take (`pacing.md`), or how they look
(`brand-theme.md`).

These are adapted from 3Blue1Brown's practice. A caveat worth keeping: he has published no style
guide, so these are observations of the work rather than rules he stated. They are here because
they survive the translation to a DSE lesson, not because they are anyone's authority.

Answer all five in `brief.md`. They are part of what the user approves at Gate 1.

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

Record it as `ponder` on the shot: `{"prompt": "求 ∠BAD", "holdSeconds": 3.5}`. A long-form
lesson with a worked example and no ponder beat should be questioned at Gate 1.

Do not stack them. One or two per lesson; a video that keeps stopping is a worksheet.

## 2. Behaviour before name

**Show the thing doing its thing, then name it.** Never open a section with a definition.

| | |
|---|---|
| ✅ | the three lines are drawn, they visibly meet at one point — *then* the `median` card appears and binds to their colour |
| ❌ | 「median 是連接頂點與對邊中點的線段」 first, then a drawing of one |

A name given before the behaviour is a label on something the student has not met, so it has
nothing to attach to and must be memorised. A name given after is a handle for something they
have already seen — which is the difference between recall and understanding.

`bind_term()` is the mechanism; this is the ordering rule that decides *when* to call it.

## 3. Concrete before general

**Work real numbers first, then lift to the formula.**

Especially right for DSE, where the paper itself is concrete: the student meets `12`, `13` and
`72°`, not `a`, `b` and `C`. Do the numbers on the actual figure, and only then show that the
same steps hold for any triangle.

The order also protects the *marks*: the general statement is what earns the reason line
(`sine formula`), and it lands better once the student has already seen it work once.

If a lesson only ever shows the general form, ask at Gate 1 what specific case it was derived
from — and put that case in the video.

## 4. The hook is a question, not an announcement

The opening shot poses something the student wants the answer to. 「今日我們講 centroid」 is a
table of contents, not a hook; it gives no reason to keep watching and no frame to hang the next
four minutes on.

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
| **Illustration** | the sentence 「centroid 永遠在 triangle 內」 with a static picture of one triangle beside it |

Not every step can reach this bar; algebraic manipulation often genuinely cannot. That is fine —
but say so in `brief.md` rather than assuming. Naming which beats are arguments and which are
illustrations is usually enough to find one beat that could be promoted, and one promoted beat
per lesson is a large difference.

This is also where the **aha moment** should sit. If the aha is a sentence rather than something
the student watches happen, the lesson has an aha in name only.

---

## Already elsewhere in this skill

The rest of what is worth borrowing is recorded where it is enforced, not here:

| Pattern | Where |
|---|---|
| Colour = referent, and constant across the whole series | hard rules 6 and 17, `brand-theme.md` |
| Built in step with the narration, never all at once | hard rule 18, `on-screen-language.md` |
| Almost no explanatory prose on the frame — the voice explains | hard rule 15, `on-screen-language.md` |
| Transform rather than erase and redraw | motion grammar 2, `brand-theme.md` |
| Stillness after an insight | `REST_AHA` = 1.8 s, `pacing.md` |
