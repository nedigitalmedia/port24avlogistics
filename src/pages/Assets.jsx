import React, { useState, useCallback } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Trash2, Pencil, Package, PanelLeftClose, PanelLeft, QrCode, Printer, Cloud, PackageOpen, ShoppingCart, Building2 } from 'lucide-react';
import PartnerOwnershipBadge from '@/components/assets/PartnerOwnershipBadge';
import { ITEM_TYPES, getItemTypeLabel, inferItemType } from '@/lib/itemTypes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/shared/StatusBadge';
import AssetFormDialog from '@/components/assets/AssetFormDialog';
import CategoryTree, { buildTree, getDescendantIds } from '@/components/categories/CategoryTree';
import CategoryDialog from '@/components/categories/CategoryDialog';
import AddEquipmentWizard from '@/components/assets/AddEquipmentWizard';
import QRLabelPrinter from '@/components/assets/QRLabelPrinter';
import KitEditDialog from '@/components/kits/KitEditDialog';
import { usePermissions } from '@/lib/usePermissions';
import SerialNumbersDisplay from '@/components/assets/SerialNumbersDisplay';
import AssetBarcodeModal from '@/components/assets/AssetBarcodeModal';
import { ColumnToggle, ResizableHead, DEFAULT_COLUMNS } from '@/components/assets/ColumnManager';

