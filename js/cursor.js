/* =========================================================
   cursor.js — subtle "magnetic" effect for interactive
   elements on desktop (fine pointer + no reduced-motion).
   Elements shift 2–4px toward the cursor via transform.
   Disabled on touch devices. Excludes .pcard (it tilts).
   ========================================================= */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(pointer: fine)').matches;
  if (reduce || !fine) return;

  const SEL = '.btn, .gtool, .gport, .nav__cta, .ccard, .sr__btn, .i2cpin, .seg__b, #sound-toggle';
  const MAX = 4; // px

  function bind(el) {
    if (el.dataset.mag) return; el.dataset.mag = '1';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = ((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * MAX;
      const dy = ((e.clientY - (r.top + r.height / 2)) / (r.height / 2)) * MAX - 2;
      el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  }

  function scan() { document.querySelectorAll(SEL).forEach(bind); }
  scan();
  // re-scan once after dynamic modules build (gpio tools etc.)
  setTimeout(scan, 1500);
})();
