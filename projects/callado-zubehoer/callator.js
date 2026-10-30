// CALLADO Zubehör – Kapitel 05 CALLATOR 16:9. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
//
// Inserted between chapter 04 (Schrägelement) and the night finale of the film:
//   whip   – the film's chapter 04 (logo-free plates) whips out to the left, the CALLATOR shot
//            (Higgsfield: Nano Banana Pro keyframes → Kling 4.0) slides in from the right;
//   05     – chapter title in the film's light-scene style over the AI shot;
//   flash  – exposure flash cut into the film's night finale, picked up after its chapter-04
//            title has left (FILM.night);
//   list   – the finale lists the accessories one by one; „▪ CALLATOR“ joins as fifth item.
// The finished film continues the source at FILM.night[1] + 1 (scripts/cutlist.sh, package.json).
(() => {
  const FPS = 30;
  const W = 1920, H = 1080;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/callado-zubehoer/plates';
  const AI_DIR = `${PLATE_DIR}/../ai/C`;

  // Film source frames. `out`: chapter 04 frames carried by the whip (logo-free c%04d.jpg);
  // `night`: finale frames played after the flash cut – keep in sync with package.json.
  const FILM = { out: [718, 724], night: [743, 875] };
  const CUT = 120;                                   // flash cut into the night finale
  const TOTAL = CUT + FILM.night[1] - FILM.night[0] + 1;

  // AI shot: source frames `src` (24 fps) played over output frames [0, CUT) – fractional
  // steps are blended, so 0.8 source frames per output frame is real time.
  const AI = { src: [0, 95] };

  const WHIP = 14;                                   // like the film's own whips (≈ 13 frames)
  // Graphics timeline, output frames.
  const T = {
    kicker: 15, title: 19, sub: 25,                  // chapter title builds once the whip has landed
    out: CUT - 13,                                   // and leaves before the flash
    flash: 5,                                        // frames of burn-out before / settle after the cut
  };
  // „▪ CALLATOR“ in the finale's list, in film frames: the four items there start at 778, 782.5,
  // 786.5 and 789.5 and leave from 861 in steps of ≈ 1.7 frames (measured).
  const ITEM = { in: 793.5, out: 868 };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (n, start, dur) => clamp((n - start) / dur);
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
    inOutQuint: k => (k < 0.5 ? 16 * Math.pow(k, 5) : 1 - Math.pow(-2 * k + 2, 5) / 2),
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  const pad = f => String(f).padStart(4, '0');

  // Masked line: rises in from below, leaves upwards.
  function rise(span, n, tin, tout = null, din = 20, dout = 10) {
    const a = E.outExpo(prog(n, tin, din));
    const b = tout == null ? 0 : E.inCubic(prog(n, tout, dout));
    span.style.transform = `translateY(${((1 - a) * 110 - b * 110).toFixed(2)}%)`;
  }

  const el = {
    ai: $('#ai'), aiImgs: $$('#ai img'), film: $('#film'), filmImg: $('#film img'), blur: $('#hblur-g'),
    num: $('#kicker .num > span'), rule: $('#kicker i'), label: $('#kicker .label > span'),
    title: $('#title .ln > span'), sub: $('#sub .ln > span'), item: $('#item'), logo: $('#logo'),
  };

  // What the frame shows, before any image is loaded.
  function frameState(n) {
    const st = { n };
    if (n < CUT) {
      const [a, b] = AI.src;
      const p = a + n * (b - a) / (CUT - 1);
      st.ai = { base: Math.floor(p + 1e-6) };
      st.ai.frac = st.ai.base < b ? p - st.ai.base : 0;
      if (n < WHIP) st.film = `${PLATE_DIR}/c${pad(Math.min(FILM.out[0] + n, FILM.out[1]))}.jpg`;
    } else {
      st.film = `${PLATE_DIR}/f${pad(FILM.night[0] + n - CUT)}.jpg`;
    }
    return st;
  }

  function render(st) {
    const n = st.n;
    const [a, b] = el.aiImgs;
    show(el.ai, !!st.ai);
    show(el.film, !!st.film);
    if (st.ai) { b.style.opacity = st.ai.frac.toFixed(3); show(b, st.ai.frac > 0.001); }

    // Whip: chapter 04 leaves to the left, the gate arrives from the right, both smeared.
    const k = E.inOutQuint(prog(n, 0, WHIP));
    const whip = n < WHIP;
    const blurPx = whip ? 90 * Math.pow(Math.sin(Math.PI * k), 1.5) : 0;
    el.blur.setAttribute('stdDeviation', `${blurPx.toFixed(1)} 0`);
    el.film.style.transform = whip ? `translateX(${(-W * k).toFixed(1)}px)` : 'none';
    el.ai.style.transform = whip ? `translateX(${(W * (1 - k)).toFixed(1)}px)` : 'none';
    for (const l of [el.film, el.ai]) l.style.filter = whip && blurPx > 1 ? 'url(#hblur)' : 'none';

    // Flash cut into the night finale.
    if (n < CUT) {
      const fl = E.inCubic(prog(n, CUT - T.flash, T.flash));
      el.ai.style.filter = fl > 0.001 ? `brightness(${(1 + 1.3 * fl).toFixed(3)})` : el.ai.style.filter;
    } else {
      const fl = 1 - E.outCubic(prog(n, CUT, T.flash + 3));
      el.film.style.filter = fl > 0.001 ? `brightness(${(1 + 1.1 * fl).toFixed(3)})` : 'none';
    }

    // Chapter 05 title (light-scene style) and the navy logo, up to the cut.
    show(el.logo, n < CUT);
    for (const node of [$('#kicker'), $('#title'), $('#sub')]) show(node, n < CUT);
    rise(el.num, n, T.kicker, T.out);
    el.rule.style.transform = `scaleX(${(E.outExpo(prog(n, T.kicker + 3, 16)) * (1 - E.inCubic(prog(n, T.out, 8)))).toFixed(3)})`;
    rise(el.label, n, T.kicker + 5, T.out + 1);
    rise(el.title, n, T.title, T.out + 2, 22);
    rise(el.sub, n, T.sub, T.out + 3);

    // „▪ CALLATOR“ joins the finale's list: rises in like its neighbours, leaves upwards.
    const f = n - CUT + FILM.night[0];
    const kin = E.outCubic(prog(f, ITEM.in, 10)), kout = E.inCubic(prog(f, ITEM.out, 6));
    const op = kin * (1 - kout);
    show(el.item, n >= CUT && op > 0.001);
    el.item.style.opacity = op.toFixed(3);
    el.item.style.transform = `translateY(${((1 - kin) * 18 - kout * 14).toFixed(2)}px)`;
  }

  async function setPlate(img, src) {
    if (img.dataset.src === src) return;
    img.src = src;
    await img.decode();
    img.dataset.src = src;
  }

  async function seek(n) {
    const st = frameState(n);
    const [a, b] = el.aiImgs;
    const jobs = [];
    if (st.ai) {
      jobs.push(setPlate(a, `${AI_DIR}/f${pad(st.ai.base)}.jpg`));
      if (st.ai.frac > 0.001) jobs.push(setPlate(b, `${AI_DIR}/f${pad(st.ai.base + 1)}.jpg`));
    }
    if (st.film) jobs.push(setPlate(el.filmImg, st.film));
    await Promise.all(jobs);
    render(st);
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    el.logo.src = `${PLATE_DIR}/../logo_light.png`;
    await el.logo.decode();
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, W, H, CUT, FILM, seek, ready: init() };
})();
