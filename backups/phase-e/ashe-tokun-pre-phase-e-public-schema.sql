


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."complete_pos_sale_transaction"("p_request_key" "text", "p_customer_id" "uuid", "p_inventory_location_id" "uuid", "p_cashier_name" "text", "p_payment_method" "text", "p_discount_type" "text", "p_discount_value" numeric, "p_tax_rate" numeric, "p_amount_tendered" numeric, "p_notes" "text", "p_items" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
declare
  v_existing public.transaction_idempotency_keys%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_receipt_number text;
  v_item jsonb;
  v_product record;
  v_inventory record;
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

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'Product was not found.';
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
  values (v_order_id, v_receipt_number, false, false);

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
      message = 'POS sale transaction failed.';
end;
$$;


ALTER FUNCTION "public"."complete_pos_sale_transaction"("p_request_key" "text", "p_customer_id" "uuid", "p_inventory_location_id" "uuid", "p_cashier_name" "text", "p_payment_method" "text", "p_discount_type" "text", "p_discount_value" numeric, "p_tax_rate" numeric, "p_amount_tendered" numeric, "p_notes" "text", "p_items" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_return_transaction"("p_request_key" "text", "p_return_id" "uuid", "p_completion" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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

  if not found then
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
    v_restock := null;

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
      message = 'Return completion transaction failed.';
end;
$$;


ALTER FUNCTION "public"."complete_return_transaction"("p_request_key" "text", "p_return_id" "uuid", "p_completion" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_shipment_transaction"("p_request_key" "text", "p_order_id" "uuid", "p_fulfillment_type" "text", "p_shipping_origin_id" "uuid", "p_carrier" "text", "p_service_level" "text", "p_tracking_number" "text", "p_tracking_url" "text", "p_shipping_cost" numeric, "p_items" "jsonb", "p_ship_to" "jsonb", "p_packages" "jsonb", "p_notes" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
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

  if not found then
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

    if not found or v_origin.active is not true then
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

    if not found then
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
      message = 'Shipment transaction failed.';
end;
$$;


ALTER FUNCTION "public"."finalize_shipment_transaction"("p_request_key" "text", "p_order_id" "uuid", "p_fulfillment_type" "text", "p_shipping_origin_id" "uuid", "p_carrier" "text", "p_service_level" "text", "p_tracking_number" "text", "p_tracking_url" "text", "p_shipping_cost" numeric, "p_items" "jsonb", "p_ship_to" "jsonb", "p_packages" "jsonb", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_staff_shift"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
declare
  period_row public.staff_schedule_periods%rowtype;
  staff_row public.staff_members%rowtype;
  overlap_exists boolean;
  time_off_exists boolean;
begin
  select * into period_row
  from public.staff_schedule_periods
  where id = new.schedule_period_id;

  if not found then
    raise exception 'Schedule period not found.';
  end if;

  if period_row.status = 'archived' then
    raise exception 'Archived schedules are read-only.';
  end if;

  if new.shift_date < period_row.start_date or new.shift_date > period_row.end_date then
    raise exception 'Shift date must be inside the schedule period.';
  end if;

  select * into staff_row
  from public.staff_members
  where id = new.staff_member_id;

  if not found then
    raise exception 'Staff member not found.';
  end if;

  if not staff_row.active or staff_row.employment_status <> 'active' then
    raise exception 'Inactive or archived staff cannot receive new shifts.';
  end if;

  select exists (
    select 1
    from public.staff_shifts existing
    where existing.staff_member_id = new.staff_member_id
      and existing.shift_date = new.shift_date
      and existing.status in ('scheduled', 'confirmed')
      and existing.id <> coalesce(new.id, gen_random_uuid())
      and new.start_time < existing.end_time
      and new.end_time > existing.start_time
  ) into overlap_exists;

  if overlap_exists and new.status in ('scheduled', 'confirmed') then
    raise exception 'Overlapping active shift exists for this employee.';
  end if;

  select exists (
    select 1
    from public.staff_time_off_requests request
    where request.staff_member_id = new.staff_member_id
      and request.status = 'approved'
      and new.shift_date between request.start_date and request.end_date
      and (
        not request.partial_day
        or request.start_time is null
        or request.end_time is null
        or new.start_time < request.end_time
        and new.end_time > request.start_time
      )
  ) into time_off_exists;

  if time_off_exists and new.status in ('scheduled', 'confirmed') then
    raise exception 'Approved time off blocks this shift.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_staff_shift"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "logo_url" "text",
    "website" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "parent_category_id" "uuid",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "featured" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consignment_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "supplier_id" "uuid",
    "brand_id" "uuid",
    "name" "text" NOT NULL,
    "commission_rate" numeric(10,4) DEFAULT 0 NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."consignment_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consignment_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consignment_account_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "ownership_status" "text" DEFAULT 'consigned'::"text" NOT NULL,
    "commission_rate" numeric(10,4) DEFAULT 0 NOT NULL,
    "payout_status" "text" DEFAULT 'not_due'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "consignment_items_ownership_status_check" CHECK (("ownership_status" = ANY (ARRAY['consigned'::"text", 'purchased'::"text", 'returned_to_owner'::"text"]))),
    CONSTRAINT "consignment_items_payout_status_check" CHECK (("payout_status" = ANY (ARRAY['not_due'::"text", 'due'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."consignment_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "address_type" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "company" "text",
    "address1" "text" NOT NULL,
    "address2" "text",
    "city" "text" NOT NULL,
    "state" "text",
    "postal_code" "text",
    "country" "text" NOT NULL,
    "default_address" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."customer_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_number" "text" NOT NULL,
    "customer_type" "text" DEFAULT 'walk_in'::"text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "company_name" "text",
    "email" "text",
    "phone" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customers_customer_type_check" CHECK (("customer_type" = ANY (ARRAY['walk_in'::"text", 'registered'::"text", 'wholesale'::"text", 'vip'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text",
    "name" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "value" numeric(10,2) DEFAULT 0 NOT NULL,
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "discounts_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['amount'::"text", 'percent'::"text"])))
);


ALTER TABLE "public"."discounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gift_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gift_card_number" "text" NOT NULL,
    "initial_balance" numeric(10,2) DEFAULT 0 NOT NULL,
    "current_balance" numeric(10,2) DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "issued_to_customer_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "gift_cards_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'redeemed'::"text", 'expired'::"text", 'disabled'::"text"])))
);


ALTER TABLE "public"."gift_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "on_hand_quantity" integer DEFAULT 0 NOT NULL,
    "reserved_quantity" integer DEFAULT 0 NOT NULL,
    "available_quantity" integer DEFAULT 0 NOT NULL,
    "incoming_quantity" integer DEFAULT 0 NOT NULL,
    "reorder_level" integer DEFAULT 0 NOT NULL,
    "inventory_value" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_items_available_quantity_check" CHECK (("available_quantity" = ("on_hand_quantity" - "reserved_quantity"))),
    CONSTRAINT "inventory_items_quantities_check" CHECK ((("on_hand_quantity" >= 0) AND ("reserved_quantity" >= 0) AND ("available_quantity" >= 0) AND ("incoming_quantity" >= 0) AND ("reorder_level" >= 0)))
);


ALTER TABLE "public"."inventory_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "description" "text",
    "location_type" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."inventory_locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "inventory_item_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "reference_type" "text" NOT NULL,
    "reference_id" "uuid",
    "quantity_change" integer NOT NULL,
    "balance_after" integer NOT NULL,
    "notes" "text",
    "performed_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "inventory_transactions_reference_type_check" CHECK (("reference_type" = ANY (ARRAY['POS'::"text", 'Online Order'::"text", 'Purchase Order'::"text", 'Manual Adjustment'::"text", 'Inventory Transfer'::"text", 'Customer Return'::"text"]))),
    CONSTRAINT "inventory_transactions_type_check" CHECK (("transaction_type" = ANY (ARRAY['sale'::"text", 'return'::"text", 'receiving'::"text", 'adjustment'::"text", 'transfer_in'::"text", 'transfer_out'::"text", 'damage'::"text", 'loss'::"text", 'cycle_count'::"text", 'opening_balance'::"text"])))
);


