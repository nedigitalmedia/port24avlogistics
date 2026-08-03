import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ScanLine, CheckCircle2, AlertTriangle, Trash2, HeartPulse,
  Search, ArrowLeft, Flag, PackageCheck, ClipboardCheck,
  XCircle, ChevronRight, Loader2, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { getSerialNumbersArray } from '@/lib/serialNumbers';

const TABS = [
  { id: 'scan',     label: 'Scan Assets' },
  { id: 'list',     label: 'Asset List' },
  { id: 'finalize', label: 'Finalize / Decisions' },
];

const EXPORT_FILTERS = [
  { value: 'all',               label: 'All Assets' },
  { value: 'not_reviewed',      label: 'Not Reviewed Only' },
  { value: 'confirmed',         label: 'Confirmed Only' },
  { value: 'missing_candidate', label: 'Missing Candidates Only' },
  { value: 'sent_to_hospital',  label: 'Sent to Hospital Only' },
  { value: 'deleted',           label: 'Deleted Only' },
];

function ProgressBar({ value, max }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-primary shrink-0">{pct}%</span>
    </div>
  );
}

// Excel export — one row per asset, each asset tag in its own cell column
function exportToExcel(reviewItems, reviewName, exportFilter) {
  const items = exportFilter === 'all'
    ? reviewItems
    : reviewItems.filter(i => i.review_status === exportFilter);

  // Sort: confirmed first, then not_reviewed, then missing, then rest
  const order = { confirmed: 0, not_reviewed: 1, missing_candidate: 2, sent_to_hospital: 3, deleted: 4 };
  const sorted = [...items].sort((a, b) => (order[a.review_status] ?? 9) - (order[b.review_status] ?? 9));

  const statusLabels = {
    not_reviewed: 'Not Reviewed',
    confirmed: 'Confirmed Present',
    missing_candidate: 'Missing',
    sent_to_hospital: 'Sent to Hospital / Lost',
    deleted: 'Deleted',
  };

  // Build rows — each asset tag gets its own column
  const rows = sorted.map(item => ({
    'Asset Name':          item.asset_name,
    'Asset Tag / Barcode': item.asset_barcode || '',
    'Category':            item.asset_category || '',
    'Last Known Location': item.asset_location || '',
    'Inventory Status':    item.asset_status || '',
    'Review Status':       statusLabels[item.review_status] || item.review_status,
    'Scanned By':          item.scanned_by || '',
    'Scanned At':          item.scanned_at ? new Date(item.scanned_at).toLocaleString() : '',
    'Decision By':         item.decision_by || '',
    'Decision Notes':      item.decision_notes || '',
    'Reviewed? (manual)':  item.review_status === 'confirmed' ? '✓' : '',
    'Notes':               '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    { wch: 35 }, // Asset Name
    { wch: 22 }, // Tag
    { wch: 20 }, // Category
    { wch: 22 }, // Location
    { wch: 18 }, // Inv Status
    { wch: 22 }, // Review Status
    { wch: 22 }, // Scanned By
    { wch: 20 }, // Scanned At
    { wch: 22 }, // Decision By
    { wch: 30 }, // Decision Notes
    { wch: 16 }, // Reviewed?
    { wch: 30 }, // Notes
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Asset Review');

  // Summary sheet
  const summaryRows = [
    ['Review Name', reviewName],
    ['Export Date', new Date().toLocaleString()],
    ['Export Filter', EXPORT_FILTERS.find(f => f.value === exportFilter)?.label || exportFilter],
    ['Total Rows', items.length],
    [''],
    ['Status', 'Count'],
    ...Object.entries(statusLabels).map(([key, label]) => [
      label,
      items.filter(i => i.review_status === key).length,
    ]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const safeFilename = reviewName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
  XLSX.writeFile(wb, `${safeFilename}_${exportFilter}.xlsx`);
}

export default function AssetReviewSession() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('scan');
  const [scanInput, setScanInput] = useState('');
  const [lastScan, setLastScan] = useState(null);
  const [search, setSearch] = useState('');
  const [listFilter, setListFilter] = useState('all');
  const [decisionItem, setDecisionItem] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportFilter, setExportFilter] = useState('all');
  const scanRef = useRef(null);

  useEffect(() => {
    db.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'scan' && scanRef.current) scanRef.current.focus();
  }, [activeTab]);

  const { data: review, isLoading: reviewLoading } = useQuery({
    queryKey: ['review', id],
    queryFn: () => db.entities.YearlyAssetReview.filter({ id }),
    select: d => d[0],
  });

  const { data: reviewItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['review-items', id],
    queryFn: () => db.entities.AssetReviewItem.filter({ review_id: id }, '-scanned_at', 5000),
    refetchInterval: 15000,
  });

  // Full active asset list — used to distinguish "not in scope" vs "doesn't exist"
  const { data: allActiveAssets = [] } = useQuery({
    queryKey: ['assets-active-for-review'],
    queryFn: () => db.entities.Asset.list('-created_date', 5000),
    select: assets => assets.filter(a => a.status !== 'retired'),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, data }) => db.entities.AssetReviewItem.update(itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review-items', id] });
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: (data) => db.entities.YearlyAssetReview.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['review', id] }),
  });

  const stats = useMemo(() => {
    const confirmed  = reviewItems.filter(i => i.review_status === 'confirmed').length;
    const missing    = reviewItems.filter(i => i.review_status === 'missing_candidate').length;
    const deleted    = reviewItems.filter(i => i.review_status === 'deleted').length;
    const hospital   = reviewItems.filter(i => i.review_status === 'sent_to_hospital').length;
    const notReviewed = reviewItems.filter(i => i.review_status === 'not_reviewed').length;
    const total      = reviewItems.length;
    return { confirmed, missing, deleted, hospital, notReviewed, total };
  }, [reviewItems]);

  const handleScan = async (e) => {
    e.preventDefault();
    const raw = scanInput;
    // Normalize: trim all whitespace including newlines from scanner guns
    const val = raw.replace(/[\r\n\t]/g, '').trim();
    if (!val) return;
    setScanInput('');

    const normalized = val.toLowerCase();

    console.log('[AssetReview] Raw input:', JSON.stringify(raw));
    console.log('[AssetReview] Normalized:', JSON.stringify(normalized));
    console.log('[AssetReview] Review items in session:', reviewItems.length);
    console.log('[AssetReview] Sample review items:', reviewItems.slice(0, 3).map(i => ({ name: i.asset_name, barcode: i.asset_barcode })));

    // Helper: tokenize serial numbers from an asset (handles comma-separated, whitespace, etc.)
    const tokenizeSerials = (str) =>
      (str || '').toLowerCase().split(/[\s,;|]+/).map(s => s.trim()).filter(Boolean);

    // Step 1a: match against asset_barcode on the review item (legacy)
    let match = reviewItems.find(i => {
      const tokens = tokenizeSerials(i.asset_barcode);
      return tokens.some(t => t === normalized);
    });

    // Step 1b: match against the live asset's serial_numbers / serial_number fields via asset_id
    // This is the PRIMARY path for serial number lookup — review items store asset_id
    if (!match) {
      const liveAsset = allActiveAssets.find(a => {
        const serials = getSerialNumbersArray(a).map(s => s.toLowerCase());
        const singleSerial = (a.serial_number || '').trim().toLowerCase();
        const barcode = (a.barcode || '').trim().toLowerCase();
        return (
          serials.some(s => s === normalized) ||
          (singleSerial && singleSerial === normalized) ||
          barcode === normalized
        );
      });
      if (liveAsset) {
        match = reviewItems.find(i => i.asset_id === liveAsset.id);
        if (match) {
          console.log('[AssetReview] Matched via live asset serial lookup:', liveAsset.name, '→ serial_numbers:', liveAsset.serial_numbers, '| serial_number:', liveAsset.serial_number);
        }
      }
    }

    // Step 1c: also match by asset name as last resort
    if (!match) {
      match = reviewItems.find(i =>
        (i.asset_name || '').trim().toLowerCase() === normalized
      );
    }

    console.log('[AssetReview] Session match result:', match ? `FOUND: ${match.asset_name} (status: ${match.review_status})` : 'NOT FOUND IN SESSION');

    if (!match) {
      // Check if the asset exists anywhere in active inventory (to give a better error message)
      const existsInInventory = allActiveAssets.find(a => {
        const serials = getSerialNumbersArray(a).map(s => s.toLowerCase());
        const singleSerial = (a.serial_number || '').trim().toLowerCase();
        const barcodeVal = (a.barcode || '').trim().toLowerCase();
        return (
          serials.some(s => s === normalized) ||
          (singleSerial && singleSerial === normalized) ||
          (barcodeVal.length > 0 && barcodeVal === normalized)
        );
      });

      console.log('[AssetReview] Exists in active inventory:', existsInInventory ? `YES: ${existsInInventory.name}` : 'NO');

      if (existsInInventory) {
        setLastScan({ type: 'out_of_scope', val, assetName: existsInInventory.name });
        toast.warning(`"${val}" exists in inventory but is not included in this review session`);
      } else {
        setLastScan({ type: 'not_found', val });
        toast.error(`Asset number not found: ${val}`);
      }
      return;
    }

    if (match.review_status === 'confirmed') {
      setLastScan({ type: 'duplicate', item: match, scannedVal: val });
      toast.info(`${val} already reviewed in this session`);
      return;
    }

    await updateItemMutation.mutateAsync({
      itemId: match.id,
      data: { review_status: 'confirmed', scanned_by: currentUser?.email || 'unknown', scanned_at: new Date().toISOString() },
    });
    await updateReviewMutation.mutateAsync({ scanned_count: stats.confirmed + 1 });

    console.log('[AssetReview] Successfully confirmed:', match.asset_name);
    setLastScan({ type: 'found', item: match, scannedVal: val });
    toast.success(`Confirmed: ${val} — ${match.asset_name}`);
  };

  const handleCompleteScanning = async () => {
    setIsCompleting(true);
    const notReviewed = reviewItems.filter(i => i.review_status === 'not_reviewed');
    for (let i = 0; i < notReviewed.length; i += 20) {
      await Promise.all(notReviewed.slice(i, i + 20).map(item =>
        db.entities.AssetReviewItem.update(item.id, { review_status: 'missing_candidate' })
      ));
    }
    await updateReviewMutation.mutateAsync({
      status: 'completed',
      completed_at: new Date().toISOString(),
      missing_count: notReviewed.length,
      scanned_count: stats.confirmed,
    });
    queryClient.invalidateQueries({ queryKey: ['review-items', id] });
    setIsCompleting(false);
    setActiveTab('finalize');
    toast.success('Scanning complete — resolve missing assets in Finalize tab');
  };

  const handleFinalizeReview = async () => {
    await updateReviewMutation.mutateAsync({
      status: 'finalized',
      finalized_at: new Date().toISOString(),
      finalized_by: currentUser?.email || '',
    });
    toast.success('Review finalized!');
  };

  const handleDeleteAsset = async (item) => {
    await db.entities.Asset.update(item.asset_id, {
      status: 'retired',
      notes: `Removed during ${review?.name}`,
    });
    await updateItemMutation.mutateAsync({
      itemId: item.id,
      data: {
        review_status: 'deleted',
        decision_by: currentUser?.email || '',
        decision_at: new Date().toISOString(),
        decision_notes: decisionNotes || 'Removed during review',
      },
    });
    await updateReviewMutation.mutateAsync({
      missing_count: Math.max(0, (review?.missing_count || 1) - 1),
    });
    setDecisionItem(null);
    setDecisionNotes('');
    toast.success(`${item.asset_name} removed from inventory`);
  };

  const handleSendToHospital = async (item) => {
    const now = new Date().toISOString();
    await db.entities.Asset.update(item.asset_id, {
      status: 'lost',
      is_lost: true,
      lost_at: now,
      lost_by: currentUser?.email || '',
      lost_notes: decisionNotes || `Marked missing during ${review?.name}`,
    });
    await db.entities.AVHospital.create({
      asset_id: item.asset_id,
      asset_name: item.asset_name,
      asset_barcode: item.asset_barcode || '',
      marked_by: currentUser?.email || '',
      marked_reason: 'lost_missing',
      repair_status: 'lost',
      issue_notes: decisionNotes || `Not found during ${review?.name}`,
      review_id: id,
      is_active: true,
    });
    await updateItemMutation.mutateAsync({
      itemId: item.id,
      data: {
        review_status: 'sent_to_hospital',
        decision_by: currentUser?.email || '',
        decision_at: now,
        decision_notes: decisionNotes || 'Sent to Hospital/Lost during review',
      },
    });
    await updateReviewMutation.mutateAsync({
      missing_count: Math.max(0, (review?.missing_count || 1) - 1),
    });
    setDecisionItem(null);
    setDecisionNotes('');
    toast.success(`${item.asset_name} marked Lost / Sent to Hospital`);
  };

  const filteredItems = useMemo(() => {
    let items = listFilter !== 'all' ? reviewItems.filter(i => i.review_status === listFilter) : reviewItems;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => {
        // Also match against the live asset's serial numbers
        const liveAsset = allActiveAssets.find(a => a.id === i.asset_id);
        const serials = getSerialNumbersArray(liveAsset).map(s => s.toLowerCase());
        return (
          i.asset_name.toLowerCase().includes(q) ||
          (i.asset_barcode || '').toLowerCase().includes(q) ||
          (i.asset_category || '').toLowerCase().includes(q) ||
          serials.some(s => s.includes(q))
        );
      });
    }
    return items;
  }, [reviewItems, listFilter, search]);

  const missingNeedingDecision = reviewItems.filter(i => i.review_status === 'missing_candidate');
  const recentScans = useMemo(() =>
    [...reviewItems].filter(i => i.scanned_at).sort((a, b) => new Date(b.scanned_at) - new Date(a.scanned_at)).slice(0, 15),
    [reviewItems]
  );

  if (reviewLoading || itemsLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
        <span className="text-muted-foreground">Loading review session...</span>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p className="font-medium">Review session not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/yearly-review')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Reviews
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/yearly-review')} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" /> Reviews
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">{review.name}</h1>
          <p className="text-sm text-muted-foreground">
            By {review.started_by} · {review.started_at ? new Date(review.started_at).toLocaleDateString() : '—'}
            {' · '}
            <span className={cn('font-medium',
              review.status === 'finalized' ? 'text-emerald-400' :
              review.status === 'completed' ? 'text-blue-400' : 'text-amber-400')}>
              {review.status?.replace('_', ' ').toUpperCase()}
            </span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
            <Download className="w-4 h-4 mr-1.5" /> Export Excel
          </Button>
          {review.status === 'completed' && missingNeedingDecision.length === 0 && (
            <Button onClick={handleFinalizeReview} disabled={updateReviewMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <ClipboardCheck className="w-4 h-4 mr-1.5" />
              {updateReviewMutation.isPending ? 'Finalizing...' : 'Finalize'}
            </Button>
          )}
        </div>
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'In Scope',         value: stats.total,        color: 'text-foreground' },
          { label: 'Confirmed',        value: stats.confirmed,    color: 'text-emerald-400' },
          { label: 'Not Reviewed',     value: stats.notReviewed,  color: 'text-amber-400' },
          { label: 'Missing',          value: stats.missing,      color: 'text-red-400' },
          { label: 'Sent to Hospital', value: stats.hospital,     color: 'text-purple-400' },
        ].map(s => (
          <Card key={s.label} className="p-3 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Scan Progress</span>
          <span className="text-sm text-muted-foreground">{stats.confirmed} / {stats.total} confirmed</span>
        </div>
        <ProgressBar value={stats.confirmed} max={stats.total} />
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {tab.label}
            {tab.id === 'finalize' && missingNeedingDecision.length > 0 && (
              <span className="ml-1.5 text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                {missingNeedingDecision.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── SCAN TAB ─── */}
      {activeTab === 'scan' && (
        <div className="space-y-4">
          {review.status !== 'in_progress' ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-60" />
              <p className="font-medium">Scanning phase is complete.</p>
              <p className="text-sm mt-1">Go to the Finalize tab to resolve missing assets.</p>
            </div>
          ) : (
            <>
              <Card className="p-5">
                <p className="text-sm font-medium mb-3 text-muted-foreground">Scan or type the asset number to confirm it as present:</p>
                <form onSubmit={handleScan} className="flex gap-2">
                  <Input ref={scanRef} value={scanInput} onChange={e => setScanInput(e.target.value)}
                    placeholder="Enter asset number (e.g. ABC-1234)..." className="flex-1 font-mono text-sm h-11"
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false" />
                  <Button type="submit" disabled={!scanInput.trim() || updateItemMutation.isPending} className="h-11 px-5">
                    <ScanLine className="w-4 h-4 mr-1.5" /> Confirm
                  </Button>
                </form>
                {lastScan && (
                  <div className={cn('mt-3 p-3 rounded-lg border text-sm flex items-center gap-2',
                    lastScan.type === 'found'        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                    lastScan.type === 'duplicate'    ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' :
                    lastScan.type === 'out_of_scope' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                    'bg-red-500/10 border-red-500/20 text-red-300')}>
                    {lastScan.type === 'found'        && <><CheckCircle2 className="w-4 h-4 shrink-0" /><strong>Confirmed:</strong>&nbsp;{lastScan.scannedVal || lastScan.item?.asset_name} — {lastScan.item?.asset_name}</>}
                    {lastScan.type === 'duplicate'    && <><PackageCheck className="w-4 h-4 shrink-0" /><strong>Already reviewed in this session:</strong>&nbsp;{lastScan.scannedVal || lastScan.item?.asset_name}</>}
                    {lastScan.type === 'out_of_scope' && <><AlertTriangle className="w-4 h-4 shrink-0" /><strong>Not in this review scope:</strong>&nbsp;{lastScan.assetName || lastScan.val} (exists in inventory but was not included when this session was created)</>}
                    {lastScan.type === 'not_found'    && <><XCircle className="w-4 h-4 shrink-0" /><strong>Asset number not found:</strong>&nbsp;{lastScan.val}</>}
                  </div>
                )}
              </Card>

              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                <div>
                  <p className="font-medium text-sm">Done scanning?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.notReviewed} unscanned asset{stats.notReviewed !== 1 ? 's' : ''} will become Missing Candidates.
                  </p>
                </div>
                <Button variant="outline" onClick={handleCompleteScanning}
                  disabled={isCompleting || stats.confirmed === 0}
                  className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10">
                  {isCompleting
                    ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />Processing...</>
                    : <><Flag className="w-4 h-4 mr-1.5" />Complete Scanning</>}
                </Button>
              </div>

              {/* Recent scans feed */}
              {recentScans.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Recently confirmed:</p>
                  {recentScans.map(item => (
                    <div key={item.id} className="flex items-center gap-3 py-1.5 px-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-medium flex-1 truncate">{item.asset_name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{item.scanned_by}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── LIST TAB ─── */}
      {activeTab === 'list' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, asset number, category..." className="pl-9 h-9 text-sm" />
            </div>
            <Select value={listFilter} onValueChange={setListFilter}>
              <SelectTrigger className="w-48 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assets</SelectItem>
                <SelectItem value="not_reviewed">Not Reviewed</SelectItem>
                <SelectItem value="confirmed">Confirmed Present</SelectItem>
                <SelectItem value="missing_candidate">Missing Candidates</SelectItem>
                <SelectItem value="sent_to_hospital">Sent to Hospital</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{filteredItems.length} results</p>
          <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {filteredItems.map(item => (
              <AssetListRow
                key={item.id}
                item={item}
                onDecide={setDecisionItem}
                reviewStatus={review.status}
                liveAsset={allActiveAssets.find(a => a.id === item.asset_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── FINALIZE TAB ─── */}
      {activeTab === 'finalize' && (
        <div className="space-y-5">
          {review.status === 'in_progress' && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Scanning is still in progress. Complete scanning before finalizing.
            </div>
          )}

          <SummarySection title="Confirmed Present" icon={CheckCircle2} iconColor="text-emerald-400"
            count={stats.confirmed} items={reviewItems.filter(i => i.review_status === 'confirmed')}
            emptyMsg="No confirmed assets yet" />

          {missingNeedingDecision.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="font-semibold text-red-400">Missing – Needs Decision ({missingNeedingDecision.length})</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                These assets were NOT scanned. Choose an action for each one.
              </p>
              <div className="space-y-2">
                {missingNeedingDecision.map(item => (
                  <Card key={item.id} className="border-red-500/20 bg-red-500/5">
                    <CardContent className="p-3 flex items-center gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.asset_name}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                          {item.asset_barcode && <span className="font-mono">{item.asset_barcode}</span>}
                          {item.asset_category && <span>{item.asset_category}</span>}
                          <span>Status: {item.asset_status || '—'}</span>
                          {item.asset_location && <span>Location: {item.asset_location}</span>}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10 shrink-0"
                        onClick={() => { setDecisionItem(item); setDecisionNotes(''); }}>
                        <ChevronRight className="w-3.5 h-3.5 mr-1" /> Decide
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {stats.hospital > 0 && (
            <SummarySection title="Sent to Hospital / Lost" icon={HeartPulse} iconColor="text-purple-400"
              count={stats.hospital} items={reviewItems.filter(i => i.review_status === 'sent_to_hospital')} emptyMsg="" />
          )}
          {stats.deleted > 0 && (
            <SummarySection title="Removed / Deleted" icon={Trash2} iconColor="text-slate-400"
              count={stats.deleted} items={reviewItems.filter(i => i.review_status === 'deleted')} emptyMsg="" />
          )}

          {review.status === 'completed' && missingNeedingDecision.length === 0 && (
            <div className="flex justify-end">
              <Button onClick={handleFinalizeReview} disabled={updateReviewMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <ClipboardCheck className="w-4 h-4 mr-1.5" />
                {updateReviewMutation.isPending ? 'Finalizing...' : 'Finalize Review'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Decision Dialog */}
      {decisionItem && (
        <Dialog open={!!decisionItem} onOpenChange={() => setDecisionItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Missing Asset — Choose Action</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="p-3 bg-muted/40 rounded-lg">
                <p className="font-semibold">{decisionItem.asset_name}</p>
                {decisionItem.asset_barcode && <p className="text-xs font-mono text-muted-foreground mt-0.5">{decisionItem.asset_barcode}</p>}
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  {decisionItem.asset_category && <span>{decisionItem.asset_category}</span>}
                  {decisionItem.asset_location && <span>Location: {decisionItem.asset_location}</span>}
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Notes (optional)</Label>
                <Textarea value={decisionNotes} onChange={e => setDecisionNotes(e.target.value)} rows={2} placeholder="Additional context..." />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Choose an action:</p>
                <Button className="w-full justify-start bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30"
                  variant="outline" onClick={() => handleDeleteAsset(decisionItem)} disabled={updateItemMutation.isPending}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete / Remove from Inventory
                  <span className="ml-auto text-xs opacity-60">Marked retired</span>
                </Button>
                <Button className="w-full justify-start bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
                  variant="outline" onClick={() => handleSendToHospital(decisionItem)} disabled={updateItemMutation.isPending}>
                  <HeartPulse className="w-4 h-4 mr-2" />
                  Keep but Send to Hospital / Lost
                  <span className="ml-auto text-xs opacity-60">Blocked from shows</span>
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setDecisionItem(null)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Export to Excel</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Export Filter</Label>
              <Select value={exportFilter} onValueChange={setExportFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPORT_FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <p><span className="font-medium text-foreground">
                {exportFilter === 'all' ? reviewItems.length : reviewItems.filter(i => i.review_status === exportFilter).length}
              </span> rows will be exported</p>
              <p className="text-xs mt-1">Each asset tag appears in its own cell. Two sheets: Asset Review + Summary.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExport(false)}>Cancel</Button>
            <Button onClick={() => { exportToExcel(reviewItems, review.name, exportFilter); setShowExport(false); }}>
              <Download className="w-4 h-4 mr-1.5" /> Download Excel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AssetListRow({ item, onDecide, reviewStatus, liveAsset }) {
  const STATUS = {
    not_reviewed:      { label: 'Not Reviewed',    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    confirmed:         { label: 'Confirmed',        color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    missing_candidate: { label: 'Missing',          color: 'bg-red-500/10 text-red-400 border-red-500/20' },
    sent_to_hospital:  { label: 'In Hospital/Lost', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
    deleted:           { label: 'Deleted',          color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  };
  const cfg = STATUS[item.review_status] || STATUS.not_reviewed;
  const serialDisplay = liveAsset?.serial_numbers || liveAsset?.serial_number || '';
  return (
    <div className="flex items-center gap-3 py-2 px-3 bg-card/50 border border-border/50 rounded-lg hover:border-border transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{item.asset_name}</span>
          <span className={cn('text-xs px-1.5 py-0.5 rounded-full border', cfg.color)}>{cfg.label}</span>
        </div>
        <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
          {serialDisplay && <span className="font-mono text-primary/80">S/N: {serialDisplay}</span>}
          {item.asset_barcode && !serialDisplay && <span className="font-mono text-primary/80">#{item.asset_barcode}</span>}
          {item.asset_category && <span>{item.asset_category}</span>}
          {item.scanned_by && <span>by {item.scanned_by}</span>}
        </div>
      </div>
      {item.review_status === 'missing_candidate' && reviewStatus !== 'in_progress' && (
        <Button size="sm" variant="outline" className="text-xs shrink-0" onClick={() => onDecide(item)}>Decide</Button>
      )}
    </div>
  );
}

function SummarySection({ title, icon: Icon, iconColor, count, items, emptyMsg }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button className="flex items-center gap-2 mb-2 w-full text-left" onClick={() => setOpen(o => !o)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
        <h3 className="font-semibold">{title} ({count})</h3>
        <ChevronRight className={cn('w-4 h-4 text-muted-foreground ml-auto transition-transform', open && 'rotate-90')} />
      </button>
      {open && (
        items.length === 0 ? (
          <p className="text-sm text-muted-foreground pl-7">{emptyMsg}</p>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 py-1.5 px-3 bg-card/40 border border-border/40 rounded-lg text-sm">
                <span className="font-medium flex-1 min-w-0 truncate">{item.asset_name}</span>
                {item.asset_barcode && <span className="text-xs font-mono text-muted-foreground shrink-0">{item.asset_barcode}</span>}
                {item.decision_by && <span className="text-xs text-muted-foreground shrink-0">by {item.decision_by}</span>}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}