/**
 * app.js — Core application controller for GPD Warehouse Ops
 */

window.App = (() => {

  const _modules = {};
  let _activeModule = null;

  function register({ id, label, dotColor, mount }) {
    _modules[id] = { id, label, dotColor, mount, mounted: false };
  }

  function init() {
    const navTabs = document.getElementById('nav-tabs');
    if (navTabs) {
      navTabs.addEventListener('click', e => {
        const btn = e.target.closest('.nav-tab');
        if (btn && btn.dataset.module) switchModule(btn.dataset.module);
      });
    }

    const firstTab = document.querySelector('.nav-tab.active');
    const defaultId = firstTab?.dataset.module;
    if (defaultId) _mountIfNeeded(defaultId);
    _activeModule = defaultId;
  }

  function switchModule(id) {
    if (id === _activeModule) return;
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.module === id);
    });
    const panel = document.getElementById('module-' + id);
    if (panel) panel.classList.add('active');
    _mountIfNeeded(id);
    _activeModule = id;
  }

  function _mountIfNeeded(id) {
    const mod = _modules[id];
    if (mod && !mod.mounted) {
      mod.mount();
      mod.mounted = true;
    }
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