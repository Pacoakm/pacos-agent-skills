"""SmartQuest video theme for Manim Community Edition.

Import this in every lesson scene. It fixes the palette, the typography and the
layout so a series looks like one series, and so the same scene code renders
both the 16:9 lesson and the 9:16 short.

    from smartquest_theme import *

    class S01Hook(SQScene):
        def construct(self):
            self.setup_stage()
            fig = self.stage.figure_box()
            ...

The field is a flat dark — one colour, no gradient — and the mathematics is
Computer Modern, in the 3Blue1Brown manner. What stays SmartQuest is the colour
set, brand_rule(), and the sans caption track. Every colour here was measured
against that background — see the palette block; the previous light-theme inks
all fail on it.
"""
from manim import *
import numpy as np
import re

# --------------------------------------------------------------- palette ----
# Dark field, in the 3Blue1Brown manner. A near-black rather than pure black:
# the slight cool lift keeps the brand's indigo temperature and is gentler on a
# phone at night, and it costs almost nothing in contrast.
#
# The field is FLAT — one colour, no wash. The earlier top-to-bottom gradient
# made every contrast ratio a range rather than a number, and it broke the text
# halo: halo() paints a BG-coloured stroke under the glyphs, which only
# disappears where the background is exactly BG, so a label near the top of the
# frame carried a visible dark patch. A flat field makes the halo invisible
# everywhere and the measurements below exact.
#
# EVERY value below was re-measured against this background. The previous light
# theme used 700-level inks, and all five of them FAIL on dark — blue-700 3.13:1,
# violet-700 2.96:1, rose-700 3.34:1, emerald-700 3.83:1, orange-700 4.06:1.
# The palette is therefore shifted to the 400 level, which keeps our hues (that
# is the SmartQuest difference from 3b1b's blue/yellow) while clearing 4.5:1 with
# a large margin.
BG = "#0B0E14"          # cool near-black — the whole field, flat
INK = "#E9EDF7"         # main type — cool near-white            16.48:1
MUTED = "#98A3BA"       # captions, secondary notes, DSE reasons  7.62:1
LINE = "#6B7893"        # neutral geometry                        4.35:1

# Teaching semantics — the same eight hues as the light theme, one tonal step
# lighter so they read on the dark field. Hue separation checked: minimum 25.2°
# across all eight pens.
GIVEN = "#60A5FA"       # blue-400     what the question gives you    7.60:1
UNKNOWN = "#FB923C"     # orange-400   what you are solving for       8.53:1
RESULT = "#34D399"      # emerald-400  a confirmed result            10.05:1
WARN = "#FB7185"        # rose-400     the misconception, the trap    7.18:1
AUX = "#A78BFA"         # violet-400   construction, first-use terms  7.10:1

BRAND_FROM = "#7B8CF0"  # gradient start — brand primary, lifted for dark
BRAND_TO = "#B06BFF"    # gradient end

# Captions are the one layer that stays sans and stays OUR type, so they read as
# a separate track laid over the lesson rather than part of the mathematics.
CAPTION_INK = "#F2F5FC"                                        # 17.70:1
# Accent for a first-use English term. NOT a teaching semantic — the eight
# semantic colours belong to the figure, this one belongs to the text.
CAPTION_TERM = "#FBBF24"   # amber-400
CAPTION_LINE_GAP = 0.16   # gap between wrapped lines WITHIN one language
# Gap between the 中文 block and the English block. Larger than the
# within-language gap, because at equal spacing a wrapped two-line Chinese cue
# and its English line read as one four-line paragraph and the eye cannot tell
# which lines belong together. The ratio, not the number, is the point.
#
# 1.30, down from 1.75: rendered side by side at 1.75 / 1.45 / 1.25 / 1.10, the
# block still separates cleanly well below 1.75, because the gap is not the only
# thing marking the boundary — the English is 0.78 the size, and the change of
# script does the rest. Only around 1.1 does it start reading as one paragraph.
# The tighter gap gives the height back to the lesson.
CAPTION_LANG_GAP = CAPTION_LINE_GAP * 1.30

PALETTE = dict(bg=BG, ink=INK, muted=MUTED, line=LINE, given=GIVEN,
               unknown=UNKNOWN, result=RESULT, warn=WARN, aux=AUX)

# ------------------------------------------------------------ typography ----
# Mathematics is Computer Modern — Manim's stock TeX template, which is the
# 3Blue1Brown look. The earlier sans build (helvet + sfmath) is gone.
#
# Chinese has no Computer Modern, so it is set in a 繁中 serif to sit with it:
# Songti TC, a 宋体/明體 whose stroke modulation matches CM's. PingFang was the
# light theme's face and is now reserved for captions, which keeps the caption
# track visibly a separate layer laid over the lesson.
# THE PICTURE IS IN ENGLISH. Every string on the frame — title, label, term
# card, list item, question, DSE reason — is the English the paper uses, and the
# 中文 lives on the caption track and nowhere else (hard rule 29). title(),
# body(), label(), term() and question_text() RAISE on a CJK character rather
# than setting it, because a Chinese line on the picture is a design decision
# that has to be reversed, not a font problem to be solved at render time.
#
# Songti TC therefore no longer sets anything on the picture. It stays as the
# fallback for the handful of Unicode maths symbols (∠ △ ⊥ ° ′) that TeX has no
# text-mode command for — write those as LaTeX (`$\angle BAD$`) and they go
# through Computer Modern like everything else.
FONT_TEXT = "Songti TC"     # symbol fallback only — never a sentence
WEIGHT_TEXT = NORMAL        # Songti has no Medium; NORMAL is the design weight
FONT_CAPTION = "PingFang HK"   # captions only — sans, so the track reads apart
WEIGHT_CAPTION = BOLD
# A concept term is set BOLD wherever it appears on the picture — the term card,
# a term inside a 中文 body line, a term in the recap. The term is what the
# student is examined on naming, and it is usually the only English word in a
# frame of Chinese and mathematics, so it has to be findable at a glance rather
# than hunted for. Colour already carries reference (rule 17) and cannot double
# as emphasis, so weight is what is left. Computer Modern has a real bold and
# Pango synthesises one for Songti; both read at 480p draft resolution.
# See on-screen-language.md, "A concept term is bold".
WEIGHT_TERM = BOLD
# DM Sans is gone. Titles are Computer Modern like everything else on the frame,
# so the whole lesson is set in one face and only the caption track differs.
# SmartQuest identity is now carried by the colour set and brand_rule().
FONT_DISPLAY = FONT_TEXT    # deprecated alias — DM Sans is no longer used
DISPLAY_MIN = 22            # deprecated alias — kept so old scenes still import

# Manim's stock template IS Computer Modern, so the theme simply stops
# overriding it. TEX_SANS is kept as a name so existing scenes do not break, but
# it now resolves to the same stock template.
TEX_MAIN = TexTemplate()
TEX_SANS = TEX_MAIN         # deprecated alias — the sans build was removed
config.tex_template = TEX_MAIN   # a default, but NOT something to rely on:
# Manim re-initialises config between scenes when several are rendered in one
# command. Always build mathematics with mtex()/step(), which pass the template
# explicitly.
#
# After this change, CLEAR THE TEX CACHE — media/Tex is keyed by the expression,
# not the preamble, so old sans SVGs are silently reused (trap #4):
#     rm -rf media/Tex media/texts


SIZE_TITLE = 52
# The line under the brand rule on the title card: subject, paper and syllabus
# code. Measured off the locked card at 0.62 of the title, which is body size.
SIZE_TITLE_SUB = 32
SIZE_HEADING = 38
SIZE_BODY = 32
# A figure label is read at a glance while the student is looking at the
# diagram, not the text — it needs to be nearly body size, not caption size.
SIZE_LABEL = 30
# set_stroke() width is not in scene units. Measured at 1080p: stroke_width 100
# renders exactly 1.0 scene unit, and the ratio holds at any resolution.
STROKE_PER_UNIT = 100.0
# Visible halo thickness OUTSIDE the glyph, as a fraction of text height.
# Chosen by rendering 0.06/0.09/0.12/0.16 at SIZE_LABEL over crossing strokes:
# 0.06 still lets a line graze the glyphs, 0.09 clears them, 0.12 clears them
# with margin on a busy figure, and past ~0.16 the halo takes visible bites out
# of the drawing. Judge this on a 1080p frame at real label size — an
# exaggerated diagnostic render makes any halo look far too heavy.
HALO_RATIO = 0.12
# Fixed for every cue in a film, but smaller in portrait: the same scene-unit
# size is a much larger share of a 9:16 frame, and a phone needs less.
#
# Came down from 28/24 when the caption became bilingual and the band it needed
# started eating the lesson. Measured as a share of frame height — the figure
# that decides legibility, since it is what the eye subtends:
#
#         size   cap height   % of frame height   字 per line
#   16:9    24        42 px         3.91%            39.9
#   9:16    20        63 px         3.26%            15.2
#
# Streaming subtitles run about 4.2–4.6% of frame height and broadcast guidance
# floors at roughly 3.3%, so this sits between the two: smaller than a Netflix
# caption, comfortably above the floor, and it buys back line capacity as well
# as band — a 9:16 line went from 12.6 全形字 to 15.2, so an ordinary cue now
# sets on ONE line where it used to wrap.
SIZE_CAPTION = 20 if config.pixel_height > config.pixel_width else 24
# The English line of a bilingual cue is SMALLER than the Chinese, because the
# Chinese is the line being read and the English is the line being learned —
# see narration-and-subtitles.md. Set them the same size and the block reads as
# two competing sentences instead of one cue with a gloss under it.
#
# 0.78, not lower: PingFang's Latin already has a small x-height for its em, so
# English at the same nominal size looks smaller than the Chinese before any
# ratio is applied. Below about 0.75 the English stops being readable on a phone
# at all, and above about 0.85 the two lines stop being distinguishable.
CAPTION_EN_RATIO = 0.78
SIZE_CAPTION_EN = round(SIZE_CAPTION * CAPTION_EN_RATIO)   # 19 landscape, 16 portrait
SIZE_MIN = 22
# The DSE question, set in the paper's own English at the top of the frame. It
# is REFERENCE text — read once, then referred back to — so it sits below body
# size and in MUTED, leaving INK and the pens for the figure and the derivation.
# The live part is one step up and in INK, because that is the thing being
# answered right now. See on-screen-language.md, "The question band".
SIZE_QUESTION = 24
SIZE_QUESTION_PART = 26

