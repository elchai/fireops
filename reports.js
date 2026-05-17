/* ============================================================
   FireOps — Reports Module
   KPI cards + inline charts (incidents per day, response times)
   ============================================================ */

window.FireOpsReports = (function() {

  let initialized = false;

  function init() {
    if (!initialized) {
      initialized = true;
      buildShell();
    }
    render();
  }

  function buildShell() {
    const page = document.getElementById('page-reports');
    page.innerHTML = `
      <div class="module-page glass">
        <div class="module-header">
          <span class="module-icon">📊</span>
          <div>
            דוחות ואנליטיקה
            <div class="subtitle" id="rpt-subtitle">--</div>
          </div>
          <div class="actions">
            <span class="tag">תחנה נוכחית</span>
          </div>
        </div>
        <div class="module-body" id="rpt-body"></div>
      </div>
    `;
  }

  function compute() {
    const sid = FireOpsApp.getCurrentStation()?.id;
    const incidents = (FireOpsState.incidents || []).filter(i => i.station_id === sid);
    const units    = (FireOpsState.units || []).filter(u => u.station_id === sid);
    const apps     = (FireOpsState.apparatus || []).filter(a => a.station_id === sid);
    const ffs      = (FireOpsState.firefighters || []).filter(f => f.station_id === sid);
    const trainings = FireOpsState.trainings || [];
    const equipment = (FireOpsState.equipment || []).filter(e => {
      const a = apps.find(x => x.id === e.apparatus_id);
      return !!a;
    });

    // Training compliance — % of (ffs × cert types 9) with valid (>60d) cert
    const totalSlots = ffs.length * 9;
    let validCount = 0;
    ffs.forEach(f => {
      trainings.filter(t => t.firefighter_id === f.id).forEach(t => {
        const days = Math.floor((new Date(t.expires).getTime() - Date.now()) / (1000*60*60*24));
        if (days >= 60) validCount++;
      });
    });
    const trainingPct = totalSlots ? Math.round((validCount / totalSlots) * 100) : 0;

    // Equipment readiness — % items not failed and not check-due
    let okCount = 0;
    equipment.forEach(e => {
      if (e.status === 'failed') return;
      const days = Math.floor((Date.now() - new Date(e.last_check).getTime()) / (1000*60*60*24));
      if (days <= (e.test_interval_days || 30)) okCount++;
    });
    const equipPct = equipment.length ? Math.round((okCount / equipment.length) * 100) : 0;

    // Apparatus readiness — % not OOS
    const apparatusReady = apps.length ? Math.round((apps.filter(a => a.status !== 'oos').length / apps.length) * 100) : 0;

    // Incidents this week (mock — count all for now)
    const weekIncidents = incidents.length;

    return {
      activeIncidents: incidents.filter(i => i.active).length,
      totalIncidents: incidents.length,
      onSceneUnits: units.filter(u => u.status === 'onscene' || u.status === 'dispatched').length,
      totalUnits: units.length,
      ffsActive: ffs.filter(f => f.status === 'active').length,
      ffsTotal: ffs.length,
      apparatusReady,
      apparatusTotal: apps.length,
      trainingPct,
      equipPct,
      weekIncidents,
      // for bar chart, fake distribution per day
      incidentsByDay: [4, 7, 3, 8, 5, 6, 9],
      // for response, fake mm:ss
      avgResponse: '04:32'
    };
  }

  function render() {
    const body = document.getElementById('rpt-body');
    if (!body) return;
    const m = compute();
    const sub = document.getElementById('rpt-subtitle');
    if (sub) sub.textContent = `${FireOpsApp.getCurrentStation()?.name || '--'} · עודכן ${new Date().toLocaleString('he-IL', { hour12: false, hour: '2-digit', minute: '2-digit' })}`;

    body.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi-card glass">
          <span class="kpi-label">אירועים פעילים</span>
          <span class="kpi-value fire">${m.activeIncidents}</span>
          <span class="kpi-trend">${m.totalIncidents} סה"כ היום</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">תגובה ממוצעת</span>
          <span class="kpi-value">${m.avgResponse}</span>
          <span class="kpi-trend trend-up">▲ 8% מהשבוע שעבר</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">יחידות בשטח</span>
          <span class="kpi-value yellow">${m.onSceneUnits}<small style="font-size: 18px; color: var(--text-dim);"> / ${m.totalUnits}</small></span>
          <span class="kpi-trend">${Math.round(m.onSceneUnits/m.totalUnits*100) || 0}% מנוצל</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">מצבת כבאים פעילה</span>
          <span class="kpi-value green">${m.ffsActive}<small style="font-size: 18px; color: var(--text-dim);"> / ${m.ffsTotal}</small></span>
          <span class="kpi-trend">${m.ffsTotal - m.ffsActive} לא זמין</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">כוננות צי רכבים</span>
          <span class="kpi-value ${m.apparatusReady >= 80 ? 'green' : m.apparatusReady >= 60 ? 'yellow' : 'fire'}">${m.apparatusReady}<small style="font-size: 18px;">%</small></span>
          <span class="kpi-trend">${m.apparatusTotal} רכבים סה"כ</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">תקינות ציוד</span>
          <span class="kpi-value ${m.equipPct >= 80 ? 'green' : m.equipPct >= 60 ? 'yellow' : 'fire'}">${m.equipPct}<small style="font-size: 18px;">%</small></span>
          <span class="kpi-trend">בדיקות בתוקף</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">עמידה באימונים</span>
          <span class="kpi-value ${m.trainingPct >= 80 ? 'green' : m.trainingPct >= 60 ? 'yellow' : 'fire'}">${m.trainingPct}<small style="font-size: 18px;">%</small></span>
          <span class="kpi-trend">סיווגים תקפים (>60 ימים)</span>
        </div>
        <div class="kpi-card glass">
          <span class="kpi-label">אירועי שבוע</span>
          <span class="kpi-value">${m.weekIncidents}</span>
          <span class="kpi-trend trend-down">▼ 12% מהשבוע שעבר</span>
        </div>
      </div>

      <div class="panel glass" style="margin-bottom: 16px;">
        <h2>אירועים לפי יום (7 ימים אחרונים)</h2>
        <div class="bar-chart" style="margin-top: 20px;">
          ${m.incidentsByDay.map((v, i) => {
            const max = Math.max(...m.incidentsByDay);
            const pct = (v / max) * 100;
            const days = ['א','ב','ג','ד','ה','ו','ש'];
            return `<div class="bar" style="height: ${pct}%"><span class="bar-value">${v}</span><span class="bar-label">${days[i]}</span></div>`;
          }).join('')}
        </div>
      </div>

      <div class="panel glass">
        <h2>סטטיסטיקות מפורטות</h2>
        <div class="stat-row"><span class="stat-label">סה"כ אירועים בבסיס הנתונים</span><span class="stat-value">${(FireOpsState.incidents || []).length}</span></div>
        <div class="stat-row"><span class="stat-label">סה"כ רכבים בתחנה</span><span class="stat-value">${m.apparatusTotal}</span></div>
        <div class="stat-row"><span class="stat-label">סה"כ כבאים בתחנה</span><span class="stat-value">${m.ffsTotal}</span></div>
        <div class="stat-row"><span class="stat-label">סה"כ פריטי ציוד</span><span class="stat-value">${(FireOpsState.equipment || []).length}</span></div>
        <div class="stat-row"><span class="stat-label">רשומות יומן מבצעי</span><span class="stat-value">${(FireOpsState.op_log || []).length}</span></div>
        <div class="stat-row"><span class="stat-label">סיווגים פעילים</span><span class="stat-value">${(FireOpsState.trainings || []).length}</span></div>
      </div>
    `;
  }

  function onStationChange() { render(); }

  return { init, render, onStationChange };
})();
