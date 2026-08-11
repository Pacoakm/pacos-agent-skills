# On-screen language

**The picture speaks mathematics. The subtitle and the teacher speak Chinese.**

Everything a student must *read as a sentence* belongs in the caption track and the narration.
Everything on the frame itself should be the thing being taught: the figure, the symbols, the
equation, the ratio, the marks.

## Why

Prose on the frame competes with the diagram for the same pair of eyes. A student reading
「較長一段連着頂點」 is not looking at the median while it is being drawn — and the sentence is
already being said out loud, so the frame is spending its most valuable space repeating the
narration.

There is a second reason, specific to DSE. The paper is in English and in symbols. A student who
has watched an explanation carried by `AO : OM = 2 : 1` has practised reading the notation they
will be marked on. A student who has watched it carried by a Chinese sentence has not.

## What may appear on the frame

| Kind | Allowed | Example |
|---|---|---|
| **Title** | one per shot, short | `1 · centroid` |
| **Mathematics** | unlimited — this is the point | `AO : OM = 2 : 1`, `\vec{v}_1`, `x_1y_2z_3 - x_1z_2y_3` |
| **Figure labels** | point names, short object names | `A`, `B`, `C`, `O`, `M` |
| **Term cards** | the English DSE term alone, bound to a colour | `median`, `inscribed angle` |
| **DSE reasons** | the marker's exact wording, with the step it justifies | `ext. ∠ of △` |
| **A step list** | **only on its own slide** — see below | `① 先找出兩個平面的交線。` |
| **Explanatory prose** | **never** | ~~較長一段連着頂點~~, ~~永遠在 triangle 內~~, ~~三條 median 的交點~~ |

A term card is the term and nothing else. `median` is a term card; 「三條 median 的交點」 is a
sentence wearing a term as a hat, and it goes to the subtitle.

## The budget

Per shot, counting only text on the picture — not captions:

```
解釋性文字 = 0 字
非數學文字（title + labels + term cards）≤ 12 字   # 拉丁詞當 2 字
```

If a shot needs a sentence to make sense, the sentence goes in the subtitle and the **frame needs
a better picture**, not smaller type. That is the whole rule.

Count it in the storyboard, before anything is animated.

## The one exception: a step list, on its own slide

An **enumerated procedure** is the one thing narration and subtitles genuinely cannot carry. A
subtitle is linear and transient: by the time the student hears step ③ the words of step ① are
gone, so they never see the *shape* of the procedure — how many steps there are, which one they
are in, what is still coming. A list persists and shows all of that at once.

So a numbered or bulleted list of steps, conditions or criteria **may** be on screen, under one
condition:

> **When the list is on screen, the frame is a slide.** No figure, no graph, no displayed
> equation. Nothing else competes with it.

This is the same principle as the rest of this document, not an exception to it. Prose is banned
beside a figure because it steals the eyes from the figure. A slide has no figure to steal from —
the words *are* the content of the shot. What is forbidden is the hybrid: a list of sentences
parked next to a diagram, so the student can do neither properly.

### Rules for a list slide

| | |
|---|---|
| Items | ≤ 5. Beyond that it is a reference card, not a teaching beat |
| Each item | ≤ 20 字, one line, no sub-clauses |
| Inline symbols | fine and encouraged — `⊥`, `∠`, `AD`, `2 : 1`. A symbol inside a sentence is not a displayed formula |
| Displayed mathematics | **none** — if the shot needs an equation, it is not a list slide |
| Figure | **none** — not even dimmed in the background |
| Entrance | items appear **one at a time**, each on the narration beat that explains it (rule 17) |
| After | cut to the figure and *carry out* the steps. The list is the map; the figure is the territory |

Revealing the items one by one is what makes the list teaching rather than a wall of text: the
student is never reading ahead of the teacher, and the item currently arriving is the item being
spoken. Keep the completed list on screen to the end of the shot.

The ≤ 12 字 budget above does **not** apply to a list slide — it is the budget for text sharing a
frame with a picture, and a slide has no picture. Every other rule still applies: Manim text from
the theme helpers, 書面語, English subject terms, and the reading budget, so the shot must be long
enough to read the whole list *and* hear the narration.