# The section tag: the knowledge point, in the top-left of the title band. It is
# FURNITURE, not content — findable when the student looks up, invisible when
# they do not — so it sits between the question stem (24, the reference text of
# the frame) and a figure label (30, read at a glance).
#
# Measured in the title band, 16:9: a cap-height line sets 0.205 units, 2.6% of
# frame height, 28 px at 1080p; with a descender, 0.258. Set at title_y that
# spans y 3.43–3.69, so it clears the top of the frame by 3.9% of the height and
# still sits 0.23 above content_top — the tag lives entirely inside a band the
# layout already reserved, and costs the lesson no room at all.
#
# It is deliberately below caption size (3.9% of height): the caption is read,
# the tag is glanced at, and a tag that competes with the caption for attention
# is a tag the student reads instead of the lesson.
SIZE_SECTION = 28

# The full-solution page that closes a worked example holds every step at once,
# and those steps are being RE-read rather than met for the first time — so it
# is the one block that sets below heading size. It is not a licence to shrink a
# live derivation: solution_page() raises rather than scaling any further.
SIZE_SOLUTION = 26


# ---------------------------------------------------------------- layout ----
def sync_frame():
    """Make the logical frame match the pixel aspect ratio.

    THIS IS NOT OPTIONAL FOR SHORTS. `manim -r 1080,1920` changes the pixel
    canvas but leaves `frame_width`/`frame_height` at 14.222 x 8 (16:9), so the
    scene is laid out for a landscape frame and squeezed into a portrait canvas
    — it renders without any error and simply looks wrong.

    This runs at *import* time (see the bottom of this module), because Manim
    builds the camera from `config` when the Scene is instantiated, which is
    before `construct()` executes. Calling it from inside a scene is too late
    for the camera, even though the layout tokens would look correct.
    """
    px = config.pixel_width / config.pixel_height
    if abs(config.frame_width / config.frame_height - px) > 1e-3:
        config.frame_width = config.frame_height * px
    return config.frame_width, config.frame_height


sync_frame()   # import-time: must precede Scene instantiation


class Stage:
    """Aspect-aware layout tokens.

    Read from `config`, so the same scene code lays out correctly at 1920x1080
    and at 1080x1920. Never hard-code a coordinate that assumes one of them.
    """

    def __init__(self):
        self.w, self.h = sync_frame()
        self.portrait = self.h > self.w
        # Reserved bands. The caption band must hold the platform-UI margin
        # PLUS the largest bilingual cue the format allows, because captions
        # wrap rather than shrink — an under-sized band does not clip the
        # caption, it lands the caption on the diagram.
        #
        # Measured, not guessed. Block heights in scene units on the 8-unit
        # frame at the caption sizes above, with the bottom offset under them:
        #
        #            1zh+1en   2zh+1en   2zh+2en   offset   band needed
        #   16:9       0.763     1.231     1.605    0.480   0.214 / 0.261
        #   9:16       0.673     1.089     1.426    1.400   0.311 / 0.353
        #
        # 16:9 reserves for 2zh+1en, because build_captions.py holds the
        # English to ONE line there — a 16:9 line fits 102 Latin characters, so
        # a second English line means the sentence was too long, not that the
        # frame was too narrow. 9:16 reserves the full 2+2: a portrait line
        # holds about 38 characters, and exam English does not always fit that,
        # so two English lines are the format in a short rather than a fault.
        #
        # 9:16 is 1.4 units of platform-UI clearance before a word is set, so
        # the band there is mostly NOT the type — shrinking the caption from 24
        # to 20 moved it only 0.40 → 0.38. What would move it is the 2+2
        # reservation: hold a short's 中文 to one line and the band goes to 0.31.
        self.caption_band = self.h * (0.37 if self.portrait else 0.23)
        self.title_band = self.h * (0.11 if self.portrait else 0.10)
        self.margin = self.w * 0.045
        # Set by question_band_for() on a worked-example shot; 0 everywhere
        # else, so a scene that never asks for a question band lays out exactly
        # as it did before the band existed.
        self.question_band = 0.0
        # Set by section_tag(). None on a shot that carries no tag — the title
        # card, an end card, any 9:16 short.
        self._tag = None

    # -- anchors ------------------------------------------------------------
    @property
    def title_y(self):
        return self.h / 2 - self.title_band * 0.55

    @property
    def caption_bottom(self):
        """Bottom edge of the caption block.

        Captions are anchored by their bottom, not their centre, so a one-line
        and a two-line cue share a baseline and the block grows upward. In
        portrait this sits clear of the ~15% of height that Shorts/Reels/TikTok
        cover with their own UI.
        """
        return -self.h / 2 + self.h * (0.175 if self.portrait else 0.060)

    @property
    def caption_y(self):
        """Deprecated centre anchor — prefer caption_bottom."""
        return self.caption_bottom + 0.25

    @property
    def content_top(self):
        return self.h / 2 - self.title_band - self.question_band

    @property
    def content_bottom(self):
        return -self.h / 2 + self.caption_band

    @property
    def content_center(self):
        return UP * (self.content_top + self.content_bottom) / 2

    @property
    def content_height(self):
        return self.content_top - self.content_bottom

    # -- regions ------------------------------------------------------------
    def figure_box(self):
        """(centre, width, height) for the main diagram.

        Landscape puts the figure left and leaves a panel column on the right.
        Portrait puts the figure on top and the panel underneath, because a
        side column is unreadable at 1080 wide.
        """
        if self.portrait:
            h = self.content_height * 0.60
            c = np.array([0.0, self.content_top - h / 2, 0.0])
            return c, self.w - 2 * self.margin, h
        w = (self.w - 2 * self.margin) * 0.52
        c = np.array([-self.w / 2 + self.margin + w / 2, self.content_center[1], 0.0])
        return c, w, self.content_height

    def panel_box(self):
        """(top-left anchor, width) for the derivation / readout column."""
        if self.portrait:
            _, _, fh = self.figure_box()
            top = self.content_top - fh
            return np.array([-self.w / 2 + self.margin, top, 0.0]), self.w - 2 * self.margin
        fc, fw, _ = self.figure_box()
        x = fc[0] + fw / 2 + self.margin
        return np.array([x, self.content_top, 0.0]), self.w / 2 - self.margin - x

    def fit_panel(self, mobject):
        _, w = self.panel_box()
        if mobject.width > w:
            mobject.scale_to_fit_width(w)
        return mobject

    # -- the section tag -----------------------------------------------------
    def section_tag(self, name, color=MUTED, size=SIZE_SECTION):
        """The knowledge point this shot is on, set small in the top-left.

            st = self.setup_stage()
            self.add(st.section_tag("Plane to Plane"))   # furniture: no beat

        A 5-minute lesson holds three or four knowledge points and one figure
        usually carries across several of them, so a student who looks up
        mid-shot has nothing on the frame telling them which one they are in.
        The tag answers that from the corner of the eye: MUTED, one step above
        the question stem, never animated, never narrated.

        Long form only — it RAISES in 9:16. A short is one knowledge point, so
        the tag would be labelling the whole video, and the portrait title band
        is 11% of a frame that already gives 37% to captions.

        Call it BEFORE `question()`: the stem then lays out under the tag.
        Calling it after sets the paper's words across the heading.

        Keep it to the knowledge point in the paper's English — `Plane to
        Plane`, `Line to Plane`, `Momentum` — four words at most, no sentence,
        no trailing stop. A leading section number (`2 · Plane to Plane`) is
        allowed; use it on every section or on none.

        In a `ThreeDScene` — which is what a 3D lesson subclasses, since SQScene
        is a 2D base — register it with `add_fixed_in_frame_mobjects(tag)`, not
        `add()`. A plain `add()` makes it an ordinary 3D mobject that the camera
        projects: it tilts and drifts with every camera move, and nothing errors.

        Every shot of one knowledge point builds the SAME tag from the scene's
        shared helper (contract invariant 10): a tag that re-wraps or shifts
        between two shots is a jump cut in the corner of the frame. The tag
        changes only where the knowledge point does, and it arrives with the
        term — never before the everyday opening has bridged to it (rule 31,
        contract invariant 19).
        """
        if self.portrait:
            raise ValueError(
                "section_tag() is long form only. A 9:16 short is ONE knowledge "
                "point, so a tag there labels the whole video rather than the "
                "section, and the portrait title band is 11% of a frame that "
                "already spends 37% on captions. Drop the tag in the short; the "
                "title card has already named the topic.")
        if self.question_band:
            raise ValueError(
                "section_tag() must be called BEFORE question() — the stem is "
                "laid out under the tag, and by now it is already placed.")
        text = str(name).strip()
        if not text:
            raise ValueError(
                "section_tag() needs the knowledge point, e.g. "
                '"Plane to Plane". A shot with no tag simply does not call it.')
        _english_only(text, "section_tag()")
        if text[-1] in ".:;,":
            raise ValueError(
                f"section_tag({text!r}): the tag is a name, not a sentence — "
                "drop the trailing punctuation.")
        words = [w for w in re.split(r"\s+", text.split("·")[-1]) if w]
        if len(words) > 4 or len(text) > 32:
            raise ValueError(
                f"section_tag({text!r}) is {len(words)} words / {len(text)} "
                "characters (max 4 / 32). The tag is read from the corner of "
                "the eye, so it has to be graspable without being read: name "
                'the knowledge point ("Angle Between Two Planes" -> "Plane to '
                'Plane"), and put the explanation on the caption track.')
        t = Tex(_texify(text), color=color, font_size=_pt(size),
                tex_template=TEX_MAIN)
        limit = (self.w - 2 * self.margin) * 0.42
        if t.width > limit:
            raise ValueError(
                f"section_tag({text!r}) sets {t.width:.2f} units wide, past the "
                f"{limit:.2f} the top-left corner holds. Past that it stops "
                "being furniture and starts being a headline that the figure "
                "has to work around. Shorten the wording.")
        t.move_to(np.array([-self.w / 2 + self.margin + t.width / 2,
                            self.title_y, 0.0]))
        self._tag = t
        return t

    @property
    def tag_box(self):
        """(x0, x1, y0, y1) the section tag occupies, or None if there is none.

        `check_framing.py` reads it, so a 3D figure can be measured against the
        tag before a frame is rendered — a projected solid fills the frame far
        more of the time than a 2D figure does, and it is what runs under the
        corner.
        """
        if self._tag is None:
            return None
        pad = self.h * 0.015
        return (self._tag.get_left()[0] - pad, self._tag.get_right()[0] + pad,
                self._tag.get_bottom()[1] - pad, self._tag.get_top()[1] + pad)

    # -- the question band ---------------------------------------------------
    def question(self, stem, part=None, gap=None):
        """The DSE question, laid across the top and reserving its own band.

        `stem` is the question as the paper prints it, in English, in LaTeX —
        inline mathematics in `$...$`. `part` is the sub-part being answered in
        THIS shot, e.g. `r"(a)(i) Find the equation of $\\Gamma$."`.

        The stem is the same mobject in every shot of the worked example and the
        part is the only thing that changes, so build both from one helper shared
        by the scenes (contract invariant 10) — a stem that re-wraps between two
        shots is a jump cut.

        CALL THIS BEFORE `figure_box()` / `panel_box()`. It moves `content_top`
        down by the height of the band, so the figure and the derivation lay out
        under the question instead of behind it. And call it AFTER
        `section_tag()`, which the stem is laid out under.

        Raises if the band would eat the frame — that is the signal to cut the
        stem to what the part actually needs, or to split the part across two
        shots, never to shrink the type.
        """
        width = self.w - 2 * self.margin
        grp = VGroup(question_text(stem, width=width))
        if part:
            grp.add(question_text(part, size=SIZE_QUESTION_PART, color=INK,
                                  width=width))
        grp.arrange(DOWN, aligned_edge=LEFT, buff=self.h * 0.030)
        grp.to_edge(UP, buff=self.h * 0.050)
        grp.align_to(np.array([-self.w / 2 + self.margin, 0.0, 0.0]), LEFT)
        if self._tag is not None:
            # The tag owns the top-left, so the stem starts under it rather
            # than across it. The gap is 5.5% of the frame height, not the 3%
            # that separates the stem from its part: tag and stem are both set
            # MUTED and only one size apart, so at the tighter gap they read as
            # one three-line paragraph and the tag stops looking like furniture.
            # This costs the example a slice of the frame; the band cap below is
            # what catches a stem that no longer fits.
            grp.shift(UP * (self._tag.get_bottom()[1] - self.h * 0.055
                            - grp.get_top()[1]))

        gap = self.h * 0.045 if gap is None else gap
        band = max(0.0, (self.h / 2 - self.title_band)
                        - (grp.get_bottom()[1] - gap))
        # About five lines of stem-plus-part. Past that the figure and the
        # derivation are living in under two thirds of the frame, which is the
        # question crowding out the lesson.
        cap = self.h * (0.26 if self.portrait else 0.22)
        if band > cap:
            raise ValueError(
                f"question band is {band / self.h:.0%} of frame height "
                f"(cap {cap / self.h:.0%}). The stem plus the part is too long "
                "for one frame: quote only the sentences this part needs, or "
                "split the part across two shots. Do not shrink the type."
                + (" This shot also carries a section tag, which the stem is "
                   "laid out under — on a worked example the question is "
                   "already the heading, so dropping the tag for the example's "
                   "shots is the other legitimate answer."
                   if self._tag is not None else ""))
        self.question_band = band
        return grp


