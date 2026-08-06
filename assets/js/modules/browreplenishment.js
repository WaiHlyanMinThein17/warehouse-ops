/**
 * browreplenishment.js — B-Row Top Sellers Replenishment Module
 *
 * Joins three Business Central exports (Movement Worksheet + Items + Bin
 * Contents) on Division Item No. to prioritise replenishing the best-selling
 * items on the B row (prime bins PB2*). The heavy join runs server-side
 * (POST /api/brow-topsellers) because the Items export is ~59MB / 425k rows;
 * the browser only receives the ranked result.
 */

(() => {

  let _all = [];                 // full ranked list from the server
  let _files = { movement: null, items: null, bincontents: null };
  let _topN = '50';
  let _sortKey = 'rank', _sortDir = 1;
  let _timer = null;

  const STATUS_CLASS = { 'Check Bin': 'issue', 'Replenish': 'low', 'OK': 'ok' };

  const ZONES = [
    { key: 'movement',    icon: '📦', title: 'Replenishment / Movement Worksheet', hint: 'B-row replenishment lines from Business Central' },
    { key: 'items',       icon: '📊', title: 'Items Export',                         hint: 'Full item catalogue with Sales (Qty.) — large file' },
    { key: 'bincontents', icon: '🗂️', title: 'Bin Contents (B row)',                hint: 'Current pick-face quantities and min/max' },
  ];

  function mount() {
    const panel = document.getElementById('module-browreplenishment');
    if (!panel) return;
    panel.innerHTML = _html();
    _bindEvents();
  }

  function _html() {
    const zones = ZONES.map(z => `
      <div class="upload-zone brow-drop" data-key="${z.key}" style="max-width:none;padding:20px;text-align:left;display:flex;align-items:center;gap:14px">
        <input type="file" id="brow-file-${z.key}" accept=".xlsx,.xls,.csv">
        <span style="font-size:22px">${z.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--text)">${z.title}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${z.hint}</div>
          <div class="brow-fname" id="brow-fname-${z.key}" style="font-size:11px;color:var(--ok);margin-top:4px;display:none;font-family:var(--font-mono)"></div>
        </div>
        <label class="btn" for="brow-file-${z.key}" style="margin:0;cursor:pointer">Choose</label>
      </div>`).join('');

    return `
    <div class="page-header">
      <div>
        <h1 class="page-title">B-Row Top Sellers</h1>
        <p class="page-subtitle">Prioritise replenishing the best-selling items on the B row. Upload the three exports below.</p>
      </div>
    </div>

    <!-- Upload -->
    <div id="brow-upload">
      <div style="display:grid;grid-template-columns:1fr;gap:12px;max-width:720px">
        ${zones}
      </div>
      <div style="display:flex;align-items:center;gap:14px;margin-top:16px;max-width:720px">
        <button class="btn btn-primary" id="brow-generate" disabled style="padding:8px 18px">⚡ Generate Priority List</button>
        <div id="brow-status" style="font-size:12px;color:var(--muted)"></div>
      </div>
    </div>

    <!-- Results -->
    <div id="brow-results" style="display:none">
      <div class="stats-row stats-row-4">
        <div class="stat-card predict"><div class="stat-label">Top Sellers Shown</div><div class="stat-value predict" id="brow-stat-count">0</div><div class="stat-sub">Ranked by sales</div></div>
        <div class="stat-card issue"><div class="stat-label">Check Bin</div><div class="stat-value issue" id="brow-stat-checkbin">0</div><div class="stat-sub">Bulk short of suggested</div></div>
        <div class="stat-card warn"><div class="stat-label">Units to Move</div><div class="stat-value warn" id="brow-stat-units">0</div><div class="stat-sub">Total suggested qty</div></div>
        <div class="stat-card ok"><div class="stat-label">#1 Seller</div><div class="stat-value ok" id="brow-stat-top" style="font-size:14px;line-height:1.2">—</div><div class="stat-sub" id="brow-stat-top-sub">—</div></div>
      </div>

      <div class="controls-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div class="filter-group" style="display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;color:var(--muted)">Show top</span>
          <select id="brow-topn">
            <option value="25">25</option>
            <option value="50" selected>50</option>
            <option value="100">100</option>
            <option value="all">All</option>
          </select>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn" id="brow-export">⬇ Export</button>
          <button class="btn btn-danger" id="brow-reset">↺ New files</button>
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-head">
          <span class="table-title">Priority Replenishment List</span>
          <span class="table-count" id="brow-count">0 items</span>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th data-sort="rank">#</th>
                <th data-sort="divItemNo">Division Item ↕</th>
                <th>Description</th>
                <th data-sort="toBin">Prime Bin ↕</th>
                <th data-sort="currentQty">Current ↕</th>
                <th data-sort="suggestedQty">Suggested ↕</th>
                <th data-sort="availableInBulk">Avail. Bulk ↕</th>
                <th data-sort="salesQty">Sales Qty ↕</th>
                <th data-sort="status">Status ↕</th>
              </tr>
            </thead>
            <tbody id="brow-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function _bindEvents() {
    const panel = document.getElementById('module-browreplenishment');
    if (!panel) return;

    ZONES.forEach(z => {
      const input = document.getElementById('brow-file-' + z.key);
      if (input) input.addEventListener('change', e => _setFile(z.key, e.target.files[0]));
      const zone = panel.querySelector(`.brow-drop[data-key="${z.key}"]`);
      if (zone) Utils.setupDropZone(zone, file => _setFile(z.key, file));
    });

    document.getElementById('brow-generate').addEventListener('click', _generate);
    document.getElementById('brow-topn').addEventListener('change', e => { _topN = e.target.value; _render(); });
    document.getElementById('brow-export').addEventListener('click', _export);
    document.getElementById('brow-reset').addEventListener('click', _reset);

    panel.querySelector('thead').addEventListener('click', e => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const key = th.dataset.sort;
      if (key === _sortKey) _sortDir = -_sortDir;
      else { _sortKey = key; _sortDir = (key === 'rank' || key === 'divItemNo' || key === 'toBin') ? 1 : -1; }
      _render();
    });
  }

  function _setFile(key, file) {
    if (!file) return;
    _files[key] = file;
    const el = document.getElementById('brow-fname-' + key);
    if (el) { el.textContent = '✓ ' + file.name; el.style.display = 'block'; }
    document.getElementById('brow-generate').disabled = !(_files.movement && _files.items && _files.bincontents);
  }

  function _generate() {
    if (!(_files.movement && _files.items && _files.bincontents)) return;

    const btn = document.getElementById('brow-generate');
    const status = document.getElementById('brow-status');
    btn.disabled = true;

    const started = Date.now();
    status.textContent = '⏳ Processing… 0s (the Items file is large, ~15s)';
    _timer = setInterval(() => {
      const s = Math.round((Date.now() - started) / 1000);
      status.textContent = `⏳ Processing… ${s}s (the Items file is large, ~15s)`;
    }, 1000);

    const fd = new FormData();
    fd.append('movement', _files.movement);
    fd.append('items', _files.items);
    fd.append('bincontents', _files.bincontents);
    fd.append('topN', 'all');   // fetch everything once; the selector slices client-side

    fetch('/api/brow-topsellers', { method: 'POST', body: fd })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || ('Server error ' + res.status));
        return data;
      })
      .then(data => {
        _clearTimer();
        _all = data.rows || [];
        status.textContent = '';
        document.getElementById('brow-upload').style.display = 'none';
        document.getElementById('brow-results').style.display = 'block';
        _sortKey = 'rank'; _sortDir = 1;
        _render();
        App.setLastUpdated();
      })
      .catch(err => {
        _clearTimer();
        btn.disabled = false;
        status.textContent = '';
        alert('Could not generate the list.\n\n' + err.message +
              '\n\nMake sure the backend is running (python server.py) and the three files are correct exports.');
      });
  }

  function _clearTimer() { if (_timer) { clearInterval(_timer); _timer = null; } }

  function _visible() {
    const n = _topN === 'all' ? _all.length : parseInt(_topN, 10);
    const slice = _all.filter(r => r.rank <= n);
    return slice.slice().sort(Utils.makeSorter(_sortKey, _sortDir));
  }

  function _render() {
    const rows = _visible();

    // Stats reflect the visible top-N slice.
    const checkBin = rows.filter(r => r.status === 'Check Bin').length;
    const units = rows.reduce((s, r) => s + (r.suggestedQty || 0), 0);
    const top = _all.find(r => r.rank === 1);

    Utils.setText('brow-stat-count', rows.length);
    Utils.setText('brow-stat-checkbin', checkBin);
    Utils.setText('brow-stat-units', units.toLocaleString());
    Utils.setText('brow-stat-top', top ? (top.description || top.divItemNo) : '—');
    Utils.setText('brow-stat-top-sub', top ? top.salesQty.toLocaleString() + ' sold · ' + top.toBin : '—');
    Utils.setText('brow-count', rows.length + ' items');

    const tbody = document.getElementById('brow-table-body');
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--muted)">No items to show.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const cls = STATUS_CLASS[r.status] || 'ok';
      const low = r.minQty > 0 && r.currentQty < r.minQty;
      const curColor = r.currentQty === 0 ? 'var(--urgent)' : low ? 'var(--warn)' : 'var(--text)';
      const minmax = (r.minQty || r.maxQty) ? `<span style="font-size:10px;color:var(--muted2)"> /${r.minQty}·${r.maxQty}</span>` : '';
      const shortage = r.status === 'Check Bin'
        ? `<span style="font-size:10px;color:var(--issue);margin-left:3px">−${r.suggestedQty - r.availableInBulk}</span>` : '';
      return `
      <tr>
        <td style="font-family:var(--font-mono);font-size:12px;color:var(--muted)">${r.rank}</td>
        <td style="font-family:var(--font-mono);font-size:12px;font-weight:600">${r.divItemNo}</td>
        <td style="font-size:12px;color:var(--text2);max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.description || '—'}</td>
        <td>${Utils.binChip(r.toBin)}</td>
        <td style="font-family:var(--font-mono);font-size:12px;color:${curColor}">${r.currentQty}${minmax}</td>
        <td style="font-family:var(--font-mono);font-size:13px;font-weight:600">${Utils.fmtQty(r.suggestedQty)}</td>
        <td style="font-family:var(--font-mono);font-size:12px">${Utils.fmtQty(r.availableInBulk)}${shortage}</td>
        <td style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--predict)">${(r.salesQty || 0).toLocaleString()}</td>
        <td>${Utils.statusBadge(cls, r.status)}</td>
      </tr>`;
    }).join('');
  }

  function _export() {
    const rows = _visible().map(r => ({
      'Rank': r.rank,
      'Division Item No.': r.divItemNo,
      'Description': r.description,
      'From Bin Code': r.fromBin,
      'To Bin Code': r.toBin,
      'Qty. to Handle': r.suggestedQty,
      'Available Qty. to Move': r.availableInBulk,
      'Current Qty': r.currentQty,
      'Min': r.minQty,
      'Max': r.maxQty,
      'Sales (Qty.)': r.salesQty,
      'Status': r.status,
    }));
    Utils.exportToExcel(rows, `GPD_BRow_TopSellers_${Utils.isoDate()}.xlsx`, 'B-Row Top Sellers');
  }

  function _reset() {
    _all = [];
    _files = { movement: null, items: null, bincontents: null };
    _topN = '50';
    mount();  // re-render clean upload view
  }

  App.register({ id: 'browreplenishment', label: 'B-Row Top Sellers', dotColor: 'var(--predict)', mount });

})();
