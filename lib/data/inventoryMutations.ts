"use server";

import { randomUUID } from "crypto";
import { USE_SUPABASE } from "@/lib/config";
import {
  launchContainment,
  launchContainmentMessages,
} from "@/lib/launchContainment";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireServerActionPermission } from "@/lib/staff/serverActionAuth";

export type InventoryAdjustmentType =
  | "adjustment"
  | "damage"
  | "loss"
  | "cycle_count"
  | "opening_balance"
  | "return"
  | "receiving";

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

type InventoryMutationResult =
  | { ok: true; item: InventoryItemRow }
  | { ok: true; source: "local" }
  | { ok: false; error: string; critical?: boolean };

type CreateInventoryItemInput = {
  productId: string;
  locationId: string;
  onHandQuantity?: number;
  reservedQuantity?: number;
  incomingQuantity?: number;
  reorderLevel?: number;
  inventoryValue?: number;
};

type AdjustInventoryInput = {
  inventoryItemId: string;
  quantityChange: number;
  transactionType: InventoryAdjustmentType;
  notes?: string;
  referenceType?: string;
  referenceId?: string | null;
};

type ReceiveInventoryInput = {
  inventoryItemId: string;
  quantityReceived: number;
  notes?: string;
  referenceType?: string;
  referenceId?: string | null;
};

type TransferInventoryInput = {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
};

type InventoryTransferRpcResult = {
  success?: boolean;
  transfer_id?: string;
  destination_inventory_item_id?: string;
};

function disabledResult(): InventoryMutationResult {
  return {
    ok: true,
    source: "local",
  };
}

function configError(): InventoryMutationResult {
  return {
    ok: false,
    error:
      "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
  };
}

function availableQuantity(onHand: number, reserved: number) {
  return onHand - reserved;
}

function createTransferRequestKey() {
  return `inventory-transfer-${randomUUID()}`;
}

async function readInventoryItem(inventoryItemId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("id", inventoryItemId)
    .single<InventoryItemRow>();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function readInventoryItemForLocation(productId: string, locationId: string) {
  const supabase = createSupabaseServiceClient();

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
    throw new Error(error.message);
  }

  return data ?? null;
}

async function insertTransaction({
  inventoryItemId,
  transactionType,
  referenceType,
  referenceId,
  quantityChange,
  balanceAfter,
  notes,
}: {
  inventoryItemId: string;
  transactionType: string;
  referenceType: string;
  referenceId?: string | null;
  quantityChange: number;
  balanceAfter: number;
  notes?: string;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const { error } = await supabase.from("inventory_transactions").insert({
    inventory_item_id: inventoryItemId,
    transaction_type: transactionType,
    reference_type: referenceType,
    reference_id: referenceId ?? null,
    quantity_change: quantityChange,
    balance_after: balanceAfter,
    notes: notes?.trim() || null,
    performed_by: "Admin",
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createInventoryItem(
  input: CreateInventoryItemInput,
): Promise<InventoryMutationResult> {
  if (launchContainment.inventoryWrites) {
    return {
      ok: false,
      error: launchContainmentMessages.inventoryWrites,
    };
  }

  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const auth = await requireServerActionPermission("inventory.adjust");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return configError();
  }

  const onHand = input.onHandQuantity ?? 0;
  const reserved = input.reservedQuantity ?? 0;

  if (onHand < 0 || reserved < 0 || (input.incomingQuantity ?? 0) < 0) {
    return {
      ok: false,
      error: "Inventory quantities cannot be negative.",
    };
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .upsert(
      {
        product_id: input.productId,
        location_id: input.locationId,
        on_hand_quantity: onHand,
        reserved_quantity: reserved,
        available_quantity: availableQuantity(onHand, reserved),
        incoming_quantity: input.incomingQuantity ?? 0,
        reorder_level: input.reorderLevel ?? 0,
        inventory_value: input.inventoryValue ?? 0,
      },
      { onConflict: "product_id,location_id" },
    )
    .select("*")
    .single<InventoryItemRow>();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Inventory item was not returned.",
    };
  }

  return {
    ok: true,
    item: data,
  };
}

export async function adjustInventory(
  input: AdjustInventoryInput,
): Promise<InventoryMutationResult> {
  if (launchContainment.inventoryWrites) {
    return {
      ok: false,
      error: launchContainmentMessages.inventoryWrites,
    };
  }

  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const auth = await requireServerActionPermission("inventory.adjust");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return configError();
  }

  if (!Number.isInteger(input.quantityChange) || input.quantityChange === 0) {
    return {
      ok: false,
      error: "Quantity change must be a non-zero whole number.",
    };
  }

  try {
    const currentItem = await readInventoryItem(input.inventoryItemId);

    if (!currentItem) {
      return {
        ok: false,
        error: "Inventory item was not found.",
      };
    }

    const nextOnHand = currentItem.on_hand_quantity + input.quantityChange;

    if (nextOnHand < 0) {
      return {
        ok: false,
        error: "Inventory adjustment would create negative on-hand quantity.",
      };
    }

    const nextAvailable = availableQuantity(
      nextOnHand,
      currentItem.reserved_quantity,
    );
    const { data, error } = await supabase
      .from("inventory_items")
      .update({
        on_hand_quantity: nextOnHand,
        available_quantity: nextAvailable,
      })
      .eq("id", input.inventoryItemId)
      .select("*")
      .single<InventoryItemRow>();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Updated inventory item was not returned.",
      };
    }

    try {
      await insertTransaction({
        inventoryItemId: input.inventoryItemId,
        transactionType: input.transactionType,
        referenceType: input.referenceType ?? "Manual Adjustment",
        referenceId: input.referenceId,
        quantityChange: input.quantityChange,
        balanceAfter: nextOnHand,
        notes: input.notes,
      });
    } catch (transactionError) {
      return {
        ok: false,
        critical: true,
        error: `Inventory quantity was updated, but ledger insert failed: ${
          transactionError instanceof Error
            ? transactionError.message
            : "Unknown error"
        }. Future atomic RPC is required before production writes.`,
      };
    }

    return {
      ok: true,
      item: data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Inventory adjustment failed.",
    };
  }
}

