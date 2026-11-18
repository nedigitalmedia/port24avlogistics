-- SECURITY (found during tenant-isolation verification): public.organizations had ROW LEVEL SECURITY DISABLED
-- (the "org_self_access" policy existed but was never switched on) and the `anon` role held SELECT + UPDATE on it.
-- Anyone with the public anon key could read every company and change any company's plan / status / trial_ends_at.
--
-- This migration is safe to apply BEFORE the matching frontend deploy: it only removes access that nothing legitimate used.
-- The one visible side effect is that invite pages (read as signed-out) lose the "organizations(name, plan)" join, which is
-- why get_invite_by_token() is added here and the frontend is switched to it. The companion migration
-- 20261118000800 then closes the "anyone can list every invite" policy and must be applied AFTER the frontend deploy.
--
-- ROLLBACK: alter table public.organizations disable row level security; (re-opens the hole; not recommended);
--           drop function public.get_invite_by_token(uuid).

alter table public.organizations enable row level security;

revoke all on public.organizations from anon;

-- reads: platform admin, or a member of that company (unchanged rule)
drop policy if exists org_self_access on public.organizations;
drop policy if exists org_read on public.organizations;
drop policy if exists org_platform_write on public.organizations;

create policy org_read on public.organizations for select to authenticated
  using (
    public.is_platform_admin()
    or id = public.my_org_id()
    or exists (select 1 from public.company_memberships cm
                where cm.user_id = auth.uid() and cm.org_id = organizations.id and cm.status = 'active')
  );

-- writes (plan, status, trial_ends_at, owner...): platform admins only. The app writes organizations from the Platform Admin
-- pages only; company creation / deletion run in edge functions with the service role (which bypasses RLS).
create policy org_platform_write on public.organizations for all to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());

-- Signed-out invite pages need ONE invite (by its secret token) plus the company name/plan. Return exactly that.
create or replace function public.get_invite_by_token(p_token uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(i) || jsonb_build_object('organizations', jsonb_build_object('name', o.name, 'plan', o.plan))
    from public.pending_invites i
    left join public.organizations o on o.id = i.org_id
   where i.token = p_token
   limit 1
$$;
revoke all on function public.get_invite_by_token(uuid) from public;
grant execute on function public.get_invite_by_token(uuid) to anon, authenticated, service_role;
