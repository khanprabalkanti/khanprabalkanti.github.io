/* =========================================================
   sound.js — optional Web Audio SFX (OFF by default).
   Toggle via #sound-toggle (speaker icon in the nav).
   Oscillator-generated tones < 100ms, no external files.
   Exposes window.Lab.sound.play(name) and reacts to:
     • clicks on lab controls  → "click"
     • window 'lab:connect'    → "bwoop"
     • window 'lab:toggle'     → "tick"
   ========================================================= */
(function () {
  'use strict';
  window.Lab = window.Lab || { _m: {}, register(n, f) { this._m[n] = f; } };

  let ctx = null, enabled = false;
  const btn = document.getElementById('sound-toggle');

  function ac() {
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
    return ctx;
  }

  // tone: {type, f0, f1, dur, gain}
  function tone(o) {
    if (!enabled) return;
    const c = ac(); if (!c) return;
    if (c.state === 'suspended') c.resume();
    const t = c.currentTime, dur = (o.dur || 60) / 1000;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.06, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  const SFX = {
    click: () => tone({ type: 'square', f0: 320, dur: 35, gain: 0.05 }),
    tick:  () => tone({ type: 'square', f0: 880, dur: 30, gain: 0.04 }),
    bwoop: () => tone({ type: 'sine', f0: 240, f1: 760, dur: 95, gain: 0.07 }),
    relay: () => tone({ type: 'square', f0: 160, dur: 45, gain: 0.05 }),
  };

  window.Lab.sound = {
    get enabled() { return enabled; },
    play(name) { (SFX[name] || SFX.click)(); },
    toggle() { setEnabled(!enabled); },
  };

  function setEnabled(on) {
    enabled = on;
    if (on) { const c = ac(); if (c && c.state === 'suspended') c.resume(); }
    if (btn) {
      btn.textContent = on ? '🔊' : '🔇';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = 'Sound: ' + (on ? 'on' : 'off');
      btn.classList.toggle('on', on);
    }
    if (on) SFX.bwoop();
  }

  if (btn) btn.addEventListener('click', () => setEnabled(!enabled));

  // delegated UI sounds (only fire when enabled)
  document.addEventListener('click', (e) => {
    if (!enabled) return;
    const t = e.target.closest('.gbit, .gtool, .gport, .seg__b, .i2cpin, .sr__btn, .btn, .nav__links a, .gpad, .apin');
    if (t) SFX.click();
  }, true);

  window.addEventListener('lab:connect', () => SFX.bwoop());
  window.addEventListener('lab:toggle', () => SFX.tick());
})();
