// CALLADO Zubehör – Werbevideo 16:9. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// Calm by design: long holds, slow eases, one movement at a time, lots of white.
(() => {
  const FPS = 30;
  const W = 1920, H = 1080;

  // Image panel on the right (stage px) and the overview tiles it shrinks into.
  const PANEL = { x: 920, y: 120, s: 840 };
  const TILE = { y: 400, s: 340, xs: [160, 580, 1000, 1420] };
  const IMG = 1000;               // product photos are 1000 × 1000
  const ZOOM = [1, 1, 1, 1, 1.25];// per panel layer; the Schrägelement sits small in its photo

  // Timeline, output seconds.
  const T = {
    panel: 0.25,                  // panel opens with the CALLADO mood image
    logo: 0.5,
    intro: [0.9, 4.85],           // copy in / out
    wipes: [5.2, 9.2, 13.2, 17.2],// panel changes to product 1…4
    grid: 21.2,                   // panel shrinks into the overview
    end: 25.4,                    // overview leaves, end card
  };
  const WIPE = 1.15;              // duration of a panel wipe
  const TOTAL = Math.round((T.end + 4.6) * FPS);   // 30 s

  // Callouts, in product-photo px.
  const STRIPE_LED = [368, 640];  // middle post, LED groove
  const COVER_LED = [612, 221];   // light band of the post cap
  const SLOPE = { a: [353, 216], b: [619, 460], off: 26, len: 0.93 };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outQuart: k => 1 - Math.pow(1 - k, 4),
    outSine: k => Math.sin((k * Math.PI) / 2),
    inCubic: k => k * k * k,
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    outBack: k => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  const showBox = (node, on) => { node.style.display = on ? '' : 'none'; };

  // Masked line: rises in from below, leaves upwards.
  function rise(span, t, tin, tout = null, din = 0.9, dout = 0.5) {
    const a = E.outQuart(prog(t, tin, din));
    const b = tout == null ? 0 : E.inCubic(prog(t, tout, dout));
    span.style.transform = `translateY(${(1 - a - b) * 110}%)`;
  }
  // Hairline: grows from the left, retracts to the right.
  function draw(node, t, tin, tout = null, din = 0.8, dout = 0.45) {
    const a = E.inOutCubic(prog(t, tin, din));
    const b = tout == null ? 0 : E.inOutCubic(prog(t, tout, dout));
    node.style.transformOrigin = b > 0 ? 'right' : 'left';
    node.style.transform = `scaleX(${b > 0 ? 1 - b : a})`;
  }
  // Block wipe left → right (in), cleared from the left (out). Shadow bleed stays visible.
  const BLEED = 40;
  function wipe(node, t, tin, tout = null, din = 0.9, dout = 0.6) {
    const a = E.outQuart(prog(t, tin, din));
    const b = tout == null ? 0 : E.inCubic(prog(t, tout, dout));
    if (a <= 0 || b >= 1) { show(node, false); return; }
    const w = node.offsetWidth + BLEED;
    show(node, true);
    node.style.clipPath = `inset(-${BLEED}px ${(1 - a) * w - BLEED}px -${BLEED}px ${b * w - BLEED}px)`;
  }
  // Copy block choreography: lines rise staggered, hairlines draw.
  function copy(root, t, tin, tout, gap = 0.08) {
    const on = t >= tin - 0.1 && (tout == null || t < tout + 1.2);
    showBox(root, on);
    if (!on) return;
    $$('.ln > span', root).forEach((s, i) => rise(s, t, tin + i * gap, tout == null ? null : tout + i * 0.035));
    $$('.kicker i', root).forEach(n => draw(n, t, tin + 0.1, tout, 0.6));
    $$('.rule', root).forEach(n => draw(n, t, tin + 0.45, tout, 0.8));
  }

  // ---------------------------------------------------------------- elements
  const el = {
    logo: $('#logo'), frame: $('#frame-rect'), panel: $('#panel'), pics: $$('#panel .pic'),
    edge: $('#edge'), ai: $('#ai'), intro: $('#intro'), products: $$('.product'),
    pager: $('#pager'), segs: $$('#pager .seg i'),
    stripe: $('#co-stripe'), cover: $('#co-cover'), slope: $('#co-slope'),
    lbStripe: $('#lb-stripe'), lbCover: $('#lb-cover'),
    gridHead: $('#grid-head'), tiles: $$('.tile'), caps: $$('.cap'),
    end: $('#end'), endLogo: $('#end-logo'), slogan: $('#end .slogan .ln > span'),
    btn: $('#cta .btn'), arrow: $('#cta .btn svg'), url: $('#cta .url'), urlLine: $('#cta .url i'),
  };
  const productIn = i => T.wipes[i] + 0.55;
  const productOut = i => (i < 3 ? T.wipes[i + 1] : T.grid) - 0.35;

  // ---------------------------------------------------------------- panel
  function panelRect(t) {
    const g = E.inOutCubic(prog(t, T.grid, 1.2));
    return { x: lerp(PANEL.x, TILE.xs[3], g), y: lerp(PANEL.y, TILE.y, g), s: lerp(PANEL.s, TILE.s, g) };
  }
  // Layer j: 0 = mood image, 1…4 = products. Revealed from the bottom, covered by the next.
  function layerState(j, t) {
    const start = j === 0 ? T.panel : T.wipes[j - 1];
    const next = j < 4 ? T.wipes[j] : null;
    const kin = j === 0 ? 1 : E.inOutCubic(prog(t, start, WIPE));
    const kout = next == null ? 0 : E.inOutCubic(prog(t, next, WIPE));
    // Slow settle: starts slightly pushed in, eases out over the scene.
    const s = ZOOM[j] * (j === 0 ? 1 + 0.14 * (1 - E.outSine(prog(t, start, 5.6)))
      : 1 + 0.06 * (1 - E.outSine(prog(t, start, 5.0))));
    return { on: t >= start && kin > 0 && kout < 1, kin, ty: (1 - kin) * 70 - kout * 70, s };
  }
  // Product-photo px → stage px for layer j (only used while the layer is settled).
  function imgToStage(j, p, t) {
    const r = panelRect(t), st = layerState(j, t), f = r.s / IMG;
    return [r.x + r.s / 2 + (p[0] * f - r.s / 2) * st.s, r.y + r.s / 2 + (p[1] * f - r.s / 2) * st.s + st.ty];
  }

  function renderPanel(t) {
    const r = panelRect(t);
    Object.assign(el.panel.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.s}px`, height: `${r.s}px` });
    const open = E.inOutCubic(prog(t, T.panel, 1.3));
    const close = E.inOutCubic(prog(t, T.end + 0.24, 0.8));
    showBox(el.panel, open > 0 && close < 1);
    el.panel.style.clipPath = `inset(${(1 - open) * 100}% 0 ${close * 100}% 0)`;

    let edge = open < 1 ? 1 - open : null;
    el.pics.forEach((pic, j) => {
      const st = layerState(j, t);
      show(pic, st.on);
      if (!st.on) return;
      pic.style.clipPath = `inset(${(1 - st.kin) * 100}% 0 0 0)`;
      pic.firstElementChild.style.transform = `translateY(${st.ty}px) scale(${st.s})`;
      if (st.kin > 0 && st.kin < 1) edge = 1 - st.kin;
    });
    show(el.edge, edge != null && open > 0);
    if (edge != null) el.edge.style.top = `${edge * 100}%`;

    el.ai.style.opacity = (prog(t, T.panel + 1.1, 0.5) * (1 - prog(t, T.wipes[0], 0.3))).toFixed(3);

    // Offset hairline frame behind the panel.
    const per = 4 * PANEL.s;
    const fin = E.inOutCubic(prog(t, T.panel + 0.7, 1.4)), fout = E.inOutCubic(prog(t, T.grid - 0.4, 0.8));
    show(el.frame, fin > 0 && fout < 1);
    el.frame.style.strokeDasharray = per;
    el.frame.style.strokeDashoffset = per * (1 - fin) - per * fout;
  }

  // ---------------------------------------------------------------- callouts
  function pin(g, label, j, p, t, tin, tout, dir) {
    const fade = 1 - prog(t, tout, 0.3);
    const on = t >= tin && fade > 0;
    show(g, on); show(label, on);
    if (!on) return;
    const [x, y] = imgToStage(j, p, t);
    const len = dir === 'right' ? [120, 0] : [0, 250];
    const k = E.inOutCubic(prog(t, tin + 0.25, 0.6));
    const [line, ring, core] = g.children;
    line.setAttribute('x1', x); line.setAttribute('y1', y);
    line.setAttribute('x2', x + len[0] * k); line.setAttribute('y2', y + len[1] * k);
    core.setAttribute('cx', x); core.setAttribute('cy', y);
    core.setAttribute('r', (6 * E.outBack(prog(t, tin, 0.45))).toFixed(2));
    ring.setAttribute('cx', x); ring.setAttribute('cy', y);
    ring.setAttribute('r', (15 * E.outBack(prog(t, tin + 0.1, 0.55))).toFixed(2));
    g.style.opacity = fade.toFixed(3);
    const ex = x + len[0], ey = y + len[1];
    label.style.left = `${dir === 'right' ? ex : ex - label.offsetWidth / 2}px`;
    label.style.top = `${dir === 'right' ? ey - label.offsetHeight / 2 : ey}px`;
    label.style.opacity = fade.toFixed(3);
    wipe(label, t, tin + 0.75, null, 0.6);
  }

  function slope(t, tin, tout) {
    const fade = 1 - prog(t, tout, 0.3);
    const on = t >= tin && fade > 0;
    show(el.slope, on);
    if (!on) return;
    const { a, b, off, len } = SLOPE;
    const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]);
    const n = [d[1] / L, -d[0] / L];                       // normal, away from the panel
    const A = [a[0] + n[0] * off, a[1] + n[1] * off];
    const B = [A[0] + d[0] * len, A[1] + d[1] * len];
    const k = E.inOutCubic(prog(t, tin + 0.2, 1.0));
    const sA = imgToStage(4, A, t), sB = imgToStage(4, B, t);
    const sE = [lerp(sA[0], sB[0], k), lerp(sA[1], sB[1], k)];
    const [main, tickA, tickB] = el.slope.children;
    const set = (ln, p, q) => { ln.setAttribute('x1', p[0]); ln.setAttribute('y1', p[1]); ln.setAttribute('x2', q[0]); ln.setAttribute('y2', q[1]); };
    set(main, sA, sE);
    const tick = (p, kk) => [[p[0] - n[0] * 11 * kk, p[1] - n[1] * 11 * kk], [p[0] + n[0] * 11 * kk, p[1] + n[1] * 11 * kk]];
    set(tickA, ...tick(sA, E.outQuart(prog(t, tin, 0.4))));
    set(tickB, ...tick(sB, E.outQuart(prog(t, tin + 1.1, 0.4))));
    tickB.style.opacity = k >= 1 ? 1 : 0;
    el.slope.style.opacity = fade.toFixed(3);
  }

  // ---------------------------------------------------------------- render
  function render(n) {
    const t = n / FPS;

    wipe(el.logo, t, T.logo, T.end, 1.0, 0.6);
    renderPanel(t);

    copy(el.intro, t, T.intro[0], T.intro[1]);
    el.products.forEach((p, i) => copy(p, t, productIn(i), productOut(i)));

    // Pager: one segment per product, filling while it is on screen.
    const pg = prog(t, productIn(0), 0.5) * (1 - prog(t, productOut(3), 0.4));
    show(el.pager, pg > 0);
    el.pager.style.opacity = pg.toFixed(3);
    el.segs.forEach((s, i) => { s.style.transform = `scaleX(${prog(t, T.wipes[i], 4.0)})`; });

    pin(el.stripe, el.lbStripe, 1, STRIPE_LED, t, T.wipes[0] + 1.4, productOut(0), 'right');
    pin(el.cover, el.lbCover, 2, COVER_LED, t, T.wipes[1] + 1.4, productOut(1), 'down');
    slope(t, T.wipes[3] + 1.4, productOut(3));

    // Overview: panel lands as the fourth tile, the other three open beside it.
    copy(el.gridHead, t, T.grid + 0.7, T.end);
    el.tiles.forEach((tile, i) => {
      const k = E.inOutCubic(prog(t, T.grid + 0.45 + i * 0.14, 1.0));
      const ke = E.inOutCubic(prog(t, T.end + i * 0.08, 0.8));
      show(tile, k > 0 && ke < 1);
      Object.assign(tile.style, { left: `${TILE.xs[i]}px`, top: `${TILE.y}px` });
      tile.style.clipPath = `inset(${(1 - k) * 100}% 0 ${ke * 100}% 0)`;
      tile.firstElementChild.style.transform = `translateY(${(1 - k) * 40}px)`;
    });
    el.caps.forEach((cap, i) => {
      const tin = T.grid + 1.25 + i * 0.1;
      const on = t >= tin - 0.1 && t < T.end + 1.2;
      showBox(cap, on);
      if (!on) return;
      Object.assign(cap.style, { left: `${TILE.xs[i]}px`, top: `${TILE.y + TILE.s + 30}px` });
      $$('.ln > span', cap).forEach((s, j) => rise(s, t, tin + j * 0.07, T.end + i * 0.05));
    });

    // End card.
    const endOn = t >= T.end + 0.9;
    showBox(el.end, endOn);
    if (endOn) {
      wipe(el.endLogo, t, T.end + 1.0, null, 1.1);
      rise(el.slogan, t, T.end + 1.5);
      wipe(el.btn, t, T.end + 1.9, null, 0.8);
      const ku = E.outQuart(prog(t, T.end + 2.1, 0.8));
      el.url.style.opacity = ku.toFixed(3);
      el.url.style.transform = `translateX(${(1 - ku) * -20}px)`;
      el.urlLine.style.transform = `scaleX(${E.inOutCubic(prog(t, T.end + 2.35, 0.8))})`;
      const nudge = t > T.end + 2.8 ? Math.pow(Math.sin(Math.PI * (((t - T.end - 2.8) % 2.0) / 2.0)), 2) : 0;
      el.arrow.style.transform = `translateX(${nudge * 7}px)`;
    }
  }

  async function seek(n) { render(n); }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img').map(img => img.decode()));
    const t0 = new URLSearchParams(location.search).get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, W, H, seek, ready: init() };
})();
