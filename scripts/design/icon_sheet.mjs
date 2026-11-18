// Writes docs/design/ios-refresh/icons.html (full sheet by group) and icons-sizes.html (16/20/24 px proof).
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Lucide from 'lucide-react';
import { PORT24_ICONS, PORT24_ICON_GROUPS, UTILITY_ICONS, resolveIcon } from '../../src/components/icons/port24IconPaths.js';

const customSvg = (def, size) => {
  const sw = size <= 16 ? 2 : 1.75;
  const fills = def.fills.map((f) => (f.circle ? `<circle cx="${f.circle[0]}" cy="${f.circle[1]}" r="${f.circle[2]}" fill="currentColor" fill-opacity="${f.opacity}"/>` : `<path d="${f.d}" fill="currentColor" fill-opacity="${f.opacity}" stroke="none"/>`)).join('');
  const strokes = def.strokes.map((s) => (typeof s === 'string' ? `<path d="${s}"/>` : s.circle ? `<circle cx="${s.circle[0]}" cy="${s.circle[1]}" r="${s.circle[2]}"/>` : `<path d="${s.d}"${s.dash ? ' stroke-dasharray="2.4 2.4"' : ''}/>`)).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" aria-hidden="true">${fills}${strokes}</svg>`;
};
const icon = (key, size) => {
  if (UTILITY_ICONS[key]) return renderToStaticMarkup(React.createElement(Lucide[UTILITY_ICONS[key].lucide], { size, strokeWidth: size <= 16 ? 2 : 1.75 }));
  return customSvg(resolveIcon(key), size);
};
const label = (key) => (UTILITY_ICONS[key] || PORT24_ICONS[key]).label;

const css = `body{margin:0;padding:40px;background:#0b1f2e;color:#eaf5f8;font:14px/1.4 Inter,system-ui,sans-serif}
h1{font:700 40px/1.05 'Plus Jakarta Sans',Inter,sans-serif;letter-spacing:-.03em;margin:0 0 8px}p.sub{margin:0 0 28px;color:rgba(226,240,246,.76);max-width:70ch}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.card{border-radius:22px;padding:20px;background:#0f2a37;border:1px solid rgba(255,255,255,.08)}
.card.cream{background:#f1eee6;color:#0b1f2e;border-color:#e0dacb}.card.wide{grid-column:1/-1}
h2{font:700 20px/1.2 'Plus Jakarta Sans',Inter,sans-serif;margin:0 0 14px}.items{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.wide .items{grid-template-columns:repeat(10,minmax(0,1fr))}
.item{display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px 12px;border-radius:14px;background:rgba(255,255,255,.05);text-align:center;font-size:12.5px;line-height:1.25}
.cream .item{background:rgba(11,31,46,.05)}.item svg{color:#6fe3ce}.cream .item svg{color:#0b7f70}
.sizes{margin-top:34px;display:flex;flex-wrap:wrap;gap:6px}.sz{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05)}.sz svg{color:#6fe3ce}`;

const cards = PORT24_ICON_GROUPS.map((g, i) => `<section class="card ${i % 2 === 1 && i < 6 ? 'cream' : ''} ${g.keys.length > 8 ? 'wide' : ''}"><h2>${g.title}</h2><div class="items">${g.keys.map((k) => `<div class="item">${icon(k, 24)}<span>${label(k)}</span></div>`).join('')}</div></section>`).join('');
const proof = Object.keys(PORT24_ICONS).filter((k) => !PORT24_ICONS[k].alias).map((k) => `<div class="sz">${[16, 20, 24].map((s) => icon(k, s)).join('')}<span>${label(k)}</span></div>`).join('');
const total = PORT24_ICON_GROUPS.reduce((n, g) => n + g.keys.length, 0);

fs.mkdirSync('docs/design/ios-refresh', { recursive: true });
fs.writeFileSync('docs/design/ios-refresh/icons.html', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Port 24 icon set</title><style>${css}</style>
<h1>The Port 24 icon set</h1><p class="sub">${total} symbols on a 24px grid. Square joins and corners from the Port 24 mark; one recognizable detail each. Controls that people already know (search, close, settings...) stay standard.</p>
<div class="grid">${cards}</div>
<h2 style="margin-top:36px">Every custom icon at 16, 20 and 24 px</h2><div class="sizes">${proof}</div></html>`);
console.log('wrote docs/design/ios-refresh/icons.html with', total, 'symbols;', Object.keys(PORT24_ICONS).filter((k) => !PORT24_ICONS[k].alias).length, 'custom drawings');