ALTER TABLE "public"."inventory_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "filename" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "public_url" "text",
    "asset_type" "text" NOT NULL,
    "mime_type" "text",
    "file_extension" "text",
    "file_size_bytes" bigint,
    "width" integer,
    "height" integer,
    "duration_seconds" numeric(10,2),
    "brand_id" "uuid",
    "uploaded_by" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "media_assets_asset_type_check" CHECK (("asset_type" = ANY (ARRAY['product_image'::"text", 'gallery_image'::"text", 'thumbnail'::"text", 'brand_logo'::"text", 'banner'::"text", 'icon'::"text", 'svg'::"text", 'lightburn_project'::"text", 'fusion360_file'::"text", 'stl'::"text", '3mf'::"text", 'pdf'::"text", 'manual'::"text", 'certificate'::"text", 'video'::"text", 'marketing'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."media_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "media_asset_id" "uuid" NOT NULL,
    "usage_type" "text" NOT NULL,
    "reference_table" "text",
    "reference_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "media_usage_usage_type_check" CHECK (("usage_type" = ANY (ARRAY['product'::"text", 'collection'::"text", 'brand'::"text", 'homepage'::"text", 'banner'::"text", 'marketing'::"text", 'production'::"text", 'documentation'::"text"])))
);


ALTER TABLE "public"."media_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "sku" "text",
    "product_name" "text" NOT NULL,
    "brand_name" "text",
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax" numeric(10,2) DEFAULT 0 NOT NULL,
    "line_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "customer_id" "uuid",
    "sales_channel" "text" NOT NULL,
    "order_status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "discount_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "grand_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "orders_order_status_check" CHECK (("order_status" = ANY (ARRAY['draft'::"text", 'completed'::"text", 'cancelled'::"text", 'refunded'::"text", 'held'::"text"]))),
    CONSTRAINT "orders_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'partially_paid'::"text", 'refunded'::"text"]))),
    CONSTRAINT "orders_sales_channel_check" CHECK (("sales_channel" = ANY (ARRAY['POS'::"text", 'Website'::"text", 'Manual'::"text", 'Phone'::"text", 'Marketplace'::"text", 'Mobile'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "payment_method" "text" NOT NULL,
    "amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "reference_number" "text",
    "payment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "received_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payments_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['cash'::"text", 'card'::"text", 'zelle'::"text", 'other'::"text", 'split'::"text"]))),
    CONSTRAINT "payments_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'partially_paid'::"text", 'refunded'::"text"])))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payroll_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payroll_period_id" "uuid",
    "payroll_period_employee_id" "uuid",
    "actor_staff_id" "uuid",
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."payroll_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payroll_period_employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payroll_period_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "regular_minutes" integer DEFAULT 0 NOT NULL,
    "overtime_minutes" integer DEFAULT 0 NOT NULL,
    "total_minutes" integer DEFAULT 0 NOT NULL,
    "approved_timecard_count" integer DEFAULT 0 NOT NULL,
    "pending_timecard_count" integer DEFAULT 0 NOT NULL,
    "incomplete_timecard_count" integer DEFAULT 0 NOT NULL,
    "payroll_notes" "text",
    "reviewed_by_staff_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "approved_by_staff_id" "uuid",
    "approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payroll_period_employees_minutes_check" CHECK ((("regular_minutes" >= 0) AND ("overtime_minutes" >= 0) AND ("total_minutes" = ("regular_minutes" + "overtime_minutes")) AND ("approved_timecard_count" >= 0) AND ("pending_timecard_count" >= 0) AND ("incomplete_timecard_count" >= 0))),
    CONSTRAINT "payroll_period_employees_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'incomplete'::"text", 'ready'::"text", 'reviewed'::"text", 'approved'::"text", 'excluded'::"text"])))
);


ALTER TABLE "public"."payroll_period_employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payroll_period_timecards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payroll_period_id" "uuid" NOT NULL,
    "payroll_period_employee_id" "uuid" NOT NULL,
    "timecard_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "regular_minutes" integer DEFAULT 0 NOT NULL,
    "overtime_minutes" integer DEFAULT 0 NOT NULL,
    "total_minutes" integer DEFAULT 0 NOT NULL,
    "included" boolean DEFAULT true NOT NULL,
    "exclusion_reason" "text",
    "captured_timecard_status" "text" NOT NULL,
    "captured_approved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payroll_period_timecards_minutes_check" CHECK ((("regular_minutes" >= 0) AND ("overtime_minutes" >= 0) AND ("total_minutes" = ("regular_minutes" + "overtime_minutes"))))
);


ALTER TABLE "public"."payroll_period_timecards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payroll_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "period_name" "text" NOT NULL,
    "period_type" "text" DEFAULT 'weekly'::"text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by_staff_id" "uuid",
    "approved_by_staff_id" "uuid",
    "approved_at" timestamp with time zone,
    "notes" "text",
    "closed_by_staff_id" "uuid",
    "closed_at" timestamp with time zone,
    "pay_date" "date",
    "location_id" "uuid",
    CONSTRAINT "payroll_periods_date_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "payroll_periods_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'processing'::"text", 'approved'::"text", 'closed'::"text", 'reopened'::"text"]))),
    CONSTRAINT "payroll_periods_type_check" CHECK (("period_type" = ANY (ARRAY['weekly'::"text", 'bi_weekly'::"text", 'semi_monthly'::"text", 'monthly'::"text"])))
);


ALTER TABLE "public"."payroll_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_collections" (
    "product_id" "uuid" NOT NULL,
    "collection_id" "uuid" NOT NULL
);


ALTER TABLE "public"."product_collections" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "media_asset_id" "uuid" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "alt_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "supplier_id" "uuid",
    "category_id" "uuid" NOT NULL,
    "tradition_id" "uuid",
    "product_type_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "short_description" "text",
    "description" "text",
    "sku" "text" NOT NULL,
    "barcode" "text" NOT NULL,
    "vendor_sku" "text",
    "price" numeric(10,2) DEFAULT 0 NOT NULL,
    "compare_at_price" numeric(10,2),
    "cost" numeric(10,2),
    "weight" numeric(10,2),
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "featured" boolean DEFAULT false NOT NULL,
    "new_arrival" boolean DEFAULT false NOT NULL,
    "available_online" boolean DEFAULT true NOT NULL,
    "available_in_store" boolean DEFAULT true NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "products_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'active'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purchase_order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "description" "text" NOT NULL,
    "sku" "text",
    "quantity_ordered" integer DEFAULT 0 NOT NULL,
    "quantity_received" integer DEFAULT 0 NOT NULL,
    "unit_cost" numeric(10,2) DEFAULT 0 NOT NULL,
    "line_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "po_number" "text" NOT NULL,
    "supplier_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "tax_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "shipping_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "grand_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "purchase_orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'ordered'::"text", 'partially_received'::"text", 'received'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receipts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "receipt_number" "text" NOT NULL,
    "printed" boolean DEFAULT false NOT NULL,
    "emailed" boolean DEFAULT false NOT NULL,
    "printed_at" timestamp with time zone,
    "emailed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."receipts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receiving_record_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "receiving_record_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "sku" "text",
    "description" "text" NOT NULL,
    "quantity_received" integer DEFAULT 0 NOT NULL,
    "unit_cost" numeric(10,2),
    "inventory_location_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."receiving_record_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."receiving_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "purchase_order_id" "uuid",
    "supplier_id" "uuid",
    "received_by" "text",
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."receiving_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."return_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_id" "uuid" NOT NULL,
    "order_item_id" "uuid",
    "product_id" "uuid",
    "sku" "text",
    "product_name" "text" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "reason" "text",
    "condition" "text",
    "refund_amount" numeric(10,2) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."return_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."returns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "return_number" "text" NOT NULL,
    "order_id" "uuid",
    "customer_id" "uuid",
    "return_type" "text" NOT NULL,
    "status" "text" DEFAULT 'requested'::"text" NOT NULL,
    "refund_total" numeric(10,2) DEFAULT 0 NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "returns_return_type_check" CHECK (("return_type" = ANY (ARRAY['refund'::"text", 'exchange'::"text", 'store_credit'::"text"]))),
    CONSTRAINT "returns_status_check" CHECK (("status" = ANY (ARRAY['requested'::"text", 'approved'::"text", 'received'::"text", 'completed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."returns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipment_addresses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shipment_id" "uuid" NOT NULL,
    "address_role" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "company" "text",
    "address1" "text" NOT NULL,
    "address2" "text",
    "city" "text" NOT NULL,
    "state" "text",
    "postal_code" "text",
    "country" "text" NOT NULL,
    "phone" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shipment_addresses_role_check" CHECK (("address_role" = ANY (ARRAY['ship_from'::"text", 'ship_to'::"text"])))
);


ALTER TABLE "public"."shipment_addresses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipment_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shipment_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "status" "text" NOT NULL,
    "location" "text",
    "description" "text",
    "event_time" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shipment_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipment_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shipment_id" "uuid" NOT NULL,
    "order_item_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "shipment_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."shipment_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipment_packages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shipment_id" "uuid" NOT NULL,
    "package_number" "text" NOT NULL,
    "length_in" numeric(10,2),
    "width_in" numeric(10,2),
    "height_in" numeric(10,2),
    "weight_lb" numeric(10,2),
    "package_type" "text",
    "label_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shipment_packages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shipment_number" "text" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "shipment_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "fulfillment_type" "text" DEFAULT 'shipping'::"text" NOT NULL,
    "carrier" "text",
    "service_level" "text",
    "tracking_number" "text",
    "tracking_url" "text",
    "shipping_cost" numeric(10,2) DEFAULT 0 NOT NULL,
    "package_count" integer DEFAULT 1 NOT NULL,
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shipping_origin_id" "uuid",
    CONSTRAINT "shipments_fulfillment_type_check" CHECK (("fulfillment_type" = ANY (ARRAY['shipping'::"text", 'local_pickup'::"text"]))),
    CONSTRAINT "shipments_package_count_check" CHECK (("package_count" >= 1)),
    CONSTRAINT "shipments_shipping_cost_check" CHECK (("shipping_cost" >= (0)::numeric)),
    CONSTRAINT "shipments_status_check" CHECK (("shipment_status" = ANY (ARRAY['pending'::"text", 'ready'::"text", 'packed'::"text", 'shipped'::"text", 'in_transit'::"text", 'delivered'::"text", 'cancelled'::"text", 'exception'::"text"])))
);


ALTER TABLE "public"."shipments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shipping_origins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "company_name" "text" NOT NULL,
    "contact_first_name" "text",
    "contact_last_name" "text",
    "address1" "text" NOT NULL,
    "address2" "text",
    "city" "text" NOT NULL,
    "state" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "country" "text" DEFAULT 'US'::"text" NOT NULL,
    "phone" "text",
    "email" "text",
    "active" boolean DEFAULT true NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."shipping_origins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_auth_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_member_id" "uuid",
    "employee_number" "text",
    "event_type" "text" NOT NULL,
    "success" boolean DEFAULT false NOT NULL,
    "ip_address" "text",
    "user_agent" "text",
    "failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_auth_events_event_type_check" CHECK (("event_type" = ANY (ARRAY['login_success'::"text", 'login_failed'::"text", 'logout'::"text", 'session_expired'::"text", 'session_revoked'::"text", 'pin_reset'::"text", 'pin_changed'::"text", 'account_locked'::"text", 'account_unlocked'::"text", 'employee_deactivated'::"text", 'employee_reactivated'::"text", 'employee_archived'::"text"])))
);


ALTER TABLE "public"."staff_auth_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_availability" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "weekday" integer NOT NULL,
    "available" boolean DEFAULT true NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "notes" "text",
    "effective_from" "date",
    "effective_until" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_availability_effective_dates_check" CHECK ((("effective_until" IS NULL) OR ("effective_from" IS NULL) OR ("effective_until" >= "effective_from"))),
    CONSTRAINT "staff_availability_time_check" CHECK (((NOT "available") OR ("start_time" IS NULL) OR ("end_time" IS NULL) OR ("end_time" > "start_time"))),
    CONSTRAINT "staff_availability_weekday_check" CHECK ((("weekday" >= 0) AND ("weekday" <= 6)))
);