# ----------------------------------------------------------------- scene ----
class SQScene(Scene):
    """Base scene carrying the SmartQuest field and layout."""

    def setup_stage(self, gradient=None, section=None):
        """Flat dark field, plus the layout Stage.

        `section` is the knowledge point this shot is on — pass it and the tag
        is built and added as the first thing on the frame:

            st = self.setup_stage(section=SECTION_PLANES)

        Hold the string in a module constant shared by every scene of that
        section, never retyped per scene: the tag has to be identical on every
        shot it covers (contract invariant 10), and two hand-typed copies are
        exactly how it stops being.

        `gradient` is accepted and ignored — the field used to carry a
        top-to-bottom wash rectangle, and old scenes still pass the keyword.
        The field is now one flat colour set on the camera, so there is no
        background mobject at all: nothing sits between BG and the drawing,
        and halo() (which paints BG under the glyphs) matches the field
        exactly at every point of the frame.
        """
        sync_frame()                      # must run before anything is positioned
        self.camera.background_color = BG
        self.stage = Stage()
        if section is not None:
            self.add(self.stage.section_tag(section))
        return self.stage


# ------------------------------------------------------------- type scale ----
# Manim font sizes are absolute scene units, and `frame_height` stays 8 in both
# aspects while `frame_width` changes. The same font_size therefore covers 15%
# of the frame width in 16:9 but 47.5% in 9:16 — portrait text comes out roughly
# three times too big. Scale type to the frame, with a readability boost for
# portrait because a short is watched on a small screen.
_PORTRAIT_BOOST = 1.7
TYPE_SCALE = (config.frame_width / 14.2222) * (
    _PORTRAIT_BOOST if config.pixel_height > config.pixel_width else 1.0)


def _pt(size):
    return max(size, SIZE_MIN) * TYPE_SCALE


# ---- stroke weights --------------------------------------------------------
# stroke_width is constant in SCENE units (100 = 1.0 unit, see STROKE_PER_UNIT),
# which means it is NOT constant as a fraction of the frame: frame_height stays
# 8 while frame_width shrinks to 4.5 in portrait, so the same weight covers far
# more of a 9:16 frame. Measured in manim-traps.md #3: stroke_width 4 renders
# 5 px at 1920×1080 and 10 px at 1080×1920, against a figure that is itself
# smaller (299 px radius vs 352 px) — lines read about 2.4× too heavy in a short.
_PORTRAIT_STROKE = 1 / 2.4
STROKE_SCALE = (_PORTRAIT_STROKE
                if config.pixel_height > config.pixel_width else 1.0)

# Name a weight, never a number.
SW_HAIRLINE = 2 * STROKE_SCALE     # construction, ghosts, dimmed context
SW_FIGURE = 3 * STROKE_SCALE       # the circle, neutral geometry
SW_EMPHASIS = 6 * STROKE_SCALE     # coloured rays — the lines the lesson is about
SW_MARK = 4 * STROKE_SCALE         # right-angle markers, tick marks


# ---- always lay text out at ONE size, then scale ---------------------------
# Pango grid-fits glyph positions to the pixel grid of whatever font_size it is
# handed, and Manim then scales that layout into scene units. So the SAME word
# gets DIFFERENT letter spacing at different font_size values — measured on
# "centroid" in PingFang HK across sizes 20-60, a single pair drifts by up to
# 0.162 of the text height, and the "ro" pair goes negative (glyphs touching) at
# some sizes. That is the "英文字距不一樣" defect: Latin suffers most because its
# kerning matters, while CJK sits on a uniform grid and hides it.
#
# Laying every string out at TYPE_BASE and scaling to the target gives identical
# spacing at every size (measured drift: 0), and it is the well-kerned layout
# because grid-fitting error shrinks as size grows. Heights are preserved to
# three decimals, so existing vertical layouts do not move; widths change by up
# to ~4%, which IS the kerning correction.
TYPE_BASE = 120


def _text(string, size, **kw):
    """Build Text at TYPE_BASE and scale to `size`. Never call Text() directly
    for anything containing Latin — see TYPE_BASE above."""
    t = Text(string, font_size=TYPE_BASE, **kw)
    return t.scale(size / TYPE_BASE)


# --------------------------------------------------------------- elements ----
_HAS_CJK = re.compile(r"[\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uFF00-\uFFEF]")


# ---- Unicode symbols on an English frame -----------------------------------
# Now that every string on the picture is set in TeX (rule 29), a symbol typed
# as a Unicode character is a HARD LaTeX error, not a font substitution: the
# stock template has no glyph for ∠ or ①, and the render dies with "Unicode
# character not set up for use with LaTeX". The list shots in
# on-screen-language.md are written with exactly these characters, so they are
# translated here rather than banned — an author writes `⊥` and gets `\perp`.
#
# Punctuation is NOT in this table: —, –, ·, ’, “, ”, … and ‘ all compile
# as-is in Manim's stock template (measured), so they pass through untouched.
_TEX_SYMBOL = {
    # enumerated list markers — on-screen-language.md's ①②③
    "①": r"\textcircled{\scriptsize 1}", "②": r"\textcircled{\scriptsize 2}",
    "③": r"\textcircled{\scriptsize 3}", "④": r"\textcircled{\scriptsize 4}",
    "⑤": r"\textcircled{\scriptsize 5}",
    # geometry
    "∠": r"$\angle$", "△": r"$\triangle$", "⊥": r"$\perp$",
    "∥": r"$\parallel$", "≅": r"$\cong$", "∼": r"$\sim$", "°": r"$^\circ$",
    "′": r"$'$", "″": r"$''$",
    # relations and operators
    "≈": r"$\approx$", "≤": r"$\leq$", "≥": r"$\geq$", "≠": r"$\neq$",
    "±": r"$\pm$", "×": r"$\times$", "÷": r"$\div$", "∵": r"$\because$",
    "∴": r"$\therefore$", "→": r"$\to$", "⇒": r"$\Rightarrow$",
    "⇌": r"$\rightleftharpoons$", "∞": r"$\infty$", "√": r"$\surd$",
    "²": r"$^2$", "³": r"$^3$",
    # Greek that turns up in Physics and Chemistry labels
    "α": r"$\alpha$", "β": r"$\beta$", "γ": r"$\gamma$", "θ": r"$\theta$",
    "λ": r"$\lambda$", "μ": r"$\mu$", "π": r"$\pi$", "ρ": r"$\rho$",
    "σ": r"$\sigma$", "φ": r"$\phi$", "ω": r"$\omega$", "Δ": r"$\Delta$",
    "Σ": r"$\Sigma$", "Ω": r"$\Omega$",
}
# Non-ASCII that Manim's stock template sets without help. Measured, not assumed.
_TEX_OK = set("·—–’‘“”…°")


