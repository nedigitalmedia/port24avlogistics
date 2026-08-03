import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Archive, QrCode, Package, X, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { getSerialNumbersString } from '@/lib/serialNumbers';

/**
 * Pack Into Container workflow panel.
 * 1. Scan/select a container.
 * 2. Scan items into it.
 * 3. Bulk-update all items to reflect the container.
 * 4. Container status update propagates (on_truck → items on_truck, etc.)
 */
export default function PackIntoContainerPanel({ showId }) {
  const [containerSearch, setContainerSearch] = useState('');
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [itemSearch, setItemSearch] = useState('');
  const [packedItems, setPackedItems] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: containers = [] } = useQuery({
    queryKey: ['containers'],
    queryFn: () => db.entities.Container.list('-created_date', 2000),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => db.entities.Asset.filter({}, '-created_date', 5000),
  });

  const containerResults = containerSearch.length > 1
    ? containers.filter(c =>
        c.name?.toLowerCase().includes(containerSearch.toLowerCase()) ||
        c.asset_number?.toLowerCase().includes(containerSearch.toLowerCase()) ||
        c.barcode?.toLowerCase().includes(containerSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  const itemResults = itemSearch.length > 1 && selectedContainer
    ? assets.filter(a =>
        !packedItems.find(p => p.id === a.id) &&
        (a.name?.toLowerCase().includes(itemSearch.toLowerCase()) ||
         a.asset_number?.toLowerCase().includes(itemSearch.toLowerCase()) ||
         getSerialNumbersString(a).toLowerCase().includes(itemSearch.toLowerCase()) ||
         a.barcode?.toLowerCase().includes(itemSearch.toLowerCase()))
      ).slice(0, 8)
    : [];

  const addItem = (asset) => {
    setPackedItems(prev => [...prev, asset]);
    setItemSearch('');
    toast.success(`${asset.name} added to ${selectedContainer.name}`);
  };

  const removeItem = (id) => setPackedItems(prev => prev.filter(p => p.id !== id));

  const handleSave = async () => {
    if (!selectedContainer) return;
    setIsSaving(true);
    try {
      // Update each item's current container
      await Promise.all(packedItems.map(a =>
        db.entities.Asset.update(a.id, {
          current_container_id: selectedContainer.id,
          current_container_name: selectedContainer.name,
        })
      ));
      // Update container status to packed
      await db.entities.Container.update(selectedContainer.id, {
        status: 'packed',
        current_show_id: showId || undefined,
      });
      toast.success(`${packedItems.length} items packed into ${selectedContainer.name}`);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      setPackedItems([]);
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const markOnTruck = async () => {
    if (!selectedContainer) return;
    setIsSaving(true);
    try {
      await db.entities.Container.update(selectedContainer.id, { status: 'on_truck' });
      await Promise.all(packedItems.map(a =>
        db.entities.Asset.update(a.id, { status: 'checked_out' })
      ));
      toast.success(`${selectedContainer.name} marked On Truck — ${packedItems.length} items updated`);
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['containers'] });
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const STATUS_COLORS = {
    available: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    packed: 'bg-primary/10 text-primary border-primary/20',
    on_truck: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    on_show: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    assigned: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Archive className="w-5 h-5 text-primary" /> Pack Into Container
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5">Scan a container QR code, then scan items into it. Items update when the container moves.</p>
      </div>

      {/* Step 1: Select Container */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Step 1 — Scan or Select Container
        </p>

        {selectedContainer ? (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/30">
            <Archive className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">{selectedContainer.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className={cn("text-xs border", STATUS_COLORS[selectedContainer.status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20')}>
                  {selectedContainer.status?.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}
                </Badge>
                {selectedContainer.home_location && (
                  <span className="text-xs text-muted-foreground">{selectedContainer.home_location}</span>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => { setSelectedContainer(null); setPackedItems([]); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div>
            <Input
              placeholder="Scan container QR code or type name / asset #…"
              value={containerSearch}
              onChange={e => setContainerSearch(e.target.value)}
              autoFocus
              className="font-mono"
            />
            {containerResults.length > 0 && (
              <div className="border rounded-md mt-1 divide-y bg-background shadow-sm max-h-44 overflow-y-auto">
                {containerResults.map(c => (
                  <button key={c.id} type="button"
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 text-left text-sm"
                    onClick={() => { setSelectedContainer(c); setContainerSearch(''); }}>
                    <Archive className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="flex-1 font-medium truncate">{c.name}</span>
                    {c.asset_number && <span className="text-xs text-muted-foreground font-mono">{c.asset_number}</span>}
                    <Badge className={cn("text-xs border shrink-0", STATUS_COLORS[c.status] || '')}>
                      {c.status?.replace('_',' ')}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Step 2: Scan Items */}
      {selectedContainer && (
        <Card className="p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Step 2 — Scan Items Into {selectedContainer.name}
          </p>
          <Input
            placeholder="Scan item barcode, serial, or type name…"
            value={itemSearch}
            onChange={e => setItemSearch(e.target.value)}
            className="font-mono"
            autoFocus
          />
          {itemResults.length > 0 && (
            <div className="border rounded-md divide-y bg-background shadow-sm max-h-44 overflow-y-auto">
              {itemResults.map(a => (
                <button key={a.id} type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 text-left text-sm"
                  onClick={() => addItem(a)}>
                  <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 font-medium truncate">{a.name}</span>
                  {(getSerialNumbersString(a) || a.asset_number) && (
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{getSerialNumbersString(a) || a.asset_number}</span>
                  )}
                  <span className="text-xs text-primary shrink-0">+ Pack</span>
                </button>
              ))}
            </div>
          )}

          {/* Packed items list */}
          {packedItems.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{packedItems.length} item{packedItems.length !== 1 ? 's' : ''} packed</p>
              <div className="max-h-52 overflow-y-auto space-y-1">
                {packedItems.map(a => (
                  <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="flex-1 text-sm font-medium truncate">{a.name}</span>
                    {(getSerialNumbersString(a) || a.asset_number) && (
                      <span className="text-xs text-muted-foreground font-mono">{getSerialNumbersString(a) || a.asset_number}</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => removeItem(a.id)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Actions */}
      {selectedContainer && packedItems.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
            <Archive className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving…' : `Save Pack (${packedItems.length} items)`}
          </Button>
          <Button variant="outline" onClick={markOnTruck} disabled={isSaving}>
            <ArrowRight className="w-4 h-4 mr-2" /> Mark On Truck
          </Button>
        </div>
      )}
    </div>
  );
}