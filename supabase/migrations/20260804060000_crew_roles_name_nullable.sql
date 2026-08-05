-- crew_roles.name is a legacy column with a NOT NULL constraint, but
-- CrewRoleManager.jsx (and role_name, added in the previous migration)
-- never populates it — every save was rejected with a not-null violation.
-- name isn't read anywhere in the feature, so just drop the constraint
-- rather than have the form populate an unused column.

alter table public.crew_roles alter column name drop not null;
