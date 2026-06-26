/* =========================================================
   easter-egg.js — Konami code → Debug Mode.
   ↑↑↓↓←→←→ B A  toggles:
     • FPS counter (top-right)
     • outlined bounding boxes on interactive zones
     • a toast notification
   Press the code again to deactivate. Honors reduced-motion
   (still works; FPS loop is lightweight).
   ========================================================= */
(function () {
  'use strict';
  const SEQ = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0, active = false, raf = null, fpsEl = null;

  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = (k === SEQ[pos]) ? pos + 1 : (k === SEQ[0] ? 1 : 0);
    if (pos === SEQ.length) { pos = 0; toggle(); }
  });

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'dbg-toast'; t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
  }

  function fpsLoop() {
    let last = performance.now(), frames = 0, acc = 0;
    function f(now) {
      frames++; acc += now - last; last = now;
      if (acc >= 500) { if (fpsEl) fpsEl.textContent = 'FPS ' + Math.round((frames * 1000) / acc); frames = 0; acc = 0; }
      raf = requestAnimationFrame(f);
    }
    raf = requestAnimationFrame(f);
  }

  function toggle() {
    active = !active;
    document.body.classList.toggle('debug-mode', active);
    if (active) {
      fpsEl = document.createElement('div');
      fpsEl.className = 'dbg-fps'; fpsEl.textContent = 'FPS —';
      document.body.appendChild(fpsEl);
      fpsLoop();
      toast('DEBUG MODE ACTIVE — Welcome, fellow engineer 🔧');
    } else {
      if (raf) cancelAnimationFrame(raf);
      if (fpsEl) { fpsEl.remove(); fpsEl = null; }
      toast('DEBUG MODE OFF');
    }
  }
})();
