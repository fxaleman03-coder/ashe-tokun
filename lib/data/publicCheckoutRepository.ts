import "server-only";

import { USE_SUPABASE } from "@/lib/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type {
  PublicCheckoutOrderItem,
  PublicOrderConfirmation,
} from "@/lib/types/publicCheckout";

type ConfirmationOrderRow = {
  order_number: string;
  order_status: string;
  payment_status: string;
  subtotal: number | string | null;
  discount_total: number | string | null;
  tax_total: number | string | null;
  grand_total: number | string | null;
  notes: string | null;
  created_at: string;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
  order_items?: {
    product_id: string | null;
    product_name: string;
    sku: string | null;
    quantity: number | null;
    unit_price: number | string | null;
    line_total: number | string | null;
  }[] | null;
};

const CONFIRMATION_TOKEN_NOTE_PREFIX = "Public checkout confirmation:";

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function getCustomerName(customer: ConfirmationOrderRow["customer"]) {
  const name = [customer?.first_name, customer?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Customer";
}

function hasConfirmationToken(notes: string | null, token: string) {
  if (!token || token.length < 16) {
    return false;
  }

  return notes
    ?.split("\n")
    .map((line) => line.trim())
    .some((line) => line === `${CONFIRMATION_TOKEN_NOTE_PREFIX} ${token}`);
}

export async function getPublicOrderConfirmation(
  orderNumber: string,
  confirmationToken: string,
): Promise<PublicOrderConfirmation | null> {
  const supabase = createSupabaseServiceClient();

  if (!USE_SUPABASE || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("orders")
    .select(
      `
        order_number,
        order_status,
        payment_status,
        subtotal,
        discount_total,
        tax_total,
        grand_total,
        notes,
        created_at,
        customer:customers(first_name, last_name, email),
        order_items(product_id, product_name, sku, quantity, unit_price, line_total)
      `,
    )
    .eq("order_number", orderNumber)
    .eq("sales_channel", "Website")
    .maybeSingle<ConfirmationOrderRow>();

  if (error || !data) {
    return null;
  }

  if (!hasConfirmationToken(data.notes, confirmationToken)) {
    return null;
  }

  const items: PublicCheckoutOrderItem[] = (data.order_items ?? []).map((item) => ({
    productId: item.product_id,
    productName: item.product_name,
    sku: item.sku,
    quantity: Number(item.quantity ?? 0),
    unitPrice: toNumber(item.unit_price),
    lineTotal: toNumber(item.line_total),
  }));

  return {
    orderNumber: data.order_number,
    customerEmail: data.customer?.email ?? null,
    customerName: getCustomerName(data.customer),
    paymentStatus: data.payment_status,
    orderStatus: data.order_status,
    createdAt: data.created_at,
    summary: {
      subtotal: toNumber(data.subtotal),
      discount: toNumber(data.discount_total),
      tax: toNumber(data.tax_total),
      shipping: 0,
      total: toNumber(data.grand_total),
    },
    items,
  };
}
