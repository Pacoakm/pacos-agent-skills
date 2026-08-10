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

# Subtitle band: a square-cornered, semi-transparent black bar with white text,
# so a caption stays readable whatever it happens to sit over.
CAPTION_BAND = "#000000"
CAPTION_BAND_OPACITY = 0.62
CAPTION_INK = "#FFFFFF"
# The band is a DARK surface sitting on a light page, so an English term inside
# a caption cannot use AUX — that hue is chosen for contrast against the page
# and goes muddy here. Measured 4.63:1 against the composited band.
CAPTION_TERM = "#FDE047"

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
SIZE_LABEL = 26
SIZE_CAPTION = 23       # the subtitle track
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
        # Reserved bands. Portrait keeps more at the bottom because the
        # platform UI (Shorts/Reels/TikTok) covers roughly the lowest 15%.
        self.caption_band = self.h * (0.22 if self.portrait else 0.13)
        self.title_band = self.h * (0.11 if self.portrait else 0.10)
        self.margin = self.w * 0.045

    # -- anchors ------------------------------------------------------------
    @property
    def title_y(self):
        return self.h / 2 - self.title_band * 0.55

    @property
    def caption_y(self):
        """Baseline for the subtitle track — inside the safe band, not at the edge."""
        return -self.h / 2 + self.caption_band * (0.62 if self.portrait else 0.48)

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
_PORTRAIT_BOOST = 2.0
TYPE_SCALE = (config.frame_width / 14.2222) * (
    _PORTRAIT_BOOST if config.pixel_height > config.pixel_width else 1.0)


def _pt(size):
    return max(size, SIZE_MIN) * TYPE_SCALE


# --------------------------------------------------------------- elements ----
def title(text, color=INK, size=SIZE_TITLE):
    """Display type. DM Sans, brand, never below DISPLAY_MIN."""
    return Text(text, font=FONT_DISPLAY, weight=BOLD,
                font_size=max(size, DISPLAY_MIN) * TYPE_SCALE, color=color)


def body(text, color=INK, size=SIZE_BODY, terms=None, term_color=AUX, scale=True):
    """繁中書面語 body text. `terms` colours inline English subject terms.

        body("同一弧上的 inscribed angle 相等。", terms=["inscribed angle"])

    Pass `term_color=CAPTION_TERM` when the text sits on the dark caption band.
    """
    t2c = {k: term_color for k in (terms or [])}
    return Text(text, font=FONT_TEXT, weight=WEIGHT_TEXT, color=color, t2c=t2c,
                font_size=_pt(size) if scale else max(size, SIZE_MIN))


def label(text, color=MUTED, size=SIZE_LABEL):
    return Text(text, font=FONT_TEXT, weight=WEIGHT_TEXT,
                font_size=_pt(size), color=color)


def mtex(expression, color=INK, size=SIZE_BODY, **kw):
    """Mathematics. Use this instead of MathTex — it pins the sans template and
    applies the aspect-aware type scale."""
    return MathTex(expression, color=color, font_size=_pt(size),
                   tex_template=TEX_SANS, **kw)


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
