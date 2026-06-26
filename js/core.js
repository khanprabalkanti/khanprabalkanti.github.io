/* =========================================================
   core.js — orchestrator (loaded LAST)
   - window.Lab registry: modules register activation fns,
     core fires them once when their section scrolls in.
   - STM32 register-write boot sequence
   - nav, system rail, scroll reveals, to-top, year
   ========================================================= */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---- registry (modules registered before core via window.Lab) ---- */
  const Lab = window.Lab || (window.Lab = { _m: {}, register(n, f) { this._m[n] = f; } });
  Lab.reduce = reduce;
  const fired = {};
  function activate(name, section) {
    if (fired[name]) return;
    fired[name] = true;
    const fn = Lab._m[name];
    if (typeof fn === 'function') {
      try { fn(section, { reduce }); } catch (e) { console.error('Lab module error:', name, e); }
    }
  }

  /* ---- built-in simple activations: DMA (projects) + TIMER (experience) ---- */
  Lab.register('dma', (section) => {
    const cards = Array.prototype.slice.call(section.querySelectorAll('.pcard'));
    cards.forEach((c, i) => setTimeout(() => c.classList.add('dma-in'), reduce ? 0 : i * 130));
  });
  Lab.register('timeline', (section) => {
    const tl = section.querySelector('.timeline');
    if (tl) tl.classList.add('run');
    Array.prototype.slice.call(section.querySelectorAll('.tl-item'))
      .forEach((it, i) => setTimeout(() => it.classList.add('exec'), reduce ? 0 : 250 + i * 260));
  });

  /* ===================== INTRO (breadboard assembly) ===================== */
  const asm = $('#assembly');
  let entered = false;
  function enterSite() {
    if (entered) return; entered = true;
    if (asm) asm.classList.add('done');
    document.body.classList.remove('no-scroll');
    startHeroBits();
    // clean up the overlay after its fade so it can't trap pointer events
    setTimeout(() => { if (asm && asm.parentNode) asm.style.display = 'none'; }, 700);
  }

  function startIntro() {
    const hash = location.hash;
    // deep-link or explicit skip → bypass the intro entirely
    if (!asm || (hash && hash !== '#home') || hash === '#skipboot') {
      if (asm) asm.style.display = 'none';
      enterSite();
      if (hash && hash !== '#skipboot' && hash !== '#home') {
        setTimeout(() => { const el = $(hash); if (el) el.scrollIntoView(); }, 80);
      }
      return;
    }
    document.body.classList.add('no-scroll');
    const intro = Lab._m['intro'];
    if (typeof intro === 'function') {
      try { intro(enterSite, { reduce }); }
      catch (e) { console.error('intro error', e); enterSite(); }
    } else { enterSite(); }
  }

  /* ===================== HERO typed + bits ===================== */
  let heroStarted = false;
  function startHeroBits() {
    if (heroStarted) return; heroStarted = true;
    // typing
    const typed = $('#typed');
    const roles = [
      'Embedded Systems & IoT Developer',
      'Bare-metal Firmware · STM32 · ESP32',
      'Hardware Troubleshooting & Assembly',
      'Content Creator @ TechanicZ',
    ];
    if (typed) {
      if (reduce) { typed.textContent = roles[0]; }
      else {
        let r = 0, c = 0, del = false;
        (function tick() {
          const w = roles[r];
          typed.textContent = del ? w.slice(0, --c) : w.slice(0, ++c);
          if (!del && c === w.length) { del = true; return setTimeout(tick, 1500); }
          if (del && c === 0) { del = false; r = (r + 1) % roles.length; }
          setTimeout(tick, del ? 38 : 72);
        })();
      }
    }
    activate('mcu', $('#home'));
  }

  /* ===================== NAV ===================== */
  const nav = $('#nav'), burger = $('#nav-burger'), links = $('#nav-links');
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    const tt = $('#to-top'); if (tt) tt.classList.toggle('show', window.scrollY > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  window.addEventListener('resize', () => {
    if (window.innerWidth > 880 && links && links.classList.contains('open')) {
      links.classList.remove('open'); burger && burger.classList.remove('open');
    }
  });
  if (burger && links) {
    burger.addEventListener('click', () => {
      const open = links.classList.toggle('open'); burger.classList.toggle('open', open);
    });
    $$('a', links).forEach(a => a.addEventListener('click', () => { links.classList.remove('open'); burger.classList.remove('open'); }));
  }

  /* ===================== SYSTEM RAIL ===================== */
  const railItems = $$('.rail__list li');
  const railPc = $('#rail-pc');
  const railClk = $('#rail-clk');
  if (railClk && !reduce) setInterval(() => { railClk.classList.add('tick'); setTimeout(() => railClk.classList.remove('tick'), 120); }, 1000);

  function setRail(name) {
    railItems.forEach(li => {
      const on = li.dataset.rail === name;
      li.classList.toggle('on', on);
      if (on && railPc) {
        const b = li.querySelector('b'); if (b) railPc.textContent = 'PC ' + b.textContent;
      }
    });
  }

  /* ===================== OBSERVERS ===================== */
  // section activation + rail highlight
  const sections = $$('[data-rail]');
  if ('IntersectionObserver' in window) {
    const railObs = new IntersectionObserver((entries) => {
      // choose the most-visible intersecting section
      let best = null;
      entries.forEach(e => { if (e.isIntersecting && (!best || e.intersectionRatio > best.intersectionRatio)) best = e; });
      if (best) setRail(best.target.dataset.rail);
    }, { threshold: [0.25, 0.5], rootMargin: '-30% 0px -30% 0px' });
    sections.forEach(s => railObs.observe(s));

    const actObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const a = e.target.dataset.activate;
          if (a) activate(a, e.target);
          actObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    $$('[data-activate]').forEach(s => actObs.observe(s));

    // generic reveals + sec-head
    $$('.sec-head, .reveal').forEach(el => el.classList.add('reveal'));
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revObs.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$('.reveal').forEach(el => revObs.observe(el));
  } else {
    // no IO: activate everything
    $$('[data-activate]').forEach(s => activate(s.dataset.activate, s));
  }

  /* ===================== to-top + year ===================== */
  const tt = $('#to-top'); if (tt) tt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---- card tilt (fine pointers only) ---- */
  if (!reduce && window.matchMedia('(pointer:fine)').matches) {
    $$('.tilt').forEach(card => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(820px) rotateY(${px * 6}deg) rotateX(${-py * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  startIntro();
})();
