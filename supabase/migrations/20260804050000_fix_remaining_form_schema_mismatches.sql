-- Systematic audit of every remaining form in the app against the live
-- schema (following the user's request to check every save/submit button).
-- Same lost-migration pattern as everything else fixed today.

-- logistics_bank: LogisticsBankManager.jsx / LogisticsAdmin.jsx send ~half
-- their fields to columns that never existed — every save was failing.
alter table public.logistics_bank
  add column if not exists logistics_type text,
  add column if not exists contact_name text,
  add column if not exists contact_phone text,
  add column if not exists contact_email text,
  add column if not exists description text,
  add column if not exists vehicle_type text,
  add column if not exists origin text,
  add column if not exists destination text,
  add column if not exists base_address text;

-- containers: ContainerFormDialog.jsx's dimensions/weight/type fields have
-- never had a home. home_location kept separate from the existing
-- `location` column since the form never touches `location` at all.
alter table public.containers
  add column if not exists container_type text,
  add column if not exists asset_number text,
  add column if not exists outside_length_in numeric,
  add column if not exists outside_width_in numeric,
  add column if not exists outside_height_in numeric,
  add column if not exists inside_length_in numeric,
  add column if not exists inside_width_in numeric,
  add column if not exists inside_height_in numeric,
  add column if not exists empty_weight_lbs numeric,
  add column if not exists max_weight_lbs numeric,
  add column if not exists stackable boolean default false,
  add column if not exists has_wheels boolean default false,
  add column if not exists must_stay_upright boolean default false,
  add column if not exists fragile boolean default false,
  add column if not exists can_stack_on_top boolean default true,
  add column if not exists can_have_items_stacked_on_it boolean default true,
  add column if not exists home_location text,
  add column if not exists category text;

-- roundtable_items: notes field on the item form
alter table public.roundtable_items
  add column if not exists notes text;

-- roundtable_partners: PartnerFormDialog.jsx's full field set. company_name
-- kept alongside the existing `name` column — entities.js's sanitize()
-- already copies company_name -> name when name is absent, but leaves the
-- original key in the payload, so it still needs to be a real column too.
alter table public.roundtable_partners
  add column if not exists company_name text,
  add column if not exists logo_url text,
  add column if not exists contact_name text,
  add column if not exists address text,
  add column if not exists pickup_address text,
  add column if not exists delivery_notes text,
  add column if not exists billing_notes text,
  add column if not exists preferred_categories text,
  add column if not exists is_active boolean default true;

-- show_requirements: RequirementLine.jsx's inline-edit save sends notes,
-- which was missed in the earlier daily_rate fix.
alter table public.show_requirements
  add column if not exists notes text;

-- crew_members: fields CrewMembers.jsx sends that were never added.
alter table public.crew_members
  add column if not exists is_available boolean default true,
  add column if not exists skills text,
  add column if not exists hourly_rate numeric,
  add column if not exists daily_rate numeric,
  add column if not exists emergency_contact text,
  add column if not exists start_date date;

-- document_settings: table was a single settings jsonb blob; the form
-- sends 14 flat fields directly, matching the pattern already used for
-- code_settings/fulfillment_calibrations (flat columns, not nested jsonb).
alter table public.document_settings
  add column if not exists paper_size text,
  add column if not exists orientation_default text,
  add column if not exists margin_preset text,
  add column if not exists show_header boolean default true,
  add column if not exists show_footer boolean default true,
  add column if not exists show_logo boolean default true,
  add column if not exists show_page_numbers boolean default true,
  add column if not exists show_printed_date boolean default true,
  add column if not exists header_style text,
  add column if not exists font_family text,
  add column if not exists table_density text,
  add column if not exists truck_pack_orientation text,
  add column if not exists quote_show_signature boolean default false,
  add column if not exists invoice_show_signature boolean default false;

-- labor_rates: real table was a single flat-rate shape; LaborRateManager.jsx
-- has always been built around a full rate matrix (hourly/OT/daily/half-day/
-- travel x internal/billable). Adding to match the already-built UI rather
-- than rebuilding the form around the minimal schema.
alter table public.labor_rates
  add column if not exists role text,
  add column if not exists labor_type text,
  add column if not exists union_type text,
  add column if not exists hourly_rate_internal numeric,
  add column if not exists hourly_rate_billable numeric,
  add column if not exists overtime_rate_internal numeric,
  add column if not exists overtime_rate_billable numeric,
  add column if not exists daily_rate_internal numeric,
  add column if not exists daily_rate_billable numeric,
  add column if not exists half_day_rate_internal numeric,
  add column if not exists half_day_rate_billable numeric,
  add column if not exists travel_rate_internal numeric,
  add column if not exists travel_rate_billable numeric,
  add column if not exists is_active boolean default true;

-- print_templates: QuoteTemplateBuilder.jsx sends description/is_default,
-- neither of which existed.
alter table public.print_templates
  add column if not exists description text,
  add column if not exists is_default boolean default false;
