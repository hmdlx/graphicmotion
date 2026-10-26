// Cyber Monday – Infrarotkabine 4:5, apple.com-Haltung in Home-Deluxe-CI.
// Deterministic, frame-addressed composition: window.COMP.seek(n) puts the stage
// into the exact state of output frame n. Footage, navy cards and the 3D numbers
// render in one WebGL canvas, type sits in the DOM on top.
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

// Edit decision list. Footage entries play a shot from `from` to `to` (source frames)
// along a speed curve ([seconds into the entry, speed], eased between keys; < 1 is
// slow motion from the interpolated plates). Card entries are navy product cards
// with a 3D number. Neighbouring entries cross-dissolve over XF seconds.
const SHOTS = { A: 0, B: 29, C: 55, D: 78, E: 102, F: 126, G: 152 };   // first source frame per shot
const XF = 0.45;
const EDIT = [
  { id: 'intro', shot: 'A', from: 0, to: 18, speed: [[0, 0.3]] },                    // Totale, Slow-Mo
  { id: 'card1', card: true, dur: 2.7 },                                              // –25 %
  { id: 'led', shot: 'B', from: 33, to: 54, speed: [[0, 0.38]] },                     // LED-Leiste, Slow-Mo
  { id: 'card2', card: true, dur: 2.7 },                                              // –10 %
  { id: 'wood', shot: 'E', from: 102, to: 125, speed: [[0, 0.45]] },                  // Liegefläche, Slow-Mo
  { id: 'end', shot: 'G', from: 152, to: 208, speed: [[0, 1], [0.7, 0.42]], hold: 0.5 }, // Logo-Wand: Echtzeit -> Slow-Mo
];

// ------------------------------------------------------------------ helpers
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, start, dur) => clamp((t - start) / dur);
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = k => k * k * (3 - 2 * k);
const E = {
  outCubic: k => 1 - Math.pow(1 - k, 3),
  inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
};
const rad = d => (d * Math.PI) / 180;
// Stage px -> world units on the z = 0 plane (camera fov 30°, z = 12).
const PX = H / (2 * 12 * Math.tan(rad(15)));
const wy = py => (H / 2 - py) / PX;

// --------------------------------------------------------------- timeline
function speedAt(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], sstep((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  }
  return keys[keys.length - 1][1];
}
// Lay the entries out back to back with XF overlap; footage entries get a per-frame
// source position table (src[k] = source frame k output frames into the entry).
let cursor = 0;
for (const e of EDIT) {
  e.start = cursor;
  if (!e.card) {
    e.src = [];
    let src = e.from, k = 0;
    while (src <= e.to + 1e-6) { e.src.push(src); src += (speedAt(e.speed, k / FPS) * SRC_FPS) / FPS; k++; }
    for (let h = 0; h < Math.round((e.hold || 0) * FPS); h++) e.src.push(e.to);
    e.dur = e.src.length / FPS;
  }
  e.end = e.start + e.dur;
  cursor = e.end - XF;
}
const TOTAL = Math.round(EDIT[EDIT.length - 1].end * FPS);
const S = Object.fromEntries(EDIT.map(e => [e.id, { start: e.start, end: e.end }]));

// Visibility of an entry at time t: dissolves in over its first XF, out under the next entry.
function vis(i, t) {
  const e = EDIT[i], next = EDIT[i + 1];
  const a = i === 0 ? 1 : sstep(prog(t, e.start, XF));
  const b = next ? sstep(prog(t, next.start, XF)) : 0;
  return t < e.start || t >= e.end ? 0 : a * (1 - b);
}

// ------------------------------------------------------------------ WebGL
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;

