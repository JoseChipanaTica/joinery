// kit/stage.js — studio, lights, materials. Builds three.js meshes from model parts.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLANE } from './model.js';

export const MATERIALS = {
  // Base colours are sRGB of the finished (oiled) surface. Rings/streaks modulate them.
  'white-oak':  { name: 'White oak', base: '#cbb08a', dark: '#9d7f5b', ring: 0.9, streak: 0.5, rough: 0.55 },
  'red-oak':    { name: 'Red oak', base: '#c79a6c', dark: '#8f5f3a', ring: 1.0, streak: 0.6, rough: 0.55 },
  'walnut':     { name: 'Black walnut', base: '#6b4a33', dark: '#3d2a1c', ring: 0.8, streak: 0.7, rough: 0.5 },
  'maple':      { name: 'Hard maple', base: '#e6d2ad', dark: '#cdb58e', ring: 0.5, streak: 0.3, rough: 0.5 },
  'ash':        { name: 'Ash', base: '#dcc39b', dark: '#a98a60', ring: 1.1, streak: 0.5, rough: 0.55 },
  'beech':      { name: 'Beech', base: '#dcbc96', dark: '#b89470', ring: 0.5, streak: 0.4, rough: 0.5 },
  'pine':       { name: 'Pine', base: '#e4c48f', dark: '#b58a4e', ring: 1.2, streak: 0.4, rough: 0.6 },
  'cherry':     { name: 'Cherry', base: '#b06a45', dark: '#7d4428', ring: 0.6, streak: 0.5, rough: 0.5 },
  'birch-ply':  { name: 'Birch plywood 18 mm', base: '#e9d7b3', dark: '#cdb48a', ring: 0.3, streak: 0.6, rough: 0.6, ply: true },
  'mdf':        { name: 'MDF', base: '#b99a6f', dark: '#a98b62', ring: 0.0, streak: 0.1, rough: 0.8 },
  'steel':      { name: 'Steel', base: '#8a8d92', dark: '#6b6e73', ring: 0, streak: 0, rough: 0.45, metal: 0.9 },
  'brass':      { name: 'Brass', base: '#c9a24a', dark: '#a37f32', ring: 0, streak: 0, rough: 0.4, metal: 1.0 },
  'walnut-mdf':     { name: 'Walnut-veneered MDF', base: '#8c6440', dark: '#4a301c', ring: 0.55, streak: 1.1, rough: 0.5, ply: true },
  'walnut-bendply': { name: 'Bending ply, walnut-veneered', base: '#8c6440', dark: '#4a301c', ring: 0.55, streak: 1.1, rough: 0.5, ply: true },
  'mdf-black':  { name: 'MDF, painted matt black', base: '#24221f', dark: '#1b1a18', ring: 0, streak: 0.05, rough: 0.7 },
  'walnut-solid': { name: 'Black walnut, solid', base: '#8c6440', dark: '#4a301c', ring: 0.55, streak: 1.1, rough: 0.5 },
  'fret-mdf':   { name: 'Walnut-veneered MDF, fretwork', base: '#8c6440', dark: '#4a301c', ring: 0.4, streak: 0.8, rough: 0.5, fret: { pitch: 26, bar: 5, border: 8 } },
  'cane':       { name: 'Rattan cane webbing', base: '#b39a7c', dark: '#8d775c', ring: 0, streak: 0.5, rough: 0.85 },
  'steel-black': { name: 'Steel, matt black', base: '#242322', dark: '#1c1b1a', ring: 0, streak: 0, rough: 0.6, metal: 0.25 },
  'mdf-anthracite': { name: 'MDF, painted anthracite', base: '#3d3e3e', dark: '#363737', ring: 0, streak: 0.04, rough: 0.65 },
  'mdf-white':  { name: 'MDF, painted white', base: '#efe6d6', dark: '#e9dfcd', ring: 0, streak: 0.04, rough: 0.7, glow: 0.22 },
  'led':        { name: 'LED strip in aluminium profile', base: '#fff1d6', dark: '#fff1d6', ring: 0, streak: 0, rough: 0.3, glow: 2.2 },
  'glass':      { name: 'Toughened glass', base: '#a9bab4', dark: '#a9bab4', ring: 0, streak: 0, rough: 0.05, glass: 0.07 },
};

