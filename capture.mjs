#!/usr/bin/env node
// capture.mjs — render review stills of a built page with headless Chromium.
//   node capture.mjs parsons-table --stills steps          one tile per assembly step + assembled + exploded + underside
//   node capture.mjs parsons-table --still "step=2&view=iso" --out joinery-out/s2.png
//   node capture.mjs parsons-table --stills parts           one tile per part, isolated
// Options: --size 1600x900 (CSS px) --dpr 1.2 --out <file|dir> --panel 0|1
// Set CHROMIUM to a browser binary if Playwright's download is unavailable.
import { chromium } from 'playwright';
import { resolve, dirname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const name = args[0];
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const [W, H] = (opt('size', '1600x900')).split('x').map(Number);
const dpr = +opt('dpr', '1.2');
const panel = opt('panel', '1');
const html = resolve(process.cwd(), `joinery-out/dist/${name}.html`);
const outDir = resolve(process.cwd(), 'joinery-out');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: dpr });
page.on('pageerror', e => console.error('page error:', e.message));

async function shot(query, file, p = panel) {
  await page.goto(`${pathToFileURL(html)}?${query}&panel=${p}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await page.waitForTimeout(1400); // let the camera and parts settle
  await page.screenshot({ path: file });
  console.log(file);
}

// the piece's step count comes from the page itself
await page.goto(`${pathToFileURL(html)}?panel=0`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
const nSteps = await page.evaluate(() => document.querySelectorAll('#list .part').length ? new Set([...document.querySelectorAll('#list .part .d')].map(e => (e.textContent.match(/step (\d+)/) || [])[1]).filter(Boolean)).size : 0);

if (args.includes('--still')) {
  await shot(opt('still'), opt('out', resolve(outDir, `${name}-still.png`)));
} else if (opt('stills') === 'parts') {
  const ids = await page.evaluate(() => [...document.querySelectorAll('#list .part')].map(e => e.dataset.id));
  for (const id of ids) await shot(`iso=${id}&explode=0.35&view=iso`, resolve(outDir, `${name}-part-${id}.png`));
} else {
  const tiles = [['assembled', 'view=iso'], ['exploded', 'explode=1&view=iso'], ['front', 'view=front'], ['underside', 'view=under&xray=1']];
  for (let s = 1; s <= nSteps; s++) tiles.push([`step-${s}`, `step=${s}`]);
  const files = [];
  for (const [label, qs] of tiles) { const f = resolve(outDir, `${name}-${label}.png`); await shot(qs, f, label.startsWith('step') ? '0' : panel); files.push([label, f]); }
  // contact sheet
  const sheet = `<!doctype html><body style="margin:0;background:#fff;font:12px Inter,Arial"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px;width:${W}px">
  ${files.map(([l, f]) => `<figure style="margin:0"><img src="${pathToFileURL(f)}" style="width:100%;display:block;border:1px solid #ddd"><figcaption style="padding:3px 0">${l}</figcaption></figure>`).join('')}</div></body>`;
  const sheetFile = resolve(outDir, `${name}-sheet.html`);
  writeFileSync(sheetFile, sheet);
  await page.goto(pathToFileURL(sheetFile).href);
  await page.waitForTimeout(500);
  const out = resolve(outDir, `${name}-sheet.png`);
  await page.screenshot({ path: out, fullPage: true });
  console.log(out);
}
await browser.close();
