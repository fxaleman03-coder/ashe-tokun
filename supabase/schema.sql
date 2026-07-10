-- ASHE TOKUN Supabase schema draft.
-- Phase 3.2: Database Architecture.
-- This file is planning-only and is not applied automatically.

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Core Catalog
-- ASHE TOKUN is the store/retailer. Brands are customer-facing product brands.
-- Suppliers are optional operational sources and may not be shown to customers.
-- ---------------------------------------------------------------------------

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  customer_facing boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  contact_name text,
  email text,
  phone text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories(id) on delete set null,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.traditions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  storefront_visible boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  tradition_id uuid references public.traditions(id) on delete set null,
  product_type_id uuid references public.product_types(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  price numeric(12, 2) not null default 0,
  compare_at_price numeric(12, 2),
  cost numeric(12, 2),
  sku text not null unique,
  barcode text not null unique,
  vendor_sku text,
  stock integer not null default 0,
  reorder_level integer,
  inventory_location text,
  available_online boolean not null default true,
  available_in_store boolean not null default true,
  image text,
  featured boolean not null default false,
  new_arrival boolean not null default false,
  best_seller boolean not null default false,
  limited_edition boolean not null default false,
  handcrafted boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_status_check check (status in ('draft', 'active', 'archived'))
);

create table if not exists public.product_collections (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, collection_id)
);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_asset_id uuid not null,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, media_asset_id)
);

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  public_url text not null,
  storage_bucket text,
  storage_path text,
  relative_path text not null,
  folder text,
  category text,
  extension text,
  mime_type text,
  width integer,
  height integer,
  alt_text text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_media_media_asset_id_fkey'
  ) then
    alter table public.product_media
      add constraint product_media_media_asset_id_fkey
      foreign key (media_asset_id) references public.media_assets(id) on delete cascade;
  end if;
end;
$$;

create table if not exists public.media_usage (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  usage_type text not null,
  reference_table text,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  location_type text not null default 'store',
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  sku text not null,
  barcode text not null,
  quantity_on_hand integer not null default 0,
  quantity_reserved integer not null default 0,
  reorder_level integer,
  available_online boolean not null default true,
  available_in_store boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, location_id)
);

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  from_location_id uuid references public.inventory_locations(id) on delete set null,
  to_location_id uuid references public.inventory_locations(id) on delete set null,
  transaction_type text not null,
  quantity integer not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_transactions_type_check check (
    transaction_type in ('sale', 'return', 'adjustment', 'receiving', 'transfer')
  )
);

-- ---------------------------------------------------------------------------
-- Sales / POS / Orders
-- ---------------------------------------------------------------------------

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  email text,
  phone text,
  notes text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  channel text not null default 'pos',
  cashier_name text,
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_channel_check check (channel in ('online', 'pos', 'manual')),
  constraint orders_status_check check (status in ('draft', 'held', 'paid', 'fulfilled', 'canceled', 'refunded'))
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  product_name text not null,
  brand_name text,
  sku text,
  barcode text,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_method text not null,
  amount numeric(12, 2) not null default 0,
  status text not null default 'pending',
  transaction_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_method_check check (
    payment_method in ('cash', 'card', 'zelle', 'other', 'split')
  )
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  receipt_number text not null unique,
  customer_name text,
  cashier_name text,
  subtotal numeric(12, 2) not null default 0,
  discount_total numeric(12, 2) not null default 0,
  tax_total numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  payment_summary text,
  printed_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Operations / Future
-- ---------------------------------------------------------------------------

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  discount_type text not null default 'amount',
  value numeric(12, 2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate numeric(8, 4) not null default 0,
  region text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  initial_value numeric(12, 2) not null default 0,
  balance numeric(12, 2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  return_number text not null unique,
  reason text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  purchase_order_number text not null unique,
  status text not null default 'draft',
  expected_at timestamptz,
  total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null default 1,
  unit_cost numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Admin / Security / Audit placeholders
-- ---------------------------------------------------------------------------

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  role_id uuid references public.roles(id) on delete set null,
  display_name text not null,
  email text unique,
  status text not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid references public.staff_users(id) on delete set null,
  action text not null,
  entity_table text,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Seed data
-- ---------------------------------------------------------------------------

insert into public.brands (name, slug, description, customer_facing, status)
values
  ('AJAKO ORIGINALS', 'ajako-originals', 'In-house handcrafted spiritual goods designed and manufactured by AJAKO.', true, 'active'),
  ('ODIBERE CREATIONS', 'odibere-creations', 'Official artisan partner for handcrafted beadwork.', true, 'active')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  customer_facing = excluded.customer_facing,
  status = excluded.status,
  updated_at = now();

insert into public.inventory_locations (name, slug, location_type, description, status)
values
  ('Main Stockroom', 'main-stockroom', 'store', 'Primary ASHE TOKUN store inventory location.', 'active'),
  ('AJAKO Studio', 'ajako-studio', 'studio', 'AJAKO Originals production and holding location.', 'active'),
  ('ODIBERE Beadwork', 'odibere-beadwork', 'partner', 'ODIBERE Creations beadwork inventory location.', 'active')
on conflict (slug) do update set
  name = excluded.name,
  location_type = excluded.location_type,
  description = excluded.description,
  status = excluded.status,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists products_brand_id_idx on public.products(brand_id);
create index if not exists products_supplier_id_idx on public.products(supplier_id);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_sku_idx on public.products(sku);
create index if not exists products_barcode_idx on public.products(barcode);
create index if not exists product_collections_product_id_idx on public.product_collections(product_id);
create index if not exists product_collections_collection_id_idx on public.product_collections(collection_id);
create index if not exists product_media_product_id_idx on public.product_media(product_id);
create index if not exists product_media_media_asset_id_idx on public.product_media(media_asset_id);
create index if not exists media_usage_media_asset_id_idx on public.media_usage(media_asset_id);
create index if not exists inventory_items_product_id_idx on public.inventory_items(product_id);
create index if not exists inventory_items_location_id_idx on public.inventory_items(location_id);
create index if not exists inventory_transactions_product_id_idx on public.inventory_transactions(product_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists receipts_order_id_idx on public.receipts(order_id);
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_table, entity_id);

-- Triggers for updated_at maintenance.
drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_collections_updated_at on public.collections;
create trigger set_collections_updated_at before update on public.collections
for each row execute function public.set_updated_at();

drop trigger if exists set_traditions_updated_at on public.traditions;
create trigger set_traditions_updated_at before update on public.traditions
for each row execute function public.set_updated_at();

drop trigger if exists set_product_types_updated_at on public.product_types;
create trigger set_product_types_updated_at before update on public.product_types
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_media_assets_updated_at on public.media_assets;
create trigger set_media_assets_updated_at before update on public.media_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();
