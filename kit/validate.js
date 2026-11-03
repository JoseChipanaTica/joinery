// kit/validate.js — the checks that decide whether the piece can be built.
// Returns {errors, warnings}. An error means: do not send this to a maker.
import { stockOf, PLANE } from './model.js';

const ERGO = {
  // mm. Ranges a maker would question if you leave them.
  'dining-table': { H: [720, 780], kneeClear: 600 },
  'coffee-table': { H: [380, 480] },
  'desk':         { H: [700, 760], kneeClear: 600 },
  'side-table':   { H: [500, 700] },
  'bench':        { H: [430, 480] },
  'chair':        { seatH: [420, 480], seatD: [380, 450] },
  'stool':        { seatH: [450, 760] },
  'bookshelf':    { shelfSpan: [0, 900], depth: [250, 400] },
  'sideboard':    { H: [750, 900], depth: [400, 500] },
  'nightstand':   { H: [500, 700] },
  'bed':          { H: [450, 650] },
};

const STOCK_T = [6, 9, 12, 15, 18, 19, 20, 22, 25, 30, 32, 38, 40, 44, 45, 50, 60, 70, 80, 90, 100];
const SHEET_MATERIALS = /ply|mdf|osb|chipboard|melamine/i;
const NON_WOOD = /glass|steel|brass|alu|cane/i;
const GAP_OK = { 'shelf-pin': 3, hinge: 4, runner: 14 };   // clearance the hardware bridges, mm

export function validate(piece) {
  const errors = [], warnings = [];
  const { parts, joints, steps, type } = piece;
  const pairKey = (a, b) => [a, b].sort().join('|');
  const joined = new Set(joints.map(j => pairKey(j.a, j.b)));

  // 1. Overlaps: two bodies may not share volume unless a joint connects them.
  for (let i = 0; i < parts.length; i++) for (let k = i + 1; k < parts.length; k++) {
    const a = parts[i], b = parts[k];
    const pen = overlap(a, b);
    if (pen > 0.5 && !joined.has(pairKey(a.id, b.id)))
      errors.push(`${a.id} passes through ${b.id} by ${pen.toFixed(1)} mm (no joint declared)`);
  }

  // 2. Joints: members must actually touch (gap ≤ 0.5 mm) at the declared face.
  const byId = Object.fromEntries(parts.map(p => [p.id, p]));
  for (const j of joints) {
    const a = byId[j.a], b = byId[j.b];
    const g = gap(a, b);
    if (g > (GAP_OK[j.type] ?? 0.5)) errors.push(`joint ${j.type} ${j.a}→${j.b}: parts do not touch (gap ${g.toFixed(1)} mm)`);
    if (j.type === 'mortise-tenon') {
      const f = a.features.find(x => x.type === 'tenon' && x.joint === j);
      const k = 'xyz'.indexOf(f.axis);
      if (f.len > b.size[k] - 6) errors.push(`tenon ${j.a}→${j.b} is ${f.len} mm, leg only ${b.size[k]} mm: would break through`);
      if (f.t < 6) warnings.push(`tenon ${j.a}→${j.b} is ${f.t} mm thick: fragile, consider dowels`);
    }
  }

  // 2b. Every part is joined to the rest: one connected piece, nothing held up by nothing.
  if (parts.length > 1) {
    const adj = {};
    for (const j of joints) { (adj[j.a] ??= []).push(j.b); (adj[j.b] ??= []).push(j.a); }
    const seenC = new Set([parts[0].id]), q = [parts[0].id];
    while (q.length) for (const n of adj[q.pop()] ?? []) if (!seenC.has(n)) { seenC.add(n); q.push(n); }
    const loose = parts.filter(p => !seenC.has(p.id)).map(p => p.id);
    if (loose.length) errors.push(`not joined to the rest of the piece: ${loose.join(', ')}`);
  }

  // 3. Every part is placed by a step; every step references real parts.
  for (const p of parts) if (!p.step) errors.push(`${p.id} is not placed in any assembly step`);
  for (const s of steps) for (const id of s.parts) if (!byId[id]) errors.push(`step ${s.index} references unknown part ${id}`);

  // 4. Floor: the lowest point sits on y = 0, nothing below it.
  const lo = piece.bounds.lo[1];
  if (Math.abs(lo) > 0.5) errors.push(`piece floats: lowest point at y = ${lo.toFixed(1)} mm (should be 0)`);

  // 5. Stock sanity: thickness should be a stock size, grain should run along length.
  const seen = new Set();
  for (const p of parts) {
    if (seen.has(p.name)) continue; seen.add(p.name);
    if (NON_WOOD.test(p.material)) continue;              // glass and metal are ordered cut to size
    const T = p.stock ? stockOf(p).T : Math.min(...p.size);
    const sheet = SHEET_MATERIALS.test(p.material);
    if (!STOCK_T.includes(T)) warnings.push(`${p.name}: ${T} mm is not a common stock thickness`);
    const ax = 'xyz'.indexOf(p.grain);
    if (!p.stock && p.size[ax] < Math.max(...p.size) * 0.5 && !sheet)
      warnings.push(`${p.name}: grain runs across the long dimension — short grain, will snap`);
    const wide = p.size.filter((_, i) => i !== ax).sort((a, b) => b - a)[0];
    if (wide > 300 && !sheet) {
      const mover = /button|figure-8|slot/;
      // held directly, or through a part (a wooden button) that is fixed to it and rides in a groove elsewhere
      const held = joints.some(j => (j.b === p.id || j.a === p.id) && mover.test(j.type))
        || joints.some(j => j.b === p.id && joints.some(k => k.a === j.a && mover.test(k.type)));
      if (!held) warnings.push(`${p.name}: ${wide} mm wide solid panel — allow for wood movement (buttons / figure-8s / slotted holes), do not glue it rigid`);
    }
  }

  // 6. Tenons that meet inside the same leg must be mitred or offset, or they collide.
  const tenonsInto = {};
  for (const p of parts) for (const f of p.features) if (f.type === 'tenon') (tenonsInto[f.joint.b] ??= []).push({ p, f });
  for (const [legId, list] of Object.entries(tenonsInto)) for (let i = 0; i < list.length; i++) for (let k = i + 1; k < list.length; k++) {
    const A = tenonBox(list[i]), B = tenonBox(list[k]);
    if (A && B && boxesOverlap(A, B)) {
      const mitred = list[i].f.joint.mitred && list[k].f.joint.mitred;
      (mitred ? warnings : errors).push(`tenons of ${list[i].p.id} and ${list[k].p.id} meet inside ${legId}${mitred ? ' — mitred ends, dry-fit to confirm clearance' : ': shorten, offset or mitre them (joint.mitred = true)'}`);
    }
  }

  // 7. Ergonomics for the furniture type.
  const e = ERGO[type];
  if (e) {
    const H = piece.bounds.hi[1];
    if (e.H && (H < e.H[0] || H > e.H[1])) warnings.push(`${type} height ${H} mm is outside the usual ${e.H[0]}–${e.H[1]} mm`);
    if (e.kneeClear) {
      const apron = parts.filter(p => /apron/i.test(p.role)).map(p => p.at[1] - p.size[1] / 2);
      if (apron.length) {
        const clear = Math.min(...apron);
        if (clear < e.kneeClear) warnings.push(`knee clearance under apron is ${clear} mm, usual minimum ${e.kneeClear} mm`);
      }
    }
  }
  return { errors, warnings, ok: errors.length === 0 };
}

