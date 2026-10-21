// Black Friday 16:9 – Produkt-Einblendungen rechts neben den Produkten.
// Deterministisch und frame-adressiert: window.COMP.seek(n) setzt die Ebene auf Output-Frame n
// des neuen Schnitts (build.py). Der Produktteil beginnt bei Output-Frame 192 mit Quell-Frame 0.
(() => {
  const FPS = 24;
  const TOTAL = 744;
  const OFFSET = 192;           // Output-Frame = Quell-Frame + OFFSET
  const T = 430;                // Oberkante des Textblocks (Bild-px); x je Produkt, rechts neben dem Produkt

  // Preise: aktueller Shoppreis (homedeluxe.de, Stand 21.10.2026) und -25 %, auf volle Euro gerundet.
  // `in`/`out` in Quell-Frames: Einblendung startet, Abgang startet.
  const PRODUCTS = [
    { x: 1720, in: 60,  out: 140, eyebrow: 'TRADITIONELLE SAUNA', title: 'SHADOW XL', old: '2.399', price: '1.799' },
    { x: 1730, in: 206, out: 280, eyebrow: 'OUTDOOR WHIRLPOOL',   title: 'SEA STAR',  old: '3.499', price: '2.624', beam: true },
    { x: 1850, in: 322, out: 386, eyebrow: 'TEDDY SOFA',          title: 'COMO',      old: '399',   price: '299' },
    { x: 1700, in: 440, out: 510, eyebrow: 'DAMPFDUSCHE',         title: 'EXCLUSIVE', old: '1.949', price: '1.462' },
  ];
  const EXIT = 10;              // Frames, die die Wisch-Kante für den Abgang braucht

  // Lichtstrahl im Film (Whirlpool): x-Position je Quell-Frame, gemessen; danach läuft er
  // mit derselben Geschwindigkeit in der Grafik weiter über den rechten Rand.
  const BEAM = { 279: 1688, 280: 1752, 281: 1828, 282: 1902 };
  const beamX = s => (s <= 282 ? (BEAM[Math.floor(s)] ?? 1688 - 70 * (279 - s)) : 1902 + 72 * (s - 282));

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, a, b) => clamp((t - a) / (b - a));
  const outCubic = k => 1 - Math.pow(1 - k, 3);
  const outQuart = k => 1 - Math.pow(1 - k, 4);
  const outBack = k => { const c = 2.2; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };

  const stage = document.getElementById('stage');
  const tpl = document.getElementById('tpl');
  const beam = document.getElementById('beam');
  const blocks = PRODUCTS.map(p => {
    const el = tpl.content.firstElementChild.cloneNode(true);
    el.style.left = p.x + 'px';
    el.style.top = (T - 60) + 'px';
    el.querySelector('.eyebrow > div').textContent = p.eyebrow;
    el.querySelector('.title > div').textContent = p.title;
    el.querySelector('.old span').textContent = p.old + ' €';
    el.querySelector('.new .num').textContent = p.price;
    stage.appendChild(el);
    const q = s => el.querySelector(s);
    return { p, el, clip: q('.clip'), inner: q('.inner'), hline: q('.hline'), head: q('.hline .head'), node: q('.node'),
             vline: q('.vline'), eyebrow: q('.eyebrow > div'), title: q('.title > div'), badge: q('.badge'),
             old: q('.old'), strike: q('.strike'), neu: q('.new'), num: q('.new .num'), scan: q('.scan'), edge: q('.edge') };
  });

  function drawBlock(b, s) {
    const { p } = b;
    const t = s - p.in;
    const end = p.beam ? beamX(s) > p.x + 840 : s >= p.out + EXIT;
    if (t < 0 || end) { b.el.style.display = 'none'; return; }
    b.el.style.display = 'block';

    // Auftakt: Lichtlinie schießt nach rechts, Klammer wächst nach unten
    const kl = outQuart(prog(t, 0, 8));
    b.hline.style.transform = `scaleX(${kl})`;
    b.head.style.opacity = kl < 1 ? 1 : 0;
    const kn = outBack(prog(t, 2, 7));
    b.node.style.transform = `scale(${kn})`;
    b.vline.style.transform = `scaleY(${outCubic(prog(t, 3, 11))})`;

    // Texte fahren aus ihrer Maske hoch
    const ke = outCubic(prog(t, 4, 11));
    b.eyebrow.style.transform = `translateY(${(1 - ke) * 100}%)`;
    b.eyebrow.style.letterSpacing = `${0.3 + (1 - ke) * 0.35}em`;
    const kt = outQuart(prog(t, 6, 14));
    b.title.style.transform = `translateY(${(1 - kt) * 105}%)`;
    b.title.style.filter = `blur(${(1 - kt) * 14}px)`;

    // -25 %-Badge springt auf, alter Preis kommt, wird durchgestrichen
    b.badge.style.transform = `scale(${outBack(prog(t, 11, 17))})`;
    const ko = outCubic(prog(t, 12, 18));
    const ks = outQuart(prog(t, 18, 23));
    b.old.style.opacity = ko * (1 - 0.35 * ks);
    b.old.style.transform = `translateX(${(1 - ko) * -30}px)`;
    b.strike.style.transform = `rotate(-7deg) scaleX(${ks})`;

    // Neuer Preis: Scan-Kante legt ihn frei, dann ein kurzer Punch mit Lichtblitz
    const kr = outCubic(prog(t, 20, 27));
    const w = b.neu.scrollWidth + 20;
    b.neu.style.clipPath = `inset(-40px ${(1 - kr) * w}px -40px -20px)`;
    b.scan.style.display = kr > 0 && kr < 1 ? 'block' : 'none';
    b.scan.style.left = (kr * w - 10) + 'px';
    const kp = prog(t, 26, 34);
    b.neu.style.transform = `scale(${1 + 0.1 * (1 - outCubic(kp)) * (kp > 0 ? 1 : 0)})`;
    const flash = t >= 27 ? Math.exp(-(t - 27) / 4) : 0;
    b.num.style.textShadow = `0 0 ${34 + 50 * flash}px rgba(200, 222, 255, ${0.45 + 0.5 * flash})`;

    // ruhige Drift während des Stehens
    b.inner.style.transform = `translateX(${-10 * prog(t, 0, p.out - p.in)}px)`;

    // Abgang: eine Lichtkante wischt die Grafik von links nach rechts weg
    let ex = -1e4;
    if (p.beam) {
      if (s >= p.out - 2) ex = beamX(s) - p.x;
    } else if (s >= p.out) {
      ex = -20 + 860 * outCubic(prog(s, p.out, p.out + EXIT));
    }
    b.clip.style.clipPath = ex > -1e3 ? `inset(-100px -100px -100px ${Math.max(ex, 0)}px)` : 'none';
    const showEdge = !p.beam && ex > -1e3 && ex < 830;
    b.edge.style.display = showEdge ? 'block' : 'none';
    if (showEdge) b.edge.style.left = (ex - 3) + 'px';
  }

  function seek(n) {
    const s = n - OFFSET;
    blocks.forEach(b => drawBlock(b, s));
    // Fortsetzung des Lichtstrahls, nachdem er im Film verschwindet
    const bx = beamX(s);
    const on = s > 282 && bx < 2560 + 200;
    beam.style.display = on ? 'block' : 'none';
    if (on) {
      beam.style.left = bx + 'px';
      beam.style.opacity = clamp(1 - (bx - 2300) / 500, 0.2, 1);
    }
  }

  // Output-Frames, in denen die Ebene etwas zeigt
  const ranges = PRODUCTS.map(p => [p.in + OFFSET, (p.beam ? 296 : p.out + EXIT) + OFFSET]);

  window.COMP = { FPS, TOTAL, seek, ranges, ready: document.fonts.ready };
})();