### When it is not a list

Do not reach for a list to escape the prose ban. Three conditions to check:

1. **Is it genuinely ordered or enumerated?** ①②③ that must happen in sequence, or a fixed set of
   criteria — not three loose remarks with numbers stuck on them.
2. **Would losing the order lose the meaning?** If the items could be spoken in any order, they
   are prose, and they belong in the narration.
3. **Does the figure need to be gone?** If the student must see the diagram while reading, the
   design is wrong — either the point belongs on the figure as mathematics, or it is a separate
   slide beat.

## Translating prose into mathematics

This is the actual work. Each of these replaces a sentence with something the frame can show.

| Instead of the sentence | Put on the frame |
|---|---|
| 「較長一段連着頂點」 | the point `O`, the point `M`, and `AO : OM = 2 : 1` |
| 「這兩段相等」 | equal-length tick marks — `ticks()` |
| 「這條線是 median」 | tick marks on the bisected side + a `median` term card in the line's colour |
| 「這兩個角相等」 | the same arc marker and the same colour on both angles |
| 「永遠在 triangle 內」 | animate it — drag a vertex, let the student watch the point stay inside |
| 「因為是 isosceles triangle」 | the DSE reason itself: `base ∠s, isos. △` |
| 「面積變成原來的三倍」 | `\det = 3` beside the parallelogram, as the area animates |
| 「隨着 x 增大」 | an arrow on the axis, or a `ValueTracker` readout that the student watches move |

Note the fifth row. **A property that holds under variation is stated by varying it**, not by
asserting it in words. That is what animation is for, and it is the one thing a static textbook
cannot do.

## Binding a colour to a term

The student has to learn that the purple lines *are* the medians. Say it once, visually, then
never write it again:

1. Draw the figure with the medians in `AUX` purple.
2. Put the word `median` in the same purple in the margin — a term card, on its own.
3. **Flash the lines and the word together, twice.** The simultaneity is the sentence.

`bind_term()` does exactly this:

```python
meds = VGroup(*medians).set_color(AUX)
card = label("median", color=AUX).next_to(stage.figure_box(), RIGHT)
self.play(*bind_term(meds, card))       # two synchronised pulses
```

After that binding, purple means median for the rest of the video, and no frame ever has to say
so again. This is why rule 6 — never change a colour's meaning — matters more in this style than
in a caption-heavy one: the colour is now carrying the definition.

## Worked example — the centroid frame

**Before** (five separate pieces of prose competing with the figure):

```
title:  1 · centroid：三條 median
right:  三條 median 的交點
        2 : 1
        較長一段連着頂點
        永遠在 triangle 內
```

**After**:

```
title:  1 · centroid
figure: △ABC, medians in purple, centroid O marked,
        midpoint M labelled on the side AO crosses,
        tick marks on each bisected side
right:  median            ← term card, purple, bound by a double flash
        AO : OM = 2 : 1   ← O and M are on the figure, so this reads itself
```

`較長一段連着頂點` disappears from the frame entirely — `AO : OM = 2 : 1` says it, because `A` is
a vertex and the student can see which segment is longer. `永遠在 triangle 內` disappears too, and
becomes a beat where a vertex is dragged and the point visibly stays inside. Both sentences are
still *spoken*, and both still appear as subtitles. They just leave the picture.

On-screen non-mathematical text drops from about 30 字 to 8.

## Checks

At the storyboard, per panel:

- Count the non-mathematical characters. Over 12 字, or any complete sentence → redesign the
  panel, do not shrink the type.
- For every sentence you removed, name where it went: subtitle, narration, or an animated beat.
- For every term card, name the shot where it was bound to its colour.
- Ask of each remaining word: *would the frame still teach this if I deleted it?* If yes, delete
  it.

## What this is not

This is not minimalism for its own sake, and it is not the 3Blue1Brown black field — the
SmartQuest theme still applies. A DSE reason on screen next to the step it justifies is
**required**, not prose, because the student is being marked on writing it. Keep those.
