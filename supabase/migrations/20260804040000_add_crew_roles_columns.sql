-- CrewRoleManager.jsx's full role editor (department, days-based pricing,
-- per diem, skills/certs, planner notes) has never had matching columns —
-- every Create/Save Role click failed with a schema-cache error. Same
-- lost-migration pattern as everything else found today.
--
-- role_name added as its own column rather than reusing the existing `name`
-- column, since role_name is read from CrewRole records in several other
-- files (ProjectCrewPanel, BillableValidationDialog) and a rename risks
-- breaking those without a full audit.

alter table public.crew_roles
  add column if not exists role_name text,
  add column if not exists department text,
  add column if not exists days_count numeric default 1,
  add column if not exists per_diem_enabled boolean default false,
  add column if not exists per_diem_amount numeric,
  add column if not exists required_skills text,
  add column if not exists certifications text,
  add column if not exists planner_notes text;
