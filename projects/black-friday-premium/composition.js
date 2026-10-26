// Black Friday Premium – 9:16. A calm product-page scroll in Home Deluxe CI:
// black page, sticky local nav, five unhurried scenes with one short line each.
// Deterministic and frame-addressed: window.COMP.seek(n) sets output frame n.
(() => {
  const FPS = 30;
  const TOTAL = Math.round(37 * FPS);      // 1110 frames
  const NAV = 124;                         // sticky local nav height
  const GNAV = 112;                        // global nav, scrolls away
  const OFF = 0.25;

  const byId = Object.fromEntries(window.PRODUCTS.map(p => [p.id, p]));
  const sale = p => Math.round(p * (1 - OFF) * 100) / 100;
  const fmt = (v, cents = true) => {
    const [i, d] = Math.abs(v).toFixed(2).split('.');
    const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (cents ? `${int},${d}` : int) + ' €';
  };

  const HIGHLIGHTS = [
    { id: '17', name: 'Couchtisch AMIRI XXL' },
    { id: '00', name: 'Hängesessel LOMA' },
    { id: '02', name: 'Whirlpool BEACH' },
  ];

  // Timeline, output seconds. Every scene rests for several seconds.
  const CAR = { start: 7.4, slides: [[10.4, 1.0], [14.0, 1.0]], end: 17.8 };
  const REVEAL = {               // [start, duration]
    'r-name': [0.4, 1.6], chrome: [1.0, 2.4], 'r-glow': [1.8, 2.2], 'r-prod': [1.8, 2.4], 'r-shadow': [2.2, 2.0],
    'r-hl': [6.3, 1.4], 'r-car': [6.7, 1.4], 'r-ctrl': [7.0, 1.2],
    'full-cap': [20.8, 1.4],
    'r-spa-h': [23.9, 1.4], 'r-spa-card': [24.3, 1.6], 'r-spa-nm': [25.6, 1.2], 'spa-old': [25.9, 1.2], 'spa-now': [27.4, 0.6],
    'r-end-logo': [32.4, 1.6], 'r-end-claim': [33.0, 1.4], 'r-end-cta': [33.6, 1.4], 'r-end-url': [34.0, 1.4],
  };
  const PRICE_DUR = 1.6;         // count-downs take their time
  const SPA = { strike: 27.0, count: 27.4 };
  const FULL = { count: 21.4 };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, [start, dur]) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outCubic: k => 1 - Math.pow(1 - k, 3),
    outQuart: k => 1 - Math.pow(1 - k, 4),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutQuart: k => (k < 0.5 ? 8 * k * k * k * k : 1 - Math.pow(-2 * k + 2, 4) / 2),
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
  };
  const setText = (el, s) => { if (el._t !== s) { el.textContent = s; el._t = s; } };
  const countDown = (p, t0, t) => {
    const k = prog(t, [t0, PRICE_DUR]);
    return fmt(k <= 0 ? p : lerp(p, sale(p), E.outCubic(k)));
  };

  let SCROLL = [], cards = [];

  // Scroll so that an element's top sits `gap` px below the sticky nav.
  const at = (id, gap) => $('#' + id).getBoundingClientRect().top - NAV - gap;

  function build() {
    const track = $('#track');
    for (const h of HIGHLIGHTS) {
      const p = byId[h.id];
      const c = document.createElement('div');
      c.className = 'hcard';
      c.innerHTML = `<img src="source/amb_${h.id}.jpg" alt=""><div class="fade"></div>
        <div class="cap">${h.name}<span class="px"></span><s>${fmt(p.price, false)}</s></div>`;
      track.append(c);
      cards.push({ el: c, img: $('img', c), px: $('.px', c), p });
    }
  }

  function measure() {
    const yHl = at('r-hl', 150);
    const yFull = at('full', 0);
    const ySpa = at('r-spa-h', 150);
    const yEnd = at('end', 0);
    // [t0, t1, from, to, ease]; between segments the page rests.
    SCROLL = [
      [5.6, 7.4, 0, yHl, 'inOutQuart'],
      [17.8, 19.8, yHl, yFull, 'inOutQuart'],
      [19.8, 23.0, yFull, yFull + 200, 'inOutSine'],
      [23.0, 24.8, yFull + 200, ySpa, 'inOutQuart'],
      [30.6, 32.4, ySpa, yEnd, 'inOutQuart'],
    ];
  }

  function scrollAt(t) {
    let y = 0;
    for (const [t0, t1, a, b, ease] of SCROLL) {
      if (t >= t1) y = b;
      else if (t > t0) { y = lerp(a, b, E[ease]((t - t0) / (t1 - t0))); break; }
      else break;
    }
    return y;
  }

  // Slow fade up, the way sections settle on a product page.
  function reveal(t) {
    for (const [id, [t0, dur]] of Object.entries(REVEAL)) {
      const el = $('#' + id);
      const k = E.outQuart(prog(t, [t0, dur]));
      el.style.opacity = k.toFixed(3);
      el.style.transform = `translateY(${(48 * (1 - k)).toFixed(2)}px)`;
    }
  }

  function seek(n) {
    const t = n / FPS;
    const y = scrollAt(t);
    $('#page').style.transform = `translateY(${(-y).toFixed(2)}px)`;
    $('#lnav').style.top = Math.max(0, GNAV - y).toFixed(2) + 'px';
    reveal(t);

    // Hero: chrome type settles, a sheen glides across, the product rises and floats.
    const kc = E.outQuart(prog(t, REVEAL.chrome));
    $('#chrome').style.transform = `translateY(${(30 * (1 - kc)).toFixed(2)}px) scale(${lerp(1.12, 1, kc).toFixed(4)})`;
    $('#chrome').style.filter = kc < 1 ? `blur(${(18 * (1 - kc)).toFixed(2)}px)` : 'none';
    const sh = E.inOutSine(prog(t, [2.8, 2.2]));
    $('#chrome .sheen').style.backgroundPosition = `${lerp(100, -10, sh).toFixed(2)}% 0`;
    $('#chrome .sheen').style.opacity = sh > 0 && sh < 1 ? 1 : 0;
    const kp = E.outQuart(prog(t, REVEAL['r-prod']));
    $('#r-prod').style.transform = `translateY(${(160 * (1 - kp) - 10 * Math.sin(t * 0.7)).toFixed(2)}px) scale(${lerp(0.94, 1, kp).toFixed(4)})`;

    // Highlights carousel: one product per slide, name and price only.
    let slide = 0;
    CAR.slides.forEach(([s0, d]) => { slide += E.inOutCubic(prog(t, [s0, d])); });
    $('#track').style.transform = `translateX(${(-slide * (920 + 28)).toFixed(2)}px)`;
    const starts = [CAR.start, ...CAR.slides.map(([s0, d]) => s0 + d)];
    const ends = [...CAR.slides.map(([s0]) => s0), CAR.end];
    cards.forEach((c, i) => {
      const k = prog(t, [starts[i] - 1.0, ends[i] - starts[i] + 2.0]);
      c.img.style.transform = `scale(${lerp(1.1, 1.0, E.outCubic(k)).toFixed(4)})`;
      setText(c.px, countDown(c.p.price, starts[i] + 0.5, t));
      const dot = $$('.dot')[i];
      const active = t >= starts[i] - 1.0 && t < ends[i];
      dot.style.width = (active ? 64 : 16) + 'px';
      $('i', dot).style.width = (100 * prog(t, [starts[i], ends[i] - starts[i]])).toFixed(1) + '%';
      $('i', dot).style.opacity = active ? 1 : 0;
    });

    // Full-bleed image: slow parallax zoom while the page glides over it.
    const kf = prog(t, [17.4, 6.0]);
    $('#full-img').style.transform = `translateY(${lerp(-120, 120, kf).toFixed(2)}px) scale(${lerp(1.2, 1.06, E.inOutSine(kf)).toFixed(4)})`;
    const sun = byId['14'];
    setText($('#full-px'), countDown(sun.price, FULL.count, t));
    setText($('#full-old'), fmt(sun.price, false));

    // Spa: sauna rises in its card, then the price drops.
    const ks = E.outQuart(prog(t, [24.6, 2.2]));
    $('#spa-img').style.transform = `translateY(${(110 * (1 - ks)).toFixed(2)}px)`;
    $('#spa-img').style.opacity = ks.toFixed(3);
    const spa = byId['15'];
    setText($('#spa-old'), fmt(spa.price, false));
    $('#spa-old').style.setProperty('--s', E.outCubic(prog(t, [SPA.strike, 0.5])).toFixed(3));
    setText($('#spa-now'), countDown(spa.price, SPA.count, t));
  }

  async function init() {
    build();
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img').map(img => (img.complete && img.naturalWidth ? null : new Promise(r => { img.onload = img.onerror = r; }))));
    // Measure in the final layout state (everything revealed, page unscrolled).
    seek(TOTAL - 1);
    $('#page').style.transform = 'none';
    $$('.rv').forEach(el => { el.style.transform = 'none'; });
    measure();
    const q = new URLSearchParams(location.search).get('t');
    seek(q ? Math.round(parseFloat(q) * FPS) : 0);
  }
  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