ALTER TABLE "public"."staff_availability" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_number" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "display_name" "text",
    "pin_hash" "text" NOT NULL,
    "role" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "assigned_location_id" "uuid",
    "failed_login_attempts" integer DEFAULT 0 NOT NULL,
    "locked_until" timestamp with time zone,
    "last_login_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "employment_status" "text" DEFAULT 'active'::"text" NOT NULL,
    "must_change_pin" boolean DEFAULT true NOT NULL,
    "pin_changed_at" timestamp with time zone,
    "archived_at" timestamp with time zone,
    "archive_reason" "text",
    "terminated_at" timestamp with time zone,
    "termination_reason" "text",
    "sessions_revoked_at" timestamp with time zone,
    "created_by_staff_id" "uuid",
    "updated_by_staff_id" "uuid",
    "business_title" "text",
    CONSTRAINT "staff_members_employment_status_check" CHECK (("employment_status" = ANY (ARRAY['active'::"text", 'on_leave'::"text", 'resigned'::"text", 'terminated'::"text", 'retired'::"text", 'archived'::"text"]))),
    CONSTRAINT "staff_members_failed_login_attempts_check" CHECK (("failed_login_attempts" >= 0)),
    CONSTRAINT "staff_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'managing_partner'::"text", 'store_manager'::"text", 'assistant_manager'::"text", 'manager'::"text", 'cashier'::"text", 'inventory'::"text", 'fulfillment'::"text", 'customer_service'::"text", 'accounting'::"text", 'marketing_ecommerce'::"text"])))
);


ALTER TABLE "public"."staff_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_permission_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "permission_key" "text" NOT NULL,
    "granted" boolean NOT NULL,
    "changed_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_permission_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_punches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timecard_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "shift_id" "uuid",
    "location_id" "uuid",
    "punch_type" "text" NOT NULL,
    "punched_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" DEFAULT 'staff_portal'::"text" NOT NULL,
    "created_by_staff_id" "uuid",
    "corrected_from_punch_id" "uuid",
    "is_correction" boolean DEFAULT false NOT NULL,
    "correction_reason" "text",
    "device_name" "text",
    "ip_address" "text",
    "user_agent" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_punches_correction_reason_check" CHECK ((("is_correction" = false) OR ("correction_reason" IS NOT NULL))),
    CONSTRAINT "staff_punches_source_check" CHECK (("source" = ANY (ARRAY['staff_portal'::"text", 'admin'::"text", 'kiosk'::"text", 'system_correction'::"text"]))),
    CONSTRAINT "staff_punches_type_check" CHECK (("punch_type" = ANY (ARRAY['clock_in'::"text", 'break_out'::"text", 'break_in'::"text", 'clock_out'::"text", 'manual_in'::"text", 'manual_break_out'::"text", 'manual_break_in'::"text", 'manual_out'::"text"])))
);


ALTER TABLE "public"."staff_punches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_schedule_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_period_id" "uuid",
    "shift_id" "uuid",
    "staff_member_id" "uuid",
    "actor_staff_id" "uuid",
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_schedule_events_type_check" CHECK (("event_type" = ANY (ARRAY['schedule_created'::"text", 'schedule_updated'::"text", 'schedule_published'::"text", 'schedule_archived'::"text", 'shift_created'::"text", 'shift_updated'::"text", 'shift_cancelled'::"text", 'shift_reassigned'::"text", 'availability_updated'::"text", 'time_off_requested'::"text", 'time_off_approved'::"text", 'time_off_denied'::"text"])))
);


ALTER TABLE "public"."staff_schedule_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_schedule_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "location_id" "uuid",
    "notes" "text",
    "published_at" timestamp with time zone,
    "published_by_staff_id" "uuid",
    "created_by_staff_id" "uuid",
    "updated_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_schedule_periods_dates_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "staff_schedule_periods_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."staff_schedule_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "session_token_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_activity_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "revoked_at" timestamp with time zone,
    "revoked_reason" "text",
    "ip_address" "text",
    "user_agent" "text",
    "device_name" "text"
);


ALTER TABLE "public"."staff_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_shifts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_period_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "location_id" "uuid",
    "shift_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "unpaid_break_minutes" integer DEFAULT 0 NOT NULL,
    "role_label" "text",
    "department_label" "text",
    "notes" "text",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "created_by_staff_id" "uuid",
    "updated_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_shifts_break_check" CHECK (("unpaid_break_minutes" >= 0)),
    CONSTRAINT "staff_shifts_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'confirmed'::"text", 'cancelled'::"text", 'completed'::"text", 'no_show'::"text"]))),
    CONSTRAINT "staff_shifts_time_check" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."staff_shifts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_time_off_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "request_type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "partial_day" boolean DEFAULT false NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reviewed_by_staff_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_time_off_requests_dates_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "staff_time_off_requests_partial_time_check" CHECK (((NOT "partial_day") OR ("start_time" IS NULL) OR ("end_time" IS NULL) OR ("end_time" > "start_time"))),
    CONSTRAINT "staff_time_off_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'denied'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "staff_time_off_requests_type_check" CHECK (("request_type" = ANY (ARRAY['vacation'::"text", 'sick'::"text", 'personal'::"text", 'unpaid'::"text", 'bereavement'::"text", 'jury_duty'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."staff_time_off_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_timecard_exceptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timecard_id" "uuid" NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "exception_type" "text" NOT NULL,
    "severity" "text" DEFAULT 'warning'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "related_punch_id" "uuid",
    "description" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by_staff_id" "uuid",
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_timecard_exceptions_severity_check" CHECK (("severity" = ANY (ARRAY['info'::"text", 'warning'::"text", 'critical'::"text"]))),
    CONSTRAINT "staff_timecard_exceptions_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text", 'dismissed'::"text"]))),
    CONSTRAINT "staff_timecard_exceptions_type_check" CHECK (("exception_type" = ANY (ARRAY['late_arrival'::"text", 'early_arrival'::"text", 'early_departure'::"text", 'late_departure'::"text", 'missed_clock_in'::"text", 'missed_clock_out'::"text", 'missed_break_out'::"text", 'missed_break_in'::"text", 'excessive_break'::"text", 'short_break'::"text", 'unscheduled_work'::"text", 'outside_schedule'::"text", 'overlapping_punch'::"text", 'invalid_punch_sequence'::"text", 'time_off_conflict'::"text", 'no_scheduled_shift'::"text", 'excessive_shift_duration'::"text"])))
);


ALTER TABLE "public"."staff_timecard_exceptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_timecards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "staff_member_id" "uuid" NOT NULL,
    "work_date" "date" NOT NULL,
    "shift_id" "uuid",
    "location_id" "uuid",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "scheduled_start_time" time without time zone,
    "scheduled_end_time" time without time zone,
    "scheduled_break_minutes" integer DEFAULT 0 NOT NULL,
    "regular_minutes" integer DEFAULT 0 NOT NULL,
    "overtime_minutes" integer DEFAULT 0 NOT NULL,
    "unpaid_break_minutes" integer DEFAULT 0 NOT NULL,
    "exception_count" integer DEFAULT 0 NOT NULL,
    "employee_notes" "text",
    "manager_notes" "text",
    "submitted_at" timestamp with time zone,
    "submitted_by_staff_id" "uuid",
    "approved_at" timestamp with time zone,
    "approved_by_staff_id" "uuid",
    "reopened_at" timestamp with time zone,
    "reopened_by_staff_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "staff_timecards_minutes_check" CHECK ((("scheduled_break_minutes" >= 0) AND ("regular_minutes" >= 0) AND ("overtime_minutes" >= 0) AND ("unpaid_break_minutes" >= 0) AND ("exception_count" >= 0))),
    CONSTRAINT "staff_timecards_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'incomplete'::"text", 'pending_review'::"text", 'approved'::"text", 'reopened'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."staff_timecards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_timekeeper_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timecard_id" "uuid",
    "punch_id" "uuid",
    "staff_member_id" "uuid",
    "actor_staff_id" "uuid",
    "event_type" "text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_timekeeper_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."staff_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "display_name" "text" NOT NULL,
    "email" "text",
    "role" "text" NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."staff_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "contact_name" "text",
    "email" "text",
    "phone" "text",
    "website" "text",
    "notes" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tax_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "rate" numeric(10,4) DEFAULT 0 NOT NULL,
    "state" "text",
    "city" "text",
    "county" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tax_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."traditions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."traditions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_idempotency_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow" "text" NOT NULL,
    "request_key" "text" NOT NULL,
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "entity_id" "uuid",
    "result" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "transaction_idempotency_keys_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "transaction_idempotency_keys_workflow_check" CHECK (("workflow" = ANY (ARRAY['pos_sale'::"text", 'return_completion'::"text", 'shipment_creation'::"text"])))
);


ALTER TABLE "public"."transaction_idempotency_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "consignment_account_id" "uuid",
    "supplier_id" "uuid",
    "brand_id" "uuid",
    "payout_number" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "subtotal" numeric(10,2) DEFAULT 0 NOT NULL,
    "adjustments" numeric(10,2) DEFAULT 0 NOT NULL,
    "total" numeric(10,2) DEFAULT 0 NOT NULL,
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "vendor_payouts_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'due'::"text", 'paid'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."vendor_payouts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."consignment_accounts"
    ADD CONSTRAINT "consignment_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consignment_items"
    ADD CONSTRAINT "consignment_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_customer_number_key" UNIQUE ("customer_number");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift_cards"
    ADD CONSTRAINT "gift_cards_gift_card_number_key" UNIQUE ("gift_card_number");



ALTER TABLE ONLY "public"."gift_cards"
    ADD CONSTRAINT "gift_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_product_id_location_id_key" UNIQUE ("product_id", "location_id");



ALTER TABLE ONLY "public"."inventory_locations"
    ADD CONSTRAINT "inventory_locations_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."inventory_locations"
    ADD CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media_usage"
    ADD CONSTRAINT "media_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_events"
    ADD CONSTRAINT "payroll_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_period_employees"
    ADD CONSTRAINT "payroll_period_employees_payroll_period_id_staff_member_id_key" UNIQUE ("payroll_period_id", "staff_member_id");



ALTER TABLE ONLY "public"."payroll_period_employees"
    ADD CONSTRAINT "payroll_period_employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_period_timecards"
    ADD CONSTRAINT "payroll_period_timecards_payroll_period_id_timecard_id_key" UNIQUE ("payroll_period_id", "timecard_id");



ALTER TABLE ONLY "public"."payroll_period_timecards"
    ADD CONSTRAINT "payroll_period_timecards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_periods"
    ADD CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_collections"
    ADD CONSTRAINT "product_collections_pkey" PRIMARY KEY ("product_id", "collection_id");



ALTER TABLE ONLY "public"."product_media"
    ADD CONSTRAINT "product_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_media"
    ADD CONSTRAINT "product_media_product_id_media_asset_id_key" UNIQUE ("product_id", "media_asset_id");



ALTER TABLE ONLY "public"."product_types"
    ADD CONSTRAINT "product_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_types"
    ADD CONSTRAINT "product_types_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_barcode_key" UNIQUE ("barcode");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_po_number_key" UNIQUE ("po_number");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_receipt_number_key" UNIQUE ("receipt_number");



