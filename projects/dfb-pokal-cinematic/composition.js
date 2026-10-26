// DFB-Pokal Gewinnspiel – cinematic cut, 3:4. Deterministic, frame-addressed:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// Every cue is locked to the voice-over (audio/vo_words.json, VO starts at 0.8 s).
(() => {
  const FPS = 30;
  const W = 1080, H = 1440;
  const END = 37.0;
  const TOTAL = Math.round(END * FPS);
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/dfb-pokal-cinematic/plates';
  const PLATE_FPS = 24;
  const PLATE_FRAMES = { stadion: 121, pokal: 121 };

  // VO cues, output seconds.
  const T = {
    flut: 0.80, pokal: 2.55,
    sc: 4.60, gegen: 6.09, vfb: 6.53, stutt: 7.05,
    wir: 8.79, vier: 9.62, zwei: 10.23, tickets: 10.64, dfb: 11.47,
    mittwoch: 13.62, datum: 14.48, anstoss: 16.62, achtzehn: 17.58, uhr: 18.10,
    inder: 18.85, home: 19.17, arena: 20.03,
    like: 21.30, beitrag: 21.71, markiere: 22.38, freund: 22.93,
    teilnahme: 25.36, d27: 26.42,
    logo: 31.56, slogan: 32.81,
  };
  const MSG = [ // "Mit etwas Glück hörst du noch am selben Tag von uns." word cues
    ['Mit', 28.31], ['etwas', 28.46], ['Glück', 28.72], ['hörst', 29.08], ['du', 29.36], ['noch', 29.47],
    ['am', 29.66], ['selben', 29.80], ['Tag', 30.15], ['von', 30.43], ['uns.', 30.60],
  ];
  // Scenes [in, out).
  const S = {
    a: [0, 2.30], b: [2.30, 4.45], c: [4.45, 8.60], d: [8.60, 13.40], e: [13.40, 18.70],
    f: [18.70, 21.10], g: [21.10, 25.20], h: [25.20, 31.45], i: [31.45, END + 1],
  };
  const IMPACTS = [ // [time, shake px]
    [T.flut, 12], [T.pokal, 9], [T.sc, 12], [T.gegen, 20], [T.vfb, 14], [T.wir, 6], [T.vier, 22], [T.zwei, 18],
    [T.tickets, 14], [T.mittwoch, 8], [T.datum, 16], [T.achtzehn, 16], [T.home, 12], [T.like, 9], [T.markiere, 9],
    [T.d27, 18], [T.logo, 22],
  ];
  const FLASHES = [ // [time, peak, decay s]
    [T.flut, 0.75, 0.3], [S.b[1], 0.95, 0.32], [S.c[1], 0.45, 0.2], [T.vier, 0.25, 0.15], [S.d[1], 0.5, 0.22],
    [S.e[1], 0.85, 0.3], [S.g[1], 0.45, 0.22], [T.d27, 0.22, 0.15], [T.logo - 0.04, 1.0, 0.5],
  ];
  const STREAKS = [T.flut, T.pokal, T.gegen, T.vier, T.tickets, T.datum, T.achtzehn, S.e[1], T.home, T.d27, T.logo];

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const P = (t, a, d) => clamp((t - a) / d);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
    outQuint: k => 1 - Math.pow(1 - k, 5),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutQuint: k => (k < 0.5 ? 16 * Math.pow(k, 5) : 1 - Math.pow(-2 * k + 2, 5) / 2),
  };
  const tf = (el, s) => { el.style.transform = s; };
  const show = (el, on) => { el.style.visibility = on ? 'visible' : 'hidden'; };
  const on = (id, t) => t >= S[id][0] && t < S[id][1];

  // ---------- motion blur filters (directional, per element) ----------
  const defs = $('#filters');
  const blurs = new Map();
  function mblur(el, bx, by = 0) {
    let f = blurs.get(el);
    if (!f) {
      const id = `mb${blurs.size}`;
      defs.insertAdjacentHTML('beforeend', `<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="0 0"/></filter>`);
      f = { id, g: $(`#${id} feGaussianBlur`) };
      blurs.set(el, f);
    }
    if (bx < 0.3 && by < 0.3) { el.style.filter = ''; return; }
    f.g.setAttribute('stdDeviation', `${bx.toFixed(2)} ${by.toFixed(2)}`);
    el.style.filter = `url(#${f.id})`;
  }

  // ---------- animation helpers ----------
  // Horizontal slam: flies in from dx, motion-blurred by its speed; optional slam-out.
  function slamX(el, t, tin, { dx = 1100, dur = 0.34, base = '', tout = null, dxOut = -1300, durOut = 0.16 } = {}) {
    const pos = tt => {
      const k = E.outExpo(P(tt, tin, dur));
      const o = tout == null ? 0 : E.inExpo(P(tt, tout, durOut));
      return dx * (1 - k) + dxOut * o;
    };
    const x = pos(t);
    const v = (pos(t + 1 / 120) - pos(t - 1 / 120)) * 60;   // px per second
    const visible = t >= tin && (tout == null || t < tout + durOut);
    show(el, visible);
    tf(el, `translateX(${x}px) ${base}`);
    mblur(el, Math.min(60, Math.abs(v) / 90));
  }
  // Scale slam: drops from big onto its spot.
  function slamS(el, t, tin, { from = 2.2, dur = 0.26, base = '', blur = 14, tout = null, durOut = 0.16 } = {}) {
    const k = E.outCubic(P(t, tin, dur));
    const o = tout == null ? 0 : E.inExpo(P(t, tout, durOut));
    const visible = t >= tin && o < 1;
    show(el, visible);
    tf(el, `${base} scale(${lerp(from, 1, k) * (1 + 2 * o)})`);
    el.style.opacity = (1 - o).toFixed(3);
    const b = blur * (1 - k) + 20 * o;
    mblur(el, b, b);
  }
  function rise(span, t, tin, tout = null, dur = 0.6) {
    const k = E.outExpo(P(t, tin, dur));
    const o = tout == null ? 0 : E.inCubic(P(t, tout, 0.25));
    tf(span, `translateY(${((1 - k) - o) * 110}%)`);
  }
  function riseAll(root, t, tin, tout = null, gap = 0.06) {
    $$('.ln > span', root).forEach((s, i) => rise(s, t, tin + i * gap, tout));
  }
  function wipeIn(el, t, tin, dur = 0.4, tout = null) {
    const a = E.outExpo(P(t, tin, dur));
    const b = tout == null ? 0 : E.inExpo(P(t, tout, 0.2));
    show(el, a > 0 && b < 1);
    el.style.clipPath = `inset(-30px ${(1 - a) * 100}% -30px ${b * 100}%)`;
  }

  // ---------- plates ----------
  const plateImgs = [];
  function plate(img, name, srcT) {
    const n = clamp(Math.round(srcT * PLATE_FPS), 0, PLATE_FRAMES[name] - 1);
    const src = `${PLATE_DIR}/${name}/f${String(n).padStart(4, '0')}.jpg`;
    if (img.dataset.src !== src) { img.dataset.src = src; img.src = src; }
    plateImgs.push(img);
  }

  // ---------- builders ----------
  function extrude(el, n, step, make) {
    for (let i = n - 1; i >= 0; i--) {
      const l = make();
      const k = i / Math.max(1, n - 1);
      const c = i === 0 ? [255, 255, 255] : [lerp(190, 30, k), lerp(202, 58, k), lerp(214, 84, k)];
      if (l.dataset.mask) l.style.backgroundColor = `rgb(${c.map(Math.round)})`;
      else l.style.color = `rgb(${c.map(Math.round)})`;
      l.style.transform = `translateZ(${-i * step}px)`;
      el.appendChild(l);
    }
  }
  function slab(el, w, h, d) {
    Object.assign(el.style, { width: `${w}px`, height: `${h}px` });
    const front = $('.front', el);
    Object.assign(front.style, { width: `${w}px`, height: `${h}px`, transform: `translateZ(${d / 2}px)` });
    const back = $('.back', el);
    Object.assign(back.style, { width: `${w}px`, height: `${h}px`, transform: `rotateY(180deg) translateZ(${d / 2}px)` });
    for (const [fw, fh, c, tr] of [
      [w, d, '#dfe4e9', `rotateX(90deg) translateZ(${h / 2}px)`], [w, d, '#c4cdd5', `rotateX(-90deg) translateZ(${h / 2}px)`],
      [d, h, '#c4cdd5', `rotateY(-90deg) translateZ(${w / 2}px)`], [d, h, '#dfe4e9', `rotateY(90deg) translateZ(${w / 2}px)`]]) {
      const f = document.createElement('div');
      f.className = 'face';
      Object.assign(f.style, { width: `${fw}px`, height: `${fh}px`, left: `${(w - fw) / 2}px`, top: `${(h - fh) / 2}px`, background: c, transform: tr });
      el.appendChild(f);
    }
  }
  // Deterministic PRNG.
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }

  const sc = Object.fromEntries(Object.keys(S).map(id => [id, $(`#${id}`)]));

  // 4×2 extruded numerals
  for (const id of ['#d-4', '#d-x2']) {
    const el = $(id);
    extrude(el, 26, 3.2, () => { const d = document.createElement('div'); d.textContent = el.dataset.text; return d; });
  }
  // Tickets that fly past the camera.
  const TIX = [...Array(6)].map((_, i) => {
    const el = document.createElement('div');
    el.className = 'slab ticket';
    el.innerHTML = '<div class="face front"></div><div class="face back"></div>';
    $('.front', el).appendChild($('#ticket-front').content.cloneNode(true));
    $('#d-tix').appendChild(el);
    slab(el, 680, 280, 10);
    const r = rng(40 + i);
    return { el, t0: T.tickets + 0.05 + i * 0.28, x: (r() - 0.5) * 900, y: (r() - 0.5) * 900 + 120, rx: (r() - 0.5) * 70, ry: (r() - 0.5) * 90, rz: (r() - 0.5) * 60, spin: (r() - 0.5) * 220 };
  });
  // Endcard logo, extruded from the white SVG.
  const logoMask = `url("data:image/svg+xml;utf8,${encodeURIComponent($('#logo-svg').innerHTML.trim())}")`;
  extrude($('#i-logo'), 16, 2.6, () => {
    const d = document.createElement('div');
    d.dataset.mask = '1';
    d.style.webkitMask = `${logoMask} center / 100% 100% no-repeat`;
    return d;
  });
  // H message words.
  const msgSpans = MSG.map(([w]) => {
    const s = document.createElement('span');
    s.textContent = w;
    if (w === 'Glück') Object.assign(s.style, { background: '#fff', color: '#0e2234', padding: '0 .14em' });
    $('#h-msg').appendChild(s);
    return s;
  });
  // Ticker.
  const tickerTxt = ['Gewinnspiel', '4×2 Tickets', 'SC Paderborn 07 – VfB Stuttgart', 'DFB-Pokal', 'Mi 28.10.2026', '18:00 Uhr', 'Home Deluxe Arena', 'Teilnahme bis 27.10.2026'];
  $('#ticker .run').innerHTML = [0, 1, 2].map(() => tickerTxt.map(s => `<span>${s}</span><b></b>`).join('')).join('');
  // Speed lines.
  const lineR = rng(9);
  const LINES = [...Array(26)].map(() => {
    const d = document.createElement('div');
    d.className = 'sl';
    $('#lines').appendChild(d);
    return { el: d, y: lineR() * 1440, w: 200 + lineR() * 600, speed: 2500 + lineR() * 3500, ph: lineR() * 3000, a: 0.25 + lineR() * 0.6 };
  });
  // Slash wipe panels.
  const SLASH = ['#0e2234', '#ffffff', '#1c3a54'].map((c, i) => {
    const d = document.createElement('div');
    d.className = 'slash';
    d.style.background = c;
    d.style.width = i === 1 ? '60px' : '1900px';
    $('#slashes').appendChild(d);
    return d;
  });
  const eye = document.createElement('div');
  Object.assign(eye.style, { position: 'absolute', left: '0', top: '719px', width: '1080px', height: '2px', background: '#fff', transformOrigin: '50% 50%' });
  $('#bars').appendChild(eye);

  // Grain.
  const gctx = $('#grain').getContext('2d');
  const gimg = gctx.createImageData(540, 720);
  function grain(n) {
    const r = rng(1000 + Math.floor(n));
    const d = gimg.data;
    for (let i = 0; i < d.length; i += 4) { const v = (r() * 255) | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    gctx.putImageData(gimg, 0, 0);
  }

  // ---------- global FX ----------
  function camera(t) {
    let x = 0, y = 0, r = 0;
    for (const [ti, a] of IMPACTS) {
      if (t < ti) continue;
      const k = Math.exp(-(t - ti) / 0.16) * a;
      if (k < 0.05) continue;
      const u = (t - ti) * 60;
      x += k * Math.sin(u * 1.7 + ti);
      y += k * Math.cos(u * 2.3 + ti * 2);
      r += k * 0.025 * Math.sin(u * 1.3 + ti * 3);
    }
    tf($('#cam'), `translate(${x}px, ${y}px) rotate(${r}deg)`);
    let f = 0;
    for (const [ti, p, d] of FLASHES) {
      if (t >= ti - 1 / 30) f = Math.max(f, p * Math.exp(-Math.max(0, t - ti) / (d / 3)) * (t < ti ? 0.5 : 1));
    }
    $('#flash').style.opacity = f.toFixed(3);
    const st = $('#streak');
    let best = null;
    for (const ti of STREAKS) if (t >= ti && t - ti < 0.6) best = ti;
    if (best == null) show(st, false);
    else {
      const k = (t - best) / 0.6;
      show(st, true);
      const y = 300 + ((best * 977) % 800);
      st.style.top = `${y}px`;
      st.style.opacity = (Math.pow(1 - k, 2) * 0.9).toFixed(3);
      tf(st, `scaleX(${0.4 + 1.4 * E.outCubic(k)}) scaleY(${0.35 * (1 - k) + 0.05})`);
    }
  }
  function speedLines(t, amount, dir = -1) {
    LINES.forEach(l => {
      if (amount <= 0) { show(l.el, false); return; }
      show(l.el, true);
      const span = 1080 + l.w + 400;
      const x = dir < 0 ? 1080 - ((t * l.speed + l.ph) % span) : ((t * l.speed + l.ph) % span) - l.w;
      Object.assign(l.el.style, { left: `${x}px`, top: `${l.y}px`, width: `${l.w}px`, opacity: (l.a * amount).toFixed(3) });
      tf(l.el, 'skewY(-6deg)');
    });
  }
  // Slash wipe: panels sweep across, fully covering at tc.
  function slashes(t) {
    const list = [[S.a[1], -1], [S.f[1], 1]];
    let act = null;
    for (const [tc, dir] of list) if (t > tc - 0.2 && t < tc + 0.22) act = [tc, dir];
    if (!act) { SLASH.forEach(s => show(s, false)); return; }
    const [tc, dir] = act;
    SLASH.forEach((s, i) => {
      const k = E.inOutCubic(P(t, tc - 0.2 + i * 0.025, 0.42));
      const x = dir < 0 ? lerp(1300, -2300, k) : lerp(-2300, 1300, k);
      show(s, true);
      s.style.left = `${x + (i === 1 ? (dir < 0 ? -40 : 1900) : 0)}px`;
      tf(s, 'skewX(-14deg)');
    });
  }
  // Letterbox "blink": opens the film at the start, closes/reopens into the endcard.
  function bars(t) {
    const [top, bot] = $$('#bars > div');
    let o;   // 0 closed .. 1 open
    if (t < S.h[1] - 0.2) o = E.outExpo(P(t, T.flut, 0.7));
    else if (t < S.h[1]) o = 1 - E.inCubic(P(t, S.h[1] - 0.18, 0.18));
    else o = E.outExpo(P(t, S.h[1] + 0.05, 0.6));
    tf(top, `translateY(${-720 * o}px)`);
    tf(bot, `translateY(${720 * o}px)`);
    show(top, o < 1); show(bot, o < 1);
    const lineIn = t < T.flut ? E.outCubic(P(t, 0.15, 0.6)) : 1 - P(t, T.flut, 0.12);
    const lineB = t >= S.h[1] - 0.12 && t < S.h[1] + 0.1;
    show(eye, (t < T.flut + 0.12 && lineIn > 0) || lineB);
    tf(eye, `scaleX(${lineB ? 1 : lineIn}) scaleY(${lineB ? 2 : 1 + 2 * lineIn})`);
    eye.style.boxShadow = '0 0 30px 6px rgba(190,220,255,.8)';
  }
  function hud(t) {
    const a = S.c[0], b = S.h[1] - 0.15;
    wipeIn($('#logo'), t, a + 0.15, 0.4, b);
    wipeIn($('#badge'), t, a + 0.25, 0.4, b);
    const tk = $('#ticker');
    const up = E.outExpo(P(t, a + 0.2, 0.5)) * (1 - E.inCubic(P(t, b - 0.1, 0.25)));
    show(tk, up > 0);
    tf(tk, `translateY(${(1 - up) * 80}px)`);
    const run = $('.run', tk);
    const w = run.scrollWidth / 3;
    tf(run, `translateX(${-((t * 140) % w)}px)`);
  }

  // ---------- scenes ----------
  function A(t) {
    plate($('#a-plate'), 'stadion', 0.25 + t * 0.95);
    tf($('#a-plate'), `scale(${1.1 - 0.06 * P(t, 0, 2.3)})`);
    riseAll($('#a-kick'), t, T.flut + 0.15, 2.05);
    const w = $('#a-word');
    slamS(w, t, T.flut, { from: 1.7, dur: 0.3, base: 'skewX(-9deg)', tout: 2.1 });
    w.style.letterSpacing = `${lerp(0.12, -0.035, E.outExpo(P(t, T.flut, 0.9)))}em`;
    tf($('#a-rule'), `scaleX(${E.outExpo(P(t, T.flut + 0.2, 0.7)) * (1 - E.inExpo(P(t, 2.05, 0.2)))})`);
  }
  function B(t) {
    plate($('#b-plate'), 'pokal', (t - S.b[0]) * 0.8);
    const z = E.inExpo(P(t, S.b[1] - 0.16, 0.16));
    tf($('#b'), `scale(${1 + 0.5 * z})`);
    mblur($('#b'), 14 * z, 14 * z);
    tf($('#b-plate'), `scale(${1.02 + 0.1 * P(t, S.b[0], 2.15)})`);
    slamX($('#b-l1'), t, T.pokal, { dx: -1100, base: 'skewX(-9deg)' });
    slamX($('#b-l2'), t, T.pokal + 0.2, { dx: 1100, base: 'skewX(-9deg)' });
  }
  function C(t) {
    const k0 = E.outExpo(P(t, S.c[0], 0.7));
    tf($('#c'), `scale(${1.25 - 0.25 * k0 + 0.04 * P(t, T.stutt, 1.6)})`);
    mblur($('#c'), 0);
    tf($('#c-bg'), `translate(${-760 + 160 * P(t, S.c[0], 4.2)}px, -110px)`);
    speedLines(t, 1 - P(t, S.c[1] - 0.1, 0.1));
    riseAll($('#c-kick'), t, S.c[0] + 0.25, S.c[1] - 0.2);
    const out = S.c[1] - 0.18;
    slamX($('#vs-l'), t, T.sc, { dx: -1100, tout: out, dxOut: -1300 });
    slamX($('#vs-r'), t, T.vfb, { dx: 1100, tout: out, dxOut: 1300 });
    $$('.vs-panel .name').forEach((n, i) => { n.style.opacity = P(t, (i ? T.vfb : T.sc) + 0.25, 0.2); });
    slamS($('#vs'), t, T.gegen, { from: 3.2, dur: 0.24, base: 'skewX(-9deg)', tout: out, blur: 20 });
    const rk = P(t, T.gegen, 0.55);
    const ring = $('#vs-ring div');
    show(ring, rk > 0 && rk < 1);
    tf(ring, `rotate(45deg) scale(${0.4 + 5 * E.outCubic(rk)})`);
    ring.style.opacity = (1 - rk).toFixed(3);
  }
  function D(t) {
    plate($('#d-plate'), 'pokal', 2.15 + (t - S.d[0]) * 0.6);
    tf($('#d-rays'), `rotate(${t * 6}deg)`);
    const zin = 1 - E.outExpo(P(t, S.d[0], 0.5));
    const zout = E.inExpo(P(t, S.d[1] - 0.14, 0.14));
    tf($('#d'), `scale(${1 + 0.25 * zin + 1.2 * zout})`);
    mblur($('#d'), 18 * zout, 18 * zout);
    speedLines(t, 0.7 * (1 - zout), 1);
    riseAll($('#d-kick'), t, T.wir);
    for (const [id, tin, from] of [['#d-4', T.vier, -40], ['#d-x2', T.zwei, 40]]) {
      const el = $(id);
      const k = E.outExpo(P(t, tin, 0.42));
      const drift = Math.sin((t - tin) * 1.4);
      show(el, t >= tin);
      tf(el, `translate3d(0, ${300 + 40 * (1 - k)}px, ${-2200 * (1 - k)}px) rotateY(${from * (1 - k) + 6 * drift - (from > 0 ? 6 : -6)}deg) rotateX(${8 + 30 * (1 - k)}deg)`);
    }
    slamS($('#d-tickets .blk'), t, T.tickets, { from: 2.4, dur: 0.24, base: 'skewX(-9deg)' });
    rise($('#d-tickets .ln > span'), t, T.tickets - 1);
    rise($('#d-sub .ln > span'), t, T.dfb);
    TIX.forEach(tk => {
      const k = (t - tk.t0) / 1.5;
      if (k <= 0 || k >= 1) { show(tk.el, false); return; }
      const z = lerp(-2600, 1350, Math.pow(k, 1.6));
      show(tk.el, true);
      tf(tk.el, `translate3d(${200 + tk.x}px, ${580 + tk.y}px, ${z}px) rotateX(${tk.rx + tk.spin * k}deg) rotateY(${tk.ry + tk.spin * 0.6 * k}deg) rotateZ(${tk.rz}deg)`);
    });
  }
  function E_(t) {
    plate($('#e-plate'), 'stadion', 1.7 + (t - S.e[0]) * 0.6);
    const zin = 1 - E.outExpo(P(t, S.e[0], 0.45));
    tf($('#e'), `scale(${1 + 0.3 * zin})`);
    mblur($('#e'), 16 * zin, 16 * zin);
    tf($('#e-plate'), `scale(${1.04 + 0.05 * P(t, S.e[0], 5.3)})`);
    riseAll($('#e-date .kick'), t, T.mittwoch);
    slamS($('#e-date-num'), t, T.datum, { from: 2.0, base: 'skewX(-9deg)' });
    tf($('#e-date .e-bar'), `scaleX(${E.outExpo(P(t, T.datum + 0.1, 0.7))})`);
    const tb = $('#e-time');
    show(tb, t >= T.anstoss);
    riseAll($('.kick', tb), t, T.anstoss);
    const num = $('#e-time-num');
    slamS(num, t, T.anstoss + 0.2, { from: 1.25, dur: 0.3, base: 'skewX(-9deg)', blur: 6 });
    $$('.digit', num).forEach((d, i) => {
      const land = T.achtzehn - 0.2 + i * 0.065;
      const target = d.dataset.to;
      d.textContent = t >= land ? target : String((Math.floor(t * 30) * 7 + i * 3) % 10);
      d.style.opacity = t >= land ? 1 : 0.55;
    });
    const uhr = $('#e-uhr');
    uhr.style.opacity = P(t, T.uhr, 0.12);
    tf($('.e-bar', tb), `scaleX(${E.outExpo(P(t, T.achtzehn + 0.1, 0.7))})`);
  }
  function F(t) {
    const k = P(t, S.f[0], 2.4);
    const kin = E.outExpo(P(t, S.f[0], 0.6));
    tf($('#f-bg'), `translate(${-680 + 60 * k}px, -81px) scale(${1.35 - 0.2 * kin + 0.08 * k}) rotate(${-3 + 3 * kin}deg)`);
    riseAll($('#f-kick'), t, T.inder);
    const lg = $('#f-logo');
    slamS(lg, t, T.home, { from: 1.35, dur: 0.28, blur: 10 });
    const sh = $('#f-shine');
    const ks = P(t, T.home + 0.2, 0.7);
    show(sh, ks > 0 && ks < 1);
    sh.style.left = `${lerp(-200, 1000, E.inOutCubic(ks))}px`;
    const ar = $('#f-arena');
    show(ar, t >= T.arena);
    ar.style.letterSpacing = `${lerp(0.7, 0.14, E.outExpo(P(t, T.arena, 0.8)))}em`;
    ar.style.opacity = P(t, T.arena, 0.15);
    mblur(ar, 12 * (1 - E.outExpo(P(t, T.arena, 0.4))), 0);
  }
  function G(t) {
    const kin = E.outExpo(P(t, S.g[0], 0.7));
    const zout = E.inExpo(P(t, S.g[1] - 0.14, 0.14));
    tf($('#g'), `scale(${1 + 1.1 * zout})`);
    mblur($('#g'), 18 * zout, 18 * zout);
    tf($('#g-bg'), `scale(${1.3 - 0.3 * kin + 0.1 * P(t, S.g[0], 4.1)}) translateY(${-30 * P(t, S.g[0], 4.1)}px)`);
    riseAll($('#g-kick'), t, S.g[0] + 0.1);
    slamX($('#g-c1'), t, T.like, { dx: -1150 });
    slamX($('#g-c2'), t, T.markiere, { dx: 1150 });
    const kh = P(t, T.beitrag, 0.45);
    const heart = $('#g-heart');
    heart.setAttribute('fill', kh > 0.15 ? '#fff' : 'none');
    heart.setAttribute('transform', `translate(42 42) scale(${1 + 0.3 * Math.sin(Math.PI * kh)}) translate(-42 -42)`);
    const at = $('#g-at');
    at.setAttribute('stroke-dasharray', 200);
    at.setAttribute('stroke-dashoffset', 200 * (1 - E.outCubic(P(t, T.markiere + 0.15, 0.7))));
    $('#g-sub2').style.opacity = P(t, T.freund, 0.2);
  }
  function H_(t) {
    const zin = 1 - E.outExpo(P(t, S.h[0], 0.45));
    tf($('#h'), `scale(${1 + 0.3 * zin})`);
    mblur($('#h'), 16 * zin, 16 * zin);
    tf($('#h-bg'), `translate(${-710 - 100 * P(t, S.h[0], 6)}px, -107px)`);
    const fl = $('#h-floor');
    tf(fl, 'translate3d(0, 1150px, 900px) rotateX(-90deg)');
    fl.style.backgroundPosition = `0 ${(-t * 260) % 160}px`;
    speedLines(t, 0.5);
    riseAll($('#h-kick'), t, T.teilnahme);
    slamS($('#h-date'), t, T.d27, { from: 2.2, base: 'skewX(-9deg)' });
    rise($('#h-year .ln > span'), t, T.d27 + 0.25);
    tf($('#h-bar i'), `scaleX(${E.outExpo(P(t, T.d27 + 0.3, 1.0))})`);
    show($('#h-bar'), t >= T.d27 + 0.25);
    msgSpans.forEach((s, i) => {
      const k = E.outExpo(P(t, MSG[i][1] - 0.04, 0.35));
      s.style.opacity = k > 0 ? 1 : 0;
      tf(s, `translateY(${(1 - k) * 40}px)`);
      mblur(s, 0, 10 * (1 - k));
    });
    // Paper plane with dashed trail.
    const kp = P(t, MSG[0][1] - 0.1, 1.6);
    const path = tt => [lerp(-120, 1180, tt), 1300 - 380 * tt - 160 * Math.sin(Math.PI * tt)];
    const pl = $('#h-plane');
    show(pl, kp > 0 && kp < 1);
    const [px, py] = path(E.inOutCubic(kp));
    const [qx, qy] = path(E.inOutCubic(Math.min(1, kp + 0.01)));
    const ang = Math.atan2(qy - py, qx - px) * 180 / Math.PI + 45;
    tf(pl, `translate(${px - 55}px, ${py - 55}px) rotate(${ang}deg)`);
    const pts = [];
    for (let i = 0; i <= 40; i++) { const [x, y] = path(E.inOutCubic(kp * i / 40)); pts.push(`${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`); }
    $('#h-trail-path').setAttribute('d', kp > 0 ? pts.join(' ') : '');
  }
  function I(t) {
    tf($('#i-rays'), `rotate(${t * 4}deg)`);
    const fl = $('#i-floor');
    tf(fl, 'translate3d(0, 1240px, 900px) rotateX(-90deg)');
    fl.style.backgroundPosition = `0 ${(-t * 60) % 160}px`;
    const k = E.outExpo(P(t, T.logo, 0.9));
    const drift = Math.sin((t - T.logo) * 0.9);
    tf($('#i-logo'), `translate3d(0, ${40 * (1 - k)}px, ${-1600 * (1 - k)}px) rotateX(${lerp(70, 8, k) + 2 * drift}deg) rotateY(${-4 * drift}deg)`);
    show($('#i-logo'), t >= T.logo - 0.02);
    rise($('#i-slogan .ln > span'), t, T.slogan);
    slamS($('#i-big'), t, T.slogan + 0.55, { from: 1.8, dur: 0.3 });
    const blk = $('#i-info .blk');
    wipeIn(blk, t, T.slogan + 1.05, 0.5);
    rise($('.ln > span', blk), t, T.slogan + 1.15);
    rise($('#i-handle .ln > span'), t, T.slogan + 1.3);
    tf($('#i-handle i'), `scaleX(${E.outExpo(P(t, T.slogan + 1.45, 0.8))})`);
    $('#i-legal').style.opacity = E.outCubic(P(t, T.slogan + 1.6, 0.8));
  }
  const SCENE_FN = { a: A, b: B, c: C, d: D, e: E_, f: F, g: G, h: H_, i: I };

  async function seek(n) {
    const t = n / FPS;
    plateImgs.length = 0;
    for (const id of Object.keys(S)) {
      const live = on(id, t);
      sc[id].style.display = live ? 'block' : 'none';
      if (live) SCENE_FN[id](t);
    }
    if (!on('c', t) && !on('d', t) && !on('h', t)) speedLines(t, 0);
    camera(t);
    slashes(t);
    bars(t);
    hud(t);
    grain(n);
    await Promise.all(plateImgs.map(img => img.decode().catch(() => {})));
  }

  const ready = (async () => {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img').filter(i => i.getAttribute('src')).map(i => i.decode().catch(() => {})));
    const q = params.get('t');
    await seek(q ? parseFloat(q) * FPS : 0);
  })();

  window.COMP = { FPS, TOTAL, W, H, seek, ready };
})();
