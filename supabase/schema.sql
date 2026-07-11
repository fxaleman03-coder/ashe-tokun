create extension if not exists "pgcrypto";

-- ASHE TOKUN Supabase schema.
-- Phase 4.7: Database Migration Readiness.
-- Prepared for future manual execution in Supabase SQL editor.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Stores
-- ---------------------------------------------------------------------------
-- Future planning area for the ASHE TOKUN store / retailer identity.

-- ---------------------------------------------------------------------------
-- Core Catalog
-- ---------------------------------------------------------------------------

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  website text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  parent_category_id uuid references public.categories(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.traditions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  contact_name text,
  email text,
  phone text,
  website text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  supplier_id uuid references public.suppliers(id) on delete set null,
  category_id uuid not null references public.categories(id) on delete restrict,
  tradition_id uuid references public.traditions(id) on delete set null,
  product_type_id uuid not null references public.product_types(id) on delete restrict,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  sku text not null unique,
  barcode text not null unique,
  vendor_sku text,
  price numeric(10, 2) not null default 0,
  compare_at_price numeric(10, 2),
  cost numeric(10, 2),
  weight numeric(10, 2),
  status text not null default 'draft',
  featured boolean not null default false,
  new_arrival boolean not null default false,
  available_online boolean not null default true,
  available_in_store boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_status_check check (status in ('draft', 'active', 'archived'))
);

create table if not exists public.product_collections (
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

create index if not exists brands_slug_idx on public.brands(slug);
create index if not exists categories_slug_idx on public.categories(slug);
create index if not exists collections_slug_idx on public.collections(slug);
create index if not exists traditions_slug_idx on public.traditions(slug);
create index if not exists product_types_slug_idx on public.product_types(slug);
create index if not exists suppliers_slug_idx on public.suppliers(slug);
create index if not exists products_slug_idx on public.products(slug);
create index if not exists products_sku_idx on public.products(sku);
create index if not exists products_barcode_idx on public.products(barcode);
create index if not exists products_brand_id_idx on public.products(brand_id);
create index if not exists products_supplier_id_idx on public.products(supplier_id);
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_product_type_id_idx on public.products(product_type_id);

insert into public.brands (name, slug, description, active)
values
  ('AJAKO ORIGINALS', 'ajako-originals', 'In-house brand sold inside ASHE TOKUN.', true),
  ('ODIBERE CREATIONS', 'odibere-creations', 'Artisan partner brand sold inside ASHE TOKUN.', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  active = excluded.active,
  updated_at = now();

insert into public.categories (name, slug, active)
values
  ('Keychains', 'keychains', true),
  ('Opele', 'opele', true),
  ('Opon', 'opon', true),
  ('Ide', 'ide', true),
  ('Elekes', 'elekes', true),
  ('Sets', 'sets', true),
  ('Mazos', 'mazos', true),
  ('Iruke', 'iruke', true),
  ('Irofa', 'irofa', true)
on conflict (slug) do update set
  name = excluded.name,
  active = excluded.active,
  updated_at = now();

insert into public.collections (name, slug, featured, active)
values
  ('New Arrivals', 'new-arrivals', true, true),
  ('Best Sellers', 'best-sellers', true, true),
  ('AJAKO Originals', 'ajako-originals', false, true),
  ('ODIBERE Creations', 'odibere-creations', false, true)
on conflict (slug) do update set
  name = excluded.name,
  featured = excluded.featured,
  active = excluded.active,
  updated_at = now();

insert into public.traditions (name, slug, active)
values
  ('Ifá', 'ifa', true),
  ('Orisha', 'orisha', true),
  ('Abakuá', 'abakua', true),
  ('Palo', 'palo', true),
  ('Espiritismo', 'espiritismo', true),
  ('Christian', 'christian', true)
on conflict (slug) do update set
  name = excluded.name,
  active = excluded.active,
  updated_at = now();

insert into public.product_types (name, slug, active)
values
  ('Physical Product', 'physical-product', true),
  ('Handmade Product', 'handmade-product', true),
  ('Made to Order', 'made-to-order', true)
on conflict (slug) do update set
  name = excluded.name,
  active = excluded.active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Suppliers
-- ---------------------------------------------------------------------------
-- Suppliers are created before products so optional supplier references can be
-- enforced while still allowing products without a supplier.

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------
-- Digital assets support both commerce media and future production files.

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  original_filename text not null,
  storage_path text not null,
  public_url text,
  asset_type text not null,
  mime_type text,
  file_extension text,
  file_size_bytes bigint,
  width integer,
  height integer,
  duration_seconds numeric(10, 2),
  brand_id uuid references public.brands(id) on delete set null,
  uploaded_by text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_asset_type_check check (
    asset_type in (
      'product_image',
      'gallery_image',
      'thumbnail',
      'brand_logo',
      'banner',
      'icon',
      'svg',
      'lightburn_project',
      'fusion360_file',
      'stl',
      '3mf',
      'pdf',
      'manual',
      'certificate',
      'video',
      'marketing',
      'other'
    )
  )
);

create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  display_order integer not null default 0,
  is_primary boolean not null default false,
  alt_text text,
  created_at timestamptz not null default now(),
  unique (product_id, media_asset_id)
);

