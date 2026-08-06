# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A warehouse operations dashboard for GPD (Macon / OAC) that turns **Business Central** Excel exports into actionable views. Vanilla JS frontend, no build step, no framework, no `node_modules`. A small Flask backend exists **only** to generate the Processing Log Excel file server-side; every other module runs entirely client-side.

## Running

```bash
# Full app including Processing Log generator (needs the backend)
pip install -r requirements.txt
python server.py            # serves index.html + /api at http://localhost:5000

# Windows one-click
START.bat

# Frontend-only (Processing Log download will fail — it POSTs to /api)
python -m http.server 8080  # or: npx serve .   or just open index.html
```

There is no build, lint, or test tooling. Changes are verified by loading the app in a browser (use "Load sample data" buttons on the Replenishment / Empty Bins / Sales Analytics modules — no real export needed).

## Architecture

**Module registry pattern.** `assets/js/core/app.js` exposes a global `window.App`. Each feature is a self-contained IIFE in `assets/js/modules/` that calls `App.register({ id, label, dotColor, mount })` at load time. `App` owns tab switching, lazy mounting (a module's `mount()` runs once, the first time it's shown), the breadcrumb back-bar, and `_activeModule` state. Modules never call each other.

**Shared helpers live in `window.Utils`** (`assets/js/core/utils.js`): Excel parse/export via SheetJS (`parseExcelFile`, `exportToExcel`), drag-drop wiring (`setupDropZone`), sorting (`makeSorter`), and DOM/format helpers. Use these instead of re-implementing — every module depends on them.

**No client-side router or persistent store.** Navigation is home-card driven (`data-target` → `App.switchModule`). Uploaded data lives in module-local closure variables (e.g. `_data`, `_filtered` in replenishment.js) and is lost on reload. The only things persisted to `localStorage` are the theme (`gpd-theme`, wired in `index.html`) and the replenishment "done" checklist during a session.

**Load order matters** (see bottom of `index.html`): external CDN libs (SheetJS, Chart.js) → `utils.js` → `app.js` → each module. `App.init()` runs on `DOMContentLoaded` and mounts `home`.

### Backend (`server.py`)

Single Flask app, `static_folder='.'`, serving the whole repo. Two real endpoints:

- `GET /api/processing-log?station=&month=&year=` builds a styled `.xlsx` with openpyxl (weekday rows grouped by week, thick border on Fridays, exact column widths/fonts to match the supervisors' original sheet) and streams it as a download. Only `processinglog.js` talks to it. Keep the generated format byte-compatible with the original when editing.
- `POST /api/brow-topsellers` (used by `browreplenishment.js`) accepts three multipart Excel files (`movement`, `items`, `bincontents`) + `topN`, joins them on Division Item No., ranks B-row (`PB2*`) replenishment lines by `Sales (Qty.)`, and returns Top-N JSON. The `items` export is ~59 MB / 425k rows, so it is parsed with **`python-calamine`** (Rust, ~15 s) rather than openpyxl (~113 s); the Items sheet is streamed and filtered to the candidate item set to keep memory low. This is why the module is server-side, unlike the client-side modules.

## Data contracts (Business Central exports)

Modules parse the **first sheet** of the uploaded workbook and key off exact column header names. When adding/changing parsing, match these headers:

- **Replenishment** (Movement Worksheet): `Division item No.`, `Description`, `From Bin Code`, `To Bin Code`, `Qty. to Handle`, `Available Qty. to Move`. Status is derived (Urgent / Replenish / Watch / Check Bin / OK) — see `STATUS_LABELS` and the classification logic in `replenishment.js`.
- **Empty Bins** (Bin Contents): `Zone Code`, `Bin Code`, `Item No.` or `Division Item No.`, `Quantity (Base)`.

## Adding a module

1. Create `assets/js/modules/<name>.js` as an IIFE that defines `mount()` (render into `document.getElementById('module-<name>')`) and ends with `App.register({ id, label, dotColor, mount })`.
2. Add `<div id="module-<name>" class="module"></div>` in `index.html`.
3. Add its `<script>` tag **after** the core scripts in `index.html`.
4. Add a `home-card` with `data-target="<name>"` in `home.js`.

Existing modules require no changes.

## Conventions

- Styling is a dark/light design system driven by CSS custom properties in `assets/css/styles.css` (`var(--accent)`, `var(--bg2)`, `var(--warn)`, etc.). Prefer these tokens; theme is toggled by `data-theme` on `<html>`.
- Modules build UI as HTML strings in a `_html()` function, inject via `innerHTML`, then wire listeners in `_bindEvents()`. Internal helpers/state are underscore-prefixed and kept private inside the IIFE.
- The stylesheet is `styles.css` (renamed from `style.css` — don't reintroduce the old name).
