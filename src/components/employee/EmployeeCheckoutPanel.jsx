import React, { useState, useRef, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ScanBarcode, Package, XCircle, AlertCircle, Search, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getSerialNumbersArray } from '@/lib/serialNumbers';

// Direct DB lookup — fetches fresh from server each time, bypasses all cache/state issues.
// Searches barcode, serial_number, and serial_numbers (comma list).
// Case-insensitive, leading zeros safe (all string comparison).
async function lookupAssetByCode(rawCode) {
  const val = String(rawCode).trim();
  const valLower = val.toLowerCase();

  console.log('[AssetLookup] raw input:', JSON.stringify(val));

  // Fetch ALL assets fresh — no limit issues, no stale cache
  const allAssets = await db.entities.Asset.list('-created_date', 5000);
  console.log('[AssetLookup] total assets fetched:', allAssets.length);

  // Log first few barcodes so we can verify the field name
  console.log('[AssetLookup] sample barcodes:', allAssets.slice(0, 5).map(a => ({ id: a.id, barcode: a.barcode, serial_number: a.serial_number, name: a.name })));

  // Search barcode field
  let found = allAssets.find(a => a.barcode != null && String(a.barcode).trim().toLowerCase() === valLower);
  if (found) {
    console.log('[AssetLookup] matched on barcode:', found.barcode, '->', found.name);
    return found;
  }

  // Search serial_number field
  found = allAssets.find(a => a.serial_number != null && String(a.serial_number).trim().toLowerCase() === valLower);
  if (found) {
    console.log('[AssetLookup] matched on serial_number:', found.serial_number, '->', found.name);
    return found;
  }

  // Search serial_numbers (comma-separated list)
  found = allAssets.find(a => {
    const serials = getSerialNumbersArray(a);
    return serials.length > 0 && serials.map(s => s.toLowerCase()).includes(valLower);
  });
  if (found) {
    console.log('[AssetLookup] matched on serial_numbers field:', found.serial_numbers, '->', found.name);
    return found;
  }

  // Log a specific check for the typed code so we can see why it didn't match
  console.warn('[AssetLookup] NOT FOUND for:', JSON.stringify(valLower));
  const closeMatches = allAssets.filter(a =>
    (a.barcode && String(a.barcode).toLowerCase().includes(valLower.slice(0, 4))) ||
    (a.name && a.name.toLowerCase().includes(valLower.slice(0, 4)))
  ).slice(0, 3);
  console.log('[AssetLookup] possible near-matches:', closeMatches.map(a => ({ barcode: a.barcode, name: a.name })));

  return null;
}

