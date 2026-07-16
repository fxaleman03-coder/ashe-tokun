-- Launch Readiness Phase E: Supabase Storage production hardening draft.
-- Do not execute automatically from the application.
-- Review in Supabase SQL Editor before running.
--
-- Product images remain publicly readable for storefront display, but browser
-- anonymous uploads/updates/deletes are removed. Production media writes should
-- go through authenticated staff Server Actions or a constrained RPC boundary.

update storage.buckets
set
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'image/png',
    'image/jpeg',
    'image/webp'
  ],
  updated_at = now()
where id = 'product-media';

drop policy if exists "Public can read product media" on storage.objects;
drop policy if exists "Anon can upload product media" on storage.objects;
drop policy if exists "Temporary admin can upload product media" on storage.objects;
drop policy if exists "Anon can update product media" on storage.objects;
drop policy if exists "Temporary admin can update product media" on storage.objects;
drop policy if exists "Anon can delete product media" on storage.objects;
drop policy if exists "Temporary admin can delete product media" on storage.objects;

create policy "Public can read product media"
on storage.objects
for select
to anon
using (bucket_id = 'product-media');

-- No anon insert/update/delete policies are recreated here.
-- Service-role server code can continue to manage objects while bypassing RLS.
