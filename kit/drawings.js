// kit/drawings.js — dimensioned SVG shop drawings, projected straight from the model.
import { stockOf, PLANE } from './model.js';

const FONT = `font-family="Inter, Helvetica, Arial, sans-serif"`;
const INK = '#1d1d1b', DIM = '#7a7a76', ACCENT = '#c8511c';

function dimH(x1, x2, y, label, scale) {
  const X1 = x1 * scale, X2 = x2 * scale, Y = y;
  return `<g stroke="${DIM}" stroke-width="1" fill="none">
  <line x1="${X1}" y1="${Y - 8}" x2="${X1}" y2="${Y + 4}"/><line x1="${X2}" y1="${Y - 8}" x2="${X2}" y2="${Y + 4}"/>
  <line x1="${X1}" y1="${Y}" x2="${X2}" y2="${Y}" marker-start="url(#a)" marker-end="url(#a)"/></g>
  <text x="${(X1 + X2) / 2}" y="${Y - 5}" text-anchor="middle" font-size="11" fill="${INK}" ${FONT}>${label}</text>`;
}
function dimV(y1, y2, x, label, scale) {
  const Y1 = y1 * scale, Y2 = y2 * scale, X = x;
  return `<g stroke="${DIM}" stroke-width="1" fill="none">
  <line x1="${X - 4}" y1="${Y1}" x2="${X + 8}" y2="${Y1}"/><line x1="${X - 4}" y1="${Y2}" x2="${X + 8}" y2="${Y2}"/>
  <line x1="${X}" y1="${Y1}" x2="${X}" y2="${Y2}" marker-start="url(#a)" marker-end="url(#a)"/></g>
  <text x="${X + 6}" y="${(Y1 + Y2) / 2 + 4}" font-size="11" fill="${INK}" ${FONT}>${label}</text>`;
}
const defs = `<defs><marker id="a" viewBox="0 0 6 6" refX="3" refY="3" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 z" fill="${DIM}"/></marker></defs>`;

/** One drawing per unique part: face view (L × W) with joinery, end view (W × T),
 *  and for a bent part its profile, with the holes in its ends. */
