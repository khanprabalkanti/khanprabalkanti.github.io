/* =========================================================
   preloader.js — firmware-flash style preloader.
   Shows "Initializing Lab Environment…" with scrolling hex
   addresses + a flash progress bar (~1.5s), then hides to
   reveal the breadboard intro gate beneath it.
   Skips instantly on prefers-reduced-motion or deep-links.
   ========================================================= */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.getElementById('preloader');
  if (!el) return;

  const hex = document.getElementById('pre-hex');
  const bar = document.getElementById('pre-bar');
  const pct = document.getElementById('pre-pct');
  const dots = document.getElementById('pre-dots');

  function done() {
    el.classList.add('done');
    setTimeout(() => { el.style.display = 'none'; }, 500);
  }

  const hash = location.hash;
  if (reduce || (hash && hash !== '#home')) { el.style.display = 'none'; return; }

  // animated dots
  let dn = 0;
  const dotTimer = setInterval(() => { dn = (dn + 1) % 4; if (dots) dots.textContent = '.'.repeat(dn); }, 300);

  const DUR = 1500, t0 = performance.now();
  const lines = [];
  function hx(n) { return '0x' + n.toString(16).toUpperCase().padStart(4, '0'); }

  (function tick(now) {
    const k = Math.min((now - t0) / DUR, 1);
    const addr = Math.floor(k * 0xFFFF);
    if (bar) bar.style.width = Math.round(k * 100) + '%';
    if (pct) pct.textContent = hx(addr);
    // scroll a few flash lines
    if (hex) {
      const base = Math.floor(addr / 0x40) * 0x40;
      lines.push('flash write ' + hx(base) + ' .. ' + hx(base + 0x3F) + '  [OK]');
      while (lines.length > 6) lines.shift();
      hex.textContent = lines.join('\n');
    }
    if (k < 1) requestAnimationFrame(tick);
    else { clearInterval(dotTimer); if (hex) hex.textContent += '\nverify ✓  jump 0x0000 → boot'; setTimeout(done, 250); }
  })(performance.now());
})();
