import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { db } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Printer, QrCode, AlertCircle, ExternalLink } from 'lucide-react';
import { LABEL_SIZES, printWithTemplate } from '@/lib/printQRLabel';
import { useNavigate } from 'react-router-dom';

const MM_TO_PX = 3.7795;

/**
 * Resolve the display value for a field element.
 * Priority:
 *   1. barcode element  → asset.barcode (kit scan code) or asset.serial_numbers (first serial)
 *   2. serial element   → asset.serial_numbers (may be a pre-resolved single serial)
 *   3. any other field  → asset[field]
 */
function resolveFieldValue(el, asset) {
  if (!el.field) return el.value || '';
  // 'barcode' field: show kit scan code if present, else fall back to serial
  if (el.field === 'barcode') {
    return asset?.barcode || asset?.serial_numbers || asset?.serial_number || '';
  }
  return asset?.[el.field] || '';
}

/** Live canvas preview of a single label using our template's block_config.
 *  Receives `brand` so the logo element can resolve brand?.logo_url as fallback.
 */
function TemplatePreview({ asset, template, size, brand }) {
  const cfg = Array.isArray(template?.block_config) ? template.block_config[0] : template?.block_config;
  const elements = cfg?.elements || [];
  const wPx = Math.round(size.w * MM_TO_PX);
  const hPx = Math.round(size.h * MM_TO_PX);

  // Scale to fit preview area (max 320px wide)
  const maxW = 320;
  const scale = Math.min(maxW / wPx, 2);
  const dispW = Math.round(wPx * scale);
  const dispH = Math.round(hPx * scale);

  // Build QR value — same logic as buildPrintHTML
  const qrValue = asset?.serial_numbers || asset?.serial_number || asset?.barcode || asset?.id || 'SAMPLE';

  return (
    <div
      className="relative bg-white border border-gray-300 shadow overflow-hidden shrink-0"
      style={{ width: dispW, height: dispH }}
    >
      {elements.map(el => {
        const x = Math.round(el.x * MM_TO_PX * scale);
        const y = Math.round(el.y * MM_TO_PX * scale);
        const w = Math.round(el.w * MM_TO_PX * scale);
        const h = Math.round(el.h * MM_TO_PX * scale);

        if (el.type === 'qr') {
          return <QrCanvas key={el.id} value={qrValue} x={x} y={y} w={w} h={h} />;
        }

        if (el.type === 'logo') {
          // FIXED: fall back to brand logo_url when element doesn't have its own logoUrl
          const url = el.logoUrl || brand?.logo_url || '';
          if (!url) return (
            <div key={el.id} style={{ position: 'absolute', left: x, top: y, width: w, height: h,
              border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, color: '#aaa', background: '#fafafa' }}>
              Logo
            </div>
          );
          return (
            <img
              key={el.id}
              src={url}
              alt=""
              style={{
                position: 'absolute', left: x, top: y, width: w, height: h,
                objectFit: 'contain', objectPosition: 'center',
                background: '#fff',
              }}
            />
          );
        }

        const value = resolveFieldValue(el, asset);
        if (!value) return null;

        const fs = Math.round((el.fontSize || 8) * MM_TO_PX * scale * 0.35);
        return (
          <div key={el.id} style={{
            position: 'absolute', left: x, top: y, width: w, height: h,
            fontSize: fs, fontWeight: el.fontWeight || 'normal',
            fontFamily: el.mono ? 'monospace' : 'sans-serif',
            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            color: '#000', display: 'flex', alignItems: 'center',
          }}>
            {value}
          </div>
        );
      })}

      {elements.length === 0 && (
        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-2 text-center">
          No template layout<br />configure in QR Label Builder
        </div>
      )}
    </div>
  );
}

function QrCanvas({ value, x, y, w, h }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const sz = Math.min(w, h);
    QRCode.toCanvas(ref.current, value, { width: sz, margin: 0, color: { dark: '#000', light: '#fff' } });
  }, [value, w, h]);
  return <canvas ref={ref} style={{ position: 'absolute', left: x, top: y, width: w, height: h }} />;
}

