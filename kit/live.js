// kit/live.js — the page you drive. One piece, assembled in the middle, panels around it.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { makeStage, buildParts, MATERIALS } from './stage.js';
import { cutList } from './cutlist.js';
import { stockOf } from './model.js';

export const CSS = `
:root{--ink:#1d1d1b;--dim:#7a7a76;--accent:#c8511c;--paper:#fbf9f4;--line:#e3ded2;--panel:#ffffffd9}
*{box-sizing:border-box}html,body{margin:0;height:100%;background:#f3f0ea;color:var(--ink);font:13px/1.45 Inter,Helvetica,Arial,sans-serif;overflow:hidden}
#c{position:absolute;inset:0;width:100%;height:100%;display:block}
#ui{position:absolute;top:16px;right:16px;bottom:16px;width:330px;display:flex;flex-direction:column;gap:10px;pointer-events:none}
.card{background:var(--panel);backdrop-filter:blur(8px);border:1px solid var(--line);border-radius:10px;padding:12px 14px;pointer-events:auto;box-shadow:0 6px 24px #0000000d}
h1{font-size:16px;margin:0;letter-spacing:-.01em}.sub{color:var(--dim);margin:2px 0 0;font-size:12px}
.row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
button{font:inherit;border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:7px;padding:5px 10px;cursor:pointer}
button:hover{border-color:var(--ink)}button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
button.acc{background:var(--accent);color:#fff;border-color:var(--accent)}
input[type=range]{width:100%;accent-color:var(--accent)}
label{font-size:11px;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;display:block;margin:0 0 4px}
.tabs{display:flex;gap:2px;border-bottom:1px solid var(--line);margin:0 -14px 8px;padding:0 10px}
.tabs button{border:0;border-bottom:2px solid transparent;border-radius:0;background:none;padding:6px 8px;color:var(--dim)}.tabs button.on{color:var(--ink);border-bottom-color:var(--accent)}
#list{overflow:auto;flex:1;min-height:0}
.part{display:flex;justify-content:space-between;gap:8px;padding:6px 4px;border-bottom:1px solid var(--line);cursor:pointer;border-radius:4px}
.part:hover{background:#f6f2ea}.part.on{background:#fff0e6}.part .d{color:var(--dim);font-variant-numeric:tabular-nums;white-space:nowrap}
.part .tag{font-size:10px;color:var(--accent);background:#ffe9db;border-radius:8px;padding:0 6px;margin-left:4px}
.step{font-size:14px;font-weight:600;margin:6px 0 2px}.note{color:#444;font-size:12px}
.k{display:inline-block;min-width:20px;height:20px;line-height:20px;text-align:center;border-radius:10px;background:var(--ink);color:#fff;font-size:11px;margin-right:6px}
.hud{position:absolute;left:16px;top:16px;pointer-events:none}
.hud .lab{display:inline-block;background:#fff;border:1px solid var(--line);border-radius:7px;padding:5px 10px;font-size:12px;color:var(--dim)}
.hud .lab b{color:var(--ink)}
#tour{position:absolute;left:16px;bottom:16px;font-size:11px;color:var(--dim);background:#fff;border:1px solid var(--line);border-radius:7px;padding:4px 10px;display:none}
@media (max-width:900px){#ui{top:auto;left:16px;right:16px;width:auto;height:min(46%,420px);gap:8px;overflow:auto}#ui .card{padding:10px 12px}#ui>.card:last-child{flex:none!important;min-height:240px}#list{max-height:190px}#tour{bottom:auto;top:48px}}
`;

