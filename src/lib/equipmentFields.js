/**
 * MASTER EQUIPMENT FIELD DEFINITIONS
 * Single source of truth shared by the Add Equipment Wizard and Import tool.
 * These are the "system" fields. Admins can also add CustomField records that extend this list.
 */

export const SYSTEM_FIELDS = [
  {
    key: 'name',
    label: 'Name (in database)',
    type: 'text',
    required: true,
    wizard_step: 1,
    description: 'Internal equipment name',
  },
  {
    key: 'purchase_price',
    label: 'List Price',
    type: 'currency',
    required: false,
    wizard_step: 1,
    description: 'Base value or list price of the item',
  },
  {
    key: 'barcode',
    label: 'QR Code / RFID',
    type: 'text',
    required: false,
    wizard_step: 2,
    description: 'Unique identifier for tracking (scan or auto-generate)',
  },
  {
    key: 'serial_numbers',
    label: 'QR Codes / RFID Serial Numbers',
    type: 'text',
    required: false,
    wizard_step: 3,
    description: 'Individual serial numbers (comma-separated for multiple)',
    showWhen: (form) => form.tracking === 'serialized',
  },
  {
    key: 'quantity',
    label: 'Current Quantity (excl. reserved)',
    type: 'number',
    required: false,
    wizard_step: 3,
    description: 'Available quantity excluding reserved items',
    showWhen: (form) => form.tracking === 'bulk',
  },
  {
    key: 'daily_rate',
    label: 'Rental / Sales Price',
    type: 'currency',
    required: false,
    wizard_step: 4,
    description: 'Price used in quotes and invoices',
  },
  {
    key: 'subrent_cost',
    label: 'Subrent / Purchase Cost',
    type: 'currency',
    required: false,
    wizard_step: 4,
    description: 'Cost to subrent or purchase this item',
  },
  {
    key: 'country_of_origin',
    label: 'Country of Origin',
    type: 'text',
    required: false,
    wizard_step: 5,
    description: 'Country where item was manufactured',
  },
];

/**
 * FIELD ALIAS MAP — for smart auto-detection of spreadsheet column headers.
 * Each entry maps a field key to an array of known name variations (lowercase, normalized).
 * Used by the import tool to auto-map uploaded spreadsheet columns.
 */
export const FIELD_ALIASES = {
  item_type: [
    'item type', 'type', 'record type', 'equipment type', 'asset type',
    'item_type', 'itemtype',
  ],
  name: [
    'name', 'name in database', 'equipment name', 'item name', 'product name',
    'description', 'gear name', 'asset name', 'title', 'item', 'device',
  ],
  barcode: [
    'barcode', 'qr code', 'qr codes rfid', 'qr codes / rfid', 'rfid', 'qr',
    'code', 'id', 'identifier', 'asset id', 'asset code', 'scan code', 'tag',
  ],
  serial_numbers: [
    'serial numbers', 'qr codes rfid serial numbers', 'serial number', 'serials',
    'serial', 'sn', 's/n', 'serial no', 'serial nos', 'serial #',
  ],
  quantity: [
    'quantity', 'qty', 'stock', 'count', 'units', 'total',
    'current quantity excl reserved', 'quantity excl reserved', 'available qty',
    'current quantity', 'stock quantity', 'in stock',
  ],
  purchase_price: [
    'list price', 'base price', 'price', 'value', 'retail price',
    'rrp', 'msrp', 'unit price', 'cost price', 'original price',
    'price incl tax', 'price including tax', 'price with tax', 'inc tax',
    'incl tax', 'gross price', 'price incl. tax',
  ],
  daily_rate: [
    'rental price', 'rental rate', 'sales price', 'day rate', 'daily rate',
    'rental/sales price', 'hire rate', 'rental-/sales price', 'rent price',
    'rate', 'rental fee', 'hire fee', 'price per day',
  ],
  subrent_cost: [
    'subrent cost', 'subrent purchase cost', 'purchase cost', 'buy cost',
    'cost', 'supplier cost', 'sub-rent cost', 'subrent/purchase cost',
    'subrent-/purchase cost', 'buying price',
  ],
  country_of_origin: [
    'country of origin', 'country', 'origin', 'made in', 'manufactured in',
    'country origin', 'manufacture country',
  ],
  category: [
    'category', 'cat', 'group', 'department', 'section', 'family',
    'cat name', 'equipment category', 'item category', 'gear category',
  ],
  condition: [
    'condition', 'state', 'quality', 'grade',
  ],
  location: [
    'location', 'storage', 'warehouse', 'storage location', 'where', 'room',
    'shelf', 'bin',
  ],
  notes: [
    'notes', 'note', 'description', 'comments', 'comment', 'remarks', 'info',
    'details', 'additional info',
  ],
};

