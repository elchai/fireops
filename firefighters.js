/* ============================================================
   FireOps — Firefighters Module
   Roster CRUD per station: name, rank, role, certs count, contact
   ============================================================ */

window.FireOpsFirefighters = (function() {

  let initialized = false;
  let searchTerm = '';
  let filterRole = 'all';
  let filterStatus = 'all';

  function init() {
    if (!FireOpsState.firefighters || FireOpsState.firefighters.length === 0) {
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
    FireOpsState.firefighters = [
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'דוד כהן',     personalId: '0123456', rank: 'מפקד תחנה', role: 'station_chief',     shift_group: 'A', phone: '050-1112233', status: 'active',   isVolunteer: false, joined: '2014-03-10' },
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'יואב לוי',     personalId: '0234567', rank: 'קצין משמרת', role: 'shift_officer',    shift_group: 'A', phone: '052-1234567', status: 'active',   isVolunteer: false, joined: '2016-07-22' },
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'רן אבן',      personalId: '0345678', rank: 'נהג-מפעיל', role: 'firefighter',      shift_group: 'A', phone: '054-2345678', status: 'active',   isVolunteer: false, joined: '2018-01-15' },
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'איתי שמש',     personalId: '0456789', rank: 'כבאי',     role: 'firefighter',      shift_group: 'B', phone: '050-3456789', status: 'active',   isVolunteer: false, joined: '2019-09-04' },
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'מאור גרשון',  personalId: '0567890', rank: 'כבאי',     role: 'firefighter',      shift_group: 'B', phone: '053-4567890', status: 'active',   isVolunteer: false, joined: '2020-05-12' },
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'נדב פרידמן',  personalId: '0678901', rank: 'כבאי',     role: 'equipment_manager', shift_group: 'C', phone: '054-5678901', status: 'active',   isVolunteer: false, joined: '2017-11-30' },
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'עומר רגב',     personalId: '0789012', rank: 'כבאי',     role: 'firefighter',      shift_group: 'C', phone: '052-6789012', status: 'training', isVolunteer: false, joined: '2024-02-18' },
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'תומר אברהם',   personalId: '0890123', rank: 'מוקדן',    role: 'dispatcher',       shift_group: 'A', phone: '050-7890123', status: 'active',   isVolunteer: false, joined: '2021-08-05' },
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'אורי לב',      personalId: '0901234', rank: 'מתנדב',    role: 'volunteer',        shift_group: '—', phone: '054-8901234', status: 'active',   isVolunteer: true,  joined: '2022-04-20' },
      { id: FireOpsApp.uid('ff'), station_id: sid, name: 'בן אדלר',      personalId: '1012345', rank: 'מתנדב',    role: 'volunteer',        shift_group: '—', phone: '053-9012345', status: 'leave',    isVolunteer: true,  joined: '2023-06-11' },
      { id: FireOpsApp.uid('ff'), station_id: 'haifa-krayot', name: 'אסף יוסף', personalId: '1123456', rank: 'מפקד תחנה', role: 'station_chief', shift_group: 'A', phone: '050-0011223', status: 'active', isVolunteer: false, joined: '2013-09-18' },
      { id: FireOpsApp.uid('ff'), station_id: 'haifa-krayot', name: 'שלום מזרחי', personalId: '1234567', rank: 'כבאי', role: 'firefighter', shift_group: 'B', phone: '052-3344556', status: 'active', isVolunteer: false, joined: '2019-12-03' }
    ];
    FireOpsApp.saveState();
  }

  function buildShell() {
    const page = document.getElementById('page-firefighters');
    page.innerHTML = `
      <div class="module-page glass">
        <div class="module-header">
          <span class="module-icon">👨‍🚒</span>
          <div>
            כבאים
            <div class="subtitle" id="ff-subtitle">--</div>
          </div>
          <div class="actions">
            <button class="btn-primary" id="ff-add">+ הוסף כבאי</button>
          </div>
        </div>
        <div class="module-toolbar">
          <input type="text" class="search-input" id="ff-search" placeholder="חיפוש לפי שם / מ.א. / טלפון...">
          <select class="filter-select" id="ff-filter-role">
            <option value="all">כל התפקידים</option>
          </select>
          <select class="filter-select" id="ff-filter-status">
            <option value="all">כל הסטטוסים</option>
            <option value="active">פעיל</option>
            <option value="training">בהכשרה</option>
            <option value="leave">בחופש</option>
            <option value="inactive">לא פעיל</option>
          </select>
        </div>
        <div class="module-body" id="ff-list"></div>
      </div>
    `;
    // populate role filter
    const roleSel = document.getElementById('ff-filter-role');
    Object.entries(CONFIG.ROLES).forEach(([k, v]) => {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = v.name_he;
      roleSel.appendChild(opt);
    });

    document.getElementById('ff-search').addEventListener('input', e => { searchTerm = e.target.value.toLowerCase(); render(); });
    document.getElementById('ff-filter-role').addEventListener('change', e => { filterRole = e.target.value; render(); });
    document.getElementById('ff-filter-status').addEventListener('change', e => { filterStatus = e.target.value; render(); });
    document.getElementById('ff-add').addEventListener('click', () => openEditModal(null));
  }

  function getVisible() {
    const sid = FireOpsApp.getCurrentStation()?.id;
    return (FireOpsState.firefighters || []).filter(f => {
      if (sid && f.station_id !== sid) return false;
      if (filterRole !== 'all' && f.role !== filterRole) return false;
      if (filterStatus !== 'all' && f.status !== filterStatus) return false;
      if (searchTerm) {
        const hay = `${f.name} ${f.personalId} ${f.phone} ${f.rank}`.toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });
  }

  function statusTag(status) {
    const map = {
      active:   { txt: 'פעיל',     cls: 'tag-green' },
      training: { txt: 'בהכשרה',   cls: 'tag-yellow' },
      leave:    { txt: 'בחופש',    cls: 'tag-dim' },
      inactive: { txt: 'לא פעיל',  cls: 'tag-red' }
    };
    const s = map[status] || map.active;
    return `<span class="tag ${s.cls}">${s.txt}</span>`;
  }

  function render() {
    const list = document.getElementById('ff-list');
    if (!list) return;
    const items = getVisible();
    const sub = document.getElementById('ff-subtitle');
    if (sub) sub.textContent = `${items.length} מתוך ${FireOpsState.firefighters.length} · תחנה: ${FireOpsApp.getCurrentStation()?.name || '--'}`;

    if (items.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">👨‍🚒</span>
          <div class="empty-title">אין כבאים</div>
          <div>נסה לשנות פילטרים או להוסיף כבאי חדש</div>
        </div>`;
      return;
    }

    list.innerHTML = `<div class="data-grid">${items.map(f => `
      <div class="data-card" data-id="${f.id}">
        <div class="card-title">
          <span>${f.name}</span>
          ${statusTag(f.status)}
        </div>
        <div class="card-subtitle">${f.rank} · ${CONFIG.getRole(f.role).name_he}</div>
        <div class="card-meta">
          <span class="tag">מ.א ${f.personalId}</span>
          <span class="tag tag-fire">קב' ${f.shift_group}</span>
          ${f.isVolunteer ? '<span class="tag tag-yellow">מתנדב</span>' : ''}
        </div>
        <div class="card-subtitle" style="margin-top: 10px;">📞 ${f.phone}</div>
      </div>`).join('')}</div>`;

    list.querySelectorAll('.data-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const ff = FireOpsState.firefighters.find(x => x.id === id);
        if (ff) openEditModal(ff);
      });
    });
  }

  function openEditModal(ff) {
    const isNew = !ff;
    const sid = FireOpsApp.getCurrentStation()?.id;
    const data = ff || { id: FireOpsApp.uid('ff'), station_id: sid, name: '', personalId: '', rank: 'כבאי', role: 'firefighter', shift_group: 'A', phone: '', status: 'active', isVolunteer: false, joined: new Date().toISOString().slice(0,10) };

    const html = `
      <div class="modal-header">
        <h2>${isNew ? '➕ כבאי חדש' : '✏ עריכת כבאי'}</h2>
      </div>
      <div class="modal-body">
        <label class="form-label">שם מלא</label>
        <input class="form-input" id="m-name" value="${data.name}" placeholder="לדוגמה: דוד כהן">
        <div class="form-row">
          <div>
            <label class="form-label">מספר אישי</label>
            <input class="form-input" id="m-personalId" value="${data.personalId}">
          </div>
          <div>
            <label class="form-label">טלפון</label>
            <input class="form-input" id="m-phone" value="${data.phone}" type="tel">
          </div>
        </div>
        <div class="form-row">
          <div>
            <label class="form-label">דרגה / תפקיד טקסטואלי</label>
            <input class="form-input" id="m-rank" value="${data.rank}">
          </div>
          <div>
            <label class="form-label">תפקיד מערכת</label>
            <select class="form-input" id="m-role">
              ${Object.entries(CONFIG.ROLES).map(([k,v]) => `<option value="${k}" ${data.role===k?'selected':''}>${v.name_he}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div>
            <label class="form-label">קבוצת משמרת</label>
            <select class="form-input" id="m-shift_group">
              ${['A','B','C','D','—'].map(g => `<option value="${g}" ${data.shift_group===g?'selected':''}>${g}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">סטטוס</label>
            <select class="form-input" id="m-status">
              <option value="active" ${data.status==='active'?'selected':''}>פעיל</option>
              <option value="training" ${data.status==='training'?'selected':''}>בהכשרה</option>
              <option value="leave" ${data.status==='leave'?'selected':''}>בחופש</option>
              <option value="inactive" ${data.status==='inactive'?'selected':''}>לא פעיל</option>
            </select>
          </div>
        </div>
        <label class="form-label">תאריך גיוס</label>
        <input class="form-input" id="m-joined" type="date" value="${data.joined}">
        <label class="form-checkbox">
          <input type="checkbox" id="m-isVolunteer" ${data.isVolunteer?'checked':''}>
          <span>מתנדב</span>
        </label>
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
            personalId: document.getElementById('m-personalId').value.trim(),
            phone: document.getElementById('m-phone').value.trim(),
            rank: document.getElementById('m-rank').value.trim(),
            role: document.getElementById('m-role').value,
            shift_group: document.getElementById('m-shift_group').value,
            status: document.getElementById('m-status').value,
            joined: document.getElementById('m-joined').value,
            isVolunteer: document.getElementById('m-isVolunteer').checked
          };
          if (!updated.name) { FireOpsApp.toast('⚠ נדרש שם', 'warning'); return; }
          if (isNew) {
            FireOpsState.firefighters.push(updated);
            FireOpsApp.logEvent('personnel', 4, `נוסף כבאי: ${updated.name} (${updated.rank})`);
          } else {
            const idx = FireOpsState.firefighters.findIndex(x => x.id === updated.id);
            FireOpsState.firefighters[idx] = updated;
            FireOpsApp.logEvent('personnel', 4, `עודכן כבאי: ${updated.name}`);
          }
          FireOpsApp.saveState();
          FireOpsApp.closeModal();
          FireOpsApp.toast(isNew ? `⚡ ${updated.name} נוסף` : `✓ ${updated.name} נשמר`, 'success');
          render();
        });
        const del = document.getElementById('m-delete');
        if (del) del.addEventListener('click', () => {
          if (!confirm(`למחוק את ${data.name}?`)) return;
          FireOpsState.firefighters = FireOpsState.firefighters.filter(x => x.id !== data.id);
          FireOpsApp.saveState();
          FireOpsApp.logEvent('personnel', 3, `נמחק כבאי: ${data.name}`);
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