export async function receiveInventory(
  input: ReceiveInventoryInput,
): Promise<InventoryMutationResult> {
  if (launchContainment.inventoryWrites) {
    return {
      ok: false,
      error: launchContainmentMessages.inventoryWrites,
    };
  }

  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const auth = await requireServerActionPermission("inventory.adjust");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  if (!Number.isInteger(input.quantityReceived) || input.quantityReceived <= 0) {
    return {
      ok: false,
      error: "Quantity received must be greater than zero.",
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return configError();
  }

  try {
    const currentItem = await readInventoryItem(input.inventoryItemId);

    if (!currentItem) {
      return {
        ok: false,
        error: "Inventory item was not found.",
      };
    }

    const nextOnHand = currentItem.on_hand_quantity + input.quantityReceived;
    const nextIncoming = Math.max(
      currentItem.incoming_quantity - input.quantityReceived,
      0,
    );
    const nextAvailable = availableQuantity(
      nextOnHand,
      currentItem.reserved_quantity,
    );
    const { data, error } = await supabase
      .from("inventory_items")
      .update({
        on_hand_quantity: nextOnHand,
        available_quantity: nextAvailable,
        incoming_quantity: nextIncoming,
      })
      .eq("id", input.inventoryItemId)
      .select("*")
      .single<InventoryItemRow>();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "Received inventory item was not returned.",
      };
    }

    try {
      await insertTransaction({
        inventoryItemId: input.inventoryItemId,
        transactionType: "receiving",
        referenceType: input.referenceType ?? "Purchase Order",
        referenceId: input.referenceId,
        quantityChange: input.quantityReceived,
        balanceAfter: nextOnHand,
        notes: input.notes,
      });
    } catch (transactionError) {
      return {
        ok: false,
        critical: true,
        error: `Inventory quantity was received, but ledger insert failed: ${
          transactionError instanceof Error
            ? transactionError.message
            : "Unknown error"
        }. Future atomic RPC is required before production writes.`,
      };
    }

    return {
      ok: true,
      item: data,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Inventory receiving failed.",
    };
  }
}

export async function transferInventory(
  input: TransferInventoryInput,
): Promise<InventoryMutationResult> {
  if (launchContainment.inventoryTransfers) {
    return {
      ok: false,
      error: launchContainmentMessages.inventoryWrites,
    };
  }

  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const auth = await requireServerActionPermission("inventory.transfer");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return configError();
  }

  if (input.fromLocationId === input.toLocationId) {
    return {
      ok: false,
      error: "Transfer locations must be different.",
    };
  }

  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return {
      ok: false,
      error: "Transfer quantity must be greater than zero.",
    };
  }

  try {
    const sourceItem = await readInventoryItemForLocation(
      input.productId,
      input.fromLocationId,
    );

    if (!sourceItem) {
      return {
        ok: false,
        error: "Source inventory item was not found.",
      };
    }

    if (sourceItem.available_quantity < input.quantity) {
      return {
        ok: false,
        error: "Not enough available stock at the source location.",
      };
    }

    if (sourceItem.on_hand_quantity - input.quantity < 0) {
      return {
        ok: false,
        error: "Transfer would create negative source stock.",
      };
    }

    const { data, error } = await supabase.rpc("transfer_inventory_transaction", {
      p_request_key: createTransferRequestKey(),
      p_product_id: input.productId,
      p_from_location_id: input.fromLocationId,
      p_to_location_id: input.toLocationId,
      p_quantity: input.quantity,
      p_notes: input.notes ?? null,
      p_performed_by: auth.employeeNumber,
    });

    if (error) {
      console.info("[ASHE TOKUN inventory]", "Transfer RPC failed.", {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      });

      return {
        ok: false,
        error: error.message || "Inventory transfer failed.",
      };
    }

    const result = data as InventoryTransferRpcResult | null;

    if (!result?.success || !result.destination_inventory_item_id) {
      return {
        ok: false,
        error: "Inventory transfer did not return a verified transfer result.",
      };
    }

    const destinationItem = await readInventoryItem(
      result.destination_inventory_item_id,
    );

    if (!destinationItem) {
      return {
        ok: false,
        error: "Transferred inventory item was not returned.",
      };
    }

    return {
      ok: true,
      item: destinationItem,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Inventory transfer failed.",
    };
  }
}

export async function setReorderLevel(
  inventoryItemId: string,
  reorderLevel: number,
): Promise<InventoryMutationResult> {
  if (launchContainment.inventoryWrites) {
    return {
      ok: false,
      error: launchContainmentMessages.inventoryWrites,
    };
  }

  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const auth = await requireServerActionPermission("inventory.adjust");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return configError();
  }

  if (!Number.isInteger(reorderLevel) || reorderLevel < 0) {
    return {
      ok: false,
      error: "Reorder level must be a non-negative whole number.",
    };
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .update({ reorder_level: reorderLevel })
    .eq("id", inventoryItemId)
    .select("*")
    .single<InventoryItemRow>();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Updated reorder level was not returned.",
    };
  }

  return {
    ok: true,
    item: data,
  };
}