const WOOD_GLSL = /* glsl */`
uniform vec3 uBase; uniform vec3 uDark; uniform float uRing; uniform float uStreak;
uniform int uGrain; uniform float uSeed; uniform float uRough;
uniform vec4 uFret; uniform vec3 uHalf;   // fretwork: pitch, bar, solid border, thin axis (pitch 0 = solid)
varying vec3 vLocal;
bool fretHole(vec3 p){
  if (uFret.x <= 0.0) return false;
  int t = int(uFret.w);
  vec2 q = t==0 ? p.yz : (t==1 ? p.xz : p.xy);
  vec2 h = t==0 ? uHalf.yz : (t==1 ? uHalf.xz : uHalf.xy);
  if (abs(q.x) > h.x - uFret.z || abs(q.y) > h.y - uFret.z) return false;   // the tongue that sits in the groove
  float P = uFret.x, b = uFret.y * 0.5;
  float d1 = abs(fract((q.x + q.y) / P + 0.5) - 0.5) * P * 0.7071;
  float d2 = abs(fract((q.x - q.y) / P + 0.5) - 0.5) * P * 0.7071;
  float d3 = abs(fract(q.x / P + 0.5) - 0.5) * P;
  return d1 > b && d2 > b && d3 > b;
}
float hash3(vec3 p){ p = fract(p*0.3183099 + vec3(0.1,0.2,0.3)); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.1; a*=0.5; } return s; }
vec3 woodColor(vec3 p){
  // grain axis: rings are concentric around a line parallel to it, offset so the log centre is off the part
  vec3 g = uGrain==0 ? vec3(1,0,0) : (uGrain==1 ? vec3(0,1,0) : vec3(0,0,1));
  vec3 off = vec3(180.0, 260.0, 140.0) * (0.5 + 0.5*fract(uSeed*7.31));
  vec3 q = p + off;
  vec3 radial = q - g*dot(q,g);
  float r = length(radial);
  float wobble = fbm(q*0.006 + uSeed) * 40.0;         // ring wobble, mm
  float ring = fract((r + wobble) / 11.0);              // 11 mm ring spacing
  float late = smoothstep(0.55, 0.75, ring) * (1.0 - smoothstep(0.85, 1.0, ring)); // latewood band
  float streak = fbm(vec3(dot(q,g)*0.02, radial.x*0.35, radial.y*0.35) + uSeed*3.0);
  float t = clamp(late*uRing*0.42 + (streak-0.5)*uStreak*0.6, 0.0, 1.0);
  vec3 c = mix(uBase, uDark, t);
  // fine pores along the grain
  float pore = vnoise(vec3(dot(q,g)*0.6, radial.x*4.0, radial.y*4.0));
  c *= 0.94 + 0.06*pore;
  return c;
}`;

export function woodMaterial(key, grain, seed = 0, opts = {}) {
  const m = { ...(MATERIALS[key] ?? MATERIALS['white-oak']), ...(opts.look ?? {}) };   // a piece may retune a material's colours
  if (m.glass) {
    const g = new THREE.MeshPhysicalMaterial({ color: m.base, roughness: m.rough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05,
      envMapIntensity: 1.4, transparent: true, opacity: m.glass, depthWrite: false, side: THREE.DoubleSide });
    g.userData.baseOpacity = m.glass;   // live.js fades back to this, not to 1
    return g;
  }
  const mat = new THREE.MeshPhysicalMaterial({
    color: m.base, roughness: m.rough, metalness: m.metal ?? 0,
    clearcoat: m.metal ? 0 : (m.clearcoat ?? 0.15), clearcoatRoughness: 0.5, envMapIntensity: m.env ?? 0.6,   // an oiled, matt finish: clearcoat 0, env lower
    transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
  });
  if (m.glow) { mat.emissive = new THREE.Color(m.base); mat.emissiveIntensity = m.glow; }
  if (m.metal) return mat;
  const f = m.fret, half = opts.half ?? [1, 1, 1];
  const u = {
    uFret: { value: new THREE.Vector4(f?.pitch ?? 0, f?.bar ?? 0, f?.border ?? 0, opts.thin ?? 2) },
    uHalf: { value: new THREE.Vector3(...half) },
    uBase: { value: new THREE.Color(m.base).convertSRGBToLinear() },
    uDark: { value: new THREE.Color(m.dark).convertSRGBToLinear() },
    uRing: { value: m.ring }, uStreak: { value: m.streak },
    uGrain: { value: 'xyz'.indexOf(grain) }, uSeed: { value: seed }, uRough: { value: m.rough },
  };
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + WOOD_GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\n if (fretHole(vLocal)) discard;\n diffuseColor.rgb = woodColor(vLocal);')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = uRough + 0.08*(fbm(vLocal*0.05+uSeed)-0.5);');
  };
  mat.customProgramCacheKey = () => 'wood';
  return mat;
}

