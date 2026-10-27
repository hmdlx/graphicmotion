// SPLASH THERMO – premium 9:16 cut. Own shot list for the vertical frame:
// macro opening with depth of field and a light sweep, crane into the hero shot,
// thermo scan on the 3D model, close cross-section, heat demo, product hover,
// weather close-up, clear water (no text), end card with both covers.
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
import * as THREE from 'three';
import { World, DIM, coverTop, rng } from './scene.js';

const FPS = 30;
const TOTAL = 840;                       // 28 s
const W = 1080, H = 1920;
const params = new URLSearchParams(location.search);
const PLATES = params.get('plates') || '../../build/thermo-scan/plates';

// Timeline, output seconds ----------------------------------------------------------------
const T = {
  macro: [0, 4.6],                       // studio look, DOF, light sweep, dust
  title: [0.7, 3.4],
  scanIn: [4.5, 5.4],                    // studio -> x-ray, line runs down
  legend: [5.3, 12.3],
  cutOpen: [5.9, 7.1],
  callouts: [7.1, 8.7],
  lift1: [8.8, 9.45], drop1: [10.25, 10.8],
  heatLoss: [9.0, 10.4], heatBack: [10.85, 12.0],
  chipOff: [9.05, 10.3],
  cap1: [10.7, 12.5],
  cutClose: [12.0, 12.6],
  scanOut: [12.4, 13.2],                 // x-ray -> studio, line runs up
  lift2: [13.0, 14.0], drop2: [15.7, 16.4],
  dims: [14.0, 15.7],
  cap2: [13.7, 15.8],
  cut: 16.5,                             // hard cut into the weather close-up
  leaves: 16.75,
  rain: [18.2, 20.4],
  cap3: [17.1, 19.9],
  lift3: [20.6, 21.5],                   // cover flies off, clear water – no text
  wipe: [23.6, 24.0],
  end: 24.0,
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
const deg = THREE.MathUtils.degToRad;

// Catmull-Rom through keyframes of plain-number objects (non-uniform tangents).
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
      const d1 = k2[0] - k1[0];
      const m1 = k1 === k0 ? 0 : ((p2 - p0) / (k2[0] - k0[0])) * d1;
      const m2 = k3 === k2 ? 0 : ((p3 - p1) / (k3[0] - k1[0])) * d1;
      const u2 = u * u, u3 = u2 * u;
      out[key] = (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
    }
    return out;
  };
}

// Camera: two shots with a hard cut between them. Distances are interpolated in log
// space (ld = ln dist) so the crane from macro to wide stays even. ap = DOF aperture.
const K = (az, el, d, tx, ty, tz, hfov = 34, ap = 0, sy = 0) => ({ az, el, ld: Math.log(d), tx, ty, tz, hfov, ap, sy });
const shotA = track([
  [0.0,  K(84, 12, 0.72, 0.30, 0.645, 0.30, 26, 34)],
  [1.8,  K(66, 14, 0.6, 0.34, 0.645, 0.332, 26, 34)],
  [3.3,  K(48, 16, 0.56, 0.34, 0.645, 0.332, 26, 30)],
  [4.0,  K(38, 34, 1.6, 0.18, 0.6, 0.18, 30, 4)],
  [5.0,  K(26, 22, 4.0, 0.0, 0.42, 0.0, 34, 0, -60)],
  [6.7,  K(-4, 11, 2.7, 0.36, 0.42, 0.0, 34, 0, -40)],
  [8.6,  K(2, 13, 2.55, 0.30, 0.46, 0.0, 34, 0, -40)],
  [9.8,  K(0, 15, 3.3, 0.18, 0.78, 0.0, 34, 0, -20)],
  [11.8, K(6, 16, 3.2, 0.14, 0.62, 0.0, 34, 0, -30)],
  [13.5, K(30, 24, 4.5, 0.0, 0.92, 0.0, 34, 0, -40)],
  [16.5, K(46, 22, 4.25, 0.0, 0.86, 0.0, 34, 0, -40)],
]);
const shotB = track([
  [16.5, K(-24, 33, 2.35, 0.04, 0.62, 0.08, 34, 18, 70)],
  [18.2, K(-32, 37, 2.45, 0.03, 0.62, 0.06, 34, 15, 70)],
  [20.4, K(-38, 42, 2.5, 0.0, 0.6, 0.04, 34, 8, 40)],
  [21.7, K(-36, 86, 2.2, 0.0, 0.47, 0.0, 34, 0)],
  [24.2, K(-30, 88, 1.6, 0.0, 0.47, 0.0, 34, 0)],
]);
const cam = t => {
  const c = t < T.cut ? shotA(t) : shotB(t);
  // a slight punch-in that settles after the cut
  const punch = t >= T.cut ? 1 - 0.06 * (1 - E.out(prog(t, T.cut, T.cut + 0.6))) : 1;
  return { az: c.az, el: c.el, dist: Math.exp(c.ld) * punch, tx: c.tx, ty: c.ty, tz: c.tz, hfov: c.hfov, sy: c.sy, ap: Math.max(0, c.ap) };
};

