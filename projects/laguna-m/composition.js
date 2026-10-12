// Laguna M – Reel 9:16. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of frame n.
(() => {
  const FPS = 30;
  const PLATES = 537;            // frames of the source clip (17.9 s)
  const OFFSET = 12;             // skip the source fade-in from black (0.4 s)
  const TOTAL = 628;             // output frames: 20.93 s incl. end card
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/laguna-m/plates';

  // Box the hero shot shrinks into on the end card (stage px).
  const BOX = { left: 72, top: 520, right: 1008, bottom: 1280 };
  const BOX_FOCUS = { x: 560, y: 1170 };      // plate point that lands in the box centre

  // Timeline in source seconds (output time = source time - OFFSET / FPS).
  const T = {
    logo: 0.40,
    hook: [0.50, 2.62],
    jets: [3.25, 5.70],
    shower: [6.35, 8.70],
    porthole: [9.30, 11.68],
    headrest: [12.15, 14.70],
    hero: 15.45,
    end: 17.20,
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
    outBack: k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };

  // Block wipe: opens left→right, leaves left→right. Shadow bleed stays visible.
  const BLEED = 80;
  function wipe(el, t, tin, tout, din = 0.55, dout = 0.38) {
    const a = E.outExpo(prog(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
    if (a <= 0 || b >= 1) { el.style.visibility = 'hidden'; return; }
    const w = el.offsetWidth + BLEED;
    el.style.visibility = 'visible';
    el.style.clipPath = `inset(-${BLEED}px ${(1 - a) * w - BLEED}px -${BLEED}px ${b * w - BLEED}px)`;
  }

  // Masked line rise.
  function rise(span, t, tin, dur = 0.65) {
    const k = E.outExpo(prog(t, tin, dur));
    span.style.transform = `translateY(${(1 - k) * 108}%)`;
  }

  // Standard stack choreography: blocks wipe in staggered, their lines rise after.
  function stack(root, t, tin, tout, { gap = 0.09, outGap = 0.05 } = {}) {
    $$(':scope > .blk', root).forEach((blk, i) => {
      const bi = tin + i * gap;
      wipe(blk, t, bi, tout == null ? null : tout + i * outGap);
      $$('.ln > span', blk).forEach((s, j) => rise(s, t, bi + 0.12 + j * 0.06));
    });
  }

  // Tracked marker dots.
  function makeDot(parent) {
    const d = document.createElement('div');
    d.className = 'dot';
    d.innerHTML = '<div class="pulse"></div><div class="ring"></div><div class="core"></div>';
    parent.appendChild(d);
    return d;
  }
  function placeDot(d, pos, t, tin, tout) {
    const s = E.outBack(prog(t, tin, 0.42)) * (1 - E.inCubic(prog(t, tout, 0.25)));
    if (!pos || s <= 0.001) { d.style.visibility = 'hidden'; return; }
    d.style.visibility = 'visible';
    d.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`;
    $('.core', d).style.transform = `translate(-50%, -50%) scale(${s})`;
    $('.ring', d).style.transform = `translate(-50%, -50%) scale(${s})`;
    const ph = (((t - tin - 0.25) % 1.1) + 1.1) % 1.1 / 1.1;
    const pulse = $('.pulse', d);
    pulse.style.transform = `translate(-50%, -50%) scale(${1 + 1.5 * ph})`;
    pulse.style.opacity = t > tin + 0.25 ? (0.85 * (1 - ph) * Math.min(1, s)).toFixed(3) : 0;
  }
  const trackAt = (name, n) => {
    const tr = window.TRACKS && window.TRACKS[name];
    return tr && tr.frames[String(n)] ? tr.frames[String(n)] : null;
  };

  // ---------------------------------------------------------------- elements
  const el = {
    footage: $('#footage'), plate: $('#plate'),
    logo: $('#logo'), hook: $('#hook'), jets: $('#jets'), shower: $('#shower'),
    porthole: $('#porthole'), headrest: $('#headrest'), hero: $('#hero'),
    count: $('#jets-count'), line: $('#ptr-line'), frameRect: $('#frame-rect'),
    chips: $$('#chips .chip'), btn: $('#cta .btn'), arrow: $('#cta .btn svg'),
    url: $('#cta .url'), urlLine: $('#cta .url i'), slogan: $('#slogan .ln > span'),
  };
  const dotsLayer = $('#dots');
  const jetDots = Array.from({ length: 14 }, () => makeDot(dotsLayer));
  const portDot = makeDot(dotsLayer);
  let ptrStart = null;

  // Count-up in three stages so each row lands with its share of the total.
  const STAGES = [ // [start, dur, from, to]
    [3.55, 0.32, 0, 4],
    [3.97, 0.32, 4, 10],
    [4.39, 0.62, 10, 26],
  ];
  function jetsCount(t) {
    let v = 0;
    for (const [s, d, a, b] of STAGES) if (t >= s) v = lerp(a, b, E.outCubic(prog(t, s, d)));
    return Math.round(v);
  }

  function render(t, n) {
    // Footage + end-card shrink.
    const e = E.inOutCubic(prog(t, T.end, 0.85));
    el.footage.style.clipPath = `inset(${BOX.top * e}px ${(1080 - BOX.right) * e}px ${(1920 - BOX.bottom) * e}px ${BOX.left * e}px)`;
    const cx = (BOX.left + BOX.right) / 2, cy = (BOX.top + BOX.bottom) / 2;
    const kb = 1 + 0.06 * prog(t, 15.4, (TOTAL + OFFSET) / FPS - 15.4);
    el.plate.style.transform = `translate(${(cx - BOX_FOCUS.x) * e}px, ${(cy - BOX_FOCUS.y) * e}px) scale(${kb})`;
    const per = 2 * (964 + 788);
    const fr = E.inOutCubic(prog(t, T.end + 0.65, 0.9));
    el.frameRect.style.strokeDasharray = per;
    el.frameRect.style.strokeDashoffset = per * (1 - fr);
    el.frameRect.style.visibility = fr > 0 ? 'visible' : 'hidden';

    // Persistent logo plate.
    wipe(el.logo, t, T.logo, null, 0.6);

    // 00 Hook.
    stack(el.hook, t, T.hook[0], T.hook[1], { gap: 0.11, outGap: 0.06 });

    // 01 Massage: card, staged rows, count-up, tracked jets.
    const [jin, jout] = T.jets;
    const [card, ...rows] = $$(':scope > .blk', el.jets);
    wipe(card, t, jin, jout);
    $$('.ln > span', card).forEach((s, j) => rise(s, t, jin + 0.12 + j * 0.06));
    rows.forEach((r, i) => wipe(r, t, STAGES[i][0], jout + 0.05 * (i + 1)));
    el.count.textContent = jetsCount(t);
    const jp = trackAt('jets', n);
    jetDots.forEach((d, i) => {
      const tin = i < 3 ? STAGES[0][0] + i * 0.08 : STAGES[2][0] + (i - 3) * 0.05;
      placeDot(d, jp && jp[i], t, tin, jout - 0.05 + i * 0.012);
    });

    // 02 Komfort.
    stack(el.shower, t, T.shower[0], T.shower[1]);

    // 03 Design: card + tracked pointer onto the porthole.
    const [pin, pout] = T.porthole;
    stack(el.porthole, t, pin, pout);
    const pp = trackAt('porthole', n);
    let target = null;
    if (pp && pp.every(Boolean)) {
      // Centroid of the tracked features + fixed offset to the porthole centre.
      const c = pp.reduce((acc, p) => [acc[0] + p[0] / pp.length, acc[1] + p[1] / pp.length], [0, 0]);
      target = [c[0] + 80, c[1] + 190];
    }
    const draw = E.inOutCubic(prog(t, pin + 0.45, 0.55));
    const retract = E.inCubic(prog(t, pout - 0.12, 0.32));
    if (target && draw > 0 && retract < 1) {
      const [sx, sy] = ptrStart;
      const x1 = lerp(sx, target[0], retract), y1 = lerp(sy, target[1], retract);
      el.line.setAttribute('x1', x1); el.line.setAttribute('y1', y1);
      el.line.setAttribute('x2', lerp(sx, target[0], draw)); el.line.setAttribute('y2', lerp(sy, target[1], draw));
      el.line.style.visibility = 'visible';
    } else {
      el.line.style.visibility = 'hidden';
    }
    placeDot(portDot, target, t, pin + 0.9, pout - 0.05);

    // 04 Ergonomie.
    stack(el.headrest, t, T.headrest[0], T.headrest[1]);

    // Hero title (stays on through the end card).
    stack(el.hero, t, T.hero, null);

    // End card.
    el.chips.forEach((c, i) => {
      const k = E.outExpo(prog(t, T.end + 0.8 + i * 0.08, 0.7));
      c.style.opacity = k.toFixed(3);
      c.style.transform = `translateY(${(1 - k) * 34}px)`;
    });
    wipe(el.btn, t, T.end + 1.15, null, 0.6);
    const ku = E.outExpo(prog(t, T.end + 1.35, 0.6));
    el.url.style.opacity = ku.toFixed(3);
    el.url.style.transform = `translateX(${(1 - ku) * -24}px)`;
    el.urlLine.style.transform = `scaleX(${E.outExpo(prog(t, T.end + 1.55, 0.7))})`;
    const nudge = t > T.end + 1.9 ? Math.pow(Math.sin(Math.PI * (((t - T.end - 1.9) % 1.3) / 1.3)), 2) : 0;
    el.arrow.style.transform = `translateX(${nudge * 9}px)`;
    rise(el.slogan, t, T.end + 1.6);
  }

  async function seek(n) {
    const src = n + OFFSET;          // source frame
    const idx = Math.min(src, PLATES - 1);
    if (el.plate.dataset.idx !== String(idx)) {
      el.plate.src = `${PLATE_DIR}/f${String(idx).padStart(4, '0')}.jpg`;
      await el.plate.decode();
      el.plate.dataset.idx = String(idx);
    }
    render(src / FPS, src);
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await $('#logo img').decode();
    // Pointer starts under the left edge of the porthole card's last block.
    const last = $$(':scope > .blk', el.porthole).pop();
    const r = last.getBoundingClientRect();
    ptrStart = [r.left + 40, r.bottom];
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
