// kit/model.js — the pure model layer. No three.js in here.
// A piece of furniture is a function of its parameter block P.
// Everything downstream (render, cut list, drawings, manual) reads the same
// objects this file returns, so nothing can disagree with anything else.
//
// Axes: x = length (left→right), y = up (floor at y = 0), z = depth (back→front).
// Units: millimetres. Every part is an axis-aligned box in its assembled pose.

/** Create a box part.
 *  size: [sx, sy, sz] in world axes.  at: centre [x, y, z] in assembled pose.
 *  grain: 'x' | 'y' | 'z' — the axis the wood grain runs along (= stock length).
 */
export function box(id, name, size, at, opts = {}) {
  return {
    id, name,
    role: opts.role ?? name,
    size: [...size], at: [...at],
    grain: opts.grain ?? longestAxis(size),
    material: opts.material ?? 'wood',
    edge: opts.edge ?? null,          // {type:'roundover'|'chamfer', size:mm}
    explode: opts.explode ?? null,    // unit vector; default: away from centre
    features: (opts.fittings ?? []).map(f => ({ type: 'fitting', ...f })), // joinery adds tenons, mortises, holes; fittings are bought hardware drawn on the part
    note: opts.note ?? '',
    inferred: opts.inferred ?? false, // true = not visible in the photo, assumed
    profile: opts.profile ?? null,    // {axis, path:[[u,v]…], note} — real outline across `axis`, centred on `at`; size is its bounding box
    stock: opts.stock ?? null,        // {L, W, T, layers, layerT} when the bounding box is not the stock (bent laminations)
  };
}

/** The two in-plane axes [u, v] of a profile extruded along each axis. Cyclic, so u × v = axis. */
export const PLANE = { x: [1, 2], y: [2, 0], z: [0, 1] };

/** Outline of a quarter ring (a bent corner), centred on its R × R bounding box.
 *  R: outside radius, t: wall, [su, sv]: the quadrant the corner turns toward. */
export function quarterRing(R, t, [su, sv], n = 32) {
  const cu = -su * R / 2, cv = -sv * R / 2;          // arc centre: the inner corner of the bounding box
  const a0 = su > 0 ? 0 : Math.PI, a1 = a0 + su * sv * Math.PI / 2;
  const pt = (r, a) => [cu + r * Math.cos(a), cv + r * Math.sin(a)];
  const out = [], inn = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push(pt(R, a)); inn.push(pt(R - t, a)); }
  return [...out, ...inn.reverse()];
}

/** Outline of a circle of diameter d, centred (a round leg; add profile.taper to taper it). */
export function circle(d, n = 40) {
  return Array.from({ length: n }, (_, i) => [d / 2 * Math.cos(2 * Math.PI * i / n), d / 2 * Math.sin(2 * Math.PI * i / n)]);
}

/** Outline of a w × h rectangle, centred, with corner radii [+u+v, −u+v, −u−v, +u−v] (or one number). */
export function roundedRect(w, h, r, n = 16) {
  const rs = Array.isArray(r) ? r : [r, r, r, r];
  const pts = [];
  [[1, 1], [-1, 1], [-1, -1], [1, -1]].forEach(([su, sv], i) => {
    const R = rs[i];
    if (R <= 0) { pts.push([su * w / 2, sv * h / 2]); return; }
    const cu = su * (w / 2 - R), cv = sv * (h / 2 - R);
    for (let k = 0; k <= n; k++) { const a = (i + k / n) * Math.PI / 2; pts.push([cu + R * Math.cos(a), cv + R * Math.sin(a)]); }
  });
  return pts;
}

export function longestAxis(size) {
  const i = size.indexOf(Math.max(...size));
  return 'xyz'[i];
}

/** Stock the maker cuts for a part: L along grain, W the larger of the rest, T the smaller. */
export function stockOf(part) {
  if (part.stock) { const s = part.stock; return { L: s.L, W: s.W, T: s.T, tenons: 0, layers: s.layers ?? 1, layerT: s.layerT ?? s.T }; }
  const ax = 'xyz'.indexOf(part.grain);
  const L = part.size[ax];
  const rest = part.size.filter((_, i) => i !== ax).sort((a, b) => b - a);
  let extra = 0;
  for (const f of part.features) if (f.type === 'tenon') extra += f.len;
  return { L: L + extra, W: rest[0], T: rest[1], tenons: extra, layers: 1, layerT: rest[1] };
}

