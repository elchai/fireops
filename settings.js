/* ============================================================
   FireOps — Settings Module
   Tabs: Stations / Run Cards / System
   ============================================================ */

window.FireOpsSettings = (function() {

  let initialized = false;
  let activeTab = 'stations';

  function init() {
    if (!initialized) {
      initialized = true;
      buildShell();
    }
    render();
  }

  function buildShell() {
    const page = document.getElementById('page-settings');
    page.innerHTML = `
      <div class="module-page glass">
        <div class="module-header">
          <span class="module-icon">⚙️</span>
          <div>הגדרות מערכת<div class="subtitle">ניהול תחנות, run cards, מערכת</div></div>
        </div>
        <div class="tabs">
          <button class="tab active" data-tab="stations">תחנות</button>
          <button class="tab" data-tab="runcards">Run Cards</button>
          <button class="tab" data-tab="tactical">טקטי</button>
          <button class="tab" data-tab="system">מערכת</button>
        </div>
        <div class="module-body" id="set-body"></div>
      </div>
    `;
    page.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => {
        page.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        activeTab = t.dataset.tab;
        render();
      });
    });
  }

  function render() {
    const body = document.getElementById('set-body');
    if (!body) return;
    if (activeTab === 'stations') renderStations(body);
    else if (activeTab === 'runcards') renderRunCards(body);
    else if (activeTab === 'tactical') renderTactical(body);
    else renderSystem(body);
  }

  // === Tactical tab — demo timing for aircraft + ground vehicles ===
  function renderTactical(body) {
    const settings = FireOpsState.tactical_settings || { aircraft_demo_seconds: 25, ground_demo_seconds: 12 };
    const station = FireOpsApp.getCurrentStation();
    const base = CONFIG.AIRBASES[0];

    const flightInfo = window.FireOpsTactical
      ? FireOpsTactical.getRealFlightTime(station.lat, station.lng, 'at802')
      : { distKm: 0, fullTripMin: 0, aircraftName: 'AT-802F', speed: 250 };

    const realSpeedRatio = (flightInfo.fullTripMin * 60 / settings.aircraft_demo_seconds);

    body.innerHTML = `
      <p style="color: var(--text-dim); margin-bottom: 16px; font-size: 13px; line-height: 1.6;">
        זמני הטיסה והנסיעה בהדגמה מצוינים בשניות. ערכי ברירת המחדל אופטימליים לצפייה.
        בכל מקרה, ה<strong>זמנים הריאליים</strong> מחושבים אוטומטית מהמרחק במפה ומהירות הרכב/מטוס.
      </p>

      <div class="kpi-grid">
        <div class="kpi-card glass">
          <span class="kpi-label">מרחק מבסיס מגידו</span>
          <span class="kpi-value">${flightInfo.distKm.toFixed(1)}<small style="font-size:18px;"> ק"מ</small></span>
          <span class="kpi-trend">${base.name} → ${station.name}</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">זמן טיסה ריאלי</span>
          <span class="kpi-value yellow">${flightInfo.fullTripMin.toFixed(1)}<small style="font-size:18px;"> דק'</small></span>
          <span class="kpi-trend">${flightInfo.aircraftName} · ${flightInfo.speed} קמ"ש · הלוך+צניחה+המשך+חזרה</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">זמן הדגמה נוכחי</span>
          <span class="kpi-value green">${settings.aircraft_demo_seconds}<small style="font-size:18px;"> שניות</small></span>
          <span class="kpi-trend">מהירות הדגמה: x${realSpeedRatio.toFixed(0)}</span>
        </div>
      </div>

      <div class="panel glass" style="margin-bottom: 16px;">
        <h2>זמן טיסה — מטוסי כיבוי</h2>
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 12px;">
          זמן הדגמה למסלול מלא: בסיס מגידו → אירוע → צניחת מים → המשך טיסה → בנק → חזרה לבסיס.
        </p>
        <div class="slider-row">
          <input type="range" min="5" max="120" step="1" value="${settings.aircraft_demo_seconds}" id="set-air-secs" class="slider">
          <input type="number" min="5" max="600" value="${settings.aircraft_demo_seconds}" id="set-air-secs-num" class="form-input slider-num">
          <span class="slider-unit">שניות</span>
        </div>
        <div class="slider-help">
          <button class="btn-ghost" data-preset="air-5">⚡ הדגמה מהירה (5s)</button>
          <button class="btn-ghost" data-preset="air-25">🎮 ברירת מחדל (25s)</button>
          <button class="btn-ghost" data-preset="air-60">🐢 איטי (60s)</button>
          <button class="btn-ghost" data-preset="air-real">📏 ריאלי (${Math.round(flightInfo.fullTripMin * 60)}s)</button>
        </div>
      </div>

      <div class="panel glass">
        <h2>זמן נסיעה — רכבי כיבוי קרקעיים (AVL)</h2>
        <p style="color: var(--text-dim); font-size: 12px; margin-bottom: 12px;">
          זמן הדגמה לכבאית/רכב פיקוד מהתחנה לאירוע. הזמן בריאליסטי בעיר הוא ~5-12 דקות בהתאם לעומס תנועה.
        </p>
        <div class="slider-row">
          <input type="range" min="3" max="60" step="1" value="${settings.ground_demo_seconds}" id="set-ground-secs" class="slider">
          <input type="number" min="3" max="300" value="${settings.ground_demo_seconds}" id="set-ground-secs-num" class="form-input slider-num">
          <span class="slider-unit">שניות</span>
        </div>
        <div class="slider-help">
          <button class="btn-ghost" data-preset="ground-4">⚡ מהיר (4s)</button>
          <button class="btn-ghost" data-preset="ground-12">🎮 ברירת מחדל (12s)</button>
          <button class="btn-ghost" data-preset="ground-30">🐢 איטי (30s)</button>
        </div>
      </div>
    `;

    function syncSliders(rangeId, numId, key) {
      const range = document.getElementById(rangeId);
      const num = document.getElementById(numId);
      function save(v) {
        v = parseInt(v) || parseInt(range.min);
        v = Math.max(parseInt(range.min), Math.min(parseInt(num.max), v));
        range.value = Math.min(parseInt(range.max), v);
        num.value = v;
        FireOpsState.tactical_settings = FireOpsState.tactical_settings || {};
        FireOpsState.tactical_settings[key] = v;
        FireOpsApp.saveState();
      }
      range.addEventListener('input', e => {
        num.value = e.target.value;
        FireOpsState.tactical_settings = FireOpsState.tactical_settings || {};
        FireOpsState.tactical_settings[key] = parseInt(e.target.value);
      });
      range.addEventListener('change', e => save(e.target.value));
      num.addEventListener('change', e => save(e.target.value));
    }
    syncSliders('set-air-secs', 'set-air-secs-num', 'aircraft_demo_seconds');
    syncSliders('set-ground-secs', 'set-ground-secs-num', 'ground_demo_seconds');

    body.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', () => {
        const [kind, val] = btn.dataset.preset.split('-');
        let v = parseInt(val);
        if (val === 'real') v = Math.round(flightInfo.fullTripMin * 60);
        FireOpsState.tactical_settings = FireOpsState.tactical_settings || {};
        const key = kind === 'air' ? 'aircraft_demo_seconds' : 'ground_demo_seconds';
        FireOpsState.tactical_settings[key] = v;
        FireOpsApp.saveState();
        render();
        FireOpsApp.toast(`✓ ${kind === 'air' ? 'זמן טיסה' : 'זמן נסיעה'} עודכן ל-${v}s`, 'success');
      });
    });
  }

  // === Stations tab ===
  function renderStations(body) {
    const stations = FireOpsState.stations || [];
    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h3 style="font-family: var(--font-display); font-size: 14px; letter-spacing: 1.5px; color: var(--text-bright);">${stations.length} תחנות במערכת</h3>
        <button class="btn-primary" id="set-add-station">+ הוסף תחנה</button>
      </div>
      <div class="data-grid">${stations.map(s => `
        <div class="data-card" data-id="${s.id}">
          <div class="card-title">${s.name}</div>
          <div class="card-subtitle">${s.region}</div>
          <div class="card-meta">
            <span class="tag">${s.lat.toFixed(3)}, ${s.lng.toFixed(3)}</span>
            <span class="tag tag-fire">${(FireOpsState.firefighters || []).filter(f => f.station_id === s.id).length} כבאים</span>
            <span class="tag">${(FireOpsState.apparatus || []).filter(a => a.station_id === s.id).length} רכבים</span>
          </div>
        </div>`).join('')}</div>
    `;
    document.getElementById('set-add-station').addEventListener('click', () => openStationModal(null));
    body.querySelectorAll('.data-card').forEach(c => {
      c.addEventListener('click', () => {
        const s = FireOpsState.stations.find(x => x.id === c.dataset.id);
        if (s) openStationModal(s);
      });
    });
  }

  function openStationModal(s) {
    const isNew = !s;
    const data = s || { id: 'station-' + Date.now(), name: '', region: '', lat: 32.0, lng: 35.0 };
    const html = `
      <div class="modal-header"><h2>${isNew ? '➕ תחנה חדשה' : '✏ ' + data.name}</h2></div>
      <div class="modal-body">
        <label class="form-label">שם תחנה</label>
        <input class="form-input" id="m-name" value="${data.name}">
        <label class="form-label">מחוז</label>
        <input class="form-input" id="m-region" value="${data.region}">
        <div class="form-row">
          <div>
            <label class="form-label">קו רוחב (lat)</label>
            <input class="form-input" id="m-lat" type="number" step="0.0001" value="${data.lat}">
          </div>
          <div>
            <label class="form-label">קו אורך (lng)</label>
            <input class="form-input" id="m-lng" type="number" step="0.0001" value="${data.lng}">
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${!isNew && FireOpsState.stations.length > 1 ? '<button class="btn-danger" id="m-delete">🗑 מחיקה</button>' : ''}
        <button class="btn-ghost" id="m-cancel">ביטול</button>
        <button class="btn-primary" id="m-save">${isNew ? 'הוספה' : 'שמירה'}</button>
      </div>
    `;
    FireOpsApp.openModal(html, {
      onMount: () => {
        document.getElementById('m-cancel').addEventListener('click', FireOpsApp.closeModal);
        document.getElementById('m-save').addEventListener('click', () => {
          const updated = {
            ...data,
            name: document.getElementById('m-name').value.trim(),
            region: document.getElementById('m-region').value.trim(),
            lat: parseFloat(document.getElementById('m-lat').value) || 32,
            lng: parseFloat(document.getElementById('m-lng').value) || 35
          };
          if (!updated.name) { FireOpsApp.toast('⚠ נדרש שם תחנה', 'warning'); return; }
          if (isNew) FireOpsState.stations.push(updated);
          else {
            const idx = FireOpsState.stations.findIndex(x => x.id === updated.id);
            FireOpsState.stations[idx] = updated;
          }
          FireOpsApp.saveState();
          FireOpsApp.closeModal();
          FireOpsApp.toast(isNew ? `⚡ ${updated.name} נוסף` : `✓ ${updated.name} נשמר`, 'success');
          render();
          // Refresh station selector at top
          const sel = document.getElementById('station-select');
          sel.innerHTML = FireOpsState.stations.map(st => `<option value="${st.id}" ${st.id === FireOpsApp.getCurrentStationId() ? 'selected' : ''}>${st.name}</option>`).join('');
        });
        const del = document.getElementById('m-delete');
        if (del) del.addEventListener('click', () => {
          if (!confirm(`למחוק את ${data.name}? לא יושפעו רשומות שכבר משוייכות לתחנה.`)) return;
          FireOpsState.stations = FireOpsState.stations.filter(x => x.id !== data.id);
          FireOpsApp.saveState();
          FireOpsApp.closeModal();
          render();
        });
      }
    });
  }

  // === Run Cards tab ===
  function renderRunCards(body) {
    const cards = CONFIG.DEFAULT_RUN_CARDS;
    body.innerHTML = `
      <p style="color: var(--text-dim); margin-bottom: 16px; font-size: 13px;">
        Run Cards מגדירים אילו רכבים מוזנקים אוטומטית לפי שילוב של (סוג אירוע × רמת alarm).
        ב-Phase 6 ניתן יהיה לערוך אותם פר תחנה.
      </p>
      <div class="matrix-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              <th>סוג אירוע</th>
              <th>Alarm 1</th>
              <th>Alarm 2</th>
              <th>Alarm 3</th>
              <th>Alarm 4</th>
            </tr>
          </thead>
          <tbody>
            ${CONFIG.INCIDENT_TYPES.map(t => `
              <tr>
                <td>${t.name_he}<br><small style="color: var(--text-dim); font-family: var(--font-mono);">NFIRS ${t.code}</small></td>
                ${[1,2,3,4].map(lvl => {
                  const key = `${t.code}_${lvl}`;
                  const units = cards[key];
                  return `<td style="text-align: ${units ? 'right' : 'center'}; padding: 8px; ${units ? 'background: rgba(255,69,0,0.04);' : ''}">${units ? units.map(u => `<span class="tag tag-fire" style="margin: 2px;">${CONFIG.getApparatusType(u).name_he}</span>`).join(' ') : '<span style="color: var(--text-dim);">—</span>'}</td>`;
                }).join('')}
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // === System tab ===
  function renderSystem(body) {
    const usage = navigator.storage ? '' : '';
    const stateSize = new Blob([JSON.stringify(FireOpsState)]).size;
    const sizeKb = (stateSize / 1024).toFixed(1);

    body.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card glass">
          <span class="kpi-label">מצב Firebase</span>
          <span class="kpi-value ${FireOpsFirebase.enabled ? 'green' : 'yellow'}" style="font-size: 18px;">${FireOpsFirebase.enabled ? 'מחובר' : 'LOCAL ONLY'}</span>
          <span class="kpi-trend">${FireOpsFirebase.enabled ? 'sync פעיל' : 'ערוך firebase-config.js להפעלה'}</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">גודל State</span>
          <span class="kpi-value">${sizeKb}<small style="font-size: 18px;"> KB</small></span>
          <span class="kpi-trend">LocalStorage</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">גרסה</span>
          <span class="kpi-value" style="font-size: 22px;">Phase 1-9 MVP</span>
          <span class="kpi-trend">2026-05-17</span>
        </div>
      </div>

      <div class="panel glass" style="margin-bottom: 16px;">
        <h2>פעולות מערכת</h2>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 14px;">
          <button class="btn-ghost" id="sys-reseed" style="text-align: right; padding: 12px 16px;">🔄 איפוס לנתוני דמו</button>
          <button class="btn-danger" id="sys-clear" style="text-align: right; padding: 12px 16px;">🗑 מחיקת כל הנתונים</button>
          <button class="btn-ghost" id="sys-logout" style="text-align: right; padding: 12px 16px;">🚪 יציאה מהמערכת</button>
        </div>
      </div>

      <div class="panel glass">
        <h2>מידע טכני</h2>
        <div class="stat-row"><span class="stat-label">Stack</span><span class="stat-value">Vanilla JS · No build · PWA</span></div>
        <div class="stat-row"><span class="stat-label">Map provider</span><span class="stat-value">Leaflet + CartoDB Dark</span></div>
        <div class="stat-row"><span class="stat-label">UA</span><span class="stat-value" style="font-size: 11px; max-width: 60%;">${navigator.userAgent.slice(0, 60)}...</span></div>
        <div class="stat-row"><span class="stat-label">Repo</span><span class="stat-value">github.com/elchai/fireops</span></div>
      </div>
    `;

    document.getElementById('sys-reseed').addEventListener('click', () => {
      if (!confirm('לאפס את כל הנתונים ולהחזיר לנתוני דמו?')) return;
      ['incidents','units','firefighters','apparatus','shifts','equipment','trainings','op_log'].forEach(k => FireOpsState[k] = []);
      FireOpsApp.saveState();
      FireOpsApp.toast('🔄 הנתונים אופסו · רענן לטעינה מחדש של דמו', 'warning');
      setTimeout(() => location.reload(), 1500);
    });

    document.getElementById('sys-clear').addEventListener('click', () => {
      if (!confirm('למחוק את כל הנתונים והגדרות? פעולה לא הפיכה.')) return;
      localStorage.removeItem(CONFIG.STORAGE_KEY);
      localStorage.removeItem(CONFIG.AUTH_KEY);
      localStorage.removeItem(CONFIG.SETTINGS_KEY);
      FireOpsApp.toast('🗑 הכל נמחק · מרענן', 'warning');
      setTimeout(() => location.reload(), 1500);
    });

    document.getElementById('sys-logout').addEventListener('click', () => {
      localStorage.removeItem(CONFIG.AUTH_KEY);
      location.reload();
    });
  }

  function onStationChange() { if (activeTab === 'stations') render(); }

  return { init, render, onStationChange };
})();
