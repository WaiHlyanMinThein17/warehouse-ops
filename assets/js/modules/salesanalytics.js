/**
 * salesanalytics.js — Sales Analytics Module
 * Analyzes GPD item sales data exported from Business Central
 */

(() => {

  let _raw = [];      // raw rows from Excel
  let _df  = [];      // processed/enriched rows
  let _charts = {};   // Chart.js instances

  // ── Mount ────────────────────────────────────────────────────────────────

  function mount() {
    const panel = document.getElementById('module-salesanalytics');
    if (!panel) return;
    panel.innerHTML = _html();
    _bindEvents();
  }

  function _html() {
    return `
    <!-- Upload state -->
    <div id="sa-upload">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div class="page-title">Sales Analytics</div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="upload-zone" id="sa-drop-zone" style="padding:10px 16px;display:inline-flex;align-items:center;gap:10px;max-width:none;border-radius:var(--radius-md)">
            <input type="file" id="sa-file-input" accept=".xlsx,.xls,.csv">
            <span style="font-size:14px">📊</span>
            <span style="font-size:12px;color:var(--muted)">Drop Items export here or</span>
            <label class="btn btn-primary" for="sa-file-input" style="margin:0;cursor:pointer">Choose File</label>
          </div>
          <button class="demo-link" id="sa-demo-btn" style="margin:0;white-space:nowrap">Load sample data</button>
        </div>
      </div>
      <div style="color:var(--muted2);font-size:12px;padding:60px 0;text-align:center;background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg)">
        No data loaded. Upload an Items export from Business Central to analyze sales performance.
      </div>
    </div>

    <!-- Dashboard state -->
    <div id="sa-dashboard" style="display:none">
      <div id="sa-demo-notice" class="demo-notice" style="display:none">
        ⚡ Showing sample data — upload your real Items export for live analysis.
      </div>

      <!-- Toolbar -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div class="page-title">Sales Analytics</div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="filter-group">
            <span>Category</span>
            <select id="sa-cat-filter" style="max-width:160px"><option value="">All Categories</option></select>
          </div>
          <div class="filter-group">
            <span>ABC</span>
            <select id="sa-abc-filter">
              <option value="">All</option>
              <option value="A">A — High Value</option>
              <option value="B">B — Medium</option>
              <option value="C">C — Low</option>
              <option value="D">D — Dead</option>
              <option value="N">N — New</option>
            </select>
          </div>
          <div class="upload-zone" id="sa-drop-zone-dash" style="padding:6px 12px;display:inline-flex;align-items:center;gap:8px;max-width:none;border-radius:var(--radius-md)">
            <input type="file" id="sa-file-input-dash" accept=".xlsx,.xls,.csv">
            <span style="font-size:12px;color:var(--muted)">Load new file</span>
            <label class="btn" for="sa-file-input-dash" style="margin:0;cursor:pointer;padding:3px 10px;font-size:11px">Browse</label>
          </div>
          <button class="btn" id="sa-export-btn">⬇ Export</button>
          <button class="btn btn-danger" id="sa-reset-btn">↺ Reset</button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="stats-row" style="grid-template-columns:repeat(6,1fr);margin-bottom:16px">
        <div class="stat-card" style="border-left-color:var(--accent)">
          <div class="stat-label">Est. Revenue</div>
          <div class="stat-value" id="sa-kpi-revenue" style="color:var(--accent);font-size:20px">—</div>
          <div class="stat-sub">Sales Qty × Unit Price</div>
        </div>
        <div class="stat-card" style="border-left-color:var(--ok)">
          <div class="stat-label">Est. Gross Margin</div>
          <div class="stat-value" id="sa-kpi-margin" style="color:var(--ok);font-size:20px">—</div>
          <div class="stat-sub" id="sa-kpi-margin-pct">Avg margin %</div>
        </div>
        <div class="stat-card" style="border-left-color:var(--warn)">
          <div class="stat-label">Total Units Sold</div>
          <div class="stat-value warn" id="sa-kpi-units" style="font-size:20px">—</div>
          <div class="stat-sub">Across all items</div>
        </div>
        <div class="stat-card" style="border-left-color:var(--urgent)">
          <div class="stat-label">Dead Stock Items</div>
          <div class="stat-value urgent" id="sa-kpi-dead" style="font-size:20px">—</div>
          <div class="stat-sub" id="sa-kpi-dead-val">Tied-up inventory value</div>
        </div>
        <div class="stat-card" style="border-left-color:var(--predict)">
          <div class="stat-label">Active SKUs</div>
          <div class="stat-value predict" id="sa-kpi-active" style="font-size:20px">—</div>
          <div class="stat-sub">Items with sales > 0</div>
        </div>
        <div class="stat-card" style="border-left-color:var(--muted)">
          <div class="stat-label">Total SKUs</div>
          <div class="stat-value" id="sa-kpi-total" style="font-size:20px">—</div>
          <div class="stat-sub">In this export</div>
        </div>
      </div>

      <!-- Insight banner -->
      <div id="sa-insight-bar" style="
        background:var(--accent-bg);border:1px solid var(--accent-border);
        border-radius:var(--radius-md);padding:10px 16px;margin-bottom:16px;
        display:flex;gap:24px;align-items:center;flex-wrap:wrap;font-size:12px
      "></div>

      <!-- Charts row 1 -->
      <div style="display:grid;grid-template-columns:1.4fr 1fr;gap:12px;margin-bottom:12px">
        <div class="chart-card">
          <div class="chart-title">Revenue by Category</div>
          <div class="chart-sub">Estimated revenue contribution per product category</div>
          <div style="position:relative;height:220px"><canvas id="sa-cat-bar"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">ABC Classification Split</div>
          <div class="chart-sub">Revenue share by inventory classification</div>
          <div style="position:relative;height:220px"><canvas id="sa-abc-donut"></canvas></div>
        </div>
      </div>

      <!-- Charts row 2 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div class="chart-card">
          <div class="chart-title">Top 15 Items by Revenue</div>
          <div class="chart-sub">Highest revenue-generating individual SKUs</div>
          <div style="position:relative;height:240px"><canvas id="sa-top-bar"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-title">Velocity Distribution</div>
          <div class="chart-sub">Movement speed classification across catalog</div>
          <div style="position:relative;height:240px"><canvas id="sa-vel-bar"></canvas></div>
        </div>
      </div>

      <!-- Sub-tabs for table -->
      <div class="tabs" id="sa-tabs">
        <button class="tab active" data-tab="all">All Items</button>
        <button class="tab" data-tab="top">🏆 Top Performers</button>
        <button class="tab" data-tab="dead">☠ Dead Stock</button>
        <button class="tab" data-tab="slow">🐢 Slow Movers</button>
        <button class="tab" data-tab="highvalue">💰 High Value</button>
      </div>

      <!-- Search -->
      <div class="controls-row">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input type="text" id="sa-search" placeholder="Search item no, description, or category...">
        </div>
        <div id="sa-tab-desc" style="font-size:11px;color:var(--muted);white-space:nowrap"></div>
      </div>

      <!-- Table -->
      <div class="table-wrap">
        <div class="table-head">
          <span class="table-title" id="sa-table-title">All Items</span>
          <span class="table-count" id="sa-row-count">0 items</span>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th data-sort="divItemNo">Item No ↕</th>
                <th data-sort="description">Description ↕</th>
                <th data-sort="category">Category ↕</th>
                <th data-sort="abcCode">ABC ↕</th>
                <th data-sort="velocityCode">Vel ↕</th>
                <th data-sort="salesQty">Sales Qty ↕</th>
                <th data-sort="qtyOnHand">On Hand ↕</th>
                <th data-sort="unitPrice">Unit Price ↕</th>
                <th data-sort="estRevenue">Est. Revenue ↕</th>
                <th data-sort="marginPct">Margin % ↕</th>
                <th data-sort="stockCoverage">Stock Coverage ↕</th>
              </tr>
            </thead>
            <tbody id="sa-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>`;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  function _bindEvents() {
    const panel = document.getElementById('module-salesanalytics');

    panel.querySelector('#sa-file-input')?.addEventListener('change', e => {
      if (e.target.files[0]) _handleFile(e.target.files[0]);
    });
    panel.querySelector('#sa-file-input-dash')?.addEventListener('change', e => {
      if (e.target.files[0]) _handleFile(e.target.files[0]);
    });

    const dz1 = document.getElementById('sa-drop-zone');
    const dz2 = document.getElementById('sa-drop-zone-dash');
    if (dz1) Utils.setupDropZone(dz1, _handleFile);
    if (dz2) Utils.setupDropZone(dz2, _handleFile);

    panel.querySelector('#sa-demo-btn')?.addEventListener('click', _loadDemo);
    panel.querySelector('#sa-reset-btn')?.addEventListener('click', _reset);
    panel.querySelector('#sa-export-btn')?.addEventListener('click', _export);

    panel.addEventListener('input', e => {
      if (e.target.id === 'sa-search') _renderTable();
    });
    panel.addEventListener('change', e => {
      if (['sa-cat-filter','sa-abc-filter'].includes(e.target.id)) _renderTable();
    });

    const tabs = document.getElementById('sa-tabs');
    if (tabs) tabs.addEventListener('click', e => {
      const btn = e.target.closest('.tab');
      if (!btn) return;
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      _renderTable();
    });

    const thead = panel.querySelector('thead');
    if (thead) {
      let _sortKey = 'estRevenue', _sortDir = -1;
      thead.addEventListener('click', e => {
        const th = e.target.closest('th[data-sort]');
        if (!th) return;
        if (_sortKey === th.dataset.sort) _sortDir *= -1;
        else { _sortKey = th.dataset.sort; _sortDir = -1; }
        thead._sortKey = _sortKey;
        thead._sortDir = _sortDir;
        _renderTable();
      });
      thead._sortKey = 'estRevenue';
      thead._sortDir = -1;
    }
  }

  // ── File handling ─────────────────────────────────────────────────────────

  async function _handleFile(file) {
    try {
      const rows = await Utils.parseExcelFile(file);
      _process(rows, false);
    } catch { alert('Could not read file.'); }
  }

  // ── Data processing ───────────────────────────────────────────────────────

  function _process(json, isDemo) {
    if (!json.length) { alert('No data found.'); return; }

    _df = json.map((row, i) => {
      const salesQty   = parseFloat(row['Sales (Qty.)'] || 0) || 0;
      const qtyOnHand  = parseFloat(row['Quantity on Hand'] || 0) || 0;
      const unitPrice  = parseFloat(row['Unit Price'] || 0) || 0;
      const unitCost   = parseFloat(row['Unit Cost'] || 0) || 0;
      const estRevenue = salesQty * unitPrice;
      const estCOGS    = salesQty * unitCost;
      const estMargin  = estRevenue - estCOGS;
      const marginPct  = estRevenue > 0 ? (estMargin / estRevenue * 100) : 0;
      const stockCoverage = salesQty > 0 ? (qtyOnHand / salesQty) : null;

      return {
        id:            i,
        no:            String(row['No.'] || '').trim(),
        divItemNo:     String(row['Division Item No.'] || '').trim(),
        description:   String(row['Description'] || '').trim(),
        category:      String(row['Cat. Level 1'] || '—').trim(),
        abcCode:       String(row['ABC Code'] || '').trim(),
        velocityCode:  String(row['Velocity Code'] || '').trim(),
        salesQty,
        qtyOnHand,
        unitPrice,
        unitCost,
        estRevenue,
        estCOGS,
        estMargin,
        marginPct,
        stockCoverage,
        qtyOnSalesOrder: parseFloat(row['Qty. on Sales Order'] || 0) || 0,
      };
    });

    // Populate category filter
    const cats = [...new Set(_df.map(r => r.category).filter(c => c && c !== '—'))].sort();
    const sel  = document.getElementById('sa-cat-filter');
    if (sel) sel.innerHTML = '<option value="">All Categories</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');

    document.getElementById('sa-demo-notice').style.display = isDemo ? 'flex' : 'none';
    Utils.hide('sa-upload');
    document.getElementById('sa-dashboard').style.display = 'block';
    App.setLastUpdated();

    _renderKPIs();
    _renderInsightBar();
    _renderCharts();
    _renderTable();
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────

  function _fmtM(n) {
    if (n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K';
    return '$' + n.toFixed(0);
  }

  function _renderKPIs() {
    const totalRevenue = _df.reduce((s,r) => s + r.estRevenue, 0);
    const totalMargin  = _df.reduce((s,r) => s + r.estMargin, 0);
    const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue * 100) : 0;
    const totalUnits   = _df.reduce((s,r) => s + Math.max(r.salesQty, 0), 0);
    const deadItems    = _df.filter(r => (r.abcCode === 'D' || r.abcCode === 'N') && r.salesQty <= 0);
    const deadValue    = deadItems.reduce((s,r) => s + r.qtyOnHand * r.unitCost, 0);
    const activeItems  = _df.filter(r => r.salesQty > 0);

    Utils.setText('sa-kpi-revenue',    _fmtM(totalRevenue));
    Utils.setText('sa-kpi-margin',     _fmtM(totalMargin));
    Utils.setText('sa-kpi-margin-pct', avgMarginPct.toFixed(1) + '% avg margin');
    Utils.setText('sa-kpi-units',      totalUnits.toLocaleString());
    Utils.setText('sa-kpi-dead',       deadItems.length.toLocaleString());
    Utils.setText('sa-kpi-dead-val',   _fmtM(deadValue) + ' tied up');
    Utils.setText('sa-kpi-active',     activeItems.length.toLocaleString());
    Utils.setText('sa-kpi-total',      _df.length.toLocaleString());
  }

  // ── Insight bar ───────────────────────────────────────────────────────────

  function _renderInsightBar() {
    const bar = document.getElementById('sa-insight-bar');
    if (!bar) return;

    const totalRevenue = _df.reduce((s,r) => s + r.estRevenue, 0);

    // Top category
    const catRev = {};
    _df.forEach(r => { if (r.category !== '—') catRev[r.category] = (catRev[r.category]||0) + r.estRevenue; });
    const topCat     = Object.entries(catRev).sort((a,b)=>b[1]-a[1])[0];
    const topCatPct  = totalRevenue > 0 ? (topCat[1]/totalRevenue*100).toFixed(0) : 0;

    // A-code concentration
    const aRevenue   = _df.filter(r=>r.abcCode==='A').reduce((s,r)=>s+r.estRevenue,0);
    const aCount     = _df.filter(r=>r.abcCode==='A').length;
    const aPct       = totalRevenue > 0 ? (aRevenue/totalRevenue*100).toFixed(0) : 0;

    // Dead stock
    const deadItems  = _df.filter(r=>(r.abcCode==='D'||r.abcCode==='N')&&r.salesQty<=0);
    const deadValue  = deadItems.reduce((s,r)=>s+r.qtyOnHand*r.unitCost,0);
    const deadPct    = (_df.length > 0 ? (deadItems.length/_df.length*100) : 0).toFixed(0);

    // Best margin category
    const catMargin = {};
    const catCount  = {};
    _df.forEach(r => {
      if (r.category !== '—' && r.estRevenue > 0) {
        catMargin[r.category] = (catMargin[r.category]||0) + r.estMargin;
        catCount[r.category]  = (catCount[r.category]||0)  + r.estRevenue;
      }
    });
    const marginBycat = Object.entries(catMargin).map(([k,v]) => [k, catCount[k]>0?v/catCount[k]*100:0]);
    marginBycat.sort((a,b)=>b[1]-a[1]);
    const bestMarginCat = marginBycat[0];

    bar.innerHTML = `
      <span style="color:var(--accent);font-weight:600;font-size:13px">📌 Key Insights</span>
      <span style="color:var(--border2)">|</span>
      <span><strong style="color:var(--text)">${topCat[0]}</strong> drives <strong style="color:var(--accent)">${topCatPct}%</strong> of total revenue</span>
      <span style="color:var(--border2)">·</span>
      <span><strong style="color:var(--text)">${aCount} A-code items</strong> (${((aCount/_df.length)*100).toFixed(0)}% of catalog) generate <strong style="color:var(--accent)">${aPct}%</strong> of revenue</span>
      <span style="color:var(--border2)">·</span>
      <span><strong style="color:var(--urgent)">${deadPct}% of SKUs</strong> are dead stock — <strong style="color:var(--urgent)">${_fmtM(deadValue)}</strong> in tied-up inventory</span>
      <span style="color:var(--border2)">·</span>
      <span>Highest margin category: <strong style="color:var(--ok)">${bestMarginCat[0]} (${bestMarginCat[1].toFixed(0)}%)</strong></span>
    `;
  }

  // ── Charts ────────────────────────────────────────────────────────────────

  function _destroyCharts() {
    Object.values(_charts).forEach(c => { try { c.destroy(); } catch {} });
    _charts = {};
  }

  function _renderCharts() {
    _destroyCharts();
    const isDark     = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const labelColor = isDark ? '#6b7280' : '#9ca3af';
    const bgColor    = isDark ? '#161b26' : '#ffffff';

    // ── Category revenue bar ──
    const catRev = {};
    _df.forEach(r => { if (r.category && r.category !== '—') catRev[r.category] = (catRev[r.category]||0) + r.estRevenue; });
    const catSorted = Object.entries(catRev).sort((a,b)=>b[1]-a[1]).slice(0,10);
    const catColors = ['#1c88df','#5aa9e9','#059669','#d97706','#7c3aed','#ea580c','#0284c7','#dc2626','#0891b2','#65a30d'];

    _charts.catBar = new Chart(document.getElementById('sa-cat-bar'), {
      type: 'bar',
      data: {
        labels: catSorted.map(([k])=>k),
        datasets: [{ label:'Est. Revenue', data: catSorted.map(([,v])=>v),
          backgroundColor: catColors.map(c=>c+'cc'), borderColor: catColors, borderWidth:1, borderRadius:4 }]
      },
      options: {
        responsive:true, maintainAspectRatio:false, indexAxis:'y',
        plugins: { legend:{display:false}, tooltip:{callbacks:{label:ctx=>' '+_fmtM(ctx.raw)}} },
        scales: {
          x: { ticks:{color:labelColor,font:{size:10},callback:v=>_fmtM(v)}, grid:{color:gridColor} },
          y: { ticks:{color:labelColor,font:{size:10}}, grid:{display:false} }
        }
      }
    });

    // ── ABC donut ──
    const abcRev = {};
    const abcLabels = { A:'A — High Value', B:'B — Medium', C:'C — Low', D:'D — Dead', N:'N — New', Z:'Z — Zero', R:'R', W:'W' };
    _df.forEach(r => { if (r.abcCode) abcRev[r.abcCode] = (abcRev[r.abcCode]||0) + r.estRevenue; });
    const abcSorted = Object.entries(abcRev).sort((a,b)=>b[1]-a[1]);
    const abcColors = { A:'#1c88df', B:'#059669', C:'#d97706', D:'#dc2626', N:'#7c3aed', Z:'#9ca3af', R:'#ea580c', W:'#0891b2' };

    _charts.abcDonut = new Chart(document.getElementById('sa-abc-donut'), {
      type: 'doughnut',
      data: {
        labels: abcSorted.map(([k])=>abcLabels[k]||k),
        datasets: [{ data: abcSorted.map(([,v])=>v),
          backgroundColor: abcSorted.map(([k])=>(abcColors[k]||'#ccc')+'cc'),
          borderColor: abcSorted.map(([k])=>abcColors[k]||'#ccc'),
          borderWidth:2, borderColor: bgColor, hoverOffset:4 }]
      },
      options: {
        responsive:true, maintainAspectRatio:false, cutout:'65%',
        plugins: {
          legend:{display:true, position:'right', labels:{color:labelColor,font:{size:10},boxWidth:10,padding:8}},
          tooltip:{callbacks:{label:ctx=>` ${abcSorted[ctx.dataIndex][0]}: ${_fmtM(ctx.raw)}`}}
        }
      }
    });

    // ── Top 15 items by revenue ──
    const top15 = [..._df].filter(r=>r.salesQty>0).sort((a,b)=>b.estRevenue-a.estRevenue).slice(0,15);
    _charts.topBar = new Chart(document.getElementById('sa-top-bar'), {
      type:'bar',
      data:{
        labels: top15.map(r=>r.divItemNo||r.no||'?'),
        datasets:[{ label:'Est. Revenue', data:top15.map(r=>r.estRevenue),
          backgroundColor: top15.map(r=>r.abcCode==='A'?'#1c88dfcc':'#5aa9e9cc'),
          borderColor: top15.map(r=>r.abcCode==='A'?'#1c88df':'#5aa9e9'),
          borderWidth:1, borderRadius:3 }]
      },
      options:{
        responsive:true, maintainAspectRatio:false, indexAxis:'y',
        plugins:{legend:{display:false}, tooltip:{callbacks:{label:ctx=>` ${_fmtM(ctx.raw)}`}}},
        scales:{
          x:{ticks:{color:labelColor,font:{size:10},callback:v=>_fmtM(v)},grid:{color:gridColor}},
          y:{ticks:{color:labelColor,font:{size:10}},grid:{display:false}}
        }
      }
    });

    // ── Velocity distribution ──
    const velData = {};
    const velLabels = {A:'A — Fast',B:'B — Medium',C:'C — Slow',D:'D — Very Slow',X:'X — Seasonal',N:'N — New',W:'W',Z:'Z'};
    const velColors2 = {A:'#059669cc',B:'#1c88dfcc',C:'#d97706cc',D:'#dc2626cc',X:'#7c3aedcc',N:'#0284c7cc',W:'#9ca3afcc',Z:'#9ca3afcc'};
    _df.forEach(r=>{if(r.velocityCode){velData[r.velocityCode]=(velData[r.velocityCode]||0)+Math.max(r.salesQty,0);}});
    const velSorted = Object.entries(velData).sort((a,b)=>b[1]-a[1]);

    _charts.velBar = new Chart(document.getElementById('sa-vel-bar'), {
      type:'bar',
      data:{
        labels: velSorted.map(([k])=>velLabels[k]||k),
        datasets:[{label:'Units Sold', data:velSorted.map(([,v])=>v),
          backgroundColor:velSorted.map(([k])=>velColors2[k]||'#9ca3afcc'),
          borderColor:velSorted.map(([k])=>(velColors2[k]||'#9ca3af').replace('cc','')),
          borderWidth:1, borderRadius:4}]
      },
      options:{
        responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>` ${ctx.raw.toLocaleString()} units`}}},
        scales:{
          x:{ticks:{color:labelColor,font:{size:10}},grid:{color:gridColor}},
          y:{ticks:{color:labelColor,font:{size:10},callback:v=>v>=1000?v/1000+'K':v},grid:{color:gridColor}}
        }
      }
    });
  }

  // ── Table ─────────────────────────────────────────────────────────────────

  function _renderTable() {
    const search     = (document.getElementById('sa-search')?.value||'').toLowerCase();
    const catFilter  = document.getElementById('sa-cat-filter')?.value||'';
    const abcFilter  = document.getElementById('sa-abc-filter')?.value||'';
    const activeTab  = document.querySelector('#sa-tabs .tab.active')?.dataset.tab||'all';
    const thead      = document.querySelector('#module-salesanalytics thead');
    const sortKey    = thead?._sortKey || 'estRevenue';
    const sortDir    = thead?._sortDir || -1;

    // Tab descriptions
    const tabDesc = {
      all:       'All items in the catalog',
      top:       'Items with highest estimated revenue',
      dead:      'ABC code D or N with zero sales — review for clearance or discontinuation',
      slow:      'Items with high stock relative to sales velocity',
      highvalue: 'Items with unit price > $100'
    };
    Utils.setText('sa-tab-desc', tabDesc[activeTab]||'');

    // Filter
    let data = _df.filter(r => {
      if (catFilter && r.category !== catFilter) return false;
      if (abcFilter && r.abcCode !== abcFilter)  return false;
      if (search && ![r.divItemNo, r.description, r.category, r.no].some(v=>v.toLowerCase().includes(search))) return false;
      switch (activeTab) {
        case 'top':       return r.salesQty > 0;
        case 'dead':      return (r.abcCode==='D'||r.abcCode==='N') && r.salesQty <= 0;
        case 'slow':      return r.salesQty > 0 && r.stockCoverage !== null && r.stockCoverage > 10;
        case 'highvalue': return r.unitPrice >= 100;
        default:          return true;
      }
    });

    // Sort
    data.sort((a,b)=>{
      const av=a[sortKey], bv=b[sortKey];
      if (av===null||av===undefined) return 1;
      if (bv===null||bv===undefined) return -1;
      return (typeof av==='string'?av.localeCompare(bv):av-bv)*sortDir;
    });

    // Limit display for performance
    const display = data.slice(0, 200);

    Utils.setText('sa-table-title', {all:'All Items',top:'Top Performers',dead:'Dead Stock',slow:'Slow Movers',highvalue:'High Value Items'}[activeTab]||'Items');
    Utils.setText('sa-row-count', data.length.toLocaleString() + ' items' + (data.length>200?' (showing 200)':''));

    const tbody = document.getElementById('sa-table-body');
    if (!display.length) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--muted)">No items match your filters.</td></tr>`;
      return;
    }

    const abcBadgeColor = {A:'var(--accent)',B:'var(--ok)',C:'var(--warn)',D:'var(--urgent)',N:'var(--predict)',Z:'var(--muted)',R:'var(--issue)'};
    const velBadgeColor = {A:'var(--ok)',B:'var(--accent)',C:'var(--warn)',D:'var(--urgent)',X:'var(--predict)',N:'var(--muted)'};

    tbody.innerHTML = display.map(r => {
      const abcColor = abcBadgeColor[r.abcCode]||'var(--muted)';
      const velColor = velBadgeColor[r.velocityCode]||'var(--muted)';
      const coverageHtml = r.stockCoverage !== null
        ? `<span style="font-family:var(--font-mono);font-size:11px;color:${r.stockCoverage>20?'var(--urgent)':r.stockCoverage>5?'var(--warn)':'var(--ok)'}">${r.stockCoverage.toFixed(1)}x</span>`
        : '<span style="color:var(--muted2)">—</span>';
      const marginColor = r.marginPct > 60 ? 'var(--ok)' : r.marginPct > 30 ? 'var(--warn)' : 'var(--urgent)';

      return `<tr>
        <td class="item-no">${r.divItemNo||r.no||'—'}</td>
        <td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text2)" title="${r.description}">${r.description||'—'}</td>
        <td><span style="font-size:10px;background:var(--accent-bg);color:var(--accent);border:1px solid var(--accent-border);padding:1px 6px;border-radius:3px;white-space:nowrap">${r.category}</span></td>
        <td><span style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:${abcColor}">${r.abcCode||'—'}</span></td>
        <td><span style="font-family:var(--font-mono);font-size:11px;font-weight:600;color:${velColor}">${r.velocityCode||'—'}</span></td>
        <td style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:${r.salesQty>0?'var(--text)':'var(--urgent)'}">${r.salesQty > 0 ? r.salesQty.toLocaleString() : '0'}</td>
        <td style="font-family:var(--font-mono);font-size:12px">${r.qtyOnHand.toLocaleString()}</td>
        <td style="font-family:var(--font-mono);font-size:12px">$${r.unitPrice.toFixed(2)}</td>
        <td style="font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--accent)">${r.estRevenue>0?_fmtM(r.estRevenue):'—'}</td>
        <td style="font-family:var(--font-mono);font-size:11px;color:${marginColor}">${r.estRevenue>0?r.marginPct.toFixed(0)+'%':'—'}</td>
        <td>${coverageHtml}</td>
      </tr>`;
    }).join('');
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function _export() {
    const activeTab = document.querySelector('#sa-tabs .tab.active')?.dataset.tab||'all';
    let data = _df;
    if (activeTab === 'dead')      data = _df.filter(r=>(r.abcCode==='D'||r.abcCode==='N')&&r.salesQty<=0);
    if (activeTab === 'top')       data = [..._df].filter(r=>r.salesQty>0).sort((a,b)=>b.estRevenue-a.estRevenue).slice(0,100);
    if (activeTab === 'slow')      data = _df.filter(r=>r.salesQty>0&&r.stockCoverage>10);
    if (activeTab === 'highvalue') data = _df.filter(r=>r.unitPrice>=100);

    Utils.exportToExcel(
      data.map(r=>({
        'Item No':         r.divItemNo||r.no,
        'Description':     r.description,
        'Category':        r.category,
        'ABC Code':        r.abcCode,
        'Velocity Code':   r.velocityCode,
        'Sales Qty':       r.salesQty,
        'Qty on Hand':     r.qtyOnHand,
        'Unit Price':      r.unitPrice,
        'Unit Cost':       r.unitCost,
        'Est. Revenue':    r.estRevenue.toFixed(2),
        'Est. Margin':     r.estMargin.toFixed(2),
        'Margin %':        r.estRevenue>0?r.marginPct.toFixed(1)+'%':'—',
        'Stock Coverage':  r.stockCoverage!==null?r.stockCoverage.toFixed(1)+'x':'—',
      })),
      `GPD_SalesAnalytics_${Utils.isoDate()}.xlsx`,
      'Sales Analytics'
    );
  }

  function _reset() {
    _raw=[]; _df=[]; _destroyCharts();
    document.getElementById('sa-dashboard').style.display='none';
    Utils.show('sa-upload');
  }

  // ── Demo data ─────────────────────────────────────────────────────────────

  function _loadDemo() {
    const cats = ['COMPRESSORS','CONDENSERS','EXPANSION VALVES','EVAPORATORS','BLOWER/RAD MOTORS','ACCUMULATORS/DRIERS','RADIATORS','HEATER CORES'];
    const abcs  = ['A','A','B','B','C','C','D','D','N'];
    const vels  = ['A','B','B','C','C','X','D'];
    const descs = ['A/C COMPRESSOR','CONDENSER PARALLEL FLOW','EXPANSION VALVE BLOCK','EVAPORATOR CORE','BLOWER MOTOR','ACCUMULATOR DRIER','RADIATOR','HEATER CORE','O-RING KIT','RAPID SEAL KIT'];

    const rows = Array.from({length:200},(_,i)=>{
      const cat = cats[i%cats.length];
      const abc = abcs[Math.floor(Math.random()*abcs.length)];
      const vel = vels[Math.floor(Math.random()*vels.length)];
      const price = cat==='COMPRESSORS'?Math.random()*400+100:Math.random()*150+10;
      const cost  = price*(0.15+Math.random()*0.2);
      const sales = abc==='D'||abc==='N'?0:Math.floor(Math.random()*500)+1;
      const qoh   = Math.floor(Math.random()*5000)+10;
      return {
        'No.': `H${String(i).padStart(2,'0')}-11${String(1000+i).padStart(4,'0')}`,
        'Division Item No.': `${Math.floor(Math.random()*9000000+1000000)}`,
        'Description': descs[i%descs.length]+' '+i,
        'Cat. Level 1': cat,
        'ABC Code': abc,
        'Velocity Code': vel,
        'Sales (Qty.)': sales,
        'Quantity on Hand': qoh,
        'Unit Price': parseFloat(price.toFixed(2)),
        'Unit Cost': parseFloat(cost.toFixed(2)),
        'Qty. on Sales Order': Math.floor(Math.random()*20),
      };
    });
    _process(rows, true);
  }

  // ── Register ──────────────────────────────────────────────────────────────

  App.register({ id:'salesanalytics', label:'Sales Analytics', dotColor:'var(--predict)', mount });

})();