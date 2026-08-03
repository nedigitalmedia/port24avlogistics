import React, { useState, useRef, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { usePermissions } from '@/lib/usePermissions';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScanBarcode, CheckCircle2, AlertCircle, MapPin, Package,
  ArrowUpFromLine, ArrowDownToLine, Truck, HeartPulse,
  Download, X, ChevronDown, ChevronUp, AlertTriangle, Camera
} from 'lucide-react';
import { initOfflineStorage, saveScanOffline, getPendingScans, markScansSynced, cacheAssets, getCachedAssets, isOnline } from '@/lib/offlineStorage';
import OfflineIndicator from '@/components/crew/OfflineIndicator';
import CameraScanner from '@/components/crew/CameraScanner';
import AdditionalEquipmentDialog from '@/components/scan/AdditionalEquipmentDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getSerialNumbersArray } from '@/lib/serialNumbers';

// Scan action modes
const ACTIONS = [
  { value: 'check_out',   label: 'Scan Out',       icon: ArrowUpFromLine,  color: 'bg-primary text-primary-foreground' },
  { value: 'check_in',    label: 'Scan In',         icon: ArrowDownToLine,  color: 'bg-emerald-600 text-white' },
  { value: 'av_hospital', label: 'AV Hospital',     icon: HeartPulse,       color: 'bg-red-600 text-white' },
];

const BROKEN_REASONS = [
  { value: 'broken',            label: 'Broken' },
  { value: 'damaged',           label: 'Damaged' },
  { value: 'needs_inspection',  label: 'Needs Inspection' },
  { value: 'needs_repair',      label: 'Needs Repair' },
];

function exportCSV(items, label) {
  const rows = [['Barcode', 'Name', 'Category', 'Action', 'Time']];
  items.forEach(i => rows.push([i.barcode || '', i.name, i.category || '', i.action || label, new Date().toLocaleString()]));
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `scan-${Date.now()}.csv`; a.click();
}

