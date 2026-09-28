# Pacing for a concept video

The viewer is Paco, meeting this concept properly for the first time, and **reading while
watching**: there is no voice, so the explanation arrives as captions at the bottom of the frame
while the argument happens in the figure above them. Both want the eyes. Every pacing decision
below exists to share the eyes between them without either one losing.

The failure mode of an AI-built animation is unchanged by that — everything is always moving and
nothing is ever given time to land — but it is worse without a voice. A narrated video can talk
over motion; a captioned one cannot be read over it.

**There is no duration target.** Nothing here is a length to aim at. A shot is as long as its
budgets make it, a video is what its shots add up to, and `durationSeconds` is an output
(rule 39). The only fixed lengths are the minimums below.

## The three budgets

Every shot must satisfy all three. They are checkable, so check them.

### 1. Reading budget

```
中文字數 ≤ 鏡頭秒數 × 4.0        # Latin word = 2 字
```

4 字/秒 is a reading-while-watching rate, not a skim. It is the 中文 line that is counted, because
it is the line read for meaning; the English line underneath is length-gated instead
(`narration-and-subtitles.md`). Faster than 4 字/秒 and the eye spends the whole shot on the
caption band and never gets back to the figure — which, in a video whose animation is the
argument, means the argument was missed.

**A problem statement has its own reading budget, on top of the caption.** It is English prose,
read while a 中文 and an English caption line also compete for the eye, and it is the densest
reading in the video:

```
題目秒數 ≥ 英文字數 / 3.5        # ~3.5 words/second，且不少於 4 s
```

Nothing new may appear while the statement is being read for the first time — no figure, no first
step, and no second caption. A statement still being read when the working starts has been shown
rather than read, and the ponder beat after it is worth nothing. The budget applies once, on the
shot where the statement lands; the later shots of the example carry it as context and owe it
nothing.

### 2. Breathing budget

```
靜止時間 ≥ 鏡頭秒數 × 0.25
```

At least a quarter of every shot must have **no new information appearing** — no new object, no
new line of text, no colour change, **no fresh caption cue**. With no voice, this is where the
reading gets finished: the cue lands with its reveal, the reveal completes, and the still is when
the eye finishes the cue and comes back up to look at what the reveal produced. Without it I am
racing the animation, and the caption is lost or the figure is.

Without a voice this budget matters more, not less. Silence is not dead air. It is when I look at
the diagram.

### 3. Density budget

```
同時運動的元素 ≤ 3
畫面上同時存在的資訊塊 ≤ 6
```

Beyond three simultaneous movements the eye cannot follow which one matters. Beyond six visible
blocks, dim something to 30% or clear it. The caption block is not counted — it is always there —
which is exactly why the picture above it cannot afford to be crowded.

## Reading and watching take turns

The three budgets are per shot. Inside a shot, one rule orders them:

**A cue is never read over the motion it asks me to watch.** Either the cue lands first and
names what is about to happen, and the motion runs once it has been read; or the motion runs and
lands, and the cue explaining it is read in the still that follows. What fails is a new cue and
a meaningful motion competing for the same second — the eye picks one, and it is usually the
words.

This is the constraint the Gate 3 question "does anything move while something else is being
read?" checks. Decorative settling (a label easing into place) is not the problem; the problem is
motion that *is* the argument — the sweep, the swap, the limit closing in — running under a cue
still being read.

### A varied example varies slowly enough to see what stays fixed

A **varied** example (`lesson-patterns.md`, pattern 6) works only if, while one thing changes, I
can see that another does not — the area staying 2 while the shear grows, `c` sliding to keep its
tangent parallel. So:

- the cue that says what to watch lands **before** the sweep starts, and is read before it starts
- the sweep runs with **no new cue** and no other motion — the parameter and what depends on it
  are the only things moving (density budget, ≤ 3)
- the invariant's readout stays on screen and still throughout, in its pen
- each end of the sweep holds still (`REST_BEAT`) before it reverses or stops

There is no fixed sweep speed. The test is at Gate 3: watch the invariant alone through the sweep.
If I cannot confirm by eye that it stayed fixed, the sweep was too fast.

## Rest after a reveal

| What just happened | Minimum still time |
|---|---|
| A supporting label appeared | 0.5 s |
| A step of the derivation appeared | 1.0 s |
| A new object was drawn | 1.0 s |
| **The aha moment** | **1.8 s** |
| The end of a section, before the next begins | 1.2 s |
| **A ponder beat** — the viewer is handed the question | **3.0 s** (`REST_PONDER`) |
| **The recap page**, if an example has one | **4.0 s** (`REST_RECAP`) |

These are floors on top of the reading budget: if the cue that landed with the reveal needs longer
to read at 4 字/秒, the still runs longer.

`REST_AHA` in the theme is 1.8 s. It is the longest still moment after a reveal, deliberately. There
is no duration to fit, so there is never a reason to trim it.

