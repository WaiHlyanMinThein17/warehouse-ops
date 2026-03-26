/**
 * app.js — Core application controller for GPD Warehouse Ops
 *
 * Responsibilities:
 *   - Module registry: tracks which modules exist and which is active
 *   - Tab switching: shows/hides module panels and updates nav
 *   - Shared state: last-updated timestamp, app-level events
 *   - Future: could handle auth, notifications, keyboard shortcuts
 *
 * Each feature module (replenishment.js, emptybins.js, ...) calls
 * App.register() to add itself to the nav and inject its HTML.
 */

window.App = (() => {

  // Registry of all loaded modules: { id, label, dotColor, render }
  const _modules = {};
  let _activeModule = null;


  /* ── Module registration ── */

  /**
   * Register a feature module.
   * Called by each module script (e.g. Replenishment.register()).
   *
   * @param {object} config
   * @param {string}   config.id        - unique id, matches #module-{id} in HTML
   * @param {string}   config.label     - display name in the tab
   * @param {string}   config.dotColor  - CSS color var for the nav indicator dot
   * @param {Function} config.mount     - called once when the module panel first renders
   */
  function register({ id, label, dotColor, mount }) {
    _modules[id] = { id, label, dotColor, mount, mounted: false };
  }


  /* ── Initialisation ── */

  function init() {
    // Wire nav tab clicks
    const navTabs = document.getElementById('nav-tabs');
    if (navTabs) {
      navTabs.addEventListener('click', e => {
        const btn = e.target.closest('.nav-tab');
        if (btn && btn.dataset.module) switchModule(btn.dataset.module);
      });
    }

    // Mount the default active module
    const firstTab = document.querySelector('.nav-tab.active');
    const defaultId = firstTab?.dataset.module;
    if (defaultId) _mountIfNeeded(defaultId);
    _activeModule = defaultId;
  }


  /* ── Module switching ── */

  function switchModule(id) {
    if (id === _activeModule) return;

    // Hide all modules
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));

    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.module === id);
    });

    // Show target module
    const panel = document.getElementById('module-' + id);
    if (panel) panel.classList.add('active');

    // Mount on first visit
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


  /* ── Shared UI helpers ── */

  function setLastUpdated() {
    const el = document.getElementById('last-updated');
    if (!el) return;
    el.textContent = Utils.timestamp();
    el.style.display = 'block';
  }

  function getActiveModule() { return _activeModule; }


  /* ── Public API ── */
  return {
    init,
    register,
    switchModule,
    setLastUpdated,
    getActiveModule,
  };

})();