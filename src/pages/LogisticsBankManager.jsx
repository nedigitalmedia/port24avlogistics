import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';

const LOGISTICS_TYPES = [
  'crew_flight',
  'crew_hotel',
  'crew_rental_car',
  'crew_rideshare',
  'crew_mileage',
  'crew_perdiem',
  'trucking',
  'freight',
  'transport',
  'general',
];

const LOGISTICS_TYPE_LABELS = {
  crew_flight: 'Crew Flight',
  crew_hotel: 'Crew Hotel',
  crew_rental_car: 'Crew Rental Car',
  crew_rideshare: 'Crew Rideshare',
  crew_mileage: 'Crew Mileage',
  crew_perdiem: 'Crew Per Diem',
  trucking: 'Trucking',
  freight: 'Freight',
  transport: 'Transport',
  general: 'General',
};

export default function LogisticsBankManager() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({
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
    default_cost: '',
    notes: '',
    is_active: true,
  });

  // Fetch all logistics bank records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['logisticsBank'],
    queryFn: () => db.entities.LogisticsBank.list(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => db.entities.LogisticsBank.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logisticsBank'] });
      resetForm();
      setShowDialog(false);
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.LogisticsBank.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logisticsBank'] });
      resetForm();
      setShowDialog(false);
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.LogisticsBank.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logisticsBank'] });
    },
    onError: (e) => toast.error(`Failed to delete: ${e.message}`),
  });

  const resetForm = () => {
    setFormData({
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
      default_cost: '',
      notes: '',
      is_active: true,
    });
    setEditingRecord(null);
  };

  const handleOpenDialog = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData(record);
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      default_cost: formData.default_cost ? Number(formData.default_cost) : 0,
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure you want to delete this logistics bank record?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <PageHeader
          title="Logistics Bank Manager"
          description="Create and manage your library of logistics vendors, hotels, and transport services"
        />

        {/* Add New Record Button */}
        <div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()} className="gap-2">
                <Plus className="w-4 h-4" />
                Add New Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingRecord ? 'Edit Logistics Record' : 'Add New Logistics Record'}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Name *</label>
                    <Input
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., UPS Freight NYC"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Type *</label>
                    <Select value={formData.logistics_type} onValueChange={(v) => setFormData({ ...formData, logistics_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOGISTICS_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            {LOGISTICS_TYPE_LABELS[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Vendor & Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Vendor Name</label>
                    <Input
                      value={formData.vendor}
                      onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                      placeholder="e.g., UPS, Marriott Hotels"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Contact Name</label>
                    <Input
                      value={formData.contact_name}
                      onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                      placeholder="Primary contact person"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Contact Phone</label>
                    <Input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Contact Email</label>
                    <Input
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      placeholder="Email address"
                    />
                  </div>
                </div>

                {/* Location & Vehicle */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Origin</label>
                    <Input
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      placeholder="Default origin location"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Destination</label>
                    <Input
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="Default destination"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Vehicle Type</label>
                    <Input
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                      placeholder="e.g., Truck, Van, Sedan"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Default Cost</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.default_cost}
                      onChange={(e) => setFormData({ ...formData, default_cost: e.target.value })}
                      placeholder="$0.00"
                    />
                  </div>
                </div>

                {/* Description & Notes */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Service description or route summary"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Master Notes</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Standard terms, special instructions, etc."
                    rows={3}
                  />
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium">
                    Active (available for selection)
                  </label>
                </div>

                {/* Submit */}
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowDialog(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {editingRecord ? 'Update Record' : 'Add Record'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Records List */}
        {isLoading ? (
          <div className="text-center py-8">Loading records...</div>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No logistics bank records yet. Click "Add New Record" to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {records.map(record => (
              <Card key={record.id} className={!record.is_active ? 'opacity-60' : ''}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{record.name}</h3>
                        <Badge variant={record.is_active ? 'default' : 'outline'}>
                          {record.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">{LOGISTICS_TYPE_LABELS[record.logistics_type]}</Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {record.vendor && <div><span className="text-muted-foreground">Vendor:</span> {record.vendor}</div>}
                        {record.contact_name && <div><span className="text-muted-foreground">Contact:</span> {record.contact_name}</div>}
                        {record.contact_phone && <div><span className="text-muted-foreground">Phone:</span> {record.contact_phone}</div>}
                        {record.contact_email && <div><span className="text-muted-foreground">Email:</span> {record.contact_email}</div>}
                        {record.origin && <div><span className="text-muted-foreground">From:</span> {record.origin}</div>}
                        {record.destination && <div><span className="text-muted-foreground">To:</span> {record.destination}</div>}
                        {record.vehicle_type && <div><span className="text-muted-foreground">Vehicle:</span> {record.vehicle_type}</div>}
                        {record.default_cost && <div><span className="text-muted-foreground">Base Cost:</span> ${record.default_cost}</div>}
                      </div>

                      {record.description && <p className="text-sm text-muted-foreground">{record.description}</p>}
                      {record.notes && <p className="text-xs text-muted-foreground italic">{record.notes}</p>}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleOpenDialog(record)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(record.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}