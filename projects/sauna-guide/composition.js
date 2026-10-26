// Sauna-Guide – Meta Ad 9:16. Deterministic, frame-addressed motion graphics over
// still images: window.COMP.seek(n) puts the stage into the exact state of output frame n.
(() => {
  const FPS = 30;
  const W = 1080, H = 1920;
  const params = new URLSearchParams(location.search);
  const PLATE_DIR = params.get('plates') || '../../build/sauna-guide/plates';

  // Transitions, in output frames.
  const X = {
    cols: { in: 86, cut: 100, out: 101, stagger: 2, dur: 12 },  // Hook → 01      Navy-Säulen steigen auf (Hitze)
    whip: [163, 178],                                           // 01 → 02        Reißschwenk
    cold: { start: 226, dur: 15 },                              // 02 → 03        helle Fläche steigt wie ein Wasserspiegel
    iris: [300, 318],                                           // 03 → 04        Pfeilspitze öffnet ein Fenster
    flash: { zoom: 372, cut: 384, fade: 398 },                  // 04 → Arten     Zoom in einen Lichtblitz
    temps: 492,                                                 // Arten → Produkte (Bild blendet auf Navy)
    rows: { in: 588, cut: 600, out: 601, stagger: 1, dur: 10 }, // Produkte → Endcard   Navy-Balken
  };
  const TOTAL = 702;             // 23.4 s

  // Graphics timeline, output seconds.
  const T = {
    logo: 0.05,
    hook: 0.15,
    s1: 3.45,                    // rides out with the whip, no own exit
    s2: [5.45, 7.25],            // rides in with the whip
    s3: [8.05, 9.70],
    flow: [8.40, 1.0],           // arrow start, duration
    warn: 9.15,
    s4: [10.50, 12.10],
    rounds: [11.10, 12.15],
    tempsHead: [13.00, 16.40],
    bars: 13.45,                 // first bar, then +0.25 s each
    badges: 14.85,
    prodHead: 16.75,
    cards: 17.05,                // first card, then +0.95 s each
    end: X.rows.cut / FPS,
  };

  // Camera moves on the still plates: focus point (plate fraction) centred on the stage, zoom s.
  // Plates are 1920 px high; s = 1 fills the height exactly.
  const CAM = {
    hook: { span: [0, X.cols.cut], from: { cx: 0.33, cy: 0.50, s: 1.07 }, to: { cx: 0.57, cy: 0.52, s: 1.0 } },
    s1:   { span: [X.cols.cut, X.whip[1]], from: { cx: 0.25, cy: 0.62, s: 1.04 }, to: { cx: 0.24, cy: 0.66, s: 1.16 } },
    s2:   { span: [X.whip[0], X.cold.start + X.cold.dur], from: { cx: 0.47, cy: 0.52, s: 1.0 }, to: { cx: 0.47, cy: 0.56, s: 1.09 } },
    s4:   { span: [X.iris[0], X.flash.cut], from: { cx: 0.29, cy: 0.52, s: 1.16 }, to: { cx: 0.34, cy: 0.52, s: 1.02 } },
    temps:{ span: [X.flash.cut, X.temps + 20], from: { cx: 0.33, cy: 0.46, s: 1.14 }, to: { cx: 0.33, cy: 0.46, s: 1.0 } },
  };

  const PRODUCTS = [
    ['Kombisauna', 'EVEREST'],
    ['Infrarotkabine', 'REDSUN DELUXE XXL'],
    ['Gartensauna', 'HYGGE DELUXE'],
  ];
  const FLOW_X = 89;
  const FLOW_Y = [1110, 1012, 914, 816];   // Beine, Arme, Rumpf, Gesicht
  const FLOW_TIP = 772;

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
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
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

  // Place a plate so that plate point (cx, cy) sits in the centre of a w×h box at zoom s
  // (relative to "cover"), clamped so the plate always covers the box.
  function frameImg(img, cam, w = W, h = H, extra = 1) {
    const pw = img.naturalWidth, ph = img.naturalHeight;
    const s = Math.max(w / pw, h / ph) * cam.s * extra;
    const sw = pw * s, sh = ph * s;
    const x = clamp(w / 2 - cam.cx * sw, w - sw, 0);
    const y = clamp(h / 2 - cam.cy * sh, h - sh, 0);
    img.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${s.toFixed(5)})`;
  }
  function camAt(name, n) {
    const c = CAM[name];
    const k = E.inOutSine(prog(n, c.span[0], c.span[1] - c.span[0]));
    return { cx: lerp(c.from.cx, c.to.cx, k), cy: lerp(c.from.cy, c.to.cy, k), s: lerp(c.from.s, c.to.s, k) };
  }

  // ---------------------------------------------------------------- elements
  const el = {
    shots: { hook: $('#shot-hook'), s1: $('#shot-s1'), s2: $('#shot-s2'), s4: $('#shot-s4'), temps: $('#shot-temps') },
    steam: $('#steam'), sep: $('#sep'), flash: $('#flash'), iris: $('#iris'), blur: $('#hblur-g'),
    cold: $('#cold'), coldEdge: $('#cold .edge'), waves: $$('#cold .wave'),
    flowLine: $('#flow-line'), flowTrack: $('#flow-track'), flowHead: $('#flow-head'), nodes: $$('#flow .node'), warn: $('#warn'),
    logo: $('#logo'), hook: $('#hook'), s1: $('#s1'), s2: $('#s2'), s3: $('#s3'), s4: $('#s4'), rounds: $('#rounds'),
    ring: $('#s1-ring'), hand: $('#s1-hand'), ticks: $('#s1-ticks'),
    roundsArc: $('#rounds-arc'), roundsTip: $('#rounds-tip'), roundsSvg: $('#rounds svg'),
    tempsHead: $('#temps-head'), temps: $('#temps'), trows: $$('#temps .trow'),
    prodHead: $('#prod-head'), deck: $('#deck'), cards: $$('#deck .pcard'), pcount: $$('#pcount div'), pcountBox: $('#pcount'),
    plabel: $('#plabel'), ptype: $('#ptype'), pname: $('#pname'),
    endImg: $('#end-img'), endImgImg: $('#end-img img'), frameRect: $('#frame-rect'), endHead: $('#end-head'),
    chips: $$('#chips .chip'), chipsBox: $('#chips'), cta: $('#cta'), btn: $('#cta .btn'), arrow: $('#cta .btn svg'),
    url: $('#cta .url'), urlLine: $('#cta .url i'), slogan: $('#slogan .ln > span'), sloganBox: $('#slogan'),
    cols: [], rows: [], puffs: [],
  };

  function build() {
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('div');
      c.className = 'col'; c.style.left = `${i * 180}px`;
      $('#cols').appendChild(c); el.cols.push(c);
    }
    for (let i = 0; i < 8; i++) {
      const r = document.createElement('div');
      r.className = 'row'; r.style.top = `${i * 240}px`;
      $('#rows').appendChild(r); el.rows.push(r);
    }
    for (let i = 0; i < 11; i++) {
      const p = document.createElement('div');
      p.className = 'puff';
      el.steam.appendChild(p); el.puffs.push(p);
    }
    // Stopwatch ticks (12 of them, like minute marks).
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * 2 * Math.PI;
      ticks += `<line x1="${(Math.sin(a) * 48).toFixed(2)}" y1="${(-Math.cos(a) * 48).toFixed(2)}" x2="${(Math.sin(a) * 40).toFixed(2)}" y2="${(-Math.cos(a) * 40).toFixed(2)}" stroke="rgba(233,238,244,.55)" stroke-width="3" />`;
    }
    el.ticks.innerHTML = ticks;
  }

  // ---------------------------------------------------------------- pieces
  // Steam: soft puffs rising and swelling; deterministic per frame.
  function steam(t, amount, dx = 0) {
    show(el.steam, amount > 0.001);
    if (amount <= 0.001) return;
    el.steam.style.translate = `${dx}px 0`;
    el.puffs.forEach((p, i) => {
      const period = 3.4 + (i % 4) * 0.45;
      const ph = (((t + i * 0.83) / period) % 1 + 1) % 1;
      const x = 80 + ((i * 263) % 900) + 70 * Math.sin(t * 0.9 + i * 1.7);
      const y = lerp(1750, 250, ph);
      const size = lerp(0.55, 1.45, ph);
      p.style.transform = `translate(${x - 300}px, ${y - 300}px) scale(${size.toFixed(3)})`;
      p.style.opacity = (Math.pow(Math.sin(Math.PI * ph), 1.6) * 0.32 * amount).toFixed(3);
    });
  }

  function shot(name, n, on, extra = {}) {
    const node = el.shots[name];
    show(node, on);
    if (!on) return;
    const img = node.firstElementChild;
    frameImg(img, camAt(name, n), W, H, extra.zoom || 1);
    node.style.translate = `${extra.x || 0}px 0`;
    node.style.filter = extra.filter || 'none';
    node.style.clipPath = extra.clip || 'none';
    node.style.opacity = extra.opacity == null ? '' : extra.opacity;
  }

  // Vertical columns that rise from the bottom (in) and leave through the top (out).
  function columns(n) {
    const c = X.cols;
    el.cols.forEach((col, i) => {
      const order = [2, 3, 1, 4, 0, 5][i];          // centre first, like rising heat
      const kin = E.inOutCubic(prog(n, c.in + order * c.stagger, c.dur));
      const kout = E.inOutCubic(prog(n, c.out + order * c.stagger, c.dur));
      show(col, kin > 0 && kout < 1);
      col.style.clipPath = `inset(${(1 - kin) * 100}% 0 ${kout * 100}% 0)`;
    });
  }

  // Horizontal bands sweeping left → right.
  function bands(n) {
    const b = X.rows;
    el.rows.forEach((row, i) => {
      const kin = E.inOutCubic(prog(n, b.in + i * b.stagger, b.dur));
      const kout = E.inOutCubic(prog(n, b.out + i * b.stagger, b.dur));
      show(row, kin > 0 && kout < 1);
      row.style.clipPath = `inset(0 ${(1 - kin) * 100}% 0 ${kout * 100}%)`;
    });
  }

  const irisK = n => E.inOutCubic(prog(n, X.iris[0], X.iris[1] - X.iris[0]));
  function irisRect(k) {
    const r = 17;
    const x = lerp(FLOW_X - r, 0, k), y = lerp(FLOW_TIP - r, 0, k);
    return { x, y, w: lerp(2 * r, W, k), h: lerp(2 * r, H, k) };
  }

  // Step 03: cold panel, arrow up the body, nodes, warning chip.
  function coldScene(n, t) {
    const c = X.cold;
    const on = n >= c.start && n < X.iris[1];
    showBox(el.cold, on);
    if (!on) return;
    const k = E.inOutCubic(prog(n, c.start, c.dur));
    const top = H * (1 - k);
    if (n < X.iris[0]) {
      el.cold.style.clipPath = k < 1 ? `inset(${top}px 0 0 0)` : 'none';
    } else {
      const r = irisRect(irisK(n));
      el.cold.style.clipPath = `path(evenodd, 'M0 0H${W}V${H}H0Z M${r.x} ${r.y}H${r.x + r.w}V${r.y + r.h}H${r.x}Z')`;
    }
    show(el.coldEdge, k > 0 && k < 1);
    el.coldEdge.style.top = `${top}px`;
    el.waves.forEach((w, i) => { w.style.transform = `translateX(${(Math.sin(t * 1.3 + i * 0.9) * 30).toFixed(1)}px)`; });

    // Arrow grows from the feet up; each node lands when the tip passes it.
    const [fs, fd] = T.flow;
    const fk = E.inOutCubic(prog(t, fs, fd));
    const tipY = lerp(FLOW_Y[0], FLOW_TIP, fk);
    el.flowTrack.setAttribute('y1', FLOW_Y[0]); el.flowTrack.setAttribute('y2', FLOW_TIP);
    el.flowLine.setAttribute('y2', tipY.toFixed(1));
    show(el.flowLine, fk > 0); show(el.flowTrack, t > fs - 0.3);
    el.flowTrack.style.opacity = prog(t, fs - 0.3, 0.3).toFixed(3);
    show(el.flowHead, fk > 0);
    el.flowHead.setAttribute('transform', `translate(${FLOW_X} ${tipY.toFixed(1)})`);
    el.nodes.forEach((node, i) => {
      const reach = fs + fd * (i === 0 ? 0 : clamp((FLOW_Y[0] - FLOW_Y[i]) / (FLOW_Y[0] - FLOW_TIP))) * 0.85;
      const s = E.outBack(prog(t, reach, 0.4));
      const kt = E.outExpo(prog(t, reach + 0.05, 0.55));
      node.style.transform = `translate(${FLOW_X - 17}px, ${FLOW_Y[i] - 17}px)`;
      node.firstElementChild.style.transform = `scale(${s.toFixed(3)})`;
      const txt = node.lastElementChild;
      txt.style.opacity = kt.toFixed(3);
      txt.style.transform = `translateX(${((1 - kt) * -30).toFixed(1)}px)`;
    });
    wipe(el.warn, t, T.warn, null, 0.6);
  }

  function s1Meter(t) {
    const k = E.inOutCubic(prog(t, T.s1 + 0.35, 1.25));
    const C = 2 * Math.PI * 62;
    el.ring.style.strokeDasharray = `${C}`;
    el.ring.style.strokeDashoffset = `${C * (1 - k)}`;
    el.hand.setAttribute('transform', `rotate(${(k * 360).toFixed(2)})`);
  }

  function roundsIcon(t) {
    const k = E.outCubic(prog(t, T.rounds[0] + 0.15, 0.7));
    const len = el.roundsArc.getTotalLength();
    el.roundsArc.style.strokeDasharray = `${len}`;
    el.roundsArc.style.strokeDashoffset = `${len * (1 - k)}`;
    el.roundsTip.style.opacity = prog(t, T.rounds[0] + 0.7, 0.15).toFixed(3);
    el.roundsSvg.style.transform = `rotate(${(-90 * (1 - k) + 25 * Math.sin(Math.PI * prog(t, T.rounds[0] + 0.85, 0.6))).toFixed(2)}deg)`;
  }

  function tempRows(t) {
    const [hin, hout] = T.tempsHead;
    const on = t >= hin && t < hout + 0.6;
    showBox(el.temps, on);
    if (!on) return;
    el.trows.forEach((row, i) => {
      const min = +row.dataset.min, max = +row.dataset.max;
      const tin = T.bars + i * 0.25;
      const appear = E.outExpo(prog(t, tin - 0.15, 0.6));
      const leave = E.inExpo(prog(t, hout + i * 0.06, 0.4));
      row.style.opacity = (appear * (1 - leave)).toFixed(3);
      row.style.transform = `translateY(${((1 - appear) * 40 - leave * 30).toFixed(1)}px)`;
      rise($('.name .ln > span', row), t, tin - 0.1);
      const k = E.outCubic(prog(t, tin + 0.1, 0.95));
      const x = 936 * (max / 100) * k, left = 936 * (min / 100);
      $('.fill', row).style.width = `${Math.min(x, left).toFixed(1)}px`;
      const range = $('.range', row);
      range.style.left = `${left}px`;
      range.style.width = `${Math.max(0, x - left).toFixed(1)}px`;
      $('.v', row).textContent = `${Math.round(min * k)}–${Math.round(max * k)}`;
      const badge = $('.badge', row);
      if (badge) {
        const kb = E.outBack(prog(t, T.badges + (i - 1) * 0.12, 0.45));
        badge.style.opacity = clamp(kb).toFixed(3);
        badge.style.transform = `scale(${kb.toFixed(3)})`;
      }
      $('.note', row).style.opacity = (0.62 * E.outExpo(prog(t, tin + 0.5, 0.6))).toFixed(3);
    });
  }

  function deck(t) {
    const on = t >= T.cards - 0.1 && t < T.end;
    showBox(el.deck, on); showBox(el.plabel, on); showBox(el.pcountBox, on);
    if (!on) return;
    const tin = i => T.cards + i * 0.95;
    let cur = 0;
    el.cards.forEach((card, i) => {
      const k = E.outExpo(prog(t, tin(i), 0.6));
      show(card, k > 0);
      if (t >= tin(i)) cur = i;
      let d = 0;
      for (let j = i + 1; j < el.cards.length; j++) d += E.inOutCubic(prog(t, tin(j), 0.5));
      const kb = 1 + 0.08 * (1 - prog(t, tin(i), 1.6));
      card.style.transform = `translate(${((1 - k) * 1010).toFixed(1)}px, ${(-d * 46).toFixed(1)}px) scale(${(1 - d * 0.07).toFixed(4)}) rotate(${((1 - k) * 4).toFixed(2)}deg)`;
      card.firstElementChild.style.transform = `scale(${kb.toFixed(4)})`;
      card.lastElementChild.style.opacity = Math.min(0.75, d * 0.5).toFixed(3);
    });
    el.pcount.forEach((bar, i) => {
      bar.classList.toggle('on', i === cur);
      const k = E.outExpo(prog(t, T.cards + 0.2 + i * 0.06, 0.5));
      bar.style.transform = `scaleY(${k.toFixed(3)})`;
    });
    const [type, name] = PRODUCTS[cur];
    if (el.ptype.textContent !== type) { el.ptype.textContent = type; el.pname.textContent = name; }
    wipe($('.blk', el.plabel), t, T.cards + 0.25, null);
    rise(el.ptype, t, tin(cur) + (cur ? 0.15 : 0.4));
    rise(el.pname, t, tin(cur) + (cur ? 0.22 : 0.47));
  }

  function endCard(n, t) {
    const on = n >= X.rows.cut;
    for (const node of [el.endImg, el.endHead, el.chipsBox, el.cta, el.sloganBox]) showBox(node, on);
    show(el.frameRect, on);
    if (!on) return;
    const kr = E.inOutCubic(prog(t, T.end + 0.05, 0.75));
    el.endImg.style.clipPath = `inset(${(1 - kr) * 50}% 0 ${(1 - kr) * 50}% 0)`;
    frameImg(el.endImgImg, { cx: 0.56, cy: 0.62, s: 1.12 - 0.08 * prog(t, T.end, TOTAL / FPS - T.end) }, 936, 430);
    const per = 2 * (964 + 458);
    const fr = E.inOutCubic(prog(t, T.end + 0.45, 0.9));
    el.frameRect.style.strokeDasharray = per;
    el.frameRect.style.strokeDashoffset = per * (1 - fr);
    stack(el.endHead, t, T.end + 0.25, null);
    el.chips.forEach((c, i) => {
      const k = E.outExpo(prog(t, T.end + 0.7 + i * 0.08, 0.7));
      c.style.opacity = k.toFixed(3);
      c.style.transform = `translateY(${(1 - k) * 30}px)`;
    });
    wipe(el.btn, t, T.end + 1.05, null, 0.6);
    const ku = E.outExpo(prog(t, T.end + 1.25, 0.6));
    el.url.style.opacity = ku.toFixed(3);
    el.url.style.transform = `translateX(${(1 - ku) * -24}px)`;
    el.urlLine.style.transform = `scaleX(${E.outExpo(prog(t, T.end + 1.45, 0.7))})`;
    const nudge = t > T.end + 1.8 ? Math.pow(Math.sin(Math.PI * (((t - T.end - 1.8) % 1.3) / 1.3)), 2) : 0;
    el.arrow.style.transform = `translateX(${nudge * 9}px)`;
    rise(el.slogan, t, T.end + 1.5);
  }

  // ---------------------------------------------------------------- render
  function render(n) {
    const t = n / FPS;

    // Footage.
    const inWhip = n >= X.whip[0] && n < X.whip[1];
    const wk = inWhip ? E.inOutQuint(prog(n, X.whip[0], X.whip[1] - X.whip[0])) : 0;
    const blurPx = inWhip ? 85 * Math.pow(Math.sin(Math.PI * wk), 1.5) : 0;
    el.blur.setAttribute('stdDeviation', `${blurPx.toFixed(1)} 0`);
    const wf = blurPx > 1 ? 'url(#hblur)' : 'none';
    const rideB = inWhip ? -W * wk : 0, rideC = inWhip ? W * (1 - wk) : 0;

    shot('hook', n, n < X.cols.cut);
    shot('s1', n, n >= X.cols.cut && n < X.whip[1], { x: rideB, filter: wf });
    shot('s2', n, n >= X.whip[0] && n < X.cold.start + X.cold.dur, { x: inWhip ? rideC : 0, filter: wf });

    // 04: inside the iris, slight pull-out; then zoom + blur into the flash.
    const zk = E.inExpo(prog(n, X.flash.zoom, X.flash.cut - X.flash.zoom));
    const s4zoom = (n < X.iris[1] ? 1.18 - 0.18 * E.outCubic(irisK(n)) : 1) * (1 + 0.24 * zk);
    shot('s4', n, n >= X.iris[0] && n < X.flash.cut, { zoom: s4zoom, filter: zk > 0.02 ? `blur(${(zk * 12).toFixed(1)}px)` : 'none' });

    // Arten: lands from the flash, then fades into navy for the products.
    const settle = 1 + 0.1 * (1 - E.outExpo(prog(n, X.flash.cut, 20)));
    const tf = 1 - E.inOutCubic(prog(n, X.temps, 16));
    shot('temps', n, n >= X.flash.cut && tf > 0, { zoom: settle, opacity: tf.toFixed(3) });

    // Steam over hook and 01, fades with the whip.
    const steamAmt = n < X.cols.cut ? lerp(0.55, 0.8, prog(t, 0, 3)) : n < X.whip[1] ? 1 : 0;
    steam(t, steamAmt, n >= X.cols.cut ? rideB : 0);
    el.steam.style.filter = n >= X.cols.cut ? wf : 'none';

    show(el.sep, inWhip);
    if (inWhip) el.sep.style.left = `${W * (1 - wk) - 80}px`;

    // Transitions.
    columns(n);
    bands(n);
    coldScene(n, t);
    const inIris = n >= X.iris[0] && n < X.iris[1];
    show(el.iris, inIris);
    if (inIris) {
      const r = irisRect(irisK(n));
      Object.assign(el.iris.style, { left: `${r.x - 4}px`, top: `${r.y - 4}px`, width: `${r.w + 8}px`, height: `${r.h + 8}px` });
    }
    const fl = n < X.flash.cut ? E.inCubic(prog(n, X.flash.cut - 8, 8))
      : 1 - E.outCubic(prog(n, X.flash.cut, X.flash.fade - X.flash.cut));
    el.flash.style.opacity = fl.toFixed(3);
    show(el.flash, fl > 0.001);

    // Persistent logo plate.
    wipe(el.logo, t, T.logo, null, 0.6);

    // Hook (covered by the columns, gone after the cut).
    showBox(el.hook, n < X.cols.cut);
    if (n < X.cols.cut) stack(el.hook, t, T.hook, null, { gap: 0.11 });

    // 01 Schwitzen: rides out with the whip.
    const on1 = n >= X.cols.cut && n < X.whip[1];
    showBox(el.s1, on1);
    if (on1) { stack(el.s1, t, T.s1, null); s1Meter(t); }
    el.s1.style.translate = `${rideB}px 0`;
    el.s1.style.filter = wf;

    // 02 Frische Luft: rides in with the whip.
    showBox(el.s2, n >= X.whip[0] && n < X.cold.start + X.cold.dur);
    stack(el.s2, t, T.s2[0], T.s2[1]);
    el.s2.style.translate = `${inWhip ? rideC : 0}px 0`;
    el.s2.style.filter = wf;

    // 03 Abkühlen.
    showBox(el.s3, n >= X.cold.start && n < X.iris[1]);
    stack(el.s3, t, T.s3[0], T.s3[1]);

    // 04 Ruhen + Durchgänge.
    const on4 = n >= X.iris[0] && n < X.flash.cut;
    showBox(el.s4, on4); showBox(el.rounds, on4);
    stack(el.s4, t, T.s4[0], T.s4[1]);
    stack(el.rounds, t, T.rounds[0], T.rounds[1]);
    if (on4) roundsIcon(t);

    // Sauna-Arten.
    showBox(el.tempsHead, n >= X.flash.cut && t < T.tempsHead[1] + 0.6);
    stack(el.tempsHead, t, T.tempsHead[0], T.tempsHead[1]);
    tempRows(t);

    // Produkte.
    showBox(el.prodHead, t >= T.prodHead && n < X.rows.cut);
    stack(el.prodHead, t, T.prodHead, null);
    deck(t);

    endCard(n, t);
  }

  function seek(n) {
    render(n);
  }

  async function init() {
    build();
    $('#guides').style.display = params.get('guides') ? 'block' : 'none';
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img[data-plate]').map(img => {
      img.src = `${PLATE_DIR}/${img.dataset.plate}.jpg`;
      return img.decode();
    }));
    await $('#logo img').decode();
    const t0 = params.get('t');
    seek(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
  }

  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
