-- Launch Readiness Phase F.4 Transactional Database Hardening.
-- Do not execute automatically from the application.
-- Review manually before running in development.
--
-- Purpose:
-- - Prepare transaction-safe database functions for POS sale completion,
--   return completion/restock, and shipment creation.
-- - These functions are intended to be called only by server-side code using
--   the Supabase service-role boundary after staff authentication and
--   application permission checks.
-- - This migration does not change live application behavior by itself.
--
-- Security:
-- - Functions use SECURITY DEFINER with explicit search_path.
-- - Tables are schema-qualified.
-- - Execute is revoked from PUBLIC, anon, and authenticated.
-- - Execute is granted only to service_role for future server-side RPC use.

create table if not exists public.transaction_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  workflow text not null,
  request_key text not null,
  status text not null default 'processing',
  entity_id uuid,
  result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workflow, request_key),
  constraint transaction_idempotency_keys_workflow_check check (
    workflow in ('pos_sale', 'return_completion', 'shipment_creation')
  ),
  constraint transaction_idempotency_keys_status_check check (
    status in ('processing', 'completed', 'failed')
  )
);

create index if not exists transaction_idempotency_keys_workflow_idx
on public.transaction_idempotency_keys(workflow);

drop trigger if exists set_transaction_idempotency_keys_updated_at
on public.transaction_idempotency_keys;

create trigger set_transaction_idempotency_keys_updated_at
before update on public.transaction_idempotency_keys
for each row execute function public.set_updated_at();

drop function if exists public.complete_pos_sale_transaction(
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  jsonb
);

