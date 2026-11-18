// Writes docs/design/ios-refresh/icons.html: the three Port 24 icons at 16, 20 and 24 px beside the standard utility icons.
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Search, X, Settings } from 'lucide-react';
import { PORT24_ICONS } from '../../src/components/icons/port24IconPaths.js';

const svg = (def, size) => {
  const sw = size <= 16 ? 2 : 1.75;
  const fills = def.fills.map((f) => (f.circle ? `<circle cx="${f.circle[0]}" cy="${f.circle[1]}" r="${f.circle[2]}" fill="currentColor"/>` : `<path d="${f.d}" fill="currentColor" fill-opacity="${f.opacity}" stroke="none"/>`)).join('');
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="butt" stroke-linejoin="miter" aria-hidden="true">${fills}${def.strokes.map((d) => `<path d="${d}"/>`).join('')}</svg>`;
};
const lucide = (C, size) => renderToStaticMarkup(React.createElement(C, { size, strokeWidth: size <= 16 ? 2 : 1.75 }));
const mark = (size) => `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none"><path d="M4 4h10v4H8v8H4V4z" fill="currentColor"/><path d="M36 4h-10v4h8v8h4V4z" fill="currentColor"/><path d="M4 36h10v-4H8v-8H4V36z" fill="currentColor"/><path d="M36 36h-10v-4h8v-8h4V36z" fill="currentColor"/></svg>`;

const rows = Object.values(PORT24_ICONS).map((def) => `
  <tr><th>${def.label}</th>
    <td class="big">${svg(def, 96)}</td>
    ${[16, 20, 24].map((s) => `<td><span class="chip pearl">${svg(def, s)}</span><span class="chip ink">${svg(def, s)}</span><small>${s}px</small></td>`).join('')}
  </tr>`).join('');
const utility = [['Search', Search], ['Close', X], ['Settings', Settings]].map(([n, C]) => `<tr><th>${n} (standard)</th><td class="big">${lucide(C, 96)}</td>${[16, 20, 24].map((s) => `<td><span class="chip pearl">${lucide(C, s)}</span><span class="chip ink">${lucide(C, s)}</span><small>${s}px</small></td>`).join('')}</tr>`).join('');

fs.writeFileSync('docs/design/ios-refresh/icons.html', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Port 24 icons</title>
<style>body{margin:0;padding:40px;background:#f5f2eb;color:#0b1f2e;font:14px/1.4 Inter,system-ui,sans-serif}h1{font:700 28px/1.1 'Plus Jakarta Sans',Inter,sans-serif;letter-spacing:-.02em;margin:0 0 6px}p{margin:0 0 24px;color:#4b6378;max-width:70ch}
table{border-collapse:collapse}th{text-align:left;padding:16px 28px 16px 0;font-weight:600;white-space:nowrap}td{padding:16px 20px;vertical-align:middle}td.big{color:#0b7f70}small{display:block;margin-top:6px;color:#4b6378;font-size:12px}
.chip{display:inline-grid;place-items:center;width:44px;height:44px;border-radius:12px;margin-right:6px}.pearl{background:#fff;color:#0b1f2e;border:1px solid #cfdce8}.ink{background:#0b1f2e;color:#6fe3ce}
.mark{display:flex;align-items:center;gap:14px;margin-bottom:28px;color:#0b7f70}tr+tr{border-top:1px solid #e0dacb}</style>
<h1>Port 24 icon family</h1><p>Road Case, Rack and Scan share the corner geometry of the Port 24 mark: square joins and square L brackets. Each has one detail: a recessed latch, a faceplate LED, and a taller centre bar. Utility icons stay standard.</p>
<div class="mark">${mark(48)}<span>Port 24 mark, the source of the corner geometry</span></div>
<table>${rows}${utility}</table></html>`);
console.log('wrote docs/design/ios-refresh/icons.html');
