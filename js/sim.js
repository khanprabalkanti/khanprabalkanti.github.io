/* =========================================================
   sim.js — guided hardware bench simulation
   18650 → TP4056 (USB-C) → STM32 Nucleo-F446RE → 1.3" OLED (I²C).
   The user connects the highlighted pad pairs in sequence;
   when all 8 nets are wired, the OLED boots and prints telemetry.
   Registers 'sim'. Never throws; honours reduced motion.
   ========================================================= */
(function () {
  'use strict';
  window.Lab = window.Lab || { _m: {}, register(n, f) { this._m[n] = f; } };

  window.Lab.register('sim', function (opts) {
    var REDUCE = !!(opts && opts.reduce);
    var $ = function (id) { return document.getElementById(id); };
    var svg = $('sim-svg');
    if (!svg) return;

    var wiresG = $('sim-wires');
    var hint = $('sim-hint');
    var status = $('sim-status');
    var listEl = $('sim-steps');
    var off = $('sim-off');
    var pwrled = $('sim-pwrled');
    var lines = [$('sim-l1'), $('sim-l2'), $('sim-l3'), $('sim-l4')];

    var STEPS = [
      { from: 'p-bat-plus',    to: 'p-tp-bplus',    label: '18650 + → TP4056 B+',     color: '#e4445f' },
      { from: 'p-bat-minus',   to: 'p-tp-bminus',   label: '18650 − → TP4056 B−',     color: '#3a4a6b' },
      { from: 'p-tp-outplus',  to: 'p-nu-5v',       label: 'TP4056 OUT+ → Nucleo 5V', color: '#e4445f' },
      { from: 'p-tp-outminus', to: 'p-nu-gndl',     label: 'TP4056 OUT− → Nucleo GND',color: '#3a4a6b' },
      { from: 'p-nu-3v3',      to: 'p-ol-vcc',      label: 'Nucleo 3V3 → OLED VCC',   color: '#e4445f' },
      { from: 'p-nu-gndr',     to: 'p-ol-gnd',      label: 'Nucleo GND → OLED GND',   color: '#3a4a6b' },
      { from: 'p-nu-pb9',      to: 'p-ol-sda',      label: 'Nucleo PB9 → OLED SDA',   color: '#3d5afe' },
      { from: 'p-nu-pb8',      to: 'p-ol-scl',      label: 'Nucleo PB8 → OLED SCL',   color: '#2fc46b' }
    ];
    var SCREEN = ['PKK · STM32F446', 'SYSCLK 168 MHz', 'VBAT 3.92 V  ok', 'I2C 0x3C  OK'];

    var done = 0, armed = null;
    var pads = {};
    STEPS.forEach(function (s) { pads[s.from] = 1; pads[s.to] = 1; });

    function pos(id) { var e = $(id); return { x: parseFloat(e.getAttribute('cx')), y: parseFloat(e.getAttribute('cy')) }; }
    function ns(t) { return document.createElementNS('http://www.w3.org/2000/svg', t); }

    function drawWire(aId, bId, color) {
      var a = pos(aId), b = pos(bId), mx = (a.x + b.x) / 2;
      var p = ns('path');
      p.setAttribute('d', 'M ' + a.x + ' ' + a.y + ' C ' + mx + ' ' + a.y + ', ' + mx + ' ' + b.y + ', ' + b.x + ' ' + b.y);
      p.setAttribute('class', 'simwire');
      p.setAttribute('stroke', color);
      wiresG.appendChild(p);
    }

    function highlight() {
      Object.keys(pads).forEach(function (id) { var e = $(id); if (e) { e.classList.remove('next'); e.classList.remove('armed'); } });
      var s = STEPS[done];
      if (s) { $(s.from).classList.add('next'); $(s.to).classList.add('next'); }
      if (armed) { var ae = $(armed); if (ae) ae.classList.add('armed'); }
    }

    function buildList() {
      if (!listEl) return;
      listEl.innerHTML = '';
      STEPS.forEach(function (s, i) {
        var li = document.createElement('li');
        li.className = 'sim-step' + (i < done ? ' ok' : '') + (i === done ? ' active' : '');
        var b = document.createElement('b'); b.className = 'sim-step__n'; b.textContent = i < done ? '✓' : String(i + 1);
        var sp = document.createElement('span'); sp.textContent = s.label;
        li.appendChild(b); li.appendChild(sp);
        listEl.appendChild(li);
      });
    }
    function setStatus() { if (status) status.textContent = '// ' + done + ' / ' + STEPS.length + ' nets connected'; }
    function setHint() {
      if (!hint) return;
      var s = STEPS[done];
      hint.innerHTML = s ? ('Connect <b>' + s.label + '</b> — tap both highlighted pads.')
                         : '✓ Bus complete — panel online. Hello, Welcome!';
    }
    function powerCheck() { if (pwrled) pwrled.classList.toggle('on', done >= 4); }

    function flash(id) { var e = $(id); if (!e) return; e.classList.add('bad'); setTimeout(function () { e.classList.remove('bad'); }, 400); }

    function onPad(id) {
      if (done >= STEPS.length) return;
      var s = STEPS[done];
      if (id !== s.from && id !== s.to) { flash(id); return; }
      if (armed === null) { armed = id; highlight(); return; }
      if (armed === id) { armed = null; highlight(); return; }
      var need = (armed === s.from) ? s.to : s.from;
      if (id === need) {
        drawWire(s.from, s.to, s.color);
        armed = null; done++;
        buildList(); setStatus(); powerCheck(); setHint(); highlight();
        if (done >= STEPS.length) boot();
      } else { armed = id; highlight(); }
    }

    function typeLine(el, txt, cb) {
      if (!el) { if (cb) cb(); return; }
      var n = 0;
      (function tick() {
        el.textContent = txt.slice(0, n); n++;
        if (n <= txt.length) setTimeout(tick, 38); else if (cb) cb();
      })();
    }
    function boot() {
      if (off) off.style.display = 'none';
      svg.classList.add('sim-on');
      lines.forEach(function (l) { if (l) l.textContent = ''; });
      if (REDUCE) { SCREEN.forEach(function (t, i) { if (lines[i]) lines[i].textContent = t; }); return; }
      var i = 0;
      (function next() {
        if (i >= SCREEN.length) return;
        typeLine(lines[i], SCREEN[i], function () { i++; setTimeout(next, 220); });
      })();
    }

    function reset() {
      done = 0; armed = null;
      if (wiresG) wiresG.innerHTML = '';
      lines.forEach(function (l) { if (l) l.textContent = ''; });
      if (off) off.style.display = '';
      svg.classList.remove('sim-on');
      if (pwrled) pwrled.classList.remove('on');
      buildList(); setStatus(); setHint(); highlight();
    }

    Object.keys(pads).forEach(function (id) {
      var e = $(id); if (!e) return;
      e.setAttribute('tabindex', '0');
      e.setAttribute('role', 'button');
      e.addEventListener('click', function () { onPad(id); });
      e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onPad(id); } });
    });

    var resetBtn = $('sim-reset'), autoBtn = $('sim-auto');
    if (resetBtn) resetBtn.addEventListener('click', reset);
    if (autoBtn) autoBtn.addEventListener('click', function () {
      reset();
      var i = 0;
      (function step() {
        if (i >= STEPS.length) return;
        var s = STEPS[i];
        drawWire(s.from, s.to, s.color);
        done = i + 1; i++;
        buildList(); setStatus(); powerCheck(); setHint(); highlight();
        if (done >= STEPS.length) boot();
        else setTimeout(step, REDUCE ? 0 : 300);
      })();
    });

    reset();
  });
})();
