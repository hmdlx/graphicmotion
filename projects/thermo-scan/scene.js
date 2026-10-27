// SPLASH THERMO – 3D scene. Everything is built procedurally from the product
// dimensions (whirlpool Ø 208 × 70 cm, cover 162 × 162 × 20 cm) and drawn in
// two looks: "xray" (glowing contours, thermal water) and "solid" (studio).
// All state is set from the output time, so any frame can be rendered alone.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// Dimensions in metres ---------------------------------------------------------
export const DIM = {
  rIn: 0.83, rOut: 1.04,              // inner / outer wall
  rimC: 0.935, rimRx: 0.105, rimY: 0.60, rimRy: 0.10,
  floor: 0.04,
  water: 0.47,
  coverR: 0.81, coverT: 0.20, coverEdge: 0.10,
  ribs: 7, ribAngle: THREE.MathUtils.degToRad(40),
};
DIM.coverRest = DIM.water - 0.02;     // underside of the floating cover

// Seeded random -----------------------------------------------------------------
export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const GLSL_NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
vec3 thermal(float t){
  t=clamp(t,0.,1.);
  vec3 c0=vec3(.04,.05,.22),c1=vec3(.30,.06,.45),c2=vec3(.85,.14,.26),c3=vec3(1.,.45,.06),c4=vec3(1.,.80,.22),c5=vec3(1.,.97,.82);
  if(t<.25)return mix(c0,c1,t/.25);
  if(t<.5)return mix(c1,c2,(t-.25)/.25);
  if(t<.72)return mix(c2,c3,(t-.5)/.22);
  if(t<.88)return mix(c3,c4,(t-.72)/.16);
  return mix(c4,c5,(t-.88)/.12);
}`;

// Cover surface -------------------------------------------------------------------
// Height offsets of the top / bottom skin at (x, z) in cover-local space. The
// tubes run along DIM.ribAngle; u is the coordinate across them.
const RIB_DIR = new THREE.Vector2(Math.cos(DIM.ribAngle), -Math.sin(DIM.ribAngle));
const RIB_N = new THREE.Vector2(-RIB_DIR.y, RIB_DIR.x);
const RIB_W = (2 * DIM.coverR) / DIM.ribs;
export function ribBump(x, z) {
  const u = x * RIB_N.x + z * RIB_N.y;
  const f = ((u / RIB_W + 0.5) % 1 + 1) % 1 - 0.5;   // -0.5..0.5, 0 = tube centre
  return Math.sqrt(Math.max(0, 1 - (2 * f) ** 2));
}
export function ribGrooves(x0, x1, z) {
  // x positions on the line z = const where a groove (tube weld) crosses it.
  const out = [];
  for (let k = -DIM.ribs; k <= DIM.ribs; k++) {
    const u = (k + 0.5) * RIB_W;                       // groove at f = ±0.5
    if (Math.abs(RIB_N.x) < 1e-6) continue;
    const x = (u - z * RIB_N.y) / RIB_N.x;
    if (x > x0 && x < x1) out.push(x);
  }
  return out;
}
// Profile of the cover at radius rho: half thickness and edge weight.
function coverProfile(rho) {
  const { coverR: r, coverT: T, coverEdge: e } = DIM;
  const k = Math.max(0, rho - (r - e)) / e;           // 0 inside, 1 at the rim
  const half = (T / 2) * Math.sqrt(Math.max(0, 1 - k * k));
  return { half, flat: 1 - k * k };
}
export function coverTop(x, z) {
  const rho = Math.hypot(x, z);
  const { half, flat } = coverProfile(rho);
  const b = ribBump(x, z);
  return DIM.coverT / 2 + half - 0.038 * (1 - Math.pow(b, 0.45)) * flat * (half / (DIM.coverT / 2));
}
export function coverBottom(x, z) {
  const rho = Math.hypot(x, z);
  const { half, flat } = coverProfile(rho);
  const b = ribBump(x, z);
  return DIM.coverT / 2 - half + 0.022 * (1 - Math.pow(b, 0.45)) * flat * (half / (DIM.coverT / 2));
}

function buildCoverGeometry() {
  const { coverR: r, coverEdge: e } = DIM;
  const NA = 560;
  const rows = [];   // each row: function(theta) -> [x, y, z]
  const NI = 96, NE = 36;
  // top disc
  for (let i = 0; i <= NI; i++) {
    const rho = (r - e) * Math.pow(i / NI, 0.85);
    rows.push(th => { const x = rho * Math.cos(th), z = rho * Math.sin(th); return [x, coverTop(x, z), z]; });
  }
  // rounded edge: angle from +90° (top) to -90° (bottom)
  for (let j = 1; j < NE; j++) {
    const phi = Math.PI / 2 - (Math.PI * j) / NE;
    const rho = (r - e) + e * Math.cos(phi);
    rows.push(th => {
      const x = rho * Math.cos(th), z = rho * Math.sin(th);
      const y = phi >= 0 ? coverTop(x, z) : coverBottom(x, z);
      return [x, y, z];
    });
  }
  // bottom disc
  for (let i = NI; i >= 0; i--) {
    const rho = (r - e) * Math.pow(i / NI, 0.85);
    rows.push(th => { const x = rho * Math.cos(th), z = rho * Math.sin(th); return [x, coverBottom(x, z), z]; });
  }
  const pos = [];
  const idx = [];
  for (let i = 0; i < rows.length; i++) {
    for (let a = 0; a <= NA; a++) {
      const th = (a / NA) * Math.PI * 2;
      pos.push(...rows[i](a === NA ? 0 : th));
    }
  }
  const W = NA + 1;
  for (let i = 0; i < rows.length - 1; i++) {
    for (let a = 0; a < NA; a++) {
      const p = i * W + a, q = p + W;
      idx.push(p, p + 1, q, p + 1, q + 1, q);
    }
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  return g;
}

// Pool --------------------------------------------------------------------------
function poolProfile() {
  const { rIn, rOut, rimC, rimRx, rimY, rimRy, floor } = DIM;
  const pts = [];
  pts.push([0.0, floor]);
  for (let i = 1; i <= 10; i++) pts.push([(rIn - 0.03) * (i / 10), floor]);
  for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI / 2; pts.push([rIn - 0.03 + 0.03 * Math.cos(a), floor + 0.03 + 0.03 * Math.sin(a)]); }
  for (let i = 1; i <= 16; i++) pts.push([rIn, floor + 0.03 + (rimY - floor - 0.03) * (i / 16)]);
  for (let i = 1; i <= 36; i++) { const a = Math.PI - (i / 36) * Math.PI; pts.push([rimC + rimRx * Math.cos(a), rimY + rimRy * Math.sin(a)]); }
  for (let i = 1; i <= 16; i++) pts.push([rOut, rimY - (rimY - 0.03) * (i / 16)]);
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push([rOut - 0.03 + 0.03 * Math.cos(a), 0.03 - 0.03 * Math.sin(a)]); }
  for (let i = 1; i <= 10; i++) pts.push([(rOut - 0.03) * (1 - i / 10), 0.0]);
  return pts;
}

function buildPoolGeometry() {
  const prof = poolProfile().map(([x, y]) => new THREE.Vector2(Math.max(x, 1e-4), y));
  let g = new THREE.LatheGeometry(prof, 320);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  const p = g.attributes.position;
  const { rIn, rOut, rimY } = DIM;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const rho = Math.hypot(x, z); const th = Math.atan2(z, x);
    let d = 0;
    if (Math.abs(rho - rOut) < 0.002 && y > 0.03 && y < rimY) {
      const f = ((th / (Math.PI * 2)) * 40 % 1 + 1) % 1;
      const w = Math.min(1, (rimY - y) / 0.08, (y - 0.03) / 0.05);
      d = 0.011 * (Math.pow(Math.sin(Math.PI * f), 0.35) - 1) * w;
    } else if (Math.abs(rho - rIn) < 0.002 && y > DIM.floor + 0.03 && y < rimY) {
      const f = ((th / (Math.PI * 2)) * 34 % 1 + 1) % 1;
      const w = Math.min(1, (rimY - y) / 0.08, (y - DIM.floor - 0.03) / 0.05);
      d = -0.009 * (Math.pow(Math.sin(Math.PI * f), 0.35) - 1) * w;
    }
    if (d) { const k = (rho + d) / rho; p.setX(i, x * k); p.setZ(i, z * k); }
  }
  g = mergeVertices(g, 1e-5);
  g.computeVertexNormals();
  return g;
}

// Cross-section outlines at the cut plane z = d --------------------------------------
const chord = (rho, d) => Math.sqrt(Math.max(rho * rho - d * d, 0));
function wallSection(d, side) {
  // Air chamber of the inflatable wall: inner wall, rim, outer wall, bottom.
  const { rIn, rOut, rimC, rimRx, rimY, rimRy } = DIM;
  const pts = [[rIn, 0], [rIn, rimY]];
  for (let i = 1; i < 32; i++) { const a = Math.PI - (i / 32) * Math.PI; pts.push([rimC + rimRx * Math.cos(a), rimY + rimRy * Math.sin(a)]); }
  pts.push([rOut, rimY], [rOut, 0]);
  return pts.map(([rho, y]) => new THREE.Vector2(side * chord(rho, d), y));
}
function coverSection(d) {
  // Outline of the cover cut at z = d (cover-local), plus the tube welds.
  const X = chord(DIM.coverR - 1e-4, d);
  if (X < 0.01) return null;
  const N = 140, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const x = -X + (2 * X * i) / N;
    top.push(new THREE.Vector2(x, coverTop(x, d)));
    bot.push(new THREE.Vector2(x, coverBottom(x, d)));
  }
  const welds = ribGrooves(-X + 0.03, X - 0.03, d).map(x => [new THREE.Vector2(x, coverTop(x, d)), new THREE.Vector2(x, coverBottom(x, d))]);
  return { outline: top.concat(bot.reverse()), welds, X };
}

// Materials ---------------------------------------------------------------------
function xrayMaterial(color, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 1 },
      uPower: { value: opts.power ?? 2.4 },
      uBase: { value: opts.base ?? 0.05 },
      uTime: { value: 0 },
      uScanY: { value: -10 },
      uGlow: { value: 0 },
    },
    vertexShader: /* glsl */`
      #include <clipping_planes_pars_vertex>
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        #include <begin_vertex>
        vec4 wp = modelMatrix * vec4(position,1.);
        vW = wp.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: /* glsl */`
      #include <clipping_planes_pars_fragment>
      uniform vec3 uColor; uniform float uOpacity, uPower, uBase, uTime, uScanY, uGlow;
      varying vec3 vN; varying vec3 vV; varying vec3 vW;
      void main(){
        #include <clipping_planes_fragment>
        float f = pow(1. - abs(dot(normalize(vN), normalize(vV))), uPower);
        float bands = .75 + .25 * smoothstep(.2,.8, sin(vW.y * 160. - uTime * 6.) * .5 + .5);
        float scan = exp(-pow((vW.y - uScanY) * 14., 2.));
        float a = (uBase + f * (1. + uGlow)) * bands + scan * .9;
        gl_FragColor = vec4(uColor * a * uOpacity * .62, 1.);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, clipping: true,
  });
}

function thermalWaterMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uHeat: { value: 1 }, uOpacity: { value: 1 }, uTop: { value: DIM.water } },
    vertexShader: /* glsl */`
      #include <clipping_planes_pars_vertex>
      varying vec3 vW;
      void main(){
        #include <begin_vertex>
        vec4 wp = modelMatrix * vec4(position,1.); vW = wp.xyz;
        vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;
        #include <clipping_planes_vertex>
      }`,
    fragmentShader: GLSL_NOISE + /* glsl */`
      #include <clipping_planes_pars_fragment>
      uniform float uTime, uHeat, uOpacity, uTop; varying vec3 vW;
      void main(){
        #include <clipping_planes_fragment>
        float n = snoise(vec3(vW.x*2.2, vW.y*2.6 - uTime*.35, vW.z*2.2 + uTime*.12))*.5+.5;
        float n2 = snoise(vec3(vW.xz*6., uTime*.5))*.5+.5;
        float r = length(vW.xz) / ${DIM.rIn.toFixed(3)};
        float depth = clamp((uTop - vW.y) / (uTop - ${DIM.floor.toFixed(3)}), 0., 1.);
        // Heat loss cools the water from the surface down.
        float loss = (1. - uHeat) * (1. - depth * .7);
        float t = .74 - .22 * r * r + .16 * (n - .5) + .05 * (n2 - .5) - loss * .75;
        gl_FragColor = vec4(thermal(t) * uOpacity, 1.);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide, clipping: true,
  });
}

