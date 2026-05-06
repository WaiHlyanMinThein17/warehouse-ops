/**
 * app.js — Core application controller
 */

window.App = (() => {

  const _modules = {};
  let _activeModule = null;

  function register({ id, label, dotColor, mount }) {
    _modules[id] = { id, label, dotColor, mount, mounted: false };
  }

  function init() {
    _mountIfNeeded('home');
    _activeModule = 'home';
  }

  function switchModule(id) {
    if (id === _activeModule) return;

    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const panel = document.getElementById('module-' + id);
    if (panel) panel.classList.add('active');

    _mountIfNeeded(id);
    _activeModule = id;

    // Show/hide back button
    _updateNav(id);
  }

  function _updateNav(id) {
    // Remove existing back bar
    const existing = document.getElementById('app-back-bar');
    if (existing) existing.remove();

    if (id === 'home') return;

    const mod = _modules[id];
    const label = mod ? mod.label : id;

    const bar = document.createElement('div');
    bar.id = 'app-back-bar';
    bar.style.cssText = `
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      height: 36px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
      position: sticky;
      top: 52px;
      z-index: 99;
    `;
    bar.innerHTML = `
      <button onclick="App.switchModule('home')" style="
        background:none; border:none; cursor:pointer;
        color:var(--accent); font-size:12px; font-family:var(--font-sans);
        display:flex; align-items:center; gap:4px; padding:0;
      ">← Home</button>
      <span style="color:var(--border2)">/</span>
      <span style="color:var(--text2); font-weight:500">${label}</span>
    `;

    // Insert after header
    const header = document.querySelector('header');
    header.insertAdjacentElement('afterend', bar);
  }

  function _mountIfNeeded(id) {
    const mod = _modules[id];
    if (mod && !mod.mounted) {
      mod.mount();
      mod.mounted = true;
    }
    // Show the panel
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    const panel = document.getElementById('module-' + id);
    if (panel) panel.classList.add('active');
  }

  function setLastUpdated() {
    const el = document.getElementById('last-updated');
    if (!el) return;
    el.textContent = 'Updated ' + Utils.timestamp();
    el.style.display = 'block';
  }

  function getActiveModule() { return _activeModule; }

  return { init, register, switchModule, setLastUpdated, getActiveModule };

})();