create or replace function public.complete_pos_sale_transaction(
  p_request_key text,
  p_customer_id uuid,
  p_inventory_location_id uuid,
  p_cashier_name text,
  p_payment_method text,
  p_discount_type text,
  p_discount_value numeric,
  p_tax_rate numeric,
  p_amount_tendered numeric,
  p_notes text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.transaction_idempotency_keys%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_receipt_number text;
  v_receipt_id uuid;
  v_item jsonb;
  v_product record;
  v_inventory record;
  v_brand_name text;
  v_quantity integer;
  v_line_subtotal_cents bigint;
  v_subtotal_cents bigint := 0;
  v_discount_cents bigint := 0;
  v_tax_cents bigint := 0;
  v_total_cents bigint := 0;
  v_amount_tendered_cents bigint;
  v_change_due_cents bigint := 0;
  v_discount_allocated_cents bigint := 0;
  v_tax_allocated_cents bigint := 0;
  v_line_discount_cents bigint;
  v_line_tax_cents bigint;
  v_line_total_cents bigint;
  v_item_index integer := 0;
  v_item_count integer;
  v_next_on_hand integer;
  v_next_available integer;
  v_result jsonb;
begin
  if p_request_key is null or length(trim(p_request_key)) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Missing POS transaction request key.';
  end if;

  insert into public.transaction_idempotency_keys (workflow, request_key, status)
  values ('pos_sale', p_request_key, 'processing')
  on conflict (workflow, request_key) do nothing;

  select *
  into v_existing
  from public.transaction_idempotency_keys
  where workflow = 'pos_sale'
    and request_key = p_request_key
  for update;

  if v_existing.status = 'completed' and v_existing.result is not null then
    return v_existing.result;
  end if;

  if v_existing.status = 'processing' and v_existing.entity_id is not null then
    raise exception using
      errcode = 'P0001',
      message = 'POS transaction is already processing.';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'POS cart cannot be empty.';
  end if;

  if p_payment_method not in ('cash', 'card', 'zelle', 'other') then
    raise exception using
      errcode = 'P0001',
      message = 'Payment method is not available.';
  end if;

  perform 1
  from public.inventory_locations
  where id = p_inventory_location_id
    and active = true;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'Inventory location was not found.';
  end if;

  v_item_count := jsonb_array_length(p_items);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::integer, 0);

    if v_quantity <= 0 then
      raise exception using
        errcode = 'P0001',
        message = 'Every cart quantity must be greater than 0.';
    end if;

    select p.id, p.name, p.sku, p.price, p.cost, p.active, p.status,
           p.available_in_store, b.name as brand_name
    into v_product
    from public.products p
    left join public.brands b on b.id = p.brand_id
    where p.id = (v_item->>'product_id')::uuid;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'Product was not found.';
    end if;

    if v_product.active is not true
      or v_product.status <> 'active'
      or v_product.available_in_store is not true then
      raise exception using
        errcode = 'P0001',
        message = 'Product is not active for in-store sales.';
    end if;

    select *
    into v_inventory
    from public.inventory_items
    where product_id = v_product.id
      and location_id = p_inventory_location_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'Product is not stocked at the selected location.';
    end if;

    if v_inventory.available_quantity < v_quantity then
      raise exception using
        errcode = 'P0001',
        message = 'Not enough stock available.';
    end if;

    v_subtotal_cents :=
      v_subtotal_cents + round(coalesce(v_product.price, 0) * 100)::bigint * v_quantity;
  end loop;

  if p_discount_type = 'percentage' then
    v_discount_cents := round(v_subtotal_cents * greatest(p_discount_value, 0) / 100)::bigint;
  elsif p_discount_type = 'fixed' then
    v_discount_cents := round(greatest(p_discount_value, 0) * 100)::bigint;
  else
    v_discount_cents := 0;
  end if;

  v_discount_cents := least(v_discount_cents, v_subtotal_cents);
  v_tax_cents := round(greatest(v_subtotal_cents - v_discount_cents, 0) * greatest(p_tax_rate, 0) / 100)::bigint;
  v_total_cents := greatest(v_subtotal_cents - v_discount_cents, 0) + v_tax_cents;
  v_amount_tendered_cents := round(greatest(p_amount_tendered, 0) * 100)::bigint;

  if v_amount_tendered_cents < v_total_cents then
    raise exception using
      errcode = 'P0001',
      message = 'Amount tendered must cover the sale total.';
  end if;

  if p_payment_method = 'cash' then
    v_change_due_cents := v_amount_tendered_cents - v_total_cents;
  end if;

  select 'ASH-ORD-' || lpad(
    (
      coalesce(
        max(nullif(regexp_replace(order_number, '\D', '', 'g'), '')::integer),
        0
      ) + 1
    )::text,
    6,
    '0'
  )
  into v_order_number
  from public.orders
  where order_number like 'ASH-ORD-%';

  insert into public.orders (
    order_number,
    customer_id,
    sales_channel,
    order_status,
    payment_status,
    subtotal,
    discount_total,
    tax_total,
    grand_total,
    notes
  )
  values (
    v_order_number,
    p_customer_id,
    'POS',
    'completed',
    'paid',
    (v_subtotal_cents::numeric / 100),
    (v_discount_cents::numeric / 100),
    (v_tax_cents::numeric / 100),
    (v_total_cents::numeric / 100),
    concat_ws(
      ' | ',
      nullif(trim(coalesce(p_notes, '')), ''),
      'Cashier: ' || coalesce(nullif(trim(p_cashier_name), ''), 'Admin'),
      'Amount tendered: ' || to_char(v_amount_tendered_cents::numeric / 100, 'FM9999999990.00'),
      'Change due: ' || to_char(v_change_due_cents::numeric / 100, 'FM9999999990.00')
    )
  )
  returning id into v_order_id;

  update public.transaction_idempotency_keys
  set entity_id = v_order_id
  where workflow = 'pos_sale'
    and request_key = p_request_key;

  v_item_index := 0;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_index := v_item_index + 1;
    v_quantity := coalesce((v_item->>'quantity')::integer, 0);

    select p.id, p.name, p.sku, p.price, p.cost, b.name as brand_name
    into v_product
    from public.products p
    left join public.brands b on b.id = p.brand_id
    where p.id = (v_item->>'product_id')::uuid;

    select *
    into v_inventory
    from public.inventory_items
    where product_id = v_product.id
      and location_id = p_inventory_location_id
    for update;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'Product is not stocked at the selected location.';
    end if;

    v_line_subtotal_cents := round(coalesce(v_product.price, 0) * 100)::bigint * v_quantity;

    if v_item_index = v_item_count then
      v_line_discount_cents := v_discount_cents - v_discount_allocated_cents;
      v_line_tax_cents := v_tax_cents - v_tax_allocated_cents;
    elsif v_subtotal_cents > 0 then
      v_line_discount_cents := round(v_discount_cents * v_line_subtotal_cents::numeric / v_subtotal_cents)::bigint;
      v_line_tax_cents := round(v_tax_cents * v_line_subtotal_cents::numeric / v_subtotal_cents)::bigint;
    else
      v_line_discount_cents := 0;
      v_line_tax_cents := 0;
    end if;

    v_discount_allocated_cents := v_discount_allocated_cents + v_line_discount_cents;
    v_tax_allocated_cents := v_tax_allocated_cents + v_line_tax_cents;
    v_line_total_cents := v_line_subtotal_cents - v_line_discount_cents + v_line_tax_cents;

    insert into public.order_items (
      order_id,
      product_id,
      sku,
      product_name,
      brand_name,
      quantity,
      unit_price,
      discount,
      tax,
      line_total
    )
    values (
      v_order_id,
      v_product.id,
      v_product.sku,
      v_product.name,
      v_product.brand_name,
      v_quantity,
      coalesce(v_product.price, 0),
      (v_line_discount_cents::numeric / 100),
      (v_line_tax_cents::numeric / 100),
      (v_line_total_cents::numeric / 100)
    );

    v_next_on_hand := v_inventory.on_hand_quantity - v_quantity;
    v_next_available := v_next_on_hand - v_inventory.reserved_quantity;

    if v_next_on_hand < 0 or v_next_available < 0 then
      raise exception using
        errcode = 'P0001',
        message = 'Inventory deduction would make stock negative.';
    end if;

    update public.inventory_items
    set
      on_hand_quantity = v_next_on_hand,
      available_quantity = v_next_available,
      inventory_value = round(coalesce(v_product.cost, 0) * v_next_on_hand, 2)
    where id = v_inventory.id;

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
      v_inventory.id,
      'sale',
      'POS',
      v_order_id,
      -v_quantity,
      v_next_on_hand,
      'POS sale ' || v_order_number,
      coalesce(nullif(trim(p_cashier_name), ''), 'Admin')
    );
  end loop;

  insert into public.payments (
    order_id,
    payment_method,
    amount,
    reference_number,
    payment_status,
    received_at
  )
  values (
    v_order_id,
    p_payment_method,
    (v_total_cents::numeric / 100),
    case
      when p_payment_method = 'cash'
      then 'Tendered '
        || to_char(v_amount_tendered_cents::numeric / 100, 'FM9999999990.00')
        || '; Change '
        || to_char(v_change_due_cents::numeric / 100, 'FM9999999990.00')
      else null
    end,
    'paid',
    now()
  );

  select 'ASH-' || lpad(
    (
      coalesce(
        max(nullif(regexp_replace(receipt_number, '\D', '', 'g'), '')::integer),
        0
      ) + 1
    )::text,
    6,
    '0'
  )
  into v_receipt_number
  from public.receipts
  where receipt_number like 'ASH-%';

  insert into public.receipts (order_id, receipt_number, printed, emailed)
  values (v_order_id, v_receipt_number, false, false)
  returning id into v_receipt_id;

  insert into public.audit_logs (staff_user_id, action, entity_type, entity_id, details)
  values (
    null,
    'pos_sale_completed',
    'order',
    v_order_id,
    jsonb_build_object(
      'order_number', v_order_number,
      'receipt_number', v_receipt_number,
      'total', v_total_cents::numeric / 100
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'receipt_number', v_receipt_number,
    'payment_status', 'paid',
    'subtotal', v_subtotal_cents::numeric / 100,
    'discount_amount', v_discount_cents::numeric / 100,
    'tax_amount', v_tax_cents::numeric / 100,
    'total', v_total_cents::numeric / 100,
    'amount_tendered', v_amount_tendered_cents::numeric / 100,
    'change_due', v_change_due_cents::numeric / 100
  );

  update public.transaction_idempotency_keys
  set status = 'completed',
      result = v_result
  where workflow = 'pos_sale'
    and request_key = p_request_key;

  return v_result;
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = coalesce(sqlerrm, 'POS sale transaction failed.');
end;
$$;

drop function if exists public.complete_return_transaction(text, uuid, jsonb);

create or replace function public.complete_return_transaction(
  p_request_key text,
  p_return_id uuid,
  p_completion jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.transaction_idempotency_keys%rowtype;
  v_return public.returns%rowtype;
  v_item public.return_items%rowtype;
  v_restock jsonb;
  v_condition text;
  v_should_restock boolean;
  v_inventory record;
  v_next_on_hand integer;
  v_next_available integer;
  v_refund_method text;
  v_refund_amount numeric(10, 2);
  v_store_credit_amount numeric(10, 2);
  v_credit_number text;
  v_completion_note text;
  v_result jsonb;
begin
  if p_request_key is not null and length(trim(p_request_key)) > 0 then
    insert into public.transaction_idempotency_keys (workflow, request_key, status, entity_id)
    values ('return_completion', p_request_key, 'processing', p_return_id)
    on conflict (workflow, request_key) do nothing;

    select *
    into v_existing
    from public.transaction_idempotency_keys
    where workflow = 'return_completion'
      and request_key = p_request_key
    for update;

    if v_existing.status = 'completed' and v_existing.result is not null then
      return v_existing.result;
    end if;
  end if;

  select *
  into v_return
  from public.returns
  where id = p_return_id
  for update;

  if v_return.id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Return was not found.';
  end if;

  if v_return.status in ('completed', 'cancelled') then
    raise exception using
      errcode = 'P0001',
      message = 'Return cannot be completed from its current status.';
  end if;

  if v_return.status <> 'received' then
    raise exception using
      errcode = 'P0001',
      message = 'Return must be received before completion.';
  end if;

  if exists (
    select 1
    from public.inventory_transactions
    where transaction_type = 'return'
      and reference_type = 'Customer Return'
      and reference_id = p_return_id
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'This return already has restoration ledger rows.';
  end if;

  v_completion_note := coalesce(p_completion->>'notes', 'Return completed.');

  for v_item in
    select *
    from public.return_items
    where return_id = p_return_id
    order by created_at asc
  loop
    select value
    into v_restock
    from jsonb_array_elements(coalesce(p_completion->'restockItems', '[]'::jsonb)) as value
    where (value->>'return_item_id')::uuid = v_item.id
    limit 1;

    v_condition := coalesce(v_restock->>'condition', v_item.condition);
    v_should_restock :=
      coalesce((v_restock->>'restock')::boolean, false)
      and v_condition in ('unopened', 'sellable');

    if v_should_restock then
      select ii.*, p.cost
      into v_inventory
      from public.inventory_transactions it
      join public.inventory_items ii on ii.id = it.inventory_item_id
      left join public.products p on p.id = ii.product_id
      where it.reference_type = 'POS'
        and it.reference_id = v_return.order_id
        and it.transaction_type = 'sale'
        and ii.product_id = v_item.product_id
      order by it.created_at desc
      limit 1
      for update of ii;

      if not found then
        raise exception using
          errcode = 'P0001',
          message = 'Original inventory item was not found for return.';
      end if;

      v_next_on_hand := v_inventory.on_hand_quantity + v_item.quantity;
      v_next_available := v_next_on_hand - v_inventory.reserved_quantity;

      update public.inventory_items
      set
        on_hand_quantity = v_next_on_hand,
        available_quantity = v_next_available,
        inventory_value = round(coalesce(v_inventory.cost, 0) * v_next_on_hand, 2)
      where id = v_inventory.id;

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
        v_inventory.id,
        'return',
        'Customer Return',
        p_return_id,
        v_item.quantity,
        v_next_on_hand,
        'Return ' || v_return.return_number || ' / condition ' || v_condition,
        'Admin'
      );
    end if;
  end loop;

  if v_return.return_type = 'refund' then
    v_refund_method := coalesce(p_completion #>> '{refund,refund_method}', '');
    v_refund_amount := coalesce((p_completion #>> '{refund,amount}')::numeric, null);

    if v_refund_method = '' or v_refund_amount is null then
      raise exception using
        errcode = 'P0001',
        message = 'Refund method and amount are required.';
    end if;

    if v_refund_amount < 0 or v_refund_amount > v_return.refund_total then
      raise exception using
        errcode = 'P0001',
        message = 'Refund amount cannot exceed eligible return value.';
    end if;

    insert into public.payments (
      order_id,
      payment_method,
      amount,
      reference_number,
      payment_status,
      received_at
    )
    values (
      v_return.order_id,
      case when v_refund_method = 'card' then 'card'
           when v_refund_method = 'cash' then 'cash'
           else 'other'
      end,
      round(v_refund_amount, 2),
      'Administrative refund for ' || v_return.return_number || '. No external payment processing performed.',
      'refunded',
      now()
    );

    v_completion_note :=
      v_completion_note || ' Refund method: ' || v_refund_method
      || '. Amount: ' || to_char(v_refund_amount, 'FM9999999990.00') || '.';
  elsif v_return.return_type = 'store_credit' then
    v_store_credit_amount :=
      coalesce((p_completion #>> '{storeCredit,amount}')::numeric, v_return.refund_total);

    if v_store_credit_amount <= 0 or v_store_credit_amount > v_return.refund_total then
      raise exception using
        errcode = 'P0001',
        message = 'Store credit amount cannot exceed eligible return value.';
    end if;

    v_credit_number := 'ASH-CR-' || regexp_replace(v_return.return_number, '^ASH-RET-', '');

    insert into public.gift_cards (
      gift_card_number,
      initial_balance,
      current_balance,
      status,
      issued_to_customer_id
    )
    values (
      v_credit_number,
      round(v_store_credit_amount, 2),
      round(v_store_credit_amount, 2),
      'active',
      v_return.customer_id
    );

    v_completion_note :=
      v_completion_note || ' Store credit issued: ' || v_credit_number
      || ' for ' || to_char(v_store_credit_amount, 'FM9999999990.00') || '.';
  elsif v_return.return_type = 'exchange' then
    insert into public.audit_logs (staff_user_id, action, entity_type, entity_id, details)
    values (
      null,
      'exchange_completed',
      'return',
      p_return_id,
      coalesce(p_completion->'exchange', '{}'::jsonb)
    );
  end if;

  update public.returns
  set
    status = 'completed',
    notes = concat_ws(
      E'\n',
      notes,
      '[' || now()::text || '] ' || v_completion_note
    )
  where id = p_return_id;

  insert into public.audit_logs (staff_user_id, action, entity_type, entity_id, details)
  values (
    null,
    'return_completed',
    'return',
    p_return_id,
    jsonb_build_object(
      'return_type', v_return.return_type,
      'refund_total', v_return.refund_total
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'return_id', p_return_id,
    'return_number', v_return.return_number,
    'status', 'completed'
  );

  if p_request_key is not null and length(trim(p_request_key)) > 0 then
    update public.transaction_idempotency_keys
    set status = 'completed',
        result = v_result
    where workflow = 'return_completion'
      and request_key = p_request_key;
  end if;

  return v_result;
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = coalesce(sqlerrm, 'Return completion transaction failed.');
end;
$$;

drop function if exists public.finalize_shipment_transaction(
  text,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  jsonb,
  jsonb,
  jsonb,
  text
);

create or replace function public.finalize_shipment_transaction(
  p_request_key text,
  p_order_id uuid,
  p_fulfillment_type text,
  p_shipping_origin_id uuid,
  p_carrier text,
  p_service_level text,
  p_tracking_number text,
  p_tracking_url text,
  p_shipping_cost numeric,
  p_items jsonb,
  p_ship_to jsonb,
  p_packages jsonb,
  p_notes text
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.transaction_idempotency_keys%rowtype;
  v_order public.orders%rowtype;
  v_origin public.shipping_origins%rowtype;
  v_order_item public.order_items%rowtype;
  v_item jsonb;
  v_package jsonb;
  v_already_fulfilled integer;
  v_remaining integer;
  v_quantity integer;
  v_shipment_id uuid;
  v_shipment_number text;
  v_package_count integer;
  v_result jsonb;
begin
  if p_request_key is null or length(trim(p_request_key)) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Missing shipment request key.';
  end if;

  insert into public.transaction_idempotency_keys (workflow, request_key, status)
  values ('shipment_creation', p_request_key, 'processing')
  on conflict (workflow, request_key) do nothing;

  select *
  into v_existing
  from public.transaction_idempotency_keys
  where workflow = 'shipment_creation'
    and request_key = p_request_key
  for update;

  if v_existing.status = 'completed' and v_existing.result is not null then
    return v_existing.result;
  end if;

  select *
  into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception using
      errcode = 'P0001',
      message = 'Order was not found.';
  end if;

  if v_order.order_status = 'cancelled' then
    raise exception using
      errcode = 'P0001',
      message = 'Cancelled orders cannot be fulfilled.';
  end if;

  if p_fulfillment_type not in ('shipping', 'local_pickup') then
    raise exception using
      errcode = 'P0001',
      message = 'Unsupported fulfillment type.';
  end if;

  if p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Select at least one item to fulfill.';
  end if;

  if p_fulfillment_type = 'shipping' then
    select *
    into v_origin
    from public.shipping_origins
    where id = p_shipping_origin_id
    for update;

    if v_origin.id is null or v_origin.active is not true then
      raise exception using
        errcode = 'P0001',
        message = 'Ship From origin was not found or is inactive.';
    end if;

    if v_origin.address1 = ''
      or v_origin.city = ''
      or v_origin.state = ''
      or v_origin.postal_code = ''
      or v_origin.country = '' then
      raise exception using
        errcode = 'P0001',
        message = 'Ship From origin is incomplete.';
    end if;

    if p_ship_to is null
      or coalesce(p_ship_to->>'address1', '') = ''
      or coalesce(p_ship_to->>'city', '') = ''
      or coalesce(p_ship_to->>'postal_code', '') = ''
      or coalesce(p_ship_to->>'country', '') = '' then
      raise exception using
        errcode = 'P0001',
        message = 'Shipping address requires address, city, postal code, and country.';
    end if;

    if p_carrier is null or length(trim(p_carrier)) = 0 then
      raise exception using
        errcode = 'P0001',
        message = 'Select a carrier.';
    end if;

    if p_packages is null
      or jsonb_typeof(p_packages) <> 'array'
      or jsonb_array_length(p_packages) = 0 then
      raise exception using
        errcode = 'P0001',
        message = 'At least one package is required for shipping.';
    end if;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::integer, 0);

    if v_quantity <= 0 then
      raise exception using
        errcode = 'P0001',
        message = 'Shipment item quantities must be positive whole numbers.';
    end if;

    select *
    into v_order_item
    from public.order_items
    where id = (v_item->>'order_item_id')::uuid
      and order_id = p_order_id
    for update;

    if v_order_item.id is null then
      raise exception using
        errcode = 'P0001',
        message = 'Shipment item does not belong to the order.';
    end if;

    select coalesce(sum(si.quantity), 0)
    into v_already_fulfilled
    from public.shipment_items si
    join public.shipments s on s.id = si.shipment_id
    where si.order_item_id = v_order_item.id
      and s.shipment_status <> 'cancelled';

    v_remaining := v_order_item.quantity - coalesce(v_already_fulfilled, 0);

    if v_quantity > v_remaining then
      raise exception using
        errcode = 'P0001',
        message = 'Shipment quantity cannot exceed remaining fulfillable quantity.';
    end if;
  end loop;

  select 'ASH-SHP-' || lpad(
    (
      coalesce(
        max(nullif(regexp_replace(shipment_number, '\D', '', 'g'), '')::integer),
        0
      ) + 1
    )::text,
    6,
    '0'
  )
  into v_shipment_number
  from public.shipments
  where shipment_number like 'ASH-SHP-%';

  v_package_count :=
    case
      when p_fulfillment_type = 'shipping'
      then greatest(jsonb_array_length(p_packages), 1)
      else 1
    end;

  insert into public.shipments (
    shipment_number,
    order_id,
    shipping_origin_id,
    shipment_status,
    fulfillment_type,
    carrier,
    service_level,
    tracking_number,
    tracking_url,
    shipping_cost,
    package_count,
    notes
  )
  values (
    v_shipment_number,
    p_order_id,
    case when p_fulfillment_type = 'shipping' then p_shipping_origin_id else null end,
    'pending',
    p_fulfillment_type,
    p_carrier,
    p_service_level,
    p_tracking_number,
    p_tracking_url,
    round(greatest(coalesce(p_shipping_cost, 0), 0), 2),
    v_package_count,
    p_notes
  )
  returning id into v_shipment_id;

  update public.transaction_idempotency_keys
  set entity_id = v_shipment_id
  where workflow = 'shipment_creation'
    and request_key = p_request_key;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.shipment_items (shipment_id, order_item_id, quantity)
    values (
      v_shipment_id,
      (v_item->>'order_item_id')::uuid,
      (v_item->>'quantity')::integer
    );
  end loop;

  if p_fulfillment_type = 'shipping' then
    insert into public.shipment_addresses (
      shipment_id,
      address_role,
      first_name,
      last_name,
      company,
      address1,
      address2,
      city,
      state,
      postal_code,
      country,
      phone,
      email
    )
    values (
      v_shipment_id,
      'ship_from',
      v_origin.contact_first_name,
      v_origin.contact_last_name,
      v_origin.company_name,
      v_origin.address1,
      v_origin.address2,
      v_origin.city,
      v_origin.state,
      v_origin.postal_code,
      v_origin.country,
      v_origin.phone,
      v_origin.email
    ),
    (
      v_shipment_id,
      'ship_to',
      p_ship_to->>'first_name',
      p_ship_to->>'last_name',
      p_ship_to->>'company',
      p_ship_to->>'address1',
      p_ship_to->>'address2',
      p_ship_to->>'city',
      p_ship_to->>'state',
      p_ship_to->>'postal_code',
      p_ship_to->>'country',
      p_ship_to->>'phone',
      p_ship_to->>'email'
    );

    for v_package in select * from jsonb_array_elements(p_packages)
    loop
      insert into public.shipment_packages (
        shipment_id,
        package_number,
        length_in,
        width_in,
        height_in,
        weight_lb,
        package_type,
        label_url
      )
      values (
        v_shipment_id,
        coalesce(nullif(v_package->>'package_number', ''), 'PKG-01'),
        nullif(v_package->>'length_in', '')::numeric,
        nullif(v_package->>'width_in', '')::numeric,
        nullif(v_package->>'height_in', '')::numeric,
        nullif(v_package->>'weight_lb', '')::numeric,
        nullif(v_package->>'package_type', ''),
        nullif(v_package->>'label_url', '')
      );
    end loop;
  end if;

  insert into public.shipment_events (
    shipment_id,
    event_type,
    status,
    location,
    description,
    event_time
  )
  values (
    v_shipment_id,
    'shipment_created',
    'pending',
    null,
    case
      when p_fulfillment_type = 'local_pickup'
      then 'Local pickup created.'
      else 'Shipment created.'
    end,
    now()
  );

  insert into public.audit_logs (staff_user_id, action, entity_type, entity_id, details)
  values (
    null,
    'shipment_created',
    'shipment',
    v_shipment_id,
    jsonb_build_object(
      'shipment_number', v_shipment_number,
      'order_id', p_order_id,
      'fulfillment_type', p_fulfillment_type
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'shipment_id', v_shipment_id,
    'shipment_number', v_shipment_number,
    'status', 'pending'
  );

  update public.transaction_idempotency_keys
  set status = 'completed',
      result = v_result
  where workflow = 'shipment_creation'
    and request_key = p_request_key;

  return v_result;
exception
  when others then
    raise exception using
      errcode = 'P0001',
      message = coalesce(sqlerrm, 'Shipment transaction failed.');
end;
$$;

revoke execute on function public.complete_pos_sale_transaction(
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  jsonb
) from public, anon, authenticated;

revoke execute on function public.complete_return_transaction(text, uuid, jsonb)
from public, anon, authenticated;

revoke execute on function public.finalize_shipment_transaction(
  text,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  jsonb,
  jsonb,
  jsonb,
  text
) from public, anon, authenticated;

grant execute on function public.complete_pos_sale_transaction(
  text,
  uuid,
  uuid,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  text,
  jsonb
) to service_role;

grant execute on function public.complete_return_transaction(text, uuid, jsonb)
to service_role;

grant execute on function public.finalize_shipment_transaction(
  text,
  uuid,
  text,
  uuid,
  text,
  text,
  text,
  text,
  numeric,
  jsonb,
  jsonb,
  jsonb,
  text
) to service_role;

-- Manual rollback, if this prepared migration is reviewed and later applied:
--
-- revoke execute on function public.complete_pos_sale_transaction(
--   text, uuid, uuid, text, text, text, numeric, numeric, numeric, text, jsonb
-- ) from service_role;
-- revoke execute on function public.complete_return_transaction(text, uuid, jsonb)
-- from service_role;
-- revoke execute on function public.finalize_shipment_transaction(
--   text, uuid, text, uuid, text, text, text, text, numeric, jsonb, jsonb, jsonb, text
-- ) from service_role;
-- drop function if exists public.complete_pos_sale_transaction(
--   text, uuid, uuid, text, text, text, numeric, numeric, numeric, text, jsonb
-- );
-- drop function if exists public.complete_return_transaction(text, uuid, jsonb);
-- drop function if exists public.finalize_shipment_transaction(
--   text, uuid, text, uuid, text, text, text, text, numeric, jsonb, jsonb, jsonb, text
-- );
-- drop table if exists public.transaction_idempotency_keys;
