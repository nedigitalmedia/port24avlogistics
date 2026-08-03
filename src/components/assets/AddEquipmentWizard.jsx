import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check, ChevronRight, ChevronLeft, Package, BarChart2,
  FileText, Eye, Hash, DollarSign, Printer, QrCode,
  Cloud, Search, X, PackageOpen, ShoppingCart, Box,
  Zap, Upload, Plus, Trash2, Layers, Building2, MapPin
} from 'lucide-react';
import QRLabelPrinter from '@/components/assets/QRLabelPrinter';
import { generateNextCode, useCodeSettings, getMergedSettings, buildCode, previewCode } from '@/lib/useAutoCode';

// ─── Item Type Definitions ───────────────────────────────────────────────────
const ITEM_TYPES = [
  {
    value: 'physical_item',
    label: 'Physical Item',
    desc: 'A single piece of equipment tracked individually with asset numbers and serial numbers.',
    example: 'e.g. Shure SM58 Microphone, Canon Camera',
    icon: Package,
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
  },
  {
    value: 'bulk',
    label: 'Bulk Item',
    desc: 'Multiple identical units tracked by total quantity — no individual serial numbers.',
    example: 'e.g. XLR Cables ×50, Stage Wedges ×10',
    icon: Box,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
  },
  {
    value: 'consumable',
    label: 'Consumable',
    desc: 'Depletable stock with reorder points. No serial tracking.',
    example: 'e.g. AA Batteries, Gaffer Tape, DMX Cable',
    icon: Zap,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  {
    value: 'cloud_kit',
    label: 'Cloud Kit',
    desc: 'A virtual bundle of items for planning purposes — expands into project requirements.',
    example: 'e.g. Standard Audio Package, Basic Video Rig',
    icon: Cloud,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  {
    value: 'physical_kit',
    label: 'Physical Kit',
    desc: 'A sealed road case or rack with named contents — scanned as one unit.',
    example: 'e.g. IEM Kit A, Broadcast Rack B',
    icon: Layers,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
  },
];

// ─── Step definitions per type ───────────────────────────────────────────────
const STEP_DEFS = {
  physical_item: [
    { id: 'product',   label: 'Product Details', icon: Package },
    { id: 'tracking',  label: 'Tracking Setup',  icon: Hash },
    { id: 'pricing',   label: 'Pricing & Value', icon: DollarSign },
    { id: 'location',  label: 'Location',        icon: MapPin },
    { id: 'advanced',  label: 'Extra Details',   icon: FileText },
    { id: 'review',    label: 'Review',          icon: Eye },
  ],
  bulk: [
    { id: 'product',   label: 'Product Details', icon: Package },
    { id: 'quantity',  label: 'Quantity',        icon: BarChart2 },
    { id: 'pricing',   label: 'Pricing & Value', icon: DollarSign },
    { id: 'location',  label: 'Location',        icon: MapPin },
    { id: 'review',    label: 'Review',          icon: Eye },
  ],
  consumable: [
    { id: 'product',   label: 'Product Details', icon: Package },
    { id: 'stock',     label: 'Stock Levels',    icon: BarChart2 },
    { id: 'cost',      label: 'Cost Per Unit',   icon: DollarSign },
    { id: 'location',  label: 'Location',        icon: MapPin },
    { id: 'review',    label: 'Review',          icon: Eye },
  ],
  cloud_kit: [
    { id: 'product',   label: 'Kit Details',     icon: Cloud },
    { id: 'contents',  label: 'Add Components',  icon: Package },
    { id: 'pricing',   label: 'Pricing',         icon: DollarSign },
    { id: 'review',    label: 'Review',          icon: Eye },
  ],
  physical_kit: [
    { id: 'product',   label: 'Kit Details',     icon: Layers },
    { id: 'kit_code',  label: 'Kit Code / QR',   icon: QrCode },
    { id: 'contents',  label: 'Kit Contents',    icon: Package },
    { id: 'seal',      label: 'Seal Settings',   icon: FileText },
    { id: 'pricing',   label: 'Pricing',         icon: DollarSign },
    { id: 'location',  label: 'Location',        icon: MapPin },
    { id: 'review',    label: 'Review',          icon: Eye },
  ],
};

// ─── Empty form ───────────────────────────────────────────────────────────────
function makeEmptyForm(item_type = 'physical_item') {
  return {
    item_type,
    name: '',
    category: '',
    manufacturer: '',
    model: '',
    description: '',
    condition: 'good',
    location: 'Warehouse',
    notes: '',
    // Tracking IDs — separate fields
    asset_number: '',
    serial_numbers: '',
    barcode: '',
    // Tracking method for physical items
    tracking: 'serialized',
    // Auto-generate options
    tracking_mode: 'auto',  // 'auto' | 'manual' | 'scan' | 'none'
    auto_prefix: '',
    auto_start: '1',
    auto_quantity: '1',
    // Quantity for bulk/consumable
    quantity: 1,
    reorder_level: '',
    unit_of_measure: '',
    cost_per_unit: '',
    vendor: '',
    // Pricing
    daily_rate: '',
    subrent_cost: '',
    replacement_value: '',
    purchase_price: '',
    purchase_date: '',
    // Kit specific
    auto_price: false,
    is_sealed: false,
    require_complete_checkin: true,
    linked_asset_ids: [],
    kit_contents: [],
    // Ownership
    ownership_type: 'owned',
    partner_owner_id: '',
    partner_owner_name: '',
    partner_use_allowed: true,
    partner_approval_required: false,
    partner_agreement_notes: '',
    // Advanced
    weight_kg: '',
    country_of_origin: '',
    warranty_expiry: '',
    custom_fields: {},
  };
}

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                done ? "bg-primary border-primary text-primary-foreground" :
                active ? "border-primary text-primary bg-primary/10" :
                "border-muted text-muted-foreground bg-muted/30"
              )}>
                {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              </div>
              <span className={cn("text-[9px] font-medium hidden sm:block whitespace-nowrap",
                active ? "text-primary" : done ? "text-primary/60" : "text-muted-foreground/60"
              )}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 mb-3.5 mx-0.5", done ? "bg-primary" : "bg-muted")} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Step: Choose Item Type ───────────────────────────────────────────────────
function StepChooseType({ form, set }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">Choose Item Type</h2>
        <p className="text-sm text-muted-foreground mt-0.5">This controls how the item is tracked and behaves across Port 24.</p>
      </div>
      <div className="space-y-2">
        {ITEM_TYPES.map(t => {
          const Icon = t.icon;
          const selected = form.item_type === t.value;
          return (
            <button key={t.value} type="button" onClick={() => set('item_type', t.value)}
              className={cn(
                "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
                selected ? `${t.bg} ${t.border}` : "border-border hover:border-muted-foreground/30 hover:bg-muted/20"
              )}>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                selected ? `${t.bg}` : "bg-muted")}>
                <Icon className={cn("w-5 h-5", selected ? t.color : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-semibold text-sm", selected ? "text-foreground" : "text-muted-foreground")}>{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                <p className="text-xs text-muted-foreground/60 italic mt-0.5">{t.example}</p>
              </div>
              {selected && <Check className="w-4 h-4 text-primary mt-1 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step: Product Details ────────────────────────────────────────────────────
function StepProductDetails({ form, set, categories, mode }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const isKit = form.item_type === 'physical_kit' || form.item_type === 'cloud_kit';
  const isConsumable = form.item_type === 'consumable';
  const isBulk = form.item_type === 'bulk';

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      set('image_url', file_url);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{isKit ? 'Kit Details' : 'Product Details'}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isKit ? 'Name and categorize this kit.' : 'Core product identity — name, category, manufacturer.'}
        </p>
      </div>

      <div className="flex gap-4 items-start">
        <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors shrink-0 relative overflow-hidden"
          onClick={() => fileRef.current?.click()}>
          {form.image_url ? (
            <>
              <img src={form.image_url} alt="" className="w-full h-full object-cover" />
              <button type="button" onClick={e => { e.stopPropagation(); set('image_url', ''); }}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                <X className="w-3 h-3 text-white" />
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 text-center px-1">
              <Plus className="w-5 h-5 text-muted-foreground" />
              {uploading && <span className="text-[9px] text-muted-foreground">Uploading…</span>}
              {!uploading && <span className="text-[9px] text-muted-foreground">Photo</span>}
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <div className="flex-1 space-y-3">
          <div>
            <Label>{isKit ? 'Kit Name' : 'Item Name'} <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder={isKit ? 'e.g. IEM Kit A' : isConsumable ? 'e.g. AA Batteries' : 'e.g. Shure SM58 Microphone'} />
          </div>
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={v => set('category', v)}>
              <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {mode === 'advanced' && !isKit && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Manufacturer / Brand</Label>
            <Input value={form.manufacturer || ''} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Shure" />
          </div>
          <div>
            <Label>Model</Label>
            <Input value={form.model || ''} onChange={e => set('model', e.target.value)} placeholder="e.g. SM58-LC" />
          </div>
        </div>
      )}

      {mode === 'advanced' && (
        <div>
          <Label>Description</Label>
          <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2}
            placeholder="Brief specs, use cases, notes…" />
        </div>
      )}

      {!isKit && !isConsumable && !isBulk && (
        <div>
          <Label>Condition</Label>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {['excellent', 'good', 'fair', 'poor'].map(c => (
              <button key={c} type="button" onClick={() => set('condition', c)}
                className={cn("py-1.5 rounded-lg border text-xs font-medium capitalize transition-all",
                  form.condition === c ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40")}>
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {isConsumable && (
        <div>
          <Label>Unit of Measure</Label>
          <Input value={form.unit_of_measure || ''} onChange={e => set('unit_of_measure', e.target.value)} placeholder="pcs, rolls, boxes, ft…" />
        </div>
      )}
    </div>
  );
}

// ─── Step: Tracking Setup (Physical Items) ────────────────────────────────────
function StepTracking({ form, set }) {
  const previewSerials = () => {
    const prefix = form.auto_prefix || '';
    const start = parseInt(form.auto_start || '1', 10);
    const qty = Math.min(parseInt(form.auto_quantity || '1', 10), 10);
    const padLen = String(form.auto_start || '1').length;
    return Array.from({ length: qty }, (_, i) => `${prefix}${String(start + i).padStart(Math.max(padLen, 1), '0')}`);
  };

  const preview = form.tracking_mode === 'auto' ? previewSerials() : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Tracking Setup</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Choose how individual units are identified.</p>
      </div>

      {/* Tracking method */}
      <div className="space-y-2">
        {[
          { value: 'auto', label: 'Auto-Generate Asset Numbers', desc: 'Automatically generate sequential asset numbers with a prefix.' },
          { value: 'manual', label: 'Enter Manually', desc: 'Type in one asset number per line.' },
          { value: 'scan', label: 'Scan Existing Barcodes', desc: 'Scan physical asset tags with a barcode scanner.' },
          { value: 'none', label: 'No Individual Tracking', desc: 'Track by quantity only — no asset numbers.' },
        ].map(opt => (
          <button key={opt.value} type="button" onClick={() => set('tracking_mode', opt.value)}
            className={cn("w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all",
              form.tracking_mode === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30")}>
            <div className={cn("w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0",
              form.tracking_mode === opt.value ? "border-primary" : "border-muted-foreground/50")}>
              {form.tracking_mode === opt.value && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div>
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Auto-generate config */}
      {form.tracking_mode === 'auto' && (
        <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Auto-Generate Settings</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Prefix</Label>
              <Input value={form.auto_prefix} onChange={e => set('auto_prefix', e.target.value)} placeholder="e.g. BC, AV" />
            </div>
            <div>
              <Label>Starting #</Label>
              <Input value={form.auto_start} onChange={e => set('auto_start', e.target.value)} placeholder="00001" />
            </div>
            <div>
              <Label>Quantity</Label>
              <Input type="number" min="1" max="500" value={form.auto_quantity}
                onChange={e => set('auto_quantity', e.target.value)} />
            </div>
          </div>
          {preview.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Preview (first {preview.length}):</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.map(n => (
                  <span key={n} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">{n}</span>
                ))}
                {parseInt(form.auto_quantity || '1') > 10 && (
                  <span className="px-2 py-0.5 text-muted-foreground text-xs">+{parseInt(form.auto_quantity) - 10} more…</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual entry */}
      {form.tracking_mode === 'manual' && (
        <div>
          <Label>Asset Numbers <span className="text-xs text-muted-foreground font-normal">(one per line)</span></Label>
          <Textarea
            value={form.serial_numbers}
            onChange={e => set('serial_numbers', e.target.value)}
            rows={5}
            placeholder={'AV-001\nAV-002\nAV-003\n…'}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {form.serial_numbers ? `${form.serial_numbers.split(/[\n,]/).filter(s => s.trim()).length} number(s) entered` : 'One per line or comma-separated'}
          </p>
        </div>
      )}

      {/* Scan mode */}
      {form.tracking_mode === 'scan' && (
        <div>
          <Label>Scanned Barcodes <span className="text-xs text-muted-foreground font-normal">(scan or type)</span></Label>
          <Textarea
            value={form.serial_numbers}
            onChange={e => set('serial_numbers', e.target.value)}
            rows={5}
            placeholder="Scan each barcode tag — they'll appear here one per line…"
            className="font-mono text-sm"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1">
            {form.serial_numbers ? `${form.serial_numbers.split(/[\n,]/).filter(s => s.trim()).length} code(s) scanned` : 'Focus here and scan barcodes'}
          </p>
        </div>
      )}

      {/* Quantity for "none" mode */}
      {form.tracking_mode === 'none' && (
        <div>
          <Label>Quantity</Label>
          <Input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Number of units tracked as a pool.</p>
        </div>
      )}

      {/* Separate identifier fields */}
      <div className="border-t pt-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Identification Fields</p>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <Label>Internal Asset Number
              <span className="text-xs text-muted-foreground font-normal ml-1">(Port 24 tracking ID)</span>
            </Label>
            <Input value={form.asset_number || ''} onChange={e => set('asset_number', e.target.value)}
              placeholder="e.g. AV-001 (leave blank if auto-generating above)" />
          </div>
          <div>
            <Label>Manufacturer Serial Number
              <span className="text-xs text-muted-foreground font-normal ml-1">(factory serial)</span>
            </Label>
            <Input value={form.mfr_serial || ''} onChange={e => set('mfr_serial', e.target.value)}
              placeholder="e.g. SHU-A4928392" />
          </div>
          <div>
            <Label>Barcode / QR Code Value
              <span className="text-xs text-muted-foreground font-normal ml-1">(scannable label)</span>
            </Label>
            <Input value={form.barcode || ''} onChange={e => set('barcode', e.target.value)}
              placeholder="e.g. short scan code or same as asset number" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step: Quantity (Bulk) ────────────────────────────────────────────────────
function StepQuantity({ form, set }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Quantity Tracking</h2>
        <p className="text-sm text-muted-foreground mt-0.5">How many units are currently in stock?</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Current Quantity <span className="text-destructive">*</span></Label>
          <Input type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Total units available (excluding reserved)</p>
        </div>
        <div>
          <Label>Barcode / QR Code <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
          <Input value={form.barcode || ''} onChange={e => set('barcode', e.target.value)} placeholder="Scan or type" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Internal Asset Number <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
          <Input value={form.asset_number || ''} onChange={e => set('asset_number', e.target.value)} placeholder="e.g. BULK-001" />
        </div>
        <div>
          <Label>Condition</Label>
          <Select value={form.condition || 'good'} onValueChange={v => set('condition', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="excellent">Excellent</SelectItem>
              <SelectItem value="good">Good</SelectItem>
              <SelectItem value="fair">Fair</SelectItem>
              <SelectItem value="poor">Poor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ─── Step: Stock Levels (Consumable) ─────────────────────────────────────────
function StepStock({ form, set }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Stock Levels</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Set current stock on hand and reorder thresholds.</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Quantity on Hand <span className="text-destructive">*</span></Label>
          <Input type="number" min="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
        </div>
        <div>
          <Label>Reorder Level</Label>
          <Input type="number" min="0" value={form.reorder_level || ''}
            onChange={e => set('reorder_level', e.target.value)} placeholder="e.g. 10" />
          <p className="text-xs text-muted-foreground mt-1">Alert when stock drops below this</p>
        </div>
      </div>
      <div>
        <Label>Vendor / Supplier <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
        <Input value={form.vendor || ''} onChange={e => set('vendor', e.target.value)} placeholder="Who supplies this?" />
      </div>
    </div>
  );
}

// ─── Step: Cost Per Unit (Consumable) ─────────────────────────────────────────
function StepCost({ form, set }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Cost Per Unit</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Set cost for tracking consumable expenditure.</p>
      </div>
      <div>
        <Label>Cost Per Unit ($)</Label>
        <div className="relative mt-1">
          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input type="number" step="0.01" min="0" value={form.cost_per_unit || ''}
            onChange={e => set('cost_per_unit', e.target.value)} className="pl-8" placeholder="0.00" />
        </div>
        <p className="text-xs text-muted-foreground mt-1">Used for budget tracking — not shown to clients.</p>
      </div>
      <div className="p-4 rounded-xl bg-muted/30 border text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Consumables and Quoting</p>
        <p className="text-xs">Consumables are typically not quoted to clients individually. They appear in internal reports only. If you do quote them, add them as a line item manually in the quote builder.</p>
      </div>
    </div>
  );
}

// ─── Step: Pricing (Physical Item / Bulk / Kit) ───────────────────────────────
function StepPricing({ form, set, mode, allAssets }) {
  const isCloudKit = form.item_type === 'cloud_kit';
  const linkedAssets = allAssets.filter(a => (form.linked_asset_ids || []).includes(a.id));
  const autoPrice = isCloudKit && form.auto_price
    ? linkedAssets.reduce((s, a) => s + (a.daily_rate || 0), 0)
    : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Pricing & Value</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Set rental rates and replacement cost.</p>
      </div>

      {isCloudKit && (
        <div className="flex items-center justify-between p-4 border rounded-xl">
          <div>
            <p className="text-sm font-medium">Auto-calculate from contents</p>
            <p className="text-xs text-muted-foreground mt-0.5">Kit price = sum of all assigned item daily rates.</p>
          </div>
          <Switch checked={form.auto_price || false} onCheckedChange={v => set('auto_price', v)} />
        </div>
      )}

      {isCloudKit && form.auto_price && autoPrice > 0 && (
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
          Auto-price: ${autoPrice}/day from {linkedAssets.length} items
        </div>
      )}

      {(!isCloudKit || !form.auto_price) && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Rental / Daily Rate ($)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="number" step="0.01" min="0" value={form.daily_rate || ''}
                onChange={e => set('daily_rate', e.target.value)} className="pl-8" placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Replacement Value ($)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="number" step="0.01" min="0" value={form.replacement_value || ''}
                onChange={e => set('replacement_value', e.target.value)} className="pl-8" placeholder="0.00" />
            </div>
          </div>
        </div>
      )}

      {mode === 'advanced' && !isCloudKit && (
        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <Label>Purchase / Internal Cost ($)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="number" step="0.01" min="0" value={form.purchase_price || ''}
                onChange={e => set('purchase_price', e.target.value)} className="pl-8" placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Subrent Cost ($)</Label>
            <div className="relative mt-1">
              <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="number" step="0.01" min="0" value={form.subrent_cost || ''}
                onChange={e => set('subrent_cost', e.target.value)} className="pl-8" placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label>Purchase Date</Label>
            <Input type="date" value={form.purchase_date || ''} onChange={e => set('purchase_date', e.target.value)} />
          </div>
          <div>
            <Label>Max Discount %</Label>
            <Input type="number" min="0" max="100" value={form.max_discount_pct ?? 50}
              onChange={e => set('max_discount_pct', e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step: Location & Status ──────────────────────────────────────────────────
function StepLocation({ form, set, partners }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Location & Status</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Where is this item stored?</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Storage Location</Label>
          <Input value={form.location || ''} onChange={e => set('location', e.target.value)} placeholder="e.g. Warehouse, Case Room A" />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status || 'available'} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ownership */}
      <div className="border-t pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" /> Ownership
        </p>
        <div className="flex gap-2 mb-3">
          {[
            { value: 'owned', label: 'Owned by Us', desc: 'Our gear' },
            { value: 'partner_stored', label: 'Partner Stored', desc: 'Roundtable partner' },
          ].map(opt => (
            <button key={opt.value} type="button" onClick={() => set('ownership_type', opt.value)}
              className={cn("flex-1 text-left p-3 rounded-lg border-2 transition-all",
                form.ownership_type === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30")}>
              <p className="text-sm font-semibold">{opt.label}</p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </button>
          ))}
        </div>

        {form.ownership_type === 'partner_stored' && (
          <div className="space-y-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div>
              <Label>Partner Company</Label>
              <Select value={form.partner_owner_id || ''} onValueChange={v => {
                const p = partners.find(p => p.id === v);
                set('partner_owner_id', v);
                set('partner_owner_name', p?.company_name || '');
              }}>
                <SelectTrigger><SelectValue placeholder="Select partner…" /></SelectTrigger>
                <SelectContent>
                  {partners.map(p => <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Available for Our Shows</p>
                <p className="text-xs text-muted-foreground">Can we allocate this to our projects?</p>
              </div>
              <Switch checked={form.partner_use_allowed !== false} onCheckedChange={v => set('partner_use_allowed', v)} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Approval Required</p>
                <p className="text-xs text-muted-foreground">Partner must approve each use</p>
              </div>
              <Switch checked={!!form.partner_approval_required} onCheckedChange={v => set('partner_approval_required', v)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step: Advanced Details ───────────────────────────────────────────────────
function StepAdvanced({ form, set, customFields }) {
  const updateCF = (key, value) => set('custom_fields', { ...form.custom_fields, [key]: value });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Extra Details</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Additional metadata for admin and records.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Weight — Full Case (kg)</Label>
          <Input type="number" step="0.1" min="0" value={form.weight_kg || ''}
            onChange={e => set('weight_kg', e.target.value)} placeholder="0.0" />
        </div>
        <div>
          <Label>Country of Origin</Label>
          <Input value={form.country_of_origin || ''} onChange={e => set('country_of_origin', e.target.value)} placeholder="e.g. Germany" />
        </div>
        <div>
          <Label>Vendor / Supplier</Label>
          <Input value={form.vendor || ''} onChange={e => set('vendor', e.target.value)} placeholder="Who supplied it?" />
        </div>
        <div>
          <Label>Warranty Expiry</Label>
          <Input type="date" value={form.warranty_expiry || ''} onChange={e => set('warranty_expiry', e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Internal Notes</Label>
        <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Any internal notes about this item…" />
      </div>
      {customFields.filter(cf => !cf.is_hidden).length > 0 && (
        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Custom Fields</p>
          <div className="grid grid-cols-2 gap-3">
            {customFields.filter(cf => !cf.is_hidden).map(cf => (
              <div key={cf.id}>
                <Label>{cf.field_name}</Label>
                {cf.field_type === 'select' ? (
                  <Select value={form.custom_fields?.[cf.field_key] || ''} onValueChange={v => updateCF(cf.field_key, v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>{cf.options?.split(',').map(o => <SelectItem key={o.trim()} value={o.trim()}>{o.trim()}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Input type={cf.field_type === 'number' ? 'number' : cf.field_type === 'date' ? 'date' : 'text'}
                    value={form.custom_fields?.[cf.field_key] || ''} onChange={e => updateCF(cf.field_key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step: Kit Code (Physical Kit) ───────────────────────────────────────────
function StepKitCode({ form, set, codeSettings }) {
  const kitSettings = getMergedSettings(codeSettings, 'physical_kit');
  const autoPreview = previewCode(kitSettings);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Kit Asset Number / QR Code</h2>
        <p className="text-sm text-muted-foreground mt-0.5">The scan code that goes on the outside of the road case or rack.</p>
      </div>
      <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-3">
        <QrCode className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium">Scanning this code checks out the whole kit as one unit.</p>
          <p className="text-xs text-muted-foreground mt-1">
            {kitSettings.auto_generate
              ? <>Auto-generate is <strong className="text-primary">on</strong> — next code will be <span className="font-mono text-primary">{autoPreview}</span>. Override below if needed.</>
              : 'Auto-generate is off — enter a code manually.'}
          </p>
        </div>
      </div>
      <div>
        <Label>Kit Code / QR Value <span className="text-xs text-muted-foreground font-normal">(leave blank to auto-generate)</span></Label>
        <Input
          value={form.barcode || ''}
          onChange={e => set('barcode', e.target.value)}
          placeholder={kitSettings.auto_generate ? `e.g. ${autoPreview}` : 'Enter a code'}
        />
      </div>
      <div>
        <Label>Internal Asset Number <span className="text-xs text-muted-foreground font-normal">(optional override)</span></Label>
        <Input
          value={form.asset_number || ''}
          onChange={e => set('asset_number', e.target.value)}
          placeholder="Leave blank to use same as QR code"
        />
      </div>
    </div>
  );
}

// ─── Step: Seal Settings (Physical Kit) ──────────────────────────────────────
function StepSeal({ form, set }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Seal / Unseal Settings</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Control whether kit contents can be modified after creation.</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 border rounded-xl">
          <div>
            <p className="text-sm font-medium">Seal Kit After Saving</p>
            <p className="text-xs text-muted-foreground mt-0.5">Locks planned contents — prevents accidental edits after kit is built.</p>
          </div>
          <Switch checked={!!form.is_sealed} onCheckedChange={v => set('is_sealed', v)} />
        </div>
        <div className="flex items-center justify-between p-4 border rounded-xl">
          <div>
            <p className="text-sm font-medium">Require Complete Check-In</p>
            <p className="text-xs text-muted-foreground mt-0.5">All contents must be checked in before kit is marked returned.</p>
          </div>
          <Switch checked={form.require_complete_checkin !== false} onCheckedChange={v => set('require_complete_checkin', v)} />
        </div>
      </div>
      <div>
        <Label>Internal Notes</Label>
        <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Kit-specific notes, packing instructions, maintenance info…" />
      </div>
    </div>
  );
}

// ─── Step: Cloud Kit Contents ─────────────────────────────────────────────────
function StepCloudContents({ form, set, allAssets }) {
  const [search, setSearch] = useState('');
  const linked = form.linked_asset_ids || [];
  const linkedAssets = allAssets.filter(a => linked.includes(a.id));
  const searchResults = search.length > 1
    ? allAssets.filter(a =>
        !linked.includes(a.id) &&
        (a.name?.toLowerCase().includes(search.toLowerCase()) ||
         a.serial_numbers?.toLowerCase().includes(search.toLowerCase()))
      ).slice(0, 8)
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Add Component Products</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Assign inventory items to this virtual planning bundle.</p>
      </div>
      {linkedAssets.length > 0 && (
        <div className="space-y-1.5">
          {linkedAssets.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-2 rounded-md border bg-card">
              <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium flex-1">{a.name}</span>
              {a.daily_rate && <span className="text-xs text-muted-foreground">${a.daily_rate}/day</span>}
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0"
                onClick={() => set('linked_asset_ids', linked.filter(id => id !== a.id))}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div>
        <Label>Search Inventory</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search by name or serial…" className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {searchResults.length > 0 && (
          <div className="border rounded-md mt-1 divide-y bg-background shadow-sm max-h-48 overflow-y-auto">
            {searchResults.map(a => (
              <button key={a.id} type="button"
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 text-left text-sm"
                onClick={() => { set('linked_asset_ids', [...linked, a.id]); setSearch(''); }}>
                <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground font-mono">{a.serial_numbers || a.barcode || ''}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{linked.length} item{linked.length !== 1 ? 's' : ''} assigned.</p>
    </div>
  );
}

// ─── Step: Physical Kit Contents ──────────────────────────────────────────────
function StepKitContents({ form, set, allAssets }) {
  const [search, setSearch] = useState('');
  const kitContents = form.kit_contents || [];

  function parseSerials(s) {
    if (!s) return [];
    return s.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
  }

  const linkedKeys = new Set(kitContents.map(e => e.serial ? `${e.asset_id}::${e.serial}` : e.asset_id));

  const buildSearchRows = () => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return [];
    const rows = [];
    for (const a of allAssets) {
      const serials = parseSerials(a.serial_numbers);
      if (!serials.length) {
        const key = a.id;
        if (a.name?.toLowerCase().includes(q) || a.barcode?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q)) {
          rows.push({ key, asset: a, serial: null, isLinked: linkedKeys.has(key), displayLabel: a.barcode || '' });
        }
      } else {
        for (const serial of serials) {
          const key = `${a.id}::${serial}`;
          if (serial.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q)) {
            rows.push({ key, asset: a, serial, isLinked: linkedKeys.has(key), displayLabel: serial });
          }
        }
      }
    }
    return rows.slice(0, 20);
  };

  const searchRows = buildSearchRows();
  const available = searchRows.filter(r => !r.isLinked);

  const addSingle = (row) => {
    const entry = row.asset.tracking === 'bulk'
      ? { asset_id: row.asset.id, quantity: 1 }
      : { asset_id: row.asset.id, serial: row.serial };
    set('kit_contents', [...kitContents, entry]);
    setSearch('');
  };

  const removeEntry = (key) => {
    set('kit_contents', kitContents.filter(e => {
      const k = e.serial ? `${e.asset_id}::${e.serial}` : e.asset_id;
      return k !== key;
    }));
  };

  const linkedRows = kitContents.map(entry => {
    const asset = allAssets.find(a => a.id === entry.asset_id);
    if (!asset) return null;
    const key = entry.serial ? `${entry.asset_id}::${entry.serial}` : entry.asset_id;
    return { asset, key, serial: entry.serial || null };
  }).filter(Boolean);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Kit Contents</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Link the assets that belong inside this kit.</p>
      </div>
      <div>
        <Label>Search Inventory</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search by name, serial, category…" className="pl-9 h-9"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {available.length > 0 && (
          <div className="border rounded-md mt-1 bg-background shadow-sm max-h-44 overflow-y-auto divide-y">
            {available.map(row => (
              <div key={row.key} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/40 cursor-pointer"
                onClick={() => addSingle(row)}>
                <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm font-medium truncate">{row.asset.name}</span>
                {row.displayLabel && <span className="text-xs text-muted-foreground font-mono shrink-0">{row.displayLabel}</span>}
                <span className="text-xs text-primary shrink-0">+ Add</span>
              </div>
            ))}
          </div>
        )}
        {search.length >= 2 && searchRows.every(r => r.isLinked) && searchRows.length > 0 && (
          <p className="text-xs text-emerald-400 mt-1 px-1">✓ Already linked to this kit</p>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Kit Contents</Label>
          <span className="text-xs text-muted-foreground">{kitContents.length} linked</span>
        </div>
        {linkedRows.length > 0 ? (
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {linkedRows.map(row => (
              <div key={row.key} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{row.asset.name}</p>
                  {row.serial && <p className="text-xs text-muted-foreground font-mono">{row.serial}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive shrink-0"
                  onClick={() => removeEntry(row.key)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-5 text-center border-2 border-dashed rounded-lg text-muted-foreground">
            <Package className="w-6 h-6 mx-auto mb-1 opacity-30" />
            <p className="text-xs">Search above to add items to this kit.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step: CSV Import ─────────────────────────────────────────────────────────
function StepCSVImport({ onClose, queryClient }) {
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const TEMPLATE = 'name,category,asset_number,serial_number,barcode,daily_rate,replacement_value,location,notes\nShure SM58,Audio,AV-001,SHU-1234,AV-001,25,300,Warehouse,\nSony Camera,Video,AV-002,,CAM-002,150,2500,Cage Room,';

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ''; });
      return row;
    }).filter(r => r.name);
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setCsvText(text);
      setPreview(parseCSV(text).slice(0, 5));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    const rows = parseCSV(csvText);
    if (!rows.length) return;
    setImporting(true);
    for (const row of rows) {
      await db.entities.Asset.create({
        name: row.name,
        category: row.category || undefined,
        asset_number: row.asset_number || undefined,
        serial_numbers: row.serial_number || undefined,
        barcode: row.barcode || undefined,
        daily_rate: row.daily_rate ? Number(row.daily_rate) : undefined,
        replacement_value: row.replacement_value ? Number(row.replacement_value) : undefined,
        location: row.location || 'Warehouse',
        notes: row.notes || undefined,
        status: 'available',
        tracking: 'serialized',
        item_type: 'physical_item',
      });
    }
    setImporting(false);
    setDone(true);
    queryClient.invalidateQueries({ queryKey: ['assets'] });
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <Check className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Import Complete</h3>
          <p className="text-sm text-muted-foreground mt-1">All rows have been added to inventory.</p>
        </div>
        <Button onClick={onClose}>Done</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">CSV Bulk Import</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Import multiple assets at once from a CSV file.</p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-2" /> Choose CSV File
        </Button>
        <Button variant="ghost" size="sm" onClick={() => {
          const blob = new Blob([TEMPLATE], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'port24_import_template.csv'; a.click();
        }}>
          Download Template
        </Button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
      </div>

      <div>
        <Label>Or Paste CSV <span className="text-xs text-muted-foreground font-normal">(first row = headers)</span></Label>
        <Textarea value={csvText} onChange={e => { setCsvText(e.target.value); setPreview(parseCSV(e.target.value).slice(0, 5)); }}
          rows={6} className="font-mono text-xs" placeholder={TEMPLATE} />
      </div>

      {preview.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Preview (first {preview.length} rows)</p>
          <div className="border rounded-lg overflow-hidden text-xs">
            <div className="grid grid-cols-4 bg-muted/50 px-3 py-2 font-semibold text-muted-foreground gap-2">
              <span>Name</span><span>Category</span><span>Asset #</span><span>Rate</span>
            </div>
            {preview.map((row, i) => (
              <div key={i} className="grid grid-cols-4 px-3 py-2 border-t gap-2 truncate">
                <span className="truncate font-medium">{row.name}</span>
                <span className="truncate text-muted-foreground">{row.category || '—'}</span>
                <span className="truncate text-muted-foreground font-mono">{row.asset_number || '—'}</span>
                <span className="text-muted-foreground">{row.daily_rate ? `$${row.daily_rate}` : '—'}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{parseCSV(csvText).length} rows total</p>
        </div>
      )}

      {preview.length > 0 && (
        <Button className="w-full" onClick={handleImport} disabled={importing}>
          {importing ? 'Importing…' : `Import ${parseCSV(csvText).length} Assets`}
        </Button>
      )}
    </div>
  );
}

// ─── Step: Review ─────────────────────────────────────────────────────────────
function StepReview({ form, allAssets }) {
  const typeLabel = ITEM_TYPES.find(t => t.value === form.item_type)?.label || form.item_type;
  const linkedAssets = allAssets.filter(a => (form.linked_asset_ids || []).includes(a.id));
  const kitContents = (form.kit_contents || []).map(e => {
    const a = allAssets.find(x => x.id === e.asset_id);
    return a ? { ...a, _serial: e.serial } : null;
  }).filter(Boolean);

  const Row = ({ label, val }) => {
    if (!val && val !== 0) return null;
    return (
      <div className="flex justify-between items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className="text-xs font-medium text-right break-words max-w-[65%]">{String(val)}</span>
      </div>
    );
  };

  const Section = ({ title, children }) => (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</p>
      {children}
    </div>
  );

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold">Review & Create</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Double-check everything before saving.</p>
      </div>

      <Section title="Identity">
        <Row label="Type" val={typeLabel} />
        <Row label="Name" val={form.name} />
        <Row label="Category" val={form.category} />
        {form.item_type !== 'consumable' && <Row label="Condition" val={form.condition} />}
      </Section>

      {['physical_item', 'bulk'].includes(form.item_type) && (
        <Section title="Tracking">
          <Row label="Internal Asset #" val={form.asset_number} />
          <Row label="Mfr. Serial #" val={form.mfr_serial} />
          <Row label="Barcode / QR" val={form.barcode} />
          {form.item_type === 'physical_item' && form.tracking_mode === 'auto' && (
            <Row label="Auto-generate" val={`${form.auto_prefix}${form.auto_start} × ${form.auto_quantity}`} />
          )}
          {form.item_type === 'bulk' && <Row label="Quantity" val={form.quantity} />}
        </Section>
      )}

      {form.item_type === 'consumable' && (
        <Section title="Stock">
          <Row label="Quantity on Hand" val={form.quantity} />
          <Row label="Reorder Level" val={form.reorder_level} />
          <Row label="Unit of Measure" val={form.unit_of_measure} />
          <Row label="Cost Per Unit" val={form.cost_per_unit ? `$${form.cost_per_unit}` : null} />
        </Section>
      )}

      {['physical_item', 'bulk', 'cloud_kit', 'physical_kit'].includes(form.item_type) && (
        <Section title="Pricing">
          <Row label="Daily Rate" val={form.daily_rate ? `$${form.daily_rate}` : null} />
          <Row label="Replacement Value" val={form.replacement_value ? `$${form.replacement_value}` : null} />
          {form.item_type === 'cloud_kit' && <Row label="Pricing" val={form.auto_price ? 'Auto from contents' : 'Manual'} />}
        </Section>
      )}

      <Section title="Location">
        <Row label="Storage" val={form.location} />
        <Row label="Ownership" val={form.ownership_type === 'partner_stored' ? `Partner: ${form.partner_owner_name}` : 'Owned by Us'} />
      </Section>

      {form.item_type === 'physical_kit' && (
        <Section title="Kit">
          <Row label="Kit Code / QR" val={form.barcode || '(auto-generated)'} />
          <Row label="Sealed" val={form.is_sealed ? 'Yes' : 'No'} />
          <Row label="Contents" val={`${kitContents.length} items`} />
        </Section>
      )}

      {form.item_type === 'cloud_kit' && linkedAssets.length > 0 && (
        <Section title="Cloud Kit Contents">
          {linkedAssets.map(a => (
            <Row key={a.id} label={a.name} val={a.daily_rate ? `$${a.daily_rate}/day` : '—'} />
          ))}
        </Section>
      )}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function AddEquipmentWizard({ open, onOpenChange, initialType }) {
  const [mode, setMode] = useState('quick'); // 'quick' | 'advanced' | 'csv'
  const [typeSelected, setTypeSelected] = useState(!!initialType);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(makeEmptyForm(initialType || 'physical_item'));
  const [errors, setErrors] = useState({});
  const [savedItem, setSavedItem] = useState(null);
  const [labelPrinterOpen, setLabelPrinterOpen] = useState(false);
  const queryClient = useQueryClient();

  const steps = STEP_DEFS[form.item_type] || STEP_DEFS.physical_item;
  // Quick mode hides advanced step for physical items
  const visibleSteps = mode === 'quick'
    ? steps.filter(s => s.id !== 'advanced')
    : steps;

  const { data: codeSettings = [] } = useCodeSettings();

  const { data: customFields = [] } = useQuery({
    queryKey: ['customFields'],
    queryFn: () => db.entities.CustomField.filter({ applies_to: 'asset' }),
  });
  const { data: allAssets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => db.entities.Asset.list('-created_date', 3000),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => db.entities.Category.list(),
  });
  const { data: partners = [] } = useQuery({
    queryKey: ['roundtablePartners'],
    queryFn: () => db.entities.RoundtablePartner.filter({ is_active: true }),
  });

  const prevOpen = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpen.current;
    prevOpen.current = open;
    if (justOpened) {
      const t = initialType || 'physical_item';
      setForm(makeEmptyForm(t));
      setTypeSelected(!!initialType);
      setStep(0);
      setErrors({});
      setSavedItem(null);
      setMode('quick');
    }
  }, [open, initialType]);

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { item_type } = form;

      if (item_type === 'cloud_kit') {
        const linked = form.linked_asset_ids || [];
        const linkedAssets = allAssets.filter(a => linked.includes(a.id));
        const autoPrice = form.auto_price ? linkedAssets.reduce((s, a) => s + (a.daily_rate || 0), 0) : null;
        const kit = await db.entities.Kit.create({
          name: form.name, kit_type: 'cloud', category: form.category || undefined,
          location: form.location || undefined, auto_price: form.auto_price,
          daily_rate: form.auto_price ? autoPrice : (form.daily_rate ? Number(form.daily_rate) : undefined),
          status: 'available', description: form.notes || undefined,
        });
        if (linked.length > 0) await Promise.all(linked.map(id => db.entities.Asset.update(id, { kit_id: kit.id })));
        return kit;
      }

      if (item_type === 'physical_kit') {
        let kitBarcode = form.barcode?.trim();
        if (!kitBarcode) {
          kitBarcode = (await generateNextCode('physical_kit')) || `KIT-${Date.now().toString(36).toUpperCase().slice(-6)}`;
        }
        const kit = await db.entities.Kit.create({
          name: form.name, kit_type: 'serialized', barcode: kitBarcode,
          category: form.category || undefined, location: form.location || undefined,
          daily_rate: form.daily_rate ? Number(form.daily_rate) : undefined,
          is_sealed: form.is_sealed, require_complete_checkin: form.require_complete_checkin !== false,
          status: 'available',
        });
        const contents = form.kit_contents || [];
        if (contents.length > 0) {
          const ids = [...new Set(contents.map(e => e.asset_id))];
          await Promise.all(ids.map(id => db.entities.Asset.update(id, { kit_id: kit.id })));
        }
        return kit;
      }

      // Build serial numbers from tracking mode
      let serialNumbers = '';
      if (form.tracking_mode === 'auto') {
        const prefix = form.auto_prefix || '';
        const start = parseInt(form.auto_start || '1', 10);
        const qty = parseInt(form.auto_quantity || '1', 10);
        const padLen = String(form.auto_start || '1').length;
        serialNumbers = Array.from({ length: qty }, (_, i) =>
          `${prefix}${String(start + i).padStart(Math.max(padLen, 1), '0')}`
        ).join(',');
      } else if (form.tracking_mode === 'manual' || form.tracking_mode === 'scan') {
        serialNumbers = form.serial_numbers || '';
      }

      // Auto-generate asset_number from admin code settings if blank
      let assetNumber = form.asset_number?.trim() || null;
      if (!assetNumber) {
        const codeType = item_type === 'consumable' ? 'consumable' : item_type === 'bulk' ? 'bulk' : 'physical_item';
        assetNumber = await generateNextCode(codeType);
      }
      let barcode = form.barcode?.trim() || assetNumber || undefined;

      const payload = {
        name: form.name, item_type, category: form.category || undefined,
        location: form.location || undefined, notes: form.notes || undefined,
        barcode, asset_number: assetNumber || undefined,
        serial_number: form.mfr_serial || undefined,
        status: form.status || 'available',
        ownership_type: form.ownership_type || 'owned',
        partner_owner_id: form.partner_owner_id || undefined,
        partner_owner_name: form.partner_owner_name || undefined,
        partner_use_allowed: form.partner_use_allowed !== false,
        partner_approval_required: !!form.partner_approval_required,
        partner_agreement_notes: form.partner_agreement_notes || undefined,
        daily_rate: form.daily_rate ? Number(form.daily_rate) : undefined,
        replacement_value: form.replacement_value ? Number(form.replacement_value) : undefined,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
        purchase_date: form.purchase_date || undefined,
        subrent_cost: form.subrent_cost ? Number(form.subrent_cost) : undefined,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
        country_of_origin: form.country_of_origin || undefined,
        vendor: form.vendor || undefined,
        warranty_expiry: form.warranty_expiry || undefined,
        custom_fields: form.custom_fields,
        image_url: form.image_url || undefined,
        manufacturer: form.manufacturer || undefined,
        model: form.model || undefined,
        description: form.description || undefined,
      };

      if (item_type === 'consumable') {
        payload.tracking = 'consumable';
        payload.quantity = Number(form.quantity) || 1;
        payload.unit_of_measure = form.unit_of_measure || undefined;
        payload.reorder_level = form.reorder_level ? Number(form.reorder_level) : undefined;
        payload.cost_per_unit = form.cost_per_unit ? Number(form.cost_per_unit) : undefined;
      } else if (item_type === 'bulk') {
        payload.tracking = 'bulk';
        payload.quantity = Number(form.quantity) || 1;
        payload.condition = form.condition || 'good';
      } else {
        // physical_item
        payload.condition = form.condition || 'good';
        if (form.tracking_mode === 'none') {
          payload.tracking = 'bulk';
          payload.quantity = Number(form.quantity) || 1;
        } else {
          payload.tracking = 'serialized';
          payload.serial_numbers = serialNumbers || undefined;
        }
      }

      Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
      return await db.entities.Asset.create(payload);
    },
    onSuccess: (created) => {
      setSavedItem(created);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['kits'] });
    },
    onError: (err) => toast.error(`Save failed: ${err.message}`),
  });

  const validate = () => {
    const e = {};
    if (!typeSelected && !form.item_type) e.item_type = 'Select a type';
    if (typeSelected) {
      const curStep = visibleSteps[step];
      if (curStep?.id === 'product' && !form.name.trim()) e.name = 'Name is required';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (!validate()) return;
    if (!typeSelected) { setTypeSelected(true); setStep(0); return; }
    if (step < visibleSteps.length - 1) setStep(s => s + 1);
    else saveMutation.mutate();
  };

  const back = () => {
    setErrors({});
    if (step > 0) { setStep(s => s - 1); return; }
    if (!initialType) { setTypeSelected(false); }
    else { onOpenChange(false); }
  };

  const isLastStep = typeSelected && step === visibleSteps.length - 1;
  const isDone = !!savedItem;
  const typeLabel = ITEM_TYPES.find(t => t.value === form.item_type)?.label || '';

  const renderStep = () => {
    if (!typeSelected) return <StepChooseType form={form} set={set} />;
    const curStep = visibleSteps[step];
    const props = { form, set, categories, customFields, allAssets, partners, mode, codeSettings };
    if (curStep.id === 'product') return <StepProductDetails {...props} />;
    if (curStep.id === 'tracking') return <StepTracking {...props} />;
    if (curStep.id === 'quantity') return <StepQuantity {...props} />;
    if (curStep.id === 'stock') return <StepStock {...props} />;
    if (curStep.id === 'cost') return <StepCost {...props} />;
    if (curStep.id === 'pricing') return <StepPricing {...props} />;
    if (curStep.id === 'location') return <StepLocation {...props} />;
    if (curStep.id === 'advanced') return <StepAdvanced {...props} />;
    if (curStep.id === 'kit_code') return <StepKitCode {...props} />;
    if (curStep.id === 'seal') return <StepSeal {...props} />;
    if (curStep.id === 'contents') {
      return form.item_type === 'physical_kit'
        ? <StepKitContents {...props} />
        : <StepCloudContents {...props} />;
    }
    if (curStep.id === 'review') return <StepReview form={form} allAssets={allAssets} />;
    return null;
  };

  if (mode === 'csv') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b bg-muted/20 flex items-center justify-between">
            <h1 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Bulk CSV Import</h1>
            <Button variant="ghost" size="sm" onClick={() => setMode('quick')}>← Back to Wizard</Button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <StepCSVImport onClose={() => onOpenChange(false)} queryClient={queryClient} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-4 pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                {isDone ? `${typeLabel} Saved` : 'Add New Item'}
              </h1>
              {!isDone && (
                <div className="flex items-center gap-2">
                  {!typeSelected && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMode('csv')}>
                      <Upload className="w-3 h-3 mr-1" /> CSV Import
                    </Button>
                  )}
                  {typeSelected && (
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      {[{ val: 'quick', label: 'Quick' }, { val: 'advanced', label: 'Advanced' }].map(m => (
                        <button key={m.val} type="button" onClick={() => setMode(m.val)}
                          className={cn("px-3 py-1 text-xs font-medium transition-colors",
                            mode === m.val ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {typeSelected && !isDone && (
              <StepIndicator steps={visibleSteps} current={step} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {isDone ? (
              <div className="flex flex-col items-center justify-center gap-5 py-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Check className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{savedItem.name} saved!</h2>
                  <p className="text-sm text-muted-foreground mt-1">Successfully added to inventory.</p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  {['physical_item', 'physical_kit'].includes(form.item_type) && (
                    <Button onClick={() => setLabelPrinterOpen(true)} className="w-full">
                      <Printer className="w-4 h-4 mr-2" /> Print QR Label
                    </Button>
                  )}
                  <Button variant="outline" className="w-full" onClick={() => {
                    const t = initialType || 'physical_item';
                    setForm(makeEmptyForm(t));
                    setTypeSelected(!!initialType);
                    setStep(0); setSavedItem(null); setErrors({});
                  }}>
                    <Plus className="w-4 h-4 mr-2" /> Add Another
                  </Button>
                  <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => onOpenChange(false)}>
                    Done
                  </Button>
                </div>
              </div>
            ) : renderStep()}
          </div>

          {/* Footer */}
          {!isDone && (
            <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground">Cancel</Button>
              <div className="flex gap-2">
                {(typeSelected || !!initialType) && (
                  <Button variant="outline" onClick={back}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                )}
                {!isLastStep ? (
                  <Button onClick={next}>
                    {!typeSelected ? 'Continue' : 'Next'} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'Saving…' : `Create ${typeLabel}`}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {savedItem && ['physical_item', 'physical_kit'].includes(form.item_type) && (
        <QRLabelPrinter open={labelPrinterOpen} onOpenChange={setLabelPrinterOpen}
          assets={form.item_type === 'physical_kit'
            ? [{ ...savedItem, serial_numbers: savedItem.barcode }]
            : [savedItem]} />
      )}
    </>
  );
}