export function partDrawing(part, piece, qty = 1) {
  const s = stockOf(part);
  const bodyL = s.L - s.tenons;
  const scale = Math.min(520 / s.L, 160 / Math.max(s.W, 40));
  const g = [];
  const tenons = part.features.filter(f => f.type === 'tenon');
  const kAxis = 'xyz'.indexOf(part.grain);
  const wAxis = [0, 1, 2].filter(a => a !== kAxis).sort((a, b) => part.size[b] - part.size[a])[0];
  const pf = part.profile, plane = pf ? PLANE[pf.axis] : null;
  const faceProfile = pf && !part.stock && plane.includes(kAxis) && plane.includes(wAxis);   // outline is the face view
  const bent = pf && !faceProfile;                                                           // outline needs its own view
  const left = tenons.filter(f => 'xyz'.indexOf(f.axis) === kAxis && f.dir < 0).reduce((m, f) => Math.max(m, f.len), 0);
  const right = tenons.filter(f => 'xyz'.indexOf(f.axis) === kAxis && f.dir > 0).reduce((m, f) => Math.max(m, f.len), 0);

  // marks on the face, grouped so twelve pin holes get one label per height, not twelve
  const marks = [], labels = new Map();
  for (const f of part.features) {
    if (!/^(mortise|dado|dowel-hole|pin-hole|hinge-plate|rebate|groove|runner|cup-bore|fitting)$/.test(f.type)) continue;
    if (f.type === 'fitting' && !f.holes) continue;
    if (part.stock && f.type !== 'rebate') continue;      // a developed bent part: holes in its ends are on the profile view
    const face = `${f.dir > 0 ? '+' : '−'}${f.axis}`;
    if (f.type === 'groove') {
      const k = 'xyz'.indexOf(f.axis);
      if (k === wAxis) {                                   // in an edge: a hidden strip in from that edge
        const y = f.dir > 0 ? s.W - f.depth : 0;
        marks.push({ x: left, y, w: bodyL, h: f.depth, dash: true });
        labels.set(`groove|${y}`, { along: left + bodyL / 2, n: 1, text: `groove ${f.width} wide × ${f.depth} deep, centred in the ${face} edge · full length` });
      } else {                                             // in a face, e.g. for a drawer bottom
        const across = f.at[wAxis] + part.size[wAxis] / 2;
        marks.push({ x: left, y: across - f.width / 2, w: bodyL, h: f.width, dash: true });
        labels.set(`groove|${Math.round(across)}`, { along: left + bodyL / 2, n: 1, text: `groove ${f.width} × ${f.depth} deep in the ${face} face, ${Math.round(across - f.width / 2)} from the edge · full length` });
      }
      continue;
    }
    if (f.type === 'runner') {   // slides run front to back (z): along a drawer side, across a case side
      if (kAxis === 2) {
        const across = f.at[wAxis] + part.size[wAxis] / 2;
        marks.push({ x: left, y: across - 1, w: bodyL, h: 2, dash: true });
        labels.set('runner', { along: left + bodyL / 2, n: 1, text: `slide centre line · face ${face} · ${Math.round(across)} from the edge` });
      } else {
        const along = f.at[kAxis] + s.L / 2;
        marks.push({ x: along - 1, y: 0, w: 2, h: s.W, dash: true });
        labels.set(`runner|${Math.round(along)}`, { along, n: 1, text: `slide centre line · face ${face} · ${Math.round(along)} from end` });
      }
      continue;
    }
    if (f.type === 'rebate') {
      const y = f.dir < 0 ? 0 : s.W - f.width;
      marks.push({ x: left, y, w: bodyL, h: f.width, dash: true });
      labels.set(`rebate|${y}`, { along: left + bodyL / 2, text: `rebate ${f.width} wide × ${f.depth} deep · ${f.dir < 0 ? 'back' : 'front'} edge, inside face · full length`, n: 1 });
      continue;
    }
    const faceAx = 'xyz'.indexOf(f.axis);
    const acrossAx = [0, 1, 2].find(a => a !== kAxis && a !== faceAx);
    let w, h, text;
    if (f.type === 'mortise') { w = f.wAxis === kAxis ? f.w : f.t; h = f.wAxis === kAxis ? f.t : f.w; text = `mortise ${f.w}×${f.t}, ${f.len} deep`; }
    else if (f.type === 'dado') { w = f.width; h = part.size[acrossAx]; text = `dado ${f.width} wide × ${f.depth} deep`; }
    else if (f.type === 'hinge-plate') { w = 48; h = 30; text = 'hinge plate'; if (kAxis !== 1) [w, h] = [h, w]; }
    else if (f.type === 'cup-bore') { w = h = f.d; text = `⌀${f.d} hinge cup × ${f.len} deep`; }
    else if (f.type === 'fitting') { w = h = f.holes.d; text = `${f.kind}: ⌀${f.holes.d} hole${f.holes.cc ? `s at ${f.holes.cc} c/c` : ''}`; }
    else { w = h = f.d; text = `${f.type === 'pin-hole' ? 'shelf-pin hole' : 'dowel hole'} ⌀${f.d} × ${f.len}`; }
    const n = f.type === 'dowel-hole' ? f.n : f.type === 'fitting' ? (f.holes.n ?? 2) : 1;
    const spreadAx = f.type === 'fitting' ? 'xyz'.indexOf(f.holes.axis ?? 'x') : f.wAx;
    for (let i = 0; i < n; i++) {
      const off = f.type === 'dowel-hole' ? (i - (n - 1) / 2) * (f.pitch ?? 30) : f.type === 'fitting' ? (i - (n - 1) / 2) * (f.holes.cc ?? 0) : 0;
      const along = f.at[kAxis] + s.L / 2 + (spreadAx === kAxis ? off : 0);
      const across = f.at[acrossAx] + part.size[acrossAx] / 2 + (spreadAx === acrossAx ? off : 0);
      marks.push({ x: along - w / 2, y: across - h / 2, w, h });
      const key = `${text}|${face}|${Math.round(along)}`;
      const l = labels.get(key) ?? { along, n: 0, text: `${text} · face ${face} · ${Math.round(along)} from end` };
      l.n += 1; labels.set(key, l);
    }
  }
  const rows = Math.min(6, labels.size);
  const ox = 60, oy = 60 + 12 * Math.max(3, rows);
  // body
  if (faceProfile) {
    const pts = pf.path.map(uv => { const o = [0, 0, 0]; o[plane[0]] = uv[0]; o[plane[1]] = uv[1]; return `${ox + (o[kAxis] + s.L / 2) * scale},${oy + (o[wAxis] + s.W / 2) * scale}`; });
    g.push(`<polygon points="${pts.join(' ')}" fill="#f4ead8" stroke="${INK}" stroke-width="1.4"/>`);
  } else g.push(`<rect x="${ox + left * scale}" y="${oy}" width="${bodyL * scale}" height="${s.W * scale}" fill="#f4ead8" stroke="${INK}" stroke-width="1.4"/>`);
  for (const f of tenons.filter(f => 'xyz'.indexOf(f.axis) === kAxis)) {
    const tx = f.dir < 0 ? ox : ox + (left + bodyL) * scale;
    const sh = (s.W - f.w) / 2;
    g.push(`<rect x="${tx}" y="${oy + sh * scale}" width="${f.len * scale}" height="${f.w * scale}" fill="#f4ead8" stroke="${ACCENT}" stroke-width="1.2" stroke-dasharray="4 3"/>`);
    g.push(`<text x="${tx + f.len * scale / 2}" y="${oy + s.W * scale + 14}" text-anchor="middle" font-size="9" fill="${ACCENT}" ${FONT}>tenon ${f.len}×${f.w}×${f.t}</text>`);
  }
  for (const m of marks) g.push(`<rect x="${ox + m.x * scale}" y="${oy + m.y * scale}" width="${Math.max(1, m.w * scale)}" height="${Math.max(1, m.h * scale)}" fill="none" stroke="${ACCENT}" stroke-width="1.2"${m.dash ? ' stroke-dasharray="4 3"' : ''}/>`);
  [...labels.values()].sort((a, b) => a.along - b.along).forEach((l, i) => {
    const text = `${l.n > 1 ? `${l.n}× ` : ''}${l.text}`, half = text.length * 2.4;   // ≈ half the width at 9 px
    g.push(`<text x="${Math.max(ox + l.along * scale, half + 6)}" y="${oy - 6 - 12 * (i % 6)}" text-anchor="middle" font-size="9" fill="${ACCENT}" ${FONT}>${text}</text>`);
  });
  // say which end "from end" is measured from
  const END = { x: 'left end', y: 'bottom end', z: 'back end' };
  if (labels.size) g.push(`<text x="${ox}" y="${oy + s.W * scale + 50}" font-size="9" fill="${DIM}" ${FONT}>◂ ${END[part.grain]} (distances measured from here)</text>`);
  // dowels in the ends are not on the face: list them
  const endDowels = part.features.filter(f => f.type === 'dowel');
  if (endDowels.length) {
    const byEnd = new Map();
    for (const f of endDowels) byEnd.set(`${f.dir > 0 ? '+' : '−'}${f.axis}`, f);
    g.push(`<text x="${ox}" y="${oy + s.W * scale + 64}" font-size="9" fill="${ACCENT}" ${FONT}>dowels: ${[...byEnd.entries()].map(([e, f]) => `${f.n}× ⌀${f.d} × ${f.len} in the ${e} end${f.pitch ? `, ${Math.round(f.pitch)} apart` : ''}`).join(' · ')}, centred on the thickness</text>`);
  }
  const dims = `<g transform="translate(${ox},0)">${dimH(0, s.L, oy + s.W * scale + 34, `${s.L}${s.tenons ? ' (incl. tenons)' : ''}${part.stock ? ' developed' : ''}`, scale)}</g>
  <g transform="translate(0,${oy})">${dimV(0, s.W, ox + s.L * scale + 22, `${s.W}`, scale)}</g>`;
  // end view
  const ex = ox + s.L * scale + 90;
  g.push(`<rect x="${ex}" y="${oy}" width="${s.T * scale}" height="${s.W * scale}" fill="#e6d2b0" stroke="${INK}" stroke-width="1.4"/>`);
  g.push(`<g transform="translate(${ex},0)">${dimH(0, s.T, oy + s.W * scale + 34, `${s.T}`, scale)}</g>`);
  let W = ex + s.T * scale + 60, H = oy + s.W * scale + (endDowels.length ? 76 : 64);
  // profile view of a bent part, as seen along its extrusion axis, with the holes in its ends
  if (bent) {
    const [iu, iv] = plane, pu = part.size[iu], pv = part.size[iv];
    const ps = Math.min(200 / pu, 200 / pv, 2.5), px = W + 20, py = oy;   // a small section (a leg) is not blown up
    const P = (u, v) => `${px + (u + pu / 2) * ps},${py + (pv / 2 - v) * ps}`;
    g.push(`<text x="${px}" y="${py - 8}" font-size="10" fill="${DIM}" ${FONT}>profile${pf.note ? ` — ${pf.note}` : ''}</text>`);
    g.push(`<polygon points="${pf.path.map(([u, v]) => P(u, v)).join(' ')}" fill="#e6d2b0" stroke="${INK}" stroke-width="1.4"/>`);
    for (const f of part.features.filter(f => f.type === 'dowel-hole' || f.type === 'pin-hole')) {
      const k = 'xyz'.indexOf(f.axis);
      if (k !== iu && k !== iv) continue;
      const face = f.dir * part.size[k] / 2, mid = face - f.dir * f.len / 2;
      const c = [0, 0, 0]; c[iu] = f.at[iu]; c[iv] = f.at[iv]; c[k] = mid;
      const hw = (k === iu ? f.len : f.d) / 2, hh = (k === iv ? f.len : f.d) / 2;
      g.push(`<polygon points="${[[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([a, b]) => P(c[iu] + a, c[iv] + b)).join(' ')}" fill="none" stroke="${ACCENT}" stroke-width="1.2"/>`);
    }
    const ends = part.features.filter(f => f.type === 'dowel-hole');
    if (ends.length) g.push(`<text x="${px}" y="${py + pv * ps + 16}" font-size="9" fill="${ACCENT}" ${FONT}>${ends.map(f => `${f.n}× ⌀${f.d} × ${f.len} in the ${f.dir > 0 ? '+' : '−'}${f.axis} end, ${f.pitch ? `${Math.round(f.pitch)} apart` : ''}`).join(' · ')}</text>`);
    g.push(`<g transform="translate(${px},0)">${dimH(0, pu, py + pv * ps + 40, `${pu}`, ps)}</g>`);
    g.push(`<g transform="translate(0,${py})">${dimV(0, pv, px + pu * ps + 14, `${pv}`, ps)}</g>`);
    W = Math.max(W, px + pu * ps + 80 + (ends.length ? 120 : 0), px + (pf.note ? pf.note.length * 5.2 + 60 : 0)); H = Math.max(H, py + pv * ps + 70);
  }
  const title = `<text x="${ox}" y="24" font-size="14" font-weight="600" fill="${INK}" ${FONT}>${part.name}</text>
  <text x="${ox}" y="38" font-size="10" fill="${DIM}" ${FONT}>qty ${qty} · ${piece.materials[part.material]?.name ?? part.material}${s.layers > 1 ? ` · ${s.layers} × ${s.layerT} mm laminated` : ''} · ${/glass|steel|brass/i.test(part.material) ? 'order cut to size' : 'grain along length'}${faceProfile && pf.note ? ` · ${pf.note}` : ''}${part.inferred ? ' · inferred from construction, not visible in photo' : ''}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#fff">${defs}${title}${g.join('\n')}${dims}</svg>`;
}

