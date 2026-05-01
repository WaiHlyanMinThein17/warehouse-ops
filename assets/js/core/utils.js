/**
 * utils.js — Shared helpers for GPD Warehouse Ops
 */

window.Utils = (() => {

  function timestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function isoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function qs(selector, root = document)  { return root.querySelector(selector); }
  function qsa(selector, root = document) { return [...root.querySelectorAll(selector)]; }

  function setHTML(id, html)  { const el = document.getElementById(id); if (el) el.innerHTML = html; }
  function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
  function show(id)     { const el = document.getElementById(id); if (el) el.style.display = ''; }
  function hide(id)     { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
  function showFlex(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }

  function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const wb   = XLSX.read(e.target.result, { type: 'binary' });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
          resolve(json);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsBinaryString(file);
    });
  }

  function exportToExcel(rows, filename, sheetName = 'Sheet1') {
    if (!rows.length) { alert('No data to export.'); return; }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, filename);
  }

  function setupDropZone(zone, onFile) {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) onFile(file);
    });
  }

  function makeSorter(key, dir) {
    return (a, b) => {
      const av = a[key], bv = b[key];
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * dir;
    };
  }

  function fmtQty(n) {
    if (n === null || n === undefined || n === '') return '—';
    return n > 0 ? String(n) : '—';
  }

  function parseNum(val) {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }

  function statusBadge(cls, label) {
    return `<span class="status ${cls}"><span class="status-dot"></span>${label}</span>`;
  }

  function binChip(code, isEmpty = false) {
    return `<span class="bin-code${isEmpty ? ' empty-bin' : ''}">${code || '—'}</span>`;
  }

  return {
    timestamp, isoDate,
    qs, qsa,
    setHTML, setText, show, hide, showFlex,
    parseExcelFile, exportToExcel, setupDropZone,
    makeSorter, fmtQty, parseNum,
    statusBadge, binChip,
  };

})();