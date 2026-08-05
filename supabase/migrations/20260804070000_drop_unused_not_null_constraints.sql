-- Same failure mode as crew_roles.name: these are legacy NOT NULL columns
-- that their respective forms never populate (they use a differently-named
-- field instead — template_name, field_name, role, etc.) — every save was
-- being rejected with a not-null violation. None of these columns are read
-- anywhere in the app, so dropping the constraint rather than having the
-- forms populate an unused column.

alter table public.crew_booking_email_templates alter column name drop not null;
alter table public.custom_fields alter column name drop not null;
alter table public.email_templates alter column name drop not null;
alter table public.labor_rates alter column name drop not null;
alter table public.labor_rates alter column rate drop not null;
