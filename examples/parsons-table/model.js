// examples/parsons-table/model.js — the table as a function of P. No three.js here.
import { definePiece, box } from '../../kit/model.js';
import spec from './spec.json' with { type: 'json' };

export function build(P) {
  const { L, D, H, topT, legW, apronH, apronT, edge, material } = P;
  const legH = H - topT;
  const parts = [], joints = [];

  parts.push(box('top', 'Top', [L, topT, D], [0, H - topT / 2, 0], { grain: 'x', material, edge, explode: [0, 1, 0],
    note: 'glue-up of 4–5 boards, grain along length; flatten after glue-up' }));

  // legs at the corners, flush with the top's edge (that is what makes it a Parsons table)
  const legs = [['leg-fl', -1, 1], ['leg-fr', 1, 1], ['leg-bl', -1, -1], ['leg-br', 1, -1]];
  for (const [id, sx, sz] of legs)
    parts.push(box(id, 'Leg', [legW, legH, legW], [sx * (L - legW) / 2, legH / 2, sz * (D - legW) / 2], { grain: 'y', material, edge,
      explode: [sx * 0.35, -1, sz * 0.35] }));

  // aprons: shoulder-to-shoulder between the legs, outer face flush with the leg's outer face
  const yA = legH - apronH / 2;
  parts.push(box('apron-f', 'Long apron', [L - 2 * legW, apronH, apronT], [0, yA, (D - apronT) / 2], { grain: 'x', material, inferred: true, explode: [0, 0, 1] }));
  parts.push(box('apron-b', 'Long apron', [L - 2 * legW, apronH, apronT], [0, yA, -(D - apronT) / 2], { grain: 'x', material, inferred: true, explode: [0, 0, -1] }));
  parts.push(box('apron-l', 'Short apron', [apronT, apronH, D - 2 * legW], [-(L - apronT) / 2, yA, 0], { grain: 'z', material, inferred: true, explode: [-1, 0, 0] }));
  parts.push(box('apron-r', 'Short apron', [apronT, apronH, D - 2 * legW], [(L - apronT) / 2, yA, 0], { grain: 'z', material, inferred: true, explode: [1, 0, 0] }));

  // mortise and tenon at every apron end; the two tenons meeting inside a leg are mitred
  const mt = { type: 'mortise-tenon', tenonLen: 30, shoulder: 10, mitred: true };
  joints.push({ a: 'apron-f', b: 'leg-fl', ...mt }, { a: 'apron-f', b: 'leg-fr', ...mt });
  joints.push({ a: 'apron-b', b: 'leg-bl', ...mt }, { a: 'apron-b', b: 'leg-br', ...mt });
  joints.push({ a: 'apron-l', b: 'leg-fl', ...mt }, { a: 'apron-l', b: 'leg-bl', ...mt });
  joints.push({ a: 'apron-r', b: 'leg-fr', ...mt }, { a: 'apron-r', b: 'leg-br', ...mt });

  // wooden buttons hold the top and let it move across the grain
  const bw = 40, bt = 20, bl = 45;
  let n = 0;
  for (const sz of [1, -1]) for (const x of [-L / 3, 0, L / 3]) {
    const id = `button-${++n}`;
    parts.push(box(id, 'Button', [bw, bt, bl], [x, legH - bt / 2, sz * (D / 2 - apronT - bl / 2)], { grain: 'z', material: 'beech', inferred: true, explode: [0, -0.6, sz * 0.4],
      note: 'tongue 10 × 8 into a groove 10 mm below the apron top edge' }));
    joints.push({ a: id, b: 'top', type: 'screw', face: 'y', count: 1 });
    joints.push({ a: id, b: sz > 0 ? 'apron-f' : 'apron-b', type: 'button', face: 'z' });
  }

  const steps = [
    { title: 'Two end frames', parts: ['leg-fl', 'leg-bl', 'apron-l', 'leg-fr', 'leg-br', 'apron-r'], view: 'iso',
      note: 'Glue a short apron into a pair of legs. Clamp across the tenons, check the diagonals are equal, leave overnight.', check: 'Both frames square, apron flush with the outer faces of the legs.' },
    { title: 'Join the ends with the long aprons', parts: ['apron-f', 'apron-b'], view: 'iso',
      note: 'Dry fit first: the mitred tenon ends must clear each other inside the leg. Glue, clamp lengthwise, check diagonals across the top of the base.', check: 'Base stands flat on a level floor without rocking.' },
    { title: 'Fit the buttons', parts: ['button-1', 'button-2', 'button-3', 'button-4', 'button-5', 'button-6'], view: 'under',
      note: 'Cut a 10 mm groove along the inside of each long apron, 10 mm below the top edge. Slide the button tongues in; leave 3 mm between button shoulder and apron so the top can move.', check: 'Every button slides freely in its groove.' },
    { title: 'Attach the top', parts: ['top'], view: 'iso',
      note: 'Lay the top face down, lower the base onto it centred, screw up through each button into the top. Do not glue the top.', check: 'Legs flush with the top on all four corners; nothing proud.' },
  ];

  const hardware = [{ qty: 6, name: 'No. 8 × 40 mm wood screw', note: 'one per button, pilot-drilled' }, { qty: 1, name: 'PVA wood glue', note: 'aprons to legs only' }];
  return { parts, joints, steps, hardware };
}

export const piece = definePiece({
  name: spec.name, type: spec.type, shop: spec.shop, finish: spec.finish, params: spec.params, source: spec.source,
  materials: { 'white-oak': { name: 'White oak, solid' }, beech: { name: 'Beech, solid' } },
  build,
});
export default piece;
