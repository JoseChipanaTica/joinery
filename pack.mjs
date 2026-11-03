#!/usr/bin/env node
// pack.mjs — everything the maker gets, generated from the same model the page renders.
//   node pack.mjs parsons-table        → joinery-out/parsons-table/{cutlist.csv, cutlist.md, drawings/*.svg, assembly.svg, stock.md,
//                                        boards-*.svg, sheet-*.svg, tools.md, manual.html, manual.pdf, validation.txt}
// Run capture.mjs --stills steps first if you want step images in the manual.
// manual.pdf needs Chromium (Playwright's, or CHROMIUM=/path/to/chrome); without it the rest of the pack is still written.
import { resolve, basename, dirname } from 'node:path';
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validate, report } from './kit/validate.js';
import { cutList, toCSV, toMarkdown, takeOff, NON_WOOD } from './kit/cutlist.js';
import { partDrawing, assemblyDrawing } from './kit/drawings.js';
import { nestSheets, boards, nestSVG, boardSVG } from './kit/nest.js';
import { tools, finishing, shopMarkdown } from './kit/shop.js';
import { manualHTML } from './kit/manual.js';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const t = process.argv[2];
if (!t) { console.error('usage: node pack.mjs <example|./folder>'); process.exit(1); }
const dir = t.startsWith('.') || t.startsWith('/') ? resolve(process.cwd(), t) : resolve(SKILL_DIR, 'examples', t);
const name = basename(dir);
const { piece } = await import(pathToFileURL(resolve(dir, 'model.js')).href);
const out = resolve(process.cwd(), 'joinery-out', name);
mkdirSync(resolve(out, 'drawings'), { recursive: true });

// 1. validation gate
const v = validate(piece);
writeFileSync(resolve(out, 'validation.txt'), report(v) + '\n');
console.log(report(v));
if (!v.ok) { console.error('\nvalidation failed — fix the model before packing'); process.exit(2); }

// 2. cut list
const rows = cutList(piece);
writeFileSync(resolve(out, 'cutlist.csv'), toCSV(rows));
writeFileSync(resolve(out, 'cutlist.md'), `# ${piece.name} — cut list\n\n` + toMarkdown(rows, piece));