ALTER TABLE ONLY "public"."receiving_record_items"
    ADD CONSTRAINT "receiving_record_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."receiving_records"
    ADD CONSTRAINT "receiving_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_return_number_key" UNIQUE ("return_number");



ALTER TABLE ONLY "public"."shipment_addresses"
    ADD CONSTRAINT "shipment_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipment_events"
    ADD CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipment_items"
    ADD CONSTRAINT "shipment_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipment_packages"
    ADD CONSTRAINT "shipment_packages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "shipments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "shipments_shipment_number_key" UNIQUE ("shipment_number");



ALTER TABLE ONLY "public"."shipping_origins"
    ADD CONSTRAINT "shipping_origins_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."shipping_origins"
    ADD CONSTRAINT "shipping_origins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_auth_events"
    ADD CONSTRAINT "staff_auth_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_availability"
    ADD CONSTRAINT "staff_availability_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_availability"
    ADD CONSTRAINT "staff_availability_staff_member_id_weekday_available_start__key" UNIQUE ("staff_member_id", "weekday", "available", "start_time", "end_time", "effective_from", "effective_until");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_employee_number_key" UNIQUE ("employee_number");



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_permission_assignments"
    ADD CONSTRAINT "staff_permission_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_permission_assignments"
    ADD CONSTRAINT "staff_permission_assignments_staff_member_id_permission_key_key" UNIQUE ("staff_member_id", "permission_key");



ALTER TABLE ONLY "public"."staff_punches"
    ADD CONSTRAINT "staff_punches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_schedule_events"
    ADD CONSTRAINT "staff_schedule_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_schedule_periods"
    ADD CONSTRAINT "staff_schedule_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_sessions"
    ADD CONSTRAINT "staff_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_sessions"
    ADD CONSTRAINT "staff_sessions_session_token_hash_key" UNIQUE ("session_token_hash");



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "staff_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_time_off_requests"
    ADD CONSTRAINT "staff_time_off_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_timecard_exceptions"
    ADD CONSTRAINT "staff_timecard_exceptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_timecards"
    ADD CONSTRAINT "staff_timecards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_timecards"
    ADD CONSTRAINT "staff_timecards_staff_member_id_work_date_key" UNIQUE ("staff_member_id", "work_date");



ALTER TABLE ONLY "public"."staff_timekeeper_events"
    ADD CONSTRAINT "staff_timekeeper_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."staff_users"
    ADD CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."tax_rates"
    ADD CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."traditions"
    ADD CONSTRAINT "traditions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."traditions"
    ADD CONSTRAINT "traditions_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."transaction_idempotency_keys"
    ADD CONSTRAINT "transaction_idempotency_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_idempotency_keys"
    ADD CONSTRAINT "transaction_idempotency_keys_workflow_request_key_key" UNIQUE ("workflow", "request_key");



ALTER TABLE ONLY "public"."vendor_payouts"
    ADD CONSTRAINT "vendor_payouts_payout_number_key" UNIQUE ("payout_number");



ALTER TABLE ONLY "public"."vendor_payouts"
    ADD CONSTRAINT "vendor_payouts_pkey" PRIMARY KEY ("id");



CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs" USING "btree" ("created_at");



CREATE INDEX "audit_logs_staff_user_id_idx" ON "public"."audit_logs" USING "btree" ("staff_user_id");



CREATE INDEX "brands_slug_idx" ON "public"."brands" USING "btree" ("slug");



CREATE INDEX "categories_slug_idx" ON "public"."categories" USING "btree" ("slug");



CREATE INDEX "collections_slug_idx" ON "public"."collections" USING "btree" ("slug");



CREATE INDEX "consignment_accounts_brand_id_idx" ON "public"."consignment_accounts" USING "btree" ("brand_id");



CREATE INDEX "consignment_accounts_created_at_idx" ON "public"."consignment_accounts" USING "btree" ("created_at");



CREATE INDEX "consignment_accounts_supplier_id_idx" ON "public"."consignment_accounts" USING "btree" ("supplier_id");



CREATE INDEX "consignment_items_consignment_account_id_idx" ON "public"."consignment_items" USING "btree" ("consignment_account_id");



CREATE INDEX "consignment_items_product_id_idx" ON "public"."consignment_items" USING "btree" ("product_id");



CREATE INDEX "customer_addresses_customer_id_idx" ON "public"."customer_addresses" USING "btree" ("customer_id");



CREATE INDEX "discounts_code_idx" ON "public"."discounts" USING "btree" ("code");



CREATE INDEX "discounts_created_at_idx" ON "public"."discounts" USING "btree" ("created_at");



CREATE INDEX "gift_cards_created_at_idx" ON "public"."gift_cards" USING "btree" ("created_at");



CREATE INDEX "gift_cards_gift_card_number_idx" ON "public"."gift_cards" USING "btree" ("gift_card_number");



CREATE INDEX "gift_cards_issued_to_customer_id_idx" ON "public"."gift_cards" USING "btree" ("issued_to_customer_id");



CREATE INDEX "inventory_items_location_id_idx" ON "public"."inventory_items" USING "btree" ("location_id");



CREATE INDEX "inventory_items_product_id_idx" ON "public"."inventory_items" USING "btree" ("product_id");



CREATE INDEX "inventory_transactions_created_at_idx" ON "public"."inventory_transactions" USING "btree" ("created_at");



CREATE INDEX "inventory_transactions_type_idx" ON "public"."inventory_transactions" USING "btree" ("transaction_type");



CREATE INDEX "media_assets_asset_type_idx" ON "public"."media_assets" USING "btree" ("asset_type");



CREATE INDEX "media_assets_brand_id_idx" ON "public"."media_assets" USING "btree" ("brand_id");



CREATE INDEX "media_assets_created_at_idx" ON "public"."media_assets" USING "btree" ("created_at");



CREATE INDEX "media_assets_filename_idx" ON "public"."media_assets" USING "btree" ("filename");



CREATE INDEX "media_usage_created_at_idx" ON "public"."media_usage" USING "btree" ("created_at");



CREATE INDEX "media_usage_media_asset_id_idx" ON "public"."media_usage" USING "btree" ("media_asset_id");



CREATE INDEX "order_items_order_id_idx" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "order_items_product_id_idx" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "orders_created_at_idx" ON "public"."orders" USING "btree" ("created_at");



CREATE INDEX "orders_customer_id_idx" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "orders_order_number_idx" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "orders_payment_status_idx" ON "public"."orders" USING "btree" ("payment_status");



CREATE INDEX "orders_sales_channel_idx" ON "public"."orders" USING "btree" ("sales_channel");



CREATE INDEX "payments_created_at_idx" ON "public"."payments" USING "btree" ("created_at");



CREATE INDEX "payments_order_id_idx" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "payments_payment_status_idx" ON "public"."payments" USING "btree" ("payment_status");



CREATE INDEX "payroll_events_actor_staff_id_idx" ON "public"."payroll_events" USING "btree" ("actor_staff_id");



CREATE INDEX "payroll_events_created_at_idx" ON "public"."payroll_events" USING "btree" ("created_at");



CREATE INDEX "payroll_events_employee_id_idx" ON "public"."payroll_events" USING "btree" ("payroll_period_employee_id");



CREATE INDEX "payroll_events_event_type_idx" ON "public"."payroll_events" USING "btree" ("event_type");



CREATE INDEX "payroll_events_period_id_idx" ON "public"."payroll_events" USING "btree" ("payroll_period_id");



CREATE INDEX "payroll_period_employees_approved_at_idx" ON "public"."payroll_period_employees" USING "btree" ("approved_at");



CREATE INDEX "payroll_period_employees_period_id_idx" ON "public"."payroll_period_employees" USING "btree" ("payroll_period_id");



CREATE INDEX "payroll_period_employees_staff_member_id_idx" ON "public"."payroll_period_employees" USING "btree" ("staff_member_id");



CREATE INDEX "payroll_period_employees_status_idx" ON "public"."payroll_period_employees" USING "btree" ("status");



CREATE INDEX "payroll_period_timecards_employee_id_idx" ON "public"."payroll_period_timecards" USING "btree" ("payroll_period_employee_id");



CREATE INDEX "payroll_period_timecards_included_idx" ON "public"."payroll_period_timecards" USING "btree" ("included");



CREATE INDEX "payroll_period_timecards_period_id_idx" ON "public"."payroll_period_timecards" USING "btree" ("payroll_period_id");



CREATE INDEX "payroll_period_timecards_timecard_id_idx" ON "public"."payroll_period_timecards" USING "btree" ("timecard_id");



CREATE INDEX "payroll_period_timecards_work_date_idx" ON "public"."payroll_period_timecards" USING "btree" ("work_date");



CREATE INDEX "payroll_periods_end_date_idx" ON "public"."payroll_periods" USING "btree" ("end_date");



CREATE INDEX "payroll_periods_location_id_idx" ON "public"."payroll_periods" USING "btree" ("location_id");



CREATE INDEX "payroll_periods_pay_date_idx" ON "public"."payroll_periods" USING "btree" ("pay_date");



CREATE INDEX "payroll_periods_period_type_idx" ON "public"."payroll_periods" USING "btree" ("period_type");



CREATE INDEX "payroll_periods_start_date_idx" ON "public"."payroll_periods" USING "btree" ("start_date");



CREATE INDEX "payroll_periods_status_idx" ON "public"."payroll_periods" USING "btree" ("status");



CREATE INDEX "product_media_media_asset_id_idx" ON "public"."product_media" USING "btree" ("media_asset_id");



CREATE UNIQUE INDEX "product_media_one_primary_per_product_idx" ON "public"."product_media" USING "btree" ("product_id") WHERE ("is_primary" = true);



CREATE INDEX "product_media_product_id_idx" ON "public"."product_media" USING "btree" ("product_id");



CREATE INDEX "product_types_slug_idx" ON "public"."product_types" USING "btree" ("slug");



CREATE INDEX "products_barcode_idx" ON "public"."products" USING "btree" ("barcode");



CREATE INDEX "products_brand_id_idx" ON "public"."products" USING "btree" ("brand_id");



CREATE INDEX "products_category_id_idx" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "products_product_type_id_idx" ON "public"."products" USING "btree" ("product_type_id");



CREATE INDEX "products_sku_idx" ON "public"."products" USING "btree" ("sku");



CREATE INDEX "products_slug_idx" ON "public"."products" USING "btree" ("slug");