create unique index if not exists product_media_one_primary_per_product_idx
on public.product_media(product_id)
where is_primary = true;

create table if not exists public.media_usage (
  id uuid primary key default gen_random_uuid(),
  media_asset_id uuid not null references public.media_assets(id) on delete restrict,
  usage_type text not null,
  reference_table text,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  constraint media_usage_usage_type_check check (
    usage_type in (
      'product',
      'collection',
      'brand',
      'homepage',
      'banner',
      'marketing',
      'production',
      'documentation'
    )
  )
);

create index if not exists media_assets_filename_idx on public.media_assets(filename);
create index if not exists media_assets_asset_type_idx on public.media_assets(asset_type);
create index if not exists media_assets_brand_id_idx on public.media_assets(brand_id);
create index if not exists media_assets_created_at_idx on public.media_assets(created_at);
create index if not exists product_media_product_id_idx on public.product_media(product_id);
create index if not exists product_media_media_asset_id_idx on public.product_media(media_asset_id);
create index if not exists media_usage_media_asset_id_idx on public.media_usage(media_asset_id);
create index if not exists media_usage_created_at_idx on public.media_usage(created_at);

-- Asset types intentionally supported by the Digital Asset Manager:
-- product_image, gallery_image, thumbnail, brand_logo, banner, icon, svg,
-- lightburn_project, fusion360_file, stl, 3mf, pdf, manual, certificate,
-- video, marketing, other.
-- No media records are seeded in Phase 4.5.

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
-- Inventory is transaction-based. Current quantities are represented by
-- inventory_items per product/location and are explained by the transaction
-- ledger in inventory_transactions.

create table if not exists public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  location_type text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  location_id uuid not null references public.inventory_locations(id) on delete restrict,
  on_hand_quantity integer not null default 0,
  reserved_quantity integer not null default 0,
  available_quantity integer not null default 0,
  incoming_quantity integer not null default 0,
  reorder_level integer not null default 0,
  inventory_value numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, location_id),
  constraint inventory_items_quantities_check check (
    on_hand_quantity >= 0
    and reserved_quantity >= 0
    and available_quantity >= 0
    and incoming_quantity >= 0
    and reorder_level >= 0
  ),
  constraint inventory_items_available_quantity_check check (
    available_quantity = on_hand_quantity - reserved_quantity
  )
);

-- ---------------------------------------------------------------------------
-- Inventory Transactions
-- ---------------------------------------------------------------------------
-- This is the inventory ledger. Each row explains a stock movement or balance
-- correction and preserves the balance after that transaction.

