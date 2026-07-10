-- Temporary product migration write policy.
-- Development migration only.
-- Remove or replace before production.
-- Do not use this policy in production.

alter table public.products enable row level security;

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products
for select
to anon
using (active = true);

drop policy if exists "Temporary product migration insert" on public.products;
create policy "Temporary product migration insert"
on public.products
for insert
to anon
with check (true);

drop policy if exists "Temporary product migration update" on public.products;
create policy "Temporary product migration update"
on public.products
for update
to anon
using (true)
with check (true);
