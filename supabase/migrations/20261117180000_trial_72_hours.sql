-- Trials last 72 hours. organizations.trial_ends_at is the cutoff; the app blocks a trial
-- company once it has passed. Only meaningful while plan = 'trial'.

alter table public.organizations add column if not exists trial_ends_at timestamptz;

-- Existing trial companies: 72 hours from when they were created.
update public.organizations
   set trial_ends_at = created_at + interval '72 hours'
 where plan = 'trial' and trial_ends_at is null;

-- New trial companies (any creation path) and companies switched back to trial get a fresh 72 hours.
create or replace function public.set_trial_ends_at() returns trigger
language plpgsql as $$
begin
  if new.plan = 'trial' then
    if tg_op = 'INSERT' then
      if new.trial_ends_at is null then
        new.trial_ends_at := now() + interval '72 hours';
      end if;
    elsif old.plan is distinct from 'trial' then
      new.trial_ends_at := now() + interval '72 hours';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_set_trial_ends_at on public.organizations;
create trigger organizations_set_trial_ends_at
  before insert or update of plan on public.organizations
  for each row execute function public.set_trial_ends_at();
