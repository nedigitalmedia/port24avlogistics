-- Address autocomplete + transport-distance feature: store the geocoded
-- coordinates from the selected address, and the computed drive distance
-- from the company's warehouse address once calculated.
-- Also adds country/is_active/internal_notes — VenueFormDialog.jsx has
-- always sent these but they were never in the schema (same lost-migration
-- pattern as everything else found today).

alter table public.venues
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists distance_from_warehouse_miles numeric,
  add column if not exists drive_time_minutes numeric,
  add column if not exists country text,
  add column if not exists is_active boolean default true,
  add column if not exists internal_notes text;
