-- Public storefront read policy.
-- Allows anonymous reads only for active products available online.
-- Does not grant insert, update, or delete permissions.
-- Do not execute automatically from the application.

alter table public.products enable row level security;

drop policy if exists "Public can read active products" on public.products;

create policy "Public can read active products"
on public.products
for select
to anon
using (
  active = true
  and status = 'active'
  and available_online = true
);
