// kit/cutlist.js — the maker's cut list, read straight from the model.
import { stockOf } from './model.js';

export const NON_WOOD = /glass|steel|brass|alu|cane/i;   // ordered cut to size, not cut from boards

/** Group identical parts (same name + stock) into one line. */
export function cutList(piece) {
  const rows = new Map();
  for (const p of piece.parts) {
    const s = stockOf(p);
    const key = `${p.name}|${s.L}|${s.W}|${s.T}|${p.material}`;
    if (!rows.has(key)) rows.set(key, {
      name: p.name, qty: 0, L: s.L, W: s.W, T: s.T, tenons: s.tenons, layers: s.layers, layerT: s.layerT,
      material: piece.materials[p.material]?.name ?? p.material, grain: NON_WOOD.test(p.material) ? '—' : 'along L',
      joinery: describeFeatures(p), note: p.note, inferred: p.inferred, ids: [],
    });
    const r = rows.get(key); r.qty += 1; r.ids.push(p.id);
  }
  return [...rows.values()].sort((a, b) => b.L * b.W * b.T - a.L * a.W * a.T);
}

function describeFeatures(p) {
  const out = [];
  const count = {};
  // hardware a part hangs on is counted once, in total
  const pins = p.features.filter(f => f.type === 'shelf-pin').reduce((n, f) => n + f.n, 0);
  const hinges = p.features.filter(f => f.type === 'hinge').reduce((n, f) => n + f.n, 0);
  if (pins) out.push(`rests on ${pins} shelf pins`);
  if (hinges) out.push(`hangs on ${hinges} hinges`);
  for (const f of p.features) {
    if (f.type === 'shelf-pin' || f.type === 'hinge') continue;
    const k = f.type === 'tenon' ? `tenon ${f.len}×${f.w}×${f.t}`
      : f.type === 'mortise' ? `mortise ${f.len} deep, ${f.w}×${f.t}`
      : f.type === 'dowel' ? `${f.n}× ⌀${f.d} dowel`
      : f.type === 'dowel-hole' ? `${f.n}× ⌀${f.d} hole`
      : f.type === 'pocket' ? `${f.n}× pocket screw`
      : f.type === 'dado' ? `dado ${f.width} wide × ${f.depth} deep`
      : f.type === 'rebate' ? `rebate ${f.width} × ${f.depth} along back edge`
      : f.type === 'pin-hole' ? `⌀${f.d} × ${f.len} shelf-pin hole`
      : f.type === 'hinge-plate' ? 'hinge plate'
      : f.type === 'cup-bore' ? `⌀${f.d} hinge cup`
      : f.type === 'groove' ? `groove ${f.width} × ${f.depth}`
      : f.type === 'runner' ? 'drawer runner'
      : f.type === 'weld' ? 'welded'
      : f.type === 'fitting' ? (f.holes ? `${f.kind}, ${f.holes.n ?? 2}× ⌀${f.holes.d}${f.holes.cc ? ` at ${f.holes.cc} c/c` : ''}` : f.kind)
      : f.type;
    count[k] = (count[k] ?? 0) + 1;
  }
  for (const [k, n] of Object.entries(count)) out.push(n > 1 ? `${n}× ${k}` : k);
  return out.join('; ');
}

export function toCSV(rows) {
  const head = ['Part', 'Qty', 'Length (mm)', 'Width (mm)', 'Thickness (mm)', 'Material', 'Grain', 'Joinery', 'Notes'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(',')];
  for (const r of rows) lines.push([r.name, r.qty, r.L, r.W, r.T, r.material, r.grain, r.joinery,
    [r.tenons ? `length includes ${r.tenons} mm of tenons` : '', r.note, r.inferred ? 'inferred (not visible in photo)' : ''].filter(Boolean).join('. ')].map(esc).join(','));
  return lines.join('\n') + '\n';
}

export function toMarkdown(rows, piece) {
  const l = [`| # | Part | Qty | L × W × T (mm) | Material | Joinery | Notes |`, `|---|---|---|---|---|---|---|`];
  rows.forEach((r, i) => l.push(`| ${i + 1} | ${r.name} | ${r.qty} | ${r.L} × ${r.W} × ${r.T} | ${r.material} | ${r.joinery || '—'} | ${[r.tenons ? `incl. ${r.tenons} mm tenons` : '', r.note, r.inferred ? '*inferred*' : ''].filter(Boolean).join('. ') || '—'} |`));
  if (piece?.hardware?.length) {
    l.push('', '**Hardware**', '');
    for (const h of piece.hardware) l.push(`- ${h.qty}× ${h.name}${h.note ? ` — ${h.note}` : ''}`);
  }
  return l.join('\n') + '\n';
}

/** Rough material take-off: board metres per thickness for solid, sheet area for panels. */
export function takeOff(rows) {
  const solid = {}, sheet = {};
  for (const r of rows) {
    if (NON_WOOD.test(r.material)) continue;
    const vol = r.L * r.W * r.T * r.qty / 1e9; // m³
    if (/ply|mdf|sheet|panel/i.test(r.material)) sheet[r.layerT ?? r.T] = (sheet[r.layerT ?? r.T] ?? 0) + r.L * r.W * r.qty * (r.layers ?? 1) / 1e6;
    else solid[r.T] = (solid[r.T] ?? 0) + vol;
  }
  return { solid, sheet }; // solid: m³ per thickness, sheet: m² per thickness
}
