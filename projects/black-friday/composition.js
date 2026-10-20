// Black Friday – -25 %, Reel 9:16. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// Timing (speed ramp, impact, countdown) comes from timeline.js.
(() => {
  const TL = window.TIMELINE;
  const FPS = TL.FPS;
  const W = 1080, H = 1920;
  const params = new URLSearchParams(location.search);
  // Slow-motion plates (scripts/slowmo_plates.sh), interpolated in four overlapping
  // chunks; frame k of chunk "<a>-<b>" shows source frame a + k / SLOW.
  const PLATE_DIR = params.get('plates') || '../../build/black-friday/slow';
  const SLOW = 4;
  const CHUNKS = [[0, 36], [36, 72], [72, 108], [108, 144]];

  const IMPACT_AT = [430, 1110];   // where the -25% hits the sofa (stage px)
  const ZOOM_AT = [505, 1010];     // dark body of the "5": the zoom goes through it

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
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  // Deterministic shake: two detuned sines per axis, decaying after `start`.
  function shake(n, start, amp, dur) {
    if (n < start || n > start + dur) return [0, 0];
    const d = amp * Math.pow(1 - (n - start) / dur, 2);
    return [d * (Math.sin(n * 2.1) + 0.6 * Math.sin(n * 5.3)) / 1.6, d * (Math.cos(n * 2.7) + 0.6 * Math.sin(n * 4.1)) / 1.6];
  }
  // Slam: big → settled, frames since `start`.
  const slam = (n, start, from = 1.5, dur = 6) => lerp(from, 1, E.outExpo(prog(n, start, dur)));
  // Block wipe: opens left→right, leaves left→right.
  function wipe(el, n, nin, nout, din = 8, dout = 6) {
    const a = E.outExpo(prog(n, nin, din));
    const b = nout == null ? 0 : E.inExpo(prog(n, nout, dout));
    show(el, a > 0 && b < 1);
    el.style.clipPath = `inset(-20px ${(1 - a) * 100}% -20px ${b * 100}%)`;
  }
  function rise(span, n, nin, dur = 10) {
    span.style.transform = `translateY(${(1 - E.outExpo(prog(n, nin, dur))) * 108}%)`;
  }

  // ---------------------------------------------------------------- elements
  const el = {
    cam: $('#cam'), img: $('#footage img'), footage: $('#footage'), vignette: $('#vignette'),
    flash: $('#flash'), ring: $('#shock-ring'), rgbR: $('#rgb-r'), rgbB: $('#rgb-b'),
    barTop: $('#bar-top'), barBot: $('#bar-bot'),
    countKicker: $('#count-kicker'), digits: ['#d3', '#d2', '#d1'].map(s => $(s)),
    hitBlks: $$('#hit > .blk'), hitLns: $$('#hit .ln > span'),
    end: $('#end'), endLogo: $('#end-logo'), endKicker: $('#end-kicker'), endKickerLn: $('#end-kicker .ln > span'),
    endBlack: $('#end-black'), endFriday: $('#end-friday'), endPct: $('#end-pct'),
    endDate: $('#end-date'), endDateLn: $('#end-date .ln > span'),
    btn: $('#cta .btn'), arrow: $('#cta .btn svg'), url: $('#cta .url'), urlLine: $('#cta .url i'),
    ticker: $('#ticker'), track: $('#ticker-track'), legal: $('#legal'),
  };

  // ---------------------------------------------------------------- footage
  function plate(n) {
    const at = i => TL.srcAt[Math.min(i, TL.srcAt.length - 1)];
    let src = at(n);
    // Near real time the interpolation ghosts on fast motion (the falling -25%):
    // use real source frames there, interpolated ones only in true slow motion.
    if (at(n + 1) - src > 0.6) src = Math.round(src);
    let c = CHUNKS.findIndex(([a, b]) => src < b);
    if (c < 0) c = CHUNKS.length - 1;
    let k = Math.round((src - CHUNKS[c][0]) * SLOW);
    const maxK = (CHUNKS[c][1] - CHUNKS[c][0]) * SLOW - SLOW;
    if (k > maxK && c < CHUNKS.length - 1) { c += 1; k = 0; }   // tail of a chunk: next chunk's first frame
    k = clamp(k, 0, maxK);
    return `${PLATE_DIR}/${CHUNKS[c][0]}-${CHUNKS[c][1]}/f${String(k).padStart(4, '0')}.jpg`;
  }

  // ---------------------------------------------------------------- render
  function render(n) {
    const t = n / FPS;
    const [z0, z1] = TL.zoom;
    const inFootage = n < TL.end;
    show(el.cam, inFootage);

    // Camera: slow push during the build-up, punch on the countdown beats and the
    // impact, shake on crack and impact, then the zoom through the "-25%".
    const build = E.inOutCubic(prog(n, 0, TL.impact));
    let s = 1 + 0.09 * build;
    let focus = [lerp(540, IMPACT_AT[0], build), lerp(900, 1000, build)];
    for (const b of TL.beats) s += 0.02 * (1 - E.outCubic(prog(n, b, 6))) * (n >= b ? 1 : 0);
    if (n >= TL.impact) s += 0.14 * (1 - E.outCubic(prog(n, TL.impact, 12)));
    s -= 0.05 * E.inOutCubic(prog(n, TL.impact + 10, z0 - TL.impact - 10));      // breathe out after the hit
    const zk = E.inExpo(prog(n, z0, z1 - z0));
    s *= 1 + 9 * zk;
    focus = [lerp(focus[0], ZOOM_AT[0], E.inOutCubic(prog(n, z0 - 12, 16))), lerp(focus[1], ZOOM_AT[1], E.inOutCubic(prog(n, z0 - 12, 16)))];
    const [cx, cy] = shake(n, TL.crack, 12, 14);
    const [ix, iy] = shake(n, TL.impact, 46, 18);
    el.cam.style.transformOrigin = '0 0';
    el.cam.style.transform = `translate(${cx + ix}px, ${cy + iy}px) translate(${focus[0]}px, ${focus[1]}px) scale(${s}) translate(${-focus[0]}px, ${-focus[1]}px)`;

    // Footage filters: RGB split on impact, blur + black-out through the zoom.
    const split = n >= TL.impact ? 22 * (1 - E.outCubic(prog(n, TL.impact, 7))) : 0;
    el.rgbR.setAttribute('dx', split.toFixed(1));
    el.rgbB.setAttribute('dx', (-split).toFixed(1));
    const f = [];
    if (split > 0.5) f.push('url(#rgb)');
    const dark = E.inCubic(prog(n, z0, z1 - z0));
    if (zk > 0.01 || dark > 0.01) f.push(`blur(${(zk * 16).toFixed(1)}px)`, `brightness(${(1 - dark).toFixed(3)})`);
    el.footage.style.filter = f.length ? f.join(' ') : 'none';

    // Vignette tightens during the slow-motion fall.
    el.vignette.style.opacity = (0.35 + 0.65 * prog(n, TL.crack, 20) - 0.4 * prog(n, TL.impact + 20, 30)).toFixed(3);

    // Letterbox bars slide in at the start and stay through the footage.
    const lb = E.outExpo(prog(n, 0, 12));
    el.barTop.style.transform = `translateY(${-(1 - lb) * 150}px)`;
    el.barBot.style.transform = `translateY(${(1 - lb) * 150}px)`;

    // Countdown: 3 · 2 · 1 slam in on the beats, "1" blows up when the ceiling breaks.
    wipe(el.countKicker, n, TL.beats[0] - 6, TL.crack, 8, 4);
    el.digits.forEach((d, i) => {
      const nin = TL.beats[i];
      const nout = i < 2 ? TL.beats[i + 1] - 2 : TL.crack + 1;
      const on = n >= nin && n < nout + (i < 2 ? 3 : 10);
      show(d, on);
      if (!on) return;
      let sc = slam(n, nin, 1.7, 5), op = clamp((n - nin + 1) / 2), blur = 0;
      if (i < 2) { const k = prog(n, nout, 3); sc *= 1 - 0.15 * k; op *= 1 - k; }
      else { const k = E.outCubic(prog(n, nout, 6)); sc *= 1 + 0.7 * k; op *= 1 - k; blur = 10 * k; }
      d.style.transform = `scale(${sc})`;
      d.style.opacity = op.toFixed(3);
      d.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none';
    });

    // Shockwave ring from the impact point.
    const rk = prog(n, TL.impact, 14);
    show(el.ring, n >= TL.impact && rk < 1);
    const rx = 1000 * E.outCubic(rk);
    el.ring.setAttribute('cx', IMPACT_AT[0]); el.ring.setAttribute('cy', IMPACT_AT[1]);
    el.ring.setAttribute('rx', rx.toFixed(1)); el.ring.setAttribute('ry', (rx * 0.32).toFixed(1));
    el.ring.setAttribute('stroke-width', (22 * (1 - rk)).toFixed(1));
    el.ring.style.opacity = (1 - rk).toFixed(3);

    // BLACK / FRIDAY / date slam in after the hit, leave before the zoom.
    const hitIn = [TL.impact + 5, TL.impact + 9, TL.impact + 17];
    el.hitBlks.forEach((b, i) => {
      wipe(b, n, hitIn[i], z0 - 14 + i * 2, i < 2 ? 4 : 8, 6);
      b.style.transform = i < 2 ? `scale(${slam(n, hitIn[i], 1.35, 7)})` : 'none';
    });
    el.hitLns.forEach((s2, i) => rise(s2, n, hitIn[i] + (i < 2 ? 0 : 3), i < 2 ? 6 : 10));

    // White flashes: crack (soft), impact (hard), end-card slams.
    const e = n - TL.end;
    let fl = 0;
    fl = Math.max(fl, n >= TL.crack ? 0.35 * (1 - prog(n, TL.crack, 4)) : 0);
    fl = Math.max(fl, n >= TL.impact ? 0.9 * (1 - E.outCubic(prog(n, TL.impact, 7))) : 0);
    fl = Math.max(fl, e >= 0 ? 0.6 * (1 - prog(e, 0, 3)) : 0);
    fl = Math.max(fl, e >= 10 ? 0.45 * (1 - prog(e, 10, 3)) : 0);
    el.flash.style.opacity = fl.toFixed(3);
    show(el.flash, fl > 0.002);

    // ------------------------------------------------------------ end card
    show(el.end, e >= 0);
    if (e >= 0) renderEnd(e, t);
  }

  function renderEnd(e, t) {
    const [ax, ay] = shake(e, 0, 16, 8);
    const [bx, by] = shake(e, 10, 30, 12);
    el.end.style.transform = `translate(${ax + bx}px, ${ay + by}px)`;
    el.endLogo.style.opacity = E.outCubic(prog(e, 4, 10)).toFixed(3);

    // BLACK, FRIDAY slam; then the red -25 % hits with an RGB split and keeps pulsing.
    for (const [node, nin] of [[el.endBlack, 0], [el.endFriday, 3]]) {
      show(node, e >= nin);
      node.style.transform = `scale(${slam(e, nin, 1.45, 6)})`;
    }
    show(el.endPct, e >= 10);
    const pulse = e > 26 ? 1 + 0.03 * Math.pow(Math.sin(Math.PI * (((e - 26) / FPS) % 0.9) / 0.9), 2) : 1;
    el.endPct.style.transform = `scale(${slam(e, 10, 2.3, 7) * pulse})`;
    const split = e >= 10 ? 18 * (1 - E.outCubic(prog(e, 10, 9))) : 0;
    if (e >= 10 && e < 20) { el.rgbR.setAttribute('dx', split.toFixed(1)); el.rgbB.setAttribute('dx', (-split).toFixed(1)); }
    el.endPct.style.filter = split > 0.5 ? 'url(#rgb)' : 'none';

    // Kicker, date, CTA, ticker.
    show(el.endKicker, e >= 20);
    rise(el.endKickerLn, e, 20);
    wipe(el.endDate, e, 24, null, 9);
    rise(el.endDateLn, e, 27);
    wipe(el.btn, e, 34, null, 10);
    const ku = E.outExpo(prog(e, 39, 12));
    el.url.style.opacity = ku.toFixed(3);
    el.url.style.transform = `translateX(${(1 - ku) * -24}px)`;
    el.urlLine.style.transform = `scaleX(${E.outExpo(prog(e, 44, 14))})`;
    const nudge = e > 52 ? Math.pow(Math.sin(Math.PI * ((((e - 52) / FPS) % 1.1) / 1.1)), 2) : 0;
    el.arrow.style.transform = `translateX(${nudge * 9}px)`;
    const tk = E.outExpo(prog(e, 28, 14));
    show(el.ticker, tk > 0);
    el.ticker.style.clipPath = `inset(0 ${(1 - tk) * 100}% 0 0)`;
    const segW = el.track.firstElementChild.offsetWidth;
    el.track.style.transform = `translateX(${-(((t + 3) * 140) % segW)}px)`;
    el.legal.style.opacity = (0.999 * E.outCubic(prog(e, 44, 14))).toFixed(3);
  }

  async function seek(n) {
    if (n < TL.end) {
      const url = plate(n);
      if (el.img.dataset.src !== url) {
        el.img.src = url;
        await el.img.decode();
        el.img.dataset.src = url;
      }
    }
    render(n);
  }

  async function init() {
    await Promise.all([500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img[src]').map(i => i.decode()));
    const seg = '<span>Black Friday<i></i><b>−25 %</b><i></i>Nur 27.–29.11.<i></i>Nur 3 Tage<i></i></span>';
    el.track.innerHTML = seg.repeat(4);
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL: TL.TOTAL, seek, ready: init() };
})();
