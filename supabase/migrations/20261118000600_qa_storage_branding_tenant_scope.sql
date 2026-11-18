-- Storage: the `branding` bucket (company logos / backgrounds, printed on customer documents)
--
-- Before: INSERT and UPDATE policies applied to role PUBLIC with only "bucket_id = 'branding'", so
--   * a signed-out visitor could upload to / overwrite any logo, and
--   * any signed-in user could overwrite ANOTHER company's logo.
-- After:  writes need a signed-in user and the file must live under <kind>/<their company id>/…  (the app already stores
--         logos/<orgId>/<timestamp>.png and backgrounds/<orgId>/…). Platform admins may write anywhere. Public READ is unchanged
--         (logos are shown on quotes, invoices and the sign-in screen).
--
-- ROLLBACK: drop policy branding_org_insert / branding_org_update on storage.objects, then re-create the three old policies
--           (INSERT/UPDATE for public with  bucket_id = 'branding').  Not recommended: it re-opens anonymous uploads.

drop policy if exists "auth upload 1ym05q3_0" on storage.objects;
drop policy if exists "auth update 1ym05q3_0" on storage.objects;
drop policy if exists "auth update 1ym05q3_1" on storage.objects;   -- a redundant public SELECT with a misleading name; "public read 1ym05q3_0" remains
drop policy if exists branding_org_insert on storage.objects;
drop policy if exists branding_org_update on storage.objects;
drop policy if exists branding_org_delete on storage.objects;

create policy branding_org_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and (public.is_platform_admin() or (storage.foldername(name))[2] = public.my_org_id()::text));

create policy branding_org_update on storage.objects for update to authenticated
  using      (bucket_id = 'branding' and (public.is_platform_admin() or (storage.foldername(name))[2] = public.my_org_id()::text))
  with check (bucket_id = 'branding' and (public.is_platform_admin() or (storage.foldername(name))[2] = public.my_org_id()::text));

create policy branding_org_delete on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and (public.is_platform_admin() or (storage.foldername(name))[2] = public.my_org_id()::text));