/**
 * Smart field matcher with CONFIDENCE SCORING.
 *
 * Returns { key, confidence } where confidence is:
 *   'high'   — exact or very-close alias match → auto-map silently
 *   'medium' — partial / substring match       → auto-map but show suggestion badge
 *   'low'    — weak overlap only               → require user confirmation via popup
 *   'none'   — no match found                  → skip
 */
export function detectFieldWithConfidence(rawHeader, extraFields = []) {
  const norm = (s) => s.toLowerCase().trim().replace(/[\s/_\-.,;:()]+/g, '');
  const h = norm(rawHeader);

  // ── 1. Exact alias match → HIGH ──────────────────────────────────────────
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const a = norm(alias);
      if (h === a) return { key, confidence: 'high' };
    }
  }

  // ── 2. Alias is fully contained in header (or vice-versa) → MEDIUM ──────
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const a = norm(alias);
      if (a.length >= 3 && (h.includes(a) || a.includes(h))) {
        return { key, confidence: 'medium' };
      }
    }
  }

  // ── 3. Custom fields exact → HIGH, partial → MEDIUM ─────────────────────
  for (const cf of extraFields) {
    const fk = norm(cf.field_key || '');
    const fn = norm(cf.field_name || '');
    if (h === fk || h === fn) return { key: `cf_${cf.field_key}`, confidence: 'high' };
    if ((fk.length >= 3 && (h.includes(fk) || fk.includes(h))) ||
        (fn.length >= 3 && (h.includes(fn) || fn.includes(h)))) {
      return { key: `cf_${cf.field_key}`, confidence: 'medium' };
    }
  }

  // ── 4. Weak word overlap → LOW (needs user confirmation) ─────────────────
  const hWords = h.split(/\s+/).filter(w => w.length >= 3);
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const aWords = norm(alias).split(/\s+/).filter(w => w.length >= 3);
      if (hWords.some(w => aWords.includes(w))) {
        return { key, confidence: 'low' };
      }
    }
  }

  return { key: '_skip', confidence: 'none' };
}

/**
 * Convenience wrapper — returns just the field key (backward compat).
 */
export function detectFieldKey(rawHeader, extraFields = []) {
  return detectFieldWithConfidence(rawHeader, extraFields).key;
}

/** Fields shown in the import column-mapper (system fields only) */
export const IMPORT_FIELDS = [
  { key: 'name',              label: 'Name (in database)',                  required: true },
  { key: 'item_type',         label: 'Item Type (physical_item / physical_kit / cloud_kit / consumable)', required: false },
  { key: 'barcode',           label: 'QR Code / RFID',                      required: false },
  { key: 'serial_numbers',    label: 'QR Codes / RFID Serial Numbers',      required: false },
  { key: 'quantity',          label: 'Current Quantity (excl. reserved)',    required: false },
  { key: 'purchase_price',    label: 'List Price',                          required: false },
  { key: 'daily_rate',        label: 'Rental / Sales Price',                required: false },
  { key: 'subrent_cost',      label: 'Subrent / Purchase Cost',             required: false },
  { key: 'country_of_origin', label: 'Country of Origin',                   required: false },
  { key: 'category',          label: 'Category',                            required: false },
  { key: 'condition',         label: 'Condition',                           required: false },
  { key: 'location',          label: 'Storage Location',                    required: false },
  { key: 'notes',             label: 'Notes',                               required: false },
  { key: '_skip',             label: '— Skip this column —',               required: false },
];

export const EMPTY_FORM = {
  item_type: 'physical_item',
  name: '',
  purchase_price: '',
  barcode: '',
  tracking: 'serialized',   // 'serialized' | 'bulk'
  serial_numbers: '',       // comma-separated
  quantity: 1,
  daily_rate: '',
  subrent_cost: '',
  country_of_origin: '',
  category: '',
  condition: 'good',
  location: 'Warehouse',
  notes: '',
  custom_fields: {},
};