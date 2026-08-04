/**
 * Shared QR label print utility.
 * Uses our saved QR label template (block_config from PrintTemplate entity)
 * to render the print window — NOT any Dymo-native layout.
 *
 * The "LABEL_SIZES" here are purely paper dimensions passed to @page CSS.
 * All layout/design comes from our block_config elements via buildPrintHTML.
 */

import { getSerialNumbersString } from './serialNumbers';

export const LABEL_SIZES = [
  { id: 'dymo_30252', label: 'Dymo 30252 — Address (89×28mm)', w: 89, h: 28 },
  { id: 'dymo_30336', label: 'Dymo 30336 — Square (51×51mm)',  w: 51, h: 51 },
  { id: 'dymo_30330', label: 'Dymo 30330 — Multi (54×25mm)',   w: 54, h: 25 },
  { id: 'custom_40x40', label: 'Generic Square (40×40mm)',      w: 40, h: 40 },
  { id: 'custom_60x40', label: 'Generic Landscape (60×40mm)',   w: 60, h: 40 },
];

/**
 * Build the full print-window HTML from our template's block_config elements.
 * This is the same renderer used in QRLabelBuilder.buildPrintHTML — kept in sync.
 *
 * @param {Array}  elements   - block_config elements from PrintTemplate
 * @param {{w,h}}  size       - label dimensions in mm
 * @param {object} asset      - { name, barcode, serial_numbers, category, location, id }
 * @param {object} brand      - BrandSettings record (for logo_url)
 * @param {object} qrDataConfig - { fields: array, separator: string } for QR encoding
 */
