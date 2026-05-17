/* ============================================================
   FireOps — Scheduling Module
   Weekly grid: day × apparatus × positions
   Click position to assign firefighter
   ============================================================ */

window.FireOpsScheduling = (function() {

  let initialized = false;
  let weekStart = startOfWeek(new Date());

  const DAYS_HE = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
  const POSITIONS = [
    { key: 'officer', name_he: 'קצין' },
    { key: 'driver',  name_he: 'נהג' },
    { key: 'ff1',     name_he: 'כבאי 1' },
    { key: 'ff2',     name_he: 'כבאי 2' },
    { key: 'ff3',     name_he: 'כבאי 3' },
    { key: 'ff4',     name_he: 'כבאי 4' }
  ];

  function init() {
    if (!initialized) {
      initialized = true;
      buildShell();
    }
    render();
  }

  function startOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay(); // 0 = Sunday
    date.setDate(date.getDate() - day);
    date.setHours(0,0,0,0);
    return date;
  }

  function addDays(d, n) {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  function ymd(d) { return d.toISOString().slice(0,10); }

  function buildShell() {
    const page = document.getElementById('page-scheduling');
    page.innerHTML = `
      <div class="module-page glass">
        <div class="module-header">
          <span class="module-icon">📅</span>
          <div>
            שיבוץ למשמרות
            <div class="subtitle" id="sch-subtitle">--</div>
          </div>
          <div class="actions">
            <button class="btn-ghost" id="sch-prev">‹ שבוע קודם</button>
            <button class="btn-ghost" id="sch-today">היום</button>
            <button class="btn-ghost" id="sch-next">שבוע הבא ›</button>
          </div>
        </div>
        <div class="module-body" id="sch-grid"></div>
      </div>
    `;
    document.getElementById('sch-prev').addEventListener('click', () => { weekStart = addDays(weekStart, -7); render(); });
    document.getElementById('sch-next').addEventListener('click', () => { weekStart = addDays(weekStart, 7); render(); });
    document.getElementById('sch-today').addEventListener('click', () => { weekStart = startOfWeek(new Date()); render(); });
  }

  function getApparatus() {
    const sid = FireOpsApp.getCurrentStation()?.id;
    return (FireOpsState.apparatus || []).filter(a => a.station_id === sid && a.status !== 'oos');
  }

  function getFirefighters() {
    const sid = FireOpsApp.getCurrentStation()?.id;
    return (FireOpsState.firefighters || []).filter(f => f.station_id === sid && f.status !== 'inactive');
  }

  function getShift(date, apparatusId) {
    return (FireOpsState.shifts || []).find(s => s.date === date && s.apparatus_id === apparatusId);
  }

  function assignPosition(date, apparatusId, posKey, firefighterId) {
    FireOpsState.shifts = FireOpsState.shifts || [];
    let shift = getShift(date, apparatusId);
    if (!shift) {
      shift = { id: FireOpsApp.uid('shift'), date, apparatus_id: apparatusId, station_id: FireOpsApp.getCurrentStationId(), positions: {} };
      FireOpsState.shifts.push(shift);
    }
    shift.positions[posKey] = firefighterId || null;
    FireOpsApp.saveState();
    FireOpsApp.logEvent('personnel', 4, `שיבוץ עודכן: ${date} · ${apparatusId} · ${posKey}`);
  }

  function render() {
    const grid = document.getElementById('sch-grid');
    if (!grid) return;
    const apparatuses = getApparatus();
    const sub = document.getElementById('sch-subtitle');
    const weekEnd = addDays(weekStart, 6);
    if (sub) sub.textContent = `${ymd(weekStart)} → ${ymd(weekEnd)} · ${apparatuses.length} רכבים פעילים`;

    if (apparatuses.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🚒</span>
          <div class="empty-title">אין רכבים פעילים בתחנה</div>
          <div>צריך להוסיף רכבים תחת מודול "צי רכבים"</div>
        </div>`;
      return;
    }

    grid.innerHTML = `<div class="schedule-grid">${[0,1,2,3,4,5,6].map(offset => {
      const d = addDays(weekStart, offset);
      const dateStr = ymd(d);
      const isToday = ymd(new Date()) === dateStr;
      return `
        <div class="schedule-day" style="${isToday ? 'border-color: var(--fire); box-shadow: 0 0 16px rgba(255,69,0,0.2);' : ''}">
          <div class="day-header">
            <div>
              <span class="day-name">${DAYS_HE[d.getDay()]}</span>
              ${isToday ? '<span class="tag tag-fire" style="margin-right: 8px;">היום</span>' : ''}
            </div>
            <span class="day-date">${dateStr}</span>
          </div>
          <div class="schedule-apparatus">
            ${apparatuses.map(a => {
              const shift = getShift(dateStr, a.id);
              const positions = shift?.positions || {};
              const filled = Object.values(positions).filter(Boolean).length;
              const required = CONFIG.getApparatusType(a.type).min_staffing;
              return `
                <div class="schedule-rig" data-date="${dateStr}" data-app-id="${a.id}">
                  <div class="rig-header">
                    <span>${a.callsign}</span>
                    <span class="tag ${filled >= required ? 'tag-green' : 'tag-red'}">${filled}/${required}</span>
                  </div>
                  ${POSITIONS.slice(0, Math.max(required, 2)).map(p => {
                    const ffId = positions[p.key];
                    const ff = ffId ? FireOpsState.firefighters.find(f => f.id === ffId) : null;
                    return `
                      <div class="position-row" data-pos="${p.key}">
                        <span class="position-label">${p.name_he}</span>
                        <span class="position-firefighter ${ff ? '' : 'empty'}">${ff ? ff.name : '— לא משובץ —'}</span>
                      </div>`;
                  }).join('')}
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }).join('')}</div>`;

    grid.querySelectorAll('.position-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const rig = row.closest('.schedule-rig');
        openAssignModal(rig.dataset.date, rig.dataset.appId, row.dataset.pos);
      });
    });
  }

  function openAssignModal(date, appId, posKey) {
    const app = FireOpsState.apparatus.find(a => a.id === appId);
    const pos = POSITIONS.find(p => p.key === posKey);
    const ffs = getFirefighters();
    const shift = getShift(date, appId);
    const currentId = shift?.positions?.[posKey] || '';

    const html = `
      <div class="modal-header">
        <h2>שיבוץ</h2>
        <p>${app.callsign} · ${pos.name_he} · ${date}</p>
      </div>
      <div class="modal-body">
        <label class="form-label">בחר כבאי</label>
        <select class="form-input" id="m-ff" size="${Math.min(10, ffs.length + 1)}" style="height: auto;">
          <option value="">— לא משובץ —</option>
          ${ffs.map(f => `<option value="${f.id}" ${f.id===currentId?'selected':''}>${f.name} · ${f.rank} · קב' ${f.shift_group}</option>`).join('')}
        </select>
      </div>
      <div class="modal-footer">
        <button class="btn-ghost" id="m-cancel">ביטול</button>
        <button class="btn-primary" id="m-save">שמור</button>
      </div>
    `;

    FireOpsApp.openModal(html, {
      onMount: () => {
        document.getElementById('m-cancel').addEventListener('click', FireOpsApp.closeModal);
        document.getElementById('m-save').addEventListener('click', () => {
          const ffId = document.getElementById('m-ff').value;
          assignPosition(date, appId, posKey, ffId);
          FireOpsApp.closeModal();
          FireOpsApp.toast('✓ שיבוץ עודכן', 'success');
          render();
        });
      }
    });
  }

  function onStationChange() { render(); }

  return { init, render, onStationChange };
})();
