#!/usr/bin/env python3
"""Validate a Paco Interactive Educator inline HTML fragment."""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

MAX_BYTES = 2 * 1024 * 1024
EXPECTED_STEPS = {"1", "2", "3", "4"}
FORBIDDEN_PATTERNS = {
    "fetch": r"\bfetch\s*\(",
    "XMLHttpRequest": r"\bXMLHttpRequest\b",
    "WebSocket": r"\bWebSocket\b",
    "localStorage": r"\blocalStorage\b",
    "sessionStorage": r"\bsessionStorage\b",
    "IndexedDB": r"\bindexedDB\b",
    "cookies": r"\bdocument\s*\.\s*cookie\b",
}


class FragmentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[str] = []
        self.ids: list[str] = []
        self.screens: list[str] = []
        self.questions: list[str] = []
        self.stage_count = 0
        self.hint_count = 0
        self.interactive_count = 0
        self.script_chunks: list[str] = []
        self._inside_script = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.append(tag)
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"] or "")
        if values.get("data-lesson-screen"):
            self.screens.append(values["data-lesson-screen"] or "")
        if values.get("data-socratic-question"):
            self.questions.append(values["data-socratic-question"] or "")
        if "data-lesson-stage" in values:
            self.stage_count += 1
        if "data-progressive-hint" in values:
            self.hint_count += 1
        if tag in {"button", "input", "select", "textarea", "canvas", "svg"}:
            self.interactive_count += 1
        if tag == "script":
            self._inside_script = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "script":
            self._inside_script = False

    def handle_data(self, data: str) -> None:
        if self._inside_script:
            self.script_chunks.append(data)


def validate_text(text: str, size_bytes: int) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    parser = FragmentParser()
    parser.feed(text)

    if size_bytes > MAX_BYTES:
        errors.append(f"fragment is {size_bytes} bytes; maximum is {MAX_BYTES}")

    full_document_tags = sorted({tag for tag in parser.tags if tag in {"html", "head", "body"}})
    if full_document_tags:
        errors.append("inline fragment contains full-document tags: " + ", ".join(full_document_tags))

    duplicate_ids = sorted(identifier for identifier, count in Counter(parser.ids).items() if count > 1)
    if not parser.ids:
        errors.append("fragment has no root id")
    if duplicate_ids:
        errors.append("duplicate ids: " + ", ".join(duplicate_ids))

    if set(parser.screens) != EXPECTED_STEPS or len(parser.screens) != 4:
        errors.append('expected exactly data-lesson-screen="1" through "4"')
    if set(parser.questions) != EXPECTED_STEPS or len(parser.questions) != 4:
        errors.append('expected exactly data-socratic-question="1" through "4"')
    if parser.stage_count != 1:
        errors.append(f"expected one persistent data-lesson-stage; found {parser.stage_count}")
    if parser.hint_count < 1:
        errors.append("Challenge needs a data-progressive-hint control or region")
    if parser.interactive_count < 4:
        errors.append("too few native interactive or visual elements for four stages")

    for label, pattern in FORBIDDEN_PATTERNS.items():
        if re.search(pattern, text):
            errors.append(f"forbidden browser API found: {label}")

    script_text = "\n".join(parser.script_chunks)
    has_pointer = bool(re.search(r"pointer(?:down|move|up|cancel)|onPointer", script_text, re.IGNORECASE))
    if any(tag in parser.tags for tag in {"canvas", "svg"}) and not has_pointer:
        warnings.append("canvas/SVG found without an obvious Pointer Events handler")
    if "prefers-reduced-motion" not in text:
        warnings.append("no prefers-reduced-motion handling found")
    if "aria-label" not in text and "aria-describedby" not in text:
        warnings.append("no accessible name or description found")

    return errors, warnings


GOOD_SAMPLE = """
<div id="lesson-root">
  <nav><button>1</button><button>2</button><button>3</button><button>4</button></nav>
  <section data-lesson-screen="1"><h2 data-socratic-question="1">Q1</h2></section>
  <section data-lesson-screen="2"><h2 data-socratic-question="2">Q2</h2></section>
  <section data-lesson-screen="3"><h2 data-socratic-question="3">Q3</h2></section>
  <section data-lesson-screen="4"><h2 data-socratic-question="4">Q4</h2></section>
  <canvas data-lesson-stage aria-label="Interactive stage"></canvas>
  <button data-progressive-hint>Hint</button>
  <style>@media (prefers-reduced-motion: reduce) { canvas { opacity: 1; } }</style>
  <script>document.querySelector('canvas').addEventListener('pointerdown', () => {});</script>
</div>
"""

BAD_SAMPLE = """
<html><body><div id="bad"><section data-lesson-screen="1">Only one</section>
<canvas></canvas><script>fetch('/x'); localStorage.x = 1;</script></div></body></html>
"""


def run_self_test() -> int:
    good_errors, _ = validate_text(GOOD_SAMPLE, len(GOOD_SAMPLE.encode("utf-8")))
    bad_errors, _ = validate_text(BAD_SAMPLE, len(BAD_SAMPLE.encode("utf-8")))
    if good_errors:
        print("Self-test failed: valid sample was rejected", file=sys.stderr)
        for error in good_errors:
            print(f"  - {error}", file=sys.stderr)
        return 1
    if len(bad_errors) < 5:
        print("Self-test failed: invalid sample was not rejected strongly enough", file=sys.stderr)
        return 1
    print("Self-test passed")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fragment", nargs="?", type=Path)
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures")
    parser.add_argument("--self-test", action="store_true", help="Run built-in positive and negative tests")
    args = parser.parse_args()

    if args.self_test:
        return run_self_test()
    if args.fragment is None:
        parser.error("fragment is required unless --self-test is used")
    if not args.fragment.is_file():
        print(f"File not found: {args.fragment}", file=sys.stderr)
        return 2

    raw = args.fragment.read_bytes()
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        print(f"Fragment is not UTF-8: {exc}", file=sys.stderr)
        return 1

    errors, warnings = validate_text(text, len(raw))
    for warning in warnings:
        print(f"WARNING: {warning}")
    for error in errors:
        print(f"ERROR: {error}")

    if errors or (args.strict and warnings):
        return 1
    print(f"Passed: {args.fragment}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
