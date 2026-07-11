-- Development-only inventory policies.
-- Replace after authentication and staff roles are implemented.
-- Do not use unrestricted anon reads or writes in production.
-- Do not execute automatically from the application.

alter table public.inventory_locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;

drop policy if exists "Anon can read inventory locations" on public.inventory_locations;

create policy "Anon can read inventory locations"
on public.inventory_locations
for select
to anon
using (true);

drop policy if exists "Anon can read inventory items" on public.inventory_items;

create policy "Anon can read inventory items"
on public.inventory_items
for select
to anon
using (true);

drop policy if exists "Anon can insert inventory items" on public.inventory_items;

create policy "Anon can insert inventory items"
on public.inventory_items
for insert
to anon
with check (true);

drop policy if exists "Anon can update inventory items" on public.inventory_items;

create policy "Anon can update inventory items"
on public.inventory_items
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can read inventory transactions" on public.inventory_transactions;

create policy "Anon can read inventory transactions"
on public.inventory_transactions
for select
to anon
using (true);

drop policy if exists "Anon can insert inventory transactions" on public.inventory_transactions;

create policy "Anon can insert inventory transactions"
on public.inventory_transactions
for insert
to anon
with check (true);
