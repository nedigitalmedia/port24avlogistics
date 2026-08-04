import React, { useState } from 'react';
import { db } from '@/api/db';
import { supabase } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Users, Layers, GripVertical, Eye, EyeOff, Lock, Star, Briefcase, ChevronDown, ChevronUp, ChevronRight, Shield, Upload, Mail, Palette, Pencil, UserPlus, Package, Zap, ShieldCheck, Settings, QrCode, BookOpen, Clock, Copy, X } from 'lucide-react';
import EmployeeCheckoutPanel from '@/components/employee/EmployeeCheckoutPanel';
import UserEditDialog from '@/components/admin/UserEditDialog';
import InviteUserDialog from '@/components/admin/InviteUserDialog';
import MigrationPanel from '@/components/admin/MigrationPanel';
import PermissionsMatrix from '@/components/admin/PermissionsMatrix';
import LogisticsAdmin from '@/components/admin/LogisticsAdmin';
import SmtpSettingsPanel from '@/components/admin/SmtpSettingsPanel';
import StatusFlowSettings from '@/components/admin/StatusFlowSettings';
import QRCodeSettings from './QRCodeSettings';
import QuickBooksPanel from '@/components/accounting/QuickBooksPanel';

import { Link } from 'react-router-dom';
import ImportInventory from './ImportInventory';
import EmailBuilder from './EmailBuilder';
import BrandingSettings from './BrandingSettings';
import LogisticsBankManager from './LogisticsBankManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import { usePermissions, ROLE_DESCRIPTIONS } from '@/lib/usePermissions';
import { useAuth } from '@/lib/AuthContext';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multi_select', label: 'Multi-Select' },
  { value: 'boolean', label: 'Yes / No' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'file', label: 'File Upload' },
];

const STATUS_COLORS = {
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  invited: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
  inactive: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};

const emptyField = { field_name: '', field_key: '', field_type: 'text', options: '', entity_type: 'asset', is_required: false, is_hidden: false, is_readonly: false, default_value: '', section: '', show_when_category: '' };