CREATE INDEX "products_supplier_id_idx" ON "public"."products" USING "btree" ("supplier_id");



CREATE INDEX "purchase_order_items_product_id_idx" ON "public"."purchase_order_items" USING "btree" ("product_id");



CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "public"."purchase_order_items" USING "btree" ("purchase_order_id");



CREATE INDEX "purchase_orders_created_at_idx" ON "public"."purchase_orders" USING "btree" ("created_at");



CREATE INDEX "purchase_orders_supplier_id_idx" ON "public"."purchase_orders" USING "btree" ("supplier_id");



CREATE INDEX "receipts_created_at_idx" ON "public"."receipts" USING "btree" ("created_at");



CREATE INDEX "receipts_order_id_idx" ON "public"."receipts" USING "btree" ("order_id");



CREATE INDEX "receipts_receipt_number_idx" ON "public"."receipts" USING "btree" ("receipt_number");



CREATE INDEX "receiving_record_items_inventory_location_id_idx" ON "public"."receiving_record_items" USING "btree" ("inventory_location_id");



CREATE INDEX "receiving_record_items_product_id_idx" ON "public"."receiving_record_items" USING "btree" ("product_id");



CREATE INDEX "receiving_record_items_receiving_record_id_idx" ON "public"."receiving_record_items" USING "btree" ("receiving_record_id");



CREATE INDEX "receiving_records_created_at_idx" ON "public"."receiving_records" USING "btree" ("created_at");



CREATE INDEX "receiving_records_purchase_order_id_idx" ON "public"."receiving_records" USING "btree" ("purchase_order_id");



CREATE INDEX "receiving_records_supplier_id_idx" ON "public"."receiving_records" USING "btree" ("supplier_id");



CREATE INDEX "return_items_order_item_id_idx" ON "public"."return_items" USING "btree" ("order_item_id");



CREATE INDEX "return_items_product_id_idx" ON "public"."return_items" USING "btree" ("product_id");



CREATE INDEX "return_items_return_id_idx" ON "public"."return_items" USING "btree" ("return_id");



CREATE INDEX "returns_created_at_idx" ON "public"."returns" USING "btree" ("created_at");



CREATE INDEX "returns_customer_id_idx" ON "public"."returns" USING "btree" ("customer_id");



CREATE INDEX "returns_order_id_idx" ON "public"."returns" USING "btree" ("order_id");



CREATE INDEX "returns_return_number_idx" ON "public"."returns" USING "btree" ("return_number");



CREATE INDEX "shipment_addresses_shipment_id_idx" ON "public"."shipment_addresses" USING "btree" ("shipment_id");



CREATE INDEX "shipment_events_event_time_idx" ON "public"."shipment_events" USING "btree" ("event_time");



CREATE INDEX "shipment_events_shipment_id_idx" ON "public"."shipment_events" USING "btree" ("shipment_id");



CREATE INDEX "shipment_items_order_item_id_idx" ON "public"."shipment_items" USING "btree" ("order_item_id");



CREATE INDEX "shipment_items_shipment_id_idx" ON "public"."shipment_items" USING "btree" ("shipment_id");



CREATE INDEX "shipment_packages_shipment_id_idx" ON "public"."shipment_packages" USING "btree" ("shipment_id");



CREATE INDEX "shipments_created_at_idx" ON "public"."shipments" USING "btree" ("created_at");



CREATE INDEX "shipments_order_id_idx" ON "public"."shipments" USING "btree" ("order_id");



CREATE INDEX "shipments_shipment_number_idx" ON "public"."shipments" USING "btree" ("shipment_number");



CREATE INDEX "shipments_shipment_status_idx" ON "public"."shipments" USING "btree" ("shipment_status");



CREATE INDEX "shipments_shipping_origin_id_idx" ON "public"."shipments" USING "btree" ("shipping_origin_id");



CREATE INDEX "shipments_tracking_number_idx" ON "public"."shipments" USING "btree" ("tracking_number");



CREATE INDEX "shipping_origins_active_idx" ON "public"."shipping_origins" USING "btree" ("active");



CREATE INDEX "shipping_origins_code_idx" ON "public"."shipping_origins" USING "btree" ("code");



CREATE INDEX "shipping_origins_is_default_idx" ON "public"."shipping_origins" USING "btree" ("is_default");



CREATE UNIQUE INDEX "shipping_origins_one_default_idx" ON "public"."shipping_origins" USING "btree" ("is_default") WHERE ("is_default" = true);



CREATE INDEX "staff_auth_events_created_at_idx" ON "public"."staff_auth_events" USING "btree" ("created_at");



CREATE INDEX "staff_auth_events_employee_number_idx" ON "public"."staff_auth_events" USING "btree" ("employee_number");



CREATE INDEX "staff_auth_events_event_type_idx" ON "public"."staff_auth_events" USING "btree" ("event_type");



CREATE INDEX "staff_auth_events_staff_member_id_idx" ON "public"."staff_auth_events" USING "btree" ("staff_member_id");



CREATE INDEX "staff_availability_effective_from_idx" ON "public"."staff_availability" USING "btree" ("effective_from");



CREATE INDEX "staff_availability_effective_until_idx" ON "public"."staff_availability" USING "btree" ("effective_until");



CREATE INDEX "staff_availability_staff_member_id_idx" ON "public"."staff_availability" USING "btree" ("staff_member_id");



CREATE INDEX "staff_availability_weekday_idx" ON "public"."staff_availability" USING "btree" ("weekday");



CREATE INDEX "staff_members_active_idx" ON "public"."staff_members" USING "btree" ("active");



CREATE INDEX "staff_members_assigned_location_id_idx" ON "public"."staff_members" USING "btree" ("assigned_location_id");



CREATE INDEX "staff_members_employee_number_idx" ON "public"."staff_members" USING "btree" ("employee_number");



CREATE INDEX "staff_members_role_idx" ON "public"."staff_members" USING "btree" ("role");



CREATE INDEX "staff_permission_assignments_changed_by_staff_id_idx" ON "public"."staff_permission_assignments" USING "btree" ("changed_by_staff_id");



CREATE INDEX "staff_permission_assignments_permission_key_idx" ON "public"."staff_permission_assignments" USING "btree" ("permission_key");



CREATE INDEX "staff_permission_assignments_staff_member_id_idx" ON "public"."staff_permission_assignments" USING "btree" ("staff_member_id");



CREATE INDEX "staff_punches_location_id_idx" ON "public"."staff_punches" USING "btree" ("location_id");



CREATE INDEX "staff_punches_punch_type_idx" ON "public"."staff_punches" USING "btree" ("punch_type");



CREATE INDEX "staff_punches_punched_at_idx" ON "public"."staff_punches" USING "btree" ("punched_at");



CREATE INDEX "staff_punches_shift_id_idx" ON "public"."staff_punches" USING "btree" ("shift_id");



CREATE INDEX "staff_punches_staff_member_id_idx" ON "public"."staff_punches" USING "btree" ("staff_member_id");



CREATE INDEX "staff_punches_timecard_id_idx" ON "public"."staff_punches" USING "btree" ("timecard_id");



CREATE INDEX "staff_schedule_events_actor_staff_id_idx" ON "public"."staff_schedule_events" USING "btree" ("actor_staff_id");



CREATE INDEX "staff_schedule_events_created_at_idx" ON "public"."staff_schedule_events" USING "btree" ("created_at");



CREATE INDEX "staff_schedule_events_schedule_period_id_idx" ON "public"."staff_schedule_events" USING "btree" ("schedule_period_id");



CREATE INDEX "staff_schedule_events_shift_id_idx" ON "public"."staff_schedule_events" USING "btree" ("shift_id");



CREATE INDEX "staff_schedule_events_staff_member_id_idx" ON "public"."staff_schedule_events" USING "btree" ("staff_member_id");



CREATE INDEX "staff_schedule_periods_end_date_idx" ON "public"."staff_schedule_periods" USING "btree" ("end_date");



CREATE INDEX "staff_schedule_periods_location_id_idx" ON "public"."staff_schedule_periods" USING "btree" ("location_id");



CREATE INDEX "staff_schedule_periods_start_date_idx" ON "public"."staff_schedule_periods" USING "btree" ("start_date");



CREATE INDEX "staff_schedule_periods_status_idx" ON "public"."staff_schedule_periods" USING "btree" ("status");



CREATE INDEX "staff_sessions_expires_at_idx" ON "public"."staff_sessions" USING "btree" ("expires_at");



CREATE INDEX "staff_sessions_last_activity_at_idx" ON "public"."staff_sessions" USING "btree" ("last_activity_at");



CREATE INDEX "staff_sessions_revoked_at_idx" ON "public"."staff_sessions" USING "btree" ("revoked_at");



CREATE INDEX "staff_sessions_session_token_hash_idx" ON "public"."staff_sessions" USING "btree" ("session_token_hash");



CREATE INDEX "staff_sessions_staff_member_id_idx" ON "public"."staff_sessions" USING "btree" ("staff_member_id");



CREATE INDEX "staff_shifts_location_id_idx" ON "public"."staff_shifts" USING "btree" ("location_id");



CREATE INDEX "staff_shifts_schedule_period_id_idx" ON "public"."staff_shifts" USING "btree" ("schedule_period_id");



CREATE INDEX "staff_shifts_shift_date_idx" ON "public"."staff_shifts" USING "btree" ("shift_date");



CREATE INDEX "staff_shifts_staff_member_id_idx" ON "public"."staff_shifts" USING "btree" ("staff_member_id");



CREATE INDEX "staff_shifts_status_idx" ON "public"."staff_shifts" USING "btree" ("status");



CREATE INDEX "staff_time_off_requests_end_date_idx" ON "public"."staff_time_off_requests" USING "btree" ("end_date");



CREATE INDEX "staff_time_off_requests_staff_member_id_idx" ON "public"."staff_time_off_requests" USING "btree" ("staff_member_id");



CREATE INDEX "staff_time_off_requests_start_date_idx" ON "public"."staff_time_off_requests" USING "btree" ("start_date");



CREATE INDEX "staff_time_off_requests_status_idx" ON "public"."staff_time_off_requests" USING "btree" ("status");



CREATE INDEX "staff_timecard_exceptions_created_at_idx" ON "public"."staff_timecard_exceptions" USING "btree" ("created_at");



CREATE INDEX "staff_timecard_exceptions_staff_member_id_idx" ON "public"."staff_timecard_exceptions" USING "btree" ("staff_member_id");



