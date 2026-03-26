/**
 * replenishment.js — Replenishment Module
 *
 * Self-contained feature module for the GPD Warehouse Ops app.
 * Renders its own HTML into #module-replenishment, handles its
 * own state, and exposes nothing to the global scope except the
 * App.register() call at the bottom.
 */

(() => {

  /* ── Module state ── */
  let _data     = [];   // all processed rows
  let _filtered = [];   // after tab + search + bin range filters
  let _tab      = 'all';
  let _sortKey  = 'qtyToHandle';
  let _sortDir  = -1;
  let _done     = new Set(); // ids of rows marked complete
  let _donut    = null;
  let _bar      = null;

  const STATUS_LABELS = {
    critical:  'Urgent',
    low:       'Replenish',
    predicted: 'Watch',
    issue:     'Check Bin',
    ok:        'OK',
  };


  /* ── Mount: inject HTML into the panel ── */

  function mount() {
    const panel = document.getElementById('module-replenishment');
    if (!panel) return;
    panel.innerHTML = _html();
    _bindEvents();
  }

  function _html() {
    return `
    <!-- Upload view -->
    <div id="repl-upload">
      <h1 class="page-title">Replenishment Dashboard</h1>
      <p class="page-subtitle">
        Upload your Business Central Movement Worksheet export to see what needs replenishment.
      </p>
      <div class="upload-zone" id="repl-drop-zone">
        <input type="file" id="repl-file-input" accept=".xlsx,.xls,.csv">
        <div class="upload-icon">📦</div>
        <div class="upload-title">Drop your Movement Worksheet Excel file here</div>
        <div class="upload-sub">
          Export from Business Central → Movement Worksheet → Open in Excel<br>
          Accepts .xlsx, .xls, or .csv
        </div>
        <label class="btn btn-primary" for="repl-file-input">Choose File</label>
      </div>
      <button class="demo-link" id="repl-demo-btn">
        No file yet? Load sample data to explore →
      </button>
    </div>

    <!-- Dashboard view (hidden until data loaded) -->
    <div id="repl-dashboard" style="display:none">
      <div id="repl-demo-notice" class="demo-notice" style="display:none">
        ⚡ Showing sample data. Upload your real Business Central export to see live data.
      </div>

      <!-- Stat cards -->
      <div class="stats-row stats-row-5">
        <div class="stat-card urgent">
          <div class="stat-label">Urgent — Move Now</div>
          <div class="stat-value urgent" id="stat-critical">0</div>
          <div class="stat-sub">Bulk nearly depleted</div>
        </div>
        <div class="stat-card warn">
          <div class="stat-label">Replenish</div>
          <div class="stat-value warn" id="stat-low">0</div>
          <div class="stat-sub">BC suggested qty to handle</div>
        </div>
        <div class="stat-card predict">
          <div class="stat-label">Watch — Predict Soon</div>
          <div class="stat-value predict" id="stat-predicted">0</div>
          <div class="stat-sub">Bulk stock getting low</div>
        </div>
        <div class="stat-card issue">
          <div class="stat-label">Warehouse Issue</div>
          <div class="stat-value issue" id="stat-issue">0</div>
          <div class="stat-sub">Bulk qty insufficient</div>
        </div>
        <div class="stat-card ok">
          <div class="stat-label">All Clear</div>
          <div class="stat-value ok" id="stat-ok">0</div>
          <div class="stat-sub">No action needed</div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-title">Status Breakdown</div>
          <div class="chart-sub">Current bin health across all items</div>
          <div style="position:relative;height:200px"><canvas id="repl-donut"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Top 10 Items by Suggested Qty</div>
          <div class="chart-sub">Highest qty to move from Business Central</div>
          <div style="position:relative;height:200px"><canvas id="repl-bar"></canvas></div>
        </div>
      </div>

      <!-- Sub-tabs -->
      <div class="tabs" id="repl-tabs">
        <button class="tab active" data-tab="all">All Items</button>
        <button class="tab" data-tab="critical">🔴 Critical</button>
        <button class="tab" data-tab="low">🟡 Low Stock</button>
        <button class="tab" data-tab="predicted">🟣 Predicted</button>
        <button class="tab" data-tab="issue">🟠 Warehouse Issue</button>
        <button class="tab" data-tab="ok">🟢 OK</button>
      </div>

      <!-- Controls -->
      <div class="controls-row">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" id="repl-search" placeholder="Search item no or bin location...">
        </div>
        <div class="filter-group">
          <span>Bin range</span>
          <input type="text" id="bin-from" placeholder="From" style="width:70px">
          <span class="filter-sep">→</span>
          <input type="text" id="bin-to"   placeholder="To"   style="width:70px">
        </div>
        <button class="btn" id="repl-export-btn">⬇ Export Task List</button>
        <button class="btn btn-danger" id="repl-reset-btn">↺ Reset</button>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <div class="table-head">
          <span class="table-title">Replenishment Items</span>
          <span class="table-count" id="repl-row-count">0 items</span>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th data-sort="divItemNo">Division Item No ↕</th>
                <th data-sort="description">Description ↕</th>
                <th data-sort="bulkBin">Bulk Bin ↕</th>
                <th></th>
                <th data-sort="primeBin">Prime Bin ↕</th>
                <th data-sort="qtyToHandle">Suggested Qty ↕</th>
                <th data-sort="availableQty">Available in Bulk ↕</th>
                <th data-sort="status">Status ↕</th>
                <th>Done</th>
              </tr>
            </thead>
            <tbody id="repl-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>`;
  }


  /* ── Event binding ── */

  function _bindEvents() {
    // File input
    const fileInput = document.getElementById('repl-file-input');
    if (fileInput) fileInput.addEventListener('change', e => {
      if (e.target.files[0]) _handleFile(e.target.files[0]);
    });

    // Drag-and-drop
    const dropZone = document.getElementById('repl-drop-zone');
    if (dropZone) Utils.setupDropZone(dropZone, _handleFile);

    // Demo data
    const demoBtn = document.getElementById('repl-demo-btn');
    if (demoBtn) demoBtn.addEventListener('click', _loadDemo);

    // Reset
    const resetBtn = document.getElementById('repl-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', _reset);

    // Export
    const exportBtn = document.getElementById('repl-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', _export);

    // Search + bin filter (delegated)
    document.getElementById('module-replenishment').addEventListener('input', e => {
      if (['repl-search','bin-from','bin-to'].includes(e.target.id)) _applyFilters();
    });

    // Sub-tabs (delegated)
    const tabs = document.getElementById('repl-tabs');
    if (tabs) tabs.addEventListener('click', e => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      _tab = btn.dataset.tab;
      _applyFilters();
    });

    // Column sort (delegated)
    const thead = document.querySelector('#module-replenishment thead');
    if (thead) thead.addEventListener('click', e => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const key = th.dataset.sort;
      if (_sortKey === key) _sortDir *= -1;
      else { _sortKey = key; _sortDir = -1; }
      _applyFilters();
    });

    // Check-done (delegated on tbody)
    const tbody = document.getElementById('repl-table-body');
    if (tbody) tbody.addEventListener('click', e => {
      const btn = e.target.closest('.check-btn');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      _done.has(id) ? _done.delete(id) : _done.add(id);
      _renderTable();
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

    _data = json.map((row, i) => {
      const divItemNo    = String(row['Division item No.'] || row['Division item No'] || row['Division Item No.'] || '').trim();
      const description  = String(row['Description'] || row['ItemDescription'] || '').trim();
      const bulkBin      = String(row['From Bin Code'] || '').trim();
      const primeBin     = String(row['To Bin Code']   || '').trim();
      const qtyToHandle  = Utils.parseNum(row['Qty. to Handle']);
      const qtyOutstand  = Utils.parseNum(row['Qty. Outstanding']);
      const availableQty = Utils.parseNum(row['Available Qty. to Move']);
      const qtyHandled   = Utils.parseNum(row['Qty. Handled']);

      let status = 'ok';
      if (qtyToHandle > 0 && availableQty > 0 && availableQty < qtyToHandle) {
        status = 'issue';
      } else if (qtyToHandle > 0) {
        status = (availableQty > 0 && (qtyToHandle / availableQty) > 0.6) ? 'critical' : 'low';
      } else if (availableQty > 0 && availableQty < 10) {
        status = 'predicted';
      }

      return { id: i, divItemNo, description, bulkBin, primeBin, qtyToHandle, availableQty, qtyHandled, qtyOutstand, status };
    }).filter(r => r.divItemNo || r.bulkBin || r.primeBin);

    _done.clear();

    document.getElementById('repl-demo-notice').style.display = isDemo ? 'flex' : 'none';
    Utils.hide('repl-upload');
    document.getElementById('repl-dashboard').style.display = 'block';
    App.setLastUpdated();

    _applyFilters();
    _renderCharts();
  }


  /* ── Filtering + sorting ── */

  function _applyFilters() {
    const search  = (document.getElementById('repl-search')?.value || '').toLowerCase();
    const binFrom = (document.getElementById('bin-from')?.value    || '').toUpperCase();
    const binTo   = (document.getElementById('bin-to')?.value      || '').toUpperCase();

    _filtered = _data.filter(r => {
      if (_tab !== 'all' && r.status !== _tab) return false;
      if (search && ![r.divItemNo, r.description, r.bulkBin, r.primeBin].some(v => v.toLowerCase().includes(search))) return false;
      if (binFrom && r.primeBin < binFrom && r.bulkBin < binFrom) return false;
      if (binTo   && r.primeBin > binTo   && r.bulkBin > binTo)   return false;
      return true;
    });

    _filtered.sort(Utils.makeSorter(_sortKey, _sortDir));
    _renderTable();
    _updateStats();
  }


  /* ── Rendering ── */

  function _renderTable() {
    const tbody = document.getElementById('repl-table-body');
    Utils.setText('repl-row-count', _filtered.length + ' items');

    if (!_filtered.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--muted)">No items match your filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = _filtered.map(r => {
      const isDone = _done.has(r.id);
      const availColor = r.status === 'issue'
        ? 'var(--issue)'
        : r.availableQty < 10
          ? 'var(--urgent)'
          : r.availableQty < 20
            ? 'var(--warn)'
            : 'var(--text)';
      const shortage = r.status === 'issue'
        ? `<span style="font-size:11px;color:var(--issue);margin-left:4px">−${r.qtyToHandle - r.availableQty} short</span>`
        : '';

      return `<tr class="${isDone ? 'done-row' : ''}" id="rrow-${r.id}">
        <td class="item-no">${r.divItemNo || '—'}</td>
        <td style="font-size:12px;color:var(--muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.description}">${r.description || '—'}</td>
        <td>${Utils.binChip(r.bulkBin)}</td>
        <td class="arrow-sep">→</td>
        <td>${Utils.binChip(r.primeBin)}</td>
        <td style="font-family:var(--font-mono);font-size:14px;font-weight:500">${Utils.fmtQty(r.qtyToHandle)}</td>
        <td style="font-family:var(--font-mono);font-size:13px;color:${availColor}">${Utils.fmtQty(r.availableQty)}${shortage}</td>
        <td>${Utils.statusBadge(r.status, STATUS_LABELS[r.status])}</td>
        <td><button class="check-btn ${isDone ? 'done' : ''}" data-id="${r.id}">${isDone ? '✓' : ''}</button></td>
      </tr>`;
    }).join('');
  }

  function _updateStats() {
    const c = { critical: 0, low: 0, predicted: 0, ok: 0, issue: 0 };
    _data.forEach(r => c[r.status]++);
    Utils.setText('stat-critical', c.critical);
    Utils.setText('stat-low',      c.low);
    Utils.setText('stat-predicted', c.predicted);
    Utils.setText('stat-ok',       c.ok);
    Utils.setText('stat-issue',    c.issue);
  }

  function _renderCharts() {
    const c = { critical: 0, low: 0, predicted: 0, ok: 0, issue: 0 };
    _data.forEach(r => c[r.status]++);

    if (_donut) _donut.destroy();
    _donut = new Chart(document.getElementById('repl-donut'), {
      type: 'doughnut',
      data: {
        labels: ['Urgent', 'Replenish', 'Watch', 'Check Bin', 'OK'],
        datasets: [{
          data: [c.critical, c.low, c.predicted, c.issue, c.ok],
          backgroundColor: ['#ef4444','#f59e0b','#8b5cf6','#f97316','#10b981'],
          borderColor: '#161b26',
          borderWidth: 3,
          hoverOffset: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: { color: '#6b7280', font: { size: 11 }, boxWidth: 10, padding: 12 },
          },
        },
      },
    });

    const top10 = [..._data]
      .filter(r => r.qtyToHandle > 0)
      .sort((a, b) => b.qtyToHandle - a.qtyToHandle)
      .slice(0, 10);

    if (_bar) _bar.destroy();
    _bar = new Chart(document.getElementById('repl-bar'), {
      type: 'bar',
      data: {
        labels: top10.map(r => r.divItemNo || r.primeBin || '?'),
        datasets: [{
          label: 'Suggested Qty',
          data: top10.map(r => r.qtyToHandle),
          backgroundColor: top10.map(r => r.status === 'critical' ? '#ef444480' : '#f59e0b80'),
          borderColor:     top10.map(r => r.status === 'critical' ? '#ef4444'   : '#f59e0b'),
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: '#9ca3af', font: { size: 11, family: 'IBM Plex Mono' } }, grid: { display: false } },
        },
      },
    });
  }


  /* ── Actions ── */

  function _export() {
    const pending = _filtered.filter(r => !_done.has(r.id));
    Utils.exportToExcel(
      pending.map(r => ({
        'Division Item No': r.divItemNo,
        'Description':      r.description,
        'From Bin (Bulk)':  r.bulkBin,
        'To Bin (Prime)':   r.primeBin,
        'Suggested Qty':    r.qtyToHandle,
        'Available in Bulk': r.availableQty,
        'Status': STATUS_LABELS[r.status],
      })),
      `GPD_Replenishment_${Utils.isoDate()}.xlsx`,
      'Task List'
    );
  }

  function _reset() {
    _data = []; _filtered = []; _done.clear();
    document.getElementById('repl-dashboard').style.display = 'none';
    Utils.show('repl-upload');
  }

  function _loadDemo() {
    const items = [
      { d: '3411432', desc: 'EXPANSION VALVE BLOCK' },
      { d: '3411942', desc: 'EXPANSION VALVE BLOCK' },
      { d: '3411966', desc: 'EXPANSION VALVE BLOCK' },
      { d: '3412028', desc: 'EXP BLOCK 19-22 FORESTER' },
      { d: '3412036', desc: 'EXPANSION VALVE BLOCK HYUNDAI KIA' },
      { d: '1311352', desc: 'A/C COMPRESSOR' },
      { d: '1311489', desc: 'A/C COMPRESSOR W/CLUTCH' },
      { d: '2811044', desc: 'CONDENSER' },
      { d: '2811210', desc: 'PARALLEL FLOW CONDENSER' },
      { d: '4811032', desc: 'ACCUMULATOR DRIER' },
      { d: '4811198', desc: 'FILTER DRIER' },
      { d: '5811055', desc: 'EVAPORATOR CORE' },
      { d: '6811021', desc: 'BLOWER MOTOR' },
      { d: '6811089', desc: 'BLOWER MOTOR W/WHEEL' },
      { d: '7811003', desc: 'O-RING KIT AC SYSTEM' },
      { d: '7811019', desc: 'RAPID SEAL O-RING KIT' },
    ];

    const rows = items.map((item, i) => {
      const avail = i % 4 === 0 ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 40) + 5;
      const qty   = i % 4 === 0 ? Math.floor(Math.random() * 50) + 20 : Math.floor(Math.random() * 10) + 1;
      return {
        'Division item No.': item.d,
        'Item No.': 'H17-' + item.d,
        'Description': item.desc,
        'From Bin Code': `BSP${String(1010 + i).padStart(4, '0')}${['A','B','C','K','J'][i % 5]}`,
        'To Bin Code':   `SP${String(1010 + i).padStart(4, '0')}${['A','B','C','D'][i % 4]}`,
        'Qty. to Handle': qty,
        'Qty. Outstanding': qty,
        'Available Qty. to Move': avail,
        'Qty. Handled': 0,
      };
    });

    _process(rows, true);
  }


  /* ── Register with App ── */

  App.register({
    id:       'replenishment',
    label:    'Replenishment',
    dotColor: 'var(--warn)',
    mount,
  });

})();