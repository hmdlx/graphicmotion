// Black Friday Premium – 9:16. A calm product-page scroll in Home Deluxe CI:
// black page, sticky local nav, chrome hero, highlights carousel, stats,
// full-bleed image, a price that counts down, a segmented room switcher.
// Deterministic and frame-addressed: window.COMP.seek(n) sets output frame n.
(() => {
  const FPS = 30;
  const TOTAL = Math.round(31.5 * FPS);    // 945 frames
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
    { id: '17', name: 'Couchtisch AMIRI XXL.' },
    { id: '00', name: 'Hängesessel LOMA.' },
    { id: '02', name: 'Outdoor Whirlpool BEACH.' },
  ];
  const ROOMS = [
    { seg: 'Garten', id: '01', name: 'Garten-Sitzgruppe CANTOS SEDIA' },
    { seg: 'Wohnen', id: '18', name: 'Sitzsack COZY mit Hocker' },
    { seg: 'Carport', id: '13', name: 'Carport MONOS' },
    { seg: 'Terrasse', id: '03', name: 'Terrassenüberdachung SOLIS' },
  ];

  // Timeline, output seconds.
  const CAR = { start: 4.6, slides: [[6.1, 0.65], [7.6, 0.65]], end: 9.0 };
  const ROOM_AT = [22.0, 23.3, 24.6, 25.9];
  const REVEAL = {
    'r-name': 0.2, 'r-tag': 0.45, chrome: 0.9, 'r-glow': 1.3, 'r-prod': 1.4, 'r-shadow': 1.6, 'r-sub': 2.2,
    'r-hl': 3.9, 'r-hl-link': 4.1, 'r-car': 4.3, 'r-ctrl': 4.5,
    'r-up-eb': 9.7, 'r-up-h': 9.9, 'r-up-b': 10.3, 'r-rule': 10.8, 'r-s1': 11.0, 'r-s2': 11.5, 'r-s3': 12.0,
    'full-cap': 15.3,
    'r-spa-eb': 16.55, 'r-spa-h': 16.75, 'r-spa-card': 17.0, 'r-spa-nm': 18.6, 'spa-old': 18.8, 'spa-now': 19.45, 'spa-chip': 20.6,
    'r-ro-eb': 21.1, 'r-ro-h': 21.3, 'r-room': 21.6, 'r-seg': 21.8, 'r-room-cap': 22.0,
    'r-end-h': 27.6, 'r-end-b': 27.9, 'r-end-logo': 28.4, 'r-end-claim': 28.7, 'r-end-cta': 29.0, 'r-end-url': 29.2,
  };
  const SPA = { strike: 19.45, count: [19.5, 1.1] };

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

  let SCROLL = [], cards = [], roomImgs = [], segs = [];

  // Scroll so that an element's top sits `gap` px below the sticky nav.
  const top = id => $('#' + id).getBoundingClientRect().top;
  const at = (id, gap) => top(id) - NAV - gap;

  function build() {
    const track = $('#track');
    for (const h of HIGHLIGHTS) {
      const p = byId[h.id];
      const c = document.createElement('div');
      c.className = 'hcard';
      c.innerHTML = `<img src="source/amb_${h.id}.jpg" alt=""><div class="fade"></div>
        <div class="cap">${h.name}<span>Jetzt <em class="px"></em> statt ${fmt(p.price, false)}.</span></div>`;
      track.append(c);
      cards.push({ el: c, img: $('img', c), px: $('.px', c), p });
    }
    const room = $('#r-room');
    for (const r of ROOMS) {
      const img = document.createElement('img');
      img.src = `source/amb_${r.id}.jpg`;
      room.append(img);
      roomImgs.push(img);
      const s = document.createElement('span');
      s.textContent = r.seg;
      $('#r-seg').append(s);
      segs.push(s);
    }
  }

  function measure() {
    const yHl = at('r-hl', 150);
    const yUp = at('r-up-eb', 150);
    const yFull = at('full', 0);
    const ySpa = at('r-spa-eb', 150);
    const ySpaPrice = at('r-spa-nm', 0) - 760;
    const yRooms = at('r-ro-eb', 150);
    const yEnd = at('r-end-h', 330);
    // [t0, t1, from, to, ease]; between segments the page rests.
    SCROLL = [
      [3.4, 4.6, 0, yHl, 'inOutQuart'],
      [9.0, 10.2, yHl, yUp, 'inOutQuart'],
      [13.6, 15.0, yUp, yFull, 'inOutCubic'],
      [15.0, 16.2, yFull, yFull + 260, 'inOutSine'],
      [16.2, 17.2, yFull + 260, ySpa, 'inOutCubic'],
      [18.3, 19.1, ySpa, ySpaPrice, 'inOutQuart'],
      [21.0, 22.0, ySpaPrice, yRooms, 'inOutQuart'],
      [27.0, 28.1, yRooms, yEnd, 'inOutQuart'],
    ];
    const seg = $('#r-seg');
    const w = (seg.offsetWidth - 16) / ROOMS.length;
    $('#seg-hi').style.width = w + 'px';
    segs.forEach(s => (s._w = w));
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

  // Fade up, the way the sections settle on a product page.
  function reveal(t) {
    for (const [id, t0] of Object.entries(REVEAL)) {
      const el = $('#' + id);
      const k = E.outQuart(prog(t, [t0, 1.0]));
      el.style.opacity = k.toFixed(3);
      el.style.transform = `translateY(${(56 * (1 - k)).toFixed(2)}px)`;
    }
  }

  function seek(n) {
    const t = n / FPS;
    const y = scrollAt(t);
    $('#page').style.transform = `translateY(${(-y).toFixed(2)}px)`;
    $('#lnav').style.top = Math.max(0, GNAV - y).toFixed(2) + 'px';
    reveal(t);

    // Hero: chrome type settles from slightly larger, a sheen runs across, the product rises.
    const kc = E.outQuart(prog(t, [0.9, 1.6]));
    $('#chrome').style.transform = `translateY(${(30 * (1 - kc)).toFixed(2)}px) scale(${lerp(1.14, 1, kc).toFixed(4)})`;
    $('#chrome').style.filter = kc < 1 ? `blur(${(18 * (1 - kc)).toFixed(2)}px)` : 'none';
    const sh = E.inOutSine(prog(t, [1.7, 1.5]));
    $('#chrome .sheen').style.backgroundPosition = `${lerp(100, -10, sh).toFixed(2)}% 0`;
    $('#chrome .sheen').style.opacity = sh > 0 && sh < 1 ? 1 : 0;
    const kp = E.outQuart(prog(t, [1.4, 1.6]));
    $('#r-prod').style.transform = `translateY(${(150 * (1 - kp) - 10 * Math.sin(t * 0.9)).toFixed(2)}px) scale(${lerp(0.94, 1, kp).toFixed(4)})`;

    // Highlights carousel
    let slide = 0;
    CAR.slides.forEach(([s0, d], i) => { slide += E.inOutCubic(prog(t, [s0, d])); });
    $('#track').style.transform = `translateX(${(-slide * (920 + 28)).toFixed(2)}px)`;
    const starts = [CAR.start, ...CAR.slides.map(([s0, d]) => s0 + d)];
    const ends = [...CAR.slides.map(([s0]) => s0), CAR.end];
    cards.forEach((c, i) => {
      const k = prog(t, [starts[i] - 0.4, ends[i] - starts[i] + 1.2]);
      c.img.style.transform = `scale(${lerp(1.1, 1.0, E.outCubic(k)).toFixed(4)})`;
      const kn = prog(t, [starts[i] + 0.2, 1.0]);
      setText(c.px, fmt(kn <= 0 ? c.p.price : lerp(c.p.price, sale(c.p.price), E.outCubic(kn))));
      const dot = $$('.dot')[i];
      const active = t >= starts[i] - 0.65 && t < ends[i];
      dot.style.width = (active ? 64 : 16) + 'px';
      $('i', dot).style.width = (100 * prog(t, [starts[i], ends[i] - starts[i]])).toFixed(1) + '%';
      $('i', dot).style.opacity = active ? 1 : 0;
    });

    // Stats count up
    const cnt = (el, t0, to, f) => setText($(el), f(lerp(0, to, E.outCubic(prog(t, [t0, 1.3])))));
    cnt('#v1', REVEAL['r-s1'] + 0.1, byId['02'].price - sale(byId['02'].price), v => fmt(v));
    cnt('#v2', REVEAL['r-s2'] + 0.1, 25, v => `${Math.round(v)} %`);
    cnt('#v3', REVEAL['r-s3'] + 0.1, byId['15'].price - sale(byId['15'].price), v => fmt(v));

    // Full-bleed image: slow parallax zoom while the page glides over it.
    const kf = prog(t, [12.8, 4.6]);
    $('#full-img').style.transform = `translateY(${lerp(-120, 120, kf).toFixed(2)}px) scale(${lerp(1.2, 1.08, E.inOutSine(kf)).toFixed(4)})`;
    const sun = byId['14'];
    const kfp = prog(t, [REVEAL['full-cap'] + 0.3, 1.0]);
    setText($('#full-px'), fmt(kfp <= 0 ? sun.price : lerp(sun.price, sale(sun.price), E.outCubic(kfp))));
    setText($('#full-old'), fmt(sun.price, false));

    // Spa: sauna rises in its card, then the price drops.
    const ks = E.outQuart(prog(t, [17.3, 1.6]));
    $('#spa-img').style.transform = `translateY(${(120 * (1 - ks)).toFixed(2)}px)`;
    $('#spa-img').style.opacity = ks.toFixed(3);
    const spa = byId['15'];
    setText($('#spa-old'), fmt(spa.price, false));
    $('#spa-old').style.setProperty('--s', E.outCubic(prog(t, [SPA.strike, 0.35])).toFixed(3));
    const kn = prog(t, SPA.count);
    setText($('#spa-now'), fmt(kn <= 0 ? spa.price : lerp(spa.price, sale(spa.price), E.outCubic(kn))));
    setText($('#spa-chip'), `Du sparst ${fmt(spa.price - sale(spa.price))}`);

    // Rooms: segmented control switches, image crossfades, price counts.
    let idx = 0;
    ROOM_AT.forEach((t0, i) => { if (t >= t0) idx = i; });
    let pos = 0;
    ROOM_AT.slice(1).forEach((t0, i) => { pos += E.inOutCubic(prog(t, [t0 - 0.05, 0.45])); });
    $('#seg-hi').style.transform = `translateX(${(pos * segs[0]._w).toFixed(2)}px)`;
    segs.forEach((s, i) => { s.style.color = Math.abs(pos - i) < 0.5 ? '#0e2234' : 'rgba(255,255,255,.85)'; s.style.fontWeight = Math.abs(pos - i) < 0.5 ? 600 : 500; });
    roomImgs.forEach((img, i) => {
      const kin = i === 0 ? 1 : E.outCubic(prog(t, [ROOM_AT[i], 0.6]));
      const kout = i < ROOM_AT.length - 1 ? prog(t, [ROOM_AT[i + 1] + 0.6, 0.01]) : 0;
      img.style.opacity = (kin * (1 - kout)).toFixed(3);
      img.style.transform = `scale(${lerp(1.08, 1, E.outCubic(prog(t, [ROOM_AT[i], 1.6]))).toFixed(4)})`;
      img.style.zIndex = i;
    });
    const r = ROOMS[idx], rp = byId[r.id];
    setText($('#room-nm'), r.name);
    const kr = prog(t, [ROOM_AT[idx] + 0.15, 0.9]);
    setText($('#room-now'), fmt(kr <= 0 ? rp.price : lerp(rp.price, sale(rp.price), E.outCubic(kr))));
    setText($('#room-old'), fmt(rp.price, false));
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