export function buildPrintHTML(elements, size, asset, brand, qrDataConfig = {}) {
  const MM = 3.7795;
  const wPx = Math.round(size.w * MM);
  const hPx = Math.round(size.h * MM);

  // Build QR data string from configured fields
   const buildQRData = () => {
     const fields = qrDataConfig.fields || ['serial_numbers'];
     const separator = qrDataConfig.separator || '|';
     return fields
       .map(f => f === 'serial_numbers' ? getSerialNumbersString(asset) : (asset?.[f] || ''))
       .filter(v => v !== '')
       .join(separator);
   };

  // Resolve the display value for a field element — mirrors resolveFieldValue() in QRLabelPrinter
  const resolveField = (el) => {
    if (!el.field) return el.value || '';
    if (el.field === 'barcode') {
      // 'barcode' element = primary scan identifier: kit code or first serial
      return asset?.barcode || getSerialNumbersString(asset);
    }
    if (el.field === 'serial_numbers') return getSerialNumbersString(asset);
    return asset?.[el.field] || '';
  };

  const elHtml = elements.map(el => {
    const x = Math.round(el.x * MM);
    const y = Math.round(el.y * MM);
    const w = Math.round(el.w * MM);
    const h = Math.round(el.h * MM);
    const base = `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;`;

    if (el.type === 'qr') {
      const sz = Math.min(w, h);
      const code = buildQRData() || getSerialNumbersString(asset) || asset?.barcode || asset?.id || 'SAMPLE';
      return `<div data-qr="${code}" data-size="${sz}" style="${base}display:inline-block;"></div>`;
    }

    if (el.type === 'logo') {
      // FIXED: fall back to brand logo_url so logo always renders
      const url = el.logoUrl || brand?.logo_url || '';
      if (!url) return '';
      return `<img src="${url}" crossorigin="anonymous" style="${base}object-fit:contain;object-position:center;width:${w}px;height:${h}px;background:#fff;" />`;
    }

    const value = resolveField(el);
    if (!value) return '';

    const fs = Math.round((el.fontSize || 8) * MM * 0.35);
    return `<div style="${base}font-size:${fs}px;font-weight:${el.fontWeight || 'normal'};font-family:${el.mono ? 'monospace' : 'sans-serif'};white-space:nowrap;text-overflow:ellipsis;overflow:hidden;line-height:${h}px;color:#000;">${value}</div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><title>QR Label</title>
<style>
  @page { size:${size.w}mm ${size.h}mm; margin:0; }
  * { box-sizing:border-box; margin:0; padding:0; }
  html, body { background:white; margin:0; padding:0; width:${wPx}px; height:${hPx}px; }
  .label { position:relative; width:${wPx}px; height:${hPx}px; overflow:hidden; background:white; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
<div class="label">${elHtml}</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script>
  document.querySelectorAll('[data-qr]').forEach(el => {
    const sz = +el.dataset.size;
    new QRCode(el, { text: el.dataset.qr, width: sz, height: sz, correctLevel: QRCode.CorrectLevel.M });
    const img = el.querySelector('img');
    if (img) { img.style.width = sz + 'px'; img.style.height = sz + 'px'; }
  });

  // Give the QR code(s) a moment to render, then go straight to the system print dialog.
  window.addEventListener('afterprint', () => window.close());
  setTimeout(() => window.print(), 300);
<\/script></body></html>`;
}

/**
 * Open a print window using our saved QR label template.
 *
 * @param {object} asset      - asset/kit object with name, barcode (or id), etc.
 * @param {object} template   - PrintTemplate record (needs block_config + label_width_mm/label_height_mm or label_size_id)
 * @param {string} sizeId     - one of LABEL_SIZES[].id (fallback/legacy if template has no size)
 * @param {object} brand      - BrandSettings record
 */
export function printWithTemplate(asset, template, sizeId, brand) {
  console.log('[printWithTemplate] Starting with template:', template?.name);
  
  // Use template's saved size if available, otherwise fall back to sizeId
  let size;
  if (template?.label_width_mm && template?.label_height_mm) {
    size = { w: template.label_width_mm, h: template.label_height_mm };
    console.log('[printWithTemplate] Using template dimensions:', size);
  } else if (template?.label_size_id) {
    size = LABEL_SIZES.find(s => s.id === template.label_size_id) || LABEL_SIZES[1];
    console.log('[printWithTemplate] Using template size ID:', template.label_size_id, size);
  } else {
    size = LABEL_SIZES.find(s => s.id === sizeId) || LABEL_SIZES[1];
    console.log('[printWithTemplate] Using fallback size:', sizeId, size);
  }

  // Handle both array and object block_config formats
  const cfg = Array.isArray(template?.block_config) ? template.block_config[0] : template?.block_config;
  const elements = cfg?.elements;
  console.log('[printWithTemplate] Template has', elements?.length, 'elements');

  // If template has no block_config elements, fall back gracefully
  if (!elements?.length) {
    console.log('[printWithTemplate] No template elements, using fallback');
    openFallbackPrint(asset, size, template?.qr_data_config);
    return;
  }

  console.log('[printWithTemplate] Building HTML for export');
  const html = buildPrintHTML(elements, size, asset, brand, template?.qr_data_config);
  console.log('[printWithTemplate] Opening print window');
  const winW = Math.max(320, Math.round(size.w * 3.7795) + 80);
  const winH = Math.max(240, Math.round(size.h * 3.7795) + 80);
  const win = window.open('', '_blank', `width=${winW},height=${winH}`);
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups and try again.');
    return;
  }
  win.document.write(html);
  win.document.close();
  console.log('[printWithTemplate] Window opened, printing shortly');
}

/** Minimal fallback if no block_config template is available */
function openFallbackPrint(asset, size, qrDataConfig = {}) {
  const MM = 3.7795;
  const wPx = Math.round(size.w * MM);
  const hPx = Math.round(size.h * MM);
  const qrPx = Math.round(Math.min(size.w, size.h) * 0.6 * MM);
  
  // Build QR data string from configured fields
   const buildQRData = () => {
     const fields = qrDataConfig.fields || ['serial_numbers'];
     const separator = qrDataConfig.separator || '|';
     return fields
       .map(f => f === 'serial_numbers' ? getSerialNumbersString(asset) : (asset?.[f] || ''))
       .filter(v => v !== '')
       .join(separator);
   };

   // QR encodes the asset's serial number (primary identity), never the disconnected barcode field
   const code = buildQRData() || getSerialNumbersString(asset) || asset.id || 'UNKNOWN';

  const html = `<!DOCTYPE html><html><head><title>Label</title>
  <style>
  @page { size:${size.w}mm ${size.h}mm; margin:0; }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:white; display:flex; align-items:center; gap:4px; padding:4px; width:${wPx}px; height:${hPx}px; margin:0; }
  .text { overflow:hidden; }
  .name { font-size:${Math.max(6, Math.min(10, size.h * 0.28))}px; font-weight:700; font-family:sans-serif; color:#000; }
  .code { font-size:${Math.max(5, Math.min(8, size.h * 0.2))}px; font-family:monospace; color:#444; margin-top:1px; }
  @media print { body { -webkit-print-color-adjust:exact; } }
  </style></head><body>
  <div id="qr"></div>
  <div class="text"><div class="name">${asset.name}</div><div class="code">${code}</div></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
  <script>
  new QRCode(document.getElementById('qr'), { text: '${code}', width: ${qrPx}, height: ${qrPx}, correctLevel: QRCode.CorrectLevel.M });
  window.addEventListener('afterprint', () => window.close());
  setTimeout(() => window.print(), 300);
  <\/script></body></html>`;

  const winW = Math.max(320, wPx + 80);
  const winH = Math.max(240, hPx + 80);
  const win = window.open('', '_blank', `width=${winW},height=${winH}`);
  win.document.write(html);
  win.document.close();
}