// Shop 3D – Black Friday 9:16. A camera flight through homedeluxe.de in CSS 3D:
// the mobile shop page tips over into a floor, the product tiles lift off and
// line an aisle, and at four stations the price drops by 25 % live.
// Deterministic and frame-addressed: window.COMP.seek(n) sets output frame n.
(() => {
  const FPS = 30;
  const TOTAL = Math.round(18.5 * FPS);   // 555 frames
  const P = 1200;                          // perspective distance (px)
  const FLOOR = 1900;                      // world y of the floor
  const OFF = 0.25;                        // Black Friday: -25 %

  const PRODUCTS = window.PRODUCTS;
  const byId = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

  // Hero stations: product, shop category, arrival time (s), world z.
  const STATIONS = [
    { id: '17', sign: 'Wohnen' },
    { id: '00', sign: 'Garten' },
    { id: '15', sign: 'Sauna & Infrarot' },
    { id: '02', sign: 'Whirlpools' },
  ].map((s, i) => ({ ...s, at: 3.4 + i * 2.7, z: -2200 - i * 2300 }));
  const HOLD = 1.9;                        // seconds the camera stays at a station

  // Tiles: the first six sit on the shop page, then the rest of the range,
  // then repeats so the aisle stays busy. The 20 unique tiles build the wall.
  const PAGE_IDS = ['17', '00', '15', '02', '13', '18'];
  const REST_IDS = PRODUCTS.map(p => p.id).filter(id => !PAGE_IDS.includes(id));
  const DUP_IDS = ['01', '03', '04', '05', '06', '08', '10', '12', '14', '16', '19', '07'];
  const TILE_IDS = [...PAGE_IDS, ...REST_IDS, ...DUP_IDS];
  const PAGE_TOP = 220;                    // page starts under the sticky header
  const SLOT = (i) => ({ x: 32 + (i % 2) * 524, y: 1010 + Math.floor(i / 2) * 820 });
  const WALL = { x: 540, y: 1298, z: -13900, col: 532, row: 830 };

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const prog = (t, [start, dur]) => clamp((t - start) / dur);
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    lin: k => k,
    outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
    outCubic: k => 1 - Math.pow(1 - k, 3),
    inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
    inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
    outBack: k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const rnd = (n, k) => { const x = Math.sin(n * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };
  const RAD = Math.PI / 180;

  // German price format: 3.224,25 € / 429 €
  const fmt = (v, cents = true) => {
    const [i, d] = Math.abs(v).toFixed(2).split('.');
    const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (cents ? `${int},${d}` : int) + ' €';
  };
  const sale = p => Math.round(p * (1 - OFF) * 100) / 100;

  // ---------------------------------------------------------------- camera
  const cam = (x, y, z, yaw = 0, pitch = 0, roll = 0) => ({ x, y, z, yaw, pitch, roll });
  const K0 = cam(540, 960, 1200);
  const K1 = cam(540, 1360, 1200);
  const K2 = cam(780, 1250, 2600, -10, -10, 3);
  const Ha = s => cam(540, 900, STATIONS[s].z + 1300);
  const Hb = s => cam(540, 892, STATIONS[s].z + 1220);
  const F1 = cam(540, 960, -11000);
  const F2 = cam(540, 960, -10350);
  // [t0, t1, from, to, ease, swing] – swing is added along sin(pi k), zero at both ends.
  const SEGS = [[0.2, 1.0, K0, K1, 'inOutCubic'], [1.0, 2.1, K1, K2, 'inOutCubic'], [2.1, 3.4, K2, Ha(0), 'inOutCubic', { roll: -4 }]];
  const SWINGS = [{ x: 150, yaw: -6, roll: 5 }, { x: -150, yaw: 6, roll: -5 }, { x: 120, y: -70, roll: 4 }];
  STATIONS.forEach((st, s) => {
    SEGS.push([st.at, st.at + HOLD, Ha(s), Hb(s), 'inOutSine']);
    if (s < STATIONS.length - 1) SEGS.push([st.at + HOLD, STATIONS[s + 1].at, Hb(s), Ha(s + 1), 'inOutCubic', SWINGS[s]]);
  });
  const last = STATIONS[STATIONS.length - 1];
  SEGS.push([last.at + HOLD, 15.0, Hb(STATIONS.length - 1), F1, 'inOutCubic', { y: -260, yaw: 4, roll: -6 }]);
  SEGS.push([15.0, TOTAL / FPS, F1, F2, 'inOutSine']);

  function camera(t) {
    let seg = SEGS[0];
    if (t < seg[0]) return { ...seg[2] };
    for (const s of SEGS) if (t >= s[0]) seg = s;
    const [t0, t1, a, b, ease, sw = {}] = seg;
    const k = E[ease](clamp((t - t0) / (t1 - t0)));
    const bump = Math.sin(Math.PI * k);
    const c = {};
    for (const key of Object.keys(K0)) c[key] = lerp(a[key], b[key], k) + (sw[key] || 0) * bump;
    return c;
  }
  // Camera space of a world point, same maths as the CSS camera on #world:
  // d = distance in front of the lens, sx/sy = screen position.
  function view(c, x, y, z) {
    const vx = x - c.x, vy = y - c.y, vz = z - c.z;
    const ya = c.yaw * RAD, pa = c.pitch * RAD, ra = c.roll * RAD;
    const x1 = vx * Math.cos(ya) + vz * Math.sin(ya);
    const z1 = -vx * Math.sin(ya) + vz * Math.cos(ya);
    const y2 = vy * Math.cos(pa) - z1 * Math.sin(pa);
    const z2 = vy * Math.sin(pa) + z1 * Math.cos(pa);
    const x3 = x1 * Math.cos(ra) - y2 * Math.sin(ra);
    const y3 = x1 * Math.sin(ra) + y2 * Math.cos(ra);
    const d = -z2;
    return { d, sx: 540 + (x3 * P) / d, sy: 960 + (y3 * P) / d };
  }
  const depth = (c, x, y, z) => view(c, x, y, z).d;

  // Floor grid on a 2D canvas: line segments clipped at the lens, fading with distance.
  const GRID = 260, NEAR = 60;
  function drawFloor(c, alpha) {
    const cv = $('#floorc'), g = cv.getContext('2d');
    g.clearRect(0, 0, 1080, 1920);
    if (alpha <= 0) return;
    const seg = (x0, z0, x1, z1, w, rgb, a0) => {
      let A = view(c, x0, FLOOR, z0), B = view(c, x1, FLOOR, z1);
      if (A.d < NEAR && B.d < NEAR) return;
      if (A.d < NEAR || B.d < NEAR) {
        const k = (NEAR - A.d) / (B.d - A.d);
        const xm = lerp(x0, x1, k), zm = lerp(z0, z1, k);
        const M = view(c, xm, FLOOR, zm);
        if (A.d < NEAR) A = M; else B = M;
      }
      const dm = (A.d + B.d) / 2;
      const a = alpha * a0 * (1 - clamp((dm - 4000) / 9000));
      if (a <= 0.003) return;
      g.strokeStyle = `rgba(${rgb},${a.toFixed(3)})`;
      g.lineWidth = Math.max(0.6, (w * P) / Math.max(dm, 300));
      g.beginPath(); g.moveTo(A.sx, A.sy); g.lineTo(B.sx, B.sy); g.stroke();
    };
    const zNear = c.z + 200, zFar = c.z - 14000, CH = 520;
    const z0 = Math.ceil(zFar / GRID) * GRID;
    for (let x = 540 - 13 * GRID; x <= 540 + 13 * GRID; x += GRID) {
      for (let z = zNear; z > zFar; z -= CH) seg(x, z, x, Math.max(z - CH, zFar), 4, '143,216,255', 0.3);
    }
    for (let z = z0; z < zNear; z += GRID) {
      for (let x = 540 - 13 * GRID; x < 540 + 13 * GRID; x += CH) seg(x, z, x + CH, z, 4, '143,216,255', 0.3);
    }
    for (let z = zNear; z > zFar; z -= CH) seg(540, z, 540, Math.max(z - CH, zFar), 120, '25,211,255', 0.07);
  }

  // ---------------------------------------------------------------- scene
  const world = () => $('#world');
  let tiles = [], stations = [], tags = [], streaks = [], page, ticker, tickerW = 1;

  function place(el, { x, y, z, ry = 0, rx = 0, rz = 0, s = 1 }, w, h) {
    el.style.transform = `translate3d(${(x - w / 2).toFixed(2)}px, ${(y - h / 2).toFixed(2)}px, ${z.toFixed(2)}px) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${s.toFixed(4)})`;
  }
  // Visibility from depth: hide behind/at the lens, fade into the fog.
  function shade(el, d, op = 1, blur = 0) {
    if (d < 300 || op <= 0.004) { el.style.visibility = 'hidden'; return false; }
    el.style.visibility = 'visible';
    el.style.opacity = (op * clamp((d - 300) / 300) * (1 - clamp((d - 7500) / 4500))).toFixed(3);
    // Blur in coarse steps and only where it shows; every blurred layer costs an extra surface.
    const b = Math.min(6, Math.round(blur));
    el.style.filter = b >= 1 ? `blur(${b}px)` : 'none';
    return true;
  }
  const setText = (el, s) => { if (el._t !== s) { el.textContent = s; el._t = s; } };

  function build() {
    const W = world();


    page = document.createElement('div');
    page.id = 'page'; page.className = 'obj';
    page.innerHTML = `
      <div class="chips"><span>Garten</span><span>Wohnen</span><span>Sauna</span><span>Whirlpools</span><span class="sale">Sale</span></div>
      <div class="banner"><div class="bf">BLACK FRIDAY</div><div class="bs">-25% auf alles</div></div>
      <h2><b>Top</b>seller</h2>`;
    PAGE_IDS.forEach((_, i) => {
      const s = document.createElement('div'); s.className = 'slot';
      const { x, y } = SLOT(i); s.style.left = x + 'px'; s.style.top = y + 'px';
      page.append(s);
    });
    W.append(page);

    // Stations
    STATIONS.forEach((st, s) => {
      const p = byId[st.id];
      const sign = document.createElement('div'); sign.className = 'obj sign'; sign.textContent = st.sign; W.append(sign);
      const pod = document.createElement('div'); pod.className = 'obj podium'; W.append(pod);
      const prod = document.createElement('div'); prod.className = 'obj prod';
      const img = document.createElement('img'); img.src = `source/products/cut_${st.id}.png`; prod.append(img); W.append(prod);
      const panel = $('#panel-tpl').content.firstElementChild.cloneNode(true);
      $('.kick', panel).textContent = p.line;
      $('.pt', panel).textContent = p.title.split(' - ')[0];
      $('.old', panel).textContent = fmt(p.price, false);
      $('.save', panel).textContent = `Du sparst ${fmt(p.price - sale(p.price))}`;
      W.append(panel);
      stations.push({ ...st, p, sign, pod, prod, img, panel, old: $('.old', panel), nw: $('.new', panel), save: $('.save', panel), badge: $('.pbadge', panel) });
    });

    // Tiles
    TILE_IDS.forEach((id, k) => {
      const p = byId[id];
      const el = $('#card-tpl').content.firstElementChild.cloneNode(true);
      $('img', el).src = `source/products/card_${id}.jpg`;
      $('.line', el).textContent = p.line;
      $('.ttl', el).textContent = p.title;
      W.append(el);
      const side = k % 2 ? 1 : -1;
      const B = {
        x: 540 + side * (880 + rnd(k, 1) * 180),
        y: 960 + (rnd(k, 2) - 0.5) * 1000,
        z: 200 - k * 330,
        ry: -side * (22 + rnd(k, 3) * 10),
        rx: 0,
        rz: (rnd(k, 4) - 0.5) * 7,
      };
      let A = null;
      if (k < PAGE_IDS.length) {
        const { x, y } = SLOT(k);
        A = { x: x + 246, y: PAGE_TOP + y + 395, z: 2, ry: 0, rx: 0, rz: 0 };
      }
      let C = null;
      if (k < PRODUCTS.length) {
        C = { x: WALL.x + ((k % 4) - 1.5) * WALL.col, y: WALL.y + (Math.floor(k / 4) - 2) * WALL.row, z: WALL.z, ry: 0, rx: 0, rz: 0 };
      }
      tiles.push({ k, p, el, A, B, C, side, now: $('.now', el), was: $('.was', el), badge: $('.badge', el), shine: $('.shine', el), trig: 0 });
    });

    // Floating "-25%" tags along the aisle
    const WORDS = ['-25%', 'BLACK FRIDAY', '-25%', 'AUF ALLES'];
    for (let i = 0; i < 18; i++) {
      const el = document.createElement('div');
      el.className = 'obj tag' + (i % 3 === 1 ? ' w' : '');
      el.textContent = WORDS[i % WORDS.length];
      W.append(el);
      const side = rnd(i, 11) < 0.5 ? -1 : 1;
      tags.push({ el, i, x: 540 + side * (420 + rnd(i, 12) * 420), y: 260 + rnd(i, 13) * 1350, z: -500 - i * 560 });
    }

    for (let i = 0; i < 40; i++) {
      const s = document.createElement('div'); s.className = 'streak';
      $('#streaks').append(s);
      streaks.push({ el: s, a: (i / 40) * 360 + rnd(i, 21) * 8, ph: rnd(i, 22), sp: 0.7 + rnd(i, 23) * 0.6 });
    }

    ticker = $('#ticker');
    const seg = '<span>BLACK FRIDAY <b>-25%</b> AUF ALLES</span><span>HOMEDELUXE.DE</span>';
    ticker.innerHTML = seg.repeat(3);
  }

  function measure() {
    for (const t of tiles) { t.w = 492; t.h = 790; }
    for (const st of stations) {
      const ar = st.img.naturalWidth / st.img.naturalHeight;
      st.ph = ar > 1.15 ? 900 / ar : 860;
      st.py = ar > 1.15 ? 720 : 640;
      st.pw = st.ph * ar;
      st.prod.style.width = st.pw + 'px'; st.prod.style.height = st.ph + 'px';
      st.panelW = st.panel.offsetWidth; st.panelH = st.panel.offsetHeight;
      st.signW = st.sign.offsetWidth; st.signH = st.sign.offsetHeight;
    }
    for (const g of tags) { g.w = g.el.offsetWidth; g.h = g.el.offsetHeight; }
    tickerW = ticker.scrollWidth / 3;

    // When does the camera reach each aisle tile? The price drops just before.
    for (const t of tiles) {
      if (t.A) { t.trig = 1.45 + 0.07 * t.k; continue; }
      t.trig = TOTAL / FPS;
      for (let n = Math.round(2.2 * FPS); n < TOTAL; n++) {
        if (camera(n / FPS).z - t.B.z < 2600) { t.trig = n / FPS; break; }
      }
      t.trig = Math.min(t.trig, 13.4 + 0.03 * t.k);
    }
  }

  // ---------------------------------------------------------------- frame
  function seek(n) {
    const t = n / FPS;
    const c = camera(t);
    const cNext = camera((n + 1) / FPS);
    const v = Math.hypot(cNext.x - c.x, cNext.y - c.y, cNext.z - c.z);
    const speed = clamp((v - 30) / 90);

    world().style.transform = `translateZ(${P}px) rotateZ(${c.roll.toFixed(3)}deg) rotateX(${c.pitch.toFixed(3)}deg) rotateY(${c.yaw.toFixed(3)}deg) translate3d(${(-c.x).toFixed(2)}px, ${(-c.y).toFixed(2)}px, ${(-c.z).toFixed(2)}px)`;

    // Floor fades in once the page has started to tip, so it never cuts the upright page.
    drawFloor(c, E.outCubic(prog(t, [1.7, 0.8])));

    // Page: upright under the header, then it tips back and lies down as the floor of station 1.
    // The camera dives over it, so it fades before reaching the lens.
    const kp = E.inOutCubic(prog(t, [1.2, 1.7]));
    page.style.transform = `translate3d(0px, ${lerp(PAGE_TOP, FLOOR - 3, kp)}px, ${lerp(0, -2600, kp)}px) rotateX(${lerp(0, 90, kp)}deg)`;
    const pageOp = (1 - 0.25 * kp) * (1 - prog(t, [2.45, 0.5]));
    page.style.opacity = pageOp;
    page.style.visibility = pageOp > 0 ? 'visible' : 'hidden';

    // Tiles
    for (const tl of tiles) {
      const { k, B } = tl;
      const bob = 1 - E.inOutCubic(prog(t, [13.3, 1.0]));
      let pose = {
        x: B.x,
        y: B.y + 22 * Math.sin(t * 1.3 + k) * bob,
        z: B.z,
        ry: B.ry + 5 * Math.sin(t * 0.9 + k * 1.7) * bob,
        rx: B.rx + 3 * Math.sin(t * 0.7 + k) * bob,
        rz: B.rz,
      };
      if (tl.A) {
        const kl = E.inOutCubic(prog(t, [1.15 + 0.08 * k, 1.25]));
        const arc = Math.sin(Math.PI * kl);
        pose = {
          x: lerp(tl.A.x, pose.x, kl),
          y: lerp(tl.A.y, pose.y, kl) - 220 * arc,
          z: lerp(tl.A.z, pose.z, kl) + 650 * arc,
          ry: lerp(0, pose.ry, kl) + (k % 2 ? 35 : -35) * arc,
          rx: lerp(0, pose.rx, kl) - 18 * arc,
          rz: lerp(0, pose.rz, kl),
        };
      }
      let op = 1;
      if (tl.C) {
        // Depth leads (fast out), so tiles overtake the camera early on their way to the wall.
        const kl = prog(t, [13.3 + 0.045 * k, 1.5]);
        const kc = E.inOutCubic(kl);
        const arc = Math.sin(Math.PI * kc);
        pose = {
          x: lerp(pose.x, tl.C.x, kc),
          y: lerp(pose.y, tl.C.y, kc),
          z: lerp(pose.z, tl.C.z, E.outCubic(kl)),
          ry: lerp(pose.ry, 0, kc) + tl.side * 30 * arc,
          rx: lerp(pose.rx, 0, kc),
          rz: lerp(pose.rz, 0, kc),
        };
      } else {
        const ko = E.inOutCubic(prog(t, [13.3, 1.2]));
        pose.x += tl.side * 2600 * ko;
        op = 1 - ko;
      }
      place(tl.el, pose, tl.w, tl.h);
      const d = depth(c, pose.x, pose.y, pose.z);
      const dof = t > 15 ? 0 : clamp((d - 2600) / 2600) * 6;
      if (!shade(tl.el, d, op, speed * 5 + dof)) continue;

      // Price drop: count from the shop price down to -25 %.
      const p = tl.p.price, s = sale(p);
      const kf = prog(t, [tl.trig, 0.75]);
      if (t < tl.trig) {
        setText(tl.now, fmt(p, false));
        setText(tl.was, tl.p.uvp ? fmt(tl.p.uvp, false) : '');
      } else {
        setText(tl.now, fmt(kf >= 1 ? s : lerp(p, s, E.outCubic(kf))));
        setText(tl.was, fmt(p, false));
      }
      const kb = prog(t, [tl.trig + 0.05, 0.35]);
      tl.badge.style.transform = `scaleX(${kb > 0 ? E.outBack(kb).toFixed(3) : 0})`;
      tl.now.style.setProperty('--ul', Math.sin(Math.PI * prog(t, [tl.trig, 1.0])).toFixed(3));
      const wave = t > 15.3 ? (t - 15.3) * 1.2 - (tl.C ? (tl.C.x - 200) / 1400 : 0) : -1;
      tl.shine.style.backgroundPosition = `${(100 - clamp(wave) * 100 + (pose.ry / 60) * 30).toFixed(1)}% 0`;
      tl.shine.style.opacity = wave > -1 ? Math.sin(Math.PI * clamp(wave)) : 0.35 + 0.3 * Math.sin(t + k);
    }

    // Stations
    for (const st of stations) {
      const a = st.at;
      const live = t > a - 2.4 && t < a + HOLD + 1.0;
      const kOut = E.inOutCubic(prog(t, [a + HOLD - 0.1, 0.7]));

      const bob = Math.sin(t * 1.4 + st.z);
      const ppose = { x: 540, y: st.py + 18 * bob, z: st.z, ry: 16 * Math.sin(t * 0.9 + st.at), rx: 0, rz: 0 };
      place(st.prod, ppose, st.pw, st.ph);
      const dProd = depth(c, 540, st.py, st.z);
      if (live) {
        shade(st.prod, dProd, 1 - kOut, speed * 4);
      } else st.prod.style.visibility = 'hidden';

      place(st.pod, { x: 540, y: FLOOR - 4, z: st.z, rx: 90, rz: t * 20 }, 1100, 1100);
      if (live) shade(st.pod, dProd, 0.9 * (1 - kOut)); else st.pod.style.visibility = 'hidden';

      place(st.sign, { x: 540, y: 230, z: st.z - 1200, ry: 0 }, st.signW, st.signH);
      if (live) shade(st.sign, depth(c, 540, 230, st.z - 1200), 0.9 * (1 - kOut), 2 + speed * 4); else st.sign.style.visibility = 'hidden';

      // Price panel
      const kIn = E.outExpo(prog(t, [a - 0.55, 0.9]));
      const panelPose = { x: 540 + 90 * (1 - kIn), y: 1310, z: st.z + 330 - 500 * (1 - kIn) + 400 * kOut, ry: -24 * (1 - kIn) + 18 * kOut, rx: 0, rz: 0, s: 0.74 };
      place(st.panel, panelPose, st.panelW, st.panelH);
      if (live) shade(st.panel, depth(c, 540, 1310, panelPose.z), kIn * (1 - kOut), speed * 3);
      else st.panel.style.visibility = 'hidden';

      const kb = prog(t, [a + 0.15, 0.32]);
      st.badge.style.opacity = clamp(kb * 4);
      st.badge.style.transform = `rotate(${lerp(-28, -7, E.outBack(kb)).toFixed(2)}deg) scale(${lerp(3.2, 1, E.outBack(kb)).toFixed(3)})`;
      const k1 = E.inOutCubic(prog(t, [a + 0.35, 0.35]));
      st.old.style.transform = `translateY(${lerp(160, 0, k1).toFixed(1)}px) scale(${lerp(2.15, 1, k1).toFixed(3)})`;
      st.old.style.color = k1 > 0 ? `rgba(255,255,255,${lerp(1, 0.55, k1).toFixed(3)})` : '#fff';
      st.old.style.setProperty('--strike', E.outCubic(prog(t, [a + 0.55, 0.3])).toFixed(3));
      const kn = prog(t, [a + 0.5, 0.85]);
      setText(st.nw, fmt(kn >= 1 ? sale(st.p.price) : lerp(st.p.price, sale(st.p.price), E.outCubic(kn))));
      st.nw.style.opacity = clamp(prog(t, [a + 0.45, 0.15]));
      st.nw.style.transform = `scale(${(1 + 0.07 * Math.sin(Math.PI * prog(t, [a + 1.3, 0.3]))).toFixed(3)})`;
      const ks = E.outExpo(prog(t, [a + 1.3, 0.45]));
      st.save.style.clipPath = `inset(0 ${((1 - ks) * 100).toFixed(1)}% 0 0)`;
    }

    // Floating tags
    const kTags = 1 - E.inOutCubic(prog(t, [13.4, 0.8]));
    for (const g of tags) {
      const pose = { x: g.x, y: g.y + 30 * Math.sin(t * 1.1 + g.i), z: g.z, ry: 25 * Math.sin(t * 0.8 + g.i), rx: 0, rz: 8 * Math.sin(t * 0.6 + g.i * 2) };
      place(g.el, pose, g.w, g.h);
      const d = depth(c, pose.x, pose.y, pose.z);
      shade(g.el, d, kTags * clamp((t - 1.6) / 0.6), speed * 5 + clamp((d - 3000) / 3000) * 4);
    }

    // Speed streaks
    for (const s of streaks) {
      const r = 160 + ((s.ph + t * 2.2 * s.sp) % 1) * 700;
      s.el.style.transform = `rotate(${s.a}deg) translateX(${r.toFixed(1)}px) scaleX(${(0.3 + speed * 1.2).toFixed(3)})`;
      s.el.style.opacity = (speed * 0.75).toFixed(3);
    }

    // Header: ticker runs, cart counts the deals.
    ticker.style.transform = `translateX(${(-((t * 150) % tickerW)).toFixed(1)}px)`;
    let cart = 0, pop = 0;
    for (const st of stations) {
      if (t >= st.at + 1.3) cart++;
      pop = Math.max(pop, Math.sin(Math.PI * prog(t, [st.at + 1.3, 0.3])));
    }
    setText($('#cartn'), String(cart));
    $('#cartn').style.transform = `scale(${(1 + 0.5 * pop).toFixed(3)})`;

    // End card
    const kE = E.outCubic(prog(t, [15.35, 0.8]));
    $('#shade').style.opacity = kE;
    const ends = [['.bf', 15.5], ['.bs', 15.75], ['.cta', 16.0], ['.url', 16.15]];
    for (const [sel, t0] of ends) {
      const el = $(`#end ${sel}`);
      const k = E.outExpo(prog(t, [t0, 0.7]));
      el.style.opacity = k;
      el.style.transform = `translateY(${(50 * (1 - k)).toFixed(1)}px)`;
      el.style.filter = k < 1 ? `blur(${(14 * (1 - k)).toFixed(2)}px)` : 'none';
    }
    const glitch = (t > 15.5 && t < 15.8 && rnd(n, 31) < 0.6) || (t > 17.2 && t < 17.32);
    $('#end .bf').style.textShadow = glitch ? '-22px 0 rgba(255,42,109,.9), 22px 0 rgba(25,211,255,.9)' : '';
    $('#end').style.visibility = t > 15.4 ? 'visible' : 'hidden';

    $('#flash').style.opacity = (0.22 * Math.max(0, 1 - Math.abs(t - 1.3) / 0.12)).toFixed(3);
  }

  async function init() {
    build();
    await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
    await document.fonts.ready;
    await Promise.all($$('img').map(img => (img.complete && img.naturalWidth ? null : new Promise(r => { img.onload = img.onerror = r; }))));
    measure();
    const q = new URLSearchParams(location.search).get('t');
    seek(q ? Math.round(parseFloat(q) * FPS) : 0);
  }
  window.COMP = { FPS, TOTAL, seek, ready: init() };
})();
