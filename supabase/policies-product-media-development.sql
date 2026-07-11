-- Development-only product_media policies.
-- Replace after authentication and role-based policies are implemented.
-- Do not use unrestricted anon writes in production.
-- Do not execute automatically from the application.
--
-- The existing unique partial index product_media_one_primary_per_product_idx
-- enforces one primary image per product where is_primary = true.

alter table public.product_media enable row level security;

drop policy if exists "Public can read product media" on public.product_media;

create policy "Public can read product media"
on public.product_media
for select
to anon
using (true);

drop policy if exists "Anon can insert product media" on public.product_media;

create policy "Anon can insert product media"
on public.product_media
for insert
to anon
with check (true);

drop policy if exists "Anon can update product media" on public.product_media;

create policy "Anon can update product media"
on public.product_media
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can delete product media" on public.product_media;

create policy "Anon can delete product media"
on public.product_media
for delete
to anon
using (true);