A ponder beat is longer still, and it is not a rest — it is work being handed over. Nothing moves
and no new information appears, but the question and what it needs stay on screen because they
are needed to think with. The caption says so plainly (「暫停一下，先自己想想。」 /
`Pause here and predict it first.`) and the hold makes pausing feel invited rather than awkward.
One or two per knowledge point at most; a video that keeps stopping is a worksheet. See
`references/lesson-patterns.md`, pattern 1.

## Shape of a video

One knowledge point per section, and one Palmier chapter per section. A section is:
**set up → show → explain → land**.

| Part | What it is | Fixed length |
|---|---|---|
| **Title card** | the concept, the brand rule, `COURSE · Lecture N` (rule 30) | **3–4 s** |
| **The opening** | shot 2 — the question or puzzle the video answers (pattern 4) | — |
| Prerequisite re-shown | only if a knowledge point leans on one that is shaky — the picture, not a sentence | — |
| **Per knowledge point:** its concrete opening | the case, varied, the plain word in the caption (pattern 11a) | — |
| — the term and the statement | bold term card bound to the case, then the notes' formal statement | — |
| — the aha | the one beat where the picture makes the statement obvious | still ≥ 1.8 s after it |
| — the examples | concrete first; then varied, broken, connected as the brief chose them | — |
| — a worked problem, if any | statement read, set up, (ponder), compute, land | statement ≥ its reading budget; ponder ≥ 3.0 s |
| — a recap page, if any | only after a long computation | ≥ 4.0 s |
| — the land | a still beat before the next section's opening | ≥ 1.2 s |

The dashes are deliberate. Each of those parts takes what its budgets and its content need, and
the total is reported at Gate 1 as what it came to — never planned to a number, never trimmed to
one.

**When a video gets long, split it; never compress it** (rule 39). If the concept map falls into
two groups and the first is a complete understanding on its own, or the video would run well past
the lecture segment it explains, make it two videos at a knowledge-point boundary
(`lesson-patterns.md`, pattern 12). Cutting the varied example, running the algorithm faster or
dropping the broken case to keep one file is the false economy this skill forbids.

The section is visible on the picture, not just to you: the knowledge point sits in the top-left of
every shot it covers, and the tag changing is how a section boundary reads (hard rule 34). If two
sections would carry the same tag, they are one section.

## Tempo curve

```
慢（建立） → 中（發展） → 慢而清楚（aha） → 中（例子） → 慢（收結）
```

Note that the aha is **slow**, not fast. The temptation is to make the climax busy. The climax
is where the viewer most needs stillness — and, reading while watching, most needs the caption
that names it to be read *before* the next thing moves.

## Motion vocabulary

Keep it small so the video reads as one system. The theme exposes the approved run times:

| Constant | Seconds | For |
|---|---|---|
| `T_DRAW` | 1.0 | drawing a new object |
| `T_REVEAL` | 1.2 | a line of text or a derivation step |
| `T_TRANSFORM` | 1.5 | morphing an existing object |
| `T_CLEAR` | 0.6 | fading something away |
| `REST_BEAT` | 1.0 | the still after a normal reveal |

Prefer transforming an existing object over deleting and redrawing — it shows that the two things
are the same thing. Prefer dimming context to 30% over removing it.

## Emphasis

With no voice to say *look here*, the frame has to say it. Use, in order of preference:

1. **Colour** — the semantic palette already carries meaning; use it rather than adding a new signal.
2. **Dim everything else** to 30%.
3. `emphasise()` — a single 1.06× pulse. Once per beat at most.
4. A short text label naming what just happened.

Do not use more than one of these on the same beat.

## Checking a draft

At Gate 3, watch the draft with the captions on and the sound off — which is how it will be
watched — and answer these. If any answer is no, fix the plan, not the render.

- Can every caption be read, at the speed it plays, **while the picture is also being watched** —
  before the cue leaves?
- Pitched at me — prerequisites known, this concept not: is there any word before the bridge that
  I would have needed this concept's definition to understand?
- Does every reveal get its still beat, and is there a moment of stillness at the end of each
  knowledge point?
- Does anything that *is* the argument move while a cue is still being read?
- Does the aha land on its caption, and does it have room — or does the next thing start too soon?
- On a varied example: can I see, by eye, that the invariant stayed fixed through the sweep?
- On a worked problem: is the statement readable in every shot of it, and was it given time to be
  read before anything else moved?
- Is the **first** example of each knowledge point concrete, and does it come before the general
  statement? Does each later example do the job its role names — varied, broken, connected?
- Is the first line of every computation the general form? If an example has a recap page, is it
  still and held ≥ `REST_RECAP`?
- Read only the captions and watch only the picture, separately: is there any stretch where
  neither says what is happening?
- Does the draft actually carry its soft caption track — `ffprobe -select_streams s` — and do the
  cues sit where the plan says?

The first question is the one that matters most, because there is no voice to rescue a caption
that cannot be read in time.
