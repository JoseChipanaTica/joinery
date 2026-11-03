// kit/shop.js — what the maker needs besides wood: the tools for this piece in their shop,
// and how to finish it. Both are read from the model, so a 10 mm mortise asks for a 10 mm chisel
// and a racetrack top asks for a bandsaw. No three.js in here.
import { stockOf } from './model.js';
import { SOLID } from './nest.js';

/** Finishing family of a material, from its key and its cut-list name. */
export function finishClass(key, name = '') {
  const s = `${key} ${name}`;
  if (/\b(glass|cane|rattan|led)\b/i.test(s)) return 'none';
  if (/\b(steel|brass|alu\w*)\b/i.test(s)) return 'metal';
  if (/paint|^mdf\b|\bmdf-(black|white|anthracite)\b/i.test(s)) return 'painted';
  if (/veneer|ply/i.test(s)) return 'veneer';
  return 'solid';
}

/** Clear finishes for the wood. `cover` is m² per litre per coat, a typical figure: check the tin. */
export const FINISHES = {
  'hardwax-oil': {
    name: 'Hardwax oil, matt or satin', coats: 2, cover: 20, tools: 'Lint-free rags, white and grey abrasive pads',
    how: 'Apply thin with a pad or brush, wipe off what has not soaked in after 15–20 min, 12 h between coats; buff with a white pad before the second.',
    cure: 'Dry to the touch the next day; fully hard in about a week. Keep cups and water off it until then.',
  },
  oil: {
    name: 'Danish or tung oil', coats: 3, cover: 15, tools: 'Lint-free rags, grey abrasive pads',
    how: 'Flood on, wipe off after 15 min, 24 h between coats; rub down with a grey pad between coats.',
    cure: 'About two weeks before heavy use.',
  },
  lacquer: {
    name: 'Water-based lacquer, matt', coats: 3, cover: 10, tools: 'Synthetic brush or an HVLP sprayer',
    how: 'Raise the grain first: wipe with a damp cloth, let it dry, sand again at the last grit. Thin coats, 2 h between; denib with 320 grit after the first.',
    cure: 'Handle the next day; full hardness in about a week.',
  },
};
const PAINT = {
  name: 'MDF primer, then two coats of paint', coats: 3, cover: 10, tools: 'Foam roller and synthetic brush, or a sprayer',
  how: 'Seal the cut edges first, they soak up paint: prime, sand 240, prime again until smooth. Prime all over, sand 240, then two coats of paint with 320 grit between.',
};