const AX = { x: 0, y: 1, z: 2 };

/** Apply joints to parts: generates tenon/mortise/dowel/pocket features on both members.
 *  joint: {a, b, type, face?} where a is the member that carries the tenon / screws,
 *  b the member that receives it. face is the axis along which a meets b ('x'|'y'|'z');
 *  if omitted it is a's grain axis (end-grain joint). */
export function applyJoinery(parts, joints, P = {}) {
  const byId = Object.fromEntries(parts.map(p => [p.id, p]));
  for (const j of joints) {
    const a = byId[j.a], b = byId[j.b];
    if (!a || !b) throw new Error(`joint references unknown part: ${j.a} / ${j.b}`);
    const axis = j.face ?? a.grain;
    const k = AX[axis];
    const dir = Math.sign(b.at[k] - a.at[k]) || 1;         // which end of a touches b
    const aT = Math.min(...a.size.filter((_, i) => i !== k)); // a's thickness across the joint
    switch (j.type) {
      case 'mortise-tenon': {
        const t = j.tenonT ?? Math.round(aT / 3);           // rule of thirds
        const len = j.tenonLen ?? Math.min(30, Math.round(b.size[k] * 0.6));
        const shoulder = j.shoulder ?? 10;
        const wAxis = 'xyz'.indexOf(a.grain === axis ? tallerAxis(a, k) : a.grain);
        const w = a.size[wAxis] - 2 * shoulder;
        a.features.push({ type: 'tenon', axis, dir, len, t, w, wAxis, joint: j });
        b.features.push({ type: 'mortise', axis, dir: -dir, len, t, w, wAxis, from: a.id, at: offsetOnB(a, b, k), joint: j });
        break;
      }
      case 'dowel': {
        const n = j.count ?? 2, d = j.d ?? 8, len = j.len ?? 40;
        // spread across a's widest face; dowel and hole share the pitch so they line up
        const wAx = [0, 1, 2].filter(i => i !== k).sort((p, q) => a.size[q] - a.size[p])[0];
        const pitch = a.size[wAx] / (n + 1) * 1.2;
        a.features.push({ type: 'dowel', axis, dir, n, d, len, wAx, pitch, joint: j });
        b.features.push({ type: 'dowel-hole', axis, dir: -dir, n, d, len: len / 2, wAx, pitch, from: a.id, at: offsetOnB(a, b, k), joint: j });
        break;
      }
      case 'rebate': {
        // a (a back panel) sits in a rebate along the edge of b that faces it; face = the axis a lies across
        b.features.push({ type: 'rebate', axis, dir: -dir, width: a.size[k], depth: j.depth ?? 10, from: a.id, at: offsetOnB(a, b, k), joint: j });
        break;
      }
      case 'shelf-pin': {
        // a rests on pins in b: holes just under a, `inset` from its two ends along `spread`
        const n = j.count ?? 2, d = j.d ?? 5, len = j.len ?? 12, inset = j.inset ?? 40;
        const s = AX[j.spread ?? 'z'];
        for (let i = 0; i < n; i++) {
          const at = offsetOnB(a, b, k);
          at[1] = a.at[1] - a.size[1] / 2 - d / 2 - b.at[1];
          at[s] = a.at[s] - b.at[s] + (n === 1 ? 0 : -a.size[s] / 2 + inset + i * (a.size[s] - 2 * inset) / (n - 1));
          b.features.push({ type: 'pin-hole', axis, dir: -dir, d, len, at, from: a.id, joint: j });
        }
        a.features.push({ type: 'shelf-pin', axis, dir, n, joint: j });
        break;
      }
      case 'hinge': {
        // a (a door facing +z) hangs on b: one hinge plate on b at each world height in j.at, just behind the door;
        // j.cup (e.g. 35) also bores the cup in the back of a, 22.5 from its hinge edge
        for (const y of j.at) {
          const at = offsetOnB(a, b, k);
          at[1] = y - b.at[1];
          at[2] = a.at[2] - a.size[2] / 2 - 15 - b.at[2];
          b.features.push({ type: 'hinge-plate', axis, dir: -dir, at, from: a.id, joint: j });
          if (j.cup) { const c = [0, y - a.at[1], 0]; c[k] = dir * (a.size[k] / 2 - 22.5); a.features.push({ type: 'cup-bore', axis: 'z', dir: -1, d: j.cup, len: 13, at: c, joint: j }); }
        }
        a.features.push({ type: 'hinge', axis, dir, n: j.at.length, joint: j });
        break;
      }
      case 'pocket-screw': {
        a.features.push({ type: 'pocket', axis, dir, n: j.count ?? 2, joint: j });
        break;
      }
      case 'dado': {
        const depth = j.depth ?? Math.round(b.size[k === 0 ? 2 : 0] / 3);
        b.features.push({ type: 'dado', axis, from: a.id, width: aT, depth, at: offsetOnB(a, b, k), joint: j });
        break;
      }
      case 'groove': {
        // a (a panel, a drawer bottom) sits in a groove in b: in b's edge when a meets it there, in b's face otherwise
        b.features.push({ type: 'groove', axis, dir: -dir, width: j.width ?? Math.min(...a.size), depth: j.depth ?? 10, from: a.id, at: offsetOnB(a, b, k), joint: j });
        break;
      }
      case 'runner': {
        // a (a drawer box) runs on side-mount slides screwed to b; the slide fills the gap
        const len = j.len ?? a.size[2];
        b.features.push({ type: 'runner', axis, dir: -dir, len, from: a.id, at: offsetOnB(a, b, k), joint: j });
        a.features.push({ type: 'runner', axis, dir, len, at: [0, 0, 0], joint: j });
        break;
      }
      case 'weld':
        a.features.push({ type: 'weld', axis, dir, joint: j });
        break;
      case 'button': case 'figure-8': case 'screw': case 'glue':
        a.features.push({ type: j.type, axis, dir, n: j.count ?? 2, joint: j });
        break;
      default: throw new Error(`unknown joint type ${j.type}`);
    }
  }
  return parts;
}

