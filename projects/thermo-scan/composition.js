// SPLASH THERMO – Thermo-Scan film, 9:16 and 1:1 from one timeline.
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
import * as THREE from 'three';
import { World, DIM, coverTop, rng } from './scene.js';

const FPS = 30;
const TOTAL = 780;                       // 26 s
const W = innerWidth, H = innerHeight;
const P = H > W;                         // portrait 9:16, else 1:1
document.body.classList.add(P ? 'pt' : 'sq');
const params = new URLSearchParams(location.search);
const PLATES = params.get('plates') || '../../build/thermo-scan/plates';

// Timeline, output seconds ----------------------------------------------------------------
const T = {
  logo: [0.1, 21.85],
  title: [0.25, 2.45],
  hud: 2.5,
  scan: [2.9, 4.0],
  dissolve: [4.3, 4.9],                  // x-ray photo -> 3D
  mask: [4.4, 5.0],
  cutOpen: [5.3, 6.7],
  callouts: [6.75, 8.2],
  lift1: [8.2, 8.8], drop1: [9.6, 10.15],
  heatLoss: [8.5, 9.9], heatBack: [10.3, 11.5],
  chipOff: [8.45, 9.7], chipOn: [10.25, 11.6],
  cutClose: [11.2, 11.9],
  look: [11.6, 12.4],                    // x-ray -> studio, scan wipe
  lift2: [12.1, 13.1], hover: [13.1, 14.5], drop2: [14.5, 15.2],
  dims: [13.0, 14.6],
  leaves: 15.45,
  rain: [16.8, 18.9],
  lift3: [19.0, 19.9],
  cap1: [9.9, 11.9], cap2: [12.9, 14.9], cap3: [15.9, 18.9], cap4: [20.0, 21.85],
  wipe: [21.85, 22.25],
  end: 22.25,
};

// Helpers ---------------------------------------------------------------------------------
const $ = s => document.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  inOut: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: k => 1 - Math.pow(1 - k, 3),
  out5: k => 1 - Math.pow(1 - k, 5),
  in: k => k * k * k,
  sine: k => 0.5 - 0.5 * Math.cos(Math.PI * k),
  back: k => { const c = 1.6; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
};
const win = (t, [a, b], fin = 0.4, fout = 0.3) => Math.min(prog(t, a, a + fin), 1 - prog(t, b - fout, b));

