/* ============================================================
   FireOps — Dispatch View
   Map, incident markers, incident cards, unit cards, demo spawn
   ============================================================ */

window.FireOpsDispatch = (function() {

  let map;
  const markerRefs = {};
  let stationMarker;
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    // נתוני seed לבדיקה ראשונית — יוחלפו ב-Phase 6 בנתונים מ-state
    if (!FireOpsState.incidents || FireOpsState.incidents.length === 0) {
      seedDemoData();
    }

    initMap();
    renderAll();
    wireEvents();
  }

  function seedDemoData() {
    FireOpsState.incidents = [
      { id: 1042, type: 'שריפת מבנה',     address: 'רחוב הרצל 23, חיפה',     severity: 1, lat: 32.8156, lng: 34.9892, time: '17:21', units: ['כב-1','סול-2','חיל-1'], active: true,  station_id: 'haifa-central' },
      { id: 1041, type: 'שריפת רכב',       address: 'דרך אלנבי 45',           severity: 3, lat: 32.8230, lng: 34.9920, time: '16:48', units: ['כב-3'],                active: false, station_id: 'haifa-central' },
      { id: 1040, type: 'חילוץ ממעלית',   address: 'שדרות הציונות 12, הדר',  severity: 4, lat: 32.8081, lng: 34.9893, time: '15:32', units: ['חיל-1'],                active: false, station_id: 'haifa-central' }
    ];

    FireOpsState.units = [
      { callsign: 'כב-1',  type: 'כבאית',       status: 'dispatched', text: 'בדרך לאירוע #1042', staffing: '4/4', station_id: 'haifa-central' },
      { callsign: 'כב-2',  type: 'כבאית',       status: 'available',  text: 'זמין · תחנה',        staffing: '4/4', station_id: 'haifa-central' },
      { callsign: 'כב-3',  type: 'כבאית',       status: 'onscene',    text: 'בשטח · אלנבי 45',   staffing: '3/4', station_id: 'haifa-central' },
      { callsign: 'סול-2', type: 'סולם',         status: 'dispatched', text: 'בדרך לאירוע #1042', staffing: '3/3', station_id: 'haifa-central' },
      { callsign: 'חיל-1', type: 'רכב חילוץ',    status: 'dispatched', text: 'בדרך לאירוע #1042', staffing: '2/2', station_id: 'haifa-central' },
      { callsign: 'פיק-1', type: 'רכב פיקוד',    status: 'available',  text: 'זמין · תחנה',        staffing: '2/2', station_id: 'haifa-central' },
      { callsign: 'מכ-1',  type: 'מכלית מים',    status: 'available',  text: 'זמין · תחנה',        staffing: '2/2', station_id: 'haifa-central' },
      { callsign: 'כב-4',  type: 'כבאית',       status: 'oos',        text: 'מחוץ לשירות · תחזוקה', staffing: '0/4', station_id: 'haifa-central' }
    ];

    FireOpsApp.saveState();
  }

  function initMap() {
    const station = FireOpsApp.getCurrentStation();
    const center = station ? [station.lat, station.lng] : [32.8156, 34.9892];

    map = L.map('map', { zoomControl: false, attributionControl: true }).setView(center, 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO',
      maxZoom: 19, subdomains: 'abcd'
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    placeStationMarker();
    renderMarkers();

    // Hand the map to the tactical overlay for fire spread / AVL / aircraft
    if (window.FireOpsTactical) FireOpsTactical.setMap(map);

    // Keep map sized correctly on viewport resize (mobile rotate / drawer toggle)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (map) map.invalidateSize(); }, 200);
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => { if (map) map.invalidateSize(); }, 300);
    });
  }

  function invalidateMapSize() {
    if (map) setTimeout(() => map.invalidateSize(), 50);
  }

  function placeStationMarker() {
    const station = FireOpsApp.getCurrentStation();
    if (!station) return;
    if (stationMarker) map.removeLayer(stationMarker);

    const icon = L.divIcon({
      html: `<div class="station-marker"><div class="shape"></div><div class="letter">S</div></div>`,
      className: '', iconSize: [30,30], iconAnchor: [15,15]
    });
    stationMarker = L.marker([station.lat, station.lng], { icon }).addTo(map)
      .bindPopup(`<div style="color: #00D4FF; font-weight: 700; font-size: 14px;">🚒 ${station.name}</div>`);
  }

  function makeIncidentMarker(incident) {
    const cls = incident.active ? 'fire-marker' : 'fire-marker resolved';
    const html = `<div class="${cls}">
      ${incident.active ? '<div class="pulse-ring"></div><div class="pulse-ring"></div><div class="pulse-ring"></div>' : ''}
      <div class="ring"></div>
      <div class="dot"></div>
    </div>`;
    const icon = L.divIcon({ html, className: '', iconSize: [24,24], iconAnchor: [12,12] });
    const m = L.marker([incident.lat, incident.lng], { icon }).addTo(map);
    m.bindPopup(`
      <div style="min-width: 200px; line-height: 1.4;">
        <div style="font-size: 10px; color: #8A93A6; font-family: 'JetBrains Mono', monospace; letter-spacing: 1px;">INCIDENT #${incident.id}</div>
        <div style="font-size: 16px; font-weight: 700; color: #FF6B35; margin-top: 6px;">${incident.type}</div>
        <div style="font-size: 13px; margin-top: 4px; color: #E8EBF0;">📍 ${incident.address}</div>
        <div style="font-size: 11px; color: #8A93A6; margin-top: 10px; font-family: 'JetBrains Mono', monospace;">⏱ ${incident.time}  ·  SEV ${incident.severity}</div>
      </div>
    `);
    markerRefs[incident.id] = m;
    return m;
  }

  function clearMarkers() {
    Object.values(markerRefs).forEach(m => map.removeLayer(m));
    Object.keys(markerRefs).forEach(k => delete markerRefs[k]);
  }

  function renderMarkers() {
    clearMarkers();
    getVisibleIncidents().forEach(makeIncidentMarker);
  }

  function getVisibleIncidents() {
    const stationId = FireOpsApp.getCurrentStation()?.id;
    return (FireOpsState.incidents || []).filter(i => !stationId || i.station_id === stationId);
  }

  function getVisibleUnits() {
    const stationId = FireOpsApp.getCurrentStation()?.id;
    return (FireOpsState.units || []).filter(u => !stationId || u.station_id === stationId);
  }

  function renderIncidents() {
    const list = document.getElementById('incidents-list');
    if (!list) return;
    const items = getVisibleIncidents();
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state">אין אירועים פעילים</div>';
    } else {
      list.innerHTML = items.map(inc => `
        <div class="incident-card severity-${inc.severity} ${inc.active ? 'active' : ''}" data-id="${inc.id}">
          <div class="id">#${inc.id} · ${inc.time}</div>
          <div class="type">${inc.type}</div>
          <div class="address">${inc.address}</div>
          <div class="meta">
            <div class="units-deployed">${inc.units.map(u => `<span class="unit-chip">${u}</span>`).join('')}</div>
            <span class="sev-tag">SEV ${inc.severity}</span>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.incident-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = parseInt(card.dataset.id);
          const inc = FireOpsState.incidents.find(i => i.id === id);
          if (inc) {
            map.flyTo([inc.lat, inc.lng], 16, { duration: 1 });
            if (markerRefs[id]) markerRefs[id].openPopup();
          }
        });
      });
    }

    const activeCount = items.filter(i => i.active).length;
    document.getElementById('incidents-badge').textContent = items.length;
    document.getElementById('stat-open').textContent = items.length;
  }

  function renderUnits() {
    const list = document.getElementById('units-list');
    if (!list) return;
    const items = getVisibleUnits();
    if (items.length === 0) {
      list.innerHTML = '<div class="empty-state">אין יחידות בתחנה זו</div>';
    } else {
      list.innerHTML = items.map(u => {
        const [a, b] = u.staffing.split('/');
        const pct = (parseInt(a) / parseInt(b)) * 100;
        return `
          <div class="unit-card status-${u.status}" data-callsign="${u.callsign}">
            <div class="row">
              <span class="callsign">${u.callsign}</span>
              <span class="led"></span>
            </div>
            <div class="type-label">${u.type}</div>
            <div class="status-text">${u.text}</div>
            <div class="staffing">
              <span>${u.staffing}</span>
              <div class="meter"><div class="meter-fill" style="width: ${pct}%"></div></div>
            </div>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.unit-card').forEach(card => {
        card.addEventListener('click', () => {
          const cs = card.dataset.callsign;
          const u = FireOpsState.units.find(x => x.callsign === cs);
          if (u) FireOpsApp.toast(`🚒 ${u.callsign} (${u.type}) — ${u.text}`);
        });
      });
    }

    document.getElementById('units-badge').textContent = items.length;
    const onscene = items.filter(u => u.status === 'onscene' || u.status === 'dispatched').length;
    document.getElementById('stat-onscene').textContent = `${onscene}/${items.length}`;
  }

  function renderAll() {
    renderIncidents();
    renderUnits();
    if (map) renderMarkers();
  }

  // === Demo incident spawn (Phase 1 — placeholder for full intake form in Phase 6) ===
  const demoTemplates = [
    { type: 'שריפת מבנה מגורים',         address: 'רחוב ביאליק 8, חיפה',         lat: 32.8195, lng: 34.9866 },
    { type: 'שריפת חורש',                 address: 'יער הכרמל, תחנת השאיבה',     lat: 32.7610, lng: 34.9920 },
    { type: 'תאונת דרכים עם לכודים',      address: 'כביש 4, צומת חיפה',          lat: 32.8345, lng: 35.0510 },
    { type: 'שריפת רכב',                  address: 'דרך יפו 145',                lat: 32.8068, lng: 34.9905 },
    { type: 'דליפת גז / חומ"ס',           address: 'אזור התעשייה חיפה',           lat: 32.8260, lng: 35.0290 },
    { type: 'שריפה במחסן',                address: 'נמל חיפה, מסוף 3',           lat: 32.8276, lng: 35.0040 }
  ];

  let demoIndex = 0;

  function spawnDemoIncident() {
    const tmpl = demoTemplates[demoIndex % demoTemplates.length];
    demoIndex++;

    const allIds = (FireOpsState.incidents || []).map(i => i.id);
    const newId = (allIds.length > 0 ? Math.max(...allIds) : 1000) + 1;
    const now = new Date().toLocaleTimeString('he-IL', { hour12: false, hour: '2-digit', minute: '2-digit' });
    const station = FireOpsApp.getCurrentStation();

    const newIncident = {
      id: newId,
      type: tmpl.type,
      address: tmpl.address,
      severity: 1,
      lat: tmpl.lat,
      lng: tmpl.lng,
      time: now,
      units: ['כב-2', 'פיק-1'],
      active: true,
      station_id: station?.id || 'haifa-central'
    };

    FireOpsState.incidents.forEach(inc => inc.active = false);
    FireOpsState.incidents.unshift(newIncident);
    FireOpsApp.saveState();

    map.flyTo([newIncident.lat, newIncident.lng], 15, { duration: 1.5 });
    FireOpsSounds.incidentReceived();
    FireOpsApp.logEvent('incident', 1, `📞 דיווח: ${tmpl.type} · ${tmpl.address}`);

    setTimeout(() => {
      const m = makeIncidentMarker(newIncident);
      m.openPopup();
      // Tactical: start fire spread polygon
      if (window.FireOpsTactical) FireOpsTactical.startFireSpread(newIncident);
    }, 1000);

    // Tactical: auto-dispatch units from station with AVL animation
    // (timing controlled by Settings → Tactical → ground_demo_seconds)
    setTimeout(() => {
      if (!window.FireOpsTactical || !station) return;
      const from = [station.lat, station.lng];
      const to = [newIncident.lat, newIncident.lng];
      FireOpsApp.logEvent('dispatch', 2, `הזנקה אוטומטית: כב-2 · פיק-1 → אירוע #${newId}`);
      FireOpsTactical.dispatchVehicle({ callsign: 'כב-2' }, from, to);
      setTimeout(() => FireOpsTactical.dispatchVehicle({ callsign: 'פיק-1' }, from, to), 1500);
    }, 2400);

    renderIncidents();
    const firstCard = document.querySelector('.incident-card');
    if (firstCard) firstCard.classList.add('spawn-in');

    FireOpsApp.toast(`🚨 אירוע חדש #${newId} — ${tmpl.type}`);
  }

  function callAirSupport(level = 'standard') {
    const incidents = getVisibleIncidents();
    const active = incidents.find(i => i.active) || incidents[0];
    if (!active) {
      FireOpsApp.toast('⚠ אין אירוע פעיל. דווח על אירוע חדש קודם', 'warning');
      return;
    }
    if (window.FireOpsTactical) FireOpsTactical.dispatchAirSupport(active, level);
  }

  function wireEvents() {
    document.getElementById('btn-new-incident').addEventListener('click', spawnDemoIncident);
    document.getElementById('btn-op-log').addEventListener('click', () => FireOpsApp.navigateTo('op-log'));
    const air = document.getElementById('btn-air-support');
    if (air) air.addEventListener('click', () => callAirSupport('standard'));
    const heavy = document.getElementById('btn-air-heavy');
    if (heavy) heavy.addEventListener('click', () => callAirSupport('heavy'));
  }

  function onStationChange() {
    // נקרא ע"י app.js כשתחנה משתנה
    placeStationMarker();
    const station = FireOpsApp.getCurrentStation();
    if (station && map) {
      map.flyTo([station.lat, station.lng], 14, { duration: 0.8 });
    }
    renderAll();
  }

  return { init, renderAll, spawnDemoIncident, callAirSupport, onStationChange, invalidateMapSize };
})();
