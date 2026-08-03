import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  QrCode, CheckCircle, XCircle, Package, ClipboardList,
  Camera, Truck, MapPin, RotateCcw, AlertTriangle, ChevronRight,
  Lock, Boxes, CheckCircle2, Search, Printer, Filter, ScanLine,
  Clock, Barcode, ChevronDown, ShieldAlert, CheckCheck, Ban, Trash2, RefreshCw, Wrench
} from 'lucide-react';
import CameraScanner from '@/components/crew/CameraScanner';
import PickListPrint from '@/components/scan/PickListPrint';
import AdditionalEquipmentDialog from '@/components/scan/AdditionalEquipmentDialog';
import ContainerScanMode from '@/components/scan/ContainerScanMode';
import AVHospitalScanDialog from '@/components/scan/AVHospitalScanDialog';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/lib/usePermissions';
import { isScannable } from '@/lib/itemTypes';
import { useStatusFlow } from '@/lib/useStatusFlow';
import { getSerialNumbersArray } from '@/lib/serialNumbers';

// ── Stage definitions ─────────────────────────────────────────────────────────
// 3 operational stages: Pick → Send (on truck, LOCKED) → Return
const ITEM_STAGES = {
  picked:      { label: 'Picked',      color: 'text-amber-500',    bg: 'bg-amber-500/10',    border: 'border-amber-500/30',    dot: 'bg-amber-500'    },
  packed:      { label: 'On Truck',    color: 'text-blue-400',     bg: 'bg-blue-500/10',     border: 'border-blue-500/30',     dot: 'bg-blue-400'     },
  on_truck:    { label: 'On Truck',    color: 'text-blue-400',     bg: 'bg-blue-500/10',     border: 'border-blue-500/30',     dot: 'bg-blue-400'     },
  on_location: { label: 'On Location', color: 'text-primary',      bg: 'bg-primary/10',      border: 'border-primary/30',      dot: 'bg-primary'      },
  returning:   { label: 'Returning',   color: 'text-orange-500',   bg: 'bg-orange-500/10',   border: 'border-orange-500/30',   dot: 'bg-orange-500'   },
  returned:    { label: 'Returned',    color: 'text-muted-foreground', bg: 'bg-muted/20',    border: 'border-border/30',       dot: 'bg-muted-foreground' },
};

// Items are "locked out" (cannot be picked by another show, cannot be moved backwards)
// once they are at on_truck or on_location — they MUST be returned first.
const LOCKED_STATES = ['on_truck', 'on_location', 'returning'];

const FULFILLMENT_STATUSES = {
  planned:      { label: 'Planned',       color: 'text-muted-foreground', bg: 'bg-muted/30' },
  picking:      { label: 'Picking',       color: 'text-amber-500',        bg: 'bg-amber-500/10' },
  picked:       { label: 'Picked',        color: 'text-amber-500',        bg: 'bg-amber-500/10' },
  packing:      { label: 'Packing',       color: 'text-blue-400',         bg: 'bg-blue-500/10' },
  packed:       { label: 'Packed',        color: 'text-blue-400',         bg: 'bg-blue-500/10' },
  on_truck:     { label: 'Sent',          color: 'text-purple-400',       bg: 'bg-purple-500/10' },
  on_location:  { label: 'On Location',   color: 'text-primary',          bg: 'bg-primary/10' },
  needs_return: { label: 'Needs Return',  color: 'text-red-500',          bg: 'bg-red-500/10' },
  returning:    { label: 'Returning',     color: 'text-orange-500',       bg: 'bg-orange-500/10' },
  finished:     { label: 'Finished',      color: 'text-muted-foreground', bg: 'bg-muted/20' },
};

const STATUS_SEQUENCE = ['planned','picking','picked','packed','on_truck','on_location','needs_return','returning','finished'];

