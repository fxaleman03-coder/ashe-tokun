"use server";

import { revalidatePath } from "next/cache";
import { USE_SUPABASE } from "@/lib/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireServerActionPermission } from "@/lib/staff/serverActionAuth";
import type { PosPaymentInput, PosSaleInput, PosSaleResult } from "@/lib/types/pos";

type ProductValidationRow = {
  id: string;
  name: string;
  sku: string;
  price: number | string | null;
  cost: number | string | null;
  active: boolean | null;
  status: string | null;
  available_in_store: boolean | null;
  brand?: { name?: string | null } | null;
};

type InventoryItemRow = {
  id: string;
  product_id: string;
  location_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  reorder_level: number;
  inventory_value: number | string;
};

type NumberedRow = {
  order_number?: string | null;
  receipt_number?: string | null;
};

const validPaymentMethods = new Set<PosPaymentInput["method"]>([
  "cash",
  "card",
  "zelle",
  "other",
]);

function toCents(value: number) {
  return Math.round(value * 100);
}

function fromCents(value: number) {
  return Number((value / 100).toFixed(2));
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function availableQuantity(onHand: number, reserved: number) {
  return onHand - reserved;
}

function getSupabaseClient() {
  return createSupabaseServiceClient();
}

function getNextNumberFromRows(
  rows: NumberedRow[] | null,
  field: keyof NumberedRow,
  prefix: string,
) {
  const nextNumber =
    (rows ?? [])
      .map((row) => row[field])
      .filter(Boolean)
      .map((value) => {
        const match = String(value).match(/(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .reduce((highest, value) => Math.max(highest, value), 0) + 1;

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
}

async function getNextOrderNumber() {
  const supabase = getSupabaseClient();

  if (!USE_SUPABASE || !supabase) {
    return "ASH-ORD-000001";
  }

  const { data } = await supabase
    .from("orders")
    .select("order_number")
    .like("order_number", "ASH-ORD-%")
    .order("order_number", { ascending: false })
    .limit(25);

  return getNextNumberFromRows(data, "order_number", "ASH-ORD-");
}

async function getNextReceiptNumber() {
  const supabase = getSupabaseClient();

  if (!USE_SUPABASE || !supabase) {
    return "ASH-000001";
  }

  const { data } = await supabase
    .from("receipts")
    .select("receipt_number")
    .like("receipt_number", "ASH-%")
    .order("receipt_number", { ascending: false })
    .limit(25);

  return getNextNumberFromRows(data, "receipt_number", "ASH-");
}

function revalidatePosPaths(orderId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pos");
  revalidatePath("/admin/orders");

  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
  }
}

function calculateDiscountCents(
  subtotalCents: number,
  discountType: PosSaleInput["discountType"],
  discountValue: number,
) {
  if (discountType === "none" || discountValue <= 0) {
    return 0;
  }

  if (discountType === "percentage") {
    const safePercentage = Math.min(Math.max(discountValue, 0), 100);
    return Math.round(subtotalCents * (safePercentage / 100));
  }

  return Math.min(toCents(discountValue), subtotalCents);
}

function allocateAmount(totalAmount: number, lineBases: number[]) {
  const baseTotal = sum(lineBases);

  if (totalAmount <= 0 || baseTotal <= 0) {
    return lineBases.map(() => 0);
  }

  let allocated = 0;

  return lineBases.map((lineBase, index) => {
    if (index === lineBases.length - 1) {
      return totalAmount - allocated;
    }

    const lineAmount = Math.round(totalAmount * (lineBase / baseTotal));
    allocated += lineAmount;
    return lineAmount;
  });
}

async function readDevelopmentTaxRate() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return 0;
  }

  const { data, error } = await supabase
    .from("tax_rates")
    .select("rate")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ rate: number | string | null }>();

  if (error) {
    return 0;
  }

  return toNumber(data?.rate);
}

async function readProductMap(productIds: string[]) {
  const supabase = getSupabaseClient();

  if (!supabase || productIds.length === 0) {
    return new Map<string, ProductValidationRow>();
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, price, cost, active, status, available_in_store, brand:brands(name)")
    .in("id", productIds);

  if (error) {
    throw new Error("Product validation failed.");
  }

  return new Map(
    ((data ?? []) as ProductValidationRow[]).map((product) => [
      product.id,
      product,
    ]),
  );
}

async function readInventoryItem(productId: string, locationId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("product_id", productId)
    .eq("location_id", locationId)
    .maybeSingle<InventoryItemRow>();

  if (error) {
    throw new Error("Inventory lookup failed.");
  }

  return data ?? null;
}

async function readInventoryLocation(locationId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("inventory_locations")
    .select("id, active")
    .eq("id", locationId)
    .eq("active", true)
    .maybeSingle<{ id: string; active: boolean }>();

  if (error) {
    throw new Error("Inventory location lookup failed.");
  }

  return data ?? null;
}

async function insertOrderWithRetry(orderPayload: {
  customer_id: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  notes: string | null;
}) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidateOrderNumber = await getNextOrderNumber();
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const orderNumber = `${candidateOrderNumber}${suffix}`;
    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: orderPayload.customer_id,
        sales_channel: "POS",
        order_status: "completed",
        payment_status: "paid",
        subtotal: orderPayload.subtotal,
        discount_total: orderPayload.discount_total,
        tax_total: orderPayload.tax_total,
        grand_total: orderPayload.grand_total,
        notes: orderPayload.notes,
      })
      .select("id, order_number")
      .single<{ id: string; order_number: string }>();

    if (!error && data) {
      return data;
    }

    lastError = error ? "Order insert failed." : lastError;

    if (error?.code !== "23505") {
      break;
    }
  }

  throw new Error(lastError);
}

