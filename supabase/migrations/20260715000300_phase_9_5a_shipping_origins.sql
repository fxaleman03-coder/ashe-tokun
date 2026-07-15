-- Phase 9.5A Multi-origin shipping foundation.
-- Additive migration only. Do not execute automatically from the application.
-- No private origin address data is stored in source control.

create table if not exists public.shipping_origins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  company_name text not null,
  contact_first_name text,
  contact_last_name text,
  address1 text not null,
  address2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US',
  phone text,
  email text,
  active boolean not null default true,
  is_default boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipments
add column if not exists shipping_origin_id uuid references public.shipping_origins(id) on delete set null;

create index if not exists shipping_origins_code_idx on public.shipping_origins(code);
create index if not exists shipping_origins_active_idx on public.shipping_origins(active);
create index if not exists shipping_origins_is_default_idx on public.shipping_origins(is_default);
create unique index if not exists shipping_origins_one_default_idx
on public.shipping_origins(is_default)
where is_default = true;
create index if not exists shipments_shipping_origin_id_idx on public.shipments(shipping_origin_id);

drop trigger if exists set_shipping_origins_updated_at on public.shipping_origins;
create trigger set_shipping_origins_updated_at
before update on public.shipping_origins
for each row execute function public.set_updated_at();

insert into public.shipping_origins (
  name,
  code,
  company_name,
  address1,
  city,
  state,
  postal_code,
  country,
  active,
  is_default,
  notes
)
values
  (
    'ASHE TOKUN',
    'ashe-tokun',
    'ASHE TOKUN',
    '',
    '',
    '',
    '',
    'US',
    false,
    false,
    'Complete address and activate before using this origin.'
  ),
  (
    'AJAKO ORIGINALS',
    'ajako-originals',
    'AJAKO ORIGINALS',
    '',
    '',
    '',
    '',
    'US',
    false,
    false,
    'Complete address and activate before using this origin.'
  ),
  (
    'EDIBERE CREATION',
    'edibere-creation',
    'EDIBERE CREATION',
    '',
    '',
    '',
    '',
    'US',
    false,
    false,
    'Complete address and activate before using this origin.'
  )
on conflict (code) do update set
  name = excluded.name,
  company_name = excluded.company_name,
  updated_at = now();

-- Seed notes:
-- The three official origins are inserted as inactive/incomplete placeholders.
-- Add real addresses through the admin UI, then activate exactly one default.
-- Shipment rows may keep historical ship_from snapshots even if
-- shipping_origin_id is null or the origin record changes later.