/** Build a group per part: body (rounded box) + joinery features. Returns Map id → group. */
export function buildParts(piece) {
  const meshes = new Map();
  piece.parts.forEach((p, i) => {
    const g = new THREE.Group();
    g.name = p.id;
    const r = p.edge?.size ?? 1.5;
    const geo = p.profile ? profileGeometry(p) : new RoundedBoxGeometry(p.size[0], p.size[1], p.size[2], 3, Math.min(r, Math.min(...p.size) / 3));
    const glass = !!MATERIALS[p.material]?.glass;
    const look = piece.materials?.[p.material], thin = p.size.indexOf(Math.min(...p.size));
    const body = new THREE.Mesh(geo, woodMaterial(p.material, p.grain, i * 1.37 + 0.5, { look, thin, half: p.size.map(v => v / 2) }));
    body.castShadow = body.receiveShadow = !glass;
    body.userData.part = p;
    g.add(body);
    if (glass) // glass reads by its polished edges on a pale ground
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), new THREE.LineBasicMaterial({ color: '#3f5a54', transparent: true, opacity: 0.6 })));
    for (const f of p.features) {
      const fm = featureMesh(f, p, i, piece);
      if (fm) g.add(fm);
    }
    g.position.set(...p.at);
    g.userData.part = p;
    meshes.set(p.id, g);
  });
  return meshes;
}

/** A profile part: its outline extruded through its bounding box along profile.axis. */
function profileGeometry(p) {
  const { axis, path } = p.profile;
  const k = 'xyz'.indexOf(axis);
  const shape = new THREE.Shape(path.map(([u, v]) => new THREE.Vector2(u, v)));
  let geo = new THREE.ExtrudeGeometry(shape, { depth: p.size[k], bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -p.size[k] / 2);
  const tp = p.profile.taper;   // {to, end}: the section shrinks to `to` × its size at the −1 or +1 end (a tapered leg)
  if (tp) {
    const pos = geo.attributes.position, d = p.size[k];
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getZ(i) + d / 2) / d, f = tp.end < 0 ? tp.to + (1 - tp.to) * t : 1 - (1 - tp.to) * t;
      pos.setXY(i, pos.getX(i) * f, pos.getY(i) * f);
    }
    geo.computeVertexNormals();
  }
  // shape x → u axis, shape y → v axis, extrusion → axis (PLANE is cyclic, so this is a pure rotation)
  const [iu, iv] = PLANE[axis];
  const e = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  e[iu][0] = 1; e[iv][1] = 1; e[k][2] = 1;
  geo.applyMatrix4(new THREE.Matrix4().set(...e[0], 0, ...e[1], 0, ...e[2], 0, 0, 0, 0, 1));
  geo = toCreasedNormals(geo, Math.PI / 5);   // smooth round the curve, crisp at the faces
  return geo;
}

