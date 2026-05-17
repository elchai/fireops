/* ============================================================
   FireOps — Tactical Overlay
   Fire spread visualization · vehicle AVL · aircraft dispatch · wind
   All rendered on the Leaflet map passed in via setMap()
   ============================================================ */

window.FireOpsTactical = (function() {

  let map;
  const fires = {};
  const vehicles = {};
  const aircraft = {};
  let airbaseMarker = null;
  let windOverlayEl = null;

  // Wind state (math angle: 0=east, π/2=north counter-clockwise convention with sin=lat, cos=lng)
  let windAngleRad = Math.PI;
  let windStrength = 0.4;

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

  function bezier(p0, p1, p2, segments) {
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const lat = (1-t)*(1-t)*p0[0] + 2*(1-t)*t*p1[0] + t*t*p2[0];
      const lng = (1-t)*(1-t)*p0[1] + 2*(1-t)*t*p1[1] + t*t*p2[1];
      pts.push([lat, lng]);
    }
    return pts;
  }

  // Returns compass-degrees (0=N, positive clockwise) for heading from p1 to p2
  function calcHeadingDeg(p1, p2) {
    const dLat = p2[0] - p1[0];
    const dLng = p2[1] - p1[1];
    return Math.atan2(dLng, dLat) * 180 / Math.PI;
  }

  function getDemoSeconds(kind) {
    const s = (FireOpsState && FireOpsState.tactical_settings) || {};
    if (kind === 'aircraft') return s.aircraft_demo_seconds || 25;
    if (kind === 'ground')   return s.ground_demo_seconds   || 12;
    return 15;
  }

  // === Aircraft SVG shapes (point NORTH by default → rotate to heading) ===
  function planeSvg(colorPrimary, colorAccent) {
    return `<svg viewBox="-12 -12 24 24" width="28" height="28" class="a-shape" style="overflow:visible;display:block;">
      <path d="M0,-11 L-1.5,3 L-9,5 L-9,7 L-1.5,5 L-1.5,9 L-3,11 L3,11 L1.5,9 L1.5,5 L9,7 L9,5 L1.5,3 Z"
            fill="${colorPrimary}" stroke="#001a26" stroke-width="0.6"/>
      <path d="M0,-11 L-1,-1 L1,-1 Z" fill="${colorAccent}" opacity="0.7"/>
    </svg>`;
  }

  function heloSvg(colorPrimary) {
    return `<svg viewBox="-12 -12 24 24" width="28" height="28" class="a-shape" style="overflow:visible;display:block;">
      <rect x="-11" y="-1.8" width="22" height="0.7" fill="#66E6FF" opacity="0.7"/>
      <rect x="-11" y="-1.8" width="22" height="0.7" fill="#66E6FF" opacity="0.7" transform="rotate(60)"/>
      <rect x="-11" y="-1.8" width="22" height="0.7" fill="#66E6FF" opacity="0.7" transform="rotate(-60)"/>
      <ellipse cx="0" cy="-1" rx="3.5" ry="6" fill="${colorPrimary}" stroke="#001a26" stroke-width="0.6"/>
      <rect x="-0.5" y="5" width="1" height="6" fill="${colorPrimary}"/>
      <polygon points="-2.5,10 2.5,10 0,12" fill="${colorPrimary}"/>
      <circle cx="0" cy="-3" r="1.2" fill="#001a26" opacity="0.5"/>
    </svg>`;
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
      <div style="color: #00D4FF; font-weight: 700; font-size: 14px;">✈ ${base.name}</div>
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
    windOverlayEl.addEventListener('click', () => cycleWind());
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
      lat: incident.lat, lng: incident.lng,
      radius: 40, maxRadius: 380, growthRate: 5,
      layers: null, growthInterval: null, contained: false
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
    const duration = options.duration || (getDemoSeconds('ground') * 1000);
    const segments = 70;
    const stepMs = duration / segments;

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

  // === Aircraft path: approach → overshoot → bank turn → return ===
  function buildAircraftPath(base, target) {
    const B = [base.lat, base.lng];
    const T = [target[0], target[1]];

    // Phase 1: approach (base → target) — bezier arc
    const dLatA = T[0] - B[0];
    const dLngA = T[1] - B[1];
    const approachMid = [
      (B[0] + T[0]) / 2 + dLngA * 0.25,
      (B[1] + T[1]) / 2 - dLatA * 0.25
    ];
    const approach = bezier(B, approachMid, T, 70);

    // Tangent at target = direction of motion when crossing the drop point
    const tDx = T[0] - approachMid[0];
    const tDy = T[1] - approachMid[1];
    const tLen = Math.hypot(tDx, tDy) || 1;
    const dir = [tDx / tLen, tDy / tLen];

    // Phase 2: overshoot ~3km in same direction, then bank turn 90deg
    const overshootDeg = 0.025;
    const overshoot = [T[0] + dir[0] * overshootDeg, T[1] + dir[1] * overshootDeg];
    const perp = [-dir[1], dir[0]]; // 90deg clockwise of flight direction
    const turnEnd = [overshoot[0] + perp[0] * 0.025, overshoot[1] + perp[1] * 0.025];
    const turn = bezier(T, overshoot, turnEnd, 30);

    // Phase 3: return (turnEnd → base) with mirrored control point to avoid overlap
    const dLatR = B[0] - turnEnd[0];
    const dLngR = B[1] - turnEnd[1];
    const returnMid = [
      (turnEnd[0] + B[0]) / 2 - dLngR * 0.25,
      (turnEnd[1] + B[1]) / 2 + dLatR * 0.25
    ];
    const returnPath = bezier(turnEnd, returnMid, B, 65);

    return {
      points: [...approach, ...turn, ...returnPath],
      targetIdx: approach.length - 1
    };
  }

  function dispatchAircraft(callsign, type, targetLat, targetLng, options = {}) {
    const base = CONFIG.AIRBASES[0];
    const id = callsign + '_' + Date.now();
    const aircraftType = CONFIG.AIRCRAFT_TYPES.find(t => t.key === type) || CONFIG.AIRCRAFT_TYPES[0];

    const { points, targetIdx } = buildAircraftPath(base, [targetLat, targetLng]);

    // Compute real flight times for transparency
    const distKm = distanceMeters(base.lat, base.lng, targetLat, targetLng) / 1000;
    const realOneWayMin = (distKm / aircraftType.speed_kmh) * 60;
    const realFullMin = realOneWayMin * 2.4; // approach + drop + continue + return estimate
    const demoSecs = options.duration ? (options.duration / 1000) : getDemoSeconds('aircraft');
    FireOpsApp.logEvent('dispatch', 4,
      `${callsign} · מרחק ${distKm.toFixed(1)} ק"מ · ריאלי ${realFullMin.toFixed(1)} דק' · הדגמה ${demoSecs.toFixed(0)}s`);

    // Approach trail (bright cyan, full path visible from start)
    const approachTrail = L.polyline(points.slice(0, targetIdx + 1), {
      color: '#00D4FF', weight: 2.5, dashArray: '10, 6', opacity: 0.55,
      interactive: false, className: 'aircraft-path'
    }).addTo(map);

    // Return trail (built incrementally as plane flies past target, dimmer)
    const returnTrail = L.polyline([], {
      color: '#5a8a99', weight: 2, dashArray: '6, 8', opacity: 0.45,
      interactive: false, className: 'aircraft-path-return'
    }).addTo(map);

    // Aircraft marker (SVG that we rotate each tick)
    const shape = aircraftType.icon === '🚁' ? heloSvg('#00D4FF') : planeSvg('#00D4FF', '#66E6FF');
    const icon = L.divIcon({
      html: `<div class="aircraft-marker"><div class="a-icon">${shape}</div><div class="a-cs">${callsign}</div></div>`,
      className: '', iconSize: [60, 56], iconAnchor: [30, 28]
    });
    const marker = L.marker(points[0], { icon, zIndexOffset: 1200 }).addTo(map);

    let step = 0;
    let dropped = false;
    const stepMs = (demoSecs * 1000) / points.length;

    function rotateMarker() {
      const next = points[Math.min(step + 1, points.length - 1)];
      const cur = points[step];
      if (!next || (cur[0] === next[0] && cur[1] === next[1])) return;
      const heading = calcHeadingDeg(cur, next);
      const el = marker.getElement()?.querySelector('.a-shape');
      if (el) el.style.transform = `rotate(${heading}deg)`;
    }

    // initial orientation
    setTimeout(rotateMarker, 30);

    const interval = setInterval(() => {
      if (step >= points.length - 1) {
        clearInterval(interval);
        // Fade trails and remove marker
        let fadeStep = 0;
        const fadeInt = setInterval(() => {
          fadeStep++;
          approachTrail.setStyle({ opacity: Math.max(0, 0.55 - fadeStep * 0.06) });
          returnTrail.setStyle({ opacity: Math.max(0, 0.45 - fadeStep * 0.05) });
          if (fadeStep > 9) {
            clearInterval(fadeInt);
            map.removeLayer(approachTrail);
            map.removeLayer(returnTrail);
            map.removeLayer(marker);
            delete aircraft[id];
          }
        }, 180);
        return;
      }
      step++;
      marker.setLatLng(points[step]);
      rotateMarker();

      // Build return trail incrementally after passing target
      if (step >= targetIdx) {
        const rt = returnTrail.getLatLngs();
        rt.push(points[step]);
        returnTrail.setLatLngs(rt);
      }

      // Drop water exactly at target
      if (step === targetIdx && !dropped) {
        dropped = true;
        animateWaterDrop(targetLat, targetLng, aircraftType);
        FireOpsApp.logEvent('dispatch', 2, `${callsign} (${aircraftType.name_he}) — צניחת מים על היעד (${aircraftType.capacity_l}L)`);
        if (options.onTarget) options.onTarget();
      }
    }, stepMs);

    aircraft[id] = { marker, approachTrail, returnTrail, interval };
    return id;
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
      setTimeout(() => dispatchAircraft(item.cs, item.type, incident.lat, incident.lng), item.delay);
    });
  }

  // === Public API for settings UI ===
  function getRealFlightTime(targetLat, targetLng, aircraftKey = 'at802') {
    const base = CONFIG.AIRBASES[0];
    const at = CONFIG.AIRCRAFT_TYPES.find(t => t.key === aircraftKey) || CONFIG.AIRCRAFT_TYPES[0];
    const distKm = distanceMeters(base.lat, base.lng, targetLat, targetLng) / 1000;
    const oneWayMin = (distKm / at.speed_kmh) * 60;
    return { distKm, oneWayMin, fullTripMin: oneWayMin * 2.4, aircraftName: at.name_he, speed: at.speed_kmh };
  }

  return {
    setMap, setWind, cycleWind,
    startFireSpread, stopFireSpread, shrinkFire,
    dispatchVehicle, dispatchAircraft, dispatchAirSupport,
    getActiveFires: () => fires,
    getRealFlightTime
  };
})();
