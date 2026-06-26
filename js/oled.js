/* =========================================================
   oled.js — I2C SSD1306 telemetry panel.
   Registers 'oled' (kept idle until SDA+SCL connected).
   Tap #pin-sda then #pin-scl to wire the bus; once both
   lines are up, the panel powers on and renders a live
   monochrome dashboard on #oled-canvas (256x128 backbuffer).
   ========================================================= */
(function () {
  'use strict';
  window.Lab = window.Lab || { _m: {}, register(n, f) { this._m[n] = f; } };

  window.Lab.register('oled', function (_section, opts) {
    const reduce = opts && opts.reduce;
    const oled = document.getElementById('oled');
    const canvas = document.getElementById('oled-canvas');
    const sda = document.getElementById('pin-sda');
    const scl = document.getElementById('pin-scl');
    const led = document.getElementById('oled-led');
    const state = document.getElementById('oled-state');
    const readout = document.getElementById('oled-readout');
    if (!oled || !canvas) return;

    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;          // 256 x 128 backbuffer
    const ON = '#22d3ee', DIM = 'rgba(34,211,238,.25)';
    let connected = { sda: false, scl: false }, powered = false, raf, t0 = Date.now();

    function setState(txt, ok) {
      if (state) state.textContent = txt;
      if (led) { led.classList.toggle('led--g', ok); led.classList.toggle('led--r', !ok); }
      if (readout) readout.classList.toggle('on', ok);
    }

    function tryPower() {
      if (powered) return;
      if (connected.sda && connected.scl) {
        powered = true;
        oled.classList.add('on');
        setState('ACK 0x3C — SSD1306 online', true);
        t0 = Date.now();
        if (reduce) drawFrame(); else loop();
      }
    }

    function pinClick(which, el) {
      return function () {
        if (connected[which]) return;
        connected[which] = true;
        el.classList.add('connected');
        const dot = el.querySelector('b'); if (dot) dot.textContent = '●';
        if (!powered) setState(connected.sda && connected.scl ? 'pull-ups OK — probing 0x3C…'
          : (which === 'sda' ? 'SDA high — now connect SCL' : 'SCL high — now connect SDA'), connected.sda && connected.scl);
        tryPower();
      };
    }
    if (sda) sda.addEventListener('click', pinClick('sda', sda));
    if (scl) scl.addEventListener('click', pinClick('scl', scl));

    // ---- tiny 3x5 pixel font for the OLED ----
    // bars helper: draw text using canvas font but crisp on the lo-res buffer
    function px(x, y, w, h, c) { ctx.fillStyle = c || ON; ctx.fillRect(x, y, w, h); }

    function drawFrame() {
      ctx.clearRect(0, 0, W, H);
      // frame
      ctx.strokeStyle = DIM; ctx.lineWidth = 2; ctx.strokeRect(3, 3, W - 6, H - 6);

      ctx.fillStyle = ON;
      ctx.textBaseline = 'top';
      // header
      ctx.font = '700 18px "JetBrains Mono", monospace';
      ctx.fillText('PRABAL · ECE', 12, 12);
      ctx.font = '400 12px "JetBrains Mono", monospace';
      ctx.fillStyle = DIM;
      ctx.fillText('SSD1306 0x3C', 12, 33);
      px(12, 50, W - 24, 1, DIM);

      // body lines
      ctx.fillStyle = ON;
      ctx.font = '400 13px "JetBrains Mono", monospace';
      const up = Math.floor((Date.now() - t0) / 1000);
      const hh = String(Math.floor(up / 3600)).padStart(2, '0');
      const mm = String(Math.floor(up / 60) % 60).padStart(2, '0');
      const ss = String(up % 60).padStart(2, '0');
      ctx.fillText('ROLE  Embedded/IoT', 12, 58);
      ctx.fillText('MCU   STM32 · ESP32', 12, 76);
      ctx.fillText('UPTIME ' + hh + ':' + mm + ':' + ss, 12, 94);

      // a little live waveform bottom-right
      const baseX = 150, baseY = 40, ww = 92, hh2 = 26;
      ctx.strokeStyle = ON; ctx.lineWidth = 1.5; ctx.beginPath();
      const ph = (Date.now() - t0) / 180;
      for (let i = 0; i <= ww; i++) {
        const y = baseY + hh2 / 2 + Math.sin(i / 7 + ph) * (hh2 / 2 - 2);
        i === 0 ? ctx.moveTo(baseX + i, y) : ctx.lineTo(baseX + i, y);
      }
      ctx.stroke();
      // signal bars
      for (let i = 0; i < 5; i++) {
        const on = ((Math.sin(ph + i) + 1) / 2) > .35;
        px(baseX + i * 12, 110 - i * 0, 8, 10, on ? ON : DIM);
      }
    }

    function loop() { drawFrame(); raf = requestAnimationFrame(loop); }

    // initial state text
    setState('BUS IDLE — SDA/SCL floating', false);

    // reduced motion: still let them connect, but draw a static frame
    if (reduce) { /* clicks still power it; drawFrame called once on power */ }
  });
})();
