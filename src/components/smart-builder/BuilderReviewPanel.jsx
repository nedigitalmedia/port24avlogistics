import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { db } from '@/api/db';
import {
  Sparkles, CheckCircle, ChevronDown, ChevronUp,
  Trash2, AlertCircle, Info, DollarSign, Users, LayoutGrid, Package, RefreshCw,
  ShoppingCart, CheckCheck, Handshake
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }

// Source badge helper
function SourceBadge({ eq }) {
  const source = eq.source || (eq.not_in_inventory ? 'roundtable' : 'owned');
  if (source === 'owned') {
    return <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Owned</Badge>;
  }
  if (source === 'roundtable') {
    return (
      <Badge className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20 gap-1">
        <Handshake className="w-3 h-3" /> Roundtable{eq.partner_name ? ` — ${eq.partner_name}` : ''}
      </Badge>
    );
  }
  return <Badge className="text-xs bg-slate-500/10 text-slate-500 border border-slate-500/20">Suggested</Badge>;
}

// ── Room card ─────────────────────────────────────────────────────────────────
function RoomCard({ room, index, onUpdate, onRemove }) {
  const [open, setOpen] = useState(true);

  const removeEquipment = (ei) => {
    onUpdate({ ...room, equipment: room.equipment.filter((_, i) => i !== ei) });
  };
  const removeKit = (ki) => {
    onUpdate({ ...room, kits: (room.kits || []).filter((_, i) => i !== ki) });
  };

  const allEquip = room.equipment || [];
  const ownedEquip = allEquip.filter(e => (e.source || (e.not_in_inventory ? 'roundtable' : 'owned')) === 'owned');
  const roundtableEquip = allEquip.filter(e => (e.source || '') === 'roundtable');
  const missingEquip = allEquip.filter(e => (e.source || '') === 'missing');

  const roomTotal = [
    ...allEquip.map(e => (e.daily_rate || 0) * (e.quantity || 1) * (e.days || 1)),
    ...(room.kits || []).map(k => (k.daily_rate || 0) * (k.days || 1)),
  ].reduce((a, b) => a + b, 0);

  const renderEquipRow = (eq, i, onRemoveFn) => (
    <div key={i} className={`flex items-start justify-between gap-2 p-2 rounded-lg text-sm ${
      (eq.source === 'owned' || (!eq.source && !eq.not_in_inventory)) ? 'bg-emerald-500/5 border border-emerald-500/10' :
      eq.source === 'roundtable' ? 'bg-amber-500/5 border border-amber-500/10' :
      'bg-slate-500/5 border border-slate-500/10'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{eq.name}</span>
          <SourceBadge eq={eq} />
          <Badge variant="outline" className="text-xs">{eq.category}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>Qty: {eq.quantity || 1}</span>
          <span>{eq.days || 1} day{(eq.days || 1) !== 1 ? 's' : ''}</span>
          <span>{fmt((eq.daily_rate || 0) * (eq.quantity || 1) * (eq.days || 1))}</span>
        </div>
        {eq.reason && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground italic">
            <Info className="w-3 h-3 shrink-0" />{eq.reason}
          </div>
        )}
      </div>
      <button onClick={onRemoveFn} className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <LayoutGrid className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm">{room.name}</CardTitle>
            <Badge variant="outline" className="text-xs capitalize">{room.type || 'room'}</Badge>
            {ownedEquip.length > 0 && <span className="text-xs text-emerald-600 font-medium">{ownedEquip.length} owned</span>}
            {roundtableEquip.length > 0 && <span className="text-xs text-amber-600 font-medium">{roundtableEquip.length} roundtable</span>}
            {missingEquip.length > 0 && <span className="text-xs text-slate-500 font-medium">{missingEquip.length} suggested</span>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-primary">{fmt(roomTotal)}</span>
            <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </button>
            {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        {room.purpose && <p className="text-xs text-muted-foreground mt-0.5 font-normal">{room.purpose}</p>}
      </CardHeader>

      {open && (
        <CardContent className="pt-0 space-y-4">
          {/* Owned inventory section */}
          {ownedEquip.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <CheckCheck className="w-3.5 h-3.5" /> Owned Inventory
              </p>
              <div className="space-y-1.5">
                {ownedEquip.map((eq, i) => renderEquipRow(eq, i, () => {
                  const idx = allEquip.indexOf(eq);
                  removeEquipment(idx);
                }))}
              </div>
            </div>
          )}

          {/* Roundtable section */}
          {roundtableEquip.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Handshake className="w-3.5 h-3.5" /> Roundtable / Sub-Rent
              </p>
              <div className="space-y-1.5">
                {roundtableEquip.map((eq, i) => renderEquipRow(eq, i, () => {
                  const idx = allEquip.indexOf(eq);
                  removeEquipment(idx);
                }))}
              </div>
            </div>
          )}

          {/* Suggested / missing section */}
          {missingEquip.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" /> Suggested / Missing
              </p>
              <div className="space-y-1.5">
                {missingEquip.map((eq, i) => renderEquipRow(eq, i, () => {
                  const idx = allEquip.indexOf(eq);
                  removeEquipment(idx);
                }))}
              </div>
            </div>
          )}

          {/* Fallback: ungrouped equipment (e.g., fallback draft with no source field) */}
          {ownedEquip.length === 0 && roundtableEquip.length === 0 && missingEquip.length === 0 && allEquip.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Equipment</p>
              <div className="space-y-1.5">
                {allEquip.map((eq, i) => renderEquipRow(eq, i, () => removeEquipment(i)))}
              </div>
            </div>
          )}

          {/* Kits */}
          {(room.kits || []).length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Kits</p>
              <div className="space-y-1.5">
                {room.kits.map((kit, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium">{kit.name}</span>
                        <Badge variant="outline" className="text-xs capitalize">{kit.kit_type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{kit.days || 1} day{(kit.days || 1) !== 1 ? 's' : ''}</span>
                        <span>{fmt((kit.daily_rate || 0) * (kit.days || 1))}</span>
                      </div>
                      {kit.reason && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground italic">
                          <Info className="w-3 h-3 shrink-0" />{kit.reason}
                        </div>
                      )}
                    </div>
                    <button onClick={() => removeKit(i)} className="text-muted-foreground hover:text-destructive shrink-0 mt-0.5">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(room.equipment || []).length === 0 && (room.kits || []).length === 0 && (
            <p className="text-xs text-muted-foreground italic">No equipment or kits assigned.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Crew card ─────────────────────────────────────────────────────────────────
function CrewCard({ crew, onRemove }) {
  return (
    <div className="flex items-start justify-between gap-2 p-3 rounded-lg border bg-card text-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{crew.role_name}</span>
          <Badge variant="outline" className="text-xs">{crew.department}</Badge>
          {(crew.rooms || []).length > 0 && (
            <span className="text-xs text-muted-foreground">→ {crew.rooms.join(', ')}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>×{crew.quantity || 1}</span>
          <span>{crew.days || 1} day{(crew.days || 1) !== 1 ? 's' : ''}</span>
          <span>{fmt((crew.daily_rate_billable || 0) * (crew.quantity || 1) * (crew.days || 1))}</span>
        </div>
        {crew.reason && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground italic">
            <Info className="w-3 h-3 shrink-0" />{crew.reason}
          </div>
        )}
      </div>
      <button onClick={onRemove} className="text-muted-foreground hover:text-destructive shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── True gaps panel (optional_missing — items not covered by owned OR roundtable) ──
function TrueGapsPanel({ items }) {
  const [open, setOpen] = useState(false);
  if (!items || items.length === 0) return null;

  return (
    <Card className="border-slate-500/20">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-sm text-slate-500">True Gaps — Not Available from Owned or Roundtable ({items.length})</CardTitle>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
        <p className="text-xs text-muted-foreground font-normal mt-0.5">
          These items could not be sourced from your owned inventory or any Roundtable partner. Consider adding to inventory or sourcing externally.
        </p>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-slate-500/10 bg-slate-500/5 text-sm">
              <ShoppingCart className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{item.name}</span>
                  {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                  <span className="text-xs text-muted-foreground">×{item.quantity || 1}</span>
                  {item.daily_rate > 0 && (
                    <span className="text-xs font-mono text-muted-foreground">${item.daily_rate}/day</span>
                  )}
                  {item.estimated_subrent_cost > 0 && (
                    <span className="text-xs text-muted-foreground">~{fmt(item.estimated_subrent_cost)}</span>
                  )}
                  <span className="text-xs text-slate-400 italic">Source TBD</span>
                </div>
                {item.reason && (
                  <p className="text-xs text-muted-foreground mt-0.5 italic">{item.reason}</p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

// ── Main review panel ─────────────────────────────────────────────────────────
export default function BuilderReviewPanel({ draft: initialDraft, inputs, usedFallback, onRegenerate, onProjectCreated, onBack }) {
  const [draft, setDraft] = useState(initialDraft);
  const [showName, setShowName] = useState(draft.show_name || inputs?.show_name || '');
  const [startDate, setStartDate] = useState('');
  const queryClient = useQueryClient();

  const updateRoom = (index, updatedRoom) => {
    setDraft(d => ({ ...d, rooms: d.rooms.map((r, i) => i === index ? updatedRoom : r) }));
  };
  const removeRoom = (index) => {
    setDraft(d => ({ ...d, rooms: d.rooms.filter((_, i) => i !== index) }));
  };
  const removeCrew = (index) => {
    setDraft(d => ({ ...d, crew: d.crew.filter((_, i) => i !== index) }));
  };

  // Recalculate costing from current draft state — split by source tier
  const allEquipItems = (draft.rooms || []).flatMap(r => r.equipment || []);
  const ownedTotal = allEquipItems
    .filter(e => (e.source || (!e.not_in_inventory ? 'owned' : 'other')) === 'owned')
    .reduce((s, e) => s + (e.daily_rate || 0) * (e.quantity || 1) * (e.days || 1), 0);
  const roundtableTotal = allEquipItems
    .filter(e => e.source === 'roundtable')
    .reduce((s, e) => s + (e.daily_rate || 0) * (e.quantity || 1) * (e.days || 1), 0);
  const suggestedTotal = allEquipItems
    .filter(e => e.source === 'missing' || (!e.source && e.not_in_inventory))
    .reduce((s, e) => s + (e.daily_rate || 0) * (e.quantity || 1) * (e.days || 1), 0);
  const kitTotal = (draft.rooms || []).flatMap(r => r.kits || [])
    .reduce((s, k) => s + (k.daily_rate || 0) * (k.days || 1), 0);
  const equipTotal = ownedTotal + roundtableTotal + suggestedTotal + kitTotal;
  const crewTotal = (draft.crew || [])
    .reduce((s, c) => s + (c.daily_rate_billable || 0) * (c.quantity || 1) * (c.days || 1), 0);
  const grandTotal = equipTotal + crewTotal;
  const billable = grandTotal * 1.4; // 40% markup
  const budget = Number(inputs?.budget_target || 0);

  const optionalMissing = draft.optional_missing || [];

  // Create the project
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!showName) throw new Error('Please enter a show name.');
      if (!startDate) throw new Error('Please enter a start date.');

      // 1. Create Show with rooms as sub_locations
      const subLocations = (draft.rooms || []).map((r, i) => ({
        id: `room-${i}-${Date.now()}`,
        name: r.name,
        type: r.type || 'room',
      }));

      const show = await db.entities.Show.create({
        name: showName,
        status: 'planning',
        start_date: startDate,
        notes: [
          `Generated by Smart Project Builder`,
          `Quality Level: ${draft.quality_level}`,
          inputs?.venue_type ? `Venue Type: ${inputs.venue_type}` : '',
          draft.based_on_show ? `Based on: ${draft.based_on_show}` : '',
          draft.summary || '',
        ].filter(Boolean).join('\n\n'),
        sub_locations: subLocations,
      });

      return show;
    },
    onSuccess: (show) => {
      toast.success(`Project "${showName}" created! Review and add equipment from the Show Detail page.`);
      queryClient.invalidateQueries({ queryKey: ['shows'] });
      onProjectCreated(show.id);
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Recommended Project Draft</h2>
            <Badge className="capitalize">{draft.quality_level}</Badge>
          </div>
          {draft.based_on_show && (
            <p className="text-xs text-muted-foreground">Based on similar past project: <span className="text-primary">{draft.based_on_show}</span></p>
          )}
          {draft.summary && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{draft.summary}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={onBack}>Edit Inputs</Button>
          <Button variant="outline" size="sm" onClick={() => onRegenerate()} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Regenerate
          </Button>
        </div>
      </div>

      {/* Coverage / status banners */}
      {draft.inventory_coverage === 'high' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-600">
          <CheckCheck className="w-4 h-4 shrink-0" />
          <span><strong>High inventory coverage</strong> — this show can be built almost entirely from your owned gear.</span>
        </div>
      )}
      {draft.inventory_coverage === 'medium' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-500">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Partial inventory coverage</strong> — most needs covered with owned gear. Check optional subrents below for any gaps.</span>
        </div>
      )}
      {draft.inventory_coverage === 'low' && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Low inventory coverage</strong> — your current inventory has limited gear for this show type. Review optional subrents below or add more inventory to your asset list.</span>
        </div>
      )}
      {usedFallback && !draft.inventory_coverage && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-500">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Inventory-matched draft</strong> — built directly from your owned assets. All items shown are from your actual inventory.</span>
        </div>
      )}

      {budget > 0 && grandTotal > budget && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Estimated cost ({fmt(grandTotal)}) exceeds your budget target ({fmt(budget)}). Remove items or regenerate at a lower quality level.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Rooms */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-primary" /> Rooms & Equipment</h3>
            <span className="text-xs text-muted-foreground">{(draft.rooms || []).length} room{(draft.rooms || []).length !== 1 ? 's' : ''}</span>
          </div>
          {(draft.rooms || []).map((room, i) => (
            <RoomCard key={i} room={room} index={i} onUpdate={(r) => updateRoom(i, r)} onRemove={() => removeRoom(i)} />
          ))}
          {(draft.rooms || []).length === 0 && (
            <Card className="p-8 text-center text-muted-foreground text-sm">All rooms removed.</Card>
          )}

          {/* True gaps — only items not coverable by owned or roundtable */}
          <TrueGapsPanel items={optionalMissing} />
        </div>

        {/* Right column: Crew + Costing + Build button */}
        <div className="space-y-4">
          {/* Crew */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Crew</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(draft.crew || []).length === 0 && <p className="text-xs text-muted-foreground italic">No crew positions.</p>}
              {(draft.crew || []).map((c, i) => (
                <CrewCard key={i} crew={c} onRemove={() => removeCrew(i)} />
              ))}
            </CardContent>
          </Card>

          {/* Cost Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Rough Costing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {ownedTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCheck className="w-3 h-3" /> Owned gear</span>
                  <span className="font-mono text-emerald-600">{fmt(ownedTotal)}</span>
                </div>
              )}
              {roundtableTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-amber-600 flex items-center gap-1"><Handshake className="w-3 h-3" /> Roundtable</span>
                  <span className="font-mono text-amber-600">{fmt(roundtableTotal)}</span>
                </div>
              )}
              {suggestedTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Suggested items</span>
                  <span className="font-mono">{fmt(suggestedTotal)}</span>
                </div>
              )}
              {kitTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Kits</span>
                  <span className="font-mono">{fmt(kitTotal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Crew</span>
                <span className="font-mono">{fmt(crewTotal)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-semibold">
                <span>Internal Total</span>
                <span className="font-mono text-primary">{fmt(grandTotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Est. Billable (40% markup)</span>
                <span className="font-mono">{fmt(billable)}</span>
              </div>
              {budget > 0 && (
                <div className={`flex justify-between text-xs pt-1 ${grandTotal > budget ? 'text-destructive' : 'text-emerald-500'}`}>
                  <span>Budget Target</span>
                  <span className="font-mono">{fmt(budget)}</span>
                </div>
              )}
              {draft.costing?.budget_note && (
                <p className="text-xs text-muted-foreground italic pt-1">{draft.costing.budget_note}</p>
              )}
            </CardContent>
          </Card>

          {/* Build Project */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Build This Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Show Name *</Label>
                <Input
                  value={showName}
                  onChange={e => setShowName(e.target.value)}
                  placeholder="Event name…"
                />
              </div>
              <div>
                <Label className="text-xs">Start Date *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will create the show with all recommended rooms. Equipment and crew can be added from the Show Detail page.
              </p>
              <Button
                className="w-full gap-2"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !showName || !startDate}
              >
                <CheckCircle className="w-4 h-4" />
                {createMutation.isPending ? 'Building Project…' : 'Build Project Draft'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}