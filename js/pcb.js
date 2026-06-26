/* =========================================================
   pcb.js — refined circuit-board backdrop.
   A mostly-static PCB: right-angle copper traces, junction
   pads, vias, IC footprints and mounting holes. A few traces
   carry a slow, soft "current" glow (no bouncing dots).
   ========================================================= */
(function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('pcb');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let w, h, dpr, raf, traces = [], pads = [], vias = [], ics = [], live = [];
  const STEP = 30;                 // routing grid
  const TRACE = 'rgba(45,120,170,';   // muted teal copper
  const TRACE2 = 'rgba(34,211,238,';   // cyan accent

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    drawStatic();
  }

  function snap(v) { return Math.round(v / STEP) * STEP; }

  function build() {
    traces = []; pads = []; vias = []; ics = []; live = [];
    const cols = Math.ceil(w / STEP), rows = Math.ceil(h / STEP);

    // generate right-angle traces from random start nodes
    const count = Math.min(90, Math.floor((w * h) / 14000));
    for (let i = 0; i < count; i++) {
      let x = snap(Math.random() * w), y = snap(Math.random() * h);
      const pts = [{ x, y }];
      const segs = 2 + ((Math.random() * 3) | 0);
      let horiz = Math.random() > .5;
      for (let s = 0; s < segs; s++) {
        const len = (1 + ((Math.random() * 4) | 0)) * STEP * (Math.random() > .5 ? 1 : -1);
        if (horiz) x += len; else y += len;
        x = Math.max(-STEP, Math.min(w + STEP, x));
        y = Math.max(-STEP, Math.min(h + STEP, y));
        pts.push({ x, y });
        horiz = !horiz;
      }
      traces.push(pts);
      if (Math.random() > .55) pads.push({ x: pts[0].x, y: pts[0].y });
      if (Math.random() > .7) vias.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
    }

    // a few IC footprints
    const icCount = Math.max(2, Math.floor((w * h) / 380000));
    for (let i = 0; i < icCount; i++) {
      const iw = (3 + (Math.random() * 3 | 0)) * STEP;
      const ih = (2 + (Math.random() * 2 | 0)) * STEP;
      ics.push({ x: snap(Math.random() * (w - iw)), y: snap(Math.random() * (h - ih)), w: iw, h: ih });
    }

    // pick a handful of longer traces to carry current glow
    if (!reduce) {
      const pool = traces.filter(t => t.length >= 3).sort(() => Math.random() - .5).slice(0, 6);
      live = pool.map(t => ({ pts: t, p: Math.random(), sp: 0.0015 + Math.random() * 0.002 }));
    }
  }

  function tracePath(pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, w, h);

    // base traces
    ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const t of traces) {
      tracePath(t);
      ctx.strokeStyle = TRACE + '0.10)';
      ctx.stroke();
    }
    // IC footprints
    for (const ic of ics) {
      ctx.strokeStyle = TRACE + '0.14)';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(ic.x, ic.y, ic.w, ic.h);
      // pin ticks
      ctx.strokeStyle = TRACE + '0.18)';
      const n = Math.max(2, Math.floor(ic.w / STEP));
      for (let i = 0; i <= n; i++) {
        const px = ic.x + (ic.w * i) / n;
        ctx.beginPath(); ctx.moveTo(px, ic.y); ctx.lineTo(px, ic.y - 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, ic.y + ic.h); ctx.lineTo(px, ic.y + ic.h + 6); ctx.stroke();
      }
    }
    // pads (square SMD) + vias (ring)
    for (const p of pads) {
      ctx.fillStyle = TRACE2 + '0.16)';
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
    for (const v of vias) {
      ctx.strokeStyle = TRACE + '0.22)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(v.x, v.y, 3.4, 0, 7); ctx.stroke();
    }
  }

  function pointAt(pts, p) {
    // p in [0,1] across total polyline length
    let total = 0; const segs = [];
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); segs.push(l); total += l; }
    let d = p * total;
    for (let i = 0; i < segs.length; i++) {
      if (d <= segs[i]) { const k = segs[i] ? d / segs[i] : 0; return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * k, y: pts[i].y + (pts[i + 1].y - pts[i].y) * k }; }
      d -= segs[i];
    }
    return pts[pts.length - 1];
  }

  function loop() {
    drawStatic();
    // soft current glow along the chosen traces (short bright segment, not a dot)
    for (const L of live) {
      L.p += L.sp; if (L.p > 1.15) L.p = -0.15;
      const head = Math.max(0, Math.min(1, L.p));
      const tail = Math.max(0, head - 0.16);
      const a = pointAt(L.pts, tail), b = pointAt(L.pts, head);
      const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, TRACE2 + '0)');
      grad.addColorStop(1, TRACE2 + '0.5)');
      // re-trace the full polyline but only stroke the lit window via clip-ish overlay
      ctx.strokeStyle = grad; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      // bright tip
      ctx.fillStyle = TRACE2 + '0.7)';
      ctx.beginPath(); ctx.arc(b.x, b.y, 1.6, 0, 7); ctx.fill();
    }
    raf = requestAnimationFrame(loop);
  }

  resize();
  window.addEventListener('resize', () => { cancelAnimationFrame(raf); resize(); if (!reduce) loop(); });
  if (!reduce) loop();
})();
