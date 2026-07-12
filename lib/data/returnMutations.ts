"use client";

import { USE_SUPABASE } from "@/lib/config";
import {
  getReturnById,
  getReturnItems,
  getReturnableOrderItems,
} from "@/lib/data/returnsRepository";
import { supabase } from "@/lib/supabase";
import type {
  ReceivedReturnItemInput,
  ReturnCompletionInput,
  ReturnCondition,
  ReturnInput,
  ReturnResult,
  ReturnStatus,
  ReturnType as ReturnKind,
} from "@/lib/types/return";

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  order_status: string;
  notes: string | null;
};

type InventoryItemRow = {
  id: string;
  product_id: string;
  location_id: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  inventory_value: number | string;
  product?: { cost?: number | string | null } | null;
};

type SaleInventoryTransactionRow = {
  inventory_item_id: string | null;
  inventory_item:
    | {
        id: string;
        product_id: string;
        location_id: string;
      }
    | {
        id: string;
        product_id: string;
        location_id: string;
      }[]
    | null;
};

const allowedReturnTypes = new Set<ReturnKind>([
  "refund",
  "exchange",
  "store_credit",
]);
const allowedConditions = new Set<ReturnCondition>([
  "unopened",
  "sellable",
  "opened",
  "damaged",
  "defective",
  "missing_parts",
  "other",
]);
const restockableConditions = new Set<ReturnCondition>(["unopened", "sellable"]);
const allowedTransitions: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ["approved", "cancelled"],
  approved: ["received", "cancelled"],
  received: ["completed"],
  completed: [],
  cancelled: [],
};

function disabledResult(): ReturnResult {
  return {
    ok: false,
    error: "Live returns require Supabase mode.",
  };
}

function configError(): ReturnResult {
  return {
    ok: false,
    error:
      "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
  };
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function toMoney(value: number) {
  return Number(value.toFixed(2));
}

function appendNote(existingNotes: string | null, note: string) {
  const timestamp = new Date().toISOString();

  return [existingNotes, `[${timestamp}] ${note.trim()}`]
    .filter(Boolean)
    .join("\n");
}

function validateTransition(currentStatus: ReturnStatus, nextStatus: ReturnStatus) {
  if (currentStatus === nextStatus) {
    return null;
  }

  if (currentStatus === "completed") {
    return "Completed returns cannot be changed.";
  }

  if (currentStatus === "cancelled") {
    return "Cancelled returns cannot be reopened.";
  }

  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    return "Invalid return status transition.";
  }

  return null;
}

async function writeAudit(action: string, returnId: string | null, details: unknown) {
  if (!supabase) {
    return;
  }

  await supabase.from("audit_logs").insert({
    staff_user_id: null,
    action,
    entity_type: "return",
    entity_id: returnId,
    details,
  });
}

