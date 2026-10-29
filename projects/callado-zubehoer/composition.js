// CALLADO Zubehör – Werbevideo 16:9. Deterministic, frame-addressed motion graphics:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// The image card hangs in 3D and the camera orbits it; the room goes dark for the LEDs
// (light runs through the grooves in slow motion) and the lights flicker back on.
// Product changes are AI camera moves (Seedance 2.5 clips, see transitions.js).
(() => {
  const FPS = 30;
  const W = 1920, H = 1080;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/callado-zubehoer/plates';

  const CARD = { x: 920, y: 120, s: 840 };
  const TILE = { y: 400, s: 340, xs: [160, 580, 1000, 1420] };
  const ZOOM = [1, 1, 1, 1, 1.25];          // per picture; the Schrägelement sits small in its photo

  // Timeline, output seconds.
  const T = {
    logo: 0.3,
    intro: [0.5, 4.4],                      // copy in / out
    dark1: [3.6, 0.7],                      // room goes dark (start, duration)
    flip: [4.7, 1.2],                       // card turns from the mood image to CALLUX STRIPE, in the dark
    run: [5.5, 1.8],                        // light runs up the LED grooves (slow motion)
    on1: 7.3,                               // lights flicker back on
    clips: [[10.3, 2.8], [17.2, 2.4], [22.2, 2.4]],   // AI transitions: start, duration
    dark2: [13.9, 0.5, 0.92],               // CALLUX COVER: room dims (start, duration, depth)
    ignite: [14.3, 1.4],                    // light band ignites from the centre
    on2: 16.0,
    grid: 27.2,                             // card shrinks into the overview
    end: 31.0,                              // overview leaves, end card
  };
  const TOTAL = Math.round((T.end + 4.2) * FPS);   // 35.2 s
  const LAND = 0.9;                         // photo eases from the clip's last framing back to its own

  // Clips: product `from` → `to`; frames and alignments from transitions.js (match_frame.py).
  const CLIPS = [
    { name: 't1', from: 1, to: 2 },
    { name: 't2', from: 2, to: 3 },
    { name: 't3', from: 3, to: 4 },
  ].map((c, i) => ({ ...c, at: T.clips[i][0], dur: T.clips[i][1], ...((window.CLIP_INFO || {})[c.name] || {}) }));
  const flipMid = T.flip[0] + T.flip[1] / 2;
  // Picture j is on screen in [SHOW[j][0], SHOW[j][1]).
  const SHOW = [
    [0, flipMid],
    [flipMid, CLIPS[0].at + 0.1],
    [CLIPS[0].at + CLIPS[0].dur - 0.05, CLIPS[1].at + 0.1],
    [CLIPS[1].at + CLIPS[1].dur - 0.05, CLIPS[2].at + 0.1],
    [CLIPS[2].at + CLIPS[2].dur - 0.05, Infinity],
  ];
  const COPY = [                            // product copy in / out
    [T.on1 + 0.25, CLIPS[0].at - 0.25],
    [CLIPS[0].at + CLIPS[0].dur + 0.1, CLIPS[1].at - 0.25],
    [CLIPS[1].at + CLIPS[1].dur + 0.1, CLIPS[2].at - 0.25],
    [CLIPS[2].at + CLIPS[2].dur + 0.1, T.grid - 0.2],
  ];

  // Camera on the card: [t, rotateY, rotateX, z]. Swings across each scene, eased key to key.
  const ORBIT = [
    [0, 24, 5, -90], [4.6, -4, 0, 30],
    [5.9, 18, 3, -20], [10.3, -12, -2, 50],
    [13.1, 14, 2, -10], [17.2, -12, -2, 50],
    [19.6, 13, 2, -10], [22.2, -12, -2, 50],
    [24.6, 12, 2, -10], [T.grid, -6, -1, 30], [T.grid + 1.2, 0, 0, 0],
  ];

  // Callouts, in product-photo px (1000 × 1000).
  const STRIPE_LED = [368, 640];
  const COVER_LED = [612, 221];
  const SLOPE = { a: [353, 216], b: [619, 460], off: 26, len: 0.93 };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    outQuart: k => 1 - Math.pow(1 - k, 4),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: k => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
  const showBox = (node, on) => { node.style.display = on ? '' : 'none'; };
  const mix = (a, b, k) => {
    const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], k))).join(',')})`;
  };

  // Masked line: rises in from below, leaves upwards.
  function rise(span, t, tin, tout = null, din = 0.75, dout = 0.4) {
    const a = E.outExpo(prog(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
    span.style.transform = `translateY(${(1 - a - b) * 110}%)`;
  }
  // Hairline: grows from the left, retracts to the right.
  function draw(node, t, tin, tout = null, din = 0.7, dout = 0.4) {
    const a = E.inOutCubic(prog(t, tin, din));
    const b = tout == null ? 0 : E.inOutCubic(prog(t, tout, dout));
    node.style.transformOrigin = b > 0 ? 'right' : 'left';
    node.style.transform = `scaleX(${b > 0 ? 1 - b : a})`;
  }
  // Block wipe left → right (in), cleared from the left (out). Shadow bleed stays visible.
  const BLEED = 40;
  function wipe(node, t, tin, tout = null, din = 0.7, dout = 0.5) {
    const a = E.outQuart(prog(t, tin, din));
    const b = tout == null ? 0 : E.inCubic(prog(t, tout, dout));
    if (a <= 0 || b >= 1) { show(node, false); return; }
    const w = node.offsetWidth + BLEED;
    show(node, true);
    node.style.clipPath = `inset(-${BLEED}px ${(1 - a) * w - BLEED}px -${BLEED}px ${b * w - BLEED}px)`;
  }
  // Copy block: lines rise staggered, hairlines draw, the block drifts against the camera.
  function copy(root, t, tin, tout, drift, gap = 0.06) {
    const on = t >= tin - 0.1 && (tout == null || t < tout + 1.0);
    showBox(root, on);
    if (!on) return;
    root.style.transform = `translate(${drift}px, -50%)`;
    $$('.ln > span', root).forEach((s, i) => rise(s, t, tin + i * gap, tout == null ? null : tout + i * 0.03));
    $$('.kicker i', root).forEach(n => draw(n, t, tin + 0.1, tout, 0.5));
    $$('.rule', root).forEach(n => draw(n, t, tin + 0.35, tout, 0.7));
  }

  // ---------------------------------------------------------------- light
  // Lights coming back on: a short fluorescent flicker, then a soft settle.
  function flicker(t, t0) {
    const x = t - t0;
    if (x < 0) return 1;
    const steps = [[0, 0.3], [0.05, 0.85], [0.11, 0.18], [0.17, 0.7], [0.22, 0.1]];
    if (x < 0.27) return steps.filter(s => x >= s[0]).pop()[1];
    return 0.1 * (1 - E.outCubic(prog(x, 0.27, 0.45)));
  }
  const dark1 = t => E.inOutCubic(prog(t, T.dark1[0], T.dark1[1])) * flicker(t, T.on1);
  const dark2 = t => T.dark2[2] * E.inOutCubic(prog(t, T.dark2[0], T.dark2[1])) * flicker(t, T.on2);
  const darkness = t => Math.max(dark1(t), dark2(t));

  // ---------------------------------------------------------------- elements
  const el = {
    stage: $('#stage'), logoNavy: $('#logo-navy'), logoWhite: $('#logo-white'), logo: $('#logo'),
    shadow: $('#shadow'), rig: $('#rig'), plate: $('#plate'), card: $('#card'),
    pics: $$('#card .pic:not(#clip)'), clip: $('#clip'), clipImg: $('#clip img'), sheen: $('#sheen'), ai: $('#ai'),
    dust: $('#dust'), intro: $('#intro'), products: $$('.product'), pager: $('#pager'), segs: $$('#pager .seg i'),
    stripe: $('#co-stripe'), cover: $('#co-cover'), slope: $('#co-slope'), lbStripe: $('#lb-stripe'), lbCover: $('#lb-cover'),
    gridHead: $('#grid-head'), tiles: $$('.tile'), caps: $$('.cap'),
    end: $('#end'), endLogo: $('#end-logo'), shine: $('#end-logo .shine'), slogan: $('#end .slogan .ln > span'),
    btn: $('#cta .btn'), arrow: $('#cta .btn svg'), url: $('#cta .url'), urlLine: $('#cta .url i'),
  };
  const dustCtx = el.dust.getContext('2d');

  // Deterministic dust motes for the dark moments.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const MOTES = Array.from({ length: 70 }, () => ({
    x: 880 + rnd() * 960, y: rnd() * 1080, r: 0.8 + rnd() * 2.6, v: 8 + rnd() * 16,
    amp: 6 + rnd() * 22, ph: rnd() * 6.28, tw: 0.6 + rnd() * 1.4,
  }));

  // ---------------------------------------------------------------- camera
  function orbit(t) {
    let i = 0;
    while (i < ORBIT.length - 2 && t >= ORBIT[i + 1][0]) i++;
    const [t0, ...a] = ORBIT[i], [t1, ...b] = ORBIT[i + 1];
    const k = E.inOutSine(prog(t, t0, t1 - t0));
    let [ry, rx, z] = a.map((v, j) => lerp(v, b[j], k));
    // Flip: turn edge-on, swap the picture, turn back in.
    const f = prog(t, T.flip[0], T.flip[1]);
    if (f > 0 && f < 1) {
      ry += f < 0.5 ? 90 * E.inCubic(f * 2) : -90 * (1 - E.outCubic((f - 0.5) * 2));
      z -= 160 * Math.sin(Math.PI * f);
    }
    // Overview exit: the last tile turns away with the others.
    ry += 90 * E.inCubic(prog(t, T.end + 0.24, 0.6));
    return { ry, rx, z };
  }
  function cardRect(t) {
    const g = E.inOutCubic(prog(t, T.grid, 1.1));
    return { x: lerp(CARD.x, TILE.xs[3], g), y: lerp(CARD.y, TILE.y, g), s: lerp(CARD.s, TILE.s, g), g };
  }

  // Transform of picture j's inner layer: slow settle zoom, plus the zoom-match into / out of a clip.
  function picTransform(j, t, L) {
    let z = ZOOM[j] * (1 + 0.05 * (1 - E.outCubic(prog(t, SHOW[j][0], 4.5))));
    let s = 1, tx = 0, ty = 0;
    const out = CLIPS.find(c => c.from === j), inn = CLIPS.find(c => c.to === j);
    if (inn && inn.land) {                  // land: start on the clip's last framing, ease back
      const k = E.inOutCubic(prog(t, inn.at + inn.dur, LAND));
      s = lerp(inn.land.s, 1, k); tx = lerp(inn.land.tx, 0, k); ty = lerp(inn.land.ty, 0, k);
      z = lerp(1, z, k);
    }
    if (out && out.start && t >= out.at - 0.5) {   // push into the clip's first framing
      const k = E.inOutCubic(prog(t, out.at - 0.5, 0.5));
      s = lerp(1, out.start.s, k); tx = lerp(0, out.start.tx, k); ty = lerp(0, out.start.ty, k);
      z = lerp(z, 1, k);
    }
    // p' = (c + (p - c) z) s + t  →  origin 0 0: translate(c (1 - z) s + t) scale(z s)
    const c = L / 2;
    return `translate(${c * (1 - z) * s + tx * L}px, ${c * (1 - z) * s + ty * L}px) scale(${z * s})`;
  }

  // Clip frame for time t (null outside the clip).
  function clipFrame(t) {
    for (const c of CLIPS) {
      if (!c.frames || t < c.at || t >= c.at + c.dur + 0.3) continue;
      const u = prog(t, c.at, c.dur);
      const e = 0.5 * u + 0.5 * E.inOutSine(u);      // slower at both ends: slow-motion arrivals
      return { c, idx: 1 + Math.round(e * (c.frames - 1)), fade: 1 - prog(t, c.at + c.dur, 0.25) };
    }
    return null;
  }

  // ---------------------------------------------------------------- glow
  function glow(pic, j, t, D) {
    const g = $('.glows', pic);
    if (!g) return;
    let G = 0, mask = 'none';
    if (j === 0) {
      G = 0.3 + 1.1 * dark1(t);
    } else if (j === 1) {
      const r = E.inOutSine(prog(t, T.run[0], T.run[1]));
      const p = -15 + 135 * r;
      if (r < 1) mask = `linear-gradient(to top, #000 0%, #000 ${p - 14}%, rgba(0,0,0,.35) ${p - 4}%, transparent ${p}%)`;
      G = 0.35 + 0.95 * D + 0.06 * Math.sin(t * 5.2);
    } else if (j === 2) {
      const k = t < T.dark2[0] ? 1 : E.outCubic(prog(t, T.ignite[0], T.ignite[1]));
      const c = 51.6, w = 62 * k;
      if (k < 1) mask = `linear-gradient(to right, transparent ${c - w}%, #000 ${c - w + 5}%, #000 ${c + w - 5}%, transparent ${c + w}%)`;
      G = 0.3 + 1.0 * D + 0.25 * D * Math.sin(Math.PI * prog(t, T.ignite[0], T.ignite[1]));
    }
    g.style.webkitMaskImage = mask;
    const [b3, b2, b1, b0] = g.children;
    b0.style.opacity = Math.min(1, G).toFixed(3);
    b1.style.opacity = Math.min(1, G).toFixed(3);
    b2.style.opacity = Math.min(1, G * 0.9).toFixed(3);
    b3.style.opacity = Math.min(1, G * 0.75).toFixed(3);
  }

  // ---------------------------------------------------------------- callouts (inside the card, in photo px)
  function pin(svg, label, t, tin, tout, dir) {
    const fade = 1 - prog(t, tout, 0.25);
    const on = t >= tin && fade > 0;
    show(svg, on); show(label, on);
    if (!on) return;
    const [x, y] = dir === 'right' ? STRIPE_LED : COVER_LED;
    const len = dir === 'right' ? [140, 0] : [0, 300];
    const k = E.inOutCubic(prog(t, tin + 0.2, 0.5));
    const [line, ring, core] = svg.children;
    line.setAttribute('x1', x); line.setAttribute('y1', y);
    line.setAttribute('x2', x + len[0] * k); line.setAttribute('y2', y + len[1] * k);
    for (const c of [ring, core]) { c.setAttribute('cx', x); c.setAttribute('cy', y); }
    core.setAttribute('r', (7 * E.outBack(prog(t, tin, 0.4))).toFixed(2));
    ring.setAttribute('r', (18 * E.outBack(prog(t, tin + 0.08, 0.5)) * (1 + 0.25 * Math.sin(Math.max(0, t - tin) * 4))).toFixed(2));
    svg.style.opacity = fade.toFixed(3);
    const ex = (x + len[0]) / 10, ey = (y + len[1]) / 10;
    Object.assign(label.style, { left: `${ex}%`, top: `${ey}%`, transform: dir === 'right' ? 'translateY(-50%)' : 'translateX(-50%)' });
    label.style.opacity = fade.toFixed(3);
    wipe(label, t, tin + 0.6, null, 0.5);
  }

  function slope(t, tin, tout) {
    const fade = 1 - prog(t, tout, 0.25);
    const on = t >= tin && fade > 0;
    show(el.slope, on);
    if (!on) return;
    const { a, b, off, len } = SLOPE;
    const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]);
    const n = [d[1] / L, -d[0] / L];
    const A = [a[0] + n[0] * off, a[1] + n[1] * off];
    const B = [A[0] + d[0] * len, A[1] + d[1] * len];
    const k = E.inOutCubic(prog(t, tin + 0.2, 0.9));
    const [main, tickA, tickB] = el.slope.children;
    const set = (ln, p, q) => { ln.setAttribute('x1', p[0]); ln.setAttribute('y1', p[1]); ln.setAttribute('x2', q[0]); ln.setAttribute('y2', q[1]); };
    set(main, A, [lerp(A[0], B[0], k), lerp(A[1], B[1], k)]);
    const tick = (p, kk) => [[p[0] - n[0] * 13 * kk, p[1] - n[1] * 13 * kk], [p[0] + n[0] * 13 * kk, p[1] + n[1] * 13 * kk]];
    set(tickA, ...tick(A, E.outQuart(prog(t, tin, 0.35))));
    set(tickB, ...tick(B, E.outQuart(prog(t, tin + 1.1, 0.35))));
    tickB.style.opacity = k >= 1 ? 1 : 0;
    el.slope.style.opacity = fade.toFixed(3);
  }

  // ---------------------------------------------------------------- render
  function render(n, cf) {
    const t = n / FPS;
    const D = darkness(t);

    // Room: background, type colours and logo follow the light.
    const st = el.stage.style;
    // Type flips to white early, so it never sits grey on grey while the room fades.
    const F = E.inOutSine(prog(D, 0.15, 0.3));
    st.setProperty('--bg', mix('#ffffff', '#05090d', D));
    st.setProperty('--fg', mix('#0e2234', '#ffffff', F));
    st.setProperty('--fg-muted', mix('#66727d', '#a3b1be', F));
    st.setProperty('--hair', mix('#dfe4ea', '#25313c', F));
    wipe(el.logo, t, T.logo, T.end, 0.8, 0.5);
    el.logoWhite.style.opacity = F.toFixed(3);
    el.logoNavy.style.opacity = (1 - F).toFixed(3);

    // Camera + card.
    const cam = orbit(t), r = cardRect(t);
    Object.assign(el.rig.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.s}px`, height: `${r.s}px` });
    el.rig.style.transform = `translateZ(${cam.z}px) rotateY(${cam.ry}deg) rotateX(${cam.rx}deg)`;
    showBox(el.rig, t < T.end + 0.85);
    el.plate.style.opacity = (prog(t, 0.2, 0.6) * (1 - prog(t, T.grid - 0.3, 0.5))).toFixed(3);
    el.card.style.opacity = prog(t, 0, 0.35).toFixed(3);

    el.pics.forEach((pic, j) => {
      const on = t >= SHOW[j][0] && t < SHOW[j][1];
      show(pic, on);
      if (!on) return;
      const inner = $('.inner', pic);
      inner.style.transformOrigin = '0 0';
      inner.style.transform = picTransform(j, t, r.s);
      $('.shade', pic).style.opacity = (D * (j === 0 ? 0.7 : 0.9)).toFixed(3);
      glow(pic, j, t, D);
    });
    show(el.clip, !!cf);
    if (cf) {
      el.clip.style.opacity = Math.min(prog(t, cf.c.at, 0.2), cf.fade).toFixed(3);
      $('.shade', el.clip).style.opacity = (D * 0.9).toFixed(3);
    }
    el.sheen.style.transform = `translateX(${cam.ry * 16}px)`;
    el.sheen.style.opacity = ((1 - D) * 0.9 * (1 - r.g)).toFixed(3);
    const aiOn = Math.max(1 - prog(t, flipMid - 0.3, 0.3), cf ? cf.fade * prog(t, cf.c.at, 0.2) : 0);
    el.ai.style.opacity = aiOn.toFixed(3);

    // Floor shadow follows the card.
    const cos = Math.cos((cam.ry * Math.PI) / 180);
    Object.assign(el.shadow.style, { left: `${r.x + r.s * 0.05}px`, top: `${r.y + r.s * 1.02}px`, width: `${r.s * 0.9}px` });
    el.shadow.style.transform = `translateX(${-cam.ry * 3}px) scaleX(${Math.max(0.05, Math.abs(cos))})`;
    el.shadow.style.opacity = ((1 - D) * (1 - r.g) * prog(t, 0.2, 0.6)).toFixed(3);

    // Dust in the dark.
    dustCtx.clearRect(0, 0, W, H);
    if (D > 0.01) {
      for (const m of MOTES) {
        const y = ((m.y - m.v * t) % H + H) % H;
        const x = m.x + m.amp * Math.sin(m.ph + t * 0.6);
        const a = D * (0.25 + 0.55 * Math.abs(Math.sin(m.ph + t * m.tw)));
        const g = dustCtx.createRadialGradient(x, y, 0, x, y, m.r * 3);
        g.addColorStop(0, `rgba(255,240,215,${a.toFixed(3)})`);
        g.addColorStop(1, 'rgba(255,240,215,0)');
        dustCtx.fillStyle = g;
        dustCtx.fillRect(x - m.r * 3, y - m.r * 3, m.r * 6, m.r * 6);
      }
    }

    // Copy.
    const drift = -cam.ry * 1.6;
    copy(el.intro, t, T.intro[0], T.intro[1], drift);
    el.products.forEach((p, i) => copy(p, t, COPY[i][0], COPY[i][1], drift));

    const pg = prog(t, COPY[0][0], 0.4) * (1 - prog(t, COPY[3][1], 0.4));
    show(el.pager, pg > 0);
    el.pager.style.opacity = pg.toFixed(3);
    const segStart = [COPY[0][0], ...CLIPS.map(c => c.at)];
    const segEnd = [...CLIPS.map(c => c.at), T.grid];
    el.segs.forEach((s, i) => { s.style.transform = `scaleX(${prog(t, segStart[i], segEnd[i] - segStart[i])})`; });

    pin(el.stripe, el.lbStripe, t, COPY[0][0] + 0.6, COPY[0][1], 'right');
    pin(el.cover, el.lbCover, t, T.ignite[0] + 0.5, COPY[1][1], 'down');
    slope(t, COPY[3][0] + 0.5, COPY[3][1]);

    // Overview: card lands as the fourth tile, the other three turn in.
    copy(el.gridHead, t, T.grid + 0.6, T.end, 0);
    el.tiles.forEach((tile, i) => {
      const k = E.outCubic(prog(t, T.grid + 0.45 + i * 0.12, 0.8));
      const ke = E.inCubic(prog(t, T.end + i * 0.08, 0.6));
      show(tile, k > 0.02 && ke < 0.98);
      Object.assign(tile.style, { left: `${TILE.xs[i]}px`, top: `${TILE.y}px` });
      tile.style.transform = `perspective(1200px) rotateY(${-90 * (1 - k) + 90 * ke}deg)`;
    });
    el.caps.forEach((cap, i) => {
      const tin = T.grid + 1.1 + i * 0.08;
      const on = t >= tin - 0.1 && t < T.end + 1.0;
      showBox(cap, on);
      if (!on) return;
      Object.assign(cap.style, { left: `${TILE.xs[i]}px`, top: `${TILE.y + TILE.s + 30}px` });
      $$('.ln > span', cap).forEach((s, j) => rise(s, t, tin + j * 0.06, T.end + i * 0.04));
    });

    // End card.
    const endOn = t >= T.end + 0.8;
    showBox(el.end, endOn);
    if (endOn) {
      wipe(el.endLogo, t, T.end + 0.9, null, 0.9);
      el.shine.style.backgroundPosition = `${lerp(110, -10, E.inOutCubic(prog(t, T.end + 1.9, 1.0)))}% 0`;
      rise(el.slogan, t, T.end + 1.3);
      wipe(el.btn, t, T.end + 1.6, null, 0.7);
      const ku = E.outQuart(prog(t, T.end + 1.8, 0.7));
      el.url.style.opacity = ku.toFixed(3);
      el.url.style.transform = `translateX(${(1 - ku) * -20}px)`;
      el.urlLine.style.transform = `scaleX(${E.inOutCubic(prog(t, T.end + 2.0, 0.7))})`;
      const nudge = t > T.end + 2.6 ? Math.pow(Math.sin(Math.PI * (((t - T.end - 2.6) % 1.6) / 1.6)), 2) : 0;
      el.arrow.style.transform = `translateX(${nudge * 8}px)`;
    }
  }

  async function seek(n) {
    const cf = clipFrame(n / FPS);
    if (cf) {
      const src = `${PLATE_DIR}/${cf.c.name}/f${String(cf.idx).padStart(4, '0')}.jpg`;
      if (el.clipImg.dataset.src !== src) {
        el.clipImg.src = src;
        await el.clipImg.decode();
        el.clipImg.dataset.src = src;
      }
    }
    render(n, cf);
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img').filter(img => img.getAttribute('src')).map(img => img.decode()));
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, W, H, seek, ready: init() };
})();