export function runFurniture(piece, { el = document.body } = {}) {
  const q = new URLSearchParams(location.search);
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const { scene } = makeStage(renderer, piece);
  const meshes = buildParts(piece);
  const root = new THREE.Group(); scene.add(root);
  for (const g of meshes.values()) root.add(g);

  const B = piece.bounds, S = Math.max(...B.size);
  const centre = new THREE.Vector3((B.lo[0] + B.hi[0]) / 2, (B.lo[1] + B.hi[1]) / 2, (B.lo[2] + B.hi[2]) / 2);
  const camera = new THREE.PerspectiveCamera(32, 1, 10, S * 20);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(centre); controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;

  const VIEWS = {
    iso: [1.5, 1.0, 1.9], front: [0, 0.35, 2.6], side: [2.6, 0.35, 0], back: [-1.4, 0.8, -1.9], top: [0.01, 2.6, 0.01], under: [1.2, 0.35, 1.6],
  };
  const R = Math.hypot(...B.size) / 2;                 // bounding sphere of the assembled piece
  const PANEL_W = 346;                                  // CSS px the right panel covers
  const room = { u: 1, v: 1 };                          // share of the view the piece may use, across and down
  function fitDistance(explode = state.explode, dir = camera.position.clone().sub(controls.target).normalize()) {
    const fov = THREE.MathUtils.degToRad(camera.fov) / 2;
    const hfov = Math.atan(Math.tan(fov) * camera.aspect);
    const sphere = (R + explode * EXP * 0.9) / Math.sin(Math.min(fov, hfov)) * 0.92;
    // tall or deep pieces fill the sphere's frame edge to edge: also fit the (exploded) bounding box with a margin
    const margin = 1 - 0.14;
    const tanV = Math.tan(fov) * room.v * margin;
    const tanH = Math.tan(fov) * camera.aspect * room.u * margin;
    const right = new THREE.Vector3().crossVectors(dir.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, dir.clone().negate());
    let fit = 0;
    const o = new THREE.Vector3();
    for (const p of piece.parts) for (let c = 0; c < 8; c++) {
      for (let a = 0; a < 3; a++) o.setComponent(a, p.at[a] + p.explode[a] * explode * EXP + ((c >> a) & 1 ? 0.5 : -0.5) * p.size[a] - centre.getComponent(a));
      fit = Math.max(fit, o.dot(dir) + Math.abs(o.dot(right)) / tanH, o.dot(dir) + Math.abs(o.dot(up)) / tanV);
    }
    return Math.max(sphere, fit);
  }
  function setView(name, instant = false) {
    const v = VIEWS[name] ?? VIEWS.iso;
    const dir = new THREE.Vector3(v[0], v[1], v[2]).normalize();
    const to = dir.clone().multiplyScalar(fitDistance(state.explode, dir)).add(centre);
    if (name === 'under') to.y = 300;
    if (instant || snap) camera.position.copy(to); else camTween = { from: camera.position.clone(), to, t: 0 };
    state.view = name;
    for (const b of ui.views.children) b.classList.toggle('on', b.dataset.v === name);
  }
  function refit() { // keep the direction, change the distance so the exploded piece still fits
    const dir = camera.position.clone().sub(controls.target).normalize();
    const to = dir.multiplyScalar(fitDistance()).add(controls.target);
    if (snap) camera.position.copy(to); else camTween = { from: camera.position.clone(), to, t: 0 };
  }
  let camTween = null;
  // capture mode (any state in the URL): no animation, every frame is the settled state
  const snap = ['step', 'explode', 'iso', 'view', 'xray'].some(k => q.has(k));

  // ---- state
  const state = {
    explode: +(q.get('explode') ?? 0), step: +(q.get('step') ?? 0), isolate: q.get('iso') ?? null,
    view: q.get('view') ?? 'iso', showPanel: q.get('panel') !== '0', xray: q.get('xray') === '1',
  };
  const nSteps = piece.steps.length;
  const EXP = S * 0.45;
  const stepT = new Map(); // id → 0..1 progress of entering current step

  // ---- UI
  const ui = {};
  const uiEl = document.createElement('div'); uiEl.id = 'ui';
  const rows = cutList(piece);
  const byId = Object.fromEntries(piece.parts.map(p => [p.id, p]));
  uiEl.innerHTML = `
  <div class="card"><h1>${piece.name}</h1><p class="sub">${Math.round(B.size[0])} × ${Math.round(B.size[2])} × ${Math.round(B.size[1])} mm · ${piece.parts.length} parts · ${rows.length} cuts</p>
    <div class="row" style="margin-top:8px" id="views">${Object.keys(VIEWS).map(v => `<button data-v="${v}">${v}</button>`).join('')}<button id="xray" title="see joinery inside the legs">x-ray</button></div></div>
  <div class="card"><label>Explode</label><input type="range" id="explode" min="0" max="1" step="0.01" value="${state.explode}">
    <label style="margin-top:8px">Assembly</label><div class="row"><button id="prev">‹</button><button id="next" class="acc">next step ›</button><button id="all">assembled</button></div>
    <div id="stepinfo"></div></div>
  <div class="card" style="flex:1;display:flex;flex-direction:column;min-height:0"><div class="tabs"><button class="on" data-t="parts">Parts</button><button data-t="cuts">Cut list</button><button data-t="hw">Hardware</button></div>
    <div id="list"></div></div>`;
  el.appendChild(uiEl);
  const hud = document.createElement('div'); hud.className = 'hud'; hud.innerHTML = `<span class="lab" id="hudlab"></span>`; el.appendChild(hud);
  const tour = document.createElement('div'); tour.id = 'tour'; tour.textContent = 'auto tour · touch anything to take over'; el.appendChild(tour);
  ui.views = uiEl.querySelector('#views'); ui.explode = uiEl.querySelector('#explode'); ui.stepinfo = uiEl.querySelector('#stepinfo'); ui.list = uiEl.querySelector('#list');
  if (!state.showPanel) { uiEl.style.display = 'none'; hud.style.display = 'none'; }

  ui.views.addEventListener('click', e => { const v = e.target.dataset.v; if (v) { takeOver(); setView(v); } if (e.target.id === 'xray') { takeOver(); state.xray = !state.xray; e.target.classList.toggle('on', state.xray); applyXray(); } });
  ui.explode.addEventListener('input', () => { takeOver(); state.explode = +ui.explode.value; });
  ui.explode.addEventListener('change', () => refit());
  uiEl.querySelector('#prev').onclick = () => { takeOver(); setStep(Math.max(0, (state.step || nSteps + 1) - 1)); };
  uiEl.querySelector('#next').onclick = () => { takeOver(); setStep(state.step >= nSteps ? 0 : state.step + 1); };
  uiEl.querySelector('#all').onclick = () => { takeOver(); setStep(0); };
  uiEl.querySelector('.tabs').addEventListener('click', e => { const t = e.target.dataset.t; if (!t) return; for (const b of e.currentTarget.children) b.classList.toggle('on', b === e.target); renderList(t); });

  function renderList(tab = 'parts') {
    const L = ui.list;
    if (tab === 'parts') {
      L.innerHTML = piece.parts.map(p => { const s = stockOf(p); return `<div class="part ${state.isolate === p.id ? 'on' : ''}" data-id="${p.id}"><span>${p.name}${p.inferred ? '<span class="tag">inferred</span>' : ''}<br><span class="d">${p.id}${p.step ? ` · step ${p.step}` : ''}</span></span><span class="d">${s.L}×${s.W}×${s.T}</span></div>`; }).join('');
      L.onclick = e => { const id = e.target.closest('.part')?.dataset.id; if (!id) return; takeOver(); state.isolate = state.isolate === id ? null : id; renderList('parts'); };
      L.onmouseover = e => { const id = e.target.closest('.part')?.dataset.id; hover = id ?? null; };
      L.onmouseleave = () => { hover = null; };
    } else if (tab === 'cuts') {
      L.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">${rows.map((r, i) => `<tr><td style="padding:5px 4px;border-bottom:1px solid var(--line)"><span class="k">${i + 1}</span>${r.name}<br><span class="d" style="color:var(--dim)">${r.joinery || ''}</span></td><td style="text-align:right;padding:5px 4px;border-bottom:1px solid var(--line);white-space:nowrap">${r.qty} × ${r.L}×${r.W}×${r.T}</td></tr>`).join('')}</table>`;
      L.onclick = null;
    } else {
      L.innerHTML = piece.hardware.length ? `<ul style="padding-left:18px;margin:4px 0">${piece.hardware.map(h => `<li>${h.qty}× ${h.name}${h.note ? ` <span style="color:var(--dim)">— ${h.note}</span>` : ''}</li>`).join('')}</ul>` : '<p class="note">No hardware — all-wood joinery.</p>';
      L.onclick = null;
    }
  }
  let hover = null;
  renderList();

  function setStep(n) {
    state.step = n;
    for (const p of piece.parts) if (p.step === n) stepT.set(p.id, 0);
    const s = piece.steps[n - 1];
    ui.stepinfo.innerHTML = n ? `<div class="step"><span class="k">${n}</span>${s.title}</div><div class="note">${s.note ?? ''}</div>` : `<div class="note">Fully assembled. Step through to see the build order; drag the slider to explode.</div>`;
    uiEl.querySelector('#next').textContent = n >= nSteps ? 'start over' : n === 0 ? 'first step ›' : 'next step ›';
    if (s?.view && !q.has('view')) setView(s.view);
  }
  function applyXray() {
    for (const [id, g] of meshes) {
      const p = byId[id];
      const isHost = p.features.some(f => /^(mortise|dowel-hole|dado|rebate|groove|pin-hole|hinge-plate|runner)$/.test(f.type));
      const mat = g.children[0].material, base = mat.userData.baseOpacity ?? 1;
      g.userData.xhost = state.xray && isHost;
      mat.transparent = g.userData.xhost || base < 1; mat.opacity = g.userData.xhost ? 0.28 : base;
      mat.depthWrite = !mat.transparent;
      mat.needsUpdate = true;
    }
  }

  // ---- auto tour: idle hands → the page tours itself
  let lastInput = performance.now(), touring = false, tourClock = 0, tourPhase = 0;
  const IDLE = 20000;
  function takeOver() { lastInput = performance.now(); if (touring) { touring = false; tour.style.display = 'none'; } }
  for (const ev of ['pointerdown', 'wheel', 'keydown']) window.addEventListener(ev, takeOver, { passive: true });
  if (q.has('step') || q.has('explode') || q.has('iso') || q.has('view')) lastInput = Infinity; // capture mode: never tour
  const SCRIPT = [ // (seconds, action)
    [0, () => { setStep(0); state.explode = 0; setView('iso'); }],
    [2.5, () => { state.explode = 1; }],
    [6, () => { state.explode = 0; }],
    ...piece.steps.map((s, i) => [8.5 + i * 3.2, () => setStep(i + 1)]),
    [8.5 + nSteps * 3.2 + 1, () => { setStep(0); setView('front'); }],
    [8.5 + nSteps * 3.2 + 4, () => { setView('under'); state.xray = true; applyXray(); }],
    [8.5 + nSteps * 3.2 + 8, () => { state.xray = false; applyXray(); setView('iso'); }],
  ];
  const TOUR_LEN = SCRIPT[SCRIPT.length - 1][0] + 4;

  // ---- frame
  const tmp = new THREE.Vector3();
  function resize() {
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    room.u = room.v = 1;
    // shift the frustum so the piece is centred in the space the panel leaves: beside it on a wide screen, above it on a narrow one
    if (state.showPanel && w > 900) { camera.setViewOffset(w + PANEL_W, h, PANEL_W, 0, w, h); room.u = 1 - 2 * PANEL_W / (w + PANEL_W); }
    else if (state.showPanel) { // centre between the label at the top (T) and the sheet at the bottom (P)
      const P = uiEl.offsetHeight + 16, T = Math.min(P, hud.offsetTop + hud.offsetHeight + 8);
      camera.setViewOffset(w, h + P - T, 0, P - T, w, h); room.v = (h - P - T) / (h + P - T);
    }
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', () => { resize(); refit(); }); resize();
  setView(state.view, true); setStep(state.step); applyXray();
  if (q.get('iso')) renderList('parts');
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // tour
    if (!touring && now - lastInput > IDLE) { touring = true; tourClock = 0; tourPhase = 0; tour.style.display = 'block'; }
    if (touring) {
      tourClock += dt;
      while (tourPhase < SCRIPT.length && tourClock >= SCRIPT[tourPhase][0]) { SCRIPT[tourPhase][1](); tourPhase++; }
      if (tourClock > TOUR_LEN) { tourClock = 0; tourPhase = 0; }
      controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
    } else controls.autoRotate = false;
    ui.explode.value = state.explode;
    if (camTween) { camTween.t = Math.min(1, camTween.t + dt / 0.9); const e = 1 - Math.pow(1 - camTween.t, 3); camera.position.lerpVectors(camTween.from, camTween.to, e); if (camTween.t >= 1) camTween = null; }
    controls.update();
    // parts
    for (const [id, g] of meshes) {
      const p = byId[id];
      const inStep = !state.step || (p.step ?? 0) <= state.step;
      g.visible = inStep;
      if (!inStep) continue;
      let ex = state.explode;
      if (state.step && p.step === state.step && !snap) { // entering: slide in from explode offset
        let t = stepT.get(id) ?? 1; t = Math.min(1, t + dt / 0.9); stepT.set(id, t);
        const e = 1 - Math.pow(1 - t, 3);
        ex = Math.max(ex, 0.6 * (1 - e));
      }
      tmp.set(p.at[0] + p.explode[0] * ex * EXP, p.at[1] + p.explode[1] * ex * EXP, p.at[2] + p.explode[2] * ex * EXP);
      if (snap) g.position.copy(tmp); else g.position.lerp(tmp, 1 - Math.pow(0.001, dt));
      const body = g.children[0];
      const dim = (state.isolate && state.isolate !== id) || (hover && hover !== id);
      const base = body.material.userData.baseOpacity ?? 1;   // glass rests below 1
      const target = dim ? Math.min(0.12, base) : (g.userData.xhost ? 0.28 : base);
      if (dim || body.material.opacity !== base || target !== base) {
        body.material.transparent = target < 1; body.material.opacity = snap ? target : body.material.opacity + (target - body.material.opacity) * Math.min(1, dt * 10);
        body.material.depthWrite = body.material.opacity > 0.5;
        for (const c of g.children.slice(1)) { c.visible = !dim; }
      }
    }
    const lab = state.isolate ? `<b>${byId[state.isolate].name}</b> — ${(() => { const s = stockOf(byId[state.isolate]); return `${s.L} × ${s.W} × ${s.T} mm`; })()}`
      : state.step ? `step <b>${state.step}/${nSteps}</b> — ${piece.steps[state.step - 1].title}` : state.explode > 0.02 ? `exploded <b>${Math.round(state.explode * 100)}%</b>` : `<b>assembled</b> — ${piece.materials[piece.params.material]?.name ?? MATERIALS[piece.params.material]?.name ?? MATERIALS[piece.parts[0].material]?.name ?? ''}`;
    document.getElementById('hudlab').innerHTML = lab;
    renderer.render(scene, camera);
    window.__ready = true;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { scene, camera, renderer, state, setStep, setView };
}
