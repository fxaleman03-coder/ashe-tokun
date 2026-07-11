-- Development-only Supabase Storage policies for product-media.
-- Replace after authentication and staff roles are implemented.
-- Do not use unrestricted anon writes in production.
-- Do not execute automatically from the application.
--
-- Required bucket configuration before testing:
-- Bucket name: product-media
-- Public bucket: true
-- Maximum file size: 20 MB
-- Allowed MIME types: image/png, image/jpeg, image/webp

drop policy if exists "Public can read product media" on storage.objects;

create policy "Public can read product media"
on storage.objects
for select
to anon
using (bucket_id = 'product-media');

drop policy if exists "Anon can upload product media" on storage.objects;
drop policy if exists "Temporary admin can upload product media" on storage.objects;

create policy "Anon can upload product media"
on storage.objects
for insert
to anon
with check (bucket_id = 'product-media');

drop policy if exists "Anon can update product media" on storage.objects;
drop policy if exists "Temporary admin can update product media" on storage.objects;

create policy "Anon can update product media"
on storage.objects
for update
to anon
using (bucket_id = 'product-media')
with check (bucket_id = 'product-media');

drop policy if exists "Anon can delete product media" on storage.objects;
drop policy if exists "Temporary admin can delete product media" on storage.objects;

create policy "Anon can delete product media"
on storage.objects
for delete
to anon
using (bucket_id = 'product-media');
