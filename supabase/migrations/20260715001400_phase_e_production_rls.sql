-- Launch Readiness Phase E: Production RLS hardening draft.
-- Do not execute automatically from the application.
-- Review in Supabase SQL Editor before running.
--
-- This migration removes development anon management policies and leaves
-- sensitive admin/staff operations service-role only until ASHE TOKUN adopts
-- Supabase Auth claims or security-definer RPCs for staff authorization.
--
-- IMPORTANT: Applying this before moving the remaining browser-side
-- operational mutations behind Server Actions will intentionally block those
-- browser anon writes.

-- Public storefront/reference tables.
alter table public.products enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.collections enable row level security;
alter table public.product_types enable row level security;
alter table public.traditions enable row level security;
alter table public.media_assets enable row level security;
alter table public.product_media enable row level security;

drop policy if exists "Public can read active products" on public.products;
drop policy if exists "Temporary admin can insert products" on public.products;
drop policy if exists "Temporary admin can update products" on public.products;
drop policy if exists "Temporary product migration insert" on public.products;
drop policy if exists "Temporary product migration update" on public.products;

create policy "Public can read active products"
on public.products
for select
to anon
using (
  active = true
  and status = 'active'
  and available_online = true
);

drop policy if exists "Public can read active brands" on public.brands;
create policy "Public can read active brands"
on public.brands
for select
to anon
using (active = true);

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories"
on public.categories
for select
to anon
using (active = true);

drop policy if exists "Public can read active collections" on public.collections;
create policy "Public can read active collections"
on public.collections
for select
to anon
using (active = true);

drop policy if exists "Public can read active product types" on public.product_types;
create policy "Public can read active product types"
on public.product_types
for select
to anon
using (active = true);

drop policy if exists "Public can read active traditions" on public.traditions;
create policy "Public can read active traditions"
on public.traditions
for select
to anon
using (active = true);

drop policy if exists "Public can read active media assets" on public.media_assets;
drop policy if exists "Anon can insert media assets" on public.media_assets;
drop policy if exists "Temporary admin can insert media assets" on public.media_assets;
drop policy if exists "Anon can update media assets" on public.media_assets;
drop policy if exists "Temporary admin can update media assets" on public.media_assets;

create policy "Public can read active media assets"
on public.media_assets
for select
to anon
using (active = true);

drop policy if exists "Public can read product media" on public.product_media;
drop policy if exists "Anon can insert product media" on public.product_media;
drop policy if exists "Anon can update product media" on public.product_media;
drop policy if exists "Anon can delete product media" on public.product_media;

create policy "Public can read active product media"
on public.product_media
for select
to anon
using (
  exists (
    select 1
    from public.media_assets
    where media_assets.id = product_media.media_asset_id
      and media_assets.active = true
  )
);

-- Operations: inventory, commerce, orders, customers, returns, shipping.
alter table public.inventory_locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.returns enable row level security;
alter table public.return_items enable row level security;
alter table public.gift_cards enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;
alter table public.shipment_packages enable row level security;
alter table public.shipment_addresses enable row level security;
alter table public.shipment_events enable row level security;
alter table public.shipping_origins enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Anon can read inventory locations" on public.inventory_locations;
drop policy if exists "Anon can read inventory items" on public.inventory_items;
drop policy if exists "Anon can insert inventory items" on public.inventory_items;
drop policy if exists "Anon can update inventory items" on public.inventory_items;
drop policy if exists "Anon can read inventory transactions" on public.inventory_transactions;
drop policy if exists "Anon can insert inventory transactions" on public.inventory_transactions;

drop policy if exists "Anon can read customers for POS" on public.customers;
drop policy if exists "Anon can read customers for management" on public.customers;
drop policy if exists "Anon can insert customers for management" on public.customers;
drop policy if exists "Anon can update customers for management" on public.customers;
drop policy if exists "Anon can read customer addresses for management" on public.customer_addresses;
drop policy if exists "Anon can insert customer addresses for management" on public.customer_addresses;
drop policy if exists "Anon can update customer addresses for management" on public.customer_addresses;
drop policy if exists "Anon can delete customer addresses for management" on public.customer_addresses;

drop policy if exists "Anon can read POS orders" on public.orders;
drop policy if exists "Anon can insert POS orders" on public.orders;
drop policy if exists "Anon can read orders for management" on public.orders;
drop policy if exists "Anon can update orders for management" on public.orders;
drop policy if exists "Anon can read POS order items" on public.order_items;
drop policy if exists "Anon can insert POS order items" on public.order_items;
drop policy if exists "Anon can read POS payments" on public.payments;
drop policy if exists "Anon can insert POS payments" on public.payments;
drop policy if exists "Anon can read POS receipts" on public.receipts;
drop policy if exists "Anon can insert POS receipts" on public.receipts;

drop policy if exists "Anon can read returns for management" on public.returns;
drop policy if exists "Anon can insert returns for management" on public.returns;
drop policy if exists "Anon can update returns for management" on public.returns;
drop policy if exists "Anon can read return items for management" on public.return_items;
drop policy if exists "Anon can insert return items for management" on public.return_items;
drop policy if exists "Anon can update return items for management" on public.return_items;
drop policy if exists "Anon can read gift cards for return credits" on public.gift_cards;
drop policy if exists "Anon can insert gift cards for return credits" on public.gift_cards;

