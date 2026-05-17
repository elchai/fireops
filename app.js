/* ============================================================
   FireOps — App Framework
   State, persistence, routing, auth, navigation, render orchestrator
   ============================================================ */

// === Global state ===
window.FireOpsState = {
  stations: [],
  incidents: [],
  units: [],
  // future: firefighters, apparatus, equipment, training, shifts, op_log
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
      if (raw) {
        Object.assign(FireOpsState, JSON.parse(raw));
      }
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

  // === Auth ===
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
    if (!name) {
      toast('⚠ נא להזין שם משתמש', 'warning');
      return;
    }
    currentUser = { name, role, stationId, loggedAt: Date.now() };
    currentStationId = stationId;
    saveAuth();
    hideAuthModal();
    renderUserInfo();
    populateStationSelector();
    FireOpsDispatch.init();
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
    if (FireOpsDispatch.onStationChange) FireOpsDispatch.onStationChange();
    toast(`🚒 עבר/ת ל-${getCurrentStation().name}`);
  }

  // === Navigation ===
  function navigateTo(page) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-page="${page}"]`);
    if (btn) btn.classList.add('active');

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add('active');

    currentPage = page;

    if (page === 'dispatch') {
      // המפה צריכה invalidateSize אחרי שהדף שלה הוצג שוב
      setTimeout(() => {
        if (window.FireOpsDispatch && window.FireOpsDispatch._map) {
          // no-op — שמור על דפוס נקי, ה-map כבר ב-DOM
        }
      }, 50);
    }
  }

  function wireNav() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (!page) return;
        FireOpsSounds.uiClick();
        navigateTo(page);
        if (page !== 'dispatch') {
          toast(`🔀 ${btn.title} · מודול בפיתוח`);
        }
      });
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

  // === Shift indicator ===
  function updateShiftIndicator() {
    const now = new Date();
    const hour = now.getHours();
    const isDayShift = hour >= 7 && hour < 19;
    const txt = isDayShift
      ? 'משמרת יום · 07:00–19:00'
      : 'משמרת לילה · 19:00–07:00';
    document.getElementById('shift-indicator').textContent = txt;
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

  // === Init ===
  async function init() {
    loadState();
    loadAuth();
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
    navigateTo,
    getCurrentStation,
    getCurrentUser: () => currentUser
  };
})();

// Boot
window.addEventListener('DOMContentLoaded', () => FireOpsApp.init());