// Catmull-Rom through keyframes of plain-number objects.
function track(keys) {
  return t => {
    if (t <= keys[0][0]) return { ...keys[0][1] };
    if (t >= keys[keys.length - 1][0]) return { ...keys[keys.length - 1][1] };
    let i = 0; while (keys[i + 1][0] < t) i++;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    const u = (t - k1[0]) / (k2[0] - k1[0]);
    const out = {};
    for (const key of Object.keys(k1[1])) {
      const p0 = k0[1][key] ?? k1[1][key], p1 = k1[1][key], p2 = k2[1][key] ?? p1, p3 = k3[1][key] ?? p2;
      // tangents scaled by the segment lengths (non-uniform Catmull-Rom)
      const d1 = k2[0] - k1[0];
      const m1 = k1 === k0 ? 0 : ((p2 - p0) / (k2[0] - k0[0])) * d1;
      const m2 = k3 === k2 ? 0 : ((p3 - p1) / (k3[0] - k1[0])) * d1;
      const u2 = u * u, u3 = u2 * u;
      out[key] = (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
    }
    return out;
  };
}

// Camera. hfov is constant, so 9:16 shows the same width as 1:1 plus room above / below;
// sy (px) lifts the picture in 9:16 to leave space for the captions.
const MATCH = { az: 3, el: 55.5, dist: 4.5, ty: 0.55, hfov: 26, sy: -105 };
const cam = track([
  [4.30, MATCH],
  [4.62, MATCH],
  [6.70, { az: -6, el: 13, dist: 4.5, ty: 0.42, hfov: 34, sy: P ? -150 : -10 }],
  [8.20, { az: -3, el: 12, dist: 4.3, ty: 0.45, hfov: 34, sy: P ? -170 : -10 }],
  [11.0, { az: 6, el: 14, dist: 4.15, ty: 0.45, hfov: 34, sy: P ? -170 : -10 }],
  [12.7, { az: 32, el: 28, dist: 4.7, ty: 0.80, hfov: 34, sy: P ? -170 : -30 }],
  [14.4, { az: 42, el: 26, dist: 4.5, ty: 0.80, hfov: 34, sy: P ? -170 : -30 }],
  [15.7, { az: -24, el: 31, dist: P ? 3.3 : 4.1, ty: 0.50, hfov: 34, sy: P ? -190 : -70 }],
  [18.9, { az: -36, el: 37, dist: P ? 3.0 : 3.7, ty: 0.50, hfov: 34, sy: P ? -190 : -70 }],
  [20.2, { az: -32, el: 86, dist: 2.25, ty: 0.47, hfov: 34, sy: P ? -170 : -40 }],
  [22.4, { az: -27, el: 88, dist: 1.8, ty: 0.47, hfov: 34, sy: P ? -170 : -40 }],
]);

// Layout per format -----------------------------------------------------------------------
const L = P ? {
  winTop: (H - W) / 2,
  frame: { l: 36, t: 290, r: W - 36, b: H - 96 },
  capBottom: 150, titleBottom: 118,
  chip: { top: 1090, left: 72 }, legend: { x: W - 72 - 22 - 64, y: 520, h: 360 },
  prog: { right: 72, top: 140 },
  end: { logoTop: 140, coverY: 770, coverW: 880, shadowY: 1110, shadowW: 720, textTop: 1190 },
} : {
  winTop: 0,
  frame: { l: 28, t: 28, r: W - 28, b: H - 28 },
  capBottom: 56, titleBottom: 56,
  chip: { top: 178, right: 56 }, legend: { x: W - 56 - 22 - 60, y: 420, h: 260 },
  prog: { right: 56, bottom: 60 },
  end: { logoTop: 56, coverY: 330, coverW: 620, shadowY: 545, shadowW: 520, textTop: 610 },
};
const WIN = { l: 0, t: L.winTop, r: W, b: L.winTop + W };

// DOM setup -------------------------------------------------------------------------------
$('#photo').src = PLATES + '/photo.jpg';
$('#xray').src = PLATES + '/photo_xray.png';
$('#coverImg').src = PLATES + '/cover_34.png';
$('#win').style.top = WIN.t + 'px';
$('#mask').style.top = WIN.t + 'px';
for (const id of ['#cap1', '#cap2', '#cap3', '#cap4']) $(id).style.bottom = L.capBottom + 'px';
$('#title').style.bottom = L.titleBottom + 'px';
for (const c of $$('.chip')) Object.assign(c.style, { top: L.chip.top + 'px' }, L.chip.right !== undefined ? { left: 'auto', right: L.chip.right + 'px' } : { left: L.chip.left + 'px' });
Object.assign($('#legend').style, { left: L.legend.x + 'px', top: L.legend.y + 'px', height: L.legend.h + 'px' });
Object.assign($('#prog').style, { right: L.prog.right + 'px' }, L.prog.top !== undefined ? { top: L.prog.top + 'px' } : { bottom: L.prog.bottom + 'px' });
$('#endLogo').style.top = L.end.logoTop + 'px';
$('#endText').style.top = L.end.textTop + 'px';
Object.assign($('#endCover').style, { top: L.end.coverY + 'px', width: L.end.coverW + 'px' });
Object.assign($('#endShadow').style, { top: L.end.shadowY + 'px', width: L.end.shadowW + 'px' });
$('#endGlow').style.top = L.end.coverY + 'px';

const canvas = $('#gl');
canvas.width = W; canvas.height = H;
const world = new World(canvas, W, H);

// Film grain: a few fixed noise tiles, one per frame
const grain = $('#grain'); grain.width = W / 2; grain.height = H / 2;
const gctx = grain.getContext('2d');
const grainTiles = Array.from({ length: 6 }, (_, k) => {
  const r = rng(100 + k); const img = gctx.createImageData(W / 2, H / 2);
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  return img;
});

// SVG overlay helpers
const SVGNS = 'http://www.w3.org/2000/svg';
const svg = $('#ov');
const labels = $('#labels');
function svgEl(tag, attrs) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }

// Callouts on the section (world anchors on the cut plane z = 0)
const CALLOUTS = [
  { at: [-0.30, DIM.coverRest + 0.105, 0], dx: P ? -40 : -60, dy: P ? -260 : -200, s: 'Abdeckung', t: 'Isolierendes Luftpolster', delay: 0.0, side: 'right' },
  { at: [0.50, DIM.coverRest + coverTop(0.5, 0) - 0.003, 0], dx: P ? 10 : 40, dy: P ? -170 : -150, s: 'Material', t: 'Wetterfestes PVC', delay: 0.25, side: 'left-r' },
  { at: [0.15, 0.24, 0], dx: P ? 40 : 120, dy: P ? 210 : 120, s: 'Becken', t: 'Warmes Badewasser', delay: 0.5, side: 'left' },
];
for (const c of CALLOUTS) {
  c.line = svgEl('polyline', { fill: 'none', stroke: '#8fe3ff', 'stroke-width': 2.5 });
  c.dot = svgEl('circle', { r: 9, fill: '#ffffff', stroke: '#8fe3ff', 'stroke-width': 4 });
  c.ring = svgEl('circle', { r: 9, fill: 'none', stroke: '#8fe3ff', 'stroke-width': 2 });
  c.el = document.createElement('div'); c.el.className = 'clab';
  c.el.innerHTML = `<span class="s">${c.s}</span><span class="t">${c.t}</span>`;
  labels.appendChild(c.el);
}
// Dimension lines
const DIMS = {
  d: { line: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }), t1: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }), t2: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }) },
  h: { line: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }), t1: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }), t2: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }) },
};
const dimLabD = document.createElement('div'); dimLabD.className = 'dimlab'; dimLabD.textContent = 'Ø 162 cm'; labels.appendChild(dimLabD);
const dimLabH = document.createElement('div'); dimLabH.className = 'dimlab'; dimLabH.textContent = '20 cm'; labels.appendChild(dimLabH);
// Laser frame at the cut plane
const laser = svgEl('polygon', { fill: 'rgba(143,227,255,.06)', stroke: '#c9f3ff', 'stroke-width': 3 });

