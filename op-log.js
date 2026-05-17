/* ============================================================
   FireOps — Operational Log Module
   Timeline feed of all events, filterable, exportable
   ============================================================ */

window.FireOpsOpLog = (function() {

  let initialized = false;
  let filterCat = 'all';
  let filterUrgency = 'all';
  let searchTerm = '';

  const CATEGORIES = {
    incident:    { name_he: 'אירוע',     color: 'tag-red' },
    dispatch:    { name_he: 'הזנקה',     color: 'tag-fire' },
    status:      { name_he: 'סטטוס',    color: 'tag-yellow' },
    equipment:   { name_he: 'ציוד',      color: 'tag-green' },
    personnel:   { name_he: 'כוח אדם',   color: '' },
    other:       { name_he: 'אחר',       color: 'tag-dim' }
  };

  function init() {
    if (!FireOpsState.op_log || FireOpsState.op_log.length === 0) {
      seedDemo();
    }
    if (!initialized) {
      initialized = true;
      buildShell();
    }
    render();
  }

  function seedDemo() {
    FireOpsState.op_log = [];
    const samples = [
      { cat: 'incident', urg: 1, txt: 'דיווח שריפת בניין — רחוב הרצל 23' },
      { cat: 'dispatch', urg: 2, txt: 'הזנקה: כב-1, סול-2, חיל-1 לאירוע #1042' },
      { cat: 'status',   urg: 2, txt: 'כב-1 הגיע לאירוע #1042' },
      { cat: 'status',   urg: 2, txt: 'אירוע #1042 תחת שליטה' },
      { cat: 'incident', urg: 3, txt: 'שריפת רכב — דרך אלנבי 45' },
      { cat: 'dispatch', urg: 3, txt: 'הזנקה: כב-3 לאירוע #1041' },
      { cat: 'equipment',urg: 4, txt: 'בדיקה יומית לכב-2 הושלמה — 8 פריטים תקינים' },
      { cat: 'personnel',urg: 4, txt: 'איתי שמש החליף משמרת עם מאור גרשון' },
      { cat: 'equipment',urg: 3, txt: 'מסכת SCBA #SN-184523 נמצאה לא תקינה — work order נפתח' },
      { cat: 'incident', urg: 4, txt: 'אזעקת שווא — מרכז קניות חוצות' }
    ];
    const now = Date.now();
    samples.forEach((s, i) => {
      FireOpsState.op_log.push({
        id: FireOpsApp.uid('log'),
        station_id: 'haifa-central',
        timestamp: now - (i+1) * 1800_000 - Math.floor(Math.random()*1200_000),
        category: s.cat,
        urgency: s.urg,
        actor: 'system',
        text: s.txt
      });
    });
    FireOpsApp.saveState();
  }

  function buildShell() {
    const page = document.getElementById('page-op-log');
    page.innerHTML = `
      <div class="module-page glass">
        <div class="module-header">
          <span class="module-icon">📋</span>
          <div>
            יומן מבצעי
            <div class="subtitle" id="log-subtitle">--</div>
          </div>
          <div class="actions">
            <button class="btn-ghost" id="log-export">📥 ייצוא CSV</button>
            <button class="btn-ghost" id="log-clear">🗑 נקה</button>
          </div>
        </div>
        <div class="module-toolbar">
          <input type="text" class="search-input" id="log-search" placeholder="חיפוש בטקסט...">
          <select class="filter-select" id="log-cat">
            <option value="all">כל הקטגוריות</option>
            ${Object.entries(CATEGORIES).map(([k,v]) => `<option value="${k}">${v.name_he}</option>`).join('')}
          </select>
          <select class="filter-select" id="log-urg">
            <option value="all">כל הדחיפויות</option>
            <option value="1">1 — קריטי</option>
            <option value="2">2 — חמור</option>
            <option value="3">3 — בינוני</option>
            <option value="4">4 — נמוך</option>
          </select>
        </div>
        <div class="module-body" id="log-timeline"></div>
      </div>
    `;
    document.getElementById('log-search').addEventListener('input', e => { searchTerm = e.target.value.toLowerCase(); render(); });
    document.getElementById('log-cat').addEventListener('change', e => { filterCat = e.target.value; render(); });
    document.getElementById('log-urg').addEventListener('change', e => { filterUrgency = e.target.value; render(); });
    document.getElementById('log-export').addEventListener('click', exportCsv);
    document.getElementById('log-clear').addEventListener('click', () => {
      if (!confirm('למחוק את כל היומן? פעולה לא הפיכה.')) return;
      FireOpsState.op_log = [];
      FireOpsApp.saveState();
      render();
    });
  }

  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString('he-IL', { hour12: false, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function getVisible() {
    const sid = FireOpsApp.getCurrentStation()?.id;
    return (FireOpsState.op_log || []).filter(e => {
      if (sid && e.station_id && e.station_id !== sid) return false;
      if (filterCat !== 'all' && e.category !== filterCat) return false;
      if (filterUrgency !== 'all' && String(e.urgency) !== filterUrgency) return false;
      if (searchTerm && !e.text.toLowerCase().includes(searchTerm)) return false;
      return true;
    });
  }

  function render() {
    const list = document.getElementById('log-timeline');
    if (!list) return;
    const items = getVisible();
    const sub = document.getElementById('log-subtitle');
    if (sub) sub.textContent = `${items.length} מתוך ${FireOpsState.op_log.length} רשומות`;

    if (items.length === 0) {
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">📋</span><div class="empty-title">אין רשומות</div></div>`;
      return;
    }

    list.innerHTML = `<div class="timeline">${items.map(e => {
      const cat = CATEGORIES[e.category] || CATEGORIES.other;
      return `
        <div class="timeline-entry urgency-${e.urgency}">
          <div class="te-meta">
            <span class="category">${cat.name_he}</span>
            <span class="time">${formatTime(e.timestamp)}</span>
            <span class="time">· ${e.actor || 'system'}</span>
          </div>
          <div class="text">${e.text}</div>
        </div>`;
    }).join('')}</div>`;
  }

  function refreshIfActive() {
    const page = document.getElementById('page-op-log');
    if (page && page.classList.contains('active')) render();
  }

  function exportCsv() {
    const items = getVisible();
    if (items.length === 0) { FireOpsApp.toast('אין נתונים לייצוא', 'warning'); return; }
    const header = 'זמן,קטגוריה,דחיפות,מבצע,תיאור\n';
    const csv = '﻿' + header + items.map(e => {
      const t = formatTime(e.timestamp);
      const c = CATEGORIES[e.category]?.name_he || e.category;
      const txt = `"${(e.text || '').replace(/"/g, '""')}"`;
      return `${t},${c},${e.urgency},${e.actor || 'system'},${txt}`;
    }).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fireops-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    FireOpsApp.toast(`📥 יוצאו ${items.length} רשומות`, 'success');
  }

  function onStationChange() { render(); }

  return { init, render, refreshIfActive, onStationChange };
})();
