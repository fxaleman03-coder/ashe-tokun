-- Phase 16A Product Identification and Barcode Creator foundation.
-- Do not execute automatically from the application.
--
-- This migration prepares internal ASHE TOKUN Code 128 identifiers. These
-- values are internal product identifiers only; they are not UPC, EAN, or GTIN
-- values. Existing products keep their current SKU and legacy barcode values.

alter table public.products
add column if not exists barcode_value text;

alter table public.products
add column if not exists barcode_format text not null default 'CODE128';

alter table public.products
add column if not exists barcode_generated_at timestamptz;

alter table public.products
add column if not exists barcode_print_count integer not null default 0;

alter table public.products
add column if not exists barcode_last_printed_at timestamptz;

create sequence if not exists public.product_barcode_value_seq
as bigint
increment by 1
minvalue 1
start with 1
owned by none;

create or replace function public.is_internal_code128_value(value text)
returns boolean
language sql
immutable
as $$
  select value is not null
    and length(trim(value)) between 4 and 64
    and trim(value) = upper(trim(value))
    and trim(value) ~ '^[A-Z0-9][A-Z0-9 -]*[A-Z0-9]$';
$$;

create or replace function public.generate_product_barcode_value()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  generated_value text;
begin
  loop
    generated_value :=
      'AT-P-' || lpad(nextval('public.product_barcode_value_seq')::text, 8, '0');

    exit when not exists (
      select 1
      from public.products
      where barcode_value = generated_value
         or barcode = generated_value
         or sku = generated_value
    );
  end loop;

  return generated_value;
end;
$$;

update public.products product
set
  barcode_value = trim(product.barcode),
  barcode_format = 'CODE128',
  barcode_generated_at = coalesce(product.barcode_generated_at, now())
where product.barcode_value is null
  and public.is_internal_code128_value(product.barcode)
  and not exists (
    select 1
    from public.products conflict_product
    where conflict_product.id <> product.id
      and trim(conflict_product.barcode) = trim(product.barcode)
  );

do $$
declare
  product_record record;
begin
  for product_record in
    select id
    from public.products
    where barcode_value is null
    order by created_at, id
  loop
    update public.products
    set
      barcode_value = public.generate_product_barcode_value(),
      barcode_format = 'CODE128',
      barcode_generated_at = coalesce(barcode_generated_at, now())
    where id = product_record.id;
  end loop;
end;
$$;

alter table public.products
drop constraint if exists products_barcode_format_check;

alter table public.products
add constraint products_barcode_format_check check (barcode_format = 'CODE128');

alter table public.products
drop constraint if exists products_barcode_print_count_check;

alter table public.products
add constraint products_barcode_print_count_check check (barcode_print_count >= 0);

alter table public.products
drop constraint if exists products_barcode_value_policy_check;

alter table public.products
add constraint products_barcode_value_policy_check check (
  public.is_internal_code128_value(barcode_value)
);

create unique index if not exists products_barcode_value_idx
on public.products(barcode_value);

alter table public.products
alter column barcode_value set not null;

create or replace function public.set_product_internal_barcode()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if new.barcode_value is distinct from old.barcode_value then
      raise exception using
        errcode = 'P0001',
        message = 'Internal barcode values cannot be changed by ordinary product updates.';
    end if;

    new.barcode_format := old.barcode_format;
    new.barcode_generated_at := old.barcode_generated_at;

    return new;
  end if;

  if new.barcode_value is null or length(trim(new.barcode_value)) = 0 then
    new.barcode_value := public.generate_product_barcode_value();
  else
    new.barcode_value := trim(new.barcode_value);
  end if;

  if not public.is_internal_code128_value(new.barcode_value) then
    raise exception using
      errcode = 'P0001',
      message = 'Internal barcode value is not valid for ASHE TOKUN Code 128 policy.';
  end if;

  new.barcode_format := 'CODE128';
  new.barcode_generated_at := coalesce(new.barcode_generated_at, now());

  if new.barcode is null or length(trim(new.barcode)) = 0 then
    new.barcode := new.barcode_value;
  end if;

  return new;
end;
$$;

drop trigger if exists set_product_internal_barcode on public.products;

create trigger set_product_internal_barcode
before insert or update on public.products
for each row execute function public.set_product_internal_barcode();

drop function if exists public.record_product_barcode_prints(jsonb);

create or replace function public.record_product_barcode_prints(p_counts jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  count_record jsonb;
  product_id uuid;
  label_count integer;
  updated_products integer := 0;
  total_labels integer := 0;
begin
  if p_counts is null or jsonb_typeof(p_counts) <> 'array' then
    raise exception using
      errcode = 'P0001',
      message = 'Barcode print counts must be provided as an array.';
  end if;

  for count_record in select * from jsonb_array_elements(p_counts)
  loop
    product_id := nullif(count_record->>'product_id', '')::uuid;
    label_count := coalesce((count_record->>'label_count')::integer, 0);

    if product_id is null or label_count <= 0 or label_count > 1000 then
      raise exception using
        errcode = 'P0001',
        message = 'Barcode print count payload is not valid.';
    end if;

    update public.products
    set
      barcode_print_count = barcode_print_count + label_count,
      barcode_last_printed_at = now()
    where id = product_id;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'Product was not found for barcode print tracking.';
    end if;

    updated_products := updated_products + 1;
    total_labels := total_labels + label_count;
  end loop;

  return jsonb_build_object(
    'success', true,
    'updated_products', updated_products,
    'total_labels', total_labels
  );
end;
$$;

revoke all on function public.generate_product_barcode_value()
from public, anon, authenticated;

grant execute on function public.generate_product_barcode_value()
to service_role;

revoke all on function public.record_product_barcode_prints(jsonb)
from public, anon, authenticated;

grant execute on function public.record_product_barcode_prints(jsonb)
to service_role;
