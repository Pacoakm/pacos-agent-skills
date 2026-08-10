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

Everything here is derived from SmartQuestApp/DESIGN.md. Colours are lifted for
legibility on the dark navy field; the brand hues themselves are too dark to
draw thin lines with.
"""
from manim import *
import numpy as np

# --------------------------------------------------------------- palette ----
BG = "#0F172A"          # SmartQuest foreground navy, used here as the field
BG_LIFT = "#152037"     # subtle vertical lift so the frame is not flat black
INK = "#F1F5F9"         # primary text
MUTED = "#94A3B8"       # captions, secondary notes
LINE = "#64748B"        # neutral geometry: axes, unemphasised strokes

# Teaching semantics. A colour means one thing for a whole video AND across the
# series. Never reassign inside a lesson.
GIVEN = "#7C8CF8"       # what the question gives you          (brand indigo, lifted)
UNKNOWN = "#C084FC"     # what you are solving for             (brand purple, lifted)
RESULT = "#34D399"      # a confirmed result / correct step
WARN = "#F87171"        # the misconception, the trap, the wrong turn
AUX = "#FBBF24"         # construction: added lines, radii, tick marks

BRAND_FROM = "#4B60D6"  # gradient start — brand primary
BRAND_TO = "#9747FF"    # gradient end

PALETTE = dict(bg=BG, ink=INK, muted=MUTED, line=LINE, given=GIVEN,
               unknown=UNKNOWN, result=RESULT, warn=WARN, aux=AUX)

# ------------------------------------------------------------ typography ----
# PingFang HK renders 繁體中文 and inline Latin cleanly under Manim's Pango
# renderer, so it is the single Text() face. DM Sans is brand, but its Latin
# kerning breaks under Pango below ~44pt, so it is display-only.
FONT_TEXT = "PingFang HK"
FONT_DISPLAY = "DM Sans"
DISPLAY_MIN = 44        # never set DM Sans smaller than this

SIZE_TITLE = 52
SIZE_HEADING = 38
SIZE_BODY = 32
SIZE_LABEL = 26
SIZE_CAPTION = 30       # the subtitle track
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
    """A very low-contrast vertical lift so the frame reads as SmartQuest navy
    rather than as a flat black slide."""
    r = Rectangle(width=config.frame_width * 1.02, height=config.frame_height * 1.02,
                  stroke_width=0)
    r.set_fill(color=[BG_LIFT, BG], opacity=1.0)
    r.set_sheen_direction(DOWN)
    r.set_z_index(-100)
    return r


# --------------------------------------------------------------- elements ----
def title(text, color=INK, size=SIZE_TITLE):
    """Display type. DM Sans, brand, never below DISPLAY_MIN."""
    return Text(text, font=FONT_DISPLAY, weight=BOLD,
                font_size=max(size, DISPLAY_MIN), color=color)


def body(text, color=INK, size=SIZE_BODY, terms=None):
    """繁中書面語 body text. `terms` colours inline English subject terms.

        body("同一弧上的 inscribed angle 相等。", terms=["inscribed angle"])
    """
    t2c = {k: AUX for k in (terms or [])}
    return Text(text, font=FONT_TEXT, font_size=max(size, SIZE_MIN), color=color, t2c=t2c)


def label(text, color=MUTED, size=SIZE_LABEL):
    return Text(text, font=FONT_TEXT, font_size=max(size, SIZE_MIN), color=color)


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
    m = MathTex(statement, color=color, font_size=size)
    if reason is None:
        return VGroup(m)
    r = MathTex(reason, color=MUTED, font_size=int(size * 0.62))
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