// DOM setup -------------------------------------------------------------------------------
$('#coverImg').src = PLATES + '/cover_34.png';
$('#dropImg').src = PLATES + '/drop_34.png';
// End card: the two covers as a staggered pair, labels beside them
const EC = { S: { x: 420, y: 560, w: 680 }, D: { x: 680, y: 830, w: 620 } };
Object.assign($('#ecS').style, { left: EC.S.x + 'px', top: EC.S.y + 'px', width: EC.S.w + 'px' });
Object.assign($('#ecD').style, { left: EC.D.x + 'px', top: EC.D.y + 'px', width: EC.D.w + 'px' });
Object.assign($('#elS').style, { left: '72px', top: '300px' });
Object.assign($('#elD').style, { right: '72px', top: '960px' });

const canvas = $('#gl');
canvas.width = W; canvas.height = H;
const world = new World(canvas, W, H);
world.dof.maxBlur = 16;
// a slightly deeper grey for the pool reads more like the real PVC under studio light
world.poolS.color.set('#cbd2d8');
world.poolS.envMapIntensity = 0.34;

// Film grain: a few fixed noise tiles, one per frame
const grain = $('#grain'); grain.width = W / 2; grain.height = H / 2;
const gctx = grain.getContext('2d');
const grainTiles = Array.from({ length: 6 }, (_, k) => {
  const r = rng(100 + k); const img = gctx.createImageData(W / 2, H / 2);
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - 0.5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  return img;
});

// SVG overlay
const SVGNS = 'http://www.w3.org/2000/svg';
const svg = $('#ov');
const labels = $('#labels');
function svgEl(tag, attrs) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; }

// Callouts on the section (world anchors on the cut plane z = 0)
const CALLOUTS = [
  { at: [0.30, DIM.coverRest + 0.105, 0], dx: -60, dy: -300, t: 'Isolierendes Luftpolster', delay: 0.0, side: 'right' },
  { at: [0.62, DIM.coverRest + coverTop(0.62, 0) - 0.003, 0], dx: 30, dy: -170, t: 'Wetterfestes PVC', delay: 0.25, side: 'left' },
];
for (const c of CALLOUTS) {
  c.line = svgEl('polyline', { fill: 'none', stroke: '#8fe3ff', 'stroke-width': 3 });
  c.dot = svgEl('circle', { r: 10, fill: '#ffffff', stroke: '#8fe3ff', 'stroke-width': 4 });
  c.ring = svgEl('circle', { r: 10, fill: 'none', stroke: '#8fe3ff', 'stroke-width': 2 });
  c.el = document.createElement('div'); c.el.className = 'clab';
  c.el.innerHTML = `<span class="t">${c.t}</span>`;
  labels.appendChild(c.el);
}
const DIMS = {
  d: { line: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }), t1: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }), t2: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }) },
  h: { line: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }), t1: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }), t2: svgEl('line', { stroke: '#ffffff', 'stroke-width': 3 }) },
};
const dimLabD = document.createElement('div'); dimLabD.className = 'dimlab'; dimLabD.textContent = 'Ø 162 cm'; labels.appendChild(dimLabD);
const dimLabH = document.createElement('div'); dimLabH.className = 'dimlab'; dimLabH.textContent = '20 cm'; labels.appendChild(dimLabH);
const laser = svgEl('polygon', { fill: 'rgba(143,227,255,.06)', stroke: '#c9f3ff', 'stroke-width': 3 });

