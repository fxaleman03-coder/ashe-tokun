-- Development-only shipping and fulfillment policies.
-- Shipping addresses are sensitive customer information.
-- Replace with authenticated staff and role-based RLS before production.
-- Do not use unrestricted anon shipping access in production.
-- Do not execute automatically from the application.

alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;
alter table public.shipment_packages enable row level security;
alter table public.shipment_addresses enable row level security;
alter table public.shipment_events enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Anon can read shipments for management" on public.shipments;

create policy "Anon can read shipments for management"
on public.shipments
for select
to anon
using (true);

drop policy if exists "Anon can insert shipments for management" on public.shipments;

create policy "Anon can insert shipments for management"
on public.shipments
for insert
to anon
with check (true);

drop policy if exists "Anon can update shipments for management" on public.shipments;

create policy "Anon can update shipments for management"
on public.shipments
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can read shipment items" on public.shipment_items;

create policy "Anon can read shipment items"
on public.shipment_items
for select
to anon
using (true);

drop policy if exists "Anon can insert shipment items" on public.shipment_items;

create policy "Anon can insert shipment items"
on public.shipment_items
for insert
to anon
with check (true);

drop policy if exists "Anon can update shipment items" on public.shipment_items;

create policy "Anon can update shipment items"
on public.shipment_items
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can delete shipment items before shipped" on public.shipment_items;

create policy "Anon can delete shipment items before shipped"
on public.shipment_items
for delete
to anon
using (
  exists (
    select 1
    from public.shipments
    where shipments.id = shipment_items.shipment_id
      and shipments.shipment_status in ('pending', 'ready', 'packed', 'cancelled')
  )
);

drop policy if exists "Anon can read shipment packages" on public.shipment_packages;

create policy "Anon can read shipment packages"
on public.shipment_packages
for select
to anon
using (true);

drop policy if exists "Anon can insert shipment packages" on public.shipment_packages;

create policy "Anon can insert shipment packages"
on public.shipment_packages
for insert
to anon
with check (true);

drop policy if exists "Anon can update shipment packages" on public.shipment_packages;

create policy "Anon can update shipment packages"
on public.shipment_packages
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can delete shipment packages" on public.shipment_packages;

create policy "Anon can delete shipment packages"
on public.shipment_packages
for delete
to anon
using (true);

drop policy if exists "Anon can read shipment addresses" on public.shipment_addresses;

create policy "Anon can read shipment addresses"
on public.shipment_addresses
for select
to anon
using (true);

drop policy if exists "Anon can insert shipment addresses" on public.shipment_addresses;

create policy "Anon can insert shipment addresses"
on public.shipment_addresses
for insert
to anon
with check (true);

drop policy if exists "Anon can update shipment addresses" on public.shipment_addresses;

create policy "Anon can update shipment addresses"
on public.shipment_addresses
for update
to anon
using (true)
with check (true);

drop policy if exists "Anon can read shipment events" on public.shipment_events;

create policy "Anon can read shipment events"
on public.shipment_events
for select
to anon
using (true);

drop policy if exists "Anon can insert shipment events" on public.shipment_events;

create policy "Anon can insert shipment events"
on public.shipment_events
for insert
to anon
with check (true);

drop policy if exists "Anon can read shipment audit logs" on public.audit_logs;

create policy "Anon can read shipment audit logs"
on public.audit_logs
for select
to anon
using (entity_type = 'shipment');

drop policy if exists "Anon can insert shipment audit logs" on public.audit_logs;

create policy "Anon can insert shipment audit logs"
on public.audit_logs
for insert
to anon
with check (entity_type = 'shipment');

-- Existing development order policies should provide orders select/update and
-- order_items select access for fulfillment views.
