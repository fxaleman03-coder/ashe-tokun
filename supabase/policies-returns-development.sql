-- Development-only returns, exchanges, and refund foundation policies.
-- Replace with authenticated staff and role-based RLS before production.
-- Returns affect customer, payment, and inventory records.
-- Do not use unrestricted anon returns access in production.
-- Do not execute automatically from the application.

alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.gift_cards enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Anon can read returns for management" on public.returns;

create policy "Anon can read returns for management"
on public.returns
for select
to anon
using (true);

drop policy if exists "Anon can insert returns for management" on public.returns;

create policy "Anon can insert returns for management"
on public.returns
for insert
to anon
with check (true);

drop policy if exists "Anon can update returns for management" on public.returns;

create policy "Anon can update returns for management"
on public.returns
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can read return items for management" on public.return_items;

create policy "Anon can read return items for management"
on public.return_items
for select
to anon
using (true);

drop policy if exists "Anon can insert return items for management" on public.return_items;

create policy "Anon can insert return items for management"
on public.return_items
for insert
to anon
with check (true);

drop policy if exists "Anon can update return items for management" on public.return_items;

create policy "Anon can update return items for management"
on public.return_items
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can read gift cards for return credits" on public.gift_cards;

create policy "Anon can read gift cards for return credits"
on public.gift_cards
for select
to anon
using (true);

drop policy if exists "Anon can insert gift cards for return credits" on public.gift_cards;

create policy "Anon can insert gift cards for return credits"
on public.gift_cards
for insert
to anon
with check (true);

drop policy if exists "Anon can read return audit logs" on public.audit_logs;

create policy "Anon can read return audit logs"
on public.audit_logs
for select
to anon
using (entity_type = 'return');

drop policy if exists "Anon can insert return audit logs" on public.audit_logs;

create policy "Anon can insert return audit logs"
on public.audit_logs
for insert
to anon
with check (entity_type = 'return');

-- Required companion development policies:
-- - supabase/policies-pos-development.sql for orders, order_items, payments, and receipts.
-- - supabase/policies-inventory-development.sql for inventory items and ledger rows.
