-- Development-only policy.
-- Replace after authentication and role-based RLS are implemented.
-- Do not use in production.

alter table public.products enable row level security;

drop policy if exists "Temporary admin can insert products" on public.products;

create policy "Temporary admin can insert products"
on public.products
for insert
to anon
with check (true);
