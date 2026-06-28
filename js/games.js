/* =========================================================
   games.js — Playground // Logic Games
   A blueprint-styled hub of tiny, self-validating electronics
   games. Registers 'games' with the window.Lab orchestrator and
   builds itself when the #playground section scrolls into view.

   Games:
     1. Bitfield Blaster   — STM32F446RE register bit programming  (centerpiece)
     2. Logic Gate Lab     — AND/OR/XOR/NAND/NOR/XNOR/NOT puzzles
     3. Ohm's Law          — V = I·R quick solver
     4. Resistor Decoder   — 4-band colour code
     5. Binary / Hex Sprint— base-conversion sprint

   Everything is <button>-based (native keyboard), guards every
   lookup, honours prefers-reduced-motion, and never throws.
   ========================================================= */
(function () {
  'use strict';
  window.Lab = window.Lab || { _m: {}, register(n, f) { this._m[n] = f; } };

  /* ---------- tiny DOM helper ---------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function snd(name) { try { if (window.Lab && window.Lab.sound) window.Lab.sound.play(name); } catch (e) {} }

  var REDUCE = false;
  var score = 0;
  var scoreEl = null;
  function addScore(n) {
    score += n;
    if (scoreEl) scoreEl.textContent = score + ' PTS';
  }

  /* ---------- shared game shell ---------- */
  function shell(stage, meta) {
    stage.innerHTML = '';
    stage.hidden = false;
    var statusEl = h('span', { class: 'gm-fb', role: 'status', 'aria-live': 'polite', text: meta.hint || '' });
    var roundEl = h('span', { class: 'gm-round' });
    var body = h('div', { class: 'gm-body' });
    var head = h('div', { class: 'gm-head' }, [
      h('button', {
        class: 'gm-back', type: 'button', 'aria-label': 'Back to all games',
        onclick: function () { snd('click'); buildHub(stage); }
      }, ['◀ ALL GAMES']),
      h('div', { class: 'gm-head__t' }, [
        h('span', { class: 'gm-ref', text: meta.ref }),
        h('h3', { class: 'gm-title', text: meta.title }),
        h('p', { class: 'gm-concept', text: meta.concept })
      ]),
      roundEl
    ]);
    var foot = h('div', { class: 'gm-foot' }, [statusEl]);
    var wrap = h('div', { class: 'gm-panel gm-panel--' + meta.accent }, [head, body, foot]);
    stage.appendChild(wrap);
    // focus the panel heading for keyboard users
    try { stage.querySelector('.gm-title').setAttribute('tabindex', '-1'); stage.querySelector('.gm-title').focus(); } catch (e) {}
    function setStatus(msg, kind) {
      statusEl.textContent = msg;
      statusEl.className = 'gm-fb' + (kind ? ' gm-fb--' + kind : '');
    }
    function setRound(txt) { roundEl.textContent = txt; }
    return { body: body, setStatus: setStatus, setRound: setRound, wrap: wrap };
  }

  /* =========================================================
     GAME 1 — BITFIELD BLASTER  (STM32F446RE bitfields)
     ========================================================= */
  var BF_MISSIONS = [
    {
      reg: 'RCC->AHB1ENR', bits: 8, start: 0, preset: [], live: [0], target: 0x01,
      task: 'Enable the clock for GPIOA — set bit 0 (GPIOAEN).',
      c: 'RCC->AHB1ENR |= (1 << 0);'
    },
    {
      reg: 'GPIOA->MODER', bits: 16, start: 0, preset: [], live: [10, 11], target: (1 << 10),
      task: 'Set PA5 as OUTPUT. MODER uses 2 bits/pin → PA5 = bits [11:10]. Output = 01.',
      c: 'GPIOA->MODER |= (1 << 10);   // bits[11:10] = 01'
    },
    {
      reg: 'GPIOA->ODR', bits: 8, start: 0, preset: [], live: [5], target: (1 << 5),
      task: 'Drive PA5 HIGH — set output-data bit 5.',
      c: 'GPIOA->ODR |= (1 << 5);'
    },
    {
      reg: 'GPIOA->ODR', bits: 8, start: (1 << 5), preset: [], live: [5], target: 0,
      task: 'PA5 is HIGH. Clear it — drive PA5 LOW again.',
      c: 'GPIOA->ODR &= ~(1 << 5);'
    },
    {
      reg: 'RCC->AHB1ENR', bits: 8, start: 0x01, preset: [0], live: [2], target: 0x05,
      task: 'GPIOA is already clocked (bit 0, locked). Now also enable GPIOC — set bit 2.',
      c: 'RCC->AHB1ENR |= (1 << 2);'
    },
    {
      reg: 'GPIOA->MODER', bits: 8, start: 0, preset: [], live: [0, 1, 2, 3], target: (1 << 0) | (1 << 2),
      task: 'Set PA0 and PA1 both as OUTPUT (each field = 01). Bits [1:0]=01 and [3:2]=01.',
      c: 'GPIOA->MODER |= (1 << 0) | (1 << 2);'
    }
  ];

  function gameBitfield(stage) {
    var S = shell(stage, {
      ref: 'REF B1', title: 'Bitfield Blaster', accent: 'cyan',
      concept: 'Bare-metal STM32F446RE register programming — set & clear individual bits.',
      hint: 'Flip the highlighted bits to match the target, then it auto-checks.'
    });
    var idx = 0;

    function load() {
      var m = BF_MISSIONS[idx];
      var value = m.start;
      S.setRound('REG ' + (idx + 1) + ' / ' + BF_MISSIONS.length);
      S.body.innerHTML = '';

      var task = h('p', { class: 'bf-task', html: '<b>Mission:</b> ' + m.task });
      var regline = h('div', { class: 'bf-regline' }, [
        h('span', { class: 'bf-regname', text: m.reg }),
        h('span', { class: 'bf-hex', id: 'bf-hex' })
      ]);

      var grid = h('div', { class: 'bf-bits', role: 'group', 'aria-label': m.reg + ' bits' });
      var cells = {};
      function isLive(i) { return m.live.indexOf(i) !== -1; }
      function isPreset(i) { return m.preset.indexOf(i) !== -1; }

      for (var i = m.bits - 1; i >= 0; i--) {
        (function (bit) {
          var live = isLive(bit), lock = isPreset(bit) || (!live);
          var cell = h('button', {
            class: 'bf-bit' + (live ? ' is-live' : ' is-lock'),
            type: 'button',
            'data-bit': bit,
            'aria-label': 'bit ' + bit + (live ? ' (editable)' : ' (locked)'),
            disabled: live ? null : 'disabled'
          }, [
            h('span', { class: 'bf-bit__i', text: bit }),
            h('span', { class: 'bf-bit__v', text: String((value >> bit) & 1) })
          ]);
          if (live) cell.addEventListener('click', function () { toggle(bit); });
          cells[bit] = cell;
          grid.appendChild(cell);
          // visual gap every nibble
          if (bit % 4 === 0 && bit !== 0) grid.appendChild(h('span', { class: 'bf-gap' }));
        })(i);
      }

      var cbox = h('pre', { class: 'bf-c', hidden: 'hidden' });
      var hintBtn = h('button', { class: 'gm-btn gm-btn--ghost', type: 'button', onclick: function () { showHint(); } }, ['HINT']);
      var nextBtn = h('button', { class: 'gm-btn', type: 'button', hidden: 'hidden', onclick: function () { advance(); } },
        [idx + 1 < BF_MISSIONS.length ? 'NEXT REGISTER ▶' : 'FINISH ✓']);
      var controls = h('div', { class: 'gm-controls' }, [hintBtn, nextBtn]);

      S.body.appendChild(task);
      S.body.appendChild(regline);
      S.body.appendChild(grid);
      S.body.appendChild(cbox);
      S.body.appendChild(controls);

      var solved = false;
      function render() {
        for (var b = 0; b < m.bits; b++) {
          if (cells[b]) {
            cells[b].querySelector('.bf-bit__v').textContent = String((value >> b) & 1);
            cells[b].classList.toggle('on', !!((value >> b) & 1));
          }
        }
        var hex = '0x' + (value >>> 0).toString(16).toUpperCase().padStart(Math.ceil(m.bits / 4), '0');
        var binStr = '';
        for (var z = m.bits - 1; z >= 0; z--) binStr += ((value >> z) & 1);
        regline.querySelector('.bf-hex').textContent = hex + '  ·  0b' + binStr;
      }
      function mask() { var mk = 0; m.live.forEach(function (b) { mk |= (1 << b); }); return mk; }
      function toggle(bit) {
        if (solved) return;
        value ^= (1 << bit);
        snd('tick');
        try { window.dispatchEvent(new CustomEvent('lab:toggle')); } catch (e) {}
        render();
        check();
      }
      function check() {
        if ((value & mask()) === (m.target & mask())) win();
      }
      function showHint() {
        // find a live bit that differs from target
        for (var k = 0; k < m.live.length; k++) {
          var b = m.live[k];
          if (((value >> b) & 1) !== ((m.target >> b) & 1)) {
            cells[b].classList.add('hintme');
            setTimeout(function (c) { return function () { c.classList.remove('hintme'); }; }(cells[b]), 1400);
            S.setStatus('Bit ' + b + ' needs to be ' + ((m.target >> b) & 1) + '.', 'warn');
            return;
          }
        }
        S.setStatus('All target bits already match — nice.', 'ok');
      }
      function win() {
        solved = true;
        addScore(10);
        snd('bwoop');
        try { window.dispatchEvent(new CustomEvent('lab:connect')); } catch (e) {}
        cbox.hidden = false;
        cbox.textContent = '// ' + m.reg + ' configured\n' + m.c;
        nextBtn.hidden = false;
        hintBtn.hidden = true;
        S.setStatus('✓ Register configured — +10 pts', 'ok');
        try { nextBtn.focus(); } catch (e) {}
      }
      function advance() {
        if (idx + 1 < BF_MISSIONS.length) { idx++; load(); }
        else done();
      }
      render();
    }

    function done() {
      S.body.innerHTML = '';
      S.setRound('COMPLETE');
      S.body.appendChild(h('div', { class: 'gm-done' }, [
        h('p', { class: 'gm-done__big', text: '✓ All registers configured' }),
        h('p', { class: 'gm-done__sub', text: 'You just programmed GPIO the bare-metal way — clock gate, mode, drive, clear. That is the heart of every STM32 driver.' }),
        h('button', { class: 'gm-btn', type: 'button', onclick: function () { idx = 0; load(); } }, ['↺ RUN AGAIN']),
        h('button', { class: 'gm-btn gm-btn--ghost', type: 'button', onclick: function () { buildHub(stage); } }, ['◀ ALL GAMES'])
      ]));
      S.setStatus('Bitfield Blaster cleared. Try another sheet ▶', 'ok');
    }
    load();
  }

  /* =========================================================
     GAME 2 — LOGIC GATE LAB
     ========================================================= */
  var GATES = {
    AND:  { n: 2, f: function (a, b) { return a & b; } },
    OR:   { n: 2, f: function (a, b) { return a | b; } },
    XOR:  { n: 2, f: function (a, b) { return a ^ b; } },
    NAND: { n: 2, f: function (a, b) { return (a & b) ? 0 : 1; } },
    NOR:  { n: 2, f: function (a, b) { return (a | b) ? 0 : 1; } },
    XNOR: { n: 2, f: function (a, b) { return (a ^ b) ? 0 : 1; } },
    NOT:  { n: 1, f: function (a) { return a ? 0 : 1; } }
  };
  var GATE_KEYS = Object.keys(GATES);

  function gameGates(stage) {
    var S = shell(stage, {
      ref: 'REF B2', title: 'Logic Gate Lab', accent: 'violet',
      concept: 'Boolean logic — flip the input switches so the gate output matches the target.',
      hint: 'Toggle A / B until the output LED matches the goal.'
    });
    var round = 0, total = 8, ins = [0, 0], gate = 'AND', target = 1;

    function newRound() {
      round++;
      if (round > total) return finish();
      S.setRound('ROUND ' + round + ' / ' + total);
      gate = GATE_KEYS[Math.floor(Math.random() * GATE_KEYS.length)];
      var g = GATES[gate];
      ins = [0, 0];
      // pick a reachable target
      target = Math.random() < 0.5 ? 0 : 1;
      // ensure target reachable (always is for these gates) — verify
      var reachable = false;
      for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) { if (g.f(a, b) === target) reachable = true; }
      if (!reachable) target = g.f(0, 0);
      draw();
    }

    function draw() {
      var g = GATES[gate];
      S.body.innerHTML = '';
      S.body.appendChild(h('p', { class: 'lg-goal', html: 'Gate: <b>' + gate + '</b> &nbsp;·&nbsp; make output = <b class="lg-target">' + target + '</b>' }));

      var swWrap = h('div', { class: 'lg-switches' });
      function mkSwitch(i, label) {
        var b = h('button', { class: 'lg-sw' + (ins[i] ? ' on' : ''), type: 'button', 'aria-pressed': ins[i] ? 'true' : 'false' }, [
          h('span', { class: 'lg-sw__lbl', text: label }),
          h('span', { class: 'lg-sw__v', text: String(ins[i]) })
        ]);
        b.addEventListener('click', function () {
          ins[i] = ins[i] ? 0 : 1;
          snd('tick'); try { window.dispatchEvent(new CustomEvent('lab:toggle')); } catch (e) {}
          draw();
        });
        return b;
      }
      swWrap.appendChild(mkSwitch(0, 'A'));
      if (g.n === 2) swWrap.appendChild(mkSwitch(1, 'B'));

      var out = g.n === 2 ? g.f(ins[0], ins[1]) : g.f(ins[0]);
      var led = h('div', { class: 'lg-out' }, [
        h('span', { class: 'lg-out__k', text: gate }),
        h('span', { class: 'lg-led' + (out ? ' on' : '') }),
        h('span', { class: 'lg-out__v', text: 'OUT = ' + out })
      ]);

      var check = h('button', { class: 'gm-btn', type: 'button', onclick: function () { lockIn(out); } }, ['LOCK IN ✓']);
      var tt = h('details', { class: 'lg-tt' }, [ h('summary', { text: 'truth table' }), truthTable(gate) ]);

      S.body.appendChild(swWrap);
      S.body.appendChild(led);
      S.body.appendChild(h('div', { class: 'gm-controls' }, [check]));
      S.body.appendChild(tt);
    }

    function truthTable(gname) {
      var g = GATES[gname];
      var rows = [];
      var header = g.n === 2 ? 'A B → Y' : 'A → Y';
      rows.push(header);
      if (g.n === 2) { for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) rows.push(a + ' ' + b + ' → ' + g.f(a, b)); }
      else { rows.push('0 → ' + g.f(0)); rows.push('1 → ' + g.f(1)); }
      return h('pre', { class: 'lg-ttpre', text: rows.join('\n') });
    }

    function lockIn(out) {
      if (out === target) { addScore(8); snd('bwoop'); S.setStatus('✓ Output matches — +8 pts', 'ok'); setTimeout(newRound, REDUCE ? 0 : 650); }
      else { snd('relay'); S.setStatus('✗ Output is ' + out + ', target is ' + target + '. Keep flipping.', 'bad'); }
    }
    function finish() {
      S.body.innerHTML = '';
      S.setRound('COMPLETE');
      S.body.appendChild(h('div', { class: 'gm-done' }, [
        h('p', { class: 'gm-done__big', text: '✓ Logic mastered' }),
        h('p', { class: 'gm-done__sub', text: 'AND, OR, XOR and their inverses — the building blocks of every digital circuit and every line of bit-twiddling firmware.' }),
        h('button', { class: 'gm-btn', type: 'button', onclick: function () { round = 0; newRound(); } }, ['↺ PLAY AGAIN']),
        h('button', { class: 'gm-btn gm-btn--ghost', type: 'button', onclick: function () { buildHub(stage); } }, ['◀ ALL GAMES'])
      ]));
      S.setStatus('Nice logic work ▶', 'ok');
    }
    newRound();
  }

  /* =========================================================
     GAME 3 — OHM'S LAW
     ========================================================= */
  function gameOhms(stage) {
    var S = shell(stage, {
      ref: 'REF B3', title: "Ohm's Law", accent: 'amber',
      concept: 'V = I × R. Two values are given — pick the third.',
      hint: 'Use V = I·R (and I = V/R, R = V/I).'
    });
    var round = 0, total = 6;

    function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function fmtV(v) { return v + ' V'; }
    function fmtR(r) { return r >= 1000 ? (r / 1000) + ' kΩ' : r + ' Ω'; }
    function fmtI(i) { return (i >= 1 ? i + ' A' : Math.round(i * 1000) + ' mA'); }

    function newRound() {
      round++;
      if (round > total) return finish();
      S.setRound('Q ' + round + ' / ' + total);
      // choose nice integers
      var I = rnd([0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2]);
      var R = rnd([100, 220, 330, 470, 1000, 2200, 4700]);
      var V = +(I * R).toFixed(2);
      var ask = rnd(['V', 'I', 'R']);
      var prompt, correct, fmt;
      if (ask === 'V') { prompt = 'I = ' + fmtI(I) + ' , R = ' + fmtR(R) + '  →  V = ?'; correct = V; fmt = fmtV; }
      else if (ask === 'I') { prompt = 'V = ' + fmtV(V) + ' , R = ' + fmtR(R) + '  →  I = ?'; correct = I; fmt = fmtI; }
      else { prompt = 'V = ' + fmtV(V) + ' , I = ' + fmtI(I) + '  →  R = ?'; correct = R; fmt = fmtR; }

      // build 4 options
      var opts = [correct];
      var guard = 0;
      while (opts.length < 4 && guard++ < 50) {
        var factor = rnd([0.5, 2, 1.5, 0.25, 4, 10]);
        var cand = ask === 'I' ? +(correct * factor).toFixed(3) : Math.round(correct * factor);
        if (cand > 0 && opts.indexOf(cand) === -1) opts.push(cand);
      }
      while (opts.length < 4) opts.push(correct + opts.length);
      shuffle(opts);

      S.body.innerHTML = '';
      S.body.appendChild(h('div', { class: 'ohm-tri', html:
        '<span class="ohm-tri__v">V</span><span class="ohm-tri__i">I</span><span class="ohm-tri__r">R</span>' }));
      S.body.appendChild(h('p', { class: 'ohm-q', text: prompt }));
      var grid = h('div', { class: 'gm-opts' });
      opts.forEach(function (o) {
        var btn = h('button', { class: 'gm-opt', type: 'button', text: fmt(o) });
        btn.addEventListener('click', function () {
          if (o === correct) { addScore(6); snd('bwoop'); btn.classList.add('right'); S.setStatus('✓ Correct — +6 pts', 'ok'); lockOpts(grid); setTimeout(newRound, REDUCE ? 0 : 700); }
          else { snd('relay'); btn.classList.add('wrong'); btn.disabled = true; S.setStatus('✗ Not quite — try again.', 'bad'); }
        });
        grid.appendChild(btn);
      });
      S.body.appendChild(grid);
    }
    function lockOpts(grid) { Array.prototype.forEach.call(grid.children, function (b) { b.disabled = true; }); }
    function finish() { finishGeneric(stage, S, 'Ohm\'s law nailed', 'Current, voltage, resistance — the triangle behind every resistor, LED series-resistor, and current-limit calculation.', newRound); }
    newRound();
  }

  /* =========================================================
     GAME 4 — RESISTOR DECODER (4-band)
     ========================================================= */
  var RCOLORS = [
    { n: 'black', c: '#222', d: 0 }, { n: 'brown', c: '#7a4a1e', d: 1 }, { n: 'red', c: '#d33', d: 2 },
    { n: 'orange', c: '#f59e0b', d: 3 }, { n: 'yellow', c: '#facc15', d: 4 }, { n: 'green', c: '#22c55e', d: 5 },
    { n: 'blue', c: '#3b82f6', d: 6 }, { n: 'violet', c: '#a78bfa', d: 7 }, { n: 'grey', c: '#9ca3af', d: 8 }, { n: 'white', c: '#f8fafc', d: 9 }
  ];
  function fmtOhms(v) {
    if (v >= 1e6) return (v / 1e6) + ' MΩ';
    if (v >= 1e3) return (v / 1e3) + ' kΩ';
    return v + ' Ω';
  }
  function gameResistor(stage) {
    var S = shell(stage, {
      ref: 'REF B4', title: 'Resistor Decoder', accent: 'green',
      concept: '4-band colour code — read the bands, pick the resistance.',
      hint: 'band1 band2 = digits, band3 = ×10ⁿ multiplier.'
    });
    var round = 0, total = 6;

    /* colour-code reference chart */
    function colorRef() {
      var det = h('details', { class: 'res-ref', open: 'open' }, [
        h('summary', { text: '▦ resistor colour code' })
      ]);
      var grid = h('div', { class: 'res-ref__grid' });
      RCOLORS.forEach(function (c) {
        grid.appendChild(h('div', { class: 'res-ref__item' }, [
          h('span', { class: 'res-ref__sw', style: 'background:' + c.c }),
          h('span', { class: 'res-ref__n', text: c.n }),
          h('b', { class: 'res-ref__d', text: String(c.d) })
        ]));
      });
      det.appendChild(grid);
      det.appendChild(h('p', { class: 'res-ref__note', text: 'band1·band2 = digits · band3 = ×10ⁿ (the multiplier colour’s digit is the exponent) · gold = ±5%' }));
      return det;
    }

    function newRound() {
      round++;
      if (round > total) return finishGeneric(stage, S, 'Colour code cracked', 'Reading resistor bands by eye is a daily bench skill — now you can do it from memory.', newRound);
      S.setRound('R ' + round + ' / ' + total);
      var d1 = 1 + Math.floor(Math.random() * 9);     // 1..9 (avoid leading 0)
      var d2 = Math.floor(Math.random() * 10);
      var mult = Math.floor(Math.random() * 5);        // 0..4 → ×1..×10000
      var value = (d1 * 10 + d2) * Math.pow(10, mult);

      S.body.innerHTML = '';
      // resistor svg
      var bands =
        '<svg viewBox="0 0 240 80" class="res-svg" aria-label="resistor with colour bands">' +
        '<line x1="6" y1="40" x2="234" y2="40" stroke="#9aa3c8" stroke-width="4"/>' +
        '<rect x="60" y="22" width="120" height="36" rx="12" fill="#e7d9b8" stroke="#b9a87f"/>' +
        band(78, RCOLORS[d1].c) + band(100, RCOLORS[d2].c) + band(122, RCOLORS[mult].c) +
        '<rect x="158" y="22" width="9" height="36" fill="#caa15a"/>' +  // gold tolerance
        '</svg>';
      function band(x, col) { return '<rect x="' + x + '" y="22" width="11" height="36" fill="' + col + '"/>'; }
      S.body.appendChild(h('div', { class: 'res-wrap', html: bands }));
      S.body.appendChild(h('p', { class: 'res-leg', text:
        'bands: ' + RCOLORS[d1].n + ' · ' + RCOLORS[d2].n + ' · ' + RCOLORS[mult].n + ' · gold' }));
      S.body.appendChild(colorRef());

      var opts = [value];
      var guard = 0;
      while (opts.length < 4 && guard++ < 60) {
        var dd1 = 1 + Math.floor(Math.random() * 9), dd2 = Math.floor(Math.random() * 10), mm = Math.floor(Math.random() * 5);
        var cand = (dd1 * 10 + dd2) * Math.pow(10, mm);
        if (opts.indexOf(cand) === -1) opts.push(cand);
      }
      shuffle(opts);
      var grid = h('div', { class: 'gm-opts' });
      opts.forEach(function (o) {
        var btn = h('button', { class: 'gm-opt', type: 'button', text: fmtOhms(o) });
        btn.addEventListener('click', function () {
          if (o === value) { addScore(6); snd('bwoop'); btn.classList.add('right'); S.setStatus('✓ ' + fmtOhms(value) + ' — +6 pts', 'ok'); Array.prototype.forEach.call(grid.children, function (b) { b.disabled = true; }); setTimeout(newRound, REDUCE ? 0 : 750); }
          else { snd('relay'); btn.classList.add('wrong'); btn.disabled = true; S.setStatus('✗ That\'s ' + fmtOhms(o) + '. Re-read the bands.', 'bad'); }
        });
        grid.appendChild(btn);
      });
      S.body.appendChild(grid);
    }
    newRound();
  }

  /* =========================================================
     GAME 5 — BINARY / HEX SPRINT
     ========================================================= */
  function gameBase(stage) {
    var S = shell(stage, {
      ref: 'REF B5', title: 'Binary / Hex Sprint', accent: 'cyan',
      concept: 'Convert between decimal, binary and hex — fast.',
      hint: 'Pick the matching value.'
    });
    var round = 0, total = 8;

    /* conversion hints reference */
    function baseRef() {
      var det = h('details', { class: 'base-ref', open: 'open' }, [
        h('summary', { text: '🧮 conversion hints' })
      ]);
      det.appendChild(h('p', { class: 'base-ref__h', text: '8-bit place values — add the weights of the 1-bits' }));
      var weights = h('div', { class: 'base-ref__weights' });
      [128, 64, 32, 16, 8, 4, 2, 1].forEach(function (w, i) {
        weights.appendChild(h('div', { class: 'base-ref__w' }, [
          h('span', { class: 'base-ref__bit', text: 'b' + (7 - i) }),
          h('b', { text: String(w) })
        ]));
      });
      det.appendChild(weights);
      det.appendChild(h('p', { class: 'base-ref__h', text: 'Hex digit → decimal · 4-bit' }));
      var hexmap = h('div', { class: 'base-ref__hex' });
      for (var d = 0; d < 16; d++) {
        hexmap.appendChild(h('div', { class: 'base-ref__item' }, [
          h('span', { class: 'base-ref__sw', text: d.toString(16).toUpperCase() }),
          h('span', { class: 'base-ref__n', text: d + ' · ' + d.toString(2).padStart(4, '0') })
        ]));
      }
      det.appendChild(hexmap);
      det.appendChild(h('p', { class: 'base-ref__note', text: 'e.g. 0xB4 = 11×16 + 4 = 180 = 0b1011 0100' }));
      return det;
    }

    function newRound() {
      round++;
      if (round > total) return finishGeneric(stage, S, 'Conversions on lock', 'Reading 0xFF as 255 or 0b1010 as 10 instantly is what makes register dumps and datasheets readable at a glance.', newRound);
      S.setRound('# ' + round + ' / ' + total);
      var n = Math.floor(Math.random() * 256);
      var mode = ['dec2bin', 'dec2hex', 'bin2dec', 'hex2dec'][Math.floor(Math.random() * 4)];
      var prompt, correct, fmt;
      function bin(x) { return '0b' + x.toString(2).padStart(8, '0'); }
      function hex(x) { return '0x' + x.toString(16).toUpperCase().padStart(2, '0'); }
      if (mode === 'dec2bin') { prompt = 'Convert ' + n + ' (dec) → binary'; correct = n; fmt = bin; }
      else if (mode === 'dec2hex') { prompt = 'Convert ' + n + ' (dec) → hex'; correct = n; fmt = hex; }
      else if (mode === 'bin2dec') { prompt = 'Convert ' + bin(n) + ' → decimal'; correct = n; fmt = function (x) { return String(x); }; }
      else { prompt = 'Convert ' + hex(n) + ' → decimal'; correct = n; fmt = function (x) { return String(x); }; }

      var opts = [correct];
      var guard = 0;
      while (opts.length < 4 && guard++ < 60) {
        var delta = (1 + Math.floor(Math.random() * 12)) * (Math.random() < 0.5 ? -1 : 1);
        var cand = ((n + delta) % 256 + 256) % 256;
        if (opts.indexOf(cand) === -1) opts.push(cand);
      }
      shuffle(opts);
      S.body.innerHTML = '';
      S.body.appendChild(h('p', { class: 'base-q', text: prompt }));
      var grid = h('div', { class: 'gm-opts gm-opts--mono' });
      opts.forEach(function (o) {
        var btn = h('button', { class: 'gm-opt', type: 'button', text: fmt(o) });
        btn.addEventListener('click', function () {
          if (o === correct) { addScore(5); snd('bwoop'); btn.classList.add('right'); S.setStatus('✓ Correct — +5 pts', 'ok'); Array.prototype.forEach.call(grid.children, function (b) { b.disabled = true; }); setTimeout(newRound, REDUCE ? 0 : 600); }
          else { snd('relay'); btn.classList.add('wrong'); btn.disabled = true; S.setStatus('✗ Try again.', 'bad'); }
        });
        grid.appendChild(btn);
      });
      S.body.appendChild(grid);
      S.body.appendChild(baseRef());
    }
    newRound();
  }

  /* =========================================================
     GAME 6 — RC TIME CONSTANT
     ========================================================= */
  function gameRC(stage) {
    var S = shell(stage, {
      ref: 'REF B6', title: 'RC Time Constant', accent: 'amber',
      concept: 'τ = R × C — the time an RC circuit takes to charge to ~63%.',
      hint: 'τ = R × C. Mind the units (kΩ × µF = ms).'
    });
    var round = 0, total = 6;
    function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
    function fmtR(r) { return r >= 1000 ? (r / 1000) + ' kΩ' : r + ' Ω'; }
    function fmtC(c) { return c >= 1 ? c + ' µF' : (c * 1000) + ' nF'; }
    function fmtT(t) {
      if (t >= 1) return +t.toFixed(2) + ' s';
      if (t >= 1e-3) return +(t * 1e3).toFixed(2) + ' ms';
      return +(t * 1e6).toFixed(0) + ' µs';
    }
    function newRound() {
      round++;
      if (round > total) return finishGeneric(stage, S, 'Timing locked in', 'RC time constants set debounce delays, filter cut-offs and the blink rate of every 555 timer.', newRound);
      S.setRound('# ' + round + ' / ' + total);
      var R = rnd([220, 470, 1000, 2200, 4700, 10000]);
      var C = rnd([0.1, 1, 10, 100, 470]); // µF
      var tau = R * (C * 1e-6);
      var opts = [tau], guard = 0;
      while (opts.length < 4 && guard++ < 60) {
        var cand = +(tau * rnd([0.1, 10, 2, 0.5, 5, 100]));
        if (opts.indexOf(cand) === -1) opts.push(cand);
      }
      shuffle(opts);
      S.body.innerHTML = '';
      S.body.appendChild(h('p', { class: 'ohm-q', text: 'R = ' + fmtR(R) + ' , C = ' + fmtC(C) + '  →  τ = ?' }));
      var grid = h('div', { class: 'gm-opts gm-opts--mono' });
      opts.forEach(function (o) {
        var btn = h('button', { class: 'gm-opt', type: 'button', text: fmtT(o) });
        btn.addEventListener('click', function () {
          if (o === tau) { addScore(6); snd('bwoop'); btn.classList.add('right'); S.setStatus('✓ τ = ' + fmtT(tau) + ' — +6 pts', 'ok'); Array.prototype.forEach.call(grid.children, function (b) { b.disabled = true; }); setTimeout(newRound, REDUCE ? 0 : 750); }
          else { snd('relay'); btn.classList.add('wrong'); btn.disabled = true; S.setStatus('✗ Recompute τ = R × C.', 'bad'); }
        });
        grid.appendChild(btn);
      });
      S.body.appendChild(grid);
    }
    newRound();
  }

  /* =========================================================
     GAME 7 — LED RESISTOR SIZING
     ========================================================= */
  function gameLED(stage) {
    var S = shell(stage, {
      ref: 'REF B7', title: 'LED Resistor Sizing', accent: 'green',
      concept: 'R = (Vsupply − Vf) / I — the series resistor that protects an LED.',
      hint: 'R = (Vs − Vf) / I  (use I in amps).'
    });
    var round = 0, total = 6;
    function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
    function newRound() {
      round++;
      if (round > total) return finishGeneric(stage, S, 'LEDs protected', 'Every LED needs a series resistor — skip it and you cook the diode. This is bench reflex.', newRound);
      S.setRound('# ' + round + ' / ' + total);
      var Vs = rnd([5, 9, 12]), Vf = rnd([1.8, 2, 2.1, 3.2]), Ima = rnd([5, 10, 15, 20]);
      var R = Math.round((Vs - Vf) / (Ima / 1000));
      var opts = [R], guard = 0;
      while (opts.length < 4 && guard++ < 60) {
        var cand = Math.round(R * rnd([0.5, 2, 1.5, 0.25, 3]));
        if (cand > 0 && opts.indexOf(cand) === -1) opts.push(cand);
      }
      shuffle(opts);
      S.body.innerHTML = '';
      S.body.appendChild(h('p', { class: 'ohm-q', text: 'Vs = ' + Vs + ' V , Vf = ' + Vf + ' V , I = ' + Ima + ' mA  →  R = ?' }));
      var grid = h('div', { class: 'gm-opts gm-opts--mono' });
      opts.forEach(function (o) {
        var btn = h('button', { class: 'gm-opt', type: 'button', text: o + ' Ω' });
        btn.addEventListener('click', function () {
          if (o === R) { addScore(6); snd('bwoop'); btn.classList.add('right'); S.setStatus('✓ R ≈ ' + R + ' Ω — +6 pts', 'ok'); Array.prototype.forEach.call(grid.children, function (b) { b.disabled = true; }); setTimeout(newRound, REDUCE ? 0 : 750); }
          else { snd('relay'); btn.classList.add('wrong'); btn.disabled = true; S.setStatus('✗ R = (Vs − Vf) / I.', 'bad'); }
        });
        grid.appendChild(btn);
      });
      S.body.appendChild(grid);
    }
    newRound();
  }

  /* =========================================================
     GAME 8 — VOLTAGE DIVIDER
     ========================================================= */
  function gameDivider(stage) {
    var S = shell(stage, {
      ref: 'REF B8', title: 'Voltage Divider', accent: 'violet',
      concept: 'Vout = Vin × R2 / (R1 + R2) — the workhorse of sensor front-ends.',
      hint: 'Vout = Vin × R2 / (R1 + R2).'
    });
    var round = 0, total = 6;
    function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
    function newRound() {
      round++;
      if (round > total) return finishGeneric(stage, S, 'Divider dialled in', 'Voltage dividers scale signals into ADC range and bias transistors — fundamental analog glue.', newRound);
      S.setRound('# ' + round + ' / ' + total);
      var Vin = rnd([5, 9, 12]), R1 = rnd([1, 2.2, 4.7, 10]), R2 = rnd([1, 2.2, 4.7, 10]); // kΩ
      var Vout = +(Vin * R2 / (R1 + R2)).toFixed(2);
      var opts = [Vout], guard = 0;
      while (opts.length < 4 && guard++ < 60) {
        var cand = +(Vout * rnd([0.5, 1.5, 0.75, 1.25, 2])).toFixed(2);
        if (cand > 0 && cand <= Vin && opts.indexOf(cand) === -1) opts.push(cand);
      }
      guard = 1;
      while (opts.length < 4) { var c2 = +(Vout + 0.3 * guard++).toFixed(2); if (c2 <= Vin && opts.indexOf(c2) === -1) opts.push(c2); if (guard > 30) break; }
      while (opts.length < 4) opts.push(+(Vout / 2 / opts.length).toFixed(2));
      shuffle(opts);
      S.body.innerHTML = '';
      S.body.appendChild(h('p', { class: 'ohm-q', text: 'Vin = ' + Vin + ' V , R1 = ' + R1 + ' kΩ , R2 = ' + R2 + ' kΩ  →  Vout = ?' }));
      var grid = h('div', { class: 'gm-opts gm-opts--mono' });
      opts.forEach(function (o) {
        var btn = h('button', { class: 'gm-opt', type: 'button', text: o + ' V' });
        btn.addEventListener('click', function () {
          if (o === Vout) { addScore(6); snd('bwoop'); btn.classList.add('right'); S.setStatus('✓ Vout = ' + Vout + ' V — +6 pts', 'ok'); Array.prototype.forEach.call(grid.children, function (b) { b.disabled = true; }); setTimeout(newRound, REDUCE ? 0 : 750); }
          else { snd('relay'); btn.classList.add('wrong'); btn.disabled = true; S.setStatus('✗ Vout = Vin × R2 / (R1 + R2).', 'bad'); }
        });
        grid.appendChild(btn);
      });
      S.body.appendChild(grid);
    }
    newRound();
  }

  /* =========================================================
     GAME 9 — SERIES / PARALLEL RESISTORS
     ========================================================= */
  function gameSeriesParallel(stage) {
    var S = shell(stage, {
      ref: 'REF B9', title: 'Series / Parallel', accent: 'amber',
      concept: 'Combine two resistors — series adds, parallel divides.',
      hint: 'Series: R1 + R2 · Parallel: (R1·R2)/(R1+R2).'
    });
    var round = 0, total = 6;
    function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
    function fmt(r) { return r >= 1000 ? +(r / 1000).toFixed(2) + ' kΩ' : Math.round(r) + ' Ω'; }
    function newRound() {
      round++;
      if (round > total) return finishGeneric(stage, S, 'Networks solved', 'Series adds; a parallel pair always sits below the smaller resistor — the basis of every divider and load calc.', newRound);
      S.setRound('R ' + round + ' / ' + total);
      var R1 = rnd([100, 220, 330, 470, 1000, 2200, 4700]);
      var R2 = rnd([100, 220, 330, 470, 1000, 2200, 4700]);
      var mode = Math.random() < 0.5 ? 'series' : 'parallel';
      var val = mode === 'series' ? (R1 + R2) : Math.round((R1 * R2) / (R1 + R2));
      var opts = [val], guard = 0;
      var alt = mode === 'series' ? Math.round((R1 * R2) / (R1 + R2)) : (R1 + R2);
      if (alt > 0 && opts.indexOf(alt) === -1) opts.push(alt);
      while (opts.length < 4 && guard++ < 60) {
        var cand = Math.round(val * rnd([0.5, 2, 1.5, 0.75, 3]));
        if (cand > 0 && opts.indexOf(cand) === -1) opts.push(cand);
      }
      shuffle(opts);
      S.body.innerHTML = '';
      S.body.appendChild(h('p', { class: 'ohm-q', text: 'R1 = ' + fmt(R1) + ' , R2 = ' + fmt(R2) + '  ·  ' + mode.toUpperCase() + '  →  R = ?' }));
      var grid = h('div', { class: 'gm-opts gm-opts--mono' });
      opts.forEach(function (o) {
        var btn = h('button', { class: 'gm-opt', type: 'button', text: fmt(o) });
        btn.addEventListener('click', function () {
          if (o === val) { addScore(6); snd('bwoop'); btn.classList.add('right'); S.setStatus('✓ R = ' + fmt(val) + ' — +6 pts', 'ok'); Array.prototype.forEach.call(grid.children, function (b) { b.disabled = true; }); setTimeout(newRound, REDUCE ? 0 : 750); }
          else { snd('relay'); btn.classList.add('wrong'); btn.disabled = true; S.setStatus(mode === 'series' ? '✗ Series adds: R1 + R2.' : '✗ Parallel: (R1·R2)/(R1+R2).', 'bad'); }
        });
        grid.appendChild(btn);
      });
      S.body.appendChild(grid);
    }
    newRound();
  }

  /* =========================================================
     GAME 10 — POWER LAW
     ========================================================= */
  function gamePower(stage) {
    var S = shell(stage, {
      ref: 'REF B10', title: 'Power Law', accent: 'violet',
      concept: 'P = V × I = I²R. Find the power dissipated.',
      hint: 'P = V·I  (or I²·R).'
    });
    var round = 0, total = 6;
    function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
    function fmtI(i) { return i >= 1 ? i + ' A' : Math.round(i * 1000) + ' mA'; }
    function fmtP(p) { return p >= 1 ? +p.toFixed(2) + ' W' : Math.round(p * 1000) + ' mW'; }
    function newRound() {
      round++;
      if (round > total) return finishGeneric(stage, S, 'Power mastered', 'P = V·I sizes resistors, regulators and heat-sinks — exceed a part’s rating and it lets the magic smoke out.', newRound);
      S.setRound('Q ' + round + ' / ' + total);
      var mode = Math.random() < 0.5 ? 'vi' : 'ir';
      var prompt, P;
      if (mode === 'vi') { var V = rnd([3.3, 5, 9, 12]); var I = rnd([0.01, 0.05, 0.1, 0.2, 0.5, 1]); P = +(V * I).toFixed(3); prompt = 'V = ' + V + ' V , I = ' + fmtI(I) + '  →  P = ?'; }
      else { var I2 = rnd([0.05, 0.1, 0.2, 0.5]); var R = rnd([10, 22, 47, 100, 220]); P = +(I2 * I2 * R).toFixed(3); prompt = 'I = ' + fmtI(I2) + ' , R = ' + R + ' Ω  →  P = ?'; }
      var opts = [P], guard = 0;
      while (opts.length < 4 && guard++ < 60) { var cand = +(P * rnd([0.5, 2, 1.5, 0.25, 4])).toFixed(3); if (cand > 0 && opts.indexOf(cand) === -1) opts.push(cand); }
      shuffle(opts);
      S.body.innerHTML = '';
      S.body.appendChild(h('p', { class: 'ohm-q', text: prompt }));
      var grid = h('div', { class: 'gm-opts gm-opts--mono' });
      opts.forEach(function (o) {
        var btn = h('button', { class: 'gm-opt', type: 'button', text: fmtP(o) });
        btn.addEventListener('click', function () {
          if (o === P) { addScore(6); snd('bwoop'); btn.classList.add('right'); S.setStatus('✓ P = ' + fmtP(P) + ' — +6 pts', 'ok'); Array.prototype.forEach.call(grid.children, function (b) { b.disabled = true; }); setTimeout(newRound, REDUCE ? 0 : 750); }
          else { snd('relay'); btn.classList.add('wrong'); btn.disabled = true; S.setStatus(mode === 'vi' ? '✗ P = V × I.' : '✗ P = I² × R.', 'bad'); }
        });
        grid.appendChild(btn);
      });
      S.body.appendChild(grid);
    }
    newRound();
  }

  /* ---------- shared "finish" screen ---------- */
  function finishGeneric(stage, S, big, sub, again) {
    S.body.innerHTML = '';
    S.setRound('COMPLETE');
    S.body.appendChild(h('div', { class: 'gm-done' }, [
      h('p', { class: 'gm-done__big', text: '✓ ' + big }),
      h('p', { class: 'gm-done__sub', text: sub }),
      h('button', { class: 'gm-btn', type: 'button', onclick: function () { again(); } }, ['↺ PLAY AGAIN']),
      h('button', { class: 'gm-btn gm-btn--ghost', type: 'button', onclick: function () { buildHub(stage); } }, ['◀ ALL GAMES'])
    ]));
    S.setStatus('Great run ▶', 'ok');
  }

  /* ---------- util ---------- */
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------- the hub ---------- */
  var CATALOG = [
    { ref: 'REF B1', accent: 'cyan',   icon: '0x', title: 'Bitfield Blaster', tag: 'STM32F446RE · bitfields', desc: 'Flip register bits to configure GPIO the bare-metal way.', run: gameBitfield },
    { ref: 'REF B2', accent: 'violet', icon: '&', title: 'Logic Gate Lab', tag: 'AND · OR · XOR · NAND', desc: 'Drive the switches so the gate output hits the target.', run: gameGates },
    { ref: 'REF B3', accent: 'amber',  icon: 'Ω', title: "Ohm's Law", tag: 'V = I × R', desc: 'Two values given — solve for the third.', run: gameOhms },
    { ref: 'REF B4', accent: 'green',  icon: '▦', title: 'Resistor Decoder', tag: '4-band colour code', desc: 'Read the colour bands, pick the resistance.', run: gameResistor },
    { ref: 'REF B5', accent: 'cyan',   icon: '01', title: 'Binary / Hex Sprint', tag: 'dec · bin · hex', desc: 'Race through base conversions.', run: gameBase },
    { ref: 'REF B6', accent: 'amber',  icon: 'τ', title: 'RC Time Constant', tag: 'τ = R × C', desc: 'Read R and C, pick the time constant.', run: gameRC },
    { ref: 'REF B7', accent: 'green',  icon: '◇', title: 'LED Resistor Sizing', tag: 'R = (Vs − Vf) / I', desc: 'Size the series resistor that protects an LED.', run: gameLED },
    { ref: 'REF B8', accent: 'violet', icon: '⊟', title: 'Voltage Divider', tag: 'Vout = Vin·R2/(R1+R2)', desc: 'Solve the output of a two-resistor divider.', run: gameDivider },
    { ref: 'REF B9', accent: 'amber',  icon: '⇌', title: 'Series / Parallel', tag: 'R combination', desc: 'Combine two resistors in series or parallel.', run: gameSeriesParallel },
    { ref: 'REF B10', accent: 'violet', icon: 'P', title: 'Power Law', tag: 'P = V × I = I²R', desc: 'Find the power dissipated.', run: gamePower }
  ];

  function buildHub(stage) {
    var grid = document.getElementById('gm-grid');
    if (stage) { stage.hidden = true; stage.innerHTML = ''; }
    if (!grid) return;
    grid.innerHTML = '';
    CATALOG.forEach(function (g) {
      var card = h('button', {
        class: 'gm-card gm-card--' + g.accent, type: 'button',
        'aria-label': g.title + ' — ' + g.tag,
        onclick: function () { snd('click'); openGame(g); }
      }, [
        h('span', { class: 'gm-card__ref', text: g.ref }),
        h('span', { class: 'gm-card__icon', html: g.icon }),
        h('span', { class: 'gm-card__title', text: g.title }),
        h('span', { class: 'gm-card__tag', text: g.tag }),
        h('p', { class: 'gm-card__desc', text: g.desc }),
        h('span', { class: 'gm-card__go', text: 'LOAD BENCH ▶' })
      ]);
      grid.appendChild(card);
    });
  }

  function openGame(g) {
    var stage = document.getElementById('game-stage');
    if (!stage) return;
    try { g.run(stage); } catch (e) { console.error('game error', g.title, e); }
    if (!REDUCE) stage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- registry entry ---------- */
  window.Lab.register('games', function (_section, opts) {
    REDUCE = !!(opts && opts.reduce);
    scoreEl = document.getElementById('gm-score');
    score = 0; if (scoreEl) scoreEl.textContent = '0 PTS';
    buildHub(document.getElementById('game-stage'));
  });
})();