function AdminEmployeeGear() {
  const { data: crewMembers = [] } = useQuery({
    queryKey: ['crewMembers'],
    queryFn: () => db.entities.CrewMember.list('-created_date'),
  });
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
  });

  const [expandedId, setExpandedId] = useState(null);

  const membersWithHolds = crewMembers.filter(m => (m.employee_checkout_asset_ids || []).length > 0);
  const getUser = (uid) => users.find(u => u.id === uid);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee Equipment Holds</CardTitle>
          <p className="text-xs text-muted-foreground">Assets currently checked out to employees. These are blocked from project booking until returned.</p>
        </CardHeader>
        <CardContent>
          {membersWithHolds.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No employees currently have assets checked out.</p>
          ) : (
            <div className="space-y-0">
              {membersWithHolds.map(member => {
                const user = getUser(member.user_id);
                const name = user?.full_name || user?.email || member.email || 'Unnamed';
                const holds = (member.employee_checkout_asset_ids || []).length;
                return (
                  <div key={member.id} className="border-b last:border-0">
                    <div
                      className="flex items-center justify-between py-3 cursor-pointer hover:bg-muted/20 px-2 rounded"
                      onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{name}</p>
                          {member.job_title && <p className="text-xs text-muted-foreground">{member.job_title}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">{holds} asset{holds > 1 ? 's' : ''}</Badge>
                        {expandedId === member.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                    {expandedId === member.id && (
                      <div className="px-4 pb-4 border-t bg-muted/10">
                        <div className="pt-3">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Employees</CardTitle>
          <p className="text-xs text-muted-foreground">Full employee management is in the Employees section of the sidebar.</p>
        </CardHeader>
        <CardContent>
          <Link to="/crew-members">
            <Button variant="outline"><Users className="w-4 h-4 mr-2" /> Go to Employee Profiles</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const { canAccessAdmin } = usePermissions();
  const { user: currentUser, orgId: activeOrgId } = useAuth();
  // Support ?tab=accounting for QB OAuth callback redirect
  const params = new URLSearchParams(window.location.search);
  const defaultTab = (() => {
    if (params.get('tab') === 'accounting' || params.get('qb_callback')) return 'accounting';
    return 'fields';
  })();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const callbackStatus = params.get('qb_callback');
  const callbackError = params.get('qb_error');
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [roleInfoOpen, setRoleInfoOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [fieldForm, setFieldForm] = useState(emptyField);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);

  // Track which tabs have been visited so heavy sub-pages mount lazily
  const [visitedTabs, setVisitedTabs] = useState(new Set(['fields', 'logistics', 'email-settings', defaultTab]));
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => new Set([...prev, tab]));
  };

  const queryClient = useQueryClient();

  const { data: customFields = [] } = useQuery({ queryKey: ['customFields'], queryFn: () => db.entities.CustomField.list() });

  // Active company members via company_memberships (source of truth)
  const { data: users = [] } = useQuery({
    queryKey: ['company-members', activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const { data, error } = await supabase
        .from('company_memberships')
        .select('role, status, joined_at, users(id, email, full_name, role, created_at, is_platform_admin)')
        .eq('org_id', activeOrgId)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []).map(m => ({ ...m.users, membership_role: m.role, joined_at: m.joined_at }));
    },
    enabled: !!activeOrgId,
  });

  // Pending invites for this company
  const { data: pendingInvites = [], refetch: refetchInvites } = useQuery({
    queryKey: ['pending-invites', activeOrgId],
    queryFn: async () => {
      if (!activeOrgId) return [];
      const { data, error } = await supabase
        .from('pending_invites')
        .select('*')
        .eq('org_id', activeOrgId)
        .eq('invite_type', 'team_member')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!activeOrgId,
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editingField
      ? db.entities.CustomField.update(editingField.id, data)
      : db.entities.CustomField.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
      setFieldDialogOpen(false);
      setFieldForm(emptyField);
      setEditingField(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.CustomField.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customFields'] }),
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id) => db.entities.User.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  const revokeInvite = async (inviteId) => {
    const { error } = await supabase.from('pending_invites').update({ status: 'expired' }).eq('id', inviteId);
    if (error) return;
    refetchInvites();
  };

  const copyInviteLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/accept-invite?token=${token}`);
  };

  const canDeleteUser = (u) => {
    if (u.email === currentUser?.email) return false;
    const adminCount = users.filter(x => x.role === 'admin').length;
    if (u.role === 'admin' && adminCount <= 1) return false;
    return true;
  };

  if (!canAccessAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Shield className="w-10 h-10 opacity-30" />
        <p className="font-medium">Admin Settings is restricted to Admin role only.</p>
      </div>
    );
  }

  const toggleHidden = (field) => db.entities.CustomField.update(field.id, { is_hidden: !field.is_hidden }).then(() => queryClient.invalidateQueries({ queryKey: ['customFields'] }));
  const autoKey = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const openCreate = () => { setEditingField(null); setFieldForm(emptyField); setFieldDialogOpen(true); };
  const openEdit = (f) => { setEditingField(f); setFieldForm({ ...emptyField, ...f }); setFieldDialogOpen(true); };

  const assetFields = customFields.filter(f => f.entity_type === 'asset').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const showFields = customFields.filter(f => f.entity_type === 'show').sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const FieldTable = ({ fields }) => (
    fields.length === 0
      ? <p className="text-sm text-muted-foreground text-center py-8">No custom fields yet.</p>
      : <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Field Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="hidden md:table-cell">Section</TableHead>
              <TableHead>Flags</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map(f => (
              <TableRow key={f.id} className={f.is_hidden ? 'opacity-50' : ''}>
                <TableCell>
                  <div>
                    <p className="font-medium">{f.field_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{f.field_key}</p>
                  </div>
                </TableCell>
                <TableCell><Badge variant="secondary">{FIELD_TYPES.find(t => t.value === f.field_type)?.label || f.field_type}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{f.section || '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {f.is_required && <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1"><Star className="w-2.5 h-2.5" />Required</Badge>}
                    {f.is_hidden && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                    {f.is_readonly && <Badge variant="outline" className="text-xs gap-1"><Lock className="w-2.5 h-2.5" />Read-only</Badge>}
                    {f.show_when_category && <Badge variant="outline" className="text-xs">If: {f.show_when_category}</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleHidden(f)} title={f.is_hidden ? 'Show' : 'Hide'}>
                      {f.is_hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                      <GripVertical className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete Field</AlertDialogTitle><AlertDialogDescription>This removes the field from all forms. Existing data is preserved.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate(f.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
  );

  return (
    <div>
      <PageHeader title="Admin Settings" description="Manage fields, users, and system configuration" />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
         <TabsList className="mb-6 flex-wrap h-auto gap-1">
           <TabsTrigger value="fields" className="gap-2"><Layers className="w-3.5 h-3.5" /> Custom Fields</TabsTrigger>
           <TabsTrigger value="crew-roles" className="gap-2"><Briefcase className="w-3.5 h-3.5" /> Crew Roles</TabsTrigger>
           <TabsTrigger value="users" className="gap-2"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
           <TabsTrigger value="import" className="gap-2"><Upload className="w-3.5 h-3.5" /> Import</TabsTrigger>
           <TabsTrigger value="email-builder" className="gap-2"><Mail className="w-3.5 h-3.5" /> Email Builder</TabsTrigger>
           <TabsTrigger value="branding" className="gap-2"><Palette className="w-3.5 h-3.5" /> Branding</TabsTrigger>
           <TabsTrigger value="logistics" className="gap-2"><Package className="w-3.5 h-3.5" /> Logistics</TabsTrigger>
           <TabsTrigger value="employees" className="gap-2"><Package className="w-3.5 h-3.5" /> Employee Gear</TabsTrigger>
           <TabsTrigger value="email-settings" className="gap-2"><Settings className="w-3.5 h-3.5" /> Email Settings</TabsTrigger>
           <TabsTrigger value="qr-settings" className="gap-2"><QrCode className="w-3.5 h-3.5" /> QR / Code Settings</TabsTrigger>
           <TabsTrigger value="status-flow" className="gap-2"><ChevronRight className="w-3.5 h-3.5" /> Status Flow</TabsTrigger>
           <TabsTrigger value="accounting" className="gap-2"><BookOpen className="w-3.5 h-3.5" /> Accounting</TabsTrigger>
           <TabsTrigger value="migrations" className="gap-2"><Zap className="w-3.5 h-3.5" /> Migrations</TabsTrigger>
         </TabsList>

        <TabsContent value="fields" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Asset Fields</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Custom fields shown on asset entry forms</p>
              </div>
              <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Field</Button>
            </CardHeader>
            <CardContent><FieldTable fields={assetFields} /></CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Project / Show Fields</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Custom fields shown on show/project forms</p>
            </CardHeader>
            <CardContent><FieldTable fields={showFields} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crew-roles">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Crew Roles & Rates</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Manage crew positions, pricing, and rate structures</p>
            </CardHeader>
            <CardContent>
              <Link to="/crew-roles">
                <Button variant="outline"><Briefcase className="w-4 h-4 mr-2" /> Manage Crew Roles</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Role Descriptions</CardTitle>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setRoleInfoOpen(v => !v)} className="gap-1 text-xs">
                  {roleInfoOpen ? <><ChevronUp className="w-3.5 h-3.5" /> Hide</> : <><ChevronDown className="w-3.5 h-3.5" /> Show</>}
                </Button>
              </div>
            </CardHeader>
            {roleInfoOpen && (
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(ROLE_DESCRIPTIONS).map(([key, info]) => (
                    <div key={key} className="p-3 border rounded-lg">
                      <p className="font-semibold text-sm">{info.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{info.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Permissions</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Which roles can access each section</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setPermissionsOpen(v => !v)} className="gap-1 text-xs">
                  {permissionsOpen ? <><ChevronUp className="w-3.5 h-3.5" /> Hide</> : <><ChevronDown className="w-3.5 h-3.5" /> Show</>}
                </Button>
              </div>
            </CardHeader>
            {permissionsOpen && (
              <CardContent>
                <PermissionsMatrix />
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Team Members</CardTitle>
              <Button size="sm" onClick={() => setInviteDialogOpen(true)} className="gap-2">
                <UserPlus className="w-4 h-4" /> Create User
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{u.full_name || '—'}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                          {u.job_title && <p className="text-xs text-muted-foreground italic">{u.job_title}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{u.role || 'crew'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[u.status] || STATUS_COLORS.approved}`}>
                          {u.status || 'approved'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingUser(u); setUserDialogOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {canDeleteUser(u) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete <strong>{u.full_name || u.email}</strong>? This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteUserMutation.mutate(u.id)}>
                                    Delete User
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pendingInvites.length > 0 && (
                <div className="mt-6 border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold">Pending Invites</h3>
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">{pendingInvites.length}</Badge>
                  </div>
                  <div className="divide-y">
                    {pendingInvites.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between py-2.5">
                        <div>
                          <p className="text-sm font-medium">{inv.full_name ? `${inv.full_name} (${inv.email})` : inv.email}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy invite link"
                            onClick={() => copyInviteLink(inv.token)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Revoke invite"
                            onClick={() => revokeInvite(inv.id)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          {visitedTabs.has('import') && <ImportInventory />}
        </TabsContent>

        <TabsContent value="email-builder">
          {visitedTabs.has('email-builder') && <EmailBuilder />}
        </TabsContent>

        <TabsContent value="branding">
          {visitedTabs.has('branding') && <BrandingSettings />}
        </TabsContent>

        <TabsContent value="logistics">
          {visitedTabs.has('logistics') && <LogisticsAdmin />}
        </TabsContent>

        <TabsContent value="employees">
           {visitedTabs.has('employees') && <AdminEmployeeGear />}
         </TabsContent>

        <TabsContent value="email-settings">
          <SmtpSettingsPanel />
        </TabsContent>



        <TabsContent value="qr-settings">
          {visitedTabs.has('qr-settings') && <QRCodeSettings />}
        </TabsContent>

        <TabsContent value="status-flow">
          <StatusFlowSettings />
        </TabsContent>

        <TabsContent value="accounting">
          {visitedTabs.has('accounting') && <QuickBooksPanel />}
        </TabsContent>

        <TabsContent value="migrations" className="space-y-4">
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Kit Type Migration</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Convert old "Physical combination" and "Virtual combination" types to proper Serialized and Cloud Kits.</p>
            </CardHeader>
            <CardContent>
              <MigrationPanel />
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        currentUserEmail={currentUser?.email}
        users={users}
      />

      <UserEditDialog user={editingUser} open={userDialogOpen} onOpenChange={setUserDialogOpen} allUsers={users} />

      <Dialog open={fieldDialogOpen} onOpenChange={v => { setFieldDialogOpen(v); if (!v) { setEditingField(null); setFieldForm(emptyField); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingField ? 'Edit Custom Field' : 'Add Custom Field'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(fieldForm); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Field Label *</Label>
                <Input value={fieldForm.field_name} onChange={e => setFieldForm({ ...fieldForm, field_name: e.target.value, field_key: editingField ? fieldForm.field_key : autoKey(e.target.value) })} placeholder="e.g. Power Rating" required />
              </div>
              <div>
                <Label>Field Key</Label>
                <Input value={fieldForm.field_key} onChange={e => setFieldForm({ ...fieldForm, field_key: e.target.value })} className="font-mono text-sm" />
              </div>
              <div>
                <Label>Section / Group</Label>
                <Input value={fieldForm.section} onChange={e => setFieldForm({ ...fieldForm, section: e.target.value })} placeholder="e.g. Technical, Rental" />
              </div>
              <div>
                <Label>Field Type</Label>
                <Select value={fieldForm.field_type} onValueChange={v => setFieldForm({ ...fieldForm, field_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Applies To</Label>
                <Select value={fieldForm.entity_type} onValueChange={v => setFieldForm({ ...fieldForm, entity_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Assets</SelectItem>
                    <SelectItem value="show">Projects / Shows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(fieldForm.field_type === 'select' || fieldForm.field_type === 'multi_select') && (
              <div>
                <Label>Options (comma-separated)</Label>
                <Input value={fieldForm.options} onChange={e => setFieldForm({ ...fieldForm, options: e.target.value })} placeholder="Option A, Option B, Option C" />
              </div>
            )}

            <div>
              <Label>Default Value</Label>
              <Input value={fieldForm.default_value} onChange={e => setFieldForm({ ...fieldForm, default_value: e.target.value })} placeholder="Optional default" />
            </div>

            <div>
              <Label>Show only when category equals (optional)</Label>
              <Input value={fieldForm.show_when_category} onChange={e => setFieldForm({ ...fieldForm, show_when_category: e.target.value })} placeholder="e.g. Audio  (leave blank to always show)" />
            </div>

            <div className="border rounded-lg divide-y">
              {[
                { key: 'is_required', icon: Star, label: 'Required', desc: 'Must be filled in before saving' },
                { key: 'is_hidden', icon: EyeOff, label: 'Hidden', desc: 'Not shown in forms (kept in data)' },
                { key: 'is_readonly', icon: Lock, label: 'Read-only', desc: 'Visible but not editable by users' },
              ].map(({ key, icon: Icon, label, desc }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                  <Switch checked={!!fieldForm[key]} onCheckedChange={v => setFieldForm({ ...fieldForm, [key]: v })} />
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFieldDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{editingField ? 'Save Changes' : 'Add Field'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}