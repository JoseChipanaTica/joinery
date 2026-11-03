// kit/nest.js — what to buy. Sheet goods are packed on standard sheets,
// solid wood is allocated to boards by thickness. Both are greedy and conservative:
// a maker will do better by hand, but will never come up short.

export const SHEET = { L: 2440, W: 1220, kerf: 3 };
export const BOARD = { L: 2400, kerf: 4, waste: 1.15 }; // 15 % for defects, jointing, end checks

/** First-fit-decreasing shelf packing of rectangular parts onto sheets, grain along L. */
export function nestSheets(rows, sheet = SHEET) {
  const pieces = [];
  for (const r of rows) for (let i = 0; i < r.qty; i++) pieces.push({ name: r.name, L: r.L, W: r.W, T: r.T, material: r.material ?? '' });
  const byT = {};   // one stack per material and thickness: a walnut sheet and a black MDF sheet are not interchangeable
  for (const p of pieces) (byT[`${p.T}|${p.material}`] ??= []).push(p);
  const result = [];
  for (const [key, list] of Object.entries(byT)) {
    const T = key.split('|')[0], material = list[0].material;
    list.sort((a, b) => b.W - a.W || b.L - a.L);
    const sheets = [];
    for (const p of list) {
      let placed = false;
      for (const s of sheets) {
        for (const shelf of s.shelves) {
          if (p.W <= shelf.h && shelf.x + p.L + sheet.kerf <= sheet.L) {
            shelf.items.push({ ...p, x: shelf.x, y: shelf.y }); shelf.x += p.L + sheet.kerf; placed = true; break;
          }
        }
        if (placed) break;
        const yTop = s.shelves.reduce((m, sh) => Math.max(m, sh.y + sh.h + sheet.kerf), 0);
        if (yTop + p.W <= sheet.W && p.L <= sheet.L) {
          s.shelves.push({ y: yTop, h: p.W, x: p.L + sheet.kerf, items: [{ ...p, x: 0, y: yTop }] }); placed = true; break;
        }
      }
      if (!placed) {
        if (p.L > sheet.L || p.W > sheet.W) throw new Error(`${p.name} ${p.L}×${p.W} does not fit a ${sheet.L}×${sheet.W} sheet`);
        sheets.push({ shelves: [{ y: 0, h: p.W, x: p.L + sheet.kerf, items: [{ ...p, x: 0, y: 0 }] }] });
      }
    }
    result.push({ T: +T, material, sheets });
  }
  return result;
}

export const SOLID = { maxW: 200, maxT: 50, jointAllow: 6, planeAllow: 4 };

/** Solid wood: wide parts become glue-ups of strips, thick parts laminations of layers,
 *  then everything is allocated to boards by thickness. */
export function boards(rows, board = BOARD, solid = SOLID) {
  const byT = {};
  const notes = [];
  for (const r of rows) {
    let strips = 1, layers = 1, W = r.W, T = r.T;
    if (W > solid.maxW) { strips = Math.ceil(W / solid.maxW); W = Math.ceil(W / strips) + solid.jointAllow; }
    if (T > solid.maxT) { layers = Math.ceil(T / (solid.maxT - solid.planeAllow)); T = Math.ceil(T / layers) + solid.planeAllow; }
    if (strips > 1) notes.push(`${r.name}: glue-up of ${strips} strips ≈ ${W} mm wide (joint to ${Math.ceil(r.W / strips)} finished)`);
    if (layers > 1) notes.push(`${r.name}: laminate ${layers} layers of ${T} mm, plane to ${r.T} finished`);
    for (let i = 0; i < r.qty * strips * layers; i++) (byT[T] ??= []).push({ name: r.name + (strips > 1 ? ' strip' : layers > 1 ? ' layer' : ''), L: r.L + 20, W });
  }
  boards.lastNotes = notes;
  const out = [];
  for (const [T, list] of Object.entries(byT)) {
    list.sort((a, b) => b.W - a.W || b.L - a.L);
    const bds = [];
    for (const p of list) {
      let b = bds.find(b => b.W >= p.W && b.used + p.L + board.kerf <= board.L);
      if (!b) { b = { W: p.W, used: 0, items: [] }; bds.push(b); }
      b.items.push(p); b.used += p.L + board.kerf;
    }
    const metres = bds.reduce((m, b) => m + board.L, 0) / 1000;
    out.push({ T: +T, boards: bds, buyMetres: +(metres * board.waste).toFixed(1) });
  }
  return out;
}

export function nestSVG(nested, sheet = SHEET) {
  const scale = 0.25, pad = 20;
  const out = [];
  for (const group of nested) for (const [i, s] of group.sheets.entries()) {
    const g = [`<rect x="0" y="0" width="${sheet.L * scale}" height="${sheet.W * scale}" fill="#f7f3ea" stroke="#1d1d1b"/>`];
    for (const sh of s.shelves) for (const it of sh.items)
      g.push(`<rect x="${it.x * scale}" y="${it.y * scale}" width="${it.L * scale}" height="${it.W * scale}" fill="#e6d2b0" stroke="#7a5a2e"/>
      <text x="${(it.x + it.L / 2) * scale}" y="${(it.y + it.W / 2) * scale + 4}" text-anchor="middle" font-size="9" font-family="Inter,Arial">${it.name} ${it.L}×${it.W}</text>`);
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.L * scale + 2 * pad}" height="${sheet.W * scale + 2 * pad + 20}" style="background:#fff">
    <text x="${pad}" y="14" font-size="12" font-family="Inter,Arial" font-weight="600">Sheet ${i + 1} — ${group.material ? `${group.material}, ` : ''}${group.T} mm — ${sheet.L} × ${sheet.W}</text>
    <g transform="translate(${pad},${pad + 4})">${g.join('')}</g></svg>`);
  }
  return out;
}
