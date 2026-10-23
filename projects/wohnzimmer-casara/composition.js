// Wohnzimmer CASARA – Reel 9:16. Mitteilungen im iOS-Stil über dem Raum-Clip.
// Deterministic, frame-addressed: window.COMP.seek(n) puts the stage into the
// exact state of output frame n.
(() => {
  const FPS = 24;                 // = Quell-fps, jede Plate wird genau einmal gezeigt
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/wohnzimmer-casara/plates';
  const LAST_PLATE = 288;         // Quelle: 289 Frames, 12,04 s
  const TOTAL = 331;              // 13,79 s: letzte Plate steht 1,75 s für die Schlusskarte

  // Mitteilungs-Gruppen, Output-Sekunden. Innerhalb einer Gruppe schieben neue
  // Mitteilungen die älteren nach hinten in einen Stapel. `out` liegt kurz vor
  // dem Reißschwenk der Quelle, damit der Stapel mit dem Schwenk verschwindet.
  const GROUPS = [
    { ids: ['n-sofa', 'n-sessel', 'n-set'], in: [0.40, 1.80, 3.95], out: 5.45 },   // Wohnzimmer
    { ids: ['n-tisch', 'n-stuhl'], in: [6.85, 8.35], out: 9.85 },                   // Essbereich
  ];
  const T = { final: 10.30, actions: 10.80, brand: 10.95, push: 10.30 };
  // Einsatzpunkte für den Mitteilungston (render.js mischt ihn unter den Originalton).
  const CUES = [...GROUPS.flatMap(g => g.in), T.final];

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    // Gedämpfte Feder wie beim iOS-Banner: kurzer Überschwinger, dann Ruhe.
    spring: k => (k >= 1 ? 1 : 1 - Math.exp(-6.5 * k) * Math.cos(9 * k)),
  };
  const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };

  const DROP = 330;               // Startversatz über dem Bildrand (px)
  const PEEK = 28;                // sichtbarer Rand je Stapelebene (px)
  const el = {};

  // One notification: enter with a spring from above, sink into the stack while
  // newer ones arrive, leave upwards (front card first).
  function placeNote(note, t, tin, depth, frontH, tout, order) {
    const kIn = prog(t, tin, 0.8);
    const kOut = tout == null ? 0 : E.inCubic(prog(t, tout + order * 0.05, 0.4));
    const alphaStack = clamp(2.7 - depth);              // ab der dritten Ebene ausblenden
    const alpha = clamp((t - tin) / 0.12) * alphaStack * (1 - clamp((kOut - 0.6) / 0.4));
    if (t < tin || alpha <= 0.001) { show(note.node, false); return; }
    show(note.node, true);

    const d = clamp(depth);
    const y = lerp(-DROP, 0, E.spring(kIn))
      + lerp(0, frontH - note.h, d) + PEEK * depth       // Unterkante unter die vordere Karte
      - kOut * 520;
    const s = lerp(0.94, 1, E.outCubic(kIn)) * (1 - 0.05 * depth);
    note.node.style.transform = `translateY(${y.toFixed(2)}px) scale(${s.toFixed(4)})`;
    note.node.style.opacity = alpha.toFixed(3);
    note.content.forEach(c => { c.style.opacity = (1 - clamp(depth * 1.6)).toFixed(3); });
    note.card.style.background = `rgba(${Math.round(lerp(255, 236, d))}, ${Math.round(lerp(255, 240, d))}, ${Math.round(lerp(255, 245, d))}, ${lerp(0.8, 0.9, d).toFixed(3)})`;
  }

  function render(n) {
    const t = n / FPS;

    // Footage: Plate 1:1, langsamer Push-in über die Schlusskarte (überspielt das Standbild).
    const push = 1 + 0.035 * E.inOutCubic(prog(t, T.push, TOTAL / FPS - T.push));
    el.plate.style.transform = `scale(${push.toFixed(5)})`;

    for (const g of GROUPS) {
      const notes = g.ids.map(id => el.notes[id]);
      // Front card = the newest one that has entered; older cards align to its bottom edge.
      let front = notes[0];
      notes.forEach((nt, i) => { if (t >= g.in[i]) front = nt; });
      notes.forEach((nt, i) => {
        let depth = 0;
        for (let j = i + 1; j < notes.length; j++) depth += E.outCubic(prog(t, g.in[j], 0.5));
        const order = Math.round(depth);
        placeNote(nt, t, g.in[i], depth, front.h, g.out, order);
      });
    }

    // Schlussmitteilung + Aktionen
    placeNote(el.notes.final, t, T.final, 0, el.notes.final.h, null, 0);
    el.actions.forEach((a, i) => {
      const k = E.outExpo(prog(t, T.actions + i * 0.12, 0.6));
      show(a, k > 0);
      a.style.transform = `translateY(${((1 - k) * 70).toFixed(2)}px)`;
      a.style.opacity = clamp(k * 1.6).toFixed(3);
    });

    // Logo-Plate fährt von unten ein
    const kb = E.outExpo(prog(t, T.brand, 0.7));
    show(el.brand, kb > 0);
    el.brand.style.transform = `translateY(${((1 - kb) * 340).toFixed(2)}px)`;
    $('.rule', el.brand).style.transform = `scaleX(${E.outExpo(prog(t, T.brand + 0.35, 0.6)).toFixed(4)})`;
    const slogan = $('.slogan', el.brand);
    const ks = E.outExpo(prog(t, T.brand + 0.3, 0.6));
    slogan.style.opacity = ks.toFixed(3);
    slogan.style.transform = `translateY(${((1 - ks) * 24).toFixed(2)}px)`;
  }

  async function seek(n) {
    const idx = Math.min(n, LAST_PLATE);
    if (el.plate.dataset.idx !== String(idx)) {
      el.plate.src = `${PLATE_DIR}/f${String(idx).padStart(4, '0')}.jpg`;
      await el.plate.decode();
      el.plate.dataset.idx = String(idx);
    }
    render(n);
  }

  async function init() {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    const house = $('#house').content;
    $$('.icon').forEach(i => i.appendChild(house.cloneNode(true)));
    await Promise.all($$('img').filter(i => i.getAttribute('src')).map(i => i.decode()));

    el.plate = $('#footage img');
    el.brand = $('#brand');
    el.actions = $$('#final .action');
    el.notes = {};
    $$('.note').forEach(node => {
      const card = $('.card', node);
      el.notes[node.id] = { node, card, content: [...card.children], h: card.offsetHeight };
      node.style.transformOrigin = `500px ${card.offsetHeight}px`;
    });

    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, CUES, seek, ready: init() };
})();
