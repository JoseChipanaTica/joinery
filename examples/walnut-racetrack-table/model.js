// walnut-racetrack-table/model.js — the table as a function of P. No three.js here.
import { definePiece, box, roundedRect, circle } from '../../kit/model.js';
import spec from './spec.json' with { type: 'json' };

export function build(P) {
  const { L, W, H, topT, legD, legFoot, legInZ, apronH, apronT, tenonLen, material } = P;
  const legH = H - topT, R = W / 2;
  const lx = L / 2 - R, lz = W / 2 - legInZ;          // legs under the centres of the end curves
  const parts = [], joints = [];

  parts.push(box('top', 'Top', [L, topT, W], [0, H - topT / 2, 0], { grain: 'x', material, explode: [0, 0.7, 0],
    profile: { axis: 'y', path: roundedRect(W, L, R, 32), note: `racetrack: ${L - W} straight, ends R${R}` },
    note: 'glue-up of five boards, grain along the length; flatten, then cut the ends round with a router on a trammel from the curve centres; bevel the underside of the edge 15° so it reads 18 mm' }));

  // round tapered legs
  const legs = [['leg-fl', -1, 1], ['leg-fr', 1, 1], ['leg-bl', -1, -1], ['leg-br', 1, -1]];
  for (const [id, sx, sz] of legs)
    parts.push(box(id, 'Leg', [legD, legH, legD], [sx * lx, legH / 2, sz * lz], { grain: 'y', material, explode: [sx * 0.35, -0.05, sz * 0.35],
      profile: { axis: 'y', path: circle(legD), taper: { to: legFoot / legD, end: -1 }, note: `⌀${legD} at the top tapering to ⌀${legFoot} at the foot` },
      note: `turn or taper from ${legD} square; cut the mortises while the top is still square, then round` }));

  // apron frame, centred on the legs
  const yA = legH - apronH / 2, la = 2 * lx - legD, sa = 2 * lz - legD;
  parts.push(box('apron-f', 'Long apron', [la, apronH, apronT], [0, yA, lz], { grain: 'x', material, inferred: true, explode: [0, 0, 0.6] }));
  parts.push(box('apron-b', 'Long apron', [la, apronH, apronT], [0, yA, -lz], { grain: 'x', material, inferred: true, explode: [0, 0, -0.6] }));
  parts.push(box('apron-l', 'Short apron', [apronT, apronH, sa], [-lx, yA, 0], { grain: 'z', material, inferred: true, explode: [-0.6, 0, 0] }));
  parts.push(box('apron-r', 'Short apron', [apronT, apronH, sa], [lx, yA, 0], { grain: 'z', material, inferred: true, explode: [0.6, 0, 0] }));
  const mt = { type: 'mortise-tenon', tenonLen, tenonT: 8, shoulder: 10 };
  joints.push({ a: 'apron-f', b: 'leg-fl', ...mt }, { a: 'apron-f', b: 'leg-fr', ...mt }, { a: 'apron-b', b: 'leg-bl', ...mt }, { a: 'apron-b', b: 'leg-br', ...mt });
  joints.push({ a: 'apron-l', b: 'leg-fl', ...mt }, { a: 'apron-l', b: 'leg-bl', ...mt }, { a: 'apron-r', b: 'leg-fr', ...mt }, { a: 'apron-r', b: 'leg-br', ...mt });

  // wooden buttons in a groove inside the aprons: the top can move across its width
  const bw = 40, bt = 20, bl = 45, buttons = [];
  let n = 0;
  for (const sz of [1, -1]) for (const x of [-la / 3, 0, la / 3]) {
    const id = `button-${++n}`; buttons.push(id);
    parts.push(box(id, 'Button', [bw, bt, bl], [x, legH - bt / 2, sz * (lz - apronT / 2 - bl / 2)], { grain: 'z', material, inferred: true, explode: [0, -0.4, sz * 0.3],
      note: 'tongue 10 × 8 into a groove 10 mm below the apron top edge; leave 3 mm between shoulder and apron' }));
    joints.push({ a: id, b: 'top', type: 'screw', face: 'y', count: 1 }, { a: id, b: sz > 0 ? 'apron-f' : 'apron-b', type: 'button', face: 'z' });
  }
  for (const sx of [-1, 1]) {
    const id = `button-${++n}`; buttons.push(id);
    parts.push(box(id, 'Button', [bl, bt, bw], [sx * (lx - apronT / 2 - bl / 2), legH - bt / 2, 0], { grain: 'x', material, inferred: true, explode: [sx * 0.3, -0.4, 0],
      note: 'tongue 10 × 8 into a groove 10 mm below the apron top edge; leave 3 mm between shoulder and apron' }));
    joints.push({ a: id, b: 'top', type: 'screw', face: 'y', count: 1 }, { a: id, b: sx < 0 ? 'apron-l' : 'apron-r', type: 'button', face: 'x' });
  }

  const steps = [
    { title: 'Two end frames', parts: ['leg-fl', 'leg-bl', 'apron-l', 'leg-fr', 'leg-br', 'apron-r'], view: 'iso',
      note: 'Cut the mortises in the legs while they are still square, then turn or taper them round. Glue a short apron between each pair of legs; clamp with shaped cauls so the round legs do not twist.',
      check: 'Both frames square; legs parallel and the apron tops level with the leg tops.' },
    { title: 'Join the ends with the long aprons', parts: ['apron-f', 'apron-b'], view: 'iso',
      note: 'Glue the long aprons in, clamp lengthwise and check the diagonals across the top of the base.',
      check: 'Diagonals equal; the base stands without rocking.' },
    { title: 'Fit the buttons', parts: buttons, view: 'iso',
      note: 'Rout a 10 mm groove round the inside of the aprons, 10 mm below the top edge. Slide the button tongues in, leaving 3 mm between each shoulder and the apron so the top can move.',
      check: 'Every button slides freely in its groove.' },
    { title: 'Shape and attach the top', parts: ['top'], view: 'iso',
      note: `Glue up and flatten the top, then rout the ends round to R${R} from the curve centres and bevel the underside of the edge. Lay it face down, centre the base on it and screw up through each button. Do not glue the top.`,
      check: `Legs sit ${legInZ} in from both long edges and equally far from each end.` },
  ];
  const hardware = [
    { qty: buttons.length, name: 'No. 8 × 40 mm wood screw', note: 'one per button, pilot-drilled' },
    { qty: 4, name: 'Felt or nylon glide, ⌀25', note: 'under the feet' },
    { qty: 1, name: 'PVA wood glue', note: 'aprons to legs only' },
  ];
  return { parts, joints, steps, hardware };
}

export const piece = definePiece({
  name: spec.name, type: spec.type, shop: spec.shop, finish: spec.finish, params: spec.params, source: spec.source,
  // colour read off the photo: a warm, medium-dark walnut
  materials: { 'walnut-solid': { name: 'Black walnut, solid', base: '#7e4e1f', dark: '#3f230a', ring: 0.6, streak: 1.0, rough: 0.9, clearcoat: 0, env: 0.3 } },
  build,
});
export default piece;
