// CALLADO Zubehör – cinematic 16:9. A real 3D set (scene.js) filmed with a virtual camera,
// finished like an After Effects comp: bloom, depth of field, motion blur on whips, film grain,
// anamorphic flares, letterbox, tracked callouts and kinetic type on top.
// Deterministic and frame-addressed: window.COMP.seek(n) renders output frame n.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildScene, POSTS, POST_H, LED_Y, SLOPE } from './scene.js';

const FPS = 30, W = 1920, H = 1080;
const params = new URLSearchParams(location.search);

// ------------------------------------------------------------------ timeline (seconds)
const T = {
  fadeIn: [0, 1.0],
  stripe: [[4.6, 2.2], [0.8, 3.0], [5.0, 2.2]],        // per post: LED run start, duration (slow motion)
  cap: [[9.9, 1.3], [9.4, 1.3], [9.65, 1.3]],          // per post: light band ignites
  lightsOn: 12.55,                                      // studio flickers on
  dusk: 24.4,                                           // cut to evening
  end: 28.6,                                            // end card
  total: 32.6,
};
const TOTAL = Math.round(T.total * FPS);

// Camera takes: position + target curves, fov, depth of field. u is eased over the take.
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const TAKES = [
  { t: [0, 4.2], ease: 'drift', pos: [V(0.36, 0.24, 0.78), V(0.4, 0.66, 0.84), V(0.44, 1.06, 0.9)],
    tgt: [V(0.1, 0.42, 0.05), V(0.1, 0.84, 0.05), V(0.1, 1.24, 0.05)], fov: [30, 28], ap: 0.006 },
  { t: [4.2, 8.4], ease: 'drift', pos: [V(0.44, 1.06, 0.9), V(0.65, 1.06, 1.55), V(-0.6, 1.1, 3.0), V(-2.4, 1.15, 4.3)],
    tgt: [V(0.1, 1.24, 0.05), V(0, 1.1, 0), V(0.1, 1.0, 0), V(0.3, 0.95, 0)], fov: [28, 34], ap: [0.0045, 0.0012] },
  { t: [8.4, 12.4], ease: 'drift', pos: [V(-2.4, 1.15, 4.3), V(-0.6, 1.62, 3.0), V(1.05, 2.06, 1.3), V(2.32, 2.02, 0.72)],
    tgt: [V(0.3, 0.95, 0), V(0.9, 1.5, 0), V(1.6, 1.85, 0), V(1.74, 1.88, 0)], fov: [34, 26], ap: [0.0012, 0.0045] },
  { t: [12.4, 13.4], ease: 'whip', pos: [V(2.32, 2.02, 0.72), V(3.4, 1.8, 2.7), V(3.9, 1.65, 5.0)],
    tgt: [V(1.74, 1.88, 0), V(1.0, 1.55, 0), V(0.3, 1.45, 0)], fov: [26, 36], ap: [0.0045, 0.0008] },
  { t: [13.4, 16.4], ease: 'drift', pos: [V(3.9, 1.65, 5.0), V(3.3, 1.55, 5.4)],
    tgt: [V(0.3, 1.45, 0), V(0.0, 1.42, 0)], fov: [36, 35], ap: 0.0008 },
  { t: [16.4, 16.95], ease: 'whip', pos: [V(3.3, 1.55, 5.4), V(-0.8, 0.8, 3.4), V(-2.84, 0.16, 1.78)],
    tgt: [V(0.0, 1.42, 0), V(-2.2, 0.5, 0.9), V(-3.24, 0.07, 1.27)], fov: [35, 30], ap: [0.0008, 0.007] },
  { t: [16.95, 20.4], ease: 'drift', pos: [V(-2.84, 0.16, 1.78), V(-2.7, 0.5, 2.1), V(-2.62, 1.0, 2.3)],
    tgt: [V(-3.24, 0.07, 1.27), V(-3.36, 0.42, 0.9), V(-3.42, 0.62, 0.7)], fov: [30, 33], ap: [0.007, 0.003] },
  { t: [20.4, 20.95], ease: 'whip', pos: [V(-2.62, 1.0, 2.3), V(-0.4, 1.4, 4.2), V(1.0, 1.55, 4.9)],
    tgt: [V(-3.42, 0.62, 0.7), V(0.2, 0.8, 0), V(1.85, 0.66, 0)], fov: [33, 33], ap: [0.003, 0.001] },
  { t: [20.95, 24.4], ease: 'drift', pos: [V(1.0, 1.55, 4.9), V(2.4, 1.52, 5.0), V(3.5, 1.5, 4.9)],
    tgt: [V(1.85, 0.66, 0), V(2.15, 0.64, 0), V(2.4, 0.62, 0)], fov: [33, 33], ap: 0.001 },
  { t: [24.4, 32.6], ease: 'drift', pos: [V(-1.6, 1.25, 6.6), V(-1.0, 1.2, 5.6), V(-0.6, 1.15, 5.0)],
    tgt: [V(0.4, 1.0, 0), V(0.3, 1.0, 0), V(0.25, 1.0, 0)], fov: [38, 36], ap: [0.0007, 0.0007] },
];

