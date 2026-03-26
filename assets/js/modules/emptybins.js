/**
 * emptybins.js — Empty Bins Module
 *
 * Self-contained feature module for the GPD Warehouse Ops app.
 * Groups bin contents by Zone + Bin Code, flags bins where every
 * item has zero quantity as "fully empty", partial empty otherwise.
 */

(() => {

  /* ── Module state ── */
  let _data     = [];   // processed bin objects
  let _filtered = [];   // after tab + zone + search filters
  let _tab      = 'all';
  let _sortKey  = 'status';
  let _sortDir  = 1;

  const STATUS_ORDER = { empty: 0, partial: 1, active: 2 };


  /* ── Mount ── */

  function mount() {
    const panel = document.getElementById('module-emptybins');
    if (!panel) return;
    panel.innerHTML = _html();
    _bindEvents();
  }

  function _html() {
    return `
    <!-- Upload view -->
    <div id="empty-upload">
      <h1 class="page-title">Empty Bin Finder</h1>
      <p class="page-subtitle">
        Upload your Bin Contents export to identify empty bin locations across all zones.
        A bin is empty when <strong>all items in it have zero quantity</strong>.
      </p>

      <!-- Algorithm explainer -->
      <div class="algo-box">
        <div class="algo-box-title">📋 How it works</div>
        <div class="algo-steps">
          <div class="algo-step">
            <div class="algo-step-title">Zone Code</div>
            <div>e.g. 01ZONE, 02ZONE</div>
          </div>
          <div class="algo-arrow">→</div>
          <div class="algo-step">
            <div class="algo-step-title">Bin Location</div>
            <div>Group all items per bin</div>
          </div>
          <div class="algo-arrow">→</div>
          <div class="algo-step">
            <div class="algo-step-title">Check Quantities</div>
            <div>All items qty = 0?</div>
          </div>
          <div class="algo-arrow">→</div>
          <div class="algo-step highlight">
            <div class="algo-step-title empty">🟦 Empty Bin</div>
            <div>Ready for putaway</div>
          </div>
        </div>
        <div class="algo-note">
          ⚠ <strong style="color:var(--warn)">Partial empty</strong> = bin has multiple items but at least one is zero qty
        </div>
      </div>

      <div class="upload-zone" id="empty-drop-zone">
        <input type="file" id="empty-file-input" accept=".xlsx,.xls,.csv">
        <div class="upload-icon">🗂️</div>
        <div class="upload-title">Drop your Bin Contents Excel file here</div>
        <div class="upload-sub">
          Export from Business Central → Bin Contents → Open in Excel<br>
          Needs columns: Zone Code, Bin Code, Item No., Quantity (Base)
        </div>
        <label class="btn btn-primary" for="empty-file-input">Choose File</label>
      </div>
      <button class="demo-link" id="empty-demo-btn">
        No file yet? Load sample data to explore →
      </button>
    </div>

    <!-- Dashboard view (hidden until data loaded) -->
    <div id="empty-dashboard" style="display:none">
      <div id="empty-demo-notice" class="demo-notice" style="display:none">
        ⚡ Showing sample data. Upload your real Bin Contents export to see live data.
      </div>

      <!-- Stat cards -->
      <div class="stats-row stats-row-4">
        <div class="stat-card empty-c">
          <div class="stat-label">Fully Empty Bins</div>
          <div class="stat-value empty-c" id="estat-empty">0</div>
          <div class="stat-sub">All items at zero qty</div>
        </div>
        <div class="stat-card warn">
          <div class="stat-label">Partial Empty</div>
          <div class="stat-value warn" id="estat-partial">0</div>
          <div class="stat-sub">Some items depleted</div>
        </div>
        <div class="stat-card ok">
          <div class="stat-label">Active Bins</div>
          <div class="stat-value ok" id="estat-active">0</div>
          <div class="stat-sub">All items have stock</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Zones Scanned</div>
          <div class="stat-value" id="estat-zones">0</div>
          <div class="stat-sub">Unique zone codes</div>
        </div>
      </div>

      <!-- Zone summary cards -->
      <div id="zone-grid" class="zone-grid"></div>

      <!-- Toolbar: tabs + action buttons -->
      <div class="module-toolbar">
        <div class="tabs" id="empty-tabs">
          <button class="tab active" data-tab="all">All Bins</button>
          <button class="tab" data-tab="empty">🟦 Fully Empty</button>
          <button class="tab" data-tab="partial">🟡 Partial Empty</button>
          <button class="tab" data-tab="active">🟢 Active</button>
        </div>
        <div class="toolbar-actions">
          <button class="btn" id="empty-export-btn">⬇ Export Empty Bins</button>
          <button class="btn btn-danger" id="empty-reset-btn">↺ Reset</button>
        </div>
      </div>

      <!-- Search + zone filter -->
      <div class="controls-row">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" id="empty-search" placeholder="Search bin code or item no...">
        </div>
        <div class="filter-group">
          <span>Zone</span>
          <select id="zone-filter">
            <option value="">All Zones</option>
          </select>
        </div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <div class="table-head">
          <span class="table-title">Bin Contents Analysis</span>
          <span class="table-count" id="empty-row-count">0 bins</span>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th data-sort="zone">Zone ↕</th>
                <th data-sort="binCode">Bin Code ↕</th>
                <th>Items in Bin</th>
                <th data-sort="totalQty">Total Qty ↕</th>
                <th data-sort="itemCount">Item Count ↕</th>
                <th data-sort="status">Status ↕</th>
              </tr>
            </thead>
            <tbody id="empty-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>`;
  }


  /* ── Event binding ── */

  function _bindEvents() {
    const panel = document.getElementById('module-emptybins');

    // File input
    panel.querySelector('#empty-file-input')?.addEventListener('change', e => {
      if (e.target.files[0]) _handleFile(e.target.files[0]);
    });

    // Drag-and-drop
    const dropZone = document.getElementById('empty-drop-zone');
    if (dropZone) Utils.setupDropZone(dropZone, _handleFile);

    // Demo
    panel.querySelector('#empty-demo-btn')?.addEventListener('click', _loadDemo);

    // Reset
    panel.querySelector('#empty-reset-btn')?.addEventListener('click', _reset);

    // Export
    panel.querySelector('#empty-export-btn')?.addEventListener('click', _export);

    // Search + zone filter (delegated)
    panel.addEventListener('input', e => {
      if (['empty-search'].includes(e.target.id)) _applyFilters();
    });
    panel.addEventListener('change', e => {
      if (e.target.id === 'zone-filter') _applyFilters();
    });

    // Sub-tabs (delegated)
    const tabs = document.getElementById('empty-tabs');
    if (tabs) tabs.addEventListener('click', e => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      _tab = btn.dataset.tab;
      _applyFilters();
    });

    // Column sort (delegated)
    panel.querySelector('thead')?.addEventListener('click', e => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const key = th.dataset.sort;
      if (_sortKey === key) _sortDir *= -1;
      else { _sortKey = key; _sortDir = 1; }
      _applyFilters();
    });
  }


  /* ── File handling ── */

  async function _handleFile(file) {
    try {
      const rows = await Utils.parseExcelFile(file);
      _process(rows, false);
    } catch {
      alert('Could not read file. Make sure it is a valid .xlsx, .xls, or .csv export.');
    }
  }


  /* ── Data processing ── */

  function _process(json, isDemo) {
    if (!json.length) { alert('No data found in the file.'); return; }

    // Group rows by Zone + Bin key
    const binMap = {};
    json.forEach(row => {
      const zone    = String(row['Zone Code'] || row['Zone Filter'] || row['ZONE CODE'] || '').trim();
      const binCode = String(row['Bin Code']  || row['BIN CODE']   || '').trim();
      const itemNo  = String(row['Division Item No.'] || row['Division item No.'] || row['Item No.'] || row['Item No'] || '').trim();
      const qty     = Utils.parseNum(row['Quantity (Base)'] || row['Quantity'] || row['QTY']);
      const desc    = String(row['ItemDescription'] || row['Description'] || '').trim();

      if (!zone && !binCode) return;
      const key = zone + '||' + binCode;
      if (!binMap[key]) binMap[key] = { zone, binCode, items: [] };
      binMap[key].items.push({ itemNo, qty, desc });
    });

    // Determine status for each bin
    _data = Object.values(binMap).map(bin => {
      const totalQty   = bin.items.reduce((s, i) => s + i.qty, 0);
      const zeroItems  = bin.items.filter(i => i.qty === 0).length;
      const status     = totalQty === 0 ? 'empty' : zeroItems > 0 ? 'partial' : 'active';
      return {
        zone:      bin.zone,
        binCode:   bin.binCode,
        items:     bin.items,
        totalQty,
        itemCount: bin.items.length,
        zeroItems,
        status,
      };
    });

    // Populate zone filter dropdown
    const zones = [...new Set(_data.map(b => b.zone))].sort();
    const sel   = document.getElementById('zone-filter');
    if (sel) {
      sel.innerHTML = '<option value="">All Zones</option>' +
        zones.map(z => `<option value="${z}">${z}</option>`).join('');
    }

    document.getElementById('empty-demo-notice').style.display = isDemo ? 'flex' : 'none';
    Utils.hide('empty-upload');
    document.getElementById('empty-dashboard').style.display = 'block';
    App.setLastUpdated();

    _updateStats();
    _buildZoneGrid(zones);
    _applyFilters();
  }


  /* ── Stats ── */

  function _updateStats() {
    Utils.setText('estat-empty',   _data.filter(b => b.status === 'empty').length);
    Utils.setText('estat-partial', _data.filter(b => b.status === 'partial').length);
    Utils.setText('estat-active',  _data.filter(b => b.status === 'active').length);
    Utils.setText('estat-zones',   new Set(_data.map(b => b.zone)).size);
  }


  /* ── Zone grid ── */

  function _buildZoneGrid(zones) {
    const grid = document.getElementById('zone-grid');
    if (!grid) return;

    grid.innerHTML = zones.map(zone => {
      const bins    = _data.filter(b => b.zone === zone);
      const empty   = bins.filter(b => b.status === 'empty').length;
      const partial = bins.filter(b => b.status === 'partial').length;
      const pct     = bins.length ? Math.round((empty / bins.length) * 100) : 0;

      return `<div class="zone-card" data-zone="${zone}">
        <div class="zone-name">${zone}</div>
        <div class="zone-stats">
          <div>
            <div class="zone-stat-num" style="color:var(--empty)">${empty}</div>
            <div class="zone-stat-lbl">Empty</div>
          </div>
          <div>
            <div class="zone-stat-num" style="color:var(--warn)">${partial}</div>
            <div class="zone-stat-lbl">Partial</div>
          </div>
          <div>
            <div class="zone-stat-num">${bins.length}</div>
            <div class="zone-stat-lbl">Total Bins</div>
          </div>
        </div>
        <div class="zone-bar-wrap">
          <div class="zone-bar-header">
            <span>Empty rate</span><span>${pct}%</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width:${pct}%;background:var(--empty)"></div>
          </div>
        </div>
      </div>`;
    }).join('');

    // Click zone card → filter table to that zone
    grid.addEventListener('click', e => {
      const card = e.target.closest('.zone-card');
      if (!card) return;
      const sel = document.getElementById('zone-filter');
      if (sel) { sel.value = card.dataset.zone; _applyFilters(); }
    });
  }


  /* ── Filtering + sorting ── */

  function _applyFilters() {
    const search     = (document.getElementById('empty-search')?.value  || '').toLowerCase();
    const zoneFilter = document.getElementById('zone-filter')?.value || '';

    _filtered = _data.filter(b => {
      if (_tab !== 'all' && b.status !== _tab) return false;
      if (zoneFilter && b.zone !== zoneFilter) return false;
      if (search && !b.binCode.toLowerCase().includes(search) &&
          !b.items.some(i => i.itemNo.toLowerCase().includes(search))) return false;
      return true;
    });

    _filtered.sort((a, b) => {
      if (_sortKey === 'status') return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * _sortDir;
      return Utils.makeSorter(_sortKey, _sortDir)(a, b);
    });

    _renderTable();
  }


  /* ── Table rendering ── */

  function _renderTable() {
    const tbody = document.getElementById('empty-table-body');
    Utils.setText('empty-row-count', _filtered.length + ' bins');

    if (!_filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">No bins match your filters.</td></tr>`;
      return;
    }

    const labelMap = { empty: 'Fully Empty', partial: 'Partial Empty', active: 'Active' };

    tbody.innerHTML = _filtered.map(b => {
      const itemsHtml = b.items.map(i =>
        `<span class="item-chip">
          <span class="item-no" style="${i.qty === 0 ? 'color:var(--urgent)' : ''}">${i.itemNo || '?'}</span>
          <span class="item-qty" style="color:${i.qty === 0 ? 'var(--urgent)' : 'var(--muted)'}">×${i.qty}</span>
        </span>`
      ).join('');

      return `<tr>
        <td><span class="zone-tag">${b.zone}</span></td>
        <td>${Utils.binChip(b.binCode, b.status === 'empty')}</td>
        <td class="items-cell">${itemsHtml}</td>
        <td style="font-family:var(--font-mono);color:${b.totalQty === 0 ? 'var(--empty)' : 'var(--text)'}">${b.totalQty}</td>
        <td style="font-family:var(--font-mono)">${b.itemCount}</td>
        <td>${Utils.statusBadge(b.status, labelMap[b.status])}</td>
      </tr>`;
    }).join('');
  }


  /* ── Actions ── */

  function _export() {
    const rows = _filtered
      .filter(b => b.status === 'empty' || b.status === 'partial')
      .map(b => ({
        'Zone Code':      b.zone,
        'Bin Code':       b.binCode,
        'Status':         b.status === 'empty' ? 'Fully Empty' : 'Partial Empty',
        'Total Qty':      b.totalQty,
        'Item Count':     b.itemCount,
        'Zero Qty Items': b.zeroItems,
        'Items':          b.items.map(i => `${i.itemNo}(×${i.qty})`).join(', '),
      }));

    Utils.exportToExcel(rows, `GPD_EmptyBins_${Utils.isoDate()}.xlsx`, 'Empty Bins');
  }

  function _reset() {
    _data = []; _filtered = [];
    document.getElementById('empty-dashboard').style.display = 'none';
    Utils.show('empty-upload');
  }

  function _loadDemo() {
    const zones = ['01ZONE', '02ZONE', '03ZONE'];
    const rows  = [];

    zones.forEach((zone, zi) => {
      for (let b = 1; b <= 20; b++) {
        const binCode  = `${zi + 1}B${String(b).padStart(3, '0')}A${b % 3 + 1}`;
        const numItems = (b % 3) + 1;
        for (let it = 0; it < numItems; it++) {
          const isEmpty = (b % 5 === 0 && zi === 0) || (b % 7 === 0);
          const isZero  = isEmpty || (b % 4 === 0 && it === 0);
          rows.push({
            'Zone Code':       zone,
            'Bin Code':        binCode,
            'Item No.':        `H${10 + zi}-${110000 + b * 10 + it}`,
            'Division Item No.': `34${b * 10 + it}00`,
            'ItemDescription': ['EXPANSION VALVE','A/C COMPRESSOR','CONDENSER','BLOWER MOTOR','EVAPORATOR CORE'][it % 5],
            'Quantity (Base)': isZero ? 0 : Math.floor(Math.random() * 20) + 1,
          });
        }
      }
    });

    _process(rows, true);
  }


  /* ── Register with App ── */

  App.register({
    id:       'emptybins',
    label:    'Empty Bins',
    dotColor: 'var(--empty)',
    mount,
  });

})();