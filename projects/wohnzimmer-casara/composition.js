// Wohnzimmer CASARA – Shop the Look, Reel 9:16. One still photo, a virtual camera
// moving across it, and product markers glued to the photo.
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
(() => {
  const FPS = 30;
  const W = 1080, H = 1920;
  const IMG = { w: 1493, h: 2000 };            // photo px (the plate is 2x and drawn at this size)
  const TOTAL = 555;                            // 18.5 s
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/wohnzimmer-casara/plates';

  // Products, in photo px. `lock`: brackets lock on; `out`: card leaves (output seconds).
  const P = [
    { card: '#c-sofa',   bbox: [572, 1010, 1470, 1480], dot: [930, 1190],  lock: 2.80,  out: 4.95,  tag: 'right' },
    { card: '#c-sessel', bbox: [876, 1280, 1493, 2000], dot: [1010, 1640], lock: 5.80,  out: 7.80,  tag: 'left' },
    { card: '#c-tisch',  bbox: [10, 930, 384, 1196],    dot: [198, 1078],  lock: 8.80,  out: 10.55, tag: 'below' },
    { card: '#c-stuhl',  bbox: [296, 938, 512, 1208],   dot: [425, 1002],  lock: 11.30, out: 13.10, tag: 'above' },
  ];

  // End-card box the photo shrinks into (stage px).
  const BOX = { left: 72, top: 290, right: 1008, bottom: 1370 };
  const sEnd = (BOX.right - BOX.left) / IMG.w;
  const endCam = { cx: IMG.w / 2, cy: 1100, s: sEnd, ax: (BOX.left + BOX.right) / 2, ay: (BOX.top + BOX.bottom) / 2 };

  // Camera keys: photo point (cx, cy) sits on stage point (ax, ay) at scale s.
  const C = {
    hook:    { cx: 760,  cy: 1010, s: 1.00 },
    hook2:   { cx: 772,  cy: 1032, s: 1.07 },
    sofa:    { cx: 1030, cy: 1075, s: 1.18 },
    sofa2:   { cx: 1016, cy: 1085, s: 1.23 },
    sessel:  { cx: 1040, cy: 1190, s: 1.20 },
    sessel2: { cx: 1028, cy: 1200, s: 1.25 },
    tisch:   { cx: 352,  cy: 1060, s: 1.55 },
    tisch2:  { cx: 362,  cy: 1056, s: 1.61 },
    stuhl:   { cx: 460,  cy: 1030, s: 1.70 },
    stuhl2:  { cx: 454,  cy: 1024, s: 1.77 },
    end:     endCam,
    end2:    { ...endCam, s: sEnd * 1.03 },
  };
  // [start, end (output s), from, to, kind]. Moves ease in/out; their kind sets the motion blur.
  const MOVES = [
    [0.00,  2.15,  'hook',    'hook2',   'lin'],
    [2.15,  2.80,  'hook2',   'sofa',    'move'],
    [2.80,  5.20,  'sofa',    'sofa2',   'lin'],
    [5.20,  5.80,  'sofa2',   'sessel',  'move'],
    [5.80,  8.05,  'sessel',  'sessel2', 'lin'],
    [8.05,  8.80,  'sessel2', 'tisch',   'whip'],     // whip across the room
    [8.80,  10.80, 'tisch',   'tisch2',  'lin'],
    [10.80, 11.30, 'tisch2',  'stuhl',   'move'],
    [11.30, 13.35, 'stuhl',   'stuhl2',  'lin'],
    [13.35, 14.35, 'stuhl2',  'end',     'zoom'],
    [14.35, 99,    'end',     'end2',    'lin'],
  ];
  const BLUR = { lin: 0, move: 0.14, whip: 0.3, zoom: 0 };   // blur px per stage px of pan per frame
  const END = { start: 13.35, dur: 1.0 };         // photo shrinks into BOX
  const T = { logo: 0.05, hook: [0.15, 1.85], title: 14.15, pins: 14.45, cta: 15.0 };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutQuint: k => (k < 0.5 ? 16 * Math.pow(k, 5) : 1 - Math.pow(-2 * k + 2, 5) / 2),
    outBack: k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  const showBox = (node, on) => { node.style.display = on ? '' : 'none'; };

  // Block wipe: opens left→right, leaves left→right. Shadow bleed stays visible.
  const BLEED = 80;
  function wipe(el, t, tin, tout, din = 0.55, dout = 0.38) {
    const a = E.outExpo(prog(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
    if (a <= 0 || b >= 1) { show(el, false); return; }
    const w = el.offsetWidth + BLEED;
    show(el, true);
    el.style.clipPath = `inset(-${BLEED}px ${(1 - a) * w - BLEED}px -${BLEED}px ${b * w - BLEED}px)`;
  }

  // Masked line rise.
  function rise(span, t, tin, dur = 0.65) {
    const k = E.outExpo(prog(t, tin, dur));
    span.style.transform = `translateY(${(1 - k) * 108}%)`;
  }

  // Standard stack choreography: blocks wipe in staggered, their lines rise after.
  function stack(root, t, tin, tout, { gap = 0.09, outGap = 0.05 } = {}) {
    $$(':scope > .blk', root).forEach((blk, i) => {
      const bi = tin + i * gap;
      wipe(blk, t, bi, tout == null ? null : tout + i * outGap);
      $$('.ln > span', blk).forEach((s, j) => rise(s, t, bi + 0.12 + j * 0.06));
    });
  }

  // ---------------------------------------------------------------- camera
  function clipRect(t) {
    const e = E.inOutCubic(prog(t, END.start, END.dur));
    return { left: BOX.left * e, top: BOX.top * e, right: lerp(W, BOX.right, e), bottom: lerp(H, BOX.bottom, e), e };
  }
  function cam(t) {
    const [t0, t1, a, b, kind] = MOVES.find(m => t < m[1]) || MOVES[MOVES.length - 1];
    const A = C[a], B = C[b];
    const k0 = prog(t, t0, t1 - t0);
    const k = kind === 'lin' ? k0 : E.inOutQuint(k0);
    const c = {
      cx: lerp(A.cx, B.cx, k), cy: lerp(A.cy, B.cy, k),
      s: A.s * Math.pow(B.s / A.s, k), blur: BLUR[kind],
      ax: lerp(A.ax ?? W / 2, B.ax ?? W / 2, k), ay: lerp(A.ay ?? H / 2, B.ay ?? H / 2, k),
    };
    // Keep the photo covering the visible window.
    const R = clipRect(t);
    c.cx = clamp(c.cx, (c.ax - R.left) / c.s, IMG.w - (R.right - c.ax) / c.s);
    c.cy = clamp(c.cy, (c.ay - R.top) / c.s, IMG.h - (R.bottom - c.ay) / c.s);
    return c;
  }
  const toStage = (c, p) => [c.ax + (p[0] - c.cx) * c.s, c.ay + (p[1] - c.cy) * c.s];
  
  // ---------------------------------------------------------------- markers
  function makeDot(parent) {
    const d = document.createElement('div');
    d.className = 'dot';
    d.innerHTML = '<div class="pulse"></div><div class="ring"></div><div class="core"></div>';
    parent.appendChild(d);
    return d;
  }
  function placeDot(d, pos, t, tin, tout) {
    const s = E.outBack(prog(t, tin, 0.42)) * (1 - E.inCubic(prog(t, tout, 0.25)));
    if (!pos || s <= 0.001) { show(d, false); return; }
    show(d, true);
    d.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`;
    $('.core', d).style.transform = `translate(-50%, -50%) scale(${s})`;
    $('.ring', d).style.transform = `translate(-50%, -50%) scale(${s})`;
    const ph = (((t - tin - 0.25) % 1.1) + 1.1) % 1.1 / 1.1;
    const pulse = $('.pulse', d);
    pulse.style.transform = `translate(-50%, -50%) scale(${1 + 1.5 * ph})`;
    pulse.style.opacity = t > tin + 0.25 ? (0.85 * (1 - ph) * Math.min(1, s)).toFixed(3) : 0;
  }
  function makePin(parent, i) {
    const d = document.createElement('div');
    d.className = 'dot';
    d.innerHTML = `<div class="pulse"></div><div class="num">${String(i + 1).padStart(2, '0')}</div>`;
    parent.appendChild(d);
    return d;
  }

  // Corner brackets around a rect.
  function bracketPath(r) {
    const L = Math.min(56, (r.r - r.l) / 3, (r.b - r.t) / 3);
    return `M${r.l} ${r.t + L}V${r.t}H${r.l + L}` + `M${r.r - L} ${r.t}H${r.r}V${r.t + L}`
      + `M${r.r} ${r.b - L}V${r.b}H${r.r - L}` + `M${r.l + L} ${r.b}H${r.l}V${r.b - L}`;
  }

  // ---------------------------------------------------------------- elements
  const el = {
    footage: $('#footage'), photo: $('#photo'), blur: $('#mblur-g'),
    spot: $('#spot'), brackets: $('#brackets'), leader: $('#leader'), frameRect: $('#frame-rect'),
    logo: $('#logo'), hook: $('#hook'), cards: P.map(p => $(p.card)),
    title: $('#end-title'), etags: $$('#etags .etag'),
    btn: $('#cta .btn'), arrow: $('#cta .btn svg'), url: $('#cta .url'), urlLine: $('#cta .url i'),
    slogan: $('#slogan .ln > span'),
  };
  const dotsLayer = $('#dots');
  const dots = P.map(() => makeDot(dotsLayer));
  const pins = P.map((_, i) => makePin(dotsLayer, i));
  let cardEdges = [];

  // ---------------------------------------------------------------- render
  function render(n) {
    const t = n / FPS;
    const c = cam(t);

    // Photo + directional motion blur from the camera's speed at the stage centre.
    const R = clipRect(t);
    el.footage.style.clipPath = R.e > 0 ? `inset(${R.top}px ${W - R.right}px ${H - R.bottom}px ${R.left}px)` : 'none';
    el.photo.style.transform = `translate(${c.ax - c.cx * c.s}px, ${c.ay - c.cy * c.s}px) scale(${c.s})`;
    // Pan speed only (stage px per frame); zooms stay sharp.
    const c1 = cam(t + 1 / FPS);
    const bx = Math.min(60, Math.abs(c1.cx - c.cx) * c.s * c.blur), by = Math.min(60, Math.abs(c1.cy - c.cy) * c.s * c.blur);
    el.blur.setAttribute('stdDeviation', `${bx.toFixed(1)} ${by.toFixed(1)}`);
    el.photo.style.filter = bx > 0.6 || by > 0.6 ? 'url(#mblur)' : 'none';

    // Persistent logo plate.
    wipe(el.logo, t, T.logo, null, 0.6);

    // 00 Hook.
    showBox(el.hook, t < T.hook[1] + 0.8);
    stack(el.hook, t, T.hook[0], T.hook[1], { gap: 0.1 });

    // 01–04 Products: brackets lock on, spotlight, dot, leader line, card.
    let active = null;
    P.forEach((p, i) => {
      const card = el.cards[i];
      stack(card, t, p.lock + 0.45, p.out);
      placeDot(dots[i], toStage(c, p.dot), t, p.lock + 0.12, p.out + 0.2);
      if (t >= p.lock && t < p.out + 0.45) active = i;
    });
    if (active == null) {
      show(el.brackets, false); show(el.leader, false); show(el.spot, false);
    } else {
      const p = P[active];
      const lockK = E.outExpo(prog(t, p.lock, 0.65));
      const exitK = E.inCubic(prog(t, p.out + 0.05, 0.4));
      const d0 = toStage(c, p.dot);
      const [l0, t0] = toStage(c, [p.bbox[0], p.bbox[1]]), [r0, b0] = toStage(c, [p.bbox[2], p.bbox[3]]);
      const pad = 18, m = 30;
      const target = { l: clamp(l0 - pad, m, W - m), t: clamp(t0 - pad, m, H - m), r: clamp(r0 + pad, m, W - m), b: clamp(b0 + pad, m, H - m) };
      const grow = 26 * exitK;
      const r = {
        l: lerp(d0[0] - 34, target.l, lockK) - grow, t: lerp(d0[1] - 34, target.t, lockK) - grow,
        r: lerp(d0[0] + 34, target.r, lockK) + grow, b: lerp(d0[1] + 34, target.b, lockK) + grow,
      };
      show(el.brackets, true);
      el.brackets.setAttribute('d', bracketPath(r));
      el.brackets.style.opacity = (1 - exitK).toFixed(3);
      show(el.spot, true);
      Object.assign(el.spot.style, { left: `${r.l}px`, top: `${r.t}px`, width: `${r.r - r.l}px`, height: `${r.b - r.t}px` });
      el.spot.style.setProperty('--veil', `rgba(14, 34, 52, ${(0.34 * lockK * (1 - exitK)).toFixed(3)})`);

      // Leader: from the dot straight to the card edge, drawn out of the dot.
      const edge = cardEdges[active];
      const ex = clamp(d0[0], edge.l + 40, edge.r - 40), ey = edge.y;
      const draw = E.inOutCubic(prog(t, p.lock + 0.3, 0.45));
      const back = E.inCubic(prog(t, p.out, 0.3));
      const lineOn = draw > 0 && back < 1;
      show(el.leader, lineOn);
      if (lineOn) {
        el.leader.setAttribute('x1', lerp(d0[0], ex, back)); el.leader.setAttribute('y1', lerp(d0[1], ey, back) + (ey < d0[1] ? -26 : 26) * (1 - back));
        el.leader.setAttribute('x2', lerp(d0[0], ex, draw)); el.leader.setAttribute('y2', lerp(d0[1] + (ey < d0[1] ? -26 : 26), ey, draw));
      }
    }

    // End card: frame line, title, numbered pins with name tags, CTA.
    const fr = E.inOutCubic(prog(t, END.start + 0.7, 0.9));
    show(el.frameRect, fr > 0);
    if (fr > 0) {
      const w = BOX.right - BOX.left, h = BOX.bottom - BOX.top, per = 2 * (w + h);
      el.frameRect.setAttribute('x', BOX.left - 14); el.frameRect.setAttribute('y', BOX.top - 14);
      el.frameRect.setAttribute('width', w + 28); el.frameRect.setAttribute('height', h + 28);
      el.frameRect.style.strokeDasharray = per + 112;
      el.frameRect.style.strokeDashoffset = (per + 112) * (1 - fr);
    }
    stack(el.title, t, T.title, null);
    P.forEach((p, i) => {
      const tin = T.pins + i * 0.14;
      const pin = pins[i], pos = toStage(c, p.dot);
      const s = E.outBack(prog(t, tin, 0.45));
      show(pin, s > 0.001);
      if (s > 0.001) {
        pin.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`;
        $('.num', pin).style.transform = `translate(-50%, -50%) scale(${s})`;
        const ph = (((t - tin - 0.3) % 1.4) + 1.4) % 1.4 / 1.4;
        const pulse = $('.pulse', pin);
        pulse.style.transform = `translate(-50%, -50%) scale(${1 + 1.2 * ph})`;
        pulse.style.opacity = t > tin + 0.3 ? (0.8 * (1 - ph)).toFixed(3) : 0;
      }
      const tag = el.etags[i], tw = tag.offsetWidth, th = tag.offsetHeight, g = 34;
      const [x, y] = p.tag === 'right' ? [pos[0] + g, pos[1] - th / 2]
        : p.tag === 'left' ? [pos[0] - g - tw, pos[1] - th / 2]
        : p.tag === 'below' ? [pos[0] - 23, pos[1] + g]
        : [pos[0] - 23, pos[1] - g - th];
      tag.style.transform = `translate(${x}px, ${y}px)`;
      wipe(tag, t, tin + 0.16, null, 0.5);
    });
    wipe(el.btn, t, T.cta, null, 0.6);
    const ku = E.outExpo(prog(t, T.cta + 0.2, 0.6));
    el.url.style.opacity = ku.toFixed(3);
    el.url.style.transform = `translateX(${(1 - ku) * -24}px)`;
    el.urlLine.style.transform = `scaleX(${E.outExpo(prog(t, T.cta + 0.4, 0.7))})`;
    const nudge = t > T.cta + 0.75 ? Math.pow(Math.sin(Math.PI * (((t - T.cta - 0.75) % 1.3) / 1.3)), 2) : 0;
    el.arrow.style.transform = `translateX(${nudge * 9}px)`;
    rise(el.slogan, t, T.cta + 0.45);
  }

  async function seek(n) {
    render(n);
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await $('#logo img').decode();
    el.photo.src = `${PLATE_DIR}/still.jpg`;
    await el.photo.decode();
    // Leader lines end on the card edge that faces the product.
    cardEdges = P.map((p, i) => {
      const blocks = $$(':scope > .blk', el.cards[i]);
      const first = blocks[0].getBoundingClientRect(), last = blocks[blocks.length - 1].getBoundingClientRect();
      const touch = first.top > H / 2 ? first : last;
      return { l: touch.left, r: touch.right, y: touch === first ? first.top : last.bottom };
    });
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