create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  transaction_type text not null,
  reference_type text not null,
  reference_id uuid,
  quantity_change integer not null,
  balance_after integer not null,
  notes text,
  performed_by text,
  created_at timestamptz not null default now(),
  constraint inventory_transactions_type_check check (
    transaction_type in (
      'sale',
      'return',
      'receiving',
      'adjustment',
      'transfer_in',
      'transfer_out',
      'damage',
      'loss',
      'cycle_count',
      'opening_balance'
    )
  ),
  constraint inventory_transactions_reference_type_check check (
    reference_type in (
      'POS',
      'Online Order',
      'Purchase Order',
      'Manual Adjustment',
      'Inventory Transfer',
      'Customer Return'
    )
  )
);

create index if not exists inventory_items_product_id_idx on public.inventory_items(product_id);
create index if not exists inventory_items_location_id_idx on public.inventory_items(location_id);
create index if not exists inventory_transactions_type_idx on public.inventory_transactions(transaction_type);
create index if not exists inventory_transactions_created_at_idx on public.inventory_transactions(created_at);

insert into public.inventory_locations (name, code, description, location_type, active)
values
  ('Main Stockroom', 'MAIN-STOCKROOM', 'Primary ASHE TOKUN stockroom for shared store inventory.', 'stockroom', true),
  ('Retail Floor', 'RETAIL-FLOOR', 'Physical store sales floor inventory location.', 'retail_floor', true),
  ('AJAKO Studio', 'AJAKO-STUDIO', 'AJAKO Originals studio and production holding location.', 'studio', true),
  ('ODIBERE Workshop', 'ODIBERE-WORKSHOP', 'ODIBERE Creations workshop and beadwork holding location.', 'workshop', true),
  ('Future Warehouse', 'FUTURE-WAREHOUSE', 'Reserved location for future warehouse expansion.', 'warehouse', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  location_type = excluded.location_type,
  active = excluded.active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------
-- Sales customers support walk-in, registered, wholesale, and VIP buyers.

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_number text not null unique,
  customer_type text not null default 'walk_in',
  first_name text,
  last_name text,
  company_name text,
  email text,
  phone text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_customer_type_check check (
    customer_type in ('walk_in', 'registered', 'wholesale', 'vip')
  )
);

-- ---------------------------------------------------------------------------
-- Customer Addresses
-- ---------------------------------------------------------------------------
-- Customer addresses support future online checkout, phone orders, and account
-- management. Walk-in customers do not require an address.

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  address_type text not null,
  first_name text,
  last_name text,
  company text,
  address1 text not null,
  address2 text,
  city text not null,
  state text,
  postal_code text,
  country text not null,
  default_address boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
-- Orders support POS, website, manual, phone, marketplace, and mobile channels.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  sales_channel text not null,
  order_status text not null default 'draft',
  payment_status text not null default 'pending',
  subtotal numeric(10, 2) not null default 0,
  discount_total numeric(10, 2) not null default 0,
  tax_total numeric(10, 2) not null default 0,
  grand_total numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_sales_channel_check check (
    sales_channel in ('POS', 'Website', 'Manual', 'Phone', 'Marketplace', 'Mobile')
  ),
  constraint orders_order_status_check check (
    order_status in ('draft', 'completed', 'cancelled', 'refunded', 'held')
  ),
  constraint orders_payment_status_check check (
    payment_status in ('pending', 'paid', 'partially_paid', 'refunded')
  )
);

-- ---------------------------------------------------------------------------
-- Order Items
-- ---------------------------------------------------------------------------
-- Order items store product and brand snapshots so future catalog edits do not
-- change historical sales records.

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  sku text,
  product_name text not null,
  brand_name text,
  quantity integer not null default 1,
  unit_price numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  line_total numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
-- Multiple payment rows per order allow split payments.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_method text not null,
  amount numeric(10, 2) not null default 0,
  reference_number text,
  payment_status text not null default 'pending',
  received_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payments_payment_method_check check (
    payment_method in ('cash', 'card', 'zelle', 'other', 'split')
  ),
  constraint payments_payment_status_check check (
    payment_status in ('pending', 'paid', 'partially_paid', 'refunded')
  )
);

