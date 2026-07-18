"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { USE_SUPABASE } from "@/lib/config";
import {
  launchContainment,
  launchContainmentMessages,
} from "@/lib/launchContainment";
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

const validPaymentMethods = new Set<PosPaymentInput["method"]>([
  "cash",
  "card",
  "zelle",
  "other",
]);

function toCents(value: number) {
  return Math.round(value * 100);
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

function getSupabaseClient() {
  return createSupabaseServiceClient();
}

function revalidatePosPaths(orderId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/pos");
  revalidatePath("/admin/orders");

  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
  }
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

type PosSaleRpcResult = {
  success?: boolean;
  order_id?: string;
  order_number?: string;
  receipt_number?: string;
  payment_status?: string;
  subtotal?: number | string;
  discount_amount?: number | string;
  tax_amount?: number | string;
  total?: number | string;
  amount_tendered?: number | string;
  change_due?: number | string;
};

function createPosSaleRequestKey() {
  return `pos-sale-${randomUUID()}`;
}

function getSafeRpcErrorMessage(error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}) {
  if (error.code === "PGRST202" || error.code === "42883") {
    return "POS transaction RPC is not available. Complete Phase 15B migration activation before enabling sale completion.";
  }

  return error.message || "POS transaction failed.";
}

function mapRpcResult(data: PosSaleRpcResult | null): PosSaleResult {
  if (!data?.success || !data.order_id || !data.order_number || !data.receipt_number) {
    return {
      ok: false,
      error: "POS transaction did not return a verified sale result.",
    };
  }

  return {
    ok: true,
    source: "supabase",
    orderId: data.order_id,
    orderNumber: data.order_number,
    receiptNumber: data.receipt_number,
    paymentStatus: data.payment_status ?? "paid",
    subtotal: toNumber(data.subtotal),
    discountAmount: toNumber(data.discount_amount),
    taxAmount: toNumber(data.tax_amount),
    total: toNumber(data.total),
    amountTendered: toNumber(data.amount_tendered),
    changeDue: toNumber(data.change_due),
  };
}

export async function completePosSale(
  input: PosSaleInput,
): Promise<PosSaleResult> {
  if (launchContainment.posSaleCompletion) {
    return {
      ok: false,
      error: launchContainmentMessages.posSaleCompletion,
    };
  }

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
  const discountCents =
    input.discountType === "percentage"
      ? Math.round(
          subtotalCents * (Math.min(Math.max(input.discountValue, 0), 100) / 100),
        )
      : input.discountType === "fixed"
        ? Math.min(toCents(input.discountValue), subtotalCents)
        : 0;
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

  const rpcItems = input.cartItems.map((item) => ({
    product_id: item.productId,
    quantity: item.quantity,
  }));
  const requestKey = createPosSaleRequestKey();
  const { data, error } = await supabase.rpc("complete_pos_sale_transaction", {
    p_request_key: requestKey,
    p_customer_id: input.customerId,
    p_inventory_location_id: input.inventoryLocationId,
    p_cashier_name: input.cashierName,
    p_payment_method: input.paymentMethod,
    p_discount_type: input.discountType,
    p_discount_value: input.discountValue,
    p_tax_rate: taxRate,
    p_amount_tendered: input.amountTendered,
    p_notes: input.notes ?? null,
    p_items: rpcItems,
  });

  if (error) {
    console.info("[ASHE TOKUN POS]", "RPC sale completion failed.", {
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return {
      ok: false,
      error: getSafeRpcErrorMessage(error),
    };
  }

  const result = mapRpcResult(data as PosSaleRpcResult | null);

  if (result.ok && result.source === "supabase") {
    revalidatePosPaths(result.orderId);
  }

  return result;
}