function sectionFillMaterial(color, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: opacity }, uFade: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 wp = modelMatrix*vec4(position,1.); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uColor; uniform float uOpacity, uFade, uTime; varying vec3 vW;
      void main(){
        // fine diagonal hatch, like a technical section drawing
        float h = smoothstep(.55,.9, sin((vW.x + vW.y) * 260.) * .5 + .5);
        gl_FragColor = vec4(uColor * (uOpacity * (.55 + .45 * h)) * uFade, 1.);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

function airFillMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uFade: { value: 0 }, uTime: { value: 0 }, uPulse: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vL; void main(){ vL = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: GLSL_NOISE + /* glsl */`
      uniform float uFade, uTime, uPulse; varying vec3 vL;
      void main(){
        // drifting air molecules inside the tubes
        vec2 g = vL.xy * vec2(90., 90.) + vec2(uTime*2.5, sin(uTime + vL.x*8.)*1.5);
        vec2 c = fract(g) - .5; vec2 id = floor(g);
        float rnd = fract(sin(dot(id, vec2(12.9898,78.233))) * 43758.5453);
        float dotm = smoothstep(.16, .05, length(c)) * step(.72, rnd);
        float base = .05 + .05 * (snoise(vec3(vL.xy*5., uTime*.4))*.5+.5);
        vec3 col = vec3(.55,.85,1.) * (base + dotm * .7 + uPulse * .18);
        gl_FragColor = vec4(col * uFade, 1.);
      }`,
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
}

function floorMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uGrid: { value: 1 }, uTime: { value: 0 } },
    vertexShader: /* glsl */`varying vec3 vW; void main(){ vec4 wp = modelMatrix*vec4(position,1.); vW = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: /* glsl */`
      uniform float uGrid, uTime; varying vec3 vW;
      float line(float x, float w){ float f = abs(fract(x) - .5); return smoothstep(w, 0., .5 - f); }
      void main(){
        float r = length(vW.xz);
        float g1 = max(line(vW.x*4., .03), line(vW.z*4., .03));
        float g2 = max(line(vW.x, .012), line(vW.z, .012));
        float ring = line(r*2., .02) * .5;
        float fade = exp(-r*r*.18);
        vec3 col = vec3(.35,.75,1.) * (g1*.035 + g2*.11 + ring*.05) * fade * uGrid;
        gl_FragColor = vec4(col, 1.);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

// Leaf texture ------------------------------------------------------------------------
function leafTexture(hue) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.translate(128, 128);
  const path = new Path2D();
  path.moveTo(0, -118);
  path.bezierCurveTo(58, -92, 92, -26, 64, 40);
  path.bezierCurveTo(46, 82, 16, 104, 0, 118);
  path.bezierCurveTo(-16, 104, -46, 82, -64, 40);
  path.bezierCurveTo(-92, -26, -58, -92, 0, -118);
  const grad = g.createLinearGradient(-80, -100, 80, 110);
  grad.addColorStop(0, `hsl(${hue + 12}, 85%, 52%)`);
  grad.addColorStop(0.55, `hsl(${hue}, 80%, 42%)`);
  grad.addColorStop(1, `hsl(${hue - 10}, 70%, 28%)`);
  g.fillStyle = grad; g.fill(path);
  g.save(); g.clip(path);
  g.strokeStyle = `hsla(${hue + 20}, 70%, 75%, .55)`; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, -112); g.lineTo(0, 124); g.stroke();
  g.lineWidth = 1.6;
  for (let i = -4; i <= 4; i++) {
    const y = i * 24;
    g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(30, y - 18, 70, y - 34); g.stroke();
    g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(-30, y - 18, -70, y - 34); g.stroke();
  }
  g.restore();
  // stem
  g.strokeStyle = `hsl(${hue - 5}, 60%, 25%)`; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 112); g.lineTo(4, 128); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Background ------------------------------------------------------------------------
function backgroundTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 430, 40, 256, 520, 720);
  grad.addColorStop(0, '#1d3d5a');
  grad.addColorStop(0.45, '#10263b');
  grad.addColorStop(1, '#050d16');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 1024);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Split render pass: two looks side by side, divided by a horizontal scan line --------
class SplitRenderPass extends Pass {
  constructor(scene, camera, world) {
    super();
    this.scene = scene; this.camera = camera; this.world = world;
    this.split = null;          // { y: 0..1 from top, top: 'xray', bottom: 'solid' }
    this.mode = 'xray';
    this.needsSwap = false;
  }
  render(renderer, writeBuffer, readBuffer) {
    const target = this.renderToScreen ? null : readBuffer;
    renderer.setRenderTarget(target);
    renderer.setScissorTest(false);
    renderer.clear();
    if (!this.split) {
      this.world.setLook(this.mode);
      renderer.render(this.scene, this.camera);
      return;
    }
    // The solid look renders unscissored first (its shadow map pass must not be
    // clipped by the scissor); the x-ray look then replaces its own band.
    const w = readBuffer.width, h = readBuffer.height;
    const yPix = Math.round(h * (1 - this.split.y));     // GL origin is bottom-left
    const xrayTop = this.split.top === 'xray';
    this.world.setLook('solid');
    renderer.render(this.scene, this.camera);
    const band = xrayTop ? [0, yPix, w, h - yPix] : [0, 0, w, yPix];
    if (band[3] > 0) {
      renderer.setScissorTest(true);
      renderer.setScissor(...band); renderer.setViewport(0, 0, w, h);
      renderer.clear();
      this.world.setLook('xray');
      renderer.render(this.scene, this.camera);
      renderer.setScissorTest(false);
    }
  }
}

