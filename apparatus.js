/* ============================================================
   FireOps — Apparatus Module
   Per-station fleet: callsign, type, status, min staffing
   ============================================================ */

window.FireOpsApparatus = (function() {

  let initialized = false;
  let filterType = 'all';

  function init() {
    if (!FireOpsState.apparatus || FireOpsState.apparatus.length === 0) {
      seedDemo();
    }
    if (!initialized) {
      initialized = true;
      buildShell();
    }
    render();
  }

  function seedDemo() {
    const sid = 'haifa-central';
    FireOpsState.apparatus = [
      { id: FireOpsApp.uid('app'), station_id: sid, callsign: 'כב-1', type: 'engine',  status: 'dispatched', notes: 'Pierce Saber',          year: 2019, last_check: '2026-05-16' },
      { id: FireOpsApp.uid('app'), station_id: sid, callsign: 'כב-2', type: 'engine',  status: 'available',  notes: 'Volvo FL',              year: 2021, last_check: '2026-05-17' },
      { id: FireOpsApp.uid('app'), station_id: sid, callsign: 'כב-3', type: 'engine',  status: 'onscene',    notes: 'Pierce Saber',          year: 2018, last_check: '2026-05-15' },
      { id: FireOpsApp.uid('app'), station_id: sid, callsign: 'כב-4', type: 'engine',  status: 'oos',        notes: 'בתחזוקה — מנוע',         year: 2015, last_check: '2026-05-10' },
      { id: FireOpsApp.uid('app'), station_id: sid, callsign: 'סול-2', type: 'ladder', status: 'dispatched', notes: 'Magirus M32L 32m',      year: 2020, last_check: '2026-05-17' },
      { id: FireOpsApp.uid('app'), station_id: sid, callsign: 'חיל-1', type: 'rescue', status: 'dispatched', notes: 'מצויד בערכת חילוץ כבד', year: 2022, last_check: '2026-05-16' },
      { id: FireOpsApp.uid('app'), station_id: sid, callsign: 'פיק-1', type: 'command', status: 'available', notes: 'רכב פיקוד מבצעי',        year: 2023, last_check: '2026-05-17' },
      { id: FireOpsApp.uid('app'), station_id: sid, callsign: 'מכ-1',  type: 'tanker', status: 'available',  notes: 'מכלית 12,000 ליטר',     year: 2017, last_check: '2026-05-14' }
    ];
    FireOpsApp.saveState();
  }

  function buildShell() {
    const page = document.getElementById('page-apparatus');
    page.innerHTML = `
      <div class="module-page glass">
        <div class="module-header">
          <span class="module-icon">🚒</span>
          <div>
            צי רכבים
            <div class="subtitle" id="app-subtitle">--</div>
          </div>
          <div class="actions">
            <button class="btn-primary" id="app-add">+ הוסף רכב</button>
          </div>
        </div>
        <div class="module-toolbar">
          <select class="filter-select" id="app-filter-type">
            <option value="all">כל הסוגים</option>
            ${CONFIG.APPARATUS_TYPES.map(t => `<option value="${t.key}">${t.name_he}</option>`).join('')}
          </select>
        </div>
        <div class="module-body" id="app-list"></div>
      </div>
    `;
    document.getElementById('app-filter-type').addEventListener('change', e => { filterType = e.target.value; render(); });
    document.getElementById('app-add').addEventListener('click', () => openEditModal(null));
  }

  function getVisible() {
    const sid = FireOpsApp.getCurrentStation()?.id;
    return (FireOpsState.apparatus || []).filter(a => {
      if (sid && a.station_id !== sid) return false;
      if (filterType !== 'all' && a.type !== filterType) return false;
      return true;
    });
  }

  function render() {
    const list = document.getElementById('app-list');
    if (!list) return;
    const items = getVisible();
    const sub = document.getElementById('app-subtitle');
    if (sub) sub.textContent = `${items.length} רכבים · ${items.filter(a=>a.status==='available').length} זמינים · ${items.filter(a=>a.status==='oos').length} מחוץ לשירות`;

    if (items.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🚒</span>
          <div class="empty-title">אין רכבים בתחנה</div>
          <div>הוסף רכב ראשון כדי להתחיל</div>
        </div>`;
      return;
    }

    const statusText = { available: '🟢 זמין', dispatched: '🟡 בהזנקה', onscene: '🔴 בשטח', oos: '⚪ מחוץ לשירות' };
    list.innerHTML = `<div class="apparatus-grid">${items.map(a => {
      const t = CONFIG.getApparatusType(a.type);
      return `
        <div class="apparatus-card status-${a.status}" data-id="${a.id}">
          <div class="big-callsign">${a.callsign}</div>
          <div class="type-label">${t.name_he}</div>
          <div class="status-text">${statusText[a.status] || a.status}</div>
          <div class="min-staff">איוש מינ' ${t.min_staffing} · ${a.year || '--'}</div>
          ${a.notes ? `<div class="card-subtitle" style="margin-top:8px;">${a.notes}</div>` : ''}
        </div>`;
    }).join('')}</div>`;

    list.querySelectorAll('.apparatus-card').forEach(card => {
      card.addEventListener('click', () => {
        const a = FireOpsState.apparatus.find(x => x.id === card.dataset.id);
        if (a) openEditModal(a);
      });
    });
  }

  function openEditModal(app) {
    const isNew = !app;
    const sid = FireOpsApp.getCurrentStation()?.id;
    const data = app || { id: FireOpsApp.uid('app'), station_id: sid, callsign: '', type: 'engine', status: 'available', notes: '', year: new Date().getFullYear(), last_check: new Date().toISOString().slice(0,10) };

    const html = `
      <div class="modal-header">
        <h2>${isNew ? '➕ רכב חדש' : '✏ ' + data.callsign}</h2>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div>
            <label class="form-label">Callsign</label>
            <input class="form-input" id="m-callsign" value="${data.callsign}" placeholder="לדוגמה: כב-1">
          </div>
          <div>
            <label class="form-label">סוג</label>
            <select class="form-input" id="m-type">
              ${CONFIG.APPARATUS_TYPES.map(t => `<option value="${t.key}" ${data.type===t.key?'selected':''}>${t.name_he}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div>
            <label class="form-label">סטטוס</label>
            <select class="form-input" id="m-status">
              <option value="available" ${data.status==='available'?'selected':''}>זמין</option>
              <option value="dispatched" ${data.status==='dispatched'?'selected':''}>בהזנקה</option>
              <option value="onscene" ${data.status==='onscene'?'selected':''}>בשטח</option>
              <option value="oos" ${data.status==='oos'?'selected':''}>מחוץ לשירות</option>
            </select>
          </div>
          <div>
            <label class="form-label">שנת ייצור</label>
            <input class="form-input" id="m-year" type="number" min="1980" max="2030" value="${data.year || ''}">
          </div>
        </div>
        <label class="form-label">בדיקה אחרונה</label>
        <input class="form-input" id="m-last_check" type="date" value="${data.last_check || ''}">
        <label class="form-label">הערות</label>
        <textarea class="form-input" id="m-notes" placeholder="דגם / חברה / נקודות מיוחדות...">${data.notes || ''}</textarea>
      </div>
      <div class="modal-footer">
        ${!isNew ? '<button class="btn-danger" id="m-delete">🗑 מחיקה</button>' : ''}
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
            callsign: document.getElementById('m-callsign').value.trim(),
            type: document.getElementById('m-type').value,
            status: document.getElementById('m-status').value,
            year: parseInt(document.getElementById('m-year').value) || null,
            last_check: document.getElementById('m-last_check').value,
            notes: document.getElementById('m-notes').value.trim()
          };
          if (!updated.callsign) { FireOpsApp.toast('⚠ נדרש callsign', 'warning'); return; }
          if (isNew) {
            FireOpsState.apparatus.push(updated);
            FireOpsApp.logEvent('equipment', 4, `נוסף רכב חדש: ${updated.callsign}`);
          } else {
            const idx = FireOpsState.apparatus.findIndex(x => x.id === updated.id);
            FireOpsState.apparatus[idx] = updated;
            FireOpsApp.logEvent('equipment', 4, `עודכן רכב: ${updated.callsign} (סטטוס: ${updated.status})`);
          }
          FireOpsApp.saveState();
          FireOpsApp.closeModal();
          FireOpsApp.toast(isNew ? `⚡ ${updated.callsign} נוסף` : `✓ ${updated.callsign} נשמר`, 'success');
          render();
        });
        const del = document.getElementById('m-delete');
        if (del) del.addEventListener('click', () => {
          if (!confirm(`למחוק את ${data.callsign}?`)) return;
          FireOpsState.apparatus = FireOpsState.apparatus.filter(x => x.id !== data.id);
          FireOpsApp.saveState();
          FireOpsApp.logEvent('equipment', 3, `נמחק רכב: ${data.callsign}`);
          FireOpsApp.closeModal();
          FireOpsApp.toast(`🗑 ${data.callsign} נמחק`, 'warning');
          render();
        });
      }
    });
  }

  function onStationChange() { render(); }

  return { init, render, onStationChange };
})();
