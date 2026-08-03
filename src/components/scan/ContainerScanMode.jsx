import React, { useState, useRef } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Camera, Package, CheckCircle2, XCircle, Boxes, Lock, Unlock, Trash2, ScanLine } from 'lucide-react';
import CameraScanner from '@/components/crew/CameraScanner';
import { cn } from '@/lib/utils';
import { getSerialNumbersArray } from '@/lib/serialNumbers';

export default function ContainerScanMode({ selectedShow, user, assets, fulfillments, requirements, onItemPicked }) {
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [openContainer, setOpenContainer] = useState(null); // the Container record
  const [scannedItems, setScannedItems] = useState([]); // items scanned into this container session
  const [lastResult, setLastResult] = useState(null);
  const [phase, setPhase] = useState('scan_container'); // 'scan_container' | 'filling' | 'closed'

  const { data: containers = [] } = useQuery({
    queryKey: ['containers'],
    queryFn: () => db.entities.Container.list(),
  });

  // Find container by asset_number or barcode
  const findContainer = (code) => {
    const t = code.trim().toLowerCase();
    return (
      containers.find(c => c.asset_number && c.asset_number.toLowerCase() === t) ||
      containers.find(c => c.barcode && c.barcode.toLowerCase() === t) ||
      containers.find(c => c.id === code.trim()) ||
      null
    );
  };

  // Find asset by code (mirrors Scan page logic)
  const findAsset = (code) => {
    if (!code || !assets.length) return null;
    const t = code.trim().toLowerCase();
    return (
      assets.find(a => a.id === code.trim()) ||
      assets.find(a => getSerialNumbersArray(a).some(s => s.toLowerCase() === t)) ||
      assets.find(a => a.serial_number && a.serial_number.toLowerCase() === t) ||
      assets.find(a => a.barcode && a.barcode.toLowerCase() === t) ||
      null
    );
  };

  const findMatchingRequirement = (asset) => {
    if (!requirements?.length) return null;
    const matches = requirements.filter(r =>
      r.asset_id === asset.id ||
      r.product_name.toLowerCase() === asset.name.toLowerCase()
    );
    for (const req of matches) {
      const filled = fulfillments.filter(f => f.requirement_id === req.id && f.movement_state !== 'returned').length;
      const alreadyInSession = scannedItems.filter(i => i.requirement_id === req.id).length;
      if ((filled + alreadyInSession) < (req.quantity_needed || 1)) return req;
    }
    return null;
  };

  const pickItemMutation = useMutation({
    mutationFn: async ({ asset, requirement }) => {
      const now = new Date().toISOString();
      await db.entities.ShowFulfillment.create({
        show_id: selectedShow.id,
        show_name: selectedShow.name,
        requirement_id: requirement?.id || null,
        asset_id: asset.id,
        asset_name: asset.name,
        asset_barcode: asset.barcode,
        asset_serial: asset.serial_number || getSerialNumbersArray(asset)[0] || '',
        room_id: requirement?.room_id || null,
        room_name: requirement?.room_name || null,
        movement_state: 'picked',
        scanned_by: user?.email || '',
        scanned_at: now,
      });
      await db.entities.Asset.update(asset.id, {
        status: 'checked_out',
        locked_to_show_id: selectedShow.id,
        locked_to_show_name: selectedShow.name,
        locked_at: now,
        current_show_id: selectedShow.id,
        current_container_id: openContainer?.id || null,
        current_container_name: openContainer?.name || null,
        current_sub_location_id: requirement?.room_id || null,
        current_sub_location_name: requirement?.room_name || null,
      });
      await db.entities.AssetMovement.create({
        asset_id: asset.id,
        asset_name: asset.name,
        asset_barcode: asset.barcode || asset.id,
        action: 'check_out',
        show_id: selectedShow.id,
        show_name: selectedShow.name,
        from_location: asset.location || 'Warehouse',
        to_location: openContainer ? `${openContainer.name} (Container)` : selectedShow.name,
        notes: `Packed into container: ${openContainer?.name || 'unknown'}`,
        scanned_by: user?.email || 'unknown',
        scanned_by_user_id: user?.id,
      });
    },
    onSuccess: (_, { asset, requirement }) => {
      queryClient.invalidateQueries({ queryKey: ['show_fulfillments', selectedShow.id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      onItemPicked?.();
      setScannedItems(prev => [...prev, { asset, requirement, requirement_id: requirement?.id }]);
    },
  });

  const closeContainerMutation = useMutation({
    mutationFn: async () => {
      // Update container status to packed and link to show
      await db.entities.Container.update(openContainer.id, {
        status: 'packed',
        current_show_id: selectedShow.id,
        current_show_name: selectedShow.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] });
      toast.success(`Container "${openContainer.name}" closed with ${scannedItems.length} items`);
      setPhase('closed');
    },
  });

  const handleScan = async (code) => {
    const c = (code || barcode).trim();
    if (!c) return;

    if (phase === 'scan_container') {
      // Looking for a container QR
      const container = findContainer(c);
      if (container) {
        setOpenContainer(container);
        setScannedItems([]);
        setPhase('filling');
        setLastResult({ success: true, message: `Container opened: ${container.name}`, type: 'container' });
        toast.success(`Opened container: ${container.name}`);
      } else {
        setLastResult({ success: false, message: `No container found for code: "${c}"` });
        toast.error('Container not found — scan a container QR code');
      }
    } else if (phase === 'filling') {
      // Scanning items into the open container
      const asset = findAsset(c);
      if (!asset) {
        setLastResult({ success: false, message: `No asset found: "${c}"` });
        toast.error('Asset not found');
        setBarcode(''); inputRef.current?.focus();
        return;
      }

      // Check not already picked
      const alreadyPicked = fulfillments.find(f => f.asset_id === asset.id && f.movement_state !== 'returned');
      const alreadyInSession = scannedItems.find(i => i.asset.id === asset.id);
      if (alreadyPicked || alreadyInSession) {
        setLastResult({ success: false, message: `${asset.name} already picked` });
        toast.error('Already picked');
        setBarcode(''); inputRef.current?.focus();
        return;
      }

      // Check not locked to another show
      if (asset.locked_to_show_id && asset.locked_to_show_id !== selectedShow.id) {
        setLastResult({ success: false, message: `${asset.name} locked to "${asset.locked_to_show_name}"` });
        toast.error('Asset locked to another project');
        setBarcode(''); inputRef.current?.focus();
        return;
      }

      const requirement = findMatchingRequirement(asset);
      pickItemMutation.mutate({ asset, requirement }, {
        onSuccess: () => {
          setLastResult({ success: true, message: `✓ ${asset.name} → ${openContainer.name}`, type: 'pick' });
          toast.success(`${asset.name} added to container`);
        },
        onError: (err) => {
          setLastResult({ success: false, message: err.message || 'Failed' });
          toast.error(err.message || 'Failed to pick item');
        },
      });
    }

    setBarcode('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCameraScan = (code) => { setCameraOpen(false); handleScan(code); };

  const resetSession = () => {
    setOpenContainer(null);
    setScannedItems([]);
    setLastResult(null);
    setPhase('scan_container');
    setBarcode('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="space-y-4">
      {/* Phase indicator */}
      <div className="flex items-center gap-2">
        {['scan_container', 'filling', 'closed'].map((p, i) => (
          <React.Fragment key={p}>
            <div className={cn(
              'px-3 py-1 rounded-full text-xs font-medium',
              phase === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            )}>
              {p === 'scan_container' ? '1. Scan Container' : p === 'filling' ? '2. Fill Container' : '3. Closed'}
            </div>
            {i < 2 && <span className="text-muted-foreground text-xs">→</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Container info banner */}
      {openContainer && phase !== 'closed' && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <Boxes className="w-5 h-5 text-blue-400 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-blue-400">{openContainer.name}</p>
            <p className="text-xs text-muted-foreground">
              {openContainer.container_type?.replace(/_/g, ' ')}
              {openContainer.inside_length_in && ` · ${openContainer.inside_length_in}"L × ${openContainer.inside_width_in}"W × ${openContainer.inside_height_in}"H`}
              {openContainer.max_weight_lbs && ` · Max ${openContainer.max_weight_lbs} lbs`}
            </p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs">
            {scannedItems.length} items
          </Badge>
        </div>
      )}

      {/* Scanner input */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-primary" />
            {phase === 'scan_container' ? 'Scan Container QR' : phase === 'filling' ? `Fill: ${openContainer?.name}` : 'Container Closed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {phase !== 'closed' && (
            <>
              <form onSubmit={e => { e.preventDefault(); handleScan(); }} className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder={phase === 'scan_container' ? 'Scan container QR code...' : 'Scan items to add...'}
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  className="font-mono text-base h-11 border-primary/30 focus:border-primary"
                  autoComplete="off"
                  autoFocus
                />
                <Button type="button" variant="outline" size="icon" className="h-11 w-11" onClick={() => setCameraOpen(true)}>
                  <Camera className="w-4 h-4" />
                </Button>
                <Button type="submit" className="h-11 px-5" disabled={pickItemMutation.isPending || !barcode.trim()}>
                  {pickItemMutation.isPending ? '...' : 'Scan'}
                </Button>
              </form>

              {lastResult && (
                <div className={cn('flex items-start gap-2 p-3 rounded-lg text-sm border',
                  lastResult.type === 'container' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                  lastResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                )}>
                  {lastResult.type === 'container' ? <Boxes className="w-4 h-4 shrink-0 mt-0.5" /> :
                   lastResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> :
                   <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span className="font-medium">{lastResult.message}</span>
                </div>
              )}

              {phase === 'filling' && (
                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => closeContainerMutation.mutate()}
                    disabled={scannedItems.length === 0 || closeContainerMutation.isPending}
                  >
                    <Lock className="w-4 h-4 mr-2" /> Close Container ({scannedItems.length} items)
                  </Button>
                  <Button variant="outline" onClick={resetSession}>
                    <Unlock className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              )}
            </>
          )}

          {phase === 'closed' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold">Container Closed</p>
                  <p className="text-xs text-muted-foreground">{scannedItems.length} items packed into {openContainer?.name} — all auto-picked to {selectedShow?.name}</p>
                </div>
              </div>
              <Button className="w-full" onClick={resetSession}>
                <Boxes className="w-4 h-4 mr-2" /> Pack Another Container
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Items scanned into this container */}
      {scannedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              Contents — {openContainer?.name}
              <Badge variant="secondary" className="ml-auto">{scannedItems.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {scannedItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded bg-secondary/30 text-xs border border-border/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="flex-1 font-medium">{item.asset.name}</span>
                  {item.requirement?.room_name && (
                    <span className="text-muted-foreground">{item.requirement.room_name}</span>
                  )}
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-xs">Picked</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {cameraOpen && <CameraScanner onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />}
    </div>
  );
}