/* =========================================================
   shiftreg.js — Skills as a 74HC595 shift-out.
   Registers 'shiftreg'. Builds 8 register cells (#sr-stages),
   clocks bits in serially (SER/SRCLK toggles), latches on
   RCLK, and as each Q0–Q3 output goes high it "lights" the
   matching skill bank (.skillbank[data-q]). Q4–Q7 just blink.
   Replay via #sr-btn.
   ========================================================= */
(function () {
  'use strict';
  window.Lab = window.Lab || { _m: {}, register(n, f) { this._m[n] = f; } };

  window.Lab.register('shiftreg', function (_section, opts) {
    const reduce = opts && opts.reduce;
    const stagesEl = document.getElementById('sr-stages');
    const ser = document.getElementById('sr-ser');
    const clk = document.getElementById('sr-clk');
    const rclk = document.getElementById('sr-rclk');
    const btn = document.getElementById('sr-btn');
    const banks = Array.prototype.slice.call(document.querySelectorAll('.skillbank'));
    if (!stagesEl) return;

    // build 8 cells Q7..Q0 visually (MSB first on the left)
    const cells = [];
    stagesEl.innerHTML = '';
    for (let q = 7; q >= 0; q--) {
      const c = document.createElement('div');
      c.className = 'sr__cell';
      c.innerHTML = `<span class="q">Q${q}</span><span class="v">0</span>`;
      stagesEl.appendChild(c);
      cells[q] = c;
    }
    const valOf = (q) => cells[q].querySelector('.v');

    const sleep = (ms) => new Promise(r => setTimeout(r, reduce ? 0 : ms));
    let running = false;

    function setReg(v) {
      // v = string b7..b0 ; map cell q
      for (let q = 0; q < 8; q++) {
        const bit = v[7 - q] === '1';
        cells[q].classList.toggle('hi', bit);
        valOf(q).textContent = bit ? '1' : '0';
      }
    }

    function showAll() {
      banks.forEach(b => b.classList.add('lit'));
      for (let q = 0; q < 8; q++) { cells[q].classList.add('hi'); valOf(q).textContent = '1'; }
      if (ser) ser.textContent = '1'; if (clk) clk.textContent = '1'; if (rclk) rclk.textContent = '1';
    }

    async function run() {
      if (running) return; running = true;
      if (btn) { btn.disabled = true; btn.textContent = '⏵ CLOCKING…'; }
      if (reduce) { showAll(); running = false; if (btn) { btn.disabled = false; btn.textContent = '▶ REPLAY'; } return; }

      // reset
      let shift = [0, 0, 0, 0, 0, 0, 0, 0]; // index0 = Q0
      banks.forEach(b => b.classList.remove('lit'));
      cells.forEach(c => { c.classList.remove('hi'); });
      cells.forEach((c, q) => valOf(q).textContent = '0');

      // We want final pattern = 1111 1111 (all 8 outputs high),
      // lighting a skill bank each time one of Q0..Q3 latches.
      for (let n = 0; n < 8; n++) {
        // 1) present bit on SER
        if (ser) { ser.textContent = '1'; ser.classList.add('hi'); }
        await sleep(120);
        // 2) rising edge SRCLK -> shift everything left (toward Q7), new bit into Q0
        if (clk) { clk.textContent = '1'; clk.classList.add('hi'); }
        for (let q = 7; q > 0; q--) shift[q] = shift[q - 1];
        shift[0] = 1;
        // visualize internal shift register (pre-latch) with a shimmer
        cells.forEach((c, q) => {
          c.classList.toggle('shift', shift[q] === 1);
        });
        await sleep(150);
        if (clk) { clk.textContent = '0'; clk.classList.remove('hi'); }
        if (ser) { ser.classList.remove('hi'); }
        await sleep(90);

        // 3) RCLK latch -> outputs update
        if (rclk) { rclk.textContent = '1'; rclk.classList.add('hi'); }
        const bits = shift.slice().reverse().map(x => x ? '1' : '0').join('');
        setReg(bits);
        cells.forEach(c => c.classList.remove('shift'));
        // light a skill bank as its Q latches high (Q0..Q3 = 4 banks)
        const litQ = n; // on nth clock, Q(n) just became... actually Q0 newest
        // Map: bank index k lights when its Qk is high. Reveal in order Q0..Q3.
        banks.forEach(b => { const q = +b.dataset.q; if (shift[q]) b.classList.add('lit'); });
        await sleep(140);
        if (rclk) { rclk.textContent = '0'; rclk.classList.remove('hi'); }
        await sleep(120);
      }
      // ensure all banks shown
      banks.forEach(b => b.classList.add('lit'));
      running = false;
      if (btn) { btn.disabled = false; btn.textContent = '▶ REPLAY'; }
    }

    if (btn) btn.addEventListener('click', run);
    // auto-run once on activation
    run();
  });
})();