// 3. drawings: one per unique part + assembly
const drawings = [];
const seen = new Set();
for (const p of piece.parts) {
  if (seen.has(p.name)) continue; seen.add(p.name);
  const qty = piece.parts.filter(x => x.name === p.name).length;
  const svg = partDrawing(p, piece, qty);
  const f = `drawings/${p.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
  writeFileSync(resolve(out, f), svg); drawings.push(svg);
}
const asm = assemblyDrawing(piece);
writeFileSync(resolve(out, 'assembly.svg'), asm);

// 4. stock: boards for solid, sheets for panels
const SHEET = /ply|mdf|osb|chip|melamine/i;
const buyRows = rows.filter(r => NON_WOOD.test(r.material));
const solidRows = rows.filter(r => !SHEET.test(r.material) && !NON_WOOD.test(r.material));
// bent laminations are bought as their layers, cut oversize and trimmed after glue-up
const sheetRows = rows.filter(r => SHEET.test(r.material) && !NON_WOOD.test(r.material))
  .flatMap(r => r.layers > 1 ? [{ ...r, name: `${r.name} layer`, qty: r.qty * r.layers, T: r.layerT, L: r.L + 40, W: r.W + 20 }] : [r]);
const stock = [`# ${piece.name} — what to buy\n`];
const lams = rows.filter(r => r.layers > 1);
if (lams.length) stock.push('## Bent laminations\n', ...lams.map(r => `- ${r.name} ×${r.qty}: ${r.layers} layers of ${r.layerT} mm, each cut ${r.L + 40} × ${r.W + 20} (oversize), glued over a form and trimmed to ${r.L} × ${r.W} × ${r.T}`), '');
const bds = boards(solidRows);
const cutting = [];   // board and sheet diagrams, for the files and the manual
if (boards.lastNotes.length) stock.push('## Glue-ups and laminations\n', ...boards.lastNotes.map(n => `- ${n}`), '', 'Lengths below carry 20 mm extra for trimming; widths carry jointing allowance.\n');
for (const g of bds) {
  stock.push(`## Solid, ${g.T} mm thick — buy ~${g.buyMetres} m of 2.4 m boards (15 % waste included)\n`);
  g.boards.forEach((b, i) => stock.push(`- board ${i + 1}, ≥ ${b.W} mm wide: ${b.items.map(it => `${it.name} ${it.L}×${it.W}`).join(', ')} (${b.used} of 2400 mm)`));
  stock.push(`\nCutting diagram: boards-${g.T}mm.svg`, '');
  const svg = boardSVG(g);
  writeFileSync(resolve(out, `boards-${g.T}mm.svg`), svg); cutting.push(svg);
}
let nestedCount = 0;
if (sheetRows.length) {
  const nested = nestSheets(sheetRows); nestedCount = nested.length;
  for (const g of nested) stock.push(`## ${g.material || 'Sheet goods'}, ${g.T} mm — ${g.sheets.length} × 2440 × 1220\n`, ...g.sheets.map((sh, i) => `- sheet ${i + 1}: ${sh.shelves.flatMap(x => x.items).map(it => `${it.name} ${it.L}×${it.W}`).join(', ')}`), '');
  nestSVG(nested).forEach((svg, i) => { writeFileSync(resolve(out, `sheet-${i + 1}.svg`), svg); cutting.push(svg); });
}
if (buyRows.length) stock.push('## Order cut to size (glazier, metal shop)\n', ...buyRows.map(r => `- ${r.qty}× ${r.name} ${r.L} × ${r.W} × ${r.T} — ${r.material}${r.note ? `. ${r.note}` : ''}`), '');
const to = takeOff(rows);
stock.push(`## Take-off\n`, ...Object.entries(to.solid).map(([T, m3]) => `- solid ${T} mm: ${(m3 * 1000).toFixed(1)} dm³ net`), ...Object.entries(to.sheet).map(([T, m2]) => `- sheet ${T} mm: ${m2.toFixed(2)} m² net`));
writeFileSync(resolve(out, 'stock.md'), stock.join('\n') + '\n');

// 5. manual, with step stills if capture.mjs has produced them
const stills = {};
for (const s of piece.steps) {
  const f = resolve(process.cwd(), 'joinery-out', `${name}-step-${s.index}.png`);
  if (existsSync(f)) stills[s.index] = `../${name}-step-${s.index}.png`;
}
// 6. tools and finishing, read from the joints, shapes and materials
const toolList = tools(piece), finish = finishing(piece);
writeFileSync(resolve(out, 'tools.md'), shopMarkdown(piece, toolList, finish));
writeFileSync(resolve(out, 'manual.html'), manualHTML(piece, { stills, drawings, assembly: asm, cutting, tools: toolList, finish }));

// 7. the manual as a PDF, when there is a Chromium to print it
let pdf = '';
rmSync(resolve(out, 'manual.pdf'), { force: true });   // never leave a PDF from an older model next to the new manual
try {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(resolve(out, 'manual.html')).href, { waitUntil: 'load' });
  await page.pdf({
    path: resolve(out, 'manual.pdf'), format: 'A4', printBackground: true,
    margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' }, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: `<div style="font:8px Arial;color:#888;width:100%;text-align:center">${piece.name} · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
  });
  await browser.close();
  pdf = ' manual.pdf';
} catch (e) {
  pdf = `\n  (no manual.pdf: Chromium did not start. Run npx playwright install chromium, or set CHROMIUM to a Chrome binary.\n   ${e.message.split('\n')[0].slice(0, 160)})`;
}
console.log(`\n${out}/\n  cutlist.csv cutlist.md stock.md tools.md assembly.svg drawings/${bds.length ? ' boards-*.svg' : ''}${nestedCount ? ' sheet-*.svg' : ''} manual.html${pdf}${Object.keys(stills).length ? '' : '\n  (no step images yet: run capture.mjs --stills steps, then pack again)'}`);
