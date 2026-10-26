// Black Week Staffelrabatt – 3D-Reel 9:16. Deterministic, frame-addressed:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
//
// Everything lives in one CSS 3D world. #cam carries the camera (an orbit camera:
// target point, distance, yaw/pitch/roll), every .o element a world matrix. The
// camera flies from scene to scene; the phone and the headlines ride along in
// camera space with a little lag, products fly from the stairs into the phone.
// Timings are output seconds and hang off the voice-over cues in cues.js.
(() => {
  const FPS = 30;
  const C = window.CUES;
  const TOTAL = Math.round(C.total * FPS);
  const P = 1600;                       // perspective (px)
  const params = new URLSearchParams(location.search);

  // Shop data (homedeluxe.de, Stand 26.10.2026).
  const PRODUCTS = [
    { img: 'source/cozy-freisteller.jpg', name: 'Sitzsack mit Hocker <b>COZY</b>', price: 189 },
    { img: 'source/amiri-freisteller.jpg', name: 'Couchtisch Marmor <b>AMIRI XXL</b>', price: 399 },
    { img: 'source/loma-freisteller.jpg', name: 'Hängesessel faltbar <b>LOMA</b>', price: 429 },
  ];
  const TIERS = [
    { from: 100, label: 'ab 100 €', gift: '15 €', code: 'BLACK15' },
    { from: 500, label: 'ab 500 €', gift: '75 €', code: 'BLACK75' },
    { from: 1000, label: 'ab 1.000 €', gift: '150 €', code: 'BLACK150' },
  ];
  const CODE = 'BLACK150';

  // Timeline (cart / UI events).
  const T = {
    tap1: 9.55, toCart: 10.0, fill1: 12.6,
    fly: [18.45, 23.7],                 // product i+1 leaves its step for the phone
    chips: [14.85, 20.7, 26.2],
    scroll: 27.9, tapField: 28.95, type: 29.15, tapApply: 30.55, applied: 30.75,
    end: 33.0,
  };
  const HEADS = {
    'h-how': { in: [6.3, 7.45, 9.1], out: 10.6 },
    'h-tier1': { in: [11.3, 11.4, 12.8], out: 16.75 },
    'h-tier2': { in: [17.6, 17.7, 18.65], out: 22.15 },
    'h-tier3': { in: [23.0, 23.1, 24.2], out: 27.65 },
    'h-redeem': { in: [28.3, 28.4, 30.3], out: 32.3 },
    'h-end': { in: [33.5, 33.6, 33.75], out: null },
  };

  // ---------------------------------------------------------------- world layout
  const A = { x: 0, y: 0, z: 0 };                  // intro
  const B = { x: 0, y: 0, z: -4200 };              // product page
  // Stairs rise to the right; the camera cranes from step to step.
  const RISE = 800, DEPTH = 1100, WIDTH = 1300, GROUND = 600, SZ = -9200;
  const STEP = TIERS.map((_, i) => ({ x: (i - 1) * WIDTH, top: -i * RISE, zc: SZ }));
  const tierTarget = i => ({ x: STEP[i].x + 70, y: STEP[i].top + 160, z: STEP[i].zc + DEPTH / 2 });
  const T0 = tierTarget(0), T1 = tierTarget(1), T2 = tierTarget(2);
  const OVER = { x: STEP[1].x, y: STEP[1].top - 120, z: STEP[1].zc };

  // Camera keyframes: target, distance, yaw/pitch/roll (deg); ease into the key,
  // swoop = extra distance mid-flight (pull back and push in again).
  const CAM = [
    { t: 0, ...A, dist: 6200, yaw: 42, pitch: 26, roll: -12 },
    { t: 2.4, ...A, dist: 2300, yaw: 0, pitch: 0, roll: 0, e: 'outQuart' },
    { t: 5.4, ...A, y: 40, dist: 2050, yaw: -5, pitch: 3, roll: 1, e: 'inOutSine' },
    { t: 6.9, ...B, dist: 2000, yaw: 14, pitch: -4, roll: 4, e: 'inOutCubic' },
    { t: 10.3, ...B, dist: 1900, yaw: 4, pitch: -1, roll: 0, e: 'inOutSine' },
    { t: 11.6, ...T0, dist: 2050, yaw: 16, pitch: 12, roll: 3, e: 'inOutCubic', swoop: 700 },
    { t: 16.8, ...T0, dist: 1900, yaw: 6, pitch: 9, roll: 1, e: 'inOutSine' },
    { t: 17.95, ...T1, dist: 2050, yaw: -14, pitch: 13, roll: -3, e: 'inOutCubic', swoop: 1000 },
    { t: 22.2, ...T1, dist: 1900, yaw: -5, pitch: 9, roll: -1, e: 'inOutSine' },
    { t: 23.3, ...T2, dist: 2050, yaw: 14, pitch: 13, roll: 3, e: 'inOutCubic', swoop: 1000 },
    { t: 27.65, ...T2, dist: 1900, yaw: 5, pitch: 9, roll: 1, e: 'inOutSine' },
    { t: 28.8, ...T2, y: T2.y - 2200, dist: 1700, yaw: 0, pitch: -8, roll: 0, e: 'inOutCubic' },
    { t: 32.3, ...T2, y: T2.y - 2200, dist: 1600, yaw: 5, pitch: -6, roll: 0, e: 'inOutSine' },
    { t: 34.7, ...OVER, dist: 7600, yaw: -16, pitch: 16, roll: 0, e: 'inOutCubic' },
    { t: 38.5, ...OVER, dist: 7000, yaw: -9, pitch: 13, roll: 0, e: 'inOutSine' },
  ];
  // Phone pose in camera space (offset px, rotation deg); it follows the camera with a lag.
  const PHONE = [
    { t: 5.9, x: 0, y: 2300, z: -200, rx: -30, ry: 70, rz: -10 },
    { t: 7.2, x: 0, y: 170, z: 0, rx: 5, ry: -12, rz: 0, e: 'outCubic' },
    { t: 10.3, x: 0, y: 150, z: 0, rx: 3, ry: -4, rz: 0, e: 'inOutSine' },
    { t: 11.6, x: 0, y: 960, z: 260, rx: 34, ry: -6, rz: 2, e: 'inOutCubic' },
    { t: 27.7, x: 0, y: 945, z: 260, rx: 32, ry: 4, rz: -1, e: 'inOutSine' },
    { t: 28.8, x: 0, y: 160, z: 60, rx: 2, ry: -10, rz: 0, e: 'inOutCubic' },
    { t: 32.3, x: 0, y: 150, z: 60, rx: 0, ry: 4, rz: 0, e: 'inOutSine' },
    { t: 33.4, x: 260, y: 2500, z: -300, rx: 60, ry: 30, rz: 8, e: 'inCubic' },
  ];

  // ---------------------------------------------------------------- helpers
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    linear: k => k,
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    outQuart: k => 1 - Math.pow(1 - k, 4),
    inCubic: k => k * k * k,
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: k => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  const eur = v => {
    const [i, d] = v.toFixed(2).split('.');
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d + ' €';
  };
  // Deterministic PRNG for the particle field.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // Chainable 3D matrix with the same operation order as a CSS transform list.
  class Mx {
    constructor(m) { this.m = m || new DOMMatrix(); }
    t(x, y, z = 0) { this.m.translateSelf(x, y, z); return this; }
    rx(a) { if (a) this.m.rotateAxisAngleSelf(1, 0, 0, a); return this; }
    ry(a) { if (a) this.m.rotateAxisAngleSelf(0, 1, 0, a); return this; }
    rz(a) { if (a) this.m.rotateAxisAngleSelf(0, 0, 1, a); return this; }
    s(k) { this.m.scaleSelf(k, k, k); return this; }
    mul(o) { this.m.multiplySelf(o.m); return this; }
    copy() { return new Mx(DOMMatrix.fromMatrix(this.m)); }
    inv() { return new Mx(this.m.inverse()); }
    pt(x = 0, y = 0, z = 0) { return this.m.transformPoint(new DOMPoint(x, y, z)); }
  }

  // Keyframe track: value of every numeric field at time t.
  function track(keys, t, extra) {
    if (t <= keys[0].t) return { ...keys[0] };
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1], b = keys[i];
      if (t <= b.t) {
        const lk = prog(t, a.t, b.t - a.t), k = E[b.e || 'inOutCubic'](lk);
        const o = {};
        for (const key of Object.keys(b)) if (typeof b[key] === 'number' && key !== 't' && key !== 'swoop') o[key] = lerp(a[key], b[key], k);
        if (extra) extra(o, b, lk);
        return o;
      }
    }
    return { ...keys[keys.length - 1] };
  }
  const camAt = t => track(CAM, t, (o, b, lk) => { if (b.swoop) o.dist += b.swoop * Math.sin(Math.PI * lk); });
  // Positive pitch looks down onto the scene.
  const camMx = c => new Mx().t(0, 0, P - c.dist).rz(c.roll).rx(-c.pitch).ry(c.yaw).t(-c.x, -c.y, -c.z);

  // ---------------------------------------------------------------- build the world
  const CAMS = $$('.cam');
  const LAYER = { bg: $('#cam-bg'), world: $('#cam'), props: $('#cam-props'), fx: $('#cam-fx') };
  // Intro type sits in front of the tumbling cubes.
  for (const id of ['#i-bw', '#i-a', '#i-amt']) LAYER.props.appendChild($(id));
  function add(html, cls = '', layer = 'world') {
    const d = document.createElement('div');
    d.className = 'o ' + cls;
    d.innerHTML = html;
    LAYER[layer].appendChild(d);
    return d;
  }

  // Gift cubes around the intro.
  const CUBES = [
    [-640, -1080, -500, 300], [640, -880, 280, 240], [-600, 700, 360, 260],
    [660, 860, -380, 340], [140, -1560, -1500, 380], [-340, 1420, -950, 300], [900, -100, -2200, 260],
  ].map(([x, y, z, s], i) => {
    const el = add('', 'p3 cube', 'bg');
    const faces = [['', 0, 0, s / 2], ['', 0, 180, s / 2], ['s', 0, 90, s / 2], ['s', 0, -90, s / 2], ['t', 90, 0, s / 2], ['b', -90, 0, s / 2]];
    for (const [cls, rx, ry, d] of faces) {
      const f = document.createElement('div');
      f.className = 'f ' + cls;
      f.style.width = f.style.height = `${s}px`;
      f.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${d}px) translate(${-s / 2}px, ${-s / 2}px)`;
      f.style.transformOrigin = '0 0';
      el.appendChild(f);
    }
    return { el, x, y, z, s, spin: [17 + i * 9, 23 - i * 5, 11 + i * 4], phase: i * 37 };
  });

  // Particle field along the flight path.
  const PARTS = Array.from({ length: 70 }, () => {
    const z = lerp(1200, -12800, rnd());
    const el = add('', 'pt' + (rnd() < 0.25 ? ' n' : rnd() < 0.3 ? ' f' : ''), 'bg');
    const s = lerp(30, 110, rnd());
    el.style.width = el.style.height = `${s}px`;
    el.style.borderWidth = `${Math.max(3, s / 12)}px`;
    const far = clamp((-z - 5000) / 3000);          // around the stairs the field widens to the right
    let x = lerp(-1900, 1900 + 2200 * far, rnd());
    if (Math.abs(x) < 500) x = Math.sign(x || 1) * (500 + rnd() * 600);   // keep the centre clear
    return { el, x, y: lerp(-2400, 1700, rnd()) - 900 * far, z, r0: rnd() * 360, rs: lerp(-40, 40, rnd()), s };
  });

  // Stairs: front, top and side faces per step.
  const FACES = [];
  STEP.forEach((st, i) => {
    const h = GROUND - st.top;                       // front and side run down to the ground
    const fh = h;
    const face = (cls, w, hh, mx, html = '') => {
      const el = add(html, 'face ' + cls);
      el.style.width = `${w}px`; el.style.height = `${hh}px`;
      FACES.push({ el, mx, w, h: hh });
    };
    face('front', WIDTH, fh, new Mx().t(st.x, st.top + fh / 2, st.zc + DEPTH / 2),
      `<div class="k">Stufe ${i + 1}</div><div class="v">${TIERS[i].label}</div>`);
    face('top', WIDTH, DEPTH, new Mx().t(st.x, st.top, st.zc).rx(90));
    face('side', DEPTH, h, new Mx().t(st.x - WIDTH / 2, st.top + h / 2, st.zc).ry(90));
    if (i === STEP.length - 1) face('side', DEPTH, h, new Mx().t(st.x + WIDTH / 2, st.top + h / 2, st.zc).ry(90));
  });
  const GNUM = TIERS.map(tr => add(`<div class="a">${tr.gift}</div><div class="g">geschenkt</div>`, 'gnum', 'props'));
  const CHIP = TIERS.map(tr => add(`Code: <b>${tr.code}</b>`, 'gchip', 'props'));
  const cardHtml = p => `<img src="${p.img}" alt=""><div class="tag">${p.name} · ${eur(p.price)}</div>`;
  const CARD = PRODUCTS.map(p => add(cardHtml(p), 'card', 'props'));
  const FLY = PRODUCTS.map(p => add(cardHtml(p), 'card', 'fx'));   // the same card while it flies

  const el = {
    layers: $('#layers'), logo: $('#logo'), shadow: $('#shadow'),
    bw: $('#i-bw'), introA: $('#i-a'), introAmt: $('#i-amt'), introNum: $('#i-num'),
    phone: $('#phone'), phoneBack: $('#phone-back'), phoneShadow: $('#phone-shadow'), pop: $('#pop'), minus: $('#minus'),
    pdp: $('#pdp'), cart: $('#cart'), buyDone: $('#pdp .buy .done'), badge: $('#badge'),
    count: $('#cart-count'), status: $('#gift-status'), fill: $('#bar-fill'),
    tiers: TIERS.map((_, i) => $('#tier-' + i)), marks: TIERS.map((_, i) => $('#mark-' + i)),
    rows: PRODUCTS.map((_, i) => $('#row-' + i)),
    field: $('#code-field'), apply: $('#code-apply'), ok: $('#code-ok'),
    sub: $('#sum-sub-v'), sumGift: $('#sum-gift'), total: $('#sum-total-v'), totalHl: $('#total-hl'),
    tap: $('#tap'), tapDot: $('#tap .dot'), tapWave: $('#tap .wave'),
    endCta: $('#end-cta'), endBtn: $('#end-cta .btn'), endArrow: $('#end-cta .btn svg'),
    endUrl: $('#end-cta .url'), endUrlLine: $('#end-cta .url i'), endNote: $('#end-cta .note .ln > span'),
  };
  const heads = Object.entries(HEADS).map(([id, h]) => ({ node: $('#' + id), spans: $$('#' + id + ' .ln > span'), ...h }));
  const size = new Map();                            // element -> [w, h], measured once
  const dims = node => {
    if (!size.has(node)) size.set(node, [node.offsetWidth, node.offsetHeight]);
    return size.get(node);
  };

  // ---------------------------------------------------------------- placement
  let CAMV = null;                                   // camera matrix of the current frame
  // Put a node at world matrix mx; (ax, ay) is its anchor in node px (default: centre).
  // Fades it out as it comes close to the eye so fly-throughs don't explode on screen.
  function place(node, mx, { ax, ay, alpha = 1, near = 170, fade = 330 } = {}) {
    const [w, h] = dims(node);
    const v = CAMV.copy().mul(mx).pt();
    const depth = P - v.z;
    const a = alpha * clamp((depth - near) / fade);
    show(node, a > 0.002);
    if (a <= 0.002) return;
    node.style.opacity = a >= 0.999 ? '' : a.toFixed(3);
    node.style.transform = mx.copy().t(-(ax ?? w / 2), -(ay ?? h / 2)).m.toString();
  }
  const hide = node => show(node, false);
  const project = p => {
    const v = CAMV.m.transformPoint(p);
    const k = P / (P - v.z);
    return [540 + v.x * k, 960 + v.y * k];
  };
  // Camera-space matrix (rides along with the camera of time tc).
  const rel = (tc, x, y, z) => camMx(camAt(tc)).inv().t(x, y, z);

  // ---------------------------------------------------------------- cart state
  const ADD = [T.tap1 + 0.1, T.fly[0] + 0.6, T.fly[1] + 0.6];
  function subtotal(t) {
    let v = 0;
    PRODUCTS.forEach((p, i) => { if (i > 0) v += p.price * E.outCubic(prog(t, ADD[i], 0.65)); else if (t >= ADD[0]) v += p.price; });
    return v;
  }
  const barValue = t => (t < ADD[1] ? PRODUCTS[0].price * E.inOutCubic(prog(t, T.fill1, 0.9)) : subtotal(t));
  const itemsIn = t => ADD.filter(a => t >= a).length;
  const CROSS = TIERS.map(tier => {
    for (let n = 0; n < TOTAL; n++) if (barValue(n / FPS) >= tier.from) return n / FPS;
    return Infinity;
  });
  function statusText(v) {
    const r = Math.round(v);
    if (r < 100) return `Noch <b>${100 - r} €</b> bis zu deinem 15-€-Geschenk`;
    if (r < 500) return `<b>15 € geschenkt</b> · noch ${500 - r} € bis 75 €`;
    if (r < 1000) return `<b>75 € geschenkt</b> · noch ${1000 - r} € bis 150 €`;
    return '<b>150 € geschenkt</b> – höchste Stufe erreicht!';
  }

  // Phone screen UI (2D inside the phone).
  function renderScreen(t) {
    const sw = E.inOutCubic(prog(t, T.toCart, 0.6));
    el.pdp.style.transform = `translateX(${-608 * sw}px)`;
    const scroll = 330 * E.inOutCubic(prog(t, T.scroll, 0.8));
    el.cart.style.transform = `translate(${608 * (1 - sw)}px, ${-scroll}px)`;
    el.buyDone.style.clipPath = `inset(0 ${(1 - E.outExpo(prog(t, T.tap1 + 0.08, 0.5))) * 100}% 0 0)`;

    const items = itemsIn(t);
    el.badge.textContent = items;
    const pop = ADD.map(a => Math.sin(Math.PI * prog(t, a, 0.3))).reduce((m, v) => Math.max(m, v), 0);
    el.badge.style.transform = `scale(${items ? 1 + 0.45 * pop : 0})`;
    el.count.textContent = `${Math.max(1, items)} Artikel`;
    el.rows.forEach((row, i) => {
      if (i === 0) return;
      const k = E.outCubic(prog(t, ADD[i] - 0.1, 0.35));
      row.style.opacity = k.toFixed(3);
      for (const s of row.querySelectorAll('.n1, .n2, .q, .p, .thumb')) s.style.transform = `translateX(${(1 - k) * 30}px)`;
    });

    const bv = barValue(t);
    el.fill.style.width = `${Math.max(0, barX(bv) - 50)}px`;
    el.status.innerHTML = statusText(bv);
    TIERS.forEach((tier, i) => {
      const on = bv >= tier.from;
      el.tiers[i].classList.toggle('on', on);
      el.marks[i].classList.toggle('on', on);
      const p = prog(t, CROSS[i], 0.7);
      const ring = el.tiers[i].querySelector('.ring');
      ring.style.opacity = on && p < 1 ? (1 - p).toFixed(3) : 0;
      ring.style.transform = `scale(${1 + 0.45 * E.outCubic(p)})`;
      el.tiers[i].style.transform = `scale(${1 + 0.16 * Math.sin(Math.PI * prog(t, CROSS[i], 0.35))})`;
    });

    const typed = Math.floor(clamp((t - T.type) / 0.1, 0, CODE.length));
    const focused = t >= T.tapField + 0.05;
    const caret = focused && t < T.tapApply && Math.floor((t - T.tapField) / 0.45) % 2 === 0;
    el.field.innerHTML = focused || typed
      ? `${CODE.slice(0, typed)}${caret ? '<span class="caret"></span>' : ''}`
      : '<span class="ph">Code eingeben</span>';
    el.field.style.borderColor = focused && t < T.applied ? '#0f2334' : '';
    el.apply.style.transform = `scale(${1 - 0.06 * Math.sin(Math.PI * prog(t, T.tapApply, 0.22))})`;
    for (const [node, tin] of [[el.ok, T.applied], [el.sumGift, T.applied + 0.12]]) {
      const k = E.outExpo(prog(t, tin, 0.5));
      node.style.opacity = k.toFixed(3);
      node.style.transform = `translateY(${(1 - k) * 14}px)`;
    }
    const sub = subtotal(t);
    el.sub.textContent = eur(Math.round(sub));
    const gift = 150 * E.outCubic(prog(t, T.applied + 0.25, 0.9));
    el.total.textContent = eur(Math.round(sub - gift));
    const hl = E.outExpo(prog(t, T.applied + 0.25, 0.5));
    el.totalHl.style.width = `${(el.total.offsetWidth + 28) * hl}px`;
    el.total.style.color = hl > 0.5 ? '#fefefe' : '';
  }
  const BAR = [[0, 50], [100, 120], [500, 300], [1000, 462], [1200, 510]];
  function barX(v) {
    for (let i = 1; i < BAR.length; i++) {
      const [v0, x0] = BAR[i - 1], [v1, x1] = BAR[i];
      if (v <= v1) return lerp(x0, x1, clamp((v - v0) / (v1 - v0)));
    }
    return BAR[BAR.length - 1][1];
  }

  // Masked line rise in / out.
  function rise(span, t, tin, tout, din = 0.7, dout = 0.4) {
    const a = E.outExpo(prog(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
    span.style.transform = `translateY(${((1 - a) - b) * 110}%)`;
  }

  // ---------------------------------------------------------------- render
  function render(n) {
    const t = n / FPS;
    const cam = camAt(t);
    CAMV = camMx(cam);
    const camCss = CAMV.m.toString();
    CAMS.forEach(c => { c.style.transform = camCss; });

    // Motion blur from camera speed (screen px per frame, roughly).
    const c2 = camAt(t + 1 / FPS);
    const speed = Math.hypot(c2.x - cam.x, c2.y - cam.y, c2.z - cam.z) / cam.dist * P
      + (Math.abs(c2.yaw - cam.yaw) + Math.abs(c2.pitch - cam.pitch) + Math.abs(c2.roll - cam.roll)) * 26
      + Math.abs(c2.dist - cam.dist) * 0.3;
    const blur = 5 * clamp((speed - 22) / 70);
    el.layers.style.filter = blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : 'none';

    el.logo.style.opacity = E.outCubic(prog(t, 0.1, 0.8)).toFixed(3);

    // Intro: type at three depths, gift cubes tumbling around it.
    if (t < 8) {
      place(el.bw, new Mx().t(0, -430, -150).ry(-8 * (1 - E.outCubic(prog(t, 0.2, 2.2)))), { alpha: E.outCubic(prog(t, 0.2, 0.4)) });
      el.introA.firstElementChild.firstElementChild.style.transform = `translateY(${(1 - E.outExpo(prog(t, 2.75, 0.7))) * 110}%)`;
      place(el.introA, new Mx().t(0, -130, 80));
      el.introAmt.firstElementChild.firstElementChild.style.transform = `translateY(${(1 - E.outExpo(prog(t, 3.5, 0.7))) * 110}%)`;
      el.introNum.textContent = Math.round(150 * E.outCubic(prog(t, 3.55, 0.9)));
      place(el.introAmt, new Mx().t(0, 250, 230));
      CUBES.forEach((c, i) => {
        const k = E.outBack(prog(t, 0.15 + i * 0.12, 0.8));
        const mx = new Mx().t(c.x, c.y + 30 * Math.sin(t * 1.3 + i), c.z)
          .rx(c.phase + c.spin[0] * t).ry(c.phase * 2 + c.spin[1] * t).rz(c.spin[2] * t).s(Math.max(0.001, k));
        place(c.el, mx, { ax: 0, ay: 0 });
      });
    } else {
      [el.bw, el.introA, el.introAmt, ...CUBES.map(c => c.el)].forEach(hide);
    }

    // Particles.
    PARTS.forEach(p => place(p.el, new Mx().t(p.x, p.y, p.z).rz(p.r0 + p.rs * t).ry(p.rs * t * 0.7), { alpha: 0.9 }));

    // Stairs fade in out of the white as the camera approaches.
    const stairsA = E.inOutSine(prog(t, 9.6, 1.4));
    FACES.forEach(f => (stairsA > 0 ? place(f.el, f.mx, { alpha: stairsA, near: 60, fade: 1 }) : hide(f.el)));
    stairsA > 0 ? place(el.shadow, new Mx().t(STEP[1].x, GROUND + 4, STEP[1].zc).rx(90).s(1.5), { alpha: stairsA, near: 60, fade: 1 }) : hide(el.shadow);

    // Gift amounts hinge up out of the step when the bar crosses the tier; codes fly in.
    STEP.forEach((st, i) => {
      const k = E.outBack(prog(t, CROSS[i], 0.75));
      if (k <= 0) { hide(GNUM[i]); } else {
        const [w, h] = dims(GNUM[i]);
        place(GNUM[i], new Mx().t(st.x + 270, st.top - 6, st.zc + DEPTH / 2 - 170).rx(-90 * (1 - clamp(k, 0, 1.2))).s(lerp(0.6, 1, clamp(k))), { ax: w / 2, ay: h });
      }
      const kc = E.outExpo(prog(t, T.chips[i], 0.9));
      if (kc <= 0) { hide(CHIP[i]); } else {
        place(CHIP[i], new Mx().t(st.x + lerp(700, 0, kc), st.top + 360 + lerp(-200, 0, kc), st.zc + DEPTH / 2 + lerp(900, 110, kc))
          .ry(lerp(-70, -4, kc)).rz(lerp(12, 0, kc)), { alpha: clamp(kc * 3) });
      }
    });

    // Phone (camera space, lagging behind the camera).
    const onPhone = t >= PHONE[0].t && t < PHONE[PHONE.length - 1].t;
    let phoneMx = null;
    if (onPhone) {
      const ph = track(PHONE, t);
      const bump = ADD.map(a => Math.sin(Math.PI * prog(t, a, 0.35))).reduce((m, v) => Math.max(m, v), 0);
      phoneMx = rel(t - 0.16, ph.x, ph.y, ph.z)
        .rx(ph.rx + 1.6 * Math.sin(t * 0.9)).ry(ph.ry + 2.6 * Math.sin(t * 1.25)).rz(ph.rz).s(1 + 0.025 * bump);
      place(el.phone, phoneMx);
      place(el.phoneBack, phoneMx.copy().t(0, 0, -22).s(0.995));
      place(el.phoneShadow, phoneMx.copy().t(30, 60, -160));
      renderScreen(t);
    } else {
      [el.phone, el.phoneBack, el.phoneShadow].forEach(hide);
    }
    // Phone-local point (px from the phone's top-left) -> world matrix.
    const onScreen = (x, y, z = 0) => phoneMx.copy().t(x - 320, y - 670, z);

    // COZY pops out of the product page, then drops into the cart icon.
    if (onPhone && t >= 7.3 && t < T.tap1 + 0.75) {
      const k = E.outBack(prog(t, 7.3, 0.8)), f = E.inOutCubic(prog(t, T.tap1 + 0.05, 0.65));
      const x = lerp(lerp(320, 430, k), 591, f), y = lerp(lerp(500, 380, k), 140, f), z = lerp(lerp(0, 380, k), 20, f);
      place(el.pop, onScreen(x, y, z).rz(lerp(lerp(-14, 5 * Math.sin(t * 2.1), k), 30, f)).s(lerp(lerp(0.4, 0.62, k), 0.05, f)));
    } else hide(el.pop);

    // Products wait on their step, then fly into the phone's cart icon.
    CARD.forEach((card, i) => {
      const st = STEP[i];
      const home = new Mx().t(st.x - 380, st.top - 14 - 16 * Math.sin(t * 1.6 + i), st.zc + DEPTH / 2 - 260).ry(8 * Math.sin(t * 0.8 + i));
      const outro = E.outBack(prog(t, T.end + 1.2 + i * 0.15, 0.8));
      const [w, h] = dims(card);
      const flying = i > 0 && onPhone && t >= T.fly[i - 1] && t < ADD[i];
      if (!flying) hide(FLY[i]);
      if (i === 0 || t >= ADD[i]) {
        // Back on the stairs for the overview.
        if (outro > 0) place(card, new Mx().t(st.x - 380, st.top - 14, st.zc + DEPTH / 2 - 260).ry(10).s(Math.max(0.001, outro)), { ax: w / 2, ay: h });
        else hide(card);
        return;
      }
      if (!flying) { place(card, home, { ax: w / 2, ay: h, alpha: stairsA }); return; }
      hide(card);
      const k = E.inOutCubic(prog(t, T.fly[i - 1], 0.6));
      const from = home.pt(0, -h / 2), to = onScreen(591, 140, 30).pt();
      const mx = new Mx().t(lerp(from.x, to.x, k), lerp(from.y, to.y, k) - 500 * Math.sin(Math.PI * k), lerp(from.z, to.z, k))
        .ry(lerp(0, -30, k)).rz(lerp(0, 25, k)).s(lerp(1, 0.08, k));
      place(FLY[i], mx);
    });

    // −150 € jumps out of the phone after redeeming.
    if (onPhone && t >= T.applied + 0.2) {
      const k = E.outBack(prog(t, T.applied + 0.2, 0.9));
      place(el.minus, onScreen(470, lerp(1040, 900, k), lerp(0, 380, k)).rz(lerp(-20, -4, k) + 1.5 * Math.sin(t * 2)).s(lerp(0.2, 0.62, k)));
    } else hide(el.minus);

    // Finger taps on the phone screen (2D overlay, projected).
    renderTap(t, onPhone ? onScreen : null);

    // Headlines ride in camera space and flip in/out.
    for (const h of heads) {
      const on = t >= h.in[0] - 0.1 && (h.out == null || t < h.out + 0.6);
      if (!on) { hide(h.node); continue; }
      const kin = E.outExpo(prog(t, h.in[0] - 0.05, 0.8)), kout = h.out == null ? 0 : E.inCubic(prog(t, h.out, 0.5));
      const y = -640;
      place(h.node, rel(t - 0.07, 0, y - 60 * kout, -400 * (1 - kin) + 300 * kout).rx(-70 * (1 - kin) + 70 * kout),
        { alpha: clamp(kin * 2) * (1 - kout), near: -1e9 });
      h.spans.forEach((s, i) => rise(s, t, h.in[i], h.out == null ? null : h.out + i * 0.04));
    }

    // End card CTA.
    if (t >= T.end + 1.0) {
      const k = E.outExpo(prog(t, T.end + 1.2, 0.9));
      place(el.endCta, rel(t - 0.07, 0, 700 + 120 * (1 - k), -300 * (1 - k)).rx(40 * (1 - k)), { alpha: k, near: -1e9 });
      el.endBtn.style.clipPath = `inset(0 ${(1 - E.outExpo(prog(t, T.end + 1.4, 0.7))) * 100}% 0 0)`;
      el.endUrlLine.style.transform = `scaleX(${E.outExpo(prog(t, T.end + 1.8, 0.7))})`;
      const nudge = t > T.end + 2.3 ? Math.pow(Math.sin(Math.PI * (((t - T.end - 2.3) % 1.3) / 1.3)), 2) : 0;
      el.endArrow.style.transform = `translateX(${nudge * 9}px)`;
      rise(el.endNote, t, T.end + 1.9, null);
    } else hide(el.endCta);
  }

  // Finger tap: glides in, presses at t0, ripples, fades. Positions are phone-local.
  const TAPS = [
    { t0: T.tap1, x: 320, y: 1040 },
    { t0: T.tapField, x: 226, y: 827 },
    { t0: T.tapApply, x: 514, y: 827 },
  ];
  function renderTap(t, onScreen) {
    const tap = onScreen && TAPS.find(p => t >= p.t0 - 0.45 && t < p.t0 + 0.75);
    show(el.tap, !!tap);
    if (!tap) return;
    const [x, y] = project(onScreen(tap.x, tap.y).pt());
    const a = E.outCubic(prog(t, tap.t0 - 0.45, 0.4)), z = E.inCubic(prog(t, tap.t0 + 0.4, 0.35));
    const press = Math.sin(Math.PI * prog(t, tap.t0, 0.22));
    el.tap.style.transform = `translate(${x + (1 - a) * 60}px, ${y + (1 - a) * 70}px)`;
    el.tapDot.style.opacity = (a * (1 - z)).toFixed(3);
    el.tapDot.style.transform = `scale(${1 - 0.18 * press})`;
    const w = prog(t, tap.t0, 0.55);
    el.tapWave.style.opacity = t >= tap.t0 ? (0.8 * (1 - w)).toFixed(3) : 0;
    el.tapWave.style.transform = `scale(${1 + 1.4 * E.outCubic(w)})`;
  }

  async function seek(n) {
    render(n);
    await Promise.all($$('img').map(img => (img.complete && img.naturalWidth ? null : img.decode().catch(() => {}))));
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img[src]').map(img => img.decode().catch(() => {})));
    $$('.o').forEach(dims);                          // measure before any transform/visibility change
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  // Sound cues (seconds) for scripts/sound_design.py, derived from the same timeline.
  function events() {
    const moves = CAM.slice(1).map((k, i) => [CAM[i].t, k.t, k.swoop || 0]).filter((_, i) => /Cubic|Quart/.test(CAM[i + 1].e));
    const count = [];
    for (let ms = 3550, last = 0; ms <= 4500; ms++) {
      const v = Math.floor(150 * E.outCubic(prog(ms / 1000, 3.55, 0.9)) / 10);
      if (v > last) { count.push(ms / 1000); last = v; }
    }
    return {
      total: C.total,
      flights: moves,                                  // [start, end, swoop]
      slam: 0.2,
      cubes: CUBES.map((_, i) => 0.15 + i * 0.12),
      count,
      phoneIn: [PHONE[0].t, PHONE[1].t],
      pop: 7.3,
      taps: TAPS.map(p => p.t0),
      adds: ADD,
      unlocks: CROSS,
      chips: T.chips,
      typing: Array.from({ length: CODE.length }, (_, i) => T.type + i * 0.1),
      minus: T.applied + 0.2,
      heads: Object.values(HEADS).map(h => h.in[0]),
      phoneOut: PHONE[PHONE.length - 2].t,
      end: T.end,
      cta: T.end + 1.4,
    };
  }

  window.COMP = { FPS, TOTAL, seek, events, ready: init() };
})();
