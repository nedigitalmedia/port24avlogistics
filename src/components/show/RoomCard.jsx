import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Plus, Trash2, Edit2, Check, X, Handshake, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '@/api/db';
import RequirementLine from './RequirementLine';
import MasterAddEquipmentForm from './MasterAddEquipmentForm';
import RoundtableBadge from '@/components/roundtable/RoundtableBadge';
import { useConflictCheck } from '@/lib/useConflictCheck';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';

export default function RoomCard({ 
  room,
  showId,
  showName,
  show,                // full Show record for date window conflict checking
  subrents = [],
  onRenameRoom,
  onDeleteRoom,
  isExpanded,
  onToggleExpand
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(room.name);
  const [showAddForm, setShowAddForm] = useState(false);
  const [subrentActivationReq, setSubrentActivationReq] = useState(null);
  const [orderedReqIds, setOrderedReqIds] = useState([]); // local drag order
  const qc = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  React.useEffect(() => {
    db.auth.me().then(u => setCurrentUser(u)).catch(() => {});
  }, []);

  const { isConflicted, conflictInfo, reqConflictInfo } = useConflictCheck({ currentShowId: showId, currentShow: show });

  const { data: allAssets = [] } = useQuery({ queryKey: ['assets'], queryFn: () => db.entities.Asset.list('-updated_date', 500) });
  const { data: allKits = [] } = useQuery({ queryKey: ['kits'], queryFn: () => db.entities.Kit.list() });

  // Build a lookup set of owned asset/kit names for "not in inventory" detection
  const ownedNameSet = React.useMemo(() => {
    const set = new Set();
    allAssets.forEach(a => set.add(a.name.trim().toLowerCase()));
    allKits.forEach(k => set.add(k.name.trim().toLowerCase()));
    return set;
  }, [allAssets, allKits]);

  const isNotInInventory = (req) => {
    if (!req.asset_id && !req.kit_id) {
      // No direct link — check by name
      return !ownedNameSet.has(req.product_name.trim().toLowerCase());
    }
    return false;
  };

  const { data: requirements = [] } = useQuery({
    queryKey: ['show_requirements', showId, room.id],
    queryFn: () => db.entities.ShowRequirement.filter({ show_id: showId, room_id: room.id }),
    enabled: !!showId,
  });

  // Keep orderedReqIds in sync with requirements (handles initial load + new items added)
  React.useEffect(() => {
    if (requirements.length === 0) {
      setOrderedReqIds([]);
      return;
    }
    setOrderedReqIds(prev => {
      const existingSet = new Set(prev);
      const newIds = requirements.map(r => r.id).filter(id => !existingSet.has(id));
      const filtered = prev.filter(id => requirements.some(r => r.id === id));
      // If nothing was previously tracked, just use the natural order from DB
      if (filtered.length === 0 && newIds.length === requirements.length) {
        return requirements.map(r => r.id);
      }
      return [...filtered, ...newIds];
    });
  }, [requirements]);

  // Build sorted requirements list based on local drag order
  const sortedRequirements = useMemo(() => {
    if (orderedReqIds.length === 0) return requirements;
    const reqMap = new Map(requirements.map(r => [r.id, r]));
    const sorted = orderedReqIds.map(id => reqMap.get(id)).filter(Boolean);
    // Append any that aren't in orderedReqIds yet
    requirements.forEach(r => { if (!orderedReqIds.includes(r.id)) sorted.push(r); });
    return sorted;
  }, [requirements, orderedReqIds]);

  const { data: fulfillments = [] } = useQuery({
    queryKey: ['show_fulfillments', showId],
    queryFn: () => db.entities.ShowFulfillment.filter({ show_id: showId }),
    enabled: !!showId,
  });

  // Helper: invalidate all requirement query variants so Scan page pick list stays in sync
  const invalidateRequirements = () => {
    qc.invalidateQueries({ queryKey: ['show_requirements', showId, room.id] });
    qc.invalidateQueries({ queryKey: ['show_requirements_all', showId] });
    qc.invalidateQueries({ queryKey: ['show_requirements_detail', showId] });
    qc.invalidateQueries({ queryKey: ['showRequirements', showId] }); // QuoteBuilder key
    qc.invalidateQueries({ queryKey: ['all_show_requirements_conflict'] }); // conflict check key
  };

  const createReq = useMutation({
    mutationFn: (data) => db.entities.ShowRequirement.create({ ...data, show_id: showId, show_name: showName, room_id: room.id, room_name: room.name }),
    // ✅ Do NOT close the form — user may want to add more items
    onSuccess: () => { invalidateRequirements(); },
    onError: (e) => toast.error(`Failed to add item: ${e.message}`),
  });

  const createSubrent = useMutation({
    mutationFn: (data) => db.entities.RoundtableSubrent.create({
      ...data,
      show_id: showId,
      show_name: showName,
      room_id: room.id,
      room_name: room.name,
      added_by: currentUser?.email,
    }),
    // ✅ Do NOT close the form — user may want to add more items
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roundtable_subrents', showId] });
    },
    onError: (e) => toast.error(`Failed to add sub-rent item: ${e.message}`),
  });

  const handleDragEnd = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const newOrder = Array.from(orderedReqIds);
    const [moved] = newOrder.splice(result.source.index, 1);
    newOrder.splice(result.destination.index, 0, moved);
    setOrderedReqIds(newOrder);
    // Persist sort_order to DB
    newOrder.forEach((id, idx) => {
      db.entities.ShowRequirement.update(id, { sort_order: idx }).catch(() => {});
    });
  };

  const updateReq = useMutation({
    mutationFn: ({ id, data }) => db.entities.ShowRequirement.update(id, data),
    onSuccess: () => invalidateRequirements(),
    onError: (e) => toast.error(`Failed to update item: ${e.message}`),
  });

  const deleteReq = useMutation({
    mutationFn: (id) => db.entities.ShowRequirement.delete(id),
    onSuccess: () => invalidateRequirements(),
    onError: (e) => toast.error(`Failed to remove item: ${e.message}`),
  });

  const [editingSubrentId, setEditingSubrentId] = useState(null);
  const [subrentDraft, setSubrentDraft] = useState({});

  const updateSubrent = useMutation({
    mutationFn: ({ id, data }) => db.entities.RoundtableSubrent.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roundtable_subrents', showId] }); setEditingSubrentId(null); },
    onError: (e) => toast.error(`Failed to update sub-rent item: ${e.message}`),
  });
  const deleteSubrent = useMutation({
    mutationFn: (id) => db.entities.RoundtableSubrent.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roundtable_subrents', showId] }),
    onError: (e) => toast.error(`Failed to remove sub-rent item: ${e.message}`),
  });

  const startEditSubrent = (s) => {
    setSubrentDraft({
      item_name: s.item_name,
      partner_name: s.partner_name,
      quantity: s.quantity || 1,
      internal_cost: s.internal_cost || s.total_cost || 0,
      billable_amount: s.billable_amount || 0,
      notes: s.notes || '',
      vendor_reference: s.vendor_reference || '',
      source_type: s.source_type || 'company_fulfilled',
    });
    setEditingSubrentId(s.id);
  };

  const saveSubrent = (id) => {
    const intCost = parseFloat(subrentDraft.internal_cost) || 0;
    updateSubrent.mutate({ id, data: { ...subrentDraft, internal_cost: intCost, total_cost: intCost, billable_amount: parseFloat(subrentDraft.billable_amount) || 0, quantity: parseInt(subrentDraft.quantity) || 1 } });
  };

  const getFulfillmentCount = (reqId) => fulfillments.filter(f => f.requirement_id === reqId && f.movement_state !== 'returned').length;

  const totalNeeded = requirements.reduce((s, r) => s + (r.quantity_needed || 1), 0);
  const totalFulfilled = requirements.reduce((s, r) => s + Math.min(getFulfillmentCount(r.id), r.quantity_needed || 1), 0);
  const totalItems = requirements.length + subrents.length;
  const hasSubrents = subrents.length > 0;

  const handleSaveName = () => {
    if (editName.trim()) { onRenameRoom(room.id, editName); setIsEditing(false); }
  };

  const fulfillmentLabel = totalNeeded > 0
    ? `${totalFulfilled}/${totalNeeded} picked`
    : null;

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center justify-between p-4 bg-secondary/30 cursor-pointer hover:bg-secondary/40 transition-colors"
        onClick={() => onToggleExpand(room.id)}
      >
        <div className="flex items-center gap-3 flex-1">
          <ChevronDown className={cn("w-4 h-4 transition-transform", !isExpanded && "-rotate-90")} />
          
          {isEditing ? (
            <div className="flex gap-2 flex-1" onClick={e => e.stopPropagation()}>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" autoFocus />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveName}><Check className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsEditing(false); setEditName(room.name); }}><X className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">{room.name}</h3>
                {hasSubrents && (
                  <Badge className="text-xs bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1">
                    <Handshake className="w-3 h-3" /> {subrents.length} subrent{subrents.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {fulfillmentLabel && (
                  <Badge className={cn(
                    "text-xs",
                    totalFulfilled >= totalNeeded ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" :
                    totalFulfilled > 0 ? "bg-amber-500/15 text-amber-500 border-amber-500/30" :
                    "bg-muted text-muted-foreground"
                  )}>
                    {fulfillmentLabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {room.type} • {totalItems} item{totalItems !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDeleteRoom(room.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Sub-rent activation inline panel */}
      {subrentActivationReq && (
        <div className="p-4 border-t border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Handshake className="w-4 h-4 text-amber-500" />
            <p className="text-sm font-semibold text-amber-500">Activate Sub-Rent: {subrentActivationReq.product_name}</p>
            <button onClick={() => setSubrentActivationReq(null)} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            This item will be converted to a sub-rent / roundtable request. Fill in the details below.
          </p>
          <MasterAddEquipmentForm
            assets={allAssets}
            kits={allKits}
            initialMode="subrent"
            onAddOwned={() => {}}
            onAddSubRent={(data) => {
              createSubrent.mutate({
                ...data,
                item_name: data.item_name || subrentActivationReq.product_name,
              });
              setSubrentActivationReq(null);
            }}
            onClose={() => setSubrentActivationReq(null)}
          />
        </div>
      )}

      {isExpanded && (
        <div className="p-4 space-y-3 border-t border-border">

          {/* ── TOP ACTION AREA: button or open form ── */}
          {showAddForm ? (
            <MasterAddEquipmentForm
              assets={allAssets}
              kits={allKits}
              onAddOwned={(data) => createReq.mutate(data)}
              onAddSubRent={(data) => createSubrent.mutate(data)}
              onClose={() => setShowAddForm(false)}
            />
          ) : (
            <Button size="sm" variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Equipment
            </Button>
          )}

          {/* ── ITEM LIST below the add control ── */}
          {requirements.length === 0 && subrents.length === 0 ? (
            <div className="text-center py-6">
              <Package className="w-7 h-7 mx-auto mb-2 text-muted-foreground opacity-40" />
              <p className="text-sm text-muted-foreground">No gear planned for this room yet</p>
            </div>
          ) : (
            <>
              {/* ── Draggable Requirements List ── */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={`room-${room.id}`}>
                  {(provided) => (
                    <div
                      className="space-y-2"
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {sortedRequirements.map((req, index) => {
                        const cInfo = reqConflictInfo(req);
                        const missing = isNotInInventory(req);
                        return (
                          <Draggable key={req.id} draggableId={req.id} index={index}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                className={cn(dragSnapshot.isDragging && "opacity-80 shadow-lg")}
                              >
                                <RequirementLine
                                  req={req}
                                  fulfillmentCount={getFulfillmentCount(req.id)}
                                  onUpdate={(data) => updateReq.mutate({ id: req.id, data })}
                                  onDelete={() => deleteReq.mutate(req.id)}
                                  conflictInfo={cInfo}
                                  isNotInInventory={missing}
                                  onActivateSubrent={(r) => setSubrentActivationReq(r)}
                                  dragHandleProps={dragProvided.dragHandleProps}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Subrented items inline */}
              <div className="space-y-2">
                {subrents.map(s => (
                  editingSubrentId === s.id ? (
                    /* ── Edit mode ── */
                    <div key={s.id} className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Handshake className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Edit Sub-Rent</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-0.5 block">Item / Description</label>
                          <Input value={subrentDraft.item_name} onChange={e => setSubrentDraft(d => ({ ...d, item_name: e.target.value }))} className="h-7 text-sm" />
                        </div>
                        <div className="w-16">
                          <label className="text-xs text-muted-foreground mb-0.5 block">Qty</label>
                          <Input type="number" min="1" value={subrentDraft.quantity} onChange={e => setSubrentDraft(d => ({ ...d, quantity: e.target.value }))} className="h-7 text-sm" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-0.5 block">Vendor / Partner</label>
                          <Input value={subrentDraft.partner_name} onChange={e => setSubrentDraft(d => ({ ...d, partner_name: e.target.value }))} className="h-7 text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-0.5 block">Source Type</label>
                          <Select value={subrentDraft.source_type} onValueChange={v => setSubrentDraft(d => ({ ...d, source_type: v }))}>
                            <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="from_inventory">From Inventory</SelectItem>
                              <SelectItem value="company_fulfilled">Company Fulfilled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-0.5 block">Internal Cost ($)</label>
                          <Input type="number" min="0" step="0.01" value={subrentDraft.internal_cost} onChange={e => setSubrentDraft(d => ({ ...d, internal_cost: e.target.value }))} className="h-7 text-sm" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-0.5 block">Billable to Client ($)</label>
                          <Input type="number" min="0" step="0.01" value={subrentDraft.billable_amount} onChange={e => setSubrentDraft(d => ({ ...d, billable_amount: e.target.value }))} className="h-7 text-sm" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-0.5 block">Vendor Ref / PO</label>
                        <Input value={subrentDraft.vendor_reference} onChange={e => setSubrentDraft(d => ({ ...d, vendor_reference: e.target.value }))} className="h-7 text-sm" placeholder="Optional" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-0.5 block">Notes</label>
                        <Input value={subrentDraft.notes} onChange={e => setSubrentDraft(d => ({ ...d, notes: e.target.value }))} className="h-7 text-sm" placeholder="Optional" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="flex-1 bg-amber-500/90 hover:bg-amber-500 text-white" onClick={() => saveSubrent(s.id)}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingSubrentId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── View mode ── */
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                      <Handshake className="w-4 h-4 text-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight">{s.item_name}</p>
                        <div className="flex gap-1.5 mt-1 flex-wrap items-center">
                          <RoundtableBadge partnerName={s.partner_name} size="sm" />
                          {s.source_type === 'company_fulfilled' && (
                            <Badge variant="outline" className="text-xs border-muted text-muted-foreground">Fulfilled</Badge>
                          )}
                          {s.vendor_reference && (
                            <span className="text-xs text-muted-foreground">Ref: {s.vendor_reference}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        {s.quantity > 1 && <p className="font-semibold text-foreground">×{s.quantity}</p>}
                        {(s.internal_cost > 0 || s.total_cost > 0) && (
                          <p className="text-amber-500">Cost: ${parseFloat(s.internal_cost || s.total_cost || 0).toFixed(2)}</p>
                        )}
                        {s.billable_amount > 0 && (
                          <p className="text-emerald-500">Bill: ${parseFloat(s.billable_amount).toFixed(2)}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => startEditSubrent(s)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteSubrent.mutate(s.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                ))}
              </div>

            </>
          )}
        </div>
      )}
    </Card>
  );
}