// Text animation --------------------------------------------------------------------------
function stackAnim(root, t, [a, b]) {
  const on = t >= a - 0.05 && t <= b + 0.05;
  root.style.visibility = on ? 'visible' : 'hidden';
  if (!on) return;
  const out = E.inOut(prog(t, b - 0.35, b));
  root.style.transform = `translateX(${-60 * out}px)`;
  root.style.opacity = 1 - out;
  const kick = root.querySelector('.kicker');
  if (kick) { const k = E.out(prog(t, a, a + 0.4)); kick.style.opacity = k; kick.style.transform = `translateX(${(1 - k) * -30}px)`; }
  $$('.blk', root).forEach((blk, i) => {
    const k = E.out5(prog(t, a + 0.08 + i * 0.12, a + 0.5 + i * 0.12));
    blk.style.clipPath = `inset(0 ${(1 - k) * 100}% 0 0)`;
    $$('.ln > span', blk).forEach((s, j) => {
      const kk = E.out(prog(t, a + 0.16 + i * 0.12 + j * 0.06, a + 0.62 + i * 0.12 + j * 0.06));
      s.style.transform = `translateY(${(1 - kk) * 105}%)`;
    });
  });
}

function vis(el, o) { el.style.opacity = o; el.style.visibility = o > 0.001 ? 'visible' : 'hidden'; }

// State per frame -------------------------------------------------------------------------
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

function coverState(t) {
  let lift = 0, rx = 0, ry = 0, sq = 1;
  // heat demo: lift and drop back
  const l1 = E.inOut(prog(t, ...T.lift1)), d1 = E.in(prog(t, ...T.drop1));
  if (t < T.lift2[0]) lift = 0.42 * l1 * (1 - d1);
  // landing squash
  const land = (tl) => { const k = prog(t, tl, tl + 0.45); return k > 0 && k < 1 ? 1 - 0.07 * Math.sin(Math.PI * k) * (1 - k) * 2 : 1; };
  sq *= land(T.drop1[1]);
  // product view: lift, hover, drop
  const l2 = E.inOut(prog(t, ...T.lift2)), d2 = E.inOut(prog(t, ...T.drop2));
  if (t >= T.lift2[0] && t < T.lift3[0]) {
    const hov = prog(t, T.lift2[0], T.drop2[1]);
    lift = 0.98 * l2 * (1 - d2) + Math.sin(hov * Math.PI * 2) * 0.02 * l2 * (1 - d2);
    rx = THREE.MathUtils.degToRad(17) * l2 * (1 - d2);
    ry = THREE.MathUtils.degToRad(25 + 14 * hov) * l2 * (1 - d2);
    sq *= land(T.drop2[1]);
  }
  // reveal clear water: cover flies up and away
  const l3 = E.in(prog(t, ...T.lift3));
  if (t >= T.lift3[0]) { lift = 2.8 * l3; rx = THREE.MathUtils.degToRad(-22) * l3; ry = THREE.MathUtils.degToRad(18) * l3; }
  return { lift, rx, ry, sq };
}

function cutPos(t) {
  const o = E.inOut(prog(t, ...T.cutOpen)), c = E.inOut(prog(t, ...T.cutClose));
  return 1.2 - 1.2 * o + 1.2 * c;
}

function openness(t) { return Math.min(prog(t, 8.3, 8.7), 1 - prog(t, 9.75, 10.1)); }