CREATE INDEX "staff_timecard_exceptions_status_idx" ON "public"."staff_timecard_exceptions" USING "btree" ("status");



CREATE INDEX "staff_timecard_exceptions_timecard_id_idx" ON "public"."staff_timecard_exceptions" USING "btree" ("timecard_id");



CREATE INDEX "staff_timecard_exceptions_type_idx" ON "public"."staff_timecard_exceptions" USING "btree" ("exception_type");



CREATE INDEX "staff_timecards_approved_at_idx" ON "public"."staff_timecards" USING "btree" ("approved_at");



CREATE INDEX "staff_timecards_location_id_idx" ON "public"."staff_timecards" USING "btree" ("location_id");



CREATE INDEX "staff_timecards_shift_id_idx" ON "public"."staff_timecards" USING "btree" ("shift_id");



CREATE INDEX "staff_timecards_staff_member_id_idx" ON "public"."staff_timecards" USING "btree" ("staff_member_id");



CREATE INDEX "staff_timecards_status_idx" ON "public"."staff_timecards" USING "btree" ("status");



CREATE INDEX "staff_timecards_work_date_idx" ON "public"."staff_timecards" USING "btree" ("work_date");



CREATE INDEX "staff_timekeeper_events_actor_staff_id_idx" ON "public"."staff_timekeeper_events" USING "btree" ("actor_staff_id");



CREATE INDEX "staff_timekeeper_events_created_at_idx" ON "public"."staff_timekeeper_events" USING "btree" ("created_at");



CREATE INDEX "staff_timekeeper_events_punch_id_idx" ON "public"."staff_timekeeper_events" USING "btree" ("punch_id");



CREATE INDEX "staff_timekeeper_events_staff_member_id_idx" ON "public"."staff_timekeeper_events" USING "btree" ("staff_member_id");



CREATE INDEX "staff_timekeeper_events_timecard_id_idx" ON "public"."staff_timekeeper_events" USING "btree" ("timecard_id");



CREATE INDEX "staff_users_created_at_idx" ON "public"."staff_users" USING "btree" ("created_at");



CREATE INDEX "suppliers_slug_idx" ON "public"."suppliers" USING "btree" ("slug");



CREATE INDEX "tax_rates_created_at_idx" ON "public"."tax_rates" USING "btree" ("created_at");



CREATE INDEX "traditions_slug_idx" ON "public"."traditions" USING "btree" ("slug");



CREATE INDEX "transaction_idempotency_keys_workflow_idx" ON "public"."transaction_idempotency_keys" USING "btree" ("workflow");



CREATE INDEX "vendor_payouts_brand_id_idx" ON "public"."vendor_payouts" USING "btree" ("brand_id");



CREATE INDEX "vendor_payouts_consignment_account_id_idx" ON "public"."vendor_payouts" USING "btree" ("consignment_account_id");



CREATE INDEX "vendor_payouts_created_at_idx" ON "public"."vendor_payouts" USING "btree" ("created_at");



CREATE INDEX "vendor_payouts_payout_number_idx" ON "public"."vendor_payouts" USING "btree" ("payout_number");



CREATE INDEX "vendor_payouts_supplier_id_idx" ON "public"."vendor_payouts" USING "btree" ("supplier_id");



