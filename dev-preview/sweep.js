// Dev-only (resumable across reloads via sessionStorage.__sweepOut): window.__sweep(routes) → per-route low-contrast text report (WCAG-ish, flags < 3.2:1).
const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const la = lum(a); const lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };
const SHELL = { r: 10, g: 68, b: 88, a: 1 };
const over = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 });
const bgOf = (el) => {
  const layers = [];
  for (let cur = el; cur && cur.nodeType === 1; cur = cur.parentElement) {
    const cs = getComputedStyle(cur); const c = parse(cs.backgroundColor);
    if (c && c.a > 0) { layers.push(c); if (c.a >= 0.97) break; }
    if (cur.classList.contains('p24-shell')) { layers.push(SHELL); break; }
  }
  if (!layers.length) return SHELL;
  let base = layers[layers.length - 1]; if (base.a < 0.97) base = over(base, SHELL);
  for (let i = layers.length - 2; i >= 0; i--) base = over(layers[i], base);
  return base;
};
window.__sweep = async (routes) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = JSON.parse(sessionStorage.getItem('__sweepOut') || '{}');
  for (const route of routes) {
    if (out[route]) continue;
    history.pushState({}, '', route); window.dispatchEvent(new PopStateEvent('popstate')); await wait(1300);
    const main = document.querySelector('main'); if (!main) { out[route] = { error: 'no main' }; sessionStorage.setItem('__sweepOut', JSON.stringify(out)); continue; }
    const bad = []; let total = 0; const seen = new Set(); const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const t = walker.currentNode; const txt = t.textContent.trim(); const el = t.parentElement; if (!txt || !el || seen.has(el)) continue; seen.add(el);
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) continue;
      if (el.closest('.sr-only,svg,script,style')) continue;
      const fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el); const f = fg.a < 1 ? over(fg, bg) : fg;
      total++; const cr = ratio(f, bg);
      if (cr < 3.2) {
        const chain = []; for (let c = el, i = 0; c && c.tagName !== 'MAIN' && i < 4; c = c.parentElement, i++) { const b = getComputedStyle(c).backgroundColor; chain.push(`${c.tagName}.${String(c.className).split(/\s+/).slice(0, 4).join('.')}${b !== 'rgba(0, 0, 0, 0)' ? ' bg=' + b : ''}`); }
        bad.push({ txt: txt.slice(0, 30), cr: +cr.toFixed(2), fg: cs.color, cls: String(el.className || '').slice(0, 60), chain });
      }
    }
    out[route] = { texts: total, lowContrast: bad.length, samples: bad.slice(0, 3) };
    sessionStorage.setItem('__sweepOut', JSON.stringify(out));
  }
  return out;
};