function updateHeat(t) {
  const ps = world.particles; const N = ps.N;
  const fade = win(t, [6.8, 11.9], 0.5, 0.5);
  const o = openness(t);
  const R = rng(5);
  for (let i = 0; i < N; i++) {
    const seed = R(), rx = R(), rz = R(), spd = 0.22 + R() * 0.2, sz = R();
    let x = 0, y = -10, z = 0, c = [0, 0, 0], s = 0;
    if (fade > 0 && i < 520) {
      const life = ((t * spd + seed) % 1);
      const ang = rx * Math.PI * 2, rad = Math.sqrt(rz) * (DIM.rIn - 0.08);
      x = Math.cos(ang) * rad; z = -Math.abs(Math.sin(ang) * rad) - 0.03;
      const yW = DIM.water - 0.015;
      let warm = 1;
      if (life < 0.55) {                         // rising through the water
        const k = life / 0.55;
        y = DIM.floor + 0.04 + (yW - DIM.floor - 0.04) * k;
        x += Math.sin(k * 6 + seed * 20) * 0.02;
      } else {
        const k = (life - 0.55) / 0.45;
        // escaping (no cover) vs. turned back under the cover
        const yUp = yW + k * 1.5, xUp = x * (1 + k * 0.5) + Math.sin(k * 5 + seed * 9) * 0.06;
        const yDn = yW - Math.sin(k * Math.PI) * 0.12 - k * 0.05, xDn = x * (1 + 0.12 * Math.sin(k * Math.PI));
        y = lerp(yDn, yUp, o); x = lerp(xDn, xUp, o);
        warm = lerp(1, 1 - k, o);
      }
      const b = fade * (0.55 + 0.45 * sz) * warm;
      c = [1.0 * b, (0.42 + 0.3 * sz) * b, 0.12 * b];
      s = 0.022 + sz * 0.03;
    }
    ps.pos[i * 3] = x; ps.pos[i * 3 + 1] = y; ps.pos[i * 3 + 2] = z;
    ps.col[i * 3] = c[0]; ps.col[i * 3 + 1] = c[1]; ps.col[i * 3 + 2] = c[2];
    ps.size[i] = s;
  }
  // glints on the clear water
  const gf = win(t, [19.7, 22.4], 0.6, 0.1);
  const G = rng(77);
  for (let i = 520; i < N; i++) {
    const gx = (G() - 0.5) * 1.5, gz = (G() - 0.5) * 1.5, ph = G(), sp = 1.5 + G() * 2;
    let s = 0, b = 0;
    if (gf > 0 && Math.hypot(gx, gz) < DIM.rIn - 0.05) {
      const tw = Math.max(0, Math.sin((t * sp + ph) * Math.PI * 2));
      b = Math.pow(tw, 12) * gf; s = 0.02 + 0.03 * b;
    }
    ps.pos[i * 3] = gx; ps.pos[i * 3 + 1] = DIM.water + 0.004; ps.pos[i * 3 + 2] = gz;
    ps.col[i * 3] = b; ps.col[i * 3 + 1] = b; ps.col[i * 3 + 2] = b;
    ps.size[i] = s;
  }
  ps.geo.attributes.position.needsUpdate = true;
  ps.geo.attributes.color.needsUpdate = true;
  ps.geo.attributes.size.needsUpdate = true;
}

function updateLeaves(t) {
  for (const L0 of world.leaves) {
    const tl = T.leaves + L0.land, t0 = tl - 1.25;
    const m = L0.mesh;
    m.userData.on = t >= t0;
    if (t < t0) continue;
    const k = clamp((t - t0) / 1.25);
    const ySurf = coverTop(L0.x, L0.z) + 0.012;
    const fall = 1 - k;
    m.position.set(
      L0.x + L0.dx * fall * fall + Math.sin(L0.ph + k * L0.wob * 7) * 0.14 * fall,
      ySurf + L0.h0 * Math.pow(fall, 1.15),
      L0.z + L0.dz * fall * fall + Math.cos(L0.ph + k * L0.wob * 5) * 0.1 * fall,
    );
    const settle = k >= 1 ? Math.exp(-(t - tl) * 9) * Math.sin((t - tl) * 30) * 0.05 : 0;
    m.rotation.set(-Math.PI / 2 + L0.tiltX + Math.sin(L0.ph + k * 9) * 1.1 * fall + settle, L0.tiltZ + Math.cos(L0.ph + k * 7) * 0.6 * fall, L0.spin + k * 2.2 * fall);
  }
}

