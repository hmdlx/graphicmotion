// Cyber Monday – Infrarotkabine 4:5. Deterministic, frame-addressed composition:
// window.COMP.seek(n) puts the stage into the exact state of output frame n.
// Footage, 3D objects and the glitch/lens pass render in one WebGL canvas,
// type and HUD sit in the DOM on top.
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const FPS = 30;
const W = 1080, H = 1350;
const SRC_FPS = 24;
const params = new URLSearchParams(location.search);
const PLATE_DIR = params.get('plates') || '../../build/cyber-monday-ir/plates';

// Edit decision list. Every entry plays one shot of the source from `from` to `to`
// (source frames) along a speed curve: keys are [seconds into the entry, speed],
// eased between keys. 1 = real time, < 1 = slow motion (interpolated plates).
const SHOTS = { A: 0, B: 29, C: 55, D: 78, E: 102, F: 126, G: 152 };   // first source frame per shot
const EDIT = [
  { shot: 'A', from: 0,   to: 28,  speed: [[0, 0.35], [1.45, 0.35], [1.85, 1.6]] },  // Totale: Slow-Mo, dann Ramp in den Reißschwenk
  { shot: 'B', from: 29,  to: 54,  speed: [[0, 1.6], [0.18, 1.6], [0.42, 0.34]] },   // LED-Leiste: Ramp in Slow-Mo
  { shot: 'C', from: 55,  to: 77,  speed: [[0, 0.8]] },                              // Seitenwand
  { shot: 'D', from: 78,  to: 101, speed: [[0, 1.45]] },                             // Holzstruktur
  { shot: 'E', from: 102, to: 125, speed: [[0, 0.5]] },                              // Liegefläche: Slow-Mo
  { shot: 'F', from: 126, to: 151, speed: [[0, 0.9]] },                              // LED-Ecke
  { shot: 'G', from: 152, to: 208, speed: [[0, 0.62]], hold: 0.6 },                  // Logo-Wand: Slow-Mo + Endcard
];