_TEX_MATH_SPAN = re.compile(r"\$[^$]*\$")


def _texify(text):
    """Replace Unicode maths symbols with their TeX commands.

    Only OUTSIDE `$...$`: inside a maths span the author is already writing
    LaTeX, and a `$\\angle$` spliced into one would close it. A Unicode symbol
    found inside a span therefore raises, and so does any character this table
    has no entry for — a clear error here beats a LaTeX failure mid-render.
    """
    out, at = [], 0
    for m in _TEX_MATH_SPAN.finditer(text):
        out.append(_texify_run(text[at:m.start()], text))
        span = m.group(0)
        bad = sorted({c for c in span if ord(c) > 126})
        if bad:
            raise ValueError(
                f"maths span {span!r} carries the Unicode symbol(s) {bad}. "
                "Inside $...$ write the LaTeX command instead: "
                r"`$\angle BAD$`, `$60^\circ$`, `$AB \perp CD$`.")
        out.append(span)
        at = m.end()
    out.append(_texify_run(text[at:], text))
    return "".join(out)


def _texify_run(run, whole):
    out = "".join(_TEX_SYMBOL.get(ch, ch) for ch in run)
    stray = sorted({ch for ch in run if ord(ch) > 126
                    and ch not in _TEX_OK and ch not in _TEX_SYMBOL})
    if stray:
        raise ValueError(
            f"picture text carries {stray}, which LaTeX has no glyph for and "
            f"which is not in _TEX_SYMBOL: {whole[:60]!r}. Write it as LaTeX "
            r"instead — `$\perp$`, `$\angle BAD$`, `$^\circ$` — or add it to "
            "the table in smartquest_theme.py if it is a symbol the DSE "
            "actually uses.")
    return out


def _english_only(text, where):
    """The picture is in English. Raise on 中文 rather than setting it.

    The caption track is the exemption and the only one — `caption_text()` and
    everything build_captions.py emits take 中文 exactly as before. See hard
    rule 29.
    """
    if _HAS_CJK.search(text):
        found = "".join(sorted(set(_HAS_CJK.findall(text))))[:12]
        raise ValueError(
            f"{where}: the picture is in English, and this string carries 中文 "
            f"({found}…): {text[:60]!r}. The student sits an English paper, so "
            "the words on the frame are the words they have to read in the exam "
            "hall. Put the Chinese on the caption track, or — better — say it "
            "in mathematics or by moving the figure. See hard rule 29.")
    return text


def title(text, color=INK, size=SIZE_TITLE):
    """Display type — Computer Modern, like the rest of the frame.

    English, like everything else on the picture: `1 · centroid`, not
    `1 · 重心`. It raises on 中文 (rule 29) — a section title is the shortest
    string in the video and the easiest one to leave in Chinese by habit.
    """
    _english_only(text, "title()")
    return Tex(_texify(text), color=color, font_size=_pt(size),
               tex_template=TEX_MAIN)


def body(text, color=INK, size=SIZE_BODY, terms=None, term_color=AUX,
         scale=True, width=None):
    """One line of English on the picture — a list item, a short statement.

        body("Angles in the same segment are equal.", terms=["segment"])

    `terms` are the DSE subject terms inside it: each is set BOLD and in
    `term_color`, exactly as a term card is (rule 26).

    English only — it raises on 中文 (rule 29). This helper used to set 繁中
    書面語 and is where most of it lived, so a scene that has not been converted
    fails here, loudly, instead of rendering a Chinese frame.

    Set in Computer Modern like the mathematics, not in Pango: an English word
    in the figure's face has to be the same glyph as that word in the formula
    beside it (rule 17). The line is wrapped in `\\mbox` so LaTeX cannot break
    it at its own page width — which means a long line runs off the frame
    instead of wrapping, so the width is checked here and **raises**. A body
    line is one line; if it does not fit, it is two items, or it belongs in the
    narration.
    """
    _english_only(text, "body()")
    pieces, is_term = _term_pieces(text, terms)
    args = [_texify(piece) for piece in pieces]
    args[0] = r"\mbox{" + args[0]
    args[-1] = args[-1] + "}"
    t = Tex(*args, arg_separator="", color=color,
            font_size=_pt(size) if scale else max(size, SIZE_MIN),
            tex_template=TEX_MAIN)
    for part, term_here in zip(t.submobjects, is_term):
        if term_here:
            part.set_color(term_color)
    w = width if width is not None else config.frame_width * (1 - 2 * 0.045)
    if t.width > w:
        raise ValueError(
            f"body() line is {t.width:.2f} units wide and the frame holds "
            f"{w:.2f}: {text[:60]!r}. It cannot wrap — split it into two list "
            "items, cut it to the words that teach, or move the sentence to the "
            "narration. Do not shrink the type.")
    return t


def _term_pieces(text, terms):
    """Split a line into (piece, is_term) runs, terms wrapped in \\textbf."""
    marks = []
    for t in sorted(terms or [], key=len, reverse=True):
        start = 0
        while True:
            i = text.find(t, start)
            if i < 0:
                break
            if not any(a < i + len(t) and i < b for a, b in marks):
                marks.append((i, i + len(t)))
            start = i + len(t)
    marks.sort()
    pieces, flags, at = [], [], 0
    for a, b in marks:
        if a > at:
            pieces.append(text[at:a])
            flags.append(False)
        pieces.append(r"\textbf{" + text[a:b] + "}")   # _texify() runs later
        flags.append(True)
        at = b
    if at < len(text) or not pieces:
        pieces.append(text[at:])
        flags.append(False)
    return pieces, flags


# ---- the question band -----------------------------------------------------
# The DSE question is set in Computer Modern like everything else on the frame,
# so the words the paper prints and the mathematics the lesson writes are one
# document rather than two. That rules out Pango wrapping, so the paragraph is
# broken here and built one Tex per line.
#
# Each line goes inside \mbox. WITHOUT it LaTeX wraps the line ITSELF, at its
# own page width of about 8.5 scene units, and the `center` environment Manim's
# Tex uses then CENTRES the pieces \u2014 which renders as a paragraph with a
# mysteriously indented middle line. It is not a bug you would guess from the
# code: the line breaking silently moves from this file to TeX.
_Q_MATH = re.compile(r"\$[^$]*\$")
_Q_CMD = re.compile(r"\\[A-Za-z]+\s*")
_QCAL = {}
# A realistic sentence, not a word: the calibration has to cover inter-word
# spacing and the extra width TeX gives inline mathematics. Calibrated on
# "semicircle" alone the estimate came out 13% narrow, which is a whole word per
# line \u2014 enough to overflow the frame on the longest line of a stem.
_Q_PROBE = (r"The coordinates of the points $A$ and $B$ are $(-6, 5)$ "
            r"respectively.")
_Q_SPACE = 0.55            # a space, in units of one average character
_Q_SAFETY = 1.03           # break this much early; the estimate runs \u00b11.5%


def _q_box(line, size, color=None):
    """One unbreakable line of question text."""
    line = _texify(line)      # a stem pasted from a paper may carry ∠, °, ⇌
    return Tex(r"\mbox{" + line + "}", color=color, font_size=_pt(size),
               tex_template=TEX_MAIN)


def _q_unit(size):
    """Width of one average character of question text at `size`.

    Measured once from a real Tex mobject \u2014 a TeX compile per candidate break
    would cost seconds per paragraph. Predicts a real line to within about 1.5%,
    and `question_text` still fits the built block for real afterwards.
    """
    if "w" not in _QCAL:
        toks = _q_tokens(_Q_PROBE)
        units = sum(_q_len(t) for t in toks) + _Q_SPACE * (len(toks) - 1)
        _QCAL["w"] = _q_box(_Q_PROBE, SIZE_QUESTION).width / units
    return _QCAL["w"] * (size / SIZE_QUESTION)


def _q_tokens(text):
    """Break on spaces, except inside inline mathematics: `$AP = AB$.` is one
    token, because a line that ends on `$AP =` names nothing."""
    marked = _Q_MATH.sub(lambda m: m.group(0).replace(" ", "\x00"), text)
    return [t.replace("\x00", " ") for t in marked.split()]


def _q_len(token):
    """Characters the token will actually set: a control sequence draws one
    glyph, and `{}^_` draw none."""
    t = _Q_MATH.sub(lambda m: _Q_CMD.sub("x", m.group(0)[1:-1]), token)
    return len(re.sub(r"[{}^_]", "", t))


def _q_lines(text, width, size):
    unit = _q_unit(size)
    space = unit * _Q_SPACE
    target = width / _Q_SAFETY
    lines, cur, cur_w = [], [], 0.0
    for tok in _q_tokens(text):
        w = _q_len(tok) * unit
        if cur and cur_w + space + w > target:
            lines.append(" ".join(cur))
            cur, cur_w = [tok], w
        else:
            cur_w += space + w if cur else w
            cur.append(tok)
    if cur:
        lines.append(" ".join(cur))
    return lines


