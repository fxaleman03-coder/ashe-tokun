-- Development-only order management policies.
-- Replace with authenticated staff and role-based RLS before production.
-- Do not use unrestricted anon order management in production.
-- Do not execute automatically from the application.

alter table public.orders enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Anon can read orders for management" on public.orders;

create policy "Anon can read orders for management"
on public.orders
for select
to anon
using (true);

drop policy if exists "Anon can update orders for management" on public.orders;

create policy "Anon can update orders for management"
on public.orders
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can read order audit logs" on public.audit_logs;

create policy "Anon can read order audit logs"
on public.audit_logs
for select
to anon
using (entity_type = 'order');

drop policy if exists "Anon can insert order audit logs" on public.audit_logs;

create policy "Anon can insert order audit logs"
on public.audit_logs
for insert
to anon
with check (entity_type = 'order');

-- Inventory policies from supabase/policies-inventory-development.sql should
-- already allow inventory_items select/update and inventory_transactions
-- select/insert for development cancellation restoration testing.
