// Kombisauna EVEREST – 2 in 1 als Loop (Shop-Kachel 1:1 und 16:9). Die Infokarten drehen
// sich wie ein Karussell (Trommel um die waagerechte Achse): Sauna -> Infrarot, am Ende
// stehen beide Karten untereinander. Alles andere folgt der Karte, die gerade vorne ist:
//   Sauna-Karte    -> „SAUNA“ navy + Akzentbalken, Kamera auf dem Ofen, Dampf steigt auf
//   Infrarot-Karte -> „+ INFRAROT“ navy + Balken, Kamera auf dem Strahler, Infrarot-Wellen
//   beide Karten   -> Balken über beiden Wörtern, Kamera zieht auf, beide Bauteile markiert,
//                     „2 IN 1“ und Preis pulsieren
// Intro baut auf, Outro baut ab; Logo, Linie und Preis bleiben stehen -> nahtloser Loop.
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
(() => {
  const FPS = 30;
  // Formatabhängige Maße; die 16:9-Fassung setzt window.LAYOUT vor diesem Skript.
  const L = Object.assign({ W: 1080, H: 1080, cardH: 216, gap: 22, photoW: 320, photoH: 616 }, window.LAYOUT);
  const { W, H } = L;
  const TOTAL = 336;                              // 11,2 s
  const params = new URLSearchParams(location.search);
  const SRC = params.get('plates') || 'source';

  // Zeiten in Sekunden
  const T = {
    intro: 0.05,                                  // Aufbau bis ca. 1,3 s
    swap: 3.4, swapDur: 0.8,                      // Sauna -> Infrarot
    both: 6.6, bothDur: 1.0,                      // Infrarot rutscht in Slot 2, Sauna dreht oben wieder rein
    outro: 10.4,                                  // Abbau bis 11,2 s
  };
  const SLOT2 = L.cardH + L.gap;                  // Abstand Slot 1 -> Slot 2
  const DEPTH = L.cardH / 2;                      // halbe Kartenhöhe = Trommelradius

  // Produktfoto: Quelle 468 x 900, angezeigt photoW x photoH. Bauteile in Quell-px.
  const PW = L.photoW, PH = L.photoH;
  const SX = PW / 468, SY = PH / 900, PS = PW / 320;
  const box = ([x0, y0, x1, y1]) => [x0 * SX, y0 * SY, x1 * SX, y1 * SY];
  const OFEN = box([16, 586, 178, 886]);
  const STRAHLER = box([196, 212, 276, 494]);
  const ARM = 22 * PS;
  const mid = r => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];

  // Kamera im Foto: Fotopunkt (cx, cy) in die Mitte, Zoom s (wird an den Bildrand geklemmt).
  const CAM = {
    open:  { cx: PW / 2, cy: PH / 2, s: 1.22 },
    ofen:  { cx: mid(OFEN)[0], cy: mid(OFEN)[1] - 30 * PS, s: 1.34 },
    ofen2: { cx: mid(OFEN)[0], cy: mid(OFEN)[1] - 30 * PS, s: 1.40 },
    str:   { cx: mid(STRAHLER)[0], cy: mid(STRAHLER)[1], s: 1.34 },
    str2:  { cx: mid(STRAHLER)[0], cy: mid(STRAHLER)[1] + 10 * PS, s: 1.40 },
    full:  { cx: PW / 2, cy: PH / 2, s: 1.0 },
    full2: { cx: PW / 2, cy: PH / 2, s: 1.04 },
    close: { cx: PW / 2, cy: PH / 2, s: 1.12 },
  };

  const NAVY = [14, 34, 52], GREY = [189, 193, 196];

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const mixRect = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  const mixColor = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    inCubic: k => k * k * k,
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    outBack: k => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
    inOutBack: k => {
      const c2 = 0.9 * 1.525;
      return k < 0.5 ? (Math.pow(2 * k, 2) * ((c2 + 1) * 2 * k - c2)) / 2 : (Math.pow(2 * k - 2, 2) * ((c2 + 1) * (k * 2 - 2) + c2) + 2) / 2;
    },
  };
  const bump = k => (k <= 0 || k >= 1 ? 0 : Math.sin(Math.PI * k) * (1 - 0.35 * k));

  const el = {
    kicker: $('#kicker'), twoinone: $('#twoinone'),
    sauna: $('#card-sauna'), ir: $('#card-ir'),
    numSauna: $('#card-sauna .num'), numIr: $('#card-ir .num'),
    mSauna: $('#m-sauna'), mIr: $('#m-ir'), accent: $('#accent'),
    wrap: $('#photo-wrap'), zoom: $('#zoom'),
    brSauna: $('#br-sauna'), brIr: $('#br-ir'),
    glowOfen: $('#glow-ofen'), glowIr: $('#glow-ir'),
    steam: $('#steam'), waves: $('#waves'),
    price: $('#price'), shine: $('#price .shine'),
  };
  const lines = $$('#stage .ln > span');            // Reihenfolge im DOM = Reihenfolge im Intro

  // Dampf- und Wellen-Elemente einmal anlegen
  const NS = 'http://www.w3.org/2000/svg';
  const puffs = Array.from({ length: 10 }, () => el.steam.appendChild(document.createElementNS(NS, 'circle')));
  const rings = Array.from({ length: 3 }, () => el.waves.appendChild(document.createElementNS(NS, 'rect')));

  // --- Bausteine ---
  function card(node, phi, y) {
    const vis = clamp(Math.cos(phi * Math.PI / 180));
    node.style.transform = `translateY(${y}px) translateZ(${-DEPTH}px) rotateX(${phi}deg) translateZ(${DEPTH}px)`;
    node.style.visibility = vis > 0.001 ? 'visible' : 'hidden';
    node.querySelector('.shade').style.opacity = ((1 - vis) * 0.28).toFixed(3);
    return vis;
  }

  function camera(t) {
    const seg = [
      [0.15, 1.6, 'open', 'ofen', E.inOutCubic],
      [1.6, T.swap, 'ofen', 'ofen2', k => k],
      [T.swap, T.swap + T.swapDur, 'ofen2', 'str', E.inOutCubic],
      [T.swap + T.swapDur, T.both, 'str', 'str2', k => k],
      [T.both, T.both + T.bothDur, 'str2', 'full', E.inOutCubic],
      [T.both + T.bothDur, T.outro, 'full', 'full2', k => k],
      [T.outro, T.outro + 0.8, 'full2', 'close', E.inExpo],
    ];
    let c = CAM.open;
    for (const [a, b, from, to, ease] of seg) {
      if (t >= a) { const k = ease(prog(t, a, b - a)); c = { cx: lerp(CAM[from].cx, CAM[to].cx, k), cy: lerp(CAM[from].cy, CAM[to].cy, k), s: lerp(CAM[from].s, CAM[to].s, k) }; }
    }
    const tx = clamp(PW / 2 - c.cx * c.s, PW - PW * c.s, 0);
    const ty = clamp(PH / 2 - c.cy * c.s, PH - PH * c.s, 0);
    return { s: c.s, tx, ty, map: r => [r[0] * c.s + tx, r[1] * c.s + ty, r[2] * c.s + tx, r[3] * c.s + ty] };
  }

  // Eck-Klammern um ein Rechteck (Bühnen-px); s skaliert um die Mitte (Lock-on).
  function brackets(path, rect, s = 1, alpha = 1) {
    if (!rect || alpha <= 0.001) { path.setAttribute('d', ''); return; }
    const [cx, cy] = mid(rect);
    const [x0, y0, x1, y1] = [cx + (rect[0] - cx) * s, cy + (rect[1] - cy) * s, cx + (rect[2] - cx) * s, cy + (rect[3] - cy) * s];
    const a = Math.min(ARM, (x1 - x0) / 3, (y1 - y0) / 3);
    path.setAttribute('d', [
      `M${x0},${y0 + a}V${y0}H${x0 + a}`, `M${x1 - a},${y0}H${x1}V${y0 + a}`,
      `M${x1},${y1 - a}V${y1}H${x1 - a}`, `M${x0 + a},${y1}H${x0}V${y1 - a}`,
    ].join(''));
    path.style.opacity = alpha.toFixed(3);
  }

  function glow(node, rect, w, h, alpha) {
    const [cx, cy] = mid(rect);
    Object.assign(node.style, { width: `${w}px`, height: `${h}px`, transform: `translate(${cx - w / 2}px, ${cy - h / 2}px)`, opacity: alpha.toFixed(3) });
  }

  // Dampf über den Saunasteinen
  function steam(t, alpha) {
    const [cx] = mid(OFEN), top = OFEN[1] + 18 * PS;
    puffs.forEach((p, i) => {
      const f = ((t / 2.4) + i / puffs.length) % 1;
      const x = cx + (i - 4.5) * 9 * PS + Math.sin(i * 1.9 + f * 4) * 14 * PS;
      const y = top - f * 170 * PS;
      p.setAttribute('cx', x.toFixed(1)); p.setAttribute('cy', y.toFixed(1));
      p.setAttribute('r', ((10 + f * 30) * PS).toFixed(1));
      p.setAttribute('opacity', (alpha * 0.26 * Math.pow(Math.sin(Math.PI * f), 1.5)).toFixed(3));
    });
  }

  // Infrarot-Wellen: eckige Rahmen laufen vom Strahler nach außen
  function waves(t, alpha) {
    rings.forEach((r, i) => {
      const f = ((t / 1.5) + i / rings.length) % 1;
      const g = (6 + f * 46) * PS;
      r.setAttribute('x', (STRAHLER[0] - g).toFixed(1)); r.setAttribute('y', (STRAHLER[1] - g).toFixed(1));
      r.setAttribute('width', (STRAHLER[2] - STRAHLER[0] + 2 * g).toFixed(1)); r.setAttribute('height', (STRAHLER[3] - STRAHLER[1] + 2 * g).toFixed(1));
      r.setAttribute('stroke-width', (3 * PS * (1 - f * 0.5)).toFixed(2));
      r.setAttribute('opacity', (alpha * 0.75 * (1 - f) * clamp(f * 6)).toFixed(3));
    });
  }

  // Akzentbalken links neben SAUNA / + INFRAROT: Zeilen werden beim Start vermessen
  let ROW = null;
  function measureRows() {
    const r = n => { const b = n.getBoundingClientRect(); return [b.top + b.height * 0.13, b.top + b.height * 0.86, b.left]; };
    const a = r(el.mSauna), b = r(el.mIr);
    const fs = parseFloat(getComputedStyle(el.mSauna).fontSize);
    ROW = { sauna: [a[0], a[1]], ir: [b[0], b[1]], x: Math.min(a[2], b[2]) - fs * 0.42, w: fs * 0.14 };
  }

  const count = (node, to, k) => { node.textContent = String(Math.round(to * E.outCubic(k))); };

  function seek(n) {
    const t = n / FPS;
    if (!ROW) measureRows();

    // --- Intro / Outro der Textzeilen ---
    lines.forEach((s, i) => {
      const kin = E.outExpo(prog(t, T.intro + 0.08 + i * 0.07, 0.7));
      const kout = E.inExpo(prog(t, T.outro + i * 0.04, 0.45));
      s.style.transform = `translateY(${((1 - kin) * 108 - kout * 108).toFixed(2)}%)`;
    });
    const kKick = E.outExpo(prog(t, T.intro, 0.6)), kKickOut = E.inExpo(prog(t, T.outro, 0.45));
    el.kicker.style.clipPath = `inset(-10% ${((1 - kKick) * 100).toFixed(2)}% -10% ${(kKickOut * 100).toFixed(2)}%)`;

    // --- Karussell ---
    const kIn = E.outBack(prog(t, T.intro + 0.45, 0.75));
    const kSwap = E.inOutBack(prog(t, T.swap, T.swapDur));
    const kBothB = E.inOutCubic(prog(t, T.both, T.bothDur * 0.75));
    const kBothA = E.outBack(prog(t, T.both + T.bothDur * 0.25, T.bothDur * 0.75));
    const kOutA = E.inCubic(prog(t, T.outro, 0.45)), kOutB = E.inCubic(prog(t, T.outro + 0.1, 0.45));

    let phiA, phiB, yB;
    if (t < T.swap) {                        // Sauna rollt von unten ein
      phiA = -90 * (1 - kIn); phiB = -90; yB = 0;
    } else if (t < T.both) {                 // Trommel dreht: Sauna nach oben weg, Infrarot kommt von unten
      phiA = 90 * kSwap; phiB = -90 + 90 * kSwap; yB = 0;
    } else if (t < T.outro) {                // Infrarot rutscht in Slot 2, Sauna dreht oben wieder ein
      phiA = 90 * (1 - kBothA); phiB = 0; yB = SLOT2 * kBothB;
    } else {                                 // beide rollen nach oben raus
      phiA = 90 * kOutA; phiB = 90 * kOutB; yB = SLOT2;
    }
    const visA = card(el.sauna, phiA, 0);
    const visB = card(el.ir, phiB, yB);
    const aFront = t < T.both ? visA >= visB : true;
    el.sauna.style.zIndex = aFront ? 2 : 1;
    el.ir.style.zIndex = aFront ? 1 : 2;

    // Zahlen zählen hoch, sobald ihre Karte nach vorne kommt
    count(el.numSauna, 100, t < T.both ? prog(t, T.intro + 0.55, 0.9) : prog(t, T.both + 0.3, 0.9));
    count(el.numIr, 400, prog(t, T.swap + 0.2, 0.9));

    // --- Überschrift + Akzentbalken folgen der vorderen Karte ---
    const onA = t < T.outro ? visA : 1, onB = t < T.outro ? visB : 1;
    el.mSauna.style.color = mixColor(GREY, NAVY, onA);
    el.mIr.style.color = mixColor(GREY, NAVY, onB);
    {
      const kS = E.inOutCubic(prog(t, T.swap, T.swapDur));
      const kB = E.outBack(prog(t, T.both + 0.2, 0.7));
      let top = lerp(ROW.sauna[0], ROW.ir[0], kS), bot = lerp(ROW.sauna[1], ROW.ir[1], kS);
      if (t >= T.both) { top = lerp(ROW.ir[0], ROW.sauna[0], kB); bot = ROW.ir[1]; }
      const grow = E.outExpo(prog(t, T.intro + 0.4, 0.6)) * (1 - E.inExpo(prog(t, T.outro, 0.4)));
      const h = (bot - top) * grow;
      Object.assign(el.accent.style, { left: `${ROW.x}px`, top: `${top}px`, width: `${ROW.w}px`, height: `${Math.max(0, h)}px` });
    }

    // „2 IN 1“ und Preis pulsieren, wenn beide Karten stehen
    const pb = bump(prog(t, T.both + 0.35, 0.6));
    el.twoinone.style.transform = `scale(${(1 + 0.06 * pb).toFixed(4)})`;
    el.price.style.transform = `scale(${(1 + 0.07 * bump(prog(t, T.both + 0.5, 0.6))).toFixed(4)})`;
    el.shine.style.transform = `translateX(${lerp(-150, 350, E.inOutCubic(prog(t, T.both + 0.6, 0.8))).toFixed(1)}%) skewX(-20deg)`;

    // --- Produktfoto: Aufdecken, Kamera, Wärme ---
    const kOpen = E.outExpo(prog(t, T.intro + 0.1, 0.8)), kClose = E.inExpo(prog(t, T.outro + 0.05, 0.6));
    el.wrap.style.clipPath = `inset(${((1 - kOpen) * 100).toFixed(2)}% 0 ${(kClose * 100).toFixed(2)}% 0)`;
    const cam = camera(t);
    el.zoom.style.transform = `translate(${cam.tx.toFixed(2)}px, ${cam.ty.toFixed(2)}px) scale(${cam.s.toFixed(4)})`;

    const ofen = cam.map(OFEN), str = cam.map(STRAHLER);
    const lockIntro = E.outBack(prog(t, T.intro + 1.0, 0.4));
    if (t < T.swap) {
      brackets(el.brSauna, ofen, lerp(1.35, 1, lockIntro), clamp(lockIntro * 3)); brackets(el.brIr, null);
    } else if (t < T.swap + T.swapDur) {     // Klammern wandern vom Ofen zum Strahler
      brackets(el.brSauna, mixRect(ofen, str, E.inOutCubic(prog(t, T.swap, T.swapDur)))); brackets(el.brIr, null);
    } else if (t < T.both) {
      const lock = E.outBack(prog(t, T.swap + T.swapDur, 0.35));
      brackets(el.brSauna, null); brackets(el.brIr, str, lerp(1.12, 1, lock));
    } else {                                 // zweites Klammerpaar löst sich vom Strahler und geht zurück zum Ofen
      const k = E.inOutCubic(prog(t, T.both + T.bothDur * 0.2, T.bothDur * 0.8));
      const lock = E.outBack(prog(t, T.both + T.bothDur, 0.35));
      brackets(el.brIr, str);
      brackets(el.brSauna, mixRect(str, ofen, k), k >= 1 ? lerp(1.12, 1, lock) : 1, clamp(k * 6));
    }

    const heatA = t < T.outro ? visA : 1, heatB = t < T.outro ? visB : 1;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.3);
    glow(el.glowOfen, [OFEN[0], OFEN[1] - 8 * PS, OFEN[2], OFEN[1] + 40 * PS], 170 * PS, 110 * PS, heatA * (0.22 + 0.14 * pulse));
    glow(el.glowIr, STRAHLER, 120 * PS, 250 * PS, heatB * (0.18 + 0.16 * pulse));
    steam(t, heatA);
    waves(t, heatB);
  }

  const img = $('#photo');
  const loaded = new Promise(res => { img.onload = res; img.onerror = res; });
  img.src = `${SRC}/everest-s_front.jpg`;

  window.COMP = { FPS, TOTAL, W, H, seek, ready: Promise.all([document.fonts.ready, loaded]).then(() => seek(0)) };

  const t0 = params.get('t');
  if (t0 != null) window.COMP.ready.then(() => seek(Math.round(parseFloat(t0) * FPS)));
})();
