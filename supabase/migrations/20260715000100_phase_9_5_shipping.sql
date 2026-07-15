-- Phase 9.5 Shipping and Fulfillment foundation.
-- Additive migration only. Do not execute automatically from the application.
-- Live carrier rates, label purchase, and webhooks remain deferred.

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  shipment_number text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  shipment_status text not null default 'pending',
  fulfillment_type text not null default 'shipping',
  carrier text,
  service_level text,
  tracking_number text,
  tracking_url text,
  shipping_cost numeric(10, 2) not null default 0,
  package_count integer not null default 1,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shipments_status_check check (
    shipment_status in (
      'pending',
      'ready',
      'packed',
      'shipped',
      'in_transit',
      'delivered',
      'cancelled',
      'exception'
    )
  ),
  constraint shipments_fulfillment_type_check check (
    fulfillment_type in ('shipping', 'local_pickup')
  ),
  constraint shipments_package_count_check check (package_count >= 1),
  constraint shipments_shipping_cost_check check (shipping_cost >= 0)
);

create table if not exists public.shipment_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  quantity integer not null,
  created_at timestamptz not null default now(),
  constraint shipment_items_quantity_check check (quantity > 0)
);

create table if not exists public.shipment_packages (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  package_number text not null,
  length_in numeric(10, 2),
  width_in numeric(10, 2),
  height_in numeric(10, 2),
  weight_lb numeric(10, 2),
  package_type text,
  label_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipment_addresses (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  address_role text not null,
  first_name text,
  last_name text,
  company text,
  address1 text not null,
  address2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  constraint shipment_addresses_role_check check (
    address_role in ('ship_from', 'ship_to')
  )
);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete restrict,
  event_type text not null,
  status text not null,
  location text,
  description text,
  event_time timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists shipments_order_id_idx on public.shipments(order_id);
create index if not exists shipments_shipment_number_idx on public.shipments(shipment_number);
create index if not exists shipments_shipment_status_idx on public.shipments(shipment_status);
create index if not exists shipments_tracking_number_idx on public.shipments(tracking_number);
create index if not exists shipments_created_at_idx on public.shipments(created_at);
create index if not exists shipment_items_shipment_id_idx on public.shipment_items(shipment_id);
create index if not exists shipment_items_order_item_id_idx on public.shipment_items(order_item_id);
create index if not exists shipment_packages_shipment_id_idx on public.shipment_packages(shipment_id);
create index if not exists shipment_addresses_shipment_id_idx on public.shipment_addresses(shipment_id);
create index if not exists shipment_events_shipment_id_idx on public.shipment_events(shipment_id);
create index if not exists shipment_events_event_time_idx on public.shipment_events(event_time);

drop trigger if exists set_shipments_updated_at on public.shipments;
create trigger set_shipments_updated_at
before update on public.shipments
for each row execute function public.set_updated_at();

drop trigger if exists set_shipment_packages_updated_at on public.shipment_packages;
create trigger set_shipment_packages_updated_at
before update on public.shipment_packages
for each row execute function public.set_updated_at();

-- Migration notes:
-- Shipment records store address snapshots so customer address edits do not
-- rewrite historical fulfillment data.
-- Shipment quantities are derived from shipment_items and must be validated in
-- application code or future database RPCs before production.
-- A database sequence/RPC should replace application-side shipment number
-- generation before production concurrency.
