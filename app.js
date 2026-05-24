/* ============================================================
   FireOps — App Framework
   State, persistence, routing, auth, navigation, render orchestrator
   ============================================================ */

window.FireOpsState = {
  stations: [],
  incidents: [],
  units: [],
  firefighters: [],
  apparatus: [],
  shifts: [],
  equipment: [],
  trainings: [],
  op_log: []
};

window.FireOpsApp = (function() {

  let currentUser = null;
  let currentStationId = null;
  let currentPage = 'dispatch';
  let saveTimer = null;

  // === Persistence ===
  function loadState() {
    try {
      const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (raw) Object.assign(FireOpsState, JSON.parse(raw));
    } catch (e) { console.warn('loadState failed', e); }

    if (!FireOpsState.stations || FireOpsState.stations.length === 0) {
      FireOpsState.stations = JSON.parse(JSON.stringify(CONFIG.DEFAULT_STATIONS));
      saveState();
    }
  }

  function saveState() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(FireOpsState));
        FireOpsFirebase.pushState(FireOpsState);
      } catch (e) { console.warn('saveState failed', e); }
    }, CONFIG.SYNC_DEBOUNCE_MS);
  }

  function loadAuth() {
    try {
      const raw = localStorage.getItem(CONFIG.AUTH_KEY);
      if (raw) currentUser = JSON.parse(raw);
    } catch (e) { console.warn('loadAuth failed', e); }
  }

  function saveAuth() {
    try {
      if (currentUser) localStorage.setItem(CONFIG.AUTH_KEY, JSON.stringify(currentUser));
      else localStorage.removeItem(CONFIG.AUTH_KEY);
    } catch (e) { console.warn('saveAuth failed', e); }
  }

  // === Auth modal ===
  function showAuthModal() {
    populateAuthStations();
    document.getElementById('auth-modal').classList.add('visible');
    setTimeout(() => document.getElementById('login-name').focus(), 100);
  }

  function hideAuthModal() {
    document.getElementById('auth-modal').classList.remove('visible');
  }

  function populateAuthStations() {
    const sel = document.getElementById('login-station');
    sel.innerHTML = FireOpsState.stations.map(s =>
      `<option value="${s.id}">${s.name}</option>`
    ).join('');
  }

  function doLogin() {
    const name = document.getElementById('login-name').value.trim();
    const role = document.getElementById('login-role').value;
    const stationId = document.getElementById('login-station').value;
    if (!name) { toast('⚠ נא להזין שם משתמש', 'warning'); return; }
    currentUser = { name, role, stationId, loggedAt: Date.now() };
    currentStationId = stationId;
    saveAuth();
    hideAuthModal();
    renderUserInfo();
    populateStationSelector();
    if (FireOpsDispatch.init) FireOpsDispatch.init();
    toast(`⚡ שלום ${name} — ${CONFIG.getRole(role).name_he}`, 'success');
  }

  function renderUserInfo() {
    if (!currentUser) return;
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role').textContent = CONFIG.getRole(currentUser.role).name_he;
  }

  // === Station selector ===
  function populateStationSelector() {
    const sel = document.getElementById('station-select');
    sel.innerHTML = FireOpsState.stations.map(s =>
      `<option value="${s.id}" ${s.id === currentStationId ? 'selected' : ''}>${s.name}</option>`
    ).join('');
    sel.value = currentStationId;
  }

  function getCurrentStation() {
    return FireOpsState.stations.find(s => s.id === currentStationId) || FireOpsState.stations[0];
  }

  function onStationSelectChange(e) {
    currentStationId = e.target.value;
    if (currentUser) {
      currentUser.stationId = currentStationId;
      saveAuth();
    }
    // Notify all modules of station change
    ['Dispatch','Firefighters','Apparatus','Scheduling','Equipment','Training','OpLog','Reports','Settings'].forEach(mod => {
      const m = window[`FireOps${mod}`];
      if (m && m.onStationChange) m.onStationChange();
    });
    toast(`🚒 עבר/ת ל-${getCurrentStation().name}`);
  }

  // === Module registry (lazy init per page) ===
  const MODULES = {
    'dispatch':     () => FireOpsDispatch,
    'firefighters': () => FireOpsFirefighters,
    'apparatus':    () => FireOpsApparatus,
    'scheduling':   () => FireOpsScheduling,
    'equipment':    () => FireOpsEquipment,
    'training':     () => FireOpsTraining,
    'op-log':       () => FireOpsOpLog,
    'reports':      () => FireOpsReports,
    'settings':     () => FireOpsSettings
  };

  function navigateTo(page) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-page="${page}"]`);
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    currentPage = page;

    const modGetter = MODULES[page];
    if (modGetter) {
      const mod = modGetter();
      if (mod && mod.init) mod.init();
    }

    if (page === 'dispatch' && window.FireOpsDispatch?.invalidateMapSize) {
      FireOpsDispatch.invalidateMapSize();
    }
  }

  function wireNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (!page || currentPage === page) {
          closeDrawer();
          return;
        }
        FireOpsSounds.uiClick();
        navigateTo(page);
        closeDrawer();
      });
    });
  }

  // === Mobile drawer (hamburger menu) ===
  function openDrawer() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('drawer-backdrop')?.classList.add('visible');
    document.getElementById('hamburger-btn')?.classList.add('open');
    document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
  }

  function closeDrawer() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('drawer-backdrop')?.classList.remove('visible');
    document.getElementById('hamburger-btn')?.classList.remove('open');
    document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  }

  function wireDrawer() {
    const btn = document.getElementById('hamburger-btn');
    const backdrop = document.getElementById('drawer-backdrop');
    if (btn) {
      btn.addEventListener('click', () => {
        const isOpen = document.getElementById('sidebar')?.classList.contains('open');
        if (isOpen) closeDrawer(); else openDrawer();
        FireOpsSounds.uiClick();
      });
    }
    if (backdrop) backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDrawer();
    });
    // Auto-close on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) closeDrawer();
    });
  }

  // === Clock ===
  function startClock() {
    function tick() {
      const d = new Date();
      document.getElementById('clock').textContent = d.toLocaleTimeString('he-IL', { hour12: false });
    }
    tick();
    setInterval(tick, 1000);
  }

  function updateShiftIndicator() {
    const now = new Date();
    const hour = now.getHours();
    const isDayShift = hour >= 7 && hour < 19;
    document.getElementById('shift-indicator').textContent = isDayShift
      ? 'משמרת יום · 07:00–19:00'
      : 'משמרת לילה · 19:00–07:00';
  }

  // === Toast ===
  function toast(msg, type = '') {
    const t = document.createElement('div');
    t.className = `toast ${type ? 'toast-' + type : ''}`;
    t.textContent = msg;
    document.getElementById('toasts').appendChild(t);
    setTimeout(() => t.style.opacity = '0', 3000);
    setTimeout(() => t.remove(), 3500);
  }

  // === Generic modal ===
  function openModal(contentHtml, options = {}) {
    const backdrop = document.getElementById('generic-modal');
    const content = document.getElementById('generic-modal-content');
    content.innerHTML = contentHtml;
    content.classList.toggle('modal-lg', !!options.large);
    backdrop.classList.add('visible');
    if (options.onMount) options.onMount(content);
  }

  function closeModal() {
    document.getElementById('generic-modal').classList.remove('visible');
    document.getElementById('generic-modal-content').innerHTML = '';
  }

  // Close generic modal on backdrop click
  document.addEventListener('click', e => {
    if (e.target.id === 'generic-modal') closeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  // === Op-log helper: every module can log events ===
  function logEvent(category, urgency, text, extra = {}) {
    FireOpsState.op_log = FireOpsState.op_log || [];
    FireOpsState.op_log.unshift({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      station_id: getCurrentStation()?.id,
      timestamp: Date.now(),
      category,
      urgency,
      actor: currentUser?.name || 'system',
      text,
      ...extra
    });
    // Cap at 500 to avoid bloat
    if (FireOpsState.op_log.length > 500) FireOpsState.op_log.length = 500;
    saveState();
    if (FireOpsOpLog && FireOpsOpLog.refreshIfActive) FireOpsOpLog.refreshIfActive();
  }

  // === Helpers exposed on FireOpsApp ===
  function uid(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  // === Init ===
  function wireSoundToggle() {
    const btn = document.getElementById('sound-toggle');
    if (!btn) return;
    function update() {
      const on = FireOpsSounds.isEnabled();
      btn.classList.toggle('active', on);
      btn.textContent = on ? '🔊' : '🔇';
      btn.title = on ? 'צליל מופעל · לחץ לכיבוי' : 'צליל מכובה · לחץ להפעלה';
    }
    btn.addEventListener('click', () => {
      FireOpsSounds.setEnabled(!FireOpsSounds.isEnabled());
      update();
      toast(FireOpsSounds.isEnabled() ? '🔊 צליל הופעל' : '🔇 צליל כובה');
    });
    update();
  }

  async function init() {
    loadState();
    loadAuth();
    FireOpsSounds.loadPref();
    await FireOpsFirebase.init();

    startClock();
    updateShiftIndicator();
    setInterval(updateShiftIndicator, 60_000);

    document.getElementById('station-select').addEventListener('change', onStationSelectChange);
    document.getElementById('btn-login').addEventListener('click', doLogin);
    document.getElementById('login-name').addEventListener('keydown', e => {
      if (e.key === 'Enter') doLogin();
    });

    wireNav();
    wireDrawer();
    wireSoundToggle();

    if (currentUser) {
      currentStationId = currentUser.stationId || FireOpsState.stations[0]?.id;
      renderUserInfo();
      populateStationSelector();
      FireOpsDispatch.init();
      setTimeout(() => toast(`⚡ ברוך שובך ${currentUser.name}`), 400);
    } else {
      showAuthModal();
    }
  }

  return {
    init,
    saveState,
    toast,
    openModal,
    closeModal,
    navigateTo,
    getCurrentStation,
    getCurrentUser: () => currentUser,
    getCurrentStationId: () => currentStationId,
    logEvent,
    uid
  };
})();

window.addEventListener('DOMContentLoaded', () => FireOpsApp.init());
