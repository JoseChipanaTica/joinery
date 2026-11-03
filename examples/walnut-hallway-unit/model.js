// walnut-hallway-unit/model.js — the hallway built-in as a function of P. No three.js here.
import { definePiece, box } from '../../kit/model.js';
import spec from './spec.json' with { type: 'json' };

export function build(P) {
  const { W, D, H, post, t, backT, gap: g } = P;
  const parts = [], joints = [];
  // a part from its extents: [x0, x1], [y0, y1], [z0, z1]
  const span = (id, name, [x0, x1], [y0, y1], [z0, z1], o = {}) => { parts.push(box(id, name, [x1 - x0, y1 - y0, z1 - z0], [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], o)); return id; };
  const J = (a, b, type, o = {}) => joints.push({ a, b, type, ...o });
  const at = id => parts.find(p => p.id === id).at;
  const xi = W / 2 - post;                       // boxes fit between the posts
  const zc = [-D / 2 + backT, D / 2];            // carcass depth, back screwed on behind
  const wal = { material: P.material };
  const dw = { type: 'dowel', count: 3, d: 8, len: 30 };
  const dowel = (a, b, o = {}) => joints.push({ a, b, ...dw, ...o });
  const screw = (a, b, face, count = 2) => J(a, b, 'screw', { face, count });

  // ---- 1. steel frame: four posts, a ring of rails off the floor and one between shoe cabinet and drawers
  const steel = { material: 'steel-black', note: '20 × 20 × 1.5 square tube, matt black powder-coat' };
  for (const [id, sx, sz] of [['post-fl', -1, 1], ['post-fr', 1, 1], ['post-bl', -1, -1], ['post-br', 1, -1]])
    span(id, 'Post', sx < 0 ? [-W / 2, -xi] : [xi, W / 2], [0, P.upperTop], sz > 0 ? [D / 2 - post, D / 2] : [-D / 2, -D / 2 + post],
      { ...steel, grain: 'y', explode: [sx * 0.08, 0, sz * 0.08], note: '20 × 20 × 1.5 square tube, matt black powder-coat; M8 levelling glide welded into the foot' });
  for (const [lvl, y0] of [['low', P.ringLow], ['mid', P.lowerTop]]) {
    const y = [y0, y0 + post];
    for (const sz of [1, -1]) {
      const id = span(`rail-${lvl}-${sz > 0 ? 'f' : 'b'}`, 'Long rail', [-xi, xi], y, sz > 0 ? [D / 2 - post, D / 2] : [-D / 2, -D / 2 + post], { ...steel, grain: 'x', explode: [0, 0, sz * 0.08] });
      J(id, sz > 0 ? 'post-fl' : 'post-bl', 'weld'); J(id, sz > 0 ? 'post-fr' : 'post-br', 'weld');
    }
    for (const sx of [-1, 1]) {
      const id = span(`rail-${lvl}-${sx < 0 ? 'l' : 'r'}`, 'Short rail', sx < 0 ? [-W / 2, -xi] : [xi, W / 2], y, [-D / 2 + post, D / 2 - post], { ...steel, grain: 'z', explode: [sx * 0.08, 0, 0] });
      J(id, sx < 0 ? 'post-fl' : 'post-fr', 'weld'); J(id, sx < 0 ? 'post-bl' : 'post-br', 'weld');
    }
  }

  // ---- 2. shoe cabinet
  const yL0 = P.ringLow + post, yL1 = P.lowerTop;
  const lo = { ...wal, explode: [0, 0, 0.42] };
  span('lo-side-l', 'Shoe cabinet side', [-xi, -xi + t], [yL0, yL1], zc, { ...lo, grain: 'y', explode: [-0.2, 0, 0.42] });
  span('lo-side-r', 'Shoe cabinet side', [xi - t, xi], [yL0, yL1], zc, { ...lo, grain: 'y', explode: [0.2, 0, 0.42] });
  span('lo-bottom', 'Shoe cabinet bottom', [-xi + t, xi - t], [yL0, yL0 + t], zc, { ...lo, grain: 'x', explode: [0, -0.05, 0.42] });
  span('lo-top', 'Shoe cabinet top', [-xi + t, xi - t], [yL1 - t, yL1], zc, { ...lo, grain: 'x', explode: [0, 0.05, 0.42] });
  span('lo-div', 'Shoe cabinet divider', [-t / 2, t / 2], [yL0 + t, yL1 - t], zc, { ...lo, grain: 'y' });
  span('lo-back', 'Shoe cabinet back', [-xi, xi], [yL0, yL1], [-D / 2, -D / 2 + backT], { ...lo, grain: 'x', explode: [0, 0, 0.2], inferred: true });
  for (const s of ['lo-side-l', 'lo-side-r']) { dowel('lo-bottom', s); dowel('lo-top', s); screw('lo-back', s, 'z', 4); }
  dowel('lo-div', 'lo-bottom'); dowel('lo-div', 'lo-top');
  for (const r of ['rail-low-f', 'rail-low-b']) screw('lo-bottom', r, 'y');
  const yShoe = Math.round((yL0 + yL1) / 2);
  for (const [id, x0, x1, side] of [['shoe-l', -xi + t + 1, -t / 2 - 1, 'lo-side-l'], ['shoe-r', t / 2 + 1, xi - t - 1, 'lo-side-r']]) {
    span(id, 'Shoe shelf', [x0, x1], [yShoe, yShoe + t], [zc[0], D / 2 - 20], { ...lo, grain: 'x', inferred: true, explode: [0, 0, 0.55], note: 'adjustable; slope it 15° on a second pair of pins for heeled shoes' });
    J(id, side, 'shelf-pin', { count: 2, d: 5, len: 12, inset: 40 }); J(id, 'lo-div', 'shelf-pin', { count: 2, d: 5, len: 12, inset: 40 });
  }

  // ---- 3. drawer case and counter
  const yD0 = P.lowerTop + post, yD1 = P.counterTop, yC = yD1 - P.counterT;
  const dc = { ...wal, explode: [0, 0, 0.42] };
  span('dr-side-l', 'Drawer case side', [-xi, -xi + t], [yD0, yC], zc, { ...dc, grain: 'y', explode: [-0.2, 0, 0.42] });
  span('dr-side-r', 'Drawer case side', [xi - t, xi], [yD0, yC], zc, { ...dc, grain: 'y', explode: [0.2, 0, 0.42] });
  span('dr-bottom', 'Drawer case bottom', [-xi + t, xi - t], [yD0, yD0 + t], zc, { ...dc, grain: 'x' });
  span('dr-div', 'Drawer case divider', [-t / 2, t / 2], [yD0 + t, yC], zc, { ...dc, grain: 'y' });
  span('counter', 'Counter', [-xi, xi], [yC, yD1], [-D / 2, D / 2 + P.overhang], { ...wal, grain: 'x', explode: [0, 0.1, 0.42], note: `25 mm; overhangs the drawer fronts by ${P.overhang}; front edge banded` });
  span('dr-back', 'Drawer case back', [-xi, xi], [yD0, yC], [-D / 2, -D / 2 + backT], { ...dc, grain: 'x', explode: [0, 0, 0.2], inferred: true });
  for (const s of ['dr-side-l', 'dr-side-r']) { dowel('dr-bottom', s); dowel(s, 'counter'); screw('dr-back', s, 'z', 2); }
  dowel('dr-div', 'dr-bottom'); dowel('dr-div', 'counter');
  for (const r of ['rail-mid-f', 'rail-mid-b']) screw('dr-bottom', r, 'y');
  screw('lo-top', 'rail-mid-f', 'y');

  // ---- 4. drawers: birch-ply box on side-mount slides, walnut front with an edge pull
  const pull = (w, h) => ({ kind: 'edge pull 160', size: [160, 8, 26], at: [0, h / 2 - 2, 4], axis: 'z', dir: 1, material: 'steel', holes: { n: 2, d: 4, cc: 128, axis: 'x' } });
  const drawerIds = [];
  for (const [n, ox0, ox1, sideL, sideR] of [['l', -xi + t, -t / 2, 'dr-side-l', 'dr-div'], ['r', t / 2, xi - t, 'dr-div', 'dr-side-r']]) {
    const bx0 = ox0 + P.slide, bx1 = ox1 - P.slide, by0 = yD0 + t + 12, by1 = by0 + P.drawerH, bz0 = D / 2 - P.drawerD, bz1 = D / 2;
    const ply = { material: 'birch-ply', inferred: true, explode: [0, 0, 0.75] }, T = 15;
    const ids = [`dw${n}-side-l`, `dw${n}-side-r`, `dw${n}-front`, `dw${n}-back`, `dw${n}-bottom`, `dw${n}-face`];
    span(ids[0], 'Drawer side', [bx0, bx0 + T], [by0, by1], [bz0, bz1], { ...ply, grain: 'z' });
    span(ids[1], 'Drawer side', [bx1 - T, bx1], [by0, by1], [bz0, bz1], { ...ply, grain: 'z' });
    span(ids[2], 'Drawer box end', [bx0 + T, bx1 - T], [by0, by1], [bz1 - T, bz1], { ...ply, grain: 'x' });
    span(ids[3], 'Drawer box end', [bx0 + T, bx1 - T], [by0, by1], [bz0, bz0 + T], { ...ply, grain: 'x' });
    span(ids[4], 'Drawer bottom', [bx0 + T - 6, bx1 - T + 6], [by0 + 10, by0 + 16], [bz0 + T - 6, bz1 - T + 6], { ...ply, grain: 'x' });
    const fx0 = ox0 - t + g / 2 * (n === 'l' ? 1 : 0) + (n === 'r' ? t / 2 + g / 2 - t : 0);
    const face = n === 'l' ? [-xi + g / 2, -g / 2] : [g / 2, xi - g / 2];
    const fh = yC - g / 2 - (yD0 + g / 2);
    span(ids[5], 'Drawer front', face, [yD0 + g / 2, yC - g / 2], [D / 2, D / 2 + t], { ...wal, grain: 'x', explode: [0, 0, 0.95], fittings: [pull(face[1] - face[0], fh)] });
    for (const e of [ids[2], ids[3]]) for (const s of [ids[0], ids[1]]) J(e, s, 'dado', { depth: 6, face: 'x' });
    for (const s of [ids[0], ids[1]]) J(ids[4], s, 'groove', { width: 6, depth: 6, face: 'x' });
    for (const e of [ids[2], ids[3]]) J(ids[4], e, 'groove', { width: 6, depth: 6, face: 'z' });
    J(ids[5], ids[2], 'screw', { face: 'z', count: 4 });
    J(ids[0], sideL, 'runner', { face: 'x' }); J(ids[1], sideR, 'runner', { face: 'x' });
    drawerIds.push(...ids);
    void fx0;
  }

  // ---- 5. middle: lit bay on the left, coat bay on the right
  const yM0 = P.counterTop, yM1 = P.upperBottom, dx = P.divX;
  span('mid-div', 'Bay divider', [dx - t / 2, dx + t / 2], [yM0, yM1], [-D / 2 + t, D / 2], { ...wal, grain: 'y', explode: [0, 0, 0.42] });
  span('back-lit', 'Lit bay back', [-xi, dx], [yM0, yM1], [-D / 2, -D / 2 + t], { material: 'mdf-white', grain: 'y', explode: [0, 0, 0.15], note: 'painted white; the LED profiles wash it with light' });
  const hookX = i => dx + t / 2 + (xi - dx - t / 2) * (i + 1) / (P.hooks + 1) - (xi + dx) / 2;
  span('back-hook', 'Coat bay back', [dx, xi], [yM0, yM1], [-D / 2, -D / 2 + t], { ...wal, grain: 'y', explode: [0, 0, 0.15],
    fittings: Array.from({ length: P.hooks }, (_, i) => ({ kind: 'coat hook', size: [14, 70, 55], at: [hookX(i), P.hookY - (yM0 + yM1) / 2, t / 2 + 27.5], axis: 'z', dir: 1, material: 'steel-black', holes: { n: 2, d: 4, cc: 40, axis: 'y' } })) });
  dowel('mid-div', 'counter'); screw('mid-div', 'back-lit', 'z'); screw('mid-div', 'back-hook', 'z');
  screw('back-lit', 'post-bl', 'x', 4); screw('back-hook', 'post-br', 'x', 4);
  screw('back-lit', 'counter', 'y'); screw('back-hook', 'counter', 'y');
  const cell = (yM1 - yM0 - P.litShelves * t) / (P.litShelves + 1);
  const litIds = [];
  for (let i = 1; i <= P.litShelves; i++) {
    const yb = Math.round(yM0 + i * cell + (i - 1) * t), id = `lit-${i}`, sx0 = -xi, sx1 = dx - t / 2;
    litIds.push(id);
    span(id, 'Lit shelf', [sx0, sx1], [yb, yb + t], [-D / 2 + t, D / 2], { ...wal, grain: 'x', explode: [0, 0, 0.6],
      fittings: [{ kind: 'LED profile', size: [sx1 - sx0 - 30, 8, 16], at: [0, -t / 2 - 4, D / 2 - 30 - (D / 2 + (-D / 2 + t)) / 2], material: 'led' }] });
    dowel(id, 'mid-div');
    const b = span(`brk-${i}`, 'Shelf bracket', [-xi, -xi + 30], [yb - 5, yb], [D / 2 - 60, D / 2], { ...steel, grain: 'z', inferred: true, explode: [0, 0, 0.6], note: '30 × 5 flat bar welded to the inside of the front post; shelf screwed down onto it' });
    J(b, 'post-fl', 'weld', { face: 'x' }); screw(id, b, 'y', 1);
    screw('back-lit', id, 'z', 3);   // the back edge is screwed through the back
  }

  // ---- 6. upper cupboard
  const yU0 = P.upperBottom, yU1 = P.upperTop, { p1, p2, p3, s1 } = P;
  const up = { ...wal, explode: [0, 0, 0.42] };
  span('up-side-l', 'Upper side', [-xi, -xi + t], [yU0, yU1], zc, { ...up, grain: 'y', explode: [-0.2, 0, 0.42] });
  span('up-side-r', 'Upper side', [xi - t, xi], [yU0, yU1], zc, { ...up, grain: 'y', explode: [0.2, 0, 0.42] });
  const upBottomZ = (zc[0] + zc[1]) / 2;
  span('up-bottom', 'Upper bottom', [-xi + t, xi - t], [yU0, yU0 + t], zc, { ...up, grain: 'x', explode: [0, -0.05, 0.42],
    fittings: [{ kind: 'LED profile', size: [dx - t / 2 + xi - 30, 8, 16], at: [(-xi + dx - t / 2) / 2, -t / 2 - 4, D / 2 - 30 - upBottomZ], material: 'led' }] });
  span('up-top', 'Upper top', [-xi + t, xi - t], [yU1 - t, yU1], zc, { ...up, grain: 'x', explode: [0, 0.05, 0.42] });
  span('up-p1', 'Upper partition', [p1 - t / 2, p1 + t / 2], [yU0 + t, yU1 - t], zc, { ...up, grain: 'y' });
  span('up-s1', 'Upper shelf', [p1 + t / 2, xi - t], [s1 - t / 2, s1 + t / 2], zc, { ...up, grain: 'x' });
  span('up-p2', 'Cubby partition', [p2 - t / 2, p2 + t / 2], [s1 + t / 2, yU1 - t], zc, { ...up, grain: 'y' });
  span('up-p3', 'Niche partition', [p3 - t / 2, p3 + t / 2], [yU0 + t, s1 - t / 2], zc, { ...up, grain: 'y' });
  const ys = Math.round((yU0 + yU1) / 2);
  span('up-shelf', 'Cupboard shelf', [-xi + t + 1, p1 - t / 2 - 1], [ys, ys + t], [zc[0], D / 2 - 20], { ...up, grain: 'x', inferred: true, explode: [0, 0, 0.55] });
  span('up-back-1', 'Upper back, left', [-xi, p1 + t / 2], [yU0, yU1], [-D / 2, -D / 2 + backT], { ...up, grain: 'y', explode: [0, 0, 0.2], inferred: true });
  span('up-back-2', 'Upper back, cubby', [p1 + t / 2, xi], [s1 - t / 2, yU1], [-D / 2, -D / 2 + backT], { ...up, grain: 'x', explode: [0, 0, 0.2] });
  span('up-back-3', 'Upper back, small', [p3 - t / 2, xi], [yU0, s1 - t / 2], [-D / 2, -D / 2 + backT], { ...up, grain: 'y', explode: [0, 0, 0.2], inferred: true, note: 'the niche beside it has no back: the electrical panel must stay reachable' });
  for (const s of ['up-side-l', 'up-side-r']) { dowel('up-bottom', s); dowel('up-top', s); }
  dowel('up-p1', 'up-bottom'); dowel('up-p1', 'up-top'); dowel('up-s1', 'up-p1'); dowel('up-s1', 'up-side-r');
  dowel('up-p2', 'up-s1'); dowel('up-p2', 'up-top'); dowel('up-p3', 'up-bottom'); dowel('up-p3', 'up-s1');
  dowel('mid-div', 'up-bottom');
  J('up-shelf', 'up-side-l', 'shelf-pin', { count: 2, d: 5, len: 12, inset: 40 }); J('up-shelf', 'up-p1', 'shelf-pin', { count: 2, d: 5, len: 12, inset: 40 });
  screw('up-back-1', 'up-side-l', 'z', 4); screw('up-back-1', 'up-p1', 'z', 4);
  screw('up-back-2', 'up-side-r', 'z', 3); screw('up-back-2', 'up-s1', 'z', 3);
  screw('up-back-3', 'up-side-r', 'z', 3); screw('up-back-3', 'up-p3', 'z', 3);
  for (const [s, ps] of [['up-side-l', ['post-fl', 'post-bl']], ['up-side-r', ['post-fr', 'post-br']], ['lo-side-l', ['post-fl']], ['lo-side-r', ['post-fr']]])
    for (const p of ps) screw(s, p, 'x', 3);

  // ---- 7. top board and ceiling scribe
  span('top-board', 'Top', [-W / 2, W / 2], [yU1, yU1 + P.topT], [-D / 2, D / 2], { ...wal, grain: 'x', explode: [0, 0.18, 0.3], note: 'covers the post tops; screwed up through the welded cap plates' });
  span('scribe', 'Ceiling scribe', [-W / 2, W / 2], [yU1 + P.topT, H], [D / 2 - t, D / 2], { ...wal, grain: 'x', explode: [0, 0.26, 0.45], note: 'cut 10 mm over and scribed to the ceiling on site' });
  for (const p of ['post-fl', 'post-fr', 'post-bl', 'post-br']) J(p, 'top-board', 'screw', { count: 1 });
  screw('up-top', 'top-board', 'y', 4); screw('scribe', 'top-board', 'y', 3);

  // ---- 8. frame-and-panel shoe-cabinet doors with a fretwork vent
  function panelDoor(id, [x0, x1], [y0, y1], hingeOn, hingeLeft) {
    const { frameT, stile: sw, railTop, railLat, railMid, railBot, muntin: mw, latH, panelT, latT, groove, grooveD } = P;
    const z = [D / 2, D / 2 + frameT], zm = D / 2 + frameT / 2, ids = [];
    const o = (grain, extra = {}) => ({ material: 'walnut-solid', grain, explode: [0, 0, 0.95], ...extra });
    const S = (sid, name, xs, ys, zs, opt) => { ids.push(span(`${id}-${sid}`, name, xs, ys, zs, opt)); return `${id}-${sid}`; };
    const xa = x0 + sw, xb = x1 - sw, xm = (x0 + x1) / 2;
    const yBot = y0 + railBot, yTopB = y1 - railTop, yLatT = yTopB - latH, yLatB = yLatT - railLat;
    const row = (yLatB - yBot - railMid) / 2, yMidB = yBot + row, yMidT = yMidB + railMid;
    const hinge = { note: 'make the two doors as a mirrored pair' };
    const sl = S('sl', hingeLeft ? 'Door stile, hinge side' : 'Door stile, meeting side', [x0, xa], [y0, y1], z, o('y', hinge));
    const sr = S('sr', hingeLeft ? 'Door stile, meeting side' : 'Door stile, hinge side', [xb, x1], [y0, y1], z, o('y', hinge));
    const rb = S('rb', 'Door bottom rail', [xa, xb], [y0, yBot], z, o('x'));
    const rm = S('rm', 'Door rail', [xa, xb], [yMidB, yMidT], z, o('x'));
    const rl = S('rl', 'Door rail', [xa, xb], [yLatB, yLatT], z, o('x'));
    const rt = S('rt', 'Door top rail', [xa, xb], [yTopB, y1], z, o('x', { fittings: [pull(xb - xa, railTop)] }));
    for (const r of [rb, rm, rl, rt]) for (const s of [sl, sr]) J(r, s, 'mortise-tenon', { tenonLen: 25, tenonT: 7, shoulder: 6 });
    const m1 = S('m1', 'Door muntin', [xm - mw / 2, xm + mw / 2], [yBot, yMidB], z, o('y'));
    const m2 = S('m2', 'Door muntin', [xm - mw / 2, xm + mw / 2], [yMidT, yLatB], z, o('y'));
    J(m1, rb, 'mortise-tenon', { tenonLen: 15, tenonT: 7, shoulder: 6 }); J(m1, rm, 'mortise-tenon', { tenonLen: 15, tenonT: 7, shoulder: 6 });
    J(m2, rm, 'mortise-tenon', { tenonLen: 15, tenonT: 7, shoulder: 6 }); J(m2, rl, 'mortise-tenon', { tenonLen: 15, tenonT: 7, shoulder: 6 });
    const e = grooveD - 1;   // panels stop 1 mm short of the groove bottom so they can move
    const pz = [zm - panelT / 2, zm + panelT / 2];
    const cells = [[sl, m1, rb, rm, [xa, xm - mw / 2], [yBot, yMidB]], [m1, sr, rb, rm, [xm + mw / 2, xb], [yBot, yMidB]],
      [sl, m2, rm, rl, [xa, xm - mw / 2], [yMidT, yLatB]], [m2, sr, rm, rl, [xm + mw / 2, xb], [yMidT, yLatB]]];
    cells.forEach(([l, r, b, tt, xs, ys], i) => {
      const pw = xs[1] - xs[0], ph = ys[1] - ys[0];
      // whole millimetres: round the panel down and keep it centred in its opening
      const PW = Math.floor(pw + 2 * e), PH = Math.floor(ph + 2 * e), cxp = (xs[0] + xs[1]) / 2, cyp = (ys[0] + ys[1]) / 2;
      const pid = S(`p${i + 1}`, 'Raised panel', [cxp - PW / 2, cxp + PW / 2], [cyp - PH / 2, cyp + PH / 2], pz,
        { ...o('y'), explode: [0, 0, 1.12], note: `solid walnut, field raised on the front, edges thinned to a ${groove} mm tongue; floats, no glue`,
          fittings: [{ kind: 'raised field', size: [pw - 44, ph - 44, 4], at: [0, 0, panelT / 2 + 1.5], material: 'walnut-solid' }] });
      for (const [m, f] of [[l, 'x'], [r, 'x'], [b, 'y'], [tt, 'y']]) J(pid, m, 'groove', { width: groove, depth: grooveD, face: f });
    });
    const LW = Math.floor(xb - xa + 2 * e), LH = Math.floor(yTopB - yLatT + 2 * e), lcx = (xa + xb) / 2, lcy = (yLatT + yTopB) / 2;
    const lat = S('lat', 'Fretwork vent panel', [lcx - LW / 2, lcx + LW / 2], [lcy - LH / 2, lcy + LH / 2], [zm - latT / 2, zm + latT / 2],
      { material: 'fret-mdf', grain: 'x', explode: [0, 0, 1.12], note: 'CNC-cut diagonal lattice, 5 mm bars on a 26 mm pitch; lets the shoe cabinet breathe' });
    for (const [m, f] of [[sl, 'x'], [sr, 'x'], [rl, 'y'], [rt, 'y']]) J(lat, m, 'groove', { width: groove, depth: grooveD, face: f });
    J(hingeLeft ? sl : sr, hingeOn, 'hinge', { face: 'x', at: [y0 + 100, y1 - 100], cup: 35 });
    return ids;
  }
  const loDoors = [...panelDoor('dl', [-xi + g / 2, -g / 2], [yL0 + g / 2, yL1 - g / 2], 'lo-side-l', true),
    ...panelDoor('dr', [g / 2, xi - g / 2], [yL0 + g / 2, yL1 - g / 2], 'lo-side-r', false)];

  // ---- 9. upper doors: cane door, two slab doors
  const bar = (x, y) => ({ kind: 'bar handle 128', size: [12, 150, 30], at: [x, y, t / 2 + 15], axis: 'z', dir: 1, material: 'steel-black', holes: { n: 2, d: 4, cc: 128, axis: 'y' } });
  const cx = [-xi + g / 2, p1 - g / 2], cy = [yU0 + g / 2, yU1 - g / 2], cz = [D / 2, D / 2 + P.frameT];
  const cs = P.caneStile, cr = P.caneRail, co = (grain, extra = {}) => ({ material: 'walnut-solid', grain, explode: [0, 0, 0.95], ...extra });
  span('cd-sl', 'Cane door stile', [cx[0], cx[0] + cs], cy, cz, co('y'));
  span('cd-sr', 'Cane door stile', [cx[1] - cs, cx[1]], cy, cz, co('y', { fittings: [{ ...bar(0, yU0 + 150 - (cy[0] + cy[1]) / 2), at: [0, yU0 + 150 - (cy[0] + cy[1]) / 2, P.frameT / 2 + 15] }] }));
  span('cd-rb', 'Cane door rail', [cx[0] + cs, cx[1] - cs], [cy[0], cy[0] + cr], cz, co('x'));
  span('cd-rt', 'Cane door rail', [cx[0] + cs, cx[1] - cs], [cy[1] - cr, cy[1]], cz, co('x'));
  for (const r of ['cd-rb', 'cd-rt']) for (const s of ['cd-sl', 'cd-sr']) J(r, s, 'mortise-tenon', { tenonLen: 25, tenonT: 7, shoulder: 8 });
  const ce = 7, czm = D / 2 + P.frameT / 2;
  span('cd-cane', 'Cane panel', [cx[0] + cs - ce, cx[1] - cs + ce], [cy[0] + cr - ce, cy[1] - cr + ce], [czm - P.caneT / 2, czm + P.caneT / 2],
    { material: 'cane', grain: 'y', explode: [0, 0, 1.12], note: 'open-weave rattan webbing, soaked and pressed into a 4 × 8 groove with a reed spline' });
  for (const [m, f] of [['cd-sl', 'x'], ['cd-sr', 'x'], ['cd-rb', 'y'], ['cd-rt', 'y']]) J('cd-cane', m, 'groove', { width: 4, depth: 8, face: f });
  J('cd-sl', 'up-side-l', 'hinge', { face: 'x', at: [cy[0] + 100, cy[1] - 100], cup: 35 });
  const um = [[p1 + g / 2, p2 - g / 2], [s1 + g / 2, yU1 - g / 2]], sm = [[p3 + g / 2, xi - g / 2], [yU0 + g / 2, s1 - g / 2]];
  const mid = r => (r[0] + r[1]) / 2, len = r => r[1] - r[0];
  span('door-um', 'Upper door', um[0], um[1], [D / 2, D / 2 + t], { ...wal, grain: 'y', explode: [0, 0, 0.95], fittings: [bar(len(um[0]) / 2 - 30, -len(um[1]) / 2 + 110)] });
  span('door-sm', 'Small door', sm[0], sm[1], [D / 2, D / 2 + t], { ...wal, grain: 'y', explode: [0, 0, 0.95], fittings: [bar(-len(sm[0]) / 2 + 30, 0)] });
  J('door-um', 'up-p1', 'hinge', { face: 'x', at: [um[1][0] + 90, um[1][1] - 90], cup: 35 });
  J('door-sm', 'up-side-r', 'hinge', { face: 'x', at: [sm[1][0] + 80, sm[1][1] - 80], cup: 35 });
  void mid;

  const ids = pre => parts.filter(p => p.id.startsWith(pre)).map(p => p.id);
  const steps = [
    { title: 'Steel frame', parts: [...ids('post-'), ...ids('rail-'), ...ids('brk-')], view: 'iso',
      note: 'Have a metal shop weld the frame from 20 × 20 × 1.5 square tube: four posts, a ring of rails 20 mm off the floor, a second ring at 650, and a shelf bracket inside the front-left post at each lit shelf. Weld a cap plate with a 5 mm hole on each post top and an M8 nut in each foot. Powder-coat matt black. Drill 5 mm holes through the posts where the boxes screw on (see the steps below).',
      check: 'Diagonals of every face equal within 1 mm; it stands on the glides without rocking.' },
    { title: 'Shoe cabinet', parts: [...ids('lo-'), 'shoe-l', 'shoe-r'], view: 'iso',
      note: 'Dowel and glue the carcass on the bench, square it with the back, then lift it in between the posts onto the low rails. Screw down through the bottom into the rails and through the front posts into the sides.',
      check: 'Front edges flush with the front of the posts; the box does not touch the floor.' },
    { title: 'Drawer case and counter', parts: [...ids('dr-'), 'counter'], view: 'iso',
      note: 'Dowel the case with the 25 mm counter on top, overhanging the front by 20. Set it on the middle rails and screw down into them.',
      check: 'Counter level side to side and front to back.' },
    { title: 'Bays: divider, backs and lit shelves', parts: ['mid-div', 'back-lit', 'back-hook', ...litIds], view: 'iso',
      note: 'Screw the two backs to the back posts and to the counter, the white one on the left. Stand the divider on its dowels in the counter and screw it through the backs. Lay each lit shelf on its bracket, dowel it into the divider, screw up through the bracket and through the back into its back edge.',
      check: 'Divider plumb; shelves level and flush with the front.' },
    { title: 'Upper cupboard', parts: ids('up-'), view: 'iso',
      note: 'Dowel the cupboard on the bench: sides, top, bottom, the full-height partition, the shelf at 1932, then the two short partitions. Screw on the three backs and leave the niche open behind for the electrical panel. Slide it in from the front onto the divider dowels and screw through all four posts into its sides.',
      check: 'The electrical panel door opens fully inside the niche.' },
    { title: 'Top and ceiling scribe', parts: ['top-board', 'scribe'], view: 'iso',
      note: 'Screw the top down onto the cupboard and up through the post cap plates. Scribe the fascia to the ceiling (it is cut 10 mm over), then screw it to the top.',
      check: 'No gap along the ceiling line.' },
    { title: 'Drawers', parts: drawerIds, view: 'iso',
      note: 'Glue up the birch-ply boxes with the bottoms sliding into their grooves. Fit the slides to the case and the boxes, then screw the walnut fronts on from inside with a 3 mm gap all round and fit the edge pulls.',
      check: 'Fronts in line with each other and 3 mm below the counter overhang.' },
    { title: 'Shoe-cabinet doors', parts: loDoors, view: 'front',
      note: 'Cut the stiles, rails and muntins, groove them 6 × 10 and cut the stub tenons. Raise the four panels and fit the fretwork vent so everything floats in its groove: glue the joints only, never the panels. Bore the 35 mm hinge cups, hang the doors and fit the edge pulls on the top rails.',
      check: 'Doors meet at the centre with a 3 mm gap and close flush with the drawer fronts above.' },
    { title: 'Upper doors', parts: [...ids('cd-'), 'door-um', 'door-sm'], view: 'front',
      note: 'Make the cane door frame, soak the webbing and press it into the groove with the reed spline; it tightens as it dries. Hang the cane door and the small door on full-overlay hinges and the upper door on half-overlay hinges on the partition. Fit the bar handles.',
      check: 'All gaps 3 mm; the cane is drum-tight once dry.' },
  ];

  const n = type => joints.filter(j => j.type === type).reduce((s, j) => s + (j.count ?? 1), 0);
  const hinges = joints.filter(j => j.type === 'hinge').reduce((s, j) => s + j.at.length, 0);
  const hardware = [
    { qty: 4, name: 'M8 levelling glide', note: 'one in each post foot' },
    { qty: hinges, name: '35 mm cup hinge, soft-close, clip-on plate', note: 'full overlay except the 2 for the upper door on the partition, which are half overlay' },
    { qty: 2, name: 'Pair of 350 mm full-extension side-mount ball-bearing slides, 12.5 mm', note: 'one pair per drawer' },
    { qty: 4, name: 'Edge pull, 160 mm, 128 mm c/c', note: 'drawers and shoe-cabinet doors' },
    { qty: 3, name: 'Bar handle, 128 mm c/c, matt black', note: 'upper doors' },
    { qty: P.hooks, name: 'Coat hook, matt black', note: `on the coat bay back at ${P.hookY} mm` },
    { qty: P.litShelves + 1, name: 'Surface LED profile with opal diffuser, 2700 K strip, cut to length', note: 'under the cupboard and under each lit shelf; with a 24 V driver and a switch, wired by an electrician' },
    { qty: n('shelf-pin'), name: '⌀5 shelf-support pin', note: 'shoe shelves and cupboard shelf' },
    { qty: n('dowel'), name: '⌀8 × 30 fluted beech dowel', note: 'carcass joints' },
    { qty: n('screw'), name: '4 × 30 mm screw', note: 'boxes to the frame (through 5 mm holes in the tube), backs, top, drawer fronts' },
    { qty: 1, name: 'Reed spline for cane webbing, about 2.2 m', note: 'cane door' },
  ];
  return { parts, joints, steps, hardware };
}

export const piece = definePiece({
  name: spec.name, type: spec.type, params: spec.params, source: spec.source,
  // colours read off the photo: a lighter, more golden walnut than the kit default
  materials: {
    'walnut-mdf': { name: 'Walnut-veneered MDF', base: '#9c7a58', dark: '#5a4230', ring: 0.5, streak: 1.0 },
    'walnut-solid': { name: 'Black walnut, solid', base: '#9c7a58', dark: '#5a4230', ring: 0.5, streak: 1.0 },
    'fret-mdf': { name: 'Walnut-veneered MDF, fretwork', base: '#9c7a58', dark: '#5a4230' },
    'birch-ply': { name: 'Birch plywood' },
    'mdf-white': { name: 'MDF, painted white' },
    'steel-black': { name: 'Steel, matt black powder-coat' },
    cane: { name: 'Rattan cane webbing', base: '#a8957c', dark: '#76654f', streak: 1.4 },
  },
  build,
});
export default piece;
