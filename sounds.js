/* ============================================================
   FireOps — Web Audio Sound Effects
   All sounds synthesized in-browser (no MP3 downloads)
   Disabled by default — user toggles via topbar sound button
   ============================================================ */

window.FireOpsSounds = (function() {
  let ctx;
  let enabled = false;
  const PREF_KEY = 'fireOpsSoundEnabled_v1';

  function loadPref() {
    try { enabled = localStorage.getItem(PREF_KEY) === '1'; }
    catch (e) { enabled = false; }
  }

  function setEnabled(b) {
    enabled = !!b;
    try { localStorage.setItem(PREF_KEY, enabled ? '1' : '0'); } catch (e) {}
  }

  function isEnabled() { return enabled; }

  function getCtx() {
    if (!enabled) return null;
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function incidentReceived() {
    const c = getCtx(); if (!c) return;
    const now = c.currentTime;

    const boom = c.createOscillator();
    const boomGain = c.createGain();
    boom.frequency.setValueAtTime(90, now);
    boom.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    boomGain.gain.setValueAtTime(0.45, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    boom.connect(boomGain).connect(c.destination);
    boom.start(now); boom.stop(now + 0.35);

    for (let i = 0; i < 3; i++) {
      const t = now + 0.4 + i * 0.16;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.frequency.value = 1300;
      osc.type = 'sine';
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(g).connect(c.destination);
      osc.start(t); osc.stop(t + 0.14);
    }
  }

  function unitAcknowledge() {
    const c = getCtx(); if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.12);
    osc.type = 'sine';
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g).connect(c.destination);
    osc.start(now); osc.stop(now + 0.15);
  }

  function uiClick() {
    const c = getCtx(); if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.value = 1800;
    osc.type = 'square';
    g.gain.setValueAtTime(0.06, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(g).connect(c.destination);
    osc.start(now); osc.stop(now + 0.04);
  }

  function criticalAlert() {
    const c = getCtx(); if (!c) return;
    const now = c.currentTime;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.linearRampToValueAtTime(900, now + 0.5);
    osc.frequency.linearRampToValueAtTime(400, now + 1.0);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.25, now + 0.1);
    g.gain.linearRampToValueAtTime(0.001, now + 1.0);
    osc.connect(g).connect(c.destination);
    osc.start(now); osc.stop(now + 1.0);
  }

  return {
    incidentReceived, unitAcknowledge, uiClick, criticalAlert,
    loadPref, setEnabled, isEnabled
  };
})();
