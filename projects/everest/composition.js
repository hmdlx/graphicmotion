// Kombisauna EVEREST – 2 in 1 als Loop (Shop-Kachel 1:1 und 16:9). Die Infokarten drehen sich
// wie ein Karussell (Trommel um die waagerechte Achse): Sauna -> Infrarot, am Ende
// stehen beide Karten untereinander. Überschrift und Eck-Klammern im Produktfoto
// folgen immer der Karte, die gerade vorne ist:
//   Sauna-Karte    -> „SAUNA“ navy, „+ INFRAROT“ grau, Klammern am Saunaofen
//   Infrarot-Karte -> „+ INFRAROT“ navy, „SAUNA“ grau, Klammern am Vollspektrumstrahler
//   beide Karten   -> beide Wörter navy, beide Bauteile markiert
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
(() => {
  const FPS = 30;
  // Formatabhängige Maße; die 16:9-Fassung setzt window.LAYOUT vor diesem Skript.
  const L = Object.assign({ W: 1080, H: 1080, cardH: 216, gap: 22, photoW: 320, photoH: 616 }, window.LAYOUT);
  const { W, H } = L;
  const TOTAL = 312;                              // 10,4 s, letztes Bild = Startbild -> nahtloser Loop
  const params = new URLSearchParams(location.search);
  const SRC = params.get('plates') || 'source';

  // Zeiten in Sekunden
  const T = {
    swap: 2.4, swapDur: 0.9,                      // Sauna -> Infrarot
    both: 5.8, bothDur: 1.0,                      // Infrarot rutscht in Slot 2, Sauna dreht oben wieder rein
    back: 9.8, backDur: 0.6,                      // Infrarot rollt zurück in die Trommel -> Startzustand
  };
  const SLOT2 = L.cardH + L.gap;                  // Abstand Slot 1 -> Slot 2
  const DEPTH = L.cardH / 2;                      // halbe Kartenhöhe = Trommelradius

  // Produktfoto: Quelle 468 x 900, angezeigt photoW x photoH. Bauteile in Quell-px.
  const SX = L.photoW / 468, SY = L.photoH / 900, PS = L.photoW / 320;
  const box = ([x0, y0, x1, y1]) => [x0 * SX, y0 * SY, x1 * SX, y1 * SY];
  const OFEN = box([16, 586, 178, 886]);
  const STRAHLER = box([196, 212, 276, 494]);
  const ARM = 22 * PS;

  const NAVY = [14, 34, 52], GREY = [189, 193, 196];

  const $ = s => document.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const mixRect = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  const mixColor = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutQuint: k => (k < 0.5 ? 16 * Math.pow(k, 5) : 1 - Math.pow(-2 * k + 2, 5) / 2),
    outBack: k => { const c1 = 1.2, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };

  const el = {
    sauna: $('#card-sauna'), ir: $('#card-ir'),
    mSauna: $('#m-sauna'), mIr: $('#m-ir'),
    brSauna: $('#br-sauna'), brIr: $('#br-ir'),
    glowOfen: $('#glow-ofen'), glowIr: $('#glow-ir'),
  };

  // Karte als Fläche der Trommel: phi = 0 vorne, ±90 oben/unten weggedreht.
  function card(node, phi, y) {
    const vis = clamp(Math.cos(phi * Math.PI / 180));
    node.style.transform = `translateY(${y}px) translateZ(${-DEPTH}px) rotateX(${phi}deg) translateZ(${DEPTH}px)`;
    node.style.visibility = vis > 0.001 ? 'visible' : 'hidden';
    node.querySelector('.shade').style.opacity = ((1 - vis) * 0.28).toFixed(3);
    return vis;
  }

  // Eck-Klammern um ein Rechteck; s skaliert um die Mitte (Lock-on).
  function brackets(path, rect, s = 1, alpha = 1) {
    if (!rect || alpha <= 0.001) { path.setAttribute('d', ''); return; }
    const cx = (rect[0] + rect[2]) / 2, cy = (rect[1] + rect[3]) / 2;
    const [x0, y0, x1, y1] = [cx + (rect[0] - cx) * s, cy + (rect[1] - cy) * s, cx + (rect[2] - cx) * s, cy + (rect[3] - cy) * s];
    const a = Math.min(ARM, (x1 - x0) / 3, (y1 - y0) / 3);
    path.setAttribute('d', [
      `M${x0},${y0 + a}V${y0}H${x0 + a}`, `M${x1 - a},${y0}H${x1}V${y0 + a}`,
      `M${x1},${y1 - a}V${y1}H${x1 - a}`, `M${x0 + a},${y1}H${x0}V${y1 - a}`,
    ].join(''));
    path.style.opacity = alpha.toFixed(3);
  }

  function glow(node, rect, w, h, alpha) {
    const cx = (rect[0] + rect[2]) / 2, cy = (rect[1] + rect[3]) / 2;
    Object.assign(node.style, { width: `${w}px`, height: `${h}px`, transform: `translate(${cx - w / 2}px, ${cy - h / 2}px)`, opacity: alpha.toFixed(3) });
  }

  function seek(n) {
    const t = n / FPS;

    // --- Karussell ---
    const kSwap = E.inOutQuint(prog(t, T.swap, T.swapDur));
    const kBothB = E.inOutCubic(prog(t, T.both, T.bothDur * 0.8));
    const kBothA = E.inOutCubic(prog(t, T.both + T.bothDur * 0.2, T.bothDur * 0.8));
    const kBack = E.inOutCubic(prog(t, T.back, T.backDur));

    let phiA, phiB, yB;
    if (t < T.both) {                       // Trommel dreht: Sauna nach oben weg, Infrarot kommt von unten
      phiA = 90 * kSwap; phiB = -90 + 90 * kSwap; yB = 0;
    } else if (t < T.back) {                // Infrarot rutscht in Slot 2, Sauna dreht oben wieder ein
      phiA = 90 * (1 - kBothA); phiB = 0; yB = SLOT2 * kBothB;
    } else {                                // Infrarot rollt zurück unter die Sauna-Karte
      phiA = 0; phiB = -90 * kBack; yB = SLOT2 * (1 - kBack);
    }
    const visA = card(el.sauna, phiA, 0);
    const visB = card(el.ir, phiB, yB);
    el.sauna.style.zIndex = visA >= visB || t >= T.back ? 2 : 1;
    el.ir.style.zIndex = el.sauna.style.zIndex === '2' ? 1 : 2;

    // --- Überschrift folgt der vorderen Karte ---
    el.mSauna.style.color = mixColor(GREY, NAVY, visA);
    el.mIr.style.color = mixColor(GREY, NAVY, visB);

    // --- Klammern im Foto ---
    if (t < T.swap) {
      brackets(el.brSauna, OFEN); brackets(el.brIr, null);
    } else if (t < T.swap + T.swapDur) {     // Klammern wandern vom Ofen zum Strahler
      brackets(el.brSauna, mixRect(OFEN, STRAHLER, kSwap)); brackets(el.brIr, null);
    } else if (t < T.both) {
      const lock = E.outBack(prog(t, T.swap + T.swapDur, 0.35));
      brackets(el.brSauna, null); brackets(el.brIr, STRAHLER, lerp(1.06, 1, lock));
    } else if (t < T.back) {                 // zweites Klammerpaar löst sich vom Strahler und geht zurück zum Ofen
      const k = E.inOutCubic(prog(t, T.both + T.bothDur * 0.2, T.bothDur * 0.8));
      const lock = E.outBack(prog(t, T.both + T.bothDur, 0.35));
      brackets(el.brIr, STRAHLER);
      brackets(el.brSauna, mixRect(STRAHLER, OFEN, k), k >= 1 ? lerp(1.06, 1, lock) : 1, clamp(k * 6));
    } else {                                 // Strahler-Klammern ziehen sich zusammen und verschwinden
      brackets(el.brSauna, OFEN);
      brackets(el.brIr, STRAHLER, lerp(1, 0.75, kBack), 1 - kBack);
    }

    // --- Wärme: Ofen glüht bei Sauna, Strahler bei Infrarot ---
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI / 1.3);
    glow(el.glowOfen, [OFEN[0], OFEN[1] - 8 * PS, OFEN[2], OFEN[1] + 40 * PS], 170 * PS, 110 * PS, visA * (0.22 + 0.12 * pulse));
    glow(el.glowIr, STRAHLER, 120 * PS, 250 * PS, visB * (0.18 + 0.14 * pulse));
  }

  const img = $('#photo');
  const loaded = new Promise(res => { img.onload = res; img.onerror = res; });
  img.src = `${SRC}/everest-s_front.jpg`;

  window.COMP = { FPS, TOTAL, W, H, seek, ready: Promise.all([document.fonts.ready, loaded]).then(() => seek(0)) };

  const t0 = params.get('t');
  if (t0 != null) window.COMP.ready.then(() => seek(Math.round(parseFloat(t0) * FPS)));
})();
