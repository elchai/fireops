/* ============================================================
   FireOps — Equipment Module
   Per-apparatus items + daily check flow with status indicators
   ============================================================ */

window.FireOpsEquipment = (function() {

  let initialized = false;
  let filterApp = 'all';
  let filterStatus = 'all';

  function init() {
    if (!FireOpsState.equipment || FireOpsState.equipment.length === 0) {
      seedDemo();
    }
    if (!initialized) {
      initialized = true;
      buildShell();
    }
    render();
  }

  function seedDemo() {
    const apps = FireOpsState.apparatus || [];
    if (apps.length === 0) return;
    const items = [];
    const types = [
      { name: 'מסכת SCBA', test_days: 30 },
      { name: 'צילינדר אוויר', test_days: 30 },
      { name: 'צינור 2.5"', test_days: 365 },
      { name: 'צינור 1.5"', test_days: 365 },
      { name: 'סולם מתכת 3.5m', test_days: 365 },
      { name: 'גרזן כיבוי', test_days: 90 },
      { name: 'מסור כוח', test_days: 30 },
      { name: 'AED + ערכת החייאה', test_days: 30 },
      { name: 'מטף 9kg', test_days: 90 },
      { name: 'ערכת חילוץ הידראולית', test_days: 90 }
    ];
    apps.slice(0, 4).forEach(a => {
      types.slice(0, 6 + Math.floor(Math.random()*4)).forEach((t, i) => {
        const d = new Date();
        d.setDate(d.getDate() - Math.floor(Math.random() * 30));
        const status = Math.random() < 0.85 ? 'ok' : (Math.random() < 0.5 ? 'check_due' : 'failed');
        items.push({
          id: FireOpsApp.uid('eq'),
          apparatus_id: a.id,
          name: t.name,
          serial: 'SN-' + Math.floor(Math.random()*900000+100000),
          compartment: ['L1','L2','L3','R1','R2','R3'][i % 6],
          last_check: d.toISOString().slice(0,10),
          test_interval_days: t.test_days,
          status
        });
      });
    });
    FireOpsState.equipment = items;
    FireOpsApp.saveState();
  }

  function buildShell() {
    const page = document.getElementById('page-equipment');
    page.innerHTML = `
      <div class="module-page glass">
        <div class="module-header">
          <span class="module-icon">🛠️</span>
          <div>
            ניהול ציוד
            <div class="subtitle" id="eq-subtitle">--</div>
          </div>
          <div class="actions">
            <button class="btn-ghost" id="eq-check-all">✓ בדיקה יומית למסך</button>
            <button class="btn-primary" id="eq-add">+ הוסף פריט</button>
          </div>
        </div>
        <div class="module-toolbar">
          <select class="filter-select" id="eq-filter-app">
            <option value="all">כל הרכבים</option>
          </select>
          <select class="filter-select" id="eq-filter-status">
            <option value="all">כל הסטטוסים</option>
            <option value="ok">תקין</option>
            <option value="check_due">בדיקה דחופה</option>
            <option value="failed">לא תקין</option>
          </select>
        </div>
        <div class="module-body" id="eq-list"></div>
      </div>
    `;
    document.getElementById('eq-filter-app').addEventListener('change', e => { filterApp = e.target.value; render(); });
    document.getElementById('eq-filter-status').addEventListener('change', e => { filterStatus = e.target.value; render(); });
    document.getElementById('eq-add').addEventListener('click', () => openEditModal(null));
    document.getElementById('eq-check-all').addEventListener('click', runDailyCheckAll);
  }

  function populateAppFilter() {
    const sel = document.getElementById('eq-filter-app');
    if (!sel) return;
    const sid = FireOpsApp.getCurrentStation()?.id;
    const apps = (FireOpsState.apparatus || []).filter(a => a.station_id === sid);
    sel.innerHTML = '<option value="all">כל הרכבים</option>' + apps.map(a => `<option value="${a.id}" ${filterApp===a.id?'selected':''}>${a.callsign}</option>`).join('');
  }

  function isItemVisible(item) {
    const sid = FireOpsApp.getCurrentStation()?.id;
    const app = FireOpsState.apparatus.find(a => a.id === item.apparatus_id);
    if (!app || app.station_id !== sid) return false;
    if (filterApp !== 'all' && item.apparatus_id !== filterApp) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    return true;
  }

  function checkDue(item) {
    if (item.status === 'failed') return true;
    const last = new Date(item.last_check);
    const days = Math.floor((Date.now() - last.getTime()) / (1000*60*60*24));
    return days > (item.test_interval_days || 30);
  }

  function statusTag(item) {
    if (item.status === 'failed') return '<span class="tag tag-red">לא תקין</span>';
    if (checkDue(item)) return '<span class="tag tag-yellow">בדיקה דחופה</span>';
    return '<span class="tag tag-green">תקין</span>';
  }

  function render() {
    populateAppFilter();
    const list = document.getElementById('eq-list');
    if (!list) return;
    const items = (FireOpsState.equipment || []).filter(isItemVisible);
    const sub = document.getElementById('eq-subtitle');
    const dueCount = items.filter(i => i.status === 'failed' || checkDue(i)).length;
    if (sub) sub.textContent = `${items.length} פריטים · ${dueCount} בדחיפות`;

    if (items.length === 0) {
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">🛠️</span><div class="empty-title">אין ציוד מוזן</div></div>`;
      return;
    }

    // Group by apparatus
    const grouped = {};
    items.forEach(i => { (grouped[i.apparatus_id] = grouped[i.apparatus_id] || []).push(i); });
    list.innerHTML = Object.entries(grouped).map(([appId, eqs]) => {
      const a = FireOpsState.apparatus.find(x => x.id === appId);
      return `
        <div style="margin-bottom: 22px;">
          <h3 style="font-family: var(--font-display); font-size: 16px; letter-spacing: 1.5px; color: var(--fire-glow); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between;">
            <span>🚒 ${a?.callsign || '--'} <span style="font-size: 12px; color: var(--text-dim); margin-right: 8px;">${CONFIG.getApparatusType(a?.type).name_he}</span></span>
            <button class="btn-ghost btn-check-rig" data-app-id="${appId}">✓ בדיקה יומית</button>
          </h3>
          <div class="data-grid">${eqs.map(item => `
            <div class="data-card" data-id="${item.id}">
              <div class="card-title"><span>${item.name}</span>${statusTag(item)}</div>
              <div class="card-subtitle">${item.serial} · ${item.compartment}</div>
              <div class="card-subtitle" style="margin-top: 6px;">בדיקה אחרונה: ${item.last_check}</div>
            </div>`).join('')}</div>
        </div>`;
    }).join('');

    list.querySelectorAll('.data-card').forEach(card => {
      card.addEventListener('click', () => {
        const item = FireOpsState.equipment.find(x => x.id === card.dataset.id);
        if (item) openEditModal(item);
      });
    });
    list.querySelectorAll('.btn-check-rig').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        runDailyCheck(btn.dataset.appId);
      });
    });
  }

  function runDailyCheck(appId) {
    const a = FireOpsState.apparatus.find(x => x.id === appId);
    const items = FireOpsState.equipment.filter(i => i.apparatus_id === appId);
    const today = new Date().toISOString().slice(0,10);
    items.forEach(item => {
      if (item.status !== 'failed') item.last_check = today;
    });
    FireOpsApp.saveState();
    FireOpsApp.logEvent('equipment', 4, `בדיקה יומית ל-${a?.callsign}: ${items.length} פריטים סומנו תקינים (${FireOpsApp.getCurrentUser()?.name || 'system'})`);
    FireOpsApp.toast(`✓ בדיקה יומית ל-${a?.callsign} הושלמה`, 'success');
    render();
  }

  function runDailyCheckAll() {
    const sid = FireOpsApp.getCurrentStation()?.id;
    const apps = (FireOpsState.apparatus || []).filter(a => a.station_id === sid && a.status !== 'oos');
    apps.forEach(a => runDailyCheck(a.id));
  }

  function openEditModal(item) {
    const isNew = !item;
    const sid = FireOpsApp.getCurrentStation()?.id;
    const apps = (FireOpsState.apparatus || []).filter(a => a.station_id === sid);
    const data = item || { id: FireOpsApp.uid('eq'), apparatus_id: apps[0]?.id, name: '', serial: '', compartment: 'L1', status: 'ok', last_check: new Date().toISOString().slice(0,10), test_interval_days: 30 };

    const html = `
      <div class="modal-header">
        <h2>${isNew ? '➕ פריט ציוד חדש' : '✏ ' + data.name}</h2>
      </div>
      <div class="modal-body">
        <label class="form-label">שם פריט</label>
        <input class="form-input" id="m-name" value="${data.name}" placeholder="לדוגמה: מסכת SCBA">
        <div class="form-row">
          <div>
            <label class="form-label">רכב</label>
            <select class="form-input" id="m-app">
              ${apps.map(a => `<option value="${a.id}" ${data.apparatus_id===a.id?'selected':''}>${a.callsign}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">תא</label>
            <select class="form-input" id="m-compartment">
              ${['L1','L2','L3','R1','R2','R3','גג','אחורי'].map(c => `<option value="${c}" ${data.compartment===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div>
            <label class="form-label">מספר סידורי</label>
            <input class="form-input" id="m-serial" value="${data.serial}">
          </div>
          <div>
            <label class="form-label">סטטוס</label>
            <select class="form-input" id="m-status">
              <option value="ok" ${data.status==='ok'?'selected':''}>תקין</option>
              <option value="check_due" ${data.status==='check_due'?'selected':''}>בדיקה דחופה</option>
              <option value="failed" ${data.status==='failed'?'selected':''}>לא תקין</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div>
            <label class="form-label">בדיקה אחרונה</label>
            <input class="form-input" id="m-last_check" type="date" value="${data.last_check}">
          </div>
          <div>
            <label class="form-label">תדירות בדיקה (ימים)</label>
            <input class="form-input" id="m-interval" type="number" min="1" max="365" value="${data.test_interval_days || 30}">
          </div>
        </div>
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
            name: document.getElementById('m-name').value.trim(),
            apparatus_id: document.getElementById('m-app').value,
            compartment: document.getElementById('m-compartment').value,
            serial: document.getElementById('m-serial').value.trim(),
            status: document.getElementById('m-status').value,
            last_check: document.getElementById('m-last_check').value,
            test_interval_days: parseInt(document.getElementById('m-interval').value) || 30
          };
          if (!updated.name) { FireOpsApp.toast('⚠ נדרש שם פריט', 'warning'); return; }
          if (isNew) {
            FireOpsState.equipment.push(updated);
          } else {
            const idx = FireOpsState.equipment.findIndex(x => x.id === updated.id);
            FireOpsState.equipment[idx] = updated;
          }
          FireOpsApp.saveState();
          FireOpsApp.closeModal();
          FireOpsApp.toast(isNew ? `⚡ ${updated.name} נוסף` : `✓ ${updated.name} נשמר`, 'success');
          render();
        });
        const del = document.getElementById('m-delete');
        if (del) del.addEventListener('click', () => {
          if (!confirm(`למחוק את ${data.name}?`)) return;
          FireOpsState.equipment = FireOpsState.equipment.filter(x => x.id !== data.id);
          FireOpsApp.saveState();
          FireOpsApp.closeModal();
          FireOpsApp.toast(`🗑 ${data.name} נמחק`, 'warning');
          render();
        });
      }
    });
  }

  function onStationChange() { render(); }

  return { init, render, onStationChange };
})();