export default function EmployeeCheckoutPanel({ crewMember, readOnly = false }) {
  const [mode, setMode] = useState('checkout'); // 'checkout' | 'checkin'
  const [assetInput, setAssetInput] = useState('');
  const [resolvedAsset, setResolvedAsset] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const inputRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    db.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  // Load assets currently held by this crew member
  const { data: heldAssets = [], isLoading: loadingHeld } = useQuery({
    queryKey: ['employeeAssets', crewMember.id],
    queryFn: () => db.entities.Asset.filter({ employee_checkout_id: crewMember.id }),
    enabled: !!crewMember.id,
  });

  // Lookup: always fetches fresh from server — no stale cache, no partial lists
  const handleLookup = async () => {
    const raw = assetInput.trim();
    if (!raw) return;
    setSearching(true);
    setSearchError('');
    setResolvedAsset(null);

    const found = await lookupAssetByCode(raw);
    setSearching(false);

    if (!found) {
      setSearchError(`No asset found with code "${raw}". Check the barcode or serial number and try again.`);
      return;
    }
    setResolvedAsset(found);
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const asset = resolvedAsset;
      if (!asset) return;

      if (asset.employee_checkout_id && asset.employee_checkout_id !== crewMember.id) {
        throw new Error(`Asset is already checked out to another employee.`);
      }
      if (asset.employee_checkout_id === crewMember.id) {
        throw new Error(`Asset is already checked out to you.`);
      }
      if (asset.current_show_id) {
        throw new Error(`Asset is currently assigned to a project. Check it back in from the project first.`);
      }

      const actorLabel = currentUser?.email || currentUser?.full_name || 'unknown';

      await db.entities.Asset.update(asset.id, {
        employee_checkout_id: crewMember.id,
        employee_checkout_name: crewMember.email,
        employee_checkout_date: new Date().toISOString(),
        status: 'checked_out',
      });

      const existing = crewMember.employee_checkout_asset_ids || [];
      if (!existing.includes(asset.id)) {
        await db.entities.CrewMember.update(crewMember.id, {
          employee_checkout_asset_ids: [...existing, asset.id],
        });
      }

      // Write movement audit record
      await db.entities.AssetMovement.create({
        asset_id: asset.id,
        asset_name: asset.name,
        asset_barcode: asset.barcode || '',
        action: 'check_out',
        scanned_by: actorLabel,
        scanned_by_user_id: currentUser?.id || '',
        from_location: asset.location || 'Warehouse',
        to_location: `Employee Hold — ${crewMember.email}`,
        notes: `Employee checkout by ${actorLabel} for ${crewMember.email}`,
      });
    },
    onSuccess: () => {
      toast.success(`Checked out: ${resolvedAsset?.name}`);
      setAssetInput('');
      setResolvedAsset(null);
      queryClient.invalidateQueries({ queryKey: ['employeeAssets', crewMember.id] });
      queryClient.invalidateQueries({ queryKey: ['crewMembers'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      inputRef.current?.focus();
    },
    onError: (err) => toast.error(err.message),
  });

  const checkinMutation = useMutation({
    mutationFn: async (assetId) => {
      const actorLabel = currentUser?.email || currentUser?.full_name || 'unknown';

      // Find the asset from the held list for movement data
      const asset = heldAssets.find(a => a.id === assetId);

      await db.entities.Asset.update(assetId, {
        employee_checkout_id: null,
        employee_checkout_name: null,
        employee_checkout_date: null,
        status: 'available',
      });
      const existing = crewMember.employee_checkout_asset_ids || [];
      await db.entities.CrewMember.update(crewMember.id, {
        employee_checkout_asset_ids: existing.filter(id => id !== assetId),
      });

      // Write movement audit record
      await db.entities.AssetMovement.create({
        asset_id: assetId,
        asset_name: asset?.name || assetId,
        asset_barcode: asset?.barcode || '',
        action: 'check_in',
        scanned_by: actorLabel,
        scanned_by_user_id: currentUser?.id || '',
        from_location: `Employee Hold — ${crewMember.email}`,
        to_location: 'Warehouse',
        notes: `Employee return by ${actorLabel}`,
      });
    },
    onSuccess: () => {
      toast.success('Asset checked back in');
      queryClient.invalidateQueries({ queryKey: ['employeeAssets', crewMember.id] });
      queryClient.invalidateQueries({ queryKey: ['crewMembers'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCheckinScan = async (e) => {
    if (e.key !== 'Enter') return;
    const raw = assetInput.trim();
    if (!raw) return;
    setSearchError('');

    const asset = await lookupAssetByCode(raw);
    if (!asset) { setSearchError(`No asset found: "${raw}"`); return; }
    if (asset.employee_checkout_id !== crewMember.id) {
      setSearchError('This asset is not checked out to this employee.'); return;
    }
    checkinMutation.mutate(asset.id);
    setAssetInput('');
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      {!readOnly && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={mode === 'checkout' ? 'default' : 'outline'}
            onClick={() => { setMode('checkout'); setResolvedAsset(null); setAssetInput(''); setSearchError(''); }}
          >
            <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" /> Check Out
          </Button>
          <Button
            size="sm"
            variant={mode === 'checkin' ? 'default' : 'outline'}
            onClick={() => { setMode('checkin'); setResolvedAsset(null); setAssetInput(''); setSearchError(''); }}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 mr-1.5" /> Check In
          </Button>
        </div>
      )}

      {/* Checkout scan */}
      {!readOnly && mode === 'checkout' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={assetInput}
                onChange={e => { setAssetInput(e.target.value); setSearchError(''); setResolvedAsset(null); }}
                onKeyDown={e => { if (e.key === 'Enter') handleLookup(); }}
                placeholder="Scan barcode or type exact Asset ID…"
                className="pl-9 font-mono"
                autoFocus
              />
            </div>
            <Button onClick={handleLookup} disabled={!assetInput.trim() || searching} size="sm">
              <Search className="w-4 h-4 mr-1.5" />{searching ? 'Searching…' : 'Find'}
            </Button>
          </div>

          {searchError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />{searchError}
            </div>
          )}

          {resolvedAsset && (
            <div className="p-3 rounded-lg border bg-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{resolvedAsset.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">Barcode: {resolvedAsset.barcode || '—'}</p>
                  {resolvedAsset.serial_number && <p className="text-xs text-muted-foreground font-mono">Serial: {resolvedAsset.serial_number}</p>}
                  {resolvedAsset.category && <p className="text-xs text-muted-foreground">{resolvedAsset.category}</p>}
                </div>
                <StatusPill asset={resolvedAsset} />
              </div>
              {resolvedAsset.employee_checkout_id && resolvedAsset.employee_checkout_id !== crewMember.id && (
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Held by another employee — cannot check out
                </div>
              )}
              {resolvedAsset.current_show_id && (
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertCircle className="w-3.5 h-3.5" /> Assigned to a project — cannot check out
                </div>
              )}
              <Button
                size="sm"
                onClick={() => checkoutMutation.mutate()}
                disabled={
                  checkoutMutation.isPending ||
                  (resolvedAsset.employee_checkout_id && resolvedAsset.employee_checkout_id !== crewMember.id) ||
                  !!resolvedAsset.current_show_id
                }
                className="w-full"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" />
                {checkoutMutation.isPending ? 'Checking out…' : `Check Out "${resolvedAsset.name}"`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Check-in scan */}
      {!readOnly && mode === 'checkin' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={assetInput}
                onChange={e => { setAssetInput(e.target.value); setSearchError(''); }}
                onKeyDown={handleCheckinScan}
                placeholder="Scan barcode or type exact Asset ID to check in…"
                className="pl-9 font-mono"
              />
            </div>
          </div>
          {searchError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />{searchError}
            </div>
          )}
        </div>
      )}

      {/* Currently held assets */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Currently Checked Out ({heldAssets.length})
        </p>
        {loadingHeld && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loadingHeld && heldAssets.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No assets currently checked out.</p>
        )}
        {heldAssets.map(asset => (
          <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg border bg-card gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{asset.name}</p>
                <p className="text-xs font-mono text-muted-foreground">{asset.barcode}</p>
                {asset.employee_checkout_date && (
                  <p className="text-xs text-muted-foreground">
                    Since {format(new Date(asset.employee_checkout_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">Employee Hold</Badge>
              {!readOnly && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => checkinMutation.mutate(asset.id)}
                  disabled={checkinMutation.isPending}
                >
                  <ArrowUpFromLine className="w-3.5 h-3.5 mr-1" /> Return
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ asset }) {
  if (asset.employee_checkout_id) return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">Employee Hold</Badge>;
  if (asset.current_show_id) return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs">On Project</Badge>;
  if (asset.status === 'maintenance') return <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">Maintenance</Badge>;
  return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">Available</Badge>;
}