const uniq = a => [...new Set(a)];
const and = a => a.length < 2 ? (a[0] ?? '') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`;
const up = (x, step) => Math.ceil(x / step) * step;
const plural = names => and(uniq(names.map(n => n.toLowerCase())).map(n => (n.endsWith('s') ? n : `${n}s`)));
const SHOP_NAMES = { hand: 'hand-tool shop', cabinet: 'cabinet shop', cnc: 'CNC shop' };

function context(piece) {
  const shop = SHOP_NAMES[piece.shop] ? piece.shop : 'cabinet';
  const nameOf = k => piece.materials[k]?.name ?? k;
  const cls = p => finishClass(p.material, nameOf(p.material));
  const byId = Object.fromEntries(piece.parts.map(p => [p.id, p]));
  return { shop, nameOf, cls, byId };
}

/** Tools for this piece, grouped in the order the work happens: [{group, items: [{tool, why}]}]. */
export function tools(piece) {
  const { shop, cls, byId } = context(piece);
  const by = (hand, cabinet, cnc = cabinet) => ({ hand, cabinet, cnc })[shop];
  const wood = piece.parts.filter(p => ['solid', 'veneer', 'painted'].includes(cls(p)));
  const solid = wood.filter(p => cls(p) === 'solid'), sheet = wood.filter(p => cls(p) !== 'solid');
  const feats = wood.flatMap(p => p.features.map(f => ({ ...f, part: p })));
  const of = (...types) => feats.filter(f => types.includes(f.type));
  // takes features (named by their part) or parts; part names can contain commas, so they are separated with semicolons
  const names = fs => { const n = uniq(fs.map(f => f.part?.name ?? f.name)); return n.length > 3 ? `${n.slice(0, 3).join('; ')}…` : n.join('; '); };
  const sizes = (fs, k) => uniq(fs.map(f => f[k]).filter(Boolean)).sort((a, b) => a - b);
  const mm = a => a.join(' / ');
  const out = [];
  const group = (name, items) => { items = items.filter(Boolean); if (items.length) out.push({ group: name, items }); };
  const item = (tool, why = '') => ({ tool, why });

  group('Measure and mark', [
    item(by('Steel rule, combination square, marking gauge and knife', 'Tape, steel rule, combination square and marking gauge')),
    item('A large square, and a tape to compare diagonals', 'checking every glue-up is square'),
  ]);

  group('Cut and mill', [
    solid.length && item(by('Rip saw, crosscut saw and a shooting board', 'Table saw and mitre saw'), 'solid parts'),
    solid.length && item(by('Jack and jointer planes, winding sticks', 'Jointer and thickness planer, or buy the wood planed all round'), 'solid parts'),
    sheet.length && item(by('Track saw, or a circular saw run along a clamped straightedge', 'Track saw or panel saw, then the table saw for final sizes',
      'CNC router with a compression bit, cutting the nests in sheet-*.svg'), 'sheet goods'),
    wood.some(p => cls(p) === 'veneer') && item(by('Household iron, edge-banding trimmer and a fine file', 'Edge-banding iron or edge bander, and an edge trimmer',
      'Edge bander'), 'banding the exposed edges of veneered sheet'),
  ]);

  const mort = of('mortise'), dow = of('dowel', 'dowel-hole'), grv = of('groove'), dad = of('dado'), reb = of('rebate');
  const pins = of('pin-hole'), cups = of('cup-bore'), holes = of('fitting').filter(f => f.holes?.d);
  const jt = t => piece.joints.filter(j => j.type === t);
  group('Joinery', [
    mort.length && item(by(`${mm(sizes(mort, 't'))} mm mortise chisel${sizes(mort, 't').length > 1 ? 's' : ''} and a mallet`,
      `Hollow-chisel mortiser (${mm(sizes(mort, 't'))} mm chisel${sizes(mort, 't').length > 1 ? 's' : ''}), or a router with a spiral bit and a mortising jig`,
      `CNC with an end mill of ${Math.min(...sizes(mort, 't'))} mm or less, or a Domino`), `mortises in ${names(mort)}`),
    of('tenon').length && item(by('Tenon saw and a shoulder plane', 'Table saw with a tenoning jig or dado stack, shoulder plane to fit',
      'Tenons on the CNC, or loose tenons'), `tenons on ${names(of('tenon'))}`),
    dow.length && item(by(`Dowelling jig, brace or drill, ⌀${mm(sizes(dow, 'd'))} bits with depth stops`,
      `Dowelling jig, drill, ⌀${mm(sizes(dow, 'd'))} brad-point bits with depth stops`,
      `CNC boring, or a dowelling jig and ⌀${mm(sizes(dow, 'd'))} brad-point bits`), `dowels in ${names(dow)}`),
    grv.length && item(by(`Plough plane with ${mm(sizes(grv, 'width'))} mm irons`, `Router table with ${mm(sizes(grv, 'width'))} mm straight bits, or a slot cutter`,
      'CNC'), `grooves in ${names(grv)}`),
    dad.length && item(by('Saw and router plane', `Router with ${mm(sizes(dad, 'width'))} mm straight bits and a guide, or a dado stack`, 'CNC'), `dados in ${names(dad)}`),
    reb.length && item(by('Rebate plane', 'Router with a bearing-guided rebate bit', 'CNC'), `rebates in ${names(reb)}`),
    jt('button').length && item(by('Plough plane', 'Router with a slot cutter, or the table saw', 'CNC, or a router with a slot cutter'),
      `the groove inside the ${plural(jt('button').map(j => byId[j.b].name))} that the buttons hang in`),
    jt('figure-8').length && item('Forstner bit for the figure-8 recesses'),
    of('pocket').length && item('Pocket-hole jig, stepped bit and a long driver bit', `pocket screws in ${names(of('pocket'))}`),
    pins.length && item(by(`Shelf-pin jig and a ⌀${mm(sizes(pins, 'd'))} bit with a depth stop`, `Shelf-pin jig and a ⌀${mm(sizes(pins, 'd'))} bit with a depth stop`,
      'CNC boring (32 mm system)'), `shelf-pin holes in ${names(pins)}`),
    cups.length && item(by(`${mm(sizes(cups, 'd'))} mm Forstner bit and a hinge-boring jig`, `${mm(sizes(cups, 'd'))} mm Forstner bit in a drill press, or a hinge-boring jig`,
      'CNC boring'), `hinge cups in ${names(cups)}`),
    of('runner').length && item('Drawer-slide jig or spacer blocks', 'mounting the drawer runners level'),
    holes.length && item(`⌀${mm(uniq(holes.map(f => f.holes.d)).sort((a, b) => a - b))} drill bits`, `holes for the ${and(uniq(holes.map(f => f.kind.toLowerCase())))}`),
  ]);

  // shaping: a profile is round when every point sits on one circle
  const isRound = p => { const r = p.profile.path.map(([u, v]) => Math.hypot(u, v)); return Math.max(...r) - Math.min(...r) < 0.5; };
  const shaped = wood.filter(p => p.profile);
  const bent = wood.filter(p => (p.stock?.layers ?? 1) > 1);
  const round = shaped.filter(p => isRound(p)), curved = shaped.filter(p => !isRound(p) && !bent.includes(p));
  const tapered = shaped.filter(p => p.profile.taper && !isRound(p));
  const edges = wood.filter(p => p.edge && p.edge.type !== 'sharp' && p.edge.size > 2);
  group('Shape', [
    round.length && item(by('Lathe, or plane square → octagon → round and finish with a spokeshave', 'Lathe', 'Lathe, or buy the parts turned'),
      `${names(round)}${round.some(p => p.profile.taper) ? ', tapered' : ''}`),
    tapered.length && item(by('Plane to a pencil line', 'Taper jig on the table saw'), `tapers on ${names(tapered)}`),
    curved.length && item(by('Bow saw or coping saw, spokeshave and rasps', 'Bandsaw or jigsaw, then a router with a template or trammel and a flush-trim bit',
      'CNC cuts the outlines'), `curved outlines on ${names(curved)}`),
    bent.length && item('Bending form: MDF ribs cut to the inside radius, stacked and screwed, with cauls', `bent laminations: ${names(bent)}`),
    ...uniq(edges.map(p => `${p.edge.type}|${p.edge.size}`)).map(k => {
      const [type, size] = k.split('|');
      return item(type === 'chamfer' ? by(`Block plane for the ${size} mm chamfers`, `Router with a 45° chamfer bit, set to ${size} mm`)
        : by(`Block plane and file for the ${size} mm roundovers`, `Router with a ${size} mm roundover bit`), 'edges');
    }),
  ]);

  // clamps: the longest glued member plus what it is glued to at each end, and every panel glue-up
  const ends = {};
  for (const j of piece.joints.filter(j => ['mortise-tenon', 'dowel', 'dado', 'glue'].includes(j.type))) {
    const a = byId[j.a], b = byId[j.b], k = 'xyz'.indexOf(j.face ?? a.grain);
    const e = ends[`${a.id}|${k}`] ??= { a: a.size[k], end: {} }, dir = Math.sign(b.at[k] - a.at[k]);
    e.end[dir] = Math.max(e.end[dir] ?? 0, b.size[k]);
  }
  const span = Math.max(0, ...Object.values(ends).map(e => e.a + Object.values(e.end).reduce((m, x) => m + x, 0)));
  const panels = solid.map(p => ({ p, s: stockOf(p) })).filter(({ s }) => s.W > SOLID.maxW);
  const widest = panels.sort((x, y) => y.s.W - x.s.W)[0];
  const screws = piece.joints.some(j => ['screw', 'pocket-screw', 'hinge', 'runner', 'button', 'figure-8', 'shelf-pin'].includes(j.type)) || holes.length;
  group('Assemble', [
    span && item(`At least 4 clamps that open to ${up(span + 100, 100)} mm${span > 1500 ? ', or ratchet straps' : ''}`, 'the longest glue-up'),
    widest && item(`${Math.ceil(widest.s.L / 300) + 1} clamps that open to ${up(widest.s.W + 100, 100)} mm, and straight cauls`,
      `edge-gluing ${and(uniq(panels.map(x => x.p.name.toLowerCase())))} from strips`),
    bent.length && item('A clamp every 75 mm over the bending form, or a vacuum bag', 'the bent laminations'),
    item(bent.length ? 'PVA glue, and a slow-setting glue (urea-formaldehyde or epoxy) for the laminations' : 'PVA glue'),
    screws && item(by('Hand drill and screwdrivers', 'Drill/driver, pilot bits and a countersink'), 'screws and hardware'),
  ]);

  const f = finishing(piece);
  group('Sand and finish', [
    item(by('Card scraper and a sanding block, 120–180 grit', 'Random-orbit sander, 120–240 grit, and a hand block for edges')),
    ...uniq(f.classes.map(c => c.tools)).filter(Boolean).map(t => item(t)),
  ]);

  const metal = piece.parts.filter(p => cls(p) === 'metal');
  const glass = piece.parts.filter(p => /glass/i.test(`${p.material} ${piece.materials[p.material]?.name ?? ''}`));
  const led = piece.parts.some(p => p.features.some(x => x.type === 'fitting' && /\bled\b/i.test(x.kind))) || piece.hardware.some(h => /\bled\b/i.test(h.name));
  group('Outside the shop', [
    metal.length && item(`Metal shop: cut and weld the steel${metal.some(p => /powder/i.test(piece.materials[p.material]?.name ?? '')) ? ', then powder-coat it' : ''}`, names(metal)),
    glass.length && item('Glazier: toughened glass cut to size, edges polished (sizes in stock.md)', names(glass)),
    led && item('Electrician: the LED driver and its wiring'),
  ]);

  group('Safety', [
    item(`Eye and ear protection, a dust mask (FFP2 / N95) and dust extraction${wood.some(p => /mdf/i.test(p.material + (piece.materials[p.material]?.name ?? ''))) ? '. MDF dust is fine and harmful: extract it at the tool' : ''}`),
  ]);
  return { shop, shopName: SHOP_NAMES[shop], groups: out };
}

/** How to finish each family of material in the piece, how much to buy, and what to do before glue-up. */
export function finishing(piece) {
  const { cls, nameOf, byId } = context(piece);
  const wood = FINISHES[piece.finish] ?? FINISHES['hardwax-oil'];
  const area = parts => parts.reduce((m, p) => { const [a, b, c] = p.size; return m + 2 * (a * b + b * c + c * a); }, 0) / 1e6;
  const litres = (m2, d) => Math.max(0.25, up(m2 * d.coats / d.cover, 0.25));
  const classes = [];
  const add = (key, label, prep, def) => {
    const parts = piece.parts.filter(p => cls(p) === key);
    if (!parts.length) return;
    const m2 = area(parts);
    classes.push({ key, label, parts: uniq(parts.map(p => p.name)), area: +m2.toFixed(1), prep, product: def?.name, how: def?.how,
      litres: def?.cover ? litres(m2, def) : null, tools: def?.tools });
  };
  add('solid', 'Solid wood', 'Sand 120 → 150 → 180 with the grain, ease every sharp edge, vacuum and wipe with a dry cloth.', wood);
  add('veneer', 'Veneered sheet and plywood',
    'The face veneer is under 1 mm thick: start at 180, stop at 240, keep the sander flat and never use a belt sander. Iron on or glue edge banding to exposed edges first, unless the ply edge is meant to show.', wood);
  add('painted', 'Painted MDF', 'Sand the faces 240 before priming; the cut edges need extra sealing (below).', PAINT);
  const metal = piece.parts.filter(p => cls(p) === 'metal');
  if (metal.length) classes.push({ key: 'metal', label: 'Steel', parts: uniq(metal.map(p => p.name)),
    prep: /powder/i.test(metal.map(p => nameOf(p.material)).join(' ')) ? 'Powder-coated by the metal shop before any wood goes on.' : 'Degrease, then metal primer and paint, or have it powder-coated.' });

  const tips = [];
  const floating = piece.joints.filter(j => j.type === 'groove' && cls(byId[j.a]) === 'solid').map(j => byId[j.a].name);
  if (floating.length) tips.push(`Finish the ${plural(floating)} before the frames are glued: they float in their grooves, and one finished afterwards shows a bare stripe when it shrinks in winter.`);
  const wide = uniq(piece.parts.filter(p => cls(p) === 'solid' && stockOf(p).W > SOLID.maxW).map(p => p.name.toLowerCase()));
  if (wide.length) tips.push(`Give both faces of the ${and(wide)} the same number of coats. Finished on one side only, a wide panel takes up moisture unevenly and cups.`);
  if (piece.joints.some(j => j.type === 'dowel' && ['veneer', 'painted'].includes(cls(byId[j.a])) && ['veneer', 'painted'].includes(cls(byId[j.b]))))
    tips.push('Finish the inside faces of the carcasses before glue-up, it is far easier than inside a box. Mask the dowel holes and the glued edges so glue still bites.');
  if (piece.parts.some(p => /glass/i.test(p.material))) tips.push('Fit the glass last, once the finish has cured.');
  if (classes.some(c => /oil/i.test(c.product ?? ''))) tips.push('Oily rags can catch fire on their own as they dry. Lay them flat outdoors to dry, or soak them in water, before throwing them away.');
  return { finish: wood, classes, tips, cure: classes.some(c => c.key === 'solid' || c.key === 'veneer') ? wood.cure : null };
}

/** tools.md: the tool list and the finishing schedule as text. */
export function shopMarkdown(piece, t = tools(piece), f = finishing(piece)) {
  const l = [`# ${piece.name} — tools and finishing`, '', `Tools for a ${t.shopName}, read from the joints and shapes in this piece.`, ''];
  for (const g of t.groups) { l.push(`## ${g.group}`, ''); for (const it of g.items) l.push(`- ${it.tool}${it.why ? ` — ${it.why}` : ''}`); l.push(''); }
  l.push('## Finishing', '');
  for (const c of f.classes) {
    l.push(`### ${c.label}`, '', `${c.parts.join(', ')}. About ${c.area} m² of surface, all faces.`, '', `- **Prepare:** ${c.prep}`);
    if (c.product) l.push(`- **Finish:** ${c.product}${c.litres ? `, about ${c.litres} L for ${c.key === 'painted' ? 'primer and paint together' : `${f.finish.coats} coats`}` : ''}. ${c.how}`);
    l.push('');
  }
  if (f.tips.length) l.push('### Before and after', '', ...f.tips.map(x => `- ${x}`), '');
  if (f.cure) l.push(`**Curing:** ${f.cure}`, '');
  l.push('Quantities use typical coverage figures and count every face; check the tin.');
  return l.join('\n') + '\n';
}