/** Assembly drawing: front (x,y), side (z,y), top (x,z) with overall dimensions. */
export function assemblyDrawing(piece) {
  const { lo, size } = piece.bounds;
  const scale = Math.min(380 / size[0], 300 / size[1], 300 / size[2]);
  const views = [
    { name: 'FRONT', ax: [0, 1], flipY: true },
    { name: 'SIDE', ax: [2, 1], flipY: true },
    { name: 'TOP', ax: [0, 2], flipY: false },
  ];
  let x0 = 50; const g = [];
  const W = [];
  for (const v of views) {
    const [i, j] = v.ax;
    const w = size[i] * scale, h = size[j] * scale, y0 = 60;
    g.push(`<text x="${x0}" y="${y0 - 14}" font-size="12" font-weight="600" fill="${INK}" ${FONT}>${v.name}</text>`);
    // draw parts sorted by depth so near ones draw last (crude painter's)
    const depthAx = [0, 1, 2].find(a => a !== i && a !== j);
    const sorted = [...piece.parts].sort((a, b) => (a.at[depthAx] - b.at[depthAx]) * (v.name === 'TOP' ? 1 : v.name === 'FRONT' ? 1 : 1));
    for (const p of sorted) {
      const glass = /glass/i.test(p.material);
      const paint = glass ? `fill="#dcebe6" stroke="#5f7a74" stroke-width="1" fill-opacity="0.25"` : `fill="#f4ead8" stroke="${INK}" stroke-width="1" fill-opacity="0.92"`;
      if (p.profile && 'xyz'.indexOf(p.profile.axis) === depthAx) {   // seen end-on: draw the real outline
        const [iu, iv] = PLANE[p.profile.axis];
        const pts = p.profile.path.map(uv => {
          const w = [...p.at]; w[iu] += uv[0]; w[iv] += uv[1];
          return `${x0 + (w[i] - lo[i]) * scale},${y0 + (v.flipY ? size[j] - (w[j] - lo[j]) : w[j] - lo[j]) * scale}`;
        });
        g.push(`<polygon points="${pts.join(' ')}" ${paint}/>`);
        continue;
      }
      const px = (p.at[i] - p.size[i] / 2 - lo[i]) * scale;
      const py = v.flipY ? (size[j] - (p.at[j] + p.size[j] / 2 - lo[j])) * scale : (p.at[j] - p.size[j] / 2 - lo[j]) * scale;
      g.push(`<rect x="${x0 + px}" y="${y0 + py}" width="${p.size[i] * scale}" height="${p.size[j] * scale}" ${paint}/>`);
    }
    g.push(`<g transform="translate(${x0},0)">${dimH(0, size[i], y0 + h + 30, `${Math.round(size[i])}`, scale)}</g>`);
    g.push(`<g transform="translate(0,${y0})">${dimV(0, size[j], x0 + w + 18, `${Math.round(size[j])}`, scale)}</g>`);
    x0 += w + 90; W.push(x0);
  }
  const Wt = x0 + 20, Ht = 60 + Math.max(size[1], size[2]) * scale + 70;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Wt}" height="${Ht}" viewBox="0 0 ${Wt} ${Ht}" style="background:#fff">${defs}
  <text x="50" y="24" font-size="14" font-weight="600" fill="${INK}" ${FONT}>${piece.name} — overall ${Math.round(size[0])} × ${Math.round(size[2])} × ${Math.round(size[1])} mm (L × D × H)</text>${g.join('\n')}</svg>`;
}