def question_text(text, size=SIZE_QUESTION, color=MUTED, width=None):
    # The paper is in English and so is the band — never a 中文 translation of
    # a stem or a part (rule 23, and now rule 29 for the whole frame).
    """The DSE question \u2014 or one part of it \u2014 as a wrapped, left-aligned
    paragraph of the paper's own English.

    `text` is LaTeX: inline mathematics in `$...$`, so `$\\Gamma$` and
    `$3x - 4y - 37 = 0$` set exactly as the paper prints them.

        question_text(r"The coordinates of the points $A$ and $B$ are "
                      r"$(-6, 5)$ and $(2, -1)$ respectively.")

    Left-aligned and ragged-right, like the paper \u2014 a centred question reads as
    a title, and the student has to find the start of every line.

    The stem is MUTED and carries no referent colour: it is quoted text the
    student reads once, and the pens belong to the figure and the derivation
    (rule 17). `Stage.question()` is the normal caller \u2014 it also reserves the
    band, which this helper does not.
    """
    if width is None:
        width = config.frame_width * 0.91
    lines = (text.split("\n") if "\n" in text
             else _q_lines(text, width, size))
    mobs = [_q_box(l, size, color) for l in lines if l.strip()]

    # Lines are stacked by their TOPS at a fixed step, not by `arrange`'s
    # bounding-box gaps: a line with no descender has a shorter box, so
    # arrange() would open the leading under it by a few pixels and the
    # paragraph would breathe unevenly. English prose always has an ascender,
    # so the top is the stable edge to hang from. A \vphantom strut does NOT
    # fix this — it draws nothing, and Manim measures drawn outlines.
    step = max(m.height for m in mobs) * 1.42
    top = mobs[0].get_top()[1]
    for i, m in enumerate(mobs[1:], 1):
        m.align_to(mobs[0], LEFT)
        m.shift(UP * (top - i * step - m.get_top()[1]))

    grp = VGroup(*mobs)
    if grp.width > width:            # the estimate was optimistic somewhere
        grp.scale_to_fit_width(width)
    return grp


_LATIN_ONLY = re.compile(r"^[\x20-\x7E]+$")


def _tex_safe(text):
    """True if TeX can set this string as it stands.

    ASCII, plus the typographic punctuation Manim's stock template handles
    without help (`_TEX_OK`) — so `A — B` and `DSE Maths · 6.1` go through
    Computer Modern like everything else rather than falling to the Pango
    branch, which would set their Latin in a different face (rule 17).
    """
    return bool(text) and all(ch in _TEX_OK or 0x20 <= ord(ch) <= 0x7E
                              for ch in text)
_SYMBOLIC = re.compile(r"^[A-Za-z](['\u2032]|_\d)?$")   # A, B, P, A', v_1


def label(text, color=INK, size=SIZE_LABEL, halo=True, halo_color=None,
          bold=False):
    """A label on the figure. Haloed by default — see halo().

    Latin content is set in TeX, not Pango, so a point label is the SAME glyph
    as that point in the formula beside it — which is the whole point of rule 17.
    A single symbol goes through MathTex (italic, exactly as `\angle BAD` sets
    its letters); a word goes through Tex (upright roman, so `median` is not
    read as m·e·d·i·a·n multiplied together). Chinese has no Computer Modern and
    falls back to the 繁中 serif.

    Haloing is on because a figure label is exactly the thing that ends up over
    a line. On the dark field the halo is the background colour, so on clear
    ground it is invisible and costs nothing.

    `bold=True` sets it in the term weight. Do not pass it by hand to mark a
    concept — call term(), which is the same thing under a name that says what
    the weight means.

    English only — it raises on 中文 (rule 29). A Unicode maths symbol (∠, △,
    ⊥, °) is not Chinese and still renders, but write it as LaTeX —
    `label(r"$\\angle BAD$")` — so it comes out of Computer Modern with the rest
    of the frame instead of the symbol fallback.
    """
    _english_only(text, "label()")
    tex = _texify(text)
    if _tex_safe(tex):
        if _SYMBOLIC.match(tex):
            t = MathTex(rf"\mathbf{{{tex}}}" if bold else tex, color=color,
                        font_size=_pt(size), tex_template=TEX_MAIN)
        else:
            t = Tex(rf"\textbf{{{tex}}}" if bold else tex, color=color,
                    font_size=_pt(size), tex_template=TEX_MAIN)
    else:
        t = _text(text, _pt(size), font=FONT_TEXT,
                  weight=WEIGHT_TERM if bold else WEIGHT_TEXT, color=color)
    return halo_text(t, color=halo_color) if halo else t


def term(text, color=AUX, size=SIZE_LABEL, halo=True):
    """A term card: the English DSE term, alone, in its referent's colour, BOLD.

        card = term("median", color=AUX).next_to(fc, RIGHT)
        self.play(*bind_term(meds, card))

    The card is the term and nothing else — 「三條 median 的交點」 is a sentence
    wearing a term as a hat, and it goes to the subtitle. Bold is not emphasis
    and it is not optional: it is how the examinable word is told apart from the
    Chinese and the mathematics around it, on a frame where colour is already
    spoken for (rule 26). Colour still has to be the referent's, bound once with
    bind_term() — weight says "this is the term", colour says "it is that thing".

    The card is the ENGLISH term, always — it raises on 中文 (rule 29). A term
    glossed in Chinese beside itself is the one thing this card must never do:
    the marker wants `alternate segment theorem` on the answer sheet.
    """
    _english_only(text, "term()")
    return label(text, color=color, size=size, halo=halo, bold=True)


def halo_text(mobject, color=None, ratio=None):
    """Draw a background-coloured outline BEHIND the glyphs so text stays
    readable where it crosses a figure.

    `background=True` puts the stroke under the fill, so the letterform keeps
    its true weight — a foreground stroke would fatten it into mush. Round joins
    matter: the default mitre throws visible spikes off every glyph corner,
    which reads as dirt at 1080p.

    Width is derived from the text height so it survives any later scale.
    NOTE the unit conversion: set_stroke() does NOT take scene units. Measured
    at 1080p, stroke_width 100 renders exactly 1.0 scene unit (10→14px, 20→27px,
    40→54px against frame_width 14.222), and the ratio is resolution
    independent. The stroke is centred on the outline, so only half of it sits
    outside the glyph — hence the factor of 2.
    """
    r = ratio if ratio is not None else HALO_RATIO
    w = 2 * STROKE_PER_UNIT * r * mobject.height
    mobject.set_stroke(color=color or BG, width=w, opacity=1.0, background=True)
    mobject.joint_type = LineJointType.ROUND
    for sub in mobject.family_members_with_points():
        sub.joint_type = LineJointType.ROUND
    return mobject


# ---- referent pens ---------------------------------------------------------
# Three more inks at the same tonal step, for figures with more angles and sides
# than the five semantic colours can name. They carry NO role meaning — they are
# simply further pens.
#
# Chosen by hue gap, not by eye — then LIFTED to the 400 level like the semantic
# five, because the three 700-level versions never were. Measured against the
# dark BG they failed exactly as the old semantic inks did: lime #4D7C0F 3.87:1,
# fuchsia #A21CAF 3.06:1, cyan #0E7490 3.61:1 — all under 4.5 while looking
# perfectly reasonable in the editor. (The "4.86 / 6.16 / 5.22" once recorded
# here were measured against the LIGHT page and were never re-measured.) The
# values below are brand-theme.md's, re-measured against BG:
REF_LIME = "#A3E635"    # hue  82.7°  fills the orange→emerald gap  12.81:1
REF_FUCHSIA = "#E879F9" # hue 292.0°  fills the violet→rose gap      7.85:1
REF_CYAN = "#22D3EE"    # hue 187.9°  fills the emerald→blue gap    10.69:1

# Hand out referent colours in this order. The minimum hue separation across all
# eight is 25.2° — cyan against blue, the tightest pair, and cyan is the eighth
# pen so it only appears on an already-busy figure. Rejected for being too close
# to a colour already in the series: amber (8° from orange), pink (10° from
# rose), teal (12° from emerald), sky (23° from blue).
#
# Past about eight the figure, not the palette, is the problem — but if a
# question genuinely names more parts, reuse a pen on the part that is furthest
# away on the figure and give the two different arc radii or tick counts as
# well, so shape backs colour up.
REF_SERIES = (GIVEN, UNKNOWN, AUX, RESULT, WARN,
              REF_LIME, REF_FUCHSIA, REF_CYAN)


def mtex_ref(expression, refs=None, color=INK, size=SIZE_BODY, **kw):
    """Mathematics whose named parts carry their referent's colour.

    A symbol naming something in the figure must wear that thing's colour at
    EVERY occurrence, so the student can find it without hunting:

        ANG = {"\\\\angle BAD": UNKNOWN, "BD": GIVEN, "AD": GIVEN}
        mtex_ref(r"\\\\sin \\\\angle BAD = \\\\frac{12 \\\\sin 72^\\\\circ}{13}", ANG)

    Then colour the same angle UNKNOWN on the figure and pulse the two together
    with bind_term(). Colour here is reference, never decoration — see
    references/on-screen-language.md.
    """
    refs = refs or {}
    m = MathTex(expression, color=color, font_size=_pt(size),
                tex_template=TEX_MAIN,
                substrings_to_isolate=list(refs.keys()), **kw)
    for tex, c in refs.items():
        m.set_color_by_tex(tex, c)
    return m


def mtex(expression, color=INK, size=SIZE_BODY, **kw):
    """Mathematics. Use this instead of MathTex — it pins the sans template and
    applies the aspect-aware type scale."""
    return MathTex(expression, color=color, font_size=_pt(size),
                   tex_template=TEX_MAIN, **kw)


# ------------------------------------------------------------- captions ----
_LATIN_RUN = re.compile(r"[A-Za-z][A-Za-z'\-]*")
_BREAK_AFTER = "，、；：,;"
_NO_BREAK_BEFORE = "。，、；：？！)）」』"
# A maths prefix binds to the token after it: never leave 「∠」 stranded at the
# end of a line with 「APB」 on the next one.
_NO_BREAK_AFTER = "∠△∥⊥≅≈∵∴(（「『"
_CAL = {}


