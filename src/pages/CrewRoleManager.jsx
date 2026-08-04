import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import { getPricingMethodLabel } from '@/lib/crewRoleCalculations';
import { toast } from 'sonner';

const DEPARTMENTS = [
  'Audio', 'Video', 'Lighting', 'Grip', 'Electric', 'Stage', 'Production', 'Direction', 'Post-Production', 'Other'
];

const emptyRole = {
  role_name: '',
  department: 'Audio',
  pricing_method: 'hourly',
  hourly_rate_internal: 0,
  hourly_rate_billable: 0,
  fixed_cost_internal: 0,
  fixed_cost_billable: 0,
  days_count: 1,
  daily_rate_internal: 0,
  daily_rate_billable: 0,
  per_diem_enabled: false,
  per_diem_amount: 0,
  description: '',
  required_skills: '',
  certifications: '',
  planner_notes: '',
  is_active: true,
  show_in_crew_booking: true,
};

export default function CrewRoleManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState(emptyRole);
  const queryClient = useQueryClient();

  const { data: roles = [] } = useQuery({
    queryKey: ['crewRoles'],
    queryFn: () => db.entities.CrewRole.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      editingRole
        ? db.entities.CrewRole.update(editingRole.id, data)
        : db.entities.CrewRole.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crewRoles'] });
      setDialogOpen(false);
      setFormData(emptyRole);
      setEditingRole(null);
    },
    onError: (e) => toast.error(`Failed to save role: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.CrewRole.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crewRoles'] }),
    onError: (e) => toast.error(`Failed to delete role: ${e.message}`),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }) =>
      db.entities.CrewRole.update(id, { [field]: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crewRoles'] }),
    onError: (e) => toast.error(`Failed to update role: ${e.message}`),
  });

  const handleCreate = () => {
    setEditingRole(null);
    setFormData(emptyRole);
    setDialogOpen(true);
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData(role);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.role_name || !formData.department) return;
    saveMutation.mutate(formData);
  };

  const handleToggleActive = (role) => {
    toggleMutation.mutate({ id: role.id, field: 'is_active', value: !role.is_active });
  };

  const handleToggleShowBooking = (role) => {
    toggleMutation.mutate({ id: role.id, field: 'show_in_crew_booking', value: !role.show_in_crew_booking });
  };

  const activeRoles = roles.filter(r => r.is_active);
  const inactiveRoles = roles.filter(r => !r.is_active);

  const RoleTable = ({ roleList, showInactive = false }) => (
    roleList.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-8">
        {showInactive ? 'No inactive roles.' : 'No active roles yet.'}
      </p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Pricing</TableHead>
            <TableHead className="hidden md:table-cell">Rates</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roleList.map((role) => (
            <TableRow key={role.id} className={showInactive ? 'opacity-60' : ''}>
              <TableCell>
                <div>
                  <p className="font-medium">{role.role_name}</p>
                  {role.per_diem_enabled && (
                    <p className="text-xs text-primary/70">+ Per Diem ${parseFloat(role.per_diem_amount || 0).toFixed(2)}/day</p>
                  )}
                  {role.required_skills && (
                    <p className="text-xs text-muted-foreground">Skills: {role.required_skills}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{role.department}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{getPricingMethodLabel(role.pricing_method)}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell text-sm">
                <div className="space-y-1">
                  {role.pricing_method === 'hourly' && (
                    <>
                      <p className="text-xs">Cost: ${parseFloat(role.hourly_rate_internal || 0).toFixed(2)}/hr</p>
                      <p className="text-xs text-muted-foreground">Bill: ${parseFloat(role.hourly_rate_billable || 0).toFixed(2)}/hr</p>
                    </>
                  )}
                  {role.pricing_method === 'fixed' && (
                    <>
                      <p className="text-xs">Cost: ${parseFloat(role.fixed_cost_internal || 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Bill: ${parseFloat(role.fixed_cost_billable || 0).toFixed(2)}</p>
                    </>
                  )}
                  {role.pricing_method === 'days' && (
                    <>
                      <p className="text-xs">Cost: ${parseFloat(role.daily_rate_internal || 0).toFixed(2)}/day</p>
                      <p className="text-xs text-muted-foreground">Bill: ${parseFloat(role.daily_rate_billable || 0).toFixed(2)}/day</p>
                    </>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleShowBooking(role)}
                    title={role.show_in_crew_booking ? 'Hide from bookings' : 'Show in bookings'}
                  >
                    {role.show_in_crew_booking ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleToggleActive(role)}
                    title={role.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {role.is_active ? <span className="w-3.5 h-3.5 bg-green-500 rounded-full block" /> : <span className="w-3.5 h-3.5 bg-gray-400 rounded-full block" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(role)}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Role</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{role.role_name}". Existing crew assignments will not be affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(role.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  );

  return (
    <div>
      <PageHeader
        title="Crew Roles & Rates"
        description="Define crew positions, departments, and pricing rates for projects and bookings"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Active Roles</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Roles available for crew assignments and bookings</p>
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Add Role
          </Button>
        </CardHeader>
        <CardContent>
          <RoleTable roleList={activeRoles} />
        </CardContent>
      </Card>

      {inactiveRoles.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Inactive Roles</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Hidden from crew assignments</p>
          </CardHeader>
          <CardContent>
            <RoleTable roleList={inactiveRoles} showInactive />
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setEditingRole(null);
          setFormData(emptyRole);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Crew Role' : 'Create New Crew Role'}</DialogTitle>
          </DialogHeader>

          <form className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Role Name *</Label>
                  <Input
                    value={formData.role_name}
                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                    placeholder="e.g. A1, Camera Op, TD"
                    required
                  />
                </div>
                <div>
                  <Label>Department *</Label>
                  <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Role responsibilities and overview..."
                  className="h-20"
                />
              </div>
            </div>

            {/* Pricing Method */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Pricing Structure</h3>
              <div>
                <Label>Pricing Method *</Label>
                <Select value={formData.pricing_method} onValueChange={(v) => setFormData({ ...formData, pricing_method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                    <SelectItem value="fixed">Fixed Total</SelectItem>
                    <SelectItem value="days">Days @ Price = Total</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hourly Pricing */}
              {formData.pricing_method === 'hourly' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Internal Cost / Hour</Label>
                    <Input
                      type="number"
                      value={formData.hourly_rate_internal}
                      onChange={(e) => setFormData({ ...formData, hourly_rate_internal: parseFloat(e.target.value) })}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>Billable Rate / Hour</Label>
                    <Input
                      type="number"
                      value={formData.hourly_rate_billable}
                      onChange={(e) => setFormData({ ...formData, hourly_rate_billable: parseFloat(e.target.value) })}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {/* Fixed Pricing */}
              {formData.pricing_method === 'fixed' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Internal Cost (Flat)</Label>
                    <Input
                      type="number"
                      value={formData.fixed_cost_internal}
                      onChange={(e) => setFormData({ ...formData, fixed_cost_internal: parseFloat(e.target.value) })}
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>Billable Rate (Flat)</Label>
                    <Input
                      type="number"
                      value={formData.fixed_cost_billable}
                      onChange={(e) => setFormData({ ...formData, fixed_cost_billable: parseFloat(e.target.value) })}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {/* Days Pricing */}
              {formData.pricing_method === 'days' && (
                <>
                  <div>
                    <Label>Number of Days</Label>
                    <Input
                      type="number"
                      value={formData.days_count}
                      onChange={(e) => setFormData({ ...formData, days_count: parseFloat(e.target.value) })}
                      step="0.5"
                      min="1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Internal Cost / Day</Label>
                      <Input
                        type="number"
                        value={formData.daily_rate_internal}
                        onChange={(e) => setFormData({ ...formData, daily_rate_internal: parseFloat(e.target.value) })}
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label>Billable Rate / Day</Label>
                      <Input
                        type="number"
                        value={formData.daily_rate_billable}
                        onChange={(e) => setFormData({ ...formData, daily_rate_billable: parseFloat(e.target.value) })}
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Per Diem */}
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-sm">Per Diem</h3>
                  <p className="text-xs text-muted-foreground">If enabled, shows as a separate line item linked to this role</p>
                </div>
                <Switch
                  checked={!!formData.per_diem_enabled}
                  onCheckedChange={(v) => setFormData({ ...formData, per_diem_enabled: v })}
                />
              </div>
              {formData.per_diem_enabled && (
                <div>
                  <Label>Per Diem Amount (per day)</Label>
                  <Input
                    type="number"
                    value={formData.per_diem_amount || 0}
                    onChange={(e) => setFormData({ ...formData, per_diem_amount: parseFloat(e.target.value) || 0 })}
                    step="0.01"
                    min="0"
                    placeholder="e.g. 75.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">This will appear as a separate "Per Diem – {formData.role_name || 'Role'}" line item in costing and quotes.</p>
                </div>
              )}
            </div>

            {/* Planning Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Planning Information</h3>
              <div>
                <Label>Required Skills</Label>
                <Input
                  value={formData.required_skills}
                  onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
                  placeholder="e.g. Rigging, Welding, PPL"
                />
              </div>
              <div>
                <Label>Certifications</Label>
                <Input
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                  placeholder="e.g. CWI, OSHA 30"
                />
              </div>
              <div>
                <Label>Planner Notes</Label>
                <Textarea
                  value={formData.planner_notes}
                  onChange={(e) => setFormData({ ...formData, planner_notes: e.target.value })}
                  placeholder="Internal notes for crew planners..."
                  className="h-20"
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Active</p>
                  <p className="text-xs text-muted-foreground">Available for crew assignments</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Show in Crew Bookings</p>
                  <p className="text-xs text-muted-foreground">Available when booking crew</p>
                </div>
                <Switch
                  checked={formData.show_in_crew_booking}
                  onCheckedChange={(v) => setFormData({ ...formData, show_in_crew_booking: v })}
                />
              </div>
            </div>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !formData.role_name || !formData.department}
            >
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}