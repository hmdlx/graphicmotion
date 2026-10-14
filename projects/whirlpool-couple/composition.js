// Whirlpool – Spot 9:16 (Paar). Deterministic, frame-addressed composition:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// No copy on screen: the film carries itself, graphics stay down to light and a few hairlines.
(() => {
  const FPS = 24;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/whirlpool-couple/plates';

  // Edit decision list. `src` is the frame range of each shot in the rough cut, `at`
  // the output frame its first frame lands on. Shots overlap by the length of the
  // transition between them; outside its range a shot holds its end frame.
  // `kb` is the point the slow camera push of the shot leans into (plate px).
  const SHOTS = [
    { name: 'garten',   src: [0, 91],    at: 0,   kb: [540, 1100] },  // Totale mit Blättern
    { name: 'deckel',   src: [92, 164],  at: 76,  kb: [468, 954] },   // Hand öffnet die Steuerung
    { name: 'wasser',   src: [165, 257], at: 133, kb: [560, 760] },   // Bedienfeld + Einlauf
    { name: 'leer',     src: [258, 359], at: 208, kb: [504, 1120] },  // Totale, Wanne leer
    { name: 'paar',     src: [360, 455], at: 288, kb: [556, 1060] },  // Paar im Pool
    { name: 'paarNah',  src: [456, 542], at: 366, kb: [480, 980] },   // Paar näher (ohne die Abblende ab 543)
  ];
  SHOTS.forEach(s => { s.len = s.src[1] - s.src[0] + 1; s.end = s.at + s.len - 1; });
  const TOTAL = 528;              // 22.0 s

  // Plate-space map from the last frame of `leer` onto the first frame of `paar`
  // (xPaar = s * xLeer + t), measured by correlating the tub region of both frames.
  const LEER_TO_PAAR = { s: 1.04, tx: -8, ty: -24 };
  // Rim of the tub in `paar` (plate px, first frame).
  const RIM = { cx: 558, cy: 1166, rx: 432, ry: 124 };

  // End card, output frames.
  const END = { veil: 432, frame: 452, logo: 462, rule: 476 };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (n, start, dur) => clamp((n - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, k) => { const x = clamp((k - a) / (b - a)); return x * x * (3 - 2 * x); };
  const bell = k => Math.pow(Math.sin(Math.PI * clamp(k)), 2);
  const E = {
    inQuad: k => k * k,
    outQuad: k => 1 - (1 - k) * (1 - k),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  };

  // Uniform-scale affines, p -> s * p + t.
  const A = {
    id: { s: 1, tx: 0, ty: 0 },
    about: (s, cx, cy, dx = 0, dy = 0) => ({ s, tx: cx + dx - s * cx, ty: cy + dy - s * cy }),
    mul: (a, b) => ({ s: a.s * b.s, tx: a.s * b.tx + a.tx, ty: a.s * b.ty + a.ty }),
    inv: a => ({ s: 1 / a.s, tx: -a.tx / a.s, ty: -a.ty / a.s }),
    mix: (a, b, k) => ({ s: a.s * Math.pow(b.s / a.s, k), tx: lerp(a.tx, b.tx, k), ty: lerp(a.ty, b.ty, k) }),
    css: a => `matrix(${a.s},0,0,${a.s},${a.tx},${a.ty})`,
  };

  // Slow, continuous camera push on every shot. It keeps running through the
  // transitions, so the image never stops moving at a cut.
  function kb(i, n) {
    const s = SHOTS[i];
    const u = (n - s.at) / s.len;
    return A.about(1.045 + 0.04 * u, s.kb[0], s.kb[1]);
  }
  const srcOf = (i, n) => { const s = SHOTS[i]; return clamp(s.src[0] + n - s.at, s.src[0], s.src[1]); };

  // Transitions between shot i-1 (out) and shot i (in), over the overlap of the two.
  // Each returns the look of both layers for phase k in (0, 1).
  const look = (o = {}) => ({ tr: A.id, blur: 0, vblur: 0, bright: 1, ...o });
  const TRANS = {
    // Garten -> Deckel: soft push into the control box, the close-up settles out of it.
    1: k => ({
      out: look({ tr: A.about(Math.pow(1.32, E.inQuad(k)), 600, 1040), blur: 7 * bell(k * 0.9) }),
      in: look({ tr: A.about(Math.pow(1.2, 1 - E.outQuad(k)), 468, 954), blur: 7 * bell(0.1 + k * 0.9) }),
      alpha: smooth(0.18, 0.82, k),
      glow: 1,
    }),
    // Deckel -> Wasser: the camera tilts down from the display into the water.
    2: k => ({
      out: look({ tr: A.about(1 + 0.06 * E.inQuad(k), 540, 960, 0, -460 * E.inQuad(k)), vblur: 26 * bell(k * 0.85) }),
      in: look({ tr: A.about(1.06 - 0.06 * E.outQuad(k), 540, 960, 0, 460 * (1 - E.outQuad(k))), vblur: 26 * bell(0.15 + k * 0.85) }),
      alpha: smooth(0.22, 0.78, k),
    }),
    // Wasser -> leere Wanne: the water flares into sunlight and the garden opens up.
    3: k => ({
      out: look({ tr: A.about(1 + 0.08 * E.inQuad(k), 560, 760), bright: 1 + 0.45 * smooth(0.1, 0.9, k), blur: 5 * bell(k * 0.9) }),
      in: look({ bright: 1 + 0.45 * (1 - smooth(0.1, 0.9, k)), blur: 5 * bell(0.1 + k * 0.9) }),
      alpha: smooth(0.25, 0.75, k),
      bloom: 0.42 * bell(k),
    }),
    // Leere Wanne -> Paar: both shots locked on the tub, the couple simply appears in it.
    4: null, // aligned dissolve, see layersAt()
    // Paar -> Paar näher: a gentle push in on the two of them.
    5: k => ({
      out: look({ tr: A.about(Math.pow(1.22, E.inQuad(k)), 556, 940, -60 * E.inQuad(k), -20 * E.inQuad(k)), blur: 4 * bell(k * 0.9) }),
      in: look({ tr: A.about(Math.pow(1.1, 1 - E.outQuad(k)), 470, 915), blur: 4 * bell(0.1 + k * 0.9) }),
      alpha: smooth(0.2, 0.8, k),
      glow: 0.8,
    }),
  };
  // The incoming shot of transition 3 keeps easing out of its pull-back after the overlap.
  const PULLBACK = { shot: 3, dur: 40, from: 1.16, at: [504, 1040] };

  function layersAt(n) {
    const layers = [];
    let fx = { glow: 0, glowK: 0, bloom: 0, ring: null };
    // Last shot that has started.
    let i = SHOTS.length - 1;
    while (i > 0 && n < SHOTS[i].at) i--;
    const cur = SHOTS[i];
    const base = j => ({ shot: j, src: srcOf(j, n), alpha: 1, ...look({ tr: kb(j, n) }) });

    let inL = base(i);
    if (i === PULLBACK.shot) {
      const k = E.outCubic(prog(n, cur.at, PULLBACK.dur));
      inL.tr = A.mul(A.about(lerp(PULLBACK.from, 1, k), ...PULLBACK.at), inL.tr);
    }
    const prev = i > 0 ? SHOTS[i - 1] : null;
    if (prev && n <= prev.end) {
      // Inside the overlap with the previous shot.
      const D = prev.end - cur.at + 1;
      const k = (n - cur.at + 1) / (D + 1);
      const outL = base(i - 1);
      if (i === 4) {
        // Aligned dissolve: a camera move A(e) carries `leer` onto the framing of `paar`,
        // and `paar` is drawn through the measured plate map, so both stay registered.
        const e = E.inOutSine(k);
        const K4 = kb(3, n), K5 = kb(4, n);
        const target = A.mul(A.mul(K5, LEER_TO_PAAR), A.inv(K4));
        const cam = A.mix(A.id, target, e);
        outL.tr = A.mul(cam, K4);
        inL.tr = A.mul(A.mul(cam, K4), A.inv(LEER_TO_PAAR));
        inL.alpha = smooth(0.05, 0.95, k);
      } else {
        const t = TRANS[i](k);
        Object.assign(outL, { ...t.out, tr: A.mul(t.out.tr, outL.tr) });
        Object.assign(inL, { ...t.in, tr: A.mul(t.in.tr, inL.tr), alpha: t.alpha });
        fx.glow = (t.glow || 0) * bell(k);
        fx.glowK = k;
        fx.bloom = t.bloom || 0;
      }
      layers.push(outL);
    }
    layers.push(inL);

    // Rim highlight: traces the tub while the couple appears, then breathes out.
    const paar = SHOTS[4];
    const r0 = paar.at + 8;
    if (n >= r0 && n < r0 + 46) {
      const L = layers.find(l => l.shot === 4);
      fx.ring = { tr: L ? L.tr : kb(4, n), draw: E.inOutCubic(prog(n, r0, 20)), grow: E.outCubic(prog(n, r0 + 10, 36)) };
    }
    return { layers, fx };
  }

  const el = {
    slots: $$('.shot'),
    glow: $('#glow'), bloom: $('#bloom'), grain: $('#grain'), veil: $('#veil'),
    frame: $('#frame'), ring: $('#ring'), rule: $('#rule'), logo: $('#logo'),
    vblur: [$('#vblur0 feGaussianBlur'), $('#vblur1 feGaussianBlur')],
  };
  const glowCtx = el.glow.getContext('2d');
  const grainCtx = el.grain.getContext('2d');
  const FRAME_LEN = 2 * (968 + 1808);

  // Seeded grain, a fresh field each frame (deterministic per frame number).
  function grain(n) {
    let x = (n + 1) * 2654435761 >>> 0;
    const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
    const img = grainCtx.createImageData(540, 960);
    const d = img.data;
    for (let p = 0; p < d.length; p += 4) {
      const v = (rnd() + rnd() + rnd()) * 85;
      d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255;
    }
    grainCtx.putImageData(img, 0, 0);
  }

  // Warm sun glint gliding diagonally across a transition.
  function glow(a, k) {
    glowCtx.clearRect(0, 0, 540, 960);
    if (a <= 0.002) return;
    const x = lerp(470, 90, k), y = lerp(120, 760, k);
    const g = glowCtx.createRadialGradient(x, y, 0, x, y, 520);
    g.addColorStop(0, `rgba(255, 226, 180, ${0.55 * a})`);
    g.addColorStop(0.35, `rgba(255, 200, 140, ${0.22 * a})`);
    g.addColorStop(1, 'rgba(255, 190, 130, 0)');
    glowCtx.fillStyle = g;
    glowCtx.fillRect(0, 0, 540, 960);
  }

  function render(n, { layers, fx }) {
    el.slots.forEach((slot, j) => {
      const L = layers[j];
      if (!L) { slot.style.display = 'none'; return; }
      slot.style.display = '';
      slot.style.opacity = L.alpha.toFixed(4);
      const cam = slot.firstElementChild;
      cam.style.transform = A.css(L.tr);
      el.vblur[j].setAttribute('stdDeviation', `0 ${L.vblur.toFixed(2)}`);
      const f = [];
      if (L.vblur > 0.05) f.push(`url(#vblur${j})`);
      if (L.blur > 0.05) f.push(`blur(${L.blur.toFixed(2)}px)`);
      if (Math.abs(L.bright - 1) > 0.002) f.push(`brightness(${L.bright.toFixed(3)})`);
      cam.style.filter = f.join(' ');
    });

    glow(fx.glow, fx.glowK);
    el.bloom.style.opacity = fx.bloom.toFixed(4);
    grain(n);

    // Opening: up from navy, a hairline frame draws itself and lets the picture go.
    // Ending: the picture softens under navy, the frame returns around the logo.
    const open = 1 - E.outCubic(prog(n, 0, 12));
    const veil = 0.58 * E.inOutCubic(prog(n, END.veil, 38));
    el.veil.style.opacity = Math.max(open, veil).toFixed(4);

    const endBlur = 14 * E.inOutCubic(prog(n, END.veil + 6, 40));
    if (endBlur > 0.05) {
      const top = el.slots[layers.length - 1].firstElementChild;
      top.style.filter = `${top.style.filter} blur(${endBlur.toFixed(2)}px)`;
    }

    const drawIn = E.inOutCubic(prog(n, 6, 30));
    const fadeOut = 1 - E.inOutCubic(prog(n, 44, 18));
    const drawEnd = E.inOutCubic(prog(n, END.frame, 34));
    let frameDraw = 0, frameAlpha = 0;
    if (n < 70) { frameDraw = drawIn; frameAlpha = 0.6 * fadeOut; }
    else if (n >= END.frame) { frameDraw = drawEnd; frameAlpha = 0.7; }
    el.frame.style.strokeDasharray = `${FRAME_LEN * frameDraw} ${FRAME_LEN}`;
    el.frame.style.opacity = frameDraw > 0 ? frameAlpha.toFixed(4) : 0;

    if (fx.ring) {
      const { tr, draw, grow } = fx.ring;
      const s = tr.s * (1 + 0.16 * grow);
      el.ring.setAttribute('cx', (tr.s * RIM.cx + tr.tx).toFixed(2));
      el.ring.setAttribute('cy', (tr.s * RIM.cy + tr.ty).toFixed(2));
      el.ring.setAttribute('rx', (s * RIM.rx).toFixed(2));
      el.ring.setAttribute('ry', (s * RIM.ry).toFixed(2));
      const len = Math.PI * 2 * Math.sqrt((RIM.rx * RIM.rx + RIM.ry * RIM.ry) / 2) * s;
      el.ring.style.strokeDasharray = `${len * draw} ${len}`;
      el.ring.style.strokeDashoffset = `${-len * 0.25}`;
      el.ring.style.opacity = (0.85 * (1 - Math.pow(grow, 1.5))).toFixed(4);
      el.ring.style.display = '';
    } else {
      el.ring.style.display = 'none';
    }

    // Logo: settles out of a soft focus, a short rule grows under it.
    const kl = E.outCubic(prog(n, END.logo, 26));
    el.logo.style.opacity = kl.toFixed(4);
    el.logo.style.transform = `translateY(-50%) translateY(${(1 - kl) * 14}px) scale(${lerp(0.97, 1, kl).toFixed(4)})`;
    el.logo.style.filter = kl < 1 ? `blur(${((1 - kl) * 8).toFixed(2)}px)` : '';
    const kr = E.outExpo(prog(n, END.rule, 24));
    el.rule.setAttribute('x1', (540 - 80 * kr).toFixed(2));
    el.rule.setAttribute('x2', (540 + 80 * kr).toFixed(2));
    el.rule.setAttribute('y1', 1006); el.rule.setAttribute('y2', 1006);
    el.rule.style.opacity = kr > 0 ? 0.8 : 0;
  }

  async function seek(n) {
    const state = layersAt(n);
    await Promise.all(state.layers.map(async (L, j) => {
      const imgs = $$('img', el.slots[j]);
      if (imgs[0].dataset.idx !== String(L.src)) {
        const url = `${PLATE_DIR}/f${String(L.src).padStart(4, '0')}.jpg`;
        imgs.forEach(img => { img.src = url; });
        await Promise.all(imgs.map(img => img.decode()));
        imgs[0].dataset.idx = String(L.src);
      }
    }));
    render(n, state);
  }

  async function init() {
    await $('#logo img').decode();
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
