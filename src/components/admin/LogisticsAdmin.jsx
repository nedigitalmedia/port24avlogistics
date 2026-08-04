import React, { useState, useMemo } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Pencil, Trash2, Archive, RotateCcw, Plane, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const TRAVEL_TYPES = [
  { value: 'crew_flight',     label: 'Crew Flight' },
  { value: 'crew_hotel',      label: 'Hotel / Accommodation' },
  { value: 'crew_rideshare',  label: 'Rideshare / Car Service' },
  { value: 'crew_rental_car', label: 'Rental Car (Crew)' },
  { value: 'crew_mileage',    label: 'Crew Mileage' },
  { value: 'crew_perdiem',    label: 'Per Diem' },
];

const TRANSPORT_TYPES = [
  { value: 'trucking',   label: 'Trucking / Freight' },
  { value: 'freight',    label: 'Freight Carrier' },
  { value: 'transport',  label: 'Ground Transport / Van' },
  { value: 'general',    label: 'General Logistics' },
];

const LOGISTICS_TYPES = [...TRAVEL_TYPES, ...TRANSPORT_TYPES];

const emptyRecord = {
name: '',
logistics_type: 'general',
vendor: '',
contact_name: '',
contact_phone: '',
contact_email: '',
description: '',
vehicle_type: '',
origin: '',
destination: '',
base_address: '',
rate_per_mile: null,
billable_rate_per_mile: null,
default_cost: null,
default_billable_amount: null,
notes: '',
is_active: true,
};

