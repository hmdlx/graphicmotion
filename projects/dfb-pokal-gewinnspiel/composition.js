// DFB-Pokal Gewinnspiel – Instagram-Feed 3:4. Deterministic, frame-addressed
// motion graphics: window.COMP.seek(n) puts the stage into the exact state of
// output frame n (fractional n allowed, used for motion blur sub-frames).
(() => {
  const FPS = 30;
  const W = 1080, H = 1440;

  // Scene changes, output seconds.
  const X = {
    door: [2.70, 0.62],            // S1 → S2   Szene schwingt wie eine Tür herein
    fly: [5.95, 0.65],             // S2 → S3   Kamera fliegt durch den Ticket-Abriss
    cube: [9.85, 0.72],            // S3 → S4   Würfeldrehung nach oben
    blinds: [13.10, 13.56, 13.58], // S4 → S5   Lamellen drehen zu, Schnitt, drehen auf
    carousel: [17.05, 0.82],       // S5 → S6   Karussell
  };
  const END = 21.0;
  const TOTAL = Math.round(END * FPS);
  const end = ([a, d]) => a + d;

  // Which scene is on screen when.
  const LIVE = {
    s1: [0, end(X.door)],
    s2: [X.door[0], end(X.fly)],
    s3: [end(X.fly), end(X.cube)],
    s4: [X.cube[0], X.blinds[1]],
    s5: [X.blinds[1], end(X.carousel)],
    s6: [X.carousel[0], END + 1],
  };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const P = (t, start, dur) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const rad = d => (d * Math.PI) / 180;
  const E = {
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inCubic: k => k * k * k,
    inQuart: k => k * k * k * k,
    outQuint: k => 1 - Math.pow(1 - k, 5),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutQuint: k => (k < 0.5 ? 16 * Math.pow(k, 5) : 1 - Math.pow(-2 * k + 2, 5) / 2),
  };
  const show = (el, on) => { el.style.visibility = on ? 'visible' : 'hidden'; };
  const tf = (el, s) => { el.style.transform = s; };

  // ---------- Text helpers ----------
  // Block wipe, left → right in and out. Hard edge, no fade.
  function wipe(el, t, tin, tout, din = 0.6, dout = 0.4) {
    const a = E.outExpo(P(t, tin, din));
    const b = tout == null ? 0 : E.inExpo(P(t, tout, dout));
    if (a <= 0 || b >= 1) { show(el, false); return; }
    show(el, true);
    el.style.clipPath = `inset(-40px ${(1 - a) * 100}% -40px ${b * 100}%)`;
  }
  // Masked line rise (and optional rise-out).
  function rise(span, t, tin, tout = null, dur = 0.75) {
    const k = E.outExpo(P(t, tin, dur));
    const o = tout == null ? 0 : E.inCubic(P(t, tout, 0.4));
    tf(span, `translateY(${((1 - k) - o) * 110}%)`);
  }
  function riseAll(root, t, tin, tout = null, gap = 0.07) {
    $$('.ln > span', root).forEach((s, i) => rise(s, t, tin + i * gap, tout == null ? null : tout + i * 0.04));
  }
  function split(el) {
    const txt = el.textContent;
    el.textContent = '';
    return [...txt].map(ch => {
      const s = document.createElement('span');
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
      return s;
    });
  }
  // Letters flip up out of the floor (3D, hinge at the baseline) and tip back away.
  function flip(letters, t, tin, tout = null, { stagger = 0.04, dur = 0.95 } = {}) {
    letters.forEach((s, i) => {
      const k = E.outExpo(P(t, tin + i * stagger, dur));
      const o = tout == null ? 0 : E.inCubic(P(t, tout + i * 0.022, 0.42));
      const rx = (1 - k) * -105 + o * 100;
      const z = (1 - k) * 120 - o * 160;
      s.style.transform = `translateZ(${z}px) rotateX(${rx}deg)`;
      s.style.opacity = k <= 0 || o >= 1 ? 0 : 1;
    });
  }
  function fit(el, width) {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const r = document.createRange();
    r.selectNodeContents(el);
    el.style.fontSize = `${(fs * width) / r.getBoundingClientRect().width}px`;
  }

  // ---------- 3D builders ----------
  // Box around an existing .front (and optional .back). Origin = box centre.
  function slab(el, w, h, d, { side = '#cfd6dd', side2 = '#b9c3cc', back = '#0e2234' } = {}) {
    Object.assign(el.style, { width: `${w}px`, height: `${h}px` });
    const front = $('.front', el);
    Object.assign(front.style, { width: `${w}px`, height: `${h}px`, transform: `translateZ(${d / 2}px)` });
    const lit = document.createElement('div');
    lit.className = 'lit';
    front.appendChild(lit);
    let bk = $('.back', el);
    if (!bk) { bk = document.createElement('div'); bk.className = 'face back'; el.appendChild(bk); }
    Object.assign(bk.style, { width: `${w}px`, height: `${h}px`, transform: `rotateY(180deg) translateZ(${d / 2}px)` });
    if (!bk.style.background && back) bk.style.backgroundColor = back;
    const faces = [
      [w, d, side, `rotateX(90deg) translateZ(${h / 2}px)`],
      [w, d, side2, `rotateX(-90deg) translateZ(${h / 2}px)`],
      [d, h, side2, `rotateY(-90deg) translateZ(${w / 2}px)`],
      [d, h, side, `rotateY(90deg) translateZ(${w / 2}px)`],
    ];
    for (const [fw, fh, c, tr] of faces) {
      const f = document.createElement('div');
      f.className = 'face';
      Object.assign(f.style, { width: `${fw}px`, height: `${fh}px`, left: `${(w - fw) / 2}px`, top: `${(h - fh) / 2}px`, background: c, transform: tr });
      el.appendChild(f);
    }
    return { el, lit, faces: $$(':scope > .face', el) };
  }
  // Light falloff on the front face: the more it turns away, the darker.
  function light(s, rx, ry, max = 0.42) {
    const facing = Math.cos(rad(rx)) * Math.cos(rad(ry));
    s.lit.style.background = `linear-gradient(${100 + ry * 2}deg, rgba(8,20,31,${(max * (1 - facing) * 0.6).toFixed(3)}), rgba(8,20,31,${(max * (1 - facing)).toFixed(3)}))`;
  }
  // Extruded type / logo: stacked layers, front white, sides graded grey → navy.
  function extrude(el, n, step, make) {
    const layers = [];
    for (let i = n - 1; i >= 0; i--) {
      const l = make();
      const k = i / (n - 1);
      const c = i === 0 ? [255, 255, 255] : [lerp(196, 40, k), lerp(207, 66, k), lerp(218, 92, k)];
      l.style.color = `rgb(${c.map(Math.round)})`;
      l.style.backgroundColor = l.dataset.mask ? `rgb(${c.map(Math.round)})` : '';
      l.style.transform = `translateZ(${-i * step}px)`;
      el.appendChild(l);
      layers.push(l);
    }
    return layers;
  }

  // ---------- Build ----------
  const scenes = { s1: $('#s1'), s2: $('#s2'), s3: $('#s3'), s4: $('#s4'), s5: $('#s5'), s6: $('#s6') };
  const shade = id => $('.shade', scenes[id]);

  // S1
  const s1Word = $('#s1-word');
  // S2
  const numEl = $('#s2-num');
  extrude(numEl, 30, 2.6, () => { const d = document.createElement('div'); d.textContent = numEl.dataset.text; return d; });
  const tpl = $('#ticket-front');
  const tickets = $$('#s2 .ticket').map((el, i) => {
    $('.front', el).appendChild(tpl.content.cloneNode(true));
    $('.tk-stub em', el).textContent = `NR. 0${i + 1}`;
    $('.back', el).innerHTML = '<img src="../../assets/logo/homedeluxe-logo-white.svg" alt="">';
    return slab(el, 680, 280, 10, { side: '#dfe4e9', side2: '#c4cdd5' });
  });
  // S3
  const crests = $$('#s3 .crest').map(el => slab(el, 270, 270, 36, { back: '#1c3a54' }));
  // S4: square prisms, white front, navy caps top and bottom.
  const rows = $$('#s4 .row').map(el => {
    const w = 936, h = 196;
    Object.assign(el.style, { width: `${w}px`, height: `${h}px` });
    const front = $('.front', el);
    front.style.transform = `translateZ(${h / 2}px)`;
    const caps = [`rotateX(90deg) translateZ(${h / 2}px)`, `rotateX(-90deg) translateZ(${h / 2}px)`].map(tr => {
      const f = document.createElement('div');
      f.className = 'face cap';
      Object.assign(f.style, { width: `${w}px`, height: `${h}px`, transform: tr });
      el.appendChild(f);
      return f;
    });
    const lit = document.createElement('div');
    lit.className = 'lit';
    front.appendChild(lit);
    return { el, front, caps, lit, hand: $('.hand', el) };
  });
  // S5
  const steps = $$('#s5 .step').map(el => slab(el, 936, 176, 20, { side: '#dfe4e9', side2: '#c4cdd5' }));
  steps.forEach(s => { s.el.style.transformOrigin = '0 50%'; });
  const heart = $('#s5 .heart'), at = $('#s5 .at'), plane = $('#s5 .plane');
  // S6
  const logo3d = $('#s6-logo');
  const logoMask = `url("data:image/svg+xml;utf8,${encodeURIComponent($('#logo-svg').innerHTML.trim())}")`;
  extrude(logo3d, 14, 2.4, () => { const d = document.createElement('div'); d.dataset.mask = '1'; d.style.webkitMask = `${logoMask} center / 100% 100% no-repeat`; return d; });
  const blinds = [...Array(6)].map((_, i) => {
    const b = document.createElement('div');
    b.className = 'blind';
    b.style.left = `${i * 180}px`;
    $('#blinds').appendChild(b);
    return b;
  });

  let s1Letters, s6Letters;

  // ---------- Scenes ----------
  function sceneLayout(t) {
    for (const [id, [a, b]] of Object.entries(LIVE)) scenes[id].style.display = t >= a && t < b ? 'block' : 'none';
    for (const id of Object.keys(scenes)) { tf(scenes[id], 'none'); shade(id) && (shade(id).style.opacity = 0); }

    // Door: S2 hinges on its left edge and swings shut over S1, S1 sinks back.
    const kd = E.outQuint(P(t, ...X.door));
    const kdi = E.inOutCubic(P(t, ...X.door));
    tf(scenes.s1, `translateZ(${-320 * kdi}px)`);
    shade('s1').style.opacity = 0.75 * kdi;
    scenes.s2.style.transformOrigin = '0 50%';
    tf(scenes.s2, `rotateY(${88 * (1 - kd)}deg)`);
    shade('s2').style.opacity = 0.65 * (1 - kd);

    // Cube: S3 rolls up and away, S4 comes up from below.
    const kc = E.inOutQuint(P(t, ...X.cube));
    const pull = -420 * Math.sin(Math.PI * kc);
    tf(scenes.s3, `translateZ(${pull}px) translateZ(-720px) rotateX(${90 * kc}deg) translateZ(720px)`);
    tf(scenes.s4, `translateZ(${pull}px) translateZ(-720px) rotateX(${90 * kc - 90}deg) translateZ(720px)`);
    shade('s3').style.opacity = 0.7 * kc;
    shade('s4').style.opacity = 0.7 * (1 - kc);

    // Blinds: strips turn shut, cut underneath, strips turn open.
    const [b0, cut, b1] = X.blinds;
    blinds.forEach((b, i) => {
      const kin = E.inOutCubic(P(t, b0 + i * 0.032, cut - b0 - 5 * 0.032));
      const kout = E.inOutCubic(P(t, b1 + i * 0.032, 0.34));
      const a = t < cut ? 90 * (1 - kin) : -90 * kout;
      const on = (t < cut && kin > 0) || (t >= cut && kout < 1);
      show(b, on);
      tf(b, `rotateY(${a}deg)`);
      const dk = Math.abs(Math.sin(rad(a)));
      b.style.filter = `brightness(${(1 - 0.55 * dk).toFixed(3)})`;
    });

    // Carousel: S5 turns away to the left, S6 turns in from the right.
    const kk = E.inOutQuint(P(t, ...X.carousel));
    const dz = -760 * Math.sin(Math.PI * kk);
    tf(scenes.s5, `translate3d(${-1240 * kk}px, 0, ${dz}px) rotateY(${-34 * kk}deg)`);
    tf(scenes.s6, `translate3d(${1240 * (1 - kk)}px, 0, ${dz}px) rotateY(${34 * (1 - kk)}deg)`);
    shade('s5').style.opacity = 0.6 * kk;
    if (t >= X.carousel[0]) {
      let sh = $('#s6 .shade');
      if (!sh) { sh = document.createElement('div'); sh.className = 'shade'; scenes.s6.appendChild(sh); }
      sh.style.opacity = 0.6 * (1 - kk);
    }
  }

  function s1(t) {
    const k = E.outCubic(P(t, 0, 3.3));
    tf($('#s1-bg'), `translate3d(${-640 + 70 * k}px, -81px, ${-220 + 300 * k}px) rotateY(${5 - 7 * k}deg) scale(1.16)`);
    riseAll($('#s1-kick'), t, 0.3, 2.42);
    flip(s1Letters, t, 0.42, 2.38);
    wipe($('#s1-tag'), t, 1.05, 2.4);
    rise($('#s1-tag .ln > span'), t, 1.18);
  }

  function ticketPose(i, t) {
    const base = { x: 540, y: 1010 };
    const fan = [
      { x: -96, y: 34, z: -180, rz: -11 },
      { x: -34, y: 12, z: -120, rz: -5 },
      { x: 28, y: -6, z: -60, rz: 1 },
      { x: 84, y: -22, z: 0, rz: 7 },
    ][i];
    const tin = 3.42 + i * 0.13;
    const k = E.outExpo(P(t, tin, 1.1));
    const side = i % 2 ? 1 : -1;
    const bob = Math.sin((t * 0.55 + i * 0.23) * Math.PI * 2);
    let p = {
      x: base.x + fan.x + side * 260 * (1 - k),
      y: base.y + fan.y + 980 * (1 - k) + bob * 5 * k,
      z: fan.z - 700 * (1 - k),
      rx: 20 + 75 * (1 - k),
      ry: -16 + side * 40 * (1 - k) + bob * 2.5,
      rz: fan.rz + side * 34 * (1 - k),
    };
    // Front ticket: the camera flies into its navy stub.
    if (i === 3) {
      const kf = P(t, ...X.fly);
      const a = E.inOutCubic(clamp(kf / 0.7));
      const z = E.inQuart(kf);
      p = {
        x: lerp(p.x, 540 - 255, a), y: lerp(p.y, 720, a), z: lerp(p.z, 1730, z),
        rx: lerp(p.rx, 0, a), ry: lerp(p.ry, 0, a), rz: lerp(p.rz, 0, a),
      };
    } else {
      const kf = E.inCubic(P(t, X.fly[0], X.fly[1]));
      p.y += 260 * kf; p.z -= 300 * kf;
    }
    return p;
  }

  function s2(t) {
    const floor = $('#s2-floor');
    tf(floor, `translate3d(0, 1200px, 1000px) rotateX(-90deg)`);
    floor.style.backgroundPosition = `0 ${(-t * 70) % 160}px`;

    const tOut = X.fly[0] - 0.05;
    riseAll($('#s2-kick'), t, 3.12, tOut);
    // 4×2 spins in, then keeps drifting.
    const k = E.outExpo(P(t, 3.05, 1.25));
    const drift = Math.sin((t - 3.05) * 0.9);
    const kf = E.inCubic(P(t, X.fly[0], X.fly[1]));
    tf(numEl, `translate3d(0, ${232 - 200 * kf}px, ${-900 * (1 - k) - 400 * kf}px) rotateX(${lerp(40, 7, k) + 2 * drift}deg) rotateY(${lerp(-80, -12, k) + 9 * drift}deg)`);

    const tw = $('#s2-tickets-word');
    rise($('.ln > span', tw), t, 3.5, tOut + 0.04);
    tw.style.letterSpacing = `${lerp(0.42, 0.14, E.outExpo(P(t, 3.5, 1.2)))}em`;
    rise($('#s2-foot .ln > span'), t, 4.25, tOut);

    tickets.forEach((s, i) => {
      const p = ticketPose(i, t);
      show(s.el, t > 3.42 + i * 0.13);
      tf(s.el, `translate3d(${p.x - 340}px, ${p.y - 140}px, ${p.z}px) rotateX(${p.rx}deg) rotateY(${p.ry}deg) rotateZ(${p.rz}deg)`);
      light(s, p.rx, p.ry, 0.5);
    });
    // Stub type clears before the stub fills the frame.
    const fade = 1 - clamp((P(t, ...X.fly) - 0.45) / 0.25);
    $$('.tk-stub > *', tickets[3].el).forEach(e => { e.style.opacity = fade; });
  }

  function s3(t) {
    const t0 = end(X.fly);
    // Navy cover (the ticket stub) slides off upward, hard edge.
    const kc = E.inOutQuint(P(t, t0 + 0.04, 0.62));
    tf($('#s3-cover'), `translateY(${-1440 * kc}px)`);
    show($('#s3-cover'), kc < 1);
    const kb = E.outExpo(P(t, t0, 1.6));
    const drift = P(t, t0, 4);
    tf($('#s3-bg'), `translate3d(-54px, -170px, ${lerp(380, 0, kb) + 60 * drift}px) rotateY(${4 - 7 * drift}deg)`);

    riseAll($('#s3-kick'), t, t0 + 0.55);
    const cx = [240, 840];
    crests.forEach((s, i) => {
      const side = i ? 1 : -1;
      const k = E.outExpo(P(t, t0 + 0.6 + i * 0.12, 1.2));
      const sway = Math.sin((t - t0) * 1.3 + i * 1.7);
      const ry = -side * 16 + side * 160 * (1 - k) + 4 * sway;
      const rx = 8 + 30 * (1 - k);
      tf(s.el, `translate3d(${cx[i] - 135 + side * 520 * (1 - k)}px, ${975 + 40 * (1 - k)}px, ${-500 * (1 - k)}px) rotateX(${rx}deg) rotateY(${ry}deg)`);
      light(s, rx, ry, 0.55);
    });
    const vs = $('#s3-vs');
    const kv = E.outExpo(P(t, t0 + 0.95, 0.9));
    rise($('.ln > span', vs), t, t0 + 0.95);
    tf(vs, `scale(${lerp(1.6, 1, kv)})`);
    rise($('#name-l .ln > span'), t, t0 + 1.1);
    rise($('#name-r .ln > span'), t, t0 + 1.2);
  }

  function s4(t) {
    const t0 = X.cube[0] + 0.35;
    const drift = P(t, X.cube[0], 4);
    tf($('#s4-bg'), `translate(${-710 + 120 * drift}px, -107px) scale(${1.04 + 0.04 * drift})`);
    riseAll($('#s4-head'), t, t0);
    rows.forEach((r, i) => {
      const k = E.outExpo(P(t, t0 + 0.2 + i * 0.14, 1.15));
      const fade = clamp(P(t, t0 + 0.2 + i * 0.14, 0.14));
      const rx = 112 * (1 - k);
      const top = 440 + i * 216;
      tf(r.el, `translate3d(72px, ${top + 50 * (1 - k)}px, -98px) rotateX(${rx}deg)`);
      [r.front, ...r.caps].forEach(f => { f.style.opacity = fade; });
      light(r, rx, 0, 0.6);
      r.caps.forEach(c => { c.style.filter = `brightness(${(0.65 + 0.5 * Math.abs(Math.sin(rad(rx)))).toFixed(3)})`; });
    });
    // Clock hand sweeps to 18:00.
    const kh = E.outExpo(P(t, t0 + 0.55, 1.6));
    rows[1].hand.setAttribute('transform', `rotate(${lerp(-270, 0, kh)} 46 46)`);
    const foot = $('#s4-foot');
    wipe(foot, t, t0 + 0.95);
    rise($('.ln > span', foot), t, t0 + 1.05);
  }

  function s5(t) {
    const t0 = X.blinds[2];
    const drift = P(t, t0, 4.3);
    tf($('#s5-bg'), `translate3d(0, ${-40 * drift}px, ${lerp(180, 0, E.outExpo(P(t, t0, 1.6))) + 80 * drift}px)`);
    riseAll($('#s5-head'), t, t0 + 0.12);
    steps.forEach((s, i) => {
      const tin = t0 + 0.38 + i * 0.17;
      const k = E.outExpo(P(t, tin, 1.15));
      const fade = clamp(P(t, tin, 0.16));
      const sway = Math.sin((t - tin) * 1.4 + i * 1.1) * k;
      const ry = 84 * (1 - k) + 3.2 * sway;
      const rx = 6 * (1 - k) + 1.5 * sway;
      tf(s.el, `translate3d(72px, ${680 + i * 190}px, ${-260 * (1 - k)}px) rotateX(${rx}deg) rotateY(${ry}deg)`);
      s.faces.forEach(f => { f.style.opacity = fade; });
      light(s, rx, ry, 0.55);
    });
    // Icon beats.
    const kh = P(t, t0 + 0.95, 0.5);
    heart.setAttribute('fill', kh > 0.2 ? '#fff' : 'none');
    heart.setAttribute('transform', `translate(42 42) scale(${1 + 0.22 * Math.sin(Math.PI * kh)}) translate(-42 -42)`);
    const len = 200;
    at.setAttribute('stroke-dasharray', len);
    at.setAttribute('stroke-dashoffset', len * (1 - E.outCubic(P(t, t0 + 1.05, 0.8))));
    const kp = E.outExpo(P(t, t0 + 1.25, 0.9));
    plane.setAttribute('transform', `translate(${-26 * (1 - kp)} ${26 * (1 - kp)})`);
    plane.style.opacity = kp > 0 ? 1 : 0;

    const dead = $('#s5-dead');
    wipe($('.k', dead), t, t0 + 1.0);
    wipe($('.v', dead), t, t0 + 1.12);
  }

  function s6(t) {
    const t0 = X.carousel[0] + 0.3;
    const floor = $('#s6-floor');
    tf(floor, `translate3d(0, 1240px, 1000px) rotateX(-90deg)`);
    floor.style.backgroundPosition = `0 ${(-t * 60) % 160}px`;
    const k = E.outExpo(P(t, t0, 1.5));
    const drift = Math.sin((t - t0) * 0.8);
    tf(logo3d, `translate3d(0, ${60 * (1 - k)}px, ${-700 * (1 - k)}px) rotateX(${lerp(75, 10, k) + 2 * drift}deg) rotateY(${lerp(-28, 0, k) - 5 * drift}deg)`);
    rise($('#s6-slogan .ln > span'), t, t0 + 0.55);
    tf($('#s6-rule'), `scaleX(${E.outExpo(P(t, t0 + 0.6, 0.9))})`);
    flip(s6Letters, t, t0 + 0.7, null, { stagger: 0.035 });
    const blk = $('#s6-ctas .blk');
    wipe(blk, t, t0 + 1.25);
    rise($('.ln > span', blk), t, t0 + 1.35);
    rise($('#s6-handle .ln > span'), t, t0 + 1.45);
    tf($('#s6-handle i'), `scaleX(${E.outExpo(P(t, t0 + 1.6, 0.9))})`);
    $('#s6-legal').style.opacity = E.outCubic(P(t, t0 + 1.7, 0.8));
  }

  function chrome(t) {
    wipe($('#logo'), t, 0.12, X.carousel[0]);
    wipe($('#badge'), t, end(X.door) - 0.1, X.carousel[0] + 0.05);
  }

  function seek(n) {
    const t = n / FPS;
    sceneLayout(t);
    const on = id => t >= LIVE[id][0] && t < LIVE[id][1];
    if (on('s1')) s1(t);
    if (on('s2')) s2(t);
    if (on('s3')) s3(t);
    if (on('s4')) s4(t);
    if (on('s5')) s5(t);
    if (on('s6')) s6(t);
    chrome(t);
  }

  const ready = (async () => {
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img').map(i => (i.complete ? Promise.resolve() : new Promise(r => { i.onload = i.onerror = r; }))));
    await Promise.all($$('img').map(i => i.decode().catch(() => {})));
    for (const sc of Object.values(scenes)) sc.style.display = 'block';
    fit(s1Word, 936);
    s1Letters = split(s1Word);
    const big = $('#s6-big');
    fit(big, 900);
    s6Letters = split(big);
    const q = new URLSearchParams(location.search).get('t');
    seek(q ? parseFloat(q) * FPS : 0);
  })();

  window.COMP = { FPS, TOTAL, W, H, seek, ready };
})();
