/* ============================================================
   PORTFOLIO.PCB — blueprint interactions (vanilla, 0 deps)
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- current year ---- */
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ---- mobile menu toggle ---- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
    });
    // close menu after choosing a link (mobile)
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- scroll reveal ---- */
  var sections = Array.prototype.slice.call(document.querySelectorAll('.section, .hero'));
  sections.forEach(function (s) { s.classList.add('reveal'); });

  if (reduce || !('IntersectionObserver' in window)) {
    sections.forEach(function (s) { s.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    sections.forEach(function (s) { io.observe(s); });
  }

  /* ---- active nav highlight ---- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var targets = navLinks
    .map(function (a) {
      var id = a.getAttribute('href');
      return (id && id.charAt(0) === '#') ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  if ('IntersectionObserver' in window && targets.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var id = '#' + en.target.id;
          navLinks.forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    targets.forEach(function (t) { spy.observe(t); });
  }

  /* ---- GPIO lab (bare-metal register playground) ---- */
  try {
    if (window.Lab && window.Lab._m && typeof window.Lab._m.gpio === 'function') {
      window.Lab._m.gpio();
    }
  } catch (e) { /* never break the page */ }

  /* ---- sim bench (TP4056 / 18650 / Nucleo / OLED) ---- */
  try {
    if (window.Lab && window.Lab._m && typeof window.Lab._m.sim === 'function') {
      window.Lab._m.sim({ reduce: reduce });
    }
  } catch (e) { /* never break the page */ }

  /* ---- games hub (lazy init via games.js registry) ---- */
  var playground = document.getElementById('playground');
  function initGames() {
    try {
      if (window.Lab && window.Lab._m && typeof window.Lab._m.games === 'function') {
        window.Lab._m.games(playground, { reduce: reduce });
      }
    } catch (e) { /* never break the page */ }
  }
  if (playground) {
    if (reduce || !('IntersectionObserver' in window)) {
      initGames();
    } else {
      var gio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { initGames(); gio.disconnect(); }
        });
      }, { rootMargin: '250px 0px' });
      gio.observe(playground);
    }
  }

  /* ---- back to top ---- */
  var toTop = document.getElementById('to-top');
  if (toTop) {
    var onScroll = function () {
      if (window.scrollY > 600) toTop.classList.add('show');
      else toTop.classList.remove('show');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }
})();
