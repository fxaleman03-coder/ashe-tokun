-- Development-only POS commerce policies.
-- Replace after authentication and staff roles are implemented.
-- Do not use unrestricted anon commerce writes in production.
-- Do not execute automatically from the application.

alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;

drop policy if exists "Anon can read customers for POS" on public.customers;

create policy "Anon can read customers for POS"
on public.customers
for select
to anon
using (true);

drop policy if exists "Anon can read POS orders" on public.orders;

create policy "Anon can read POS orders"
on public.orders
for select
to anon
using (true);

drop policy if exists "Anon can insert POS orders" on public.orders;

create policy "Anon can insert POS orders"
on public.orders
for insert
to anon
with check (true);

drop policy if exists "Anon can read POS order items" on public.order_items;

create policy "Anon can read POS order items"
on public.order_items
for select
to anon
using (true);

drop policy if exists "Anon can insert POS order items" on public.order_items;

create policy "Anon can insert POS order items"
on public.order_items
for insert
to anon
with check (true);

drop policy if exists "Anon can read POS payments" on public.payments;

create policy "Anon can read POS payments"
on public.payments
for select
to anon
using (true);

drop policy if exists "Anon can insert POS payments" on public.payments;

create policy "Anon can insert POS payments"
on public.payments
for insert
to anon
with check (true);

drop policy if exists "Anon can read POS receipts" on public.receipts;

create policy "Anon can read POS receipts"
on public.receipts
for select
to anon
using (true);

drop policy if exists "Anon can insert POS receipts" on public.receipts;

create policy "Anon can insert POS receipts"
on public.receipts
for insert
to anon
with check (true);
