import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Upload } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from 'sonner';

export default function LaborRateManager() {
  const queryClient = useQueryClient();
  const [editingRate, setEditingRate] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    role: '',
    labor_type: 'crew',
    union_type: 'non_union',
    hourly_rate_internal: '',
    hourly_rate_billable: '',
    overtime_rate_internal: '',
    overtime_rate_billable: '',
    daily_rate_internal: '',
    daily_rate_billable: '',
    half_day_rate_internal: '',
    half_day_rate_billable: '',
    travel_rate_internal: '',
    travel_rate_billable: '',
    notes: '',
    is_active: true,
  });

  const { data: rates = [] } = useQuery({
    queryKey: ['laborRates'],
    queryFn: () => db.entities.LaborRate.list()
  });

  const createRateMutation = useMutation({
    mutationFn: (data) => db.entities.LaborRate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborRates'] });
      resetForm();
      setOpenDialog(false);
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  const updateRateMutation = useMutation({
    mutationFn: (data) => db.entities.LaborRate.update(editingRate.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laborRates'] });
      resetForm();
      setOpenDialog(false);
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  const deleteRateMutation = useMutation({
    mutationFn: (id) => db.entities.LaborRate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['laborRates'] }),
    onError: (e) => toast.error(`Failed to delete: ${e.message}`),
  });

  const handleEdit = (rate) => {
    setEditingRate(rate);
    setFormData(rate);
    setOpenDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      hourly_rate_internal: parseFloat(formData.hourly_rate_internal) || 0,
      hourly_rate_billable: parseFloat(formData.hourly_rate_billable) || 0,
      overtime_rate_internal: parseFloat(formData.overtime_rate_internal) || 0,
      overtime_rate_billable: parseFloat(formData.overtime_rate_billable) || 0,
      daily_rate_internal: parseFloat(formData.daily_rate_internal) || 0,
      daily_rate_billable: parseFloat(formData.daily_rate_billable) || 0,
      half_day_rate_internal: parseFloat(formData.half_day_rate_internal) || 0,
      half_day_rate_billable: parseFloat(formData.half_day_rate_billable) || 0,
      travel_rate_internal: parseFloat(formData.travel_rate_internal) || 0,
      travel_rate_billable: parseFloat(formData.travel_rate_billable) || 0,
    };

    if (editingRate) {
      updateRateMutation.mutate(payload);
    } else {
      createRateMutation.mutate(payload);
    }
  };

  const resetForm = () => {
    setEditingRate(null);
    setFormData({
      role: '',
      labor_type: 'crew',
      union_type: 'non_union',
      hourly_rate_internal: '',
      hourly_rate_billable: '',
      overtime_rate_internal: '',
      overtime_rate_billable: '',
      daily_rate_internal: '',
      daily_rate_billable: '',
      half_day_rate_internal: '',
      half_day_rate_billable: '',
      travel_rate_internal: '',
      travel_rate_billable: '',
      notes: '',
      is_active: true,
    });
  };

  return (
    <div>
      <PageHeader
        title="Labor Rate Library"
        description="Manage labor rates for crew assignments"
        actions={
          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Rate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRate ? 'Edit Rate' : 'Create New Rate'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    placeholder="e.g. A1, Camera Op"
                    required
                  />
                  <Select value={formData.labor_type} onValueChange={(v) => setFormData({ ...formData, labor_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="crew">Crew</SelectItem>
                      <SelectItem value="labor">Labor</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Select value={formData.union_type} onValueChange={(v) => setFormData({ ...formData, union_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="union">Union</SelectItem>
                      <SelectItem value="non_union">Non-Union</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Hourly Rates</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      label="Internal Cost/hr"
                      value={formData.hourly_rate_internal}
                      onChange={(e) => setFormData({ ...formData, hourly_rate_internal: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Billable Rate/hr"
                      value={formData.hourly_rate_billable}
                      onChange={(e) => setFormData({ ...formData, hourly_rate_billable: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Overtime Rates</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      label="Internal OT/hr"
                      value={formData.overtime_rate_internal}
                      onChange={(e) => setFormData({ ...formData, overtime_rate_internal: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Billable OT/hr"
                      value={formData.overtime_rate_billable}
                      onChange={(e) => setFormData({ ...formData, overtime_rate_billable: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Daily Rates</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      label="Internal Full Day"
                      value={formData.daily_rate_internal}
                      onChange={(e) => setFormData({ ...formData, daily_rate_internal: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Billable Full Day"
                      value={formData.daily_rate_billable}
                      onChange={(e) => setFormData({ ...formData, daily_rate_billable: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Half Day Rates</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      label="Internal Half Day"
                      value={formData.half_day_rate_internal}
                      onChange={(e) => setFormData({ ...formData, half_day_rate_internal: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Billable Half Day"
                      value={formData.half_day_rate_billable}
                      onChange={(e) => setFormData({ ...formData, half_day_rate_billable: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Travel</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      label="Internal Travel"
                      value={formData.travel_rate_internal}
                      onChange={(e) => setFormData({ ...formData, travel_rate_internal: e.target.value })}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      label="Billable Travel"
                      value={formData.travel_rate_billable}
                      onChange={(e) => setFormData({ ...formData, travel_rate_billable: e.target.value })}
                    />
                  </div>
                </div>

                <Input
                  label="Notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setOpenDialog(false)}>Cancel</Button>
                  <Button type="submit">Save Rate</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4">
        {rates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No labor rates configured. Create one to get started.
            </CardContent>
          </Card>
        ) : (
          rates.map(rate => (
            <Card key={rate.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{rate.role}</CardTitle>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={rate.is_active ? 'default' : 'outline'}>
                        {rate.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{rate.labor_type}</Badge>
                      <Badge variant="outline">{rate.union_type}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(rate)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteRateMutation.mutate(rate.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {rate.hourly_rate_internal && (
                    <div>
                      <p className="text-muted-foreground">Hourly</p>
                      <p className="font-mono">${rate.hourly_rate_internal.toFixed(2)} / ${rate.hourly_rate_billable.toFixed(2)}</p>
                    </div>
                  )}
                  {rate.daily_rate_internal && (
                    <div>
                      <p className="text-muted-foreground">Daily</p>
                      <p className="font-mono">${rate.daily_rate_internal.toFixed(2)} / ${rate.daily_rate_billable.toFixed(2)}</p>
                    </div>
                  )}
                  {rate.overtime_rate_internal && (
                    <div>
                      <p className="text-muted-foreground">Overtime</p>
                      <p className="font-mono">${rate.overtime_rate_internal.toFixed(2)} / ${rate.overtime_rate_billable.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}