// Background pass: two layers (footage plate or navy card), cross-dissolve, slow push,
// end-card veil and soft shades behind captions.
const bgMat = new THREE.ShaderMaterial({
  uniforms: {
    tA: { value: null }, tB: { value: null }, kindA: { value: 0 }, kindB: { value: 0 },
    zoomA: { value: 1 }, zoomB: { value: 1 }, mixB: { value: 0 },
    veil: { value: 0 }, shade: { value: 0 }, topShade: { value: 0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: `
    uniform sampler2D tA, tB; uniform float kindA, kindB, zoomA, zoomB, mixB, veil, shade, topShade;
    varying vec2 vUv;
    // Navy studio card: soft spotlight from above onto deep navy (linear-light CI values).
    vec3 card(vec2 uv) {
      vec2 d = (uv - vec2(.5, .62)) * vec2(1., 1.25);
      float spot = exp(-dot(d, d) * 3.2);
      vec3 deep = vec3(.0009, .0030, .0068), navy = vec3(.0047, .0160, .0350), lift = vec3(.0135, .0420, .0880);
      return mix(deep, navy, smoothstep(.0, .55, spot)) + lift * pow(spot, 3.) * .9;
    }
    vec3 plate(sampler2D t, float zoom, vec2 uv) {
      return texture2D(t, clamp((uv - .5) / zoom + .5, vec2(.0005), vec2(.9995))).rgb;
    }
    void main() {
      vec3 a = kindA > .5 ? card(vUv) : plate(tA, zoomA, vUv);
      vec3 b = kindB > .5 ? card(vUv) : plate(tB, zoomB, vUv);
      vec3 c = mix(a, b, mixB);
      vec3 deep = vec3(.0012, .0045, .0100);
      c = mix(c, deep, shade * smoothstep(.36, .0, vUv.y) * .85);
      c = mix(c, deep, topShade * smoothstep(.72, 1., vUv.y) * .8);
      // End card: footage stays at the top, sinks into navy below.
      c = mix(c, deep, veil * mix(.45, .97, smoothstep(.78, .38, vUv.y)));
      gl_FragColor = vec4(c, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const bgScene = new THREE.Scene();
const bgCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat));

// 3D scene
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
cam.position.set(0, 0, 12);
// Studio for the brushed metal: navy dome, broad soft boxes (no hard sparkle).
function studioEnv() {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.MeshBasicMaterial({ color: 0x081626, side: THREE.BackSide })));
  const box = (w, h, x, y, z, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(i), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  box(30, 8, 0, 9, 6, 1.8);       // big overhead box
  box(30, 9, 0, 2, 13, 2.0);      // front fill (what the faces see)
  box(30, 2, 0, -5, 12, 0.7);     // low kicker -> soft lower highlight
  box(3, 14, -12, 1, 6, 1.3);     // left strip
  box(3, 14, 12, 1, 4, 0.8);      // right strip
  return env;
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(studioEnv(), 0.03).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(2, 6, 8); scene.add(key);

const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(1);
composer.setSize(W, H);
composer.addPass(new RenderPass(bgScene, bgCam));
const pass3d = new RenderPass(scene, cam);
pass3d.clear = false;
composer.addPass(pass3d);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.18, 0.6, 0.92));
// Lens: gentle vignette and fine grain only.
const lens = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, seed: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float seed; varying vec2 vUv;
    float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 d = vUv - .5;
      c *= mix(1., smoothstep(1.1, .4, length(d * vec2(1., 1.1))), .45);
      c += (h(gl_FragCoord.xy + seed) - .5) * .0025;
      gl_FragColor = vec4(c, 1.);
    }`,
});
composer.addPass(lens);
composer.addPass(new OutputPass());

// ------------------------------------------------------------- 3D numbers
let FONT = null;
// Brushed titanium face, deep navy anodised sides. Opacity carries the dissolves.
function number(parts) {
  const group = new THREE.Group();
  const face = new THREE.MeshPhysicalMaterial({ color: 0xe6ebf1, metalness: 1, roughness: 0.24, clearcoat: 0.6, clearcoatRoughness: 0.2, transparent: true });
  const side = new THREE.MeshStandardMaterial({ color: 0x1c3a54, metalness: 0.9, roughness: 0.35, transparent: true });
  const box = new THREE.Box3();
  let prevMaxX = 0;
  for (const p of parts) {
    const g = new TextGeometry(p.text, {
      font: FONT, size: p.size, depth: p.size * 0.28, curveSegments: 14,
      bevelEnabled: true, bevelThickness: p.size * 0.03, bevelSize: p.size * 0.018, bevelSegments: 6,
    });
    g.computeBoundingBox();
    // `after`: start right of the previous part, gap in units of this part's size.
    const x = p.after != null ? prevMaxX + p.after * p.size - g.boundingBox.min.x : 0;
    const m = new THREE.Mesh(g, [face, side]);
    m.position.set(x, p.y || 0, 0);
    prevMaxX = x + g.boundingBox.max.x;
    group.add(m);
    box.union(g.boundingBox.clone().translate(m.position));
  }
  const c = box.getCenter(new THREE.Vector3());
  for (const o of group.children) o.position.sub(c);
  const size = box.getSize(new THREE.Vector3());
  const pivot = new THREE.Group();
  pivot.add(group);
  scene.add(pivot);
  const tint = new THREE.Color(0xe6ebf1);
  return {
    pivot,
    fit(px) { group.scale.setScalar(px / PX / size.x); },
    // opacity: dissolve; light: 0 = still in the dark, 1 = fully lit.
    set(opacity, light) {
      pivot.visible = opacity > 0.002;
      face.opacity = side.opacity = opacity;
      face.depthWrite = side.depthWrite = opacity > 0.98;
      face.envMapIntensity = 1.6 * light; side.envMapIntensity = 1.2 * light;
      face.color.copy(tint).multiplyScalar(lerp(0.25, 1, light));
    },
  };
}

// Soft navy light pool under the floating number.
const glowMat = new THREE.ShaderMaterial({
  uniforms: { o: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'uniform float o; varying vec2 vUv; void main(){ vec2 d = vUv - .5; float a = exp(-dot(d, d) * 14.); gl_FragColor = vec4(vec3(.05, .12, .22), a * o); }',
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
const glow = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), glowMat);
scene.add(glow);

// ------------------------------------------------------------- DOM motion
// apple.com reveal: fade up from a few px below, out of a blur.
function reveal(node, t, tin, k = 1, { dur = 0.9, dy = 24, blur = 14 } = {}) {
  const p = E.outCubic(prog(t, tin, dur));
  const a = p * k;
  node.style.opacity = a.toFixed(3);
  node.style.transform = `translateY(${((1 - p) * dy).toFixed(2)}px)`;
  node.style.filter = p < 0.995 ? `blur(${((1 - p) * blur).toFixed(2)}px)` : 'none';
}
// Each child of a column reveals with a stagger.
function col(root, t, tin, k, gap = 0.12, opts) {
  [...root.children].forEach((c, i) => reveal(c, t, tin + i * gap, k, opts));
}

const el = {
  introLogo: $('#intro-logo'), intro: $('#intro'), introSub: $('#intro-sub'),
  card1: $('#card1'), card1Text: $('#card1-text'), date: $('#date-line'),
  card2: $('#card2'), card2Text: $('#card2-text'), well: $('#well'),
  endTitle: $('#end .hl'), endRows: $$('#end .rows div'), endCta: $('#end-cta'), endDate: $('#end-date'), endLogo: $('#end-logo'),
  link: $('#end-cta .link svg'),
};

// ------------------------------------------------------------- plates
let MANIFEST = null;
const cache = new Map();
function loadImage(url) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('plate missing: ' + url)); im.src = url; });
  cache.set(url, p);
  if (cache.size > 32) cache.delete(cache.keys().next().value);
  return p;
}
function makeTex() {
  const t = new THREE.Texture();
  t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
  return t;
}
const texA = makeTex(), texB = makeTex();
bgMat.uniforms.tA.value = texA; bgMat.uniforms.tB.value = texB;
function plateUrl(e, t) {
  const k = clamp(Math.round((t - e.start) * FPS), 0, e.src.length - 1);
  const i = clamp(Math.round((e.src[k] - SHOTS[e.shot]) * MANIFEST.interp), 0, MANIFEST.count[e.shot] - 1);
  return `${PLATE_DIR}/${e.shot}/f${String(i).padStart(4, '0')}.jpg`;
}
async function setLayer(tex, kindU, zoomU, e, t) {
  kindU.value = e.card ? 1 : 0;
  if (e.card) return;
  const img = await loadImage(plateUrl(e, t));
  if (tex.image !== img) { tex.image = img; tex.needsUpdate = true; }
  // Slow, constant push over the whole entry.
  zoomU.value = 1.02 + 0.07 * prog(t, e.start, e.dur);
}