def _char_w():
    """Calibrate this face's CJK and Latin advance once, so a line's width can be
    estimated without building a Text per candidate break."""
    if not _CAL:
        mk = lambda t: _text(t, SIZE_CAPTION, font=FONT_CAPTION, weight=WEIGHT_CAPTION).width
        _CAL["cjk"] = mk("測測測測測") / 5
        _CAL["lat"] = mk("semicircle") / 10      # a realistic word, not "mmmm"
        _CAL["sp"] = _CAL["lat"] * 0.55
    return _CAL


def _est_width(t, size=None):
    """Estimated rendered width of `t` AT `size`. The calibration is measured at
    SIZE_CAPTION and scaled — Manim font size is linear in advance width, so one
    calibration serves both the Chinese line and the smaller English one."""
    c = _char_w()
    k = 1.0 if size is None else size / SIZE_CAPTION
    lat = sum(len(m) for m in _LATIN_RUN.findall(t))
    other = len([ch for ch in _LATIN_RUN.sub("", t) if not ch.isspace()])
    return k * (other * c["cjk"] + lat * c["lat"] + t.count(" ") * c["sp"])


def _legal_breaks(text, terms):
    """Indices where a break is allowed: not inside a Latin word, not inside a
    declared term in EITHER language, not before closing punctuation, not after
    a maths prefix. 等腰三角形 is as unbreakable as `isosceles triangle`."""
    spans = [m.span() for m in _LATIN_RUN.finditer(text)]
    for t in _term_candidates(terms):
        i = text.find(t)
        while i != -1:
            spans.append((i, i + len(t)))
            i = text.find(t, i + 1)
    for i in range(1, len(text)):
        if any(a < i < b for a, b in spans):
            continue
        if text[i] in _NO_BREAK_BEFORE or text[i - 1] in _NO_BREAK_AFTER:
            continue
        yield i


def _greedy_lines(text, terms, target, size=None):
    """Standard greedy line breaker over the legal break points."""
    stops = list(_legal_breaks(text, terms)) + [len(text)]
    lines, start = [], 0
    while start < len(text):
        chosen = None
        for b in stops:
            if b <= start:
                continue
            if _est_width(text[start:b].strip(), size) <= target:
                chosen = b
            elif chosen is not None:
                break
        if chosen is None:                        # a single unbreakable run
            chosen = next((b for b in stops if b > start), len(text))
        lines.append(text[start:chosen].strip())
        start = chosen
    return [l for l in lines if l]


def wrap_caption(text, terms=None, target=None, size=None):
    """Break into lines that each fit `target`. Kept for callers that want the
    string; `fit_caption` is what the caption track uses."""
    if "\n" in text:
        return text
    if target is None:
        target = config.frame_width * 0.91
    return "\n".join(_greedy_lines(text, terms, target, size))


def _term_candidates(terms):
    """Every written form of every declared term, in either language.

    A cue declares its terms as a mapping from the English to the Chinese:

        {"isosceles triangle": "等腰三角形"}

    Both forms are then marked, so the term lights up in the SAME colour on
    both lines and the student can see that 等腰三角形 and `isosceles triangle`
    are one thing. A plain list is still accepted — it means English only, and
    the Chinese line will simply have nothing to mark.
    """
    if isinstance(terms, dict):
        out = list(terms.keys()) + [v for v in terms.values() if v]
    else:
        out = list(terms or [])
    return [t for t in out if t and t.strip()]


def _term_forms(string, terms):
    """The forms in which each declared term ACTUALLY occurs in `string`.

    `t2c` matches a literal substring, which is fine for the Chinese form —
    Chinese has no case and no inflection, so 等腰三角形 is written the way it
    was declared. It is wrong for the English, which is inflected and
    capitalised in a real sentence:

        term "inscribed angle" in "Inscribed angles on the same arc…"
          literal key  →  no match at all (capital I), the term is not marked
          this         →  "Inscribed angles", the whole phrase marked

        term "isosceles triangle" in "…two isosceles triangles."
          literal key  →  "isosceles triangle" amber, a white "s" left hanging
          this         →  "isosceles triangles", one amber phrase

    So a Latin form is found case-insensitively and the match runs to the end
    of the word it landed in, colouring the text that is really there. It only
    extends, never shortens — a term written plural in the plan and singular in
    the sentence goes unmarked rather than mis-marked.
    """
    forms = set()
    for t in _term_candidates(terms):
        if re.search(r"[A-Za-z]", t):
            for m in re.finditer(re.escape(t) + r"[A-Za-z]*", string, re.IGNORECASE):
                forms.add(m.group(0))
        elif t in string:
            forms.add(t)
    return forms


def caption_text(text, terms=None, en=None):
    """A bilingual cue: 中文 on top, English underneath and smaller.

    Each line is its own mobject and the lines are arranged CENTRED — Manim's
    Text left-aligns the lines of a multi-line string, which reads as ragged in
    a caption. Size is FIXED for every cue — SIZE_CAPTION for the Chinese,
    SIZE_CAPTION_EN for the English; nothing here scales.

    `en` is optional at this level so a card or a one-off overlay can still
    build a Chinese-only cue, but the caption TRACK always passes both — see
    build_captions.py, which fails the build on a cue that is missing its
    English.
    """
    def block(string, size):
        t2c = {k: CAPTION_TERM for k in _term_forms(string, terms)}
        lines = [_text(l, size, font=FONT_CAPTION, weight=WEIGHT_CAPTION,
                       color=CAPTION_INK, t2c=t2c)
                 for l in string.split("\n") if l.strip()]
        if len(lines) == 1:
            return lines[0]
        # Wrapped lines of the SMALLER language get a proportionally smaller
        # gap, so both blocks have the same line spacing relative to their type.
        return VGroup(*lines).arrange(DOWN, buff=CAPTION_LINE_GAP * size / SIZE_CAPTION)

    zh = block(text, SIZE_CAPTION)
    if not (en or "").strip():
        return zh
    return VGroup(zh, block(en, SIZE_CAPTION_EN)).arrange(DOWN, buff=CAPTION_LANG_GAP)


def wrap_caption_pair(text, terms, max_width, en=None):
    """The two strings, line-broken exactly as `fit_caption` will set them.

    Returned so a build gate can count the lines a cue will really take — the
    English one especially, which is meant to stay on ONE line — without
    re-deriving the wrap and getting a different answer from the renderer.

    The width estimate is calibrated, not exact, so the result is MEASURED and
    the target tightened until it really fits. An earlier version trusted the
    estimate and let a line run off both edges of a 9:16 frame.

    Both languages are re-wrapped against the same measured width: the English
    is the longer line about as often as the Chinese is, so tightening only one
    of them leaves the block just as wide.
    """
    en = (en or "").strip() or None
    if caption_text(text, terms, en).width <= max_width:
        return text, en
    target, zh, wrapped = max_width, text, en
    for _ in range(5):
        zh = "\n".join(_greedy_lines(text, terms, target))
        # _est_width() already scales to SIZE_CAPTION_EN, so the English is
        # measured against the SAME target — it simply fits more per line.
        wrapped = ("\n".join(_greedy_lines(en, terms, target, SIZE_CAPTION_EN))
                   if en else None)
        if caption_text(zh, terms, wrapped).width <= max_width:
            break
        target *= 0.88
    return zh, wrapped


def fit_caption(text, terms, max_width, en=None):
    """Wrap both languages to the lines they need, never scaling the type."""
    zh, wrapped = wrap_caption_pair(text, terms, max_width, en)
    return caption_text(zh, terms, wrapped)


def brand_rule(width=3.0, thickness=0.07):
    """The signature indigo→purple bar. Use once per video, in the title card —
    which means calling title_card() rather than this, in practice."""
    r = Rectangle(width=width, height=thickness, stroke_width=0)
    r.set_fill(color=[BRAND_FROM, BRAND_TO], opacity=1.0)
    r.set_sheen_direction(RIGHT)
    return r


def title_card(stage, topic, *subtitle, gap=0.45, rule_ratio=0.5):
    """THE title card — the locked opening frame of every SmartQuest lesson.

        st = self.setup_stage()
        card = sq.title_card(st, "Arithmetic and Geometric Sequences",
                             "DSE Maths", "Compulsory Part", "6.1")
        self.play(Write(card[0]))
        self.play(GrowFromCenter(card[1]), FadeIn(card[2], shift=UP * 0.15))

    Three things, stacked and centred in the content area:

        topic          title(), INK, SIZE_TITLE
        ───────        brand_rule(), half the topic's width — the one place in
                       the video the gradient appears
        subject line   MUTED, SIZE_TITLE_SUB, the parts joined with " · "

    The subtitle parts are given in exam order — subject, paper or part, then
    the syllabus code: `"DSE Maths", "Compulsory Part", "6.1"`. Blank ones are
    dropped, so a lesson with no code still sets correctly.

    The rule is HALF THE WIDEST LINE, not a fixed number, so the card holds its
    proportions whether the topic is one word or six. On the approved card the
    topic is the wider of the two and the rule comes out at half of it, which is
    where the ratio was measured; a short topic falls back to half the subject
    line so the bar never shrinks to a dash.

    Returned as `[topic, rule, subtitle]` so each lands on its own beat. This
    is shot 1 of every lesson (rule 30): the student is told what they are
    watching before the hook asks them anything.
    """
    parts = [str(x).strip() for x in subtitle if str(x).strip()]
    if not parts:
        raise ValueError(
            "title_card() needs the subject line — it is part of the locked "
            'format, not decoration: title_card(st, "Centroid", "DSE Maths", '
            '"Compulsory Part", "8.3"). Subject, then paper or part, then the '
            "syllabus code. A card with no subject line does not say which "
            "paper the lesson is for, which is the one thing a DSE student "
            "checks before watching.")
    t = title(topic)
    sub = label(" · ".join(parts), color=MUTED, size=SIZE_TITLE_SUB, halo=False)
    rule = brand_rule(width=max(1.6, max(t.width, sub.width) * rule_ratio))
    grp = VGroup(t, rule, sub)
    grp.arrange(DOWN, buff=gap)
    # Optically centred, not geometrically: the block sits 4.4% of the frame
    # height above true centre, which is where the approved card puts it and
    # where a centred block has to be to LOOK centred. content_center would
    # push it another 0.2 units up, because it is reserving a caption band this
    # frame has nothing under.
    grp.move_to(UP * stage.h * 0.044)
    floor = stage.content_bottom + 0.2      # portrait: never onto the captions
    if grp.get_bottom()[1] < floor:
        grp.shift(UP * (floor - grp.get_bottom()[1]))
    return grp