// Depth of field: single-pass gather blur from the scene depth (after Dennis
// Gustafsson's "bokeh in a single pass"). Off unless aperture > 0.
class DofPass extends Pass {
  constructor(camera, W, H) {
    super();
    this.camera = camera;
    this.aperture = 0;           // blur in px for an object at 1/focus = 1 m^-1 off focus
    this.focus = 1;              // focus distance in metres
    this.maxBlur = 18;
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null },
        uRes: { value: new THREE.Vector2(W, H) }, uNear: { value: 0.05 }, uFar: { value: 60 },
        uFocus: { value: 1 }, uAperture: { value: 0 }, uMax: { value: 18 },
      },
      vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: /* glsl */`
        #include <packing>
        uniform sampler2D tDiffuse, tDepth; uniform vec2 uRes; uniform float uNear, uFar, uFocus, uAperture, uMax;
        varying vec2 vUv;
        float dist(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, uNear, uFar); }
        float coc(float z){ return clamp(abs(1. / uFocus - 1. / z) * uAperture, 0., uMax); }
        void main(){
          vec3 col = texture2D(tDiffuse, vUv).rgb;
          float z0 = dist(vUv), c0 = coc(z0);
          float tot = 1.; float rad = 2.;
          for (float ang = 0.; ang < 400.; ang += 2.39996) {
            if (rad > uMax) break;
            vec2 tc = vUv + vec2(cos(ang), sin(ang)) * rad / uRes;
            vec3 sc = texture2D(tDiffuse, tc).rgb;
            float z = dist(tc), cs = coc(z);
            if (z > z0) cs = clamp(cs, 0., c0 * 2.);
            float m = smoothstep(rad - .5, rad + .5, cs);
            col += mix(col / tot, sc, m); tot += 1.;
            rad += 3.2 / rad;
          }
          gl_FragColor = vec4(col / tot, 1.);
        }`,
      depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.material);
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.material.uniforms;
    u.tDiffuse.value = readBuffer.texture; u.tDepth.value = readBuffer.depthTexture;
    u.uNear.value = this.camera.near; u.uFar.value = this.camera.far;
    u.uFocus.value = this.focus; u.uAperture.value = this.aperture; u.uMax.value = this.maxBlur;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}

// World -------------------------------------------------------------------------------
export class World {
  constructor(canvas, W, H) {
    this.W = W; this.H = H;
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(1);
    renderer.setSize(W, H, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;

    const scene = this.scene = new THREE.Scene();
    scene.background = backgroundTexture();
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    this.camera = new THREE.PerspectiveCamera(30, W / H, 0.05, 60);
    this.gridX = 1; this.gridS = 0.35;

    // Cut plane: keeps z <= d
    this.cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), 5);
    const clip = [this.cut];

    // ---- Geometry
    const poolGeo = buildPoolGeometry();
    const coverGeo = buildCoverGeometry();

    // ---- Looks: every object has an xray and a solid variant sharing geometry
    this.looks = { xray: [], solid: [] };
    const add = (look, obj, parent) => { if (parent) parent.add(obj); this.looks[look].push(obj); return obj; };

    const pool = this.pool = new THREE.Group(); scene.add(pool);
    const coverG = this.cover = new THREE.Group(); scene.add(coverG);       // moves the cover
    const coverInner = this.coverInner = new THREE.Group(); coverG.add(coverInner); // squash / inflate

    // Pool – xray
    this.poolX = xrayMaterial('#7fdcff', { power: 2.2, base: 0.035 }); this.poolX.clippingPlanes = clip;
    add('xray', new THREE.Mesh(poolGeo, this.poolX), pool);
    // Pool – solid
    this.poolS = new THREE.MeshPhysicalMaterial({
      color: '#d9dfe4', roughness: 0.5, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.45,
      envMap: this.env, envMapIntensity: 0.42, clippingPlanes: clip, side: THREE.DoubleSide,
    });
    const poolSolid = new THREE.Mesh(poolGeo, this.poolS); poolSolid.castShadow = true; poolSolid.receiveShadow = true;
    add('solid', poolSolid, pool);

