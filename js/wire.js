/* =========================================================
   wire.js — Interactive "connect a wire" contact gateway
   Drag from the battery + terminal to the bulb node.
   When the wire lands on the bulb, the circuit closes:
   the bulb lights up and the contact details power on.
   Works with mouse + touch (pointer events).
   ========================================================= */
(function () {
  'use strict';

  const svg     = document.getElementById('wire-svg');
  const plus    = document.getElementById('node-plus');
  const bulbNode= document.getElementById('node-bulb');
  const live    = document.getElementById('live-wire');
  const done    = document.getElementById('done-wire');
  const lab      = document.querySelector('.circuit-lab');
  const status  = document.querySelector('.lab-status');
  const labText = document.getElementById('lab-text');
  const reveal  = document.getElementById('contact-reveal');

  if (!svg || !plus || !bulbNode || !live || !done) return;

  let dragging = false;
  let connected = false;

  // Fixed endpoints in SVG user-space (match the markup).
  const START = { x: 150, y: 160 };
  const END   = { x: 640, y: 230 };
  const HIT_RADIUS = 46; // how close the drop must be to the bulb node

  // Convert a pointer event to SVG coordinates regardless of CSS scaling.
  function toSvg(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }

  // A nice slack curve between two points (cable droop).
  function cable(a, b) {
    const midX = (a.x + b.x) / 2;
    const droop = Math.min(90, Math.hypot(b.x - a.x, b.y - a.y) * 0.18);
    const cy = Math.max(a.y, b.y) + droop;
    return `M ${a.x} ${a.y} Q ${midX} ${cy} ${b.x} ${b.y}`;
  }

  function armSource(on) {
    plus.classList.toggle('armed', on);
    bulbNode.classList.toggle('target', on);
  }

  function startDrag(evt) {
    if (connected) return;
    evt.preventDefault();
    dragging = true;
    svg.classList.add('dragging');
    armSource(true);
    const p = toSvg(evt);
    live.setAttribute('d', cable(START, p));
    if (svg.setPointerCapture && evt.pointerId != null) {
      try { svg.setPointerCapture(evt.pointerId); } catch (e) {}
    }
  }

  function moveDrag(evt) {
    if (!dragging) return;
    const p = toSvg(evt);
    live.setAttribute('d', cable(START, p));
    // visual hint when hovering near the bulb
    const near = Math.hypot(p.x - END.x, p.y - END.y) < HIT_RADIUS;
    live.style.stroke = near ? 'var(--green)' : 'var(--amber)';
  }

  function endDrag(evt) {
    if (!dragging) return;
    dragging = false;
    svg.classList.remove('dragging');
    const p = toSvg(evt);
    const near = Math.hypot(p.x - END.x, p.y - END.y) < HIT_RADIUS;
    if (near) {
      closeCircuit();
    } else {
      // snap back
      live.setAttribute('d', '');
      live.style.stroke = 'var(--amber)';
      armSource(false);
    }
  }

  function closeCircuit() {
    connected = true;
    armSource(false);
    live.setAttribute('d', '');
    try { window.dispatchEvent(new Event('lab:connect')); } catch (_) {}

    // draw the committed wire and animate current flowing into it
    done.setAttribute('d', cable(START, END));
    // force reflow so the dash animation runs
    void done.getBoundingClientRect();
    done.classList.add('flow');

    // light everything up after the current "arrives"
    setTimeout(() => {
      lab.classList.add('lab-on');
      status.classList.add('on');
      if (labText) labText.textContent = 'CIRCUIT CLOSED — power flowing ⚡';
      if (reveal) {
        reveal.classList.add('show');
        reveal.setAttribute('aria-hidden', 'false');
      }
    }, 850);
  }

  // Pointer events cover mouse + touch + pen.
  plus.addEventListener('pointerdown', startDrag);
  svg.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  // Keyboard / click accessibility: clicking the + terminal also closes it.
  plus.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!connected) closeCircuit(); }
  });
  plus.setAttribute('tabindex', '0');
  plus.setAttribute('role', 'button');
  plus.setAttribute('aria-label', 'Connect the wire to power on contact details');

  // Fallback: a plain double-click anywhere on the board completes it
  // (so nobody is ever stuck unable to see the contact info).
  svg.addEventListener('dblclick', () => { if (!connected) closeCircuit(); });
})();
