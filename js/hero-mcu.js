/* =========================================================
   hero-mcu.js — STM32 chip with a live clock tree.
   Registers Lab module 'mcu' (started after boot/hero).
   Draws an IC package, gold pins, a pulsing core and
   radiating clock lines whose energy syncs to SYSCLK.
   ========================================================= */
(function () {
  'use strict';
  window.Lab = window.Lab || { _m: {}, register(n, f) { this._m[n] = f; } };

  window.Lab.register('mcu', function (_section, opts) {
    const reduce = opts && opts.reduce;
    const canvas = document.getElementById('mcu-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, dpr, cx, cy, S, t = 0, raf;

    const CYAN = '#22d3ee', CYAN_D = '#0891b2', GREEN = '#34d399', GOLD = '#d9a441', INK = '#0c1322';

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width || 360; h = r.height || 360;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = w / 2; cy = h / 2; S = Math.min(w, h) * 0.42;
    }

    function roundRect(x, y, rw, rh, rad) {
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + rw, y, x + rw, y + rh, rad);
      ctx.arcTo(x + rw, y + rh, x, y + rh, rad);
      ctx.arcTo(x, y + rh, x, y, rad);
      ctx.arcTo(x, y, x + rw, y, rad);
      ctx.closePath();
    }

    function pins() {
      const n = 7, span = S * 1.5, step = span / (n - 1), len = S * 0.22, gap = S * 0.86;
      ctx.lineWidth = Math.max(2, S * 0.05);
      ctx.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const off = -span / 2 + i * step;
        const energ = (Math.sin(t * 0.06 + i) + 1) / 2;
        ctx.strokeStyle = `rgba(217,164,65,${0.5 + energ * 0.5})`;
        // top & bottom
        ctx.beginPath(); ctx.moveTo(cx + off, cy - gap); ctx.lineTo(cx + off, cy - gap - len); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + off, cy + gap); ctx.lineTo(cx + off, cy + gap + len); ctx.stroke();
        // left & right
        ctx.beginPath(); ctx.moveTo(cx - gap, cy + off); ctx.lineTo(cx - gap - len, cy + off); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + gap, cy + off); ctx.lineTo(cx + gap + len, cy + off); ctx.stroke();
      }
    }

    function clockTree() {
      // radiating clock distribution lines from core
      const branches = 8;
      for (let i = 0; i < branches; i++) {
        const ang = (i / branches) * Math.PI * 2 + t * 0.004;
        const r1 = S * 0.18, r2 = S * 0.62;
        const x1 = cx + Math.cos(ang) * r1, y1 = cy + Math.sin(ang) * r1;
        const x2 = cx + Math.cos(ang) * r2, y2 = cy + Math.sin(ang) * r2;
        ctx.strokeStyle = 'rgba(34,211,238,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        // clock pulse travelling outward
        const phase = ((t * 0.02 + i / branches) % 1);
        const px = x1 + (x2 - x1) * phase, py = y1 + (y2 - y1) * phase;
        ctx.fillStyle = CYAN;
        ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 7); ctx.fill();
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      clockTree();

      // package body
      const half = S * 0.86;
      ctx.save();
      const grad = ctx.createLinearGradient(cx - half, cy - half, cx + half, cy + half);
      grad.addColorStop(0, '#0d1830'); grad.addColorStop(1, '#070d18');
      pins();
      roundRect(cx - half, cy - half, half * 2, half * 2, S * 0.12);
      ctx.fillStyle = grad; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(34,211,238,0.35)'; ctx.stroke();

      // pin-1 dot
      ctx.fillStyle = CYAN; ctx.beginPath(); ctx.arc(cx - half * 0.7, cy - half * 0.7, S * 0.045, 0, 7); ctx.fill();

      // core die
      const breathe = reduce ? 0 : Math.sin(t * 0.05) * S * 0.02;
      const cr = S * 0.34 + breathe;
      roundRect(cx - cr, cy - cr, cr * 2, cr * 2, S * 0.07);
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 1.4);
      cg.addColorStop(0, 'rgba(34,211,238,0.22)'); cg.addColorStop(1, 'rgba(8,145,178,0.04)');
      ctx.fillStyle = cg; ctx.fill();
      ctx.strokeStyle = CYAN_D; ctx.lineWidth = 1; ctx.stroke();

      // labels
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = CYAN;
      ctx.font = `700 ${S * 0.17}px Orbitron, sans-serif`;
      ctx.fillText('STM32', cx, cy - S * 0.06);
      ctx.fillStyle = '#7f93b6';
      ctx.font = `500 ${S * 0.08}px 'JetBrains Mono', monospace`;
      ctx.fillText('F446RE', cx, cy + S * 0.1);

      // running clock dot
      ctx.fillStyle = GREEN;
      ctx.beginPath(); ctx.arc(cx + S * 0.5, cy - S * 0.5, S * 0.04, 0, 7); ctx.fill();
      ctx.restore();
    }

    function loop() { t += 1; draw(); raf = requestAnimationFrame(loop); }

    resize();
    window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); if (reduce) draw(); else loop(); });
    if (reduce) draw(); else loop();
  });
})();
