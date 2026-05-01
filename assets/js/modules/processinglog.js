/**
 * processinglog.js — Processing Log Generator Module
 *
 * Generates a monthly processing log Excel sheet in the exact
 * format used by GPD supervisors, with dates auto-filled for
 * any selected month, year, and station (MCN2–MCN6).
 */

(() => {

  function mount() {
    const panel = document.getElementById('module-processinglog');
    if (!panel) return;
    panel.innerHTML = _html();
    _bindEvents();
  }

  function _html() {
    const currentYear  = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-indexed

    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];

    const monthOptions = months.map((m, i) =>
      `<option value="${i}" ${i === currentMonth ? 'selected' : ''}>${m}</option>`
    ).join('');

    const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map(y =>
      `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`
    ).join('');

    return `
    <div class="page-header">
      <h1 class="page-title">Processing Log Generator</h1>
      <p class="page-subtitle">Generate a print-ready monthly processing log sheet for any station — dates fill in automatically.</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:900px">

      <!-- Config card -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm)">
        <div style="font-size:13px;font-weight:600;margin-bottom:20px;color:var(--text)">Configure Log Sheet</div>

        <div style="margin-bottom:16px">
          <label style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px">Station</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap" id="station-btns">
            ${['MCN2','MCN3','MCN4','MCN5','MCN6'].map((s,i) =>
              `<button class="station-btn ${i===0?'active':''}" data-station="${s}"
                style="padding:8px 16px;border-radius:var(--radius-md);border:1px solid var(--border2);
                background:${i===0?'var(--accent)':'var(--bg3)'};
                color:${i===0?'#fff':'var(--text2)'};
                font-family:var(--font-sans);font-size:13px;font-weight:600;cursor:pointer;
                transition:all 0.15s">${s}</button>`
            ).join('')}
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
          <div>
            <label style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px">Month</label>
            <select id="log-month" style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-md);padding:7px 10px;color:var(--text);font-family:var(--font-sans);font-size:13px;outline:none">
              ${monthOptions}
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px">Year</label>
            <select id="log-year" style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--radius-md);padding:7px 10px;color:var(--text);font-family:var(--font-sans);font-size:13px;outline:none">
              ${yearOptions}
            </select>
          </div>
        </div>

        <button class="btn btn-primary" id="generate-btn" style="width:100%;justify-content:center;padding:10px;font-size:14px">
          ⬇ Generate & Download Excel
        </button>
      </div>

      <!-- Preview card -->
      <div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm)">
        <div style="font-size:13px;font-weight:600;margin-bottom:16px;color:var(--text)">Preview</div>
        <div id="log-preview" style="font-family:var(--font-mono);font-size:12px;line-height:1.9;color:var(--text2)"></div>
      </div>

    </div>`;
  }

  function _bindEvents() {
    const panel = document.getElementById('module-processinglog');

    // Station buttons
    panel.querySelector('#station-btns').addEventListener('click', e => {
      const btn = e.target.closest('.station-btn');
      if (!btn) return;
      panel.querySelectorAll('.station-btn').forEach(b => {
        b.style.background = 'var(--bg3)';
        b.style.color      = 'var(--text2)';
        b.style.borderColor = 'var(--border2)';
        b.classList.remove('active');
      });
      btn.style.background  = 'var(--accent)';
      btn.style.color       = '#fff';
      btn.style.borderColor = 'var(--accent)';
      btn.classList.add('active');
      _updatePreview();
    });

    // Month / year change
    panel.querySelector('#log-month').addEventListener('change', _updatePreview);
    panel.querySelector('#log-year').addEventListener('change',  _updatePreview);

    // Generate button
    panel.querySelector('#generate-btn').addEventListener('click', _generate);

    // Initial preview
    _updatePreview();
  }

  // ── Date helpers ──────────────────────────────────────────────────────────

  function _getWeekdays(month, year) {
    const days = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      const dow = date.getDay();
      if (dow >= 1 && dow <= 5) days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  }

  function _ordinal(n) {
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function _formatDay(date) {
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${_ordinal(date.getDate())}`;
  }

  function _getState() {
    const panel   = document.getElementById('module-processinglog');
    const station = panel?.querySelector('.station-btn.active')?.dataset.station || 'MCN2';
    const month   = parseInt(panel?.querySelector('#log-month')?.value ?? new Date().getMonth());
    const year    = parseInt(panel?.querySelector('#log-year')?.value  ?? new Date().getFullYear());
    const months  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return { station, month, year, monthName: months[month] };
  }

  // ── Preview ───────────────────────────────────────────────────────────────

  function _updatePreview() {
    const { station, month, year, monthName } = _getState();
    const weekdays = _getWeekdays(month, year);
    const preview  = document.getElementById('log-preview');
    if (!preview) return;

    let html = `<div style="color:var(--accent);font-weight:700;margin-bottom:8px;font-size:13px">>> ${station} ${monthName} Processing Log <<</div>`;
    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;font-size:11px;color:var(--muted);font-weight:600;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid var(--border)"><span>DATE</span><span>PROCESSOR</span></div>`;

    let lastWeek = null;
    weekdays.forEach(d => {
      const weekNum = Math.ceil(d.getDate() / 7);
      if (weekNum !== lastWeek && lastWeek !== null) {
        html += `<div style="height:8px"></div>`;
      }
      lastWeek = weekNum;
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;padding:2px 0;border-bottom:1px solid var(--border)">
        <span>${_formatDay(d)}</span>
        <span style="color:var(--muted2)">—</span>
      </div>`;
    });

    preview.innerHTML = html;
  }

  // ── Excel generation — calls Flask backend ───────────────────────────────

  function _generate() {
    const { station, month, year } = _getState();
    const btn = document.getElementById('generate-btn');

    // month is 0-indexed in JS, API expects 1-indexed
    const url = `/api/processing-log?station=${station}&month=${month + 1}&year=${year}`;

    // Show loading state
    btn.textContent = '⏳ Generating...';
    btn.disabled = true;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Server error');
        return res.blob();
      })
      .then(blob => {
        // Trigger download
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        const months = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
        a.download = `GPD_${station}_${months[month]}_${year}_ProcessingLog.xlsx`;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => {
        alert('Could not connect to the server.\nMake sure server.py is running:\n\n  python server.py');
      })
      .finally(() => {
        btn.textContent = '⬇ Generate & Download Excel';
        btn.disabled = false;
      });
  }

  // ── Register ──────────────────────────────────────────────────────────────

  App.register({
    id:       'processinglog',
    label:    'Processing Log',
    dotColor: 'var(--accent)',
    mount,
  });

})();