async function readOrder(orderId: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_id, order_status, notes")
    .eq("id", orderId)
    .maybeSingle<OrderRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function getNextReturnNumber() {
  if (!supabase) {
    return "ASH-RET-000001";
  }

  const { data, error } = await supabase
    .from("returns")
    .select("return_number")
    .like("return_number", "ASH-RET-%")
    .order("return_number", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const nextNumber =
    (data ?? [])
      .map((row) => String(row.return_number ?? ""))
      .map((value) => {
        const match = value.match(/(\d+)$/);

        return match ? Number(match[1]) : 0;
      })
      .reduce((highest, value) => Math.max(highest, value), 0) + 1;

  return `ASH-RET-${String(nextNumber).padStart(6, "0")}`;
}

async function updateReturnStatus(
  returnId: string,
  status: ReturnStatus,
  note: string,
) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const returnRecord = await getReturnById(returnId);

  if (!returnRecord) {
    return { ok: false, error: "Return was not found." } satisfies ReturnResult;
  }

  const transitionError = validateTransition(returnRecord.status, status);

  if (transitionError) {
    return { ok: false, error: transitionError } satisfies ReturnResult;
  }

  const { error } = await supabase
    .from("returns")
    .update({
      status,
      notes: appendNote(returnRecord.notes, note),
    })
    .eq("id", returnId);

  if (error) {
    return { ok: false, error: error.message } satisfies ReturnResult;
  }

  await writeAudit(`return_${status}`, returnId, {
    from: returnRecord.status,
    to: status,
    note,
  });

  return { ok: true, message: "Return status updated.", returnId };
}

export async function createReturn(input: ReturnInput): Promise<ReturnResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  if (!supabase) {
    return configError();
  }

  if (!allowedReturnTypes.has(input.return_type)) {
    return { ok: false, error: "Return type is not supported." };
  }

  if (!input.reason.trim()) {
    return { ok: false, error: "Return reason is required." };
  }

  if (input.items.length === 0) {
    return { ok: false, error: "At least one return item is required." };
  }

  try {
    const order = await readOrder(input.order_id);

    if (!order) {
      return { ok: false, error: "Original order was not found." };
    }

    if (order.order_status === "draft" || order.order_status === "cancelled") {
      return { ok: false, error: "This order is not eligible for return." };
    }

    const returnableItems = await getReturnableOrderItems(input.order_id);
    const returnableById = new Map(
      returnableItems.map((item) => [item.order_item_id, item]),
    );
    const lineItems = [];
    let refundTotal = 0;

    for (const item of input.items) {
      const returnableItem = returnableById.get(item.order_item_id);

      if (!returnableItem) {
        return {
          ok: false,
          error: "Selected return item does not belong to the order.",
        };
      }

      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return { ok: false, error: "Return quantity must be greater than 0." };
      }

      if (item.quantity > returnableItem.quantity_returnable) {
        return {
          ok: false,
          error: `${returnableItem.product_name} only has ${returnableItem.quantity_returnable} returnable units.`,
        };
      }

      const eligibleValue = returnableItem.unit_price * item.quantity;
      const refundAmount = item.refund_amount ?? eligibleValue;

      if (refundAmount < 0 || refundAmount > eligibleValue) {
        return {
          ok: false,
          error: "Refund amount cannot exceed eligible returned item value.",
        };
      }

      refundTotal += refundAmount;
      lineItems.push({
        order_item_id: item.order_item_id,
        product_id: returnableItem.product_id,
        sku: returnableItem.sku,
        product_name: returnableItem.product_name,
        quantity: item.quantity,
        reason: item.reason || input.reason,
        condition: item.condition ?? null,
        refund_amount: toMoney(refundAmount),
      });
    }

    let lastError = "Return request creation failed.";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidateNumber = await getNextReturnNumber();
      const returnNumber =
        attempt === 0 ? candidateNumber : `${candidateNumber}-${attempt + 1}`;
      const { data: returnData, error: returnError } = await supabase
        .from("returns")
        .insert({
          return_number: returnNumber,
          order_id: order.id,
          customer_id: order.customer_id,
          return_type: input.return_type,
          status: "requested",
          refund_total: toMoney(refundTotal),
          notes: appendNote(
            null,
            `Return requested. Reason: ${input.reason}.${input.notes ? ` Notes: ${input.notes}` : ""}`,
          ),
        })
        .select("id, return_number")
        .single<{ id: string; return_number: string }>();

      if (returnError || !returnData) {
        lastError = returnError?.message ?? lastError;

        if (returnError?.code === "23505") {
          continue;
        }

        break;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("return_items")
        .insert(
          lineItems.map((item) => ({
            ...item,
            return_id: returnData.id,
          })),
        )
        .select("id");

      if (itemsError || !itemsData || itemsData.length !== lineItems.length) {
        return {
          ok: false,
          critical: true,
          returnId: returnData.id,
          error: `Return ${returnData.return_number} was created, but return item creation failed: ${itemsError?.message ?? "missing returned rows"}. Manual review required.`,
        };
      }

      await writeAudit("return_created", returnData.id, {
        order_id: order.id,
        return_number: returnData.return_number,
        return_type: input.return_type,
        refund_total: refundTotal,
      });

      return {
        ok: true,
        message: "Return request created.",
        returnId: returnData.id,
        returnNumber: returnData.return_number,
      };
    }

    return { ok: false, error: lastError };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Return creation failed.",
    };
  }
}