export default function QRLabelPrinter({ open, onOpenChange, assets = [] }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedSerialNumber, setSelectedSerialNumber] = useState(null);
  const navigate = useNavigate();

  // Fetch our saved QR label templates
  const { data: templates = [] } = useQuery({
    queryKey: ['printTemplates', 'qr_label'],
    queryFn: () => db.entities.PrintTemplate.filter({ template_type: 'qr_label' }),
    enabled: open,
  });

  const { data: brandList = [] } = useQuery({
    queryKey: ['brand'],
    queryFn: () => db.entities.BrandSettings.list(),
    staleTime: 10 * 60 * 1000,
    enabled: open,
  });
  const brand = brandList[0] || {};

  // On first load, select the default template or first available
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      const defaultTemplate = templates.find(t => t.is_default);
      setSelectedTemplateId(defaultTemplate?.id || templates[0]?.id);
    }
  }, [templates, selectedTemplateId]);

  // On open, auto-select single asset or require user selection
  useEffect(() => {
    if (open && assets.length === 1 && !selectedAssetId) {
      setSelectedAssetId(assets[0].id);
    } else if (!open) {
      setSelectedAssetId(null);
      setSelectedSerialNumber(null);
    }
  }, [open, assets, selectedAssetId]);

  // When asset selection changes, reset serial number
  useEffect(() => {
    setSelectedSerialNumber(null);
  }, [selectedAssetId]);

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || null;
  const selectedAsset = selectedAssetId ? assets.find(a => a.id === selectedAssetId) : null;
  
  // Parse serial numbers from selected asset
  const availableSerials = selectedAsset ? getSerialNumbersArray(selectedAsset) : [];
  const hasMultipleSerials = availableSerials.length > 1;

  // Create asset variant with only selected serial number for printing
  // The QR scan value is always serial → id, never the disconnected barcode field
  const printAssets = selectedAsset
    ? [
        {
          ...selectedAsset,
          serial_numbers: selectedSerialNumber || availableSerials[0] || selectedAsset.id,
          serial_number: selectedSerialNumber || availableSerials[0] || selectedAsset.serial_number || selectedAsset.id,
        }
      ]
    : (selectedAssetId ? [] : assets.map(a => ({
        ...a,
        serial_numbers: getSerialNumbersArray(a)[0] || a.id,
        serial_number: a.serial_number || getSerialNumbersArray(a)[0] || a.id,
      })));

  // Use template's size if available, otherwise fallback
  const getSize = () => {
    const t = selectedTemplate;
    if (t?.label_width_mm && t?.label_height_mm) {
      return { w: t.label_width_mm, h: t.label_height_mm };
    }
    if (t?.label_size_id) {
      return LABEL_SIZES.find(s => s.id === t.label_size_id) || LABEL_SIZES[1];
    }
    return LABEL_SIZES[1];
  };
  const size = getSize();

  const handlePrint = () => {
    if (selectedTemplate && printAssets.length > 0) {
      printAssets.forEach(asset => printWithTemplate(asset, selectedTemplate, undefined, brand));
    }
  };

  const cfg = Array.isArray(selectedTemplate?.block_config) ? selectedTemplate.block_config[0] : selectedTemplate?.block_config;
  const hasTemplate = !!cfg?.elements?.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Print QR Labels
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 flex-wrap gap-3">
          <span className="text-xs text-muted-foreground">
            {assets.length} asset{assets.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Asset selector (for multi-asset) */}
        {assets.length > 1 && (
          <div className="flex-1 min-w-60">
            <Label className="text-sm mb-2 block">Select Asset to Print</Label>
            <Select value={selectedAssetId || ''} onValueChange={setSelectedAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose asset…" />
              </SelectTrigger>
              <SelectContent>
                {assets.map(a => {
                  const serial = getSerialNumbersArray(a)[0] || a.serial_number || a.id;
                  return (
                    <SelectItem key={a.id} value={a.id}>
                      {serial} — {a.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Serial number selector (for assets with multiple serials) */}
        {hasMultipleSerials && (
          <div className="flex-1 min-w-60">
            <Label className="text-sm mb-2 block">Select Serial Number</Label>
            <Select value={selectedSerialNumber || ''} onValueChange={setSelectedSerialNumber}>
              <SelectTrigger>
                <SelectValue placeholder="Choose serial number…" />
              </SelectTrigger>
              <SelectContent>
                {availableSerials.map(sn => (
                  <SelectItem key={sn} value={sn}>
                    {sn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Template selector */}
        <div className="flex items-end gap-3 flex-wrap">
          {templates.length > 0 ? (
            <>
              <div className="flex-1 min-w-60">
                <Label className="text-sm mb-2 block">QR Label Template</Label>
                <Select value={selectedTemplateId || ''} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_default ? '(default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedTemplate && (
                <button
                  className="text-xs underline text-primary hover:text-primary/80"
                  onClick={() => { onOpenChange(false); navigate(`/qr-label-builder?id=${selectedTemplate.id}`); }}
                >
                  Edit
                </button>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">No QR label templates</p>
                <p className="text-xs mt-0.5">Create one in Print Templates to customize label design.</p>
                <button className="text-xs underline mt-1 flex items-center gap-1" onClick={() => { onOpenChange(false); navigate('/qr-label-builder'); }}>
                  Create template <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview — selected asset(s) */}
        <div className="flex-1 overflow-auto border rounded-lg bg-muted/30 p-4">
          {printAssets.length > 0 ? (
            <div className="flex flex-wrap gap-4 justify-start">
              {printAssets.map((asset, idx) => {
                // Caption below the preview: show the real primary identifier
                const primaryId = asset.serial_numbers || asset.serial_number || asset.barcode || asset.id;
                return (
                  <div key={`${asset.id}-${idx}`} className="flex flex-col items-center gap-1">
                    <TemplatePreview asset={asset} template={selectedTemplate} size={size} brand={brand} />
                    <div className="text-center">
                      <p className="text-xs font-mono font-semibold text-foreground">{primaryId}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">{asset.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-12">
              {assets.length === 0 ? 'No assets selected' : 'Select an asset to print'}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePrint} disabled={printAssets.length === 0}>
            <Printer className="w-4 h-4 mr-2" /> Print / Save as PDF ({printAssets.length} label{printAssets.length !== 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}