// ------------------------------------------------------------- objects
let N1 = null, N2 = null;
function build() {
  N1 = number([{ text: '–25', size: 1 }, { text: '%', size: 0.62, after: 0.05, y: 0.3 }]);
  N1.fit(640);
  N2 = number([{ text: '–10', size: 1 }, { text: '%', size: 0.62, after: 0.05, y: 0.3 }]);
  N2.fit(620);
}

// Card choreography for a 3D number: rises out of the dark while the light comes up,
// then turns slowly on its axis like a product turntable, floating.
function cardNumber(n, e, k, t) {
  if (k <= 0.001) { n.set(0, 0); return 0; }
  const tl = t - e.start;
  const rise = E.outCubic(prog(tl, 0.1, 1.3));
  const light = E.inOutSine(prog(tl, 0.15, 1.2));
  n.pivot.position.set(0, wy(560) + lerp(-0.35, 0, rise) + Math.sin(tl * 1.3) * 0.03, lerp(-1.6, 0, rise));
  n.pivot.rotation.set(rad(lerp(14, 7, rise)), rad(lerp(-32, 20, E.inOutSine(prog(tl, 0, e.dur)))), 0);
  n.set(k, light);
  return light;
}

// ------------------------------------------------------------- seek
async function seek(n) {
  const t = n / FPS;
  // Active entries (at most two overlap during a dissolve).
  const act = EDIT.map((e, i) => i).filter(i => t >= EDIT[i].start && t < EDIT[i].end);
  if (!act.length) act.push(EDIT.length - 1);
  const ea = EDIT[act[0]], eb = act[1] != null ? EDIT[act[1]] : null;
  const u = bgMat.uniforms;
  await setLayer(texA, u.kindA, u.zoomA, ea, t);
  if (eb) await setLayer(texB, u.kindB, u.zoomB, eb, t);
  u.mixB.value = eb ? sstep(prog(t, eb.start, XF)) : 0;

  const V = Object.fromEntries(EDIT.map((e, i) => [e.id, vis(i, t)]));
  u.veil.value = E.inOutCubic(prog(t, S.end.start + 0.9, 0.9));
  u.shade.value = Math.max(V.intro, V.wood) * 0.9;
  u.topShade.value = V.led;
  lens.uniforms.seed.value = (n * 7.31) % 97;

  // 3D numbers on the cards.
  const l1 = cardNumber(N1, EDIT[1], V.card1, t);
  const l2 = cardNumber(N2, EDIT[3], V.card2, t);
  glowMat.uniforms.o.value = Math.max(V.card1 * l1, V.card2 * l2) * 0.55;
  glow.position.set(0, wy(560) - 0.2, -2);
  scene.environmentRotation.set(0, rad(Math.sin(t * 0.5) * 25), 0);

  // ---- type
  const I = S.intro;
  col(el.introLogo, t, I.start + 0.15, V.intro);
  col(el.intro, t, I.start + 0.35, V.intro, 0.12, { dur: 1.1, dy: 30, blur: 18 });
  col(el.introSub, t, I.start + 0.95, V.intro);

  col(el.card1, t, S.card1.start + 0.35, V.card1);
  col(el.card1Text, t, S.card1.start + 0.75, V.card1, 0.18);
  col(el.date, t, S.led.start + 0.4, V.led, 0.12, { dur: 1.0, dy: 26, blur: 16 });
  col(el.card2, t, S.card2.start + 0.35, V.card2);
  col(el.card2Text, t, S.card2.start + 0.75, V.card2, 0.18);
  col(el.well, t, S.wood.start + 0.45, V.wood);

  const te = S.end.start + 1.0;
  const ke = t >= S.end.start ? 1 : 0;
  reveal(el.endTitle, t, te, ke, { dur: 1.1, dy: 30, blur: 18 });
  el.endRows.forEach((r, i) => reveal(r, t, te + 0.35 + i * 0.12, ke));
  reveal(el.endCta, t, te + 0.8, ke);
  reveal(el.endDate, t, te + 0.95, ke);
  reveal(el.endLogo, t, te + 1.1, ke);
  el.link.style.transform = `translateX(${(Math.max(0, Math.sin((t - te - 1.6) * 4)) * 5 * (t > te + 1.6 ? 1 : 0)).toFixed(2)}px)`;

  composer.render();
}

// ------------------------------------------------------------- boot
const ready = (async () => {
  const [font, man] = await Promise.all([
    fetch('../../assets/fonts/poppins/poppins-600.typeface.json').then(r => r.json()),
    fetch(`${PLATE_DIR}/plates.json`).then(r => r.json()),
  ]);
  FONT = new FontLoader().parse(font);
  MANIFEST = man;
  await document.fonts.ready;
  build();
  renderer.compile(scene, cam);
})();

window.COMP = { FPS, TOTAL, W, H, ready, seek: async n => { await ready; await seek(n); }, S };
if (params.has('t')) ready.then(() => seek(Math.round(parseFloat(params.get('t')) * FPS)));
