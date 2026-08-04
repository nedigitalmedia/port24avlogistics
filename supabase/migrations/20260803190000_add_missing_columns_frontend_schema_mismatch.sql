-- Adds columns that the frontend has always expected but were never created
-- in the live schema (likely lost during the original app's migration to
-- Supabase). All additions are nullable/defaulted — purely additive, no
-- existing data or behavior is affected.

-- additional_equipment_requests: scan-to-request-more-gear workflow
alter table public.additional_equipment_requests
  add column if not exists asset_id uuid,
  add column if not exists asset_name text,
  add column if not exists asset_barcode text,
  add column if not exists serial_number text,
  add column if not exists show_name text,
  add column if not exists sub_location_id text,
  add column if not exists sub_location_name text,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_reason text,
  add column if not exists scanned_at timestamptz;

-- alerts: resolution tracking distinct from is_read
alter table public.alerts
  add column if not exists is_resolved boolean default false,
  add column if not exists severity text;

-- asset_movements: human-readable scanner label alongside scanned_by_user_id
alter table public.asset_movements
  add column if not exists scanned_by text;

-- assets: yearly-review "mark as lost" + assignment audit trail
alter table public.assets
  add column if not exists assignment_history jsonb default '[]'::jsonb,
  add column if not exists is_lost boolean default false,
  add column if not exists lost_at timestamptz,
  add column if not exists lost_by uuid,
  add column if not exists lost_notes text;

-- av_hospital: fields the scan-to-repair workflow always sends
alter table public.av_hospital
  add column if not exists asset_barcode text,
  add column if not exists marked_by text,
  add column if not exists marked_reason text,
  add column if not exists issue_notes text,
  add column if not exists review_id uuid;

-- client_contacts: portal access link + display name
alter table public.client_contacts
  add column if not exists portal_user_id uuid,
  add column if not exists client_name text;

-- client_files: category/visibility/notes used by the CRM file panel
alter table public.client_files
  add column if not exists client_name text,
  add column if not exists show_id uuid,
  add column if not exists category text,
  add column if not exists visibility text default 'internal',
  add column if not exists notes text;

-- client_notes: author/show context used by the CRM notes panel
alter table public.client_notes
  add column if not exists client_name text,
  add column if not exists author_name text,
  add column if not exists show_id uuid,
  add column if not exists show_name text,
  add column if not exists pinned boolean default false;

-- client_preferences: the full typed-preferences feature (production, billing,
-- quote_layout, crew, venue_logistics, equipment, show_style) — table was a
-- bare client_id/key/value store, but ClientPreferencesPanel.jsx and
-- ShowClientPreferenceApplier.jsx already implement the complete rich form.
alter table public.client_preferences
  add column if not exists client_name text,
  add column if not exists venue_id uuid,
  add column if not exists name text,
  add column if not exists preference_type text,
  add column if not exists is_active boolean default true,
  add column if not exists production_notes text,
  add column if not exists preferred_start_time text,
  add column if not exists preferred_end_time text,
  add column if not exists setup_lead_time_hours numeric,
  add column if not exists strike_time_hours numeric,
  add column if not exists billing_notes text,
  add column if not exists preferred_payment_terms text,
  add column if not exists invoice_delivery_preference text,
  add column if not exists quote_layout_notes text,
  add column if not exists preferred_quote_format text,
  add column if not exists include_crew_on_quote boolean default false,
  add column if not exists include_travel_on_quote boolean default true,
  add column if not exists crew_preferences text,
  add column if not exists preferred_crew_size numeric,
  add column if not exists crew_dress_code text,
  add column if not exists venue_logistics_notes text,
  add column if not exists preferred_load_in_time text,
  add column if not exists requires_union boolean default false,
  add column if not exists equipment_notes text,
  add column if not exists preferred_brands text,
  add column if not exists avoid_equipment text,
  add column if not exists preferred_audio_setup text,
  add column if not exists preferred_video_setup text,
  add column if not exists preferred_lighting_setup text,
  add column if not exists show_style_notes text,
  add column if not exists atmosphere_preferences text,
  add column if not exists music_preferences text,
  add column if not exists branding_notes text;

