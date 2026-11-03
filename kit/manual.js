// kit/manual.js — the assembly manual as one printable HTML page.
// Step images come from capture.mjs (one still per step from the live page).
import { cutList, toMarkdown } from './cutlist.js';
import { tools as toolsOf, finishing as finishingOf } from './shop.js';

export function manualHTML(piece, { stills = {}, drawings = [], assembly = '', cutting = [], tools = toolsOf(piece), finish = finishingOf(piece) } = {}) {
  const rows = cutList(piece);
  const partIndex = Object.fromEntries(rows.map((r, i) => [r.name, i + 1]));
  const byId = Object.fromEntries(piece.parts.map(p => [p.id, p]));
  const steps = piece.steps.map(s => {
    const names = {};
    for (const id of s.parts) { const n = byId[id].name; names[n] = (names[n] ?? 0) + 1; }
    const list = Object.entries(names).map(([n, q]) => `<li><b>${partIndex[n]}</b> ${n} ×${q}</li>`).join('');
    const img = stills[s.index] ? `<img src="${stills[s.index]}" alt="Step ${s.index}">` : `<div class="ph">render step ${s.index} with capture.mjs</div>`;
    return `<section class="step"><div class="n">${s.index}</div><div class="body"><h2>${s.title}</h2>
    ${img}<ul class="parts">${list}</ul>${s.note ? `<p class="note">${s.note}</p>` : ''}${s.check ? `<p class="check">✓ ${s.check}</p>` : ''}</div></section>`;
  }).join('\n');
  const hw = piece.hardware.map(h => `<li>${h.qty}× ${h.name}${h.note ? ` <span class="dim">— ${h.note}</span>` : ''}</li>`).join('');
  const toolList = tools.groups.map(g => `<div class="tg"><h4>${g.group}</h4><ul>${g.items.map(it => `<li>${it.tool}${it.why ? ` <span class="dim">— ${it.why}</span>` : ''}</li>`).join('')}</ul></div>`).join('');
  const finishRows = finish.classes.map(c => `<tr><td><b>${c.label}</b><br><span class="dim">${c.parts.join(', ')} · about ${c.area} m²</span></td>
    <td>${c.prep}${c.product ? `<br><b>${c.product}</b>${c.litres ? `, about ${c.litres} L` : ''}. ${c.how}` : ''}</td></tr>`).join('');
  const parts = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.name}${r.inferred ? ' <span class="tag">inferred</span>' : ''}</td><td>${r.qty}</td><td>${r.L} × ${r.W} × ${r.T}</td><td>${r.material}</td><td>${r.joinery || '—'}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${piece.name} — build manual</title>
<style>
:root{--ink:#1d1d1b;--dim:#7a7a76;--accent:#c8511c;--paper:#fbf9f4;--line:#e3ded2}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.5 Inter,Helvetica,Arial,sans-serif}
main{max-width:900px;margin:0 auto;padding:40px 24px}
h1{font-size:30px;margin:0 0 4px;letter-spacing:-.01em}.sub{color:var(--dim);margin:0 0 28px}
h2{font-size:18px;margin:0 0 10px}h3{font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);margin:36px 0 10px}
.step{display:grid;grid-template-columns:56px 1fr;gap:18px;padding:22px 0;border-top:1px solid var(--line);page-break-inside:avoid}
.n{font-size:34px;font-weight:700;color:var(--accent);line-height:1}
.step img,.ph{width:100%;aspect-ratio:16/9;object-fit:cover;background:#fff;border:1px solid var(--line);border-radius:6px}
.ph{display:flex;align-items:center;justify-content:center;color:var(--dim);font-size:13px}
.parts{display:flex;flex-wrap:wrap;gap:6px 18px;list-style:none;padding:0;margin:10px 0 0}.parts b{display:inline-block;min-width:22px;height:22px;border-radius:11px;background:var(--ink);color:#fff;text-align:center;font-size:12px;line-height:22px;margin-right:6px}
.note{margin:8px 0 0;color:#444}.check{margin:6px 0 0;color:#2d6a3e;font-weight:500}
table{border-collapse:collapse;width:100%;font-size:13px}td,th{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--dim);font-weight:500}
.tag{font-size:10px;background:#ffe9db;color:var(--accent);padding:1px 6px;border-radius:9px;margin-left:4px}.dim{color:var(--dim)}
.drawings img,.drawings svg{max-width:100%;height:auto;break-inside:avoid;border:1px solid var(--line);border-radius:6px;background:#fff;margin:0 0 12px;display:block}
.tools{columns:2 320px;column-gap:32px}.tg{break-inside:avoid;margin:0 0 14px}.tg h4{margin:0 0 4px;font-size:14px}.tg ul{margin:0;padding-left:18px}.tg li{margin:2px 0}
.tips li{margin:4px 0}
.assume{background:#fff;border:1px solid var(--line);border-left:3px solid var(--accent);padding:12px 16px;border-radius:6px;font-size:14px}
@media print{body{background:#fff}main{padding:0}h3{break-after:avoid}.step img,.ph{max-height:78mm;width:auto;max-width:100%}}
</style></head><body><main>
<h1>${piece.name}</h1><p class="sub">${Math.round(piece.bounds.size[0])} × ${Math.round(piece.bounds.size[2])} × ${Math.round(piece.bounds.size[1])} mm (L × D × H) · ${piece.parts.length} parts · ${piece.steps.length} steps</p>
${piece.source ? `<div class="assume"><b>Built from:</b> ${piece.source.photo ?? 'reference photo'}. <b>Anchors:</b> ${piece.source.anchors ?? '—'}. <b>Assumed:</b> ${piece.source.assumptions ?? '—'}</div>` : ''}
<h3>Parts</h3><table><tr><th>#</th><th>Part</th><th>Qty</th><th>L × W × T (mm)</th><th>Material</th><th>Joinery</th></tr>${parts}</table>
${hw ? `<h3>Hardware</h3><ul>${hw}</ul>` : ''}
<h3>Tools</h3><p class="dim">For a ${tools.shopName}, read from the joints and shapes in this piece.</p><div class="tools">${toolList}</div>
<h3>Assembly</h3>${steps}
<h3>Finishing</h3><table>${finishRows}</table>
${finish.tips.length ? `<ul class="tips">${finish.tips.map(t => `<li>${t}</li>`).join('')}</ul>` : ''}${finish.cure ? `<p><b>Curing:</b> ${finish.cure}</p>` : ''}
<p class="dim">Quantities use typical coverage figures and count every face; check the tin.</p>
${assembly ? `<h3>Overall dimensions</h3><div class="drawings">${assembly}</div>` : ''}
${cutting.length ? `<h3>Cutting diagrams</h3><div class="drawings">${cutting.join('\n')}</div>` : ''}
${drawings.length ? `<h3>Shop drawings</h3><div class="drawings">${drawings.join('\n')}</div>` : ''}
</main></body></html>`;
}
