// Black Week – Staffelrabatt, Reel 9:16. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
(() => {
  const FPS = 24;                // source is 24 fps, output keeps every frame
  const W = 1080, H = 1920;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/black-week/plates';

  // Offer per product. `price` is the current shop price in euros; when set (and it
  // reaches `min`), the card adds a row "old price struck through → reduced price in red".
  const PRODUCTS = {
    B: { gift: 15, min: 100, price: 119 },    // Barhocker SAMIR
    W: { gift: 75, min: 500, price: 529 },    // Whirlpool DROP
    I: { gift: 150, min: 1000, price: 1099 },  // Infrarotkabine REDSUN DELUXE S
  };

  // Edit decision list: source frame ranges of the rough cut (six 2 s shots:
  // Barhocker, Whirlpool, Infrarot, then each again), regrouped per product.
  // Shots play back to back after the black intro.
  const INTRO = 38;
  const SHOTS = [
    { name: 'B1', product: 'B', src: [0, 47] },     // Barhocker, Front
    { name: 'B2', product: 'B', src: [144, 191] },  // Barhocker, Seite
    { name: 'W1', product: 'W', src: [48, 95] },    // Whirlpool
    { name: 'W2', product: 'W', src: [192, 231] },  // Whirlpool, zweiter Winkel
    { name: 'I1', product: 'I', src: [96, 143] },   // Infrarotkabine
    { name: 'I2', product: 'I', src: [240, 288] },  // Infrarotkabine, zweiter Winkel
  ];
  let at = INTRO;
  for (const s of SHOTS) { s.at = at; at += s.src[1] - s.src[0] + 1; }
  const shot = name => SHOTS.find(s => s.name === name);
  const FOOTAGE_END = at;                        // 302

  // Transitions, output frames.
  const X = {
    seam: [INTRO - 15, INTRO - 7],                       // white line cuts the black frame open …
    doors: [INTRO - 6, INTRO + 8],                       // … and the doors open onto B1
    stairs: [shot('W1').at, shot('I1').at],              // stepped black wipe on each product change
    stairsDur: 7, stairsStagger: 1,
    push: 150,                                           // footage drift (px) through the stairs wipe
    end: FOOTAGE_END - 6,                                // I2 shrinks into the third bar
    endDur: 20,
  };
  const TOTAL = X.end + 140;                     // ≈ 18.2 s

  // Graphics timeline, output seconds.
  const T = {
    logo: (INTRO + 4) / FPS,       // the intro carries its own logo on the top door
    intro: 0.04,
    ticker: (INTRO + 4) / FPS,
    cards: { B: (shot('B1').at + 14) / FPS, W: (shot('W1').at + 10) / FPS, I: (shot('I1').at + 10) / FPS },
    badge: (shot('B1').at + 26) / FPS,
    cardIOut: (X.end - 10) / FPS,
    end: X.end / FPS,
  };

  // End card: three video bars forming the discount staircase.
  const BASE = 1290;
  const BARS = [
    { x: 72, w: 300, h: 280, s: 0.24, f: [540, 1010] },   // Barhocker
    { x: 390, w: 300, h: 440, s: 0.30, f: [545, 990] },   // Whirlpool
    { x: 708, w: 300, h: 600, s: 0.38, f: [525, 930] },   // Infrarotkabine
  ];
  // Source loops for the bars (ping-pong over settled frames).
  const LOOPS = [[16, 47], [60, 95], [256, 288]];

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
  const eur = v => Math.round(v).toLocaleString('de-DE') + ' €';
  // Ping-pong through [lo, hi].
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
  // Count-up with a small overshoot pop when it lands.
  function count(numEl, t, tin, to, dur = 0.6) {
    numEl.textContent = Math.round(to * E.outCubic(prog(t, tin, dur)));
  }

  // ---------------------------------------------------------------- elements
  const el = {
    slot: $('#footage .shot'), logo: $('#logo'),
    doorTop: $('#door-top'), doorBot: $('#door-bot'), seam: $('#seam'),
    introWords: $$('#intro-word .ln > span'), introUpto: $('#intro-upto .ln > span'),
    introAmount: $('#intro-amount .ln > span'), introNum: $('#intro-amount .num'),
    introGift: $('#intro-gift .ln > span'), introDate: $('#intro-date'), introDateLn: $('#intro-date .ln > span'),
    stairs: $$('#stairs-wipe div'),
    badge: $('#badge'), badgeRot: $('#badge-rot'),
    ticker: $('#ticker'), track: $('#ticker-track'),
    end: $('#end'), endKicker: $('#end-kicker'), endKickerLn: $('#end-kicker .ln > span'),
    endHl: $$('#end-hl .ln > span'),
    tiles: [0, 1, 2].map(i => $(`#tile-${i}`)),
    amts: [0, 1, 2].map(i => $(`#amt-${i}`)),
    tiers: [0, 1, 2].map(i => $(`#tier-${i}`)),
    baseline: $('#baseline'),
    exLbl: $('#example .lbl .ln > span'), exOld: $('#example .old'), exStrike: $('#example .old i'),
    exArrow: $('#example .arrow'), exNew: $('#example .new'),
    btn: $('#cta .btn'), arrow: $('#cta .btn svg'), url: $('#cta .url'), urlLine: $('#cta .url i'),
    legal: $('#legal'),
  };
  const cards = Object.fromEntries(['B', 'W', 'I'].map((p, i) => {
    const root = $(`#card-${p}`);
    return [p, {
      root, level: i, blks: $$(':scope > .blk', root), num: $('.num', root), amount: $('.amount', root),
      steps: $$('.stairs rect', root), price: $('.price', root),
    }];
  }));
  const shines = el.tiles.map(tile => $('.shine', tile));

  // ---------------------------------------------------------------- footage
  function currentShot(n) {
    let cur = SHOTS[0];
    for (const s of SHOTS) if (n >= s.at) cur = s;
    return cur;
  }
  const srcOf = (s, n) => clamp(s.src[0] + n - s.at, s.src[0], s.src[1]);

  // Third bar: I2 keeps playing, then ping-pongs backwards from its last frame.
  function barSrc(i, n) {
    if (i === 2) {
      const I2 = shot('I2');
      if (n <= I2.at + I2.src[1] - I2.src[0]) return srcOf(I2, n);
      const [lo, hi] = LOOPS[2];
      return hi - (pingpong(n - (I2.at + I2.src[1] - I2.src[0]), 0, hi - lo));
    }
    const [lo, hi] = LOOPS[i];
    return pingpong(n - X.end, lo, hi);
  }

  // Images needed for frame n: main slot + the three bar tiles.
  function plan(n) {
    const main = n < X.end ? srcOf(currentShot(n), n) : null;
    const tiles = n >= X.end ? [0, 1, 2].map(i => barSrc(i, n)) : [null, null, null];
    return { main, tiles };
  }

  // Position a tile: rect on stage + plate scale s with plate point f at the rect centre.
  function placeTile(tile, r, s, f) {
    Object.assign(tile.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    const img = tile.firstElementChild;
    img.style.transform = `translate(${r.w / 2 - s * f[0]}px, ${r.h / 2 - s * f[1]}px) scale(${s})`;
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

    // Main footage (with a gentle settle punch on each cut after the doors).
    show(el.slot, n < X.end);
    const sinceCut = n - cur.at;
    const punch = cur.name === 'B1' ? 1 : 1 + 0.035 * (1 - E.outCubic(prog(sinceCut, 0, 10)));
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
    rise(el.introAmount, t, T.intro + 0.3, 0.5);
    count(el.introNum, t, T.intro + 0.32, 150, 0.6);
    const ip = t > T.intro + 0.92 ? 1 + 0.06 * Math.sin(Math.PI * prog(t, T.intro + 0.92, 0.2)) : 1;
    el.introAmount.parentElement.parentElement.style.transformOrigin = 'left center';
    el.introAmount.parentElement.parentElement.style.transform = `scale(${ip})`;
    rise(el.introGift, t, T.intro + 0.46, 0.45);
    wipe(el.introDate, t, T.intro + 0.62, null, 0.45);
    rise(el.introDateLn, t, T.intro + 0.7, 0.45);
    const sk = E.inOutCubic(prog(n, X.seam[0], X.seam[1] - X.seam[0]));
    show(el.seam, sk > 0 && n < X.doors[0] + 2);
    el.seam.style.transform = `scaleX(${sk})`;

    // Persistent logo plate.
    wipe(el.logo, t, T.logo, null, 0.5);

    // Product cards.
    for (const [p, c] of Object.entries(cards)) {
      const tin = T.cards[p];
      const first = SHOTS.find(s => s.product === p);
      const last = [...SHOTS].reverse().find(s => s.product === p);
      const lastEnd = last.at + last.src[1] - last.src[0] + 1;
      const on = n >= first.at && n < Math.min(lastEnd, X.end + 2);
      showBox(c.root, on);
      if (!on) continue;
      c.root.style.translate = `0 ${drift}px`;
      const tout = p === 'I' ? T.cardIOut : null;
      c.blks.forEach((blk, i) => {
        const bi = tin + i * 0.1;
        wipe(blk, t, bi, tout == null ? null : tout + i * 0.04);
        $$('.ln > span', blk).forEach((s, j) => rise(s, t, bi + 0.1 + j * 0.06));
      });
      // Staircase icon climbs to this product's step.
      c.steps.forEach((r, j) => {
        const lit = j <= c.level && t >= tin + 0.3 + j * 0.1;
        r.style.fill = lit ? '#fff' : 'rgba(255, 255, 255, .28)';
      });
      const ct = tin + 0.22;
      count(c.num, t, ct, PRODUCTS[p].gift);
      const pop = t > ct + 0.6 ? 1 + 0.08 * Math.sin(Math.PI * prog(t, ct + 0.6, 0.22)) : 1;
      c.amount.style.transformOrigin = 'left center';
      c.amount.style.transform = `scale(${pop})`;
      // Price row: old price lands, gets struck through, reduced price pops in red.
      if (c.price.isConnected) {
        const pt = tin + 0.3 + 0.18;
        const old = $('.old', c.price), strike = $('.old i', c.price), nw = $('b', c.price);
        const ko = E.outExpo(prog(t, pt + 0.1, 0.4));
        old.style.opacity = ko.toFixed(3);
        strike.style.transform = `scaleX(${E.inOutCubic(prog(t, ct + 0.55, 0.22))})`;
        const kn = prog(t, ct + 0.7, 0.42);
        nw.style.opacity = Math.min(1, kn * 4).toFixed(3);
        nw.style.transform = `scale(${kn > 0 ? E.outBack(kn) : 0.5})`;
      }
    }

    // Rotating FOMO badge (product shots + end card).
    const bk = E.outBack(prog(t, T.badge, 0.5));
    show(el.badge, bk > 0.001 && n >= X.doors[1]);
    el.badge.style.transform = `scale(${Math.max(0, bk)}) rotate(${(1 - Math.min(1, bk)) * -40}deg)`;
    el.badgeRot.style.transform = `rotate(${(t - T.badge) * 42}deg)`;

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
        const top = H * (1 - kin), bot = H * (1 - kout);
        col.style.clipPath = `inset(${top}px 0 ${H - bot}px 0)`;
      });
    }
    showBox($('#stairs-wipe'), wipeOn);

    // FOMO ticker.
    const tk = E.outExpo(prog(t, T.ticker, 0.5));
    show(el.ticker, tk > 0);
    el.ticker.style.clipPath = `inset(0 ${(1 - tk) * 100}% 0 0)`;
    const segW = el.track.firstElementChild.offsetWidth;
    el.track.style.transform = `translateX(${-((t * 130) % segW)}px)`;

    // ------------------------------------------------------------ end card
    const inEnd = n >= X.end;
    showBox(el.end, inEnd);
    el.tiles.forEach(tile => showBox(tile, inEnd));
    if (!inEnd) return;
    const te = t - T.end;

    // Bar 3: full-frame footage shrinks into its slot.
    const ek = E.inOutCubic(prog(n, X.end, X.endDur));
    const b3 = BARS[2];
    const r3 = { x: lerp(0, b3.x, ek), y: lerp(0, BASE - b3.h, ek), w: lerp(W, b3.w, ek), h: lerp(H, b3.h, ek) };
    placeTile(el.tiles[2], r3, lerp(1, b3.s, ek), [lerp(540, b3.f[0], ek), lerp(960, b3.f[1], ek)]);

    // Bars 1 + 2 grow from the baseline.
    [0, 1].forEach(i => {
      const b = BARS[i];
      placeTile(el.tiles[i], { x: b.x, y: BASE - b.h, w: b.w, h: b.h }, b.s, b.f);
      const k = E.outExpo(prog(te, 0.75 + i * 0.14, 0.6));
      el.tiles[i].style.clipPath = `inset(${(1 - k) * b.h}px 0 0 0)`;
      show(el.tiles[i], k > 0);
    });
    el.baseline.style.transform = `scaleX(${E.outExpo(prog(te, 0.6, 0.7))})`;

    // Light sweep running up the staircase, bar by bar, every 2.2 s.
    shines.forEach((sh, i) => {
      const k = prog(((te - 1.9 - i * 0.18) % 2.2 + 2.2) % 2.2, 0, 0.55);
      const live = te > 1.9 + i * 0.18 && k > 0 && k < 1;
      show(sh, live);
      if (live) sh.style.transform = `translateX(${lerp(-160, BARS[i].w + 60, E.inOutCubic(k))}px) rotate(18deg)`;
    });

    // Amounts above the bars + tiers below.
    BARS.forEach((b, i) => {
      const a = el.amts[i];
      const tin = 1.0 + i * 0.16;
      a.style.left = `${b.x - 4}px`;
      a.style.top = `${BASE - b.h - a.offsetHeight - 12}px`;
      const k = E.outExpo(prog(te, tin, 0.55));
      a.style.opacity = k.toFixed(3);
      a.style.transform = `translateY(${(1 - k) * 40}px)`;
      count($('.num', a), te, tin, [15, 75, 150][i], 0.65);
      const tr = el.tiers[i];
      tr.style.left = `${b.x}px`;
      const kt = E.outExpo(prog(te, 1.1 + i * 0.16, 0.55));
      tr.style.opacity = kt.toFixed(3);
      tr.style.transform = `translateY(${(1 - kt) * -24}px)`;
    });

    // Kicker + headline.
    wipe(el.endKicker, te, 0.35, null);
    rise(el.endKickerLn, te, 0.42);
    el.endHl.forEach((s, i) => rise(s, te, 0.5 + i * 0.1, 0.6));

    // Example: struck-through old total → reduced total in red.
    rise(el.exLbl, te, 1.75);
    const ko = E.outExpo(prog(te, 1.9, 0.5));
    el.exOld.style.opacity = ko.toFixed(3);
    el.exOld.style.transform = `translateY(${(1 - ko) * 30}px)`;
    el.exStrike.style.transform = `scaleX(${E.inOutCubic(prog(te, 2.25, 0.3))})`;
    const ka = E.outExpo(prog(te, 2.4, 0.5));
    el.exArrow.style.opacity = ka.toFixed(3);
    el.exArrow.style.transform = `translateX(${(1 - ka) * -20}px)`;
    const kn = prog(te, 2.5, 0.45);
    el.exNew.style.opacity = Math.min(1, kn * 3).toFixed(3);
    const beat = te > 3.0 ? 1 + 0.045 * Math.pow(Math.sin(Math.PI * (((te - 3.0) % 1.1) / 1.1)), 2) : 1;
    el.exNew.style.transform = `scale(${(kn > 0 ? E.outBack(kn) : 0.6) * beat})`;

    // CTA.
    wipe(el.btn, te, 3.0, null, 0.55);
    const ku = E.outExpo(prog(te, 3.2, 0.55));
    el.url.style.opacity = ku.toFixed(3);
    el.url.style.transform = `translateX(${(1 - ku) * -24}px)`;
    el.urlLine.style.transform = `scaleX(${E.outExpo(prog(te, 3.4, 0.6))})`;
    const nudge = te > 3.7 ? Math.pow(Math.sin(Math.PI * (((te - 3.7) % 1.1) / 1.1)), 2) : 0;
    el.arrow.style.transform = `translateX(${nudge * 9}px)`;
    el.legal.style.opacity = (0.999 * E.outCubic(prog(te, 3.4, 0.6))).toFixed(3);
  }

  async function loadImg(img, idx) {
    if (idx == null || img.dataset.idx === String(idx)) return;
    img.src = `${PLATE_DIR}/f${String(idx).padStart(4, '0')}.jpg`;
    await img.decode();
    img.dataset.idx = String(idx);
  }

  async function seek(n) {
    const p = plan(n);
    await Promise.all([
      loadImg(el.slot.firstElementChild, p.main),
      ...el.tiles.map((tile, i) => loadImg(tile.firstElementChild, p.tiles[i])),
    ]);
    render(n);
  }

  function buildTicker() {
    const seg = '<span>Black Week<i></i>Bis zu <b>150 €</b> geschenkt<i></i>Nur bis 26.11.<i></i>Nur 7 Tage<i></i></span>';
    el.track.innerHTML = seg.repeat(4);
  }

  function buildPrices() {
    for (const [p, c] of Object.entries(cards)) {
      const { gift, min, price } = PRODUCTS[p];
      const row = $('.price', c.root);
      if (price == null || price < min) { row.remove(); c.blks = c.blks.filter(b => b !== row); continue; }
      row.style.display = 'flex';
      $('.old span', row).textContent = eur(price);
      $('b', row).textContent = eur(price - gift);
    }
    // Reserve the final width so the count-up does not jitter the block.
    for (const [p, c] of Object.entries(cards)) {
      c.num.textContent = PRODUCTS[p].gift;
      c.num.style.minWidth = `${c.num.offsetWidth}px`;
    }
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await $('#logo img').decode();
    buildTicker();
    buildPrices();
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
