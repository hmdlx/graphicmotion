// Black Friday – Story 9:16. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// The loop starts and ends on black, so the clip can run on repeat.
(() => {
  const FPS = 30;
  const W = 1080, H = 1920;
  const LOOP = 8;                // seconds; background motion is periodic over this
  const TOTAL = LOOP * FPS;      // 240 frames

  // Timeline, output seconds.
  const T = {
    bg: [0.0, 0.8],              // backdrop fades in
    horizon: [0.15, 0.7],        // horizon line draws from the centre
    head: [0.35, 1.1],           // BLACK FRIDAY: CRT line opens, blur + warp settle
    deal: [1.05, 0.9],           // -25% auf alles
    logo: [1.6, 0.6],
    sweeps: [[2.0, 1.6], [4.6, 1.4]],
    out: [6.95, 0.6],            // blur + warp rise again
    collapse: [7.45, 0.22],      // CRT off: everything folds into a line
    flash: 7.62,
    end: [7.4, 0.5],             // backdrop fades out
  };
  // Glitch bursts: [start, dur, strength].
  const GLITCH = [[0.82, 0.18, 1], [2.7, 0.12, 0.6], [3.9, 0.2, 1], [5.15, 0.1, 0.5], [6.0, 0.16, 0.8], [6.95, 0.55, 1.2]];
  const SLICES = 9;
  const STREAKS = 8;

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, [start, dur]) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  };
  // Seeded hash -> [0, 1): same frame, same noise.
  const rnd = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const TAU = Math.PI * 2;

  let heads = [], deals = [], slices = [], streaks = [];

  function build() {
    const tpl = $('#tpl');
    const clone = cls => { const node = tpl.content.firstElementChild.cloneNode(true); node.classList.add(cls); return node; };
    for (const cls of ['r', 'c', 'w']) $('#channels').append(clone(cls));
    $('#glow').append(clone('w'));
    for (let i = 0; i < SLICES; i++) {
      const s = document.createElement('div');
      s.className = 'slice';
      s.append(clone(['c', 'w', 'r'][i % 3]));
      $('#slices').append(s);
    }
    heads = $$('#title .head');
    deals = $$('#title .deal');
    slices = $$('#slices .slice');
    for (let i = 0; i < STREAKS; i++) {
      const s = document.createElement('div');
      s.className = 'streak';
      $('#streaks').append(s);
      streaks.push({
        el: s,
        y: 180 + rnd(i, 1) * 1560,
        w: 220 + rnd(i, 2) * 520,
        phase: rnd(i, 3),
        laps: 1 + Math.floor(rnd(i, 4) * 3),   // whole laps per loop keep it seamless
        dir: rnd(i, 5) < 0.5 ? 1 : -1,
        a: 0.25 + rnd(i, 6) * 0.55,
      });
      s.style.width = streaks[i].w + 'px';
    }
  }

  function glitchAt(t, n) {
    let g = 0;
    for (const [start, dur, str] of GLITCH) {
      if (t < start || t > start + dur) continue;
      // Flicker inside the burst: roughly two of three frames are hit.
      if (rnd(n, 7) < 0.68) g = Math.max(g, str * (0.6 + 0.4 * rnd(n, 8)));
    }
    return g;
  }

  function seek(n) {
    const t = n / FPS;
    const a = (TAU * t) / LOOP;
    const g = glitchAt(t, n);

    // Backdrop
    const bg = E.outCubic(prog(t, T.bg)) * (1 - prog(t, T.end));
    $('#bg').style.opacity = bg;
    const blob = (id, x, y, size, op) => {
      const el = $(id);
      el.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
      el.style.opacity = op;
    };
    blob('#b1', 540 + 260 * Math.sin(a), 760 + 220 * Math.cos(a), 900, 0.95);
    blob('#b2', 320 + 220 * Math.cos(a + 1), 1320 + 160 * Math.sin(2 * a), 760, 0.42);
    blob('#b3', 800 + 180 * Math.sin(a + 2), 980 + 280 * Math.cos(a + 0.6), 680, 0.22 + 0.06 * Math.sin(3 * a));

    // Grid rushes towards the viewer; 4 cells per loop keeps it seamless.
    const cell = (t / LOOP) * 4 * 120;
    $('#floor').style.backgroundPosition = `0 ${cell}px`;
    $('#ceiling').style.backgroundPosition = `0 ${-cell}px`;
    $('#grid').style.opacity = bg * 0.55;
    const hz = E.outExpo(prog(t, T.horizon));
    $('#horizon').style.transform = `scaleX(${hz})`;
    $('#horizon').style.opacity = bg * (0.75 + 0.25 * Math.sin(4 * a)) * (1 - 0.6 * g);

    // Ghost type: huge, smeared and warped, drifting through the back.
    const ghost = $('#ghost');
    ghost.style.transform = `translate(${200 - (t / LOOP) * 1900}px, 330px) rotate(-7deg) skewX(-14deg) scaleY(${1.15 + 0.08 * Math.sin(a)})`;
    ghost.style.filter = `url(#ghost-warp) blur(${16 + 6 * Math.sin(2 * a)}px)`;
    ghost.style.opacity = bg * 0.5;
    $('#ghost-noise').setAttribute('baseFrequency', `${0.003 + 0.001 * Math.sin(a)} ${0.012 + 0.004 * Math.cos(a)}`);

    for (const s of streaks) {
      const span = W + s.w * 2;
      const p = (s.phase + s.dir * s.laps * (t / LOOP)) % 1;
      const x = ((p + 1) % 1) * span - s.w;
      s.el.style.transform = `translate(${x}px, ${s.y}px)`;
      s.el.style.opacity = bg * s.a;
    }

    // Headline
    const kh = E.outExpo(prog(t, T.head));
    const kd = E.outExpo(prog(t, T.deal));
    const ko = E.inExpo(prog(t, T.out));
    const kc = E.inOutCubic(prog(t, T.collapse));
    const crt = E.outExpo(prog(t, [T.head[0], 0.45]));          // line opens to full height
    const breathe = Math.sin(TAU * t / 1.6);

    const line = (els, k, extraBlur) => {
      const blur = 46 * (1 - k) + extraBlur;
      const sx = 1 + 1.3 * (1 - k);
      const op = clamp(k * 3);
      for (const el of els) {
        el.style.transform = `scaleX(${sx})`;
        el.style.filter = blur > 0.05 ? `blur(${blur}px)` : 'none';
        el.style.opacity = op;
      }
    };
    line(heads, kh, 40 * ko);
    line(deals, kd, 40 * ko);

    const push = 1 + 0.035 * prog(t, [1.4, 5.5]);
    const title = $('#title');
    const sy = lerp(0.015, 1, crt) * lerp(1, 0.004, kc);
    const sxAll = push * (1 + 0.6 * ko) * lerp(1, 1.25, kc);
    const shake = g ? (rnd(n, 9) - 0.5) * 40 * g : 0;
    title.style.transform = `translateX(${shake}px) scale(${sxAll}, ${push * sy})`;
    title.style.transformOrigin = '50% 900px';
    title.style.opacity = 1 - prog(t, [T.flash + 0.05, 0.15]);

    // Chromatic split: wide on entry, breathing while held, spikes on glitches.
    const off = 5 + 2.5 * breathe + 70 * (1 - kh) + 34 * g + 60 * ko;
    const yOff = 0.25 * off * (g ? rnd(n, 10) * 2 - 1 : 0.4);
    $('#channels .r').style.transform = `translate(${-off}px, ${yOff}px)`;
    $('#channels .c').style.transform = `translate(${off}px, ${-yOff}px)`;

    // VHS warp: bands re-roll 12× per second, gently while held.
    const warp = 9 + 4 * breathe + 240 * (1 - kh) + 90 * g + 260 * ko;
    $('#warp-map').setAttribute('scale', warp.toFixed(2));
    $('#warp-noise').setAttribute('seed', String(1 + (Math.floor(t * 12) % 96)));
    $('#warp-noise').setAttribute('baseFrequency', `${0.0012 + 0.0008 * (g + ko)} ${0.035 + 0.02 * g}`);

    // Glow doubles as a sideways smear, so the type never sits fully sharp.
    const glow = $('#glow');
    glow.style.opacity = (0.5 + 0.15 * breathe + 0.4 * g) * kh * (1 - ko * 0.5);
    glow.style.transform = `translateX(${30 * Math.sin(a * 2)}px) scaleX(${1.12 + 0.04 * breathe})`;

    // Glitch slices: horizontal bands of the headline, torn sideways.
    $('#slices').style.display = g ? '' : 'none';
    if (g) {
      for (let i = 0; i < SLICES; i++) {
        const s = slices[i];
        const y = 500 + rnd(n, 20 + i) * 760;
        const h = 14 + rnd(n, 40 + i) * 120;
        const dx = (rnd(n, 60 + i) - 0.5) * 2 * (60 + 180 * g);
        s.style.clipPath = `inset(${y}px 0 ${H - y - h}px 0)`;
        s.style.transform = `translateX(${dx}px)`;
        s.style.opacity = rnd(n, 80 + i) < 0.85 ? 1 : 0;
      }
    }

    // Screen texture
    const sweep = $('#sweep');
    let sv = 0, sy0 = 0;
    for (const sw of T.sweeps) {
      const k = prog(t, sw);
      if (k > 0 && k < 1) { sv = Math.sin(Math.PI * k); sy0 = lerp(-300, H + 40, E.inOutCubic(k)); }
    }
    sweep.style.opacity = sv;
    sweep.style.transform = `translateY(${sy0}px)`;
    $('#scan').style.backgroundPosition = `0 ${(n * 2) % 6}px`;
    $('#scan').style.opacity = 0.9 + 0.1 * g;
    $('#grain-noise').setAttribute('seed', String(1 + (n % 24)));

    const kl = E.outCubic(prog(t, T.logo)) * (1 - prog(t, [T.out[0], 0.35]));
    $('#logo').style.opacity = 0.85 * kl;
    $('#logo').style.transform = `translateY(${18 * (1 - kl)}px)`;
    $('#rule').style.opacity = kl;
    $('#rule').style.transform = `scaleX(${kl})`;

    // Short flash when the picture folds away.
    $('#flash').style.opacity = Math.max(0, 1 - Math.abs(t - T.flash) / 0.08) * 0.35;
  }

  async function init() {
    build();
    await Promise.all([400, 500, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await new Promise(r => { const img = $('#logo img'); img.complete ? r() : (img.onload = img.onerror = r); });
    const q = new URLSearchParams(location.search).get('t');
    seek(q ? Math.round(parseFloat(q) * FPS) : Math.round(3.5 * FPS));
  }
  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
