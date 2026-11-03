// walnut-entry-unit/model.js — the entry built-in as a function of P. No three.js here.
import { definePiece, box } from '../../kit/model.js';
import spec from './spec.json' with { type: 'json' };

export function build(P) {
  const { W, D, H, t, backT, gap: g } = P;
  const parts = [], joints = [];
  // a part from its extents: [x0, x1], [y0, y1], [z0, z1]
  const span = (id, name, [x0, x1], [y0, y1], [z0, z1], o = {}) => { parts.push(box(id, name, [x1 - x0, y1 - y0, z1 - z0], [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], o)); return id; };
  const J = (a, b, type, o = {}) => joints.push({ a, b, type, ...o });
  const dowel = (a, b, o = {}) => J(a, b, 'dowel', { count: 3, d: 8, len: 30, ...o });
  const screw = (a, b, face, count = 2) => J(a, b, 'screw', { face, count });
  const X = W / 2, zc = [-D / 2 + backT, D / 2], zb = [-D / 2, -D / 2 + backT];
  const wal = { material: P.material }, dark = { material: 'mdf-anthracite' };
  const ids = pre => parts.filter(p => p.id.startsWith(pre)).map(p => p.id);
  const edgePull = (x, y, len = 240) => ({ kind: `edge pull ${len}`, size: [len, 8, 24], at: [x, y, 4], axis: 'z', dir: 1, material: 'steel-black', holes: { n: 2, d: 4, cc: len - 64, axis: 'x' } });

  // ---- 1. plinth: black, set back from the front
  const pz = [D / 2 - P.plinthSet - t, D / 2 - P.plinthSet], blk = { material: 'mdf-black', explode: [0, 0, 0.25] };
  span('pl-f', 'Plinth rail', [-X, X], [0, P.plinthH], pz, { ...blk, grain: 'x' });
  span('pl-b', 'Plinth rail', [-X, X], [0, P.plinthH], [-D / 2, -D / 2 + t], { ...blk, grain: 'x', inferred: true, explode: [0, 0, -0.1] });
  for (const [id, x] of [['pl-l', [-X, -X + t]], ['pl-c', [-t / 2, t / 2]], ['pl-r', [X - t, X]]]) {
    span(id, 'Plinth cross', x, [0, P.plinthH], [-D / 2 + t, pz[0]], { ...blk, grain: 'z', inferred: true, explode: [0, 0, 0.1] });
    J(id, 'pl-f', 'dowel', { count: 2, d: 8, len: 30 }); J(id, 'pl-b', 'dowel', { count: 2, d: 8, len: 30 });
  }

  // ---- 2. base cabinet and counter
  const y0 = P.plinthH, yC = P.counterTop - P.counterT, xp = X - P.sideW + t / 2;   // partition centres at ±xp
  const yS = 648;                                                                    // fixed shelf under the drawers
  const base = { ...wal, explode: [0, 0, 0.35] };
  span('b-side-l', 'Base side', [-X, -X + t], [y0, yC], zc, { ...base, grain: 'y', explode: [-0.15, 0, 0.35] });
  span('b-side-r', 'Base side', [X - t, X], [y0, yC], zc, { ...base, grain: 'y', explode: [0.15, 0, 0.35] });
  span('b-bottom', 'Base bottom', [-X + t, X - t], [y0, y0 + t], zc, { ...base, grain: 'x' });
  const band = h => ({ kind: 'black edge band', size: [t, h, 1.5], at: [0, 0, D / 2 - (zc[0] + zc[1]) / 2 + 0.75], material: 'mdf-black' });
  for (const [id, sx] of [['b-part-l', -1], ['b-part-r', 1]])
    span(id, 'Base partition', [sx * xp - t / 2, sx * xp + t / 2], [y0 + t, yC], zc, { ...base, grain: 'y', note: 'front edge banded black: it is the dark line you see between the doors', fittings: [band(yC - y0 - t)] });
  span('b-shelf', 'Drawer floor', [-xp + t / 2, xp - t / 2], [yS, yS + t], zc, { ...base, grain: 'x' });
  span('b-div-lo', 'Base divider, low', [-t / 2, t / 2], [y0 + t, yS], zc, { ...base, grain: 'y' });
  span('b-div-up', 'Base divider, high', [-t / 2, t / 2], [yS + t, yC], zc, { ...base, grain: 'y' });
  span('b-back', 'Base back', [-X, X], [y0, yC], zb, { ...base, grain: 'x', inferred: true, explode: [0, 0, 0.15] });
  span('counter', 'Counter', [-X, X], [yC, P.counterTop], [-D / 2, D / 2 + P.frameT], { ...wal, grain: 'x', explode: [0, 0.12, 0.35], note: 'front edge banded; flush with the door faces' });
  for (const s of ['b-side-l', 'b-side-r']) { dowel('b-bottom', s); dowel(s, 'counter'); screw('b-back', s, 'z', 4); }
  for (const p of ['b-part-l', 'b-part-r']) { dowel(p, 'b-bottom'); dowel(p, 'counter'); dowel('b-shelf', p); }
  dowel('b-div-lo', 'b-bottom'); dowel('b-div-lo', 'b-shelf'); dowel('b-div-up', 'b-shelf'); dowel('b-div-up', 'counter');
  for (const r of ['pl-f', 'pl-b', 'pl-c']) screw('b-bottom', r, 'y', 3);
  const yShoe = Math.round((y0 + t + yS) / 2);
  for (const [id, xs, side] of [['shoe-l', [-xp + t / 2 + 1, -t / 2 - 1], 'b-part-l'], ['shoe-r', [t / 2 + 1, xp - t / 2 - 1], 'b-part-r']]) {
    span(id, 'Shoe shelf', xs, [yShoe, yShoe + t], [zc[0], D / 2 - 20], { ...base, grain: 'x', inferred: true, explode: [0, 0, 0.5] });
    J(id, side, 'shelf-pin', { count: 2, d: 5, len: 12, inset: 40 }); J(id, 'b-div-lo', 'shelf-pin', { count: 2, d: 5, len: 12, inset: 40 });
  }

  // ---- 3. drawers: birch-ply boxes on side-mount slides, walnut fronts
  const drawerIds = [];
  for (const [n, ox0, ox1, sideL, sideR] of [['l', -xp + t / 2, -t / 2, 'b-part-l', 'b-div-up'], ['r', t / 2, xp - t / 2, 'b-div-up', 'b-part-r']]) {
    const bx0 = ox0 + P.slide, bx1 = ox1 - P.slide, by0 = yS + t + 12, by1 = by0 + P.drawerH, bz0 = D / 2 - P.drawerD, bz1 = D / 2, T = 15;
    const ply = { material: 'birch-ply', inferred: true, explode: [0, 0, 0.7] };
    const d = [`dw${n}-side-l`, `dw${n}-side-r`, `dw${n}-front`, `dw${n}-back`, `dw${n}-bottom`, `dw${n}-face`];
    span(d[0], 'Drawer side', [bx0, bx0 + T], [by0, by1], [bz0, bz1], { ...ply, grain: 'z' });
    span(d[1], 'Drawer side', [bx1 - T, bx1], [by0, by1], [bz0, bz1], { ...ply, grain: 'z' });
    span(d[2], 'Drawer box end', [bx0 + T, bx1 - T], [by0, by1], [bz1 - T, bz1], { ...ply, grain: 'x' });
    span(d[3], 'Drawer box end', [bx0 + T, bx1 - T], [by0, by1], [bz0, bz0 + T], { ...ply, grain: 'x' });
    span(d[4], 'Drawer bottom', [bx0 + T - 6, bx1 - T + 6], [by0 + 10, by0 + 16], [bz0 + T - 6, bz1 - T + 6], { ...ply, grain: 'x' });
    const fx = n === 'l' ? [-xp + t / 2 + g / 2, -g / 2] : [g / 2, xp - t / 2 - g / 2], fy = [yS + t + g / 2, yC - g / 2];
    const fw = fx[1] - fx[0], fh = fy[1] - fy[0];
    span(d[5], 'Drawer front', fx, fy, [D / 2, D / 2 + t], { ...wal, grain: 'x', explode: [0, 0, 0.9], fittings: [edgePull((n === 'l' ? 1 : -1) * (fw / 2 - 135), fh / 2 - 3)] });
    for (const e of [d[2], d[3]]) for (const s of [d[0], d[1]]) J(e, s, 'dado', { depth: 6, face: 'x' });
    for (const s of [d[0], d[1]]) J(d[4], s, 'groove', { width: 6, depth: 6, face: 'x' });
    for (const e of [d[2], d[3]]) J(d[4], e, 'groove', { width: 6, depth: 6, face: 'z' });
    J(d[5], d[2], 'screw', { face: 'z', count: 4 });
    J(d[0], sideL, 'runner', { face: 'x' }); J(d[1], sideR, 'runner', { face: 'x' });
    drawerIds.push(...d);
  }

  // ---- 4. base doors: narrow slabs at the sides, frame-and-panel in the centre
  span('nd-l', 'Narrow door', [-X + g / 2, -xp - t / 2 - g / 2], [y0 + g / 2, yC - g / 2], [D / 2, D / 2 + t], { ...wal, grain: 'y', explode: [-0.1, 0, 0.9], note: 'no handle: open it by the black gap beside it' });
  span('nd-r', 'Narrow door', [xp + t / 2 + g / 2, X - g / 2], [y0 + g / 2, yC - g / 2], [D / 2, D / 2 + t], { ...wal, grain: 'y', explode: [0.1, 0, 0.9], note: 'no handle: open it by the black gap beside it' });
  J('nd-l', 'b-side-l', 'hinge', { face: 'x', at: [y0 + 110, yC - 110], cup: 35 });
  J('nd-r', 'b-side-r', 'hinge', { face: 'x', at: [y0 + 110, yC - 110], cup: 35 });
  function panelDoor(id, [x0, x1], [yd0, yd1], hingeOn, hingeLeft) {
    const { frameT, stile: sw, railTop, railLat, railMid, railBot, muntin: mw, latH, panelT, latT, groove, grooveD } = P;
    const z = [D / 2, D / 2 + frameT], zm = D / 2 + frameT / 2, out = [];
    const o = (grain, extra = {}) => ({ material: 'walnut-solid', grain, explode: [0, 0, 0.9], ...extra });
    const S = (sid, name, xs, ys, zs, opt) => { out.push(span(`${id}-${sid}`, name, xs, ys, zs, opt)); return `${id}-${sid}`; };
    const xa = x0 + sw, xb = x1 - sw, xm = (x0 + x1) / 2;
    const yBot = yd0 + railBot, yTopB = yd1 - railTop, yLatT = yTopB - latH, yLatB = yLatT - railLat;
    const row = (yLatB - yBot - railMid) / 2, yMidB = yBot + row, yMidT = yMidB + railMid;
    const pair = { note: 'make the two doors as a mirrored pair' };
    const sl = S('sl', hingeLeft ? 'Door stile, hinge side' : 'Door stile, meeting side', [x0, xa], [yd0, yd1], z, o('y', pair));
    const sr = S('sr', hingeLeft ? 'Door stile, meeting side' : 'Door stile, hinge side', [xb, x1], [yd0, yd1], z, o('y', pair));
    const rb = S('rb', 'Door bottom rail', [xa, xb], [yd0, yBot], z, o('x'));
    const rm = S('rm', 'Door rail', [xa, xb], [yMidB, yMidT], z, o('x'));
    const rl = S('rl', 'Door rail', [xa, xb], [yLatB, yLatT], z, o('x'));
    const rt = S('rt', 'Door top rail', [xa, xb], [yTopB, yd1], z, o('x', { fittings: [edgePull((hingeLeft ? 1 : -1) * ((xb - xa) / 2 - 135), railTop / 2 - 3)] }));
    for (const r of [rb, rm, rl, rt]) for (const s of [sl, sr]) J(r, s, 'mortise-tenon', { tenonLen: 25, tenonT: 7, shoulder: 6 });
    const m1 = S('m1', 'Door muntin', [xm - mw / 2, xm + mw / 2], [yBot, yMidB], z, o('y'));
    const m2 = S('m2', 'Door muntin', [xm - mw / 2, xm + mw / 2], [yMidT, yLatB], z, o('y'));
    for (const [m, r] of [[m1, rb], [m1, rm], [m2, rm], [m2, rl]]) J(m, r, 'mortise-tenon', { tenonLen: 15, tenonT: 7, shoulder: 6 });
    const e = grooveD - 1, pzz = [zm - panelT / 2, zm + panelT / 2];
    const cells = [[sl, m1, rb, rm, [xa, xm - mw / 2], [yBot, yMidB]], [m1, sr, rb, rm, [xm + mw / 2, xb], [yBot, yMidB]],
      [sl, m2, rm, rl, [xa, xm - mw / 2], [yMidT, yLatB]], [m2, sr, rm, rl, [xm + mw / 2, xb], [yMidT, yLatB]]];
    cells.forEach(([l, r, b, tt, xs, ys], i) => {
      const pw = xs[1] - xs[0], ph = ys[1] - ys[0];
      const PW = Math.floor(pw + 2 * e), PH = Math.floor(ph + 2 * e), cx = (xs[0] + xs[1]) / 2, cy = (ys[0] + ys[1]) / 2;
      const pid = S(`p${i + 1}`, 'Raised panel', [cx - PW / 2, cx + PW / 2], [cy - PH / 2, cy + PH / 2], pzz,
        { ...o('y'), explode: [0, 0, 1.08], note: `solid walnut, field raised on the front, edges thinned to a ${groove} mm tongue; floats, no glue`,
          fittings: [{ kind: 'raised field', size: [pw - 44, ph - 44, 4], at: [0, 0, panelT / 2 + 1.5], material: 'walnut-solid' }] });
      for (const [m, f] of [[l, 'x'], [r, 'x'], [b, 'y'], [tt, 'y']]) J(pid, m, 'groove', { width: groove, depth: grooveD, face: f });
    });
    const LW = Math.floor(xb - xa + 2 * e), LH = Math.floor(yTopB - yLatT + 2 * e), lcx = (xa + xb) / 2, lcy = (yLatT + yTopB) / 2;
    const lat = S('lat', 'Fretwork vent panel', [lcx - LW / 2, lcx + LW / 2], [lcy - LH / 2, lcy + LH / 2], [zm - latT / 2, zm + latT / 2],
      { material: 'fret-mdf', grain: 'x', explode: [0, 0, 1.08], note: 'CNC-cut lattice, 5 mm bars on a 26 mm pitch; airs the shoe cabinet' });
    for (const [m, f] of [[sl, 'x'], [sr, 'x'], [rl, 'y'], [rt, 'y']]) J(lat, m, 'groove', { width: groove, depth: grooveD, face: f });
    J(hingeLeft ? sl : sr, hingeOn, 'hinge', { face: 'x', at: [yd0 + 100, yd1 - 100], cup: 35 });
    return out;
  }
  const cDoors = [...panelDoor('cl', [-xp + t / 2 + g / 2, -g / 2], [y0 + g / 2, yS + t - g / 2], 'b-part-l', true),
    ...panelDoor('cr', [g / 2, xp - t / 2 - g / 2], [y0 + g / 2, yS + t - g / 2], 'b-part-r', false)];

  // ---- 5. tower on the right: anthracite left side, walnut back with hooks, anthracite bottle shelves
  const tx = P.towerX, top = P.top, yT = P.counterTop;
  span('t-side-l', 'Tower side, dark', [tx, tx + t], [yT, top], [-D / 2, D / 2], { ...dark, grain: 'y', explode: [0, 0.05, 0.3] });
  span('t-side-r', 'Tower side', [X - t, X], [yT, top], [-D / 2, D / 2], { ...wal, grain: 'y', explode: [0.25, 0.05, 0.3] });
  span('t-top', 'Tower top', [tx + t, X - t], [top - t, top], [-D / 2, D / 2], { ...wal, grain: 'x', explode: [0.1, 0.15, 0.3] });
  const hook = (x, y, z) => ({ kind: 'coat hook', size: [14, 70, 55], at: [x, y, z], axis: 'z', dir: 1, material: 'steel-black', holes: { n: 2, d: 4, cc: 40, axis: 'y' } });
  const tbx = (tx + t + X - t) / 2, tby = (yT + top - t) / 2;
  span('t-back', 'Tower back', [tx + t, X - t], [yT, top - t], [-D / 2, -D / 2 + t], { ...wal, grain: 'y', explode: [0.1, 0.05, 0.1],
    fittings: [hook(258 - tbx, P.hookY - tby, t / 2 + 27.5), hook(389 - tbx, P.hookY - tby, t / 2 + 27.5)] });
  for (const s of ['t-side-l', 't-side-r']) { dowel(s, 'counter'); dowel('t-top', s); screw('t-back', s, 'z', 6); }
  P.towerShelfTops.forEach((yt, i) => {
    const id = span(`t-shelf-${i + 1}`, 'Tower shelf', [tx + t, X - t], [yt - P.towerShelfT, yt], [-D / 2 + t, D / 2], { ...dark, grain: 'x', explode: [0.1, 0, 0.5] });
    dowel(id, 't-side-l'); dowel(id, 't-side-r');
  });

  // ---- 6. key column between the floating shelves and the tower
  const cx = P.colX, yCol = P.caneBottom;
  span('k-side', 'Key column side', [cx, cx + t], [yT, yCol], zc, { ...dark, grain: 'y', explode: [0, 0, 0.45] });
  span('k-top', 'Key column top', [cx + t, tx], [yCol - t, yCol], zc, { ...dark, grain: 'x', explode: [0, 0.05, 0.45] });
  span('k-back', 'Key column back', [cx, tx], [yT, yCol], zb, { ...dark, grain: 'y', explode: [0, 0, 0.2],
    fittings: [hook(0, 1520 - (yT + yCol) / 2, backT / 2 + 27.5)] });
  dowel('k-side', 'counter'); dowel('k-top', 'k-side'); dowel('k-top', 't-side-l'); screw('k-back', 'k-side', 'z', 4); screw('k-back', 't-side-l', 'x', 4);
  P.colShelfTops.forEach((yt, i) => { const id = span(`k-shelf-${i + 1}`, 'Key column shelf', [cx + t, tx], [yt - t, yt], zc, { ...dark, grain: 'x', explode: [0, 0, 0.55] }); dowel(id, 'k-side', { count: 2 }); dowel(id, 't-side-l', { count: 2 }); });

  // ---- 7. floating shelves on the left wall
  const fz = [-D / 2, -D / 2 + P.floatD], fzc = (fz[0] + fz[1]) / 2;
  P.floatTops.forEach((yt, i) => {
    const id = span(`float-${i + 1}`, 'Floating shelf', [-X, cx], [yt - P.floatT, yt], fz, { material: 'walnut-solid', grain: 'x', explode: [-0.2, 0, 0.55],
      note: 'solid walnut, two boards glued; two ⌀12 holes 150 deep in the back edge for the concealed wall rods',
      fittings: i === 0 ? [{ kind: 'LED profile', size: [cx + X - 40, 8, 16], at: [0, -P.floatT / 2 - 4, fz[1] - 30 - fzc], material: 'led' }] : [] });
    dowel(id, 'k-side');
  });

  // ---- 8. wall cupboard over the left part
  const yw = P.wallBottom, wx = [-X, tx];
  span('w-side-l', 'Wall cupboard side', [wx[0], wx[0] + t], [yw, top], zc, { ...wal, grain: 'y', explode: [-0.15, 0.2, 0.3] });
  span('w-side-r', 'Wall cupboard side', [wx[1] - t, wx[1]], [yw, top], zc, { ...wal, grain: 'y', explode: [0, 0.2, 0.3] });
  span('w-bottom', 'Wall cupboard bottom', [wx[0] + t, wx[1] - t], [yw, yw + t], zc, { ...wal, grain: 'x', explode: [0, 0.15, 0.3] });
  span('w-top', 'Wall cupboard top', [wx[0] + t, wx[1] - t], [top - t, top], zc, { ...wal, grain: 'x', explode: [0, 0.25, 0.3] });
  span('w-back', 'Wall cupboard back', wx, [yw, top], zb, { ...wal, grain: 'x', inferred: true, explode: [0, 0.2, 0.1] });
  const yws = Math.round((yw + top) / 2);
  span('w-shelf', 'Wall cupboard shelf', [wx[0] + t + 1, wx[1] - t - 1], [yws, yws + t], [zc[0], D / 2 - 20], { ...wal, grain: 'x', inferred: true, explode: [0, 0.2, 0.45] });
  for (const s of ['w-side-l', 'w-side-r']) { dowel('w-bottom', s); dowel('w-top', s); screw('w-back', s, 'z', 4); J('w-shelf', s, 'shelf-pin', { count: 2, d: 5, len: 12, inset: 40 }); }
  screw('w-side-r', 't-side-l', 'x', 4);

  // ---- 9. cane box under the cupboard's right half, set back, with a lift-up flap
  const czf = D / 2 - P.caneSet, cbx = [P.caneX, tx], ycb = P.caneBottom;
  const cz = [-D / 2 + backT, czf];
  span('cb-side', 'Cane box side', [cbx[0], cbx[0] + t], [ycb, yw], cz, { ...dark, grain: 'y', explode: [-0.05, 0.1, 0.45] });
  span('cb-bottom', 'Cane box bottom', [cbx[0] + t, cbx[1]], [ycb, ycb + t], cz, { ...dark, grain: 'x', explode: [0, 0.05, 0.45] });
  span('cb-back', 'Cane box back', cbx, [ycb, yw], zb, { ...dark, grain: 'x', inferred: true, explode: [0, 0.1, 0.2] });
  dowel('cb-bottom', 'cb-side'); dowel('cb-bottom', 't-side-l'); screw('cb-side', 'w-bottom', 'y', 2); screw('cb-bottom', 'k-top', 'y', 3); screw('cb-back', 'cb-side', 'z', 3);
  const fx0 = cbx[0] + g / 2, fx1 = cbx[1] - g / 2, fy0 = ycb + g / 2, fy1 = yw - g / 2, fzr = [czf, czf + t], fs = 24;
  const fo = (grain, extra = {}) => ({ ...dark, grain, explode: [0, 0.05, 0.85], ...extra });
  span('cf-sl', 'Flap stile', [fx0, fx0 + fs], [fy0, fy1], fzr, fo('y'));
  span('cf-sr', 'Flap stile', [fx1 - fs, fx1], [fy0, fy1], fzr, fo('y', { fittings: [{ kind: 'finger hole', size: [22, 22, 1], at: [0, 0, t / 2 + 0.5], material: 'mdf-black' }] }));
  span('cf-rb', 'Flap rail', [fx0 + fs, fx1 - fs], [fy0, fy0 + fs], fzr, fo('x'));
  span('cf-rt', 'Flap rail', [fx0 + fs, fx1 - fs], [fy1 - fs, fy1], fzr, fo('x'));
  for (const r of ['cf-rb', 'cf-rt']) for (const s of ['cf-sl', 'cf-sr']) dowel(r, s, { count: 2 });
  const ce = 7, czm = czf + t / 2;
  span('cf-cane', 'Cane panel', [fx0 + fs - ce, fx1 - fs + ce], [fy0 + fs - ce, fy1 - fs + ce], [czm - 1.5, czm + 1.5],
    { material: 'cane', grain: 'y', explode: [0, 0.05, 1.0], note: 'open-weave rattan webbing, soaked and pressed into a 4 × 8 groove with a reed spline' });
  for (const [m, f] of [['cf-sl', 'x'], ['cf-sr', 'x'], ['cf-rb', 'y'], ['cf-rt', 'y']]) J('cf-cane', m, 'groove', { width: 4, depth: 8, face: f });
  J('cf-sl', 'cb-side', 'hinge', { face: 'x', at: [fy1 - 60] }); J('cf-sr', 't-side-l', 'hinge', { face: 'x', at: [fy1 - 60] });

  // ---- 10. wall-cupboard doors and the ceiling scribe
  const wmid = (wx[0] + wx[1]) / 2, wdy = [yw + g / 2, top - g / 2], wdh = wdy[1] - wdy[0];
  const wl = [wx[0] + g / 2, wmid - g / 2], wr = [wmid + g / 2, wx[1] - g / 2];
  const wpull = s => ({ kind: 'edge pull 140', size: [140, 8, 22], at: [s * ((wl[1] - wl[0]) / 2 - 80), -wdh / 2 + 3, 4], axis: 'z', dir: 1, material: 'steel-black', holes: { n: 2, d: 4, cc: 96, axis: 'x' } });
  span('wd-l', 'Wall cupboard door', wl, wdy, [D / 2, D / 2 + t], { ...wal, grain: 'y', explode: [-0.05, 0.1, 0.85], fittings: [wpull(1)] });
  span('wd-r', 'Wall cupboard door', wr, wdy, [D / 2, D / 2 + t], { ...wal, grain: 'y', explode: [0.05, 0.1, 0.85], fittings: [wpull(-1)] });
  J('wd-l', 'w-side-l', 'hinge', { face: 'x', at: [wdy[0] + 70, wdy[1] - 70], cup: 35 });
  J('wd-r', 'w-side-r', 'hinge', { face: 'x', at: [wdy[0] + 70, wdy[1] - 70], cup: 35 });
  span('scribe', 'Ceiling scribe', [-X, X], [top, H], [D / 2 - t, D / 2], { ...wal, grain: 'x', explode: [0, 0.3, 0.4], note: 'cut 10 mm over and scribed to the ceiling on site' });
  screw('scribe', 'w-top', 'y', 3); screw('scribe', 't-top', 'y', 2);

  const steps = [
    { title: 'Plinth', parts: ids('pl-'), view: 'iso',
      note: 'Dowel the black plinth frame together, set it in the alcove, level it with packers and screw it to the floor or the wall behind.',
      check: 'Level both ways; front rail 50 back from where the doors will be.' },
    { title: 'Base cabinet and counter', parts: [...ids('b-'), 'counter', 'shoe-l', 'shoe-r'], view: 'iso',
      note: 'Dowel the carcass on the bench: sides, bottom, the two partitions with their black-banded front edges, the drawer floor and both dividers. Screw on the back, set it on the plinth, screw down into the plinth and back into the wall. Dowel the counter on.',
      check: 'Partition edges plumb; counter level.' },
    { title: 'Drawers', parts: drawerIds, view: 'iso',
      note: 'Glue up the birch-ply boxes round their bottoms, fit them on the slides, then screw the fronts on from inside with 3 mm gaps and fit the black edge pulls near the centre.',
      check: 'Fronts line up with each other and sit 1.5 mm off each partition.' },
    { title: 'Base doors', parts: ['nd-l', 'nd-r', ...cDoors], view: 'front',
      note: 'Hang the narrow doors on full-overlay hinges on the outer sides. Make the centre doors: groove the stiles, rails and muntins 6 × 10, cut the stub tenons, raise the panels and fit the fretwork vent, glue the joints only. Hang them on zero-overlay (cranked) hinges on the partitions so the black edge stays visible between doors.',
      check: 'An even 21 mm black gap each side of the centre doors; all other gaps 3 mm.' },
    { title: 'Tower', parts: [...ids('t-')], view: 'iso',
      note: 'Dowel the tower: the anthracite side on the left, walnut on the right, top, back with the hooks, and the two anthracite bottle shelves. Stand it on the counter, dowel it down and screw it to the wall.',
      check: 'Tower plumb and tight to the counter.' },
    { title: 'Key column', parts: ids('k-'), view: 'iso',
      note: 'Dowel the column side, shelves and top against the tower side, screw on the back with the key hook.',
      check: 'Top shelf in line with the upper floating shelf.' },
    { title: 'Floating shelves', parts: ids('float-'), view: 'front',
      note: 'Drill the wall for two concealed ⌀12 rods per shelf, glue the rods in, slide each shelf on and dowel its right end into the column. Fit the LED profile under the lower shelf (wiring by an electrician).',
      check: 'Shelves level; no sag at the wall end.' },
    { title: 'Wall cupboard', parts: ids('w-').filter(id => !id.startsWith('wd-')), view: 'iso',
      note: 'Dowel the cupboard, screw on the back, hang it on two cabinet hangers on a wall rail at 2037 underside, and screw its right side to the tower.',
      check: 'Cupboard underside level at 2037.' },
    { title: 'Cane box and flap', parts: [...ids('cb-'), ...ids('cf-')], view: 'front',
      note: 'Fix the anthracite box under the cupboard, set back 60, screwed up into the cupboard and down onto the key column. Make the flap frame, press in the soaked cane, and hang it on a side-mounted lift-up fitting.',
      check: 'Flap stays up when lifted and closes flush.' },
    { title: 'Wall-cupboard doors and scribe', parts: ['wd-l', 'wd-r', 'scribe'], view: 'front',
      note: 'Hang the doors on full-overlay hinges and fit the black edge pulls at the bottom centre. Scribe the fascia to the ceiling and screw it to the tops.',
      check: 'Door gaps 3 mm; no gap along the ceiling.' },
  ];

  const n = type => joints.filter(j => j.type === type).reduce((s, j) => s + (j.count ?? 1), 0);
  const cups = joints.filter(j => j.type === 'hinge' && j.cup).reduce((s, j) => s + j.at.length, 0);
  const hardware = [
    { qty: cups, name: '35 mm cup hinge, soft-close, clip-on plate', note: 'full overlay on the outer sides; the 4 for the centre doors are zero-overlay (cranked) on the partitions' },
    { qty: 1, name: 'Lift-up flap fitting, side-mounted, for a 372 × 329 flap of about 3 kg', note: 'cane box' },
    { qty: 2, name: 'Pair of 350 mm full-extension side-mount ball-bearing slides, 12.5 mm', note: 'one pair per drawer' },
    { qty: 4, name: 'Edge pull 240 mm, matt black', note: 'drawers and centre doors, near the centre line' },
    { qty: 2, name: 'Edge pull 140 mm, matt black', note: 'wall-cupboard doors, bottom centre' },
    { qty: 3, name: 'Coat hook, matt black', note: `two on the tower back at ${P.hookY} mm, one in the key column` },
    { qty: 4, name: 'Concealed floating-shelf rod ⌀12 × 200, with resin anchors', note: 'two per floating shelf, into the wall' },
    { qty: 2, name: 'Cabinet hanger with wall rail', note: 'wall cupboard' },
    { qty: 1, name: 'Surface LED profile with opal diffuser, 2700 K, about 550 mm, with a 24 V driver', note: 'under the lower floating shelf; wired by an electrician' },
    { qty: n('shelf-pin'), name: '⌀5 shelf-support pin', note: 'shoe shelves and wall-cupboard shelf' },
    { qty: n('dowel'), name: '⌀8 × 30 fluted beech dowel', note: 'carcass joints' },
    { qty: n('screw'), name: '4 × 30 mm screw', note: 'backs, plinth, boxes to each other, drawer fronts' },
    { qty: 6, name: 'Wall plug and 5 × 70 screw', note: 'base, tower and cupboard to the wall' },
    { qty: 1, name: 'Black edge banding 22 mm, about 2 m', note: 'front edges of the two base partitions' },
    { qty: 1, name: 'Reed spline for cane webbing, about 1.4 m', note: 'cane flap' },
  ];
  return { parts, joints, steps, hardware };
}

export const piece = definePiece({
  name: spec.name, type: spec.type, params: spec.params, source: spec.source,
  // colours read off the photo: a cooler, greyer walnut
  materials: {
    'walnut-mdf': { name: 'Walnut-veneered MDF', base: '#8f735b', dark: '#4f3d2f', ring: 0.5, streak: 1.1 },
    'walnut-solid': { name: 'Black walnut, solid', base: '#8f735b', dark: '#4f3d2f', ring: 0.5, streak: 1.1 },
    'fret-mdf': { name: 'Walnut-veneered MDF, fretwork', base: '#8f735b', dark: '#4f3d2f' },
    'mdf-anthracite': { name: 'MDF, painted anthracite' },
    'mdf-black': { name: 'MDF, painted matt black' },
    'birch-ply': { name: 'Birch plywood' },
    cane: { name: 'Rattan cane webbing', base: '#968676', dark: '#6b5e51', streak: 1.4 },
  },
  build,
});
export default piece;
