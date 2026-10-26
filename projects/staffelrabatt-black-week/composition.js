// Black Week Staffelrabatt – Reel 9:16. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// Timings are output seconds and hang off the voice-over cues in cues.js.
(() => {
  const FPS = 30;
  const C = window.CUES;
  const TOTAL = Math.round(C.total * FPS);
  const params = new URLSearchParams(location.search);

  // Shop data (homedeluxe.de, Stand 26.10.2026).
  const PRODUCTS = [
    { img: 'source/cozy-freisteller.jpg', name: 'Sitzsack mit Hocker <b>COZY</b>', price: 189 },
    { img: 'source/amiri-freisteller.jpg', name: 'Couchtisch Marmor <b>AMIRI XXL</b>', price: 399 },
    { img: 'source/loma-freisteller.jpg', name: 'Hängesessel faltbar <b>LOMA</b>', price: 429 },
  ];
  const TIERS = [{ from: 100, gift: 15 }, { from: 500, gift: 75 }, { from: 1000, gift: 150 }];
  const CODE = 'BLACK150';

  // Timeline.
  const T = {
    logo: 0.1,
    gift: 0.3, bw: 0.45, introA: 2.75, introAmt: 3.55, introOut: 5.85,
    phoneIn: 5.9, phoneOut: 32.45,
    tap1: 9.55,                       // "In den Warenkorb"
    toCart: 10.3,                     // product page -> cart
    fill1: 12.6,                     // bar 0 -> 189
    fly: [17.5, 22.75],              // product cards for AMIRI / LOMA
    scroll: 27.85,
    tapField: 28.8, type: 29.0, tapApply: 30.55, applied: 30.75,
    end: 33.0,
  };
  // Headline lines: [kicker, line 1, line 2, chip] in-times, and the out-time.
  const HEADS = {
    'h-how': { in: [6.3, 7.45, 9.1], out: 10.95 },
    'h-tier1': { in: [11.25, 11.35, 12.8, 14.85], out: 16.75 },
    'h-tier2': { in: [17.15, 17.25, 18.65, 20.7], out: 22.2 },
    'h-tier3': { in: [22.65, 22.75, 24.2, 26.2], out: 27.7 },
    'h-redeem': { in: [28.15, 28.4, 30.3], out: 32.35 },
  };
  // Phone/screen geometry (stage px).
  const PHONE = { left: 220, top: 660 };
  const VIEWS = { x: PHONE.left + 16, y: PHONE.top + 16 + 216 };
  const ROW_TOP = [356, 520, 684];
  const SCROLL = 330;
  // Bar: cart value -> x inside the gift module (piecewise through the tier marks).
  const BAR = [[0, 50], [100, 120], [500, 300], [1000, 462], [1200, 510]];

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
    outBack: k => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  const showBox = (node, on) => { node.style.display = on ? '' : 'none'; };
  const eur = v => {
    const [i, d] = v.toFixed(2).split('.');
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d + ' €';
  };
  const barX = v => {
    for (let i = 1; i < BAR.length; i++) {
      const [v0, x0] = BAR[i - 1], [v1, x1] = BAR[i];
      if (v <= v1) return lerp(x0, x1, clamp((v - v0) / (v1 - v0)));
    }
    return BAR[BAR.length - 1][1];
  };

  // Masked line rise in / out.
  function rise(span, t, tin, tout, din = 0.7, dout = 0.4) {
    const a = E.outExpo(prog(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
    span.style.transform = `translateY(${((1 - a) - b) * 110}%)`;
  }
  // Block wipe left -> right in, left -> right out.
  function wipe(node, t, tin, tout, din = 0.6, dout = 0.4) {
    const a = E.outExpo(prog(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
    show(node, a > 0 && b < 1);
    node.style.clipPath = `inset(0 ${(1 - a) * 100}% 0 ${b * 100}%)`;
  }
  function fadeUp(node, t, tin, dist = 40, dur = 0.7, tout = null) {
    const a = E.outExpo(prog(t, tin, dur));
    const b = tout == null ? 0 : E.inCubic(prog(t, tout, 0.35));
    node.style.opacity = (a * (1 - b)).toFixed(3);
    node.style.transform = `translateY(${(1 - a) * dist - b * dist}px)`;
  }

  // ---------------------------------------------------------------- elements
  const el = {
    logo: $('#logo'), gift: $('#intro-gift'), bw: $('#intro-bw .blk'), introA: $('#intro-a .ln > span'),
    introAmt: $('#intro-amt .ln > span'), introNum: $('#intro-num'),
    phone: $('#phone'), pdp: $('#pdp'), cart: $('#cart'), buyDone: $('#pdp .buy .done'), badge: $('#badge'),
    count: $('#cart-count'), status: $('#gift-status'), fill: $('#bar-fill'),
    tiers: TIERS.map((_, i) => $('#tier-' + i)), marks: TIERS.map((_, i) => $('#mark-' + i)),
    rows: PRODUCTS.map((_, i) => $('#row-' + i)),
    field: $('#code-field'), apply: $('#code-apply'), ok: $('#code-ok'),
    sub: $('#sum-sub-v'), sumGift: $('#sum-gift'), total: $('#sum-total-v'), totalHl: $('#total-hl'),
    fly: $('#fly'), flyImg: $('#fly .card img'), flyTag: $('#fly .tag'),
    tap: $('#tap'), tapDot: $('#tap .dot'), tapWave: $('#tap .wave'),
    endHead: $$('#end-head .ln > span'), trows: $$('#tiers .trow'), endBtn: $('#end-cta .btn'),
    endArrow: $('#end-cta .btn svg'), endUrl: $('#end-cta .url'), endUrlLine: $('#end-cta .url i'),
    endNote: $('#end-note .ln > span'), endProducts: $$('#end-products img'),
  };
  const heads = Object.entries(HEADS).map(([id, h]) => ({ node: $('#' + id), spans: $$('#' + id + ' .ln > span'), ...h }));

  // ---------------------------------------------------------------- cart state
  // Item i lands in the cart at ADD[i]; the subtotal counts up over 0.65 s.
  const ADD = [T.tap1 + 0.1, T.fly[0] + 1.55, T.fly[1] + 1.55];
  function subtotal(t) {
    let v = 0;
    PRODUCTS.forEach((p, i) => { if (i > 0) v += p.price * E.outCubic(prog(t, ADD[i], 0.65)); else if (t >= ADD[0]) v += p.price; });
    return v;
  }
  // Bar value: sweeps 0 -> first item when the cart is first shown, then follows the subtotal.
  const barValue = t => (t < ADD[1] ? PRODUCTS[0].price * E.inOutCubic(prog(t, T.fill1, 0.9)) : subtotal(t));
  const itemsIn = t => ADD.filter(a => t >= a).length;
  // When the bar crosses each tier (for the pulse).
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

  // Finger tap: glides in, presses at t0, ripples, fades.
  const TAPS = [
    { t0: T.tap1, x: VIEWS.x + 304, y: VIEWS.y + 808, scroll: 0 },
    { t0: T.tapField, x: VIEWS.x + 210, y: VIEWS.y + 925 - SCROLL },
    { t0: T.tapApply, x: VIEWS.x + 498, y: VIEWS.y + 925 - SCROLL },
  ];
  function renderTap(t) {
    const tap = TAPS.find(p => t >= p.t0 - 0.45 && t < p.t0 + 0.75);
    show(el.tap, !!tap);
    if (!tap) return;
    const a = E.outCubic(prog(t, tap.t0 - 0.45, 0.4)), z = E.inCubic(prog(t, tap.t0 + 0.4, 0.35));
    const press = Math.sin(Math.PI * prog(t, tap.t0, 0.22));
    el.tap.style.transform = `translate(${tap.x + (1 - a) * 60}px, ${tap.y + (1 - a) * 70}px)`;
    el.tapDot.style.opacity = (a * (1 - z)).toFixed(3);
    el.tapDot.style.transform = `scale(${1 - 0.18 * press})`;
    const w = prog(t, tap.t0, 0.55);
    el.tapWave.style.opacity = t >= tap.t0 ? (0.8 * (1 - w)).toFixed(3) : 0;
    el.tapWave.style.transform = `scale(${1 + 1.4 * E.outCubic(w)})`;
  }

  // ---------------------------------------------------------------- render
  function render(n) {
    const t = n / FPS;

    // Logo.
    fadeUp(el.logo, t, T.logo, 24, 0.8);

    // Intro.
    const introOn = t < T.introOut + 0.6;
    for (const node of [el.gift, el.bw.parentNode, el.introA.closest('.center'), el.introAmt.closest('.center')]) showBox(node, introOn);
    if (introOn) {
      const g = E.outBack(prog(t, T.gift, 0.55)) * (1 - E.inCubic(prog(t, T.introOut, 0.35)));
      el.gift.style.transform = `scale(${Math.max(0, g)}) rotate(${(1 - clamp(g)) * -12}deg)`;
      wipe(el.bw, t, T.bw, T.introOut + 0.06, 0.7);
      rise(el.introA, t, T.introA, T.introOut + 0.1);
      rise(el.introAmt, t, T.introAmt, T.introOut + 0.14);
      el.introNum.textContent = Math.round(150 * E.outCubic(prog(t, T.introAmt + 0.05, 0.9)));
    }

    // Phone rises in, leaves before the end card.
    const pin = E.outCubic(prog(t, T.phoneIn, 1.0)), pout = E.inCubic(prog(t, T.phoneOut, 0.7));
    showBox(el.phone, pin > 0 && pout < 1);
    el.phone.style.transform = `translateY(${(1 - pin) * 1320 + pout * 1360}px)`;

    // Product page -> cart.
    const sw = E.inOutCubic(prog(t, T.toCart, 0.6));
    el.pdp.style.transform = `translateX(${-608 * sw}px)`;
    const scroll = SCROLL * E.inOutCubic(prog(t, T.scroll, 0.8));
    el.cart.style.transform = `translate(${608 * (1 - sw)}px, ${-scroll}px)`;
    el.buyDone.style.clipPath = `inset(0 ${(1 - E.outExpo(prog(t, T.tap1 + 0.08, 0.5))) * 100}% 0 0)`;

    // Badge + item count.
    const items = itemsIn(t);
    el.badge.textContent = items;
    const pop = ADD.map(a => Math.sin(Math.PI * prog(t, a, 0.3))).reduce((m, v) => Math.max(m, v), 0);
    el.badge.style.transform = `scale(${items ? 1 + 0.35 * pop : 0})`;
    el.count.textContent = `${Math.max(1, items)} Artikel`;

    // Rows: the first is in the cart from the start, the others land with their flying card.
    el.rows.forEach((row, i) => {
      if (i === 0) return;
      const k = E.outCubic(prog(t, ADD[i] - 0.25, 0.35));
      row.style.opacity = k.toFixed(3);
      row.querySelector('.thumb').style.visibility = t >= ADD[i] ? 'visible' : 'hidden';
      for (const s of row.querySelectorAll('.n1, .n2, .q, .p')) s.style.transform = `translateX(${(1 - k) * 30}px)`;
    });

    // Gift module.
    const bv = barValue(t);
    el.fill.style.width = `${barX(bv) - 50}px`;
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

    // Flying product cards.
    const fi = T.fly.findIndex(f => t >= f && t < f + 1.6);
    show(el.fly, fi >= 0);
    if (fi >= 0) {
      const p = PRODUCTS[fi + 1], f0 = T.fly[fi];
      if (el.flyImg.dataset.src !== p.img) { el.flyImg.src = p.img; el.flyImg.dataset.src = p.img; }
      el.flyTag.innerHTML = `${p.name} · ${eur(p.price)}`;
      const a = E.outBack(prog(t, f0, 0.5)), k = E.inOutCubic(prog(t, f0 + 0.95, 0.6));
      const from = { x: 320, y: 880, s: 1 }, to = { x: VIEWS.x + 24, y: VIEWS.y + ROW_TOP[fi + 1], s: 140 / 440 };
      const s = lerp(from.s * (0.75 + 0.25 * a), to.s, k);
      el.fly.style.transform = `translate(${lerp(from.x + 55 * (1 - a), to.x, k)}px, ${lerp(from.y + 60 * (1 - a), to.y, k)}px) scale(${s})`;
      el.fly.style.opacity = clamp(prog(t, f0, 0.2)).toFixed(3);
      el.flyTag.style.opacity = (1 - prog(t, f0 + 0.85, 0.2)).toFixed(3);
    }

    // Code field + redemption.
    const typed = Math.floor(clamp((t - T.type) / 0.1, 0, CODE.length));
    const focused = t >= T.tapField + 0.05;
    const caret = focused && t < T.tapApply && Math.floor((t - T.tapField) / 0.45) % 2 === 0;
    el.field.innerHTML = focused || typed
      ? `${CODE.slice(0, typed)}${caret ? '<span class="caret"></span>' : ''}`
      : '<span class="ph">Code eingeben</span>';
    el.field.style.borderColor = focused && t < T.applied ? '#0f2334' : '';
    el.apply.style.transform = `scale(${1 - 0.06 * Math.sin(Math.PI * prog(t, T.tapApply, 0.22))})`;
    fadeUp(el.ok, t, T.applied, 14, 0.5);
    fadeUp(el.sumGift, t, T.applied + 0.12, 14, 0.5);
    const sub = subtotal(t);
    el.sub.textContent = eur(Math.round(sub));
    const gift = 150 * E.outCubic(prog(t, T.applied + 0.25, 0.9));
    el.total.textContent = eur(Math.round(sub - gift));
    const hl = E.outExpo(prog(t, T.applied + 0.25, 0.5));
    el.totalHl.style.width = `${(el.total.offsetWidth + 28) * hl}px`;
    el.total.style.color = hl > 0.5 ? '#fefefe' : '';

    renderTap(t);

    // Headlines.
    for (const h of heads) {
      const on = t >= h.in[0] && t < h.out + 0.7;
      showBox(h.node, on);
      if (on) h.spans.forEach((s, i) => rise(s, t, h.in[i], h.out + i * 0.04));
    }

    // End card.
    const endOn = t >= T.end - 0.1;
    for (const node of [$('#end-head'), $('#tiers'), $('#end-cta'), $('#end-note'), $('#end-products')]) showBox(node, endOn);
    if (endOn) {
      el.endHead.forEach((s, i) => rise(s, t, T.end + [0, 0.1, 0.22][i], null));
      el.trows.forEach((r, i) => fadeUp(r, t, T.end + 0.55 + i * 0.16, 50, 0.8));
      wipe(el.endBtn, t, T.end + 1.25, null, 0.7);
      const ku = E.outExpo(prog(t, T.end + 1.45, 0.6));
      el.endUrl.style.opacity = ku.toFixed(3);
      el.endUrl.style.transform = `translateY(${(1 - ku) * 20}px)`;
      el.endUrlLine.style.transform = `scaleX(${E.outExpo(prog(t, T.end + 1.65, 0.7))})`;
      const nudge = t > T.end + 2.1 ? Math.pow(Math.sin(Math.PI * (((t - T.end - 2.1) % 1.3) / 1.3)), 2) : 0;
      el.endArrow.style.transform = `translateX(${nudge * 9}px)`;
      rise(el.endNote, t, T.end + 1.0, null);
      el.endProducts.forEach((img, i) => fadeUp(img, t, T.end + 2.0 + i * 0.12, 60, 0.9));
    }
  }

  async function seek(n) {
    render(n);
    await Promise.all($$('img').map(img => (img.complete && img.naturalWidth ? null : img.decode().catch(() => {}))));
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img[src]').map(img => img.decode()));
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
