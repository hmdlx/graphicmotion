// Sauna-Guide – Meta Ad 9:16. Deterministic, frame-addressed motion graphics over
// still images: window.COMP.seek(n) puts the stage into the exact state of frame n
// (fractional n is allowed; the renderer uses it for motion-blur sub-frames).
(() => {
  const FPS = 30;
  const W = 1080, H = 1920;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/sauna-guide/plates';

  // ------------------------------------------------------------------ timeline (seconds)
  const X = {                       // transitions
    flood: [3.00, 3.36, 3.86],      // Hook → 01: thermometer floods the frame, then lifts off
    whip: [5.76, 6.26],             // 01 → 02: whip pan
    water: [8.02, 8.56],            // 02 → 03: cold water rises
    iris: [10.66, 11.26],           // 03 → 04: arrow tip opens a window
    flash: [13.02, 13.42, 13.90],   // 04 → Arten: zoom into a light leak
    cube: [17.04, 17.66],           // Arten → Produkte: cube turn
    bands: [20.55, 20.90],          // Produkte → Endcard: navy bands (in, cut)
  };
  const TOTAL = 729;                // 24.3 s
  const T = {
    logo: -0.35,
    hook: -0.12,       // already moving on frame 0 (autoplay / first impression)
    s1: 3.72,
    s2: [5.98, 7.96],
    s3: [8.62, 10.42],
    flow: [9.02, 1.0],
    warn: 9.85,
    s4: [11.15, 12.92],
    rounds: [11.75, 12.98],
    tempsHead: [13.62, 16.86],
    bars: 14.05,
    badges: 15.40,
    prodHead: 17.55,
    cards: 17.30,
    moves: [[18.70, 19.22], [19.62, 20.14]],
    end: X.bands[1],
  };

  // Camera moves on the still plates: focus point (plate fraction) centred on the stage, zoom s.
  const CAM = {
    hook: { span: [0, X.flood[1]], from: { cx: 0.30, cy: 0.54, s: 1.06 }, to: { cx: 0.555, cy: 0.56, s: 1.0 } },
    s1:   { span: [X.flood[1], X.whip[1]], from: { cx: 0.25, cy: 0.62, s: 1.04 }, to: { cx: 0.24, cy: 0.66, s: 1.17 } },
    s2:   { span: [X.whip[0], X.water[1]], from: { cx: 0.47, cy: 0.52, s: 1.0 }, to: { cx: 0.48, cy: 0.56, s: 1.10 } },
    s4:   { span: [X.iris[0], X.flash[1]], from: { cx: 0.27, cy: 0.52, s: 1.14 }, to: { cx: 0.35, cy: 0.52, s: 1.02 } },
  };
  const PRODUCTS = [
    ['Kombisauna', 'EVEREST'],
    ['Infrarotkabine', 'REDSUN DELUXE XXL'],
    ['Gartensauna', 'HYGGE DELUXE'],
  ];
  const THERMO = { x: 950, top: 430, bottom: 1160, w: 36, from: 20, to: 90, max: 100 };
  const FLOW_X = 93, FLOW_Y = [1110, 1012, 914, 816], FLOW_TIP = 772;

  // ------------------------------------------------------------------ helpers
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    inOutExpo: k => (k <= 0 ? 0 : k >= 1 ? 1 : k < 0.5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutQuint: k => (k < 0.5 ? 16 * Math.pow(k, 5) : 1 - Math.pow(-2 * k + 2, 5) / 2),
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  const showBox = (node, on) => { node.style.display = on ? '' : 'none'; };
  const f3 = v => v.toFixed(3);

  // Seeded hash -> [0, 1)
  function hash(a, b = 0, c = 0) {
    let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const rnd = (i, j = 0) => hash(i * 7919 + 13, j * 104729 + 7, 99991);

  // Tileable fractal value noise with domain warp (period P on the unit tile).
  function makeNoise(seed) {
    const vn = (x, y, P) => {
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      const w = v => ((v % P) + P) % P;
      const g = (a, b) => hash(w(a), w(b), seed);
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      return lerp(lerp(g(ix, iy), g(ix + 1, iy), sx), lerp(g(ix, iy + 1), g(ix + 1, iy + 1), sx), sy);
    };
    return (x, y, P, oct = 5) => {
      let v = 0, a = 0.5, f = 1, n = 0;
      for (let o = 0; o < oct; o++) { v += a * vn(x * f, y * f, P * f); n += a; a *= 0.5; f *= 2; }
      return v / n;
    };
  }
  function texture(size, P, seed, shade, blur = 0) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(size, size);
    const fbm = makeNoise(seed);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x / size) * P, v = (y / size) * P;
        const q = fbm(u + 5.2, v + 1.3, P, 4);
        const r = fbm(u + 2.2 * q, v + 2.2 * q, P, 5);
        const [rr, gg, bb, aa] = shade(r);
        const i = (y * size + x) * 4;
        img.data[i] = rr; img.data[i + 1] = gg; img.data[i + 2] = bb; img.data[i + 3] = aa;
      }
    }
    ctx.putImageData(img, 0, 0);
    if (!blur) return c.toDataURL('image/png');
    // Blur across tile borders: draw 3×3 tiles, blur, keep the centre tile.
    const big = document.createElement('canvas');
    big.width = big.height = size * 3;
    const bctx = big.getContext('2d');
    bctx.filter = `blur(${blur}px)`;
    const tiles = document.createElement('canvas');
    tiles.width = tiles.height = size * 3;
    const tctx = tiles.getContext('2d');
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) tctx.drawImage(c, x * size, y * size);
    bctx.drawImage(tiles, 0, 0);
    const out = document.createElement('canvas');
    out.width = out.height = size;
    out.getContext('2d').drawImage(big, size, size, size, size, 0, 0, size, size);
    return out.toDataURL('image/png');
  }
  const smooth = (a, b, v) => { const k = clamp((v - a) / (b - a)); return k * k * (3 - 2 * k); };

  // ------------------------------------------------------------------ text tools
  function splitWords(node) {
    const words = node.textContent.split(/(\s+)/);
    node.textContent = '';
    for (const w of words) {
      if (!w) continue;
      const s = document.createElement('span');
      s.className = /\s/.test(w) ? 'ch' : 'w';
      s.textContent = w;
      node.appendChild(s);
    }
  }
  function splitChars(node) {
    const txt = node.textContent;
    node.textContent = '';
    for (const ch of txt) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      node.appendChild(s);
    }
  }
  // Odometer: every digit becomes a rolling column (three spins of 0–9).
  function makeOdo(node) {
    const txt = node.textContent;
    node.textContent = '';
    node._cols = [];
    let j = 0;
    for (const ch of txt) {
      if (/\d/.test(ch)) {
        const col = document.createElement('span');
        col.className = 'dg';
        const strip = document.createElement('span');
        let cells = '';
        for (let r = 0; r < 3; r++) for (let d = 0; d < 10; d++) cells += `<b>${d}</b>`;
        strip.innerHTML = cells;
        col.appendChild(strip);
        node.appendChild(col);
        node._cols.push({ strip, digit: +ch, spins: 1 + (j % 2), j: j++ });
      } else {
        const s = document.createElement('span');
        s.className = 'sp';
        s.textContent = ch;
        node.appendChild(s);
      }
    }
  }
  function roll(node, t, tin, dur = 0.8) {
    for (const c of node._cols) {
      const k = E.inOutCubic(prog(t, tin + c.j * 0.05, dur + c.j * 0.05));
      const pos = (10 * c.spins + c.digit) * k;
      c.strip.style.transform = `translateY(${(-pos).toFixed(3)}em)`;
    }
  }

  // Block wipe: opens left→right, leaves left→right. Shadow bleed stays visible.
  const BLEED = 90;
  function wipe(el, t, tin, tout, din = 0.55, dout = 0.4) {
    const a = E.outExpo(prog(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
    if (a <= 0 || b >= 1) { show(el, false); return false; }
    const w = el.offsetWidth + BLEED;
    show(el, true);
    el.style.clipPath = `inset(-${BLEED}px ${(1 - a) * w - BLEED}px -${BLEED}px ${b * w - BLEED}px)`;
    return true;
  }
  function rise(span, t, tin, dur = 0.65) {
    const k = E.outExpo(prog(t, tin, dur));
    span.style.transform = `translateY(${(1 - k) * 108}%)`;
  }
  // Words flip up in 3D, one after the other.
  function flip(node, t, tin, gap = 0.08) {
    $$('.w', node).forEach((w, i) => {
      const k = E.outExpo(prog(t, tin + i * gap, 0.8));
      w.style.opacity = f3(clamp(k * 2.5));
      w.style.transform = `translateY(${((1 - k) * 0.3).toFixed(3)}em) rotateX(${((1 - k) * 88).toFixed(2)}deg)`;
    });
  }
  // Characters rise and fade in with a small stagger.
  function letters(node, t, tin, gap = 0.022, dur = 0.55) {
    $$('.ch', node).forEach((c, i) => {
      const k = E.outExpo(prog(t, tin + i * gap, dur));
      c.style.opacity = f3(k);
      c.style.transform = `translateY(${((1 - k) * 0.55).toFixed(3)}em)`;
    });
  }
  // Animate everything inside one block of a stack.
  function blockContent(blk, t, tin) {
    const bar = $(':scope > .bar', blk);
    if (bar) bar.style.transform = `scaleY(${f3(E.outExpo(prog(t, tin + 0.12, 0.6)))})`;
    $$('.ln > span', blk).forEach((s, j) => rise(s, t, tin + 0.14 + j * 0.06));
    $$('.words', blk).forEach((w, j) => flip(w, t, tin + 0.12 + j * 0.12));
    $$('.chars', blk).forEach((c, j) => letters(c, t, tin + 0.1 + j * 0.18));
    $$('.kicker i', blk).forEach(i => { i.style.transform = `scaleX(${f3(E.outExpo(prog(t, tin + 0.2, 0.6)))})`; });
  }
  function stack(root, t, tin, tout, { gap = 0.1, outGap = 0.05 } = {}) {
    $$(':scope > .blk', root).forEach((blk, i) => {
      const bi = tin + i * gap;
      if (wipe(blk, t, bi, tout == null ? null : tout + i * outGap)) blockContent(blk, t, bi);
    });
  }

  // ------------------------------------------------------------------ plates
  // Place a plate so that plate point (cx, cy) sits in the centre of a w×h box at zoom s
  // (relative to "cover"), clamped so the plate always covers the box. Returns the mapping.
  function frameImg(img, cam, w = W, h = H, extra = 1) {
    const pw = img.naturalWidth || img.width, ph = img.naturalHeight || img.height;
    const s = Math.max(w / pw, h / ph) * cam.s * extra;
    const sw = pw * s, sh = ph * s;
    const x = clamp(w / 2 - cam.cx * sw, w - sw, 0);
    const y = clamp(h / 2 - cam.cy * sh, h - sh, 0);
    img.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(5)})`;
    return { x, y, s, pw, ph, at: (fx, fy) => [x + fx * pw * s, y + fy * ph * s] };
  }
  function camAt(name, t, ease = E.inOutSine) {
    const c = CAM[name];
    const k = ease(prog(t, c.span[0], c.span[1] - c.span[0]));
    return { cx: lerp(c.from.cx, c.to.cx, k), cy: lerp(c.from.cy, c.to.cy, k), s: lerp(c.from.s, c.to.s, k) };
  }

  // ------------------------------------------------------------------ atmosphere
  let SMOKE = '', CAUS = '', GRAIN = '';
  function buildSteam(node) {
    for (let i = 0; i < 2; i++) {
      const l = document.createElement('div');
      l.className = 'sl';
      l.style.backgroundImage = `url(${SMOKE})`;
      l.style.backgroundSize = i ? '1300px 1300px' : '860px 860px';
      node.appendChild(l);
    }
    node.style.webkitMaskImage = node.style.maskImage =
      'radial-gradient(ellipse 48% 58% at 50% 78%, #000 0%, rgba(0,0,0,.7) 40%, rgba(0,0,0,0) 100%)';
  }
  // Plume whose foot sits at stage point (fx, fy).
  function steam(node, t, amount, fx, fy, w = 900, h = 1500, speed = 1) {
    show(node, amount > 0.002);
    if (amount <= 0.002) return;
    Object.assign(node.style, { left: `${fx - w / 2}px`, top: `${fy - h * 0.8}px`, width: `${w}px`, height: `${h}px` });
    node.style.opacity = f3(amount);
    const [a, b] = node.children;
    a.style.backgroundPosition = `${(Math.sin(t * 0.6) * 40).toFixed(1)}px ${(-t * 150 * speed).toFixed(1)}px`;
    b.style.backgroundPosition = `${(t * 22).toFixed(1)}px ${(-t * 95 * speed).toFixed(1)}px`;
    a.style.opacity = '0.95'; b.style.opacity = '0.7';
  }
  function buildDust(node, count, seed) {
    for (let i = 0; i < count; i++) node.appendChild(document.createElement('i'));
    node._seed = seed;
  }
  function dust(node, t, amount, w = W, h = H) {
    show(node, amount > 0.002);
    if (amount <= 0.002) return;
    [...node.children].forEach((p, i) => {
      const z = rnd(i, node._seed);
      const size = 6 + z * 34;
      const x = rnd(i, node._seed + 1) * w + Math.sin(t * (0.3 + z * 0.4) + i) * (20 + z * 30);
      const y = (((rnd(i, node._seed + 2) * h - t * (14 + z * 40)) % h) + h) % h;
      const tw = 0.6 + 0.4 * Math.sin(t * (1.2 + rnd(i, 5) * 2) + i * 2.1);
      p.style.transform = `translate(${(x - 20).toFixed(1)}px, ${(y - 20).toFixed(1)}px) scale(${(size / 40).toFixed(3)})`;
      p.style.opacity = f3((0.12 + 0.45 * (1 - z)) * tw * amount);
    });
  }
  function glow(node, t, { x, y, w, h, color, alpha, pulse = 0, speed = 1 }) {
    Object.assign(node.style, { left: `${x - w / 2}px`, top: `${y - h / 2}px`, width: `${w}px`, height: `${h}px` });
    node.style.background = `radial-gradient(closest-side, ${color.replace('A', alpha)}, ${color.replace('A', alpha * 0.35)} 50%, ${color.replace('A', 0)})`;
    node.style.opacity = f3(1 - pulse + pulse * (0.5 + 0.5 * Math.sin(t * 2.1 * speed) * Math.sin(t * 0.77 * speed + 1)));
  }

  // ------------------------------------------------------------------ elements
  const sc = {
    hook: $('#sc-hook'), s1: $('#sc-s1'), s2: $('#sc-s2'), s3: $('#sc-s3'),
    s4: $('#sc-s4'), temps: $('#sc-temps'), prod: $('#sc-prod'), end: $('#sc-end'),
  };
  const el = {
    logo: $('#logo'), logoShine: $('#logo .shine'), grain: $('#grain'),
    hookImg: $('#sc-hook .plate img'), hookSteam: $('#hook-steam'), hookDust: $('#hook-dust'), hookGlow: $('#hook-glow'),
    hook: $('#hook'), thermo: $('#thermo'), thermoRead: $('#thermo-read'), thermoNum: $('#thermo-read span'),
    flood: $('#flood'),
    s1Img: $('#sc-s1 .plate img'), s1Steam: $('#s1-steam'), s1Glow: $('#s1-glow'),
    s1: $('#s1'), watch: $('#s1-watch'), bench: $$('#bench rect'),
    streak: $('#streak'),
    s2Img: $('#sc-s2 .plate img'), wind: $('#wind'), s2: $('#s2'), breathe: $('#breathe'),
    waves: $('#waves'), waveA: $('#wave-a'), waveB: $('#wave-b'), waveC: $('#wave-c'), foam: $('#wave-foam'), spray: $('#spray'),
    causA: $('#caus-a'), causB: $('#caus-b'), s3: $('#s3'),
    flowLine: $('#flow-line'), flowTrack: $('#flow-track'), flowHead: $('#flow-head'), nodes: $$('#flow .node'), warn: $('#warn'),
    iris: $('#iris'),
    s4Img: $('#sc-s4 .plate img'), s4Dust: $('#s4-dust'), s4Glow: $('#s4-glow'), s4: $('#s4'), rounds: $('#rounds'),
    roundsArc: $('#rounds-arc'), roundsTip: $('#rounds-tip'), roundsSvg: $('#rounds svg'), dots: $$('#rounds .dots i'),
    leak: $('#leak'), flash: $('#flash'),
    tempsBg: $('#temps-bg'), tempsGlow: $('#temps-glow'), tempsHead: $('#temps-head'), trows: $$('#temps .trow'),
    prodHead: $('#prod-head'), cards: $$('#carousel .pcard'), prog: $$('#pprog i'), plabel: $('#plabel'),
    ptype: $('#ptype'), pname: $('#pname'),
    bands: $$('#bands .band'),
    lightA: $('#end-light-a'), lightB: $('#end-light-b'), endImg: $('#end-img'), endImgImg: $('#end-img .plate img'),
    endSteam: $('#end-steam'), frameRect: $('#frame-rect'), endHead: $('#end-head'), endTitle: $('#end-title'),
    chips: $$('#chips .chip'), btn: $('#cta .btn'), btnShine: $('#cta .btn .shine'), arrow: $('#cta .btn svg'),
    url: $('#cta .url'), urlLine: $('#cta .url i'), slogan: $('#slogan .ln > span'),
  };

  function build() {
    $$('.words').forEach(splitWords);
    $$('.chars').forEach(splitChars);
    $$('.odo').forEach(makeOdo);

    SMOKE = texture(384, 3, 11, v => [255, 255, 255, Math.round(255 * Math.pow(smooth(0.36, 0.86, v), 1.6) * 0.9)], 5);
    CAUS = texture(384, 5, 23, v => {
      const r = 1 - Math.abs(2 * v - 1);
      return [255, 255, 255, Math.round(255 * Math.pow(r, 9) * 0.85)];
    });
    {
      const c = document.createElement('canvas');
      c.width = c.height = 512;
      const ctx = c.getContext('2d'), img = ctx.createImageData(512, 512);
      for (let i = 0; i < 512 * 512; i++) {
        const v = 128 + (hash(i, 3, 77) + hash(i, 9, 31) - 1) * 150;
        img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      GRAIN = c.toDataURL('image/png');
    }
    el.grain.style.backgroundImage = `url(${GRAIN})`;
    el.grain.style.backgroundSize = '384px 384px';
    [el.hookSteam, el.s1Steam, el.endSteam].forEach(buildSteam);
    buildDust(el.hookDust, 26, 3);
    buildDust(el.s4Dust, 30, 8);
    el.causA.style.backgroundImage = el.causB.style.backgroundImage = `url(${CAUS})`;
    el.causA.style.backgroundSize = '760px 760px';
    el.causB.style.backgroundSize = '1040px 1040px';
    el.causB.style.transform = 'scaleX(-1)';

    // Directional blur for the whip pan.
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    defs.setAttribute('width', 0); defs.setAttribute('height', 0); defs.style.position = 'absolute';
    defs.innerHTML = `
      <filter id="hblur" x="-15%" y="0" width="130%" height="100%" color-interpolation-filters="sRGB">
        <feGaussianBlur id="hblur-g" stdDeviation="0 0" />
      </filter>`;
    document.body.appendChild(defs);
    el.hblur = $('#hblur-g');

    // Thermometer HUD.
    const { x, top, bottom, w } = THERMO;
    let th = `<rect id="th-glass" x="${x}" y="${top}" width="${w}" height="${bottom - top}" fill="rgba(14,34,52,.35)" stroke="#fff" stroke-width="3" />
      <rect id="th-fill" x="${x + 7}" y="${bottom}" width="${w - 14}" height="0" fill="#fff" />
      <rect id="th-bulb" x="${x - 9}" y="${bottom}" width="${w + 18}" height="${w + 18}" fill="#fff" />`;
    for (let v = 20; v <= 100; v += 10) {
      const y = bottom - ((v - 0) / THERMO.max) * (bottom - top);
      const major = v % 20 === 0;
      th += `<line class="th-tick" x1="${x - (major ? 30 : 18)}" y1="${y}" x2="${x - 6}" y2="${y}" stroke="#fff" stroke-width="${major ? 3 : 2}" />`;
      if (major) th += `<text class="th-tick" x="${x - 40}" y="${y + 8}" text-anchor="end" font-family="Poppins" font-weight="600" font-size="25" fill="rgba(255,255,255,.9)">${v}</text>`;
    }
    el.thermo.innerHTML = th;
    el.thFill = $('#th-fill'); el.thGlass = $('#th-glass'); el.thBulb = $('#th-bulb'); el.thTicks = $$('.th-tick');

    // Stopwatch: 15-minute dial, range 8–15 highlighted.
    let sw = `<rect x="-9" y="-96" width="18" height="12" fill="#fff" />
      <circle r="70" fill="none" stroke="rgba(233,238,244,.18)" stroke-width="4" />
      <path id="sw-prog" d="${arcPath(70, 0, 15)}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="4" />
      <path id="sw-range" d="${arcPath(79, 8, 15)}" fill="none" stroke="#fff" stroke-width="9" />`;
    for (let m = 0; m < 15; m++) {
      const a = (m / 15) * 2 * Math.PI, major = m % 5 === 0, r1 = major ? 50 : 56, r2 = 64;
      sw += `<line class="sw-tick" x1="${(Math.sin(a) * r1).toFixed(2)}" y1="${(-Math.cos(a) * r1).toFixed(2)}" x2="${(Math.sin(a) * r2).toFixed(2)}" y2="${(-Math.cos(a) * r2).toFixed(2)}" stroke="${m >= 8 ? '#fff' : 'rgba(233,238,244,.55)'}" stroke-width="${major ? 4 : 3}" />`;
    }
    sw += `<line id="sw-hand" x1="0" y1="10" x2="0" y2="-54" stroke="#fff" stroke-width="5" /><rect x="-8" y="-8" width="16" height="16" fill="#fff" />`;
    el.watch.innerHTML = sw;
    el.swTicks = $$('.sw-tick', el.watch); el.swHand = $('#sw-hand'); el.swProg = $('#sw-prog'); el.swRange = $('#sw-range');

    // Wind lines across the garden sauna.
    let wind = '';
    for (let i = 0; i < 7; i++) {
      const y0 = 960 + i * 78 + rnd(i, 4) * 40, a = 40 + rnd(i, 5) * 50;
      wind += `<path class="wl" d="M-120 ${y0} C 240 ${y0 - a}, 560 ${y0 + a}, 820 ${y0 - a * 0.4} S 1120 ${y0 + a * 0.6}, 1220 ${y0}" fill="none" stroke="#fff" stroke-width="${i % 3 ? 2.5 : 4}" />`;
    }
    el.wind.innerHTML = wind;
    el.windLines = $$('.wl', el.wind).map(p => ({ p, L: p.getTotalLength() }));

    // Spray droplets for the water transition.
    let sp = '';
    for (let i = 0; i < 34; i++) sp += `<circle r="${(3 + rnd(i, 6) * 6).toFixed(1)}" fill="#fff" />`;
    el.spray.innerHTML = sp;
    el.drops = $$('circle', el.spray);

    // Scale ticks under the temperature bars (every 10 °C).
    $$('.trow .ticks').forEach(svg => {
      let s = '';
      for (let v = 0; v <= 100; v += 10) s += `<line x1="${(v * 9.36).toFixed(1)}" y1="0" x2="${(v * 9.36).toFixed(1)}" y2="${v % 50 ? 4 : 8}" stroke="rgba(233,238,244,.4)" stroke-width="2" />`;
      svg.innerHTML = s;
    });
  }
  // Arc on a 15-minute dial (minutes m0 → m1), clockwise from 12 o'clock.
  function arcPath(r, m0, m1) {
    const a0 = (m0 / 15) * 2 * Math.PI, a1 = (m1 / 15) * 2 * Math.PI;
    const p = a => `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
    return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`;
  }
  function dash(path, k) {
    const L = path.getTotalLength();
    path.style.strokeDasharray = `${L} ${L}`;
    path.style.strokeDashoffset = `${(L * (1 - k)).toFixed(2)}`;
  }

  // ------------------------------------------------------------------ scenes
  function hookScene(t) {
    // Snap pull-back at the start, then a slow dolly across the sauna.
    const pull = 1 + 0.38 * (1 - E.outExpo(prog(t, 0, 1.1)));
    const m = frameImg(el.hookImg, camAt('hook', t), W, H, pull);
    const [sx, sy] = m.at(0.13, 0.66);
    steam(el.hookSteam, t, 0.55 + 0.25 * prog(t, 0, 3), sx, sy, 1100, 1700, 0.8);
    glow(el.hookGlow, t, { x: m.at(0.62, 0.30)[0], y: m.at(0.62, 0.30)[1], w: 1500, h: 900, color: 'rgba(255,170,95,A)', alpha: 0.32, pulse: 0.25 });
    dust(el.hookDust, t, 1);

    stack(el.hook, t, T.hook, null, { gap: 0.11 });
    roll($('#hook .odo'), t, 0.28, 0.7);

    // Thermometer: glass draws in, mercury rises 20 → 90 °C.
    const { top, bottom } = THERMO;
    const g = E.outExpo(prog(t, 0.25, 0.7));
    el.thGlass.style.clipPath = `inset(${((1 - g) * 100).toFixed(2)}% 0 0 0)`;
    el.thBulb.style.transform = `scale(${f3(E.outBack(prog(t, 0.2, 0.5)))})`;
    el.thBulb.style.transformOrigin = `${THERMO.x + THERMO.w / 2}px ${bottom + THERMO.w / 2 + 9}px`;
    el.thTicks.forEach((tk, i) => { tk.style.opacity = f3(E.outCubic(prog(t, 0.45 + (i * 0.035), 0.4))); });
    const vk = E.inOutCubic(prog(t, 0.55, 2.4));
    const temp = lerp(THERMO.from, THERMO.to, vk);
    const fy = bottom - (temp / THERMO.max) * (bottom - top);
    el.thFill.setAttribute('y', fy.toFixed(1));
    el.thFill.setAttribute('height', (bottom - fy).toFixed(1));
    el.thermoNum.textContent = Math.round(temp);
    const rk = E.outExpo(prog(t, 0.5, 0.6));
    el.thermoRead.style.opacity = f3(rk);
    el.thermoRead.style.transform = `translateY(${((1 - rk) * 20).toFixed(1)}px)`;
  }

  function floodTr(t) {
    const [a, b, c] = X.flood;
    const on = t >= a && t < c + 0.05;
    el.flood.style.display = on ? 'block' : 'none';
    if (!on) return;
    const k = E.inOutExpo(prog(t, a, b - a));
    const { x, top, bottom, w } = THERMO;
    const fy = bottom - (THERMO.to / THERMO.max) * (bottom - top);
    const r = { l: lerp(x + 7, 0, k), t: lerp(fy, 0, k), r: lerp(x + w - 7, W, k), b: lerp(bottom + w + 9, H, k) };
    const up = E.inOutCubic(prog(t, b + 0.02, c - b - 0.02));
    Object.assign(el.flood.style, { left: `${r.l}px`, top: `${r.t - up * (H + 40)}px`, width: `${r.r - r.l}px`, height: `${r.b - r.t}px` });
    el.flood.firstElementChild.style.opacity = up > 0 ? '1' : '0';
  }

  function s1Scene(t, ride, wf) {
    // Reveal under the lifting flood: settle from a slight zoom.
    const settle = 1 + 0.16 * (1 - E.outCubic(prog(t, X.flood[1], 1.0)));
    const m = frameImg(el.s1Img, camAt('s1', t), W, H, settle);
    const [sx, sy] = m.at(0.22, 0.86);
    const burst = E.outCubic(prog(t, 3.95, 0.9)) * (1 - 0.35 * prog(t, 4.9, 1.0));
    steam(el.s1Steam, t, 0.45 + 0.55 * burst, sx, sy + 60, 1300, 1900, 1.2);
    glow(el.s1Glow, t, { x: sx, y: sy, w: 1200, h: 900, color: 'rgba(255,140,60,A)', alpha: 0.35, pulse: 0.35, speed: 2.4 });

    sc.s1.style.translate = `${ride}px 0`;
    sc.s1.style.filter = wf;

    stack(el.s1, t, T.s1, null);
    roll($('#s1 .odo'), t, T.s1 + 0.25);
    // Stopwatch: ticks pop in, hand sweeps 0 → 15 min, range arc grows from 8.
    el.swTicks.forEach((tk, i) => { tk.style.opacity = f3(E.outCubic(prog(t, T.s1 + 0.25 + i * 0.03, 0.3))); });
    const hk = E.inOutCubic(prog(t, T.s1 + 0.45, 1.3));
    const min = 15 * hk;
    el.swHand.setAttribute('transform', `rotate(${(min * 24).toFixed(2)})`);
    dash(el.swProg, hk);
    dash(el.swRange, clamp((min - 8) / 7));
    el.bench.forEach((r, i) => {
      const k = E.outExpo(prog(t, T.s1 + 0.55 + (2 - i) * 0.08, 0.5));
      r.style.transform = `scaleX(${f3(k)})`;
    });
  }

  function s2Scene(t, ride, wf) {
    frameImg(el.s2Img, camAt('s2', t));
    sc.s2.style.translate = `${ride}px 0`;
    sc.s2.style.filter = wf;
    stack(el.s2, t, T.s2[0], T.s2[1]);
    // Breathing: "durchatmen" slowly expands and relaxes.
    const br = Math.sin(Math.PI * 2 * prog(t, 6.9, 2.4) - Math.PI / 2) * 0.5 + 0.5;
    el.breathe.style.letterSpacing = `${(br * 0.035 - 0.015).toFixed(4)}em`;
    // Wind: dashes travel along the curves.
    el.windLines.forEach(({ p, L }, i) => {
      const seg = 220 + rnd(i, 7) * 160;
      const per = 1.6 + rnd(i, 8) * 0.8;
      const ph = ((t - 6.25 - i * 0.17) / per);
      const k = ph - Math.floor(ph);
      const alive = t > 6.25 + i * 0.17;
      p.style.strokeDasharray = `${seg} ${L + seg}`;
      p.style.strokeDashoffset = `${(seg - k * (L + seg)).toFixed(1)}`;
      p.style.opacity = alive ? f3(0.85 * Math.sin(Math.PI * k) * (1 - prog(t, 7.9, 0.3))) : '0';
    });
  }

  // Wave edge y(x) for the water transition.
  function wavePath(level, amp, len, phase) {
    let d = `M-20 ${H + 40} L-20 ${level.toFixed(1)}`;
    for (let x = -20; x <= W + 20; x += 20) {
      const y = level + amp * Math.sin((2 * Math.PI * x) / len + phase) + amp * 0.35 * Math.sin((2 * Math.PI * x) / (len * 0.43) - phase * 1.7);
      d += ` L${x} ${y.toFixed(1)}`;
    }
    return d + ` L${W + 20} ${H + 40} Z`;
  }
  function waterTr(t) {
    const [a, b] = X.water;
    const on = t >= a && t < b + 0.05;
    el.waves.style.display = on ? 'block' : 'none';
    if (!on) return;
    const lvl = off => lerp(H + 80, -70, E.inOutCubic(prog(t, a + off, b - a - 0.08)));
    const ph = t * 9;
    el.waveA.setAttribute('d', wavePath(lvl(-0.08) - 90, 30, 620, ph));
    el.waveB.setAttribute('d', wavePath(lvl(-0.04) - 45, 26, 480, ph + 1.3));
    const front = lvl(0);
    el.waveC.setAttribute('d', wavePath(front, 24, 540, ph + 2.4));
    el.foam.setAttribute('d', wavePath(front, 24, 540, ph + 2.4).replace(/^M[^L]+L/, 'M').replace(/ L\d+ \d+ Z$/, ''));
    el.drops.forEach((d, i) => {
      const tl = a + 0.05 + rnd(i, 9) * (b - a - 0.15);
      const dt = t - tl;
      if (dt < 0 || dt > 0.5) { d.style.opacity = '0'; return; }
      const x0 = rnd(i, 10) * W;
      const yl = lerp(H + 80, -70, E.inOutCubic(prog(tl, a, b - a - 0.08)));
      const vx = (rnd(i, 11) - 0.5) * 300, vy = -(700 + rnd(i, 12) * 700);
      d.setAttribute('cx', (x0 + vx * dt).toFixed(1));
      d.setAttribute('cy', (yl + vy * dt + 0.5 * 3200 * dt * dt).toFixed(1));
      d.style.opacity = f3(0.9 * (1 - dt / 0.5));
    });
  }

  function s3Scene(t) {
    const ck = E.outCubic(prog(t, X.water[1], 0.6));
    el.causA.style.opacity = f3(0.5 * ck);
    el.causB.style.opacity = f3(0.32 * ck);
    el.causA.style.backgroundPosition = `${(t * 26).toFixed(1)}px ${(t * 42).toFixed(1)}px`;
    el.causB.style.backgroundPosition = `${(t * -31).toFixed(1)}px ${(t * 19).toFixed(1)}px`;
    stack(el.s3, t, T.s3[0], T.s3[1]);

    const [fs, fd] = T.flow;
    const fk = E.inOutCubic(prog(t, fs, fd));
    const tipY = lerp(FLOW_Y[0], FLOW_TIP, fk);
    el.flowLine.setAttribute('y2', tipY.toFixed(1));
    show(el.flowLine, fk > 0);
    el.flowTrack.style.opacity = f3(prog(t, fs - 0.3, 0.3));
    show(el.flowHead, fk > 0);
    el.flowHead.setAttribute('transform', `translate(${FLOW_X} ${tipY.toFixed(1)})`);
    el.nodes.forEach((node, i) => {
      const reach = fs + fd * (i === 0 ? 0 : (FLOW_Y[0] - FLOW_Y[i]) / (FLOW_Y[0] - FLOW_TIP)) * 0.85;
      const s = E.outBack(prog(t, reach, 0.45));
      const kt = E.outExpo(prog(t, reach + 0.05, 0.6));
      node.style.transform = `translate(${FLOW_X - 21}px, ${FLOW_Y[i] - 21}px)`;
      const pt = node.firstElementChild;
      pt.style.transform = `scale(${f3(s)})`;
      const rip = pt.firstElementChild;
      const rk = prog(t, reach + 0.1, 0.7);
      rip.style.transform = `scale(${f3(1 + 1.6 * E.outCubic(rk))})`;
      rip.style.opacity = f3(rk > 0 && rk < 1 ? 0.8 * (1 - rk) : 0);
      const txt = node.lastElementChild;
      txt.style.opacity = f3(kt);
      txt.style.transform = `translateX(${((1 - kt) * -34).toFixed(1)}px)`;
    });
    if (wipe(el.warn, t, T.warn, null, 0.6)) {
      const pk = t > T.warn + 0.6 ? Math.pow(Math.sin(Math.PI * (((t - T.warn - 0.6) % 0.9) / 0.9)), 6) : 0;
      el.warn.firstElementChild.style.transform = `scale(${f3(1 + 0.18 * pk)})`;
    }
  }

  const irisK = t => E.inOutCubic(prog(t, X.iris[0], X.iris[1] - X.iris[0]));
  function irisRect(k) {
    const r = 18;
    const x = lerp(FLOW_X - r, 0, k), y = lerp(FLOW_TIP - r, 0, k);
    return { x, y, w: lerp(2 * r, W, k), h: lerp(2 * r, H, k) };
  }

  function s4Scene(t) {
    const ik = irisK(t);
    const zk = E.inExpo(prog(t, X.flash[0], X.flash[1] - X.flash[0]));
    const zoom = (1.2 - 0.2 * E.outCubic(ik)) * (1 + 0.28 * zk);
    frameImg(el.s4Img, camAt('s4', t), W, H, zoom);
    sc.s4.style.filter = zk > 0.02 ? `blur(${(zk * 14).toFixed(1)}px) brightness(${(1 + zk * 0.5).toFixed(3)})` : 'none';
    if (t < X.iris[1]) {
      const r = irisRect(ik);
      sc.s4.style.clipPath = `inset(${r.y}px ${W - r.x - r.w}px ${H - r.y - r.h}px ${r.x}px)`;
    } else sc.s4.style.clipPath = 'none';
    glow(el.s4Glow, t, { x: 180 + 120 * prog(t, 11, 2.5), y: 520, w: 1500, h: 1300, color: 'rgba(255,236,210,A)', alpha: 0.30, pulse: 0.2, speed: 0.6 });
    dust(el.s4Dust, t, 0.9 * (1 - zk));

    stack(el.s4, t, T.s4[0], T.s4[1]);
    roll($('#s4 .odo'), t, T.s4[0] + 0.25);
    stack(el.rounds, t, T.rounds[0], T.rounds[1]);
    const ak = E.outCubic(prog(t, T.rounds[0] + 0.15, 0.8));
    dash(el.roundsArc, ak);
    el.roundsTip.style.opacity = f3(prog(t, T.rounds[0] + 0.8, 0.15));
    el.roundsSvg.style.transform = `rotate(${(-120 * (1 - ak) + 360 * E.inOutCubic(prog(t, T.rounds[0] + 1.0, 0.9))).toFixed(2)}deg)`;
    el.dots.forEach((d, i) => {
      d.style.setProperty('--f', i < 2 ? f3(E.outBack(prog(t, T.rounds[0] + 0.45 + i * 0.18, 0.4))) : '0');
      d.style.opacity = f3(prog(t, T.rounds[0] + 0.3 + i * 0.1, 0.3));
    });
  }

  function flashTr(t) {
    const [a, cut, out] = X.flash;
    const fl = t < cut ? E.inCubic(prog(t, cut - 0.22, 0.22)) : 1 - E.outCubic(prog(t, cut, out - cut));
    el.flash.style.display = fl > 0.002 ? 'block' : 'none';
    el.flash.style.opacity = f3(fl);
    // Warm light leak sweeping across the cut.
    const lk = prog(t, a - 0.1, out - a + 0.5);
    const la = Math.sin(Math.PI * lk);
    el.leak.style.display = la > 0.01 ? 'block' : 'none';
    if (la > 0.01) {
      const x1 = lerp(-300, 1300, lk), y1 = lerp(300, 900, lk);
      el.leak.style.background = `radial-gradient(ellipse 700px 1100px at ${x1}px ${y1}px, rgba(255,150,60,${f3(0.75 * la)}), rgba(255,120,40,0) 70%),
        radial-gradient(ellipse 500px 800px at ${W - x1 * 0.6}px ${1500 - y1 * 0.4}px, rgba(255,200,120,${f3(0.5 * la)}), rgba(255,200,120,0) 70%)`;
    }
  }

  function tempsScene(t) {
    const settle = 1 + 0.1 * (1 - E.outExpo(prog(t, X.flash[1], 0.8)));
    const drift = 1 + 0.06 * prog(t, X.flash[1], 4);
    frameImg(el.tempsBg, { cx: 0.5, cy: 0.5, s: 1 }, W, H, settle * drift);
    glow(el.tempsGlow, t, { x: 700, y: 1000, w: 1600, h: 1400, color: 'rgba(255,140,60,A)', alpha: 0.22, pulse: 0.4, speed: 0.8 });
    stack(el.tempsHead, t, T.tempsHead[0], null);
    el.trows.forEach((row, i) => {
      const min = +row.dataset.min, max = +row.dataset.max;
      const tin = T.bars + i * 0.25;
      const appear = E.outExpo(prog(t, tin - 0.15, 0.6));
      row.style.opacity = f3(appear);
      row.style.transform = `translateY(${((1 - appear) * 40).toFixed(1)}px)`;
      rise($('.name .ln > span', row), t, tin - 0.1);
      dash($('.ico path', row), E.inOutCubic(prog(t, tin - 0.1, 0.9)));
      const k = E.outCubic(prog(t, tin + 0.1, 1.0));
      const x = 936 * (max / 100) * k, left = 936 * (min / 100);
      $('.fill', row).style.width = `${Math.min(x, left).toFixed(1)}px`;
      const range = $('.range', row);
      range.style.left = `${left}px`;
      range.style.width = `${Math.max(0, x - left).toFixed(1)}px`;
      const sh = prog(t, tin + 1.0, 0.9);
      range.firstElementChild.style.transform = `translateX(${(-120 + sh * 400).toFixed(1)}px)`;
      roll($('.odo', row), t, tin + 0.05, 0.9);
      $('.ticks', row).style.opacity = f3(prog(t, tin + 0.2, 0.5));
      const badge = $('.badge', row);
      if (badge) {
        const kb = E.outBack(prog(t, T.badges + (i - 1) * 0.14, 0.45));
        badge.style.opacity = f3(clamp(kb));
        badge.style.transform = `scale(${f3(kb)})`;
        badge.firstElementChild.style.transform = `translateX(${(-60 + 360 * prog(t, T.badges + 0.35 + (i - 1) * 0.14, 0.6)).toFixed(1)}px) skewX(-20deg)`;
      }
      $('.note', row).style.opacity = f3(0.62 * E.outExpo(prog(t, tin + 0.5, 0.6)));
    });
  }

  // Cube turn: both faces rotate about the cube's centre axis (W/2 deep).
  function cubeTr(t) {
    const [a, b] = X.cube;
    const k = E.inOutCubic(prog(t, a, b - a));
    const inCube = t >= a && t < b;
    for (const [node, ang] of [[sc.temps, -90 * k], [sc.prod, 90 * (1 - k)]]) {
      node.style.transformOrigin = `50% 50% -${W / 2}px`;
      node.style.transform = inCube ? `rotateY(${ang.toFixed(3)}deg)` : 'none';
    }
    sc.temps.style.filter = inCube ? `brightness(${f3(1 - 0.55 * k)})` : 'none';
    sc.prod.style.filter = inCube ? `brightness(${f3(0.45 + 0.55 * k)})` : 'none';
  }

  function carouselPos(t) {
    let pos = 0;
    T.moves.forEach(([s, e]) => { pos += E.inOutCubic(prog(t, s, e - s)); });
    return pos;
  }
  function prodScene(t) {
    stack(el.prodHead, t, T.prodHead, null);
    const pos = carouselPos(t);
    el.cards.forEach((card, i) => {
      const fly = E.outExpo(prog(t, T.cards + i * 0.13, 1.0));
      const d = ((((i - pos) % 3) + 4.5) % 3) - 1.5;   // circular: −1.5 … 1.5
      const cd = d;
      const x = cd * 400;
      const z = -Math.abs(cd) * 330 - (1 - fly) * 2200;
      const ry = -cd * 46 + (1 - fly) * -70;
      card.style.transform = `translate3d(${x.toFixed(1)}px, ${((1 - fly) * -120).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${ry.toFixed(2)}deg)`;
      card.style.zIndex = String(100 - Math.round(Math.abs(d) * 10));
      card.style.opacity = f3(clamp(fly * 3) * clamp((1.42 - Math.abs(d)) / 0.3));
      $('.dim', card).style.opacity = f3(Math.min(0.62, Math.abs(d) * 0.5));
      // Gloss sweeps across a card when it comes to the front.
      const arrive = i === 0 ? T.cards + 0.6 : T.moves[i - 1][1] - 0.15;
      $('.gloss', card).style.transform = `translateX(${(-260 + 1000 * prog(t, arrive, 0.8)).toFixed(1)}px) skewX(-16deg)`;
      const img = $('.face img', card);
      img.style.transform = `scale(${(1.06 - 0.06 * prog(t, T.cards, 3.6)).toFixed(4)})`;
    });
    const cur = Math.round(pos);
    el.prog.forEach((p, i) => { p.style.transform = `scaleX(${f3(clamp(pos + 1 - i) * E.outExpo(prog(t, T.cards + 0.4, 0.5)))})`; });
    const [type, name] = PRODUCTS[cur];
    if (el.ptype.textContent !== type) { el.ptype.textContent = type; el.pname.textContent = name; }
    const lt = cur === 0 ? T.cards + 0.75 : T.moves[cur - 1][0] + (T.moves[cur - 1][1] - T.moves[cur - 1][0]) / 2;
    wipe($('.blk', el.plabel), t, T.cards + 0.7, null);
    rise(el.ptype, t, lt + 0.02);
    rise(el.pname, t, lt + 0.08);
  }

  function bandsTr(t) {
    const [a, cut] = X.bands;
    const dur = cut - a;
    el.bands.forEach((band, i) => {
      const kin = E.inOutCubic(prog(t, a + i * 0.012, dur - 0.08));
      const kout = E.inOutCubic(prog(t, cut + 0.02 + i * 0.012, dur));
      const on = kin > 0 && kout < 1;
      band.style.display = on ? 'block' : 'none';
      if (on) band.style.clipPath = `inset(0 ${((1 - kin) * 100).toFixed(2)}% 0 ${(kout * 100).toFixed(2)}%)`;
    });
  }

  function endScene(t) {
    const e = T.end;
    el.lightA.style.transform = `translate(${(-500 + 300 * Math.sin(t * 0.5)).toFixed(1)}px, ${(200 + 120 * Math.cos(t * 0.4)).toFixed(1)}px)`;
    el.lightB.style.transform = `translate(${(300 + 200 * Math.cos(t * 0.45)).toFixed(1)}px, ${(900 + 160 * Math.sin(t * 0.35)).toFixed(1)}px)`;
    const kr = E.inOutExpo(prog(t, e + 0.05, 0.8));
    el.endImg.style.clipPath = `inset(${((1 - kr) * 50).toFixed(2)}% 0 ${((1 - kr) * 50).toFixed(2)}% 0)`;
    const m = frameImg(el.endImgImg, { cx: 0.5, cy: 0.62, s: 1.18 - 0.1 * E.outCubic(prog(t, e, TOTAL / FPS - e)) }, 936, 430);
    const [sx, sy] = m.at(0.14, 0.66);
    steam(el.endSteam, t, 0.7, sx, sy, 700, 600, 0.6);
    const per = 2 * (964 + 458);
    const fr = E.inOutCubic(prog(t, e + 0.45, 0.9));
    el.frameRect.style.strokeDasharray = per;
    el.frameRect.style.strokeDashoffset = per * (1 - fr);

    const head = $('.blk', el.endHead);
    show(head, t >= e + 0.3);
    letters($('.kicker .chars', head), t, e + 0.3);
    $$('.ch', el.endTitle).forEach((c, i) => {
      const k = E.outExpo(prog(t, e + 0.45 + i * 0.035, 0.75));
      c.style.opacity = f3(clamp(k * 2));
      c.style.transform = `translateY(${((1 - k) * 0.3).toFixed(3)}em) rotateX(${((1 - k) * 88).toFixed(2)}deg)`;
    });
    el.chips.forEach((c, i) => {
      const k = E.outExpo(prog(t, e + 0.95 + i * 0.09, 0.7));
      c.style.opacity = f3(k);
      c.style.transform = `translateY(${((1 - k) * 30).toFixed(1)}px)`;
      dash($('path', c), E.outCubic(prog(t, e + 1.15 + i * 0.09, 0.4)));
    });
    wipe(el.btn, t, e + 1.3, null, 0.6);
    const sh = ((t - e - 1.9) % 1.6) / 1.6;
    el.btnShine.style.transform = `translateX(${(t > e + 1.9 ? -150 + sh * 700 : -200).toFixed(1)}px) skewX(-18deg)`;
    const ku = E.outExpo(prog(t, e + 1.5, 0.6));
    el.url.style.opacity = f3(ku);
    el.url.style.transform = `translateX(${((1 - ku) * -24).toFixed(1)}px)`;
    el.urlLine.style.transform = `scaleX(${f3(E.outExpo(prog(t, e + 1.7, 0.7)))})`;
    const nudge = t > e + 2.0 ? Math.pow(Math.sin(Math.PI * (((t - e - 2.0) % 1.3) / 1.3)), 2) : 0;
    el.arrow.style.transform = `translateX(${(nudge * 9).toFixed(2)}px)`;
    rise(el.slogan, t, e + 1.8);
  }

  // ------------------------------------------------------------------ render
  function render(n) {
    const t = n / FPS;
    const vis = {
      hook: t < X.flood[1],
      s1: t >= X.flood[1] && t < X.whip[1],
      s2: t >= X.whip[0] && t < X.water[1],
      s3: t >= X.water[1] - 0.02 && t < X.iris[1],
      s4: t >= X.iris[0] && t < X.flash[1],
      temps: t >= X.flash[1] && t < X.cube[1],
      prod: t >= X.cube[0] && t < X.bands[1],
      end: t >= X.bands[1],
    };
    for (const k in sc) sc[k].style.display = vis[k] ? 'block' : 'none';

    // Whip pan between 01 and 02 (directional blur on top of the sub-frame blur).
    const inWhip = t >= X.whip[0] && t < X.whip[1];
    const wk = inWhip ? E.inOutQuint(prog(t, X.whip[0], X.whip[1] - X.whip[0])) : 0;
    const blurPx = inWhip ? 60 * Math.pow(Math.sin(Math.PI * wk), 1.5) : 0;
    el.hblur.setAttribute('stdDeviation', `${blurPx.toFixed(1)} 0`);
    const wf = blurPx > 1 ? 'url(#hblur)' : 'none';
    el.streak.style.display = inWhip ? 'block' : 'none';
    if (inWhip) {
      el.streak.style.left = `${(W * (1 - wk) - 260).toFixed(1)}px`;
      el.streak.style.opacity = f3(Math.sin(Math.PI * wk) * 0.8);
    }

    if (vis.hook) hookScene(t);
    if (vis.s1) s1Scene(t, inWhip ? -W * wk : 0, wf);
    if (vis.s2) s2Scene(t, inWhip ? W * (1 - wk) : 0, wf);
    if (vis.s3) s3Scene(t);
    if (vis.s4) s4Scene(t);
    if (vis.temps) tempsScene(t);
    if (vis.prod) prodScene(t);
    if (vis.end) endScene(t);

    floodTr(t);
    waterTr(t);
    const inIris = t >= X.iris[0] && t < X.iris[1];
    el.iris.style.display = inIris ? 'block' : 'none';
    if (inIris) {
      const r = irisRect(irisK(t));
      Object.assign(el.iris.style, { left: `${r.x - 4}px`, top: `${r.y - 4}px`, width: `${r.w + 8}px`, height: `${r.h + 8}px` });
    }
    flashTr(t);
    cubeTr(t);
    bandsTr(t);

    // Post: logo, shine, grain.
    wipe(el.logo, t, T.logo, null, 0.6);
    const ls = Math.max(prog(t, 0.7, 0.8) * (t < 1.6 ? 1 : 0), prog(t, T.end + 2.2, 0.8) * (t > T.end ? 1 : 0));
    el.logoShine.style.transform = `translateX(${(-120 + ls * 460).toFixed(1)}px) skewX(-18deg)`;
    const gi = Math.round(n);
    el.grain.style.transform = `translate(${(rnd(gi, 1) * 256 - 128).toFixed(0)}px, ${(rnd(gi, 2) * 256 - 128).toFixed(0)}px)`;
  }

  // Sub-frames per output frame for the renderer's motion blur.
  function mblur(n) {
    const t = n / FPS;
    const fast = [[0, 0.9, 4], [X.flood[0], X.flood[2] + 0.05, 8], [X.whip[0] - 0.03, X.whip[1] + 0.03, 8],
      [X.water[0], X.water[1] + 0.05, 4], [X.iris[0], X.iris[1], 8], [X.flash[0], X.flash[1] + 0.2, 4],
      [X.cube[0], X.cube[1], 8], [T.cards, T.cards + 1.0, 4], ...T.moves.map(([a, b]) => [a, b, 4]),
      [X.bands[0], X.bands[1] + 0.4, 8]];
    let k = 1;
    for (const [a, b, s] of fast) if (t >= a && t < b) k = Math.max(k, s);
    return k;
  }

  function seek(n) { render(n); }

  async function init() {
    build();
    $('#guides').style.display = params.get('guides') ? 'block' : 'none';
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img[data-plate]').map(img => {
      img.src = `${PLATE_DIR}/${img.dataset.plate}.jpg`;
      return img.decode();
    }));
    await $('#logo img').decode();
    // Blurred backdrop for the comparison scene (blurred once, not per frame).
    const src = new Image();
    src.src = `${PLATE_DIR}/thermometer-hygrometer.jpg`;
    await src.decode();
    const c = el.tempsBg;
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.filter = 'blur(14px)';
    const s = Math.max(W / src.width, H / src.height) * 1.08;
    ctx.drawImage(src, (W - src.width * s) / 2 - 120, (H - src.height * s) / 2, src.width * s, src.height * s);
    const t0 = params.get('t');
    seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, mblur, ready: init() };
})();