function updateRain(t) {
  const on = t > T.rain[0] && t < T.rain[1] + 0.5;
  world.rain.visible = on; world.splashes.visible = on;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), Pp = new THREE.Vector3();
  const qDrop = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.1));
  const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const hits = [];
  const restY = DIM.coverRest;
  world.drops.forEach((d, i) => {
    const per = 3.6 / d.v;
    const rel = (t - T.rain[0]) / per + d.t0;
    const cyc = Math.floor(rel), loc = rel - cyc;
    const start = T.rain[0] + (cyc - d.t0) * per;
    const active = on && start >= T.rain[0] - 1e-6 && start <= T.rain[1] - 0.4;
    const rho = Math.hypot(d.x, d.z);
    const surf = rho < DIM.coverR - 0.02 ? restY + coverTop(d.x, d.z) : rho < DIM.rOut ? DIM.rimY + DIM.rimRy * 0.9 : 0;
    const y = 3.2 - loc * per * d.v;
    if (active && y > surf) {
      Pp.set(d.x + (y - surf) * 0.1, y + 0.08, d.z); S.set(1, 1, 1);
      M.compose(Pp, qDrop, S);
    } else { M.makeScale(0, 0, 0); }
    world.rain.setMatrixAt(i, M);
    // splash after impact
    const tHit = start + (3.2 - surf) / d.v;
    const age = (t - tHit) / 0.38;
    if (start >= T.rain[0] - 1e-6 && start <= T.rain[1] - 0.4 && age >= 0 && age < 1) {
      const r = 0.012 + age * 0.07;
      Pp.set(d.x, surf + 0.004, d.z); S.set(r, r, r);
      M.compose(Pp, qFlat, S);
      const b = (1 - age) * 0.8; world.splashes.setColorAt(i, new THREE.Color(b, b, b));
      if (rho < DIM.coverR - 0.02) hits.push([d.x, d.z, age]);
    } else { M.makeScale(0, 0, 0); world.splashes.setColorAt(i, new THREE.Color(0, 0, 0)); }
    world.splashes.setMatrixAt(i, M);
  });
  world.rain.instanceMatrix.needsUpdate = true;
  world.splashes.instanceMatrix.needsUpdate = true;
  world.splashes.instanceColor.needsUpdate = true;
  hits.sort((a, b) => a[2] - b[2]);
  const n = Math.min(24, hits.length);
  for (let i = 0; i < 24; i++) {
    if (i < n) world.ripples[i].set(hits[i][0], hits[i][1], hits[i][2], 1); else world.ripples[i].set(0, 0, 1, 0);
  }
  return n;
}

function bracket(rect, k) {
  const [tl, tr, bl, br] = $$('#hud .br');
  const s = 54 * k;
  for (const b of [tl, tr, bl, br]) { b.style.width = s + 'px'; b.style.height = s + 'px'; }
  Object.assign(tl.style, { left: rect.l + 'px', top: rect.t + 'px' });
  Object.assign(tr.style, { left: rect.r - s + 'px', top: rect.t + 'px' });
  Object.assign(bl.style, { left: rect.l + 'px', top: rect.b - s + 'px' });
  Object.assign(br.style, { left: rect.r - s + 'px', top: rect.b - s + 'px' });
}

const mixRect = (a, b, k) => ({ l: lerp(a.l, b.l, k), t: lerp(a.t, b.t, k), r: lerp(a.r, b.r, k), b: lerp(a.b, b.b, k) });

