// CALLADO 3D set: fence with CALLUX STRIPE (LED in the post grooves), CALLUX COVER (caps
// with a light band), a Schrägelement at the right end and two CALLANUT profiles on the floor.
// Units are metres; the fence runs along x, its front faces +z.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const POSTS = [-1.8, 0, 1.8];
export const POST_H = 1.85;
export const PANEL_H = 1.8;
export const LED_Y = [0.16, 1.72];                 // CALLUX STRIPE runs between these heights
export const SLOPE = { x0: 1.85, x1: 2.7, yHigh: 1.8, yLow: 1.12, post: 2.76 };
export const NUT_POS = new THREE.Vector3(-3.05, 0, 0.95);   // CALLANUT pair on the floor

const WARM = new THREE.Color(1.0, 0.78, 0.52);      // CALLUX STRIPE, warm white
const COOL = new THREE.Color(0.92, 0.96, 1.0);      // CALLUX COVER band

// Box-mapped UVs in metres: u along the long axis, v across. `su`/`sv` = metres per texture repeat.
function boxUV(geo, su, sv, du = 0, vertical = false) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let a, b;
    if (az >= ax && az >= ay) { a = p.getX(i); b = p.getY(i); }
    else if (ax >= ay) { a = p.getZ(i); b = p.getY(i); }
    else { a = p.getX(i); b = p.getZ(i); }
    if (vertical) [a, b] = [b, a];
    uv.setXY(i, a / su + du, b / sv);
  }
  uv.needsUpdate = true;
  return geo;
}