    // Control unit on the rim (back right, as in the photo)
    const cuAngle = Math.atan2(-0.85, 0.38);
    const cu = new THREE.Group();
    cu.position.set(Math.cos(cuAngle) * DIM.rimC, DIM.rimY + DIM.rimRy - 0.01, Math.sin(cuAngle) * DIM.rimC);
    cu.rotation.y = -cuAngle + Math.PI / 2;
    const cuGeo = new RoundedBoxGeometry(0.21, 0.14, 0.17, 4, 0.035);
    cuGeo.translate(0, 0.055, 0);
    const cuX = xrayMaterial('#7fdcff', { power: 2.0, base: 0.05 }); cuX.clippingPlanes = clip;
    add('xray', new THREE.Mesh(cuGeo, cuX), cu);
    const cuS = new THREE.MeshPhysicalMaterial({ color: '#eef1f3', roughness: 0.35, clearcoat: 0.6, envMap: this.env, clippingPlanes: clip });
    const cuSolid = new THREE.Mesh(cuGeo, cuS); cuSolid.castShadow = true; add('solid', cuSolid, cu);
    const disp = new THREE.Mesh(new THREE.CircleGeometry(0.045, 40), new THREE.MeshPhysicalMaterial({ color: '#1b232b', roughness: 0.2, clearcoat: 1, envMap: this.env, clippingPlanes: clip }));
    disp.rotation.x = -Math.PI / 2; disp.position.set(0, 0.126, 0.01); add('solid', disp, cu);
    pool.add(cu);

