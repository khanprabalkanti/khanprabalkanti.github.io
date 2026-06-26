/* =========================================================
   gpio.js — interactive multi-port bare-metal GPIO lab.
   Registers 'gpio'. Each port (A–D) is an independent
   workbench. The user:
     • wires an LED to ANY pin and a push-button to ANY pin
     • enables RCC->AHB1ENR for the port
     • sets GPIOx->MODER (input/output) per pin
     • drives GPIOx->ODR to light the LED
     • reads GPIOx->IDR from the button
     • optionally mirrors button → LED (firmware loop)
   Guided hints highlight exactly which register/bit is next.
   ========================================================= */
(function () {
  'use strict';
  window.Lab = window.Lab || { _m: {}, register(n, f) { this._m[n] = f; } };

  window.Lab.register('gpio', function () {
    const $ = (id) => document.getElementById(id);
    const PORTS = ['A', 'B', 'C', 'D'];
    const PINS = 8;
    const PAD_X = 210, PAD_Y0 = 92, PAD_DY = 36;        // pin pad coords in SVG
    const LED_ANCHOR = [436, 96], BTN_ANCHOR = [436, 324];

    const svg = $('g-svg');
    if (!svg) return;
    const padsG = $('g-pads'), wiresG = $('g-wires');
    const chipLbl = $('g-chip-lbl');
    const ledLbl = $('g-led-lbl'), btnLbl = $('g-btn-lbl');
    const ledG = $('g-led'), btnG = $('g-btn'), btnCap = $('g-btn-cap');
    const hint = $('g-hint'), status = $('g-status'), link = $('g-link');
    const tabsWrap = $('g-ports');

    // per-port independent state
    const S = {};
    PORTS.forEach(p => S[p] = { rcc: 0, mode: Array(PINS).fill(0), odr: Array(PINS).fill(0), led: null, btn: null, link: false });
    let cur = 'A';
    let wireMode = null;     // 'led' | 'btn' | null
    let pressed = false;

    /* ---------- build pin pads ---------- */
    const padEls = [];
    padsG.innerHTML = '';
    for (let i = 0; i < PINS; i++) {
      const y = PAD_Y0 + i * PAD_DY;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', 'gpad'); g.dataset.pin = i;
      g.innerHTML =
        `<text x="56" y="${y + 4}" class="gpad__name"></text>` +
        `<line x1="150" y1="${y}" x2="${PAD_X}" y2="${y}" class="gpad__trace"/>` +
        `<circle cx="${PAD_X}" cy="${y}" r="9" class="gpad__hole"/>` +
        `<circle cx="${PAD_X}" cy="${y}" r="4" class="gpad__dot"/>`;
      padsG.appendChild(g);
      padEls.push(g);
      g.addEventListener('click', () => onPadClick(i));
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', 'GPIO pin ' + i + ' pad');
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPadClick(i); } });
    }
    function padName(i) { return 'P' + cur + i; }

    /* ---------- build register bit rows ---------- */
    function buildBits(hostId, n, cls, onClick) {
      const host = $(hostId); host.innerHTML = ''; const arr = [];
      for (let i = n - 1; i >= 0; i--) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gbit' + (cls ? ' ' + cls : '');
        b.dataset.bit = i; b.textContent = '0';
        b.innerHTML = `<i>${i}</i><b>0</b>`;
        if (onClick) b.addEventListener('click', () => onClick(i));
        host.appendChild(b); arr[i] = b;
      }
      return arr;
    }
    const rccBits = buildBits('g-rcc', 8, 'rcc', onRccBit);
    const moderBits = buildBits('g-moder', PINS, 'moder', onModerBit);
    const odrBits = buildBits('g-odr', PINS, 'odr', onOdrBit);
    const idrBits = buildBits('g-idr', PINS, 'idr', null);

    function setBit(arr, i, on, txt) {
      if (!arr[i]) return;
      arr[i].classList.toggle('set', !!on);
      const b = arr[i].querySelector('b'); if (b && txt !== undefined) b.textContent = txt;
    }
    function glow(arr, i, on) { if (arr[i]) arr[i].classList.toggle('next', !!on); }
    function clearGlow(arr) { arr.forEach(b => b && b.classList.remove('next')); }

    /* ---------- derived logic ---------- */
    function portIdx(p) { return PORTS.indexOf(p); }
    function btnDetected(st) { return st.btn != null && st.rcc && st.mode[st.btn] === 0 && pressed; }
    function ledLit(st) {
      if (st.led == null || !st.rcc || st.mode[st.led] !== 1) return false;
      return st.odr[st.led] === 1 || (st.link && btnDetected(st));
    }

    /* ---------- wires ---------- */
    function drawWire(id, pin, color) {
      const old = document.getElementById(id); if (old) old.remove();
      if (pin == null) return;
      const x = PAD_X, y = PAD_Y0 + pin * PAD_DY;
      const [ax, ay] = id === 'wire-led' ? LED_ANCHOR : BTN_ANCHOR;
      const midX = (x + ax) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('id', id);
      path.setAttribute('d', `M ${x} ${y} C ${midX} ${y}, ${midX} ${ay}, ${ax} ${ay}`);
      path.setAttribute('class', 'gwire'); path.setAttribute('stroke', color);
      wiresG.appendChild(path);
    }

    /* ---------- render ---------- */
    function render() {
      const st = S[cur];
      if (chipLbl) chipLbl.textContent = 'GPIO' + cur;
      ['g-moder-name', 'g-odr-name', 'g-idr-name'].forEach(id => {
        const el = $(id); if (el) el.textContent = 'GPIO' + cur + '->' + id.split('-')[1].toUpperCase();
      });

      // pads
      padEls.forEach((g, i) => {
        g.querySelector('.gpad__name').textContent = padName(i);
        const isOut = st.rcc && st.mode[i] === 1;
        const isIn = st.rcc && st.mode[i] === 0;
        const high = (isOut && (st.odr[i] === 1 || (st.link && st.led === i && btnDetected(st)))) ||
                     (isIn && st.btn === i && pressed);
        g.classList.toggle('out', isOut);
        g.classList.toggle('in', isIn && st.rcc);
        g.classList.toggle('high', !!high);
        g.classList.toggle('isled', st.led === i);
        g.classList.toggle('isbtn', st.btn === i);
        g.classList.toggle('arm', wireMode != null);
      });

      // RCC row: bits 0..3 map to ports; highlight current port bit
      for (let i = 0; i < 8; i++) {
        const isPortBit = i < PORTS.length;
        const on = isPortBit ? S[PORTS[i]].rcc : 0;
        setBit(rccBits, i, on, on ? '1' : '0');
        rccBits[i].classList.toggle('disabled', !isPortBit);
        rccBits[i].classList.toggle('mine', i === portIdx(cur));
      }
      // MODER (show as 1 = output / 0 = input per pin, the low MODER bit)
      for (let i = 0; i < PINS; i++) setBit(moderBits, i, st.mode[i] === 1, st.mode[i] === 1 ? '1' : '0');
      // ODR — effective output: manual latch OR firmware mirror driving the LED pin
      const effOdr = [];
      for (let i = 0; i < PINS; i++) {
        const driven = (st.link && st.led === i && btnDetected(st)) ? 1 : 0;
        const eff = (st.odr[i] === 1 || driven) ? 1 : 0;
        effOdr[i] = eff;
        setBit(odrBits, i, eff, eff ? '1' : '0');
        odrBits[i].classList.toggle('driven', driven === 1 && st.odr[i] !== 1);
      }
      // IDR
      for (let i = 0; i < PINS; i++) {
        const v = (st.btn === i && st.mode[i] === 0 && st.rcc && pressed) ? 1 : 0;
        setBit(idrBits, i, v, v ? '1' : '0');
      }
      // hex
      const hx = (arr, w) => '0x' + arr.reduce((a, b, i) => a | ((b ? 1 : 0) << i), 0).toString(16).toUpperCase().padStart(w, '0');
      $('g-rcc-hex').textContent = '0x' + PORTS.reduce((a, p, i) => a | (S[p].rcc << i), 0).toString(16).toUpperCase().padStart(2, '0');
      $('g-moder-hex').textContent = hx(st.mode.map(m => m === 1 ? 1 : 0), 2);
      $('g-odr-hex').textContent = hx(effOdr, 2);
      $('g-idr-hex').textContent = hx(idrBits.map(b => b.classList.contains('set') ? 1 : 0), 2);

      // LED + button visuals + wires
      ledG.classList.toggle('lit', ledLit(st));
      ledG.classList.toggle('wired', st.led != null);
      btnG.classList.toggle('wired', st.btn != null);
      btnG.classList.toggle('down', pressed && st.btn != null);
      ledLbl.textContent = st.led != null ? `LED → P${cur}${st.led}` : 'LED · unwired';
      btnLbl.textContent = st.btn != null ? `BTN → P${cur}${st.btn}` : 'BTN · unwired';
      drawWire('wire-led', st.led, '#fb7185');
      drawWire('wire-btn', st.btn, '#38bdf8');

      // lock register cards by prerequisite
      lock('greg-moder', !st.rcc);
      lock('greg-odr', !(st.rcc));
      lock('greg-idr', !(st.rcc));
      if (link) link.checked = st.link;

      updateHints();
    }
    function lock(id, locked) {
      const el = $(id); if (!el) return;
      el.classList.toggle('unlocked', !locked);
      el.toggleAttribute('data-locked', !!locked);
    }

    /* ---------- guided hints ---------- */
    function updateHints() {
      const st = S[cur];
      clearGlow(rccBits); clearGlow(moderBits); clearGlow(odrBits);
      let h, s;
      if (st.led == null) {
        h = '① Tap <b>Wire LED</b>, then click any pin pad to attach the LED.';
        s = '// LED has no connection — wire it to any GPIO pin';
      } else if (!st.rcc) {
        glow(rccBits, portIdx(cur), true);
        h = `② Enable the clock — set <b>RCC->AHB1ENR bit ${portIdx(cur)}</b> (GPIO${cur}).`;
        s = `// RCC->AHB1ENR |= (1 << ${portIdx(cur)});`;
      } else if (st.mode[st.led] !== 1) {
        glow(moderBits, st.led, true);
        h = `③ Set the LED pin to OUTPUT — click <b>MODER pin ${st.led}</b> until it reads 01.`;
        s = `// GPIO${cur}->MODER: P${cur}${st.led} = 01 (output)`;
      } else if (!st.link && st.odr[st.led] !== 1 && !(st.btn != null && st.mode[st.btn] === 0)) {
        glow(odrBits, st.led, true);
        h = `④ Drive it HIGH — click <b>ODR bit ${st.led}</b> to light the LED. Or wire a button + enable mirror.`;
        s = `// GPIO${cur}->ODR |= (1 << ${st.led});`;
      } else if (st.btn != null && st.mode[st.btn] === 0 && st.link) {
        h = `⑤ Press the <b>button</b> — IDR bit ${st.btn} reads 1 and the firmware loop drives the LED. 🎉`;
        s = `// if (GPIO${cur}->IDR & (1<<${st.btn})) GPIO${cur}->ODR |= (1<<${st.led});`;
      } else if (st.btn == null) {
        h = `✓ LED ready. Want input control? Tap <b>Wire Button</b>, attach it, set its MODER to INPUT, then enable “Mirror”.`;
        s = ledLit(st) ? '// LED is ON ✓' : '// toggle ODR or wire a button';
      } else if (st.mode[st.btn] !== 0) {
        glow(moderBits, st.btn, true);
        h = `Set the button pin to INPUT — click <b>MODER pin ${st.btn}</b> until it reads 00.`;
        s = `// GPIO${cur}->MODER: P${cur}${st.btn} = 00 (input)`;
      } else if (!st.link) {
        h = `Enable <b>Mirror button → LED</b> below, then press the button.`;
        s = '// link IDR(btn) → ODR(led)';
      } else {
        h = ledLit(st) ? '✓ LED is ON.' : 'Press the button to light the LED.';
        s = ledLit(st) ? '// output HIGH ✓' : '// awaiting input';
      }
      if (hint) hint.innerHTML = h;
      if (status) status.textContent = s;
    }

    /* ---------- interactions ---------- */
    function onPadClick(i) {
      const st = S[cur];
      if (wireMode === 'led') {
        if (st.btn === i) st.btn = null;      // can't share
        st.led = i; wireMode = null; setTool();
      } else if (wireMode === 'btn') {
        if (st.led === i) st.led = null;
        st.btn = i; wireMode = null; setTool();
      } else {
        // no wire mode: clicking a pin cycles its mode if clock on (handy shortcut)
        if (st.rcc) st.mode[i] = st.mode[i] === 1 ? 0 : 1;
      }
      render();
    }
    function onRccBit(i) {
      if (i >= PORTS.length) return;
      S[PORTS[i]].rcc ^= 1;
      render();
    }
    function onModerBit(i) {
      const st = S[cur]; if (!st.rcc) return;
      st.mode[i] = st.mode[i] === 1 ? 0 : 1;
      if (st.mode[i] !== 1) st.odr[i] = 0;   // leaving output clears latch view
      render();
    }
    function onOdrBit(i) {
      const st = S[cur]; if (!st.rcc || st.mode[i] !== 1) return;
      st.odr[i] ^= 1;
      render();
    }

    /* tools */
    const toolLed = $('tool-led'), toolBtn = $('tool-btn'), toolReset = $('tool-reset');
    function setTool() {
      if (toolLed) toolLed.classList.toggle('on', wireMode === 'led');
      if (toolBtn) toolBtn.classList.toggle('on', wireMode === 'btn');
    }
    if (toolLed) toolLed.addEventListener('click', () => { wireMode = wireMode === 'led' ? null : 'led'; setTool(); render(); });
    if (toolBtn) toolBtn.addEventListener('click', () => { wireMode = wireMode === 'btn' ? null : 'btn'; setTool(); render(); });
    if (toolReset) toolReset.addEventListener('click', () => {
      S[cur] = { rcc: 0, mode: Array(PINS).fill(0), odr: Array(PINS).fill(0), led: null, btn: null, link: false };
      wireMode = null; setTool(); render();
    });

    /* port tabs */
    if (tabsWrap) tabsWrap.querySelectorAll('.gport').forEach(b => {
      b.addEventListener('click', () => {
        cur = b.dataset.port;
        tabsWrap.querySelectorAll('.gport').forEach(x => x.classList.toggle('on', x === b));
        wireMode = null; setTool(); render();
      });
    });

    /* button press */
    function press(on) { pressed = on; if (btnCap) btnCap.classList.toggle('down', on && S[cur].btn != null); render(); }
    if (btnG) {
      btnG.addEventListener('pointerdown', (e) => { e.preventDefault(); if (S[cur].btn != null) press(true); });
      window.addEventListener('pointerup', () => { if (pressed) press(false); });
      // keyboard: focus the button group and hold Enter/Space
      btnG.setAttribute('tabindex', '0');
      btnG.setAttribute('role', 'button');
      btnG.setAttribute('aria-label', 'Momentary push button — hold Enter to press');
      btnG.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); if (S[cur].btn != null) press(true); } });
      btnG.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (pressed) press(false); } });
    }
    if (link) link.addEventListener('change', () => { S[cur].link = link.checked; render(); });

    render();
  });
})();
