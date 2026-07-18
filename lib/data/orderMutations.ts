"use server";

import { revalidatePath } from "next/cache";
import { USE_SUPABASE } from "@/lib/config";
import {
  launchContainment,
  launchContainmentMessages,
} from "@/lib/launchContainment";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireServerActionPermission } from "@/lib/staff/serverActionAuth";
import type { OrderStatus, PaymentStatus } from "@/lib/data/ordersRepository";

type MutationResult =
  | { ok: true; message: string }
  | { ok: false; error: string; critical?: boolean; orderId?: string };

type OrderRow = {
  id: string;
  order_number: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  notes: string | null;
};

type InventoryTransactionRow = {
  id: string;
  inventory_item_id: string;
  transaction_type: string;
  reference_type: string;
  reference_id: string | null;
  quantity_change: number;
  balance_after: number;
  notes: string | null;
};

type InventoryItemRow = {
  id: string;
  product_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  inventory_value: number | string;
  product?: { cost?: number | string | null } | null;
};

const allowedOrderStatuses: OrderStatus[] = [
  "draft",
  "completed",
  "cancelled",
  "refunded",
  "held",
];
const allowedPaymentStatuses: PaymentStatus[] = [
  "pending",
  "paid",
  "partially_paid",
  "refunded",
];
const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  draft: ["completed", "cancelled", "held"],
  held: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  refunded: [],
};

function disabledResult(): MutationResult {
  return {
    ok: false,
    error: "Live order management requires Supabase mode.",
  };
}

function configError(): MutationResult {
  return {
    ok: false,
    error:
      "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
  };
}

function getSupabaseClient() {
  return createSupabaseServiceClient();
}

function safeMutationError(fallback: string) {
  return fallback;
}

function revalidateOrderPaths(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function appendNote(existingNotes: string | null, note: string) {
  const timestamp = new Date().toISOString();
  const nextNote = `[${timestamp}] ${note.trim()}`;

  return [existingNotes, nextNote].filter(Boolean).join("\n");
}

function availableQuantity(onHand: number, reserved: number) {
  return onHand - reserved;
}

async function readOrder(orderId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, order_status, payment_status, notes")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();

  if (error) {
    throw new Error("Order lookup failed.");
  }

  return data ?? null;
}

async function writeAudit(
  action: string,
  orderId: string,
  details: unknown,
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.from("audit_logs").insert({
    staff_user_id: null,
    action,
    entity_type: "order",
    entity_id: orderId,
    details,
  });
}

async function updateOrderFields(
  orderId: string,
  fields: Partial<Pick<OrderRow, "order_status" | "payment_status" | "notes">>,
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { error } = await supabase.from("orders").update(fields).eq("id", orderId);

  if (error) {
    throw new Error("Order update failed.");
  }
}

function validateTransition(currentStatus: OrderStatus, nextStatus: OrderStatus) {
  if (currentStatus === nextStatus) {
    return null;
  }

  if (currentStatus === "cancelled") {
    return "Cancelled orders cannot be reopened.";
  }

  if (currentStatus === "refunded") {
    return "Refunded orders cannot be modified in this phase.";
  }

  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    return "Invalid order status transition.";
  }

  return null;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  notes?: string,
): Promise<MutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  if (!allowedOrderStatuses.includes(status)) {
    return { ok: false, error: "Unsupported order status." };
  }

  if (status === "cancelled") {
    return cancelOrder(orderId, notes || "Order cancelled by admin.");
  }

  const auth = await requireServerActionPermission("orders.edit");

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  if (!getSupabaseClient()) {
    return configError();
  }

  try {
    const order = await readOrder(orderId);

    if (!order) {
      return { ok: false, error: "Order was not found." };
    }

    const transitionError = validateTransition(order.order_status, status);

    if (transitionError) {
      return { ok: false, error: transitionError };
    }

    if (order.order_status === "held" && status === "completed" && order.payment_status !== "paid") {
      return {
        ok: false,
        error: "Held order must be paid before completion.",
      };
    }

    const nextNotes = notes
      ? appendNote(order.notes, `Order status changed to ${status}: ${notes}`)
      : order.notes;

    await updateOrderFields(orderId, {
      order_status: status,
      notes: nextNotes,
    });
    await writeAudit("order_status_updated", orderId, {
      from: order.order_status,
      to: status,
      notes: notes ?? null,
    });
    revalidateOrderPaths(orderId);

    return { ok: true, message: "Order status updated." };
  } catch {
    return {
      ok: false,
      error: safeMutationError("Order status update failed."),
    };
  }
}

export async function updatePaymentStatus(
  orderId: string,
  status: PaymentStatus,
  notes?: string,
): Promise<MutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const auth = await requireServerActionPermission("orders.edit");

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  if (!getSupabaseClient()) {
    return configError();
  }

  if (!allowedPaymentStatuses.includes(status) || status === "refunded") {
    return {
      ok: false,
      error: "Refund payment status is deferred until refund workflow exists.",
    };
  }

  try {
    const order = await readOrder(orderId);

    if (!order) {
      return { ok: false, error: "Order was not found." };
    }

    if (order.order_status === "refunded") {
      return { ok: false, error: "Refunded orders cannot be modified in this phase." };
    }

    const nextNotes = appendNote(
      order.notes,
      `Payment status changed to ${status}. Payment status updates do not process or reverse real payments.${notes ? ` ${notes}` : ""}`,
    );

    await updateOrderFields(orderId, {
      payment_status: status,
      notes: nextNotes,
    });
    await writeAudit("payment_status_updated", orderId, {
      from: order.payment_status,
      to: status,
      notes: notes ?? null,
    });
    revalidateOrderPaths(orderId);

    return { ok: true, message: "Payment status updated." };
  } catch {
    return {
      ok: false,
      error:
        safeMutationError("Payment status update failed."),
    };
  }
}