function featureMesh(f, p, i, piece = {}) {
  const k = 'xyz'.indexOf(f.axis);
  if (f.type === 'tenon') {
    // a box protruding from the part's end, into the partner
    const size = [0, 0, 0];
    size[k] = f.len + 0.2;                       // slight overlap hides the seam
    const tAxis = [0, 1, 2].find(a => a !== k && a !== f.wAxis);
    size[f.wAxis] = f.w; size[tAxis] = f.t;
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), woodMaterial(p.material, p.grain, i * 1.37 + 0.5));
    const pos = [0, 0, 0]; pos[k] = f.dir * (p.size[k] / 2 + f.len / 2 - 0.1);
    m.position.set(...pos); m.castShadow = true; m.userData.feature = f;
    return m;
  }
  if (f.type === 'mortise') {
    // drawn as a dark inlay on the face where the tenon enters (the real cut is in the drawings)
    const size = [0, 0, 0];
    size[k] = 0.6;
    const tAxis = [0, 1, 2].find(a => a !== k && a !== f.wAxis);
    size[f.wAxis] = f.w; size[tAxis] = f.t;
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color: 0x1a140e, roughness: 1 }));
    const pos = [...f.at]; pos[k] = f.dir * (p.size[k] / 2 + 0.3);
    m.position.set(...pos); m.userData.feature = f;
    return m;
  }
  if (f.type === 'dowel') {
    const g = new THREE.Group();
    const wAx = f.wAx ?? [0, 1, 2].filter(a => a !== k).sort((a, b) => p.size[b] - p.size[a])[0];
    for (let n = 0; n < f.n; n++) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(f.d / 2, f.d / 2, f.len, 16), woodMaterial('beech', 'y', n + 9));
      c.rotation.set(k === 1 ? 0 : k === 0 ? 0 : Math.PI / 2, 0, k === 0 ? Math.PI / 2 : 0);
      const pos = [0, 0, 0];
      pos[k] = f.dir * (p.size[k] / 2 + f.len / 2 - f.len / 2);
      pos[wAx] = (n - (f.n - 1) / 2) * (f.pitch ?? p.size[wAx] / (f.n + 1) * 1.2);
      c.position.set(...pos); g.add(c);
    }
    return g;
  }
  if (f.type === 'dowel-hole') {
    const g = new THREE.Group();
    const wAx = f.wAx ?? [0, 1, 2].filter(a => a !== k).sort((a, b) => p.size[b] - p.size[a])[0];
    for (let n = 0; n < f.n; n++) {
      const c = new THREE.Mesh(new THREE.CircleGeometry(f.d / 2, 16), new THREE.MeshStandardMaterial({ color: 0x1a140e, roughness: 1 }));
      const pos = [...f.at]; pos[k] = f.dir * (p.size[k] / 2 + 0.3);
      const fromAx = f.from; // partner id, unused here
      // spread along the partner's long axis across our face
      const spreadAx = [0, 1, 2].find(a => a !== k && a !== wAx) ?? wAx;
      pos[wAx] = (f.at[wAx] ?? 0) + (n - (f.n - 1) / 2) * (f.pitch ?? 30);
      c.position.set(...pos); c.lookAt(c.position.clone().add(new THREE.Vector3(...[k === 0 ? f.dir : 0, k === 1 ? f.dir : 0, k === 2 ? f.dir : 0])));
      g.add(c);
    }
    return g;
  }
  if (f.type === 'pin-hole') {
    // the shelf pin itself, standing out of the face it is drilled into
    const out = 9;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(f.d / 2, f.d / 2, out, 12), woodMaterial('brass', 'y'));
    const pos = [...f.at]; pos[k] = f.dir * (p.size[k] / 2 + out / 2);
    c.rotation.set(k === 2 ? Math.PI / 2 : 0, 0, k === 0 ? Math.PI / 2 : 0);
    c.position.set(...pos); c.castShadow = true; c.userData.feature = f;
    return c;
  }
  if (f.type === 'fitting') {
    // bought hardware on the part: a pull, a hook, an LED profile
    const m = new THREE.Mesh(new RoundedBoxGeometry(...f.size, 2, Math.min(2, Math.min(...f.size) / 3)), woodMaterial(f.material ?? 'steel', p.grain, i * 1.37 + 0.5, { look: piece.materials?.[f.material] }));
    m.position.set(...f.at); m.castShadow = !MATERIALS[f.material]?.glow; m.userData.feature = f;
    return m;
  }
  if (f.type === 'hinge-plate') {
    // clamp hinge body on the inside face, just behind the glass it grips
    const size = [30, 48, 30]; size[k] = 16;
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), woodMaterial('steel', 'y'));
    const pos = [...f.at]; pos[k] = f.dir * (p.size[k] / 2 + size[k] / 2);
    m.position.set(...pos); m.castShadow = true; m.userData.feature = f;
    return m;
  }
  return null;
}

export function makeStage(renderer, piece) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f3f0ea');
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const hemi = new THREE.HemisphereLight('#ffffff', '#cfc6b8', 0.6);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff4e6', 2.2);
  const S = Math.max(...piece.bounds.size);
  key.position.set(S * 0.6, S * 1.8, S * 0.7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = key.shadow.camera.bottom = -S;
  key.shadow.camera.right = key.shadow.camera.top = S;
  key.shadow.camera.near = 10; key.shadow.camera.far = S * 5;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 2;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#dfe8f5', 0.6);
  fill.position.set(-S, S * 0.6, -S * 0.5);
  scene.add(fill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(S * 8, S * 8), new THREE.ShadowMaterial({ opacity: 0.16 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  floor.material.polygonOffset = true; floor.material.polygonOffsetFactor = 1;
  scene.add(floor);

  return { scene, key, floor };
}