// Text animation --------------------------------------------------------------------------
function stackAnim(root, t, [a, b]) {
  const on = t >= a - 0.05 && t <= b + 0.05;
  root.style.visibility = on ? 'visible' : 'hidden';
  if (!on) return;
  const out = E.inOut(prog(t, b - 0.35, b));
  root.style.transform = `translateY(${-40 * out}px)`;
  root.style.opacity = 1 - out;
  $$('.blk', root).forEach((blk, i) => {
    const k = E.out5(prog(t, a + 0.06 + i * 0.12, a + 0.5 + i * 0.12));
    blk.style.clipPath = `inset(0 ${(1 - k) * 100}% 0 0)`;
    $$('.ln > span', blk).forEach((s, j) => {
      const kk = E.out(prog(t, a + 0.14 + i * 0.12 + j * 0.06, a + 0.62 + i * 0.12 + j * 0.06));
      s.style.transform = `translateY(${(1 - kk) * 105}%)`;
    });
  });
}
function vis(el, o) { el.style.opacity = o; el.style.visibility = o > 0.001 ? 'visible' : 'hidden'; }

// State per frame -------------------------------------------------------------------------
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

function coverState(t) {
  let lift = 0, rx = 0, ry = 0, sq = 1;
  const land = (tl) => { const k = prog(t, tl, tl + 0.45); return k > 0 && k < 1 ? 1 - 0.07 * Math.sin(Math.PI * k) * (1 - k) * 2 : 1; };
  // heat demo: lift high (the vertical frame has room for it) and drop back
  const l1 = E.inOut(prog(t, ...T.lift1)), d1 = E.in(prog(t, ...T.drop1));
  if (t < T.lift2[0]) lift = 0.8 * l1 * (1 - d1);
  sq *= land(T.drop1[1]);
  // product hover
  const l2 = E.inOut(prog(t, ...T.lift2)), d2 = E.inOut(prog(t, ...T.drop2));
  if (t >= T.lift2[0] && t < T.lift3[0]) {
    const hov = prog(t, T.lift2[0], T.drop2[1]);
    lift = 1.12 * l2 * (1 - d2) + Math.sin(hov * Math.PI * 2) * 0.025 * l2 * (1 - d2);
    rx = deg(17) * l2 * (1 - d2);
    ry = deg(25 + 16 * hov) * l2 * (1 - d2);
    sq *= land(T.drop2[1]);
  }
  // cover flies up and away
  const l3 = E.in(prog(t, ...T.lift3));
  if (t >= T.lift3[0]) { lift = 2.8 * l3; rx = deg(-22) * l3; ry = deg(18) * l3; }
  return { lift, rx, ry, sq };
}

function cutPos(t) {
  const o = E.inOut(prog(t, ...T.cutOpen)), c = E.inOut(prog(t, ...T.cutClose));
  return 1.2 - 1.2 * o + 1.2 * c;
}
const openness = t => Math.min(prog(t, T.lift1[0] + 0.1, T.lift1[1] - 0.15), 1 - prog(t, T.drop1[0] + 0.1, T.drop1[1] - 0.1));

