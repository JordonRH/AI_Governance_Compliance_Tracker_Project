# Sidebar and showcase verification - 27 September 2026

PR #41 was confirmed merged as `189bc28`; this work branches from that main baseline. Normal local databases and certificates were not used or modified.

## Diagnosis and resulting behaviour

Two separate effects were reproduced with Chromium:

- At 1024 x 600, keyboard navigation to the final desktop navigation item scrolled the entire sidebar. The brand moved from y=28 to y=-281. Only the navigation list now scrolls; branding stays anchored. Decorative footer text is omitted on short desktop windows to leave room for navigation.
- At 1440 x 960, scrolling Accounts by 220 pixels left the live fixed sidebar at viewport y=0. A full-page capture nevertheless placed it at document y=220. The old offscreen skip link also appeared in that capture. This was a capture-coordinate effect, not a downward-moving live fixed container.

The skip link is clipped while unfocused, remains in keyboard order, and appears at y=12 over the content side on desktop or x=20 on mobile. Enter moves focus to the existing main-content target. The mobile navigation remains in normal document flow with horizontal scrolling at widths up to 760 pixels.

Full-page showcase captures explicitly return the document and desktop navigation to the top, wait for network idle, fonts and two animation frames, and assert capture coordinates. PDF excerpts are separately captured from real panels. No CSS is injected to disguise layout problems. Password fields must be empty before capture; each new showcase uses a generated disposable password and isolated database/certificate directory.

## Verification

- `npm.cmd test`: 68 passed.
- `npm.cmd run test:e2e`: 21 passed, including seven new layout regressions and existing automated accessibility scans across all workspace pages, both palettes and both themes.
- `npm.cmd run build`: passed.
- `npm.cmd audit`: zero reported vulnerabilities at verification time.
- New tests cover 1440, 1024, 761, 760 and 390 pixel widths, a 600-pixel-high desktop window, keyboard navigation, skip-link position/focus/next-tab behaviour, long-page scrolling, invalid forms, registry details/editing and action history/editing.
- The first full suite exposed an existing unscoped `Not reviewed` assertion after the new tests seeded additional records. It now checks the actual disclosure row; the complete rerun passed.
- Showcase: 32 full-page captures, all 13 main screens and prior important states, with no browser page errors. The manifest records viewport and capture coordinates. The PDF remains nine pages, with enlarged workflow excerpts and explicit demonstration-content/security limitations.

These are assistant-run checks under Jordon's direction, not human SME, screen-reader, sponsor or deployment acceptance. No sponsor material was sent to anyone.

## Regenerate the showcase

Run from the repository root on Windows with Node 26.5+, installed npm dependencies/Playwright Chromium, Python, ReportLab, Pillow and PyMuPDF. The builder uses Windows Arial fonts. These extra Python dependencies are only for authoring the showcase; running the app does not require Python.

```powershell
python -m pip install reportlab Pillow PyMuPDF
npm.cmd run build
node scripts/capture-showcase.mjs
python scripts/build-showcase.py
```

Check each command succeeds before continuing. Port 5188 must be free. Capture starts its own loopback production server and stops it in a finally block. Disposable fixtures/excerpts stay under ignored `test-results/`; never commit or distribute those fixtures or old helper scripts. The old `focus-showcase.mjs` is superseded: focused captures now use the same fresh fixture and in-memory credentials as the main capture.

The builder writes the sponsor PDF under `output/pdf/` and the manifest, full-resolution PNGs, self-contained gallery and ZIP under `output/showcase/`. This curated fictional deliverable is intentionally tracked; other temporary test artifacts remain ignored. Inspect every regenerated PDF page before publishing it; the ZIP preserves full-resolution originals.

```powershell
python -c "import pymupdf; from pathlib import Path; out=Path('test-results/showcase-pdf-qa'); out.mkdir(parents=True,exist_ok=True); doc=pymupdf.open('output/pdf/aitrace-sponsor-showcase.pdf'); [page.get_pixmap(matrix=pymupdf.Matrix(1.5,1.5)).save(out / ('page-'+str(i+1)+'.png')) for i,page in enumerate(doc)]"
```

Open all nine resulting page images and check legibility, overlap, clipping and spacing. Review the gallery and confirm all 32 manifest entries exist. PDF descriptions must continue to distinguish synthetic assessment rules, temporary self-signed certificates, operator activation and pending human approval.

Final artifact QA: all nine rendered PDF pages were visually inspected after the final rebuild. Enlarged excerpts, captions, footer/page numbers and mobile/overview boundaries were checked; no overlap or unintended clipping remained. All 32 screenshot states were visually reviewed. The ZIP passed its integrity check and contains exactly 32 byte-identical PNG originals plus the matching HTML, JSON and README (35 entries). GitHub search confirmed 20 open issues; human review/sponsor tasks remain open.

Follow-up: the desktop sidebar colour now extends through the complete document height, including below the fixed panel in long full-page captures such as account controls (18). Navigation itself remains fixed during page scrolling. A screenshot-pixel regression reproduced the old blue-to-canvas gap and now verifies matching top/bottom rail colours at both desktop widths, in both palettes and light/dark modes. The browser suite now contains 22 tests.

Follow-up verification passed: all 23 browser tests and the production build. All 32 screenshots were regenerated; every desktop capture with a sidebar has matching top/bottom rail pixels, including screenshot 18. The refreshed nine-page PDF was rendered and visually reviewed again, and ZIP originals match the output PNGs.
