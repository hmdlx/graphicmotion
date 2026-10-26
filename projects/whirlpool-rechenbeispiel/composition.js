// Whirlpool-Rechenbeispiel Staffelrabatt – Reel 9:16. Deterministic, frame-addressed:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// Fast explainer style: pop-ins with overshoot, polaroid stickers, price tags,
// hand-drawn arrows and circles, calculation cards with counters, whip pans.
// Timings are output seconds; the voice-over cues are in cues.js and the word
// anchors below come from the pauses in the VO segments.
(() => {
  const FPS = 30;
  const C = window.CUES;
  const TOTAL = Math.round(C.total * FPS);
  const W = 1080, H = 1920;
  const params = new URLSearchParams(location.search);

  // Shop data (homedeluxe.de, Stand 26.10.2026).
  const EX = [
    { id: 'ex1', n: 1, name: 'SPLASH', sub: 'Aufblasbar · 6 Personen', img: 'source/splash-ambiente.jpg', thumb: 'source/splash-freisteller.jpg',
      price: 349, gift: 15, code: 'BLACK15', pay: 334,
      T: { k: 13.35, n: 14.42, p: 14.55, g: 16.52, m: 18.9, c: 19.23, h: 20.23, d: 21.5, r: 22.07 } },
    { id: 'ex2', n: 2, name: 'DROP', sub: 'Mit Kissen, Getränkehalter & Sonnendach', img: 'source/drop-ambiente.jpg', thumb: 'source/drop-freisteller.jpg',
      price: 529, gift: 75, code: 'BLACK75', pay: 454, chips: [['Kissen', 27.0], ['Getränkehalter', 27.6], ['Sonnendach', 28.5]],
      T: { k: 24.75, n: 26.15, p: 26.3, g: 29.1, m: 31.15, c: 31.57, h: 33.01, d: 34.4, r: 35.09 } },
    { id: 'ex3', n: 3, name: 'HORIZON', sub: 'Outdoor-Whirlpool aus Acryl', img: 'source/horizon-ambiente.jpg', thumb: 'source/horizon-freisteller.jpg',
      price: 2499, gift: 150, code: 'BLACK150', pay: 2349, hero: true,
      T: { k: 37.65, n: 38.08, p: 38.2, g: 39.94, q: 40.5, m: 42.5, c: 42.91, h: 44.39, d: 45.9, r: 46.52 } },
  ];
  // Scene transitions: [start, duration, type].
  const TRANS = [[4.45, 0.34, 'whipL'], [12.95, 0.34, 'whipL'], [24.45, 0.34, 'whipU'], [37.28, 0.42, 'zoom'], [49.8, 0.36, 'whipL']];
  const O = { cart: 50.2, cursor: 50.25, click1: 50.6, type: 50.65, click2: 51.5, applied: 51.6, fertig: 51.72, out: 52.35,
    nur: 52.6, bw: 53.05, minis: 53.4, cta: 53.85, url: 54.1, pol: 54.3 };

  // ---------------------------------------------------------------- helpers
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
    outBack: k => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
    inBack: k => { const c1 = 1.8; return (c1 + 1) * k * k * k - c1 * k * k; },
    elastic: k => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, -9 * k) * Math.sin((k * 10 - 0.75) * (2 * Math.PI) / 3.2) + 1),
  };
  const eur = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };

  // ---------------------------------------------------------------- building blocks
  const cam = $('#cam');
  const ITEMS = new Map();          // node -> {x, y, rot}
  function scene(id) {
    const s = document.createElement('div');
    s.className = 'scene'; s.id = id;
    cam.appendChild(s);
    return s;
  }
  // Absolutely placed element, anchored at its centre (x, y).
  function A(parent, cls, html, x, y, rot = 0) {
    const d = document.createElement('div');
    d.className = 'a ' + cls;
    d.innerHTML = html;
    parent.appendChild(d);
    ITEMS.set(d, { x, y, rot });
    return d;
  }
  // Hand-drawn ink path (scribble circle, underline, arrow) in scene coordinates.
  function ink(parent, d, width = 9) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ink'); svg.setAttribute('width', W); svg.setAttribute('height', H);
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', d); p.style.strokeWidth = width;
    svg.appendChild(p); parent.appendChild(svg);
    return p;
  }
  // Organic loop around a box: a bit more than one turn, wobbling radius.
  function scribble(cx, cy, rx, ry, turns = 1.18, seed = 1) {
    let d = '';
    const steps = 90;
    for (let i = 0; i <= steps; i++) {
      const a = -2.2 + (turns * 2 * Math.PI) * (i / steps);
      const w = 1 + 0.045 * Math.sin(3 * a + seed) + 0.03 * Math.sin(5 * a + 2 * seed) + 0.06 * (i / steps);
      d += `${i ? 'L' : 'M'}${(cx + rx * w * Math.cos(a)).toFixed(1)} ${(cy + ry * w * Math.sin(a)).toFixed(1)}`;
    }
    return d;
  }
  const wavy = (x0, x1, y, amp = 6, seed = 0) => {
    let d = '';
    for (let i = 0; i <= 40; i++) {
      const x = lerp(x0, x1, i / 40);
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${(y + amp * Math.sin(i / 40 * 7 + seed) + (i / 40) * 4).toFixed(1)}`;
    }
    return d;
  };
  function arrow(x0, y0, x1, y1, bend = 0.35) {
    const mx = (x0 + x1) / 2 - (y1 - y0) * bend, my = (y0 + y1) / 2 + (x1 - x0) * bend;
    const ang = Math.atan2(y1 - my, x1 - mx), L = 46;
    const h1 = [x1 - L * Math.cos(ang - 0.5), y1 - L * Math.sin(ang - 0.5)];
    const h2 = [x1 - L * Math.cos(ang + 0.5), y1 - L * Math.sin(ang + 0.5)];
    return `M${x0} ${y0}Q${mx} ${my} ${x1} ${y1}M${h1[0]} ${h1[1]}L${x1} ${y1}L${h2[0]} ${h2[1]}`;
  }

  // State setter: offsets relative to the anchor, rotation, scale, opacity.
  function set(node, { dx = 0, dy = 0, rot = 0, s = 1, o = 1, x, y } = {}) {
    const it = ITEMS.get(node);
    const vis = o > 0.002 && s > 0.001;
    show(node, vis);
    if (!vis) return;
    const bx = (x ?? it.x) - it.w / 2, by = (y ?? it.y) - it.h / 2;
    node.style.left = `${bx}px`; node.style.top = `${by}px`;
    node.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${(it.rot + rot).toFixed(2)}deg) scale(${s.toFixed(4)})`;
    node.style.opacity = o >= 0.999 ? '' : o.toFixed(3);
  }
  // Pop in with overshoot (+ optional slide/rotation), optional exit; idle wobble.
  function pop(node, t, tin, { dur = 0.5, s0 = 0, r0 = -8, dx0 = 0, dy0 = 40, out = null, outDur = 0.25, wob = 0.8, ease = 'outBack' } = {}) {
    if (t < tin) { show(node, false); return; }
    const k = E[ease](prog(t, tin, dur)), kl = prog(t, tin, dur);
    const ko = out == null ? 0 : E.inBack(prog(t, out, outDur));
    const idle = wob * Math.sin((t - tin) * 2.1 + ITEMS.get(node).y * 0.01);
    set(node, {
      dx: dx0 * (1 - E.outCubic(kl)), dy: dy0 * (1 - E.outCubic(kl)),
      rot: r0 * (1 - k) + idle, s: Math.max(0, lerp(s0, 1, k) * (1 - ko)), o: clamp(kl * 4),
    });
  }
  // Slam: drops in big and lands hard.
  function slam(node, t, tin, { out = null, dur = 0.32, from = 2.2 } = {}) {
    if (t < tin) { show(node, false); return; }
    const k = E.outExpo(prog(t, tin, dur));
    const ko = out == null ? 0 : E.inBack(prog(t, out, 0.25));
    set(node, { s: lerp(from, 1, k) * (1 - ko), o: clamp(prog(t, tin, 0.08)) });
  }
  function draw(path, t, tin, dur = 0.45, out = null) {
    const L = path._len || (path._len = path.getTotalLength());
    const k = E.inOutCubic(prog(t, tin, dur));
    const ko = out == null ? 1 : 1 - prog(t, out, 0.2);
    path.style.strokeDasharray = `${L} ${L}`;
    path.style.strokeDashoffset = `${L * (1 - k)}`;
    path.style.opacity = t >= tin ? ko : 0;
  }

  // ---------------------------------------------------------------- scenes
  const S = {};
  const coupon = (from, gift, code) => `<div class="notch t"></div><div class="notch b"></div>
    <div class="l"><small>AB</small><b>${from}</b></div><div class="r"><b>${gift}</b><span>GESCHENKT</span></div><div class="code">${code}</div>`;
  const polaroid = (img, size, cap = '') => `<img src="${img}" alt="" style="width:${size}px;height:${size}px">${cap ? `<div class="cap">${cap}</div>` : '<div style="height:70px"></div>'}`;

  // Hook
  S.hook = scene('s-hook');
  const hook = {
    kick: A(S.hook, 'chip', 'BLACK WEEK', 540, 250, -2),
    l1: A(S.hook, 'kt', 'Wie viel', 540, 455, -4),
    l2: A(S.hook, 'kt', 'schenken', 540, 600, -4),
    l3: A(S.hook, 'kt', 'wir dir', 540, 745, -4),
    l4: A(S.hook, 'kt boxed', 'beim Whirlpool?', 540, 900, -4),
    p1: A(S.hook, 'polaroid', polaroid('source/splash-ambiente.jpg', 330), 250, 1420, -11),
    p2: A(S.hook, 'polaroid', polaroid('source/drop-ambiente.jpg', 330), 830, 1380, 9),
    p3: A(S.hook, 'polaroid', polaroid('source/horizon-ambiente.jpg', 360), 540, 1600, -3),
    calc: A(S.hook, 'kt boxed', 'Wir rechnen’s vor!', 540, 1135, 3),
    plus: A(S.hook, 'round', '+', 120, 1010, -10),
    minus: A(S.hook, 'round w', '−', 965, 1000, 8),
    eq: A(S.hook, 'round w', '=', 140, 1820, 6),
    euro: A(S.hook, 'round', '€', 950, 1790, -8),
  };
  hook.under = ink(S.hook, wavy(250, 830, 1225, 7, 1), 12);
  for (const n of [hook.l1, hook.l2, hook.l3]) n.style.fontSize = '150px';
  hook.l4.style.fontSize = '92px';
  hook.calc.style.fontSize = '76px';

  // Rule: three coupons
  S.rule = scene('s-rule');
  const rule = {
    kick: A(S.rule, 'chip', 'SO VIEL SCHENKEN WIR DIR', 540, 250, 2),
    c1: A(S.rule, 'coupon', coupon('100 €', '15 €', 'BLACK15'), 540, 540, -2.5),
    c2: A(S.rule, 'coupon', coupon('500 €', '75 €', 'BLACK75'), 540, 905, 1.8),
    c3: A(S.rule, 'coupon', coupon('1.000 €', '150 €', 'BLACK150'), 540, 1275, -1.2),
    sogar: A(S.rule, 'sticker', 'SOGAR!', 200, 1490, -9),
    hint: A(S.rule, 'kt', 'je mehr, desto mehr', 540, 1680, -2),
  };
  rule.hint.style.fontSize = '64px';
  rule.circle = ink(S.rule, scribble(745, 1262, 300, 150, 1.16, 2), 10);

  // Examples
  const ex = EX.map((d, i) => {
    const sc = (S[d.id] = scene('s-' + d.id));
    const o = {
      d, sc,
      kick: A(sc, 'chip', `BEISPIEL ${d.n}`, 540, 250, i % 2 ? 2 : -2),
      name: A(sc, 'kt', d.name, 540, 405, -3),
      sub: A(sc, '', `<div style="font-weight:600;font-size:38px;color:#66727d;white-space:nowrap">${d.sub}</div>`, 540, 530, -1),
      pol: A(sc, 'polaroid', polaroid(d.img, 740, `${d.name}<small>homedeluxe.de</small>`), 540, 1070, d.hero ? 2 : -3),
      tag: A(sc, 'tag', eur(d.price), 800, 1500, 8),
      shop: A(sc, 'sticker', 'Shop-Preis', 225, 1690, -6),
      card: A(sc, 'card calc', `
        <div class="row" style="top:62px"><span class="lbl">Preis</span><span class="val v-price">${eur(d.price)}</span></div>
        <div class="row" style="top:232px"><span class="cpn c-code"><small>Gutschein</small>${d.code}</span><span class="val minus v-gift">− ${eur(d.gift)}</span></div>
        <div class="row res" style="top:478px"><span class="lbl">Du zahlst<br>nur</span><span class="val v-pay" style="font-size:${d.pay > 999 ? 150 : 190}px">${eur(d.price)}</span></div>`, 540, 1290, 0),
      stamp: A(sc, 'stamp', `${d.gift} €<small>GESCHENKT</small>`, 290, 600, -14),
      chips: (d.chips || []).map(([txt, tin], j) => [A(sc, 'sticker', txt, [820, 250, 830][j], [700, 760, 840][j], [7, -6, -4][j]), tin]),
      quest: d.T.q ? [A(sc, 'round', '?', 175, 1420, -12), A(sc, 'round w', '?', 930, 760, 10)] : [],
    };
    o.name.style.fontSize = d.hero ? '170px' : '180px';
    o.arrow = ink(sc, arrow(330, 1650, 610, 1530, -0.35), 9);
    o.under = ink(sc, '', 12);
    o.divider = ink(sc, '', 7);
    o.circle = ink(sc, '', 10);
    o.cpn = $('.c-code', o.card); o.vGift = $('.v-gift', o.card); o.vPay = $('.v-pay', o.card);
    return o;
  });

  // Outro: cart UI with cursor, then the end card.
  S.outro = scene('s-outro');
  const out = {
    l1: A(S.outro, 'kt', 'Code eingeben –', 540, 300, -3),
    l2: A(S.outro, 'kt boxed', 'fertig!', 540, 455, -3),
    cart: A(S.outro, 'card cart', `
      <div class="bar"><i></i><i></i><i></i><span>homedeluxe.de/warenkorb</span></div>
      <h3>Warenkorb</h3>
      <div class="item"><img src="source/horizon-freisteller.jpg" alt=""><div>Outdoor Whirlpool HORIZON<small>ohne Treppe und Thermoabdeckung</small></div><b>2.499,00 €</b></div>
      <div class="lbl2">Gutscheincode</div>
      <div class="field"></div><div class="btn">Einlösen</div>
      <div class="gift"><span>Geschenk BLACK150</span><span>−150,00 €</span></div>
      <div class="tot"><span>Gesamt</span><span class="t-v">2.499,00 €</span></div>`, 540, 1080, 0),
    nur: A(S.outro, 'kt', 'Nur in der', 540, 380, -3),
    bw: A(S.outro, 'kt boxed', 'Black Week', 540, 540, -3),
    minis: [['ab 100 €', '15 €', 'BLACK15'], ['ab 500 €', '75 €', 'BLACK75'], ['ab 1.000 €', '150 €', 'BLACK150']]
      .map(([a, b, c], j) => A(S.outro, 'mini', `<small>${a}</small><b>${b}</b><span>${c}</span>`, [200, 540, 880][j], 890, [-4, 2, -2][j])),
    cta: A(S.outro, 'cta', 'Jetzt shoppen <svg width="44" height="26" viewBox="0 0 44 26"><path d="M0 13h40M29 2l11 11-11 11" fill="none" stroke="#fefefe" stroke-width="3.4"/></svg>', 540, 1195, 0),
    url: A(S.outro, 'url', 'homedeluxe.de', 540, 1320, 0),
    pols: EX.map((d, j) => A(S.outro, 'polaroid', polaroid(d.thumb, 250, `${d.name}<small>${eur(d.pay)}</small>`), [205, 540, 875][j], 1640 + [10, -30, 20][j], [-8, 3, -5][j])),
  };
  out.l1.style.fontSize = '104px'; out.l2.style.fontSize = '130px';
  out.nur.style.fontSize = '130px'; out.bw.style.fontSize = '150px';
  out.field = $('.field', out.cart); out.gift = $('.gift', out.cart); out.tot = $('.t-v', out.cart);
  out.urlLine = ink(S.outro, wavy(395, 690, 1370, 4, 3), 8);
  const cursor = $('#cursor');

  // ---------------------------------------------------------------- scene timing
  const SCENES = [S.hook, S.rule, S.ex1, S.ex2, S.ex3, S.outro];
  function sceneState(i, t) {
    const tin = TRANS[i - 1], tout = TRANS[i];
    const st = { on: true, x: 0, y: 0, s: 1, o: 1, blur: 0, by: 'x' };
    if (tin && t < tin[0]) st.on = false;
    if (tout && t >= tout[0] + tout[1]) st.on = false;
    if (!st.on) return st;
    const apply = (tr, entering) => {
      const k = E.inOutQuint(prog(t, tr[0], tr[1]));
      const b = Math.sin(Math.PI * prog(t, tr[0], tr[1]));
      if (tr[2] === 'zoom') {
        if (entering) { st.s = lerp(0.55, 1, E.outCubic(prog(t, tr[0] + tr[1] * 0.35, tr[1] * 0.65))); st.o = clamp((t - tr[0] - tr[1] * 0.3) / (tr[1] * 0.3)); }
        else { st.s = lerp(1, 3.4, E.inCubic(prog(t, tr[0], tr[1] * 0.7))); st.o = 1 - clamp((t - tr[0] - tr[1] * 0.35) / (tr[1] * 0.3)); }
        st.blur = Math.max(st.blur, 14 * b); st.by = 'xy';
      } else {
        const v = tr[2] === 'whipU';
        const off = entering ? (1 - k) : -k;
        if (v) st.y = off * H; else st.x = off * W;
        st.blur = Math.max(st.blur, 70 * b); st.by = v ? 'y' : 'x';
      }
    };
    if (tin && t < tin[0] + tin[1]) apply(tin, true);
    if (tout && t >= tout[0]) apply(tout, false);
    return st;
  }

  // Punch-ins (camera kicks) and shakes.
  const PUNCH = [2.25, 3.49, 11.27, ...EX.map(d => d.T.r + 0.95), ...EX.map(d => d.T.h), O.fertig, O.bw];
  const SHAKE = [3.49, ...EX.map(d => d.T.h), O.fertig, O.bw];

  // ---------------------------------------------------------------- render
  function render(n) {
    const t = n / FPS;
    let blur = 0, by = 'x', bgx = 0, bgy = 0;

    // Background drifts with every completed or running transition.
    TRANS.forEach(tr => {
      const k = E.inOutQuint(prog(t, tr[0], tr[1]));
      if (tr[2] === 'whipU') bgy -= 0.35 * H * k; else if (tr[2] === 'whipL') bgx -= 0.35 * W * k;
    });
    $('#bg').style.transform = `translate(${bgx.toFixed(1)}px, ${(bgy - 6 * t).toFixed(1)}px)`;

    SCENES.forEach((sc, i) => {
      const st = sceneState(i, t);
      sc.style.display = st.on ? '' : 'none';
      if (!st.on) return;
      sc.style.transform = `translate(${st.x.toFixed(1)}px, ${st.y.toFixed(1)}px) scale(${st.s.toFixed(4)})`;
      sc.style.opacity = st.o >= 0.999 ? '' : st.o.toFixed(3);
      if (st.blur > blur) { blur = st.blur; by = st.by; }
    });
    $('#mblur-g').setAttribute('stdDeviation', by === 'x' ? `${blur.toFixed(1)} 0` : by === 'y' ? `0 ${blur.toFixed(1)}` : `${(blur / 2).toFixed(1)}`);
    for (const sc of SCENES) sc.style.filter = blur > 0.5 ? 'url(#mblur)' : 'none';

    // Camera: slow push, punch-ins, shake.
    let p = 0, sx = 0, sy = 0;
    for (const s of PUNCH) if (t >= s) p += 0.05 * Math.exp(-(t - s) / 0.12) * Math.min(1, (t - s) / 0.03);
    for (const s of SHAKE) if (t >= s && t < s + 0.4) {
      const a = 14 * Math.exp(-(t - s) / 0.1);
      sx += a * Math.sin((t - s) * 95); sy += a * Math.cos((t - s) * 77);
    }
    cam.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) scale(${(1 + p + 0.012 * Math.sin(t * 0.7)).toFixed(4)})`;

    // Hook
    if (t < 5) {
      pop(hook.kick, t, 0.12, { s0: 0.3 });
      pop(hook.l1, t, 0.4, { r0: -10, dy0: 60 });
      pop(hook.l2, t, 0.85, { r0: 8, dy0: 60 });
      pop(hook.l3, t, 1.25, { r0: -8, dy0: 60 });
      slam(hook.l4, t, 2.25);
      pop(hook.p1, t, 2.35, { r0: -30, dy0: 300, wob: 1.5 });
      pop(hook.p2, t, 2.5, { r0: 30, dy0: 300, wob: 1.5 });
      pop(hook.p3, t, 2.65, { r0: -20, dy0: 400, wob: 1.2 });
      slam(hook.calc, t, 3.49);
      draw(hook.under, t, 3.62, 0.35);
      [[hook.plus, 3.62], [hook.minus, 3.72], [hook.eq, 3.82], [hook.euro, 3.92]].forEach(([nd, tin]) => pop(nd, t, tin, { r0: 60, dy0: 0, wob: 4 }));
    }

    // Rule
    if (t > 4.4 && t < 13.4) {
      pop(rule.kick, t, 4.75, { s0: 0.3 });
      pop(rule.c1, t, 5.0, { dx0: -900, dy0: 0, r0: -14, s0: 0.8, wob: 0.6 });
      pop(rule.c2, t, 7.83, { dx0: 900, dy0: 0, r0: 14, s0: 0.8, wob: 0.6 });
      pop(rule.c3, t, 9.85, { dy0: 700, r0: -10, s0: 0.7, wob: 0.6 });
      const pulse = (tin) => 1 + 0.07 * Math.sin(Math.PI * prog(t, tin, 0.3));
      if (t > 6.5) rule.c1.style.transform += ` scale(${pulse(6.5)})`;
      if (t > 9.0) rule.c2.style.transform += ` scale(${pulse(9.0)})`;
      draw(rule.circle, t, 11.27, 0.5);
      pop(rule.sogar, t, 11.2, { r0: -30, wob: 3 });
      pop(rule.hint, t, 11.9, { dy0: 50, r0: 4 });
    }

    // Examples
    ex.forEach(o => {
      const { d } = o, T = d.T;
      const start = TRANS[o.d.n][0] - 0.4, end = TRANS[o.d.n + 1][0] + 0.5;
      if (t < start || t > end) return;
      const m = E.inOutCubic(prog(t, T.m, 0.6));
      pop(o.kick, t, T.k, { s0: 0.3 });
      // Name + sub: slam, then slide to the right of the small polaroid.
      if (t >= T.n) {
        const k = E.outExpo(prog(t, T.n, 0.32));
        set(o.name, { s: lerp(2.2, 1, k) * lerp(1, 0.52, m), dx: lerp(0, 230, m), dy: lerp(0, 40, m), o: clamp(prog(t, T.n, 0.08)) });
      } else show(o.name, false);
      pop(o.sub, t, T.n + 0.25, { dy0: 30, r0: 0, wob: 0 });
      if (t >= T.n + 0.25) o.sub.style.transform += ` translate(${lerp(0, 230, m)}px, ${lerp(0, 0, m)}px) scale(${lerp(1, 0.62, m)})`;
      // Polaroid: flies in (hero: from the camera), shrinks to the top-left for the maths.
      if (t >= T.p) {
        const k = d.hero ? E.outExpo(prog(t, T.p, 0.7)) : E.outBack(prog(t, T.p, 0.6));
        const kl = prog(t, T.p, 0.6);
        const s = d.hero ? lerp(2.6, 1, k) : lerp(0.3, 1, k);
        set(o.pol, {
          s: s * lerp(1, 0.46, m), dx: lerp(0, -255, m), dy: (d.hero ? 0 : 500 * (1 - E.outCubic(kl))) + lerp(0, -470, m),
          rot: (d.hero ? 0 : -24 * (1 - k)) + lerp(0, -6, m) + 0.8 * Math.sin(t * 1.7), o: clamp(kl * 5),
        });
        if (d.hero && t < T.p + 0.5) o.pol.style.filter = `blur(${(10 * (1 - E.outCubic(prog(t, T.p, 0.5)))).toFixed(1)}px)`;
        else o.pol.style.filter = 'none';
      } else show(o.pol, false);
      // Price tag swings in on its string, then rides along.
      if (t >= T.g) {
        const k = E.outBack(prog(t, T.g, 0.45)), tau = t - T.g;
        const swing = 16 * Math.exp(-3.2 * tau) * Math.cos(8 * tau);
        set(o.tag, { s: lerp(0.2, 1, k) * lerp(1, 0.55, m), dx: lerp(0, -95, m), dy: lerp(0, -780, m), rot: swing - 30 * (1 - k), o: clamp(prog(t, T.g, 0.1)) });
      } else show(o.tag, false);
      pop(o.shop, t, T.g + 0.12, { r0: -20, out: T.m - 0.1, wob: 2 });
      draw(o.arrow, t, T.g + 0.22, 0.4, T.m - 0.1);
      o.chips.forEach(([nd, tin]) => pop(nd, t, tin, { r0: 25, dy0: 0, out: T.m - 0.1, wob: 2.5 }));
      o.quest.forEach((nd, j) => pop(nd, t, T.q + j * 0.12, { r0: 50, dy0: 0, out: T.m - 0.1, wob: 5 }));
      // Calculation card.
      if (t >= T.m) {
        const k = E.outBack(prog(t, T.m + 0.05, 0.6));
        set(o.card, { dy: lerp(1300, 0, k), rot: 5 * (1 - k) });
        o.cpn.style.transform = `translateX(${lerp(-700, 0, E.outBack(prog(t, T.c, 0.5)))}px) rotate(${lerp(-25, -3, E.outBack(prog(t, T.c, 0.5)))}deg)`;
        o.cpn.style.opacity = t >= T.c ? 1 : 0;
        const kg = E.outBack(prog(t, T.c + 0.15, 0.45));
        o.vGift.style.transform = `scale(${t >= T.c + 0.15 ? kg : 0})`;
        const kr = E.outBack(prog(t, T.r, 0.4));
        o.vPay.style.transform = `scale(${t >= T.r - 0.05 ? lerp(0.5, 1, kr) : 0})`;
        o.vPay.textContent = eur(lerp(d.price, d.pay, E.outCubic(prog(t, T.r + 0.1, 0.85))));
      } else show(o.card, false);
      slam(o.stamp, t, T.h, { from: 2.6 });
      if (t >= T.h) o.stamp.style.transform += ` translate(${lerp(0, 0, m)}px, 0)`;
      // Ink on the card (scene coordinates: card spans x 60..1020, y 865..1715).
      if (!o.under.getAttribute('d')) {
        o.under.setAttribute('d', wavy(600, 990, 1222, 5, o.d.n));
        o.divider.setAttribute('d', wavy(110, 970, 1300, 4, o.d.n + 2));
        o.circle.setAttribute('d', scribble(964 - o.payW / 2, 1440, o.payW / 2 + 55, 135, 1.15, o.d.n));
      }
      draw(o.under, t, T.h + 0.1, 0.35);
      draw(o.divider, t, T.d, 0.45);
      draw(o.circle, t, T.r + 0.95, 0.5);
    });

    // Outro
    if (t > 49.6) {
      const ko = E.inBack(prog(t, O.out, 0.3));
      pop(out.l1, t, 50.25, { dy0: 60, r0: -6, out: O.out });
      if (t >= O.fertig && t < O.out + 0.3) slam(out.l2, t, O.fertig, { out: O.out }); else show(out.l2, false);
      if (t >= O.cart && t < O.out + 0.35) {
        const k = E.outBack(prog(t, O.cart - 0.1, 0.55));
        set(out.cart, { dy: lerp(1200, 0, k) + ko * -1600, rot: 4 * (1 - k) - 6 * ko, s: 1 - 0.3 * ko });
      } else show(out.cart, false);
      // Cursor: to the field, click, type, to the button, click.
      const fx = 70 + 48 + 260, fy = 680 + 462 + 52, bx = 70 + 628 + 132;
      let cx = 980, cy = 1780, cs = 1;
      if (t >= O.cursor) {
        const k1 = E.inOutCubic(prog(t, O.cursor, 0.33));
        cx = lerp(980, fx, k1); cy = lerp(1780, fy, k1);
        const k2 = E.inOutCubic(prog(t, O.type + 0.75, 0.3));
        cx = lerp(cx, bx, k2);
        const k3 = E.inOutCubic(prog(t, O.applied + 0.3, 0.4));
        cx = lerp(cx, 1150, k3); cy = lerp(cy, 1900, k3);
        cs = 1 - 0.18 * Math.max(Math.sin(Math.PI * prog(t, O.click1, 0.16)), Math.sin(Math.PI * prog(t, O.click2, 0.16)));
      }
      show(cursor, t >= O.cursor && t < O.applied + 0.75);
      cursor.style.transform = `translate(${cx}px, ${cy}px) scale(${cs})`;
      const typed = Math.floor(clamp((t - O.type) / 0.1, 0, 8));
      const caret = t >= O.click1 && t < O.click2 && Math.floor(t / 0.4) % 2 === 0;
      out.field.innerHTML = t >= O.click1 ? `BLACK150`.slice(0, typed) + (caret ? '<span class="caret"></span>' : '') : '<span class="ph">Code eingeben</span>';
      out.field.style.borderColor = t >= O.click1 && t < O.applied ? '#0f2334' : '';
      const kg = E.outBack(prog(t, O.applied, 0.4));
      out.gift.style.opacity = t >= O.applied ? 1 : 0;
      out.gift.style.transform = `translateX(${lerp(-60, 0, kg)}px)`;
      out.tot.textContent = eur(lerp(2499, 2349, E.outCubic(prog(t, O.applied + 0.1, 0.7)))).replace(' €', ',00 €');

      // End card
      pop(out.nur, t, O.nur, { dy0: 80, r0: -8 });
      slam(out.bw, t, O.bw);
      out.minis.forEach((nd, j) => pop(nd, t, O.minis + j * 0.15, { dy0: 200, r0: [-20, 15, -15][j], wob: 1.2 }));
      pop(out.cta, t, O.cta, { s0: 0.4, r0: 0, wob: 0 });
      pop(out.url, t, O.url, { dy0: 30, r0: 0, wob: 0 });
      draw(out.urlLine, t, O.url + 0.2, 0.4);
      out.pols.forEach((nd, j) => pop(nd, t, O.pol + j * 0.15, { dy0: 400, r0: [-25, 20, -20][j], wob: 1.5 }));
    } else show(cursor, false);
  }

  // Sound cues for scripts/sound_design.py.
  function events() {
    const sfx = [];
    const add = (t, kind, extra = {}) => sfx.push({ t: +t.toFixed(3), kind, ...extra });
    TRANS.forEach(([t0, d, type]) => add(t0 - 0.15, 'whoosh', { dur: d + 0.45, strength: type === 'zoom' ? 1.0 : 0.85, hi: type === 'zoom' ? 3200 : 5000 }));
    add(0.12, 'pop', { f: 640 });
    [0.4, 0.85, 1.25].forEach((s, i) => add(s, 'swish', { i }));
    add(2.25, 'slam');
    [2.35, 2.5, 2.65].forEach((s, i) => add(s, 'pop', { f: 480 + 90 * i }));
    add(3.49, 'slam');
    add(3.62, 'scribble', { dur: 0.35 });
    [3.62, 3.72, 3.82, 3.92].forEach((s, i) => add(s, 'pop', { f: 760 + 80 * i }));
    add(4.75, 'pop', { f: 640 });
    [5.0, 7.83, 9.85].forEach((s, i) => add(s - 0.08, 'swish', { i: 10 + i }));
    [5.0, 7.83, 9.85].forEach((s, i) => add(s + 0.12, 'thud', { i }));
    add(11.2, 'pop', { f: 900 });
    add(11.27, 'scribble', { dur: 0.5 });
    add(11.27, 'chime', { tier: 2 });
    add(11.9, 'swish', { i: 20 });
    EX.forEach((d, i) => {
      const T = d.T;
      add(T.k, 'pop', { f: 640 });
      add(T.n, 'slam');
      add(T.p - 0.05, 'swish', { i: 30 + i });
      add(T.g, 'swish', { i: 40 + i });
      add(T.g + 0.1, 'tag');
      add(T.g + 0.22, 'scribble', { dur: 0.4 });
      (d.chips || []).forEach(([, s], j) => add(s, 'pop', { f: 700 + 100 * j }));
      if (T.q) [0, 0.12].forEach((o, j) => add(T.q + o, 'pop', { f: 820 + 120 * j }));
      add(T.m, 'whoosh', { dur: 0.7, strength: 0.5, hi: 3500 });
      add(T.c, 'swish', { i: 50 + i });
      add(T.c + 0.15, 'pop', { f: 560 });
      add(T.h, 'stamp');
      add(T.h + 0.1, 'chime', { tier: i });
      add(T.d, 'scribble', { dur: 0.45 });
      add(T.r, 'count', { dur: 0.85 });
      add(T.r + 0.95, 'chaching');
      add(T.r + 0.95, 'scribble', { dur: 0.5 });
    });
    add(50.25, 'swish', { i: 70 });
    add(O.cart - 0.1, 'whoosh', { dur: 0.6, strength: 0.5, hi: 3000 });
    add(O.click1, 'click');
    for (let i = 0; i < 8; i++) add(O.type + i * 0.1, 'key', { i });
    add(O.click2, 'click');
    add(O.applied, 'ping');
    add(O.fertig, 'slam');
    add(O.out, 'whoosh', { dur: 0.6, strength: 0.7, hi: 4000 });
    add(O.nur, 'swish', { i: 80 });
    add(O.bw, 'slam');
    [0, 0.15, 0.3].forEach((o, j) => add(O.minis + o, 'pop', { f: 600 + 120 * j }));
    add(O.cta, 'pop', { f: 520 });
    add(O.url + 0.2, 'scribble', { dur: 0.4 });
    [0, 0.15, 0.3].forEach((o, j) => add(O.pol + o, 'pop', { f: 700 + 100 * j }));
    return {
      total: C.total,
      music: { bpm: 120, drop: C.rule, break: [O.out - 2.2, O.nur], final: O.bw, slam: 0.1, intro: 'beat' },
      sfx: sfx.sort((a, b) => a.t - b.t),
    };
  }

  async function seek(n) {
    render(n);
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img').map(img => img.decode().catch(() => {})));
    $('#bg').style.width = '6000px'; $('#bg').style.height = '4400px';
    for (const [node, it] of ITEMS) { it.w = node.offsetWidth; it.h = node.offsetHeight; }
    // Width of each final amount, for the circle around it.
    for (const o of ex) { o.vPay.textContent = eur(o.d.pay); o.payW = o.vPay.offsetWidth; }
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, events, ready: init() };
})();