export default function CrewMode() {
  const { role } = usePermissions();
  const navigate = useNavigate();
  const [selectedShowId, setSelectedShowId] = useState('');
  const [selectedSubLocId, setSelectedSubLocId] = useState('');
  const [scanAction, setScanAction] = useState('check_out');
  const [barcode, setBarcode] = useState('');
  const [lastScan, setLastScan] = useState(null);
  const [scannedItems, setScannedItems] = useState([]);
  const [brokenReason, setBrokenReason] = useState('broken');
  const [brokenNotes, setBrokenNotes] = useState('');
  const [showMissing, setShowMissing] = useState(true);
  const [showScanned, setShowScanned] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [pendingScans, setPendingScans] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [assetPendingRequest, setAssetPendingRequest] = useState(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: shows = [] } = useQuery({ queryKey: ['shows'], queryFn: () => db.entities.Show.list() });
  const { data: assets = [], isLoading: assetsLoading } = useQuery({ 
    queryKey: ['assets'], 
    queryFn: async () => {
      try {
        const data = await db.entities.Asset.list('-created_date', 5000);
        await cacheAssets(data);
        return data;
      } catch (e) {
        return await getCachedAssets();
      }
    }
  });

  // Subscribe to asset changes for live updates
  useEffect(() => {
    const unsubscribe = db.entities.Asset.subscribe((event) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    });
    return () => unsubscribe();
  }, [queryClient]);

  const activeShows = shows.filter(s => !['completed', 'returned'].includes(s.status));
  const selectedShow = shows.find(s => s.id === selectedShowId);
  const subLocations = selectedShow?.sub_locations || [];
  const showAssets = assets.filter(a => a.current_show_id === selectedShowId);
  const scannedIds = new Set(scannedItems.map(i => i.id));
  const missing = showAssets.filter(a => !scannedIds.has(a.id));
  const pct = showAssets.length ? Math.round((scannedItems.length / showAssets.length) * 100) : 0;

  useEffect(() => {
    inputRef.current?.focus();
    initOfflineStorage();
    
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);
    const loadPendingScans = async () => {
      const pending = await getPendingScans();
      setPendingScans(pending.length);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    loadPendingScans();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flashResult = (type, name, message) => {
    setLastScan({ type, name, message });
    setTimeout(() => setLastScan(null), 3000);
  };

  const moveMutation = useMutation({
    mutationFn: async ({ asset, action, reason, notes }) => {
      const show = selectedShow;
      const subLoc = subLocations.find(s => s.id === selectedSubLocId);
      let assetUpdate = {};
      let movementData = {
        asset_id: asset.id, asset_name: asset.name, asset_barcode: asset.barcode,
        action, scanned_by: 'crew',
        sub_location_id: subLoc?.id || '',
        sub_location_name: subLoc?.name || '',
        notes,
      };

      if (action === 'check_out') {
        movementData.show_id = selectedShowId;
        movementData.show_name = show?.name || '';
        movementData.from_location = asset.location || 'Warehouse';
        movementData.to_location = subLoc ? `${show?.name} › ${subLoc.name}` : show?.name || 'On Show';
        assetUpdate = {
          status: 'checked_out',
          current_show_id: selectedShowId,
          current_sub_location_id: subLoc?.id || '',
          current_sub_location_name: subLoc?.name || '',
          location: subLoc ? `${show?.name} › ${subLoc.name}` : show?.name || 'On Show',
        };
      } else if (action === 'check_in') {
        movementData.show_id = asset.current_show_id;
        movementData.show_name = shows.find(s => s.id === asset.current_show_id)?.name || '';
        movementData.from_location = asset.location;
        movementData.to_location = 'Warehouse';
        assetUpdate = { status: 'available', current_show_id: '', current_sub_location_id: '', current_sub_location_name: '', location: 'Warehouse' };
      } else if (action === 'av_hospital') {
        movementData.from_location = asset.location;
        movementData.to_location = 'AV Hospital';
        movementData.notes = `${reason}: ${notes}`;
        assetUpdate = { status: 'maintenance', location: 'AV Hospital', current_show_id: '', current_sub_location_id: '', current_sub_location_name: '' };
        // Create AV Hospital record
        await db.entities.AVHospital.create({
          asset_id: asset.id, asset_name: asset.name, asset_barcode: asset.barcode,
          marked_reason: reason, issue_notes: notes,
          show_id: asset.current_show_id || selectedShowId || '',
          show_name: asset.current_show_id ? (shows.find(s => s.id === asset.current_show_id)?.name || '') : (show?.name || ''),
          repair_status: 'waiting_inspection', is_active: true,
        });
      }

      if (isOnline()) {
        await db.entities.AssetMovement.create(movementData);
        await db.entities.Asset.update(asset.id, assetUpdate);
      } else {
        await saveScanOffline({ movementData, assetUpdate, asset, action });
      }
      return { asset, action };
    },
    onSuccess: ({ asset, action }) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['avhospital'] });
      setScannedItems(prev => [...prev, { id: asset.id, name: asset.name, barcode: asset.barcode, category: asset.category, action }]);
      const labels = { check_out: '✓ Checked Out', check_in: '✓ Checked In', av_hospital: '⚠ Sent to AV Hospital' };
      flashResult(action === 'av_hospital' ? 'warn' : 'success', asset.name, labels[action]);
      setBarcode('');
      setBrokenNotes('');
      inputRef.current?.focus();
      
      // Update pending count
      getPendingScans().then(p => setPendingScans(p.length));
    },
    onError: () => flashResult('error', '', 'Action failed — try again'),
  });

  const handleSyncScans = async () => {
    const pending = await getPendingScans();
    if (pending.length === 0) return;
    
    const syncIds = [];
    for (const scan of pending) {
      try {
        if (scan.movementData) {
          await db.entities.AssetMovement.create(scan.movementData);
        }
        if (scan.assetUpdate) {
          await db.entities.Asset.update(scan.asset.id, scan.assetUpdate);
        }
        syncIds.push(scan.id);
      } catch (e) {
        console.error('Sync failed for scan', scan.id);
      }
    }
    if (syncIds.length > 0) {
      await markScansSynced(syncIds);
      setPendingScans(0);
      flashResult('success', '', `Synced ${syncIds.length} scan${syncIds.length !== 1 ? 's' : ''}`);
    }
  };

  const handleCameraScan = (code) => {
    setCameraOpen(false);
    setBarcode(code);
    // Auto-submit after a short delay so state updates (EXACT STRING MATCH)
    setTimeout(() => {
      const val = code.trim();
      if (!val) return;
      if (scanAction === 'check_out' && !selectedShowId) {
        flashResult('error', '', 'Select a project first'); return;
      }
      // Exact match on barcode or serial numbers (preserve case & zeros)
      const asset = assets.find(a =>
        a.barcode === val ||
        a.serial_number === val ||
        getSerialNumbersArray(a).includes(val)
      );
      if (!asset) { flashResult('error', val, 'No exact match found'); setBarcode(''); return; }
      moveMutation.mutate({ asset, action: scanAction, reason: brokenReason, notes: brokenNotes });
    }, 100);
  };

  const handleScan = (e) => {
    e?.preventDefault();
    const val = barcode.trim();
    if (!val) { inputRef.current?.focus(); return; }
    if (scanAction === 'check_out' && !selectedShowId) {
      flashResult('error', '', 'Select a project first'); return;
    }

    // Exact match on barcode or serial numbers (preserve case & zeros)
    const asset = assets.find(a =>
      a.barcode === val ||
      a.serial_number === val ||
      getSerialNumbersArray(a).includes(val)
    );

    if (!asset) { 
      flashResult('error', val, 'No exact match found'); 
      setBarcode(''); 
      return; 
    }
    
    // VALIDATION: Reject maintenance items except in av_hospital mode
    if (asset.status === 'maintenance' && scanAction !== 'av_hospital') {
      flashResult('error', asset.name, 'Item is in maintenance — cannot scan'); 
      setBarcode(''); 
      return;
    }
    
    // VALIDATION: Reject items not on the show for check_out
    if (scanAction === 'check_out' && asset.current_show_id !== selectedShowId) {
      setAssetPendingRequest(asset);
      setRequestDialogOpen(true);
      setBarcode('');
      return;
    }

    // VALIDATION: Prevent duplicate scans in same session
    if (scannedItems.find(s => s.id === asset.id)) {
      flashResult('error', asset.name, 'Already scanned this session'); 
      setBarcode(''); 
      return;
    }

    moveMutation.mutate({ asset, action: scanAction, reason: brokenReason, notes: brokenNotes });
  };

  // Auto-submit on Bluetooth scanner (Enter key from scanner)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleScan(e);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-inset-bottom">
      {/* ── Header ── */}
      <div className="bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between border-b border-sidebar-border sticky top-0 z-10 safe-area-inset-top">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <ScanBarcode className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm tracking-wide">CREW MODE</span>
        </div>
        <div className="flex items-center gap-3">
          {scannedItems.length > 0 && (
            <button onClick={() => exportCSV(scannedItems, scanAction)}
              className="text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground flex items-center gap-1">
              <Download className="w-3 h-3" /> Export
            </button>
          )}
          <button onClick={handleBack} className="text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground">← Back</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-4 pb-8 safe-area-inset-bottom">

        {/* ── Additional Equipment Request Dialog ── */}
        {selectedShow && (
          <AdditionalEquipmentDialog
            open={requestDialogOpen}
            onOpenChange={setRequestDialogOpen}
            asset={assetPendingRequest}
            show={selectedShow}
            subLocations={subLocations}
            onSuccess={() => {
              flashResult('success', '', `Request submitted for ${assetPendingRequest?.name}`);
              setAssetPendingRequest(null);
              inputRef.current?.focus();
            }}
          />
        )}

        {/* ── Offline / Sync Indicator ── */}
        <OfflineIndicator isOnline={isConnected} pendingCount={pendingScans} onSync={handleSyncScans} />

        {/* ── Action Mode Selector ── */}
        <div className="grid grid-cols-3 gap-2">
          {ACTIONS.map(a => {
            const Icon = a.icon;
            const active = scanAction === a.value;
            return (
              <button key={a.value} type="button" onClick={() => setScanAction(a.value)}
                className={cn(
                  "flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 font-semibold text-xs transition-all",
                  active ? `${a.color} border-transparent shadow-md` : 'border-muted text-muted-foreground hover:border-muted-foreground/30'
                )}>
                <Icon className="w-5 h-5" />
                {a.label}
              </button>
            );
          })}
        </div>

        {/* ── Project + Location ── */}
        <div className="space-y-2">
          <Select value={selectedShowId} onValueChange={v => { setSelectedShowId(v); setScannedItems([]); setSelectedSubLocId(''); }}>
            <SelectTrigger className="h-12 text-base">
              <Truck className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Select project..." />
            </SelectTrigger>
            <SelectContent>
              {activeShows.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {subLocations.length > 0 && (
            <Select value={selectedSubLocId} onValueChange={setSelectedSubLocId}>
              <SelectTrigger className="h-11 text-sm">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground shrink-0" />
                <SelectValue placeholder="Room / Truck / Area (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>— Whole Project —</SelectItem>
                {subLocations.map(sl => <SelectItem key={sl.id} value={sl.id}>{sl.name} ({sl.type})</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* ── AV Hospital reason when in that mode ── */}
        {scanAction === 'av_hospital' && (
          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5" /> AV Hospital — mark item as damaged
            </p>
            <Select value={brokenReason} onValueChange={setBrokenReason}>
              <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>{BROKEN_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea value={brokenNotes} onChange={e => setBrokenNotes(e.target.value)}
              rows={2} placeholder="Describe the issue (optional)..."
              className="text-sm" />
          </div>
        )}

        {/* ── Camera Scanner ── */}
        {cameraOpen && (
          <CameraScanner
            onScan={handleCameraScan}
            onClose={() => setCameraOpen(false)}
          />
        )}

        {/* ── Scan Input ── */}
        <form onSubmit={handleScan}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan QR / barcode or type..."
                className="pl-11 h-16 text-xl font-mono"
                autoFocus
                autoComplete="off"
              />
            </div>
            <Button type="button" variant="outline" className="h-16 px-4" onClick={() => setCameraOpen(true)} title="Camera">
              <Camera className="w-5 h-5" />
            </Button>
            <Button type="submit" className={cn("h-16 px-6 text-lg font-bold",
              scanAction === 'av_hospital' ? 'bg-red-600 hover:bg-red-700' :
              scanAction === 'check_in' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
            )} disabled={moveMutation.isPending}>
              {moveMutation.isPending ? '...' : 'OK'}
            </Button>
          </div>
        </form>

        {/* ── Scan Feedback ── */}
        <AnimatePresence mode="wait">
          {lastScan && (
            <motion.div key={lastScan.message} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className={cn("flex items-center gap-3 p-4 rounded-xl border font-semibold text-lg",
                lastScan.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                lastScan.type === 'warn' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                'bg-red-500/10 text-destructive border-destructive/20')}>
              {lastScan.type === 'success' ? <CheckCircle2 className="w-7 h-7 shrink-0" /> :
               lastScan.type === 'warn' ? <AlertTriangle className="w-7 h-7 shrink-0" /> :
               <AlertCircle className="w-7 h-7 shrink-0" />}
              <div>
                {lastScan.name && <p className="text-sm font-normal opacity-80 leading-none mb-0.5">{lastScan.name}</p>}
                <p>{lastScan.message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Progress Bar (scan out mode, project selected) ── */}
        {selectedShowId && showAssets.length > 0 && scanAction === 'check_out' && (
          <div className="p-4 bg-card border rounded-xl">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>Packing Progress</span>
              <span className={cn(pct === 100 ? 'text-emerald-600' : pct > 60 ? 'text-amber-600' : 'text-red-500')}>{pct}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500",
                pct === 100 ? 'bg-emerald-500' : pct > 60 ? 'bg-amber-500' : 'bg-red-500'
              )} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span>{scannedItems.length} scanned</span>
              <span>{missing.length} remaining</span>
            </div>
          </div>
        )}

        {/* ── Scanned This Session ── */}
        {scannedItems.length > 0 && (
          <div className="border rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 text-sm font-semibold"
              onClick={() => setShowScanned(v => !v)}>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Scanned this session ({scannedItems.length})
              </span>
              {showScanned ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showScanned && (
              <div className="divide-y max-h-56 overflow-y-auto">
                {[...scannedItems].reverse().map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <div className={cn("w-2 h-2 rounded-full shrink-0",
                      item.action === 'check_out' ? 'bg-primary' :
                      item.action === 'check_in' ? 'bg-emerald-500' : 'bg-red-500')} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.barcode}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {item.action === 'check_out' ? 'out' : item.action === 'check_in' ? 'in' : '🏥'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Missing Items ── */}
        {selectedShowId && missing.length > 0 && scanAction === 'check_out' && (
          <div className="border rounded-xl overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 bg-amber-500/5 border-amber-500/20 text-sm font-semibold text-amber-700"
              onClick={() => setShowMissing(v => !v)}>
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Still needed ({missing.length})
              </span>
              {showMissing ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showMissing && (
              <div className="divide-y max-h-64 overflow-y-auto">
                {missing.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{a.barcode}</p>
                    </div>
                    {a.current_sub_location_name && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                        <MapPin className="w-3 h-3" />{a.current_sub_location_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty states */}
        {!selectedShowId && scanAction !== 'av_hospital' && (
          <div className="text-center py-10 text-muted-foreground">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Select a project to start scanning</p>
          </div>
        )}
        {selectedShowId && showAssets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No equipment assigned to this project yet</p>
          </div>
        )}
      </div>
    </div>
  );
}