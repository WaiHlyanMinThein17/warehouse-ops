/**
 * emptybins.js — Empty Bins Module
 */

(() => {

  let _data = [], _filtered = [], _tab = 'all', _sortKey = 'status', _sortDir = 1;
  const STATUS_ORDER = { empty:0, partial:1, active:2 };

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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="page-title">Empty Bin Finder</div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="upload-zone" id="empty-drop-zone" style="padding:10px 16px;display:inline-flex;align-items:center;gap:10px;max-width:none;border-radius:var(--radius-md)">
            <input type="file" id="empty-file-input" accept=".xlsx,.xls,.csv">
            <span style="font-size:14px">🗂️</span>
            <span style="font-size:12px;color:var(--muted)">Drop Bin Contents here or</span>
            <label class="btn btn-primary" for="empty-file-input" style="margin:0;cursor:pointer">Choose File</label>
          </div>
          <button class="demo-link" id="empty-demo-btn" style="margin:0;white-space:nowrap">Load sample data</button>
        </div>
      </div>
      <div style="color:var(--muted2);font-size:12px;padding:60px 0;text-align:center;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg)">
        No data loaded. Upload a Bin Contents export to identify empty bins.
      </div>
    </div>

    <!-- Dashboard -->
    <div id="empty-dashboard" style="display:none">
      <div id="empty-demo-notice" class="demo-notice" style="display:none">
        ⚡ Showing sample data — upload your real Bin Contents export for live data.
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="page-title">Empty Bin Finder</div>
        <div style="display:flex;gap:8px">
          <div class="upload-zone" id="empty-drop-zone-dash" style="padding:6px 12px;display:inline-flex;align-items:center;gap:8px;max-width:none;border-radius:var(--radius-md)">
            <input type="file" id="empty-file-input-dash" accept=".xlsx,.xls,.csv">
            <span style="font-size:12px;color:var(--muted)">Load new file</span>
            <label class="btn" for="empty-file-input-dash" style="margin:0;cursor:pointer;padding:3px 10px;font-size:11px">Browse</label>
          </div>
          <button class="btn" id="empty-export-btn">⬇ Export</button>
          <button class="btn btn-danger" id="empty-reset-btn">↺ Reset</button>
        </div>
      </div>

      <div class="stats-row stats-row-4">
        <div class="stat-card empty-c"><div class="stat-label">Fully Empty</div><div class="stat-value empty-c" id="estat-empty">0</div><div class="stat-sub">All items at zero</div></div>
        <div class="stat-card warn"><div class="stat-label">Partial Empty</div><div class="stat-value warn" id="estat-partial">0</div><div class="stat-sub">Some items depleted</div></div>
        <div class="stat-card ok"><div class="stat-label">Active</div><div class="stat-value ok" id="estat-active">0</div><div class="stat-sub">All items have stock</div></div>
        <div class="stat-card"><div class="stat-label">Zones</div><div class="stat-value" id="estat-zones">0</div><div class="stat-sub">Unique zone codes</div></div>
      </div>

      <div id="zone-grid" class="zone-grid"></div>

      <div class="module-toolbar">
        <div class="tabs" id="empty-tabs">
          <button class="tab active" data-tab="all">All</button>
          <button class="tab" data-tab="empty">🟦 Empty</button>
          <button class="tab" data-tab="partial">🟡 Partial</button>
          <button class="tab" data-tab="active">🟢 Active</button>
        </div>
      </div>

      <div class="controls-row">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" id="empty-search" placeholder="Search bin code or item no...">
        </div>
        <div class="filter-group">
          <span>Zone</span>
          <select id="zone-filter"><option value="">All Zones</option></select>
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-head">
          <span class="table-title">Bin Contents</span>
          <span class="table-count" id="empty-row-count">0 bins</span>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th data-sort="zone">Zone ↕</th>
                <th data-sort="binCode">Bin Code ↕</th>
                <th>Items</th>
                <th data-sort="totalQty">Total Qty ↕</th>
                <th data-sort="itemCount">Items ↕</th>
                <th data-sort="status">Status ↕</th>
              </tr>
            </thead>
            <tbody id="empty-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  function _bindEvents() {
    const panel = document.getElementById('module-emptybins');

    panel.querySelector('#empty-file-input')?.addEventListener('change', e => { if (e.target.files[0]) _handleFile(e.target.files[0]); });
    panel.querySelector('#empty-file-input-dash')?.addEventListener('change', e => { if (e.target.files[0]) _handleFile(e.target.files[0]); });

    const dropZone = document.getElementById('empty-drop-zone');
    if (dropZone) Utils.setupDropZone(dropZone, _handleFile);

    panel.querySelector('#empty-demo-btn')?.addEventListener('click', _loadDemo);
    panel.querySelector('#empty-reset-btn')?.addEventListener('click', _reset);
    panel.querySelector('#empty-export-btn')?.addEventListener('click', _export);

    panel.addEventListener('input', e => { if (e.target.id === 'empty-search') _applyFilters(); });
    panel.addEventListener('change', e => { if (e.target.id === 'zone-filter') _applyFilters(); });

    const tabs = document.getElementById('empty-tabs');
    if (tabs) tabs.addEventListener('click', e => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      _tab = btn.dataset.tab;
      _applyFilters();
    });

    panel.querySelector('thead')?.addEventListener('click', e => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      if (_sortKey === th.dataset.sort) _sortDir *= -1;
      else { _sortKey = th.dataset.sort; _sortDir = 1; }
      _applyFilters();
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

    _data = Object.values(binMap).map(bin => {
      const totalQty  = bin.items.reduce((s,i) => s + i.qty, 0);
      const zeroItems = bin.items.filter(i => i.qty === 0).length;
      const status    = totalQty === 0 ? 'empty' : zeroItems > 0 ? 'partial' : 'active';
      return { zone:bin.zone, binCode:bin.binCode, items:bin.items, totalQty, itemCount:bin.items.length, zeroItems, status };
    });

    const zones = [...new Set(_data.map(b => b.zone))].sort();
    const sel = document.getElementById('zone-filter');
    if (sel) sel.innerHTML = '<option value="">All Zones</option>' + zones.map(z => `<option value="${z}">${z}</option>`).join('');

    document.getElementById('empty-demo-notice').style.display = isDemo ? 'flex' : 'none';
    Utils.hide('empty-upload');
    document.getElementById('empty-dashboard').style.display = 'block';
    App.setLastUpdated();

    _updateStats();
    _buildZoneGrid(zones);
    _applyFilters();
  }

  function _updateStats() {
    Utils.setText('estat-empty',   _data.filter(b => b.status === 'empty').length);
    Utils.setText('estat-partial', _data.filter(b => b.status === 'partial').length);
    Utils.setText('estat-active',  _data.filter(b => b.status === 'active').length);
    Utils.setText('estat-zones',   new Set(_data.map(b => b.zone)).size);
  }

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
          <div><div class="zone-stat-num" style="color:var(--empty)">${empty}</div><div class="zone-stat-lbl">Empty</div></div>
          <div><div class="zone-stat-num" style="color:var(--warn)">${partial}</div><div class="zone-stat-lbl">Partial</div></div>
          <div><div class="zone-stat-num">${bins.length}</div><div class="zone-stat-lbl">Total</div></div>
        </div>
        <div class="zone-bar-wrap">
          <div class="zone-bar-header"><span>Empty rate</span><span>${pct}%</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:var(--empty)"></div></div>
        </div>
      </div>`;
    }).join('');
    grid.addEventListener('click', e => {
      const card = e.target.closest('.zone-card');
      if (!card) return;
      const sel = document.getElementById('zone-filter');
      if (sel) { sel.value = card.dataset.zone; _applyFilters(); }
    });
  }

  function _applyFilters() {
    const search     = (document.getElementById('empty-search')?.value || '').toLowerCase();
    const zoneFilter = document.getElementById('zone-filter')?.value || '';
    _filtered = _data.filter(b => {
      if (_tab !== 'all' && b.status !== _tab) return false;
      if (zoneFilter && b.zone !== zoneFilter) return false;
      if (search && !b.binCode.toLowerCase().includes(search) && !b.items.some(i => i.itemNo.toLowerCase().includes(search))) return false;
      return true;
    });
    _filtered.sort((a,b) => {
      if (_sortKey === 'status') return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * _sortDir;
      return Utils.makeSorter(_sortKey, _sortDir)(a,b);
    });
    _renderTable();
  }

  function _renderTable() {
    const tbody = document.getElementById('empty-table-body');
    Utils.setText('empty-row-count', _filtered.length + ' bins');
    if (!_filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--muted)">No bins match your filters.</td></tr>`;
      return;
    }
    const labelMap = { empty:'Fully Empty', partial:'Partial Empty', active:'Active' };
    tbody.innerHTML = _filtered.map(b => {
      const itemsHtml = b.items.map(i =>
        `<span class="item-chip">
          <span class="item-no" style="${i.qty===0?'color:var(--urgent)':''}">${i.itemNo||'?'}</span>
          <span class="item-qty" style="color:${i.qty===0?'var(--urgent)':'var(--muted)'}">×${i.qty}</span>
        </span>`
      ).join('');
      return `<tr>
        <td><span class="zone-tag">${b.zone}</span></td>
        <td>${Utils.binChip(b.binCode, b.status==='empty')}</td>
        <td class="items-cell">${itemsHtml}</td>
        <td style="font-family:var(--font-mono);font-size:12px;color:${b.totalQty===0?'var(--empty)':'var(--text)'}">${b.totalQty}</td>
        <td style="font-family:var(--font-mono);font-size:12px">${b.itemCount}</td>
        <td>${Utils.statusBadge(b.status, labelMap[b.status])}</td>
      </tr>`;
    }).join('');
  }

  function _export() {
    Utils.exportToExcel(
      _filtered.filter(b => b.status==='empty'||b.status==='partial').map(b => ({
        'Zone Code': b.zone, 'Bin Code': b.binCode,
        'Status': b.status==='empty'?'Fully Empty':'Partial Empty',
        'Total Qty': b.totalQty, 'Item Count': b.itemCount, 'Zero Qty Items': b.zeroItems,
        'Items': b.items.map(i => `${i.itemNo}(×${i.qty})`).join(', ')
      })),
      `GPD_EmptyBins_${Utils.isoDate()}.xlsx`, 'Empty Bins'
    );
  }

  function _reset() {
    _data = []; _filtered = [];
    document.getElementById('empty-dashboard').style.display = 'none';
    Utils.show('empty-upload');
  }

  function _loadDemo() {
    const zones = ['01ZONE','02ZONE','03ZONE'];
    const rows = [];
    zones.forEach((zone,zi) => {
      for (let b=1; b<=20; b++) {
        const binCode  = `${zi+1}B${String(b).padStart(3,'0')}A${b%3+1}`;
        const numItems = (b%3)+1;
        for (let it=0; it<numItems; it++) {
          const isEmpty = (b%5===0&&zi===0)||(b%7===0);
          const isZero  = isEmpty||(b%4===0&&it===0);
          rows.push({
            'Zone Code':zone,'Bin Code':binCode,
            'Item No.':`H${10+zi}-${110000+b*10+it}`,
            'Division Item No.':`34${b*10+it}00`,
            'ItemDescription':['EXPANSION VALVE','A/C COMPRESSOR','CONDENSER','BLOWER MOTOR','EVAPORATOR CORE'][it%5],
            'Quantity (Base)':isZero?0:Math.floor(Math.random()*20)+1,
          });
        }
      }
    });
    _process(rows, true);
  }

  App.register({ id:'emptybins', label:'Empty Bins', dotColor:'var(--empty)', mount });

})();