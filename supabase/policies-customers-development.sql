-- Development-only customer management policies.
-- Replace with authenticated staff and role-based RLS before production.
-- Customer data is sensitive personal information.
-- Do not use unrestricted anon customer access in production.
-- Do not execute automatically from the application.

alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Anon can read customers for management" on public.customers;

create policy "Anon can read customers for management"
on public.customers
for select
to anon
using (true);

drop policy if exists "Anon can insert customers for management" on public.customers;

create policy "Anon can insert customers for management"
on public.customers
for insert
to anon
with check (true);

drop policy if exists "Anon can update customers for management" on public.customers;

create policy "Anon can update customers for management"
on public.customers
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can read customer addresses for management" on public.customer_addresses;

create policy "Anon can read customer addresses for management"
on public.customer_addresses
for select
to anon
using (true);

drop policy if exists "Anon can insert customer addresses for management" on public.customer_addresses;

create policy "Anon can insert customer addresses for management"
on public.customer_addresses
for insert
to anon
with check (true);

drop policy if exists "Anon can update customer addresses for management" on public.customer_addresses;

create policy "Anon can update customer addresses for management"
on public.customer_addresses
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can delete customer addresses for management" on public.customer_addresses;

create policy "Anon can delete customer addresses for management"
on public.customer_addresses
for delete
to anon
using (true);

drop policy if exists "Anon can read customer audit logs" on public.audit_logs;

create policy "Anon can read customer audit logs"
on public.audit_logs
for select
to anon
using (entity_type = 'customer');

drop policy if exists "Anon can insert customer audit logs" on public.audit_logs;

create policy "Anon can insert customer audit logs"
on public.audit_logs
for insert
to anon
with check (entity_type = 'customer');