CREATE OR REPLACE TRIGGER "set_brands_updated_at" BEFORE UPDATE ON "public"."brands" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_collections_updated_at" BEFORE UPDATE ON "public"."collections" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_consignment_accounts_updated_at" BEFORE UPDATE ON "public"."consignment_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_consignment_items_updated_at" BEFORE UPDATE ON "public"."consignment_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_customer_addresses_updated_at" BEFORE UPDATE ON "public"."customer_addresses" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_discounts_updated_at" BEFORE UPDATE ON "public"."discounts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_gift_cards_updated_at" BEFORE UPDATE ON "public"."gift_cards" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_inventory_items_updated_at" BEFORE UPDATE ON "public"."inventory_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_inventory_locations_updated_at" BEFORE UPDATE ON "public"."inventory_locations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_media_assets_updated_at" BEFORE UPDATE ON "public"."media_assets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_payroll_period_employees_updated_at" BEFORE UPDATE ON "public"."payroll_period_employees" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_payroll_periods_updated_at" BEFORE UPDATE ON "public"."payroll_periods" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_product_types_updated_at" BEFORE UPDATE ON "public"."product_types" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_purchase_order_items_updated_at" BEFORE UPDATE ON "public"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_purchase_orders_updated_at" BEFORE UPDATE ON "public"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_returns_updated_at" BEFORE UPDATE ON "public"."returns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_shipment_packages_updated_at" BEFORE UPDATE ON "public"."shipment_packages" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_shipments_updated_at" BEFORE UPDATE ON "public"."shipments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_shipping_origins_updated_at" BEFORE UPDATE ON "public"."shipping_origins" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_availability_updated_at" BEFORE UPDATE ON "public"."staff_availability" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_members_updated_at" BEFORE UPDATE ON "public"."staff_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_permission_assignments_updated_at" BEFORE UPDATE ON "public"."staff_permission_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_schedule_periods_updated_at" BEFORE UPDATE ON "public"."staff_schedule_periods" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_shifts_updated_at" BEFORE UPDATE ON "public"."staff_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_time_off_requests_updated_at" BEFORE UPDATE ON "public"."staff_time_off_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_timecard_exceptions_updated_at" BEFORE UPDATE ON "public"."staff_timecard_exceptions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_timecards_updated_at" BEFORE UPDATE ON "public"."staff_timecards" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_staff_users_updated_at" BEFORE UPDATE ON "public"."staff_users" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_tax_rates_updated_at" BEFORE UPDATE ON "public"."tax_rates" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_traditions_updated_at" BEFORE UPDATE ON "public"."traditions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_transaction_idempotency_keys_updated_at" BEFORE UPDATE ON "public"."transaction_idempotency_keys" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_vendor_payouts_updated_at" BEFORE UPDATE ON "public"."vendor_payouts" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "validate_staff_shift_before_write" BEFORE INSERT OR UPDATE ON "public"."staff_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."validate_staff_shift"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_staff_user_id_fkey" FOREIGN KEY ("staff_user_id") REFERENCES "public"."staff_users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_category_id_fkey" FOREIGN KEY ("parent_category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consignment_accounts"
    ADD CONSTRAINT "consignment_accounts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consignment_accounts"
    ADD CONSTRAINT "consignment_accounts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consignment_items"
    ADD CONSTRAINT "consignment_items_consignment_account_id_fkey" FOREIGN KEY ("consignment_account_id") REFERENCES "public"."consignment_accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consignment_items"
    ADD CONSTRAINT "consignment_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."gift_cards"
    ADD CONSTRAINT "gift_cards_issued_to_customer_id_fkey" FOREIGN KEY ("issued_to_customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_items"
    ADD CONSTRAINT "inventory_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."media_assets"
    ADD CONSTRAINT "media_assets_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media_usage"
    ADD CONSTRAINT "media_usage_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payroll_events"
    ADD CONSTRAINT "payroll_events_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payroll_events"
    ADD CONSTRAINT "payroll_events_payroll_period_employee_id_fkey" FOREIGN KEY ("payroll_period_employee_id") REFERENCES "public"."payroll_period_employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payroll_events"
    ADD CONSTRAINT "payroll_events_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payroll_period_employees"
    ADD CONSTRAINT "payroll_period_employees_approved_by_staff_id_fkey" FOREIGN KEY ("approved_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payroll_period_employees"
    ADD CONSTRAINT "payroll_period_employees_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll_period_employees"
    ADD CONSTRAINT "payroll_period_employees_reviewed_by_staff_id_fkey" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payroll_period_employees"
    ADD CONSTRAINT "payroll_period_employees_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payroll_period_timecards"
    ADD CONSTRAINT "payroll_period_timecards_payroll_period_employee_id_fkey" FOREIGN KEY ("payroll_period_employee_id") REFERENCES "public"."payroll_period_employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll_period_timecards"
    ADD CONSTRAINT "payroll_period_timecards_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "public"."payroll_periods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll_period_timecards"
    ADD CONSTRAINT "payroll_period_timecards_timecard_id_fkey" FOREIGN KEY ("timecard_id") REFERENCES "public"."staff_timecards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payroll_periods"
    ADD CONSTRAINT "payroll_periods_approved_by_staff_id_fkey" FOREIGN KEY ("approved_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payroll_periods"
    ADD CONSTRAINT "payroll_periods_closed_by_staff_id_fkey" FOREIGN KEY ("closed_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payroll_periods"
    ADD CONSTRAINT "payroll_periods_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payroll_periods"
    ADD CONSTRAINT "payroll_periods_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."product_collections"
    ADD CONSTRAINT "product_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_collections"
    ADD CONSTRAINT "product_collections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_media"
    ADD CONSTRAINT "product_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_media"
    ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "public"."product_types"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_tradition_id_fkey" FOREIGN KEY ("tradition_id") REFERENCES "public"."traditions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."receipts"
    ADD CONSTRAINT "receipts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."receiving_record_items"
    ADD CONSTRAINT "receiving_record_items_inventory_location_id_fkey" FOREIGN KEY ("inventory_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."receiving_record_items"
    ADD CONSTRAINT "receiving_record_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."receiving_record_items"
    ADD CONSTRAINT "receiving_record_items_receiving_record_id_fkey" FOREIGN KEY ("receiving_record_id") REFERENCES "public"."receiving_records"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."receiving_records"
    ADD CONSTRAINT "receiving_records_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."receiving_records"
    ADD CONSTRAINT "receiving_records_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."returns"
    ADD CONSTRAINT "returns_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shipment_addresses"
    ADD CONSTRAINT "shipment_addresses_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shipment_events"
    ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shipment_items"
    ADD CONSTRAINT "shipment_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shipment_items"
    ADD CONSTRAINT "shipment_items_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shipment_packages"
    ADD CONSTRAINT "shipment_packages_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."shipments"
    ADD CONSTRAINT "shipments_shipping_origin_id_fkey" FOREIGN KEY ("shipping_origin_id") REFERENCES "public"."shipping_origins"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_auth_events"
    ADD CONSTRAINT "staff_auth_events_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_availability"
    ADD CONSTRAINT "staff_availability_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_assigned_location_id_fkey" FOREIGN KEY ("assigned_location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_members"
    ADD CONSTRAINT "staff_members_updated_by_staff_id_fkey" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_permission_assignments"
    ADD CONSTRAINT "staff_permission_assignments_changed_by_staff_id_fkey" FOREIGN KEY ("changed_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_permission_assignments"
    ADD CONSTRAINT "staff_permission_assignments_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."staff_punches"
    ADD CONSTRAINT "staff_punches_corrected_from_punch_id_fkey" FOREIGN KEY ("corrected_from_punch_id") REFERENCES "public"."staff_punches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_punches"
    ADD CONSTRAINT "staff_punches_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_punches"
    ADD CONSTRAINT "staff_punches_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_punches"
    ADD CONSTRAINT "staff_punches_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_punches"
    ADD CONSTRAINT "staff_punches_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_punches"
    ADD CONSTRAINT "staff_punches_timecard_id_fkey" FOREIGN KEY ("timecard_id") REFERENCES "public"."staff_timecards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_schedule_events"
    ADD CONSTRAINT "staff_schedule_events_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_schedule_events"
    ADD CONSTRAINT "staff_schedule_events_schedule_period_id_fkey" FOREIGN KEY ("schedule_period_id") REFERENCES "public"."staff_schedule_periods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_schedule_events"
    ADD CONSTRAINT "staff_schedule_events_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_schedule_events"
    ADD CONSTRAINT "staff_schedule_events_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_schedule_periods"
    ADD CONSTRAINT "staff_schedule_periods_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_schedule_periods"
    ADD CONSTRAINT "staff_schedule_periods_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_schedule_periods"
    ADD CONSTRAINT "staff_schedule_periods_published_by_staff_id_fkey" FOREIGN KEY ("published_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_schedule_periods"
    ADD CONSTRAINT "staff_schedule_periods_updated_by_staff_id_fkey" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_sessions"
    ADD CONSTRAINT "staff_sessions_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "staff_shifts_created_by_staff_id_fkey" FOREIGN KEY ("created_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "staff_shifts_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "staff_shifts_schedule_period_id_fkey" FOREIGN KEY ("schedule_period_id") REFERENCES "public"."staff_schedule_periods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "staff_shifts_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_shifts"
    ADD CONSTRAINT "staff_shifts_updated_by_staff_id_fkey" FOREIGN KEY ("updated_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_time_off_requests"
    ADD CONSTRAINT "staff_time_off_requests_reviewed_by_staff_id_fkey" FOREIGN KEY ("reviewed_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_time_off_requests"
    ADD CONSTRAINT "staff_time_off_requests_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_timecard_exceptions"
    ADD CONSTRAINT "staff_timecard_exceptions_related_punch_id_fkey" FOREIGN KEY ("related_punch_id") REFERENCES "public"."staff_punches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timecard_exceptions"
    ADD CONSTRAINT "staff_timecard_exceptions_resolved_by_staff_id_fkey" FOREIGN KEY ("resolved_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timecard_exceptions"
    ADD CONSTRAINT "staff_timecard_exceptions_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_timecard_exceptions"
    ADD CONSTRAINT "staff_timecard_exceptions_timecard_id_fkey" FOREIGN KEY ("timecard_id") REFERENCES "public"."staff_timecards"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_timecards"
    ADD CONSTRAINT "staff_timecards_approved_by_staff_id_fkey" FOREIGN KEY ("approved_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timecards"
    ADD CONSTRAINT "staff_timecards_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timecards"
    ADD CONSTRAINT "staff_timecards_reopened_by_staff_id_fkey" FOREIGN KEY ("reopened_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timecards"
    ADD CONSTRAINT "staff_timecards_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."staff_shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timecards"
    ADD CONSTRAINT "staff_timecards_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."staff_timecards"
    ADD CONSTRAINT "staff_timecards_submitted_by_staff_id_fkey" FOREIGN KEY ("submitted_by_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timekeeper_events"
    ADD CONSTRAINT "staff_timekeeper_events_actor_staff_id_fkey" FOREIGN KEY ("actor_staff_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timekeeper_events"
    ADD CONSTRAINT "staff_timekeeper_events_punch_id_fkey" FOREIGN KEY ("punch_id") REFERENCES "public"."staff_punches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timekeeper_events"
    ADD CONSTRAINT "staff_timekeeper_events_staff_member_id_fkey" FOREIGN KEY ("staff_member_id") REFERENCES "public"."staff_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."staff_timekeeper_events"
    ADD CONSTRAINT "staff_timekeeper_events_timecard_id_fkey" FOREIGN KEY ("timecard_id") REFERENCES "public"."staff_timecards"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendor_payouts"
    ADD CONSTRAINT "vendor_payouts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendor_payouts"
    ADD CONSTRAINT "vendor_payouts_consignment_account_id_fkey" FOREIGN KEY ("consignment_account_id") REFERENCES "public"."consignment_accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendor_payouts"
    ADD CONSTRAINT "vendor_payouts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE SET NULL;



CREATE POLICY "Anon can delete customer addresses for management" ON "public"."customer_addresses" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon can delete product media" ON "public"."product_media" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon can delete shipment items before shipped" ON "public"."shipment_items" FOR DELETE TO "anon" USING ((EXISTS ( SELECT 1
   FROM "public"."shipments"
  WHERE (("shipments"."id" = "shipment_items"."shipment_id") AND ("shipments"."shipment_status" = ANY (ARRAY['pending'::"text", 'ready'::"text", 'packed'::"text", 'cancelled'::"text"]))))));



CREATE POLICY "Anon can delete shipment packages" ON "public"."shipment_packages" FOR DELETE TO "anon" USING (true);



CREATE POLICY "Anon can insert POS order items" ON "public"."order_items" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert POS orders" ON "public"."orders" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert POS payments" ON "public"."payments" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert POS receipts" ON "public"."receipts" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert customer addresses for management" ON "public"."customer_addresses" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert customer audit logs" ON "public"."audit_logs" FOR INSERT TO "anon" WITH CHECK (("entity_type" = 'customer'::"text"));



CREATE POLICY "Anon can insert customers for management" ON "public"."customers" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert gift cards for return credits" ON "public"."gift_cards" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert inventory items" ON "public"."inventory_items" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert inventory transactions" ON "public"."inventory_transactions" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert media assets" ON "public"."media_assets" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert order audit logs" ON "public"."audit_logs" FOR INSERT TO "anon" WITH CHECK (("entity_type" = 'order'::"text"));



CREATE POLICY "Anon can insert product media" ON "public"."product_media" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert return audit logs" ON "public"."audit_logs" FOR INSERT TO "anon" WITH CHECK (("entity_type" = 'return'::"text"));



CREATE POLICY "Anon can insert return items for management" ON "public"."return_items" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert returns for management" ON "public"."returns" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert schedule events for scheduling development" ON "public"."staff_schedule_events" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert shipment addresses" ON "public"."shipment_addresses" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert shipment audit logs" ON "public"."audit_logs" FOR INSERT TO "anon" WITH CHECK (("entity_type" = 'shipment'::"text"));



CREATE POLICY "Anon can insert shipment events" ON "public"."shipment_events" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert shipment items" ON "public"."shipment_items" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert shipment packages" ON "public"."shipment_packages" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert shipments for management" ON "public"."shipments" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can insert shipping origins" ON "public"."shipping_origins" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Anon can read POS order items" ON "public"."order_items" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read POS orders" ON "public"."orders" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read POS payments" ON "public"."payments" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read POS receipts" ON "public"."receipts" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read customer addresses for management" ON "public"."customer_addresses" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read customer audit logs" ON "public"."audit_logs" FOR SELECT TO "anon" USING (("entity_type" = 'customer'::"text"));



CREATE POLICY "Anon can read customers for POS" ON "public"."customers" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read customers for management" ON "public"."customers" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read gift cards for return credits" ON "public"."gift_cards" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read inventory items" ON "public"."inventory_items" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read inventory locations" ON "public"."inventory_locations" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read inventory transactions" ON "public"."inventory_transactions" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read order audit logs" ON "public"."audit_logs" FOR SELECT TO "anon" USING (("entity_type" = 'order'::"text"));



CREATE POLICY "Anon can read orders for management" ON "public"."orders" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read return audit logs" ON "public"."audit_logs" FOR SELECT TO "anon" USING (("entity_type" = 'return'::"text"));



CREATE POLICY "Anon can read return items for management" ON "public"."return_items" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read returns for management" ON "public"."returns" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read schedule events for scheduling development" ON "public"."staff_schedule_events" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read schedule periods for scheduling development" ON "public"."staff_schedule_periods" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read shipment addresses" ON "public"."shipment_addresses" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read shipment audit logs" ON "public"."audit_logs" FOR SELECT TO "anon" USING (("entity_type" = 'shipment'::"text"));



CREATE POLICY "Anon can read shipment events" ON "public"."shipment_events" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read shipment items" ON "public"."shipment_items" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read shipment packages" ON "public"."shipment_packages" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read shipments for management" ON "public"."shipments" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read shipping origins" ON "public"."shipping_origins" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read staff availability for scheduling development" ON "public"."staff_availability" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read staff shifts for scheduling development" ON "public"."staff_shifts" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can read time off for scheduling development" ON "public"."staff_time_off_requests" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Anon can update customer addresses for management" ON "public"."customer_addresses" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update customers for management" ON "public"."customers" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update inventory items" ON "public"."inventory_items" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update media assets" ON "public"."media_assets" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update orders for management" ON "public"."orders" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update product media" ON "public"."product_media" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update return items for management" ON "public"."return_items" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update returns for management" ON "public"."returns" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update shipment addresses" ON "public"."shipment_addresses" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update shipment items" ON "public"."shipment_items" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update shipment packages" ON "public"."shipment_packages" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update shipments for management" ON "public"."shipments" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can update shipping origins" ON "public"."shipping_origins" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can write schedule periods for scheduling development" ON "public"."staff_schedule_periods" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can write staff availability for scheduling development" ON "public"."staff_availability" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can write staff shifts for scheduling development" ON "public"."staff_shifts" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Anon can write time off for scheduling development" ON "public"."staff_time_off_requests" TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Deny anon staff auth event reads" ON "public"."staff_auth_events" FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny anon staff auth event writes" ON "public"."staff_auth_events" TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon staff member reads" ON "public"."staff_members" FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny anon staff member writes" ON "public"."staff_members" TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Deny anon staff session reads" ON "public"."staff_sessions" FOR SELECT TO "anon" USING (false);



CREATE POLICY "Deny anon staff session writes" ON "public"."staff_sessions" TO "anon" USING (false) WITH CHECK (false);



CREATE POLICY "Public can read active brands" ON "public"."brands" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "Public can read active categories" ON "public"."categories" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "Public can read active collections" ON "public"."collections" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "Public can read active media assets" ON "public"."media_assets" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "Public can read active product types" ON "public"."product_types" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "Public can read active products" ON "public"."products" FOR SELECT TO "anon" USING ((("active" = true) AND ("status" = 'active'::"text") AND ("available_online" = true)));



CREATE POLICY "Public can read active traditions" ON "public"."traditions" FOR SELECT TO "anon" USING (("active" = true));



CREATE POLICY "Public can read product media" ON "public"."product_media" FOR SELECT TO "anon" USING (true);



CREATE POLICY "Temporary admin can insert products" ON "public"."products" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Temporary admin can update products" ON "public"."products" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



CREATE POLICY "Temporary product migration insert" ON "public"."products" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "Temporary product migration update" ON "public"."products" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consignment_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consignment_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gift_cards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."media_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll_period_employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll_period_timecards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll_periods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_collections" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."purchase_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."receipts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."receiving_record_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."receiving_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."return_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."returns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipment_addresses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipment_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipment_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipment_packages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shipping_origins" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_auth_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_availability" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_permission_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_punches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_schedule_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_schedule_periods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_time_off_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_timecard_exceptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_timecards" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_timekeeper_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."staff_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tax_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."traditions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_payouts" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_pos_sale_transaction"("p_request_key" "text", "p_customer_id" "uuid", "p_inventory_location_id" "uuid", "p_cashier_name" "text", "p_payment_method" "text", "p_discount_type" "text", "p_discount_value" numeric, "p_tax_rate" numeric, "p_amount_tendered" numeric, "p_notes" "text", "p_items" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_pos_sale_transaction"("p_request_key" "text", "p_customer_id" "uuid", "p_inventory_location_id" "uuid", "p_cashier_name" "text", "p_payment_method" "text", "p_discount_type" "text", "p_discount_value" numeric, "p_tax_rate" numeric, "p_amount_tendered" numeric, "p_notes" "text", "p_items" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_return_transaction"("p_request_key" "text", "p_return_id" "uuid", "p_completion" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_return_transaction"("p_request_key" "text", "p_return_id" "uuid", "p_completion" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finalize_shipment_transaction"("p_request_key" "text", "p_order_id" "uuid", "p_fulfillment_type" "text", "p_shipping_origin_id" "uuid", "p_carrier" "text", "p_service_level" "text", "p_tracking_number" "text", "p_tracking_url" "text", "p_shipping_cost" numeric, "p_items" "jsonb", "p_ship_to" "jsonb", "p_packages" "jsonb", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finalize_shipment_transaction"("p_request_key" "text", "p_order_id" "uuid", "p_fulfillment_type" "text", "p_shipping_origin_id" "uuid", "p_carrier" "text", "p_service_level" "text", "p_tracking_number" "text", "p_tracking_url" "text", "p_shipping_cost" numeric, "p_items" "jsonb", "p_ship_to" "jsonb", "p_packages" "jsonb", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_staff_shift"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_staff_shift"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_staff_shift"() TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";



GRANT ALL ON TABLE "public"."consignment_accounts" TO "anon";
GRANT ALL ON TABLE "public"."consignment_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."consignment_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."consignment_items" TO "anon";
GRANT ALL ON TABLE "public"."consignment_items" TO "authenticated";
GRANT ALL ON TABLE "public"."consignment_items" TO "service_role";



GRANT ALL ON TABLE "public"."customer_addresses" TO "anon";
GRANT ALL ON TABLE "public"."customer_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."discounts" TO "anon";
GRANT ALL ON TABLE "public"."discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."discounts" TO "service_role";



GRANT ALL ON TABLE "public"."gift_cards" TO "anon";
GRANT ALL ON TABLE "public"."gift_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_cards" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_items" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_locations" TO "anon";
GRANT ALL ON TABLE "public"."inventory_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_locations" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transactions" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."media_assets" TO "anon";
GRANT ALL ON TABLE "public"."media_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."media_assets" TO "service_role";



GRANT ALL ON TABLE "public"."media_usage" TO "anon";
GRANT ALL ON TABLE "public"."media_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."media_usage" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_events" TO "anon";
GRANT ALL ON TABLE "public"."payroll_events" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_events" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_period_employees" TO "anon";
GRANT ALL ON TABLE "public"."payroll_period_employees" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_period_employees" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_period_timecards" TO "anon";
GRANT ALL ON TABLE "public"."payroll_period_timecards" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_period_timecards" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_periods" TO "anon";
GRANT ALL ON TABLE "public"."payroll_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_periods" TO "service_role";



GRANT ALL ON TABLE "public"."product_collections" TO "anon";
GRANT ALL ON TABLE "public"."product_collections" TO "authenticated";
GRANT ALL ON TABLE "public"."product_collections" TO "service_role";



GRANT ALL ON TABLE "public"."product_media" TO "anon";
GRANT ALL ON TABLE "public"."product_media" TO "authenticated";
GRANT ALL ON TABLE "public"."product_media" TO "service_role";



GRANT ALL ON TABLE "public"."product_types" TO "anon";
GRANT ALL ON TABLE "public"."product_types" TO "authenticated";
GRANT ALL ON TABLE "public"."product_types" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_order_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON TABLE "public"."receipts" TO "anon";
GRANT ALL ON TABLE "public"."receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."receipts" TO "service_role";



GRANT ALL ON TABLE "public"."receiving_record_items" TO "anon";
GRANT ALL ON TABLE "public"."receiving_record_items" TO "authenticated";
GRANT ALL ON TABLE "public"."receiving_record_items" TO "service_role";



GRANT ALL ON TABLE "public"."receiving_records" TO "anon";
GRANT ALL ON TABLE "public"."receiving_records" TO "authenticated";
GRANT ALL ON TABLE "public"."receiving_records" TO "service_role";



GRANT ALL ON TABLE "public"."return_items" TO "anon";
GRANT ALL ON TABLE "public"."return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."return_items" TO "service_role";



GRANT ALL ON TABLE "public"."returns" TO "anon";
GRANT ALL ON TABLE "public"."returns" TO "authenticated";
GRANT ALL ON TABLE "public"."returns" TO "service_role";



GRANT ALL ON TABLE "public"."shipment_addresses" TO "anon";
GRANT ALL ON TABLE "public"."shipment_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."shipment_addresses" TO "service_role";



GRANT ALL ON TABLE "public"."shipment_events" TO "anon";
GRANT ALL ON TABLE "public"."shipment_events" TO "authenticated";
GRANT ALL ON TABLE "public"."shipment_events" TO "service_role";



GRANT ALL ON TABLE "public"."shipment_items" TO "anon";
GRANT ALL ON TABLE "public"."shipment_items" TO "authenticated";
GRANT ALL ON TABLE "public"."shipment_items" TO "service_role";



GRANT ALL ON TABLE "public"."shipment_packages" TO "anon";
GRANT ALL ON TABLE "public"."shipment_packages" TO "authenticated";
GRANT ALL ON TABLE "public"."shipment_packages" TO "service_role";



GRANT ALL ON TABLE "public"."shipments" TO "anon";
GRANT ALL ON TABLE "public"."shipments" TO "authenticated";
GRANT ALL ON TABLE "public"."shipments" TO "service_role";



GRANT ALL ON TABLE "public"."shipping_origins" TO "anon";
GRANT ALL ON TABLE "public"."shipping_origins" TO "authenticated";
GRANT ALL ON TABLE "public"."shipping_origins" TO "service_role";



GRANT ALL ON TABLE "public"."staff_auth_events" TO "anon";
GRANT ALL ON TABLE "public"."staff_auth_events" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_auth_events" TO "service_role";



GRANT ALL ON TABLE "public"."staff_availability" TO "anon";
GRANT ALL ON TABLE "public"."staff_availability" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_availability" TO "service_role";



GRANT ALL ON TABLE "public"."staff_members" TO "anon";
GRANT ALL ON TABLE "public"."staff_members" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_members" TO "service_role";



GRANT ALL ON TABLE "public"."staff_permission_assignments" TO "anon";
GRANT ALL ON TABLE "public"."staff_permission_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_permission_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."staff_punches" TO "anon";
GRANT ALL ON TABLE "public"."staff_punches" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_punches" TO "service_role";



GRANT ALL ON TABLE "public"."staff_schedule_events" TO "anon";
GRANT ALL ON TABLE "public"."staff_schedule_events" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_schedule_events" TO "service_role";



GRANT ALL ON TABLE "public"."staff_schedule_periods" TO "anon";
GRANT ALL ON TABLE "public"."staff_schedule_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_schedule_periods" TO "service_role";



GRANT ALL ON TABLE "public"."staff_sessions" TO "anon";
GRANT ALL ON TABLE "public"."staff_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."staff_shifts" TO "anon";
GRANT ALL ON TABLE "public"."staff_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_shifts" TO "service_role";



GRANT ALL ON TABLE "public"."staff_time_off_requests" TO "anon";
GRANT ALL ON TABLE "public"."staff_time_off_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_time_off_requests" TO "service_role";



GRANT ALL ON TABLE "public"."staff_timecard_exceptions" TO "anon";
GRANT ALL ON TABLE "public"."staff_timecard_exceptions" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_timecard_exceptions" TO "service_role";



GRANT ALL ON TABLE "public"."staff_timecards" TO "anon";
GRANT ALL ON TABLE "public"."staff_timecards" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_timecards" TO "service_role";



GRANT ALL ON TABLE "public"."staff_timekeeper_events" TO "anon";
GRANT ALL ON TABLE "public"."staff_timekeeper_events" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_timekeeper_events" TO "service_role";



GRANT ALL ON TABLE "public"."staff_users" TO "anon";
GRANT ALL ON TABLE "public"."staff_users" TO "authenticated";
GRANT ALL ON TABLE "public"."staff_users" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."tax_rates" TO "anon";
GRANT ALL ON TABLE "public"."tax_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."tax_rates" TO "service_role";



GRANT ALL ON TABLE "public"."traditions" TO "anon";
GRANT ALL ON TABLE "public"."traditions" TO "authenticated";
GRANT ALL ON TABLE "public"."traditions" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_idempotency_keys" TO "anon";
GRANT ALL ON TABLE "public"."transaction_idempotency_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_idempotency_keys" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_payouts" TO "anon";
GRANT ALL ON TABLE "public"."vendor_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_payouts" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







