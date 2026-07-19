-- Phase 15G Inventory Operations RPC activation.
-- Do not execute automatically from the application.
--
-- This adds transaction-safe inventory adjustment and receiving functions for
-- normal ASHE TOKUN store operations. It does not change POS logic, transfer
-- logic, pricing, product data, or inventory quantities by itself.

alter table public.transaction_idempotency_keys
drop constraint if exists transaction_idempotency_keys_workflow_check;

alter table public.transaction_idempotency_keys
add constraint transaction_idempotency_keys_workflow_check check (
  workflow in (
    'pos_sale',
    'return_completion',
    'shipment_creation',
    'inventory_transfer',
    'inventory_adjustment',
    'inventory_receiving'
  )
);

drop function if exists public.adjust_inventory_transaction(
  text,
  uuid,
  integer,
  text,
  text,
  text,
  uuid,
  text
);

create or replace function public.adjust_inventory_transaction(
  p_request_key text,
  p_inventory_item_id uuid,
  p_quantity_change integer,
  p_transaction_type text,
  p_notes text,
  p_reference_type text,
  p_reference_id uuid,
  p_performed_by text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.transaction_idempotency_keys%rowtype;
  v_item public.inventory_items%rowtype;
  v_product_cost numeric(10, 2) := 0;
  v_next_on_hand integer;
  v_next_available integer;
  v_transaction_id uuid;
  v_result jsonb;
begin
  if p_request_key is null or length(trim(p_request_key)) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Missing inventory adjustment request key.';
  end if;

  if p_inventory_item_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory adjustment requires an inventory item.';
  end if;

  if p_quantity_change is null or p_quantity_change = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Quantity change must be a non-zero whole number.';
  end if;

  if p_transaction_type is null
    or p_transaction_type not in (
      'adjustment',
      'damage',
      'loss',
      'cycle_count',
      'opening_balance',
      'return',
      'receiving'
    ) then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory adjustment requires a valid reason.';
  end if;

  if coalesce(p_reference_type, 'Manual Adjustment') not in (
    'Manual Adjustment',
    'Purchase Order',
    'Customer Return'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory adjustment reference type is not valid.';
  end if;

  insert into public.transaction_idempotency_keys (workflow, request_key, status)
  values ('inventory_adjustment', p_request_key, 'processing')
  on conflict (workflow, request_key) do nothing;

  select *
  into v_existing
  from public.transaction_idempotency_keys
  where workflow = 'inventory_adjustment'
    and request_key = p_request_key
  for update;

  if v_existing.status = 'completed' and v_existing.result is not null then
    return v_existing.result;
  end if;

  select *
  into v_item
  from public.inventory_items
  where id = p_inventory_item_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory item was not found.';
  end if;

  v_next_on_hand := v_item.on_hand_quantity + p_quantity_change;
  v_next_available := v_next_on_hand - v_item.reserved_quantity;

  if v_next_on_hand < 0 or v_next_available < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory adjustment would create negative available stock.';
  end if;

  select coalesce(cost, 0)
  into v_product_cost
  from public.products
  where id = v_item.product_id;

  update public.inventory_items
  set
    on_hand_quantity = v_next_on_hand,
    available_quantity = v_next_available,
    inventory_value = round(v_product_cost * v_next_on_hand, 2)
  where id = v_item.id;

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
  values (
    v_item.id,
    p_transaction_type,
    coalesce(p_reference_type, 'Manual Adjustment'),
    p_reference_id,
    p_quantity_change,
    v_next_on_hand,
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(nullif(trim(coalesce(p_performed_by, '')), ''), 'Admin')
  )
  returning id into v_transaction_id;

  v_result := jsonb_build_object(
    'success', true,
    'inventory_item_id', v_item.id,
    'inventory_transaction_id', v_transaction_id,
    'quantity_change', p_quantity_change,
    'on_hand_quantity', v_next_on_hand,
    'available_quantity', v_next_available
  );

  update public.transaction_idempotency_keys
  set
    status = 'completed',
    entity_id = v_transaction_id,
    result = v_result
  where workflow = 'inventory_adjustment'
    and request_key = p_request_key;

  return v_result;
end;
$$;

drop function if exists public.receive_inventory_transaction(
  text,
  uuid,
  integer,
  text,
  text,
  uuid,
  text
);

create or replace function public.receive_inventory_transaction(
  p_request_key text,
  p_inventory_item_id uuid,
  p_quantity_received integer,
  p_notes text,
  p_reference_type text,
  p_reference_id uuid,
  p_performed_by text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.transaction_idempotency_keys%rowtype;
  v_item public.inventory_items%rowtype;
  v_product_cost numeric(10, 2) := 0;
  v_next_on_hand integer;
  v_next_available integer;
  v_next_incoming integer;
  v_transaction_id uuid;
  v_result jsonb;
begin
  if p_request_key is null or length(trim(p_request_key)) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Missing inventory receiving request key.';
  end if;

  if p_inventory_item_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory receiving requires an inventory item.';
  end if;

  if p_quantity_received is null or p_quantity_received <= 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Quantity received must be greater than zero.';
  end if;

  if coalesce(p_reference_type, 'Purchase Order') not in (
    'Purchase Order',
    'Manual Adjustment'
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory receiving reference type is not valid.';
  end if;

  insert into public.transaction_idempotency_keys (workflow, request_key, status)
  values ('inventory_receiving', p_request_key, 'processing')
  on conflict (workflow, request_key) do nothing;

  select *
  into v_existing
  from public.transaction_idempotency_keys
  where workflow = 'inventory_receiving'
    and request_key = p_request_key
  for update;

  if v_existing.status = 'completed' and v_existing.result is not null then
    return v_existing.result;
  end if;

  select *
  into v_item
  from public.inventory_items
  where id = p_inventory_item_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory item was not found.';
  end if;

  v_next_on_hand := v_item.on_hand_quantity + p_quantity_received;
  v_next_available := v_next_on_hand - v_item.reserved_quantity;
  v_next_incoming := greatest(v_item.incoming_quantity - p_quantity_received, 0);

  if v_next_available < 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory receiving would create invalid available stock.';
  end if;

  select coalesce(cost, 0)
  into v_product_cost
  from public.products
  where id = v_item.product_id;

  update public.inventory_items
  set
    on_hand_quantity = v_next_on_hand,
    available_quantity = v_next_available,
    incoming_quantity = v_next_incoming,
    inventory_value = round(v_product_cost * v_next_on_hand, 2)
  where id = v_item.id;

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
  values (
    v_item.id,
    'receiving',
    coalesce(p_reference_type, 'Purchase Order'),
    p_reference_id,
    p_quantity_received,
    v_next_on_hand,
    nullif(trim(coalesce(p_notes, '')), ''),
    coalesce(nullif(trim(coalesce(p_performed_by, '')), ''), 'Admin')
  )
  returning id into v_transaction_id;

  v_result := jsonb_build_object(
    'success', true,
    'inventory_item_id', v_item.id,
    'inventory_transaction_id', v_transaction_id,
    'quantity_received', p_quantity_received,
    'on_hand_quantity', v_next_on_hand,
    'available_quantity', v_next_available,
    'incoming_quantity', v_next_incoming
  );

  update public.transaction_idempotency_keys
  set
    status = 'completed',
    entity_id = v_transaction_id,
    result = v_result
  where workflow = 'inventory_receiving'
    and request_key = p_request_key;

  return v_result;
end;
$$;

revoke all on function public.adjust_inventory_transaction(
  text,
  uuid,
  integer,
  text,
  text,
  text,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.adjust_inventory_transaction(
  text,
  uuid,
  integer,
  text,
  text,
  text,
  uuid,
  text
) to service_role;

revoke all on function public.receive_inventory_transaction(
  text,
  uuid,
  integer,
  text,
  text,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.receive_inventory_transaction(
  text,
  uuid,
  integer,
  text,
  text,
  uuid,
  text
) to service_role;
