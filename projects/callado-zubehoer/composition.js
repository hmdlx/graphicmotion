// CALLADO Zubehör – Cliffhanger-Intro 16:9. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
//
// Two AI shots (Higgsfield: Nano Banana Pro keyframes → Kling 4.0) build up to the moment the
// light comes on, then the picture cuts to black. Out of the black the film's own opening takes
// over (its LED stripe flares up) under the logo matte, because the film only fades its logo in
// there; the finished film continues the source at JOIN (scripts/cutlist.sh, package.json).
(() => {
  const FPS = 30;
  const W = 1920, H = 1080;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/callado-zubehoer/plates';
  const AI_DIR = `${PLATE_DIR}/../ai`;

  const TOTAL = 138;             // 4.6 s: 4.0 s AI intro + 0.6 s of the film under the logo matte
  const JOIN = 62;               // first source frame after the intro – keep in sync with package.json
  const FILM = { at: 120, src: JOIN - 18 };   // logo-free film plates c%04d.jpg on output frames [at, TOTAL)

  // Edit decision list. Each AI shot plays its source frame range `src` on output frames
  // [at, end) – one source frame per output frame, so the 24 fps clips run 1.25× (fractional
  // steps would be blended).
  const SHOTS = [
    { dir: 'B', at: 0, end: 63, src: [6, 68] },      // Totale: Pfostenkappen zünden nacheinander (src 16, 28, 66)
    { dir: 'A', at: 63, end: 114, src: [22, 72] },   // Makro: Licht erwacht in der Nut (src 43), Schnitt kurz vor voll
  ];

  // Graphics timeline, output frames.
  const T = {
    fade: 8,                     // up from black
    logo: 2,
    beat1: [6, 54],              // „Dein Zaun steht.“
    beat2: [67, null],           // „Doch das Beste kommt noch …“ – leaves with the hard cut
    flash: 63,                   // exposure flash over the cut B → A
    black: 114,                  // hard cut to black: the cliffhanger
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (n, start, dur) => clamp((n - start) / dur);
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };

  // Masked line: rises in from below, leaves upwards.
  function rise(span, n, tin, tout = null, din = 22, dout = 9) {
    const a = E.outExpo(prog(n, tin, din));
    const b = tout == null ? 0 : E.inCubic(prog(n, tout, dout));
    span.style.transform = `translateY(${((1 - a) * 108 - b * 108).toFixed(2)}%)`;
  }
  function beat(root, n, [tin, tout]) {
    const [kicker, ...lines] = $$('.ln > span', root);
    show(root, n >= tin && (tout == null || n < tout + 12));
    rise(kicker, n, tin, tout);
    lines.forEach((l, j) => rise(l, n, tin + 4 + 4 * j, tout == null ? null : tout + 1 + j, 26));
  }

  // ---------------------------------------------------------------- footage
  const shotAt = n => SHOTS.find(s => n >= s.at && n < s.end) || null;
  const filmFrame = n => (n >= FILM.at ? FILM.src + n - FILM.at : null);
  function srcPos(s, n) {
    const [a, b] = s.src;
    return clamp(a + (n - s.at) * (b - a) / (s.end - 1 - s.at), a, b);
  }
  const plate = (s, f) => `${AI_DIR}/${s.dir}/f${String(f).padStart(4, '0')}.jpg`;

  // ---------------------------------------------------------------- elements
  const el = {
    footage: $('#footage'), imgs: $$('#footage img'), film: $('#film'), black: $('#black'), logo: $('#logo'),
    beats: $$('.beat'),
  };

  function render(n, st) {
    const [a, b] = el.imgs;
    show(a, !!st); show(b, !!st && st.frac > 0.001);
    if (st) b.style.opacity = st.frac.toFixed(3);
    for (const img of el.imgs) img.style.transform = 'translateY(-50%)';

    // Exposure flash across the cut B → A: the last cap burns out the picture, the macro lands out of it.
    const fl = n < T.flash ? E.inCubic(prog(n, T.flash - 5, 5)) : 1 - E.outCubic(prog(n, T.flash, 8));
    el.footage.style.filter = fl > 0.001 ? `brightness(${(1 + 1.1 * fl).toFixed(3)}) saturate(${(1 - 0.25 * fl).toFixed(3)})` : 'none';

    // Fade up from black, hard cut to black, then the film's opening. The logo stays on top throughout.
    show(el.film, filmFrame(n) != null);
    const fade = n >= FILM.at ? 0 : n >= T.black ? 1 : 1 - E.outCubic(prog(n, 0, T.fade));
    el.black.style.opacity = fade.toFixed(3);
    show(el.black, fade > 0.001);
    el.logo.style.opacity = E.outCubic(prog(n, T.logo, 12)).toFixed(3);

    beat(el.beats[0], n, T.beat1);
    beat(el.beats[1], n, T.beat2);
  }

  async function setPlate(img, src) {
    if (img.dataset.src === src) return;
    img.src = src;
    await img.decode();
    img.dataset.src = src;
  }

  async function seek(n) {
    const s = shotAt(n);
    let st = null;
    if (s) {
      const p = srcPos(s, n), base = Math.floor(p + 1e-6);
      st = { base, frac: base < s.src[1] ? p - base : 0 };
      const [a, b] = el.imgs;
      await Promise.all([setPlate(a, plate(s, base)), st.frac > 0.001 ? setPlate(b, plate(s, base + 1)) : null]);
    }
    const f = filmFrame(n);
    if (f != null) await setPlate(el.film, `${PLATE_DIR}/c${String(f).padStart(4, '0')}.jpg`);
    render(n, st);
  }

  async function init() {
    await Promise.all([400, 600, 700].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    el.logo.src = `${PLATE_DIR}/../logo.png`;
    await el.logo.decode();
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, W, H, JOIN, seek, ready: init() };
})();
