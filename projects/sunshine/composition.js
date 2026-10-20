// Whirlpool SUNSHINE – Reel 9:16. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// Speed ramp and shot boundaries come from timeline.js.
(() => {
  const TL = window.TIMELINE;
  const FPS = TL.FPS;
  const params = new URLSearchParams(location.search);
  // Graded, motion-interpolated plates (scripts/slowmo_plates.sh), one directory per
  // shot section; frame k of "<a>-<b>" shows source frame a + k / SLOW.
  const PLATE_DIR = params.get('plates') || '../../build/sunshine/slow';
  const SLOW = 4;
  const CHUNKS = [[0, 68], [69, 127], [127, 185], [186, 240]];
  const out = TL.out;

  // Whirlpool bounding box in the wide shots [x0, y0, x1, y1], keyed by source frame.
  const BOX = [
    [0, [81, 793, 1037, 1473]], [34, [81, 793, 1044, 1490]], [68, [97, 826, 1047, 1490]],
    [186, [201, 745, 1070, 1392]], [213, [224, 761, 1086, 1360]], [240, [243, 761, 1080, 1328]],
  ];
  const ZOOM_AT = [560, 1010];   // water surface: the opening shot dives in here

  // Graphics timeline, output frames.
  const G = {
    title: [10, out(52)],
    zoom: [out(56), out(TL.CUTS.B)],
    flare: out(TL.CUTS.C),
    end: out(214),
  };

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
  // Fade-in/out envelope for a [in, out] window, in frames.
  const env = (n, [a, b], din = 10, dout = 8) => E.outCubic(prog(n, a, din)) * (1 - E.inCubic(prog(n, b, dout)));
  function rise(span, n, nin, dur = 14) {
    span.style.transform = `translateY(${(1 - E.outExpo(prog(n, nin, dur))) * 108}%)`;
  }

  // ---------------------------------------------------------------- footage
  const srcOf = n => TL.srcAt[clamp(n, 0, TL.TOTAL - 1)];
  const speedOf = n => srcOf(n + 1) - srcOf(n);
  function chunkOf(src) {
    let c = CHUNKS.findIndex(([a, b]) => src < b);
    if (c < 0) c = CHUNKS.length - 1;
    return c;
  }
  function plateUrl(src) {
    let c = chunkOf(src);
    let k = Math.round((src - CHUNKS[c][0]) * SLOW);
    const maxK = (CHUNKS[c][1] - CHUNKS[c][0]) * SLOW - SLOW;
    if (k > maxK && c < CHUNKS.length - 1 && CHUNKS[c + 1][0] === CHUNKS[c][1]) { c += 1; k = 0; }
    k = clamp(k, 0, maxK);
    return `${PLATE_DIR}/${CHUNKS[c][0]}-${CHUNKS[c][1]}/f${String(k).padStart(4, '0')}.jpg`;
  }
  // Source position actually shown: real frames whenever the ramp runs near or above
  // real time, interpolated ones only in slow motion.
  const shownSrc = n => (speedOf(n) > 0.6 ? Math.round(srcOf(n)) : srcOf(n));
  const inShot = (src, shot) => (shot === 'A' ? src < TL.CUTS.B : shot === 'C' ? src >= TL.CUTS.C : src >= TL.CUTS.B && src < TL.CUTS.C);
  const shotOf = src => (src < TL.CUTS.B ? 'A' : src < TL.CUTS.C ? 'B' : 'C');

  function boxAt(src) {
    const keys = BOX.filter(([f]) => inShot(f, shotOf(src)));
    if (!keys.length) return null;
    let i = keys.findIndex(([f]) => f >= src);
    if (i <= 0) return keys[i < 0 ? keys.length - 1 : 0][1];
    const [fa, a] = keys[i - 1], [fb, b] = keys[i];
    const k = (src - fa) / (fb - fa);
    return a.map((v, j) => lerp(v, b[j], k));
  }

  // ---------------------------------------------------------------- elements
  const el = {
    cam: $('#cam'), main: $('#main'), ghost: $('#ghost'), dof: $('#dof'),
    flare: $('#flare'), flash: $('#flash'), noise: $('#noise-t'),
    scrimTop: $('#scrim-top'), scrimBot: $('#scrim-bot'),
    title: $('#title'), titleName: $('#title .name > .ln > span'),
    end: $('#end'), endName: $('#end .name > .ln > span'), endLogo: $('#end-logo'),
    url: $('#end .url'), urlLine: $('#end .url i'),
  };

  // Camera: dive into the water at the end of A, settle after each cut, slow push
  // during the end-card hold. Returns [scale, focus] in plate coordinates.
  function camera(n) {
    const src = srcOf(n);
    let s = 1, f = [540, 960];
    const zk = n < G.zoom[1] ? E.inExpo(prog(n, G.zoom[0], G.zoom[1] - G.zoom[0])) : 0;
    if (shotOf(src) === 'A') { s = 1 + 0.5 * zk; f = ZOOM_AT; }
    const atB = out(TL.CUTS.B), atC = out(TL.CUTS.C);
    if (n >= atB && n < atB + 12) s = 1 + 0.18 * (1 - E.outCubic(prog(n, atB, 12)));
    if (n >= atC) {
      s = 1 + 0.1 * (1 - E.outCubic(prog(n, atC, 14)));
      s *= 1 + 0.035 * E.inOutCubic(prog(n, G.end, TL.TOTAL - G.end));
      const b = boxAt(Math.min(src, TL.SRC_LAST));
      if (b) f = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];
    }
    return { s, f, zk };
  }

  // ---------------------------------------------------------------- render
  function render(n) {
    const src = srcOf(n), shot = shotOf(src), sp = speedOf(n);
    const cam = camera(n);
    el.cam.style.transform = `translate(${cam.f[0]}px, ${cam.f[1]}px) scale(${cam.s}) translate(${-cam.f[0]}px, ${-cam.f[1]}px)`;
    el.cam.style.filter = cam.zk > 0.05 ? `blur(${(cam.zk * 9).toFixed(1)}px)` : 'none';

    // Motion blur through the speed-ups: the frame half a step back, blended on top.
    const ghostOn = sp > 1.2 && el.ghost.dataset.src;
    show(el.ghost, !!ghostOn);
    el.ghost.style.opacity = ghostOn ? clamp((sp - 1.2) / 0.8) * 0.5 : 0;

    // Depth of field around the whirlpool in the wide shots.
    const box = shot !== 'B' ? boxAt(src) : null;
    show(el.dof, !!box);
    if (box) {
      const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
      const rx = (box[2] - box[0]) * 0.72, ry = (box[3] - box[1]) * 0.95;
      const m = `radial-gradient(ellipse ${rx.toFixed(0)}px ${ry.toFixed(0)}px at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, transparent 62%, #000 100%)`;
      el.dof.style.webkitMaskImage = m;
      el.dof.style.maskImage = m;
    }

    // Grain: fresh pattern every frame.
    el.noise.setAttribute('seed', String(n % 97));

    // Flash into the water (A → B), warm flare sweeping into the closing wide shot.
    const atB = out(TL.CUTS.B);
    const fl = n < atB ? 0.55 * E.inCubic(prog(n, atB - 4, 4)) : 0.55 * (1 - E.outCubic(prog(n, atB, 8)));
    el.flash.style.opacity = fl.toFixed(3);
    show(el.flash, fl > 0.002);
    const fk = prog(n, G.flare - 10, 22);
    show(el.flare, fk > 0 && fk < 1);
    if (fk > 0 && fk < 1) {
      const x = lerp(-350, 1450, E.inOutCubic(fk)), a = Math.sin(Math.PI * fk);
      el.flare.style.background = `radial-gradient(circle 760px at ${x.toFixed(0)}px 520px, rgba(255, 214, 160, ${(0.95 * a).toFixed(3)}), rgba(255, 170, 90, ${(0.4 * a).toFixed(3)}) 38%, rgba(255, 150, 70, 0) 72%)`;
    }

    // Opening: the name, nothing else.
    const tEnv = env(n, G.title, 12, 10);
    show(el.title, tEnv > 0.001);
    el.title.style.opacity = tEnv.toFixed(3);
    el.title.style.filter = tEnv < 0.999 && n > G.title[1] ? `blur(${((1 - tEnv) * 8).toFixed(1)}px)` : 'none';
    rise(el.titleName, n, G.title[0], 16);
    el.titleName.style.letterSpacing = `${lerp(0.32, 0.12, E.outCubic(prog(n, G.title[0], 30))).toFixed(3)}em`;
    el.scrimTop.style.opacity = tEnv.toFixed(3);

    // End card over the held last frame: logo, name, address.
    const eIn = n >= G.end;
    el.scrimBot.style.opacity = E.outCubic(prog(n, G.end, 20)).toFixed(3);
    show(el.end, eIn); show(el.endLogo, eIn);
    el.endLogo.style.opacity = E.outCubic(prog(n, G.end + 4, 14)).toFixed(3);
    rise(el.endName, n, G.end + 8, 16);
    el.endName.style.letterSpacing = `${lerp(0.26, 0.12, E.outCubic(prog(n, G.end + 8, 30))).toFixed(3)}em`;
    const ku = E.outExpo(prog(n, G.end + 20, 14));
    el.url.style.opacity = ku.toFixed(3);
    el.urlLine.style.transform = `scaleX(${E.outExpo(prog(n, G.end + 26, 16))})`;
  }

  async function load(img, url) {
    if (!url) { delete img.dataset.src; return; }
    if (img.dataset.src === url) return;
    img.src = url;
    await img.decode();
    img.dataset.src = url;
  }

  async function seek(n) {
    const src = shownSrc(n), sp = speedOf(n);
    const url = plateUrl(src);
    const prev = src - 0.5 * sp;
    const ghostUrl = sp > 1.2 && shotOf(prev) === shotOf(src) ? plateUrl(prev) : null;
    await Promise.all([load(el.main, url), load(el.dof, url), load(el.ghost, ghostUrl)]);
    render(n);
  }

  async function init() {
    await Promise.all([400, 500, 600].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img[src]').map(i => i.decode()));
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL: TL.TOTAL, seek, ready: init() };
})();
