/**
 * replenishment.js — Replenishment Module
 */

(() => {

  let _data = [], _filtered = [], _tab = 'all', _sortKey = 'qtyToHandle', _sortDir = -1;
  let _done = new Set(), _donut = null, _bar = null;

  const STATUS_LABELS = { critical:'Urgent', low:'Replenish', predicted:'Watch', issue:'Check Bin', ok:'OK' };

  function mount() {
    const panel = document.getElementById('module-replenishment');
    if (!panel) return;
    panel.innerHTML = _html();
    _bindEvents();
  }

  function _html() {
    return `
    <!-- Upload toolbar -->
    <div id="repl-upload" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div class="page-title">Replenishment</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="upload-zone" id="repl-drop-zone" style="padding:10px 16px;display:inline-flex;align-items:center;gap:10px;max-width:none;border-radius:var(--radius-md)">
            <input type="file" id="repl-file-input" accept=".xlsx,.xls,.csv">
            <span style="font-size:14px">📦</span>
            <span style="font-size:12px;color:var(--muted)">Drop Movement Worksheet here or</span>
            <label class="btn btn-primary" for="repl-file-input" style="margin:0;cursor:pointer">Choose File</label>
          </div>
          <button class="demo-link" id="repl-demo-btn" style="margin:0;white-space:nowrap">Load sample data</button>
        </div>
      </div>
      <div style="color:var(--muted2);font-size:12px;padding:60px 0;text-align:center;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg)">
        No data loaded. Upload a Movement Worksheet export to get started.
      </div>
    </div>

    <!-- Dashboard -->
    <div id="repl-dashboard" style="display:none">
      <div id="repl-demo-notice" class="demo-notice" style="display:none">
        ⚡ Showing sample data — upload your real Movement Worksheet export for live data.
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="page-title">Replenishment</div>
        <div style="display:flex;gap:8px">
          <div class="upload-zone" id="repl-drop-zone-dash" style="padding:6px 12px;display:inline-flex;align-items:center;gap:8px;max-width:none;border-radius:var(--radius-md)">
            <input type="file" id="repl-file-input-dash" accept=".xlsx,.xls,.csv">
            <span style="font-size:12px;color:var(--muted)">Load new file</span>
            <label class="btn" for="repl-file-input-dash" style="margin:0;cursor:pointer;padding:3px 10px;font-size:11px">Browse</label>
          </div>
          <button class="btn" id="repl-export-btn">⬇ Export</button>
          <button class="btn btn-danger" id="repl-reset-btn">↺ Reset</button>
        </div>
      </div>

      <div class="stats-row stats-row-5">
        <div class="stat-card urgent"><div class="stat-label">Urgent</div><div class="stat-value urgent" id="stat-critical">0</div><div class="stat-sub">Move now</div></div>
        <div class="stat-card warn"><div class="stat-label">Replenish</div><div class="stat-value warn" id="stat-low">0</div><div class="stat-sub">BC suggested qty</div></div>
        <div class="stat-card predict"><div class="stat-label">Watch</div><div class="stat-value predict" id="stat-predicted">0</div><div class="stat-sub">Getting low</div></div>
        <div class="stat-card issue"><div class="stat-label">Issue</div><div class="stat-value issue" id="stat-issue">0</div><div class="stat-sub">Insufficient bulk</div></div>
        <div class="stat-card ok"><div class="stat-label">All Clear</div><div class="stat-value ok" id="stat-ok">0</div><div class="stat-sub">No action needed</div></div>
      </div>

      <div class="charts-row">
        <div class="chart-card">
          <div class="chart-title">Status Breakdown</div>
          <div class="chart-sub">Bin health across all items</div>
          <div style="position:relative;height:180px"><canvas id="repl-donut"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Top 10 by Suggested Qty</div>
          <div class="chart-sub">Highest movement quantities</div>
          <div style="position:relative;height:180px"><canvas id="repl-bar"></canvas></div>
        </div>
      </div>

      <div class="tabs" id="repl-tabs">
        <button class="tab active" data-tab="all">All</button>
        <button class="tab" data-tab="critical">🔴 Critical</button>
        <button class="tab" data-tab="low">🟡 Low</button>
        <button class="tab" data-tab="predicted">🟣 Watch</button>
        <button class="tab" data-tab="issue">🟠 Issue</button>
        <button class="tab" data-tab="ok">🟢 OK</button>
      </div>

      <div class="controls-row">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" id="repl-search" placeholder="Search item no, bin, or description...">
        </div>
        <div class="filter-group">
          <span>Bin range</span>
          <input type="text" id="bin-from" placeholder="From" style="width:60px">
          <span class="filter-sep">→</span>
          <input type="text" id="bin-to" placeholder="To" style="width:60px">
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-head">
          <span class="table-title">Items</span>
          <span class="table-count" id="repl-row-count">0 items</span>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th data-sort="divItemNo">Item No ↕</th>
                <th data-sort="description">Description ↕</th>
                <th data-sort="bulkBin">Bulk Bin ↕</th>
                <th></th>
                <th data-sort="primeBin">Prime Bin ↕</th>
                <th data-sort="qtyToHandle">Qty ↕</th>
                <th data-sort="availableQty">Available ↕</th>
                <th data-sort="status">Status ↕</th>
                <th>✓</th>
              </tr>
            </thead>
            <tbody id="repl-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function _bindEvents() {
    const fileInput = document.getElementById('repl-file-input');
    if (fileInput) fileInput.addEventListener('change', e => { if (e.target.files[0]) _handleFile(e.target.files[0]); });

    const fileInputDash = document.getElementById('repl-file-input-dash');
    if (fileInputDash) fileInputDash.addEventListener('change', e => { if (e.target.files[0]) _handleFile(e.target.files[0]); });

    const dropZone = document.getElementById('repl-drop-zone');
    if (dropZone) Utils.setupDropZone(dropZone, _handleFile);

    document.getElementById('repl-demo-btn')?.addEventListener('click', _loadDemo);
    document.getElementById('repl-reset-btn')?.addEventListener('click', _reset);
    document.getElementById('repl-export-btn')?.addEventListener('click', _export);

    document.getElementById('module-replenishment').addEventListener('input', e => {
      if (['repl-search','bin-from','bin-to'].includes(e.target.id)) _applyFilters();
    });

    const tabs = document.getElementById('repl-tabs');
    if (tabs) tabs.addEventListener('click', e => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      _tab = btn.dataset.tab;
      _applyFilters();
    });

    const thead = document.querySelector('#module-replenishment thead');
    if (thead) thead.addEventListener('click', e => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      if (_sortKey === th.dataset.sort) _sortDir *= -1;
      else { _sortKey = th.dataset.sort; _sortDir = -1; }
      _applyFilters();
    });

    const tbody = document.getElementById('repl-table-body');
    if (tbody) tbody.addEventListener('click', e => {
      const btn = e.target.closest('.check-btn');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      _done.has(id) ? _done.delete(id) : _done.add(id);
      _renderTable();
    });
  }

  async function _handleFile(file) {
    try {
      const rows = await Utils.parseExcelFile(file);
      _process(rows, false);
    } catch { alert('Could not read file. Make sure it is a valid .xlsx, .xls, or .csv export.'); }
  }

  function _process(json, isDemo) {
    if (!json.length) { alert('No data found.'); return; }
    _data = json.map((row, i) => {
      const divItemNo    = String(row['Division item No.'] || row['Division item No'] || row['Division Item No.'] || '').trim();
      const description  = String(row['Description'] || row['ItemDescription'] || '').trim();
      const bulkBin      = String(row['From Bin Code'] || '').trim();
      const primeBin     = String(row['To Bin Code']   || '').trim();
      const qtyToHandle  = Utils.parseNum(row['Qty. to Handle']);
      const availableQty = Utils.parseNum(row['Available Qty. to Move']);
      const qtyHandled   = Utils.parseNum(row['Qty. Handled']);
      const qtyOutstand  = Utils.parseNum(row['Qty. Outstanding']);
      let status = 'ok';
      if (qtyToHandle > 0 && availableQty > 0 && availableQty < qtyToHandle) status = 'issue';
      else if (qtyToHandle > 0) status = (availableQty > 0 && (qtyToHandle / availableQty) > 0.6) ? 'critical' : 'low';
      else if (availableQty > 0 && availableQty < 10) status = 'predicted';
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

  function _applyFilters() {
    const search  = (document.getElementById('repl-search')?.value || '').toLowerCase();
    const binFrom = (document.getElementById('bin-from')?.value || '').toUpperCase();
    const binTo   = (document.getElementById('bin-to')?.value   || '').toUpperCase();
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

  function _renderTable() {
    const tbody = document.getElementById('repl-table-body');
    Utils.setText('repl-row-count', _filtered.length + ' items');
    if (!_filtered.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--muted)">No items match your filters.</td></tr>`;
      return;
    }
    tbody.innerHTML = _filtered.map(r => {
      const isDone = _done.has(r.id);
      const availColor = r.status === 'issue' ? 'var(--issue)' : r.availableQty < 10 ? 'var(--urgent)' : r.availableQty < 20 ? 'var(--warn)' : 'var(--text)';
      const shortage = r.status === 'issue' ? `<span style="font-size:10px;color:var(--issue);margin-left:3px">−${r.qtyToHandle - r.availableQty}</span>` : '';
      return `<tr class="${isDone ? 'done-row' : ''}">
        <td class="item-no">${r.divItemNo || '—'}</td>
        <td style="font-size:11px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${r.description}">${r.description || '—'}</td>
        <td>${Utils.binChip(r.bulkBin)}</td>
        <td class="arrow-sep">→</td>
        <td>${Utils.binChip(r.primeBin)}</td>
        <td style="font-family:var(--font-mono);font-size:13px;font-weight:600">${Utils.fmtQty(r.qtyToHandle)}</td>
        <td style="font-family:var(--font-mono);font-size:12px;color:${availColor}">${Utils.fmtQty(r.availableQty)}${shortage}</td>
        <td>${Utils.statusBadge(r.status, STATUS_LABELS[r.status])}</td>
        <td><button class="check-btn ${isDone ? 'done' : ''}" data-id="${r.id}">${isDone ? '✓' : ''}</button></td>
      </tr>`;
    }).join('');
  }

  function _updateStats() {
    const c = { critical:0, low:0, predicted:0, ok:0, issue:0 };
    _data.forEach(r => c[r.status]++);
    Utils.setText('stat-critical', c.critical);
    Utils.setText('stat-low',      c.low);
    Utils.setText('stat-predicted', c.predicted);
    Utils.setText('stat-ok',       c.ok);
    Utils.setText('stat-issue',    c.issue);
  }

  function _renderCharts() {
    const c = { critical:0, low:0, predicted:0, ok:0, issue:0 };
    _data.forEach(r => c[r.status]++);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const labelColor = isDark ? '#6b7280' : '#9ca3af';

    if (_donut) _donut.destroy();
    _donut = new Chart(document.getElementById('repl-donut'), {
      type: 'doughnut',
      data: {
        labels: ['Urgent','Replenish','Watch','Issue','OK'],
        datasets: [{ data: [c.critical, c.low, c.predicted, c.issue, c.ok],
          backgroundColor: ['#dc2626','#d97706','#7c3aed','#ea580c','#059669'],
          borderColor: isDark ? '#161b26' : '#fff', borderWidth: 3, hoverOffset: 4 }]
      },
      options: { responsive:true, maintainAspectRatio:false, cutout:'68%',
        plugins: { legend: { display:true, position:'right', labels:{ color:labelColor, font:{size:11}, boxWidth:10, padding:10 } } }
      }
    });

    const top10 = [..._data].filter(r => r.qtyToHandle > 0).sort((a,b) => b.qtyToHandle - a.qtyToHandle).slice(0,10);
    if (_bar) _bar.destroy();
    _bar = new Chart(document.getElementById('repl-bar'), {
      type: 'bar',
      data: {
        labels: top10.map(r => r.divItemNo || r.primeBin || '?'),
        datasets: [{ label:'Qty', data: top10.map(r => r.qtyToHandle),
          backgroundColor: top10.map(r => r.status === 'critical' ? '#dc262680' : '#d9770680'),
          borderColor:     top10.map(r => r.status === 'critical' ? '#dc2626' : '#d97706'),
          borderWidth:1, borderRadius:3 }]
      },
      options: { responsive:true, maintainAspectRatio:false, indexAxis:'y',
        plugins: { legend:{display:false} },
        scales: {
          x: { ticks:{color:labelColor, font:{size:11}}, grid:{color:gridColor} },
          y: { ticks:{color:labelColor, font:{size:11}}, grid:{display:false} }
        }
      }
    });
  }

  function _export() {
    Utils.exportToExcel(
      _filtered.filter(r => !_done.has(r.id)).map(r => ({
        'Division Item No': r.divItemNo, 'Description': r.description,
        'From Bin (Bulk)': r.bulkBin, 'To Bin (Prime)': r.primeBin,
        'Suggested Qty': r.qtyToHandle, 'Available in Bulk': r.availableQty,
        'Status': STATUS_LABELS[r.status]
      })),
      `GPD_Replenishment_${Utils.isoDate()}.xlsx`, 'Task List'
    );
  }

  function _reset() {
    _data = []; _filtered = []; _done.clear();
    document.getElementById('repl-dashboard').style.display = 'none';
    Utils.show('repl-upload');
  }

  function _loadDemo() {
    const items = [
      {d:'3411432',desc:'EXPANSION VALVE BLOCK'},{d:'3411942',desc:'EXPANSION VALVE BLOCK'},
      {d:'3411966',desc:'EXPANSION VALVE BLOCK'},{d:'3412028',desc:'EXP BLOCK 19-22 FORESTER'},
      {d:'3412036',desc:'EXPANSION VALVE BLOCK HYUNDAI KIA'},{d:'1311352',desc:'A/C COMPRESSOR'},
      {d:'1311489',desc:'A/C COMPRESSOR W/CLUTCH'},{d:'2811044',desc:'CONDENSER'},
      {d:'2811210',desc:'PARALLEL FLOW CONDENSER'},{d:'4811032',desc:'ACCUMULATOR DRIER'},
      {d:'4811198',desc:'FILTER DRIER'},{d:'5811055',desc:'EVAPORATOR CORE'},
      {d:'6811021',desc:'BLOWER MOTOR'},{d:'6811089',desc:'BLOWER MOTOR W/WHEEL'},
      {d:'7811003',desc:'O-RING KIT AC SYSTEM'},{d:'7811019',desc:'RAPID SEAL O-RING KIT'},
    ];
    const rows = items.map((item,i) => {
      const avail = i%4===0 ? Math.floor(Math.random()*3)+1 : Math.floor(Math.random()*40)+5;
      const qty   = i%4===0 ? Math.floor(Math.random()*50)+20 : Math.floor(Math.random()*10)+1;
      return {
        'Division item No.': item.d, 'Description': item.desc,
        'From Bin Code': `BSP${String(1010+i).padStart(4,'0')}${['A','B','C','K','J'][i%5]}`,
        'To Bin Code':   `SP${String(1010+i).padStart(4,'0')}${['A','B','C','D'][i%4]}`,
        'Qty. to Handle': qty, 'Qty. Outstanding': qty,
        'Available Qty. to Move': avail, 'Qty. Handled': 0,
      };
    });
    _process(rows, true);
  }

  App.register({ id:'replenishment', label:'Replenishment', dotColor:'var(--warn)', mount });

})();