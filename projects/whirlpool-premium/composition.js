// Whirlpool Black Week – Premium-Reel 9:16. Deterministic, frame-addressed:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// Calm, high-end look in the Home Deluxe CI: lots of white, large tight type, soft
// blur-in reveals, products floating on white, odometer prices. Timings are output
// seconds; VO cues in cues.js, word anchors from the pauses in the VO segments.
(() => {
  const FPS = 30;
  const C = window.CUES;
  const TOTAL = Math.round(C.total * FPS);
  const params = new URLSearchParams(location.search);

  // Shop data (homedeluxe.de, Stand 26.10.2026). Times are relative to the segment cue:
  // w = name spoken, p = price spoken, g = "Mit unserem Geschenk", r = new price spoken.
  const EX = [
    { cue: C.ex1, name: 'SPLASH', desc: 'Aufblasbarer Outdoor-Whirlpool · 6 Personen', amb: 'source/splash-ambiente.jpg', img: 'source/splash-freisteller.jpg',
      price: 349, gift: 15, code: 'BLACK15', pay: 334, at: { w: 1.9, p: 2.18, g: 4.47, r: 5.7 } },
    { cue: C.ex2, name: 'DROP', desc: 'Inkl. Kissen, Getränkehalter und Sonnendach', amb: 'source/drop-ambiente.jpg', img: 'source/drop-freisteller.jpg',
      price: 529, gift: 75, code: 'BLACK75', pay: 454, at: { w: 1.8, p: 2.1, g: 4.5, r: 5.66 } },
    { cue: C.ex3, name: 'HORIZON', desc: 'Outdoor-Whirlpool aus Acryl', amb: 'source/horizon-ambiente.jpg', img: 'source/horizon-freisteller.jpg',
      price: 2499, gift: 150, code: 'BLACK150', pay: 2349, at: { w: 1.3, p: 1.43, g: 4.63, r: 5.83 } },
  ];
  const TIERS = [
    { from: 'ab 100 €', gift: 15, code: 'BLACK15', row: C.tiers + 0.1, amt: C.tiers + 1.9 },
    { from: 'ab 500 €', gift: 75, code: 'BLACK75', row: C.tiers + 3.17, amt: C.tiers + 4.67 },
    { from: 'ab 1.000 €', gift: 150, code: 'BLACK150', row: C.tiers + 5.86, amt: C.tiers + 7.22 },
  ];
  // Scene windows [in, out] (output seconds); neighbours overlap for the crossfades.
  const WIN = {
    intro: [0, 3.55], claim: [3.85, 7.75], tiers: [8.05, 16.95],
    ex1: [C.ex1 - 0.5, C.ex2 - 0.5], ex2: [C.ex2 - 0.5, C.ex3 - 0.5], ex3: [C.ex3 - 0.5, C.code - 0.35],
    code: [C.code - 0.2, C.outro - 0.3], outro: [C.outro - 0.15, C.total + 1],
  };

  // ---------------------------------------------------------------- helpers
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    outQuart: k => 1 - Math.pow(1 - k, 4),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutQuint: k => (k < 0.5 ? 16 * Math.pow(k, 5) : 1 - Math.pow(-2 * k + 2, 5) / 2),
    inCubic: k => k * k * k,
  };
  const eur = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
  const show = (n, on) => { n.style.visibility = on ? 'visible' : 'hidden'; };

  const ITEMS = new Map();
  const root = $('#scenes');
  function scene(id) { const s = document.createElement('div'); s.className = 'scene'; s.id = id; root.appendChild(s); return s; }
  function A(parent, cls, html, x, y, style = '') {
    const d = document.createElement('div');
    d.className = 'a ' + cls; d.innerHTML = html;
    if (style) d.style.cssText += style;
    parent.appendChild(d);
    ITEMS.set(d, { x, y });
    return d;
  }
  // Text split into words for a staggered reveal.
  const words = txt => txt.split(' ').map(w => `<span class="w">${w}</span>`).join(' ');
  function set(n, { dx = 0, dy = 0, s = 1, o = 1, blur = 0 } = {}) {
    const it = ITEMS.get(n);
    show(n, o > 0.003);
    if (o <= 0.003) return;
    n.style.left = `${it.x - it.w / 2}px`; n.style.top = `${it.y - it.h / 2}px`;
    n.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(${s.toFixed(4)})`;
    n.style.opacity = o >= 0.999 ? '' : o.toFixed(3);
    n.style.filter = blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : 'none';
  }
  // Soft reveal: rises a little, sharpens from a blur; optional soft exit.
  function reveal(n, t, tin, { dur = 0.9, y = 36, blur = 14, out = null, outDur = 0.6, s0 = 1 } = {}) {
    if (t < tin) { show(n, false); return; }
    const k = E.outQuart(prog(t, tin, dur));
    const ko = out == null ? 0 : E.inOutCubic(prog(t, out, outDur));
    set(n, { dy: y * (1 - k) - 20 * ko, s: lerp(s0, 1, k), o: k * (1 - ko), blur: blur * (1 - k) + 10 * ko });
  }
  // Same, word by word inside the element.
  function revealWords(n, t, tin, { gap = 0.11, dur = 0.8, out = null } = {}) {
    if (t < tin) { show(n, false); return; }
    const ko = out == null ? 0 : E.inOutCubic(prog(t, out, 0.6));
    set(n, { o: 1 - ko, dy: -20 * ko, blur: 10 * ko });
    $$('.w', n).forEach((w, i) => {
      const k = E.outQuart(prog(t, tin + i * gap, dur));
      w.style.opacity = k.toFixed(3);
      w.style.transform = `translateY(${(1 - k) * 0.28}em)`;
      w.style.filter = k < 0.99 ? `blur(${(12 * (1 - k)).toFixed(1)}px)` : 'none';
    });
  }

  // Odometer number: each digit is a column that rolls.
  function odo(text) {
    return `<span class="num">${[...text].map(ch => /\d/.test(ch)
      ? `<span class="col"><span class="strip">${Array.from({ length: 30 }, (_, i) => `<i>${i % 10}</i>`).join('')}</span></span>`
      : `<span class="fix">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</span>`;
  }
  function roll(n, t, tin, from, to, { dur = 1.1, stagger = 0.07, cycles = 1 } = {}) {
    const td = [...String(to)].map(Number), fd = [...String(from).padStart(td.length, '0')].map(Number);
    $$('.strip', n).forEach((st, j) => {
      const k = E.inOutQuint(prog(t, tin + j * stagger, dur));
      const a = fd[j], b = td[j] + 10 * (fd[j] === td[j] && from !== 0 ? 0 : cycles);
      const pos = lerp(a, b, k);
      st.style.transform = `translateY(${(-pos).toFixed(3)}em)`;
      const v = Math.sin(Math.PI * k) * (b !== a ? 1 : 0);
      st.style.filter = v > 0.05 ? `blur(${(3.5 * v).toFixed(1)}px)` : 'none';
    });
  }
  const digits = v => String(v).replace(/\D/g, '');

  // ---------------------------------------------------------------- build
  const logo = $('#logo');
  const S = {};

  S.intro = scene('s-intro');
  const intro = { bw: A(S.intro, 'h1', words('Black Week.'), 540, 1090, 'font-size:156px') };

  S.claim = scene('s-claim');
  const claim = {
    l1: A(S.claim, 'h2 muted', words('Je mehr du dir gönnst,'), 540, 890, 'font-size:92px'),
    l2: A(S.claim, 'h2', words('desto mehr schenken wir dir.'), 540, 1000, 'font-size:92px'),
  };

  S.tiers = scene('s-tiers');
  const tiers = {
    kick: A(S.tiers, 'kicker', 'Dein Black-Week-Geschenk', 540, 430),
    rules: [545, 855, 1165, 1475].map(y => A(S.tiers, 'rule', '', 540, y, 'width:860px')),
    rows: TIERS.map((tr, i) => ({
      l: A(S.tiers, 'tier-l', tr.from, 0, 700 + i * 310),
      r: A(S.tiers, 'tier-r', `<b>${odo(eur(tr.gift))}</b><span>CODE ${tr.code}</span>`, 0, 700 + i * 310),
    })),
  };

  const ex = EX.map((d, i) => {
    const sc = (S['ex' + (i + 1)] = scene('s-ex' + (i + 1)));
    const full = document.createElement('div');
    full.className = 'full';
    full.innerHTML = `<img src="${d.amb}" alt="">`;
    sc.appendChild(full);
    return {
      d, sc, full, img: $('img', full),
      ambName: A(sc, 'h1', d.name, 540, 1560, 'font-size:150px'),
      ambDesc: A(sc, 'sub', d.desc, 540, 1665, 'font-size:38px'),
      shadow: A(sc, 'shadow', '', 540, 1250),
      prod: A(sc, '', `<img class="prod" src="${d.img}" alt="">`, 540, 900),
      name: A(sc, 'h1', d.name, 540, 300, 'font-size:132px'),
      desc: A(sc, 'sub', d.desc, 540, 400, 'font-size:36px'),
      old: A(sc, 'price', odo(eur(d.price)), 540, 1500),
      strike: A(sc, 'strike', '', 540, 1395),
      giftL: A(sc, 'gift', `Geschenk mit Code <b>${d.code}</b> &nbsp;−${eur(d.gift)}`, 540, 1490),
      neu: A(sc, 'price', odo(eur(d.price)), 540, 1625, 'font-size:200px'),
    };
  });

  S.code = scene('s-code');
  const code = {
    l1: A(S.code, 'h2', words('Einfach den Code'), 540, 620, 'font-size:88px'),
    l2: A(S.code, 'h2', words('im Warenkorb eingeben.'), 540, 725, 'font-size:88px'),
    field: A(S.code, 'field', '', 540, 990),
    btn: A(S.code, 'btn', 'Einlösen', 540, 1150),
    ok: A(S.code, 'ok', '<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#0f2334" stroke-width="2.4"><path d="M4 12.5l5 5L20 6.5"/></svg>150 € geschenkt', 540, 1310),
    codes: A(S.code, 'codes', 'BLACK15 · BLACK75 · BLACK150', 540, 1560),
  };

  S.outro = scene('s-outro');
  const outro = {
    kick: A(S.outro, 'kicker', 'Bis zu 150 € geschenkt', 540, 660),
    bw: A(S.outro, 'h1', words('Black Week.'), 540, 790, 'font-size:156px'),
    sub: A(S.outro, 'sub', 'Nur bei Home Deluxe.', 540, 935, 'font-size:58px'),
    cta: A(S.outro, 'cta', 'Jetzt entdecken', 540, 1120),
    url: A(S.outro, 'sub', 'homedeluxe.de', 540, 1240, 'font-size:38px'),
    prods: EX.map((d, j) => A(S.outro, '', `<img class="small-prod" src="${d.img}" alt="">`, [205, 540, 875][j], 1560)),
  };

  // ---------------------------------------------------------------- render
  const SCENES = Object.entries(WIN).map(([k, w]) => [S[k], w]);
  function render(n) {
    const t = n / FPS;

    // Scenes crossfade softly; each one pushes in slowly while it is on.
    for (const [sc, [a, b]] of SCENES) {
      const on = t >= a - 0.01 && t < b + 0.7;
      sc.style.display = on ? '' : 'none';
      if (!on) continue;
      const kin = sc.id.startsWith('s-ex') ? 1 : E.outQuart(prog(t, a, 0.7));
      const kout = E.inOutCubic(prog(t, b, 0.7));
      sc.style.opacity = (kin * (1 - kout)).toFixed(3);
      sc.style.transform = `scale(${(1 + 0.025 * prog(t, a, b - a) + 0.03 * kout).toFixed(4)})`;
      sc.style.filter = kout > 0.02 ? `blur(${(12 * kout).toFixed(1)}px)` : 'none';
    }

    // Logo: large in the centre at first, then settles at the top.
    const kl = E.outQuart(prog(t, 0.15, 1.2)), km = E.inOutQuint(prog(t, 3.25, 0.9));
    const lw = lerp(520, 210, km), lx = 540 - lw / 2, ly = lerp(860, 104, km);
    logo.style.width = `${lw}px`;
    logo.style.transform = `translate(${lx}px, ${ly + 20 * (1 - kl)}px)`;
    logo.style.opacity = kl.toFixed(3);
    logo.style.filter = kl < 0.99 ? `blur(${(16 * (1 - kl)).toFixed(1)}px)` : 'none';

    // Intro
    revealWords(intro.bw, t, C.intro, { gap: 0.18, dur: 1.0 });

    // Claim
    revealWords(claim.l1, t, C.claim, { gap: 0.12 });
    revealWords(claim.l2, t, C.claim + 1.69, { gap: 0.12 });

    // Tiers: hairlines draw from the centre, amounts roll in.
    reveal(tiers.kick, t, C.tiers - 0.05);
    tiers.rules.forEach((r, i) => {
      const k = E.inOutCubic(prog(t, C.tiers + 0.1 + i * 0.12, 1.0));
      set(r, { o: k > 0 ? 1 : 0 });
      r.style.transform += ` scaleX(${k.toFixed(4)})`;
    });
    TIERS.forEach((tr, i) => {
      const row = tiers.rows[i];
      reveal(row.l, t, tr.row, { y: 24 });
      reveal(row.r, t, tr.row + 0.05, { y: 24 });
      roll(row.r, t, tr.amt - 0.15, 0, tr.gift, { dur: 1.0 });
      const span = $(':scope > span', row.r);
      span.style.opacity = E.outQuart(prog(t, tr.amt + 0.6, 0.8)).toFixed(3);
    });

    // Product scenes
    ex.forEach(o => {
      const { d } = o, c = d.cue, at = d.at;
      if (t < c - 0.6 || t > c + 9.3) return;
      // 1) Lifestyle photo: rectangular mask opens, slow push; then wipes up to white.
      const ko = E.inOutCubic(prog(t, c - 0.5, 1.1));
      const kc = E.inOutQuint(prog(t, c + at.w - 0.2, 0.9));
      const top = lerp(42, 12, ko), side = lerp(30, 0, ko), bot = lerp(42, 26, ko);
      o.full.style.visibility = kc < 1 && t >= c - 0.5 ? 'visible' : 'hidden';
      o.full.style.clipPath = `inset(${top}% ${side}% ${lerp(bot, 100 - top, kc)}% ${side}%)`;
      o.img.style.transform = `scale(${(1.16 - 0.1 * E.outQuart(prog(t, c - 0.5, 3.0))).toFixed(4)})`;
      reveal(o.ambName, t, c + 0.05, { out: c + at.w - 0.3, outDur: 0.45 });
      reveal(o.ambDesc, t, c + 0.3, { out: c + at.w - 0.3, outDur: 0.45 });
      // 2) Product floats in on white.
      const tp = c + at.w - 0.05;
      if (t >= tp) {
        const k = E.outQuart(prog(t, tp, 1.2));
        set(o.prod, { dy: 90 * (1 - k) - 8 * Math.sin((t - tp) * 0.9), s: lerp(0.9, 1, k) * (1 + 0.035 * prog(t, tp, 7)), o: k, blur: 18 * (1 - k) });
        set(o.shadow, { o: k * 0.9, s: lerp(0.7, 1, k) * (1 - 0.03 * Math.sin((t - tp) * 0.9)) });
      } else { show(o.prod, false); show(o.shadow, false); }
      reveal(o.name, t, tp + 0.1);
      reveal(o.desc, t, tp + 0.3);
      // 3) Price rolls in, steps back and is struck through; the gift; the new price rolls.
      const tg = c + at.g, tr = c + at.r;
      if (t >= c + at.p - 0.1) {
        const k = E.outQuart(prog(t, c + at.p - 0.1, 0.6)), m = E.inOutCubic(prog(t, tg, 0.8));
        set(o.old, { o: k, dy: lerp(0, -105, m) + 20 * (1 - k), s: lerp(1, 0.42, m), blur: 8 * (1 - k) });
        const g = Math.round(lerp(0x0f, 0x9a, m)), gg = Math.round(lerp(0x23, 0xa4, m)), gb = Math.round(lerp(0x34, 0xae, m));
        o.old.style.color = `rgb(${g}, ${gg}, ${gb})`;
        roll(o.old, t, c + at.p - 0.15, 0, +digits(eur(d.price)), { dur: 1.0 });
      } else show(o.old, false);
      if (t >= tg + 0.55) {
        const k = E.inOutCubic(prog(t, tg + 0.55, 0.5));
        const w = ITEMS.get(o.old).w * 0.42 + 16;
        o.strike.style.width = `${w}px`;
        ITEMS.get(o.strike).w = w;
        set(o.strike, { o: 1 });
        o.strike.style.transform = `scaleX(${k.toFixed(4)})`;
      } else show(o.strike, false);
      reveal(o.giftL, t, tg + 0.35, { y: 20 });
      if (t >= tr - 0.25) {
        set(o.neu, { o: E.outQuart(prog(t, tr - 0.25, 0.4)) });
        roll(o.neu, t, tr - 0.1, +digits(eur(d.price)), +digits(eur(d.pay)), { dur: 1.2, stagger: 0.09 });
      } else show(o.neu, false);
    });

    // Code
    revealWords(code.l1, t, C.code, { gap: 0.1 });
    revealWords(code.l2, t, C.code + 0.6, { gap: 0.1 });
    reveal(code.field, t, C.code + 0.5, { y: 20 });
    reveal(code.btn, t, C.code + 0.65, { y: 20 });
    const typed = Math.floor(clamp((t - (C.code + 1.1)) / 0.1, 0, 8));
    const caret = t >= C.code + 1.0 && t < C.code + 2.05 && Math.floor(t / 0.45) % 2 === 0;
    code.field.innerHTML = t >= C.code + 1.0 ? 'BLACK150'.slice(0, typed) + (caret ? '<span class="caret"></span>' : '') : '<span class="ph">Gutscheincode</span>';
    if (t >= C.code + 0.65) code.btn.style.transform += ` scale(${(1 - 0.03 * Math.sin(Math.PI * prog(t, C.code + 2.1, 0.25))).toFixed(4)})`;
    reveal(code.ok, t, C.code + 2.35, { y: 16 });
    reveal(code.codes, t, C.code + 2.7, { y: 16 });

    // Outro
    reveal(outro.kick, t, C.outro + 0.2);
    revealWords(outro.bw, t, C.outro, { gap: 0.18, dur: 1.0 });
    reveal(outro.sub, t, C.outro + 1.02);
    reveal(outro.cta, t, C.outro + 1.9, { y: 24 });
    reveal(outro.url, t, C.outro + 2.15, { y: 20 });
    outro.prods.forEach((p, j) => reveal(p, t, C.outro + 2.4 + j * 0.15, { y: 50, blur: 16 }));
  }

  // Sound cues for scripts/sound_design.py (calm style).
  function events() {
    const sfx = [];
    const add = (t, kind, extra = {}) => sfx.push({ t: +t.toFixed(3), kind, ...extra });
    add(0.15, 'bloom', { dur: 1.4 });
    add(C.intro, 'air', { dur: 1.2 });
    add(3.25, 'air', { dur: 1.1 });
    add(C.claim - 0.1, 'air', { dur: 1.0 });
    add(C.tiers - 0.1, 'air', { dur: 1.0 });
    TIERS.forEach((tr, i) => { add(tr.amt - 0.15, 'roll', { dur: 1.0 }); add(tr.amt + 0.85, 'glass', { n: [79, 83, 86][i] }); });
    EX.forEach((d, i) => {
      add(d.cue - 0.55, 'air', { dur: 1.4, strength: 0.6 });
      add(d.cue + d.at.w - 0.2, 'air', { dur: 1.1 });
      add(d.cue + d.at.p - 0.15, 'roll', { dur: 1.0 });
      add(d.cue + d.at.g, 'air', { dur: 0.9 });
      add(d.cue + d.at.r - 0.1, 'roll', { dur: 1.2 });
      add(d.cue + d.at.r + 1.05, 'glass', { n: [84, 86, 88][i] });
    });
    add(C.code - 0.2, 'air', { dur: 1.0 });
    for (let i = 0; i < 8; i++) add(C.code + 1.1 + i * 0.1, 'key', { i, gain: 0.45 });
    add(C.code + 2.1, 'softclick', { gain: 0.6 });
    add(C.code + 2.35, 'glass', { n: 84, gain: 0.7 });
    add(C.outro - 0.2, 'bloom', { dur: 1.6 });
    return {
      total: C.total,
      music: { style: 'calm', drop: C.tiers, break: [C.code, C.outro], final: C.outro },
      sfx: sfx.sort((a, b) => a.t - b.t),
    };
  }

  async function seek(n) { render(n); }

  async function init() {
    await Promise.all([400, 500, 600, 700].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img').map(img => img.decode().catch(() => {})));
    for (const [node, it] of ITEMS) { it.w = node.offsetWidth; it.h = node.offsetHeight; }
    // Tier rows: label left-aligned, amount right-aligned on the hairline grid.
    tiers.rows.forEach(r => {
      ITEMS.get(r.l).x = 110 + ITEMS.get(r.l).w / 2;
      ITEMS.get(r.r).x = 970 - ITEMS.get(r.r).w / 2;
    });
    const t0 = params.get('t');
    await seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, events, ready: init() };
})();