    // Floor
    this.floorMat = floorMaterial();
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 96), this.floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.001; floor.renderOrder = -2;
    scene.add(floor);
    // Solid look: studio floor that takes the shadow
    this.shadowFloorMat = new THREE.ShadowMaterial({ opacity: 0.45 });
    const shadowFloor = new THREE.Mesh(new THREE.CircleGeometry(9, 96), this.shadowFloorMat);
    shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.receiveShadow = true;
    scene.add(shadowFloor); add('solid', shadowFloor);
    this.aoMat = new THREE.MeshBasicMaterial({ map: this.radialTex(), transparent: true, depthWrite: false, color: '#000000', opacity: 0.6 });
    const ao = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), this.aoMat);
    ao.rotation.x = -Math.PI / 2; ao.position.y = 0.002; scene.add(ao); add('solid', ao);

    // Water – thermal volume (xray)
    this.waterThermal = thermalWaterMaterial(); this.waterThermal.clippingPlanes = clip;
    const waterVol = new THREE.Mesh(new THREE.CylinderGeometry(DIM.rIn - 0.004, DIM.rIn - 0.004, DIM.water - DIM.floor, 128, 1, false), this.waterThermal);
    waterVol.position.y = (DIM.water + DIM.floor) / 2;
    this.waterVol = waterVol; add('xray', waterVol, pool);
    // Water – clear (solid)
    this.waterClear = this.clearWaterMaterial(); this.waterClear.clippingPlanes = clip;
    const waterTop = new THREE.Mesh(new THREE.CircleGeometry(DIM.rIn - 0.002, 160), this.waterClear);
    waterTop.rotation.x = -Math.PI / 2; waterTop.position.y = DIM.water; this.waterTop = waterTop;
    add('solid', waterTop, pool);
    this.causticMat = this.causticMaterial(); this.causticMat.clippingPlanes = clip;
    const caustic = new THREE.Mesh(new THREE.CircleGeometry(DIM.rIn - 0.02, 128), this.causticMat);
    caustic.rotation.x = -Math.PI / 2; caustic.position.y = DIM.floor + 0.002; add('solid', caustic, pool);

    // Cover – xray
    this.coverX = xrayMaterial('#bff3ff', { power: 1.9, base: 0.05 }); this.coverX.clippingPlanes = clip;
    add('xray', new THREE.Mesh(coverGeo, this.coverX), coverInner);
    // Cover – solid
    this.coverS = new THREE.MeshPhysicalMaterial({
      color: '#9fa5ab', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.35, sheen: 0.4, sheenColor: new THREE.Color('#dfe6ec'),
      envMap: this.env, envMapIntensity: 0.5, clippingPlanes: clip, side: THREE.DoubleSide,
    });
    this.coverS.onBeforeCompile = sh => {
      // Shield ripples on the cover skin where rain hits.
      sh.uniforms.uRip = { value: this.ripples };
      sh.uniforms.uRipN = { value: 0 };
      sh.uniforms.uShield = { value: 0 };
      sh.uniforms.uGrain = { value: 0.035 };
      this.coverShaderU = sh.uniforms;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vLocal; uniform vec4 uRip[24]; uniform int uRipN; uniform float uShield; uniform float uGrain;')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          {
            // fine matte PVC structure; fades out before it would alias
            vec2 q = vLocal.xz * 900.;
            float fw = max(fwidth(q.x), fwidth(q.y));
            float k = uGrain * clamp(1.6 - fw, 0., 1.);
            vec2 g = vec2(cos(q.x * .73 + sin(q.y * .41) * 2.3) + .6 * cos((q.x + q.y * .7) * 1.13 + sin(q.y * .21)),
                          cos(q.y * .79 + sin(q.x * .37) * 2.1) + .6 * cos((q.x * .8 - q.y) * 1.07 + sin(q.x * .23)));
            normal = normalize(normal + mat3(viewMatrix) * vec3(g.x, 0., g.y) * k);
          }`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float rip = 0.;
          for (int i = 0; i < 24; i++) { if (i >= uRipN) break; vec4 r = uRip[i];
            float d = length(vLocal.xz - r.xy); float rad = r.z * .22; float ring = exp(-pow((d - rad) * 70., 2.)) * (1. - r.z) * r.w; rip += ring; }
          float rim = pow(1. - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.);
          totalEmissiveRadiance += vec3(.45,.85,1.) * (rip * 1.4 + rim * uShield * 1.6);`);
    };
    this.ripples = Array.from({ length: 24 }, () => new THREE.Vector4());
    const coverSolid = new THREE.Mesh(coverGeo, this.coverS); coverSolid.castShadow = true; coverSolid.receiveShadow = true;
    add('solid', coverSolid, coverInner);

    // Valve (blue, front right as in the photo)
    const vx = 0.42 * DIM.coverR, vz = 0.41 * DIM.coverR;
    this.valvePos = new THREE.Vector3(vx, coverTop(vx, vz), vz);
    const valveGeo = new THREE.CylinderGeometry(0.026, 0.028, 0.014, 64); valveGeo.translate(0, 0.004, 0);
    const blue = new THREE.MeshPhysicalMaterial({ color: '#2a54d6', roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, envMap: this.env, clippingPlanes: clip });
    const valveS = new THREE.Mesh(valveGeo, blue);
    valveS.position.copy(this.valvePos); add('solid', valveS, coverInner);
    const capGeo = new THREE.CylinderGeometry(0.017, 0.019, 0.006, 64); capGeo.translate(0, 0.0135, 0);
    const cap = new THREE.Mesh(capGeo, blue); cap.position.copy(this.valvePos); add('solid', cap, coverInner);
    const dimple = new THREE.Mesh(new THREE.CircleGeometry(0.008, 40), new THREE.MeshPhysicalMaterial({ color: '#173a9e', roughness: 0.5, envMap: this.env, clippingPlanes: clip }));
    dimple.rotation.x = -Math.PI / 2; dimple.position.copy(this.valvePos); dimple.position.y += 0.0167; add('solid', dimple, coverInner);
    const valveRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 20, 72), new THREE.MeshPhysicalMaterial({ color: '#e8ecf0', roughness: 0.35, clearcoat: 0.6, envMap: this.env, clippingPlanes: clip }));
    valveRing.rotation.x = Math.PI / 2; valveRing.position.copy(this.valvePos); add('solid', valveRing, coverInner);
    const valveX = new THREE.Mesh(valveGeo, xrayMaterial('#9fb9ff', { power: 1.5, base: 0.3 }));
    valveX.material.clippingPlanes = clip; valveX.position.copy(this.valvePos); add('xray', valveX, coverInner);

    // ---- Section caps (rebuilt each frame from the cut position)
    this.capWallFill = sectionFillMaterial('#7fdcff', 0.22);
    this.capWaterMat = thermalWaterMaterial(); this.capWaterMat.depthTest = false;
    this.capAirMat = airFillMaterial();
    this.capLineMat = new THREE.LineBasicMaterial({ color: '#d8f6ff', transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
    this.capCoverLineMat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false });
    this.caps = new THREE.Group(); this.caps.renderOrder = 5; pool.add(this.caps);
    this.coverCaps = new THREE.Group(); coverInner.add(this.coverCaps);
    this.looks.xray.push(this.caps, this.coverCaps);
    this._capD = null;

    // ---- Particles (heat, air)
    this.particles = this.makeParticles(900);
    scene.add(this.particles.points);
    // floating dust in the light, drawn as soft bokeh discs (premium cut)
    this.dust = this.makeParticles(160, true);
    this.dust.points.visible = false;
    scene.add(this.dust.points);
    // atmospheric depth for the studio look; density 0 = off
    scene.fog = new THREE.FogExp2('#0b1a29', 0);

    // ---- Leaves (cover-local, so they ride along when the cover lifts)
    this.leaves = [];
    const R = rng(43);
    const hues = [28, 18, 36, 12, 40, 22];
    const leafGeo = new THREE.PlaneGeometry(0.15, 0.15, 6, 6);
    // curl the leaf a little
    const lp = leafGeo.attributes.position;
    for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), y = lp.getY(i); lp.setZ(i, 0.12 * (x * x) * 9 + 0.04 * Math.sin(y * 20) * 0.1); }
    leafGeo.computeVertexNormals();
    const landSpots = [[-0.42, 0.12], [0.18, -0.38], [0.36, 0.22], [-0.1, 0.46], [-0.55, -0.22], [0.52, -0.1], [0.02, 0.0], [-0.28, -0.5], [0.12, 0.58], [-0.62, 0.32], [0.62, 0.36], [0.3, -0.62]];
    landSpots.forEach(([lx, lz], i) => {
      const mat = new THREE.MeshStandardMaterial({ map: leafTexture(hues[i % hues.length]), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.7, envMap: this.env, envMapIntensity: 0.6 });
      const m = new THREE.Mesh(leafGeo, mat);
      m.castShadow = true;
      const s = 0.8 + R() * 0.55;
      m.scale.setScalar(s);
      coverG.add(m);
      this.leaves.push({ mesh: m, x: lx, z: lz, land: 0.12 * i + R() * 0.1, spin: R() * Math.PI * 2, wob: 0.6 + R() * 0.8, ph: R() * 6.28, h0: 1.5 + R() * 0.8, dx: (R() - 0.5) * 0.8, dz: (R() - 0.5) * 0.6, tiltX: (R() - 0.5) * 0.25, tiltZ: (R() - 0.5) * 0.25 });
    });
    this.looks.solid.push(...this.leaves.map(l => l.mesh));

    // ---- Rain
    const NR = 260;
    const dropGeo = new THREE.BoxGeometry(0.0035, 0.16, 0.0035);
    this.rain = new THREE.InstancedMesh(dropGeo, new THREE.MeshBasicMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.55, depthWrite: false }), NR);
    this.rain.frustumCulled = false; scene.add(this.rain);
    const RR = rng(11);
    this.drops = Array.from({ length: NR }, () => ({ t0: RR(), x: (RR() - 0.5) * 3.2, z: (RR() - 0.5) * 3.2, v: 5.5 + RR() * 2 }));
    this.splashes = new THREE.InstancedMesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }), NR);
    this.splashes.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NR * 3), 3);
    this.splashes.frustumCulled = false; scene.add(this.splashes);

    // ---- Lights (solid look)
    const key = this.key = new THREE.DirectionalLight('#fff6ec', 1.5);
    key.position.set(-2.5, 4.5, 2.2); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -2.2; key.shadow.camera.right = 2.2; key.shadow.camera.top = 2.2; key.shadow.camera.bottom = -2.2;
    key.shadow.camera.near = 1; key.shadow.camera.far = 12; key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
    scene.add(key);
    const rim = this.rimLight = new THREE.DirectionalLight('#8fd8ff', 1.0); rim.position.set(3, 1.6, -3); scene.add(rim);
    const fill = this.fill = new THREE.HemisphereLight('#cfe3ff', '#0c1a28', 0.25); scene.add(fill);
    this.looks.solid.push(key, rim, fill);

    // ---- Post
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture: new THREE.DepthTexture(W, H, THREE.UnsignedIntType) });
    const composer = this.composer = new EffectComposer(renderer, rt);
    composer.setPixelRatio(1); composer.setSize(W, H);
    this.renderPass = new SplitRenderPass(scene, this.camera, this);
    composer.addPass(this.renderPass);
    this.dof = new DofPass(this.camera, W, H);
    this.dof.enabled = false;
    composer.addPass(this.dof);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.7, 0.55, 0.6);
    composer.addPass(this.bloom);
    composer.addPass(new OutputPass());
  }

  radialTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    return t;
  }

  clearWaterMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uEnv: { value: this.env } },
      vertexShader: /* glsl */`
        #include <clipping_planes_pars_vertex>
        varying vec3 vW;
        void main(){
          #include <begin_vertex>
          vec4 wp = modelMatrix*vec4(position,1.); vW = wp.xyz; vec4 mvPosition = viewMatrix*wp; gl_Position = projectionMatrix*mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: GLSL_NOISE + /* glsl */`
        #include <clipping_planes_pars_fragment>
        uniform float uTime, uOpacity; varying vec3 vW;
        void main(){
          #include <clipping_planes_fragment>
          float e = .004;
          float h  = snoise(vec3(vW.xz*7., uTime*.6)) * .5 + snoise(vec3(vW.xz*17., uTime*1.1)) * .25;
          float hx = snoise(vec3((vW.xz+vec2(e,0.))*7., uTime*.6)) * .5 + snoise(vec3((vW.xz+vec2(e,0.))*17., uTime*1.1)) * .25;
          float hz = snoise(vec3((vW.xz+vec2(0.,e))*7., uTime*.6)) * .5 + snoise(vec3((vW.xz+vec2(0.,e))*17., uTime*1.1)) * .25;
          vec3 n = normalize(vec3(-(hx-h)/e*.012, 1., -(hz-h)/e*.012));
          vec3 v = normalize(cameraPosition - vW);
          float fr = .04 + .96 * pow(1. - max(dot(n, v), 0.), 5.);
          vec3 l = normalize(vec3(-.45, .8, .4));
          float spec = pow(max(dot(reflect(-l, n), v), 0.), 260.) * 5.;
          float r = length(vW.xz) / ${DIM.rIn.toFixed(3)};
          vec3 deep = mix(vec3(.55,.86,.92), vec3(.28,.62,.78), r*r);
          vec3 col = mix(deep * .35, vec3(.75,.88,.95), fr) + spec;
          float a = mix(.22, .8, fr);
          gl_FragColor = vec4(col, (a + spec) * uOpacity);
        }`,
      transparent: true, depthWrite: false, clipping: true,
    });
  }

  causticMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 } },
      vertexShader: /* glsl */`
        #include <clipping_planes_pars_vertex>
        varying vec3 vW;
        void main(){
          #include <begin_vertex>
          vec4 wp = modelMatrix*vec4(position,1.); vW = wp.xyz; vec4 mvPosition = viewMatrix*wp; gl_Position = projectionMatrix*mvPosition;
          #include <clipping_planes_vertex>
        }`,
      fragmentShader: GLSL_NOISE + /* glsl */`
        #include <clipping_planes_pars_fragment>
        uniform float uTime, uOpacity; varying vec3 vW;
        float caust(vec2 p, float t){
          float c = 0.;
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            float n = snoise(vec3(p * (5. + fi * 3.), t * (.5 + fi * .2) + fi * 7.));
            c += pow(1. - abs(n), 8. + fi * 4.) * (.7 - fi * .15);
          }
          return c;
        }
        void main(){
          #include <clipping_planes_fragment>
          float r = length(vW.xz) / ${DIM.rIn.toFixed(3)};
          vec3 base = mix(vec3(.80,.92,.96), vec3(.62,.80,.88), r);
          float c = caust(vW.xz, uTime);
          vec3 col = base * .5 + vec3(.85,1.,1.) * c * .55;
          gl_FragColor = vec4(col * uOpacity, uOpacity);
        }`,
      transparent: true, clipping: true,
    });
  }

  makeParticles(N, bokeh = false) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: this.H * 0.5 } },
      vertexShader: /* glsl */`
        attribute float size; attribute vec3 color; varying vec3 vC;
        uniform float uScale;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */`
        varying vec3 vC;
        void main(){
          float d = length(gl_PointCoord - .5);
          ${bokeh
            ? 'float a = smoothstep(.5, .44, d) * (.55 + .45 * smoothstep(.25, .47, d));'
            : 'float a = smoothstep(.5, 0., d); a *= a;'}
          gl_FragColor = vec4(vC * a, 1.);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(g, mat);
    points.frustumCulled = false;
    return { points, pos, col, size, N, geo: g };
  }

  setLook(look) {
    for (const o of this.looks.xray) o.visible = look === 'xray' && o.userData.on !== false;
    for (const o of this.looks.solid) o.visible = look === 'solid' && o.userData.on !== false;
    this.floorMat.uniforms.uGrid.value = look === 'xray' ? this.gridX : this.gridS;
  }

  // Section caps -------------------------------------------------------------------
  updateCaps(d, fade) {
    const vis = fade > 0.001 && d < DIM.rOut;
    this.caps.userData.on = vis; this.coverCaps.userData.on = vis;
    this.capWallFill.uniforms.uFade.value = fade;
    this.capLineMat.opacity = fade; this.capCoverLineMat.opacity = fade;
    this.capAirMat.uniforms.uFade.value = fade;
    this.capWaterMat.uniforms.uOpacity.value = fade * 0.62;
    if (!vis) return;
    const key = d.toFixed(4);
    if (this._capD === key) return;
    this._capD = key;
    const dispose = grp => { for (const c of [...grp.children]) { c.geometry.dispose(); grp.remove(c); } };
    dispose(this.caps); dispose(this.coverCaps);
    const zOff = d - 0.0005;
    const addLine = (grp, pts, mat, closed) => {
      const arr = closed ? [...pts, pts[0]] : pts;
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arr.map(p => new THREE.Vector3(p.x, p.y, zOff))), mat);
      l.renderOrder = 7; grp.add(l);
    };
    const addFill = (grp, pts, mat, order = 6) => {
      const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts), 1), mat);
      m.position.z = zOff; m.renderOrder = order; grp.add(m);
    };
    // walls, both sides
    for (const side of [-1, 1]) {
      const pts = wallSection(d, side);
      if (side < 0) pts.reverse();
      addFill(this.caps, pts, this.capWallFill);
      addLine(this.caps, pts, this.capLineMat, true);
      // drop-stitch threads between the inner and outer skin
      const xi = chord(DIM.rIn, d), xo = chord(DIM.rOut, d);
      const thr = [];
      for (let k = 1; k < 9; k++) {
        const y = 0.05 + (DIM.rimY - 0.08) * (k / 9);
        thr.push(new THREE.Vector3(side * xi, y, zOff), new THREE.Vector3(side * xo, y, zOff));
      }
      const ls = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(thr), this.capLineMat); ls.renderOrder = 7; this.caps.add(ls);
    }
    // floor slab
    const xf = chord(DIM.rIn, d);
    if (xf > 0.01) {
      const fl = [new THREE.Vector2(-xf, 0), new THREE.Vector2(xf, 0), new THREE.Vector2(xf, DIM.floor), new THREE.Vector2(-xf, DIM.floor)];
      addFill(this.caps, fl, this.capWallFill); addLine(this.caps, fl, this.capLineMat, true);
      // water body
      const xw = chord(DIM.rIn - 0.004, d);
      const wpts = [new THREE.Vector2(-xw, DIM.floor), new THREE.Vector2(xw, DIM.floor), new THREE.Vector2(xw, DIM.water), new THREE.Vector2(-xw, DIM.water)];
      addFill(this.caps, wpts, this.capWaterMat, 5);
      addLine(this.caps, [wpts[3], wpts[2]], this.capLineMat, false);
    }
    // cover (cover-local; the cover group only translates while the cut is open)
    const cs = coverSection(d - this.cover.position.z);
    if (cs) {
      addFill(this.coverCaps, cs.outline, this.capAirMat);
      addLine(this.coverCaps, cs.outline, this.capCoverLineMat, true);
      const wl = []; for (const [a, b] of cs.welds) wl.push(new THREE.Vector3(a.x, a.y, zOff), new THREE.Vector3(b.x, b.y, zOff));
      if (wl.length) { const ls = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(wl), this.capCoverLineMat); ls.renderOrder = 7; this.coverCaps.add(ls); }
    }
  }

  // Camera: orbit (az, el in degrees) around a target; hfov keeps the horizontal
  // framing identical for 1:1 and 9:16. shift moves the image in px.
  setCamera({ az, el, dist, ty = 0.35, tx = 0, tz = 0, hfov = 34, roll = 0, sx = 0, sy = 0 }) {
    const cam = this.camera;
    const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
    const target = new THREE.Vector3(tx, ty, tz);
    cam.position.set(tx + dist * Math.cos(e) * Math.sin(a), ty + dist * Math.sin(e), tz + dist * Math.cos(e) * Math.cos(a));
    cam.up.set(Math.sin(THREE.MathUtils.degToRad(roll)), Math.cos(THREE.MathUtils.degToRad(roll)), 0);
    cam.lookAt(target);
    const aspect = this.W / this.H;
    cam.aspect = aspect;
    // portrait widens the view upwards; landscape keeps the 1:1 height and gains width
    cam.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hfov) / 2) / Math.min(aspect, 1)));
    if (sx || sy) cam.setViewOffset(this.W, this.H, -sx, -sy, this.W, this.H); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  project(v) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.W, y: (-p.y * 0.5 + 0.5) * this.H, behind: p.z > 1 };
  }

  render() { this.composer.render(); }
}
