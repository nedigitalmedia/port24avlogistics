import React, { useRef, useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, QrCode, Tag, MapPin, LayoutGrid } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSerialNumbersArray } from '@/lib/serialNumbers';

/**
 * Quick-view barcode modal for a single asset.
 * The QR always encodes the selected asset's serial number (primary source of truth).
 * Falls back to asset.id if no serial exists.
 */
export default function AssetBarcodeModal({ open, onOpenChange, asset, onPrintLabel }) {
  const canvasRef = useRef(null);
  const [selectedSerial, setSelectedSerial] = useState(null);

  // Parse all serial numbers from asset
  const serials = React.useMemo(() => getSerialNumbersArray(asset), [asset]);

  // The canonical scan value: selected serial → first serial → asset id
  const scanValue = selectedSerial || serials[0] || asset?.id || '';

  // Reset selection when asset changes
  useEffect(() => {
    setSelectedSerial(null);
  }, [asset?.id]);

  // Render QR whenever value or modal opens
  useEffect(() => {
    if (!open || !canvasRef.current || !scanValue) return;
    QRCode.toCanvas(canvasRef.current, scanValue, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }, [open, scanValue]);

  if (!asset) return null;

  const handlePrint = () => {
    onOpenChange(false);
    onPrintLabel?.(asset, selectedSerial || serials[0] || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-primary" />
            Asset Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {/* Asset info */}
          <div className="w-full space-y-1.5">
            <p className="font-semibold text-lg leading-tight">{asset.name}</p>
            <div className="flex flex-wrap gap-2">
              {asset.category && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <LayoutGrid className="w-3 h-3" /> {asset.category}
                </Badge>
              )}
              {asset.location && (
                <Badge variant="outline" className="text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {asset.location}
                </Badge>
              )}
              {asset.item_type && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {asset.item_type.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
          </div>

          {/* Serial selector (if multiple) */}
          {serials.length > 1 && (
            <div className="w-full">
              <p className="text-xs text-muted-foreground mb-1.5 font-medium">Select Serial Number</p>
              <Select value={selectedSerial || serials[0]} onValueChange={setSelectedSerial}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {serials.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* QR Code */}
          <div className="p-3 bg-white rounded-lg border shadow-sm">
            <canvas ref={canvasRef} className="block" />
          </div>

          {/* Scan value label */}
          <div className="w-full text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Tag className="w-3 h-3" /> Scan Value (Asset Number)
            </p>
            <p className="font-mono font-bold text-sm bg-muted px-3 py-1.5 rounded inline-block">
              {scanValue}
            </p>
            {asset.barcode && asset.barcode !== scanValue && (
              <p className="text-xs text-muted-foreground mt-1">
                Barcode alias: <span className="font-mono">{asset.barcode}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print Label
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}