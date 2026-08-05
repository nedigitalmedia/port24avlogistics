-- pending_invites only had two RLS policies: platform_admin_full (requires
-- is_platform_admin) and a public read-by-token policy for the unauthenticated
-- accept-invite flow. Nothing allowed a company's own admin to create or
-- revoke invites for their own org — InviteUserDialog.jsx (company workspace,
-- gated to role='admin' in the UI) failed on every insert, and Admin.jsx's
-- revoke-invite button was equally broken, just not yet hit.

create policy company_admin_manage_invites on public.pending_invites
  for all
  to authenticated
  using (
    is_platform_admin()
    or exists (
      select 1 from public.company_memberships cm
      where cm.org_id = pending_invites.org_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
        and cm.status = 'active'
    )
  )
  with check (
    is_platform_admin()
    or exists (
      select 1 from public.company_memberships cm
      where cm.org_id = pending_invites.org_id
        and cm.user_id = auth.uid()
        and cm.role = 'admin'
        and cm.status = 'active'
    )
  );
