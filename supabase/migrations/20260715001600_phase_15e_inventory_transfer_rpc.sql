-- Phase 15E Minimum Inventory Transfer RPC.
-- Do not execute automatically from the application.
--
-- This enables a transaction-safe inventory transfer for moving existing stock
-- between ASHE TOKUN locations. It does not fabricate inventory, change POS
-- validation, alter pricing, or enable broader inventory write actions.

alter table public.transaction_idempotency_keys
drop constraint if exists transaction_idempotency_keys_workflow_check;

alter table public.transaction_idempotency_keys
add constraint transaction_idempotency_keys_workflow_check check (
  workflow in (
    'pos_sale',
    'return_completion',
    'shipment_creation',
    'inventory_transfer'
  )
);

drop function if exists public.transfer_inventory_transaction(
  text,
  uuid,
  uuid,
  uuid,
  integer,
  text,
  text
);

create or replace function public.transfer_inventory_transaction(
  p_request_key text,
  p_product_id uuid,
  p_from_location_id uuid,
  p_to_location_id uuid,
  p_quantity integer,
  p_notes text,
  p_performed_by text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.transaction_idempotency_keys%rowtype;
  v_source public.inventory_items%rowtype;
  v_destination public.inventory_items%rowtype;
  v_product_cost numeric(10, 2) := 0;
  v_next_source_on_hand integer;
  v_next_destination_on_hand integer;
  v_next_source_available integer;
  v_next_destination_available integer;
  v_transfer_id uuid := gen_random_uuid();
  v_result jsonb;
begin
  if p_request_key is null or length(trim(p_request_key)) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Missing inventory transfer request key.';
  end if;

  if p_product_id is null
    or p_from_location_id is null
    or p_to_location_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory transfer requires product, source, and destination.';
  end if;

  if p_from_location_id = p_to_location_id then
    raise exception using
      errcode = 'P0001',
      message = 'Transfer locations must be different.';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Transfer quantity must be greater than zero.';
  end if;

  perform 1
  from public.products
  where id = p_product_id
    and active = true;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Product was not found or is inactive.';
  end if;

  perform 1
  from public.inventory_locations
  where id = p_from_location_id
    and active = true;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Source inventory location was not found or is inactive.';
  end if;

  perform 1
  from public.inventory_locations
  where id = p_to_location_id
    and active = true;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Destination inventory location was not found or is inactive.';
  end if;

  insert into public.transaction_idempotency_keys (workflow, request_key, status)
  values ('inventory_transfer', p_request_key, 'processing')
  on conflict (workflow, request_key) do nothing;

  select *
  into v_existing
  from public.transaction_idempotency_keys
  where workflow = 'inventory_transfer'
    and request_key = p_request_key
  for update;

  if v_existing.status = 'completed' and v_existing.result is not null then
    return v_existing.result;
  end if;

  if v_existing.status = 'processing' and v_existing.entity_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory transfer is already processing.';
  end if;

  select *
  into v_source
  from public.inventory_items
  where product_id = p_product_id
    and location_id = p_from_location_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Source inventory item was not found.';
  end if;

  if v_source.available_quantity < p_quantity then
    raise exception using
      errcode = 'P0001',
      message = 'Not enough available stock at the source location.';
  end if;

  if v_source.on_hand_quantity - p_quantity < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Transfer would create negative source stock.';
  end if;

  select coalesce(cost, 0)
  into v_product_cost
  from public.products
  where id = p_product_id;

  insert into public.inventory_items (
    product_id,
    location_id,
    on_hand_quantity,
    reserved_quantity,
    available_quantity,
    incoming_quantity,
    reorder_level,
    inventory_value
  )
  values (
    p_product_id,
    p_to_location_id,
    0,
    0,
    0,
    0,
    0,
    0
  )
  on conflict (product_id, location_id) do nothing;

  select *
  into v_destination
  from public.inventory_items
  where product_id = p_product_id
    and location_id = p_to_location_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Destination inventory item could not be created.';
  end if;

  v_next_source_on_hand := v_source.on_hand_quantity - p_quantity;
  v_next_source_available :=
    v_next_source_on_hand - v_source.reserved_quantity;
  v_next_destination_on_hand := v_destination.on_hand_quantity + p_quantity;
  v_next_destination_available :=
    v_next_destination_on_hand - v_destination.reserved_quantity;

  if v_next_source_available < 0 or v_next_destination_available < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Transfer would create invalid available inventory.';
  end if;

  update public.inventory_items
  set
    on_hand_quantity = v_next_source_on_hand,
    available_quantity = v_next_source_available,
    inventory_value = round(v_product_cost * v_next_source_on_hand, 2)
  where id = v_source.id;

  update public.inventory_items
  set
    on_hand_quantity = v_next_destination_on_hand,
    available_quantity = v_next_destination_available,
    inventory_value = round(v_product_cost * v_next_destination_on_hand, 2)
  where id = v_destination.id;

  insert into public.inventory_transactions (
    inventory_item_id,
    transaction_type,
    reference_type,
    reference_id,
    quantity_change,
    balance_after,
    notes,
    performed_by
  )
  values
    (
      v_source.id,
      'transfer_out',
      'Inventory Transfer',
      v_transfer_id,
      -p_quantity,
      v_next_source_on_hand,
      nullif(trim(coalesce(p_notes, '')), ''),
      coalesce(nullif(trim(coalesce(p_performed_by, '')), ''), 'Admin')
    ),
    (
      v_destination.id,
      'transfer_in',
      'Inventory Transfer',
      v_transfer_id,
      p_quantity,
      v_next_destination_on_hand,
      nullif(trim(coalesce(p_notes, '')), ''),
      coalesce(nullif(trim(coalesce(p_performed_by, '')), ''), 'Admin')
    );

  v_result := jsonb_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'product_id', p_product_id,
    'from_location_id', p_from_location_id,
    'to_location_id', p_to_location_id,
    'quantity', p_quantity,
    'source_inventory_item_id', v_source.id,
    'destination_inventory_item_id', v_destination.id,
    'source_on_hand', v_next_source_on_hand,
    'source_available', v_next_source_available,
    'destination_on_hand', v_next_destination_on_hand,
    'destination_available', v_next_destination_available
  );

  update public.transaction_idempotency_keys
  set
    status = 'completed',
    entity_id = v_transfer_id,
    result = v_result
  where workflow = 'inventory_transfer'
    and request_key = p_request_key;

  return v_result;
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory transfer failed.';
end;
$$;

revoke all on function public.transfer_inventory_transaction(
  text,
  uuid,
  uuid,
  uuid,
  integer,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.transfer_inventory_transaction(
  text,
  uuid,
  uuid,
  uuid,
  integer,
  text,
  text
) to service_role;
