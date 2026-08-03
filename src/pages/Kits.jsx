import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Lock, Unlock, Trash2, ChevronDown, ChevronRight,
  AlertTriangle, Cloud, Archive, Search, X, DollarSign, Printer, Pencil
} from 'lucide-react';
import QRLabelPrinter from '@/components/assets/QRLabelPrinter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import AddEquipmentWizard from '@/components/assets/AddEquipmentWizard';
import ItemTypeSelectorModal from '@/components/assets/ItemTypeSelectorModal';
import KitEditDialog from '@/components/kits/KitEditDialog';
import AddKitInstanceDialog from '@/components/kits/AddKitInstanceDialog';
import { getSerialNumbersString } from '@/lib/serialNumbers';

const KIT_ICON = Archive; // Treasure chest / container icon

export default function Kits() {
  const [typeSelectorOpen, setTypeSelectorOpen] = useState(false);
  const [selectedKitType, setSelectedKitType] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [expandedKits, setExpandedKits] = useState({});
  const [kitTypeFilter, setKitTypeFilter] = useState('all');
  const [addItemSearch, setAddItemSearch] = useState('');
  const [addItemKitId, setAddItemKitId] = useState(null);
  const [itemQuantities, setItemQuantities] = useState({});
  const [printKit, setPrintKit] = useState(null); // kit being printed
  const [editKit, setEditKit] = useState(null); // kit being edited
  const [addInstanceKit, setAddInstanceKit] = useState(null); // kit to add a new physical instance from
  const queryClient = useQueryClient();

  const { data: kits = [] } = useQuery({
    queryKey: ['kits'],
    queryFn: () => db.entities.Kit.list(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    // Use filter({}) with a high limit to ensure we get ALL assets, not just the default page
    queryFn: () => db.entities.Asset.filter({}, '-updated_date', 2000),
  });



  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Kit.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kits'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Unlink all assets from this kit before deleting so kit_id doesn't point to ghost
      const linkedAssets = assets.filter(a => a.kit_id === id);
      await Promise.all(linkedAssets.map(a => db.entities.Asset.update(a.id, { kit_id: null })));
      await db.entities.Kit.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kits'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });

  // Add asset to kit with quantity support
  const addAssetToKit = (asset, kitId) => {
    const qty = itemQuantities[asset.id] || 1;
    
    // For bulk tracking, adjust quantity
    const updateData = { kit_id: kitId };
    if (asset.tracking === 'bulk') {
      updateData.quantity = (asset.quantity || 1) - qty;
    }
    
    db.entities.Asset.update(asset.id, updateData).then(() => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      const kit = kits.find(k => k.id === kitId);
      if (kit?.auto_price) recomputeKitPrice(kitId);
      setItemQuantities(prev => {
        const newState = { ...prev };
        delete newState[asset.id];
        return newState;
      });
      setAddItemSearch('');
    });
  };

  const removeAssetFromKit = (asset) => {
    db.entities.Asset.update(asset.id, { kit_id: null }).then(() => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    });
  };

  const recomputeKitPrice = (kitId) => {
    const kitAssets = assets.filter(a => a.kit_id === kitId);
    const total = kitAssets.reduce((sum, a) => sum + (a.daily_rate || 0), 0);
    updateMutation.mutate({ id: kitId, data: { daily_rate: total } });
  };

  const getKitAssets = (kitId) => assets.filter(a => a.kit_id === kitId);

  const toggleExpand = (kitId) => setExpandedKits(prev => ({ ...prev, [kitId]: !prev[kitId] }));

  const toggleSeal = (kit) => updateMutation.mutate({ id: kit.id, data: { is_sealed: !kit.is_sealed } });

  const filteredKits = kitTypeFilter === 'all' ? kits : kits.filter(k => (k.kit_type || 'serialized') === kitTypeFilter);

  // Asset search for adding to kit (exclude already-kitted items)
  // Uses serial_numbers (the real field) not the legacy serial_number
  const searchResults = addItemKitId && addItemSearch.length > 1
    ? assets.filter(a =>
        !a.kit_id &&
        (a.name?.toLowerCase().includes(addItemSearch.toLowerCase()) ||
         a.barcode?.toLowerCase().includes(addItemSearch.toLowerCase()) ||
         getSerialNumbersString(a).toLowerCase().includes(addItemSearch.toLowerCase()))
      ).slice(0, 20)
    : [];

  return (
    <div>
      <PageHeader
        title="Kits"
        description="Manage equipment kits — serialized cases and cloud bundles"
        actions={
          <div className="flex gap-2">
            <Select value={kitTypeFilter} onValueChange={setKitTypeFilter}>
              <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Kits</SelectItem>
                <SelectItem value="serialized">Serialized</SelectItem>
                <SelectItem value="cloud">Cloud Kits</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setTypeSelectorOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Kit</Button>
          </div>
        }
      />

      {filteredKits.length === 0 ? (
        <Card className="p-12 text-center">
          <KIT_ICON className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No kits yet. Create a serialized kit or a cloud kit.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredKits.map(kit => {
            const kitAssets = getKitAssets(kit.id);
            const expanded = expandedKits[kit.id];
            const missingCount = kit.status === 'checked_out'
              ? kitAssets.filter(a => a.status !== 'checked_out').length
              : 0;
            const isCloud = kit.kit_type === 'cloud';
            const addingToThis = addItemKitId === kit.id;

            // Auto price from contents
            const autoPrice = kit.auto_price
              ? kitAssets.reduce((s, a) => s + (a.daily_rate || 0), 0)
              : kit.daily_rate;

            return (
              <Card key={kit.id} className={cn("overflow-hidden", kit.is_sealed && "border-primary/30")}>
                <div className="p-4 flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleExpand(kit.id)}>
                    {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isCloud
                        ? <Cloud className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        : <KIT_ICON className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      <h3 className="font-semibold">{kit.name}</h3>
                      {kit.is_sealed && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 text-xs">
                          <Lock className="w-3 h-3" /> Sealed
                        </Badge>
                      )}
                      <StatusBadge status={kit.status || 'available'} />
                      {kit.auto_price && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <DollarSign className="w-2.5 h-2.5" /> Auto-price
                        </Badge>
                      )}
                    </div>
                    {kit.barcode && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">#{kit.barcode}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {kitAssets.length} item{kitAssets.length !== 1 ? 's' : ''}
                      {autoPrice ? ` · $${autoPrice}/day` : ''}
                    </p>
                  </div>

                  {missingCount > 0 && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                      <AlertTriangle className="w-3 h-3" /> {missingCount} missing
                    </Badge>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    {kit.kit_type === 'serialized' && (
                      <Button variant="outline" size="sm" className="gap-1.5"
                        onClick={() => setPrintKit(kit)}
                        title="Print QR label for the outside of this kit/case">
                        <Printer className="w-3.5 h-3.5" /> Kit QR
                      </Button>
                    )}
                    {kit.kit_type === 'serialized' && !kit.is_sealed && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditKit(kit)}>
                        <Pencil className="w-3.5 h-3.5" /> Edit Kit
                      </Button>
                    )}
                    {kit.kit_type === 'serialized' && (
                      <Button variant="outline" size="sm" className="gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                        onClick={() => setAddInstanceKit(kit)}
                        title="Create another physical instance of this kit type">
                        <Plus className="w-3.5 h-3.5" /> Add Instance
                      </Button>
                    )}
                    {kit.kit_type === 'serialized' && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => toggleSeal(kit)}>
                        {kit.is_sealed
                          ? <><Unlock className="w-3.5 h-3.5" /> Unseal Kit</>
                          : <><Lock className="w-3.5 h-3.5" /> Seal Kit</>}
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Kit</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete "{kit.name}"? Assets in this kit will not be deleted but will be unlinked.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate(kit.id)}
                            className="bg-destructive text-destructive-foreground"
                          >Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t bg-muted/30 p-4 space-y-3">
                    {/* Contents list — ALL linked items, sealed or not.
                        SOURCE OF TRUTH: assets where a.kit_id === this kit's ID.
                        SERIAL DISPLAY: show only the barcode/first-serial of that specific
                        asset record, NOT the full serial_numbers blob (which may contain
                        many serials that belong to other kits). */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Contents ({kitAssets.length} item{kitAssets.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    {kitAssets.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-2">No items assigned. {kit.is_sealed ? 'Unseal to add items.' : 'Use the search below to add existing inventory items.'}</p>
                    ) : (
                      <div className="space-y-1.5">
                        {kitAssets.map(a => {
                          // Show only the barcode (the scan alias assigned to this specific unit).
                          // Do NOT render serial_numbers — that field holds ALL serials for the
                          // product template and would show unrelated units.
                          const displayId = a.barcode || null;
                          return (
                            <div key={a.id} className="flex items-center gap-3 p-2 rounded-md bg-background border">
                              <KIT_ICON className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium">{a.name}</span>
                                {displayId && (
                                  <span className="text-xs text-muted-foreground font-mono ml-2">{displayId}</span>
                                )}
                              </div>
                              {a.daily_rate && <span className="text-xs text-muted-foreground shrink-0">${a.daily_rate}/day</span>}
                              <StatusBadge status={a.status} />
                              {!kit.is_sealed && (
                                <Button
                                  variant="ghost" size="icon" className="h-6 w-6 text-destructive shrink-0"
                                  title="Remove from kit (does not delete the asset)"
                                  onClick={() => removeAssetFromKit(a)}
                                ><X className="w-3 h-3" /></Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add items (only if not sealed) */}
                    {!kit.is_sealed && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Add Items from Inventory</p>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, barcode, or serial..."
                            className="pl-9 h-8 text-sm"
                            value={addingToThis ? addItemSearch : ''}
                            onFocus={() => setAddItemKitId(kit.id)}
                            onChange={e => { setAddItemKitId(kit.id); setAddItemSearch(e.target.value); }}
                          />
                        </div>
                        {addingToThis && searchResults.length > 0 && (
                           <div className="border rounded-md mt-1 divide-y bg-background shadow-sm">
                             {searchResults.map(a => {
                               const qty = itemQuantities[a.id] || 1;
                               const maxQty = a.tracking === 'bulk' ? (a.quantity || 1) : 1;
                               return (
                                 <div key={a.id} className="flex items-center gap-3 px-3 py-2 hover:bg-muted/50 text-left text-sm border-b last:border-b-0">
                                   <KIT_ICON className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                   <div className="flex-1 min-w-0">
                                     <span className="font-medium">{a.name}</span>
                                     <span className="text-xs text-muted-foreground font-mono ml-2">{a.barcode}</span>
                                   </div>
                                   {a.tracking === 'bulk' && (
                                     <div className="flex items-center gap-1">
                                       <span className="text-xs text-muted-foreground">Qty:</span>
                                       <input
                                         type="number"
                                         min="1"
                                         max={maxQty}
                                         value={qty}
                                         onChange={(e) => {
                                           const newQty = Math.min(Math.max(1, parseInt(e.target.value) || 1), maxQty);
                                           setItemQuantities(prev => ({ ...prev, [a.id]: newQty }));
                                         }}
                                         onClick={(e) => e.stopPropagation()}
                                         className="w-12 h-7 px-2 text-xs rounded bg-muted border border-border text-foreground"
                                       />
                                       <span className="text-xs text-muted-foreground">/{maxQty}</span>
                                     </div>
                                   )}
                                   <StatusBadge status={a.status} />
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     className="h-7 px-2 text-xs"
                                     onClick={() => addAssetToKit(a, kit.id)}
                                   >Add</Button>
                                 </div>
                               );
                             })}
                           </div>
                         )}
                        {addingToThis && addItemSearch.length > 1 && searchResults.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1 px-1">No unassigned items found. Only existing inventory items can be added.</p>
                        )}
                      </div>
                    )}

                    {/* Sealed notice */}
                    {kit.is_sealed && (
                      <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 rounded-md px-3 py-2">
                        <Lock className="w-3 h-3 shrink-0" />
                        <span>This kit is sealed — unseal to add or remove items.</span>
                      </div>
                    )}

                    {/* Auto-price sync */}
                    {kit.auto_price && (
                      <div className="flex items-center justify-between text-xs bg-emerald-500/5 border border-emerald-500/20 rounded-md px-3 py-2">
                        <span className="text-emerald-700">Auto-price from contents: <strong>${autoPrice}/day</strong></span>
                        <Button size="sm" variant="ghost" className="h-6 text-xs px-2"
                          onClick={() => recomputeKitPrice(kit.id)}>Refresh</Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <ItemTypeSelectorModal
        open={typeSelectorOpen}
        onOpenChange={setTypeSelectorOpen}
        allowedTypes={['physical_kit', 'cloud_kit']}
        onSelect={(type) => {
          setTypeSelectorOpen(false);
          setSelectedKitType(type);
          setTimeout(() => setWizardOpen(true), 50);
        }}
      />
      <AddEquipmentWizard
        open={wizardOpen}
        onOpenChange={(v) => { setWizardOpen(v); if (!v) setSelectedKitType(null); }}
        initialType={selectedKitType}
      />

      <KitEditDialog
        kit={editKit}
        open={!!editKit}
        onOpenChange={(v) => { if (!v) setEditKit(null); }}
      />

      <AddKitInstanceDialog
        sourceKit={addInstanceKit}
        open={!!addInstanceKit}
        onOpenChange={(v) => { if (!v) setAddInstanceKit(null); }}
      />

      {/* Print QR label for a Physical Kit — uses the kit's own barcode as the scan identity */}
      {printKit && (
        <QRLabelPrinter
          open={!!printKit}
          onOpenChange={(v) => { if (!v) setPrintKit(null); }}
          assets={[{
            id: printKit.id,
            name: printKit.name,
            serial_numbers: printKit.barcode || printKit.id,
            serial_number: printKit.barcode || printKit.id,
            barcode: printKit.barcode,
            category: printKit.category,
          }]}
        />
      )}
    </div>
  );
}