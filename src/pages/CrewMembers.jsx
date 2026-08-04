import React, { useState } from 'react';
import { db } from '@/api/db';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/lib/usePermissions';
import { Navigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Phone, User, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmployeeCheckoutPanel from '@/components/employee/EmployeeCheckoutPanel';
import { toast } from 'sonner';

const empty = {
  user_id: '', email: '', phone_number: '', job_title: '', department: '',
  is_available: true, skills: '', hourly_rate: '', daily_rate: '',
  emergency_contact: '', notes: '', start_date: ''
};

export default function CrewMembers() {
  const { canManageCrew } = usePermissions();

  // Non-managers see their own profile instead
  if (!canManageCrew) return <Navigate to="/my-profile" replace />;

  return <CrewMembersAdmin />;
}

function CrewMembersAdmin() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [showRates, setShowRates] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const queryClient = useQueryClient();

  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers'],
    queryFn: () => db.entities.CrewMember.list('-created_date'),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? db.entities.CrewMember.update(editing.id, data)
      : db.entities.CrewMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crewMembers'] });
      setDialogOpen(false);
      setForm(empty);
      setEditing(null);
    },
    onError: (e) => toast.error(`Failed to save: ${e.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.CrewMember.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crewMembers'] }),
    onError: (e) => toast.error(`Failed to delete: ${e.message}`),
  });

  const openCreate = () => { setEditing(null); setForm(empty); setShowRates(false); setDialogOpen(true); };
  const openEdit = (m) => { setEditing(m); setForm({ ...empty, ...m }); setShowRates(!!m.hourly_rate || !!m.daily_rate); setDialogOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (!data.hourly_rate) delete data.hourly_rate; else data.hourly_rate = parseFloat(data.hourly_rate);
    if (!data.daily_rate) delete data.daily_rate; else data.daily_rate = parseFloat(data.daily_rate);
    saveMutation.mutate(data);
  };

  const getUser = (userId) => users.find(u => u.id === userId);

  return (
    <div>
      <PageHeader
        title="Employee Profiles"
        description="Manage crew member profiles, rates, and equipment holds"
        actions={<Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" />Add Employee</Button>}
      />

      <Card>
        <CardContent className="pt-6">
          {crewMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No crew members yet.</p>
          ) : (
            <div className="space-y-0">
              {crewMembers.map(member => {
                const user = getUser(member.user_id);
                const name = user?.full_name || user?.email || member.email || 'Unnamed';
                const holds = member.employee_checkout_asset_ids?.length || 0;
                const isExpanded = expandedId === member.id;

                return (
                  <div key={member.id} className="border-b last:border-0">
                    <div className="flex items-center gap-3 py-3 px-1">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {member.profile_photo_url
                          ? <img src={member.profile_photo_url} alt="" className="w-full h-full object-cover" />
                          : <User className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{name}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {member.job_title && <span className="text-xs text-muted-foreground">{member.job_title}</span>}
                          {member.department && <Badge variant="outline" className="text-xs">{member.department}</Badge>}
                          {member.phone_number && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />{member.phone_number}
                            </span>
                          )}
                          {holds > 0 && (
                            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs flex items-center gap-1">
                              <Package className="w-3 h-3" />{holds} asset{holds > 1 ? 's' : ''} held
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => setExpandedId(isExpanded ? null : member.id)}
                          className="text-xs gap-1"
                        >
                          <Package className="w-3.5 h-3.5" />
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(member)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                              <AlertDialogDescription>Remove {name}? This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(member.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>

                    {/* Expandable checkout panel */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        <div className="pt-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Equipment Holds — {name}</p>
                          <EmployeeCheckoutPanel crewMember={member} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) { setEditing(null); setForm(empty); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Employee Profile' : 'Add Employee Profile'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Link User Account</Label>
              <Select value={form.user_id || ''} onValueChange={v => setForm(f => ({ ...f, user_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select a user account" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.role || 'user'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Link to a user account so they can see their own profile</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="crew@example.com" />
              </div>
              <div>
                <Label>Phone Number *</Label>
                <Input type="tel" value={form.phone_number} onChange={e => setForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="+1 (555) 123-4567" required />
              </div>
              <div>
                <Label>Job Title</Label>
                <Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} placeholder="e.g. Senior Audio Tech" />
              </div>
              <div>
                <Label>Department</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Audio, Lighting" />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
            </div>

            <div>
              <button type="button" onClick={() => setShowRates(!showRates)} className="text-sm text-primary hover:underline font-medium">
                {showRates ? '▼' : '▶'} Rates
              </button>
              {showRates && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label>Hourly Rate ($)</Label>
                    <Input type="number" value={form.hourly_rate} onChange={e => setForm(f => ({ ...f, hourly_rate: e.target.value }))} placeholder="0.00" step="0.01" />
                  </div>
                  <div>
                    <Label>Daily Rate ($)</Label>
                    <Input type="number" value={form.daily_rate} onChange={e => setForm(f => ({ ...f, daily_rate: e.target.value }))} placeholder="0.00" step="0.01" />
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Skills (comma-separated)</Label>
              <Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. Audio, Lighting, Rigging" />
            </div>
            <div>
              <Label>Emergency Contact</Label>
              <Input value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="Name and phone number" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Add Employee'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}