function tallerAxis(a, k) {
  // of the two axes across the joint, the longer one is the tenon width axis
  const cands = [0, 1, 2].filter(i => i !== k);
  return 'xyz'[cands.sort((p, q) => a.size[q] - a.size[p])[0]];
}
function offsetOnB(a, b, k) {
  return [0, 1, 2].map(i => (i === k ? 0 : a.at[i] - b.at[i]));
}

/** Default explode vectors: away from the assembly centre, top parts straight up. */
export function assignExplode(parts) {
  const c = centre(parts);
  for (const p of parts) {
    if (p.explode) continue;
    const v = [p.at[0] - c[0], p.at[1] - c[1], p.at[2] - c[2]];
    const len = Math.hypot(...v) || 1;
    p.explode = v.map(x => x / len);
  }
  return parts;
}

export function centre(parts) {
  const c = [0, 0, 0];
  for (const p of parts) for (let i = 0; i < 3; i++) c[i] += p.at[i] / parts.length;
  return c;
}

export function bounds(parts) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) for (let i = 0; i < 3; i++) {
    lo[i] = Math.min(lo[i], p.at[i] - p.size[i] / 2);
    hi[i] = Math.max(hi[i], p.at[i] + p.size[i] / 2);
  }
  return { lo, hi, size: hi.map((h, i) => h - lo[i]) };
}

/** Assemble a piece: run the builder, apply joinery, explode vectors, index steps. */
export function definePiece(def) {
  const P = def.params;
  const built = def.build(P);
  const parts = built.parts;
  applyJoinery(parts, built.joints ?? [], P);
  assignExplode(parts);
  const steps = (built.steps ?? []).map((s, i) => ({ index: i + 1, ...s }));
  const stepOf = {};
  steps.forEach(s => s.parts.forEach(id => { stepOf[id] = s.index; }));
  for (const p of parts) p.step = stepOf[p.id] ?? null;
  return {
    name: def.name, type: def.type, params: P, materials: def.materials ?? {},
    hardware: built.hardware ?? [], parts, joints: built.joints ?? [], steps,
    bounds: bounds(parts), source: def.source ?? null,
  };
}