// Emissive strip: lit up to `head` (0..1 along its length) with a hot spot at the head,
// or (mode 1) lit from the centre outwards to `head` (0..1 of the half width).
function ledMaterial(color, mode) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: color.clone() }, uLevel: { value: 0 }, uHead: { value: 0 }, uGain: { value: 2 } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uLevel; uniform float uHead; uniform float uGain; varying vec3 vP;
      void main(){
        float v, w, head;
        if (${mode} == 0) {                                 // along the strip, geometry spans y 0..1
          v = vP.y; head = uHead; w = 0.03;
        } else {                                            // band: from the front/back centre around the corners
          float side = step(0.0612, abs(vP.x));
          v = mix(abs(vP.x), 0.0617 + (0.0617 - abs(vP.z)), side);
          head = uHead * 0.125; w = 0.008;
        }
        float lit = 1.0 - smoothstep(head - 0.05 * w / 0.03, head + 0.004, v);
        float hot = exp(-pow((v - head) / w, 2.)) * step(0.001, uHead) * step(uHead, 0.999);
        gl_FragColor = vec4(uColor * uLevel * (lit * uGain + hot * uGain * 1.6) + uColor * 0.02, 1.);
      }`,
    toneMapped: false,
  });
}

export async function buildScene(renderer) {
  const scene = new THREE.Scene();
  const load = new THREE.TextureLoader();
  const tex = async (url, srgb) => {
    const t = await load.loadAsync(url);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const [board, boardBump, post, postBump] = await Promise.all([
    tex('source/tex/board.jpg', true), tex('source/tex/board-bump.jpg'),
    tex('source/tex/post.jpg', true), tex('source/tex/post-bump.jpg'),
  ]);

  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;

  const M = {
    board: new THREE.MeshStandardMaterial({ map: board, bumpMap: boardBump, bumpScale: 2.2, roughness: 0.78, color: 0x8c8c90 }),
    post: new THREE.MeshStandardMaterial({ map: post, bumpMap: postBump, bumpScale: 1.2, roughness: 0.62, color: 0x9c9ca0 }),
    groove: new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 0.9 }),
    cap: new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.32 }),
    alu: new THREE.MeshStandardMaterial({ color: 0xc4c7cc, metalness: 0.75, roughness: 0.48 }),
    floor: new THREE.MeshStandardMaterial({ color: 0xdfe1e4, roughness: 0.42 }),
    nutSide: new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.45 }),
    nutEnd: new THREE.MeshStandardMaterial({ color: 0x9d9e98, bumpMap: boardBump, bumpScale: 3, roughness: 0.9 }),
  };
  const add = (geo, mat, x, y, z, shadow = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = shadow; m.receiveShadow = true;
    scene.add(m);
    return m;
  };

  // Floor (an endless studio floor; fog hides the horizon).
  const floor = add(new THREE.PlaneGeometry(80, 80), M.floor, 0, 0, 0, false);
  floor.rotation.x = -Math.PI / 2;

  // Panels: 12 boards between neighbouring posts, aluminium rail on top.
  const BOARD = PANEL_H / 12;
  for (let p = 0; p < POSTS.length - 1; p++) {
    const x0 = POSTS[p] + 0.05, x1 = POSTS[p + 1] - 0.05, len = x1 - x0, cx = (x0 + x1) / 2;
    for (let i = 0; i < 12; i++) {
      const g = new RoundedBoxGeometry(len, BOARD - 0.003, 0.021, 2, 0.002);
      g.translate(cx, BOARD * (i + 0.5), 0);
      boxUV(g, 1.25, BOARD, (i * 0.37 + p * 0.61) % 1);
      add(g, M.board, 0, 0, 0);
    }
    add(new THREE.BoxGeometry(len, 0.03, 0.045), M.alu, cx, PANEL_H + 0.015, 0);
  }

  // Schrägelement: boards cut by the slope, own post at the low end.
  const { x0: sx0, x1: sx1, yHigh, yLow } = SLOPE;
  const slopeX = y => Math.min(sx1, sx0 + ((yHigh - y) / (yHigh - yLow)) * (sx1 - sx0));
  for (let i = 0; i < 12; i++) {
    const y0 = BOARD * i, y1 = BOARD * (i + 1) - 0.003;
    const s = new THREE.Shape();
    s.moveTo(sx0, y0); s.lineTo(slopeX(y0), y0); s.lineTo(slopeX(y1), y1); s.lineTo(sx0, y1); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.021, bevelEnabled: false });
    g.translate(0, 0, -0.0105);
    g.computeVertexNormals();
    boxUV(g, 1.25, BOARD, (i * 0.53) % 1);
    add(g, M.board, 0, 0, 0);
  }
  const endPostH = yLow + 0.06;
  add(boxUV(new RoundedBoxGeometry(0.1, endPostH, 0.1, 2, 0.004), 1.25, 0.1, 0.2, true), M.post, SLOPE.post, endPostH / 2, 0);
  add(new RoundedBoxGeometry(0.118, 0.03, 0.118, 2, 0.004), M.cap, SLOPE.post, endPostH + 0.015, 0);

  // Posts with front groove, CALLUX STRIPE inside, CALLUX COVER on top.
  const stripes = [], bands = [], ledLights = [];
  for (const [k, x] of POSTS.entries()) {
    add(boxUV(new RoundedBoxGeometry(0.1, POST_H, 0.1, 2, 0.004), 1.25, 0.1, k * 0.3, true), M.post, x, POST_H / 2, 0);
    add(new THREE.BoxGeometry(0.02, LED_Y[1] - LED_Y[0] + 0.04, 0.004), M.groove, x, (LED_Y[0] + LED_Y[1]) / 2, 0.0485, false);
    const sg = new THREE.BoxGeometry(0.009, 1, 0.003);
    sg.translate(0, 0.5, 0);
    const stripe = new THREE.Mesh(sg, ledMaterial(WARM, 0));
    stripe.scale.y = LED_Y[1] - LED_Y[0];
    stripe.position.set(x, LED_Y[0], 0.0495);
    scene.add(stripe);
    stripes.push(stripe);

    const capY = POST_H;
    add(new RoundedBoxGeometry(0.124, 0.03, 0.124, 2, 0.005), M.cap, x, capY + 0.015, 0);
    add(new RoundedBoxGeometry(0.124, 0.035, 0.124, 2, 0.008), M.cap, x, capY + 0.062, 0);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.1235, 0.016, 0.1235), ledMaterial(COOL, 1));
    band.material.uniforms.uGain.value = 0.9;
    band.position.set(x, capY + 0.038, 0);
    scene.add(band);
    bands.push(band);

    // Light the LEDs throw on the boards, the post and the floor.
    const ls = [0.3, 0.9, 1.5].map(y => {
      const l = new THREE.PointLight(WARM, 0, 1.3, 2);
      l.position.set(x, y, 0.075);
      scene.add(l);
      return l;
    });
    const lc = new THREE.PointLight(COOL, 0, 1.2, 2);
    lc.position.set(x, capY + 0.04, 0.1);
    scene.add(lc);
    ledLights.push({ stripe: ls, cap: lc });
  }

  // CALLANUT: two profiles standing on the floor, a small stack lying in front with the
  // cut ends (grey WPC core, tongue / groove) towards the camera.
  const nut = new THREE.Group();
  const section = (tongue) => {
    const s = new THREE.Shape(), w = 0.042, d = 0.03;
    s.moveTo(-w / 2, -d / 2);
    if (tongue) { s.lineTo(-0.009, -d / 2); s.lineTo(-0.009, -d / 2 - 0.009); s.lineTo(0.009, -d / 2 - 0.009); s.lineTo(0.009, -d / 2); }
    s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, d / 2);
    if (!tongue) { s.lineTo(0.009, d / 2); s.lineTo(0.009, d / 2 - 0.01); s.lineTo(-0.009, d / 2 - 0.01); s.lineTo(-0.009, d / 2); }
    s.lineTo(-w / 2, d / 2); s.closePath();
    return s;
  };
  const prof = (tongue, len, standing) => {
    const g = new THREE.ExtrudeGeometry(section(tongue), { depth: len, bevelEnabled: true, bevelSize: 0.0012, bevelThickness: 0.0012, bevelSegments: 1 });
    if (standing) g.rotateX(-Math.PI / 2);          // length along y
    boxUV(g, 0.06, 0.06);
    const m = new THREE.Mesh(g, [M.nutEnd, M.nutSide]);
    m.castShadow = m.receiveShadow = true;
    nut.add(m);
    return m;
  };
  prof(true, 1.0, true).position.set(-0.24, 0, -0.32);
  prof(false, 0.84, true).position.set(-0.14, 0, -0.28);
  [[-0.046, 0.0195, true], [0, 0.0195, false], [0.046, 0.0195, true], [-0.023, 0.0585, false], [0.023, 0.0585, true]]
    .forEach(([x, y, tg], i) => {
      const m = prof(tg, 0.9 - i * 0.04, false);
      m.position.set(x, y + (tg ? 0.009 : 0), 0.32 - 0.9 + i * 0.04);   // ends flush-ish at z = 0.32
      m.rotation.z = tg ? 0 : Math.PI;
    });
  nut.position.copy(NUT_POS);
  scene.add(nut);

  // Studio lights (switched by update()).
  const studio = {
    hemi: new THREE.HemisphereLight(0xffffff, 0xd6d9de, 0),
    key: new THREE.SpotLight(0xffffff, 0, 0, 0.62, 0.85, 1.4),
    rim: new THREE.DirectionalLight(0xe4ecff, 0),
    moon: new THREE.HemisphereLight(0x29405a, 0x020304, 0.35),
  };
  studio.key.position.set(-3.5, 5.5, 5);
  studio.key.target.position.set(0, 0.8, 0);
  studio.key.castShadow = true;
  studio.key.shadow.mapSize.set(2048, 2048);
  studio.key.shadow.bias = -0.0004;
  studio.key.shadow.radius = 4;
  studio.rim.position.set(3, 4, -5);
  scene.add(studio.hemi, studio.key, studio.key.target, studio.rim, studio.moon);

  // Dust in the LED light.
  const N = 900;
  const pos = new Float32Array(N * 3), alpha = new Float32Array(N), seedA = [];
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    seedA.push({ x: -3.5 + rnd() * 7, y: rnd() * 2.6, z: -0.4 + rnd() * 2.4, v: 0.015 + rnd() * 0.035, a: 0.02 + rnd() * 0.06, ph: rnd() * 6.3, s: rnd() });
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dg.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
    uniforms: { uSize: { value: 26 } },
    vertexShader: `attribute float alpha; varying float vA; uniform float uSize;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vA = alpha * smoothstep(0.35, 1.2, -mv.z);
        gl_PointSize = min(uSize / -mv.z, 12.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(1.,.86,.66) * vA * smoothstep(.5, 0., d), 1.); }`,
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false,
  }));
  scene.add(dust);

  const fog = new THREE.FogExp2(0x000000, 0.05);
  scene.fog = fog;
  scene.background = new THREE.Color();

  // state: { light 0..1 studio, dusk 0..1, stripe[k] {level, head}, cap[k] {level, head}, t }
  function update(st) {
    const L = st.light, dk = st.dusk;
    studio.hemi.intensity = 0.4 * L + 0.3 * dk;
    studio.hemi.color.setRGB(1, 1, 1).lerp(new THREE.Color(0.55, 0.66, 0.85), dk);
    studio.key.intensity = 120 * L + 30 * dk;
    studio.key.color.setRGB(1, 1, 1).lerp(new THREE.Color(1.0, 0.7, 0.45), dk);
    studio.rim.intensity = 2.2 * L + 1.4 * dk;
    studio.key.castShadow = L + dk > 0.02;
    scene.environmentIntensity = 0.03 + 0.2 * L + 0.1 * dk;
    const bg = new THREE.Color(0x020406).lerp(new THREE.Color(0x203247), dk * 0.6).lerp(new THREE.Color(0xeef0f3), L);
    scene.background.copy(bg);
    fog.color.copy(bg);
    fog.density = 0.055 - 0.01 * L;

    POSTS.forEach((_, k) => {
      const s = st.stripe[k], c = st.cap[k];
      stripes[k].material.uniforms.uLevel.value = s.level;
      stripes[k].material.uniforms.uHead.value = s.head;
      bands[k].material.uniforms.uLevel.value = c.level;
      bands[k].material.uniforms.uHead.value = c.head;
      const yHead = LED_Y[0] + s.head * (LED_Y[1] - LED_Y[0]);
      ledLights[k].stripe.forEach(l => {
        const on = THREE.MathUtils.smoothstep(yHead, l.position.y - 0.25, l.position.y + 0.15);
        l.intensity = 0.16 * s.level * on;
      });
      ledLights[k].cap.intensity = 0.12 * c.level * Math.min(1, c.head * 1.5);
    });

    // Dust: drifts slowly, visible near lit LEDs and only while the room is dark.
    const dark = Math.max(0, 1 - L * 1.4);
    for (let i = 0; i < N; i++) {
      const q = seedA[i];
      const y = ((q.y + q.v * st.t) % 2.6 + 2.6) % 2.6;
      const x = q.x + q.a * Math.sin(q.ph + st.t * 0.5), z = q.z + q.a * Math.cos(q.ph * 1.3 + st.t * 0.4);
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      let lit = 0;
      POSTS.forEach((px, k) => {
        const s = st.stripe[k];
        const yHead = LED_Y[0] + s.head * (LED_Y[1] - LED_Y[0]);
        const dy = y > yHead ? (y - yHead) * 3 : 0;
        lit += s.level * Math.exp(-((x - px) ** 2 + (z - 0.15) ** 2) / 0.35 - dy * dy);
      });
      alpha[i] = dark * Math.min(1, lit) * (0.35 + 0.65 * Math.abs(Math.sin(q.ph + st.t * (0.6 + q.s))));
    }
    dg.attributes.position.needsUpdate = true;
    dg.attributes.alpha.needsUpdate = true;
  }

  return { scene, update, stripes, bands, nut };
}