async function insertReceiptWithRetry(orderId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidateReceiptNumber = await getNextReceiptNumber();
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const receiptNumber = `${candidateReceiptNumber}${suffix}`;
    const { data, error } = await supabase
      .from("receipts")
      .insert({
        order_id: orderId,
        receipt_number: receiptNumber,
        printed: false,
        emailed: false,
      })
      .select("id, receipt_number")
      .single<{ id: string; receipt_number: string }>();

    if (!error && data) {
      return data;
    }

    lastError = error ? "Receipt insert failed." : lastError;

    if (error?.code !== "23505") {
      break;
    }
  }

  throw new Error(lastError);
}

export async function completePosSale(
  input: PosSaleInput,
): Promise<PosSaleResult> {
  if (!USE_SUPABASE) {
    return {
      ok: true,
      source: "local",
      message:
        "Sale preview completed locally. Live POS writes require Supabase mode.",
    };
  }

  const auth = await requireServerActionPermission("pos.checkout");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
    };
  }

  if (input.cartItems.length === 0) {
    return { ok: false, error: "Cart cannot be empty." };
  }

  if (!validPaymentMethods.has(input.paymentMethod)) {
    return { ok: false, error: "Payment method is not available in this phase." };
  }

  const inventoryLocation = await readInventoryLocation(
    input.inventoryLocationId,
  );

  if (!inventoryLocation) {
    return { ok: false, error: "Inventory location was not found." };
  }

  const productIds = Array.from(
    new Set(input.cartItems.map((item) => item.productId)),
  );
  let productMap: Map<string, ProductValidationRow>;

  try {
    productMap = await readProductMap(productIds);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Product validation failed.",
    };
  }

  const lineSubtotalCents: number[] = [];

  for (const item of input.cartItems) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { ok: false, error: "Every cart quantity must be greater than 0." };
    }

    const product = productMap.get(item.productId);

    if (!product) {
      return { ok: false, error: `Product was not found: ${item.name}` };
    }

    if (
      product.active !== true ||
      product.status !== "active" ||
      product.available_in_store !== true
    ) {
      return {
        ok: false,
        error: `${product.name} is not active for in-store sales.`,
      };
    }

    const inventoryItem = await readInventoryItem(
      item.productId,
      input.inventoryLocationId,
    );

    if (!inventoryItem) {
      return {
        ok: false,
        error: `${product.name} is not stocked at the selected location.`,
      };
    }

    if (inventoryItem.available_quantity < item.quantity) {
      return {
        ok: false,
        error: `Not enough stock available for ${product.name}.`,
      };
    }

    lineSubtotalCents.push(toCents(toNumber(product.price)) * item.quantity);
  }

  const subtotalCents = sum(lineSubtotalCents);
  const discountCents = calculateDiscountCents(
    subtotalCents,
    input.discountType,
    input.discountValue,
  );
  const taxableCents = Math.max(subtotalCents - discountCents, 0);
  const taxRate =
    Number.isFinite(input.taxRate) && input.taxRate >= 0
      ? input.taxRate
      : await readDevelopmentTaxRate();
  const taxCents = Math.round(taxableCents * (taxRate / 100));
  const totalCents = taxableCents + taxCents;
  const amountTenderedCents = toCents(input.amountTendered);

  if (amountTenderedCents < totalCents) {
    return { ok: false, error: "Amount tendered must cover the sale total." };
  }

  const changeDueCents =
    input.paymentMethod === "cash" ? amountTenderedCents - totalCents : 0;
  const lineDiscountCents = allocateAmount(discountCents, lineSubtotalCents);
  const lineTaxCents = allocateAmount(taxCents, lineSubtotalCents);

  let order:
    | {
        id: string;
        order_number: string;
      }
    | null = null;

  try {
    order = await insertOrderWithRetry({
      customer_id: input.customerId,
      subtotal: fromCents(subtotalCents),
      discount_total: fromCents(discountCents),
      tax_total: fromCents(taxCents),
      grand_total: fromCents(totalCents),
      notes: [
        input.notes?.trim(),
        `Cashier: ${input.cashierName}`,
        `Amount tendered: ${fromCents(amountTenderedCents).toFixed(2)}`,
        `Change due: ${fromCents(changeDueCents).toFixed(2)}`,
      ]
        .filter(Boolean)
        .join(" | "),
    });

    const orderItemsPayload = input.cartItems.map((item, index) => {
      const product = productMap.get(item.productId);
      const lineTotal =
        lineSubtotalCents[index] - lineDiscountCents[index] + lineTaxCents[index];

      return {
        order_id: order?.id,
        product_id: item.productId,
        sku: product?.sku ?? item.sku,
        product_name: product?.name ?? item.name,
        brand_name: product?.brand?.name ?? item.brand,
        quantity: item.quantity,
        unit_price: fromCents(toCents(toNumber(product?.price ?? item.unitPrice))),
        discount: fromCents(lineDiscountCents[index]),
        tax: fromCents(lineTaxCents[index]),
        line_total: fromCents(lineTotal),
      };
    });
    const orderItemsResult = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (orderItemsResult.error) {
      throw new Error("Order items failed.");
    }

    const paymentResult = await supabase.from("payments").insert({
      order_id: order.id,
      payment_method: input.paymentMethod,
      amount: fromCents(totalCents),
      reference_number:
        input.paymentMethod === "cash"
          ? `Tendered ${fromCents(amountTenderedCents).toFixed(
              2,
            )}; Change ${fromCents(changeDueCents).toFixed(2)}`
          : null,
      payment_status: "paid",
      received_at: new Date().toISOString(),
    });

    if (paymentResult.error) {
      throw new Error("Payment failed.");
    }

    const receipt = await insertReceiptWithRetry(order.id);

    for (const item of input.cartItems) {
      const product = productMap.get(item.productId);
      const inventoryItem = await readInventoryItem(
        item.productId,
        input.inventoryLocationId,
      );

      if (!inventoryItem) {
        throw new Error(`Inventory item missing for ${item.name}.`);
      }

      if (inventoryItem.available_quantity < item.quantity) {
        throw new Error(`Not enough stock available for ${item.name}.`);
      }

      const nextOnHand = inventoryItem.on_hand_quantity - item.quantity;

      if (nextOnHand < 0) {
        throw new Error(`Inventory deduction would make ${item.name} negative.`);
      }

      const nextAvailable = availableQuantity(
        nextOnHand,
        inventoryItem.reserved_quantity,
      );
      const cost = toNumber(product?.cost);
      const inventoryUpdate = await supabase
        .from("inventory_items")
        .update({
          on_hand_quantity: nextOnHand,
          available_quantity: nextAvailable,
          inventory_value: fromCents(toCents(cost) * nextOnHand),
        })
        .eq("id", inventoryItem.id);

      if (inventoryUpdate.error) {
        throw new Error(`Inventory update failed for ${item.name}.`);
      }

      const transactionResult = await supabase
        .from("inventory_transactions")
        .insert({
          inventory_item_id: inventoryItem.id,
          transaction_type: "sale",
          reference_type: "POS",
          reference_id: order.id,
          quantity_change: -item.quantity,
          balance_after: nextOnHand,
          notes: `POS sale ${order.order_number}`,
          performed_by: input.cashierName,
        });

      if (transactionResult.error) {
        throw new Error(`Inventory ledger failed for ${item.name}.`);
      }
    }

    revalidatePosPaths(order.id);

    return {
      ok: true,
      source: "supabase",
      orderId: order.id,
      orderNumber: order.order_number,
      receiptNumber: receipt.receipt_number,
      paymentStatus: "paid",
      subtotal: fromCents(subtotalCents),
      discountAmount: fromCents(discountCents),
      taxAmount: fromCents(taxCents),
      total: fromCents(totalCents),
      amountTendered: fromCents(amountTenderedCents),
      changeDue: fromCents(changeDueCents),
    };
  } catch (error) {
    console.info("[ASHE TOKUN POS]", "Sale completion failed.", {
      orderId: order?.id,
      orderNumber: order?.order_number,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      ok: false,
      critical: Boolean(order),
      orderId: order?.id,
      orderNumber: order?.order_number,
      error: `Sale failed${
        order ? ` after order ${order.order_number} was created` : ""
      }. Manual review may be required. A production RPC/database transaction is required before live operational use.`,
    };
  }
}
