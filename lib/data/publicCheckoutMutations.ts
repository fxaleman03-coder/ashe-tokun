"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { USE_SUPABASE } from "@/lib/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  PublicCheckoutInput,
  PublicCheckoutOrderItem,
  PublicCheckoutResult,
} from "@/lib/types/publicCheckout";

type ProductRow = {
  id: string;
  name: string;
  sku: string;
  price: number | string | null;
  active: boolean | null;
  status: string | null;
  available_online: boolean | null;
};

type InventoryRow = {
  product_id: string;
  available_quantity: number | null;
};

type ExistingOrderRow = {
  order_number: string;
  notes?: string | null;
  subtotal: number | string | null;
  discount_total: number | string | null;
  tax_total: number | string | null;
  grand_total: number | string | null;
  customer?: { email?: string | null } | null;
  order_items?: {
    product_id: string | null;
    product_name: string;
    sku: string | null;
    quantity: number | null;
    unit_price: number | string | null;
    line_total: number | string | null;
  }[] | null;
};

const IDEMPOTENCY_NOTE_PREFIX = "Public checkout idempotency:";
const CONFIRMATION_TOKEN_NOTE_PREFIX = "Public checkout confirmation:";

function normalizeText(value: string | undefined) {
  return value?.trim() ?? "";
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = normalizeText(value);

  return normalized || null;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+().\-\s]/g, "").trim();
}

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateInput(input: PublicCheckoutInput) {
  const fieldErrors: Record<string, string> = {};
  const requiredCustomerFields = [
    ["firstName", input.customer.firstName],
    ["lastName", input.customer.lastName],
    ["email", input.customer.email],
    ["phone", input.customer.phone],
  ] as const;

  for (const [field, value] of requiredCustomerFields) {
    if (!normalizeText(value)) {
      fieldErrors[field] = "Required";
    }
  }

  if (input.customer.email && !validateEmail(input.customer.email)) {
    fieldErrors.email = "Enter a valid email address.";
  }

  for (const [prefix, address] of [
    ["billing", input.billingAddress],
    ["shipping", input.shippingAddress],
  ] as const) {
    for (const field of [
      "firstName",
      "lastName",
      "address1",
      "city",
      "state",
      "postalCode",
      "country",
    ] as const) {
      if (!normalizeText(address[field])) {
        fieldErrors[`${prefix}.${field}`] = "Required";
      }
    }
  }

  if (!input.idempotencyKey || input.idempotencyKey.length < 16) {
    fieldErrors.form = "Refresh checkout and try again.";
  }

  if (input.cartItems.length === 0) {
    fieldErrors.cart = "Your cart is empty.";
  }

  for (const item of input.cartItems) {
    if (!item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      fieldErrors.cart = "Cart quantities must be whole numbers greater than zero.";
      break;
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

function mapExistingOrder(row: ExistingOrderRow): PublicCheckoutResult {
  const items: PublicCheckoutOrderItem[] = (row.order_items ?? []).map((item) => ({
    productId: item.product_id,
    productName: item.product_name,
    sku: item.sku,
    quantity: Number(item.quantity ?? 0),
    unitPrice: toNumber(item.unit_price),
    lineTotal: toNumber(item.line_total),
  }));

  const confirmationToken = getConfirmationTokenFromNotes(
    "notes" in row && typeof row.notes === "string" ? row.notes : null,
  );

  return {
    ok: true,
    orderNumber: row.order_number,
    confirmationToken: confirmationToken ?? "",
    customerEmail: row.customer?.email ?? "",
    summary: {
      subtotal: toNumber(row.subtotal),
      discount: toNumber(row.discount_total),
      tax: toNumber(row.tax_total),
      shipping: 0,
      total: toNumber(row.grand_total),
    },
    items,
    message: "Order already received.",
  };
}

function getConfirmationTokenFromNotes(notes: string | null | undefined) {
  return (
    notes
      ?.split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith(CONFIRMATION_TOKEN_NOTE_PREFIX))
      ?.replace(CONFIRMATION_TOKEN_NOTE_PREFIX, "")
      .trim() || null
  );
}

async function getExistingOrder(idempotencyKey: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        order_number,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        notes,
        customer:customers(email),
        order_items(product_id, product_name, sku, quantity, unit_price, line_total)
      `,
    )
    .eq("sales_channel", "Website")
    .ilike("notes", `%${IDEMPOTENCY_NOTE_PREFIX} ${idempotencyKey}%`)
    .maybeSingle<ExistingOrderRow>();

  if (error) {
    return null;
  }

  return data ?? null;
}

async function getNextNumber(table: string, column: string, prefix: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return `${prefix}000001`;
  }

  const { data, error } = await supabase
    .from(table)
    .select(column)
    .like(column, `${prefix}%`)
    .order(column, { ascending: false })
    .limit(50);

  if (error) {
    throw new Error("Number lookup failed.");
  }

  const nextNumber =
    ((data ?? []) as unknown as Record<string, unknown>[])
      .map((row) => String(row[column] ?? ""))
      .map((value) => {
        const match = value.match(/(\d+)$/);

        return match ? Number(match[1]) : 0;
      })
      .reduce((highest, value) => Math.max(highest, value), 0) + 1;

  return `${prefix}${String(nextNumber).padStart(6, "0")}`;
}

async function writeAudit(orderId: string, orderNumber: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return;
  }

  await supabase.from("audit_logs").insert({
    staff_user_id: null,
    action: "public_order_created",
    entity_type: "order",
    entity_id: orderId,
    details: {
      order_number: orderNumber,
      sales_channel: "Website",
      payment_status: "pending",
    },
  });
}

export async function createPublicCheckoutOrder(
  input: PublicCheckoutInput,
): Promise<PublicCheckoutResult> {
  if (!USE_SUPABASE) {
    return {
      ok: false,
      error: "Online checkout requires the live catalog connection.",
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Checkout is temporarily unavailable. Please contact ASHE TOKUN.",
    };
  }

  const fieldErrors = validateInput(input);

  if (fieldErrors) {
    return {
      ok: false,
      error: "Please review the highlighted checkout fields.",
      fieldErrors,
    };
  }

  const existingOrder = await getExistingOrder(input.idempotencyKey);

  if (existingOrder) {
    return mapExistingOrder(existingOrder);
  }

  const requestedQuantities = new Map<string, number>();

  for (const item of input.cartItems) {
    requestedQuantities.set(
      item.productId,
      (requestedQuantities.get(item.productId) ?? 0) + item.quantity,
    );
  }

  const productIds = Array.from(requestedQuantities.keys());
  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("id, name, sku, price, active, status, available_online")
    .in("id", productIds);

  if (productError || !productRows) {
    return {
      ok: false,
      error: "Unable to validate the cart. Please try again.",
    };
  }

  const productsById = new Map(
    (productRows as ProductRow[]).map((product) => [product.id, product]),
  );

  if (productsById.size !== productIds.length) {
    return {
      ok: false,
      error: "One or more products in your cart are no longer available.",
    };
  }

  const { data: inventoryRows, error: inventoryError } = await supabase
    .from("inventory_items")
    .select("product_id, available_quantity")
    .in("product_id", productIds);

  if (inventoryError) {
    return {
      ok: false,
      error: "Unable to verify product availability. Please try again.",
    };
  }

  const availabilityByProduct = new Map<string, number>();

  for (const row of (inventoryRows ?? []) as InventoryRow[]) {
    availabilityByProduct.set(
      row.product_id,
      (availabilityByProduct.get(row.product_id) ?? 0) +
        Number(row.available_quantity ?? 0),
    );
  }

  const orderItems: PublicCheckoutOrderItem[] = [];

  for (const [productId, quantity] of requestedQuantities.entries()) {
    const product = productsById.get(productId);

    if (
      !product ||
      !product.active ||
      product.status !== "active" ||
      product.available_online === false
    ) {
      return {
        ok: false,
        error: "One or more products in your cart are no longer available.",
      };
    }

    const available = availabilityByProduct.get(productId) ?? 0;

    if (quantity > available) {
      return {
        ok: false,
        error: `${product.name} has ${available} available.`,
      };
    }

    const unitPrice = money(toNumber(product.price));
    const lineTotal = money(unitPrice * quantity);

    orderItems.push({
      productId,
      productName: product.name,
      sku: product.sku,
      quantity,
      unitPrice,
      lineTotal,
    });
  }

  const subtotal = money(
    orderItems.reduce((total, item) => total + item.lineTotal, 0),
  );
  const discount = 0;
  const tax = 0;
  const shipping = 0;
  const total = money(subtotal - discount + tax + shipping);
  const customerEmail = normalizeEmail(input.customer.email);
  const customerNumber = await getNextNumber(
    "customers",
    "customer_number",
    "ASH-CUS-",
  );
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      customer_number: customerNumber,
      customer_type: "registered",
      first_name: normalizeText(input.customer.firstName),
      last_name: normalizeText(input.customer.lastName),
      email: customerEmail,
      phone: normalizePhone(input.customer.phone),
      notes: "Created from public website checkout.",
      active: true,
    })
    .select("id, email")
    .single();

  if (customerError || !customer) {
    return {
      ok: false,
      error: "Unable to create the customer record. Please try again.",
    };
  }

  const addressRows = [
    {
      customer_id: customer.id,
      address_type: "billing",
      first_name: normalizeText(input.billingAddress.firstName),
      last_name: normalizeText(input.billingAddress.lastName),
      address1: normalizeText(input.billingAddress.address1),
      address2: normalizeOptionalText(input.billingAddress.address2),
      city: normalizeText(input.billingAddress.city),
      state: normalizeText(input.billingAddress.state),
      postal_code: normalizeText(input.billingAddress.postalCode),
      country: normalizeText(input.billingAddress.country).toUpperCase(),
      default_address: true,
    },
    {
      customer_id: customer.id,
      address_type: "shipping",
      first_name: normalizeText(input.shippingAddress.firstName),
      last_name: normalizeText(input.shippingAddress.lastName),
      address1: normalizeText(input.shippingAddress.address1),
      address2: normalizeOptionalText(input.shippingAddress.address2),
      city: normalizeText(input.shippingAddress.city),
      state: normalizeText(input.shippingAddress.state),
      postal_code: normalizeText(input.shippingAddress.postalCode),
      country: normalizeText(input.shippingAddress.country).toUpperCase(),
      default_address: true,
    },
  ];

  const { error: addressError } = await supabase
    .from("customer_addresses")
    .insert(addressRows);

  if (addressError) {
    return {
      ok: false,
      error: "Unable to save checkout addresses. Please try again.",
    };
  }

  let lastOrderError = "Unable to create the order. Please try again.";
  const confirmationToken = randomUUID();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderNumber = await getNextNumber("orders", "order_number", "ASH-ORD-");
    const candidateOrderNumber =
      attempt === 0 ? orderNumber : `${orderNumber}-${attempt + 1}`;
    const notes = [
      `${IDEMPOTENCY_NOTE_PREFIX} ${input.idempotencyKey}`,
      `${CONFIRMATION_TOKEN_NOTE_PREFIX} ${confirmationToken}`,
      "Public website order. Payment pending external checkout.",
      normalizeOptionalText(input.orderNotes)
        ? `Customer notes: ${normalizeText(input.orderNotes)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: candidateOrderNumber,
        customer_id: customer.id,
        sales_channel: "Website",
        order_status: "held",
        payment_status: "pending",
        subtotal,
        discount_total: discount,
        tax_total: tax,
        grand_total: total,
        notes,
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
      lastOrderError = orderError?.message ?? lastOrderError;
      continue;
    }

    const { error: itemError } = await supabase.from("order_items").insert(
      orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        sku: item.sku,
        product_name: item.productName,
        brand_name: null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: 0,
        tax: 0,
        line_total: item.lineTotal,
      })),
    );

    if (itemError) {
      return {
        ok: false,
        error:
          "Order item creation failed. Please contact ASHE TOKUN before resubmitting.",
      };
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      order_id: order.id,
      payment_method: "other",
      amount: total,
      reference_number: "Online payment pending",
      payment_status: "pending",
      received_at: null,
    });

    if (paymentError) {
      return {
        ok: false,
        error:
          "Payment placeholder creation failed. Please contact ASHE TOKUN before resubmitting.",
      };
    }

    await writeAudit(order.id, order.order_number);
    revalidatePath("/admin/orders");
    revalidatePath(`/order-confirmation/${order.order_number}`);

    return {
      ok: true,
      orderNumber: order.order_number,
      confirmationToken,
      customerEmail,
      summary: {
        subtotal,
        discount,
        tax,
        shipping,
        total,
      },
      items: orderItems,
      message: "Order received. Payment is pending.",
    };
  }

  return {
    ok: false,
    error: lastOrderError,
  };
}
