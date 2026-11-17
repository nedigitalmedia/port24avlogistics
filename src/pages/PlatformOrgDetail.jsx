import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Building2, Users, Mail, Clock, Copy, Link, CreditCard, UserPlus, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { PLANS, FEATURE_LABELS, planTier, planHasFeature } from '@/lib/planLimits';
import { logAdminAction } from '@/lib/adminAudit';

const ROLE_COLORS = {
  admin:   'text-blue-400 bg-blue-400/10',
  manager: 'text-purple-400 bg-purple-400/10',
  crew:    'text-gray-400 bg-gray-400/10',
};

// ── Reusable confirmation modal ───────────────────────────────────────────────
function ConfirmModal({ title, message, bullets = [], confirmLabel = 'Confirm', danger = false, loading = false, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-[#131920] border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-start gap-3 mb-3">
          {danger && (
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
          )}
          <h3 className="text-white font-bold text-lg leading-snug">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-3 leading-relaxed">{message}</p>
        {bullets.length > 0 && (
          <ul className="mb-4 space-y-1 pl-1">
            {bullets.map((b, i) => (
              <li key={i} className="text-sm text-red-400 flex items-center gap-2">
                <span className="text-red-500 font-bold">×</span> {b}
              </li>
            ))}
          </ul>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors ${
              danger
                ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                : 'bg-[#1FB8A0] text-black hover:bg-[#17907C]'
            }`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// Compute feature names that the current plan has but the target plan does not
function lostFeatures(fromPlan, toPlan) {
  const featureKeys = Object.keys(FEATURE_LABELS);
  return featureKeys.filter(k => planHasFeature(fromPlan, k) && !planHasFeature(toPlan, k))
    .map(k => FEATURE_LABELS[k]);
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlatformOrgDetail() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { isPlatformAdmin } = useAuth();
  const qc = useQueryClient();

  const [showInvite, setShowInvite]   = useState(false);
  const [inviteForm, setInviteForm]   = useState({ email: '', full_name: '', role: 'admin' });
  const [inviting, setInviting]       = useState(false);
  const [inviteLink, setInviteLink]   = useState('');
  const [changingPlan, setChangingPlan] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Pending confirmation state: null | { type, ...payload }
  const [pending, setPending] = useState(null);

  const { data: org, isLoading: orgLoading } = useQuery({
    queryKey: ['platform-org', orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['platform-org-users', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_memberships')
        .select('role, status, users(*)')
        .eq('org_id', orgId)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? [])
        .map(m => ({ ...m.users, membership_role: m.role }))
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
    },
  });

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['platform-org-pending-invites', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pending_invites')
        .select('*')
        .eq('org_id', orgId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: shows = [] } = useQuery({
    queryKey: ['platform-org-shows', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shows').select('id, name, status, created_at')
        .eq('org_id', orgId).order('created_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
  });

  // ── Plan change ─────────────────────────────────────────────────────────────
  const requestPlanChange = (newPlan) => {
    if (!org) return;
    const isDowngrade = planTier(newPlan) < planTier(org.plan);
    const lost = isDowngrade ? lostFeatures(org.plan, newPlan) : [];
    setPending({
      type: 'plan',
      newPlan,
      title: isDowngrade
        ? `Downgrade to ${PLANS[newPlan]?.label}?`
        : `Upgrade to ${PLANS[newPlan]?.label}?`,
      message: isDowngrade
        ? `${org.name} will lose access to the following features immediately:`
        : `${org.name} will gain access to ${PLANS[newPlan]?.label} features immediately.`,
      bullets: lost,
      danger: isDowngrade,
      confirmLabel: isDowngrade ? 'Downgrade' : 'Upgrade',
    });
  };

  // Reopen / lengthen a trial. Extends from whichever is later: now or the current end time.
  const extendTrial = async (hours) => {
    setActionLoading(true);
    try {
      const base = Math.max(Date.now(), org.trial_ends_at ? new Date(org.trial_ends_at).getTime() : 0);
      const next = new Date(base + hours * 3600 * 1000).toISOString();
      const { error } = await supabase.from('organizations').update({ trial_ends_at: next }).eq('id', orgId);
      if (error) throw error;
      await logAdminAction({ action: 'trial_extended', orgId, oldValue: org.trial_ends_at ?? '', newValue: next });
      qc.invalidateQueries({ queryKey: ['platform-org', orgId] });
      qc.invalidateQueries({ queryKey: ['org-plan', orgId] });
      toast.success(`Trial extended by ${hours >= 24 ? `${hours / 24} days` : `${hours} hours`}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const executePlanChange = async () => {
    if (!pending || pending.type !== 'plan') return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('organizations').update({ plan: pending.newPlan }).eq('id', orgId);
      if (error) throw error;
      await logAdminAction({ action: 'plan_changed', orgId, oldValue: org.plan, newValue: pending.newPlan });
      qc.invalidateQueries({ queryKey: ['platform-org', orgId] });
      qc.invalidateQueries({ queryKey: ['org-plan', orgId] });
      toast.success(`Plan changed to ${PLANS[pending.newPlan]?.label}`);
      setChangingPlan(false);
      setPending(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Status toggle ───────────────────────────────────────────────────────────
  const requestStatusToggle = () => {
    if (!org) return;
    const newStatus = org.status === 'active' ? 'suspended' : 'active';
    const isSuspending = newStatus === 'suspended';
    setPending({
      type: 'status',
      newStatus,
      title: isSuspending ? `Suspend ${org.name}?` : `Reactivate ${org.name}?`,
      message: isSuspending
        ? `This will immediately block all ${users.length} active user${users.length !== 1 ? 's' : ''} from accessing Port 24. They will see a "suspended" screen on their next page load.`
        : `${org.name} will regain full access based on their current plan.`,
      danger: isSuspending,
      confirmLabel: isSuspending ? 'Suspend Account' : 'Reactivate',
    });
  };

  const executeStatusToggle = async () => {
    if (!pending || pending.type !== 'status') return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('organizations').update({ status: pending.newStatus }).eq('id', orgId);
      if (error) throw error;
      await logAdminAction({ action: 'org_status_changed', orgId, oldValue: org.status, newValue: pending.newStatus });
      qc.invalidateQueries({ queryKey: ['platform-org', orgId] });
      qc.invalidateQueries({ queryKey: ['platform-orgs'] });
      toast.success(`Company ${pending.newStatus === 'active' ? 'reactivated' : 'suspended'}`);
      setPending(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Role change ─────────────────────────────────────────────────────────────
  const requestRoleChange = (userId, userName, currentRole, newRole) => {
    if (currentRole === newRole) return;
    const isRoleDemotion = ['admin', 'manager', 'crew'].indexOf(newRole) > ['admin', 'manager', 'crew'].indexOf(currentRole);
    setPending({
      type: 'role',
      userId,
      newRole,
      title: `Change role for ${userName || 'this user'}?`,
      message: `Their role will change from ${currentRole} to ${newRole}. This takes effect immediately — no re-login required.`,
      danger: isRoleDemotion,
      confirmLabel: 'Change Role',
    });
  };

  const executeRoleChange = async () => {
    if (!pending || pending.type !== 'role') return;
    setActionLoading(true);
    try {
      const target = users.find(u => u.id === pending.userId);
      const { error } = await supabase.from('users').update({ role: pending.newRole }).eq('id', pending.userId);
      if (error) throw error;
      await logAdminAction({
        action: 'user_role_changed',
        orgId,
        userId: pending.userId,
        oldValue: target?.role,
        newValue: pending.newRole,
      });
      qc.invalidateQueries({ queryKey: ['platform-org-users', orgId] });
      toast.success('Role updated');
      setPending(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete org ──────────────────────────────────────────────────────────────
  const handleDeleteOrg = async () => {
    if (!confirm(`PERMANENTLY DELETE ${org?.name}?\n\nThis will remove all users, data, and the company account.\n\nType OK to confirm.`)) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke('delete-organization', { body: { org_id: orgId } });
    if (error || data?.error) {
      let msg = data?.error || error?.message || 'Failed to delete company';
      if (!data?.error && error) {
        try { const b = await error.context?.json(); msg = b?.error || msg; } catch {}
      }
      toast.error(msg);
      setDeleting(false);
      return;
    }
    await logAdminAction({ action: 'org_deleted', orgId, metadata: { name: org?.name } });
    toast.success(`${org?.name} has been deleted`);
    qc.removeQueries({ queryKey: ['platform-orgs'] });
    navigate('/platform');
  };

  // ── Remove user ─────────────────────────────────────────────────────────────
  const removeUser = async (userId, userEmail) => {
    if (!confirm(`Permanently delete ${userEmail}? This removes their account entirely and cannot be undone.`)) return;
    const { data, error } = await supabase.functions.invoke('delete-user', { body: { user_id: userId } });
    if (error || data?.error) {
      let msg = data?.error || error?.message || 'Failed to delete user';
      if (!data?.error && error) {
        try { const b = await error.context?.json(); msg = b?.error || msg; } catch {}
      }
      return toast.error(msg);
    }
    await logAdminAction({ action: 'user_deleted', orgId, userId, metadata: { email: userEmail } });
    qc.invalidateQueries({ queryKey: ['platform-org-users', orgId] });
    toast.success('User deleted');
  };

  // ── Invite ──────────────────────────────────────────────────────────────────
  const revokeInvite = async (inviteId) => {
    const { error } = await supabase.from('pending_invites').update({ status: 'expired' }).eq('id', inviteId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ['platform-org-pending-invites', orgId] });
    toast.success('Invite revoked');
  };

  const copyInviteLink = (invite) => {
    const path = invite.invite_type === 'company_owner' ? 'accept-company-invite' : 'accept-invite';
    navigator.clipboard.writeText(`${window.location.origin}/${path}?token=${invite.token}`);
    toast.success('Invite link copied');
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      const { data: invite, error: invErr } = await supabase
        .from('pending_invites')
        .insert({ email: inviteForm.email.trim().toLowerCase(), full_name: inviteForm.full_name || null, org_id: orgId, role: inviteForm.role })
        .select().single();
      if (invErr) throw invErr;

      const link = `${window.location.origin}/accept-invite?token=${invite.token}`;
      const { error: fnErr } = await supabase.functions.invoke('send-invite-email', {
        body: { to_email: inviteForm.email.trim().toLowerCase(), to_name: inviteForm.full_name || null, invite_link: link, org_name: org?.name || '', role: inviteForm.role, invited_by_name: 'Port 24 Admin' },
      });
      if (fnErr) console.error('Email error:', fnErr);

      setInviteLink(link);
      qc.invalidateQueries({ queryKey: ['platform-org-users', orgId] });
      toast.success('Invite created' + (!fnErr ? ' & email sent' : ' (email failed — use link below)'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setInviting(false);
    }
  };

  // ── Dispatch confirmation result ────────────────────────────────────────────
  const handleConfirm = () => {
    if (!pending) return;
    if (pending.type === 'plan')   return executePlanChange();
    if (pending.type === 'status') return executeStatusToggle();
    if (pending.type === 'role')   return executeRoleChange();
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!isPlatformAdmin) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Access denied.</p></div>;
  if (orgLoading) return <div className="text-center py-20 text-gray-500">Loading…</div>;
  if (!org) return <div className="text-center py-20 text-gray-500">Organization not found.</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Confirmation modal */}
      {pending && (
        <ConfirmModal
          title={pending.title}
          message={pending.message}
          bullets={pending.bullets}
          danger={pending.danger}
          confirmLabel={pending.confirmLabel}
          loading={actionLoading}
          onConfirm={handleConfirm}
          onCancel={() => !actionLoading && setPending(null)}
        />
      )}

      {/* Back */}
      <button onClick={() => navigate('/platform')} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to all companies
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1FB8A0]/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-[#1FB8A0]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{org.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-500 capitalize">{org.plan} plan</span>
              <span className={`text-xs capitalize font-medium ${org.status === 'active' ? 'text-green-400' : org.status === 'suspended' ? 'text-red-400' : 'text-yellow-400'}`}>{org.status}</span>
              {org.created_at && <span className="text-xs text-gray-600">Created {new Date(org.created_at).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        <button
          onClick={handleDeleteOrg}
          disabled={deleting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : '🗑 Delete Company'}
        </button>
      </div>

      {/* Plan & Status controls */}
      <div className="bg-[#131920] border border-white/5 rounded-xl p-5 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <CreditCard className="w-4 h-4 text-[#1FB8A0]" />
          <div>
            <p className="text-xs text-gray-500">Current Plan</p>
            <p className="text-sm font-bold text-white capitalize">{org.plan} — {PLANS[org.plan]?.price}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className={`text-sm font-bold capitalize ${org.status === 'active' ? 'text-green-400' : org.status === 'suspended' ? 'text-red-400' : 'text-yellow-400'}`}>{org.status}</p>
          </div>
          <button
            onClick={requestStatusToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${org.status === 'active' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}
          >
            {org.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </div>
        <div className="relative">
          {changingPlan ? (
            <div className="flex items-center gap-2 flex-wrap">
              {Object.entries(PLANS).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => requestPlanChange(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${org.plan === key ? 'border-[#1FB8A0] text-[#1FB8A0] bg-[#1FB8A0]/10' : 'border-white/10 text-gray-300 hover:border-white/30'}`}
                >
                  {p.label} {p.price}
                </button>
              ))}
              <button onClick={() => setChangingPlan(false)} className="text-gray-500 hover:text-white text-xs">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setChangingPlan(true)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1FB8A0]/30 text-[#1FB8A0] hover:bg-[#1FB8A0]/10 transition-colors">
              Change Plan
            </button>
          )}
        </div>
      </div>

      {org.plan === 'trial' && (() => {
        const endsMs = org.trial_ends_at ? new Date(org.trial_ends_at).getTime() : null;
        const expired = endsMs != null && endsMs <= Date.now();
        const hoursLeft = endsMs != null ? Math.max(0, Math.round((endsMs - Date.now()) / 3600000)) : null;
        return (
          <div className={`flex items-center justify-between gap-3 flex-wrap rounded-xl border p-4 mb-8 ${expired ? 'border-red-500/30 bg-red-500/5' : 'border-[#1FB8A0]/20 bg-[#1FB8A0]/5'}`}>
            <div>
              <p className="text-xs text-gray-500">Trial (72 hours)</p>
              <p className={`text-sm font-bold ${expired ? 'text-red-400' : 'text-white'}`}>
                {endsMs == null ? 'No end date set' : expired ? `Ended ${new Date(endsMs).toLocaleString()} — users are locked out` : `Ends ${new Date(endsMs).toLocaleString()} (${hoursLeft}h left)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => extendTrial(72)} disabled={actionLoading} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1FB8A0]/30 text-[#1FB8A0] hover:bg-[#1FB8A0]/10 disabled:opacity-50">+72 hours</button>
              <button onClick={() => extendTrial(168)} disabled={actionLoading} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 text-gray-300 hover:text-white disabled:opacity-50">+7 days</button>
            </div>
          </div>
        );
      })()}

      {/* Plan limits overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Max Users',  value: PLANS[org.plan]?.users_limit  ?? '∞' },
          { label: 'Max Assets', value: PLANS[org.plan]?.assets_limit ?? '∞' },
          { label: 'Max Shows',  value: PLANS[org.plan]?.shows_limit  ?? '∞' },
          { label: 'Branding',   value: PLANS[org.plan]?.branding === 'full' ? 'Full' : PLANS[org.plan]?.branding === 'logo_only' ? 'Logo only' : 'None' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#131920] border border-white/5 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Users',        value: users.length },
          { label: 'Recent Shows', value: shows.length },
          { label: 'Plan',         value: org.plan?.charAt(0).toUpperCase() + org.plan?.slice(1) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#131920] border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-[#131920] border border-white/10 rounded-2xl p-6 w-full max-w-sm relative">
            <button onClick={() => { setShowInvite(false); setInviteLink(''); }} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
            <h3 className="text-white font-bold text-lg mb-4">Invite User to {org?.name}</h3>
            {inviteLink ? (
              <div>
                <p className="text-sm text-[#1FB8A0] mb-3">✓ Invite created! Share this link:</p>
                <div className="bg-black/40 border border-white/10 rounded-lg p-3 text-xs text-gray-300 break-all mb-4">{inviteLink}</div>
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }} className="w-full py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm">Copy Link</button>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-3">
                <input required type="email" placeholder="Email address" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
                <input type="text" placeholder="Full name (optional)" value={inviteForm.full_name} onChange={e => setInviteForm(f => ({ ...f, full_name: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
                <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-gray-300 outline-none">
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="crew">Crew</option>
                </select>
                <button type="submit" disabled={inviting} className="w-full py-2.5 rounded-xl bg-[#1FB8A0] text-black font-semibold text-sm disabled:opacity-50">{inviting ? 'Sending…' : 'Send Invite'}</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Users */}
      <div className="bg-[#131920] border border-white/5 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#1FB8A0]" /> Users
            {(users.length + pendingInvites.length) > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 font-medium">
                {users.length} active{pendingInvites.length > 0 ? ` · ${pendingInvites.length} pending` : ''}
              </span>
            )}
          </h2>
          <button onClick={() => { setShowInvite(true); setInviteLink(''); setInviteForm({ email: '', full_name: '', role: 'admin' }); }} className="flex items-center gap-1.5 text-xs font-medium text-[#1FB8A0] hover:text-white transition-colors border border-[#1FB8A0]/30 hover:border-white/20 rounded-lg px-3 py-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Invite User
          </button>
        </div>

        {usersLoading ? <p className="text-gray-500 text-sm">Loading…</p> : (users.length === 0 && pendingInvites.length === 0) ? (
          <p className="text-gray-500 text-sm">No users yet. Use the Invite User button above to add the first user.</p>
        ) : (
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm text-white font-medium">{u.full_name || '(no name)'}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[u.role] || ROLE_COLORS.crew}`}>{u.role}</span>
                  <select
                    value={u.role || 'crew'}
                    onChange={e => requestRoleChange(u.id, u.full_name || u.email, u.role, e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-300 outline-none"
                  >
                    <option value="admin">Admin</option>
                    <option value="manager">Manager</option>
                    <option value="crew">Crew</option>
                  </select>
                  <button onClick={() => removeUser(u.id, u.email)} className="text-red-400 hover:text-red-300 transition-colors p-1 rounded" title="Remove user">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {pendingInvites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white font-medium">{inv.full_name || inv.email}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 font-medium flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Invite Pending
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{inv.email} · {inv.invite_type === 'company_owner' ? 'Owner' : inv.role}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyInviteLink(inv)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition-colors"
                    title="Copy invite link"
                  >
                    <Copy className="w-3 h-3" /> Copy Link
                  </button>
                  <button onClick={() => revokeInvite(inv.id)} className="text-red-400 hover:text-red-300 transition-colors p-1 rounded" title="Revoke invite">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Shows */}
      <div className="bg-[#131920] border border-white/5 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recent Shows</h2>
        {shows.length === 0 ? <p className="text-gray-500 text-sm">No shows yet.</p> : (
          <div className="space-y-2">
            {shows.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <p className="text-sm text-white">{s.name}</p>
                <span className="text-xs text-gray-500 capitalize">{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