export default function Assets() {
  const { canManageEquipment } = usePermissions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState('__all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [kitEditOpen, setKitEditOpen] = useState(false);
  const [editingKit, setEditingKit] = useState(null);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [newCatParentId, setNewCatParentId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [labelPrinterOpen, setLabelPrinterOpen] = useState(false);
  const [barcodeModalAsset, setBarcodeModalAsset] = useState(null);
  const [barcodeModalSerial, setBarcodeModalSerial] = useState(null);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const queryClient = useQueryClient();

  const handleColResize = useCallback((key, width) => {
    setColumns(cols => cols.map(c => c.key === key ? { ...c, width } : c));
  }, []);

  const col = (key) => columns.find(c => c.key === key);
  const vis = (key) => col(key)?.visible !== false;

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: () => db.entities.Asset.list('-created_date', 5000),
  });

  const { data: kits = [] } = useQuery({
    queryKey: ['kits'],
    queryFn: () => db.entities.Kit.list(),
  });

  // Icon-only type indicator using unified item type system
  function TypeIcon({ asset }) {
    const t = inferItemType(asset);
    if (t === 'cloud_kit') return <Cloud className="w-4 h-4 text-blue-400" title="Cloud Kit" />;
    if (t === 'physical_kit') return <PackageOpen className="w-4 h-4 text-amber-500" title="Physical Kit" />;
    if (t === 'consumable') return <ShoppingCart className="w-4 h-4 text-emerald-400" title="Consumable" />;
    return <Package className="w-4 h-4 text-muted-foreground" title="Physical Item" />;
  }

  // Merge kits into the equipment list as virtual rows
  const kitRows = kits.map(k => ({
    ...k,
    _isKit: true,
    barcode: k.barcode || '',
    serial_number: '',
    status: k.status || 'available',
    condition: null,
    category: k.category || '',   // use real saved category, no type-label fallback
  }));

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => db.entities.Category.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (asset) => asset._isKit ? db.entities.Kit.delete(asset.id) : db.entities.Asset.delete(asset.id),
    onSuccess: (_, asset) => queryClient.invalidateQueries({ queryKey: [asset._isKit ? 'kits' : 'assets'] }),
  });

  const saveCatMutation = useMutation({
    mutationFn: (data) => editingCat
      ? db.entities.Category.update(editingCat.id, data)
      : db.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setCatDialogOpen(false);
      setEditingCat(null);
    },
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id) => db.entities.Category.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      if (selectedCategoryId === deletedId) setSelectedCategoryId('__all');
    },
  });

  // Resolve which category names are included in the current selection (include descendants)
  const getFilteredCategoryNames = () => {
    if (selectedCategoryId === '__all') return null; // all
    if (selectedCategoryId === '__none') return []; // uncategorized sentinel

    // Build tree and get all descendant ids
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = { ...c, children: [] }; });
    categories.forEach(c => { if (c.parent_id && catMap[c.parent_id]) catMap[c.parent_id].children.push(catMap[c.id]); });
    const node = catMap[selectedCategoryId];
    if (!node) return null;
    const ids = getDescendantIds(node);
    return ids.map(id => categories.find(c => c.id === id)?.name).filter(Boolean);
  };

  const filteredCatNames = getFilteredCategoryNames();
  const selectedCat = categories.find(c => c.id === selectedCategoryId);

  const allItems = [...assets, ...kitRows];

  const filtered = allItems.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = !search ||
      a.name?.toLowerCase().includes(s) ||
      (a.barcode != null && String(a.barcode).toLowerCase().includes(s)) ||
      (a.serial_number != null && String(a.serial_number).toLowerCase().includes(s)) ||
      (a.serial_numbers && a.serial_numbers.toLowerCase().includes(s));
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchType = typeFilter === 'all' || inferItemType(a) === typeFilter;
    const matchOwnership = ownershipFilter === 'all' ||
      (ownershipFilter === 'owned' && (!a.ownership_type || a.ownership_type === 'owned')) ||
      (ownershipFilter === 'partner_stored' && a.ownership_type === 'partner_stored');
    // When actively searching, ignore the folder/category filter so results span all categories
    let matchCat = true;
    if (!search) {
      if (selectedCategoryId === '__none') matchCat = !a.category;
      else if (filteredCatNames !== null) matchCat = filteredCatNames.includes(a.category);
    }
    return matchSearch && matchStatus && matchType && matchCat && matchOwnership;
  });

  const openAddCat = (parentId) => { setEditingCat(null); setNewCatParentId(parentId); setCatDialogOpen(true); };
  const openEditCat = (cat) => { setEditingCat(cat); setNewCatParentId(cat.parent_id); setCatDialogOpen(true); };

  return (
    <div className="flex h-full gap-0">
      {/* Category sidebar */}
      {sidebarOpen && (
        <div className="w-56 shrink-0 border-r pr-3 mr-4 overflow-y-auto" style={{ minHeight: 0 }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Browse</span>
            <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground p-0.5 rounded">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
          <CategoryTree
            categories={categories}
            selectedId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
            onAdd={canManageEquipment ? openAddCat : undefined}
            onEdit={canManageEquipment ? openEditCat : undefined}
            onDelete={canManageEquipment ? (id) => deleteCatMutation.mutate(id) : undefined}
            assets={assets}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            {!sidebarOpen && (
              <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted">
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {selectedCategoryId === '__all' ? 'All Equipment' :
                 selectedCategoryId === '__none' ? 'Uncategorized' :
                 selectedCat?.name || 'Equipment'}
              </h1>
              <p className="text-sm text-muted-foreground">{filtered.length} items</p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button variant="outline" onClick={() => setLabelPrinterOpen(true)}>
                <Printer className="w-4 h-4 mr-2" /> Print Labels ({selectedIds.size})
              </Button>
            )}
            {canManageEquipment && (
              <Button onClick={() => setWizardOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add New Item
              </Button>
            )}
          </div>
        </div>

        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, barcode, or serial..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {ITEM_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-3.5 h-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="checked_out">Checked Out</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>
          <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
            <SelectTrigger className="w-44">
              <Building2 className="w-3.5 h-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ownership</SelectItem>
              <SelectItem value="owned">Owned by Us</SelectItem>
              <SelectItem value="partner_stored">Partner Stored</SelectItem>
            </SelectContent>
          </Select>
          <ColumnToggle columns={columns} onChange={setColumns} />
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full caption-bottom text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  {/* Checkbox */}
                  <th className="w-8 px-2 text-left align-middle">
                    <input
                      type="checkbox"
                      className="cursor-pointer"
                      checked={filtered.length > 0 && filtered.every(a => selectedIds.has(a.id))}
                      onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(a => a.id)) : new Set())}
                    />
                  </th>
                  {vis('type')      && <ResizableHead col={col('type')}      onResize={handleColResize} className="text-center">Type</ResizableHead>}
                  {vis('typeLabel') && <ResizableHead col={col('typeLabel')} onResize={handleColResize}></ResizableHead>}
                  {vis('name')      && <ResizableHead col={col('name')}      onResize={handleColResize}>Name</ResizableHead>}
                  {vis('serial')    && <ResizableHead col={col('serial')}    onResize={handleColResize}>Serial / Asset #</ResizableHead>}
                  {vis('category')  && <ResizableHead col={col('category')}  onResize={handleColResize}>Category</ResizableHead>}
                  {vis('status')    && <ResizableHead col={col('status')}    onResize={handleColResize}>Status</ResizableHead>}
                  {vis('condition') && <ResizableHead col={col('condition')} onResize={handleColResize}>Condition</ResizableHead>}
                  {vis('location')  && <ResizableHead col={col('location')}  onResize={handleColResize}>Location</ResizableHead>}
                  {/* Actions fixed */}
                  <th className="px-2 text-left align-middle text-xs font-medium text-muted-foreground w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={12} className="text-center py-12 text-muted-foreground">Loading assets...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-12">
                      <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                      <p className="text-muted-foreground">No assets found</p>
                    </td>
                  </tr>
                ) : filtered.map(asset => (
                  <tr
                    key={asset.id}
                    className={cn("border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors", selectedIds.has(asset.id) && "bg-primary/5")}
                    onDoubleClick={() => {
                      if (asset._isKit) {
                        setEditingKit(asset);
                        setKitEditOpen(true);
                      } else {
                        setEditingAsset(asset);
                        setFormOpen(true);
                      }
                    }}
                  >
                    <td className="px-2 py-2.5 w-8" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="cursor-pointer"
                        checked={selectedIds.has(asset.id)}
                        onChange={e => {
                          const next = new Set(selectedIds);
                          e.target.checked ? next.add(asset.id) : next.delete(asset.id);
                          setSelectedIds(next);
                        }}
                      />
                    </td>
                    {vis('type') && (
                      <td className="px-2 py-2.5 text-center" style={{ width: col('type').width }}>
                        <div className="flex items-center justify-center"><TypeIcon asset={asset} /></div>
                      </td>
                    )}
                    {vis('typeLabel') && (
                      <td className="px-2 py-2.5 text-xs text-muted-foreground truncate" style={{ width: col('typeLabel').width }}>
                        {getItemTypeLabel(inferItemType(asset))}
                      </td>
                    )}
                    {vis('name') && (
                      <td className="px-2 py-2.5 font-medium" style={{ width: col('name').width }}>
                        <div className="flex flex-col gap-0.5 truncate">
                          <span className="truncate">{asset.name}</span>
                          <PartnerOwnershipBadge asset={asset} size="sm" />
                        </div>
                      </td>
                    )}
                    {vis('serial') && (
                      <td className="px-2 py-2.5 text-muted-foreground" style={{ width: col('serial').width }}>
                        <SerialNumbersDisplay serialNumbers={asset.serial_numbers || asset.serial_number} />
                      </td>
                    )}
                    {vis('category') && (
                      <td className="px-2 py-2.5" style={{ width: col('category').width }}>
                        {asset.category ? (
                          <button
                            className="text-sm text-muted-foreground hover:text-primary transition-colors truncate max-w-full"
                            onClick={() => {
                              const cat = categories.find(c => c.name === asset.category);
                              if (cat) setSelectedCategoryId(cat.id);
                            }}
                          >
                            {asset.category}
                          </button>
                        ) : <span className="text-muted-foreground/50 text-xs">—</span>}
                      </td>
                    )}
                    {vis('status')    && <td className="px-2 py-2.5" style={{ width: col('status').width }}><StatusBadge status={asset.status} /></td>}
                    {vis('condition') && <td className="px-2 py-2.5" style={{ width: col('condition').width }}><StatusBadge status={asset.condition} /></td>}
                    {vis('location')  && <td className="px-2 py-2.5 text-sm text-muted-foreground truncate" style={{ width: col('location').width }}>{asset.location || '—'}</td>}
                    <td className="px-2 py-2.5 w-24" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {!asset._isKit && (asset.serial_numbers || asset.serial_number || asset.id) && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Show / Print Barcode" onClick={() => setBarcodeModalAsset(asset)}>
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canManageEquipment && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                            if (asset._isKit) {
                              setEditingKit(asset);
                              setKitEditOpen(true);
                            } else {
                              setEditingAsset(asset);
                              setFormOpen(true);
                            }
                          }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canManageEquipment && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                                <AlertDialogDescription>Delete "{asset.name}"? This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(asset)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Category dialog */}
      <CategoryDialog
        open={catDialogOpen}
        onOpenChange={setCatDialogOpen}
        category={editingCat}
        parentId={newCatParentId}
        categories={categories}
        onSave={(data) => saveCatMutation.mutate(data)}
      />

      <AddEquipmentWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />
      <AssetFormDialog open={formOpen} onOpenChange={setFormOpen} asset={editingAsset} />
      <KitEditDialog open={kitEditOpen} onOpenChange={setKitEditOpen} kit={editingKit} />
      <QRLabelPrinter
        open={labelPrinterOpen}
        onOpenChange={setLabelPrinterOpen}
        assets={barcodeModalSerial
          ? [{ ...(barcodeModalAsset || {}), serial_numbers: barcodeModalSerial, serial_number: barcodeModalSerial }]
          : barcodeModalAsset
            ? [barcodeModalAsset]
            : assets.filter(a => selectedIds.has(a.id))
        }
      />
      <AssetBarcodeModal
        open={!!barcodeModalAsset && !labelPrinterOpen}
        onOpenChange={(v) => { if (!v) { setBarcodeModalAsset(null); setBarcodeModalSerial(null); } }}
        asset={barcodeModalAsset}
        onPrintLabel={(asset, serial) => {
          setBarcodeModalSerial(serial || null);
          setBarcodeModalAsset(asset);
          setLabelPrinterOpen(true);
        }}
      />
    </div>
  );
}