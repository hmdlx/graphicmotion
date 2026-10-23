// Kombisauna EVEREST – POV-Tour + Modell-Karussell, 16:9. KI-Clips (Higgsfield, Kling 3.0,
// Start-/Endbild) als Plates; Stopps und Karussell-Halte sind echte Standbilder (Outpaint bzw.
// Studio-Keyframes aus den Freistellern). window.COMP.seek(n) puts the stage into frame n.
(() => {
  const FPS = 30, W = 1920, H = 1080;
  const params = new URLSearchParams(location.search);
  const PLATES = params.get('plates') || '../../build/everest-tour/plates';

  // Schnittlisten. clip: Plates mit Speed-Ramp (ramp 'inout' = Beschleunigen/Abbremsen, 'lin' = linear).
  // 'full' = 45,8 s; '20s' = gleiche Szenen und Logik, schnellere Ramps, kürzere Stopps, ohne USP-Chips.
  // Die Fassung wählt window.CUT (composition-20s.html) oder ?cut=.
  const DOOR_OPEN = 80;                           // Grad; positiv = Griffkante kommt zur Kamera (nach außen)
  const DOOR_BASE = 'keyframes/k1_door_base.png';
  const CUTS = {
    full: {
      seg: [
        { id: 'open', still: DOOR_BASE, door: [0, DOOR_OPEN], dur: 1.4 },
        { id: 'pov1', clip: 'pov1', dur: 4.0, ramp: 'inout' },
        { id: 'ofen', still: 'source/stop_ofen.jpg', dur: 3.0, push: 0.05 },
        { id: 'pov2', clip: 'pov2', dur: 3.6, ramp: 'inout' },
        { id: 'ir', still: 'source/stop_strahler.jpg', dur: 3.0, push: 0.05 },
        { id: 'pov3', clip: 'pov3', dur: 4.2, ramp: 'inout' },
        { id: 'close', still: DOOR_BASE, door: [DOOR_OPEN, 0], dur: 1.0 },
        { id: 'k1', still: 'keyframes/k1_xl.png', dur: 1.0 },
        { id: 'car1', clip: 'car1', dur: 5.0, ramp: 'lin' },
        { id: 'k2', still: 'keyframes/k2_l.png', dur: 1.6 },
        { id: 'car2', clip: 'car2', dur: 5.0, ramp: 'lin' },
        { id: 'k3', still: 'keyframes/k3_m.png', dur: 1.6 },
        { id: 'car3', clip: 'car3', dur: 5.0, ramp: 'lin' },
        { id: 'k4', still: 'keyframes/k4_s.png', dur: 1.6 },
        { id: 'end', still: 'keyframes/k5_lineup.png', dur: 4.8 },
      ],
      chips: true, doorPad: 0.15, countDur: 1.0, endXf: 0.8, end: { title: 0.5, price: 1.0, tags: 0.9 },
    },
    '20s': {
      seg: [
        { id: 'open', still: DOOR_BASE, door: [0, DOOR_OPEN], dur: 0.8 },
        { id: 'pov1', clip: 'pov1', dur: 2.2, ramp: 'inout' },
        { id: 'ofen', still: 'source/stop_ofen.jpg', dur: 1.7, push: 0.04 },
        { id: 'pov2', clip: 'pov2', dur: 1.3, ramp: 'inout' },
        { id: 'ir', still: 'source/stop_strahler.jpg', dur: 1.7, push: 0.04 },
        { id: 'pov3', clip: 'pov3', dur: 1.9, ramp: 'inout' },
        { id: 'close', still: DOOR_BASE, door: [DOOR_OPEN, 0], dur: 0.6 },
        { id: 'k1', still: 'keyframes/k1_xl.png', dur: 0.3 },
        { id: 'car1', clip: 'car1', dur: 2.2, ramp: 'lin' },
        { id: 'k2', still: 'keyframes/k2_l.png', dur: 0.3 },
        { id: 'car2', clip: 'car2', dur: 2.2, ramp: 'lin' },
        { id: 'k3', still: 'keyframes/k3_m.png', dur: 0.3 },
        { id: 'car3', clip: 'car3', dur: 2.2, ramp: 'lin' },
        { id: 'k4', still: 'keyframes/k4_s.png', dur: 0.2 },
        { id: 'end', still: 'keyframes/k5_lineup.png', dur: 2.1 },
      ],
      chips: false, doorPad: 0.08, countDur: 0.6, endXf: 0.5, end: { title: 0.3, price: 0.6, tags: 0.6 },
    },
  };
  const CUT = CUTS[params.get('cut') || window.CUT || 'full'];
  const SEG = CUT.seg;
  let acc = 0;
  for (const s of SEG) { s.t0 = acc; acc += s.dur; s.t1 = acc; }
  const TOTAL = Math.round(acc * FPS);
  const S = Object.fromEntries(SEG.map(s => [s.id, s]));
  const XF = 0.2;                                 // Clip-Ende -> Standbild überblenden

  // Modelle in Karussell-Reihenfolge (Daten: homedeluxe.de, Art.-Nr. 75499–75502)
  const MODELS = [
    { size: 3, name: 'EVEREST XL', r1: '200 × 200 cm · 5–6 Personen', r2: '5× Infrarot 400 W · Saunaofen 8 kW' },
    { size: 2, name: 'EVEREST L', r1: '180 × 120 cm · 4 Personen', r2: '3× Infrarot 400 W · Saunaofen 6 kW' },
    { size: 1, name: 'EVEREST M', r1: '120 × 120 cm · 2 Personen', r2: '2× Infrarot 400 W · Saunaofen 3,6 kW' },
    { size: 0, name: 'EVEREST S', r1: '100 × 120 cm · 1–2 Personen', r2: '1× Infrarot 400 W · Saunaofen 3,6 kW' },
  ];
  // Label-Wechsel: Modell i steht ab Ende von car(i) bis Anfang von car(i+1)
  const CAR = ['car1', 'car2', 'car3'];

  // Bauteile in den Stopp-Standbildern (Bühnen-px bei Skalierung 1)
  const BR = {
    ofen: [[596, 176, 1330, 640]],
    ir: [[774, 300, 920, 760], [1210, 300, 1356, 760]],
  };

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, a, d) => clamp((t - a) / d);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: k => { const c1 = 1.3, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };

  const imgA = $('#imgA'), imgB = $('#imgB'), footage = $('#footage');

  // --- Bildquelle für Zeit t: [{src, alpha, scale}] ---
  function plate(seg, t) {
    const info = window.PLATES[seg.clip];
    const u = prog(t, seg.t0, seg.dur);
    const k = seg.ramp === 'inout' ? E.inOutSine(u) : u;
    const f = clamp(Math.round(k * (info.n - 1)), 0, info.n - 1) + 1;
    return `${PLATES}/${seg.clip}/${String(f).padStart(4, '0')}.jpg`;
  }
  function stillScale(seg, t) { return seg.push ? 1 + seg.push * E.outCubic(prog(t, seg.t0, seg.dur)) : 1; }

  function layers(t) {
    const i = SEG.findIndex(s => t < s.t1);
    const seg = SEG[i < 0 ? SEG.length - 1 : i];
    const next = SEG[SEG.indexOf(seg) + 1];
    if (seg.id === 'end') {                        // Überblendung Karussell -> Line-up
      const k = E.inOutCubic(prog(t, seg.t0, CUT.endXf));
      return [{ src: S.k4.still, alpha: 1, scale: 1 - 0.04 * k }, { src: seg.still, alpha: k, scale: 1.04 - 0.04 * E.outCubic(prog(t, seg.t0, CUT.endXf * 2)) }];
    }
    if (seg.still) return [{ src: seg.still, alpha: 1, scale: stillScale(seg, t) }];
    const out = [{ src: plate(seg, t), alpha: 1, scale: 1 }];
    if (next && next.still && t > seg.t1 - XF) out.push({ src: next.still, alpha: prog(t, seg.t1 - XF, XF), scale: 1 });
    return out;
  }

  // Kamera: nach einem Stopp mit Push-in bleibt die Skalierung und läuft im nächsten Clip aus
  function camScale(t) {
    for (const [stop, clip] of [['ofen', 'pov2'], ['ir', 'pov3']]) {
      const s = S[stop], c = S[clip];
      if (t >= c.t0 && t < c.t1) return 1 + s.push * (1 - E.inOutCubic(prog(t, c.t0, 1.2)));
    }
    return 1;
  }

  // Tür: Winkel im Tür-Segment (Basisbild ohne Tür + gedrehte Glasscheibe)
  const door = $('#door'), doorwrap = $('#doorwrap');
  function setDoor(t) {
    const seg = SEG.find(s => s.door && t >= s.t0 && t < s.t1);
    doorwrap.style.visibility = seg ? 'visible' : 'hidden';
    if (!seg) return;
    const a = lerp(seg.door[0], seg.door[1], E.inOutCubic(prog(t, seg.t0 + CUT.doorPad, seg.dur - 2 * CUT.doorPad)));
    door.style.transform = `rotateY(${a.toFixed(3)}deg)`;
    const glass = Math.abs(Math.sin(a * Math.PI / 180));
    door.querySelector('.tint').style.opacity = glass.toFixed(3);
    door.querySelector('.edge').style.opacity = glass.toFixed(3);
  }

  function setImg(img, l) {
    if (!l) { img.style.opacity = 0; return Promise.resolve(); }
    img.style.opacity = l.alpha.toFixed(3);
    img.style.transform = `scale(${l.scale.toFixed(4)})`;
    const url = new URL(l.src, location.href).href;
    if (img.src === url) return Promise.resolve();
    img.src = url;
    return img.decode().catch(() => {});
  }

  // --- Grafik-Bausteine ---
  const show = (el, on) => { el.style.visibility = on ? 'visible' : 'hidden'; };
  // Zeilen eines Blocks fahren aus der Maske ein (tin) und wieder aus (tout)
  function lines(root, t, tin, tout, stagger = 0.07) {
    const spans = [...root.querySelectorAll('.ln > span')];
    let any = false;
    spans.forEach((s, i) => {
      const a = E.outExpo(prog(t, tin + i * stagger, 0.6));
      const b = tout == null ? 0 : E.inExpo(prog(t, tout + i * stagger * 0.6, 0.4));
      s.style.transform = `translateY(${((1 - a) * 110 - b * 110).toFixed(2)}%)`;
      if (a > 0 && b < 1) any = true;
    });
    // Blockflächen wischen mit
    [...root.querySelectorAll(':scope > .blk, :scope > .chip')].forEach((blk, i) => {
      const a = E.outExpo(prog(t, tin + i * stagger - 0.05, 0.55));
      const b = tout == null ? 0 : E.inExpo(prog(t, tout + i * stagger * 0.6, 0.4));
      blk.style.clipPath = `inset(0 ${((1 - a) * 100).toFixed(2)}% 0 ${(b * 100).toFixed(2)}%)`;
    });
    show(root, any || (t >= tin && (tout == null || t < tout + 1)));
  }

  function brackets(path, rect, s = 1, alpha = 1) {
    if (!rect || alpha <= 0.001) { path.setAttribute('d', ''); return; }
    const cx = (rect[0] + rect[2]) / 2, cy = (rect[1] + rect[3]) / 2;
    const [x0, y0, x1, y1] = [cx + (rect[0] - cx) * s, cy + (rect[1] - cy) * s, cx + (rect[2] - cx) * s, cy + (rect[3] - cy) * s];
    const a = Math.min(34, (x1 - x0) / 3, (y1 - y0) / 3);
    path.setAttribute('d', [
      `M${x0},${y0 + a}V${y0}H${x0 + a}`, `M${x1 - a},${y0}H${x1}V${y0 + a}`,
      `M${x1},${y1 - a}V${y1}H${x1 - a}`, `M${x0 + a},${y1}H${x0}V${y1 - a}`,
    ].join(''));
    path.style.opacity = alpha.toFixed(3);
  }
  // Rechteck im Standbild -> Bühne (Standbild-Push um die Bildmitte)
  const scaled = (r, s) => [960 + (r[0] - 960) * s, 540 + (r[1] - 540) * s, 960 + (r[2] - 960) * s, 540 + (r[3] - 540) * s];

  function count(root, t, t0) {
    root.querySelectorAll('.num').forEach(n => { n.textContent = String(Math.round(+n.dataset.to * E.outCubic(prog(t, t0, CUT.countDur)))); });
  }

  const el = {
    intro: $('#intro'), uspOfen: $('#usp-ofen'), uspIr: $('#usp-ir'), chips: $('#chips'),
    model: $('#model'), mName: $('#m-name'), mR1: $('#m-row1'), mR2: $('#m-row2'),
    sizes: $('#sizes'), fill: $('#sizes .fill'), endTitle: $('#end-title'), endPrice: $('#end-price'),
    br1: $('#br1'), br2: $('#br2'), flash: $('#flash'), logo: $('#logo'),
  };
  const sizeTags = $$('.size-tag');
  sizeTags.forEach(n => { n.style.left = `${n.dataset.x}px`; });

  async function seek(n) {
    const t = n / FPS;

    // Footage
    const L = layers(t);
    footage.style.transform = `scale(${camScale(t).toFixed(4)})`;
    await Promise.all([setImg(imgA, L[0]), setImg(imgB, L[1])]);
    setDoor(t);

    // Blitz beim Ankommen an einem Stopp
    const fl = Math.max(...['ofen', 'ir'].map(id => 1 - prog(t, S[id].t0, 0.18)).map((v, i) => (t >= S[['ofen', 'ir'][i]].t0 ? v : 0)));
    el.flash.style.opacity = (0.35 * fl).toFixed(3);

    // Intro
    lines(el.intro, t, 0.15, S.pov1.t0 + 0.6);

    // Stopps: Karte + Klammern + Zähler
    lines(el.uspOfen, t, S.ofen.t0 + 0.1, S.ofen.t1 - 0.15);
    lines(el.uspIr, t, S.ir.t0 + 0.1, S.ir.t1 - 0.15);
    count(el.uspOfen, t, S.ofen.t0 + 0.2);
    count(el.uspIr, t, S.ir.t0 + 0.2);
    let b1 = null, b2 = null, bs = 1, ba = 0;
    for (const id of ['ofen', 'ir']) {
      const s = S[id];
      if (t >= s.t0 && t < s.t1) {
        const sc = stillScale(s, t) * camScale(t);
        const lock = E.outBack(prog(t, s.t0 + 0.15, 0.45));
        bs = lerp(1.25, 1, lock); ba = clamp(prog(t, s.t0 + 0.15, 0.15)) * (1 - prog(t, s.t1 - 0.2, 0.2));
        b1 = scaled(BR[id][0], sc); b2 = BR[id][1] ? scaled(BR[id][1], sc) : null;
      }
    }
    brackets(el.br1, b1, bs, ba); brackets(el.br2, b2, bs, ba);

    // Rausfahrt: Chips nacheinander (nur in der langen Fassung)
    if (CUT.chips) lines(el.chips, t, S.pov3.t0 + 0.5, S.pov3.t1 - 1.5, 0.4);
    else show(el.chips, false);

    // Modell-Label + Größenwahl
    const mStart = S.k1.t0 - 0.5, mEnd = S.end.t0;
    let mi = 0;
    CAR.forEach((c, i) => { if (t >= S[c].t0 + S[c].dur * 0.55) mi = i + 1; });
    const m = MODELS[mi];
    if (el.mName.textContent !== m.name) { el.mName.textContent = m.name; el.mR1.textContent = m.r1; el.mR2.textContent = m.r2; }
    // Label raus zu Beginn jeder Karussell-Drehung, neues Label rein gegen Ende
    let tin = mStart, tout = null;
    CAR.forEach((c, i) => {
      const s = S[c];
      if (t >= s.t0 && t < s.t0 + s.dur * 0.55) { tin = (i === 0 ? mStart : S[CAR[i - 1]].t0 + S[CAR[i - 1]].dur * 0.55); tout = s.t0 + 0.1; }
      else if (t >= s.t0 + s.dur * 0.55) { tin = s.t0 + s.dur * 0.55 + 0.1; tout = null; }
    });
    if (t >= mEnd - 0.4) tout = mEnd - 0.4;
    lines(el.model, t, tin, tout);
    // Größenwahl: Füllung gleitet zur aktiven Größe
    {
      const posOf = i => i * 82;
      let x = posOf(MODELS[0].size);
      CAR.forEach((c, i) => { const s = S[c]; x = lerp(x, posOf(MODELS[i + 1].size), E.inOutCubic(prog(t, s.t0 + 0.6, s.dur - 1.2))); });
      el.fill.style.transform = `translateX(${x}px)`;
      const a = E.outExpo(prog(t, mStart + 0.2, 0.5)) * (1 - E.inExpo(prog(t, mEnd - 0.4, 0.4)));
      el.sizes.style.clipPath = `inset(0 0 0 ${((1 - a) * 100).toFixed(2)}%)`;
      [...el.sizes.querySelectorAll('div')].forEach((d, i) => { d.style.color = Math.abs(x - posOf(i)) < 41 ? '#fff' : ''; });
    }

    // Endcard
    lines(el.endTitle, t, S.end.t0 + CUT.end.title, null);
    lines(el.endPrice, t, S.end.t0 + CUT.end.price, null);
    sizeTags.forEach((n, i) => {
      const k = E.outBack(prog(t, S.end.t0 + CUT.end.tags + i * 0.12, 0.45));
      n.style.opacity = clamp(k * 3).toFixed(3);
      n.style.transform = `translateX(-50%) translateY(${((1 - k) * 30).toFixed(1)}px)`;
    });
  }

  const manifest = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = `${PLATES}/manifest.js`; s.onload = res; s.onerror = () => rej(new Error('manifest.js fehlt – prepare.sh ausführen'));
    document.head.appendChild(s);
  });
  window.COMP = { FPS, TOTAL, W, H, seek, ready: Promise.all([document.fonts.ready, manifest]).then(() => seek(0)) };

  if (params.get('clean')) document.body.classList.add('clean');
  const t0 = params.get('t');
  if (t0 != null) window.COMP.ready.then(() => seek(Math.round(parseFloat(t0) * FPS)));
})();
