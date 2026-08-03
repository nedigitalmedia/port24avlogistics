import React, { useState, useEffect } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, CheckCircle2, Clock, PlayCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import { getSerialNumbersArray } from '@/lib/serialNumbers';

const REVIEW_TYPES = [
  { value: 'annual',          label: 'Annual Review' },
  { value: 'spot_check',      label: 'Spot Check' },
  { value: 'category_review', label: 'Category Review' },
  { value: 'full_inventory',  label: 'Full Inventory Count' },
  { value: 'cycle_count',     label: 'Cycle Count' },
  { value: 'custom',          label: 'Custom / Other' },
];

const STATUS_CONFIG = {
  draft:       { label: 'Draft',       color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',       icon: Clock },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',       icon: PlayCircle },
  completed:   { label: 'Completed',   color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',          icon: ClipboardList },
  finalized:   { label: 'Finalized',   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium', cfg.color)}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
}

const DEFAULT_FORM = {
  name: '',
  review_type: 'annual',
  review_year: new Date().getFullYear(),
  category_filter: '',
  location_filter: '',
  notes: '',
};

export default function AssetReviewPortal() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    db.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  // Auto-generate name when type/year changes
  useEffect(() => {
    const typeLabel = REVIEW_TYPES.find(t => t.value === form.review_type)?.label || 'Review';
    if (form.review_type === 'annual') {
      setForm(f => ({ ...f, name: `${f.review_year} ${typeLabel}` }));
    } else if (!form.name || REVIEW_TYPES.some(t => form.name.endsWith(t.label))) {
      setForm(f => ({ ...f, name: typeLabel }));
    }
  }, [form.review_type, form.review_year]);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['asset-reviews'],
    queryFn: () => db.entities.YearlyAssetReview.list('-created_date', 200),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => db.entities.Category.list('name', 200),
  });

  const { data: allAssets = [] } = useQuery({
    queryKey: ['assets-all'],
    queryFn: () => db.entities.Asset.list('-created_date', 5000),
  });

  // Unique locations from assets
  const locations = [...new Set(allAssets.map(a => a.location).filter(Boolean))].sort();

  const activeAssets = allAssets.filter(a => a.status !== 'retired');

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Only include real physical assets — exclude Cloud Kits and Consumables
      let scope = activeAssets.filter(a => {
        const t = a.item_type || 'physical_item';
        return t !== 'cloud_kit' && t !== 'consumable';
      });
      if (data.category_filter) scope = scope.filter(a => a.category === data.category_filter);
      if (data.location_filter) scope = scope.filter(a => a.location === data.location_filter);

      const review = await db.entities.YearlyAssetReview.create({
        ...data,
        status: 'in_progress',
        started_by: currentUser?.email || '',
        started_at: new Date().toISOString(),
        total_assets: scope.length,
        scanned_count: 0,
        missing_count: 0,
      });

      for (let i = 0; i < scope.length; i += 50) {
        await db.entities.AssetReviewItem.bulkCreate(
          scope.slice(i, i + 50).map(a => {
            // Build a combined identifier string: serial_numbers (comma-sep) + barcode
            // so scanning ANY individual serial OR the barcode tag will match
            const identifiers = [
              ...getSerialNumbersArray(a),
              ...(a.barcode ? [a.barcode.trim()] : []),
            ];
            return {
              review_id: review.id,
              asset_id: a.id,
              asset_name: a.name,
              asset_barcode: identifiers.join(','),
              asset_category: a.category || '',
              asset_status: a.status || 'available',
              asset_location: a.location || '',
              review_status: 'not_reviewed',
            };
          })
        );
      }
      return review;
    },
    onSuccess: (review) => {
      queryClient.invalidateQueries({ queryKey: ['asset-reviews'] });
      setShowCreate(false);
      setForm(DEFAULT_FORM);
      navigate(`/yearly-review/${review.id}`);
    },
  });

  const filteredReviews = reviews.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q) || (r.started_by || '').toLowerCase().includes(q);
    }
    return true;
  });

  const scopeCount = (() => {
    let s = activeAssets.filter(a => {
      const t = a.item_type || 'physical_item';
      return t !== 'cloud_kit' && t !== 'consumable';
    });
    if (form.category_filter) s = s.filter(a => a.category === form.category_filter);
    if (form.location_filter) s = s.filter(a => a.location === form.location_filter);
    return s.length;
  })();

  return (
    <div>
      <PageHeader
        title="Asset Review Portal"
        description="Physical inventory audits, spot checks, cycle counts, and annual reviews"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> New Review Session
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Active Assets', value: activeAssets.length,                                    color: 'text-primary' },
          { label: 'In Progress',         value: reviews.filter(r => r.status === 'in_progress').length, color: 'text-amber-500' },
          { label: 'Completed',           value: reviews.filter(r => r.status === 'completed').length,   color: 'text-blue-400' },
          { label: 'Finalized',           value: reviews.filter(r => r.status === 'finalized').length,   color: 'text-emerald-400' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className={cn('text-3xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search reviews..." className="pl-9 h-9 text-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="finalized">Finalized</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews list */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ClipboardList className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-lg">{reviews.length === 0 ? 'No review sessions yet' : 'No matching sessions'}</p>
          <p className="text-sm mt-1 mb-6">Start a new review to audit your inventory.</p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Start New Review
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map(review => {
            const pct = review.total_assets ? Math.round(((review.scanned_count || 0) / review.total_assets) * 100) : 0;
            const typeLabel = REVIEW_TYPES.find(t => t.value === review.review_type)?.label || review.review_type;
            return (
              <Card key={review.id} className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate(`/yearly-review/${review.id}`)}>
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{review.name}</h3>
                      <StatusBadge status={review.status} />
                      <Badge variant="outline" className="text-xs">{typeLabel}</Badge>
                      {review.category_filter && <Badge variant="outline" className="text-xs">{review.category_filter}</Badge>}
                      {review.location_filter && <Badge variant="outline" className="text-xs">{review.location_filter}</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>By: {review.started_by || '—'}</span>
                      <span>{review.started_at ? new Date(review.started_at).toLocaleDateString() : '—'}</span>
                      <span>{review.total_assets || 0} assets in scope</span>
                      {review.completed_at && <span>Completed: {new Date(review.completed_at).toLocaleDateString()}</span>}
                    </div>
                    {(review.status === 'in_progress' || review.status === 'completed') && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {review.scanned_count || 0}/{review.total_assets || 0} ({pct}%)
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {(review.status === 'completed' || review.status === 'finalized') && (
                      <div className="text-right text-xs">
                        <p className="text-emerald-400 font-medium">{review.scanned_count || 0} confirmed</p>
                        <p className="text-red-400">{review.missing_count || 0} missing</p>
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); navigate(`/yearly-review/${review.id}`); }}>
                      {review.status === 'in_progress' ? 'Resume' : 'View'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setForm(DEFAULT_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start New Review Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="mb-1.5 block">Review Type</Label>
              <Select value={form.review_type} onValueChange={v => setForm(f => ({ ...f, review_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REVIEW_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.review_type === 'annual' && (
              <div>
                <Label className="mb-1.5 block">Year</Label>
                <Input type="number" value={form.review_year}
                  onChange={e => setForm(f => ({ ...f, review_year: parseInt(e.target.value) || new Date().getFullYear() }))} />
              </div>
            )}
            <div>
              <Label className="mb-1.5 block">Review Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Q3 Audio Audit, Warehouse Spot Check..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1.5 block">Category (optional)</Label>
                <Select value={form.category_filter || 'all'} onValueChange={v => setForm(f => ({ ...f, category_filter: v === 'all' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block">Location (optional)</Label>
                <Select value={form.location_filter || 'all'} onValueChange={v => setForm(f => ({ ...f, location_filter: v === 'all' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <span className="font-medium text-foreground">{scopeCount}</span> assets will be included in this review
            </div>
            <div>
              <Label className="mb-1.5 block">Notes (optional)</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2} placeholder="Purpose, instructions, or context..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending || !form.name}>
              {createMutation.isPending ? 'Creating...' : 'Create & Start'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}