drop policy if exists "Anon can read shipments for management" on public.shipments;
drop policy if exists "Anon can insert shipments for management" on public.shipments;
drop policy if exists "Anon can update shipments for management" on public.shipments;
drop policy if exists "Anon can read shipment items" on public.shipment_items;
drop policy if exists "Anon can insert shipment items" on public.shipment_items;
drop policy if exists "Anon can update shipment items" on public.shipment_items;
drop policy if exists "Anon can delete shipment items before shipped" on public.shipment_items;
drop policy if exists "Anon can read shipment packages" on public.shipment_packages;
drop policy if exists "Anon can insert shipment packages" on public.shipment_packages;
drop policy if exists "Anon can update shipment packages" on public.shipment_packages;
drop policy if exists "Anon can delete shipment packages" on public.shipment_packages;
drop policy if exists "Anon can read shipment addresses" on public.shipment_addresses;
drop policy if exists "Anon can insert shipment addresses" on public.shipment_addresses;
drop policy if exists "Anon can update shipment addresses" on public.shipment_addresses;
drop policy if exists "Anon can read shipment events" on public.shipment_events;
drop policy if exists "Anon can insert shipment events" on public.shipment_events;

drop policy if exists "Anon can read shipping origins" on public.shipping_origins;
drop policy if exists "Anon can insert shipping origins" on public.shipping_origins;
drop policy if exists "Anon can update shipping origins" on public.shipping_origins;

drop policy if exists "Anon can read customer audit logs" on public.audit_logs;
drop policy if exists "Anon can insert customer audit logs" on public.audit_logs;
drop policy if exists "Anon can read order audit logs" on public.audit_logs;
drop policy if exists "Anon can insert order audit logs" on public.audit_logs;
drop policy if exists "Anon can read return audit logs" on public.audit_logs;
drop policy if exists "Anon can insert return audit logs" on public.audit_logs;
drop policy if exists "Anon can read shipment audit logs" on public.audit_logs;
drop policy if exists "Anon can insert shipment audit logs" on public.audit_logs;

-- Staff, scheduling, timekeeper, and payroll.
alter table public.staff_members enable row level security;
alter table public.staff_sessions enable row level security;
alter table public.staff_auth_events enable row level security;
alter table public.staff_permission_assignments enable row level security;
alter table public.staff_availability enable row level security;
alter table public.staff_time_off_requests enable row level security;
alter table public.staff_schedule_periods enable row level security;
alter table public.staff_shifts enable row level security;
alter table public.staff_schedule_events enable row level security;
alter table public.staff_timecards enable row level security;
alter table public.staff_punches enable row level security;
alter table public.staff_timecard_exceptions enable row level security;
alter table public.staff_timekeeper_events enable row level security;
alter table public.payroll_periods enable row level security;
alter table public.payroll_period_employees enable row level security;
alter table public.payroll_period_timecards enable row level security;
alter table public.payroll_events enable row level security;

drop policy if exists "Anon can read staff availability for scheduling development" on public.staff_availability;
drop policy if exists "Anon can write staff availability for scheduling development" on public.staff_availability;
drop policy if exists "Anon can read time off for scheduling development" on public.staff_time_off_requests;
drop policy if exists "Anon can write time off for scheduling development" on public.staff_time_off_requests;
drop policy if exists "Anon can read schedule periods for scheduling development" on public.staff_schedule_periods;
drop policy if exists "Anon can write schedule periods for scheduling development" on public.staff_schedule_periods;
drop policy if exists "Anon can read staff shifts for scheduling development" on public.staff_shifts;
drop policy if exists "Anon can write staff shifts for scheduling development" on public.staff_shifts;
drop policy if exists "Anon can read schedule events for scheduling development" on public.staff_schedule_events;
drop policy if exists "Anon can insert schedule events for scheduling development" on public.staff_schedule_events;

drop policy if exists "Anon can read timecards for development" on public.staff_timecards;
drop policy if exists "Anon can write timecards for development" on public.staff_timecards;
drop policy if exists "Anon can read punches for development" on public.staff_punches;
drop policy if exists "Anon can insert punches for development" on public.staff_punches;
drop policy if exists "Anon can read timecard exceptions for development" on public.staff_timecard_exceptions;
drop policy if exists "Anon can write timecard exceptions for development" on public.staff_timecard_exceptions;
drop policy if exists "Anon can read timekeeper events for development" on public.staff_timekeeper_events;
drop policy if exists "Anon can insert timekeeper events for development" on public.staff_timekeeper_events;

-- Preserve explicit anon-deny staff-auth policies as defense in depth.
drop policy if exists "Deny anon staff member reads" on public.staff_members;
create policy "Deny anon staff member reads"
on public.staff_members
for select
to anon
using (false);

drop policy if exists "Deny anon staff member writes" on public.staff_members;
create policy "Deny anon staff member writes"
on public.staff_members
for all
to anon
using (false)
with check (false);

drop policy if exists "Deny anon staff session reads" on public.staff_sessions;
create policy "Deny anon staff session reads"
on public.staff_sessions
for select
to anon
using (false);

drop policy if exists "Deny anon staff session writes" on public.staff_sessions;
create policy "Deny anon staff session writes"
on public.staff_sessions
for all
to anon
using (false)
with check (false);

drop policy if exists "Deny anon staff auth event reads" on public.staff_auth_events;
create policy "Deny anon staff auth event reads"
on public.staff_auth_events
for select
to anon
using (false);

drop policy if exists "Deny anon staff auth event writes" on public.staff_auth_events;
create policy "Deny anon staff auth event writes"
on public.staff_auth_events
for all
to anon
using (false)
with check (false);
