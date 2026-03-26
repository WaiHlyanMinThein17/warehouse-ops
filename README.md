# Warehouse Ops

A lightweight warehouse operations dashboard for tracking replenishment needs and identifying empty bin locations — built with vanilla JavaScript and designed to work directly with **Business Central** Excel exports. No backend required.

---

## Features

### 📦 Replenishment Dashboard
Upload your **Movement Worksheet** export from Business Central and instantly see:
- Items flagged as **Urgent** (bulk nearly depleted)
- Items flagged for **Replenishment** (BC suggested qty > 0)
- Items to **Watch** (bulk getting low, predicted to need refill soon)
- Items with a **Warehouse Issue** (bulk quantity insufficient for suggested move)
- Status breakdown chart and top-10 suggested qty bar chart
- Bin range filtering, full-text search, column sorting
- Mark items as done with a checklist (persists during the session)
- Export pending task list to Excel

### 🗂️ Empty Bin Finder
Upload your **Bin Contents** export and get:
- Fully empty bins (all items have zero quantity — ready for putaway)
- Partially empty bins (at least one item depleted)
- Zone-by-zone summary cards with empty rate progress bars
- Click a zone card to filter the table instantly
- Export empty/partial bins to Excel

---

## Usage

### Option 1 — Open directly in a browser (no install needed)
```bash
git clone https://github.com/WaiHlyanMinThein17/gpd-warehouse-ops.git
cd gpd-warehouse-ops
# Open index.html in your browser
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### Option 2 — Serve locally (recommended for development)
```bash
# Using Python
python -m http.server 8080

# Using Node.js (npx)
npx serve .

# Then open http://localhost:8080
```

### Option 3 — Deploy to GitHub Pages
1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch** → `main` → `/ (root)`
3. Your dashboard will be live at `https://waihlyanminthein17.github.io/gpd-warehouse-ops`

---

## File Exports from Business Central

### Replenishment module
Export from: **Warehouse → Planning → Movement Worksheet**

Required columns:
| Column | Description |
|--------|-------------|
| `Division item No.` | Internal division item number |
| `Description` | Item description |
| `From Bin Code` | Source bulk bin |
| `To Bin Code` | Destination prime bin |
| `Qty. to Handle` | Suggested quantity to move |
| `Available Qty. to Move` | Current quantity available in bulk |

### Empty Bins module
Export from: **Warehouse → Setup → Bin Contents**

Required columns:
| Column | Description |
|--------|-------------|
| `Zone Code` | Warehouse zone |
| `Bin Code` | Bin location code |
| `Item No.` or `Division Item No.` | Item identifier |
| `Quantity (Base)` | Current quantity in that bin |

---

## Project Structure

```
gpd-warehouse-ops/
├── index.html                  # App shell — loads all scripts and styles
├── assets/
│   ├── css/
│   │   └── styles.css          # All styles with CSS custom properties
│   └── js/
│       ├── core/
│       │   ├── app.js          # Module registry, tab switching, shared state
│       │   └── utils.js        # Shared helpers (parsing, export, DOM, sorting)
│       └── modules/
│           ├── replenishment.js  # Replenishment feature module
│           └── emptybins.js      # Empty Bins feature module
└── docs/
    └── screenshots/            # UI screenshots for documentation
```

### Adding a new module
1. Create `assets/js/modules/yourmodule.js`
2. Add an IIFE that calls `App.register({ id, label, dotColor, mount })`
3. Add `<div id="module-yourmodule" class="module"></div>` to `index.html`
4. Add a `<script src="...">` tag for your new module
5. Add a `<button class="nav-tab" data-module="yourmodule">` in the nav

No changes to existing modules needed.

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Vanilla JS (ES5+) | No build step, runs in any browser |
| [SheetJS (xlsx)](https://github.com/SheetJS/sheetjs) | Excel file parsing and export |
| [Chart.js](https://www.chartjs.org/) | Status donut + bar charts |
| Google Fonts (Syne + IBM Plex Mono) | Typography |
| CSS custom properties | Dark theme design system |

No framework. No bundler. No node_modules. Just open and use.

---

## Roadmap

- [ ] **Receiving module** — track inbound shipments against purchase orders
- [ ] **Cycle Count module** — generate and track physical inventory counts
- [ ] **ML Replenishment Prediction** — predict restock dates before BC flags them (see [WareSight](https://github.com/WaiHlyanMinThein17))
- [ ] **Multi-file history** — persist uploads across sessions with localStorage
- [ ] **Print-friendly task list** — formatted checklist for warehouse floor

---

## License

MIT — free to use, modify, and distribute.