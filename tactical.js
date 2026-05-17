/* ============================================================
   FireOps — Tactical Overlay
   Fire spread visualization · vehicle AVL · aircraft dispatch · wind
   All rendered on the Leaflet map passed in via setMap()
   ============================================================ */

window.FireOpsTactical = (function() {

  let map;

  // Active visualizations keyed by ID for cleanup
  const fires = {};      // incident_id -> { layers, lat, lng, radius, ... }
  const vehicles = {};   // vehicle_id -> { marker, line, interval }
  const aircraft = {};   // aircraft_id -> { marker, line, interval }
  let airbaseMarker = null;
  let windOverlayEl = null;

  // Wind state (mathematical angle in radians; 0 = east, π/2 = north)
  // Wind blows TO this direction (i.e. cosθ direction is where fire spreads)
  let windAngleRad = Math.PI; // default: blowing from east to west
  let windStrength = 0.4;     // 0..1

  // === Geo helpers ===
  function metersToLatLng(centerLat, centerLng, meters, angleRad) {
    const dLat = (meters * Math.sin(angleRad)) / 111000;
    const dLng = (meters * Math.cos(angleRad)) / (111000 * Math.cos(centerLat * Math.PI / 180));
    return [centerLat + dLat, centerLng + dLng];
  }

  function distanceMeters(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // === Init ===
  function setMap(leafletMap) {
    map = leafletMap;
    placeAirbase();
    buildWindOverlay();
  }

  function placeAirbase() {
    const base = CONFIG.AIRBASES[0];
    if (!base) return;
    if (airbaseMarker) map.removeLayer(airbaseMarker);
    const icon = L.divIcon({
      html: `<div class="airbase-marker"><div class="ab-shape"></div><div class="ab-icon">✈</div></div>`,
      className: '',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });
    airbaseMarker = L.marker([base.lat, base.lng], { icon, zIndexOffset: 100 }).addTo(map);
    airbaseMarker.bindPopup(`
      <div style="color: #00D4FF; font-weight: 700; font-size: 14px;">${base.icon || '✈'} ${base.name}</div>
      <div style="color: #8A93A6; font-size: 11px; margin-top: 4px;">${base.squadron}</div>
      <div style="color: #E8EBF0; font-size: 11px; margin-top: 4px; font-family: 'JetBrains Mono', monospace;">${base.aircraft_count} אווירוני AT-802F</div>
    `);
  }

  // === Wind ===
  function setWind(angleRad, strength) {
    windAngleRad = angleRad;
    windStrength = strength;
    updateWindOverlay();
    Object.values(fires).forEach(f => redrawFire(f));
  }

  function buildWindOverlay() {
    if (windOverlayEl) windOverlayEl.remove();
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    const wrapper = mapEl.parentElement;
    windOverlayEl = document.createElement('div');
    windOverlayEl.className = 'wind-widget';
    windOverlayEl.title = 'לחיצה לשינוי כיוון/עוצמת רוח';
    wrapper.appendChild(windOverlayEl);
    updateWindOverlay();

    windOverlayEl.addEventListener('click', () => {
      cycleWind();
    });
  }

  const WIND_STATES = [
    { a: 0,             s: 0.0,  n: 'דממה' },
    { a: Math.PI * 1.0, s: 0.3,  n: 'מערב חלשה' },
    { a: Math.PI * 1.0, s: 0.7,  n: 'מערב חזקה' },
    { a: Math.PI * 1.5, s: 0.4,  n: 'דרום בינונית' },
    { a: 0,             s: 0.5,  n: 'מזרח בינונית' },
    { a: Math.PI * 0.5, s: 0.6,  n: 'צפון חזקה' }
  ];
  let windStateIdx = 1;

  function cycleWind() {
    windStateIdx = (windStateIdx + 1) % WIND_STATES.length;
    const st = WIND_STATES[windStateIdx];
    setWind(st.a, st.s);
    FireOpsApp.toast(`💨 רוח: ${st.n}`);
    FireOpsSounds.uiClick();
  }

  function updateWindOverlay() {
    if (!windOverlayEl) return;
    // Convert math angle (0=east, ccw) to compass degree (0=north, cw)
    const compassDeg = ((90 - windAngleRad * 180 / Math.PI) + 360) % 360;
    const dirNames = ['צפון','צ-מזרח','מזרח','ד-מזרח','דרום','ד-מערב','מערב','צ-מערב'];
    const dirIdx = Math.round(compassDeg / 45) % 8;
    const strengthName = windStrength === 0 ? '—' : windStrength < 0.4 ? 'חלשה' : windStrength < 0.6 ? 'בינונית' : 'חזקה';
    const speed = Math.round(windStrength * 60);

    windOverlayEl.innerHTML = `
      <div class="wind-compass">
        <svg viewBox="0 0 60 60" width="60" height="60">
          <circle cx="30" cy="30" r="26" fill="rgba(0,0,0,0.5)" stroke="rgba(0,212,255,0.4)" stroke-width="1"/>
          <text x="30" y="11" text-anchor="middle" font-size="7" fill="rgba(0,212,255,0.7)" font-family="Orbitron" font-weight="700">N</text>
          <text x="52" y="33" text-anchor="middle" font-size="7" fill="rgba(0,212,255,0.4)" font-family="Orbitron">E</text>
          <text x="30" y="55" text-anchor="middle" font-size="7" fill="rgba(0,212,255,0.4)" font-family="Orbitron">S</text>
          <text x="8" y="33" text-anchor="middle" font-size="7" fill="rgba(0,212,255,0.4)" font-family="Orbitron">W</text>
          ${windStrength > 0 ? `
            <g transform="rotate(${compassDeg} 30 30)" style="filter: drop-shadow(0 0 4px #FF4500);">
              <polygon points="30,7 26,28 30,23 34,28" fill="#FF6B35" stroke="#FF4500" stroke-width="0.5"/>
              <line x1="30" y1="23" x2="30" y2="50" stroke="#FF8C42" stroke-width="2" opacity="0.7"/>
            </g>` : '<circle cx="30" cy="30" r="3" fill="#8A93A6"/>'}
        </svg>
      </div>
      <div class="wind-info">
        <div class="wind-label">רוח</div>
        <div class="wind-value">${dirNames[dirIdx]}</div>
        <div class="wind-speed">${speed} קמ"ש · ${strengthName}</div>
      </div>
    `;
  }

  // === Fire spread ===
  function startFireSpread(incident) {
    if (fires[incident.id]) stopFireSpread(incident.id);

    const f = {
      incident,
      lat: incident.lat,
      lng: incident.lng,
      radius: 40,
      maxRadius: 380,
      growthRate: 5,
      layers: null,
      growthInterval: null,
      contained: false
    };

    f.layers = createFireLayers(f);
    f.growthInterval = setInterval(() => {
      if (f.contained) return;
      f.radius = Math.min(f.maxRadius, f.radius + f.growthRate);
      redrawFire(f);
    }, 700);

    fires[incident.id] = f;
    return f;
  }

  function generateWindyPolygon(centerLat, centerLng, baseRadius, points) {
    const coords = [];
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const angleDiff = Math.cos(angle - windAngleRad);
      const windBoost = 1 + windStrength * angleDiff * 1.4;
      const noise = 1 + (Math.random() - 0.5) * 0.3;
      const r = baseRadius * windBoost * noise;
      coords.push(metersToLatLng(centerLat, centerLng, r, angle));
    }
    return coords;
  }

  function createFireLayers(f) {
    const { lat, lng, radius } = f;
    const outer = L.polygon(generateWindyPolygon(lat, lng, radius * 1.05, 36), {
      color: '#FFD23F', fillColor: '#FF8C42', fillOpacity: 0.14, weight: 1, opacity: 0.5,
      dashArray: '6, 6', interactive: false, className: 'fire-outer'
    }).addTo(map);
    const middle = L.polygon(generateWindyPolygon(lat, lng, radius * 0.72, 32), {
      color: '#FF4500', fillColor: '#FF6B35', fillOpacity: 0.42, weight: 2, opacity: 0.85,
      interactive: false, className: 'fire-poly-glow'
    }).addTo(map);
    const inner = L.polygon(generateWindyPolygon(lat, lng, radius * 0.4, 28), {
      color: '#7a1a00', fillColor: '#3a0a00', fillOpacity: 0.72, weight: 1, opacity: 0.7,
      interactive: false
    }).addTo(map);
    return { outer, middle, inner };
  }

  function redrawFire(f) {
    if (!f.layers) return;
    Object.values(f.layers).forEach(layer => map.removeLayer(layer));
    f.layers = createFireLayers(f);
  }

  function shrinkFire(incidentId, factor = 0.65) {
    const f = fires[incidentId];
    if (!f) return;
    f.radius = Math.max(20, f.radius * factor);
    redrawFire(f);
    if (f.radius <= 30) {
      f.contained = true;
      FireOpsApp.toast(`✅ אירוע #${incidentId} מוכל`, 'success');
      FireOpsApp.logEvent('status', 3, `אירוע #${incidentId} סווג כמוכל אחרי פעולות כיבוי`);
      setTimeout(() => stopFireSpread(incidentId), 3000);
    }
  }

  function stopFireSpread(incidentId) {
    const f = fires[incidentId];
    if (!f) return;
    if (f.growthInterval) clearInterval(f.growthInterval);
    Object.values(f.layers || {}).forEach(layer => map.removeLayer(layer));
    delete fires[incidentId];
  }

  // === Vehicle AVL ===
  function dispatchVehicle(unit, fromLatLng, toLatLng, options = {}) {
    const id = unit.callsign + '_' + Date.now() + Math.random().toString(36).slice(2, 5);
    const duration = options.duration || 11000;
    const segments = 70;
    const stepMs = duration / segments;

    // Dashed route line (yellow, dispatch-style)
    const line = L.polyline([fromLatLng], {
      color: '#FFD23F', weight: 2.5, dashArray: '6, 8', opacity: 0.55,
      interactive: false, className: 'avl-path'
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div class="vehicle-marker"><div class="v-truck">🚒</div><div class="v-cs">${unit.callsign}</div></div>`,
      className: '', iconSize: [56, 42], iconAnchor: [28, 21]
    });
    const marker = L.marker(fromLatLng, { icon, zIndexOffset: 600 }).addTo(map);

    let step = 0;
    const trail = [fromLatLng];
    const interval = setInterval(() => {
      step++;
      const t = step / segments;
      const lat = fromLatLng[0] + (toLatLng[0] - fromLatLng[0]) * t;
      const lng = fromLatLng[1] + (toLatLng[1] - fromLatLng[1]) * t;
      marker.setLatLng([lat, lng]);
      trail.push([lat, lng]);
      line.setLatLngs(trail);

      if (step >= segments) {
        clearInterval(interval);
        FireOpsApp.logEvent('status', 3, `${unit.callsign} הגיע ליעד`);
        FireOpsSounds.unitAcknowledge();
        // Fade route after few seconds
        let fadeStep = 0;
        const fadeInt = setInterval(() => {
          fadeStep++;
          line.setStyle({ opacity: Math.max(0, 0.55 - fadeStep * 0.07) });
          if (fadeStep > 8) { clearInterval(fadeInt); map.removeLayer(line); }
        }, 200);
        if (options.onArrive) options.onArrive();
      }
    }, stepMs);

    vehicles[id] = { marker, line, interval };
    return id;
  }

  // === Aircraft dispatch ===
  function dispatchAircraft(callsign, type, targetLat, targetLng, options = {}) {
    const base = CONFIG.AIRBASES[0];
    const id = callsign + '_' + Date.now();
    const aircraftType = CONFIG.AIRCRAFT_TYPES.find(t => t.key === type) || CONFIG.AIRCRAFT_TYPES[0];

    // Bezier curve: control point biased perpendicular for nice arc
    const dLat = targetLat - base.lat;
    const dLng = targetLng - base.lng;
    const midLat = (base.lat + targetLat) / 2 + Math.abs(dLng) * 0.3;
    const midLng = (base.lng + targetLng) / 2 - Math.abs(dLat) * 0.3;

    const segments = 90;
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const lat = (1 - t) * (1 - t) * base.lat + 2 * (1 - t) * t * midLat + t * t * targetLat;
      const lng = (1 - t) * (1 - t) * base.lng + 2 * (1 - t) * t * midLng + t * t * targetLng;
      points.push([lat, lng]);
    }

    // Flight path line
    const line = L.polyline(points, {
      color: '#00D4FF', weight: 2, dashArray: '12, 8', opacity: 0.55,
      interactive: false, className: 'aircraft-path'
    }).addTo(map);

    const icon = L.divIcon({
      html: `<div class="aircraft-marker"><div class="a-icon">${aircraftType.icon}</div><div class="a-cs">${callsign}</div></div>`,
      className: '', iconSize: [60, 48], iconAnchor: [30, 24]
    });
    const marker = L.marker(points[0], { icon, zIndexOffset: 1200 }).addTo(map);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= points.length) {
        clearInterval(interval);
        animateWaterDrop(targetLat, targetLng, aircraftType);
        FireOpsApp.logEvent('dispatch', 2, `${callsign} (${aircraftType.name_he}) ביצע צניחת מים על היעד (${aircraftType.capacity_l}L)`);
        if (options.onTarget) options.onTarget();
        setTimeout(() => returnAircraft(id, marker, line, points), 1600);
        return;
      }
      marker.setLatLng(points[step]);
    }, 85);

    aircraft[id] = { marker, line, interval };
    return id;
  }

  function returnAircraft(id, marker, line, outboundPoints) {
    line.setStyle({ color: '#8A93A6', opacity: 0.3 });
    const returnPoints = [...outboundPoints].reverse();
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= returnPoints.length) {
        clearInterval(interval);
        map.removeLayer(marker);
        map.removeLayer(line);
        delete aircraft[id];
        return;
      }
      marker.setLatLng(returnPoints[step]);
    }, 60);
  }

  function animateWaterDrop(lat, lng, aircraftType) {
    FireOpsSounds.criticalAlert();
    const ring = L.circle([lat, lng], {
      radius: 30, color: '#00D4FF', fillColor: '#66E6FF', fillOpacity: 0.45,
      weight: 3, interactive: false, className: 'water-drop-ring'
    }).addTo(map);

    let r = 30;
    const interval = setInterval(() => {
      r += 28;
      ring.setRadius(r);
      ring.setStyle({
        fillOpacity: Math.max(0, 0.45 - r / 800),
        opacity: Math.max(0, 1 - r / 450)
      });
      if (r > 400) {
        clearInterval(interval);
        map.removeLayer(ring);
      }
    }, 50);

    // Find nearest active fire & shrink it
    let nearestId = null;
    let nearestDist = Infinity;
    Object.entries(fires).forEach(([id, f]) => {
      const d = distanceMeters(lat, lng, f.lat, f.lng);
      if (d < nearestDist) { nearestDist = d; nearestId = id; }
    });
    if (nearestId && nearestDist < 500) {
      const shrinkFactor = aircraftType.capacity_l > 5000 ? 0.45 : 0.7;
      setTimeout(() => shrinkFire(nearestId, shrinkFactor), 900);
    }
  }

  function dispatchAirSupport(incident, level = 'standard') {
    if (!incident) {
      FireOpsApp.toast('⚠ אין אירוע פעיל להזנקה', 'warning');
      return;
    }
    const configs = {
      standard: [
        { cs: 'אווירון-1', type: 'at802',   delay: 600 },
        { cs: 'אווירון-2', type: 'at802',   delay: 5500 }
      ],
      heavy: [
        { cs: 'אווירון-1', type: 'at802',   delay: 400 },
        { cs: 'אווירון-2', type: 'at802',   delay: 3500 },
        { cs: 'מסוק-1',    type: 'bell412', delay: 7000 },
        { cs: 'CL-415',    type: 'cl415',   delay: 11000 }
      ]
    };
    const fleet = configs[level] || configs.standard;
    FireOpsApp.toast(`✈️ הזנקה: ${fleet.length} מטוסים מבסיס מגידו · אירוע #${incident.id}`, 'success');
    FireOpsApp.logEvent('dispatch', 1, `הזנקת ${fleet.length} מטוסי כיבוי לאירוע #${incident.id} (${incident.type})`);
    fleet.forEach(item => {
      setTimeout(() => {
        dispatchAircraft(item.cs, item.type, incident.lat, incident.lng);
      }, item.delay);
    });
  }

  return {
    setMap,
    setWind,
    cycleWind,
    startFireSpread,
    stopFireSpread,
    shrinkFire,
    dispatchVehicle,
    dispatchAircraft,
    dispatchAirSupport,
    getActiveFires: () => fires
  };
})();
