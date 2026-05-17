/* ============================================================
   FireOps — Training Module
   Matrix: firefighters × certifications × expiry status
   ============================================================ */

window.FireOpsTraining = (function() {

  let initialized = false;

  const CERT_TYPES = [
    { key: 'ff1',      name_he: 'כבאי בסיס' },
    { key: 'ff2',      name_he: 'כבאי מתקדם' },
    { key: 'driver',   name_he: 'נהג-מפעיל' },
    { key: 'hazmat',   name_he: 'חומ"ס' },
    { key: 'rescue',   name_he: 'חילוץ' },
    { key: 'ladders',  name_he: 'סולמות' },
    { key: 'scba',     name_he: 'SCBA' },
    { key: 'emt',      name_he: 'חובש כיבוי' },
    { key: 'officer',  name_he: 'קצינות' }
  ];

  function init() {
    if (!FireOpsState.trainings || FireOpsState.trainings.length === 0) {
      seedDemo();
    }
    if (!initialized) {
      initialized = true;
      buildShell();
    }
    render();
  }

  function seedDemo() {
    const ffs = FireOpsState.firefighters || [];
    const records = [];
    const now = new Date();
    ffs.forEach(f => {
      // each firefighter gets 3-6 random certs
      const count = 3 + Math.floor(Math.random()*4);
      const shuffled = [...CERT_TYPES].sort(() => Math.random() - 0.5).slice(0, count);
      shuffled.forEach(c => {
        // random expiry: -200 days to +800 days from today
        const daysOffset = -200 + Math.floor(Math.random()*1000);
        const expiry = new Date(now);
        expiry.setDate(expiry.getDate() + daysOffset);
        const issued = new Date(expiry);
        issued.setFullYear(issued.getFullYear() - 2);
        records.push({
          id: FireOpsApp.uid('cert'),
          firefighter_id: f.id,
          cert_key: c.key,
          issued: issued.toISOString().slice(0,10),
          expires: expiry.toISOString().slice(0,10),
          cert_number: 'C-' + Math.floor(Math.random()*900000+100000)
        });
      });
    });
    FireOpsState.trainings = records;
    FireOpsApp.saveState();
  }

  function buildShell() {
    const page = document.getElementById('page-training');
    page.innerHTML = `
      <div class="module-page glass">
        <div class="module-header">
          <span class="module-icon">🏅</span>
          <div>
            אימוני לוחמי אש
            <div class="subtitle" id="tr-subtitle">--</div>
          </div>
          <div class="actions">
            <span class="tag tag-green">תקף</span>
            <span class="tag tag-yellow">פג בקרוב</span>
            <span class="tag tag-red">פג</span>
          </div>
        </div>
        <div class="module-body" id="tr-grid"></div>
      </div>
    `;
  }

  function daysUntil(dateStr) {
    const d = new Date(dateStr);
    return Math.floor((d.getTime() - Date.now()) / (1000*60*60*24));
  }

  function certClass(rec) {
    if (!rec) return 'cert-missing';
    const days = daysUntil(rec.expires);
    if (days < 0) return 'cert-expired';
    if (days < 60) return 'cert-expiring';
    return 'cert-valid';
  }

  function getFirefighters() {
    const sid = FireOpsApp.getCurrentStation()?.id;
    return (FireOpsState.firefighters || []).filter(f => f.station_id === sid && f.status !== 'inactive');
  }

  function render() {
    const grid = document.getElementById('tr-grid');
    if (!grid) return;
    const ffs = getFirefighters();
    const allTrainings = FireOpsState.trainings || [];

    const stats = { valid: 0, expiring: 0, expired: 0, missing: 0 };
    ffs.forEach(f => {
      CERT_TYPES.forEach(c => {
        const rec = allTrainings.find(t => t.firefighter_id === f.id && t.cert_key === c.key);
        if (!rec) stats.missing++;
        else {
          const cls = certClass(rec);
          if (cls === 'cert-valid') stats.valid++;
          else if (cls === 'cert-expiring') stats.expiring++;
          else stats.expired++;
        }
      });
    });

    const sub = document.getElementById('tr-subtitle');
    if (sub) sub.textContent = `${ffs.length} כבאים · ${CERT_TYPES.length} סיווגים · ${stats.valid} תקפים · ${stats.expiring} פגים בקרוב · ${stats.expired} פגי תוקף`;

    if (ffs.length === 0) {
      grid.innerHTML = `<div class="empty-state"><span class="empty-icon">🏅</span><div class="empty-title">אין כבאים בתחנה</div><div>צריך להוסיף כבאים תחת מודול "כבאים"</div></div>`;
      return;
    }

    grid.innerHTML = `<div class="matrix-wrap"><table class="matrix-table">
      <thead>
        <tr>
          <th>כבאי</th>
          ${CERT_TYPES.map(c => `<th>${c.name_he}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${ffs.map(f => `
          <tr>
            <td>${f.name}<br><small style="color: var(--text-dim); font-weight: 400;">${f.rank}</small></td>
            ${CERT_TYPES.map(c => {
              const rec = allTrainings.find(t => t.firefighter_id === f.id && t.cert_key === c.key);
              const cls = certClass(rec);
              const txt = rec ? rec.expires : '—';
              return `<td class="${cls}" data-ff="${f.id}" data-cert="${c.key}">${txt}</td>`;
            }).join('')}
          </tr>`).join('')}
      </tbody>
    </table></div>`;

    grid.querySelectorAll('td[data-ff]').forEach(td => {
      td.addEventListener('click', () => openEditModal(td.dataset.ff, td.dataset.cert));
    });
  }

  function openEditModal(ffId, certKey) {
    const ff = FireOpsState.firefighters.find(f => f.id === ffId);
    const cert = CERT_TYPES.find(c => c.key === certKey);
    let rec = FireOpsState.trainings.find(t => t.firefighter_id === ffId && t.cert_key === certKey);
    const isNew = !rec;
    if (!rec) {
      rec = { id: FireOpsApp.uid('cert'), firefighter_id: ffId, cert_key: certKey, issued: '', expires: '', cert_number: '' };
    }

    const html = `
      <div class="modal-header">
        <h2>סיווג: ${cert.name_he}</h2>
        <p>${ff.name} · ${ff.rank}</p>
      </div>
      <div class="modal-body">
        <div class="form-row">
          <div>
            <label class="form-label">תאריך הוצאה</label>
            <input class="form-input" id="m-issued" type="date" value="${rec.issued}">
          </div>
          <div>
            <label class="form-label">תאריך פקיעה</label>
            <input class="form-input" id="m-expires" type="date" value="${rec.expires}">
          </div>
        </div>
        <label class="form-label">מספר תעודה</label>
        <input class="form-input" id="m-cert_number" value="${rec.cert_number}" placeholder="לדוגמה: C-12345">
      </div>
      <div class="modal-footer">
        ${!isNew ? '<button class="btn-danger" id="m-delete">🗑 מחק סיווג</button>' : ''}
        <button class="btn-ghost" id="m-cancel">ביטול</button>
        <button class="btn-primary" id="m-save">שמור</button>
      </div>
    `;

    FireOpsApp.openModal(html, {
      onMount: () => {
        document.getElementById('m-cancel').addEventListener('click', FireOpsApp.closeModal);
        document.getElementById('m-save').addEventListener('click', () => {
          const updated = {
            ...rec,
            issued: document.getElementById('m-issued').value,
            expires: document.getElementById('m-expires').value,
            cert_number: document.getElementById('m-cert_number').value.trim()
          };
          if (!updated.expires) { FireOpsApp.toast('⚠ נדרש תאריך פקיעה', 'warning'); return; }
          if (isNew) FireOpsState.trainings.push(updated);
          else {
            const idx = FireOpsState.trainings.findIndex(t => t.id === updated.id);
            FireOpsState.trainings[idx] = updated;
          }
          FireOpsApp.saveState();
          FireOpsApp.logEvent('personnel', 4, `סיווג ${cert.name_he} עודכן ל-${ff.name} (פקיעה: ${updated.expires})`);
          FireOpsApp.closeModal();
          FireOpsApp.toast('✓ סיווג נשמר', 'success');
          render();
        });
        const del = document.getElementById('m-delete');
        if (del) del.addEventListener('click', () => {
          if (!confirm(`למחוק את הסיווג של ${ff.name} ב-${cert.name_he}?`)) return;
          FireOpsState.trainings = FireOpsState.trainings.filter(t => t.id !== rec.id);
          FireOpsApp.saveState();
          FireOpsApp.closeModal();
          render();
        });
      }
    });
  }

  function onStationChange() { render(); }

  return { init, render, onStationChange };
})();