// ------------------------------------------------------------------ helpers
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, start, dur) => clamp((t - start) / dur);
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = k => k * k * (3 - 2 * k);
const E = {
  outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
  outCubic: k => 1 - Math.pow(1 - k, 3),
  inCubic: k => k * k * k,
  inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outBack: k => { const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
};
const rad = d => (d * Math.PI) / 180;
// Stage px -> world units on the z = 0 plane (camera fov 30°, z = 12).
const PX = H / (2 * 12 * Math.tan(rad(15)));
const wx = px => (px - W / 2) / PX;
const wy = py => (H / 2 - py) / PX;
function rng(seed) { // mulberry32, deterministic particles
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// --------------------------------------------------------------- timeline
// Integrate the speed curves once: FR[n] = { shot, src, seg, t0 } for every output frame.
function speedAt(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], sstep((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  }
  return keys[keys.length - 1][1];
}
const FR = [];
const SEG = [];       // per edit entry: { start, end } in output seconds
let clock = 0;        // "world" clock in source seconds: particles slow down with the footage
for (const [i, e] of EDIT.entries()) {
  const startN = FR.length;
  let src = e.from, k = 0;
  while (src <= e.to + 1e-6) {
    FR.push({ shot: e.shot, src, seg: i, clock });
    const sp = speedAt(e.speed, k / FPS);
    src += (sp * SRC_FPS) / FPS; clock += sp / FPS; k++;
  }
  for (let h = 0; h < Math.round((e.hold || 0) * FPS); h++) FR.push({ shot: e.shot, src: e.to, seg: i, clock: (clock += 0.2 / FPS) });
  SEG.push({ start: startN / FPS, end: FR.length / FPS, cut: startN });
}
const TOTAL = FR.length;
const S = Object.fromEntries(EDIT.map((e, i) => [e.shot, SEG[i]]));   // S.B.start etc.
const CUTS = SEG.slice(1).map(s => s.cut);

// Graphics timeline (output seconds), anchored to the edit.
const T = {
  title: [0.12, S.A.end - 0.42],
  hookTag: [0.62, S.A.end - 0.4],
  logo: S.B.start + 0.1,
  deal1: [S.B.start + 0.04, S.C.start - 0.3],
  deal2: [S.C.start + 0.02, S.E.start - 0.3],
  well: [S.E.start + 0.4, S.F.start - 0.14],
  scan: [S.E.start + 0.02, 1.0],
  date: [S.F.start + 0.04, S.G.start - 0.28],
  end: S.G.start,
};

// ------------------------------------------------------------------ WebGL
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.localClippingEnabled = true;

// Footage plane: punch-in zoom, directional motion blur, light-scan sweep.
const footMat = new THREE.ShaderMaterial({
  uniforms: {
    tA: { value: null }, zoom: { value: 1 }, center: { value: new THREE.Vector2(0.5, 0.5) },
    offs: { value: new THREE.Vector2() }, blur: { value: new THREE.Vector2() }, dim: { value: 1 },
    scanY: { value: -1 }, aspect: { value: W / H }, veil: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `
    uniform sampler2D tA; uniform float zoom, dim, scanY, aspect, veil; uniform vec2 center, offs, blur;
    varying vec2 vUv;
    vec3 samp(vec2 uv) { return texture2D(tA, clamp(uv, vec2(.0005), vec2(.9995))).rgb; }
    void main() {
      vec2 uv = (vUv - center) / zoom + center + offs;
      vec3 c = vec3(0.);
      for (int i = 0; i < 9; i++) c += samp(uv + blur * (float(i) / 8. - .5));
      c /= 9.;
      if (scanY > -0.5) {
        // Laser scan: thin bright line, faint measuring grid in the already-scanned part.
        float y = 1. - vUv.y, d = y - scanY;
        float line = exp(-abs(d) * 900.) * 1.6 + exp(-abs(d) * 60.) * .18;
        vec2 g = abs(fract(vec2(vUv.x * aspect, vUv.y) * 18.) - .5);
        float grid = (1. - smoothstep(.0, .035, min(g.x, g.y))) * .07 * step(d, 0.) * smoothstep(-.35, 0., d);
        c += vec3(.86, .92, 1.) * (line + grid);
      }
      // End-card veil: navy gradient over the footage (linear-light values of the CI navy).
      vec3 navy = mix(vec3(.0016, .0065, .014), vec3(.0048, .016, .034), smoothstep(1., .3, vUv.y));
      c = mix(c * dim, navy, veil * mix(.9, .97, smoothstep(.55, 0., vUv.y)));
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const bgScene = new THREE.Scene();
const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), footMat));

// 3D scene
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
cam.position.set(0, 0, 12);
// Studio environment for the chrome: navy dome with a few softbox strips, so the
// metal reads as crisp white highlights over deep navy reflections.
function studioEnv() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x07121e, side: THREE.BackSide })));
  const box = (w, h, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  box(14, 3, 0, 9, 4, 3.2);       // top softbox
  box(2, 12, -9, 1, 5, 2.4);      // left strip
  box(2, 12, 9, 0, 3, 1.6);       // right strip
  box(10, 1.2, 0, -6, 8, 1.2);    // low kicker
  box(34, 7, 0, 5, 13, 1.45);     // big front softbox (what the faces see)
  box(34, 1.6, 0, -3, 13, 0.9);   // front low strip -> second highlight band
  box(3, 10, -12, 2, 9, 1.4);     // front-left / front-right wings for turned faces
  box(3, 10, 12, 2, 9, 1.4);
  return env;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(studioEnv(), 0.02).texture;
scene.environmentIntensity = 1.0;
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 8); scene.add(key);
scene.add(new THREE.AmbientLight(0x1c3a54, 0.6));

// Post: bloom on lights and chrome, then lens/glitch pass.
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(bgScene, bgCam));
const pass3d = new RenderPass(scene, cam);
pass3d.clear = false;
composer.addPass(pass3d);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.3, 0.45, 0.9);
composer.addPass(bloom);
const glitch = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, amt: { value: 0 }, seed: { value: 0 }, chroma: { value: 1.6 },
    scan: { value: 0.045 }, vig: { value: 0.55 }, grain: { value: 0.004 }, res: { value: new THREE.Vector2(W, H) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float amt, seed, chroma, scan, vig, grain; uniform vec2 res;
    varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      // Slice displacement: random horizontal bands jump sideways while amt > 0.
      float rows = 14. + floor(h(vec2(seed, .37)) * 38.);
      float band = floor(uv.y * rows);
      if (h(vec2(band, seed)) < amt * .5) uv.x += (h(vec2(band, seed + 1.7)) - .5) * .14 * amt;
      vec2 d = uv - .5;
      float s = (chroma * (.25 + length(d) * 1.6) + amt * 16.) / res.x;
      vec3 c = vec3(texture2D(tDiffuse, uv + vec2(s, 0.)).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - vec2(s, 0.)).b);
      // A bright tear line now and then during glitches.
      float tear = step(.985 - amt * .02, h(vec2(floor(uv.y * 90.), seed + 4.))) * amt;
      c += tear * .35;
      c *= 1. - scan * (.5 + .5 * sin(gl_FragCoord.y * 1.5708));
      c *= mix(1., smoothstep(1.05, .32, length(d * vec2(1., 1.12))), vig);
      c += (h(gl_FragCoord.xy + seed * 13.1) - .5) * grain;
      gl_FragColor = vec4(c, 1.);
    }`,
});
composer.addPass(glitch);
composer.addPass(new OutputPass());

// ------------------------------------------------------------- 3D builders
const chrome = () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.17, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.5 });
const navyMetal = () => new THREE.MeshStandardMaterial({ color: 0x2a5378, metalness: 0.9, roughness: 0.28, envMapIntensity: 1.3 });
let FONT = null;

// A "holo" object: chrome solid that prints in bottom-up behind a scan line,
// with its wire edges visible ahead of the print.
function holo(parts) {
  const group = new THREE.Group();
  const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const local = { y: 0 };
  const solids = [], edges = [];
  const box = new THREE.Box3();
  let prevMaxX = 0;
  for (const p of parts) {
    const g = new TextGeometry(p.text, {
      font: FONT, size: p.size, depth: p.size * (p.depth ?? 0.32), curveSegments: 12,
      bevelEnabled: true, bevelThickness: p.size * 0.035, bevelSize: p.size * 0.02, bevelSegments: 5,
    });
    const face = chrome(), side = navyMetal();
    face.clippingPlanes = side.clippingPlanes = [clip];
    const m = new THREE.Mesh(g, [face, side]);
    g.computeBoundingBox();
    // `after`: start right of the previous part, gap in units of this part's size.
    const x = p.after != null ? prevMaxX + p.after * p.size - g.boundingBox.min.x : p.x || 0;
    m.position.set(x, p.y || 0, 0);
    prevMaxX = x + g.boundingBox.max.x;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 28), new THREE.LineBasicMaterial({ color: 0xdfeaff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    e.position.copy(m.position);
    group.add(m, e); solids.push(m); edges.push(e);
    box.union(g.boundingBox.clone().translate(m.position));
  }
  // Centre the whole object on its pivot.
  const c = box.getCenter(new THREE.Vector3());
  for (const o of group.children) o.position.sub(new THREE.Vector3(c.x, c.y, box.min.z + (box.max.z - box.min.z) / 2));
  const size = box.getSize(new THREE.Vector3());
  scene.add(group);
  return {
    group, size,
    // p: 0 → nothing, 1 → fully printed. wire: edge opacity.
    set(p, wire, visible = true) {
      group.visible = visible && (p > 0 || wire > 0);
      group.updateMatrixWorld(true);
      const y = lerp(-size.y * 0.62, size.y * 0.62, p);
      // Plane keeps everything below the scan height (in the object's own frame).
      const n = new THREE.Vector3(0, -1, 0).transformDirection(group.matrixWorld);
      const pt = new THREE.Vector3(0, y, 0).applyMatrix4(group.matrixWorld);
      clip.setFromNormalAndCoplanarPoint(n, pt);
      for (const e of edges) e.material.opacity = wire;
      local.y = y;
    },
  };
}

// Text group sized so its width is `px` stage pixels.
function fitWidth(h, px) { const s = px / PX / h.size.x; h.group.scale.setScalar(s); return s; }

// Holographic ring stack: thin torus, dashed ring, tick ring.
function rings(radius) {
  const g = new THREE.Group();
  const mat = o => new THREE.MeshBasicMaterial({ color: 0xdfeaff, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const lmat = o => new THREE.LineBasicMaterial({ color: 0xdfeaff, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false });
  const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.012, 8, 160), mat(0.7));
  const dashPts = [];
  for (let i = 0; i < 96; i++) {
    if (i % 4 === 3) continue;
    const a0 = (i / 96) * Math.PI * 2, a1 = ((i + 0.6) / 96) * Math.PI * 2, r = radius * 1.12;
    dashPts.push(new THREE.Vector3(Math.cos(a0) * r, Math.sin(a0) * r, 0), new THREE.Vector3(Math.cos(a1) * r, Math.sin(a1) * r, 0));
  }
  const dash = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(dashPts), lmat(0.55));
  const tickPts = [];
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2, r0 = radius * 0.86, r1 = radius * (i % 10 === 0 ? 0.8 : 0.83);
    tickPts.push(new THREE.Vector3(Math.cos(a) * r0, Math.sin(a) * r0, 0), new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, 0));
  }
  const ticks = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPts), lmat(0.4));
  g.add(torus, dash, ticks);
  scene.add(g);
  const base = [0.7, 0.55, 0.4];
  return {
    group: g, torus, dash, ticks,
    set(o) { g.visible = o > 0.001; [torus, dash, ticks].forEach((m, i) => { m.material.opacity = base[i] * o; }); },
  };
}