export default function LogisticsAdmin() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterActive, setFilterActive] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState(emptyRecord);

  const queryClient = useQueryClient();

  const { data: records = [] } = useQuery({
    queryKey: ['logisticsBank'],
    queryFn: () => db.entities.LogisticsBank.list('-created_date'),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingRecord
      ? db.entities.LogisticsBank.update(editingRecord.id, data)
      : db.entities.LogisticsBank.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logisticsBank'] });
      setDialogOpen(false);
      setEditingRecord(null);
      setFormData(emptyRecord);
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.LogisticsBank.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logisticsBank'] }),
    onError: (e) => toast.error(`Failed to delete: ${e.message}`),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (record) => db.entities.LogisticsBank.update(record.id, { is_active: !record.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['logisticsBank'] }),
    onError: (e) => toast.error(`Failed to update: ${e.message}`),
  });

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchesSearch = 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.contact_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.contact_email || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || r.logistics_type === filterType;
      const matchesActive = filterActive === 'all' || (filterActive === 'active' ? r.is_active : !r.is_active);
      
      return matchesSearch && matchesType && matchesActive;
    });
  }, [records, searchTerm, filterType, filterActive]);

  const openCreate = () => {
    setEditingRecord(null);
    setFormData(emptyRecord);
    setDialogOpen(true);
  };

  const openEdit = (record) => {
    setEditingRecord(record);
    setFormData(record);
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const getTypeLabel = (type) => LOGISTICS_TYPES.find(t => t.value === type)?.label || type;
  const isTravelType = (type) => TRAVEL_TYPES.some(t => t.value === type);

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base">Reusable Logistics Records</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Master records for trucks, hotels, vendors, and transport. Projects will select from these records.</p>
            </div>
            <Button size="sm" onClick={openCreate} className="gap-2 w-fit">
              <Plus className="w-4 h-4" /> Add Record
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, vendor, contact, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs mb-1.5 block">Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {LOGISTICS_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs mb-1.5 block">Status</Label>
                <Select value={filterActive} onValueChange={setFilterActive}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Grid */}
      <div>
        {filteredRecords.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No logistics records found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredRecords.map(record => (
              <Card key={record.id} className={record.is_active ? '' : 'opacity-60'}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Record Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <div>
                          <p className="font-semibold text-sm">{record.name}</p>
                          <p className="text-xs text-muted-foreground">{record.vendor || '—'}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          {getTypeLabel(record.logistics_type)}
                        </Badge>
                        <Badge variant="outline" className={`text-xs whitespace-nowrap ${isTravelType(record.logistics_type) ? 'text-blue-400 border-blue-500/30' : 'text-orange-400 border-orange-500/30'}`}>
                          {isTravelType(record.logistics_type) ? <><Plane className="w-2.5 h-2.5 inline mr-1" />Travel</> : <><Truck className="w-2.5 h-2.5 inline mr-1" />Transport</>}
                        </Badge>
                        {!record.is_active && <Badge variant="outline" className="text-xs">Inactive</Badge>}
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mt-3 p-2 bg-muted/30 rounded">
                        {record.contact_name && (
                          <div>
                            <p className="text-muted-foreground">Contact</p>
                            <p className="font-medium text-xs">{record.contact_name}</p>
                          </div>
                        )}
                        {record.contact_phone && (
                          <div>
                            <p className="text-muted-foreground">Phone</p>
                            <p className="font-medium text-xs">{record.contact_phone}</p>
                          </div>
                        )}
                        {record.contact_email && (
                          <div>
                            <p className="text-muted-foreground">Email</p>
                            <p className="font-medium text-xs truncate">{record.contact_email}</p>
                          </div>
                        )}
                        {record.rate_per_mile && (
                          <div>
                            <p className="text-muted-foreground">Rate / Mile</p>
                            <p className="font-medium text-xs">${record.rate_per_mile}/mi</p>
                          </div>
                        )}
                        {record.billable_rate_per_mile && (
                          <div>
                            <p className="text-muted-foreground">Bill Rate / Mile</p>
                            <p className="font-medium text-xs text-primary">${record.billable_rate_per_mile}/mi</p>
                          </div>
                        )}
                        {record.base_address && (
                          <div className="col-span-2 sm:col-span-3">
                            <p className="text-muted-foreground">Base Address</p>
                            <p className="font-medium text-xs">{record.base_address}</p>
                          </div>
                        )}
                        {record.default_cost && (
                          <div>
                            <p className="text-muted-foreground">Flat Cost</p>
                            <p className="font-medium text-xs">${record.default_cost}</p>
                          </div>
                        )}
                        {record.default_billable_amount && (
                          <div>
                            <p className="text-muted-foreground">Flat Billable</p>
                            <p className="font-medium text-xs text-primary">${record.default_billable_amount}</p>
                          </div>
                        )}
                        {record.origin && (
                          <div>
                            <p className="text-muted-foreground">From</p>
                            <p className="font-medium text-xs">{record.origin}</p>
                          </div>
                        )}
                        {record.destination && (
                          <div>
                            <p className="text-muted-foreground">To</p>
                            <p className="font-medium text-xs">{record.destination}</p>
                          </div>
                        )}
                      </div>

                      {record.description && (
                        <p className="text-xs text-muted-foreground italic mt-2">{record.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 sm:flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(record)}
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleActiveMutation.mutate(record)}
                        title={record.is_active ? 'Archive' : 'Reactivate'}
                      >
                        {record.is_active ? (
                          <Archive className="w-3.5 h-3.5" />
                        ) : (
                          <RotateCcw className="w-3.5 h-3.5" />
                        )}
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Logistics Record</AlertDialogTitle>
                            <AlertDialogDescription>
                              Delete "{record.name}"? This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate(record.id)}
                              className="bg-destructive text-destructive-foreground"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Edit Logistics Record' : 'Add Logistics Record'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground">Basic Information</p>
              
              <div>
                <Label className="text-xs">Record Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. UPS Freight NYC"
                  required
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Logistics Type *</Label>
                <Select value={formData.logistics_type} onValueChange={(v) => setFormData({ ...formData, logistics_type: v })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_header_travel" disabled className="text-xs font-bold text-primary uppercase tracking-wide">Travel (People)</SelectItem>
                    {TRAVEL_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="pl-4">{t.label}</SelectItem>
                    ))}
                    <SelectItem value="_header_transport" disabled className="text-xs font-bold text-accent uppercase tracking-wide mt-1">Transport (Gear)</SelectItem>
                    {TRANSPORT_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className="pl-4">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Vendor / Company</Label>
                  <Input
                    value={formData.vendor}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="Company name"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Service Type</Label>
                  <Input
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    placeholder="e.g. Semi Truck, Van"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground">Contact Information</p>
              
              <div>
                <Label className="text-xs">Contact Name</Label>
                <Input
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Primary contact"
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="email@vendor.com"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Locations & Routing */}
            <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground">Locations</p>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Origin / Pickup</Label>
                  <Input
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    placeholder="City or address"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Destination / Drop</Label>
                  <Input
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    placeholder="City or address"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Transport-specific: base address + mileage rates */}
              {isTravelType(formData.logistics_type) === false && (
                <>
                  <div>
                    <Label className="text-xs">Base / Origin Address <span className="text-muted-foreground font-normal">(used for mileage calculation)</span></Label>
                    <Input
                      value={formData.base_address || ''}
                      onChange={(e) => setFormData({ ...formData, base_address: e.target.value })}
                      placeholder="Full address of your warehouse / depot"
                      className="text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Rate / Mile (Internal)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.rate_per_mile || ''}
                        onChange={(e) => setFormData({ ...formData, rate_per_mile: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="e.g. 3.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Rate / Mile (Billable)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.billable_rate_per_mile || ''}
                        onChange={(e) => setFormData({ ...formData, billable_rate_per_mile: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="e.g. 4.00"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Default Flat Cost <span className="text-muted-foreground font-normal">(fallback)</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.default_cost || ''}
                    onChange={(e) => setFormData({ ...formData, default_cost: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Default Billable <span className="text-muted-foreground font-normal">(fallback)</span></Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.default_billable_amount || ''}
                    onChange={(e) => setFormData({ ...formData, default_billable_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="0.00"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-3 p-3 bg-muted/20 rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground">Additional Information</p>
              
              <div>
                <Label className="text-xs">Description / Summary</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief overview of service"
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="text-xs">Internal Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Terms, special instructions, etc."
                  className="text-sm"
                />
              </div>
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
              <div>
                <p className="text-xs font-medium">Active</p>
                <p className="text-xs text-muted-foreground">Make available for projects</p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editingRecord ? 'Save Changes' : 'Add Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}