-- ---------------------------------------------------------------------------
-- Receipts
-- ---------------------------------------------------------------------------
-- Receipts belong to ASHE TOKUN and may be printed, emailed, or both.

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete restrict,
  receipt_number text not null unique,
  printed boolean not null default false,
  emailed boolean not null default false,
  printed_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_addresses_customer_id_idx on public.customer_addresses(customer_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_order_number_idx on public.orders(order_number);
create index if not exists orders_sales_channel_idx on public.orders(sales_channel);
create index if not exists orders_payment_status_idx on public.orders(payment_status);
create index if not exists orders_created_at_idx on public.orders(created_at);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_payment_status_idx on public.payments(payment_status);
create index if not exists payments_created_at_idx on public.payments(created_at);
create index if not exists receipts_order_id_idx on public.receipts(order_id);
create index if not exists receipts_receipt_number_idx on public.receipts(receipt_number);
create index if not exists receipts_created_at_idx on public.receipts(created_at);

insert into public.customers (
  customer_number,
  customer_type,
  first_name,
  last_name,
  notes,
  active
)
values (
  'CUST-WALK-IN',
  'walk_in',
  'Walk-in',
  'Customer',
  'Default customer record for anonymous physical store sales.',
  true
)
on conflict (customer_number) do update set
  customer_type = excluded.customer_type,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  notes = excluded.notes,
  active = excluded.active,
  updated_at = now();

-- Receipt number format example for future receipt generation:
-- ASH-000001

-- ---------------------------------------------------------------------------
-- Operations
-- ---------------------------------------------------------------------------
-- Operations supports suppliers, purchasing, receiving, returns, exchanges,
-- consignment, payouts, discounts, tax rates, gift cards, staff placeholders,
-- and audit logs.

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'draft',
  subtotal numeric(10, 2) not null default 0,
  tax_total numeric(10, 2) not null default 0,
  shipping_total numeric(10, 2) not null default 0,
  grand_total numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchase_orders_status_check check (
    status in ('draft', 'ordered', 'partially_received', 'received', 'cancelled')
  )
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  description text not null,
  sku text,
  quantity_ordered integer not null default 0,
  quantity_received integer not null default 0,
  unit_cost numeric(10, 2) not null default 0,
  line_total numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receiving_records (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  received_by text,
  received_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.receiving_record_items (
  id uuid primary key default gen_random_uuid(),
  receiving_record_id uuid not null references public.receiving_records(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  sku text,
  description text not null,
  quantity_received integer not null default 0,
  unit_cost numeric(10, 2),
  inventory_location_id uuid references public.inventory_locations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  order_id uuid references public.orders(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  return_type text not null,
  status text not null default 'requested',
  refund_total numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint returns_return_type_check check (
    return_type in ('refund', 'exchange', 'store_credit')
  ),
  constraint returns_status_check check (
    status in ('requested', 'approved', 'received', 'completed', 'cancelled')
  )
);

create table if not exists public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete restrict,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  sku text,
  product_name text not null,
  quantity integer not null default 1,
  reason text,
  condition text,
  refund_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.discounts (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text not null,
  discount_type text not null,
  value numeric(10, 2) not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discounts_discount_type_check check (
    discount_type in ('amount', 'percent')
  )
);

create table if not exists public.tax_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate numeric(10, 4) not null default 0,
  state text,
  city text,
  county text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gift_cards (
  id uuid primary key default gen_random_uuid(),
  gift_card_number text not null unique,
  initial_balance numeric(10, 2) not null default 0,
  current_balance numeric(10, 2) not null default 0,
  status text not null default 'active',
  issued_to_customer_id uuid references public.customers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gift_cards_status_check check (
    status in ('active', 'redeemed', 'expired', 'disabled')
  )
);

create table if not exists public.consignment_accounts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  name text not null,
  commission_rate numeric(10, 4) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.consignment_items (
  id uuid primary key default gen_random_uuid(),
  consignment_account_id uuid not null references public.consignment_accounts(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  ownership_status text not null default 'consigned',
  commission_rate numeric(10, 4) not null default 0,
  payout_status text not null default 'not_due',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consignment_items_ownership_status_check check (
    ownership_status in ('consigned', 'purchased', 'returned_to_owner')
  ),
  constraint consignment_items_payout_status_check check (
    payout_status in ('not_due', 'due', 'paid')
  )
);

create table if not exists public.vendor_payouts (
  id uuid primary key default gen_random_uuid(),
  consignment_account_id uuid references public.consignment_accounts(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  payout_number text not null unique,
  status text not null default 'draft',
  subtotal numeric(10, 2) not null default 0,
  adjustments numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vendor_payouts_status_check check (
    status in ('draft', 'due', 'paid', 'cancelled')
  )
);

-- ---------------------------------------------------------------------------
-- Admin / Audit
-- ---------------------------------------------------------------------------
-- Staff placeholders and audit logs preserve admin/system accountability.

create table if not exists public.staff_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  email text unique,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid references public.staff_users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists purchase_orders_supplier_id_idx on public.purchase_orders(supplier_id);
create index if not exists purchase_orders_created_at_idx on public.purchase_orders(created_at);
create index if not exists purchase_order_items_purchase_order_id_idx on public.purchase_order_items(purchase_order_id);
create index if not exists purchase_order_items_product_id_idx on public.purchase_order_items(product_id);
create index if not exists receiving_records_purchase_order_id_idx on public.receiving_records(purchase_order_id);
create index if not exists receiving_records_supplier_id_idx on public.receiving_records(supplier_id);
create index if not exists receiving_records_created_at_idx on public.receiving_records(created_at);
create index if not exists receiving_record_items_receiving_record_id_idx on public.receiving_record_items(receiving_record_id);
create index if not exists receiving_record_items_product_id_idx on public.receiving_record_items(product_id);
create index if not exists receiving_record_items_inventory_location_id_idx on public.receiving_record_items(inventory_location_id);
create index if not exists returns_order_id_idx on public.returns(order_id);
create index if not exists returns_customer_id_idx on public.returns(customer_id);
create index if not exists returns_return_number_idx on public.returns(return_number);
create index if not exists returns_created_at_idx on public.returns(created_at);
create index if not exists return_items_return_id_idx on public.return_items(return_id);
create index if not exists return_items_order_item_id_idx on public.return_items(order_item_id);
create index if not exists return_items_product_id_idx on public.return_items(product_id);
create index if not exists discounts_code_idx on public.discounts(code);
create index if not exists discounts_created_at_idx on public.discounts(created_at);
create index if not exists tax_rates_created_at_idx on public.tax_rates(created_at);
create index if not exists gift_cards_gift_card_number_idx on public.gift_cards(gift_card_number);
create index if not exists gift_cards_issued_to_customer_id_idx on public.gift_cards(issued_to_customer_id);
create index if not exists gift_cards_created_at_idx on public.gift_cards(created_at);
create index if not exists consignment_accounts_supplier_id_idx on public.consignment_accounts(supplier_id);
create index if not exists consignment_accounts_brand_id_idx on public.consignment_accounts(brand_id);
create index if not exists consignment_accounts_created_at_idx on public.consignment_accounts(created_at);
create index if not exists consignment_items_consignment_account_id_idx on public.consignment_items(consignment_account_id);
create index if not exists consignment_items_product_id_idx on public.consignment_items(product_id);
create index if not exists vendor_payouts_consignment_account_id_idx on public.vendor_payouts(consignment_account_id);
create index if not exists vendor_payouts_supplier_id_idx on public.vendor_payouts(supplier_id);
create index if not exists vendor_payouts_brand_id_idx on public.vendor_payouts(brand_id);
create index if not exists vendor_payouts_payout_number_idx on public.vendor_payouts(payout_number);
create index if not exists vendor_payouts_created_at_idx on public.vendor_payouts(created_at);
create index if not exists staff_users_created_at_idx on public.staff_users(created_at);
create index if not exists audit_logs_staff_user_id_idx on public.audit_logs(staff_user_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at);

insert into public.tax_rates (name, rate, state, active)
select 'Florida Sales Tax Placeholder', 0.07, 'FL', true
where not exists (
  select 1 from public.tax_rates where name = 'Florida Sales Tax Placeholder'
);

insert into public.staff_users (display_name, role, active)
select 'Admin', 'admin', true
where not exists (
  select 1 from public.staff_users where display_name = 'Admin'
);

-- ---------------------------------------------------------------------------
-- updated_at Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists set_brands_updated_at on public.brands;
create trigger set_brands_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_collections_updated_at on public.collections;
create trigger set_collections_updated_at
before update on public.collections
for each row execute function public.set_updated_at();

drop trigger if exists set_traditions_updated_at on public.traditions;
create trigger set_traditions_updated_at
before update on public.traditions
for each row execute function public.set_updated_at();

drop trigger if exists set_product_types_updated_at on public.product_types;
create trigger set_product_types_updated_at
before update on public.product_types
for each row execute function public.set_updated_at();

drop trigger if exists set_suppliers_updated_at on public.suppliers;
create trigger set_suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_media_assets_updated_at on public.media_assets;
create trigger set_media_assets_updated_at
before update on public.media_assets
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_locations_updated_at on public.inventory_locations;
create trigger set_inventory_locations_updated_at
before update on public.inventory_locations
for each row execute function public.set_updated_at();

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_purchase_orders_updated_at on public.purchase_orders;
create trigger set_purchase_orders_updated_at
before update on public.purchase_orders
for each row execute function public.set_updated_at();

drop trigger if exists set_purchase_order_items_updated_at on public.purchase_order_items;
create trigger set_purchase_order_items_updated_at
before update on public.purchase_order_items
for each row execute function public.set_updated_at();

drop trigger if exists set_returns_updated_at on public.returns;
create trigger set_returns_updated_at
before update on public.returns
for each row execute function public.set_updated_at();

drop trigger if exists set_discounts_updated_at on public.discounts;
create trigger set_discounts_updated_at
before update on public.discounts
for each row execute function public.set_updated_at();

drop trigger if exists set_tax_rates_updated_at on public.tax_rates;
create trigger set_tax_rates_updated_at
before update on public.tax_rates
for each row execute function public.set_updated_at();

drop trigger if exists set_gift_cards_updated_at on public.gift_cards;
create trigger set_gift_cards_updated_at
before update on public.gift_cards
for each row execute function public.set_updated_at();

drop trigger if exists set_consignment_accounts_updated_at on public.consignment_accounts;
create trigger set_consignment_accounts_updated_at
before update on public.consignment_accounts
for each row execute function public.set_updated_at();

drop trigger if exists set_consignment_items_updated_at on public.consignment_items;
create trigger set_consignment_items_updated_at
before update on public.consignment_items
for each row execute function public.set_updated_at();

drop trigger if exists set_vendor_payouts_updated_at on public.vendor_payouts;
create trigger set_vendor_payouts_updated_at
before update on public.vendor_payouts
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_users_updated_at on public.staff_users;
create trigger set_staff_users_updated_at
before update on public.staff_users
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Migration Notes
-- ---------------------------------------------------------------------------
-- This file is ready for manual execution in Supabase SQL editor.
-- Local app behavior still uses seed/local data until USE_SUPABASE is enabled
-- in a future phase.
-- Do not enable live writes until RLS policies are added.

-- ---------------------------------------------------------------------------
-- RLS AND SECURITY PLANNING
-- ---------------------------------------------------------------------------
-- Phase 4.8 plans row-level security before any live Supabase writes.
-- Do not enable RLS yet.
-- Do not create live policies until authentication, staff roles, and service
-- boundaries are implemented and tested.

-- Access level planning:
--
-- Public Storefront
-- - Can read active products.
-- - Can read active brands.
-- - Can read active collections.
-- - Can read active categories.
-- - Can read public product media.
-- - Cannot read product cost.
-- - Cannot read inventory internals.
-- - Cannot read customers.
-- - Cannot read orders.
-- - Cannot read payments.
--
-- Admin Staff
-- - Can manage products.
-- - Can manage media.
-- - Can manage inventory.
-- - Can manage orders.
-- - Can manage customers.
-- - Can manage discounts.
-- - Can view reports.
--
-- POS Staff
-- - Can read products.
-- - Can create POS orders.
-- - Can create payments.
-- - Can create receipts.
-- - Can create inventory transactions.
-- - Cannot change product cost.
-- - Cannot delete products.
--
-- Manager / Owner
-- - Full operational access.
-- - Can manage staff.
-- - Can approve discounts.
-- - Can view profit and cost.
-- - Can process refunds.
--
-- Future Vendor Portal
-- - Vendor users can only see their own brand, products, orders, and payouts.
-- - Vendor users cannot see other vendors.
-- - Vendor users cannot see ASHE TOKUN financial internals.

-- Future helper functions to define after authentication is implemented:
-- - current_staff_role()
-- - current_staff_id()
-- - is_manager()
-- - is_pos_staff()
-- - is_vendor_user()
-- - current_vendor_brand_id()

-- Future RLS policy examples, comments only:
--
-- products
-- - Public storefront can select active products where available_online = true.
-- - Public storefront selection must exclude cost and other private fields,
--   likely through a public product view instead of direct table access.
-- - Admin staff can insert and update product records.
-- - POS staff can select products but cannot update cost or delete products.
-- - Vendor portal users can select products where brand_id matches
--   current_vendor_brand_id().
--
-- orders
-- - Admin staff and managers can manage all orders.
-- - POS staff can create and read POS orders they are allowed to process.
-- - Customers can read only their own online orders after customer auth exists.
-- - Vendor portal users may read only order line summaries related to their
--   brand, not full ASHE TOKUN order financial internals.
--
-- order_items
-- - Admin staff and managers can read full order item history.
-- - POS staff can create order items for POS orders.
-- - Historical snapshots must remain immutable except for approved correction
--   workflows.
-- - Vendor portal users may read only rows where product brand ownership
--   matches their vendor account.
--
-- payments
-- - Admin staff and managers can read payment records.
-- - POS staff can create payments for POS orders.
-- - Public storefront users cannot read payment records directly.
-- - Vendor portal users cannot read ASHE TOKUN payment internals.
--
-- customers
-- - Admin staff can manage customer records.
-- - POS staff can create or search limited customer information needed for
--   in-store checkout.
-- - Customers can read and update only their own profile after customer auth
--   exists.
-- - Vendor portal users cannot read ASHE TOKUN customer records.
--
-- inventory_items
-- - Admin staff and managers can manage inventory records.
-- - POS staff can read availability needed for checkout.
-- - Public storefront should read availability through safe views only.
-- - Vendor portal users cannot read ASHE TOKUN internal inventory locations.
--
-- inventory_transactions
-- - Admin staff and managers can read the full inventory ledger.
-- - POS staff can create sale-related inventory transactions only after sale
--   completion workflows are connected.
-- - Inventory transaction rows should not be deleted through normal app paths.
-- - Public storefront and vendor portal users cannot read internal ledger rows.
--
-- media_assets
-- - Public storefront can read active commerce media marked for public usage.
-- - Admin staff can manage commerce and production assets.
-- - POS staff can read product media needed for checkout.
-- - Vendor portal users can read or manage only media attached to their own
--   brand after vendor workflows exist.
--
-- audit_logs
-- - Managers and owners can read audit logs.
-- - Admin actions should write audit log entries through controlled service
--   paths.
-- - Staff users should not update or delete audit log history.
-- - Public storefront, POS staff, customers, and vendor portal users cannot
--   read audit logs unless a future role explicitly allows it.