// ── Inline pick row ──────────────────────────────────────────────────────────
function PickRow({ item, fulfillments, onRemoveFulfillment, canManage, onPushBulk, assets }) {
  const [expanded, setExpanded] = useState(false);

  const needed = item.quantity_needed || 1;
  const active = fulfillments.filter(f => f.requirement_id === item.id && f.movement_state !== 'returned');
  const scanned = active.length;
  const remaining = Math.max(0, needed - scanned);
  const isFulfilled = scanned >= needed;
  const isPartial = scanned > 0 && !isFulfilled;

  // Determine if this requirement's linked asset is bulk-tracked
  const linkedAsset = assets?.find(a =>
    (item.asset_id && a.id === item.asset_id) ||
    (!item.asset_id && a.name.toLowerCase() === item.product_name.toLowerCase())
  );
  const isBulk = linkedAsset?.tracking === 'bulk' || linkedAsset?.tracking === 'consumable';
  // Cap pushable qty against actual inventory
  const inventoryQty = linkedAsset?.quantity ?? 0;
  const pushableQty = Math.min(remaining, inventoryQty);
  const inventoryShort = isBulk && inventoryQty < needed;

  return (
    <div className={cn(
      "rounded-lg border transition-all",
      isFulfilled ? "border-emerald-500/30 bg-emerald-500/5" :
      isPartial   ? "border-amber-500/30 bg-amber-500/5" :
                    "border-border/60 bg-muted/10"
    )}>
      <div className="flex items-center gap-3 p-3">
        {isFulfilled ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          : isPartial  ? <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          : <Clock className="w-4 h-4 text-muted-foreground shrink-0" />}

        <div className="flex-1 min-w-0">
          <p className={cn("font-medium text-sm", isFulfilled && "text-muted-foreground line-through")}>
            {item.product_name}
          </p>
          {item.room_name && <p className="text-xs text-muted-foreground mt-0.5">{item.room_name}</p>}
          {item.category && !item.room_name && <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* dot progress — max 8 */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(needed, 8) }).map((_, i) => (
              <div key={i} className={cn(
                "w-2.5 h-2.5 rounded-full border",
                i < scanned ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"
              )} />
            ))}
            {needed > 8 && <span className="text-xs text-muted-foreground">+{needed-8}</span>}
          </div>

          <div className="text-right min-w-[44px]">
            <p className={cn("font-bold text-sm tabular-nums",
              isFulfilled ? "text-emerald-500" : isPartial ? "text-amber-500" : "text-muted-foreground")}>
              {scanned}/{needed}
            </p>
            {remaining > 0 && <p className="text-xs text-muted-foreground">{remaining} left</p>}
          </div>

          {/* Push button for bulk items */}
          {isBulk && !isFulfilled && remaining > 0 && (
            <div className="flex flex-col items-end gap-0.5">
              <button
                title={pushableQty > 0 ? `Push ${pushableQty} unit${pushableQty !== 1 ? 's' : ''} to picked` : 'Not enough inventory'}
                onClick={() => pushableQty > 0 && onPushBulk({ item, asset: linkedAsset, qty: pushableQty })}
                disabled={pushableQty <= 0}
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium border transition-colors",
                  pushableQty > 0
                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                    : "bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50"
                )}
              >
                Push {pushableQty > 0 ? pushableQty : ''}
              </button>
              {inventoryShort && (
                <span className="text-xs text-amber-500">Inv: {inventoryQty}</span>
              )}
            </div>
          )}

          {scanned > 0 && (
            <button onClick={() => setExpanded(e => !e)} className="p-1 rounded hover:bg-secondary/60">
              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>
      </div>

      {expanded && scanned > 0 && (
        <div className="px-3 pb-3 pt-2 border-t border-border/40 space-y-1">
          {active.map(f => (
            <div key={f.id} className="flex items-center gap-2 p-2 rounded bg-secondary/40 text-xs">
              <Barcode className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="font-mono font-semibold">{f.asset_serial || f.asset_name || f.asset_id}</span>
              <span className="text-muted-foreground flex-1 truncate">{f.asset_name}</span>
              {(() => {
                const stage = ITEM_STAGES[f.movement_state] || ITEM_STAGES.picked;
                return (
                  <Badge variant="outline" className={cn("text-xs capitalize", stage.color, stage.border)}>
                    {stage.label}
                  </Badge>
                );
              })()}
              {canManage && (
                <button
                  title="Remove this fulfillment record"
                  onClick={() => onRemoveFulfillment(f)}
                  className="ml-1 p-0.5 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Room group ───────────────────────────────────────────────────────────────
function RoomGroup({ roomName, items, fulfillments, onRemoveFulfillment, canManage, onPushBulk, assets }) {
  const [collapsed, setCollapsed] = useState(false);
  const totalNeeded = items.reduce((s, r) => s + (r.quantity_needed || 1), 0);
  const totalScanned = items.reduce((s, item) => {
    const count = fulfillments.filter(f => f.requirement_id === item.id && f.movement_state !== 'returned').length;
    return s + Math.min(count, item.quantity_needed || 1);
  }, 0);
  const isComplete = totalNeeded > 0 && totalScanned >= totalNeeded;
  const isStarted = totalScanned > 0;

  // Find all bulk items in this room that still have remaining qty
  const bulkItemsRemaining = items.filter(item => {
    const linkedAsset = assets?.find(a =>
      (item.asset_id && a.id === item.asset_id) ||
      (!item.asset_id && a.name.toLowerCase() === item.product_name.toLowerCase())
    );
    if (linkedAsset?.tracking !== 'bulk') return false;
    const scanned = fulfillments.filter(f => f.requirement_id === item.id && f.movement_state !== 'returned').length;
    return scanned < (item.quantity_needed || 1);
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between p-3 bg-secondary/40 hover:bg-secondary/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
          <span className="font-semibold text-sm">{roomName}</span>
          <span className="text-xs text-muted-foreground">({items.length} line{items.length !== 1 ? 's' : ''})</span>
        </div>
        <div className="flex items-center gap-2">
          {bulkItemsRemaining.length > 1 && (
            <button
              title="Push all remaining bulk items in this room to picked"
              onClick={e => {
                e.stopPropagation();
                bulkItemsRemaining.forEach(item => {
                  const linkedAsset = assets?.find(a =>
                    (item.asset_id && a.id === item.asset_id) ||
                    (!item.asset_id && a.name.toLowerCase() === item.product_name.toLowerCase())
                  );
                  const scanned = fulfillments.filter(f => f.requirement_id === item.id && f.movement_state !== 'returned').length;
                  const remaining = (item.quantity_needed || 1) - scanned;
                  onPushBulk({ item, asset: linkedAsset, qty: remaining });
                });
              }}
              className="px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
            >
              Push All Bulk
            </button>
          )}
          <Badge className={cn("text-xs",
            isComplete ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
            isStarted  ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                         "bg-muted text-muted-foreground"
          )}>
            {totalScanned}/{totalNeeded}
          </Badge>
        </div>
      </button>
      {!collapsed && (
        <div className="p-3 space-y-2">
          {items.map(item => (
            <PickRow key={item.id} item={item} fulfillments={fulfillments} onRemoveFulfillment={onRemoveFulfillment} canManage={canManage} onPushBulk={onPushBulk} assets={assets} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Scan page ────────────────────────────────────────────────────────────
export default function Scan() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);

  const [barcode, setBarcode] = useState('');
  const [selectedShowId, setSelectedShowId] = useState(urlParams.get('show') || '');
  // scanMode: 'pick' | 'send' | 'return' | 'hospital'
  const [scanMode, setScanMode] = useState('pick');
  const [lastResult, setLastResult] = useState(null);
  const [sessionLog, setSessionLog] = useState([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [tab, setTab] = useState('scan');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showPrint, setShowPrint] = useState(false);
  const [additionalEquipAsset, setAdditionalEquipAsset] = useState(null);
  const [avHospitalAsset, setAvHospitalAsset] = useState(null);
  const inputRef = useRef(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => db.auth.me() });
  const { data: shows = [] } = useQuery({
    queryKey: ['shows_active'],
    queryFn: async () => {
      const all = await db.entities.Show.list('-start_date', 200);
      return all.filter(s => ['planning', 'confirmed', 'picking', 'picked', 'on_truck', 'on_location', 'needs_return', 'returning', 'load_out', 'on_site', 'strike'].includes(s.status));
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const { data: assets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => db.entities.Asset.list() });

  const selectedShow = shows.find(s => s.id === selectedShowId);

  const { data: requirements = [], refetch: refetchRequirements } = useQuery({
    queryKey: ['show_requirements_all', selectedShowId],
    queryFn: () => db.entities.ShowRequirement.filter({ show_id: selectedShowId }),
    enabled: !!selectedShowId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: fulfillments = [] } = useQuery({
    queryKey: ['show_fulfillments', selectedShowId],
    queryFn: () => db.entities.ShowFulfillment.filter({ show_id: selectedShowId }),
    enabled: !!selectedShowId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Use same query key as AdditionalEquipmentApprovalPanel so both share the same cache
  const { data: approvalRequests = [] } = useQuery({
    queryKey: ['additionalEquipmentRequests', selectedShowId],
    queryFn: () => db.entities.AdditionalEquipmentRequest.filter({ show_id: selectedShowId }),
    enabled: !!selectedShowId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { isManagerOrAbove } = usePermissions();
  const statusFlow = useStatusFlow();

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (selectedShowId) {
      setSessionLog([]); setLastResult(null); setSearch(''); setStatusFilter('all');
      // Clean up orphaned fulfillment records (no requirement_id + no valid approval)
      db.functions.invoke('cleanupOrphanedFulfillments', { showId: selectedShowId })
        .then(res => {
          if (res.data?.cleaned > 0) {
            queryClient.invalidateQueries({ queryKey: ['show_fulfillments', selectedShowId] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
          }
        })
        .catch(() => {}); // silent — cleanup is best-effort
    }
  }, [selectedShowId]);
  useEffect(() => { if (tab === 'scan') inputRef.current?.focus(); }, [tab]);

  // ── Build pick list items ────────────────────────────────────────────────
  // Source of truth: ShowRequirement records only.
  // Assets with stale current_show_id are NOT a valid pick list source — they represent
  // previous scan state and can persist even after a project's gear plan is cleared.
  const pickListItems = useMemo(() => requirements, [requirements]);

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalRequired = pickListItems.reduce((s, r) => s + (r.quantity_needed || 1), 0);
  const totalFulfilled = useMemo(() => pickListItems.reduce((s, item) => {
    const count = fulfillments.filter(f => f.requirement_id === item.id && f.movement_state !== 'returned').length;
    return s + Math.min(count, item.quantity_needed || 1);
  }, 0), [pickListItems, fulfillments]);

  const isFullyPicked = totalRequired > 0 && totalFulfilled >= totalRequired;
  const activeFulfillments = fulfillments.filter(f => f.movement_state !== 'returned');
  const pickedIds = activeFulfillments.filter(f => f.movement_state === 'picked').map(f => f.id);
  const fStatus = selectedShow?.fulfillment_status;
  const fMeta = FULFILLMENT_STATUSES[fStatus] || FULFILLMENT_STATUSES.planned;
  const rooms = selectedShow?.sub_locations || [];

  // ── Grouped + filtered pick list ──────────────────────────────────────────
  const filteredItems = useMemo(() => pickListItems.filter(item => {
    if (search) {
      const q = search.toLowerCase();
      const active = fulfillments.filter(f => f.requirement_id === item.id && f.movement_state !== 'returned');
      const nameHit = item.product_name.toLowerCase().includes(q);
      const serialHit = active.some(f => (f.asset_barcode || f.asset_serial || '').toLowerCase().includes(q));
      if (!nameHit && !serialHit) return false;
    }
    if (statusFilter === 'incomplete') {
      const count = fulfillments.filter(f => f.requirement_id === item.id && f.movement_state !== 'returned').length;
      return count < (item.quantity_needed || 1);
    }
    if (statusFilter === 'complete') {
      const count = fulfillments.filter(f => f.requirement_id === item.id && f.movement_state !== 'returned').length;
      return count >= (item.quantity_needed || 1);
    }
    return true;
  }), [pickListItems, fulfillments, search, statusFilter]);

  const groupedItems = useMemo(() => {
    const groups = {};
    for (const item of filteredItems) {
      const key = item.room_id || '__unassigned__';
      const name = item.room_name || 'General / Unassigned';
      if (!groups[key]) groups[key] = { name, items: [] };
      groups[key].items.push(item);
    }
    return Object.values(groups);
  }, [filteredItems]);

  // ── Asset lookup ──────────────────────────────────────────────────────────
  const findAssetByCode = (code) => {
    if (!code || !assets.length) return null;
    const t = code.trim().toLowerCase();
    // Serial numbers are the primary source of truth — check them first.
    // Barcode is a legacy scan alias and is checked last.
    return (
      assets.find(a => a.id === code.trim()) ||
      assets.find(a => getSerialNumbersArray(a).some(s => s.toLowerCase() === t)) ||
      assets.find(a => a.serial_number && a.serial_number.toLowerCase() === t) ||
      assets.find(a => a.barcode && a.barcode.toLowerCase() === t) ||
      null
    );
  };

  const findMatchingRequirement = (asset) => {
    if (requirements.length === 0) return null;
    // Match only by exact asset_id link OR exact product name — never by category alone,
    // as category is too broad and causes wrong assets to satisfy unrelated requirements.
    const matches = requirements.filter(r =>
      r.asset_id === asset.id
      || r.product_name.toLowerCase() === asset.name.toLowerCase()
    );
    for (const req of matches) {
      const filled = fulfillments.filter(f => f.requirement_id === req.id && f.movement_state !== 'returned').length;
      if (filled < (req.quantity_needed || 1)) return req;
    }
    return null;
  };

  // Helper: quote confirmed check
  const isQuoteConfirmed = selectedShow?.quote_confirmed === true || !['planning', 'confirmed'].includes(selectedShow?.status || 'planning');

  // ── Mutations ─────────────────────────────────────────────────────────────
  const fulfillMutation = useMutation({
    mutationFn: async ({ asset, requirement, mode }) => {
      const now = new Date().toISOString();

      if (mode === 'return') {
        // Return: unlock item — must be on this show
        const existing = fulfillments.find(f => f.asset_id === asset.id && f.movement_state !== 'returned');
        if (!existing) throw new Error('No active fulfillment for this asset on this show');
        await db.entities.ShowFulfillment.update(existing.id, {
          movement_state: 'returned', returned_at: now, returned_by: user?.email || '',
        });
        await db.entities.Asset.update(asset.id, {
          status: 'available', locked_to_show_id: null, locked_to_show_name: null,
          locked_at: null, current_show_id: null, current_sub_location_id: null, current_sub_location_name: null,
        });
        await db.entities.AssetMovement.create({
          asset_id: asset.id, asset_name: asset.name, asset_barcode: asset.barcode || asset.id,
          action: 'check_in', show_id: selectedShowId, show_name: selectedShow?.name,
          notes: 'Returned via scan', scanned_by: user?.email || 'unknown', scanned_by_user_id: user?.id,
        });
        return { type: 'return', asset };

      } else if (mode === 'pack') {
        // Pack: move picked → packed. Must already be picked for this show.
        const existing = fulfillments.find(f => f.asset_id === asset.id && f.movement_state === 'picked');
        if (!existing) throw new Error(`${asset.name} is not in "Picked" state — scan it in Pick mode first`);
        await db.entities.ShowFulfillment.update(existing.id, {
          movement_state: 'packed', packed_at: now, packed_by: user?.email || '',
        });
        return { type: 'pack', asset };

      } else if (mode === 'send') {
        // Send: move packed → on_truck. LOCKS the item.
        const existing = fulfillments.find(f => f.asset_id === asset.id && (f.movement_state === 'packed' || f.movement_state === 'picked'));
        if (!existing) throw new Error(`${asset.name} must be Picked or Packed before sending`);
        await db.entities.ShowFulfillment.update(existing.id, {
          movement_state: 'on_truck', sent_at: now, sent_by: user?.email || '',
        });
        // Hard-lock the asset — cannot be used by any other show until returned
        await db.entities.Asset.update(asset.id, {
          status: 'checked_out', locked_to_show_id: selectedShowId, locked_to_show_name: selectedShow?.name,
          locked_at: now, current_show_id: selectedShowId,
        });
        await db.entities.AssetMovement.create({
          asset_id: asset.id, asset_name: asset.name, asset_barcode: asset.barcode || asset.id,
          action: 'check_out', show_id: selectedShowId, show_name: selectedShow?.name,
          notes: 'Sent to show — locked', scanned_by: user?.email || 'unknown', scanned_by_user_id: user?.id,
        });
        return { type: 'send', asset };

      } else {
        // Pick: initial scan-in to this show
        await db.entities.ShowFulfillment.create({
          show_id: selectedShowId, show_name: selectedShow?.name,
          requirement_id: requirement?.id || null, asset_id: asset.id,
          asset_name: asset.name, asset_barcode: asset.barcode,
          asset_serial: asset.serial_number || getSerialNumbersArray(asset)[0] || '',
          room_id: requirement?.room_id || asset.current_sub_location_id || null,
          room_name: requirement?.room_name || asset.current_sub_location_name || null,
          movement_state: 'picked', scanned_by: user?.email || '', scanned_at: now,
        });
        // Soft-reserve the asset (not hard-locked until send)
        await db.entities.Asset.update(asset.id, {
          status: 'checked_out', locked_to_show_id: selectedShowId, locked_to_show_name: selectedShow?.name,
          locked_at: now, current_show_id: selectedShowId,
          current_sub_location_id: requirement?.room_id || asset.current_sub_location_id || null,
          current_sub_location_name: requirement?.room_name || asset.current_sub_location_name || null,
        });
        await db.entities.AssetMovement.create({
          asset_id: asset.id, asset_name: asset.name, asset_barcode: asset.barcode || asset.id,
          action: 'check_out', show_id: selectedShowId, show_name: selectedShow?.name,
          sub_location_id: requirement?.room_id, sub_location_name: requirement?.room_name,
          notes: requirement ? `Picked: ${requirement.product_name}` : 'Direct scan (no requirement)',
          scanned_by: user?.email || 'unknown', scanned_by_user_id: user?.id,
        });
        return { type: 'pick', asset, requirement };
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['show_fulfillments', selectedShowId] }),
        queryClient.invalidateQueries({ queryKey: ['show_requirements_all', selectedShowId] }),
        queryClient.invalidateQueries({ queryKey: ['assets'] }),
      ]);
    },
  });

  const updateFulfillmentStateMutation = useMutation({
    mutationFn: async ({ ids, state }) => {
      await Promise.all(ids.map(id => db.entities.ShowFulfillment.update(id, { movement_state: state })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show_fulfillments', selectedShowId] });
      toast.success('Status updated');
    },
  });

  const pushBulkMutation = useMutation({
    mutationFn: async ({ item, asset, qty }) => {
      if (!asset) throw new Error('Asset not found for bulk push');
      const res = await db.functions.invoke('pushBulkFulfillment', {
        item, asset, qty, showId: selectedShowId, showName: selectedShow?.name,
      });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['show_fulfillments', selectedShowId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Bulk items pushed to picked');
    },
    onError: (err) => toast.error(err.message || 'Push failed — check inventory quantity on asset'),
  });

  const removeFulfillmentMutation = useMutation({
    mutationFn: async (fulfillment) => {
      await db.entities.ShowFulfillment.delete(fulfillment.id);
      // Reset the asset back to available if it was locked to this show
      const asset = assets.find(a => a.id === fulfillment.asset_id);
      if (asset && asset.locked_to_show_id === selectedShowId) {
        await db.entities.Asset.update(asset.id, {
          status: 'available', locked_to_show_id: null, locked_to_show_name: null,
          locked_at: null, current_show_id: null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['show_fulfillments', selectedShowId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Fulfillment record removed');
    },
    onError: (err) => toast.error(err.message || 'Failed to remove record'),
  });

  const updateShowFulfillmentStatus = useMutation({
    mutationFn: ({ status }) => db.entities.Show.update(selectedShowId, {
      fulfillment_status: status,
      status: status,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shows_active'] });
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      queryClient.invalidateQueries({ queryKey: ['show', selectedShowId] });
      queryClient.invalidateQueries({ queryKey: ['show_requirements_detail', selectedShowId] });
      // Force re-fetch so the badge in the header reflects the new status immediately
      queryClient.refetchQueries({ queryKey: ['shows_active'] });
    },
  });

  const approveRequestMutation = useMutation({
    mutationFn: async ({ request }) => {
      const now = new Date().toISOString();
      // Update request status
      await db.entities.AdditionalEquipmentRequest.update(request.id, {
        status: 'approved', approved_by: user?.email || '', approved_at: now,
      });
      // Now fulfill it — pick the asset
      const asset = assets.find(a => a.id === request.asset_id);
      if (!asset) throw new Error('Asset not found');
      await db.entities.ShowFulfillment.create({
        show_id: selectedShowId, show_name: selectedShow?.name,
        requirement_id: null, asset_id: asset.id,
        asset_name: asset.name, asset_barcode: asset.barcode,
        asset_serial: asset.serial_number || getSerialNumbersArray(asset)[0] || '',
        room_id: request.sub_location_id || null,
        room_name: request.sub_location_name || null,
        movement_state: 'picked', scanned_by: request.requested_by || '', scanned_at: request.scanned_at || now,
      });
      await db.entities.Asset.update(asset.id, {
        status: 'checked_out', locked_to_show_id: selectedShowId, locked_to_show_name: selectedShow?.name,
        locked_at: now, current_show_id: selectedShowId,
        current_sub_location_id: request.sub_location_id || null,
        current_sub_location_name: request.sub_location_name || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', selectedShowId] });
      queryClient.invalidateQueries({ queryKey: ['show_fulfillments', selectedShowId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success('Request approved — item added to project');
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }) => {
      await db.entities.AdditionalEquipmentRequest.update(requestId, {
        status: 'rejected', approved_by: user?.email || '', approved_at: new Date().toISOString(),
        rejected_reason: reason || 'Rejected by manager',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', selectedShowId] });
      toast.info('Request rejected');
    },
  });

  // ── Scan handler ──────────────────────────────────────────────────────────
  const handleScan = async (code) => {
    const c = (code || barcode).trim();
    if (!c) return;
    if (!selectedShowId) { toast.error('Select a project first'); setBarcode(''); return; }

    const asset = findAssetByCode(c);
    if (!asset) {
      const result = { success: false, message: `No asset found: "${c}"`, ts: new Date() };
      setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
      toast.error('Asset not found'); setBarcode(''); inputRef.current?.focus(); return;
    }

    if (!isScannable(asset.item_type)) {
      const result = { success: false, message: `${asset.name} is a ${asset.item_type?.replace('_', ' ')} and cannot be scanned`, ts: new Date() };
      setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
      toast.error('This item type cannot be scanned'); setBarcode(''); inputRef.current?.focus(); return;
    }

    // ── HOSPITAL mode ──────────────────────────────────────────────────────
    if (scanMode === 'hospital') {
      setAvHospitalAsset(asset);
      setBarcode(''); inputRef.current?.focus(); return;
    }

    // ── RETURN mode ────────────────────────────────────────────────────────
    if (scanMode === 'return') {
      const existing = fulfillments.find(f => f.asset_id === asset.id && f.movement_state !== 'returned');
      if (!existing) {
        const result = { success: false, message: `${asset.name} is not active on this project`, ts: new Date() };
        setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
        toast.error('Asset not on this project'); setBarcode(''); inputRef.current?.focus(); return;
      }
      fulfillMutation.mutate({ asset, requirement: null, mode: 'return' }, {
        onSuccess: () => {
          const logItem = { success: true, message: `↩ ${asset.name} returned`, ts: new Date(), type: 'return' };
          setLastResult(logItem); setSessionLog(prev => [logItem, ...prev.slice(0, 49)]);
          toast.success('Returned!');
          const activeAfter = activeFulfillments.filter(f => f.asset_id !== asset.id);
          updateShowFulfillmentStatus.mutate({ status: activeAfter.length === 0 ? 'finished' : 'returning' });
          if (activeAfter.length === 0) setTimeout(() => toast.success('🎉 All items returned!', { duration: 6000 }), 400);
        },
        onError: (err) => {
          const result = { success: false, message: err.message || 'Return failed', ts: new Date() };
          setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
          toast.error(result.message);
        },
      });
      setBarcode(''); inputRef.current?.focus(); return;
    }

    // ── SEND mode ──────────────────────────────────────────────────────────
    if (scanMode === 'send') {
      // Requires quote confirmed
      if (!isQuoteConfirmed) {
        const result = { success: false, message: `Cannot send — quote for "${selectedShow?.name}" is not confirmed yet`, ts: new Date() };
        setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
        toast.error('Confirm the quote before sending gear'); setBarcode(''); inputRef.current?.focus(); return;
      }
      const existing = fulfillments.find(f => f.asset_id === asset.id && (f.movement_state === 'packed' || f.movement_state === 'picked'));
      if (!existing) {
        // Check if already sent
        const alreadySent = fulfillments.find(f => f.asset_id === asset.id && LOCKED_STATES.includes(f.movement_state));
        const result = { success: false, message: alreadySent ? `${asset.name} already sent` : `${asset.name} is not picked or packed — pick it first`, ts: new Date() };
        setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
        toast.error(result.message); setBarcode(''); inputRef.current?.focus(); return;
      }
      fulfillMutation.mutate({ asset, requirement: null, mode: 'send' }, {
        onSuccess: () => {
          const logItem = { success: true, message: `🚚 ${asset.name} sent — LOCKED to show`, ts: new Date(), type: 'send' };
          setLastResult(logItem); setSessionLog(prev => [logItem, ...prev.slice(0, 49)]);
          toast.success('Sent!');
          const sentCount = activeFulfillments.filter(f => LOCKED_STATES.includes(f.movement_state)).length + 1;
          if (sentCount > 0) updateShowFulfillmentStatus.mutate({ status: 'on_truck' });
        },
        onError: (err) => {
          const result = { success: false, message: err.message || 'Send failed', ts: new Date() };
          setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
          toast.error(result.message);
        },
      });
      setBarcode(''); inputRef.current?.focus(); return;
    }

    // ── PACK mode ──────────────────────────────────────────────────────────
    if (scanMode === 'pack') {
      // Requires quote confirmed
      if (!isQuoteConfirmed) {
        const result = { success: false, message: `Cannot pack — quote for "${selectedShow?.name}" is not confirmed yet`, ts: new Date() };
        setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
        toast.error('Confirm the quote before packing gear'); setBarcode(''); inputRef.current?.focus(); return;
      }
      // Cannot pack items that are already locked (sent)
      const lockedExisting = fulfillments.find(f => f.asset_id === asset.id && LOCKED_STATES.includes(f.movement_state));
      if (lockedExisting) {
        const result = { success: false, message: `${asset.name} is already sent/on location — cannot repack`, ts: new Date() };
        setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
        toast.error('Item is locked — return it first'); setBarcode(''); inputRef.current?.focus(); return;
      }
      const pickedExisting = fulfillments.find(f => f.asset_id === asset.id && f.movement_state === 'picked');
      if (!pickedExisting) {
        const result = { success: false, message: `${asset.name} is not in Picked state — pick it first`, ts: new Date() };
        setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
        toast.error('Pick this item first'); setBarcode(''); inputRef.current?.focus(); return;
      }
      fulfillMutation.mutate({ asset, requirement: null, mode: 'pack' }, {
        onSuccess: () => {
          const logItem = { success: true, message: `📦 ${asset.name} packed`, ts: new Date(), type: 'pack' };
          setLastResult(logItem); setSessionLog(prev => [logItem, ...prev.slice(0, 49)]);
          toast.success('Packed!');
          updateShowFulfillmentStatus.mutate({ status: 'packed' });
        },
        onError: (err) => {
          const result = { success: false, message: err.message || 'Pack failed', ts: new Date() };
          setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
          toast.error(result.message);
        },
      });
      setBarcode(''); inputRef.current?.focus(); return;
    }

    // ── PICK mode ──────────────────────────────────────────────────────────
    // Pick is free after show is confirmed (not in planning)
    if (selectedShow?.status === 'planning') {
      const result = { success: false, message: `Cannot pick — ${selectedShow.name} is still in Planning`, ts: new Date() };
      setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
      toast.error('Show must be confirmed before picking'); setBarcode(''); inputRef.current?.focus(); return;
    }

    // Block if item is hard-locked to a different show (was sent, not returned)
    if (asset.locked_to_show_id && asset.locked_to_show_id !== selectedShowId) {
      const lockState = fulfillments.find(f => f.asset_id === asset.id && LOCKED_STATES.includes(f.movement_state));
      // Only block if it's in a locked state on another show
      const otherShowFulfillment = await db.entities.ShowFulfillment.filter({ asset_id: asset.id });
      const hardLocked = otherShowFulfillment.some(f => f.show_id !== selectedShowId && LOCKED_STATES.includes(f.movement_state));
      if (hardLocked) {
        const result = { success: false, message: `${asset.name} is sent to "${asset.locked_to_show_name}" — must be returned first`, ts: new Date() };
        setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
        toast.error('Asset is locked to another show — return it first'); setBarcode(''); inputRef.current?.focus(); return;
      }
    }

    const matchedRequirement = findMatchingRequirement(asset);
    const isOnPickList = matchedRequirement !== null;

    if (!isOnPickList) {
      const alreadyPending = approvalRequests.find(r => r.asset_id === asset.id && r.show_id === selectedShowId && r.status === 'pending');
      const result = { success: false, message: `${asset.name} — not planned on this project`, type: 'unassigned', ts: new Date() };
      setLastResult(result);
      if (alreadyPending) {
        setSessionLog(prev => [{ ...result, message: `${asset.name} — already pending approval` }, ...prev.slice(0, 49)]);
        toast.warning('Already pending approval');
      } else {
        setSessionLog(prev => [result, ...prev.slice(0, 49)]);
        setAdditionalEquipAsset(asset);
      }
      setBarcode(''); inputRef.current?.focus(); return;
    }

    const alreadyActive = fulfillments.find(f => f.asset_id === asset.id && f.movement_state !== 'returned');
    if (alreadyActive) {
      const stage = ITEM_STAGES[alreadyActive.movement_state] || ITEM_STAGES.picked;
      const result = { success: false, message: `${asset.name} already ${stage.label} on this project`, ts: new Date() };
      setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
      toast.error(`Already ${stage.label}`); setBarcode(''); inputRef.current?.focus(); return;
    }

    const requirement = matchedRequirement;
    fulfillMutation.mutate({ asset, requirement, mode: 'pick' }, {
      onSuccess: async () => {
        const msg = requirement
          ? `✓ ${asset.name} → ${requirement.product_name}${requirement.room_name ? ` (${requirement.room_name})` : ''}`
          : `✓ ${asset.name} picked`;
        const logItem = { success: true, message: msg, ts: new Date(), type: 'pick' };
        setLastResult(logItem); setSessionLog(prev => [logItem, ...prev.slice(0, 49)]);
        toast.success('Picked!');
        const freshFulfillments = await queryClient.fetchQuery({
          queryKey: ['show_fulfillments', selectedShowId],
          queryFn: () => db.entities.ShowFulfillment.filter({ show_id: selectedShowId }),
          staleTime: 0,
        });
        const freshActive = freshFulfillments.filter(f => f.movement_state !== 'returned');
        const freshFulfilled = requirements.reduce((s, r) => {
          const count = freshActive.filter(f => f.requirement_id === r.id).length;
          return s + Math.min(count, r.quantity_needed || 1);
        }, 0);
        const newStatus = freshFulfilled >= totalRequired ? 'picked' : 'picking';
        if (!fStatus || ['planned', 'planning', 'picking', 'confirmed'].includes(fStatus)) {
          updateShowFulfillmentStatus.mutate({ status: newStatus });
        }
        if (freshFulfilled >= totalRequired && totalRequired > 0) {
          setTimeout(() => toast.success('🎉 All items picked!', { duration: 5000 }), 400);
        }
      },
      onError: (err) => {
        const result = { success: false, message: err.message || 'Scan failed', ts: new Date() };
        setLastResult(result); setSessionLog(prev => [result, ...prev.slice(0, 49)]);
        toast.error(result.message);
      },
    });
    setBarcode(''); inputRef.current?.focus();
  };

  const handleCameraScan = (code) => { setCameraOpen(false); handleScan(code); };

  const handleMoveToTruck = () => {
    // Send all packed items (and any remaining picked if no packed exist)
    const packedIds = activeFulfillments.filter(f => f.movement_state === 'packed').map(f => f.id);
    const idsToSend = packedIds.length > 0 ? packedIds : pickedIds;
    if (idsToSend.length === 0) return;
    updateFulfillmentStateMutation.mutate({ ids: idsToSend, state: 'on_truck' }, {
      onSuccess: async () => {
        updateShowFulfillmentStatus.mutate({ status: 'on_truck' });
        // Lock all affected assets
        const affectedFulfillments = activeFulfillments.filter(f => idsToSend.includes(f.id));
        const now = new Date().toISOString();
        await Promise.all(affectedFulfillments.map(f =>
          db.entities.Asset.update(f.asset_id, {
            status: 'checked_out', locked_to_show_id: selectedShowId, locked_to_show_name: selectedShow?.name, locked_at: now,
          })
        ));
        queryClient.invalidateQueries({ queryKey: ['assets'] });
      },
    });
  };
  const handleMoveToLocation = () => {
    const ids = activeFulfillments.filter(f => f.movement_state === 'on_truck').map(f => f.id);
    if (ids.length === 0) return;
    updateFulfillmentStateMutation.mutate({ ids, state: 'on_location' }, {
      onSuccess: () => updateShowFulfillmentStatus.mutate({ status: 'on_location' }),
    });
  };
  const handleMarkReturning = () => {
    updateShowFulfillmentStatus.mutate({ status: 'returning' });
    setScanMode('return'); setTab('scan');
    toast.info('Switched to return mode');
  };

  const pct = totalRequired > 0 ? Math.round((totalFulfilled / totalRequired) * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ScanLine className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Warehouse Scan & Pick</h1>
            <p className="text-sm text-muted-foreground">Scan serials to confirm gear out — live pick list updates in real time</p>
          </div>
        </div>
        {selectedShow && (() => {
          const style = statusFlow.style(selectedShow.status);
          const label = statusFlow.label(selectedShow.status);
          return <Badge className="text-sm px-3 py-1.5" style={style}>{label}</Badge>;
        })()}
      </div>

      {/* Project selector */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Active Project</label>
              <Select value={selectedShowId} onValueChange={setSelectedShowId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a project..." />
                </SelectTrigger>
                <SelectContent>
                  {shows.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedShow && (
              <div className="text-sm space-y-0.5 shrink-0">
                {selectedShow.venue && <p className="font-medium">{selectedShow.venue}</p>}
                {selectedShow.start_date && <p className="text-muted-foreground">{selectedShow.start_date}</p>}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedShow && (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="scan" className="flex-1 md:flex-none">
              <QrCode className="w-4 h-4 mr-1.5" /> Scan
            </TabsTrigger>
            <TabsTrigger value="picklist" className="flex-1 md:flex-none">
              <Boxes className="w-4 h-4 mr-1.5" /> Pick List
              {pickListItems.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs">{totalFulfilled}/{totalRequired}</Badge>
              )}
            </TabsTrigger>
            {isManagerOrAbove && (
              <TabsTrigger value="approvals" className="flex-1 md:flex-none relative">
                <ShieldAlert className="w-4 h-4 mr-1.5" /> Approvals
                {approvalRequests.filter(r => r.status === 'pending').length > 0 && (
                  <Badge className="ml-1.5 text-xs bg-amber-500 text-white border-0">
                    {approvalRequests.filter(r => r.status === 'pending').length}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="container" className="flex-1 md:flex-none">
              <Boxes className="w-4 h-4 mr-1.5" /> Container
            </TabsTrigger>
            <TabsTrigger value="truck" className="flex-1 md:flex-none">
              <Truck className="w-4 h-4 mr-1.5" /> Move
            </TabsTrigger>
          </TabsList>

          {/* ── SCAN TAB ── */}
          <TabsContent value="scan" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* Left: scanner panel */}
              <div className="lg:col-span-2 space-y-3">

                {/* Mode selector — large cards */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'pick',     label: 'Pick',       subtitle: 'Stage gear',        icon: Package,   bg: 'bg-amber-500/10',  border: 'border-amber-500/40',  text: 'text-amber-500',  locked: false },
                    { value: 'send',     label: 'Send',       subtitle: 'Load onto truck',   icon: Truck,     bg: 'bg-blue-500/10',   border: 'border-blue-500/40',   text: 'text-blue-400',   locked: !isQuoteConfirmed },
                    { value: 'return',   label: 'Return',     subtitle: 'Back to stock',     icon: RotateCcw, bg: 'bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-500', locked: false },
                    { value: 'hospital', label: 'AV Hospital',subtitle: 'Report broken gear',icon: Wrench,    bg: 'bg-red-500/10',    border: 'border-red-500/40',    text: 'text-red-500',    locked: false },
                  ].map(({ value, label, subtitle, icon: Icon, bg, border, text, locked }) => (
                    <button key={value}
                      onClick={() => { if (!locked) setScanMode(value); else toast.warning('Quote must be confirmed first'); }}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                        scanMode === value
                          ? `${bg} ${border} ${text} shadow-sm`
                          : "border-border/50 text-muted-foreground hover:bg-secondary/40",
                        locked && "opacity-40 cursor-not-allowed"
                      )}>
                      <Icon className={cn("w-5 h-5", scanMode === value ? text : "text-muted-foreground")} />
                      <span className="font-semibold text-sm">{label}</span>
                      <span className="text-xs opacity-70 text-center leading-tight">{locked ? 'Quote needed' : subtitle}</span>
                    </button>
                  ))}
                </div>

                {/* Scan input */}
                <Card className={cn("border-2 transition-colors",
                  scanMode === 'pick'     ? 'border-amber-500/30' :
                  scanMode === 'send'     ? 'border-blue-500/30' :
                  scanMode === 'hospital' ? 'border-red-500/30' :
                  'border-orange-500/30'
                )}>
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <form onSubmit={e => { e.preventDefault(); handleScan(); }} className="flex gap-2">
                      <Input
                        ref={inputRef} placeholder="Scan or type barcode / serial..."
                        value={barcode} onChange={e => setBarcode(e.target.value)}
                        className="font-mono text-base h-12 border-border/60 focus:border-primary"
                        autoComplete="off"
                      />
                      <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={() => setCameraOpen(true)}>
                        <Camera className="w-5 h-5" />
                      </Button>
                      <Button type="submit"
                        className={cn("h-12 px-5 font-semibold shrink-0",
                          scanMode === 'pick'     ? 'bg-amber-500 hover:bg-amber-600 text-white' :
                          scanMode === 'send'     ? 'bg-blue-500 hover:bg-blue-600 text-white' :
                          scanMode === 'hospital' ? 'bg-red-600 hover:bg-red-700 text-white' :
                          'bg-orange-500 hover:bg-orange-600 text-white'
                        )}
                        disabled={fulfillMutation.isPending || !barcode.trim()}>
                        {fulfillMutation.isPending ? '…' :
                          scanMode === 'pick'     ? 'Pick' :
                          scanMode === 'send'     ? 'Send' :
                          scanMode === 'hospital' ? 'Flag' : 'Return'}
                      </Button>
                    </form>

                    {/* Last result */}
                    {lastResult && (
                      <div className={cn("flex items-start gap-2.5 p-3 rounded-lg text-sm border",
                        lastResult.type === 'unassigned' ? "bg-amber-500/10 text-amber-600 border-amber-500/30" :
                        lastResult.type === 'hospital'   ? "bg-red-500/10 text-red-400 border-red-500/30" :
                        lastResult.success
                          ? lastResult.type === 'return' ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                          : lastResult.type === 'send'   ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20")}>
                        {lastResult.type === 'unassigned' ? <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                          : lastResult.type === 'hospital' ? <Wrench className="w-4 h-4 shrink-0 mt-0.5" />
                          : lastResult.success
                            ? lastResult.type === 'return' ? <RotateCcw className="w-4 h-4 shrink-0 mt-0.5" />
                            : lastResult.type === 'send'   ? <Truck className="w-4 h-4 shrink-0 mt-0.5" />
                            : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                        <div>
                          <span className="font-medium">{lastResult.message}</span>
                          {lastResult.type === 'unassigned' && (
                            <p className="text-xs mt-0.5 opacity-75">Sent to approval queue</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pick progress bar */}
                    {totalRequired > 0 && (
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                          <span>Pick progress</span>
                          <span className={cn("font-semibold", isFullyPicked && "text-emerald-500")}>{totalFulfilled}/{totalRequired} ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", isFullyPicked ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} />
                        </div>
                        {isFullyPicked && (
                          <p className="text-xs text-emerald-500 font-medium mt-1.5 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> All items picked!
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Session log */}
                {sessionLog.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2 pt-3 px-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" /> Session Log</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{sessionLog.length}</Badge>
                          <button onClick={() => setSessionLog([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 pb-3">
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {sessionLog.map((item, idx) => (
                          <div key={idx} className={cn("flex items-center gap-2 px-2 py-1.5 rounded text-xs",
                            item.type === 'unassigned' ? "bg-amber-500/10 text-amber-600" :
                            item.type === 'hospital'   ? "bg-red-500/10 text-red-400" :
                            !item.success ? "bg-red-500/10 text-red-400" :
                            item.type === 'return' ? "bg-orange-500/10 text-orange-400" :
                            item.type === 'send'   ? "bg-blue-500/10 text-blue-400" :
                            "bg-emerald-500/10 text-emerald-400")}>
                            {item.type === 'unassigned' ? <ShieldAlert className="w-3 h-3 shrink-0" />
                              : item.type === 'hospital' ? <Wrench className="w-3 h-3 shrink-0" />
                              : !item.success ? <XCircle className="w-3 h-3 shrink-0" />
                              : item.type === 'return' ? <RotateCcw className="w-3 h-3 shrink-0" />
                              : item.type === 'send'   ? <Truck className="w-3 h-3 shrink-0" />
                              : <CheckCircle className="w-3 h-3 shrink-0" />}
                            <span className="flex-1 truncate">{item.message}</span>
                            <span className="text-muted-foreground shrink-0 text-[10px]">
                              {item.ts?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: live pick list */}
              <div className="lg:col-span-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Live Pick List</h3>
                    <p className="text-xs text-muted-foreground">{totalFulfilled} of {totalRequired} scanned</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" title="Sync" onClick={async () => {
                      await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ['show_requirements_all', selectedShowId] }),
                        queryClient.invalidateQueries({ queryKey: ['show_fulfillments', selectedShowId] }),
                        queryClient.invalidateQueries({ queryKey: ['assets'] }),
                        queryClient.invalidateQueries({ queryKey: ['shows_active'] }),
                        queryClient.invalidateQueries({ queryKey: ['shows'] }),
                        queryClient.invalidateQueries({ queryKey: ['show', selectedShowId] }),
                        queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', selectedShowId] }),
                      ]);
                      const [freshFulfillments, freshReqs] = await Promise.all([
                        queryClient.fetchQuery({ queryKey: ['show_fulfillments', selectedShowId], queryFn: () => db.entities.ShowFulfillment.filter({ show_id: selectedShowId }), staleTime: 0 }),
                        queryClient.fetchQuery({ queryKey: ['show_requirements_all', selectedShowId], queryFn: () => db.entities.ShowRequirement.filter({ show_id: selectedShowId }), staleTime: 0 }),
                      ]);
                      const freshActive = freshFulfillments.filter(f => f.movement_state !== 'returned');
                      const freshTotal = freshReqs.reduce((s, r) => s + (r.quantity_needed || 1), 0);
                      const freshFulfilled = freshReqs.reduce((s, r) => {
                        const count = freshActive.filter(f => f.requirement_id === r.id).length;
                        return s + Math.min(count, r.quantity_needed || 1);
                      }, 0);
                      const curStatus = selectedShow?.status;
                      if (freshTotal > 0 && freshFulfilled > 0 && curStatus !== 'planning') {
                        const correctStatus = freshFulfilled >= freshTotal ? 'picked' : 'picking';
                        if (curStatus === 'confirmed' || curStatus === 'picking') updateShowFulfillmentStatus.mutate({ status: correctStatus });
                      }
                      toast.success('Sync complete');
                    }}><RefreshCw className="w-3.5 h-3.5" /></Button>
                    <Button variant="outline" size="sm" onClick={() => setShowPrint(true)}><Printer className="w-3.5 h-3.5 mr-1" /> Print</Button>
                    <Button variant="ghost" size="sm" onClick={() => setTab('picklist')}><Boxes className="w-3.5 h-3.5 mr-1" /> Full View</Button>
                  </div>
                </div>

                {pickListItems.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                      <p className="font-medium text-muted-foreground">No gear planned yet</p>
                      <p className="text-sm text-muted-foreground mt-1">Add items in Room Planning on the Show page</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                    {groupedItems.map((group, idx) => (
                      <RoomGroup key={idx} roomName={group.name} items={group.items} fulfillments={fulfillments}
                        onRemoveFulfillment={removeFulfillmentMutation.mutate} canManage={isManagerOrAbove}
                        onPushBulk={pushBulkMutation.mutate} assets={assets} />
                    ))}
                  </div>
                )}

                {approvalRequests.filter(r => r.status === 'pending').length > 0 && (
                  <button onClick={() => setTab('approvals')}
                    className="w-full flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-600 hover:bg-amber-500/15 transition-colors text-left">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 font-medium">
                      {approvalRequests.filter(r => r.status === 'pending').length} item{approvalRequests.filter(r => r.status === 'pending').length !== 1 ? 's' : ''} awaiting approval
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── PICK LIST TAB (full / filterable) ── */}
          <TabsContent value="picklist" className="mt-4 space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Pick List — {selectedShow.name}</h3>
                <p className="text-sm text-muted-foreground">{totalFulfilled} of {totalRequired} items picked ({pct}%)</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowPrint(true)}>
                <Printer className="w-4 h-4 mr-1.5" /> Print / Export
              </Button>
            </div>

            {/* Search + filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search product or serial..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-1.5">
                {[{ value: 'all', label: 'All' }, { value: 'incomplete', label: 'Incomplete' }, { value: 'complete', label: 'Complete' }]
                  .map(f => (
                    <button key={f.value} onClick={() => setStatusFilter(f.value)}
                      className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
                        statusFilter === f.value ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:bg-secondary/50")}>
                      {f.label}
                    </button>
                  ))}
              </div>
            </div>

            {pickListItems.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <p className="text-muted-foreground font-medium">No gear planned for this project</p>
                  <p className="text-sm text-muted-foreground mt-1">Add planned items in Room Planning on the Show page — only planned items can be scanned out</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {groupedItems.map((group, idx) => (
                  <RoomGroup key={idx} roomName={group.name} items={group.items} fulfillments={fulfillments} onRemoveFulfillment={removeFulfillmentMutation.mutate} canManage={isManagerOrAbove} onPushBulk={pushBulkMutation.mutate} assets={assets} />
                ))}
                {filteredItems.length === 0 && (
                  <Card>
                    <CardContent className="py-10 text-center text-muted-foreground text-sm">No items match filter</CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* All picked items — view & manage */}
            {activeFulfillments.length > 0 && (
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-muted-foreground" />
                    All Picked Items ({activeFulfillments.length})
                    {isManagerOrAbove && <span className="text-xs font-normal text-muted-foreground ml-auto">Click <Trash2 className="inline w-3 h-3" /> to remove a record</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 max-h-72 overflow-y-auto">
                  {activeFulfillments.map(f => (
                    <div key={f.id} className="flex items-center gap-2 p-2 rounded bg-secondary/30 text-xs border border-border/30">
                      <Barcode className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="font-mono font-semibold text-primary">{f.asset_barcode || f.asset_serial || f.asset_id}</span>
                      <span className="flex-1 truncate font-medium">{f.asset_name}</span>
                      {f.room_name && <span className="text-muted-foreground shrink-0">{f.room_name}</span>}
                      {(() => {
                       const st = ITEM_STAGES[f.movement_state] || ITEM_STAGES.picked;
                       return (
                         <Badge variant="outline" className={cn("text-xs shrink-0", st.color, st.border)}>
                           {st.label}
                         </Badge>
                       );
                      })()}
                      {isManagerOrAbove && (
                        <button
                          title="Remove this fulfillment record"
                          onClick={() => removeFulfillmentMutation.mutate(f)}
                          disabled={removeFulfillmentMutation.isPending}
                          className="ml-1 p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── APPROVALS TAB ── */}
          <TabsContent value="approvals" className="mt-4 space-y-4">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" /> Approval Queue — {selectedShow.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Items scanned that are not on the project pick list. Requires manager or admin approval before being added.</p>
            </div>

            {approvalRequests.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <CheckCheck className="w-10 h-10 mx-auto mb-3 text-emerald-500 opacity-40" />
                  <p className="font-medium text-muted-foreground">No approval requests</p>
                  <p className="text-sm text-muted-foreground mt-1">All scanned items were on the project pick list</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {/* Pending */}
                {approvalRequests.filter(r => r.status === 'pending').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Pending ({approvalRequests.filter(r => r.status === 'pending').length})
                    </p>
                    {approvalRequests.filter(r => r.status === 'pending').map(req => (
                      <Card key={req.id} className="border-amber-500/30">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            <div className="flex-1 space-y-1">
                              <p className="font-semibold">{req.asset_name}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {req.asset_barcode && <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{req.asset_barcode}</span>}
                                {req.serial_number && <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{req.serial_number}</span>}
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                                <span>Scanned by: <span className="text-foreground font-medium">{req.requested_by}</span></span>
                                {req.sub_location_name && <span>Location: <span className="text-foreground font-medium">{req.sub_location_name}</span></span>}
                                {req.scanned_at && <span>{new Date(req.scanned_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                              </div>
                              {req.notes && <p className="text-xs text-muted-foreground italic mt-1">"{req.notes}"</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {isManagerOrAbove ? (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    disabled={approveRequestMutation.isPending}
                                    onClick={() => approveRequestMutation.mutate({ request: req })}
                                  >
                                    <CheckCheck className="w-3.5 h-3.5 mr-1" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-red-500/40 text-red-500 hover:bg-red-500/10"
                                    disabled={rejectRequestMutation.isPending}
                                    onClick={() => rejectRequestMutation.mutate({ requestId: req.id })}
                                  >
                                    <Ban className="w-3.5 h-3.5 mr-1" /> Reject
                                  </Button>
                                </>
                              ) : (
                                <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-xs">
                                  Awaiting Approval
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Resolved */}
                {approvalRequests.filter(r => r.status !== 'pending').length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-4">Resolved</p>
                    {approvalRequests.filter(r => r.status !== 'pending').map(req => (
                      <div key={req.id} className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border text-sm",
                        req.status === 'approved' ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
                      )}>
                        {req.status === 'approved'
                          ? <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                          : <Ban className="w-4 h-4 text-red-500 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{req.asset_name}</span>
                          {req.rejected_reason && <span className="text-muted-foreground ml-2 text-xs">— {req.rejected_reason}</span>}
                        </div>
                        <Badge variant="outline" className={cn("text-xs", req.status === 'approved' ? "text-emerald-500 border-emerald-500/30" : "text-red-500 border-red-500/30")}>
                          {req.status === 'approved' ? 'Approved' : 'Rejected'}
                        </Badge>
                        {req.approved_by && <span className="text-xs text-muted-foreground shrink-0">by {req.approved_by}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── CONTAINER TAB ── */}
          <TabsContent value="container" className="mt-4">
            <div className="mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Boxes className="w-5 h-5 text-primary" /> Container Packing — {selectedShow.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-0.5">Scan a container QR, fill it with items, then close it. All items are automatically picked to this show.</p>
            </div>
            <ContainerScanMode
              selectedShow={selectedShow}
              user={user}
              assets={assets}
              fulfillments={fulfillments}
              requirements={requirements}
              onItemPicked={() => {
                queryClient.invalidateQueries({ queryKey: ['show_fulfillments', selectedShowId] });
                queryClient.invalidateQueries({ queryKey: ['assets'] });
              }}
            />
          </TabsContent>

          {/* ── TRUCK / MOVE TAB ── */}
          <TabsContent value="truck" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Movement Control — {selectedShow.name}</h3>
              <Button variant="outline" size="sm" onClick={() => setShowPrint(true)}>
                <Printer className="w-4 h-4 mr-1.5" /> Print Pack List
              </Button>
            </div>

            {/* Pipeline counters */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { state: 'picked',      label: 'Staged',      sublabel: 'Ready to load',  color: 'text-amber-500', bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
                { state: 'on_truck',    label: 'On Truck',    sublabel: 'Locked to show', color: 'text-blue-400',  bg: 'bg-blue-500/10',   border: 'border-blue-500/30' },
                { state: 'on_location', label: 'On Location', sublabel: 'At venue',        color: 'text-primary',   bg: 'bg-primary/10',    border: 'border-primary/30' },
              ].map(({ state, label, sublabel, color, bg, border }) => {
                const count = activeFulfillments.filter(f =>
                  state === 'on_truck'
                    ? (f.movement_state === 'on_truck' || f.movement_state === 'packed')
                    : f.movement_state === state
                ).length;
                return (
                  <div key={state} className={cn("p-4 rounded-xl border text-center", bg, border)}>
                    <div className={cn("text-3xl font-bold tabular-nums", color)}>{count}</div>
                    <div className={cn("text-sm font-semibold mt-0.5", color)}>{label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{sublabel}</div>
                  </div>
                );
              })}
            </div>

            {activeFulfillments.filter(f => LOCKED_STATES.includes(f.movement_state)).length > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
                <Lock className="w-4 h-4 shrink-0" />
                <span><strong>{activeFulfillments.filter(f => LOCKED_STATES.includes(f.movement_state)).length} items</strong> locked to this show — cannot be used by another project until returned.</span>
              </div>
            )}

            {/* Action cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Load onto truck */}
              <Card className={cn("border-2", isQuoteConfirmed ? "border-blue-500/30" : "border-border/40 opacity-60")}>
                <CardContent className="pt-5 pb-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-500/10"><Truck className="w-6 h-6 text-blue-400" /></div>
                    <div>
                      <p className="font-semibold">Load onto Truck</p>
                      <p className="text-xs text-muted-foreground">{pickedIds.length} staged items</p>
                    </div>
                  </div>
                  {!isQuoteConfirmed && (
                    <p className="text-xs text-amber-500 flex items-center gap-1"><Lock className="w-3 h-3" /> Quote must be confirmed</p>
                  )}
                  {!isFullyPicked && totalRequired > 0 && isQuoteConfirmed && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-500">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {totalRequired - totalFulfilled} items still unpicked
                    </div>
                  )}
                  <Button className="w-full bg-blue-500 hover:bg-blue-600 text-white mt-auto"
                    disabled={pickedIds.length === 0 || !isQuoteConfirmed || updateFulfillmentStateMutation.isPending}
                    onClick={handleMoveToTruck}>
                    <Truck className="w-4 h-4 mr-2" /> Send {pickedIds.length} to Truck
                  </Button>
                </CardContent>
              </Card>

              {/* On Location */}
              <Card className="border-2 border-primary/20">
                <CardContent className="pt-5 pb-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-primary/10"><MapPin className="w-6 h-6 text-primary" /></div>
                    <div>
                      <p className="font-semibold">Mark On Location</p>
                      <p className="text-xs text-muted-foreground">Gear arrived at venue</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full border-primary/40 text-primary hover:bg-primary/10 mt-auto"
                    onClick={handleMoveToLocation}
                    disabled={!activeFulfillments.some(f => f.movement_state === 'on_truck' || f.movement_state === 'packed')}>
                    <MapPin className="w-4 h-4 mr-2" /> Confirm On Location
                  </Button>
                </CardContent>
              </Card>

              {/* Return */}
              <Card className="border-2 border-orange-500/20">
                <CardContent className="pt-5 pb-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-orange-500/10"><RotateCcw className="w-6 h-6 text-orange-500" /></div>
                    <div>
                      <p className="font-semibold">Return Gear</p>
                      <p className="text-xs text-muted-foreground">{activeFulfillments.length} items out</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full border-orange-500/40 text-orange-500 hover:bg-orange-500/10 mt-auto"
                    onClick={handleMarkReturning}>
                    <RotateCcw className="w-4 h-4 mr-2" /> Start Return Scanning
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {!selectedShow && (
        <Card>
          <CardContent className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <ScanLine className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Select a Project to Begin</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Choose an active project above. All assigned gear will appear as your live pick list — scan serial numbers to confirm items out.
            </p>
          </CardContent>
        </Card>
      )}

      {cameraOpen && <CameraScanner onScan={handleCameraScan} onClose={() => setCameraOpen(false)} />}

      {showPrint && selectedShow && (
        <PickListPrint
          show={selectedShow}
          requirements={pickListItems}
          fulfillments={fulfillments}
          rooms={rooms}
          onClose={() => setShowPrint(false)}
        />
      )}

      <AVHospitalScanDialog
        open={!!avHospitalAsset}
        onOpenChange={(v) => { if (!v) setAvHospitalAsset(null); }}
        asset={avHospitalAsset}
        show={selectedShow}
        user={user}
      />

      {additionalEquipAsset && selectedShow && (
        <AdditionalEquipmentDialog
          open={!!additionalEquipAsset}
          onOpenChange={(open) => { if (!open) setAdditionalEquipAsset(null); }}
          asset={additionalEquipAsset}
          show={selectedShow}
          subLocations={rooms}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['additionalEquipmentRequests', selectedShowId] });
            setAdditionalEquipAsset(null);
            const logItem = {
              success: false,
              message: `${additionalEquipAsset?.name} — moved to approval queue. Awaiting manager/admin approval.`,
              type: 'unassigned',
              ts: new Date(),
            };
            setSessionLog(prev => [logItem, ...prev.slice(0, 49)]);
            toast.warning('Item not on project — approval request submitted');
          }}
        />
      )}
    </div>
  );
}