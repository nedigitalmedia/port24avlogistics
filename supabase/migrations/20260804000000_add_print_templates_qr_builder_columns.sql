-- QR Label Builder (QRLabelBuilder.jsx) saves a template shape that never had
-- matching columns — every save has been failing with PGRST204 ("Could not
-- find the 'block_config' column"). Additive/nullable, matches what the
-- printing pipeline (printQRLabel.js, QRLabelPrinter.jsx) already reads.

alter table public.print_templates
  add column if not exists block_config jsonb default '[]'::jsonb,
  add column if not exists body_html text,
  add column if not exists qr_data_config jsonb,
  add column if not exists label_width_mm numeric,
  add column if not exists label_height_mm numeric,
  add column if not exists label_size_id text;