-- code_settings: one row per record_type (physical_item, kit, container, ...)
-- for auto-generated code numbering — table was a single generic settings blob.
alter table public.code_settings
  add column if not exists record_type text,
  add column if not exists label text,
  add column if not exists prefix text,
  add column if not exists separator text default '-',
  add column if not exists padding integer default 5,
  add column if not exists next_number integer default 1,
  add column if not exists auto_generate boolean default true,
  add column if not exists qr_enabled boolean default true;

-- fulfillment_calibrations: per-scenario equipment preferences (Smart Project
-- Builder) — table was a single generic settings blob, this feature's already
-- built to work with flat scenario columns instead.
alter table public.fulfillment_calibrations
  add column if not exists scenario_key text,
  add column if not exists scenario_label text,
  add column if not exists category text,
  add column if not exists quality_level text,
  add column if not exists description text,
  add column if not exists preferred_items jsonb default '[]'::jsonb,
  add column if not exists alternate_items jsonb default '[]'::jsonb,
  add column if not exists roundtable_note text,
  add column if not exists is_active boolean default true;

-- container_labels: per-kit label tracking (feature only ever worked for
-- physical containers, never kits, despite ContainerLabelManager being kit-only)
alter table public.container_labels
  add column if not exists kit_id uuid,
  add column if not exists kit_name text;

-- containers: live show assignment tracking (assets already have this; containers didn't)
alter table public.containers
  add column if not exists current_show_id uuid,
  add column if not exists current_show_name text;

-- custom_fields: machine key + admin-form fields (Admin.jsx's full custom
-- field editor), distinct from the display `name`
alter table public.custom_fields
  add column if not exists field_key text,
  add column if not exists field_name text,
  add column if not exists is_hidden boolean default false,
  add column if not exists is_readonly boolean default false,
  add column if not exists default_value text,
  add column if not exists section text,
  add column if not exists show_when_category text;

-- email_field_controls: separate human display label from the machine field_name
alter table public.email_field_controls
  add column if not exists display_label text;

-- email_templates: the visual template-designer feature (EmailBuilder /
-- EmailBrandingSettings) — table only ever supported plain subject/body.
alter table public.email_templates
  add column if not exists template_name text,
  add column if not exists template_type text,
  add column if not exists subject_line text,
  add column if not exists sections jsonb default '[]'::jsonb,
  add column if not exists header_enabled boolean default true,
  add column if not exists footer_enabled boolean default true,
  add column if not exists is_active boolean default true;

-- invoices: client-portal "viewed" tracking
alter table public.invoices
  add column if not exists viewed_date timestamptz;

-- kits: live show assignment tracking (assets already have this; kits didn't)
alter table public.kits
  add column if not exists current_show_id uuid,
  add column if not exists current_sub_location_id text;

-- logistics_bank: active/inactive toggle for saved logistics line items
alter table public.logistics_bank
  add column if not exists is_active boolean default true;

-- project_crew: crew assignment location + status timestamp
alter table public.project_crew
  add column if not exists location text,
  add column if not exists status_updated_at timestamptz;

-- quotes: lock/revert workflow
alter table public.quotes
  add column if not exists is_locked boolean default false,
  add column if not exists reverted_at timestamptz,
  add column if not exists reverted_by text;

-- roundtable_items: this table is actually used as partner-shared inventory
-- (RoundtableInventory.jsx, ItemFormDialog.jsx, RoundtableBulkImport.jsx),
-- not the task-tracker shape it currently has. Adding the inventory fields
-- alongside the existing ones rather than removing anything.
alter table public.roundtable_items
  add column if not exists partner_id uuid,
  add column if not exists partner_name text,
  add column if not exists name text,
  add column if not exists category text,
  add column if not exists qty_available integer default 1,
  add column if not exists daily_rate numeric,
  add column if not exists serial_numbers text,
  add column if not exists item_type text default 'physical',
  add column if not exists condition text,
  add column if not exists is_available boolean default true;

-- shows: quote workflow state + venue type used by Smart Project Builder
alter table public.shows
  add column if not exists fulfillment_status text,
  add column if not exists quote_confirmed boolean default false,
  add column if not exists quote_locked boolean default false;

-- users: onboarding flow completion flag
alter table public.users
  add column if not exists onboarding_complete boolean default false;