export async function approveReturn(returnId: string, notes?: string) {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  if (!supabase) {
    return configError();
  }

  return updateReturnStatus(
    returnId,
    "approved",
    `Return approved.${notes ? ` ${notes}` : ""}`,
  );
}

export async function receiveReturn(
  returnId: string,
  receivedItems: ReceivedReturnItemInput[],
) {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  if (!supabase) {
    return configError();
  }

  try {
    const returnRecord = await getReturnById(returnId);

    if (!returnRecord) {
      return { ok: false, error: "Return was not found." };
    }

    const transitionError = validateTransition(returnRecord.status, "received");

    if (transitionError) {
      return { ok: false, error: transitionError };
    }

    const returnItems = await getReturnItems(returnId);
    const itemsById = new Map(returnItems.map((item) => [item.id, item]));

    for (const receivedItem of receivedItems) {
      const returnItem = itemsById.get(receivedItem.return_item_id);

      if (!returnItem) {
        return { ok: false, error: "Received item does not belong to return." };
      }

      if (
        !Number.isInteger(receivedItem.quantity_received) ||
        receivedItem.quantity_received <= 0 ||
        receivedItem.quantity_received > returnItem.quantity
      ) {
        return {
          ok: false,
          error: "Received quantity must be greater than 0 and cannot exceed approved quantity.",
        };
      }

      if (!allowedConditions.has(receivedItem.condition)) {
        return { ok: false, error: "Condition is required for every item." };
      }

      const noteParts = [
        returnItem.reason,
        `Received quantity: ${receivedItem.quantity_received}`,
        `Restock decision: ${receivedItem.restock ? "restock" : "do not restock"}`,
        receivedItem.notes,
      ].filter(Boolean);
      const { error } = await supabase
        .from("return_items")
        .update({
          condition: receivedItem.condition,
          reason: noteParts.join(" | "),
        })
        .eq("id", receivedItem.return_item_id);

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    const statusResult = await updateReturnStatus(
      returnId,
      "received",
      "Returned items received and conditions recorded.",
    );

    if (statusResult.ok) {
      await writeAudit("return_received", returnId, { receivedItems });
    }

    return statusResult;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Return receive failed.",
    };
  }
}