export async function addOrderNote(
  orderId: string,
  note: string,
): Promise<MutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const auth = await requireServerActionPermission("orders.edit");

  if (!auth.ok) {
    return { ok: false, error: auth.error };
  }

  if (!getSupabaseClient()) {
    return configError();
  }

  if (!note.trim()) {
    return { ok: false, error: "Note cannot be empty." };
  }

  try {
    const order = await readOrder(orderId);

    if (!order) {
      return { ok: false, error: "Order was not found." };
    }

    await updateOrderFields(orderId, {
      notes: appendNote(order.notes, `Note: ${note}`),
    });
    await writeAudit("order_note_added", orderId, { note });
    revalidateOrderPaths(orderId);

    return { ok: true, message: "Order note added." };
  } catch {
    return {
      ok: false,
      error: safeMutationError("Order note failed."),
    };
  }
}

export async function holdOrder(
  orderId: string,
  reason?: string,
): Promise<MutationResult> {
  return updateOrderStatus(orderId, "held", reason || "Order placed on hold.");
}

export async function completeHeldOrder(orderId: string): Promise<MutationResult> {
  return updateOrderStatus(orderId, "completed", "Held order completed.");
}

async function readSaleTransactions(orderId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("*")
    .eq("reference_type", "POS")
    .eq("reference_id", orderId)
    .eq("transaction_type", "sale");

  if (error) {
    throw new Error("Sale transaction lookup failed.");
  }

  return (data ?? []) as InventoryTransactionRow[];
}

async function readRestorationTransactions(orderId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("id")
    .eq("reference_type", "POS")
    .eq("reference_id", orderId)
    .eq("transaction_type", "return");

  if (error) {
    throw new Error("Restoration transaction lookup failed.");
  }

  return data ?? [];
}

async function readInventoryItem(inventoryItemId: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, product_id, on_hand_quantity, reserved_quantity, available_quantity, inventory_value, product:products(cost)")
    .eq("id", inventoryItemId)
    .maybeSingle<InventoryItemRow>();

  if (error) {
    throw new Error("Inventory item lookup failed.");
  }

  return data ?? null;
}

export async function cancelOrder(
  orderId: string,
  reason: string,
): Promise<MutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const auth = await requireServerActionPermission("orders.cancel");

  if (!auth.ok) {
    return { ok: false, error: auth.error, orderId };
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  if (!reason.trim()) {
    return { ok: false, error: "Cancellation reason is required." };
  }

  let order: OrderRow | null = null;

  try {
    order = await readOrder(orderId);

    if (!order) {
      return { ok: false, error: "Order was not found." };
    }

    if (
      launchContainment.completedOrderCancellation &&
      (order.order_status === "completed" ||
        order.payment_status === "paid" ||
        order.payment_status === "refunded")
    ) {
      return {
        ok: false,
        orderId,
        error: launchContainmentMessages.completedOrderCancellation,
      };
    }

    const transitionError = validateTransition(order.order_status, "cancelled");

    if (transitionError) {
      return { ok: false, error: transitionError };
    }

    if (order.order_status === "completed") {
      const [saleTransactions, restorationTransactions] = await Promise.all([
        readSaleTransactions(orderId),
        readRestorationTransactions(orderId),
      ]);

      if (restorationTransactions.length > 0) {
        return {
          ok: false,
          error: "This order already has inventory restoration rows.",
        };
      }

      if (saleTransactions.length === 0) {
        return {
          ok: false,
          error: "Completed POS order has no sale inventory transactions to restore.",
        };
      }

      for (const transaction of saleTransactions) {
        const inventoryItem = await readInventoryItem(transaction.inventory_item_id);

        if (!inventoryItem) {
          return {
            ok: false,
            critical: true,
            orderId,
            error: "Inventory item required for restoration was not found.",
          };
        }

        const restoredQuantity = Math.abs(transaction.quantity_change);
        const nextOnHand = inventoryItem.on_hand_quantity + restoredQuantity;
        const nextAvailable = availableQuantity(
          nextOnHand,
          inventoryItem.reserved_quantity,
        );
        const cost = toNumber(inventoryItem.product?.cost);
        const updateResult = await supabase
          .from("inventory_items")
          .update({
            on_hand_quantity: nextOnHand,
            available_quantity: nextAvailable,
            inventory_value: cost * nextOnHand,
          })
          .eq("id", inventoryItem.id);

        if (updateResult.error) {
          return {
            ok: false,
            critical: true,
            orderId,
            error: "Inventory restoration failed. Manual review required.",
          };
        }

        const ledgerResult = await supabase.from("inventory_transactions").insert({
          inventory_item_id: inventoryItem.id,
          transaction_type: "return",
          reference_type: "POS",
          reference_id: order.id,
          quantity_change: restoredQuantity,
          balance_after: nextOnHand,
          notes: `Order cancellation inventory restoration: ${order.order_number}. Reason: ${reason}`,
          performed_by: "Admin",
        });

        if (ledgerResult.error) {
          return {
            ok: false,
            critical: true,
            orderId,
            error: "Inventory restoration ledger failed. Manual review required.",
          };
        }
      }
    }

    await updateOrderFields(orderId, {
      order_status: "cancelled",
      notes: appendNote(order.notes, `Order cancelled: ${reason}`),
    });
    await writeAudit("order_cancelled", orderId, {
      reason,
      previousStatus: order.order_status,
    });
    revalidateOrderPaths(orderId);

    return { ok: true, message: "Order cancelled." };
  } catch {
    return {
      ok: false,
      critical: Boolean(order),
      orderId,
      error:
        "Cancellation failed. A production RPC/database transaction is required before live operational use.",
    };
  }
}