// Type: [element id, in, out]
const TITLES = [['t-stripe', 5.7, 8.15], ['t-cover', 10.3, 12.3], ['t-callado', 13.5, 16.15],
  ['t-nut', 17.4, 20.2], ['t-schraeg', 21.5, 24.2], ['t-hero', 25.1, T.end - 0.1]];
const CALLOUTS = [
  { at: V(0, 1.0, 0.052), t: [6.4, 8.15], dx: 150, dy: -110, text: 'Solar-LED' },
  { at: V(1.8, POST_H + 0.038, 0.062), t: [10.9, 12.3], dx: -230, dy: -150, text: 'Solar-LED' },
];
const SLOPE_LINE = { t: [21.8, 24.2] };

// ------------------------------------------------------------------ helpers
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const prog = (t, s, d) => clamp((t - s) / d);
const lerp = (a, b, k) => a + (b - a) * k;
const E = {
  outExpo: k => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inExpo: k => (k <= 0 ? 0 : Math.pow(2, 10 * k - 10)),
  outCubic: k => 1 - Math.pow(1 - k, 3),
  inCubic: k => k * k * k,
  inOutCubic: k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  inOutSine: k => -(Math.cos(Math.PI * k) - 1) / 2,
  inOutQuint: k => (k < 0.5 ? 16 * k ** 5 : 1 - Math.pow(-2 * k + 2, 5) / 2),
};
const EASE = { drift: k => 0.35 * k + 0.65 * E.inOutSine(k), whip: E.inOutQuint };
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// Studio light: off → fluorescent flicker → on; evening after the dusk cut.
function lightLevel(t) {
  if (t >= T.dusk) return 0;
  const x = t - T.lightsOn;
  if (x < 0) return 0;
  const steps = [[0, 0.7], [0.06, 0.05], [0.12, 0.9], [0.18, 0.2], [0.24, 1.0], [0.3, 0.55], [0.36, 1.0]];
  return steps.filter(s => x >= s[0]).pop()[1];
}

// ------------------------------------------------------------------ renderer + passes
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('#gl').appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(32, W / H, 0.02, 120);
const prevCam = new THREE.PerspectiveCamera(32, W / H, 0.02, 120);

let set;   // filled in init()
const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);