// Seek ------------------------------------------------------------------------------------
function seek(n) {
  const t = n / FPS;

  // ---- 3D state
  const need3D = t >= T.dissolve[0] - 0.05 && t < T.wipe[1];
  const cs = coverState(t);
  world.cover.position.set(0, DIM.coverRest + cs.lift, 0);
  world.cover.rotation.set(cs.rx, cs.ry, 0, 'YXZ');
  world.coverInner.scale.set(1 + (1 - cs.sq) * 0.4, cs.sq, 1 + (1 - cs.sq) * 0.4);
  world.cover.updateMatrixWorld(true);

  const c = cam(t);
  world.setCamera(c);

  const d = cutPos(t);
  world.cut.constant = d;
  const capFade = d < 1.15 && t < T.look[1] ? 1 : 0;
  world.updateCaps(d, capFade);

  for (const m of [world.poolX, world.coverX]) m.uniforms.uTime.value = t;
  world.poolX.uniforms.uScanY.value = -10;
  const heat = 1 - 0.7 * E.inOut(prog(t, ...T.heatLoss)) + 0.7 * E.inOut(prog(t, ...T.heatBack));
  for (const m of [world.waterThermal, world.capWaterMat]) { m.uniforms.uTime.value = t; m.uniforms.uHeat.value = heat; }
  world.capAirMat.uniforms.uTime.value = t;
  world.capAirMat.uniforms.uPulse.value = win(t, [9.9, 11.4], 0.3, 0.6) * (0.5 + 0.5 * Math.sin(t * 6));
  world.waterThermal.uniforms.uOpacity.value = 0.2;
  world.waterClear.uniforms.uTime.value = t;
  world.causticMat.uniforms.uTime.value = t;
  updateHeat(t);
  updateLeaves(t);
  const nHits = updateRain(t);
  if (world.coverShaderU) {
    world.coverShaderU.uRipN.value = nHits;
    const leafPulse = world.leaves.reduce((acc, L0) => { const a = t - (T.leaves + L0.land); return acc + (a > 0 ? Math.exp(-a * 5) : 0); }, 0);
    world.coverShaderU.uShield.value = Math.min(1, 0.25 * win(t, T.rain, 0.4, 0.4) + 0.35 * leafPulse);
  }

  // look and post
  const lk = prog(t, ...T.look);
  if (lk <= 0) { world.renderPass.split = null; world.renderPass.mode = 'xray'; }
  else if (lk >= 1) { world.renderPass.split = null; world.renderPass.mode = 'solid'; }
  else world.renderPass.split = { y: E.inOut(lk), top: 'solid', bottom: 'xray' };
  vis($('#splitLine'), lk > 0 && lk < 1 ? 1 : 0);
  $('#splitLine').style.top = E.inOut(lk) * H - 1 + 'px';
  world.bloom.strength = lerp(0.5, 0.2, E.inOut(lk));
  world.bloom.threshold = lerp(0.5, 0.88, E.inOut(lk));
  world.bloom.radius = 0.4;
  world.renderer.toneMappingExposure = lerp(1.0, 0.9, lk);
  world.bloom.enabled = params.get('bloom') !== '0';

  const DBG = params.get('dbg');
  if (need3D || DBG) world.render();

  // ---- Photo window, scan
  const zoom = 1 + 0.085 * E.sine(prog(t, 0, T.dissolve[1]));
  for (const img of [$('#photo'), $('#xray')]) img.style.transform = `translate(-50%, -50%) scale(${zoom})`;
  const s = E.inOut(prog(t, ...T.scan));
  const winH = WIN.b - WIN.t;
  $('#xray').style.clipPath = `inset(0 0 ${(1 - s) * 100}% 0)`;
  const scanOn = t > T.scan[0] - 0.05 && t < T.scan[1] + 0.25;
  const scanY = s * winH;
  vis($('#scan'), scanOn ? Math.min(1, 1 - prog(t, T.scan[1], T.scan[1] + 0.25)) : 0);
  vis($('#scanGlow'), scanOn ? Math.min(1, 1 - prog(t, T.scan[1], T.scan[1] + 0.25)) : 0);
  $('#scan').style.top = scanY - 1 + 'px';
  $('#scanGlow').style.top = scanY - 180 + 'px';
  vis($('#win'), DBG === 'match' ? 0.5 : 1 - E.inOut(prog(t, ...T.dissolve)));
  vis($('#mask'), P ? 1 - E.inOut(prog(t, ...T.mask)) : 0);

  // ---- HUD
  const hudIn = E.out(prog(t, T.hud, T.hud + 0.4));
  const hudOut = prog(t, T.wipe[0] - 0.3, T.wipe[0]);
  vis($('#hud'), hudIn * (1 - hudOut));
  const inset = r => ({ l: r.l + 24, t: r.t + 24, r: r.r - 24, b: r.b - 24 });
  const rect = mixRect(inset(WIN), L.frame, E.inOut(prog(t, 4.5, 5.3)));
  bracket(rect, hudIn);
  // 1:1: the logo sits in the top-left corner, the HUD title goes below it
  const hudTop = P ? rect.t + 24 : Math.max(rect.t + 24, 128);
  Object.assign($('#hudTitle').style, { left: rect.l + 26 + 'px', top: hudTop + 'px' });
  // 1:1 has no room for the title next to the product shots; it steps back there
  const hudTxt = P ? 1 : 1 - prog(t, 11.6, 12.0);
  $('#hudTitle').style.opacity = hudTxt; $('#meter').style.opacity = hudTxt;
  const rd = $('#hudRead');
  Object.assign(rd.style, { left: 'auto', right: W - rect.r + 26 + 'px', top: rect.t + 24 + 'px' });
  Object.assign($('#meter').style, { left: rect.l + 26 + 'px', top: hudTop + (P ? 42 : 36) + 'px', width: (P ? 360 : 300) + 'px' });
  $('#meter i').style.width = s * 100 + '%';
  const md = $('#hudMode');
  Object.assign(md.style, { left: 'auto', right: W - rect.r + 26 + 'px', top: rect.t + 62 + 'px' });
  md.textContent = t < 6.0 ? 'Modus · Röntgen' : t < 8.2 ? 'Modus · Querschnitt' : t < 11.8 ? 'Modus · Wärmebild' : t < 15.4 ? 'Modus · Produkt' : t < 19.1 ? 'Modus · Wetter' : 'Modus · Wasser';
  rd.innerHTML = t < T.scan[1] + 0.3 ? `Scan <b>${String(Math.round(s * 100)).padStart(3, '0')}</b> %` : 'Scan <b>OK</b>';
  $('.rec').style.opacity = (Math.floor(t * 2) % 2) ? 0.25 : 1;

  vis($('#legend'), win(t, [3.4, 11.7], 0.5, 0.4));

  // ---- Logo, title, captions, chips, progress
  vis($('#logo'), Math.min(E.out(prog(t, T.logo[0], T.logo[0] + 0.4)), 1 - prog(t, T.logo[1] - 0.3, T.logo[1])));
  stackAnim($('#title'), t, T.title);
  stackAnim($('#cap1'), t, T.cap1);
  stackAnim($('#cap2'), t, T.cap2);
  stackAnim($('#cap3'), t, T.cap3);
  stackAnim($('#cap4'), t, T.cap4);
  for (const [id, w] of [['#chipOff', T.chipOff], ['#chipOn', T.chipOn]]) {
    const k = win(t, w, 0.3, 0.3);
    vis($(id), k);
    $(id).style.transform = `translateY(${(1 - E.out(prog(t, w[0], w[0] + 0.3))) * -20}px)`;
  }
  const blink = 0.65 + 0.35 * Math.sin(t * 14);
  $('#chipOff i').style.opacity = blink;
  vis($('#prog'), win(t, [5.0, T.wipe[0]], 0.5, 0.3));
  [T.cap1, T.cap2, T.cap3, T.cap4].forEach((w, i) => {
    const seg = $$('#prog > div')[i];
    seg.querySelector('i').style.width = prog(t, w[0], w[1]) * 100 + '%';
    seg.classList.toggle('on', t >= w[0]);
  });

  // ---- Callouts
  for (const co of CALLOUTS) {
    const k = win(t, [T.callouts[0] + co.delay, T.callouts[1]], 0.5, 0.3);
    const on = k > 0.001 && need3D;
    for (const e of [co.line, co.dot, co.ring]) e.style.display = on ? '' : 'none';
    co.el.style.display = on ? '' : 'none';
    if (!on) continue;
    const a = world.project(v3(...co.at));
    const kd = E.out(prog(t, T.callouts[0] + co.delay, T.callouts[0] + co.delay + 0.5));
    const ex = a.x + co.dx, ey = a.y + co.dy;
    const mx = lerp(a.x, ex, kd), my = lerp(a.y, ey, kd);
    co.line.setAttribute('points', `${a.x},${a.y} ${mx},${my}`);
    co.line.style.opacity = k;
    co.dot.setAttribute('cx', a.x); co.dot.setAttribute('cy', a.y); co.dot.style.opacity = k;
    const pr = ((t * 1.2) % 1);
    co.ring.setAttribute('cx', a.x); co.ring.setAttribute('cy', a.y); co.ring.setAttribute('r', 9 + pr * 26); co.ring.style.opacity = (1 - pr) * k;
    const lab = co.el; lab.style.opacity = E.out(prog(t, T.callouts[0] + co.delay + 0.25, T.callouts[0] + co.delay + 0.6)) * k;
    const lw = lab.offsetWidth, lh = lab.offsetHeight;
    let lx = co.side === 'right' ? ex - lw + 3 : ex - 3;
    if (co.side === 'left-r') lx = ex - 3;
    lx = clamp(lx, 24, W - 24 - lw);
    const ly = co.dy < 0 ? ey - lh : ey;
    lab.style.left = lx + 'px'; lab.style.top = ly + 'px';
  }

  // ---- Laser frame at the cut plane while it moves
  const moving = (t > T.cutOpen[0] && t < T.cutOpen[1] + 0.15) || (t > T.cutClose[0] - 0.05 && t < T.cutClose[1]);
  if (moving && need3D) {
    const corners = [v3(-1.25, -0.02, d), v3(1.25, -0.02, d), v3(1.25, 1.0, d), v3(-1.25, 1.0, d)].map(p => world.project(p));
    laser.setAttribute('points', corners.map(p => `${p.x},${p.y}`).join(' '));
    laser.style.display = '';
    laser.style.opacity = d > 1.15 ? 0 : 1;
  } else laser.style.display = 'none';

  // ---- Dimension lines (cover-local -> world -> screen)
  const kd = win(t, T.dims, 0.5, 0.35);
  const dimOn = kd > 0.001 && need3D;
  for (const g of [DIMS.d, DIMS.h]) for (const e of Object.values(g)) e.style.display = dimOn ? '' : 'none';
  dimLabD.style.display = dimLabH.style.display = dimOn ? '' : 'none';
  if (dimOn) {
    const mw = world.coverInner.matrixWorld;
    const r = DIM.coverR, yTop = DIM.coverT + 0.07;
    const grow = E.inOut(prog(t, T.dims[0], T.dims[0] + 0.6));
    const pA = world.project(v3(-r * grow, yTop, 0.0).applyMatrix4(mw)), pB = world.project(v3(r * grow, yTop, 0.0).applyMatrix4(mw));
    const setL = (e, a, b) => { e.setAttribute('x1', a.x); e.setAttribute('y1', a.y); e.setAttribute('x2', b.x); e.setAttribute('y2', b.y); };
    setL(DIMS.d.line, pA, pB);
    const tick = (p) => [{ x: p.x, y: p.y - 14 }, { x: p.x, y: p.y + 14 }];
    setL(DIMS.d.t1, ...tick(pA)); setL(DIMS.d.t2, ...tick(pB));
    const hz = r + 0.1;
    const h0 = world.project(v3(hz, 0, 0).applyMatrix4(mw)), h1 = world.project(v3(hz, lerp(0, DIM.coverT, E.inOut(prog(t, T.dims[0] + 0.3, T.dims[0] + 0.8))), 0).applyMatrix4(mw));
    setL(DIMS.h.line, h0, h1);
    const tickH = (p) => [{ x: p.x - 14, y: p.y }, { x: p.x + 14, y: p.y }];
    setL(DIMS.h.t1, ...tickH(h0)); setL(DIMS.h.t2, ...tickH(h1));
    for (const g of [DIMS.d, DIMS.h]) for (const e of Object.values(g)) e.style.opacity = kd;
    dimLabD.style.left = (pA.x + pB.x) / 2 + 'px'; dimLabD.style.top = (pA.y + pB.y) / 2 - 44 + 'px';
    dimLabD.style.opacity = kd * E.out(prog(t, T.dims[0] + 0.4, T.dims[0] + 0.8));
    dimLabH.style.left = h1.x + 78 + 'px'; dimLabH.style.top = (h0.y + h1.y) / 2 + 'px';
    dimLabH.style.opacity = kd * E.out(prog(t, T.dims[0] + 0.6, T.dims[0] + 1.0));
  }

  // ---- Flash, wipe, end card
  const fl = Math.max(0.35 * (1 - prog(t, T.scan[1], T.scan[1] + 0.35)) * (t >= T.scan[1] ? 1 : 0),
    0.5 * Math.max(0, 1 - Math.abs(t - T.look[0]) / 0.18) * 0);
  vis($('#flash'), fl);
  const wp = E.inOut(prog(t, ...T.wipe));
  const wipe = $('#wipe');
  vis(wipe, wp > 0 && t < T.end + 0.02 ? 1 : 0);
  wipe.style.top = H * (1 - wp) + 'px'; wipe.style.bottom = '0px';
  const endOn = t >= T.end;
  vis($('#end'), endOn ? 1 : 0);
  if (endOn) {
    const te = t - T.end;
    const kc = E.out5(prog(te, 0.0, 1.1));
    const bob = Math.sin(te * 1.6) * 8;
    $('#endCover').style.transform = `translate(-50%, calc(-50% + ${(1 - kc) * -120 + bob}px)) scale(${0.9 + 0.1 * kc}) rotate(${Math.sin(te * 1.1) * 0.8}deg)`;
    $('#endCover').style.opacity = kc;
    $('#endShadow').style.opacity = kc * (0.85 - bob * 0.02);
    $('#endShadow').style.transform = `translate(-50%, -50%) scale(${1 - bob * 0.006})`;
    $('#endGlow').style.opacity = E.out(prog(te, 0, 1.2));
    vis($('#endLogo'), E.out(prog(te, 0.2, 0.7)));
    const et = $('#endText');
    const kk = et.querySelector('.kicker'); const kk1 = E.out(prog(te, 0.35, 0.8)); kk.style.opacity = kk1; kk.style.transform = `translateX(${(1 - kk1) * -30}px)`;
    $$('.ln > span', et).forEach((sp, i) => { const k2 = E.out(prog(te, 0.45 + i * 0.12, 0.95 + i * 0.12)); sp.style.transform = `translateY(${(1 - k2) * 105}%)`; });
    $$('.specs span', et).forEach((sp, i) => { const k3 = E.out(prog(te, 0.85 + i * 0.1, 1.25 + i * 0.1)); sp.style.opacity = k3; sp.style.transform = `translateY(${(1 - k3) * 20}px)`; });
    const k4 = E.back(prog(te, 1.25, 1.75)); const cta = et.querySelector('.cta'); cta.style.opacity = clamp(k4); cta.style.transform = `scale(${0.9 + 0.1 * k4})`; cta.style.transformOrigin = '0 50%';
    const k5 = E.out(prog(te, 1.6, 2.1)); et.querySelector('.fit').style.opacity = k5;
  }

  // ---- Grain
  gctx.putImageData(grainTiles[n % grainTiles.length], 0, 0);
}

// Boot --------------------------------------------------------------------------------------
const imgs = [...document.images];
const ready = Promise.all([
  document.fonts.ready,
  ...imgs.map(i => (i.complete && i.naturalWidth ? Promise.resolve() : new Promise((res, rej) => { i.onload = res; i.onerror = () => rej(new Error('image ' + i.src)); }))),
]).then(() => { seek(Math.round(5 * FPS)); seek(0); });

window.COMP = { FPS, TOTAL, seek, ready };
const tq = params.get('t');
if (tq !== null) ready.then(() => seek(Math.round(parseFloat(tq) * FPS)));