def step(statement, reason=None, color=INK, size=SIZE_HEADING):
    """One derivation line with its DSE reason underneath in grey.

        step(r"\\angle AOQ = 2\\alpha", r"\\text{(ext. }\\angle\\text{ of }\\triangle\\text{)}")
    """
    m = mtex(statement, color=color, size=size)
    if reason is None:
        return VGroup(m)
    r = mtex(reason, color=MUTED, size=int(size * 0.62))
    return VGroup(m, r).arrange(DOWN, buff=0.10, aligned_edge=LEFT)


# ---- a solution, and the page it ends on -----------------------------------
# Both are built from ONE MathTex in an `align*` environment, so TeX itself
# hangs each line's relation under the one above it. Getting the same result by
# measuring and shifting does not work: MathTex in ManimCE 0.20 returns the
# whole line as a single submobject whatever is passed to
# substrings_to_isolate, so there is no `=` to measure the position of. Passing
# the lines as SEPARATE arguments is what splits them — one submobject per
# line, which is also what lets each line be revealed on its own beat.
_REL = ("=", "<", ">", r"\leq", r"\geq", r"\approx", r"\equiv")


def _amp(line):
    """Put TeX's alignment mark before the line's first relation."""
    if "&" in line:
        return line
    for rel in sorted(_REL, key=len, reverse=True):
        i = line.find(rel)
        if i >= 0:
            return line[:i] + "&" + line[i:]
    return "&" + line


def _aligned_block(sources, color=INK, size=SIZE_HEADING, gap="0.45em"):
    """One MathTex holding every line, relations aligned, one submobject each."""
    body = [_amp(src) for src in sources]
    args = [b + rf" \\[{gap}]" for b in body[:-1]] + [body[-1]]
    return MathTex(*args, tex_environment="align*", color=color,
                   font_size=_pt(size), tex_template=TEX_MAIN)


def derivation(general, *substituted, reason=None, color=INK,
               size=SIZE_HEADING, gap="0.45em"):
    """A solution block that OPENS ON THE GENERAL FORMULA, then substitutes.

        derivation(r"T(n) = a + (n-1)d",
                   r"T(3) = 10 + (3-1)(2)",
                   r"= 14",
                   reason=r"\\text{(general term of an A.S.)}")

    `general` is required and carries no data from the question — it is the
    formula as the student has to be able to write it in the exam, symbols only.
    The numbers arrive on the NEXT line, so the student sees where each one
    lands. A solution whose first line is already `T(3) = 10 + 2(3-1)` has
    skipped the only line that transfers to another question — see rule 27.

    Each line is a submobject, in order, so each gets its own beat in its own
    play() with its own figure event (rule 18):

        d = derivation(...)
        self.play(Write(d[0]))                      # the formula, alone
        self.play(Write(d[1]), Create(mark_at_3))   # the numbers + the figure

    The lines are set in one `align*`, so `= 14` hangs under the `=` above it
    the way a marker writes it. An explicit `&` in a line is respected; without
    one the mark goes before the first relation.

    `reason` is the DSE reason for the GENERAL line — that is the formula being
    quoted — so it sits beside that line, not under the answer. It is the last
    submobject when present.
    """
    block = _aligned_block([general, *substituted], color=color, size=size,
                           gap=gap)
    rows = VGroup(*block.submobjects)
    if reason is not None:
        r = mtex(reason, color=MUTED, size=int(size * 0.62))
        r.next_to(rows[0], RIGHT, buff=0.35).align_to(rows[0], DOWN)
        rows.add(r)
    return rows


def solution_page(stage, lines, size=SIZE_SOLUTION, gap="0.45em", width=None):
    """Every step of the finished solution, on ONE frame, in marking order.

        page = solution_page(st, [
            (r"T(n) = a + (n-1)d", r"\\text{(general term)}"),
            r"T(3) = 10 + (3-1)(2)",
            r"= 14",
        ])

    The animated solve teaches the reasoning one beat at a time, but it never
    exists as a whole: by the last step the first line left the frame half a
    minute ago, and the student has no page to copy. This is that page — the
    shot that closes every worked example, held still (rule 28).

    `lines` are statements in order, relations aligned as in derivation(); an
    item may be `(statement, reason)` to carry its DSE reason, which is set
    underneath in grey exactly as step() does it. The first line is the general
    formula, the same one the live derivation opened with.

    Raises rather than shrinking. Too tall means the page is carrying working a
    marker would not write: keep the lines that earn marks. If the part itself
    was split across two screens, give each half its own page.
    """
    sources, reasons = [], []
    for item in lines:
        if isinstance(item, (tuple, list)):
            sources.append(item[0])
            reasons.append(item[1] if len(item) > 1 else None)
        else:
            sources.append(item)
            reasons.append(None)

    block = _aligned_block(sources, size=size, gap=gap)
    rows = VGroup(*block.submobjects)
    page = VGroup(*rows)
    # A reason lands under its own line and pushes everything below it down.
    # Only the Y moves, so TeX's relation alignment survives.
    drop = 0.0
    for row, why in zip(rows, reasons):
        row.shift(DOWN * drop)
        if why is None:
            continue
        r = mtex(why, color=MUTED, size=int(size * 0.62))
        r.next_to(row, DOWN, buff=0.10).align_to(row, LEFT)
        page.add(r)
        drop += r.height + 0.10

    w = width if width is not None else stage.w - 2 * stage.margin
    if page.width > w or page.height > stage.content_height:
        raise ValueError(
            f"solution page is {page.width:.2f} x {page.height:.2f} units, and "
            f"the content area is {w:.2f} x {stage.content_height:.2f}. Keep "
            "the lines a DSE marker awards and drop the algebra in between; if "
            "the part was already split across two screens, give each half its "
            "own page. Do not shrink the type.")
    return page.move_to(stage.content_center)


def emphasise(mobject, color=RESULT):
    """The one approved way to say 'look here'. Keep the vocabulary small."""
    return Indicate(mobject, scale_factor=1.06, color=color)


def bind_term(figure, card, times=2, run_time=0.5):
    """Teach that a coloured thing IS a named thing, without writing a sentence.

    Flashes the figure element and its term card TOGETHER, twice. The
    simultaneity is what carries the meaning — this replaces 「這條線是 median」
    on the frame. After the binding, the colour carries the definition and no
    later frame has to name it again. See references/on-screen-language.md.

        meds = VGroup(*medians).set_color(AUX)
        card = label("median", color=AUX).next_to(stage.figure_box(), RIGHT)
        self.play(*bind_term(meds, card))

    Returns a list of animations, so it composes with whatever else the beat
    needs. Both pulses must run in the SAME play() call — flashing them one
    after another says "these two things exist", not "these two are the same".
    """
    anims = []
    for _ in range(times):
        anims += [Indicate(figure, scale_factor=1.0, color=figure.get_color(),
                           run_time=run_time),
                  Indicate(card, scale_factor=1.06, color=card.get_color(),
                           run_time=run_time)]
    return anims


def soften(*mobjects):
    """Round every stroke corner and every stroke end. Call it on the figure.

    Manim's default `joint_type=AUTO` is a BEVEL — a flat cut across the corner,
    not a round one — and `cap_style=AUTO` leaves line ends squared off.
    Measured at 1080p on a triangle apex at stroke_width 16: AUTO and BEVEL are
    identical flat cuts, MITER throws a long spike, and only ROUND domes.

    This is a finish, not a shape change. It never moves a point, so it is safe
    on examinable geometry — unlike `Polygon.round_corners()`, which replaces
    each vertex with a fillet and would quietly destroy the very angle a DSE
    question is about. Never use round_corners() on a lesson figure.

        self.add(soften(VGroup(tri, medians, marks)))
    """
    for m in mobjects:
        for sub in m.family_members_with_points():
            sub.joint_type = LineJointType.ROUND
            sub.cap_style = CapStyleType.ROUND
        m.joint_type = LineJointType.ROUND
        m.cap_style = CapStyleType.ROUND
    return mobjects[0] if len(mobjects) == 1 else VGroup(*mobjects)


def angle_at(vertex, p, q, radius=0.7, color=None, **kw):
    """The INTERIOR angle at `vertex` between rays to `p` and `q`.

    Manim's Angle() sweeps counterclockwise from line1 to line2, so whether you
    get the angle or its reflex depends on the order you happen to pass the
    vertices — and it renders without an error either way. Measured on one
    triangle: Angle(Line(A,B), Line(A,D)) drew 313.74° where the angle is
    52.08°. See manim-traps.md #24.

    This picks the orientation from the geometry and then asserts the drawn arc
    really is the computed angle, so the failure cannot reach a render.
    """
    v, p, q = (np.array(x, dtype=float) for x in (vertex, p, q))
    a, b = p - v, q - v
    true_deg = np.degrees(np.arccos(
        np.clip(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)), -1, 1)))
    ang = Angle(Line(v, p), Line(v, q), radius=radius,
                other_angle=bool(np.cross(a, b)[2] < 0),
                color=color or LINE, stroke_width=kw.pop("stroke_width", SW_MARK),
                **kw)
    pts = ang.points
    drawn = np.degrees(sum(np.linalg.norm(pts[i + 1] - pts[i])
                           for i in range(len(pts) - 1)) / radius)
    assert abs(drawn - true_deg) < 3.0, (
        f"angle_at drew {drawn:.2f}° for a {true_deg:.2f}° angle")
    ang.set_fill(opacity=0.0)      # see dim_arc(): set_opacity would fill it
    return soften(ang)