const MotionBlur = {
  uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec4 c = vec4(0.); float j = hash(gl_FragCoord.xy);
      for (int i = 0; i < 24; i++) { float k = (float(i) + j) / 24. - .5; c += texture2D(tDiffuse, vUv + uDir * k); }
      gl_FragColor = c / 24.; }`,
};
// Caps HDR highlights before bloom/DOF, so a single specular spark can't flood the frame.
const Clamp = {
  uniforms: { tDiffuse: { value: null }, uMax: { value: 6.0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uMax; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float m = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c.rgb * min(1., uMax / max(m, 1e-4)), c.a); }`,
};
const Film = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.05 }, uVig: { value: 0.35 }, uCA: { value: 0.006 } },
  vertexShader: MotionBlur.vertexShader,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig, uCA; varying vec2 vUv;
    float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423) + uTime); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
    void main(){
      vec2 d = vUv - .5; float r2 = dot(d, d);
      vec2 o = d * uCA * r2 * 4.;
      vec3 c = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
      float l = dot(c, vec3(.299, .587, .114));
      c += vec3(-.012, -.002, .018) * (1. - l) * (1. - l) + vec3(.02, .01, -.012) * l * l;   // cool shadows, warm highlights
      c *= 1. - uVig * smoothstep(.12, .62, r2 * 2.);
      c += (hash(vUv * vec2(1920., 1080.)) - .5) * uGrain * (1.2 - l);
      gl_FragColor = vec4(c, 1.);
    }`,
};

let bokeh, blur, bloom, film;

// ------------------------------------------------------------------ camera
function curve(pts) { return pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : new THREE.LineCurve3(pts[0], pts[1]); }
TAKES.forEach(tk => { tk.pc = curve(tk.pos); tk.tc = curve(tk.tgt); });
const pair = v => (Array.isArray(v) ? v : [v, v]);

function shot(t) {
  const tk = TAKES.find(k => t < k.t[1]) || TAKES[TAKES.length - 1];
  const u = EASE[tk.ease](prog(t, tk.t[0], tk.t[1] - tk.t[0]));
  const [f0, f1] = pair(tk.fov), [a0, a1] = pair(tk.ap);
  return { pos: tk.pc.getPoint(u), tgt: tk.tc.getPoint(u), fov: lerp(f0, f1, u), ap: lerp(a0, a1, u) };
}
function place(cam, s) {
  cam.position.copy(s.pos);
  cam.fov = s.fov;
  cam.updateProjectionMatrix();
  cam.lookAt(s.tgt);
  cam.updateMatrixWorld();
}

// ------------------------------------------------------------------ type
function splitBig(el) {
  const big = $('.big', el);
  const words = big.textContent.split(' ');
  big.innerHTML = words.map(w => `<span class="w">${[...w].map(c => `<span class="c">${c}</span>`).join('')}</span>`).join(' ');
}
// Kinetic title: letters rise out of their mask with blur and tracking, kicker line draws, sub wipes.
function title(el, t, tin, tout) {
  const on = t >= tin - 0.05 && t < tout + 0.9;
  el.style.display = on ? '' : 'none';
  if (!on) return;
  const cs = $$('.c', el);
  cs.forEach((c, i) => {
    const a = E.outExpo(prog(t, tin + 0.12 + i * 0.028, 0.9));
    const b = E.inExpo(prog(t, tout + i * 0.012, 0.5));
    const y = (1 - a) * 105 - b * 105;
    c.style.transform = `translateY(${y}%)`;
    c.style.filter = `blur(${((1 - a) * 10 + b * 8).toFixed(2)}px)`;
    c.style.opacity = (Math.min(a * 1.4, 1) * (1 - b)).toFixed(3);
  });
  const big = $('.big', el);
  const track = E.outExpo(prog(t, tin + 0.1, 1.6));
  big.style.letterSpacing = `${lerp(0.22, el.id === 't-callado' ? 0.02 : -0.01, track)}em`;
  const kick = $('.kick', el);
  const ka = E.outExpo(prog(t, tin, 0.8)), kb = E.inExpo(prog(t, tout, 0.4));
  kick.style.opacity = (ka * (1 - kb)).toFixed(3);
  kick.style.transform = `translateX(${(1 - ka) * -30}px)`;
  const line = $('.kick i', el);
  if (line) line.style.transform = `scaleX(${E.inOutCubic(prog(t, tin + 0.05, 0.6)) * (1 - kb)})`;
  const sub = $('.sub span', el);
  if (sub) {
    const sa = E.outExpo(prog(t, tin + 0.55, 0.8)), sb = E.inExpo(prog(t, tout + 0.05, 0.4));
    sub.style.transform = `translateY(${(1 - sa) * 110 - sb * 110}%)`;
  }
}

// ------------------------------------------------------------------ overlays tracked to 3D
const flareEls = [], v3 = new THREE.Vector3();
function project(p) {
  v3.copy(p).project(camera);
  return { x: (v3.x * 0.5 + 0.5) * W, y: (-v3.y * 0.5 + 0.5) * H, front: v3.z < 1 };
}
function makeFlare() {
  const f = document.createElement('div');
  f.className = 'flare';
  f.innerHTML = '<div class="halo"></div><div class="streak"></div><div class="ghost"></div><div class="ghost"></div>';
  $('#flares').appendChild(f);
  return f;
}
function flare(f, p, k, facing) {
  const s = project(p);
  const vis = s.front && s.x > -300 && s.x < W + 300 && s.y > -200 && s.y < H + 200 ? k * facing : 0;
  f.style.display = vis > 0.01 ? '' : 'none';
  if (vis <= 0.01) return;
  f.style.transform = `translate(${s.x}px, ${s.y}px)`;
  f.style.opacity = Math.min(1, vis).toFixed(3);
  const [halo, streak, g1, g2] = f.children;
  streak.style.transform = `scaleX(${(0.6 + 0.6 * vis).toFixed(3)})`;
  halo.style.transform = `scale(${(0.6 + 0.8 * vis).toFixed(3)})`;
  // Ghosts sit on the line through the screen centre, like lens reflections.
  const gx = (W / 2 - s.x), gy = (H / 2 - s.y);
  g1.style.transform = `translate(${gx * 1.3}px, ${gy * 1.3}px) scale(1.4)`;
  g2.style.transform = `translate(${gx * 1.8}px, ${gy * 1.8}px) scale(0.7)`;
}

const svg = $('#callouts'), NS = 'http://www.w3.org/2000/svg';
const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
CALLOUTS.forEach(c => {
  c.ring = mk('circle', { r: 16, fill: 'none', 'stroke-width': 2 });
  c.dot = mk('circle', { r: 5 });
  c.line = mk('polyline', { fill: 'none', 'stroke-width': 2 });
  c.label = document.createElement('div');
  c.label.className = 'cl-label';
  c.label.textContent = c.text;
  $('#labels').appendChild(c.label);
});
const slopeEls = { main: mk('line', { 'stroke-width': 2.5 }), a: mk('line', { 'stroke-width': 2.5 }), b: mk('line', { 'stroke-width': 2.5 }) };

function callout(c, t, ink) {
  const a = prog(t, c.t[0], 0.35), out = prog(t, c.t[1], 0.3);
  const on = a > 0 && out < 1;
  for (const e of [c.ring, c.dot, c.line, c.label]) e.style.display = on ? '' : 'none';
  if (!on) return;
  const s = project(c.at);
  const k = E.inOutCubic(prog(t, c.t[0] + 0.15, 0.5));
  const ex = s.x + c.dx, ey = s.y + c.dy, mx = s.x + c.dx * 0.35;
  const pts = [[s.x, s.y], [mx, ey], [ex, ey]];
  const seg1 = Math.hypot(mx - s.x, ey - s.y), seg2 = Math.abs(ex - mx), L = seg1 * k * (seg1 + seg2) / seg1;
  const along = (seg1 + seg2) * k;
  const p2 = along <= seg1 ? [lerp(s.x, mx, along / seg1), lerp(s.y, ey, along / seg1)] : [lerp(mx, ex, (along - seg1) / seg2), ey];
  c.line.setAttribute('points', (along <= seg1 ? [pts[0], p2] : [pts[0], pts[1], p2]).map(p => p.join(',')).join(' '));
  c.dot.setAttribute('cx', s.x); c.dot.setAttribute('cy', s.y);
  c.ring.setAttribute('cx', s.x); c.ring.setAttribute('cy', s.y);
  c.ring.setAttribute('r', (16 * E.outCubic(prog(t, c.t[0], 0.5)) * (1 + 0.15 * Math.sin((t - c.t[0]) * 5))).toFixed(2));
  for (const e of [c.ring, c.line]) e.setAttribute('stroke', ink);
  c.dot.setAttribute('fill', ink);
  const lo = E.outExpo(prog(t, c.t[0] + 0.55, 0.6));
  c.label.style.transform = `translate(${c.dx > 0 ? ex + 12 : ex - 12 - c.label.offsetWidth}px, ${ey - c.label.offsetHeight / 2}px)`;
  c.label.style.clipPath = c.dx > 0 ? `inset(0 ${(1 - lo) * 100}% 0 0)` : `inset(0 0 0 ${(1 - lo) * 100}%)`;
  const op = (1 - out).toFixed(3);
  for (const e of [c.ring, c.dot, c.line, c.label]) e.style.opacity = op;
}

function slopeLine(t, ink) {
  const [t0, t1] = SLOPE_LINE.t;
  const out = prog(t, t1, 0.3), on = t >= t0 && out < 1;
  for (const e of Object.values(slopeEls)) e.style.display = on ? '' : 'none';
  if (!on) return;
  const off = V(0.035, 0.04, 0.03);
  const A = V(SLOPE.x0, SLOPE.yHigh, 0).add(off), B = V(SLOPE.x1 - 0.05, SLOPE.yLow + 0.04, 0).add(off);
  const a = project(A), b = project(B);
  const k = E.inOutCubic(prog(t, t0 + 0.2, 1.0));
  const ex = lerp(a.x, b.x, k), ey = lerp(a.y, b.y, k);
  const set = (e, x1, y1, x2, y2) => { e.setAttribute('x1', x1); e.setAttribute('y1', y1); e.setAttribute('x2', x2); e.setAttribute('y2', y2); };
  set(slopeEls.main, a.x, a.y, ex, ey);
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1, nx = -dy / len * 14, ny = dx / len * 14;
  const ta = E.outCubic(prog(t, t0, 0.3)), tb = E.outCubic(prog(t, t0 + 1.2, 0.3));
  set(slopeEls.a, a.x - nx * ta, a.y - ny * ta, a.x + nx * ta, a.y + ny * ta);
  set(slopeEls.b, b.x - nx * tb, b.y - ny * tb, b.x + nx * tb, b.y + ny * tb);
  for (const e of Object.values(slopeEls)) { e.setAttribute('stroke', ink); e.style.opacity = (1 - out).toFixed(3); }
}

// ------------------------------------------------------------------ render one frame
const ledState = t => ({
  stripe: T.stripe.map(([s, d]) => ({ level: t >= s ? 1 : 0, head: E.inOutSine(prog(t, s, d)) })),
  cap: T.cap.map(([s, d]) => ({ level: t >= s ? 1 : 0, head: E.outCubic(prog(t, s, d)) })),
});

function frame(n) {
  const t = n / FPS;
  const L = lightLevel(t);
  const dusk = t >= T.dusk ? 1 : 0;
  const led = ledState(t);
  set.update({ light: L, dusk, t, ...led });

  // Camera and its motion for the whip blur.
  const s = shot(t);
  place(camera, s);
  place(prevCam, shot(t - 1 / FPS));
  const ahead = new THREE.Vector3(0, 0, -4).applyMatrix4(camera.matrixWorld);
  const now = ahead.clone().project(camera), was = ahead.clone().project(prevCam);
  const mv = new THREE.Vector2((now.x - was.x) * 0.5, (now.y - was.y) * 0.5);
  blur.uniforms.uDir.value.copy(mv.length() > 0.004 ? mv.multiplyScalar(-1.2) : mv.set(0, 0));
  blur.enabled = blur.uniforms.uDir.value.lengthSq() > 0;

  bokeh.uniforms.focus.value = s.pos.distanceTo(s.tgt);
  bokeh.uniforms.aperture.value = t >= T.end ? lerp(s.ap, 0.02, E.inOutCubic(prog(t, T.end, 1.4))) : s.ap;
  bokeh.uniforms.maxblur.value = t >= T.end ? lerp(0.012, 0.03, E.inOutCubic(prog(t, T.end, 1.4))) : 0.012;
  const dark = 1 - Math.max(L, dusk * 0.4);
  bloom.strength = 0.3 + 0.45 * dark + (L > 0 && t < T.lightsOn + 0.5 ? 0.5 : 0);
  bloom.radius = lerp(0.5, 0.35, dark);
  bloom.threshold = lerp(1.6, 0.9, dark);
  renderer.toneMappingExposure = 1.0 + 0.12 * dark;
  film.uniforms.uTime.value = (n * 0.6180339) % 1;
  film.uniforms.uVig.value = lerp(0.18, 0.4, dark);
  if (params.has('nobloom')) bloom.enabled = false;
  if (params.has('nobokeh')) bokeh.enabled = false;
  composer.render();

  // ---- AE layer
  const ink = L > 0.5 && t < T.dusk ? '#0e2234' : '#ffffff';
  const st = $('#stage').style;
  st.setProperty('--ink', ink);
  st.setProperty('--ink-soft', L > 0.5 && t < T.dusk ? 'rgba(14,34,52,.72)' : 'rgba(255,255,255,.78)');
  st.setProperty('--ink-line', L > 0.5 && t < T.dusk ? 'rgba(14,34,52,.45)' : 'rgba(255,255,255,.55)');

  // Letterbox: 2.39:1 in the dark, opens with the light, closes again for the evening.
  const bar = t < T.dusk ? 138 * (1 - E.inOutCubic(prog(t, T.lightsOn + 0.15, 0.9))) : 112 * E.inOutCubic(prog(t, T.dusk, 0.8));
  $('#bar-top').style.height = $('#bar-bot').style.height = `${bar.toFixed(1)}px`;
  st.setProperty('--title-bottom', `${(bar + 96).toFixed(0)}px`);
  st.setProperty('--logo-top', `${(bar + 56).toFixed(0)}px`);
  $('#fade').style.opacity = (1 - E.inOutSine(prog(t, T.fadeIn[0], T.fadeIn[1]))).toFixed(3);

  // Logo in the corner (white in the dark, navy in the light), gone for the end card.
  const lg = prog(t, 1.2, 0.8) * (1 - prog(t, T.end, 0.4));
  $('#logo').style.opacity = lg.toFixed(3);
  $('#logo-navy').style.opacity = ink === '#0e2234' ? 1 : 0;
  $('#logo-white').style.opacity = ink === '#0e2234' ? 0 : 1;

  // Flares on the cap bands (and the running LED head in the opening).
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  POSTS.forEach((x, k) => {
    const c = led.cap[k];
    const facing = clamp(-fwd.z * 1.4);
    flare(flareEls[k], V(x, POST_H + 0.038, 0.062), c.level * Math.min(1, c.head * 1.3) * (1 - 0.85 * L) * (t < T.dusk ? 1 : 0.6), facing);
  });
  const h = led.stripe[1];
  flare(flareEls[3], V(0, LED_Y[0] + h.head * (LED_Y[1] - LED_Y[0]), 0.05), h.head > 0 && h.head < 1 ? 0.7 : 0, 1);

  CALLOUTS.forEach(c => callout(c, t, ink));
  slopeLine(t, ink);
  TITLES.forEach(([id, a, b]) => title(document.getElementById(id), t, a, b));

  const list = $$('#hero-list span');
  list.forEach((e, i) => {
    const a = E.outExpo(prog(t, 25.9 + i * 0.12, 0.8)), b = E.inExpo(prog(t, T.end - 0.1 + i * 0.05, 0.4));
    e.style.opacity = (a * (1 - b)).toFixed(3);
    e.style.transform = `translateY(${((1 - a) * 24 - b * 16).toFixed(1)}px)`;
  });
  $('#hero-list').style.color = '#fff';
  $('#hero-list').style.bottom = `${(bar + 70).toFixed(0)}px`;

  // End card over the defocused, darkened set.
  const ec = t >= T.end;
  $('#end').style.display = ec ? '' : 'none';
  if (ec) {
    $('#end-dim').style.opacity = E.inOutSine(prog(t, T.end, 1.2)).toFixed(3);
    const lgA = E.outExpo(prog(t, T.end + 0.5, 1.2));
    $('#end-logo').style.opacity = lgA.toFixed(3);
    $('#end-logo').style.transform = `scale(${lerp(1.08, 1, lgA).toFixed(4)})`;
    $('#end-logo').style.filter = `blur(${((1 - lgA) * 12).toFixed(2)}px)`;
    $('#end-logo .shine').style.backgroundPosition = `${lerp(110, -10, E.inOutCubic(prog(t, T.end + 1.4, 1.1)))}% 0`;
    const sl = E.outExpo(prog(t, T.end + 1.0, 0.9));
    $('#end .slogan span').style.transform = `translateY(${(1 - sl) * 110}%)`;
    const cta = E.outExpo(prog(t, T.end + 1.5, 0.8));
    $('#cta').style.opacity = cta.toFixed(3);
    $('#cta').style.transform = `translateY(${(1 - cta) * 26}px)`;
    $('#cta .url i').style.transform = `scaleX(${E.inOutCubic(prog(t, T.end + 1.9, 0.7))})`;
    const nudge = t > T.end + 2.4 ? Math.pow(Math.sin(Math.PI * (((t - T.end - 2.4) % 1.6) / 1.6)), 2) : 0;
    $('#cta .btn svg').style.transform = `translateX(${nudge * 8}px)`;
  }
}

async function init() {
  await Promise.all([400, 500, 600, 700, 800].map(w => document.fonts.load(`${w} 40px Poppins`)));
  await document.fonts.ready;
  set = await buildScene(renderer);
  composer.addPass(new RenderPass(set.scene, camera));
  composer.addPass(new ShaderPass(Clamp));
  bokeh = new BokehPass(set.scene, camera, { focus: 1, aperture: 0.001, maxblur: 0.012 });
  composer.addPass(bokeh);
  blur = new ShaderPass(MotionBlur);
  composer.addPass(blur);
  bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.8, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  film = new ShaderPass(Film);
  composer.addPass(film);
  for (let i = 0; i < 4; i++) flareEls.push(makeFlare());
  ['t-stripe', 't-cover', 't-callado', 't-nut', 't-schraeg', 't-hero'].forEach(id => splitBig(document.getElementById(id)));
  await Promise.all($$('img').map(i => i.decode()));
  const t0 = params.get('t');
  frame(t0 ? Math.round(parseFloat(t0) * FPS) : 0);
}

window.COMP = { FPS, TOTAL, W, H, seek: async n => frame(n), ready: init() };
