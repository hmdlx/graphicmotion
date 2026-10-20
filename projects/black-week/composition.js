// Black Week – Staffelrabatt, Reel 9:16. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
(() => {
  const FPS = 24;
  const W = 1080, H = 1920;
  const params = new URLSearchParams(location.search);
  // Slow-motion plates (scripts/slowmo_plates.sh): one directory per shot "<a>-<b>",
  // frame k shows source frame a + k / SLOW.
  const PLATE_DIR = params.get('plates') || '../../build/black-week/slow';
  const SLOW = 4;

  // Offer per product. `price` is the current shop price in euros; the second shot of
  // each product shows it struck through with the reduced price in red.
  const PRODUCTS = {
    B: { gift: 15, min: 100, price: 119 },    // Barhocker SAMIR
    W: { gift: 75, min: 500, price: 529 },    // Whirlpool DROP
    I: { gift: 150, min: 1000, price: 1099 },  // Infrarotkabine REDSUN DELUXE S
  };

  // Edit decision list: source frame ranges of the rough cut (six 2 s shots), regrouped
  // per product. Each shot plays its first `fast` source frames in real time (the camera
  // move), then ramps into slow motion so that its first `use` source frames fill `dur`
  // output frames.
  const INTRO = 38;
  const SHOTS = [
    { name: 'B1', product: 'B', src: [0, 47], use: 47, dur: 76, fast: 12 },     // Barhocker, Front
    { name: 'B2', product: 'B', src: [144, 191], use: 30, dur: 52, fast: 10 },  // Barhocker, Seite
    { name: 'W1', product: 'W', src: [48, 95], use: 47, dur: 76, fast: 12 },    // Whirlpool
    { name: 'W2', product: 'W', src: [192, 231], use: 30, dur: 52, fast: 10 },  // Whirlpool, zweiter Winkel
    { name: 'I1', product: 'I', src: [96, 143], use: 47, dur: 76, fast: 12 },   // Infrarotkabine
    { name: 'I2', product: 'I', src: [240, 288], use: 32, dur: 52, fast: 10 },  // Infrarotkabine, zweiter Winkel
  ];
  const RAMP = 10;               // output frames to ease from real time into slow motion
  let at = INTRO;
  for (const s of SHOTS) {
    const L = s.use;
    const ease = u => { const k = Math.min(1, Math.max(0, (u - s.fast) / RAMP)); return k * k * (3 - 2 * k); };
    let real = 0, slow = 0;
    for (let u = 1; u < s.dur; u++) { real += 1 - ease(u); slow += ease(u); }
    s.rate = (L - real) / slow;  // source frames per output frame once slowed down
    s.pos = [0];
    for (let u = 1; u < s.dur; u++) s.pos[u] = s.pos[u - 1] + (1 - ease(u)) + s.rate * ease(u);
    s.dir = `${s.src[0]}-${s.src[1]}`;
    s.maxK = (s.src[1] - s.src[0]) * SLOW - SLOW;    // minterpolate stops a few frames short of the last source frame
    s.at = at;
    at += s.dur;
  }
  const shot = name => SHOTS.find(s => s.name === name);
  const shotEnd = s => s.at + s.dur;
  const FOOTAGE_END = at;

  // Transitions, output frames.
  const X = {
    seam: [INTRO - 15, INTRO - 7],                       // white line cuts the black frame open …
    doors: [INTRO - 6, INTRO + 8],                       // … and the doors open onto B1
    stairs: [shot('W1').at, shot('I1').at],              // stepped black wipe on each product change
    stairsDur: 7, stairsStagger: 1,
    push: 150,                                           // footage drift (px) through the stairs wipe
    end: FOOTAGE_END - 6,                                // I2 shrinks into the third bar (end A)
    endDur: 20,
  };
  X.endB = X.end + 102;                                  // explanation → urgency + CTA
  X.endBOut = 10;
  const TOTAL = X.endB + 84;                     // ≈ 25 s

  // Graphics timeline, output seconds.
  const T = {
    logo: (INTRO + 4) / FPS,       // the intro carries its own logo on the top door
    intro: 0.04,
    end: X.end / FPS,
    endB: X.endB / FPS,
  };

  // End A: three video bars forming the discount staircase.
  const BASE = 1440;
  const BARS = [
    { x: 72, w: 300, h: 300, s: 0.25, f: [540, 1010], shot: 'B1', loop: [60, 184] },
    { x: 390, w: 300, h: 470, s: 0.31, f: [545, 990], shot: 'W1', loop: [48, 184] },
    { x: 708, w: 300, h: 640, s: 0.40, f: [525, 930], shot: 'I2' },
  ];

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
    outBack: k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  const showBox = (node, on) => { node.style.display = on ? '' : 'none'; };
  const eur = v => Math.round(v).toLocaleString('de-DE') + ' €';
  const pingpong = (i, lo, hi) => { const L = hi - lo, p = ((i % (2 * L)) + 2 * L) % (2 * L); return lo + (p <= L ? p : 2 * L - p); };

  // Block wipe: opens left→right, leaves left→right.
  const BLEED = 80;
  function wipe(el, t, tin, tout, din = 0.5, dout = 0.32) {
    const a = E.outExpo(prog(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
    if (a <= 0 || b >= 1) { show(el, false); return; }
    const w = el.offsetWidth + BLEED;
    show(el, true);
    el.style.clipPath = `inset(-${BLEED}px ${(1 - a) * w - BLEED}px -${BLEED}px ${b * w - BLEED}px)`;
  }
  // Masked line rise.
  function rise(span, t, tin, dur = 0.55) {
    const k = E.outExpo(prog(t, tin, dur));
    span.style.transform = `translateY(${(1 - k) * 108}%)`;
  }
  function count(numEl, t, tin, to, dur = 0.6) {
    numEl.textContent = Math.round(to * E.outCubic(prog(t, tin, dur)));
  }
  // Short scale pop once a value lands.
  const pop = (t, tin, amt = 0.08) => (t > tin ? 1 + amt * Math.sin(Math.PI * prog(t, tin, 0.22)) : 1);

  // ---------------------------------------------------------------- elements
  const el = {
    slot: $('#footage .shot'), logo: $('#logo'),
    doorTop: $('#door-top'), doorBot: $('#door-bot'), seam: $('#seam'),
    introWords: $$('#intro-word .ln > span'), introUpto: $('#intro-upto .ln > span'),
    introAmount: $('#intro-amount'), introAmountLn: $('#intro-amount .ln > span'), introNum: $('#intro-amount .num'),
    introGift: $('#intro-gift .ln > span'), introDate: $('#intro-date'), introDateLn: $('#intro-date .ln > span'),
    stairs: $$('#stairs-wipe div'), stairsBox: $('#stairs-wipe'),
    endA: $('#endA'), endAKicker: $('#endA-kicker'), endAKickerLn: $('#endA-kicker .ln > span'),
    endAHl: $$('#endA-hl .ln > span'),
    tiles: [0, 1, 2].map(i => $(`#tile-${i}`)),
    amts: [0, 1, 2].map(i => $(`#amt-${i}`)),
    tiers: [0, 1, 2].map(i => $(`#tier-${i}`)),
    baseline: $('#baseline'),
    endB: $('#endB'), endBKicker: $('#endB-kicker'), endBKickerLn: $('#endB-kicker .ln > span'),
    endBBig: $$('#endB-big .ln > span'), endBDate: $('#endB-date'), endBDateLn: $('#endB-date .ln > span'),
    endBUpto: $('#endB-upto .ln > span'),
    btn: $('#cta .btn'), arrow: $('#cta .btn svg'), url: $('#cta .url'), urlLine: $('#cta .url i'),
    ticker: $('#ticker'), track: $('#ticker-track'), legal: $('#legal'),
  };
  const shines = el.tiles.map(tile => $('.shine', tile));
  const cards = Object.fromEntries(['B', 'W', 'I'].map((p, i) => {
    const offer = $(`#offer-${p}`), deal = $(`#deal-${p}`);
    return [p, {
      level: i, s1: shot(`${p}1`), s2: shot(`${p}2`),
      offer, offerBlks: $$(':scope > .blk', offer), num: $('.num', offer), amount: $('.amount', offer),
      steps: $$('.stairs rect', offer),
      deal, dealBlks: $$(':scope > .blk', deal),
      old: $('.old', deal), strike: $('.old i', deal), nw: $('.new', deal),
    }];
  }));

  // ---------------------------------------------------------------- footage
  function currentShot(n) {
    let cur = SHOTS[0];
    for (const s of SHOTS) if (n >= s.at) cur = s;
    return cur;
  }
  // Slow-plate frame of shot s at output frame n (holds the last frame past its end).
  const plateOf = (s, n) => clamp(Math.round(s.pos[clamp(n - s.at, 0, s.dur - 1)] * SLOW), 0, s.maxK);
  const plateUrl = (s, k) => `${PLATE_DIR}/${s.dir}/f${String(k).padStart(4, '0')}.jpg`;

  // Bars: bar 3 keeps playing I2 and then drifts back and forth in slow motion;
  // bars 1 + 2 loop calm, fully slowed-down stretches of their shots.
  function barPlate(i, n) {
    const b = BARS[i], s = shot(b.shot);
    if (i === 2) {
      const last = plateOf(s, shotEnd(s) - 1);
      if (n < shotEnd(s)) return { s, k: plateOf(s, n) };
      return { s, k: last - pingpong(n - shotEnd(s), 0, Math.min(90, last)) };
    }
    return { s, k: pingpong(n - X.end, b.loop[0], b.loop[1]) };
  }

  function plan(n) {
    const main = n < X.end ? (() => { const s = currentShot(n); return { s, k: plateOf(s, n) }; })() : null;
    const tiles = n >= X.end && n < X.endB + 2 ? [0, 1, 2].map(i => barPlate(i, n)) : [null, null, null];
    return { main, tiles };
  }

  // Position a tile: rect on stage + plate scale s with plate point f at the rect centre.
  function placeTile(tile, r, s, f) {
    Object.assign(tile.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    tile.firstElementChild.style.transform = `translate(${r.w / 2 - s * f[0]}px, ${r.h / 2 - s * f[1]}px) scale(${s})`;
  }

  // ---------------------------------------------------------------- render
  function render(n) {
    const t = n / FPS;
    const cur = currentShot(n);

    // Footage drift through the stairs wipe: the outgoing shot accelerates upwards,
    // the incoming one arrives from below and settles. Cards ride along.
    let drift = 0;
    for (const cut of X.stairs) {
      const lead = X.stairsStagger * (el.stairs.length - 1) + X.stairsDur;
      if (n >= cut - lead && n < cut) drift = -X.push * E.inCubic(prog(n, cut - lead, lead));
      else if (n >= cut && n <= cut + lead + 6) drift = X.push * (1 - E.outCubic(prog(n, cut, lead + 6)));
    }

    // Main footage (gentle settle punch on each cut after the doors).
    show(el.slot, n < X.end);
    const punch = cur.name === 'B1' ? 1 : 1 + 0.035 * (1 - E.outCubic(prog(n - cur.at, 0, 10)));
    el.slot.firstElementChild.style.transformOrigin = '540px 960px';
    el.slot.firstElementChild.style.transform = `translateY(${drift}px) scale(${punch})`;

    // Intro: BLACK WEEK, then the hero amount counts up; a white seam cuts the frame
    // open and the two halves part onto the first shot.
    const dk = E.inOutCubic(prog(n, X.doors[0], X.doors[1] - X.doors[0]));
    showBox(el.doorTop, dk < 1); showBox(el.doorBot, dk < 1);
    el.doorTop.style.transform = `translateY(${-dk * 960}px)`;
    el.doorBot.style.transform = `translateY(${dk * 960}px)`;
    el.introWords.forEach((s, i) => rise(s, t, T.intro + i * 0.09, 0.5));
    rise(el.introUpto, t, T.intro + 0.24, 0.45);
    rise(el.introAmountLn, t, T.intro + 0.3, 0.5);
    count(el.introNum, t, T.intro + 0.32, 150, 0.6);
    el.introAmount.style.transformOrigin = 'left center';
    el.introAmount.style.transform = `scale(${pop(t, T.intro + 0.92, 0.06)})`;
    rise(el.introGift, t, T.intro + 0.46, 0.45);
    wipe(el.introDate, t, T.intro + 0.62, null, 0.45);
    rise(el.introDateLn, t, T.intro + 0.7, 0.45);
    const sk = E.inOutCubic(prog(n, X.seam[0], X.seam[1] - X.seam[0]));
    show(el.seam, sk > 0 && n < X.doors[0] + 2);
    el.seam.style.transform = `scaleX(${sk})`;

    // Persistent logo plate.
    wipe(el.logo, t, T.logo, null, 0.5);

    // Products, one idea at a time.
    for (const [p, c] of Object.entries(cards)) {
      // Shot 1: name → amount → condition, then the card clears for the price.
      const s1 = c.s1.at / FPS, out1 = c.s2.at / FPS - 0.4;
      const onOffer = n >= c.s1.at && n < c.s2.at;
      showBox(c.offer, onOffer);
      if (onOffer) {
        c.offer.style.translate = `0 ${drift}px`;
        const tins = [s1 + 0.25, s1 + 0.75, s1 + 1.45];
        c.offerBlks.forEach((blk, i) => {
          wipe(blk, t, tins[i], out1 + i * 0.05);
          $$('.ln > span', blk).forEach((s, j) => rise(s, t, tins[i] + 0.1 + j * 0.07));
        });
        c.steps.forEach((r, j) => {
          const lit = j <= c.level && t >= tins[0] + 0.35 + j * 0.12;
          r.style.fill = lit ? '#fff' : 'rgba(255, 255, 255, .28)';
        });
        count(c.num, t, tins[1] + 0.1, PRODUCTS[p].gift, 0.6);
        c.amount.style.transform = `scale(${pop(t, tins[1] + 0.7)})`;
      }

      // Shot 2: the reduced price on its own.
      const s2 = c.s2.at / FPS;
      const nextAt = p === 'I' ? X.end + 2 : shot(`${['B', 'W', 'I'][c.level + 1]}1`).at;
      const onDeal = n >= c.s2.at && n < nextAt;
      showBox(c.deal, onDeal);
      if (onDeal) {
        c.deal.style.translate = `0 ${drift}px`;
        const out2 = p === 'I' ? T.end - 0.42 : null;
        c.dealBlks.forEach((blk, i) => {
          wipe(blk, t, s2 + 0.25 + i * 0.1, out2 == null ? null : out2 + i * 0.05);
          $$('.ln > span', blk).forEach(s => rise(s, t, s2 + 0.35 + i * 0.1));
        });
        const ko = E.outExpo(prog(t, s2 + 0.42, 0.4));
        c.old.style.opacity = ko.toFixed(3);
        c.old.style.transform = `translateY(${(1 - ko) * 20}px)`;
        c.strike.style.transform = `scaleX(${E.inOutCubic(prog(t, s2 + 0.75, 0.22))})`;
        const kn = prog(t, s2 + 0.92, 0.42);
        c.nw.style.opacity = Math.min(1, kn * 4).toFixed(3);
        c.nw.style.transform = `scale(${kn > 0 ? E.outBack(kn) : 0.5})`;
      }
    }

    // Stepped black wipe: columns rise from the bottom (right column leads, like a
    // staircase going up), cover the cut, then clear upwards.
    let wipeOn = false;
    for (const cut of X.stairs) {
      const lead = X.stairsStagger * (el.stairs.length - 1) + X.stairsDur;
      if (n < cut - lead || n > cut + lead) continue;
      wipeOn = true;
      el.stairs.forEach((col, i) => {
        const d = (el.stairs.length - 1 - i) * X.stairsStagger;
        const kin = E.inOutCubic(prog(n, cut - lead + d, X.stairsDur));
        const kout = E.inOutCubic(prog(n, cut + d, X.stairsDur));
        col.style.clipPath = `inset(${H * (1 - kin)}px 0 ${H * kout}px 0)`;
      });
    }
    showBox(el.stairsBox, wipeOn);

    // ------------------------------------------------------------ end A
    const inA = n >= X.end && n < X.endB;
    showBox(el.endA, inA);
    el.tiles.forEach(tile => showBox(tile, inA));
    if (inA) renderEndA(n, t - T.end);

    // ------------------------------------------------------------ end B
    const inB = n >= X.endB - X.endBOut;
    showBox(el.endB, inB);
    if (inB) renderEndB(t - T.endB);
  }

  function renderEndA(n, te) {
    // Bar 3: full-frame footage shrinks into its slot.
    const ek = E.inOutCubic(prog(n, X.end, X.endDur));
    const b3 = BARS[2];
    const r3 = { x: lerp(0, b3.x, ek), y: lerp(0, BASE - b3.h, ek), w: lerp(W, b3.w, ek), h: lerp(H, b3.h, ek) };
    placeTile(el.tiles[2], r3, lerp(1, b3.s, ek), [lerp(540, b3.f[0], ek), lerp(960, b3.f[1], ek)]);

    // Kicker + headline.
    wipe(el.endAKicker, te, 0.4, null);
    rise(el.endAKickerLn, te, 0.47);
    el.endAHl.forEach((s, i) => rise(s, te, 0.5 + i * 0.1, 0.6));

    // Bars 1 + 2 grow from the baseline.
    el.baseline.style.transform = `scaleX(${E.outExpo(prog(te, 0.85, 0.7))})`;
    [0, 1].forEach(i => {
      const b = BARS[i];
      placeTile(el.tiles[i], { x: b.x, y: BASE - b.h, w: b.w, h: b.h }, b.s, b.f);
      const k = E.outExpo(prog(te, 1.0 + i * 0.2, 0.6));
      el.tiles[i].style.clipPath = `inset(${(1 - k) * b.h}px 0 0 0)`;
      show(el.tiles[i], k > 0);
    });

    // Amounts climb the stairs one after another, tiers below.
    BARS.forEach((b, i) => {
      const a = el.amts[i], tin = 1.2 + i * 0.32;
      a.style.left = `${b.x - 4}px`;
      a.style.top = `${BASE - b.h - a.offsetHeight - 12}px`;
      const k = E.outExpo(prog(te, tin, 0.55));
      a.style.opacity = k.toFixed(3);
      a.style.transform = `translateY(${(1 - k) * 40}px) scale(${pop(te, tin + 0.6, 0.06)})`;
      a.style.transformOrigin = 'left bottom';
      count($('.num', a), te, tin, [15, 75, 150][i], 0.6);
      const tr = el.tiers[i];
      tr.style.left = `${b.x}px`;
      const kt = E.outExpo(prog(te, tin + 0.15, 0.55));
      tr.style.opacity = kt.toFixed(3);
      tr.style.transform = `translateY(${(1 - kt) * -24}px)`;
    });

    // Light sweep running up the staircase, bar by bar, every 2 s.
    shines.forEach((sh, i) => {
      const k = prog(((te - 2.5 - i * 0.18) % 2 + 2) % 2, 0, 0.55);
      const live = te > 2.5 + i * 0.18 && k > 0 && k < 1;
      show(sh, live);
      if (live) sh.style.transform = `translateX(${lerp(-160, BARS[i].w + 60, E.inOutCubic(k))}px) rotate(18deg)`;
    });

    // Hand-over to end B: everything lifts away.
    const ko = E.inCubic(prog(n, X.endB - X.endBOut, X.endBOut));
    for (const node of [el.endA, ...el.tiles]) {
      node.style.opacity = (1 - ko).toFixed(3);
      node.style.translate = `0 ${-90 * ko}px`;
    }
  }

  function renderEndB(tb) {
    wipe(el.endBKicker, tb, 0.15, null);
    rise(el.endBKickerLn, tb, 0.22);
    el.endBBig.forEach((s, i) => rise(s, tb, 0.25 + i * 0.12, 0.6));
    wipe(el.endBDate, tb, 0.75, null);
    rise(el.endBDateLn, tb, 0.85);
    rise(el.endBUpto, tb, 1.0);
    wipe(el.btn, tb, 1.3, null, 0.55);
    const ku = E.outExpo(prog(tb, 1.5, 0.55));
    el.url.style.opacity = ku.toFixed(3);
    el.url.style.transform = `translateX(${(1 - ku) * -24}px)`;
    el.urlLine.style.transform = `scaleX(${E.outExpo(prog(tb, 1.7, 0.6))})`;
    const nudge = tb > 2.0 ? Math.pow(Math.sin(Math.PI * (((tb - 2.0) % 1.1) / 1.1)), 2) : 0;
    el.arrow.style.transform = `translateX(${nudge * 9}px)`;
    // FOMO ticker.
    const tk = E.outExpo(prog(tb, 0.5, 0.6));
    show(el.ticker, tk > 0);
    el.ticker.style.clipPath = `inset(0 ${(1 - tk) * 100}% 0 0)`;
    const segW = el.track.firstElementChild.offsetWidth;
    el.track.style.transform = `translateX(${-(((tb + 2) * 120) % segW)}px)`;
    el.legal.style.opacity = (0.999 * E.outCubic(prog(tb, 1.7, 0.6))).toFixed(3);
  }

  async function loadImg(img, ref) {
    if (!ref) return;
    const url = plateUrl(ref.s, ref.k);
    if (img.dataset.src === url) return;
    img.src = url;
    await img.decode();
    img.dataset.src = url;
  }

  async function seek(n) {
    const p = plan(n);
    await Promise.all([
      loadImg(el.slot.firstElementChild, p.main),
      ...el.tiles.map((tile, i) => loadImg(tile.firstElementChild, p.tiles[i])),
    ]);
    render(n);
  }

  function build() {
    const seg = '<span>Black Week<i></i>Nur 7 Tage<i></i>Bis zu <b>150 €</b> geschenkt<i></i>Nur bis 26.11.<i></i></span>';
    el.track.innerHTML = seg.repeat(4);
    for (const [p, c] of Object.entries(cards)) {
      const { gift, price } = PRODUCTS[p];
      $('span', c.old).textContent = eur(price);
      c.nw.textContent = eur(price - gift);
      // Reserve the final width so the count-up does not jitter the block.
      c.num.textContent = gift;
      c.num.style.minWidth = `${c.num.offsetWidth}px`;
    }
    el.introNum.style.minWidth = `${el.introNum.offsetWidth}px`;
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('#logo img, .door-logo').map(i => i.decode()));
    build();
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