def ticks(start, end, count=1, color=None, size=0.14, gap=0.075):
    """Equal-length marks at a segment's midpoint — the symbol that says 「這兩段
    相等」 so the frame does not have to.

    `count` is how many strokes: use 1 for one pair of equal segments in the
    figure, 2 for the second pair, 3 for the third. Same count = same length is
    the convention a DSE student already reads.
    """
    start, end = np.array(start, dtype=float), np.array(end, dtype=float)
    d = end - start
    n = np.linalg.norm(d)
    if n == 0:
        return VGroup()
    u = d / n
    perp = np.array([-u[1], u[0], 0.0])
    mid = (start + end) / 2
    offsets = [(i - (count - 1) / 2) * gap for i in range(count)]
    marks = VGroup(*[
        Line(mid + u * o - perp * size / 2, mid + u * o + perp * size / 2,
             color=color or LINE, stroke_width=SW_MARK)
        for o in offsets
    ])
    marks.set_fill(opacity=0.0)    # see dim_arc()
    return soften(marks)


# ------------------------------------------------------------- motion ------
# Approved run_times. A teaching video is not a showreel; keep the vocabulary
# small and the pauses real. See references/pacing.md.
T_DRAW = 1.0            # draw a new object
T_REVEAL = 1.2          # reveal a line of text or a derivation step
T_TRANSFORM = 1.5       # morph an existing object
T_CLEAR = 0.6           # fade something away
REST_BEAT = 1.0         # after a normal reveal
REST_AHA = 1.8          # after the aha moment — never shorter
REST_PONDER = 3.0       # a ponder beat: the student is handed the problem.
                        # Not a rest — work being handed over. The question and
                        # its data stay on screen; nothing else moves.
REST_RECAP = 4.0        # the full-solution page at the end of a worked example.
                        # Long enough to be read top to bottom and copied, which
                        # is what it is for. Nothing moves on it. See rule 28.


# Three depths, not two. The missing tier was structure: axes, grids and the
# frame of a graph are not "context that was recently important", they are
# furniture, and at OP_CONTEXT they still compete with the curve drawn on them.
OP_PRIMARY = 1.0        # what the current beat is about
OP_CONTEXT = 0.3        # established, still relevant — the previous step
OP_STRUCTURE = 0.15     # axes, gridlines, the box of a diagram


def dim(mobject, opacity=OP_CONTEXT):
    """Dim context instead of deleting it. Students need what came before.

    For FILLED mobjects only. Anything stroke-only — an arc, a tick, a
    right-angle mark — must use dim_arc() instead.
    """
    return mobject.animate.set_opacity(opacity)


def dim_arc(*mobjects, opacity=OP_CONTEXT, animate=False):
    """Dim a STROKE-ONLY mobject without switching its fill on.

    `Mobject.set_opacity()` sets fill AND stroke. An arc or a tick has
    `fill_opacity` 0, so dimming it with set_opacity(0.3) gives it a 30% FILL
    and it renders as a solid grey lens instead of a line — the geometry is
    right, the colour is right, and the shape is unrecognisable. It was
    reported three times as "the arc looks strange" before it was measured.
    See references/manim-traps.md #25.

        self.add(dim_arc(arc))                       # immediately
        self.play(*dim_arc(arc, mark, animate=True)) # as animations
    """
    if animate:
        return [m.animate.set_stroke(opacity=opacity) for m in mobjects]
    for m in mobjects:
        m.set_stroke(opacity=opacity)
    return mobjects[0] if len(mobjects) == 1 else VGroup(*mobjects)


def structural(*mobjects):
    """Push axes, grids and diagram furniture to OP_STRUCTURE, immediately.

    Set at build time, not animated — furniture never had the student's
    attention, so it has nothing to hand over.
    """
    for m in mobjects:
        m.set_opacity(OP_STRUCTURE)
    return mobjects[0] if len(mobjects) == 1 else VGroup(*mobjects)


# ═════════════════════════════════════════════════════ the light theme ══════
import sys as _sys
# The library's default is the DARK field above. A lesson may be commissioned
# on a light one instead; `use_light()` is that theme, measured, so it does not
# have to be re-derived per project. Call it BEFORE any mobject is built —
# from the scene module, above `from smartquest_theme import *`:
#
#     import smartquest_theme as sq
#     sq.use_light()
#     from smartquest_theme import *      # copies the light values
#
# See references/brand-theme.md, "The light theme", for how the values were
# arrived at and what they cost.
LIGHT = {
    "BG": "#FBFBFD",            # near-white, a trace of cool grey
    "INK": "#3A322B",           # warm near-black                    12.16:1
    "MUTED": "#6E6154",         # DSE reasons, question stem          5.80:1
    "LINE": "#95897B",          # axes, neutral geometry              3.31:1
    "GIVEN": "#0088FF",         # iOS Blue, as shipped                3.41:1
    "UNKNOWN": "#E56B00",       # iOS Orange at full saturation       3.15:1
    "RESULT": "#24A444",        # iOS Green, deepened                 3.15:1
    "WARN": "#FF2D55",          # iOS Pink, as shipped                3.53:1
    "AUX": "#8190A5",           # cool slate — deliberately NOT iOS   3.15:1
    "REF_LIME": "#00A08E",      # iOS Mint, deepened                  3.15:1
    "REF_FUCHSIA": "#6155F5",   # iOS Indigo, as shipped              4.92:1
    "REF_CYAN": "#CB30E0",      # iOS Purple, as shipped              4.03:1
    "BRAND_FROM": "#4B60D6",
    "BRAND_TO": "#9747FF",
    "CAPTION_INK": "#2A241E",   # both caption lines                 14.84:1
    "CAPTION_TERM": "#B45309",  # the declared subject term           4.86:1
}

# Every dark value that has to be swapped out of a CAPTURED DEFAULT, keyed by
# the dark hex. See _relight_defaults() for why this exists at all.
_DARK_KEYS = {
    "#0B0E14": "BG", "#E9EDF7": "INK", "#98A3BA": "MUTED", "#6B7893": "LINE",
    "#60A5FA": "GIVEN", "#FB923C": "UNKNOWN", "#34D399": "RESULT",
    "#FB7185": "WARN", "#A78BFA": "AUX", "#A3E635": "REF_LIME",
    "#E879F9": "REF_FUCHSIA", "#22D3EE": "REF_CYAN",
    "#F2F5FC": "CAPTION_INK", "#FBBF24": "CAPTION_TERM",
}

# The helpers a scene calls without naming a colour. If any of them keeps a
# dark default, its type renders near-white on the light field — silently.
_MUST_RELIGHT = ("title", "body", "label", "term", "mtex", "mtex_ref",
                 "step", "derivation")
# title_card() takes no colour argument — it reads INK and MUTED at call time,
# so it relights with the module and needs no entry above.


def _relight_defaults(palette):
    """Rewrite the colours CAPTURED in helper default arguments.

    Rebinding the module globals is NOT enough, and the failure is silent. A
    helper written as

        def step(statement, reason=None, color=INK, size=SIZE_HEADING):
            ...
            r = mtex(reason, color=MUTED, ...)

    reads MUTED at CALL time — so that line picks up the new value — but
    `color=INK` was evaluated once, when `def` ran, while the module was still
    dark. Every caller that does not pass a colour therefore gets #E9EDF7, and
    on a near-white field that is a barely visible ghost. It cost a full render
    round on lesson 08: the derivation panels came out blank-looking while the
    grey reason line under them was perfectly readable, which is the
    fingerprint of exactly this bug.
    """
    import types
    mod = _sys.modules[__name__]
    swap = {dark: palette[name] for dark, name in _DARK_KEYS.items()
            if name in palette}
    patched = set()
    for name in dir(mod):
        fn = getattr(mod, name)
        if not isinstance(fn, types.FunctionType) or name.startswith("__"):
            continue
        for slot in ("__defaults__", "__kwdefaults__"):
            values = getattr(fn, slot, None)
            if not values:
                continue
            if slot == "__defaults__":
                new = tuple(swap.get(str(v).upper(), v) for v in values)
            else:
                new = {k: swap.get(str(v).upper(), v) for k, v in values.items()}
            if new != values:
                setattr(fn, slot, new)
                patched.add(name)
    missing = [n for n in _MUST_RELIGHT if n not in patched]
    assert not missing, (
        f"{missing} kept a dark default colour — their text would render "
        f"near-white on the light field")
    return patched


def use_light(palette=None):
    """Switch this module to the light theme, in place.

    Call it before building anything. Returns the palette actually applied.
    """
    mod = _sys.modules[__name__]
    p = dict(LIGHT)
    p.update(palette or {})
    for k, v in p.items():
        setattr(mod, k, v)
    mod.REF_SERIES = (p["GIVEN"], p["UNKNOWN"], p["AUX"], p["RESULT"],
                      p["WARN"], p["REF_LIME"], p["REF_FUCHSIA"],
                      p["REF_CYAN"])
    mod.PALETTE = dict(bg=p["BG"], ink=p["INK"], muted=p["MUTED"],
                       line=p["LINE"], given=p["GIVEN"], unknown=p["UNKNOWN"],
                       result=p["RESULT"], warn=p["WARN"], aux=p["AUX"])
    _relight_defaults(p)
    return p


def contrast(fg, bg):
    """WCAG contrast ratio. Measure before adopting any colour."""
    def lum(h):
        r, g, b = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
        f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    a, b = sorted([lum(fg), lum(bg)], reverse=True)
    return (a + 0.05) / (b + 0.05)
