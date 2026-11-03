#!/usr/bin/env node
// build.mjs — bundle a piece into one offline HTML file: three.js, kit and model inlined.
//   node build.mjs parsons-table            → joinery-out/dist/parsons-table.html
//   node build.mjs ./my-piece               → joinery-out/dist/my-piece.html
//   node build.mjs                          → every example
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.cwd(), 'joinery-out/dist');
mkdirSync(OUT, { recursive: true });

const targets = process.argv.slice(2);
const list = targets.length ? targets : readdirSync(resolve(SKILL_DIR, 'examples')).filter(d => existsSync(resolve(SKILL_DIR, 'examples', d, 'main.js')));

for (const t of list) {
  const dir = t.startsWith('.') || t.startsWith('/') ? resolve(process.cwd(), t) : resolve(SKILL_DIR, 'examples', t);
  const name = basename(dir);
  const entry = resolve(dir, 'main.js');
  const r = await build({
    entryPoints: [entry], bundle: true, write: false, format: 'iife', minify: true, target: 'es2022',
    nodePaths: [resolve(SKILL_DIR, 'node_modules')], logLevel: 'warning',
  });
  const js = r.outputFiles[0].text;
  const css = readFileSync(resolve(SKILL_DIR, 'kit/live.js'), 'utf8').match(/export const CSS = `([\s\S]*?)`;/)[1];
  const title = (() => { try { return JSON.parse(readFileSync(resolve(dir, 'spec.json'), 'utf8')).name; } catch { return name; } })();
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>${css}</style></head><body><canvas id="c"></canvas><script>${js.replace(/<\/script/g, '<\\/script')}</script></body></html>`;
  const file = resolve(OUT, `${name}.html`);
  writeFileSync(file, html);
  console.log(`${file}  ${(html.length / 1024).toFixed(0)} KB`);
}
