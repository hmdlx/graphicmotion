// LAMESA – Reel 9:16. The finished clip plays untouched; a paper plate rises over its
// last shot and carries the colour scene and the logo outro.
// Deterministic, frame-addressed: window.COMP.seek(n) puts the stage into output frame n.
(() => {
  const FPS = 24;                // same rate as the source clip, so its frames map 1:1
  const W = 1080, H = 1920;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/lamesa/plates';
  const LAST_PLATE = 240;        // last frame of the source clip (10.04 s)
  const TOTAL = 426;             // 17.75 s

  // Timeline, output seconds.
  const T = {
    plate: [9.45, 1.05],         // paper rises over the last shot (start, duration)
    head: 10.30,                 // "Erhältlich in / zwei Farben"
    rule: 10.80,
    light: 10.55,                // Freisteller hell
    dark: 10.85,                 // Freisteller schwarz
    out: 13.55,                  // colour scene leaves
    logo: 14.30,                 // icon, then the wordmark resolves out of it
  };

  // Freisteller: crop window in source px, display scale, and the source point
  // (table centre) that lands on the stage anchor.
  const CROP = { x: 80, y: 600, w: 1840, h: 1040 };
  const SCALE = 0.52;
  const FOCUS = { x: 996, y: 1100 };
  const ANCHOR = { light: [540, 900], dark: [540, 1390] };

  // Logo geometry, SVG units (viewBox 0 0 257.065 26.426).
  const LOGO_W = 257.065, ICON_W = 30.694, ICON_C = [15.35, 13.2];
  const SHIFT0 = LOGO_W / 2 - ICON_W / 2;      // icon starts centred on the stage
  const WIPE = {                               // soft wipes of the two letter groups
    ome: { x: 30.8, w: 86, feather: 14 },
    deluxe: { x: 117, w: 141, feather: 20 },
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };

  // Masked line rise.
  function rise(span, t, tin, dur = 1.2) {
    const k = E.outExpo(prog(t, tin, dur));
    span.style.transform = `translateY(${(1 - k) * 110}%)`;
  }

  // Freisteller entrance: a feathered mask opens upwards while the table rises (no
  // opacity fade, so the colours never pass through grey), a slow upward float while
  // on, then a soft fade upwards.
  function float(node, t, tin, tout, { dist = 60, din = 1.4, dout = 0.6, feather = 35 } = {}) {
    const a = E.inOutCubic(prog(t, tin, din * 0.8));
    const b = E.inCubic(prog(t, tout, dout));
    const y = (1 - E.outExpo(prog(t, tin, din))) * dist - Math.max(0, t - tin) * 4 - b * 36;
    const edge = (100 + feather) * a - feather;  // % from the bottom of the window
    node.style.maskImage = a < 1 ? `linear-gradient(to top, #000 ${edge.toFixed(2)}%, transparent ${(edge + feather).toFixed(2)}%)` : 'none';
    node.style.opacity = (1 - b).toFixed(3);
    node.style.transform = `translateY(${y.toFixed(2)}px)`;
    show(node, a > 0 && b < 1);
  }

  // ---------------------------------------------------------------- elements
  const el = {
    footage: $('#footage img'), dim: $('#dim'), plate: $('#plate'),
    headline: $('#headline'), lines: $$('#headline .ln > span'), rule: $('#rule'),
    light: $('#p-light'), dark: $('#p-dark'),
    logo: $('#logo'), shift: $('#logo-shift'), icon: $('#logo-icon'),
    ome: $('#logo-ome'), deluxe: $('#logo-deluxe'),
    omeWipe: $('#wipe-ome'), deluxeWipe: $('#wipe-deluxe'),
  };

  // Wipe a mask open to the right: solid area up to the edge, feathered edge ahead of it.
  function featherWipe(mask, { x, w, feather }, k) {
    const edge = x + (w + feather) * k;
    const solid = Math.max(0, edge - feather - x);
    mask.querySelector('.solid').setAttribute('width', solid.toFixed(3));
    const soft = mask.querySelector('.soft');
    soft.setAttribute('x', Math.max(x, edge - feather).toFixed(3));
    soft.setAttribute('width', Math.max(0, Math.min(feather, edge - x)).toFixed(3));
  }

  function placeProduct(node, [ax, ay]) {
    Object.assign(node.style, {
      left: `${ax - (FOCUS.x - CROP.x) * SCALE}px`, top: `${ay - (FOCUS.y - CROP.y) * SCALE}px`,
      width: `${CROP.w * SCALE}px`, height: `${CROP.h * SCALE}px`,
    });
    Object.assign(node.firstElementChild.style, {
      left: `${-CROP.x * SCALE}px`, top: `${-CROP.y * SCALE}px`, width: `${2000 * SCALE}px`,
    });
  }

  // ---------------------------------------------------------------- render
  function render(n) {
    const t = n / FPS;

    // Paper plate rises; the last shot drifts up under it and dims a touch.
    const k = E.inOutCubic(prog(t, T.plate[0], T.plate[1]));
    el.plate.style.display = k > 0 ? '' : 'none';
    el.plate.style.transform = `translateY(${((1 - k) * H).toFixed(2)}px)`;
    el.footage.style.transform = `translateY(${(-0.2 * H * k).toFixed(2)}px)`;
    el.dim.style.opacity = (0.22 * k).toFixed(3);
    show(el.footage, k < 1);

    // Colour scene.
    rise(el.lines[0], t, T.head);
    rise(el.lines[1], t, T.head + 0.12);
    const hb = E.inCubic(prog(t, T.out, 0.6));
    el.headline.style.opacity = (1 - hb).toFixed(3);
    el.headline.style.transform = `translateY(${(-hb * 36).toFixed(2)}px)`;
    show(el.headline, t >= T.head && hb < 1);
    const rk = E.inOutCubic(prog(t, T.rule, 0.9));
    el.rule.style.transform = `translateY(${(-hb * 36).toFixed(2)}px) scaleX(${rk.toFixed(4)})`;
    el.rule.style.opacity = (1 - hb).toFixed(3);
    show(el.rule, rk > 0 && hb < 1);
    float(el.light, t, T.light, T.out + 0.08);
    float(el.dark, t, T.dark, T.out + 0.16);

    // Logo: icon fades in centred, slides to its place while HOME is wiped on behind it
    // (letters read left to right), DELUXE wipes on after; then a slow settle.
    const ik = E.outCubic(prog(t, T.logo, 0.8));
    const sk = E.inOutCubic(prog(t, T.logo + 0.55, 1.25));
    const dk = E.inOutCubic(prog(t, T.logo + 1.25, 1.0));
    show(el.logo, ik > 0);
    el.logo.style.transform = `scale(${(1 + 0.025 * prog(t, T.logo, (TOTAL / FPS) - T.logo)).toFixed(4)})`;
    el.icon.style.opacity = ik.toFixed(3);
    const is = 0.88 + 0.12 * ik;
    el.icon.setAttribute('transform',
      `translate(${ICON_C[0] * (1 - is)} ${ICON_C[1] * (1 - is)}) scale(${is.toFixed(4)})`);
    el.shift.setAttribute('transform', `translate(${(SHIFT0 * (1 - sk)).toFixed(3)} 0)`);
    featherWipe(el.omeWipe, WIPE.ome, sk);
    featherWipe(el.deluxeWipe, WIPE.deluxe, dk);
    el.deluxe.setAttribute('transform', `translate(${(-6 * (1 - dk)).toFixed(3)} 0)`);
  }

  async function seek(n) {
    const src = Math.min(n, LAST_PLATE);
    if (el.footage.dataset.idx !== String(src)) {
      el.footage.src = `${PLATE_DIR}/f${String(src).padStart(4, '0')}.jpg`;
      await el.footage.decode();
      el.footage.dataset.idx = String(src);
    }
    render(n);
  }

  async function init() {
    await Promise.all([400, 500, 600, 700].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    placeProduct(el.light, ANCHOR.light);
    placeProduct(el.dark, ANCHOR.dark);
    await Promise.all($$('.product img').map(img => img.decode()));
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
