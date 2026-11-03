// walnut-display-cabinet/model.js — the cabinet as a function of P. No three.js here.
import { definePiece, box, quarterRing, roundedRect } from '../../kit/model.js';
import spec from './spec.json' with { type: 'json' };

export function build(P) {
  const { W, D, H, plinthH, plinthT, plinthInsetX, plinthFront, plinthBack, t, R, backT, rebate,
    doorT, doorGap, doorMid, doorSet, shelves: nS, shelfT, shelfClear, shelfFront, material, edge } = P;
  const y0 = plinthH, caseH = H - plinthH, yMid = y0 + caseH / 2;
  const Wi = W - 2 * t, Hi = caseH - 2 * t, Ri = R - t;
  const parts = [], joints = [];
  const band = 'front edge: 2 mm walnut edge band, applied in one strip round the whole shell after glue-up';

  // the shell: four flat panels and four bent corners, grain running round the wrap
  parts.push(box('top', 'Top', [W - 2 * R, t, D], [0, H - t / 2, 0], { grain: 'x', material, edge, explode: [0, 0.62, 0], note: band }));
  parts.push(box('bottom', 'Bottom', [W - 2 * R, t, D], [0, y0 + t / 2, 0], { grain: 'x', material, edge, explode: [0, 0.1, 0], note: band }));
  for (const sx of [-1, 1])
    parts.push(box(sx < 0 ? 'side-l' : 'side-r', 'Side', [t, caseH - 2 * R, D], [sx * (W - t) / 2, yMid, 0], { grain: 'y', material, edge, explode: [sx * 0.42, 0.3, 0], note: band }));
  const arc = Math.round(Math.PI / 2 * R);   // developed length of the outside face
  for (const [id, sx, sy] of [['corner-tl', -1, 1], ['corner-tr', 1, 1], ['corner-bl', -1, -1], ['corner-br', 1, -1]])
    parts.push(box(id, 'Bent corner', [R, R, D], [sx * (W - R) / 2, sy > 0 ? H - R / 2 : y0 + R / 2, 0], {
      grain: 'x', material: 'walnut-bendply', explode: [sx * 0.62, sy > 0 ? 0.52 : 0.06, 0],
      profile: { axis: 'z', path: quarterRing(R, t, [sx, sy]), note: `R${R} outside, R${Ri} inside, 90°` },
      stock: { L: arc, W: D, T: t, layers: 3, layerT: 8 },
      note: `3 × 8 mm bending ply + walnut veneer both faces, glued over an R${Ri} form; trim to a true 90° and to depth after. ${band}`,
    }));
  const dowels = { type: 'dowel', count: 4, d: 8, len: 30 };
  for (const [a, b] of [['top', 'corner-tl'], ['top', 'corner-tr'], ['bottom', 'corner-bl'], ['bottom', 'corner-br'],
    ['side-l', 'corner-tl'], ['side-l', 'corner-bl'], ['side-r', 'corner-tr'], ['side-r', 'corner-br']]) joints.push({ a, b, ...dowels });

  // back: drops into a rebate routed round the inside of the shell's back edge (1 mm clearance)
  const bw = Wi + 2 * (rebate - 1), bh = Hi + 2 * (rebate - 1);
  parts.push(box('back', 'Back', [bw, bh, backT], [0, yMid, -(D - backT) / 2], {
    grain: 'y', material, explode: [0, 0.3, -0.85],
    profile: { axis: 'z', path: roundedRect(bw, bh, Ri + rebate - 1), note: `corners R${Ri + rebate - 1}` },
    note: 'book-matched walnut face, grain vertical; glued and pinned into the rebate every 150 mm',
  }));
  for (const b of ['top', 'bottom', 'side-l', 'side-r', 'corner-tl', 'corner-tr', 'corner-bl', 'corner-br'])
    joints.push({ a: 'back', b, type: 'rebate', face: 'z', depth: rebate });

  // plinth: a black frame set in under the flat of the bottom
  const blk = 'mdf-black', Lp = W - 2 * plinthInsetX;
  const zF = D / 2 - plinthFront - plinthT / 2, zB = -D / 2 + plinthBack + plinthT / 2;
  parts.push(box('plinth-f', 'Plinth rail', [Lp, plinthH, plinthT], [0, plinthH / 2, zF], { grain: 'x', material: blk, explode: [0, 0, 0.45] }));
  parts.push(box('plinth-b', 'Plinth rail', [Lp, plinthH, plinthT], [0, plinthH / 2, zB], { grain: 'x', material: blk, inferred: true, explode: [0, 0, -0.45] }));
  for (const sx of [-1, 1]) {
    const id = sx < 0 ? 'plinth-l' : 'plinth-r';
    parts.push(box(id, 'Plinth end', [plinthT, plinthH, zF - zB - plinthT], [sx * (Lp - plinthT) / 2, plinthH / 2, (zF + zB) / 2], { grain: 'z', material: blk, inferred: true, explode: [sx * 0.4, 0, 0] }));
    joints.push({ a: id, b: 'plinth-f', type: 'dowel', count: 2, d: 8, len: 30 }, { a: id, b: 'plinth-b', type: 'dowel', count: 2, d: 8, len: 30 });
    joints.push({ a: id, b: 'bottom', type: 'pocket-screw', face: 'y', count: 2 });
  }
  joints.push({ a: 'plinth-f', b: 'bottom', type: 'pocket-screw', face: 'y', count: 3 }, { a: 'plinth-b', b: 'bottom', type: 'pocket-screw', face: 'y', count: 3 });

  // glass shelves on pins: equal compartments, clear of the back and of the hinges behind the doors
  const cell = (Hi - nS * shelfT) / (nS + 1);
  const zIn = -D / 2 + backT, zDoor = D / 2 - doorSet - doorT, sD = zDoor - shelfFront - zIn;
  const shelfIds = [];
  for (let i = 1; i <= nS; i++) {
    const id = `shelf-${i}`, yb = Math.round(y0 + t + i * cell + (i - 1) * shelfT);
    shelfIds.push(id);
    parts.push(box(id, 'Glass shelf', [Wi - 2 * shelfClear, shelfT, sD], [0, yb + shelfT / 2, zIn + sD / 2], {
      grain: 'x', material: 'glass', explode: [0, 0.3, 0.55], note: 'toughened, all edges polished; 10 mm if it will carry a full row of books' }));
    for (const b of ['side-l', 'side-r']) joints.push({ a: id, b, type: 'shelf-pin', count: 2, d: 5, len: 12, inset: 40 });
  }

  // glass doors: inset, following the inside of the shell with an even gap, hung on clamp hinges on the sides
  const dW = (Wi - 2 * doorGap - doorMid) / 2, dH = Hi - 2 * doorGap, rD = Ri - doorGap;
  const hingeY = [y0 + R + 120, yMid, H - R - 120];
  for (const sx of [-1, 1]) {
    const id = sx < 0 ? 'door-l' : 'door-r';
    parts.push(box(id, 'Glass door', [dW, dH, doorT], [sx * (doorMid + dW) / 2, yMid, D / 2 - doorSet - doorT / 2], {
      grain: 'y', material: 'glass', explode: [sx * 0.15, 0.3, 0.95],
      profile: { axis: 'z', path: roundedRect(dW, dH, sx < 0 ? [1, rD, rD, 1] : [rD, 1, 1, rD]), note: `R${rD} on the two hinge-side corners` },
      note: `6 mm toughened, polished edges; corners radiused before toughening`,
    }));
    joints.push({ a: id, b: sx < 0 ? 'side-l' : 'side-r', type: 'hinge', face: 'x', at: hingeY });
  }

  const steps = [
    { title: 'Bottom and its two corners', parts: ['bottom', 'corner-bl', 'corner-br'], view: 'iso',
      note: `First laminate all four corners: three layers of 8 mm bending ply with a leaf of walnut veneer on each face, glued with a urea-formaldehyde (powder resin) glue (PVA creeps and lets the bend spring back) and clamped over an R${Ri} MDF form for 24 h. Trim each to a true 90° and to ${D} deep. Then dowel and glue two corners to the ends of the bottom, using a curved caul so the clamp pressure lands square on the joint.`,
      check: 'Inside and outside faces flush at both joints; the two curves end square to the bottom.' },
    { title: 'Top and its two corners', parts: ['top', 'corner-tl', 'corner-tr'], view: 'iso',
      note: 'Same as the bottom. Lay both halves face down on a flat bench and check they are the same width at the curve ends; that width is what the sides join.',
      check: `Both halves ${W} mm across the outside of the curve ends.` },
    { title: 'Close the shell with the sides', parts: ['side-l', 'side-r'], view: 'iso',
      note: 'Dry-fit first. Glue the sides between the two halves on a flat bench, front edges down, and pull it together with two ratchet straps round the outside, which follow the curves. Once cured, run the 2 mm walnut edge band round the whole front edge in one strip, starting and ending at the bottom centre.',
      check: 'Diagonals of the opening equal within 1 mm; the shell lies flat with no twist.' },
    { title: 'Rout the rebate and fit the back', parts: ['back'], view: 'back',
      note: `Rout a ${backT} × ${rebate} mm rebate round the inside of the back edge with a bearing-guided rebate bit; it follows the curves. Cut the back to the outline on its drawing, drop it in from behind, glue it and pin it every 150 mm. Fit it with the diagonals equal: the back is what squares the shell.`,
      check: 'Back sits flush with the back edge all round; opening diagonals still equal.' },
    { title: 'Plinth', parts: ['plinth-f', 'plinth-b', 'plinth-l', 'plinth-r'], view: 'under',
      note: `Lay the cabinet on its back on blankets. Dowel and glue the plinth frame, ends between the rails. Screw it to the bottom with pocket screws from inside the rails, ${plinthInsetX} in from each side and ${plinthFront} back from the front.`,
      check: 'Plinth front parallel to the case front; the cabinet stands without rocking.' },
    { title: 'Stand it up, fix it to the wall, fit the shelves', parts: shelfIds, view: 'front',
      note: `Stand the cabinet in place, level it and fix it to the wall with the anti-tip brackets now, before any glass goes in. Drill the ⌀5 × 12 shelf-pin holes with a stop collar and a template (heights on the Side drawing), press in the pins and lay the shelves on.`,
      check: 'Every shelf rests on all four pins and sits level front to back.' },
    { title: 'Hang the glass doors', parts: ['door-l', 'door-r'], view: 'iso',
      note: `Screw the hinge plates to the sides at the heights on the Side drawing, clamp the glass in, and adjust for an even ${doorGap} mm gap round the curves and ${doorMid} mm at the centre. Fit the push latches under the top, either side of the centre.`,
      check: `Gap even all the way round each door; both doors close flush, ${doorSet} mm behind the front edge.` },
  ];

  const hardware = [
    { qty: 6, name: 'Inset glass-door hinge, clamp type for 6 mm glass, side-mounted (no drilling in the glass)', note: '3 per door; check your hinge\'s datasheet for plate position and screws' },
    { qty: 2, name: 'Push-to-open latch with adhesive strike plate for glass', note: 'one per door, under the top near the centre; the photo shows no handles' },
    { qty: 4 * nS, name: '⌀5 shelf-support pin with clear PVC glass cushion', note: '4 per shelf' },
    { qty: 8 * 4 + 4 * 2, name: '⌀8 × 30 fluted beech dowel', note: '4 per corner joint, 2 per plinth corner' },
    { qty: 10, name: 'Pocket-hole screw 32 mm, coarse thread', note: 'plinth to bottom' },
    { qty: 40, name: '18 mm panel pin or 3.5 × 16 countersunk screw', note: 'back into its rebate, every 150 mm' },
    { qty: 1, name: 'Walnut edge band 2 × 28 mm, 6 m roll', note: 'one strip round the front edge' },
    { qty: 1, name: 'Walnut veneer 0.6 mm, about 0.6 m²', note: 'both faces of the four bent corners' },
    { qty: 1, name: 'Urea-formaldehyde (powder resin) glue', note: 'bent laminations only; PVA everywhere else' },
    { qty: 2, name: 'Anti-tip wall bracket with fixings for your wall', note: 'not optional: 2 m tall and 400 deep, it tips forward with the doors open' },
  ];
  return { parts, joints, steps, hardware };
}

export const piece = definePiece({
  name: spec.name, type: spec.type, shop: spec.shop, finish: spec.finish, params: spec.params, source: spec.source,
  materials: {
    'walnut-mdf': { name: 'Walnut-veneered MDF' },
    'walnut-bendply': { name: 'Bending ply' },
    'mdf-black': { name: 'MDF, painted matt black' },
    glass: { name: 'Toughened glass, polished edges' },
  },
  build,
});
export default piece;
