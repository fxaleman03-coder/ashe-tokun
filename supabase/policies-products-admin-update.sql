-- Development-only update policy until real auth/roles are implemented.
-- Remove or replace this policy before production.

alter table public.products enable row level security;

drop policy if exists "Temporary admin can update products" on public.products;

create policy "Temporary admin can update products"
on public.products
for update
to anon
using (true)
with check (true);