async function readInventoryItemForReturn(
  orderId: string,
  productId: string | null,
) {
  if (!supabase || !productId) {
    return null;
  }

  const { data: transactions, error: transactionError } = await supabase
    .from("inventory_transactions")
    .select("inventory_item_id, inventory_item:inventory_items(id, product_id, location_id)")
    .eq("reference_type", "POS")
    .eq("reference_id", orderId)
    .eq("transaction_type", "sale");

  if (transactionError) {
    throw new Error(transactionError.message);
  }

  const matchedTransaction = (transactions ?? []).find((transaction) => {
    const typedTransaction = transaction as SaleInventoryTransactionRow;
    const inventoryItem = Array.isArray(typedTransaction.inventory_item)
      ? typedTransaction.inventory_item[0]
      : typedTransaction.inventory_item;

    return inventoryItem?.product_id === productId;
  });

  if (!matchedTransaction?.inventory_item_id) {
    return null;
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*, product:products(cost)")
    .eq("id", matchedTransaction.inventory_item_id)
    .maybeSingle<InventoryItemRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function restoreInventoryForReturnItem(
  returnRecord: NonNullable<Awaited<ReturnType<typeof getReturnById>>>,
  returnItem: Awaited<ReturnType<typeof getReturnItems>>[number],
  condition: ReturnCondition,
) {
  if (!supabase || !returnRecord.order_id) {
    throw new Error("Return is not linked to an original order.");
  }

  const inventoryItem = await readInventoryItemForReturn(
    returnRecord.order_id,
    returnItem.product_id,
  );

  if (!inventoryItem) {
    throw new Error(`Original inventory item was not found for ${returnItem.product_name}.`);
  }

  const nextOnHand = inventoryItem.on_hand_quantity + returnItem.quantity;
  const nextAvailable = nextOnHand - inventoryItem.reserved_quantity;
  const cost = toNumber(inventoryItem.product?.cost);
  const updateResult = await supabase
    .from("inventory_items")
    .update({
      on_hand_quantity: nextOnHand,
      available_quantity: nextAvailable,
      inventory_value: toMoney(cost * nextOnHand),
    })
    .eq("id", inventoryItem.id);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  const transactionResult = await supabase
    .from("inventory_transactions")
    .insert({
      inventory_item_id: inventoryItem.id,
      transaction_type: "return",
      reference_type: "Customer Return",
      reference_id: returnRecord.id,
      quantity_change: returnItem.quantity,
      balance_after: nextOnHand,
      notes: `Return ${returnRecord.return_number} / original order ${returnRecord.order_number ?? returnRecord.order_id} / condition ${condition}`,
      performed_by: "Admin",
    });

  if (transactionResult.error) {
    throw new Error(transactionResult.error.message);
  }
}

async function createStoreCredit(
  returnRecord: NonNullable<Awaited<ReturnType<typeof getReturnById>>>,
  amount: number,
) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  if (!returnRecord.customer_id) {
    throw new Error("Store credit requires a customer record.");
  }

  const giftCardNumber = `ASH-CR-${returnRecord.return_number.replace(
    /^ASH-RET-/,
    "",
  )}`;
  const { error } = await supabase.from("gift_cards").insert({
    gift_card_number: giftCardNumber,
    initial_balance: toMoney(amount),
    current_balance: toMoney(amount),
    status: "active",
    issued_to_customer_id: returnRecord.customer_id,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("Store credit already exists for this return.");
    }

    throw new Error(error.message);
  }

  await writeAudit("store_credit_issued", returnRecord.id, {
    gift_card_number: giftCardNumber,
    amount,
  });

  return giftCardNumber;
}

async function recordRefundPayment(
  returnRecord: NonNullable<Awaited<ReturnType<typeof getReturnById>>>,
  method: string,
  amount: number,
) {
  if (!supabase || !returnRecord.order_id) {
    return;
  }

  const paymentMethod = method === "card" ? "card" : method === "cash" ? "cash" : "other";
  const { error } = await supabase.from("payments").insert({
    order_id: returnRecord.order_id,
    payment_method: paymentMethod,
    amount: toMoney(amount),
    reference_number: `Administrative refund for ${returnRecord.return_number}. ${method === "card" ? "Card refund must be processed manually through the payment provider." : "No external payment processing performed."}`,
    payment_status: "refunded",
    received_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  await writeAudit("refund_recorded", returnRecord.id, {
    method,
    amount,
  });
}

export async function completeReturn(
  returnId: string,
  completionInput: ReturnCompletionInput,
): Promise<ReturnResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  if (!supabase) {
    return configError();
  }

  try {
    const returnRecord = await getReturnById(returnId);

    if (!returnRecord) {
      return { ok: false, error: "Return was not found." };
    }

    const transitionError = validateTransition(returnRecord.status, "completed");

    if (transitionError) {
      return { ok: false, error: transitionError };
    }

    if (returnRecord.status !== "received") {
      return { ok: false, error: "Return must be received before completion." };
    }

    const existingReturnTransactions = await supabase
      .from("inventory_transactions")
      .select("id")
      .eq("reference_type", "Customer Return")
      .eq("reference_id", returnId)
      .eq("transaction_type", "return");

    if (existingReturnTransactions.error) {
      return { ok: false, error: existingReturnTransactions.error.message };
    }

    if ((existingReturnTransactions.data ?? []).length > 0) {
      return {
        ok: false,
        error: "This return already has restoration ledger rows.",
      };
    }

    const returnItems = await getReturnItems(returnId);
    const restockMap = new Map(
      (completionInput.restockItems ?? []).map((item) => [
        item.return_item_id,
        item,
      ]),
    );

    for (const item of returnItems) {
      const restockItem = restockMap.get(item.id);
      const condition = restockItem?.condition ?? item.condition;
      const shouldRestock =
        restockItem?.restock === true &&
        condition !== null &&
        restockableConditions.has(condition);

      if (shouldRestock && condition) {
        await restoreInventoryForReturnItem(returnRecord, item, condition);
      }
    }

    let completionNote = completionInput.notes ?? "Return completed.";

    if (returnRecord.return_type === "refund") {
      if (!completionInput.refund) {
        return { ok: false, error: "Refund method and amount are required." };
      }

      if (
        completionInput.refund.amount < 0 ||
        completionInput.refund.amount > returnRecord.refund_total
      ) {
        return {
          ok: false,
          error: "Refund amount cannot exceed eligible return value.",
        };
      }

      await recordRefundPayment(
        returnRecord,
        completionInput.refund.refund_method,
        completionInput.refund.amount,
      );
      completionNote = `${completionNote} Refund method: ${completionInput.refund.refund_method}. Amount: ${completionInput.refund.amount.toFixed(2)}. ${completionInput.refund.refund_method === "card" ? "Card refund must be processed manually through the payment provider." : "Administrative tracking only."}`;
    }

    if (returnRecord.return_type === "store_credit") {
      const amount =
        completionInput.storeCredit?.amount ?? returnRecord.refund_total;

      if (amount <= 0 || amount > returnRecord.refund_total) {
        return {
          ok: false,
          error: "Store credit amount cannot exceed eligible return value.",
        };
      }

      const creditNumber = await createStoreCredit(returnRecord, amount);
      completionNote = `${completionNote} Store credit issued: ${creditNumber} for ${amount.toFixed(2)}.`;
    }

    if (returnRecord.return_type === "exchange") {
      const exchange = completionInput.exchange;
      const returnedValue = exchange?.returned_value ?? returnRecord.refund_total;
      const replacementValue = exchange?.replacement_value ?? 0;
      const difference =
        exchange?.price_difference ?? replacementValue - returnedValue;

      completionNote = `${completionNote} Exchange tracked administratively. Returned value: ${returnedValue.toFixed(2)}. Replacement value: ${replacementValue.toFixed(2)}. Difference: ${difference.toFixed(2)}. ${exchange?.notes ?? ""}`;
      await writeAudit("exchange_completed", returnRecord.id, {
        returnedValue,
        replacementValue,
        difference,
      });
    }

    const { error } = await supabase
      .from("returns")
      .update({
        status: "completed",
        notes: appendNote(returnRecord.notes, completionNote),
      })
      .eq("id", returnId);

    if (error) {
      return {
        ok: false,
        critical: true,
        returnId,
        error: `Return inventory/refund steps may have completed, but status update failed: ${error.message}. Manual review required.`,
      };
    }

    await writeAudit("return_completed", returnId, {
      return_type: returnRecord.return_type,
      refund_total: returnRecord.refund_total,
    });

    return { ok: true, message: "Return completed.", returnId };
  } catch (error) {
    return {
      ok: false,
      critical: true,
      returnId,
      error: `Return completion failed for ${returnId}: ${error instanceof Error ? error.message : "Unknown error"}. A production RPC/database transaction is required before live operational use.`,
    };
  }
}

export async function cancelReturn(returnId: string, reason: string) {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  if (!supabase) {
    return configError();
  }

  if (!reason.trim()) {
    return { ok: false, error: "Cancellation reason is required." };
  }

  return updateReturnStatus(returnId, "cancelled", `Return cancelled: ${reason}`);
}

export async function addReturnNote(returnId: string, note: string) {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  if (!supabase) {
    return configError();
  }

  if (!note.trim()) {
    return { ok: false, error: "Note cannot be empty." };
  }

  const returnRecord = await getReturnById(returnId);

  if (!returnRecord) {
    return { ok: false, error: "Return was not found." };
  }

  if (returnRecord.status === "completed" || returnRecord.status === "cancelled") {
    return {
      ok: false,
      error: "Completed or cancelled returns cannot be changed in this phase.",
    };
  }

  if (!supabase) {
    return configError();
  }

  const { error } = await supabase
    .from("returns")
    .update({ notes: appendNote(returnRecord.notes, `Note: ${note}`) })
    .eq("id", returnId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await writeAudit("return_note_added", returnId, { note });

  return { ok: true, message: "Return note added.", returnId };
}