// Perspective floor grid (fades with distance, kept off the cabinet).
const gridMat = new THREE.ShaderMaterial({
  uniforms: { o: { value: 0 }, shift: { value: 0 }, hole: { value: new THREE.Vector2(555, 190) } },
  vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
  fragmentShader: `
    uniform float o, shift; uniform vec2 hole; varying vec3 vW;
    void main() {
      vec2 p = vec2(vW.x, vW.z + shift) * 1.25;
      vec2 g = abs(fract(p) - .5) / fwidth(p);
      float line = 1. - min(min(g.x, g.y), 1.);
      float fade = smoothstep(-26., -4., vW.z) * (1. - smoothstep(4., 9., vW.z));
      float holeM = smoothstep(hole.y * .6, hole.y, abs(gl_FragCoord.x - hole.x));
      gl_FragColor = vec4(vec3(.82, .9, 1.), line * fade * holeM * o * .32);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, extensions: { derivatives: true },
});
const grid = new THREE.Mesh(new THREE.PlaneGeometry(60, 60, 1, 1), gridMat);
grid.rotation.x = -Math.PI / 2;
grid.position.set(0, -2.15, -8);
scene.add(grid);

// Drifting light particles. Driven by the world clock, so they slow down with the slow-mo.
const PCOUNT = 240;
const pRand = rng(20261130);
const pBase = new Float32Array(PCOUNT * 3), pSize = new Float32Array(PCOUNT), pPhase = new Float32Array(PCOUNT);
for (let i = 0; i < PCOUNT; i++) {
  pBase.set([lerp(-7, 7, pRand()), lerp(-6, 6, pRand()), lerp(-8, 4, pRand())], i * 3);
  pSize[i] = lerp(2, 7, Math.pow(pRand(), 2.2)); pPhase[i] = pRand() * 10;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PCOUNT * 3), 3));
pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
const pMat = new THREE.ShaderMaterial({
  uniforms: { o: { value: 1 } },
  vertexShader: 'attribute float size; varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); vD = -mv.z; gl_PointSize = size * 12. / vD; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform float o; varying float vD; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., d); a *= a; gl_FragColor = vec4(vec3(.85, .92, 1.), a * o * .55 * smoothstep(22., 9., vD)); }',
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
const particles = new THREE.Points(pGeo, pMat);
scene.add(particles);
function updateParticles(clk) {
  const pos = pGeo.attributes.position.array;
  for (let i = 0; i < PCOUNT; i++) {
    const ph = pPhase[i];
    pos[i * 3] = pBase[i * 3] + Math.sin(clk * 0.6 + ph) * 0.25;
    pos[i * 3 + 1] = ((pBase[i * 3 + 1] + clk * (0.35 + (ph % 1) * 0.4) + 6) % 12) - 6;
    pos[i * 3 + 2] = pBase[i * 3 + 2];
  }
  pGeo.attributes.position.needsUpdate = true;
}

// ------------------------------------------------------------- DOM motion
const show = (node, on) => { node.style.visibility = on ? 'visible' : 'hidden'; };
const BLEED = 80;
function wipe(el, t, tin, tout, din = 0.5, dout = 0.32) {
  const a = E.outExpo(prog(t, tin, din));
  const b = tout == null ? 0 : E.inExpo(prog(t, tout, dout));
  if (a <= 0 || b >= 1) { show(el, false); return; }
  const w = el.offsetWidth + BLEED;
  show(el, true);
  el.style.clipPath = `inset(-${BLEED}px ${(1 - a) * w - BLEED}px -${BLEED}px ${b * w - BLEED}px)`;
}
function rise(span, t, tin, dur = 0.6) {
  const k = E.outExpo(prog(t, tin, dur));
  span.style.transform = `translateY(${(1 - k) * 108}%)`;
}
function stack(root, t, tin, tout, { gap = 0.08, outGap = 0.04 } = {}) {
  $$(':scope > .blk', root).forEach((blk, i) => {
    const bi = tin + i * gap;
    wipe(blk, t, bi, tout == null ? null : tout + i * outGap);
    $$('.ln > span', blk).forEach((s, j) => rise(s, t, bi + 0.1 + j * 0.05));
  });
}
const flick = (t, tin) => (t < tin ? 0 : t > tin + 0.22 ? 1 : [0, 1, 0.3, 1, 0.6, 1][Math.floor((t - tin) / 0.037)] ?? 1);

const el = {
  logo: $('#logo'), hookTag: $('#hook-tag'), deal1: $('#deal1'), deal2: $('#deal2'), well: $('#well'),
  date: $('#date'), end: $('#end'), cta: $('#cta'), btn: $('#cta .btn'), url: $('#cta .url i'), fine: $('#fine'),
  hud: $('#hud'), corners: $$('#hud .corner'), micro: $$('#hud .micro'), tc: $('#tc'), rec: $('#rec'),
  reticle: $('#reticle'), rbox: $('#reticle .box'), rlbl: $('#reticle .lbl'), flash: $('#flash'),
};

// ------------------------------------------------------------- plates
let MANIFEST = null;
const cache = new Map();
function loadImage(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('plate missing: ' + url)); im.src = url; });
  cache.set(url, p);
  if (cache.size > 24) cache.delete(cache.keys().next().value);
  return p;
}
const plateTex = new THREE.Texture();
plateTex.colorSpace = THREE.SRGBColorSpace;
plateTex.minFilter = THREE.LinearFilter; plateTex.generateMipmaps = false;
footMat.uniforms.tA.value = plateTex;
function plateUrl(shot, src) {
  const k = clamp(Math.round((src - SHOTS[shot]) * MANIFEST.interp), 0, MANIFEST.count[shot] - 1);
  return `${PLATE_DIR}/${shot}/f${String(k).padStart(4, '0')}.jpg`;
}

// ------------------------------------------------------------- objects
let O = null;
function build() {
  const title1 = holo([{ text: 'CYBER', size: 1 }]);
  const title2 = holo([{ text: 'MONDAY', size: 1 }]);
  const s2 = fitWidth(title2, 760);
  title1.group.scale.setScalar(s2);
  const deal1 = holo([{ text: '–25', size: 1 }, { text: '%', size: 0.6, after: 0.06, y: 0.29 }]);
  fitWidth(deal1, 560);
  const deal2 = holo([{ text: '–10', size: 1 }, { text: '%', size: 0.6, after: 0.06, y: 0.29 }]);
  fitWidth(deal2, 520);
  const date = holo([{ text: '30.11.', size: 1 }]);
  fitWidth(date, 520);
  const pct = holo([{ text: '%', size: 1, depth: 0.5 }]);
  fitWidth(pct, 250);
  O = { title1, title2, deal1, deal2, date, pct, ring1: rings(1.55), ring2: rings(1.45), ring3: rings(1.2), ringEnd: rings(1.0) };
}

// Standard in/out choreography for a holo object. Returns the eased in-progress.
function holoMotion(h, t, tin, tout, { from = { z: -5, ry: -70, rx: 0 }, rest = { ry: -10, rx: 6 }, drift = 14, exit = 'fly' } = {}) {
  const a = E.outExpo(prog(t, tin, 0.9));
  const pr = E.outCubic(prog(t, tin + 0.08, 0.65));
  const b = tout == null ? 0 : E.inCubic(prog(t, tout, 0.3));
  const life = tout == null ? t - tin : Math.min(t, tout) - tin;
  const g = h.group;
  g.rotation.y = rad(lerp(from.ry, rest.ry, a) + life * drift + (exit === 'spin' ? b * 120 : 0));
  g.rotation.x = rad(lerp(from.rx, rest.rx, a));
  g.position.z = lerp(from.z, 0, a) + (exit === 'fly' ? b * 9 : -b * 6);
  const wire = t < tin ? 0 : lerp(0.9, 0.12, prog(t, tin + 0.5, 0.5)) * (1 - b);
  h.set(pr, wire, t >= tin && b < 1);
  return a;
}

// ------------------------------------------------------------- seek
async function seek(n) {
  const t = n / FPS;
  const fr = FR[clamp(n, 0, TOTAL - 1)];
  const seg = SEG[fr.seg];
  const ts = t - seg.start;

  // Footage
  const img = await loadImage(plateUrl(fr.shot, fr.src));
  if (plateTex.image !== img) { plateTex.image = img; plateTex.needsUpdate = true; }
  // Punch-in on every cut, slow push inside shots.
  const punch = 1 + 0.07 * Math.pow(1 - E.outCubic(prog(ts, 0, 0.45)), 1) * (fr.seg > 0 ? 1 : 0);
  const push = 1 + 0.035 * ts;
  footMat.uniforms.zoom.value = punch * push;
  footMat.uniforms.center.value.set(0.5, 0.5);
  footMat.uniforms.offs.value.set(0, 0);
  // Speed ramp at the end of A smears vertically into the whip; B lands with a short pull.
  const whip = fr.shot === 'A' ? E.inCubic(prog(t, S.A.end - 0.35, 0.35)) : fr.shot === 'B' ? 1 - E.outCubic(prog(ts, 0, 0.2)) : 0;
  footMat.uniforms.blur.value.set(whip * 0.01, whip * 0.035);
  footMat.uniforms.dim.value = 1;
  footMat.uniforms.veil.value = fr.shot === 'G' ? E.inOutCubic(prog(t, T.end + 0.1, 0.6)) : 0;
  const sc = prog(t, T.scan[0], T.scan[1]);
  footMat.uniforms.scanY.value = sc > 0 && sc < 1 ? lerp(-0.05, 1.05, E.inOutCubic(sc)) : -1;

  // Glitch around every cut + a short burst on the 3D impacts.
  let amt = 0;
  for (const c of CUTS) amt = Math.max(amt, Math.exp(-Math.abs(n - c + 0.5) / 1.1) * 0.9);
  for (const hit of [T.deal1[0] + 0.32, T.deal2[0] + 0.3, T.date[0] + 0.3]) amt = Math.max(amt, Math.exp(-Math.abs(t - hit) * FPS / 0.9) * 0.35);
  glitch.uniforms.amt.value = amt < 0.03 ? 0 : amt;
  glitch.uniforms.seed.value = (n * 7.31) % 97;

  // ---- 3D
  updateParticles(fr.clock);
  pMat.uniforms.o.value = fr.shot === 'G' ? 1.3 : fr.shot === 'E' ? 0.6 : 1;
  gridMat.uniforms.o.value = fr.shot === 'A' ? E.outCubic(prog(t, 0.05, 0.8)) : 0;
  gridMat.uniforms.shift.value = fr.clock * 1.4;
  grid.visible = fr.shot === 'A';
  // Slow swing of the studio around the objects: highlights glide over the chrome.
  scene.environmentRotation.set(rad(Math.sin(t * 0.9) * 10), rad(Math.sin(t * 0.7) * 35), 0);

  // Title CYBER / MONDAY
  {
    const [tin, tout] = T.title;
    O.title1.group.position.set(0, wy(148), 0);
    O.title2.group.position.set(0, wy(292), 0);
    const o = { from: { z: -6, ry: -55, rx: 18 }, rest: { ry: -9, rx: 5 }, drift: 7 };
    holoMotion(O.title1, t, tin, tout, o);
    holoMotion(O.title2, t, tin + 0.12, tout + 0.04, o);
  }
  // Deal 1: –25 %
  {
    const [tin, tout] = T.deal1;
    const g = O.deal1.group;
    g.position.set(wx(720), wy(590), 0);
    holoMotion(O.deal1, t, tin, tout, { from: { z: -6, ry: -100, rx: 0 }, rest: { ry: -16, rx: 4 }, drift: 15, exit: 'spin' });
    const r = O.ring1;
    r.group.position.set(wx(720), wy(590), -1.2);
    r.group.rotation.set(rad(68), rad(-14), fr.clock * 1.2);
    r.dash.rotation.z = -fr.clock * 2.2;
    r.group.scale.setScalar(lerp(0.4, 1, E.outExpo(prog(t, tin + 0.1, 0.8))));
    r.set(t < tin ? 0 : (1 - prog(t, tout, 0.25)) * E.outCubic(prog(t, tin + 0.1, 0.4)));
  }
  // Deal 2: –10 %
  {
    const [tin, tout] = T.deal2;
    const g = O.deal2.group;
    g.position.set(wx(600), wy(560), 0);
    holoMotion(O.deal2, t, tin, tout, { from: { z: -6, ry: 20, rx: -95 }, rest: { ry: 12, rx: 5 }, drift: -12, exit: 'fly' });
    const r = O.ring2;
    r.group.position.set(wx(600), wy(560), -1.2);
    r.group.rotation.set(rad(72), rad(12), -fr.clock * 1.1);
    r.dash.rotation.z = fr.clock * 2.4;
    r.group.scale.setScalar(lerp(0.4, 1, E.outExpo(prog(t, tin + 0.1, 0.8))));
    r.set(t < tin ? 0 : (1 - prog(t, tout, 0.25)) * E.outCubic(prog(t, tin + 0.1, 0.4)));
  }
  // Date: 30.11.
  {
    const [tin, tout] = T.date;
    O.date.group.position.set(wx(700), wy(600), 0);
    holoMotion(O.date, t, tin, tout, { from: { z: -6, ry: -80, rx: 10 }, rest: { ry: -14, rx: 4 }, drift: 10, exit: 'fly' });
    const r = O.ring3;
    r.group.position.set(wx(700), wy(600), -1.4);
    r.group.rotation.set(rad(74), rad(-10), fr.clock * 1.3);
    r.dash.rotation.z = -fr.clock * 2;
    r.group.scale.setScalar(lerp(0.5, 1.25, E.outExpo(prog(t, tin + 0.1, 0.8))));
    r.set(t < tin ? 0 : (1 - prog(t, tout, 0.2)) * E.outCubic(prog(t, tin + 0.1, 0.4)));
  }
  // End card hero %
  {
    const tin = T.end + 0.2;
    O.pct.group.position.set(wx(540), wy(330), 0);
    holoMotion(O.pct, t, tin, null, { from: { z: -7, ry: -120, rx: 10 }, rest: { ry: -22, rx: 8 }, drift: 11 });
    const r = O.ringEnd;
    r.group.position.set(wx(540), wy(330), -0.6);
    r.group.rotation.set(rad(70) + Math.sin(fr.clock * 0.8) * 0.08, rad(-8), fr.clock * 1.1);
    r.dash.rotation.z = -fr.clock * 2;
    r.group.scale.setScalar(lerp(0.3, 1, E.outExpo(prog(t, tin + 0.15, 0.9))));
    r.set(t < tin ? 0 : E.outCubic(prog(t, tin + 0.15, 0.5)));
  }

  // ---- DOM
  show(el.logo, t >= T.logo);
  if (t >= T.logo) {
    const k = E.outExpo(prog(t, T.logo, 0.5));
    el.logo.style.clipPath = `inset(0 ${(1 - k) * 100}% 0 0)`;
  }
  stack(el.hookTag, t, T.hookTag[0], T.hookTag[1]);
  stack(el.deal1, t, T.deal1[0] + 0.3, T.deal1[1] - 0.04);
  stack(el.deal2, t, T.deal2[0] + 0.28, T.deal2[1] - 0.04);
  stack(el.well, t, T.well[0], T.well[1]);
  stack(el.date, t, T.date[0] + 0.22, T.date[1] - 0.04);

  // Reticle on E: locks onto the bench, drifts with the slow push.
  {
    const tin = S.E.start + 0.15, tout = S.F.start - 0.1;
    const on = t >= tin && t < tout;
    show(el.reticle, on);
    if (on) {
      const k = E.outBack(prog(t, tin, 0.45));
      const x = 690 + (t - tin) * 18, y = 640 - (t - tin) * 10;
      el.reticle.style.transform = `translate(${x}px, ${y}px)`;
      const s = lerp(1.6, 1, k), w = 230 * s, h = 170 * s;
      el.rbox.style.width = `${w}px`; el.rbox.style.height = `${h}px`;
      el.rbox.style.opacity = flick(t, tin);
      el.rlbl.style.transform = `translate(${-w / 2}px, ${h / 2 + 14}px)`;
      el.rlbl.style.opacity = flick(t, tin + 0.3);
    }
  }

  // HUD frame
  {
    const k = E.outExpo(prog(t, 0.0, 0.6));
    const inset = lerp(-30, 0, k);
    el.corners.forEach((c, i) => { c.style.transform = `translate(${(i % 2 ? -1 : 1) * inset}px, ${(i < 2 ? 1 : -1) * inset}px)`; c.style.opacity = k * (fr.shot === 'G' ? 0.55 : 1); });
    el.micro.forEach((m, i) => { m.style.opacity = flick(t, 0.25 + i * 0.12) * (fr.shot === 'G' ? 0.7 : 1); });
    const s = Math.floor(t), f = n % FPS;
    el.tc.textContent = `00:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`;
    el.rec.style.opacity = Math.floor(t * 2) % 2 ? 0.25 : 1;
    show(el.hud, true);
  }

  // Flash on the A → B ramp cut (kept subtle).
  el.flash.style.opacity = (0.32 * Math.exp(-Math.max(0, t - S.B.start) * 16) * (t >= S.B.start - 0.01 ? 1 : 0)).toFixed(3);

  // End card
  {
    const te = T.end;
    stack(el.end, t, te + 0.5, null, { gap: 0.1 });
    wipe(el.cta, t, te + 1.05, null);
    const u = E.outExpo(prog(t, te + 1.35, 0.6));
    el.url.style.transform = `scaleX(${u})`;
    const arrow = 6 * Math.sin(Math.max(0, t - te - 1.6) * 6) * (t > te + 1.6 ? 1 : 0);
    el.btn.querySelector('svg').style.transform = `translateX(${arrow}px)`;
    wipe(el.fine, t, te + 1.4, null);
    $$('.ln > span', el.fine).forEach(s => rise(s, t, te + 1.48));
  }

  composer.render();
}

// ------------------------------------------------------------- boot
const ready = (async () => {
  const [font, man] = await Promise.all([
    fetch('../../assets/fonts/poppins/poppins-800.typeface.json').then(r => r.json()),
    fetch(`${PLATE_DIR}/plates.json`).then(r => r.json()),
  ]);
  FONT = new FontLoader().parse(font);
  MANIFEST = man;
  await document.fonts.ready;
  build();
  renderer.compile(scene, cam);
})();

window.COMP = { FPS, TOTAL, W, H, ready, seek: async n => { await ready; await seek(n); }, S, T };
if (params.has('t')) ready.then(() => seek(Math.round(parseFloat(params.get('t')) * FPS)));
