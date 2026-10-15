#!/usr/bin/env python3
"""Capture each dashboard tab with Playwright (headless Chromium)."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
DOCS.mkdir(exist_ok=True)

TABS = [
    "overview",
    "history",
    "pillars",
    "results",
    "sustainability",
    "sectoral",
    "social",
    "risks",
    "comparisons",
    "scenarios",
    "scorecard",
    "conclusion",
]

from playwright.sync_api import sync_playwright


def main():
    base = "http://127.0.0.1:8765/"
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))
        for tab in TABS:
            page.goto(f"{base}#{tab}", wait_until="networkidle", timeout=60000)
            page.wait_for_timeout(1200)
            out1 = Path(f"/workspace/arg_{tab}.png")
            out2 = DOCS / f"tab-{tab}.png"
            page.screenshot(path=str(out1), full_page=True)
            page.screenshot(path=str(out2), full_page=True)
            print("wrote", out1, out2)
        browser.close()
    if errors:
        print("CONSOLE_ERRORS:", *errors, sep="\n")
        sys.exit(1)
    print("OK zero console errors")


if __name__ == "__main__":
    main()
