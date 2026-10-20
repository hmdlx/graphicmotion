// Whirlpool SUNSHINE – Reel 9:16. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// Speed ramp and shot boundaries come from timeline.js, point tracks from tracks.js.
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
    logo: [6, out(52)],
    title: [10, out(52)],
    brackets: [18, out(56)],
    zoom: [out(56), out(TL.CUTS.B)],
    water: [out(76), out(92)],
    panel: [out(114), out(131)],
    jets: [out(150), out(174)],
    flare: out(TL.CUTS.C),
    claim: [out(195), out(212)],
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
  function trackAt(name, src) {
    const tr = window.TRACKS && window.TRACKS[name];
    if (!tr) return null;
    const f0 = clamp(Math.floor(src), tr.first, tr.last), f1 = clamp(f0 + 1, tr.first, tr.last);
    const a = tr.frames[f0], b = tr.frames[f1], k = src - Math.floor(src);
    if (!a || !b) return null;
    const pts = a.map((p, i) => [lerp(p[0], b[i][0], k), lerp(p[1], b[i][1], k)]);
    return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  }

  // ---------------------------------------------------------------- elements
  const el = {
    cam: $('#cam'), main: $('#main'), ghost: $('#ghost'), dof: $('#dof'),
    flare: $('#flare'), flash: $('#flash'), noise: $('#noise-t'),
    scrimTop: $('#scrim-top'), scrimBot: $('#scrim-bot'),
    logo: $('#logo'), title: $('#title'), titleLns: $$('#title .ln > span'), titleName: $('#title .name > .ln > span'),
    rule: $('#title .rule'), brackets: [0, 1, 2, 3].map(i => $(`#br-${i}`)),
    chips: { water: $('#chip-water'), panel: $('#chip-panel'), jets: $('#chip-jets') },
    ptr: { panel: $('#ptr-panel'), jets: $('#ptr-jets') },
    claim: $('#claim'), claimLns: $$('#claim .ln > span'),
    end: $('#end'), endLns: $$('#end .ln > span'), endLogo: $('#end-logo'),
    btn: $('#cta .btn'), arrow: $('#cta .btn svg'), url: $('#cta .url'), urlLine: $('#cta .url i'),
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
  const toStage = (p, cam) => [cam.f[0] + (p[0] - cam.f[0]) * cam.s, cam.f[1] + (p[1] - cam.f[1]) * cam.s];

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

    // Opening: logo + title, then brackets lock onto the whirlpool.
    const tEnv = env(n, G.title, 12, 10);
    el.logo.style.opacity = env(n, G.logo, 14, 10).toFixed(3);
    show(el.title, tEnv > 0.001);
    el.title.style.opacity = tEnv.toFixed(3);
    el.title.style.filter = tEnv < 0.999 && n > G.title[1] ? `blur(${((1 - tEnv) * 8).toFixed(1)}px)` : 'none';
    el.titleLns.forEach((s, i) => rise(s, n, G.title[0] + [0, 6, 0, 22][i] + (i === 3 ? 0 : 0), 16));
    el.titleName.style.letterSpacing = `${lerp(0.32, 0.12, E.outCubic(prog(n, G.title[0] + 6, 30))).toFixed(3)}em`;
    el.rule.style.transform = `scaleX(${E.outExpo(prog(n, G.title[0] + 18, 16))})`;

    const bEnv = env(n, G.brackets, 1, 8);
    const bk = E.outExpo(prog(n, G.brackets[0], 22));
    const showBr = shot === 'A' && box && bEnv > 0.001;
    el.brackets.forEach((p, i) => {
      show(p, showBr);
      if (!showBr) return;
      const pad = 34, arm = 74 * bk;
      const x = i % 2 ? box[2] + pad : box[0] - pad, y = i < 2 ? box[1] - pad : box[3] + pad;
      let [sx, sy] = toStage([x, y], cam);
      sx = clamp(sx, 30, 1050);
      const dx = i % 2 ? -arm : arm, dy = i < 2 ? arm : -arm;
      p.setAttribute('d', `M${(sx + dx).toFixed(1)} ${sy.toFixed(1)}H${sx.toFixed(1)}V${(sy + dy).toFixed(1)}`);
      p.style.opacity = bEnv.toFixed(3);
    });

    // Feature chips; panel + jets get a pointer onto the tracked detail.
    for (const [name, chip] of Object.entries(el.chips)) {
      const win = G[name], e = env(n, win, 1, 8);
      show(chip, e > 0.001);
      if (e <= 0.001) { if (el.ptr[name]) show(el.ptr[name], false); continue; }
      const w = E.outExpo(prog(n, win[0], 12));
      chip.style.clipPath = `inset(-60px ${((1 - w) * 100).toFixed(2)}% -60px 0)`;
      chip.style.opacity = e.toFixed(3);
      chip.style.transform = `translateY(${(-12 * (1 - e) * (n > win[1] ? 1 : 0)).toFixed(1)}px)`;
      $$('.ln > span', chip).forEach((s, i) => rise(s, n, win[0] + 4 + i * 4));
      const ptr = el.ptr[name];
      if (!ptr) continue;
      const tp = trackAt(name, src);
      show(ptr, !!tp);
      if (!tp) continue;
      const [tx, ty] = toStage(tp, cam);
      const ax = chip.offsetLeft + 36, ay = chip.offsetTop;
      const lk = E.inOutCubic(prog(n, win[0] + 8, 12));
      const line = $('line', ptr);
      line.setAttribute('x1', ax); line.setAttribute('y1', ay);
      line.setAttribute('x2', lerp(ax, tx, lk).toFixed(1)); line.setAttribute('y2', lerp(ay, ty, lk).toFixed(1));
      const rk = E.outBack(prog(n, win[0] + 18, 10));
      const [ring, core] = $$('circle', ptr);
      for (const c of [ring, core]) { c.setAttribute('cx', tx.toFixed(1)); c.setAttribute('cy', ty.toFixed(1)); }
      const ph = ((n - win[0] - 28) / FPS % 1.2 + 1.2) % 1.2 / 1.2;
      ring.setAttribute('r', (12 * rk * (n > win[0] + 28 ? 1 + 0.6 * ph : 1)).toFixed(1));
      ring.style.opacity = (n > win[0] + 28 ? 1 - ph : 1).toFixed(3);
      core.setAttribute('r', (5 * rk).toFixed(1));
      ptr.style.opacity = e.toFixed(3);
    }

    // Closing line, then the end card over the held last frame.
    const cEnv = env(n, G.claim, 12, 10);
    show(el.claim, cEnv > 0.001);
    el.claim.style.opacity = cEnv.toFixed(3);
    el.claimLns.forEach((s, i) => rise(s, n, G.claim[0] + i * 5, 16));
    el.scrimTop.style.opacity = Math.max(tEnv, cEnv).toFixed(3);

    const eIn = n >= G.end;
    el.scrimBot.style.opacity = E.outCubic(prog(n, G.end, 20)).toFixed(3);
    show(el.end, eIn); show(el.endLogo, eIn);
    el.endLogo.style.opacity = E.outCubic(prog(n, G.end + 4, 14)).toFixed(3);
    el.endLns.forEach((s, i) => rise(s, n, G.end + 8 + i * 5, 16));
    const kb = E.outExpo(prog(n, G.end + 22, 14));
    el.btn.style.clipPath = `inset(0 ${((1 - kb) * 100).toFixed(2)}% 0 0)`;
    const ku = E.outExpo(prog(n, G.end + 28, 14));
    el.url.style.opacity = ku.toFixed(3);
    el.url.style.transform = `translateX(${((1 - ku) * -20).toFixed(1)}px)`;
    el.urlLine.style.transform = `scaleX(${E.outExpo(prog(n, G.end + 34, 16))})`;
    const nudge = n > G.end + 44 ? Math.pow(Math.sin(Math.PI * (((n - G.end - 44) / FPS % 1.2) / 1.2)), 2) : 0;
    el.arrow.style.transform = `translateX(${(nudge * 7).toFixed(1)}px)`;
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
