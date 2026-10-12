// Laguna M – Reel 9:16. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
(() => {
  const FPS = 30;
  const W = 1080, H = 1920;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/laguna-m/plates';

  // Edit decision list. `src` is the clean frame range of each shot in the rough
  // cut (its fade-in and soft dissolves are cut away), `at` the output frame on
  // which the shot's first frame lands. Outside its range a shot holds its end frame.
  const SHOTS = {
    A:  { src: [12, 90],   at: 0 },    // Düsen close-up
    B:  { src: [99, 180],  at: 79 },   // Wanne innen
    C:  { src: [189, 267], at: 158 },  // Handbrause
    D:  { src: [276, 357], at: 228 },  // Bullauge
    E1: { src: [366, 380], at: 298 },  // Kopfstütze, zweiter Winkel
    E:  { src: [381, 453], at: 313 },  // Kopfstütze
    F:  { src: [462, 536], at: 386 },  // Totale
  };
  // Transitions, in output frames.
  const X = {
    bands: { in: 60, cut: 79, out: 80, stagger: 1, dur: 10 },   // A → B   Navy-Balken
    whip: [152, 168],                                           // B → C   Reißschwenk
    slats: { start: 224, count: 9, stagger: 1, dur: 10 },       // C → D   Lamellen
    iris: [296, 312],                                           // D → E1  Marker öffnet Fenster
    punch: 313,                                                 // E1 → E  harter Schnitt + Punch-in
    flash: { zoom: 374, cut: 386, fade: 400 },                  // E → F   Lichtblitz
    end: 444,                                                   // F → Endcard
  };
  const TOTAL = 556;             // 18.53 s

  // Box the hero shot shrinks into on the end card (stage px).
  const BOX = { left: 72, top: 520, right: 1008, bottom: 1280 };
  const BOX_FOCUS = { x: 560, y: 1170 };      // plate point that lands in the box centre

  // Graphics timeline, output seconds.
  const T = {
    logo: 0.05,
    hook: 0.10,
    jets: 2.95,                  // card rides out with the whip, no own exit
    shower: [5.35, 7.00],
    porthole: [7.95, 9.30],
    headrest: [10.20, 12.10],
    hero: 13.20,
    end: X.end / FPS,
  };
  // Count-up in three stages so each row lands with its share of the total.
  const STAGES = [ // [start, dur, from, to]
    [3.15, 0.28, 0, 4],
    [3.47, 0.28, 4, 10],
    [3.79, 0.55, 10, 26],
  ];

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
    inOutQuint: k => (k < 0.5 ? 16 * Math.pow(k, 5) : 1 - Math.pow(-2 * k + 2, 5) / 2),
    outBack: k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const srcOf = (name, n) => { const s = SHOTS[name]; return clamp(s.src[0] + n - s.at, s.src[0], s.src[1]); };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  // Containers: children set their own visibility, so hide the whole box instead.
  const showBox = (node, on) => { node.style.display = on ? '' : 'none'; };

  // Block wipe: opens left→right, leaves left→right. Shadow bleed stays visible.
  const BLEED = 80;
  function wipe(el, t, tin, tout, din = 0.55, dout = 0.38) {
    const a = E.outExpo(prog(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
    if (a <= 0 || b >= 1) { show(el, false); return; }
    const w = el.offsetWidth + BLEED;
    show(el, true);
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
  function placeDot(d, pos, t, tin, tout, { ring = true } = {}) {
    const s = E.outBack(prog(t, tin, 0.42)) * (1 - E.inCubic(prog(t, tout, 0.25)));
    if (!pos || s <= 0.001) { show(d, false); return; }
    show(d, true);
    d.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`;
    $('.core', d).style.transform = `translate(-50%, -50%) scale(${s})`;
    $('.ring', d).style.transform = `translate(-50%, -50%) scale(${ring ? s : 0})`;
    const ph = (((t - tin - 0.25) % 1.1) + 1.1) % 1.1 / 1.1;
    const pulse = $('.pulse', d);
    pulse.style.transform = `translate(-50%, -50%) scale(${1 + 1.5 * ph})`;
    pulse.style.opacity = ring && t > tin + 0.25 ? (0.85 * (1 - ph) * Math.min(1, s)).toFixed(3) : 0;
  }
  const trackAt = (name, f) => {
    const tr = window.TRACKS && window.TRACKS[name];
    return tr && tr.frames[String(f)] ? tr.frames[String(f)] : null;
  };
  // Porthole marker target: centroid of the tracked features + offset to the window centre.
  function portholeTarget(n) {
    const pp = trackAt('porthole', srcOf('D', n));
    if (!pp || !pp.every(Boolean)) return null;
    const c = pp.reduce((acc, p) => [acc[0] + p[0] / pp.length, acc[1] + p[1] / pp.length], [0, 0]);
    return [c[0] + 80, c[1] + 190];
  }

  // ---------------------------------------------------------------- elements
  const el = {
    footage: $('#footage'), slots: $$('#footage .shot'),
    sep: $('#sep'), slatEdges: $('#slat-edges'), iris: $('#iris'), flash: $('#flash'),
    bands: $$('#bands .band'), blur: $('#hblur-g'),
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
  let irisOrigin = null;

  function jetsCount(t) {
    let v = 0;
    for (const [s, d, a, b] of STAGES) if (t >= s) v = lerp(a, b, E.outCubic(prog(t, s, d)));
    return Math.round(v);
  }

  // ---------------------------------------------------------------- footage
  const whipK = n => E.inOutQuint(prog(n, X.whip[0], X.whip[1] - X.whip[0]));
  const slatK = (n, i) => E.inOutCubic(prog(n, X.slats.start + i * X.slats.stagger, X.slats.dur));
  const slatsEnd = X.slats.start + (X.slats.count - 1) * X.slats.stagger + X.slats.dur;
  const irisK = n => E.inOutCubic(prog(n, X.iris[0], X.iris[1] - X.iris[0]));
  function irisRect(k) {
    const [tx, ty] = irisOrigin, r = 23;
    const x = lerp(tx - r, 0, k), y = lerp(ty - r, 0, k);
    return { x, y, w: lerp(2 * r, W, k), h: lerp(2 * r, H, k) };
  }

  // Vertical slats, alternately growing from the top and the bottom.
  function slatsPath(n, edge = 0) {
    const sw = W / X.slats.count;
    let d = '';
    for (let i = 0; i < X.slats.count; i++) {
      const k = slatK(n, i);
      if (k <= 0 || (edge && k >= 1)) continue;
      const h = H * k, x0 = i * sw, x1 = x0 + sw;
      let y0 = i % 2 ? H - h : 0, y1 = i % 2 ? H : h;
      if (edge) { if (i % 2) y1 = Math.min(H, y0 + edge); else y0 = Math.max(0, y1 - edge); }
      d += `M${x0} ${y0}H${x1}V${y1}H${x0}Z`;
    }
    return d ? `path('${d}')` : 'inset(50%)';
  }

  // Footage layers (bottom → top) for output frame n.
  function footageLayers(n) {
    const L = [];
    const lay = (shot, o = {}) => L.push({ shot, src: srcOf(shot, n), x: 0, s: 1, ox: W / 2, oy: H / 2, clip: 'none', filter: 'none', ...o });
    if (n < X.bands.cut) {
      lay('A');
    } else if (n < X.whip[0]) {
      lay('B');
    } else if (n < X.whip[1]) {
      const k = whipK(n);
      lay('B', { x: -W * k, filter: 'url(#hblur)' });
      lay('C', { x: W * (1 - k), filter: 'url(#hblur)' });
    } else if (n < X.slats.start) {
      lay('C');
    } else if (n < slatsEnd) {
      lay('C');
      lay('D', { clip: slatsPath(n) });
    } else if (n < X.iris[0]) {
      lay('D');
    } else if (n < X.iris[1]) {
      const k = irisK(n), r = irisRect(k), [ox, oy] = irisOrigin;
      lay('D', { s: 1 + 0.16 * E.inCubic(k), ox, oy });
      lay('E1', { s: 1.22 - 0.22 * E.outCubic(k), ox, oy,
        clip: `inset(${r.y}px ${W - r.x - r.w}px ${H - r.y - r.h}px ${r.x}px)` });
    } else if (n < X.punch) {
      lay('E1');
    } else if (n < X.flash.cut) {
      const punch = 1 + 0.07 * (1 - E.outCubic(prog(n, X.punch, 9)));
      const zk = E.inExpo(prog(n, X.flash.zoom, X.flash.cut - X.flash.zoom));
      lay('E', { s: punch * (1 + 0.24 * zk), filter: zk > 0.02 ? `blur(${(zk * 12).toFixed(1)}px)` : 'none' });
    } else {
      // Hero: lands out of the flash, slow push-in, then shrinks into the end-card box.
      const settle = 1 + 0.12 * (1 - E.outExpo(prog(n, X.flash.cut, 20)));
      const kb = 1 + 0.06 * prog(n, X.flash.cut, TOTAL - X.flash.cut);
      lay('F', { s: settle * kb, ox: BOX_FOCUS.x, oy: BOX_FOCUS.y });
    }
    return L;
  }

  // ---------------------------------------------------------------- render
  function render(n, layers) {
    const t = n / FPS;

    // Footage layers.
    const e = E.inOutCubic(prog(t, T.end, 0.85));
    el.footage.style.clipPath = e > 0
      ? `inset(${BOX.top * e}px ${(W - BOX.right) * e}px ${(H - BOX.bottom) * e}px ${BOX.left * e}px)` : 'none';
    const cx = (BOX.left + BOX.right) / 2, cy = (BOX.top + BOX.bottom) / 2;
    el.slots.forEach((slot, i) => {
      const l = layers[i];
      show(slot, !!l);
      if (!l) return;
      const img = slot.firstElementChild;
      const dx = l.shot === 'F' ? (cx - BOX_FOCUS.x) * e : 0, dy = l.shot === 'F' ? (cy - BOX_FOCUS.y) * e : 0;
      img.style.transformOrigin = `${l.ox}px ${l.oy}px`;
      img.style.transform = `translate(${l.x + dx}px, ${dy}px) scale(${l.s})`;
      slot.style.clipPath = l.clip;
      slot.style.filter = l.filter;
    });

    // Whip: directional blur + navy slab on the seam; graphics ride along.
    const inWhip = n >= X.whip[0] && n < X.whip[1];
    const wk = inWhip ? whipK(n) : 0;
    const blurPx = inWhip ? 85 * Math.pow(Math.sin(Math.PI * wk), 1.5) : 0;
    el.blur.setAttribute('stdDeviation', `${blurPx.toFixed(1)} 0`);
    show(el.sep, inWhip);
    if (inWhip) el.sep.style.left = `${W * (1 - wk) - 80}px`;
    const rideB = inWhip ? -W * wk : 0, rideC = inWhip ? W * (1 - wk) : 0;
    for (const node of [el.jets, dotsLayer]) {
      node.style.translate = `${rideB}px 0`;
      node.style.filter = inWhip && blurPx > 1 ? 'url(#hblur)' : 'none';
    }
    el.shower.style.translate = `${rideC}px 0`;
    el.shower.style.filter = inWhip && blurPx > 1 ? 'url(#hblur)' : 'none';

    // Slats: navy leading edges.
    const inSlats = n >= X.slats.start && n < slatsEnd;
    show(el.slatEdges, inSlats);
    if (inSlats) el.slatEdges.style.clipPath = slatsPath(n, 24);

    // Iris border (grows out of the porthole marker ring).
    const inIris = n >= X.iris[0] && n < X.iris[1];
    show(el.iris, inIris);
    if (inIris) {
      const r = irisRect(irisK(n));
      Object.assign(el.iris.style, { left: `${r.x - 4}px`, top: `${r.y - 4}px`, width: `${r.w + 8}px`, height: `${r.h + 8}px` });
    }

    // Flash: E burns out to white, F lands out of it.
    const fl = n < X.flash.cut ? E.inCubic(prog(n, X.flash.cut - 8, 8))
      : 1 - E.outCubic(prog(n, X.flash.cut, X.flash.fade - X.flash.cut));
    el.flash.style.opacity = fl.toFixed(3);
    show(el.flash, fl > 0.001);

    // Navy bands covering the A → B cut.
    const b = X.bands;
    el.bands.forEach((band, i) => {
      const kin = E.inOutCubic(prog(n, b.in + i * b.stagger, b.dur));
      const kout = E.inOutCubic(prog(n, b.out + i * b.stagger, b.dur));
      show(band, kin > 0 && kout < 1);
      band.style.clipPath = `inset(0 ${(1 - kin) * 100}% 0 ${kout * 100}%)`;
    });

    // End-card frame line.
    const per = 2 * (964 + 788);
    const fr = E.inOutCubic(prog(t, T.end + 0.65, 0.9));
    el.frameRect.style.strokeDasharray = per;
    el.frameRect.style.strokeDashoffset = per * (1 - fr);
    show(el.frameRect, fr > 0);

    // Persistent logo plate.
    wipe(el.logo, t, T.logo, null, 0.6);

    // 00 Hook (covered by the bands, gone after the cut).
    showBox(el.hook, n < b.cut);
    if (n < b.cut) stack(el.hook, t, T.hook, null, { gap: 0.11 });

    // 01 Massage: card, staged rows, count-up, tracked jets.
    const onB = n >= SHOTS.B.at && n < X.whip[1];
    showBox(el.jets, onB);
    const [card, ...rows] = $$(':scope > .blk', el.jets);
    if (onB) {
      wipe(card, t, T.jets, null);
      $$('.ln > span', card).forEach((s, j) => rise(s, t, T.jets + 0.12 + j * 0.06));
      rows.forEach((r, i) => wipe(r, t, STAGES[i][0], null));
      el.count.textContent = jetsCount(t);
    }
    const jp = onB ? trackAt('jets', srcOf('B', n)) : null;
    jetDots.forEach((d, i) => {
      const tin = i < 3 ? STAGES[0][0] + i * 0.08 : STAGES[2][0] + (i - 3) * 0.05;
      placeDot(d, jp && jp[i], t, tin, 99);
    });

    // 02 Komfort (enters riding on the whip).
    stack(el.shower, t, T.shower[0], T.shower[1]);

    // 03 Design: card + tracked pointer onto the porthole; the marker ring becomes the iris.
    const [pin, pout] = T.porthole;
    stack(el.porthole, t, pin, pout);
    const onD = n >= SHOTS.D.at - 6 && n < X.iris[0];
    const target = onD ? portholeTarget(n) : null;
    const draw = E.inOutCubic(prog(t, pin + 0.4, 0.5));
    const retract = E.inCubic(prog(t, pout + 0.05, 0.3));
    if (target && draw > 0 && retract < 1) {
      const [sx, sy] = ptrStart;
      el.line.setAttribute('x1', lerp(sx, target[0], retract)); el.line.setAttribute('y1', lerp(sy, target[1], retract));
      el.line.setAttribute('x2', lerp(sx, target[0], draw)); el.line.setAttribute('y2', lerp(sy, target[1], draw));
      show(el.line, true);
    } else {
      show(el.line, false);
    }
    placeDot(portDot, target, t, pin + 0.8, 99);

    // 04 Ergonomie (spans the E1 → E cut).
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
    const layers = footageLayers(n);
    await Promise.all(layers.map(async (l, i) => {
      const img = el.slots[i].firstElementChild;
      if (img.dataset.idx !== String(l.src)) {
        img.src = `${PLATE_DIR}/f${String(l.src).padStart(4, '0')}.jpg`;
        await img.decode();
        img.dataset.idx = String(l.src);
      }
    }));
    render(n, layers);
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await $('#logo img').decode();
    // Pointer starts under the left edge of the porthole card's last block.
    const last = $$(':scope > .blk', el.porthole).pop();
    const r = last.getBoundingClientRect();
    ptrStart = [r.left + 40, r.bottom];
    irisOrigin = portholeTarget(X.iris[0] - 1);
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
