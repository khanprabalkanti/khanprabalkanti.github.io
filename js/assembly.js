/* =========================================================
   assembly.js — interactive breadboard build intro.
   Registers Lab module 'intro'. core.js calls it with a
   `done` callback (to enter the site) once the user has:
     1. dragged the ESP32 onto its breadboard slot
     2. dragged the 1.3" OLED onto its slot
     3. wired VCC, GND, SDA, SCL (guided, in order)
   …then firmware is "generated" + uploaded (~2s), the OLED
   prints "Hello, / Welcome!", and the display zooms to
   fullscreen before revealing the portfolio.
   ========================================================= */
(function () {
  'use strict';
  window.Lab = window.Lab || { _m: {}, register(n, f) { this._m[n] = f; } };

  window.Lab.register('intro', function (done, opts) {
    const reduce = opts && opts.reduce;
    const $ = (id) => document.getElementById(id);

    const asm = $('assembly'), svg = $('asm-svg');
    const stepEl = $('asm-step'), stepNo = $('asm-stepno'), bar = $('asm-bar');
    const esp = $('esp32'), oled = $('oled-comp');
    const ghostE = $('ghost-esp'), ghostO = $('ghost-oled');
    const wiresG = $('asm-wires');
    const skip = $('asm-skip');
    const consoleEl = $('asm-console'), codeEl = $('asm-code');
    const upWrap = $('asm-upload'), upBar = $('asm-upbar'), upTxt = $('asm-upload-txt');
    const zoom = $('oled-zoom');
    let finished = false;

    if (!asm || !svg) { done(); return; }

    function finish() {
      if (finished) return; finished = true;
      done();
    }
    if (skip) skip.addEventListener('click', finish);

    // reduced motion: don't force the puzzle — just enter.
    if (reduce) { finish(); return; }

    const TOTAL = 6;
    function setStep(n, txt) {
      if (stepNo) stepNo.textContent = n + ' / ' + TOTAL;
      if (stepEl) stepEl.innerHTML = txt;
      if (bar) bar.style.width = Math.round(((n - 1) / TOTAL) * 100) + '%';
    }

    /* ---------- SVG coordinate helper ---------- */
    function toSvg(evt) {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      const m = svg.getScreenCTM();
      return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 };
    }

    /* ---------- draggable component → snap to slot ---------- */
    function makeDraggable(group, startTx, startTy, onPlaced) {
      let tx = startTx, ty = startTy, dragging = false, sx = 0, sy = 0, otx = 0, oty = 0, placed = false;
      group.setAttribute('transform', `translate(${tx},${ty})`);
      group.classList.add('comp--draggable');

      function down(e) {
        if (placed) return;
        e.preventDefault();
        dragging = true; group.classList.add('grabbing');
        const p = toSvg(e); sx = p.x; sy = p.y; otx = tx; oty = ty;
        if (e.pointerId != null && group.setPointerCapture) { try { group.setPointerCapture(e.pointerId); } catch (_) {} }
      }
      function move(e) {
        if (!dragging) return;
        const p = toSvg(e);
        tx = otx + (p.x - sx); ty = oty + (p.y - sy);
        group.setAttribute('transform', `translate(${tx},${ty})`);
      }
      function up() {
        if (!dragging) return;
        dragging = false; group.classList.remove('grabbing');
        const dist = Math.hypot(tx, ty);
        if (dist < 70) {           // close enough → snap home
          placed = true;
          group.classList.remove('comp--draggable');
          group.classList.add('placed');
          // animate snap
          animateTo(group, tx, ty, 0, 0, () => { group.setAttribute('transform', 'translate(0,0)'); });
          onPlaced();
        } else {
          // ease back toward tray a touch (keep where dropped)
          group.setAttribute('transform', `translate(${tx},${ty})`);
        }
      }
      group.addEventListener('pointerdown', down);
      svg.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }
    function animateTo(group, x0, y0, x1, y1, end) {
      const t0 = performance.now(), dur = 320;
      (function f(now) {
        const k = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - k, 3);
        group.setAttribute('transform', `translate(${x0 + (x1 - x0) * e},${y0 + (y1 - y0) * e})`);
        if (k < 1) requestAnimationFrame(f); else end && end();
      })(performance.now());
    }

    /* ---------- wiring ---------- */
    // pin coords (final, group at identity)
    const PIN = {
      'e-3v3': [318, 150], 'e-gnd': [318, 200], 'e-g21': [318, 250], 'e-g22': [318, 300],
      'o-gnd': [566, 224], 'o-vcc': [602, 224], 'o-scl': [638, 224], 'o-sda': [674, 224],
    };
    const WIRES = [
      { a: 'o-vcc', b: 'e-3v3', color: '#fb7185', name: 'VCC → 3V3', hint: 'power' },
      { a: 'o-gnd', b: 'e-gnd', color: '#cbd5e1', name: 'GND → GND', hint: 'ground' },
      { a: 'o-sda', b: 'e-g21', color: '#38bdf8', name: 'SDA → G21', hint: 'I²C data' },
      { a: 'o-scl', b: 'e-g22', color: '#fbbf24', name: 'SCL → G22', hint: 'I²C clock' },
    ];
    let wireIdx = 0, tapped = null;

    function pinEl(id) { return svg.querySelector(`.apin[data-pin="${id}"]`); }

    function highlightWire() {
      svg.querySelectorAll('.apin').forEach(p => p.classList.remove('next', 'tapped'));
      if (wireIdx >= WIRES.length) return;
      const w = WIRES[wireIdx];
      pinEl(w.a).classList.add('next');
      pinEl(w.b).classList.add('next');
      setStep(3 + wireIdx,
        `Connect <b style="color:${w.color}">${w.name}</b> — tap the <b>${w.a.slice(2).toUpperCase()}</b> pin, then the matching ESP32 pin. <span class="asm__muted">(${w.hint})</span>`);
    }

    function drawWire(w) {
      const [ax, ay] = PIN[w.a], [bx, by] = PIN[w.b];
      const midY = Math.max(ay, by) + 60;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${ax} ${ay} C ${ax} ${midY}, ${bx} ${midY}, ${bx} ${by}`);
      path.setAttribute('class', 'asm-wire');
      path.setAttribute('stroke', w.color);
      wiresG.appendChild(path);
      // dash-draw animation
      const len = path.getTotalLength();
      path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
      requestAnimationFrame(() => { path.style.transition = 'stroke-dashoffset .5s ease'; path.style.strokeDashoffset = '0'; });
      pinEl(w.a).classList.add('wired'); pinEl(w.b).classList.add('wired');
    }

    function onPinTap(e) {
      const id = e.currentTarget.dataset.pin;
      if (wireIdx >= WIRES.length) return;
      const w = WIRES[wireIdx];
      if (id !== w.a && id !== w.b) { flashWrong(e.currentTarget); return; }
      if (tapped === null) {
        tapped = id; e.currentTarget.classList.add('tapped');
      } else if (tapped !== id) {
        // need the two endpoints of this wire
        const set = new Set([tapped, id]);
        if (set.has(w.a) && set.has(w.b)) {
          drawWire(w); tapped = null; wireIdx++;
          if (wireIdx >= WIRES.length) { startGenerate(); } else { highlightWire(); }
        } else { flashWrong(e.currentTarget); tapped = null; svg.querySelectorAll('.apin.tapped').forEach(p => p.classList.remove('tapped')); }
      }
    }
    function flashWrong(el) { el.classList.add('wrong'); setTimeout(() => el.classList.remove('wrong'), 320); }

    function enableWiring() {
      svg.querySelectorAll('.apin').forEach(p => { p.style.pointerEvents = 'auto'; p.addEventListener('click', onPinTap); });
      highlightWire();
    }

    /* ---------- placement flow ---------- */
    let espPlaced = false, oledPlaced = false;
    if (ghostO) ghostO.classList.add('ghost--idle');   // OLED slot dim until ESP placed

    makeDraggable(esp, -150, 52, () => {
      espPlaced = true;
      if (ghostE) ghostE.style.opacity = '0';
      if (ghostO) ghostO.classList.remove('ghost--idle');
      setStep(2, 'Nice. Now drag the <b>1.3" I²C OLED</b> onto its slot.');
      maybeWire();
    });
    makeDraggable(oled, 150, 150, () => {
      oledPlaced = true;
      if (ghostO) ghostO.style.opacity = '0';
      maybeWire();
    });
    function maybeWire() { if (espPlaced && oledPlaced) enableWiring(); }

    /* ---------- generate + upload ---------- */
    const SKETCH = [
      '#include <Wire.h>',
      '#include <U8g2lib.h>',
      'U8G2_SH1106_128X64_NONAME_F_HW_I2C oled(U8G2_R0);',
      '',
      'void setup() {',
      '  Wire.begin(21, 22);        // SDA=G21 SCL=G22',
      '  oled.begin();',
      '  oled.setFont(u8g2_font_ncenB14_tr);',
      '  oled.clearBuffer();',
      '  oled.drawStr(28, 26, "Hello,");',
      '  oled.drawStr(20, 50, "Welcome!");',
      '  oled.sendBuffer();         // flush to 0x3C',
      '}',
      'void loop() {}',
    ];

    function startGenerate() {
      setStep(6, '⚡ All connections verified — generating firmware…');
      svg.querySelectorAll('.apin').forEach(p => p.classList.remove('next'));
      if (consoleEl) consoleEl.hidden = false;
      let i = 0;
      (function typeLine() {
        if (i >= SKETCH.length) { setTimeout(upload, 350); return; }
        codeEl.textContent += SKETCH[i] + '\n'; i++;
        if (codeEl.parentElement) codeEl.parentElement.scrollTop = codeEl.parentElement.scrollHeight;
        setTimeout(typeLine, 80);
      })();
    }

    function upload() {
      if (upWrap) upWrap.hidden = false;
      const t0 = performance.now(), dur = 2000;
      (function f(now) {
        const k = Math.min((now - t0) / dur, 1);
        if (upBar) upBar.style.width = Math.round(k * 100) + '%';
        if (upTxt) upTxt.textContent = k < .35 ? 'Connecting to ESP32 (esptool)…'
          : k < .8 ? 'Writing at 0x10000… ' + Math.round(k * 100) + '%'
          : 'Hash of data verified. ✓';
        if (k < 1) requestAnimationFrame(f); else setTimeout(powerOled, 250);
      })(performance.now());
    }

    function powerOled() {
      // light the OLED on the breadboard
      oled.classList.add('lit');
      const off = $('ol-off'); if (off) off.style.opacity = '0';
      const l1 = $('ol-l1'), l2 = $('ol-l2');
      if (l1) l1.textContent = 'Hello,';
      setTimeout(() => { if (l2) l2.textContent = 'Welcome!'; setTimeout(zoomReveal, 700); }, 550);
    }

    function zoomReveal() {
      if (!zoom) { closeIntro(); return; }
      zoom.classList.add('show');
      // after the zoom fills the screen, fade overlays and enter
      setTimeout(() => { zoom.classList.add('fade'); }, 1500);
      setTimeout(closeIntro, 2050);
    }
    function closeIntro() { finish(); }

    setStep(1, 'Drag the <b>ESP32</b> onto the glowing slot on the breadboard.');
  });
})();