function updateHeat(t) {
  const ps = world.particles; const N = ps.N;
  const fade = win(t, [T.cutOpen[1] - 0.3, T.cutClose[0] + 0.2], 0.5, 0.5);
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
      if (life < 0.55) {
        const k = life / 0.55;
        y = DIM.floor + 0.04 + (yW - DIM.floor - 0.04) * k;
        x += Math.sin(k * 6 + seed * 20) * 0.02;
      } else {
        const k = (life - 0.55) / 0.45;
        const yUp = yW + k * 1.9, xUp = x * (1 + k * 0.5) + Math.sin(k * 5 + seed * 9) * 0.07;
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
  const gf = win(t, [T.lift3[1] - 0.2, T.end + 0.4], 0.6, 0.1);
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
  for (const a of ['position', 'color', 'size']) ps.geo.attributes[a].needsUpdate = true;
}

// Dust in the light: fixed in the world (it must not swim with the camera)
function updateDust(t) {
  const ds = world.dust;
  const kMacro = 1 - prog(t, T.scanIn[0] - 0.6, T.scanIn[0]);
  const kWeather = win(t, [T.cut, T.lift3[1]], 0.3, 0.6);
  ds.points.visible = kMacro + kWeather > 0.001;
  const R = rng(9);
  for (let i = 0; i < ds.N; i++) {
    const a = R(), b = R(), c = R(), ph = R() * 6.28, sz = R(), grp = i < 90 ? 0 : 1;
    // macro cloud around the valve, weather cloud around the cover
    const ctr = grp === 0 ? [0.22, 0.74, 0.24] : [0.0, 0.95, 0.1];
    const ext = grp === 0 ? [0.7, 0.32, 0.7] : [2.2, 1.0, 2.2];
    const k = grp === 0 ? kMacro : kWeather;
    const x = ctr[0] + (a - 0.5) * ext[0] + Math.sin(t * 0.35 + ph) * 0.02;
    const y = ctr[1] + (b - 0.5) * ext[1] + ((t * 0.012 + c) % 1 - 0.5) * 0.06;
    const z = ctr[2] + (c - 0.5) * ext[2] + Math.cos(t * 0.3 + ph) * 0.02;
    const tw = 0.6 + 0.4 * Math.sin(t * (0.8 + sz) + ph);
    const br = k * tw * (0.05 + 0.08 * sz);
    ds.pos[i * 3] = x; ds.pos[i * 3 + 1] = y; ds.pos[i * 3 + 2] = z;
    ds.col[i * 3] = br; ds.col[i * 3 + 1] = br * 0.97; ds.col[i * 3 + 2] = br * 0.9;
    ds.size[i] = (grp === 0 ? 0.006 : 0.012) + sz * (grp === 0 ? 0.012 : 0.02);
  }
  for (const a of ['position', 'color', 'size']) ds.geo.attributes[a].needsUpdate = true;
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
  const M = new THREE.Matrix4(), S = new THREE.Vector3(), Pp = new THREE.Vector3();
  const qDrop = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0.1));
  const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  const hits = [];
  world.drops.forEach((d, i) => {
    const per = 3.6 / d.v;
    const rel = (t - T.rain[0]) / per + d.t0;
    const cyc = Math.floor(rel), loc = rel - cyc;
    const start = T.rain[0] + (cyc - d.t0) * per;
    const live = start >= T.rain[0] - 1e-6 && start <= T.rain[1] - 0.4;
    const rho = Math.hypot(d.x, d.z);
    const surf = rho < DIM.coverR - 0.02 ? DIM.coverRest + coverTop(d.x, d.z) : rho < DIM.rOut ? DIM.rimY + DIM.rimRy * 0.9 : 0;
    const y = 3.2 - loc * per * d.v;
    if (on && live && y > surf) { Pp.set(d.x + (y - surf) * 0.1, y + 0.08, d.z); S.set(1, 1, 1); M.compose(Pp, qDrop, S); }
    else M.makeScale(0, 0, 0);
    world.rain.setMatrixAt(i, M);
    const age = (t - (start + (3.2 - surf) / d.v)) / 0.38;
    if (live && age >= 0 && age < 1) {
      const r = 0.012 + age * 0.07;
      Pp.set(d.x, surf + 0.004, d.z); S.set(r, r, r); M.compose(Pp, qFlat, S);
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

// Look: studio -> x-ray (line runs down) -> studio (line runs up). Returns the x-ray share.
function setLook(t) {
  const a = prog(t, ...T.scanIn), b = prog(t, ...T.scanOut);
  const rp = world.renderPass;
  let line = -1, xr;
  if (a <= 0) { rp.split = null; rp.mode = 'solid'; xr = 0; }
  else if (a < 1) { const y = E.inOut(a); rp.split = { y, top: 'xray', bottom: 'solid' }; line = y; xr = y; }
  else if (b <= 0) { rp.split = null; rp.mode = 'xray'; xr = 1; }
  else if (b < 1) { const y = 1 - E.inOut(b); rp.split = { y, top: 'xray', bottom: 'solid' }; line = y; xr = y; }
  else { rp.split = null; rp.mode = 'solid'; xr = 0; }
  vis($('#scanLine'), line >= 0 ? 1 : 0);
  $('#scanLine').style.top = line * H - 1 + 'px';
  return xr;
}

// Key light: low and grazing during the macro so the highlight sweeps over the tubes,
// then back to the studio position.
const KEY_HOME = new THREE.Vector3(-2.5, 4.5, 2.2);
function updateLights(t) {
  const sw = E.sine(prog(t, 0, 3.6));
  const a = deg(lerp(-178, -118, sw));          // stays behind the subject: back light
  const sweep = new THREE.Vector3(3.4 * Math.cos(a), 0.95, 3.4 * Math.sin(a) + 0.6);
  const back = E.inOut(prog(t, 3.2, 5.0));
  world.key.position.copy(sweep.lerp(KEY_HOME, back));
  world.key.intensity = lerp(1.7, 1.5, back);
  world.rimLight.intensity = lerp(1.8, 1.0, back);
  world.fill.intensity = lerp(0.12, 0.25, back);
  world.coverS.sheen = lerp(0.08, 0.3, back);
  world.coverS.envMapIntensity = lerp(0.28, 0.5, back);
  return back;
}

// Seek ------------------------------------------------------------------------------------
function seek(n) {
  const t = n / FPS;
  const need3D = t < T.wipe[1];

  const cs = coverState(t);
  world.cover.position.set(0, DIM.coverRest + cs.lift, 0);
  world.cover.rotation.set(cs.rx, cs.ry, 0, 'YXZ');
  world.coverInner.scale.set(1 + (1 - cs.sq) * 0.4, cs.sq, 1 + (1 - cs.sq) * 0.4);
  world.cover.updateMatrixWorld(true);

  const c = cam(t);
  world.setCamera(c);

  const d = cutPos(t);
  world.cut.constant = d;
  world.updateCaps(d, d < 1.15 && t < T.scanOut[1] ? 1 : 0);

  for (const m of [world.poolX, world.coverX]) m.uniforms.uTime.value = t;
  world.poolX.uniforms.uScanY.value = -10;
  const heat = 1 - 0.7 * E.inOut(prog(t, ...T.heatLoss)) + 0.7 * E.inOut(prog(t, ...T.heatBack));
  for (const m of [world.waterThermal, world.capWaterMat]) { m.uniforms.uTime.value = t; m.uniforms.uHeat.value = heat; }
  world.capAirMat.uniforms.uTime.value = t;
  world.capAirMat.uniforms.uPulse.value = win(t, T.cap1, 0.3, 0.6) * (0.5 + 0.5 * Math.sin(t * 6));
  world.waterThermal.uniforms.uOpacity.value = 0.2;
  world.capWaterMat.uniforms.uOpacity.value *= 0.7;
  world.waterClear.uniforms.uTime.value = t;
  world.causticMat.uniforms.uTime.value = t;
  updateHeat(t);
  updateDust(t);
  updateLeaves(t);
  const lightBack = updateLights(t);
  const nHits = updateRain(t);
  if (world.coverShaderU) {
    world.coverShaderU.uRipN.value = nHits;
    const leafPulse = world.leaves.reduce((acc, L0) => { const a = t - (T.leaves + L0.land); return acc + (a > 0 ? Math.exp(-a * 5) : 0); }, 0);
    world.coverShaderU.uShield.value = Math.min(1, 0.25 * win(t, T.rain, 0.4, 0.4) + 0.35 * leafPulse);
  }

  // look, depth of field, atmosphere, post
  const xr = setLook(t);
  const solid = xr < 0.001;
  world.dof.enabled = solid && c.ap > 0.5;
  world.dof.aperture = c.ap;
  world.dof.focus = c.dist;
  world.scene.fog.density = solid ? 0.06 : 0;
  world.bloom.strength = lerp(0.22, 0.4, xr);
  world.bloom.threshold = lerp(0.86, 0.5, xr);
  world.bloom.radius = 0.45;
  // studio exposure: darker macro, a touch lower in the weather shot so the white pool keeps its shape
  const weather = win(t, [T.cut, T.lift3[1] + 0.4], 0.01, 0.6);
  world.renderer.toneMappingExposure = lerp(lerp(0.78, 0.92, lightBack) - 0.07 * weather, 1.0, xr);
  if (need3D) world.render();

  vis($('#legend'), win(t, T.legend, 0.5, 0.4));
  vis($('#bars'), need3D ? 1 : 0);

  // ---- Title, captions, chip
  stackAnim($('#title'), t, T.title);
  stackAnim($('#cap1'), t, T.cap1);
  stackAnim($('#cap2'), t, T.cap2);
  stackAnim($('#cap3'), t, T.cap3);
  const kc = win(t, T.chipOff, 0.3, 0.3);
  vis($('#chipOff'), kc);
  $('#chipOff').style.transform = `translateY(${(1 - E.out(prog(t, T.chipOff[0], T.chipOff[0] + 0.3))) * -20}px)`;
  $('#chipOff i').style.opacity = 0.65 + 0.35 * Math.sin(t * 14);

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
    co.line.setAttribute('points', `${a.x},${a.y} ${lerp(a.x, ex, kd)},${lerp(a.y, ey, kd)}`);
    co.line.style.opacity = k;
    co.dot.setAttribute('cx', a.x); co.dot.setAttribute('cy', a.y); co.dot.style.opacity = k;
    const pr = (t * 1.2) % 1;
    co.ring.setAttribute('cx', a.x); co.ring.setAttribute('cy', a.y); co.ring.setAttribute('r', 10 + pr * 28); co.ring.style.opacity = (1 - pr) * k;
    const lab = co.el; lab.style.opacity = E.out(prog(t, T.callouts[0] + co.delay + 0.25, T.callouts[0] + co.delay + 0.6)) * k;
    const lw = lab.offsetWidth, lh = lab.offsetHeight;
    const lx = clamp(co.side === 'right' ? ex - lw + 3 : ex - 3, 40, W - 40 - lw);
    lab.style.left = lx + 'px'; lab.style.top = ey - lh + 'px';
  }

  // ---- Laser frame at the cut plane while it moves
  const moving = (t > T.cutOpen[0] && t < T.cutOpen[1] + 0.15) || (t > T.cutClose[0] - 0.05 && t < T.cutClose[1]);
  if (moving && need3D) {
    const corners = [v3(-1.25, -0.02, d), v3(1.25, -0.02, d), v3(1.25, 1.0, d), v3(-1.25, 1.0, d)].map(p => world.project(p));
    laser.setAttribute('points', corners.map(p => `${p.x},${p.y}`).join(' '));
    laser.style.display = '';
    laser.style.opacity = d > 1.15 ? 0 : 1;
  } else laser.style.display = 'none';

  // ---- Dimension lines
  const kd = win(t, T.dims, 0.5, 0.35);
  const dimOn = kd > 0.001 && need3D;
  for (const g of [DIMS.d, DIMS.h]) for (const e of Object.values(g)) e.style.display = dimOn ? '' : 'none';
  dimLabD.style.display = dimLabH.style.display = dimOn ? '' : 'none';
  if (dimOn) {
    const mw = world.coverInner.matrixWorld;
    const r = DIM.coverR, yTop = DIM.coverT + 0.07;
    const grow = E.inOut(prog(t, T.dims[0], T.dims[0] + 0.6));
    const pA = world.project(v3(-r * grow, yTop, 0).applyMatrix4(mw)), pB = world.project(v3(r * grow, yTop, 0).applyMatrix4(mw));
    const setL = (e, a, b) => { e.setAttribute('x1', a.x); e.setAttribute('y1', a.y); e.setAttribute('x2', b.x); e.setAttribute('y2', b.y); };
    setL(DIMS.d.line, pA, pB);
    const tick = p => [{ x: p.x, y: p.y - 14 }, { x: p.x, y: p.y + 14 }];
    setL(DIMS.d.t1, ...tick(pA)); setL(DIMS.d.t2, ...tick(pB));
    const hz = r + 0.1;
    const h0 = world.project(v3(hz, 0, 0).applyMatrix4(mw));
    const h1 = world.project(v3(hz, lerp(0, DIM.coverT, E.inOut(prog(t, T.dims[0] + 0.3, T.dims[0] + 0.8))), 0).applyMatrix4(mw));
    setL(DIMS.h.line, h0, h1);
    const tickH = p => [{ x: p.x - 14, y: p.y }, { x: p.x + 14, y: p.y }];
    setL(DIMS.h.t1, ...tickH(h0)); setL(DIMS.h.t2, ...tickH(h1));
    for (const g of [DIMS.d, DIMS.h]) for (const e of Object.values(g)) e.style.opacity = kd;
    dimLabD.style.left = (pA.x + pB.x) / 2 + 'px'; dimLabD.style.top = (pA.y + pB.y) / 2 - 46 + 'px';
    dimLabD.style.opacity = kd * E.out(prog(t, T.dims[0] + 0.4, T.dims[0] + 0.8));
    dimLabH.style.left = Math.min(h1.x + 82, W - 40 - dimLabH.offsetWidth / 2) + 'px'; dimLabH.style.top = (h0.y + h1.y) / 2 + 'px';
    dimLabH.style.opacity = kd * E.out(prog(t, T.dims[0] + 0.6, T.dims[0] + 1.0));
  }

  // ---- Flash on the hard cut, wipe, end card
  vis($('#flash'), 0.28 * Math.max(0, 1 - Math.abs(t - T.cut) / 0.12));
  const wp = E.inOut(prog(t, ...T.wipe));
  const wipe = $('#wipe');
  vis(wipe, wp > 0 && t < T.end + 0.02 ? 1 : 0);
  wipe.style.top = H * (1 - wp) + 'px'; wipe.style.bottom = '0px';
  const endOn = t >= T.end;
  vis($('#end'), endOn ? 1 : 0);
  if (endOn) {
    const te = t - T.end;
    [['#ecS', 0, 0], ['#ecD', 0.18, 1.7]].forEach(([id, dl, ph]) => {
      const el = $(id);
      const k = E.out5(prog(te, dl, dl + 1.2));
      const bob = Math.sin(te * 1.5 + ph) * 8;
      el.querySelector('img').style.transform = `translateY(${(1 - k) * -120 + bob}px) scale(${0.88 + 0.12 * k}) rotate(${Math.sin(te * 1.1 + ph) * 0.9}deg)`;
      el.querySelector('img').style.opacity = k;
      const sh = el.querySelector('.esh'); sh.style.opacity = k * (0.85 - bob * 0.02); sh.style.transform = `scale(${1 - bob * 0.008})`;
    });
    [['#elS', 0.5, -1], ['#elD', 0.65, 1]].forEach(([id, dl, dir]) => {
      const k = E.out(prog(te, dl, dl + 0.45)); const el = $(id);
      el.style.opacity = k; el.style.transform = `translateX(${(1 - k) * 30 * dir}px)`;
    });
    $('#endGlow').style.opacity = E.out(prog(te, 0, 1.2));
    const et = $('#endText');
    $$('.ln > span', et).forEach((sp, i) => { const k2 = E.out(prog(te, 0.7 + i * 0.12, 1.2 + i * 0.12)); sp.style.transform = `translateY(${(1 - k2) * 105}%)`; });
    const k4 = E.back(prog(te, 1.2, 1.7)); const cta = et.querySelector('.cta'); cta.style.opacity = clamp(k4); cta.style.transform = `scale(${0.9 + 0.1 * k4})`;
    vis($('#endLogo'), E.out(prog(te, 1.5, 2.0)));
  }

  gctx.putImageData(grainTiles[Math.floor(n) % grainTiles.length], 0, 0);
}

// Boot --------------------------------------------------------------------------------------
const imgs = [...document.images];
const ready = Promise.all([
  document.fonts.ready,
  ...imgs.map(i => (i.complete && i.naturalWidth ? Promise.resolve() : new Promise((res, rej) => { i.onload = res; i.onerror = () => rej(new Error('image ' + i.src)); }))),
]).then(() => { seek(Math.round(7 * FPS)); seek(Math.round(17 * FPS)); seek(0); });

window.COMP = { FPS, TOTAL, seek, ready };
const tq = params.get('t');
if (tq !== null) ready.then(() => seek(Math.round(parseFloat(tq) * FPS)));
