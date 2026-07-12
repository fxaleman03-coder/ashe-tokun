-- Development-only shipping origin policies.
-- Shipping origin addresses are sensitive operational information.
-- Replace with authenticated staff and role-based RLS before production.
-- Do not use unrestricted anon origin access in production.
-- Do not execute automatically from the application.

alter table public.shipping_origins enable row level security;

drop policy if exists "Anon can read shipping origins" on public.shipping_origins;

create policy "Anon can read shipping origins"
on public.shipping_origins
for select
to anon
using (true);

drop policy if exists "Anon can insert shipping origins" on public.shipping_origins;

create policy "Anon can insert shipping origins"
on public.shipping_origins
for insert
to anon
with check (true);

drop policy if exists "Anon can update shipping origins" on public.shipping_origins;

create policy "Anon can update shipping origins"
on public.shipping_origins
for update
to anon
using (true)
with check (true);

-- No delete policy is provided. Origins should be deactivated, not removed.
