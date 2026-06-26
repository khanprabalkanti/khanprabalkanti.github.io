/* =========================================================
   uart.js — About section as a UART serial link.
   Registers 'uart'. On activate: streams a bio into the
   serial monitor (#serial-out) as if received @115200 baud,
   while data bits travel along the TX→RX wire (#uart-bits).
   ========================================================= */
(function () {
  'use strict';
  window.Lab = window.Lab || { _m: {}, register(n, f) { this._m[n] = f; } };

  const LINES = [
    { p: '$ ', t: 'open /dev/ttyUSB0 115200 8N1', c: 'pfx' },
    { p: '', t: '' },
    { p: 'RX ', t: 'identity = "Prabal Kanti Khan"', hl: 'Prabal Kanti Khan' },
    { p: 'RX ', t: 'B.Tech ECE @ Heritage Institute of Technology (2026).' },
    { p: 'RX ', t: 'I build complete IoT & embedded systems — from circuit' },
    { p: '   ', t: 'design and bare-metal firmware to cloud dashboards.' },
    { p: '', t: '' },
    { p: 'RX ', t: 'I take projects from schematic to silicon: designing' },
    { p: '   ', t: 'circuits, writing register-level STM32 firmware, and' },
    { p: '   ', t: 'troubleshooting hardware with a multimeter & scope.' },
    { p: '', t: '' },
    { p: 'RX ', t: 'Mentored 500+ students in electronics @ STEMROBO.', hl: '500+' },
    { p: 'RX ', t: 'I document builds on YouTube → @TechanicZ', hl: '@TechanicZ' },
    { p: '', t: '' },
    { p: '$ ', t: 'status: open to Embedded · IoT · Firmware · Hardware', c: 'pfx' },
    { p: '$ ', t: 'EOT — checksum OK ✓', c: 'pfx' },
  ];

  window.Lab.register('uart', function (_section, opts) {
    const reduce = opts && opts.reduce;
    const out = document.getElementById('serial-out');
    const wire = document.getElementById('uart-bits');
    const status = document.getElementById('serial-status');
    if (!out) return;

    // traveling bits on the wire
    function startBits() {
      if (!wire || reduce) return;
      function emit() {
        const b = document.createElement('span');
        b.className = 'uart__bit';
        b.textContent = Math.random() > .5 ? '1' : '0';
        b.style.left = '0%';
        wire.appendChild(b);
        const dur = 900 + Math.random() * 500;
        const start = performance.now();
        (function move(now) {
          const k = Math.min((now - start) / dur, 1);
          b.style.left = (k * 100) + '%';
          b.style.opacity = k > .9 ? String((1 - k) * 10) : '1';
          if (k < 1) requestAnimationFrame(move); else b.remove();
        })(start);
      }
      const iv = setInterval(emit, 260);
      // stop emitting once the transfer is done
      setTimeout(() => clearInterval(iv), LINES.length * 230 + 1200);
    }

    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
    function render(line) {
      let html = '';
      if (line.p) html += `<span class="pfx">${esc(line.p)}</span>`;
      let body = esc(line.t);
      if (line.hl) body = body.replace(esc(line.hl), `<span class="hl">${esc(line.hl)}</span>`);
      html += body;
      return html + '\n';
    }

    if (reduce) { out.innerHTML = LINES.map(render).join(''); if (status) status.textContent = '● DONE'; return; }

    startBits();
    let i = 0;
    if (status) status.textContent = '● RECEIVING';
    (function next() {
      if (i >= LINES.length) { if (status) status.textContent = '● DONE ✓'; return; }
      out.innerHTML += render(LINES[i]); i++;
      out.scrollTop = out.scrollHeight;
      setTimeout(next, 180 + Math.random() * 160);
    })();
  });
})();
