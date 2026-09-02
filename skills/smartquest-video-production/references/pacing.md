# Pacing for teaching video

The audience is a secondary student meeting the idea for the first time, not a viewer being
entertained. The failure mode of an AI-built animation is that everything is always moving and
nothing is ever given time to land.

## The three budgets

Every shot must satisfy all three. They are checkable, so check them.

### 1. Reading budget

```
中文字數 ≤ 鏡頭秒數 × 4.0        # Latin word = 2 字
```

4 字/秒 is a teaching read, not a news read. Faster than that and the teacher has to rush.

**The question stem has its own reading budget, on top of the subtitle.** It is English prose in
a second language, and it is the densest reading in the video:

```
題目秒數 ≥ 英文字數 / 3.5        # ~3.5 words/second，且不少於 4 s
```

Nothing new may appear while the stem is being read for the first time — no figure, no first
step. A stem that is still being read when the derivation starts has been shown rather than read,
and the ponder beat after it is worth nothing. The budget applies once, on the shot where the
stem lands; the later shots of the example carry it as context and owe it nothing.

### 2. Breathing budget

```
靜止時間 ≥ 鏡頭秒數 × 0.25
```

At least a quarter of every shot must have **no new information appearing** — no new object, no
new line of text, no colour change. The narration lives there. Without it the teacher is racing
the animation.

Silence is not dead air. It is when the student looks at the diagram.

### 3. Density budget

```
同時運動的元素 ≤ 3
畫面上同時存在的資訊塊 ≤ 6
```

Beyond three simultaneous movements the eye cannot follow which one matters. Beyond six visible
blocks, dim something to 30% or clear it.

## Rest after a reveal

| What just happened | Minimum still time |
|---|---|
| A supporting label appeared | 0.5 s |
| A step of the derivation appeared | 1.0 s |
| A new object was drawn | 1.0 s |
| **The aha moment** | **1.8 s** |
| The end of a section, before the next begins | 1.2 s |
| **A ponder beat** — the student is handed the problem | **3.0 s** (`REST_PONDER`) |
| **The full-solution page** at the end of a worked example | **4.0 s** (`REST_RECAP`) |

`REST_AHA` in the theme is 1.8 s. It is the longest still moment in the video, deliberately.
Do not trim it to make a duration fit — trim elsewhere.

A ponder beat is longer still, and it is not a rest — it is work being handed over. Nothing moves
and no new information appears, but the question and its given data stay on screen because the
student needs them to think with. The narration says so plainly (「暫停一下，自己做完再繼續。」)
and the hold makes pausing feel invited rather than awkward. One or two per lesson; a video that
keeps stopping is a worksheet. See `references/lesson-patterns.md`.

## Shape of a lesson

One knowledge point per section. A section is: **set up → show → explain → land**.

| Section | Long form (5+ min) | Short (60 s) |
|---|---|---|
| **Title card** | **3–4 s** | **2–3 s** |
| Hook / the question | 20–30 s | 5–8 s |
| Prior knowledge recap | 20–40 s | skip |
| — its everyday opening | 15–25 s of that | 5–10 s of that |
| One knowledge point | 45–90 s each | 30–40 s (one only) |
| The aha | 60–90 s | 15–20 s |
| Worked example — mirror | 40–70 s | 10 s, if any |
| Worked example — one step up | 60–120 s | skip |
| The full-solution page | 4–8 s per example | skip |
| Takeaway | 20–30 s | 5–8 s |

A 5-minute lesson holds about **three** knowledge points. Four is already crowded. If the topic
needs more, it is two videos.

In long form the section is visible to the student, not just to you: the knowledge point sits in
the top-left of every shot it covers, and the tag changing is how a section boundary reads on the
picture (hard rule 34). If two sections would carry the same tag, they are one section.

A 60-second short holds **one** point. Shorts are not compressed lessons; they are one idea with
a hook and a payoff.

## Tempo curve

```
慢（建立） → 中（發展） → 慢而清楚（aha） → 中（應用） → 慢（收結）
```

Note that the aha is **slow**, not fast. The temptation is to make the climax busy. The climax
is where the student most needs stillness.

## Motion vocabulary

Keep it small so the video reads as one system. The theme exposes the approved run times:

| Constant | Seconds | For |
|---|---|---|
| `T_DRAW` | 1.0 | drawing a new object |
| `T_REVEAL` | 1.2 | a line of text or a derivation step |
| `T_TRANSFORM` | 1.5 | morphing an existing object |
| `T_CLEAR` | 0.6 | fading something away |

Prefer transforming an existing object over deleting and redrawing — it shows the student that
the two things are the same thing. Prefer dimming context to 30% over removing it.

## Emphasis

Students need to be told where to look. Use, in order of preference:

1. **Colour** — the semantic palette already carries meaning; use it rather than adding a new signal.
2. **Dim everything else** to 30%.
3. `emphasise()` — a single 1.06× pulse. Once per beat at most.
4. A short text label naming what just happened.

Do not use more than one of these on the same beat.

## Checking a draft

At Gate 3, watch the draft and answer these. If any answer is no, fix the plan, not the render.

- Can a student who has never seen this read every line before it leaves?
- Would the weakest student you have ever taught still be watching at 0:20 — and is there any
  word before the bridge that they would have had to look up?
- Is there a moment of stillness after each knowledge point?
- Does anything move while something else is being read?
- Does the aha moment have room, or does the next thing start too soon?
- Could the teacher speak the script comfortably over this, without rushing?
- On a worked example: is the question readable in every shot of it, and was the stem given time
  to be read before anything else moved?
- Was the **first** example solvable by substitution alone, and does each later one add exactly
  one thing?
- Does each example end on its **full-solution page**, held long enough to copy, with the general
  formula as its first line?
- Does the draft actually carry its soft subtitle track — `ffprobe -select_streams s` — and do the
  cues sit where the plan says?

The last question is the one that matters most, because nobody has recorded anything yet.
