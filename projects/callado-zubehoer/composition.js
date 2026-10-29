// CALLADO Zubehör – Intro 16:9. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
//
// The intro names the four accessories up front and then runs straight into the film:
// tile 01 opens up to full frame and lands on source frame JOIN − 1, the finished film
// continues the source at JOIN (scripts/join_intro.sh, see package.json).
(() => {
  const FPS = 30;
  const W = 1920, H = 1080;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/callado-zubehoer/plates';

  const TOTAL = 170;             // 5.67 s
  const JOIN = 160;              // first source frame after the intro – keep in sync with package.json

  // Tile grid, stage px.
  const TW = 390, TH = 330, TOP = 420;
  const XS = [150, 560, 970, 1380];

  // Graphics timeline, output frames.
  const T = {
    fade: 12,                    // up from black
    logo: 4,
    kicker: 10,
    title: 15,
    tiles: [34, 40, 46, 52],     // tile reveal; its label follows
    labelsOut: 126,              // + 2 per tile
    titleOut: 129,
    tilesOut: 132,               // tiles 02–04, + 3 per tile
    open: [140, TOTAL - 1],      // tile 01 → full frame
  };

  // Footage per tile. `src` is the source frame range, `at` the output frame on which
  // its first frame plays (held before, last frame held after). Tiles 02–04 run in real
  // time; tile 01 is slowed down (blended frames) so it lands on JOIN − 1 at the end of
  // the opening. `cw` is the crop width in source px, `path` the crop centre keyed by
  // source frame – the crops stay clear of the film's own titles and logo. Tile 01 uses
  // logo-free plates (c%04d.jpg) because it opens up to full frame under the logo matte.
  const TILES = [
    { src: [56, JOIN - 1], at: T.tiles[0], cw: 900, clean: true,                     // 01 CALLUX STRIPE
      path: [[56, 790, 540], [120, 810, 540], [159, 890, 540]] },
    { src: [272, 366], at: 46, cw: 760,                                               // 02 CALLUX COVER
      path: [[272, 1150, 334], [312, 1180, 334], [332, 1185, 334], [344, 1150, 334], [352, 1092, 334], [360, 1031, 334], [366, 985, 334]] },
    { src: [506, 576], at: 76, cw: 700,                                               // 03 CALLANUT
      path: [[506, 1560, 600], [520, 1500, 660], [532, 1440, 700], [548, 1360, 640], [568, 1320, 600], [580, 1300, 600]] },
    { src: [628, 716], at: 52, cw: 740,                                               // 04 Schrägelement
      path: [[628, 1110, 410], [648, 1090, 410], [676, 1020, 410], [708, 950, 410], [716, 935, 410]] },
  ];
  TILES[0].speed = (TILES[0].src[1] - TILES[0].src[0]) / (T.open[1] - TILES[0].at);

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (n, start, dur) => clamp((n - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };

  // Masked line: rises in from below, leaves upwards.
  function rise(span, n, tin, tout = null, din = 20, dout = 11) {
    const a = E.outExpo(prog(n, tin, din));
    const b = tout == null ? 0 : E.inCubic(prog(n, tout, dout));
    span.style.transform = `translateY(${((1 - a) * 108 - b * 108).toFixed(2)}%)`;
  }
  // Kicker rule: draws left → right, retracts to the right.
  function rule(i, n, tin, tout = null) {
    const a = E.outExpo(prog(n, tin, 18));
    const b = tout == null ? 0 : E.inCubic(prog(n, tout, 10));
    i.style.transformOrigin = b > 0 ? 'right' : 'left';
    i.style.transform = `scaleX(${(b > 0 ? 1 - b : a).toFixed(3)})`;
  }
  // Kicker: bold token, rule, spaced label.
  function kicker(root, n, tin, tout = null) {
    const [first, second] = $$('.ln > span', root);
    rise(first, n, tin, tout);
    rule($('i', root), n, tin + 3, tout);
    rise(second, n, tin + 5, tout == null ? null : tout + 1);
  }

  // ---------------------------------------------------------------- particles
  // Floating dust like in the film; seeded, so every render is identical.
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = rng(7);
  const DUST = Array.from({ length: 110 }, () => ({
    x: rnd() * W, y: rnd() * H, vx: lerp(-0.15, 0.35, rnd()), vy: lerp(-0.4, -0.05, rnd()),
    r: lerp(0.7, 2.1, rnd()), a: lerp(0.12, 0.6, rnd()), ph: rnd() * Math.PI * 2, f: lerp(0.03, 0.09, rnd()),
  }));
  const BOKEH = Array.from({ length: 16 }, () => ({
    x: rnd() * W, y: rnd() * H, vx: lerp(-0.1, 0.25, rnd()), vy: lerp(-0.25, -0.05, rnd()),
    r: lerp(5, 16, rnd()), a: lerp(0.04, 0.11, rnd()),
  }));
  const wrap = (v, m, pad) => ((((v + pad) % (m + 2 * pad)) + (m + 2 * pad)) % (m + 2 * pad)) - pad;

  function drawParticles(ctx, n, alpha) {
    ctx.clearRect(0, 0, W, H);
    if (alpha <= 0) return;
    for (const p of BOKEH) {
      const x = wrap(p.x + p.vx * n, W, 30), y = wrap(p.y + p.vy * n, H, 30);
      const g = ctx.createRadialGradient(x, y, 0, x, y, p.r);
      g.addColorStop(0, `rgba(233, 238, 244, ${(p.a * alpha).toFixed(3)})`);
      g.addColorStop(1, 'rgba(233, 238, 244, 0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    for (const p of DUST) {
      const x = wrap(p.x + p.vx * n, W, 4), y = wrap(p.y + p.vy * n, H, 4);
      const tw = 0.55 + 0.45 * Math.sin(p.ph + p.f * n);
      ctx.fillStyle = `rgba(255, 255, 255, ${(p.a * tw * alpha).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ---------------------------------------------------------------- footage
  function cropCentre(t, p) {
    const pts = t.path;
    if (p <= pts[0][0]) return pts[0].slice(1);
    for (let i = 1; i < pts.length; i++) {
      const [a, x0, y0] = pts[i - 1], [b, x1, y1] = pts[i];
      if (p <= b) { const k = (p - a) / (b - a); return [lerp(x0, x1, k), lerp(y0, y1, k)]; }
    }
    return pts[pts.length - 1].slice(1);
  }
  // Source position (fractional) of tile i at output frame n.
  function srcPos(i, n) {
    const t = TILES[i], [a, b] = t.src;
    return clamp(a + (n - t.at) * (t.speed || 1), a, b);
  }
  const plate = (t, f) => `${PLATE_DIR}/${t.clean ? 'c' : 'f'}${String(f).padStart(4, '0')}.jpg`;

  // Stage rectangle and image transform of tile i at frame n.
  function tileState(i, n) {
    const t = TILES[i];
    const p = srcPos(i, n);
    const [cx, cy] = cropCentre(t, p);
    const rx = XS[i], ry = TOP;
    // Reveal (bottom → top) and retract (bottom edge rises).
    const kin = E.outExpo(prog(n, T.tiles[i], 18));
    const kout = i === 0 ? 0 : E.inExpo(prog(n, T.tilesOut + 3 * (i - 1), 13));
    let rect = { x: rx, y: ry + TH * (1 - kin), w: TW, h: TH * (kin - kout) };
    // Zoom settles out of the reveal, then a slow push-in.
    const z = (1 + 0.2 * (1 - E.outExpo(prog(n, T.tiles[i], 32)))) * (1 + 0.035 * prog(n, T.tiles[i], T.open[0] - T.tiles[i]));
    let s = (TW / t.cw) * z;
    let tx = rx + TW / 2 - s * cx, ty = ry + TH / 2 - s * cy;
    let open = 0;
    if (i === 0) {
      // Tile 01 opens up to full frame: rectangle, scale and offset ease into the plain plate.
      open = E.inOutCubic(prog(n, T.open[0], T.open[1] - T.open[0]));
      rect = { x: lerp(rect.x, 0, open), y: lerp(rect.y, 0, open), w: lerp(rect.w, W, open), h: lerp(rect.h, H, open) };
      s = lerp(s, 1, open); tx = lerp(tx, 0, open); ty = lerp(ty, 0, open);
    }
    return { p, rect, s, tx, ty, kin, kout, open };
  }

  // ---------------------------------------------------------------- elements
  const el = {
    canvas: $('#particles'), black: $('#black'), logo: $('#logo'),
    kicker: $('#kicker'), title: $$('#title .ln > span'),
    labels: $$('.label'), tiles: $$('.tile'), frames: $$('.tframe'), edges: $$('.tedge'),
  };
  const ctx = el.canvas.getContext('2d');

  function render(n, states) {
    // Fade up from black, logo.
    const fade = 1 - E.outCubic(prog(n, 0, T.fade));
    el.black.style.opacity = fade.toFixed(3);
    show(el.black, fade > 0.001);
    el.logo.style.opacity = E.outCubic(prog(n, T.logo, 14)).toFixed(3);

    drawParticles(ctx, n, E.outCubic(prog(n, 0, 24)) * (1 - E.inCubic(prog(n, T.open[0], 20))));

    // Kicker + title.
    kicker(el.kicker, n, T.kicker, T.titleOut);
    el.title.forEach((s, j) => rise(s, n, T.title + j * 5, T.titleOut + j * 2, 24, 12));

    // Tiles.
    states.forEach((st, i) => {
      const tile = el.tiles[i], fr = el.frames[i], edge = el.edges[i];
      const { rect: r } = st;
      const visible = r.h > 0.5 && n >= T.tiles[i];
      show(tile, visible);
      if (visible) {
        tile.style.clipPath = `inset(${r.y.toFixed(2)}px ${(W - r.x - r.w).toFixed(2)}px ${(H - r.y - r.h).toFixed(2)}px ${r.x.toFixed(2)}px)`;
        const tf = `translate(${st.tx.toFixed(2)}px, ${st.ty.toFixed(2)}px) scale(${st.s.toFixed(5)})`;
        const [a, b] = tile.children;
        a.style.transform = tf; b.style.transform = tf;
        b.style.opacity = st.frac.toFixed(3);
        show(b, st.frac > 0.001);
      }
      // Hairline frame (fades as tile 01 opens) and the bright leading edge of reveal / retract.
      const fo = visible ? 1 - st.open * 4 : 0;
      show(fr, fo > 0);
      Object.assign(fr.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, opacity: clamp(fo).toFixed(3) });
      const ein = st.kin > 0 && st.kin < 0.995 ? Math.sin(Math.PI * Math.min(1, st.kin * 1.15)) : 0;
      const eout = st.kout > 0.002 && st.kout < 1 ? 1 : 0;
      const eo = Math.max(ein, eout);
      show(edge, eo > 0.01);
      Object.assign(edge.style, { left: `${r.x}px`, width: `${r.w}px`, top: `${(eout ? r.y + r.h : r.y) - 1.5}px`, opacity: eo.toFixed(3) });
    });

    // Labels under the tiles.
    el.labels.forEach((lab, i) => {
      const tin = T.tiles[i] + 7, tout = T.labelsOut + 2 * i;
      lab.style.left = `${XS[i]}px`;
      kicker($('.kicker', lab), n, tin, tout);
      rise($('.name .ln > span', lab), n, tin + 4, tout + 1, 22);
      rise($('.sub .ln > span', lab), n, tin + 8, tout + 2, 22);
    });
  }

  async function setPlate(img, src) {
    if (img.dataset.src === src) return;
    img.src = src;
    await img.decode();
    img.dataset.src = src;
  }

  async function seek(n) {
    const states = TILES.map((t, i) => {
      const st = tileState(i, n);
      st.base = Math.floor(st.p + 1e-6);
      st.frac = st.base < t.src[1] ? st.p - st.base : 0;
      return st;
    });
    await Promise.all(states.map(async (st, i) => {
      if (n < T.tiles[i] || st.rect.h <= 0.5) return;
      const t = TILES[i], [a, b] = el.tiles[i].children;
      await Promise.all([
        setPlate(a, plate(t, st.base)),
        st.frac > 0.001 ? setPlate(b, plate(t, st.base + 1)) : null,
      ]);
    }));
    render(n, states);
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    el.logo.src = `${PLATE_DIR}/../logo.png`;
    await el.logo.decode();
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, W, H, JOIN, seek, ready: init() };
})();
