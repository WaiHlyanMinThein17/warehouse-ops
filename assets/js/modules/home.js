/**
 * home.js — Home / Landing Module
 */

(() => {

  function mount() {
    const panel = document.getElementById('module-home');
    if (!panel) return;
    panel.innerHTML = _html();
    _bindEvents();
  }

  function _html() {
    return `
    <div class="home-wrap">
      <div class="home-header">
        <div>
          <div class="home-title">Warehouse Operations Dashboard</div>
          <div class="home-sub">Macon Distribution Center &nbsp;·&nbsp; Omega Acquisition Corp.</div>
        </div>
        <div id="home-date" class="home-date"></div>
      </div>

      <div class="home-grid">

        <div class="home-card" data-target="replenishment">
          <div class="home-card-icon" style="background:rgba(217,119,6,0.1);color:var(--warn)">📦</div>
          <div class="home-card-body">
            <div class="home-card-title">Replenishment</div>
            <div class="home-card-desc">Track bin replenishment status from Business Central Movement Worksheet exports. Identify urgent, low, and predicted restocks.</div>
          </div>
          <div class="home-card-footer">
            <span class="home-card-tag">Movement Worksheet</span>
            <button class="btn btn-primary home-card-btn">Open →</button>
          </div>
        </div>

        <div class="home-card" data-target="emptybins">
          <div class="home-card-icon" style="background:rgba(2,132,199,0.1);color:var(--empty)">🗂️</div>
          <div class="home-card-body">
            <div class="home-card-title">Empty Bin Finder</div>
            <div class="home-card-desc">Identify fully empty and partially empty bin locations across all warehouse zones from Bin Contents exports.</div>
          </div>
          <div class="home-card-footer">
            <span class="home-card-tag">Bin Contents</span>
            <button class="btn btn-primary home-card-btn">Open →</button>
          </div>
        </div>

        <div class="home-card" data-target="processinglog">
          <div class="home-card-icon" style="background:rgba(28,136,223,0.1);color:var(--accent)">📋</div>
          <div class="home-card-body">
            <div class="home-card-title">Processing Log</div>
            <div class="home-card-desc">Generate monthly processing log sheets for any station with dates auto-filled. Download print-ready Excel files instantly.</div>
          </div>
          <div class="home-card-footer">
            <span class="home-card-tag">MCN1 – MCN6</span>
            <button class="btn btn-primary home-card-btn">Open →</button>
          </div>
        </div>

        <div class="home-card" data-target="salesanalytics">
          <div class="home-card-icon" style="background:rgba(124,58,237,0.1);color:var(--predict)">📊</div>
          <div class="home-card-body">
            <div class="home-card-title">Sales Analytics</div>
            <div class="home-card-desc">Analyze sales performance, identify top performers and dead stock, surface revenue and margin insights across the product catalog.</div>
          </div>
          <div class="home-card-footer">
            <span class="home-card-tag">Items Export</span>
            <button class="btn btn-primary home-card-btn">Open →</button>
          </div>
        </div>

      </div>
    </div>`;
  }

  function _bindEvents() {
    const panel = document.getElementById('module-home');

    const dateEl = document.getElementById('home-date');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }

    panel.querySelectorAll('.home-card:not(.home-card-soon)').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        App.switchModule(card.dataset.target);
      });
    });
  }

  App.register({ id: 'home', label: 'Home', dotColor: 'var(--accent)', mount });

})();