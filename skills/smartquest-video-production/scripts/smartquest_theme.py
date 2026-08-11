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

Everything here is derived from SmartQuestApp/DESIGN.md. The field is light —
a dark video reads as 'advanced' to a secondary student, which is the opposite
of what a first-encounter lesson wants.
"""
from manim import *
import numpy as np
import re

# --------------------------------------------------------------- palette ----
# Light theme. A dark field reads as "advanced" to a secondary student; a clean
# near-white page reads as a well-set textbook, which is what we want.
BG = "#FBFCFE"          # barely-tinted cool white
BG_LIFT = "#FFFFFF"     # a gentle white wash, top to bottom
INK = "#1B2440"         # deep indigo-slate — softer than black, still brand-cool
MUTED = "#64748B"       # captions, secondary notes, DSE reasons        4.64:1
LINE = "#7C8AA3"        # neutral geometry                              3.49:1

# Teaching semantics — five inks at the same tonal step, chosen for hue
# separation first and measured for contrast second. GIVEN and UNKNOWN appear
# together in almost every frame, so they are complementary (blue vs burnt
# orange) rather than two neighbouring blues.
GIVEN = "#1D4ED8"       # blue-700     what the question gives you      6.53:1
UNKNOWN = "#C2410C"     # orange-700   what you are solving for         5.04:1
RESULT = "#047857"      # emerald-700  a confirmed result               5.34:1
WARN = "#BE123C"        # rose-700     the misconception, the trap      6.12:1
AUX = "#6D28D9"         # violet-700   construction, first-use terms    6.92:1

BRAND_FROM = "#4B60D6"  # gradient start — brand primary
BRAND_TO = "#9747FF"    # gradient end

# Captions: big, bold, dark, no bar and no glow. The caption band is reserved
# empty page, so plain dark type on the light field already has full contrast —
# a glow or an outline only adds noise. Readability comes from size and weight.
CAPTION_INK = "#1B2440"
# Accent for a first-use English term. NOT a teaching semantic — the five
# semantic colours belong to the figure, this one belongs to the text.
CAPTION_TERM = "#B45309"
CAPTION_LINE_GAP = 0.16   # gap between wrapped caption lines

PALETTE = dict(bg=BG, ink=INK, muted=MUTED, line=LINE, given=GIVEN,
               unknown=UNKNOWN, result=RESULT, warn=WARN, aux=AUX)

# ------------------------------------------------------------ typography ----
# PingFang HK renders 繁體中文 and inline Latin cleanly under Manim's Pango
# renderer, so it is the single Text() face. DM Sans is brand, but its Latin
# kerning breaks under Pango below ~44pt, so it is display-only.
FONT_TEXT = "PingFang HK"
WEIGHT_TEXT = MEDIUM    # 蘋方 Medium — steadier than Regular at video sizes
FONT_DISPLAY = "DM Sans"
DISPLAY_MIN = 44        # never set DM Sans smaller than this

# ---- mathematics is set sans-serif, to sit with PingFang and DM Sans --------
# Computer Modern's serif italic is the 3Blue1Brown look and clashes with a
# sans interface. \mathsf{} alone is not enough: it leaves Greek letters and
# anything inside \text{} serif, so the line ends up mixed. helvet + sfmath
# converts equations, Greek and \text{} together.
#
# Needs two TeX packages:  tlmgr install sfmath helvet
def _sans_tex_template():
    t = TexTemplate()
    t.add_to_preamble(r"\usepackage{helvet}")
    t.add_to_preamble(r"\renewcommand{\familydefault}{\sfdefault}")
    t.add_to_preamble(r"\usepackage{sfmath}")
    return t


TEX_SANS = _sans_tex_template()
config.tex_template = TEX_SANS   # a default, but NOT something to rely on:
# Manim re-initialises config between scenes when several are rendered in one
# command, so some scenes silently fall back to Computer Modern. Always build
# mathematics with mtex()/step(), which pass the template explicitly.


SIZE_TITLE = 52
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
SIZE_CAPTION = 24 if config.pixel_height > config.pixel_width else 28
SIZE_MIN = 22


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
        # PLUS a two-line caption, because captions wrap rather than shrink —
        # size it for one line and a wrapped cue lands on the diagram.
        self.caption_band = self.h * (0.30 if self.portrait else 0.16)
        self.title_band = self.h * (0.11 if self.portrait else 0.10)
        self.margin = self.w * 0.045

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
        return self.h / 2 - self.title_band

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


# ----------------------------------------------------------------- scene ----
class SQScene(Scene):
    """Base scene carrying the SmartQuest field and layout."""

    def setup_stage(self, gradient=True):
        sync_frame()                      # must run before anything is positioned
        self.camera.background_color = BG
        self.stage = Stage()
        if gradient:
            self.add(brand_field())
        return self.stage


def brand_field():
    """A very low-contrast white-to-slate wash, so the frame reads as a designed
    page rather than a blank white slide."""
    r = Rectangle(width=config.frame_width * 1.02, height=config.frame_height * 1.02,
                  stroke_width=0)
    r.set_fill(color=[BG_LIFT, BG], opacity=1.0)
    r.set_sheen_direction(DOWN)
    r.set_z_index(-100)
    return r


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
def title(text, color=INK, size=SIZE_TITLE):
    """Display type. DM Sans, brand, never below DISPLAY_MIN."""
    return _text(text, max(size, DISPLAY_MIN) * TYPE_SCALE,
                 font=FONT_DISPLAY, weight=BOLD, color=color)


def body(text, color=INK, size=SIZE_BODY, terms=None, term_color=AUX, scale=True):
    """繁中書面語 body text. `terms` colours inline English subject terms.

        body("同一弧上的 inscribed angle 相等。", terms=["inscribed angle"])

    """
    t2c = {k: term_color for k in (terms or [])}
    return _text(text, _pt(size) if scale else max(size, SIZE_MIN),
                 font=FONT_TEXT, weight=WEIGHT_TEXT, color=color, t2c=t2c)


def label(text, color=INK, size=SIZE_LABEL, halo=True, halo_color=None):
    """A label on the figure. Haloed by default — see halo().

    Haloing is on because a figure label is exactly the thing that ends up over
    a line. On clear background the halo is invisible (it is the background
    colour), so leaving it on costs nothing.
    """
    t = _text(text, _pt(size), font=FONT_TEXT, weight=WEIGHT_TEXT, color=color)
    return halo_text(t, color=halo_color) if halo else t


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


def mtex(expression, color=INK, size=SIZE_BODY, **kw):
    """Mathematics. Use this instead of MathTex — it pins the sans template and
    applies the aspect-aware type scale."""
    return MathTex(expression, color=color, font_size=_pt(size),
                   tex_template=TEX_SANS, **kw)


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
        mk = lambda t: _text(t, SIZE_CAPTION, font=FONT_TEXT, weight=BOLD).width
        _CAL["cjk"] = mk("測測測測測") / 5
        _CAL["lat"] = mk("semicircle") / 10      # a realistic word, not "mmmm"
        _CAL["sp"] = _CAL["lat"] * 0.55
    return _CAL


def _est_width(t):
    c = _char_w()
    lat = sum(len(m) for m in _LATIN_RUN.findall(t))
    other = len([ch for ch in _LATIN_RUN.sub("", t) if not ch.isspace()])
    return other * c["cjk"] + lat * c["lat"] + t.count(" ") * c["sp"]


def _legal_breaks(text, terms):
    """Indices where a break is allowed: not inside a Latin word, not inside a
    declared term, not before closing punctuation, not after a maths prefix."""
    spans = [m.span() for m in _LATIN_RUN.finditer(text)]
    for t in (terms or []):
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


def _greedy_lines(text, terms, target):
    """Standard greedy line breaker over the legal break points."""
    stops = list(_legal_breaks(text, terms)) + [len(text)]
    lines, start = [], 0
    while start < len(text):
        chosen = None
        for b in stops:
            if b <= start:
                continue
            if _est_width(text[start:b].strip()) <= target:
                chosen = b
            elif chosen is not None:
                break
        if chosen is None:                        # a single unbreakable run
            chosen = next((b for b in stops if b > start), len(text))
        lines.append(text[start:chosen].strip())
        start = chosen
    return [l for l in lines if l]


def wrap_caption(text, terms=None, target=None):
    """Break into lines that each fit `target`. Kept for callers that want the
    string; `fit_caption` is what the caption track uses."""
    if "\n" in text:
        return text
    if target is None:
        target = config.frame_width * 0.91
    return "\n".join(_greedy_lines(text, terms, target))


def caption_text(text, terms=None):
    """Shorts-style caption: bold dark type, no bar, no outline, no glow.

    Each line is its own mobject and the lines are arranged CENTRED — Manim's
    Text left-aligns the lines of a multi-line string, which reads as ragged in
    a caption. Size is FIXED at SIZE_CAPTION for every cue; nothing here scales.
    """
    t2c = {k: CAPTION_TERM for k in (terms or [])}

    def one_line(line):
        return _text(line, SIZE_CAPTION, font=FONT_TEXT, weight=BOLD,
                     color=CAPTION_INK, t2c=t2c)

    lines = [one_line(l) for l in text.split("\n") if l.strip()]
    if len(lines) == 1:
        return lines[0]
    return VGroup(*lines).arrange(DOWN, buff=CAPTION_LINE_GAP)   # centred


def fit_caption(text, terms, max_width, max_lines=3):
    """Wrap to as many lines as the text needs, never scaling the type.

    The width estimate is calibrated, not exact, so the result is MEASURED and
    the target tightened until it really fits. An earlier version trusted the
    estimate and let a line run off both edges of a 9:16 frame.
    """
    cap = caption_text(text, terms)
    if cap.width <= max_width:
        return cap
    target = max_width
    for _ in range(5):
        lines = _greedy_lines(text, terms, target)
        cap = caption_text("\n".join(lines), terms)
        if cap.width <= max_width:
            return cap
        target *= 0.88
    return cap


def brand_rule(width=3.0, thickness=0.07):
    """The signature indigo→purple bar. Use once per video, in the title card."""
    r = Rectangle(width=width, height=thickness, stroke_width=0)
    r.set_fill(color=[BRAND_FROM, BRAND_TO], opacity=1.0)
    r.set_sheen_direction(RIGHT)
    return r


def step(statement, reason=None, color=INK, size=SIZE_HEADING):
    """One derivation line with its DSE reason underneath in grey.

        step(r"\\angle AOQ = 2\\alpha", r"\\text{(ext. }\\angle\\text{ of }\\triangle\\text{)}")
    """
    m = mtex(statement, color=color, size=size)
    if reason is None:
        return VGroup(m)
    r = mtex(reason, color=MUTED, size=int(size * 0.62))
    return VGroup(m, r).arrange(DOWN, buff=0.10, aligned_edge=LEFT)


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
    return VGroup(*[
        Line(mid + u * o - perp * size / 2, mid + u * o + perp * size / 2,
             color=color or LINE, stroke_width=SW_MARK)
        for o in offsets
    ])


# ------------------------------------------------------------- motion ------
# Approved run_times. A teaching video is not a showreel; keep the vocabulary
# small and the pauses real. See references/pacing.md.
T_DRAW = 1.0            # draw a new object
T_REVEAL = 1.2          # reveal a line of text or a derivation step
T_TRANSFORM = 1.5       # morph an existing object
T_CLEAR = 0.6           # fade something away
REST_BEAT = 1.0         # after a normal reveal
REST_AHA = 1.8          # after the aha moment — never shorter


def dim(mobject, opacity=0.3):
    """Dim context instead of deleting it. Students need what came before."""
    return mobject.animate.set_opacity(opacity)