function tenonBox({ p, f }) {
  const k = 'xyz'.indexOf(f.axis);
  const tAxis = [0, 1, 2].find(a => a !== k && a !== f.wAxis);
  const size = [0, 0, 0]; size[k] = f.len; size[f.wAxis] = f.w; size[tAxis] = f.t;
  const at = [...p.at]; at[k] += f.dir * (p.size[k] / 2 + f.len / 2);
  return { size, at };
}
function boxesOverlap(a, b) { return penetration(a, b) > 0.5; }

// Profile parts (bent corners, radiused glass) are tested on their real outline, not their bounding box:
// sample the shared area, and the deepest point inside both outlines gives the penetration.
function overlap(a, b) {
  const box = penetration(a, b);
  if (box <= 0.5 || (!a.profile && !b.profile)) return box;
  if (a.profile && b.profile && a.profile.axis !== b.profile.axis) return box;
  const axis = (a.profile ?? b.profile).axis, k = 'xyz'.indexOf(axis), [iu, iv] = PLANE[axis];
  const along = (a.size[k] + b.size[k]) / 2 - Math.abs(a.at[k] - b.at[k]);
  const A = outline(a, iu, iv), B = outline(b, iu, iv);
  const lo = [Math.max(A.lo[0], B.lo[0]), Math.max(A.lo[1], B.lo[1])], hi = [Math.min(A.hi[0], B.hi[0]), Math.min(A.hi[1], B.hi[1])];
  const w = hi[0] - lo[0], h = hi[1] - lo[1];
  const step = Math.max(0.05, Math.min(Math.max(0.5, Math.sqrt(w * h / 40000)), Math.min(w, h) / 8));   // finer across thin overlaps
  let deep = 0;
  for (let u = lo[0] + step / 2; u < hi[0]; u += step) for (let v = lo[1] + step / 2; v < hi[1]; v += step) {
    const da = depthIn(A.pts, u, v);
    if (da <= deep) continue;
    deep = Math.max(deep, Math.min(da, depthIn(B.pts, u, v)));
  }
  return deep > 0 ? Math.min(2 * deep + step, along, box) : 0;   // deepest shared point sits mid-way across the overlap
}
function outline(p, iu, iv) {
  const c = [p.at[iu], p.at[iv]], h = [p.size[iu] / 2, p.size[iv] / 2];
  const pts = p.profile ? p.profile.path.map(([u, v]) => [u + c[0], v + c[1]])
    : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([su, sv]) => [c[0] + su * h[0], c[1] + sv * h[1]]);
  return { pts, lo: [c[0] - h[0], c[1] - h[1]], hi: [c[0] + h[0], c[1] + h[1]] };
}
/** Distance from (x, y) to the outline's edge if inside it, else -1. */
function depthIn(pts, x, y) {
  let inside = false, d = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    const dx = xj - xi, dy = yj - yi, L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / L)) : 0;
    d = Math.min(d, Math.hypot(x - xi - t * dx, y - yi - t * dy));
  }
  return inside ? d : -1;
}

function penetration(a, b) {
  let pen = Infinity;
  for (let i = 0; i < 3; i++) {
    const d = (a.size[i] + b.size[i]) / 2 - Math.abs(a.at[i] - b.at[i]);
    if (d <= 0) return 0;
    pen = Math.min(pen, d);
  }
  return pen;
}
function gap(a, b) {
  let g = -Infinity;
  for (let i = 0; i < 3; i++) {
    const d = Math.abs(a.at[i] - b.at[i]) - (a.size[i] + b.size[i]) / 2;
    g = Math.max(g, d);
  }
  return g;
}

export function report({ errors, warnings }) {
  const out = [];
  for (const e of errors) out.push(`✗ ${e}`);
  for (const w of warnings) out.push(`! ${w}`);
  if (!out.length) out.push('✓ no issues');
  return out.join('\n');
}
