-- EmailBrandingSettings.jsx's full email header/footer customization form
-- (backgrounds, social links, show/hide toggles, company_address) has never
-- had matching columns — same lost-migration pattern as everything else
-- found today. Discovered because company_address is also the origin point
-- for the new venue transport-distance feature.

alter table public.brand_settings
  add column if not exists company_address text,

  add column if not exists email_footer_logo_url text,
  add column if not exists email_footer_background_type text default 'solid',
  add column if not exists email_footer_background_color text,
  add column if not exists email_footer_background_gradient text,
  add column if not exists email_footer_text_color text,
  add column if not exists email_footer_custom_text text,
  add column if not exists email_footer_disclaimer text,
  add column if not exists email_footer_show_logo boolean default true,
  add column if not exists email_footer_show_company_name boolean default true,
  add column if not exists email_footer_show_phone boolean default true,
  add column if not exists email_footer_show_email boolean default true,
  add column if not exists email_footer_show_address boolean default true,
  add column if not exists email_footer_show_website boolean default true,
  add column if not exists email_footer_show_social boolean default true,
  add column if not exists email_footer_social_facebook text,
  add column if not exists email_footer_social_instagram text,
  add column if not exists email_footer_social_linkedin text,

  add column if not exists email_header_logo_url text,
  add column if not exists email_header_background_type text default 'solid',
  add column if not exists email_header_background_color text,
  add column if not exists email_header_background_gradient text,
  add column if not exists email_header_background_url text,
  add column if not exists email_header_text_color text,
  add column if not exists email_header_show_logo boolean default true,
  add column if not exists email_header_show_social boolean default true,
  add column if not exists email_header_social_facebook text,
  add column if not exists email_header_social_instagram text,
  add column if not exists email_header_social_linkedin text;
