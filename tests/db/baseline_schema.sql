-- TEST FIXTURE ONLY. Structure-only snapshot of the live public schema (no data).
-- Used by tests/db/*.test.js to run migrations in an in-memory Postgres. Not a migration; never applied to a real database.
set check_function_bodies = false;

create table if not exists public."additional_equipment_requests" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "item_name" text,
  "quantity" integer default 1,
  "category" text,
  "notes" text,
  "status" text default 'pending'::text,
  "requested_by" uuid,
  "approved_by" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid,
  "asset_id" uuid,
  "asset_name" text,
  "asset_barcode" text,
  "serial_number" text,
  "show_name" text,
  "sub_location_id" text,
  "sub_location_name" text,
  "approved_at" timestamp with time zone,
  "rejected_reason" text,
  "scanned_at" timestamp with time zone
);

create table if not exists public."admin_audit_log" (
  "id" uuid default gen_random_uuid() not null,
  "action" text not null,
  "target_org_id" uuid,
  "target_user_id" uuid,
  "changed_by_id" uuid,
  "old_value" text,
  "new_value" text,
  "metadata" jsonb,
  "created_at" timestamp with time zone default now() not null
);

create table if not exists public."alerts" (
  "id" uuid default gen_random_uuid() not null,
  "type" text,
  "title" text,
  "message" text,
  "show_id" uuid,
  "asset_id" uuid,
  "is_read" boolean default false,
  "created_for" uuid,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "is_resolved" boolean default false,
  "severity" text
);

create table if not exists public."asset_movements" (
  "id" uuid default gen_random_uuid() not null,
  "asset_id" uuid,
  "show_id" uuid,
  "movement_type" text,
  "from_location" text,
  "to_location" text,
  "quantity" integer default 1,
  "moved_by" uuid,
  "moved_at" timestamp with time zone default now(),
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "asset_name" text,
  "asset_barcode" text,
  "asset_serial" text,
  "asset_status" text,
  "asset_category" text,
  "asset_location" text,
  "asset_number" text,
  "sub_location_id" text,
  "sub_location_name" text,
  "show_name" text,
  "kit_id" uuid,
  "kit_name" text,
  "current_show_id" uuid,
  "current_show_name" text,
  "current_container_id" uuid,
  "current_container_name" text,
  "current_sub_location_id" text,
  "current_sub_location_name" text,
  "record_type" text,
  "scanned_by_user_id" uuid,
  "action" text,
  "org_id" uuid,
  "scanned_by" text
);

create table if not exists public."asset_review_items" (
  "id" uuid default gen_random_uuid() not null,
  "asset_id" uuid,
  "review_id" uuid,
  "status" text,
  "notes" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "review_status" text,
  "issue_notes" text,
  "marked_by" uuid,
  "marked_reason" text,
  "repair_status" text,
  "repairing" boolean default false,
  "rejected_reason" text,
  "returned_to_stock_at" timestamp with time zone,
  "decision_at" timestamp with time zone,
  "decision_by" uuid,
  "decision_notes" text,
  "asset_name" text,
  "asset_number" text,
  "asset_barcode" text,
  "asset_serial" text,
  "asset_category" text,
  "asset_location" text,
  "is_available" boolean default true,
  "org_id" uuid
);

create table if not exists public."assets" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "item_type" text,
  "category" text,
  "description" text,
  "manufacturer" text,
  "model" text,
  "barcode" text,
  "asset_number" text,
  "serial_number" text,
  "serial_numbers" jsonb default '[]'::jsonb,
  "mfr_serial" text,
  "status" text default 'available'::text,
  "condition" text,
  "tracking" text default 'individual'::text,
  "quantity" integer default 1,
  "unit_of_measure" text,
  "reorder_level" integer,
  "location" text,
  "current_show_id" uuid,
  "current_sub_location_id" text,
  "current_sub_location_name" text,
  "locked_to_show_id" uuid,
  "locked_to_show_name" text,
  "locked_at" timestamp with time zone,
  "kit_id" uuid,
  "ownership_type" text default 'owned'::text,
  "partner_owner_id" uuid,
  "partner_owner_name" text,
  "partner_use_allowed" boolean default true,
  "partner_approval_required" boolean default false,
  "partner_agreement_notes" text,
  "daily_rate" numeric default 0,
  "replacement_value" numeric default 0,
  "purchase_price" numeric default 0,
  "purchase_date" date,
  "subrent_cost" numeric default 0,
  "cost_per_unit" numeric default 0,
  "max_discount_pct" numeric default 0,
  "weight_kg" numeric,
  "country_of_origin" text,
  "vendor" text,
  "warranty_expiry" date,
  "image_url" text,
  "custom_fields" jsonb default '{}'::jsonb,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "home_container_id" uuid,
  "home_container_name" text,
  "current_container_id" uuid,
  "current_container_name" text,
  "can_move_to_show_container" boolean default true,
  "permanent_container" boolean default false,
  "employee_checkout_id" uuid,
  "employee_checkout_name" text,
  "employee_checkout_date" date,
  "discountable" boolean default true,
  "taxable" boolean default true,
  "pricing_tier" text,
  "storage_notes" text,
  "org_id" uuid,
  "assignment_history" jsonb default '[]'::jsonb,
  "is_lost" boolean default false,
  "lost_at" timestamp with time zone,
  "lost_by" uuid,
  "lost_notes" text
);

create table if not exists public."av_hospital" (
  "id" uuid default gen_random_uuid() not null,
  "asset_id" uuid,
  "asset_name" text,
  "show_id" uuid,
  "issue" text,
  "status" text default 'open'::text,
  "reported_by" uuid,
  "repaired_by" uuid,
  "reported_at" timestamp with time zone default now(),
  "resolved_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "repair_status" text,
  "is_active" boolean default true,
  "waiting" boolean default false,
  "org_id" uuid,
  "asset_barcode" text,
  "marked_by" text,
  "marked_reason" text,
  "issue_notes" text,
  "review_id" uuid
);

create table if not exists public."brand_settings" (
  "id" uuid default gen_random_uuid() not null,
  "company_name" text,
  "logo_url" text,
  "primary_color" text,
  "secondary_color" text,
  "font" text,
  "address" text,
  "phone" text,
  "email" text,
  "website" text,
  "updated_at" timestamp with time zone default now(),
  "company_phone" text,
  "company_website" text,
  "company_logo_url" text,
  "org_id" uuid,
  "accent_color" text,
  "bg_color" text,
  "card_color" text,
  "sidebar_color" text,
  "border_color" text,
  "login_background_url" text,
  "login_background_color" text,
  "company_email" text,
  "invoice_header_note" text,
  "invoice_footer_note" text,
  "quote_footer_note" text,
  "default_tax_pct" numeric default 0,
  "default_payment_terms" text,
  "company_address" text,
  "email_footer_logo_url" text,
  "email_footer_background_type" text default 'solid'::text,
  "email_footer_background_color" text,
  "email_footer_background_gradient" text,
  "email_footer_text_color" text,
  "email_footer_custom_text" text,
  "email_footer_disclaimer" text,
  "email_footer_show_logo" boolean default true,
  "email_footer_show_company_name" boolean default true,
  "email_footer_show_phone" boolean default true,
  "email_footer_show_email" boolean default true,
  "email_footer_show_address" boolean default true,
  "email_footer_show_website" boolean default true,
  "email_footer_show_social" boolean default true,
  "email_footer_social_facebook" text,
  "email_footer_social_instagram" text,
  "email_footer_social_linkedin" text,
  "email_header_logo_url" text,
  "email_header_background_type" text default 'solid'::text,
  "email_header_background_color" text,
  "email_header_background_gradient" text,
  "email_header_background_url" text,
  "email_header_text_color" text,
  "email_header_show_logo" boolean default true,
  "email_header_show_social" boolean default true,
  "email_header_social_facebook" text,
  "email_header_social_instagram" text,
  "email_header_social_linkedin" text
);

create table if not exists public."categories" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "description" text,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid
);

create table if not exists public."client_contacts" (
  "id" uuid default gen_random_uuid() not null,
  "client_id" uuid,
  "name" text,
  "email" text,
  "phone" text,
  "role" text,
  "is_primary" boolean default false,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "first_name" text,
  "last_name" text,
  "communication_preference" text,
  "title" text,
  "phone_mobile" text,
  "org_id" uuid,
  "portal_user_id" uuid,
  "client_name" text
);

create table if not exists public."client_files" (
  "id" uuid default gen_random_uuid() not null,
  "client_id" uuid,
  "name" text,
  "url" text,
  "file_type" text,
  "size_bytes" bigint,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone default now(),
  "file_name" text,
  "file_size_kb" numeric,
  "org_id" uuid,
  "client_name" text,
  "show_id" uuid,
  "category" text,
  "visibility" text default 'internal'::text,
  "notes" text
);

create table if not exists public."client_notes" (
  "id" uuid default gen_random_uuid() not null,
  "client_id" uuid,
  "content" text,
  "created_by" uuid,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "client_name" text,
  "author_name" text,
  "show_id" uuid,
  "show_name" text,
  "pinned" boolean default false
);

create table if not exists public."client_preferences" (
  "id" uuid default gen_random_uuid() not null,
  "client_id" uuid,
  "key" text,
  "value" text,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "client_name" text,
  "venue_id" uuid,
  "name" text,
  "preference_type" text,
  "is_active" boolean default true,
  "production_notes" text,
  "preferred_start_time" text,
  "preferred_end_time" text,
  "setup_lead_time_hours" numeric,
  "strike_time_hours" numeric,
  "billing_notes" text,
  "preferred_payment_terms" text,
  "invoice_delivery_preference" text,
  "quote_layout_notes" text,
  "preferred_quote_format" text,
  "include_crew_on_quote" boolean default false,
  "include_travel_on_quote" boolean default true,
  "crew_preferences" text,
  "preferred_crew_size" numeric,
  "crew_dress_code" text,
  "venue_logistics_notes" text,
  "preferred_load_in_time" text,
  "requires_union" boolean default false,
  "equipment_notes" text,
  "preferred_brands" text,
  "avoid_equipment" text,
  "preferred_audio_setup" text,
  "preferred_video_setup" text,
  "preferred_lighting_setup" text,
  "show_style_notes" text,
  "atmosphere_preferences" text,
  "music_preferences" text,
  "branding_notes" text
);

create table if not exists public."clients" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "company_name" text,
  "display_name" text,
  "industry" text,
  "billing_contact_name" text,
  "billing_email" text,
  "billing_address" text,
  "billing_city" text,
  "billing_state" text,
  "billing_zip" text,
  "payment_terms" text,
  "payment_terms_custom" text,
  "invoice_delivery" text,
  "quote_format" text,
  "preferred_communication" text,
  "po_required" boolean default false,
  "po_notes" text,
  "coi_required" boolean default false,
  "coi_holder_name" text,
  "coi_notes" text,
  "requires_union" boolean default false,
  "preferred_load_in_time" text,
  "preferred_quote_format" text,
  "venue_logistics" text,
  "venue_logistics_notes" text,
  "billing_notes" text,
  "general_notes" text,
  "internal_notes" text,
  "first_show_date" date,
  "last_show_date" date,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "billing_country" text,
  "tax_exempt" boolean default false,
  "coi_minimum_coverage" text,
  "status" text default 'active'::text,
  "website" text,
  "communication_notes" text,
  "total_revenue" numeric default 0,
  "total_shows" integer default 0,
  "credit_limit" numeric,
  "tax_id" text,
  "invoice_format" text,
  "quote_layout" text,
  "quote_layout_notes" text,
  "billing_phone" text,
  "default_payment_method" text,
  "invoice_delivery_preference" text,
  "include_crew_on_quote" boolean default false,
  "include_travel_on_quote" boolean default false,
  "contract" text,
  "source" text,
  "show_equipment_detail" boolean default false,
  "show_rates_on_quote" boolean default false,
  "org_id" uuid
);

create table if not exists public."code_settings" (
  "id" uuid default gen_random_uuid() not null,
  "settings" jsonb default '{}'::jsonb,
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid,
  "record_type" text,
  "label" text,
  "prefix" text,
  "separator" text default '-'::text,
  "padding" integer default 5,
  "next_number" integer default 1,
  "auto_generate" boolean default true,
  "qr_enabled" boolean default true
);

create table if not exists public."company_memberships" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "org_id" uuid not null,
  "role" text default 'member'::text not null,
  "status" text default 'active'::text not null,
  "joined_at" timestamp with time zone default now()
);

create table if not exists public."container_labels" (
  "id" uuid default gen_random_uuid() not null,
  "container_id" uuid,
  "label_data" jsonb,
  "printed_by" uuid,
  "printed_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "name" text,
  "label_id" text,
  "qr_enabled" boolean default true,
  "template_type" text,
  "saved_at" timestamp with time zone,
  "is_active" boolean default true,
  "is_visible" boolean default true,
  "org_id" uuid,
  "kit_id" uuid,
  "kit_name" text
);

create table if not exists public."containers" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "location" text,
  "barcode" text,
  "status" text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "current_show_id" uuid,
  "current_show_name" text,
  "container_type" text,
  "asset_number" text,
  "outside_length_in" numeric,
  "outside_width_in" numeric,
  "outside_height_in" numeric,
  "inside_length_in" numeric,
  "inside_width_in" numeric,
  "inside_height_in" numeric,
  "empty_weight_lbs" numeric,
  "max_weight_lbs" numeric,
  "stackable" boolean default false,
  "has_wheels" boolean default false,
  "must_stay_upright" boolean default false,
  "fragile" boolean default false,
  "can_stack_on_top" boolean default true,
  "can_have_items_stacked_on_it" boolean default true,
  "home_location" text,
  "category" text
);

create table if not exists public."crew_booking_email_templates" (
  "id" uuid default gen_random_uuid() not null,
  "name" text,
  "subject" text,
  "body" text,
  "is_default" boolean default false,
  "created_at" timestamp with time zone default now(),
  "subject_line" text,
  "author_name" text,
  "updated_at" timestamp with time zone default now()
);

create table if not exists public."crew_bookings" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "show_name" text,
  "crew_id" uuid,
  "crew_name" text,
  "crew_email" text,
  "crew_phone" text,
  "project_crew_id" uuid,
  "role" text,
  "status" text default 'not_sent'::text,
  "start_date" date,
  "end_date" date,
  "start_time" text,
  "end_time" text,
  "location" text,
  "rate" numeric,
  "rate_type" text,
  "notes" text,
  "billable_rate_missing" boolean default false,
  "email_sent_at" timestamp with time zone,
  "sent_by" uuid,
  "responded_at" timestamp with time zone,
  "attached_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid
);

create table if not exists public."crew_members" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "full_name" text,
  "email" text,
  "phone_number" text,
  "role" text,
  "status" text default 'active'::text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "job_title" text,
  "department" text,
  "profile_photo_url" text,
  "employee_checkout_asset_ids" jsonb default '[]'::jsonb,
  "org_id" uuid,
  "is_available" boolean default true,
  "skills" text,
  "hourly_rate" numeric,
  "daily_rate" numeric,
  "emergency_contact" text,
  "start_date" date
);

create table if not exists public."crew_roles" (
  "id" uuid default gen_random_uuid() not null,
  "name" text,
  "description" text,
  "created_at" timestamp with time zone default now(),
  "pricing_method" text,
  "hourly_rate_internal" numeric default 0,
  "hourly_rate_billable" numeric default 0,
  "daily_rate_internal" numeric default 0,
  "daily_rate_billable" numeric default 0,
  "fixed_cost_internal" numeric default 0,
  "fixed_cost_billable" numeric default 0,
  "is_active" boolean default true,
  "show_in_crew_booking" boolean default true,
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid,
  "role_name" text,
  "department" text,
  "days_count" numeric default 1,
  "per_diem_enabled" boolean default false,
  "per_diem_amount" numeric,
  "required_skills" text,
  "certifications" text,
  "planner_notes" text
);

create table if not exists public."custom_fields" (
  "id" uuid default gen_random_uuid() not null,
  "entity_type" text not null,
  "name" text,
  "field_type" text,
  "options" jsonb default '[]'::jsonb,
  "is_required" boolean default false,
  "sort_order" integer default 0,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "field_key" text,
  "is_hidden" boolean default false,
  "is_readonly" boolean default false,
  "default_value" text,
  "section" text,
  "show_when_category" text,
  "field_name" text
);

create table if not exists public."document_settings" (
  "id" uuid default gen_random_uuid() not null,
  "settings" jsonb default '{}'::jsonb,
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid,
  "paper_size" text,
  "orientation_default" text,
  "margin_preset" text,
  "show_header" boolean default true,
  "show_footer" boolean default true,
  "show_logo" boolean default true,
  "show_page_numbers" boolean default true,
  "show_printed_date" boolean default true,
  "header_style" text,
  "font_family" text,
  "table_density" text,
  "truck_pack_orientation" text,
  "quote_show_signature" boolean default false,
  "invoice_show_signature" boolean default false
);

create table if not exists public."email_field_controls" (
  "id" uuid default gen_random_uuid() not null,
  "entity_type" text,
  "field_name" text,
  "is_visible" boolean default true,
  "is_required" boolean default false,
  "sort_order" integer default 0,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "display_label" text
);

create table if not exists public."email_templates" (
  "id" uuid default gen_random_uuid() not null,
  "name" text,
  "subject" text,
  "body" text,
  "type" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid,
  "template_name" text,
  "template_type" text,
  "subject_line" text,
  "sections" jsonb default '[]'::jsonb,
  "header_enabled" boolean default true,
  "footer_enabled" boolean default true,
  "is_active" boolean default true
);

create table if not exists public."fulfillment_calibrations" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "name" text,
  "settings" jsonb default '{}'::jsonb,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "scenario_key" text,
  "scenario_label" text,
  "category" text,
  "quality_level" text,
  "description" text,
  "preferred_items" jsonb default '[]'::jsonb,
  "alternate_items" jsonb default '[]'::jsonb,
  "roundtable_note" text,
  "is_active" boolean default true
);

create table if not exists public."import_templates" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "entity_type" text,
  "column_map" jsonb default '{}'::jsonb,
  "created_by" uuid,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid
);

create table if not exists public."invoice_settings" (
  "id" uuid default gen_random_uuid() not null,
  "default_terms" text,
  "default_notes" text,
  "tax_rate" numeric default 0,
  "logo_url" text,
  "footer_text" text,
  "updated_at" timestamp with time zone default now(),
  "default_tax_pct" numeric default 0,
  "email_header_logo_url" text,
  "email_header_show_logo" boolean default true,
  "email_header_logo_position" text,
  "email_footer_logo_url" text,
  "email_footer_show_logo" boolean default true,
  "email_footer_show_website" boolean default true,
  "prefix" text,
  "separator" text,
  "next_number" integer default 1,
  "auto_generate" boolean default true,
  "display_label" text,
  "org_id" uuid
);

create table if not exists public."invoices" (
  "id" uuid default gen_random_uuid() not null,
  "invoice_number" text,
  "show_id" uuid,
  "show_name" text,
  "client_id" uuid,
  "client_name" text,
  "status" text default 'draft'::text,
  "total" numeric default 0,
  "amount_paid" numeric default 0,
  "amount_due" numeric default 0,
  "deposit_required" numeric default 0,
  "deposit_paid" boolean default false,
  "due_date" date,
  "sent_date" date,
  "client_visible_notes" text,
  "stripe_hosted_invoice_url" text,
  "stripe_pdf_url" text,
  "stripe_receipt_url" text,
  "line_items" jsonb default '[]'::jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "payment_terms" text,
  "po_number" text,
  "tax_exempt" boolean default false,
  "payment_history" jsonb default '[]'::jsonb,
  "quickbooks_invoice_id" text,
  "quickbooks_invoice_number" text,
  "quickbooks_invoice_url" text,
  "quickbooks_sync_status" text,
  "quickbooks_sync_error" text,
  "last_quickbooks_sync_at" timestamp with time zone,
  "stripe_invoice_id" text,
  "supporting_badges" jsonb default '[]'::jsonb,
  "subtotal" numeric default 0,
  "tax_amount" numeric default 0,
  "discount_amount" numeric default 0,
  "issue_date" date,
  "billing_contact_name" text,
  "client_email" text,
  "client_address" text,
  "tax_pct" numeric default 0,
  "org_id" uuid,
  "viewed_date" timestamp with time zone
);

create table if not exists public."kits" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "kit_type" text,
  "category" text,
  "location" text,
  "barcode" text,
  "asset_number" text,
  "status" text default 'available'::text,
  "daily_rate" numeric default 0,
  "auto_price" boolean default true,
  "description" text,
  "is_sealed" boolean default false,
  "require_complete_checkin" boolean default false,
  "linked_asset_ids" jsonb default '[]'::jsonb,
  "kit_contents" jsonb default '[]'::jsonb,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid,
  "current_show_id" uuid,
  "current_sub_location_id" text
);

create table if not exists public."labor_rates" (
  "id" uuid default gen_random_uuid() not null,
  "name" text,
  "rate" numeric,
  "rate_type" text,
  "description" text,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "role" text,
  "labor_type" text,
  "union_type" text,
  "hourly_rate_internal" numeric,
  "hourly_rate_billable" numeric,
  "overtime_rate_internal" numeric,
  "overtime_rate_billable" numeric,
  "daily_rate_internal" numeric,
  "daily_rate_billable" numeric,
  "half_day_rate_internal" numeric,
  "half_day_rate_billable" numeric,
  "travel_rate_internal" numeric,
  "travel_rate_billable" numeric,
  "is_active" boolean default true
);

create table if not exists public."logistics_bank" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "name" text,
  "vendor" text,
  "amount" numeric default 0,
  "category" text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "rate_per_mile" numeric default 0,
  "billable_rate_per_mile" numeric default 0,
  "default_cost" numeric default 0,
  "default_billable_amount" numeric default 0,
  "org_id" uuid,
  "is_active" boolean default true,
  "logistics_type" text,
  "contact_name" text,
  "contact_phone" text,
  "contact_email" text,
  "description" text,
  "vehicle_type" text,
  "origin" text,
  "destination" text,
  "base_address" text
);

create table if not exists public."organizations" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "slug" text,
  "plan" text default 'trial'::text,
  "status" text default 'active'::text,
  "owner_id" uuid,
  "logo_url" text,
  "primary_color" text,
  "website" text,
  "phone" text,
  "address" text,
  "city" text,
  "state" text,
  "zip" text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "trial_ends_at" timestamp with time zone
);

create table if not exists public."payments" (
  "id" uuid default gen_random_uuid() not null,
  "invoice_id" uuid,
  "show_id" uuid,
  "client_id" uuid,
  "amount" numeric not null,
  "method" text,
  "type" text,
  "reference_number" text,
  "date" date,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid
);

create table if not exists public."pending_invites" (
  "id" uuid default gen_random_uuid() not null,
  "token" uuid default gen_random_uuid() not null,
  "email" text not null,
  "full_name" text,
  "org_id" uuid not null,
  "role" text default 'admin'::text not null,
  "status" text default 'pending'::text not null,
  "invited_by" uuid,
  "created_at" timestamp with time zone default now(),
  "expires_at" timestamp with time zone default (now() + '7 days'::interval),
  "accepted_at" timestamp with time zone,
  "invite_type" text default 'team_member'::text not null
);

create table if not exists public."post_event_costs" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "show_name" text,
  "cost_name" text,
  "category" text,
  "quantity" numeric default 1,
  "unit_cost" numeric default 0,
  "unit_sell_price" numeric default 0,
  "total_internal_cost" numeric default 0,
  "total_billable_cost" numeric default 0,
  "is_billable" boolean default true,
  "notes" text,
  "date_added" date,
  "added_by" uuid,
  "created_at" timestamp with time zone default now(),
  "added_by_name" text,
  "org_id" uuid
);

create table if not exists public."print_templates" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "type" text,
  "html" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "template_type" text,
  "template_name" text,
  "sections" jsonb default '[]'::jsonb,
  "branding" jsonb default '{}'::jsonb,
  "header_enabled" boolean default true,
  "footer_enabled" boolean default true,
  "padding" text,
  "visibility" text,
  "label" jsonb default '{}'::jsonb,
  "org_id" uuid,
  "block_config" jsonb default '[]'::jsonb,
  "body_html" text,
  "qr_data_config" jsonb,
  "label_width_mm" numeric,
  "label_height_mm" numeric,
  "label_size_id" text,
  "description" text,
  "is_default" boolean default false
);

create table if not exists public."project_crew" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "show_name" text,
  "crew_member_id" uuid,
  "crew_member_name" text,
  "crew_member_email" text,
  "role" text,
  "assignment_date" date,
  "end_date" date,
  "start_time" text,
  "end_time" text,
  "hours" numeric,
  "quantity" integer default 1,
  "rate_type" text,
  "internal_cost" numeric default 0,
  "billable_cost" numeric default 0,
  "internal_rate" numeric default 0,
  "billable_rate" numeric default 0,
  "labor_rate_id" uuid,
  "notes" text,
  "assignment_status" text default 'pending'::text,
  "billable_rate_missing" boolean default false,
  "crew_booking_id" uuid,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid,
  "location" text,
  "status_updated_at" timestamp with time zone
);

create table if not exists public."quickbooks_connections" (
  "id" uuid default gen_random_uuid() not null,
  "realm_id" text,
  "access_token" text,
  "refresh_token" text,
  "token_expires" timestamp with time zone,
  "company_name" text,
  "connected_by" uuid,
  "connected_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid,
  "token_expires_at" timestamp with time zone,
  "last_sync_at" timestamp with time zone,
  "last_sync_status" text,
  "last_sync_error" text,
  "income_account_equipment" text,
  "income_account_labor" text,
  "income_account_logistics" text,
  "income_account_consumables" text,
  "income_account_discounts" text,
  "deposit_account" text,
  "default_terms" text,
  "sales_tax_code" text,
  "default_service_item" text,
  "auto_sync_on_invoice_send" boolean default true,
  "sync_customers" boolean default true,
  "sync_invoices" boolean default true,
  "sync_payments" boolean default true
);

create table if not exists public."quotes" (
  "id" uuid default gen_random_uuid() not null,
  "number" text,
  "show_id" uuid,
  "show_name" text,
  "client_id" uuid,
  "client_name" text,
  "status" text default 'draft'::text,
  "template_id" uuid,
  "line_items" jsonb default '[]'::jsonb,
  "discount_pct" numeric default 0,
  "tax_pct" numeric default 0,
  "total" numeric default 0,
  "notes" text,
  "show_daily_breakdown" boolean default false,
  "confirmed_at" timestamp with time zone,
  "confirmed_by" text,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "valid_until" date,
  "subtotal" numeric default 0,
  "tax_amount" numeric default 0,
  "discount_amount" numeric default 0,
  "org_id" uuid,
  "is_locked" boolean default false,
  "reverted_at" timestamp with time zone,
  "reverted_by" text
);

create table if not exists public."roundtable_items" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "title" text,
  "description" text,
  "status" text,
  "assigned_to" uuid,
  "due_date" date,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "partner_id" uuid,
  "partner_name" text,
  "name" text,
  "category" text,
  "qty_available" integer default 1,
  "daily_rate" numeric,
  "serial_numbers" text,
  "item_type" text default 'physical'::text,
  "condition" text,
  "is_available" boolean default true,
  "notes" text
);

create table if not exists public."roundtable_partners" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "email" text,
  "phone" text,
  "company" text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "org_id" uuid,
  "company_name" text,
  "logo_url" text,
  "contact_name" text,
  "address" text,
  "pickup_address" text,
  "delivery_notes" text,
  "billing_notes" text,
  "preferred_categories" text,
  "is_active" boolean default true
);

create table if not exists public."roundtable_subrents" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "show_name" text,
  "room_id" text,
  "room_name" text,
  "item_name" text,
  "partner_name" text,
  "quantity" integer default 1,
  "internal_cost" numeric default 0,
  "total_cost" numeric default 0,
  "billable_amount" numeric default 0,
  "notes" text,
  "vendor_reference" text,
  "source_type" text,
  "added_by" uuid,
  "created_at" timestamp with time zone default now(),
  "status" text default 'pending'::text,
  "added_by_name" text,
  "org_id" uuid
);

create table if not exists public."show_fulfillments" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "show_name" text,
  "requirement_id" uuid,
  "asset_id" uuid,
  "asset_name" text,
  "asset_barcode" text,
  "asset_serial" text,
  "room_id" text,
  "room_name" text,
  "movement_state" text default 'pending'::text,
  "scanned_by" uuid,
  "scanned_at" timestamp with time zone,
  "packed_by" uuid,
  "packed_at" timestamp with time zone,
  "sent_by" uuid,
  "sent_at" timestamp with time zone,
  "returned_by" uuid,
  "returned_at" timestamp with time zone,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid
);

create table if not exists public."show_requirements" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "show_name" text,
  "room_id" text,
  "room_name" text,
  "product_name" text,
  "quantity_needed" integer default 1,
  "asset_id" uuid,
  "kit_id" uuid,
  "category" text,
  "sort_order" integer default 0,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "requested_quantity" integer default 1,
  "org_id" uuid,
  "daily_rate" numeric,
  "notes" text
);

create table if not exists public."shows" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "status" text default 'inquiry'::text,
  "client_id" uuid,
  "client_name" text,
  "venue_id" uuid,
  "venue_name" text,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "start_date" date,
  "end_date" date,
  "load_out_date" date,
  "return_date" date,
  "sub_locations" jsonb default '[]'::jsonb,
  "invoice_status" text default 'not_invoiced'::text,
  "total_value" numeric default 0,
  "internal_notes" text,
  "client_visible_notes" text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "delivery_address" text,
  "client_contact_id" uuid,
  "client_contact_name" text,
  "org_id" uuid,
  "fulfillment_status" text,
  "quote_confirmed" boolean default false,
  "quote_locked" boolean default false
);

create table if not exists public."stripe_accounts" (
  "id" uuid default gen_random_uuid() not null,
  "stripe_account_id" text,
  "account_name" text,
  "connected_by" uuid,
  "connected_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid
);

create table if not exists public."travel_logistics" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "show_name" text,
  "logistics_type" text,
  "description" text,
  "quantity" integer default 1,
  "assigned_person" text,
  "origin" text,
  "destination" text,
  "pickup_datetime" timestamp with time zone,
  "delivery_datetime" timestamp with time zone,
  "load_in_datetime" timestamp with time zone,
  "load_out_datetime" timestamp with time zone,
  "confirmation_number" text,
  "vendor" text,
  "unit_cost" numeric default 0,
  "unit_billable" numeric default 0,
  "cost" numeric default 0,
  "billable_amount" numeric default 0,
  "mileage" numeric,
  "mileage_rate" numeric,
  "billable_mileage_rate" numeric,
  "bank_record_id" uuid,
  "bank_record_name" text,
  "status" text default 'pending'::text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid
);

create table if not exists public."truck_packs" (
  "id" uuid default gen_random_uuid() not null,
  "show_id" uuid,
  "show_name" text,
  "name" text,
  "truck_type" text,
  "capacity" text,
  "items" jsonb default '[]'::jsonb,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid
);

create table if not exists public."user_dashboards" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid,
  "layout" jsonb default '[]'::jsonb,
  "widgets" jsonb default '[]'::jsonb,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "user_role" text,
  "org_id" uuid,
  "saved_at" timestamp with time zone default now()
);

create table if not exists public."users" (
  "id" uuid not null,
  "email" text,
  "full_name" text,
  "role" text default 'user'::text,
  "phone_number" text,
  "avatar_url" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "status" text default 'active'::text,
  "company" text,
  "notes" text,
  "org_id" uuid,
  "is_platform_admin" boolean default false,
  "onboarding_complete" boolean default false
);

create table if not exists public."venues" (
  "id" uuid default gen_random_uuid() not null,
  "name" text not null,
  "address" text,
  "city" text,
  "state" text,
  "zip" text,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "capacity" integer,
  "length" numeric,
  "dock_height" text,
  "freight_elevator" boolean default false,
  "house_engineer_required" boolean default false,
  "house_equipment_available" boolean default false,
  "exclusive_vendors" text,
  "load_in_dock_address" text,
  "load_in_hours" text,
  "load_in_rules" text,
  "power_available" text,
  "parking_notes" text,
  "map" text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone default now(),
  "rigging_points" text,
  "rigging_notes" text,
  "union_required" boolean default false,
  "union_notes" text,
  "wifi_available" boolean default false,
  "wifi_notes" text,
  "website" text,
  "preferred_setup_notes" text,
  "venue_type" text,
  "org_id" uuid,
  "latitude" numeric,
  "longitude" numeric,
  "distance_from_warehouse_miles" numeric,
  "drive_time_minutes" numeric,
  "country" text,
  "is_active" boolean default true,
  "internal_notes" text
);

create table if not exists public."workspace_email_settings" (
  "id" uuid default gen_random_uuid() not null,
  "from_name" text,
  "from_email" text,
  "reply_to" text,
  "smtp_host" text,
  "smtp_port" integer,
  "smtp_user" text,
  "smtp_password" text,
  "updated_at" timestamp with time zone default now(),
  "org_id" uuid
);

create table if not exists public."yearly_asset_reviews" (
  "id" uuid default gen_random_uuid() not null,
  "year" integer not null,
  "status" text default 'open'::text,
  "started_by" uuid,
  "started_at" timestamp with time zone,
  "closed_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "total_assets" integer default 0,
  "scanned_count" integer default 0,
  "missing_count" integer default 0,
  "org_id" uuid
);

alter table public."additional_equipment_requests" add constraint "additional_equipment_requests_pkey" PRIMARY KEY (id);
alter table public."admin_audit_log" add constraint "admin_audit_log_pkey" PRIMARY KEY (id);
alter table public."alerts" add constraint "alerts_pkey" PRIMARY KEY (id);
alter table public."asset_movements" add constraint "asset_movements_pkey" PRIMARY KEY (id);
alter table public."asset_review_items" add constraint "asset_review_items_pkey" PRIMARY KEY (id);
alter table public."assets" add constraint "assets_pkey" PRIMARY KEY (id);
alter table public."av_hospital" add constraint "av_hospital_pkey" PRIMARY KEY (id);
alter table public."brand_settings" add constraint "brand_settings_pkey" PRIMARY KEY (id);
alter table public."categories" add constraint "categories_pkey" PRIMARY KEY (id);
alter table public."client_contacts" add constraint "client_contacts_pkey" PRIMARY KEY (id);
alter table public."client_files" add constraint "client_files_pkey" PRIMARY KEY (id);
alter table public."client_notes" add constraint "client_notes_pkey" PRIMARY KEY (id);
alter table public."client_preferences" add constraint "client_preferences_pkey" PRIMARY KEY (id);
alter table public."clients" add constraint "clients_pkey" PRIMARY KEY (id);
alter table public."code_settings" add constraint "code_settings_pkey" PRIMARY KEY (id);
alter table public."company_memberships" add constraint "company_memberships_pkey" PRIMARY KEY (id);
alter table public."container_labels" add constraint "container_labels_pkey" PRIMARY KEY (id);
alter table public."containers" add constraint "containers_pkey" PRIMARY KEY (id);
alter table public."crew_booking_email_templates" add constraint "crew_booking_email_templates_pkey" PRIMARY KEY (id);
alter table public."crew_bookings" add constraint "crew_bookings_pkey" PRIMARY KEY (id);
alter table public."crew_members" add constraint "crew_members_pkey" PRIMARY KEY (id);
alter table public."crew_roles" add constraint "crew_roles_pkey" PRIMARY KEY (id);
alter table public."custom_fields" add constraint "custom_fields_pkey" PRIMARY KEY (id);
alter table public."document_settings" add constraint "document_settings_pkey" PRIMARY KEY (id);
alter table public."email_field_controls" add constraint "email_field_controls_pkey" PRIMARY KEY (id);
alter table public."email_templates" add constraint "email_templates_pkey" PRIMARY KEY (id);
alter table public."fulfillment_calibrations" add constraint "fulfillment_calibrations_pkey" PRIMARY KEY (id);
alter table public."import_templates" add constraint "import_templates_pkey" PRIMARY KEY (id);
alter table public."invoice_settings" add constraint "invoice_settings_pkey" PRIMARY KEY (id);
alter table public."invoices" add constraint "invoices_pkey" PRIMARY KEY (id);
alter table public."kits" add constraint "kits_pkey" PRIMARY KEY (id);
alter table public."labor_rates" add constraint "labor_rates_pkey" PRIMARY KEY (id);
alter table public."logistics_bank" add constraint "logistics_bank_pkey" PRIMARY KEY (id);
alter table public."organizations" add constraint "organizations_pkey" PRIMARY KEY (id);
alter table public."payments" add constraint "payments_pkey" PRIMARY KEY (id);
alter table public."pending_invites" add constraint "pending_invites_pkey" PRIMARY KEY (id);
alter table public."post_event_costs" add constraint "post_event_costs_pkey" PRIMARY KEY (id);
alter table public."print_templates" add constraint "print_templates_pkey" PRIMARY KEY (id);
alter table public."project_crew" add constraint "project_crew_pkey" PRIMARY KEY (id);
alter table public."quickbooks_connections" add constraint "quickbooks_connections_pkey" PRIMARY KEY (id);
alter table public."quotes" add constraint "quotes_pkey" PRIMARY KEY (id);
alter table public."roundtable_items" add constraint "roundtable_items_pkey" PRIMARY KEY (id);
alter table public."roundtable_partners" add constraint "roundtable_partners_pkey" PRIMARY KEY (id);
alter table public."roundtable_subrents" add constraint "roundtable_subrents_pkey" PRIMARY KEY (id);
alter table public."show_fulfillments" add constraint "show_fulfillments_pkey" PRIMARY KEY (id);
alter table public."show_requirements" add constraint "show_requirements_pkey" PRIMARY KEY (id);
alter table public."shows" add constraint "shows_pkey" PRIMARY KEY (id);
alter table public."stripe_accounts" add constraint "stripe_accounts_pkey" PRIMARY KEY (id);
alter table public."travel_logistics" add constraint "travel_logistics_pkey" PRIMARY KEY (id);
alter table public."truck_packs" add constraint "truck_packs_pkey" PRIMARY KEY (id);
alter table public."user_dashboards" add constraint "user_dashboards_pkey" PRIMARY KEY (id);
alter table public."users" add constraint "users_pkey" PRIMARY KEY (id);
alter table public."venues" add constraint "venues_pkey" PRIMARY KEY (id);
alter table public."workspace_email_settings" add constraint "workspace_email_settings_pkey" PRIMARY KEY (id);
alter table public."yearly_asset_reviews" add constraint "yearly_asset_reviews_pkey" PRIMARY KEY (id);
alter table public."assets" add constraint "assets_asset_number_key" UNIQUE (asset_number);
alter table public."assets" add constraint "assets_barcode_key" UNIQUE (barcode);
alter table public."company_memberships" add constraint "company_memberships_user_id_org_id_key" UNIQUE (user_id, org_id);
alter table public."invoices" add constraint "invoices_invoice_number_key" UNIQUE (invoice_number);
alter table public."kits" add constraint "kits_barcode_key" UNIQUE (barcode);
alter table public."organizations" add constraint "organizations_slug_key" UNIQUE (slug);
alter table public."pending_invites" add constraint "pending_invites_token_key" UNIQUE (token);
alter table public."quickbooks_connections" add constraint "quickbooks_connections_org_id_key" UNIQUE (org_id);
alter table public."quotes" add constraint "quotes_number_key" UNIQUE (number);
alter table public."stripe_accounts" add constraint "stripe_accounts_stripe_account_id_key" UNIQUE (stripe_account_id);
alter table public."users" add constraint "users_email_key" UNIQUE (email);
alter table public."additional_equipment_requests" add constraint "additional_equipment_requests_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id);
alter table public."additional_equipment_requests" add constraint "additional_equipment_requests_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."additional_equipment_requests" add constraint "additional_equipment_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES users(id);
alter table public."additional_equipment_requests" add constraint "additional_equipment_requests_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."admin_audit_log" add constraint "admin_audit_log_changed_by_id_fkey" FOREIGN KEY (changed_by_id) REFERENCES users(id) ON DELETE SET NULL;
alter table public."admin_audit_log" add constraint "admin_audit_log_target_org_id_fkey" FOREIGN KEY (target_org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."admin_audit_log" add constraint "admin_audit_log_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL;
alter table public."alerts" add constraint "alerts_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id);
alter table public."alerts" add constraint "alerts_created_for_fkey" FOREIGN KEY (created_for) REFERENCES users(id);
alter table public."alerts" add constraint "alerts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."alerts" add constraint "alerts_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id);
alter table public."asset_movements" add constraint "asset_movements_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;
alter table public."asset_movements" add constraint "asset_movements_moved_by_fkey" FOREIGN KEY (moved_by) REFERENCES users(id);
alter table public."asset_movements" add constraint "asset_movements_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."asset_movements" add constraint "asset_movements_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id);
alter table public."asset_review_items" add constraint "asset_review_items_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;
alter table public."asset_review_items" add constraint "asset_review_items_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."asset_review_items" add constraint "asset_review_items_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id);
alter table public."assets" add constraint "assets_current_show_id_fkey" FOREIGN KEY (current_show_id) REFERENCES shows(id);
alter table public."assets" add constraint "assets_locked_to_show_id_fkey" FOREIGN KEY (locked_to_show_id) REFERENCES shows(id);
alter table public."assets" add constraint "assets_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."av_hospital" add constraint "av_hospital_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id);
alter table public."av_hospital" add constraint "av_hospital_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."av_hospital" add constraint "av_hospital_repaired_by_fkey" FOREIGN KEY (repaired_by) REFERENCES users(id);
alter table public."av_hospital" add constraint "av_hospital_reported_by_fkey" FOREIGN KEY (reported_by) REFERENCES users(id);
alter table public."av_hospital" add constraint "av_hospital_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id);
alter table public."brand_settings" add constraint "brand_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."categories" add constraint "categories_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."client_contacts" add constraint "client_contacts_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public."client_contacts" add constraint "client_contacts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."client_files" add constraint "client_files_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public."client_files" add constraint "client_files_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."client_files" add constraint "client_files_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES users(id);
alter table public."client_notes" add constraint "client_notes_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public."client_notes" add constraint "client_notes_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
alter table public."client_notes" add constraint "client_notes_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."client_preferences" add constraint "client_preferences_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
alter table public."client_preferences" add constraint "client_preferences_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."clients" add constraint "clients_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."code_settings" add constraint "code_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."company_memberships" add constraint "company_memberships_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."company_memberships" add constraint "company_memberships_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."container_labels" add constraint "container_labels_container_id_fkey" FOREIGN KEY (container_id) REFERENCES containers(id) ON DELETE CASCADE;
alter table public."container_labels" add constraint "container_labels_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."container_labels" add constraint "container_labels_printed_by_fkey" FOREIGN KEY (printed_by) REFERENCES users(id);
alter table public."containers" add constraint "containers_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."crew_bookings" add constraint "crew_bookings_crew_id_fkey" FOREIGN KEY (crew_id) REFERENCES crew_members(id);
alter table public."crew_bookings" add constraint "crew_bookings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."crew_bookings" add constraint "crew_bookings_project_crew_id_fkey" FOREIGN KEY (project_crew_id) REFERENCES project_crew(id);
alter table public."crew_bookings" add constraint "crew_bookings_sent_by_fkey" FOREIGN KEY (sent_by) REFERENCES users(id);
alter table public."crew_bookings" add constraint "crew_bookings_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."crew_members" add constraint "crew_members_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."crew_members" add constraint "crew_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);
alter table public."crew_roles" add constraint "crew_roles_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."custom_fields" add constraint "custom_fields_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."document_settings" add constraint "document_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."email_field_controls" add constraint "email_field_controls_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."email_templates" add constraint "email_templates_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."fulfillment_calibrations" add constraint "fulfillment_calibrations_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."fulfillment_calibrations" add constraint "fulfillment_calibrations_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."import_templates" add constraint "import_templates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(id);
alter table public."import_templates" add constraint "import_templates_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."invoice_settings" add constraint "invoice_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."invoices" add constraint "invoices_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id);
alter table public."invoices" add constraint "invoices_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."invoices" add constraint "invoices_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id);
alter table public."kits" add constraint "kits_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."labor_rates" add constraint "labor_rates_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."logistics_bank" add constraint "logistics_bank_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."logistics_bank" add constraint "logistics_bank_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."organizations" add constraint "organizations_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES users(id);
alter table public."payments" add constraint "payments_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id);
alter table public."payments" add constraint "payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
alter table public."payments" add constraint "payments_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."payments" add constraint "payments_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id);
alter table public."pending_invites" add constraint "pending_invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id);
alter table public."pending_invites" add constraint "pending_invites_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."post_event_costs" add constraint "post_event_costs_added_by_fkey" FOREIGN KEY (added_by) REFERENCES users(id);
alter table public."post_event_costs" add constraint "post_event_costs_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."post_event_costs" add constraint "post_event_costs_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."print_templates" add constraint "print_templates_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."project_crew" add constraint "project_crew_crew_member_id_fkey" FOREIGN KEY (crew_member_id) REFERENCES crew_members(id);
alter table public."project_crew" add constraint "project_crew_labor_rate_id_fkey" FOREIGN KEY (labor_rate_id) REFERENCES labor_rates(id);
alter table public."project_crew" add constraint "project_crew_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."project_crew" add constraint "project_crew_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."quickbooks_connections" add constraint "quickbooks_connections_connected_by_fkey" FOREIGN KEY (connected_by) REFERENCES users(id);
alter table public."quickbooks_connections" add constraint "quickbooks_connections_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."quotes" add constraint "quotes_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id);
alter table public."quotes" add constraint "quotes_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."quotes" add constraint "quotes_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id);
alter table public."roundtable_items" add constraint "roundtable_items_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES users(id);
alter table public."roundtable_items" add constraint "roundtable_items_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."roundtable_items" add constraint "roundtable_items_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."roundtable_partners" add constraint "roundtable_partners_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."roundtable_subrents" add constraint "roundtable_subrents_added_by_fkey" FOREIGN KEY (added_by) REFERENCES users(id);
alter table public."roundtable_subrents" add constraint "roundtable_subrents_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."roundtable_subrents" add constraint "roundtable_subrents_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."show_fulfillments" add constraint "show_fulfillments_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id);
alter table public."show_fulfillments" add constraint "show_fulfillments_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."show_fulfillments" add constraint "show_fulfillments_packed_by_fkey" FOREIGN KEY (packed_by) REFERENCES users(id);
alter table public."show_fulfillments" add constraint "show_fulfillments_requirement_id_fkey" FOREIGN KEY (requirement_id) REFERENCES show_requirements(id);
alter table public."show_fulfillments" add constraint "show_fulfillments_returned_by_fkey" FOREIGN KEY (returned_by) REFERENCES users(id);
alter table public."show_fulfillments" add constraint "show_fulfillments_scanned_by_fkey" FOREIGN KEY (scanned_by) REFERENCES users(id);
alter table public."show_fulfillments" add constraint "show_fulfillments_sent_by_fkey" FOREIGN KEY (sent_by) REFERENCES users(id);
alter table public."show_fulfillments" add constraint "show_fulfillments_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."show_requirements" add constraint "show_requirements_asset_id_fkey" FOREIGN KEY (asset_id) REFERENCES assets(id);
alter table public."show_requirements" add constraint "show_requirements_kit_id_fkey" FOREIGN KEY (kit_id) REFERENCES kits(id);
alter table public."show_requirements" add constraint "show_requirements_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."show_requirements" add constraint "show_requirements_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."shows" add constraint "shows_client_id_fkey" FOREIGN KEY (client_id) REFERENCES clients(id);
alter table public."shows" add constraint "shows_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."shows" add constraint "shows_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES venues(id);
alter table public."stripe_accounts" add constraint "stripe_accounts_connected_by_fkey" FOREIGN KEY (connected_by) REFERENCES users(id);
alter table public."stripe_accounts" add constraint "stripe_accounts_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."travel_logistics" add constraint "travel_logistics_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."travel_logistics" add constraint "travel_logistics_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."truck_packs" add constraint "truck_packs_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."truck_packs" add constraint "truck_packs_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
alter table public."user_dashboards" add constraint "user_dashboards_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."user_dashboards" add constraint "user_dashboards_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
alter table public."users" add constraint "users_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."users" add constraint "users_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."venues" add constraint "venues_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."workspace_email_settings" add constraint "workspace_email_settings_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."yearly_asset_reviews" add constraint "yearly_asset_reviews_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table public."yearly_asset_reviews" add constraint "yearly_asset_reviews_started_by_fkey" FOREIGN KEY (started_by) REFERENCES users(id);

CREATE INDEX IF NOT EXISTS admin_audit_log_date_idx ON public.admin_audit_log USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_org_idx ON public.admin_audit_log USING btree (target_org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_invites_invite_type ON public.pending_invites USING btree (invite_type);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(is_platform_admin, false) FROM public.users WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.my_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.set_trial_ends_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.setup_org_rls(tbl text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Drop the old blanket policy if it exists
  EXECUTE format('DROP POLICY IF EXISTS authenticated_full_access ON public.%I', tbl);
  EXECUTE format('DROP POLICY IF EXISTS org_isolation ON public.%I', tbl);

  -- New policy: platform admins see all, regular users see only their org
  EXECUTE format($pol$
    CREATE POLICY org_isolation ON public.%I
    FOR ALL TO authenticated
    USING (
      public.is_platform_admin()
      OR org_id = public.my_org_id()
      OR org_id IS NULL
    )
    WITH CHECK (
      public.is_platform_admin()
      OR org_id = public.my_org_id()
    )
  $pol$, tbl);
END;
$function$;

CREATE OR REPLACE FUNCTION public.stamp_org_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := public.my_org_id();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.additional_equipment_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.additional_equipment_requests FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.alerts FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.asset_movements FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.asset_review_items FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.assets FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.av_hospital FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.brand_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.brand_settings FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.categories FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.client_files FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.client_notes FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.client_preferences FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.code_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.code_settings FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.container_labels FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.containers FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crew_bookings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.crew_bookings FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.crew_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.crew_members FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.crew_roles FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.custom_fields FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.document_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.document_settings FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.email_field_controls FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.email_templates FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.fulfillment_calibrations FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.import_templates FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoice_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.invoice_settings FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.kits FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.kits FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.labor_rates FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.logistics_bank FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER organizations_set_trial_ends_at BEFORE INSERT OR UPDATE OF plan ON public.organizations FOR EACH ROW EXECUTE FUNCTION set_trial_ends_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.post_event_costs FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.print_templates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.print_templates FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.project_crew FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.project_crew FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.quickbooks_connections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.quickbooks_connections FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.roundtable_items FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.roundtable_partners FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.roundtable_subrents FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.show_fulfillments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.show_fulfillments FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.show_requirements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.show_requirements FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shows FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.shows FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.stripe_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.stripe_accounts FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.travel_logistics FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.travel_logistics FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.truck_packs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.truck_packs FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_dashboards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.user_dashboards FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.venues FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.workspace_email_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.workspace_email_settings FOR EACH ROW EXECUTE FUNCTION stamp_org_id();
CREATE TRIGGER stamp_org_id BEFORE INSERT ON public.yearly_asset_reviews FOR EACH ROW EXECUTE FUNCTION stamp_org_id();

alter table public."additional_equipment_requests" enable row level security;
alter table public."admin_audit_log" enable row level security;
alter table public."alerts" enable row level security;
alter table public."asset_movements" enable row level security;
alter table public."asset_review_items" enable row level security;
alter table public."assets" enable row level security;
alter table public."av_hospital" enable row level security;
alter table public."brand_settings" enable row level security;
alter table public."categories" enable row level security;
alter table public."client_contacts" enable row level security;
alter table public."client_files" enable row level security;
alter table public."client_notes" enable row level security;
alter table public."client_preferences" enable row level security;
alter table public."clients" enable row level security;
alter table public."code_settings" enable row level security;
alter table public."company_memberships" enable row level security;
alter table public."container_labels" enable row level security;
alter table public."containers" enable row level security;
alter table public."crew_booking_email_templates" enable row level security;
alter table public."crew_bookings" enable row level security;
alter table public."crew_members" enable row level security;
alter table public."crew_roles" enable row level security;
alter table public."custom_fields" enable row level security;
alter table public."document_settings" enable row level security;
alter table public."email_field_controls" enable row level security;
alter table public."email_templates" enable row level security;
alter table public."fulfillment_calibrations" enable row level security;
alter table public."import_templates" enable row level security;
alter table public."invoice_settings" enable row level security;
alter table public."invoices" enable row level security;
alter table public."kits" enable row level security;
alter table public."labor_rates" enable row level security;
alter table public."logistics_bank" enable row level security;
alter table public."payments" enable row level security;
alter table public."pending_invites" enable row level security;
alter table public."post_event_costs" enable row level security;
alter table public."print_templates" enable row level security;
alter table public."project_crew" enable row level security;
alter table public."quickbooks_connections" enable row level security;
alter table public."quotes" enable row level security;
alter table public."roundtable_items" enable row level security;
alter table public."roundtable_partners" enable row level security;
alter table public."roundtable_subrents" enable row level security;
alter table public."show_fulfillments" enable row level security;
alter table public."show_requirements" enable row level security;
alter table public."shows" enable row level security;
alter table public."stripe_accounts" enable row level security;
alter table public."travel_logistics" enable row level security;
alter table public."truck_packs" enable row level security;
alter table public."user_dashboards" enable row level security;
alter table public."users" enable row level security;
alter table public."venues" enable row level security;
alter table public."workspace_email_settings" enable row level security;
alter table public."yearly_asset_reviews" enable row level security;

create policy "org_isolation" on public."additional_equipment_requests" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "platform_admins_can_insert_audit_log" on public."admin_audit_log" as permissive for insert to public
  with check ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_platform_admin = true)))));
create policy "platform_admins_can_read_audit_log" on public."admin_audit_log" as permissive for select to public
  using ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.is_platform_admin = true)))));
create policy "org_isolation" on public."alerts" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."asset_movements" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."asset_review_items" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."assets" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."av_hospital" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."brand_settings" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."categories" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."client_contacts" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."client_files" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."client_notes" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."client_preferences" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."clients" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."code_settings" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "memberships_admin_write" on public."company_memberships" as permissive for all to authenticated
  using (is_platform_admin())
  with check (is_platform_admin());
create policy "memberships_select" on public."company_memberships" as permissive for select to authenticated
  using (((user_id = auth.uid()) OR is_platform_admin()));
create policy "org_isolation" on public."container_labels" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."containers" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "authenticated_full_access" on public."crew_booking_email_templates" as permissive for all to authenticated
  using (true)
  with check (true);
create policy "org_isolation" on public."crew_bookings" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."crew_members" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."crew_roles" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."custom_fields" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."document_settings" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."email_field_controls" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."email_templates" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."fulfillment_calibrations" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."import_templates" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."invoice_settings" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."invoices" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."kits" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."labor_rates" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."logistics_bank" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_self_access" on public."organizations" as permissive for all to authenticated
  using ((is_platform_admin() OR (id = my_org_id()) OR (EXISTS ( SELECT 1
   FROM company_memberships
  WHERE ((company_memberships.user_id = auth.uid()) AND (company_memberships.org_id = organizations.id) AND (company_memberships.status = 'active'::text))))))
  with check ((is_platform_admin() OR (id = my_org_id())));
create policy "org_isolation" on public."payments" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "company_admin_manage_invites" on public."pending_invites" as permissive for all to authenticated
  using ((is_platform_admin() OR (EXISTS ( SELECT 1
   FROM company_memberships cm
  WHERE ((cm.org_id = pending_invites.org_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'admin'::text) AND (cm.status = 'active'::text))))))
  with check ((is_platform_admin() OR (EXISTS ( SELECT 1
   FROM company_memberships cm
  WHERE ((cm.org_id = pending_invites.org_id) AND (cm.user_id = auth.uid()) AND (cm.role = 'admin'::text) AND (cm.status = 'active'::text))))));
create policy "platform_admin_full" on public."pending_invites" as permissive for all to public
  using (is_platform_admin())
  with check (is_platform_admin());
create policy "public_read_by_token" on public."pending_invites" as permissive for select to public
  using (true);
create policy "org_isolation" on public."post_event_costs" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."print_templates" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."project_crew" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."quickbooks_connections" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."quotes" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."roundtable_items" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."roundtable_partners" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."roundtable_subrents" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."show_fulfillments" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."show_requirements" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."shows" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."stripe_accounts" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."travel_logistics" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."truck_packs" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "users_own_dashboard" on public."user_dashboards" as permissive for all to authenticated
  using ((user_id = auth.uid()))
  with check ((user_id = auth.uid()));
create policy "users_can_insert_own_row" on public."users" as permissive for insert to authenticated
  with check ((id = auth.uid()));
create policy "users_can_update_own_row" on public."users" as permissive for update to authenticated
  using ((id = auth.uid()))
  with check ((id = auth.uid()));
create policy "users_org_access" on public."users" as permissive for all to authenticated
  using ((is_platform_admin() OR (id = auth.uid()) OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (id = auth.uid())));
create policy "org_isolation" on public."venues" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."workspace_email_settings" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
create policy "org_isolation" on public."yearly_asset_reviews" as permissive for all to authenticated
  using ((is_platform_admin() OR (org_id = my_org_id())))
  with check ((is_platform_admin() OR (org_id = my_org_id())));
