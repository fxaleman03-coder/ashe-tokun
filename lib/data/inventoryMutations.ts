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
  requestKey?: string;
};

type ReceiveInventoryInput = {
  inventoryItemId: string;
  quantityReceived: number;
  notes?: string;
  referenceType?: string;
  referenceId?: string | null;
  requestKey?: string;
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

type InventoryOperationRpcResult = {
  success?: boolean;
  inventory_item_id?: string;
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

function createInventoryOperationRequestKey(operation: string) {
  return `inventory-${operation}-${randomUUID()}`;
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
  if (launchContainment.inventoryAdjustments) {
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

  if (!input.transactionType) {
    return {
      ok: false,
      error: "Inventory adjustment requires a reason.",
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

    const nextAvailable =
      currentItem.available_quantity + input.quantityChange;

    if (
      currentItem.on_hand_quantity + input.quantityChange < 0 ||
      nextAvailable < 0
    ) {
      return {
        ok: false,
        error: "Inventory adjustment would create negative available stock.",
      };
    }

    const { data, error } = await supabase.rpc("adjust_inventory_transaction", {
      p_request_key:
        input.requestKey ?? createInventoryOperationRequestKey("adjustment"),
      p_inventory_item_id: input.inventoryItemId,
      p_quantity_change: input.quantityChange,
      p_transaction_type: input.transactionType,
      p_notes: input.notes ?? null,
      p_reference_type: input.referenceType ?? "Manual Adjustment",
      p_reference_id: input.referenceId ?? null,
      p_performed_by: auth.employeeNumber,
    });

    if (error) {
      console.info("[ASHE TOKUN inventory]", "Adjustment RPC failed.", {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      });

      return {
        ok: false,
        error: error.message || "Inventory adjustment failed.",
      };
    }

    const result = data as InventoryOperationRpcResult | null;

    if (!result?.success || result.inventory_item_id !== input.inventoryItemId) {
      return {
        ok: false,
        error: "Inventory adjustment did not return a verified result.",
      };
    }

    const updatedItem = await readInventoryItem(input.inventoryItemId);

    return {
      ok: true,
      item: updatedItem ?? currentItem,
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
  if (launchContainment.inventoryReceiving) {
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

    const { data, error } = await supabase.rpc("receive_inventory_transaction", {
      p_request_key:
        input.requestKey ?? createInventoryOperationRequestKey("receiving"),
      p_inventory_item_id: input.inventoryItemId,
      p_quantity_received: input.quantityReceived,
      p_notes: input.notes ?? null,
      p_reference_type: input.referenceType ?? "Purchase Order",
      p_reference_id: input.referenceId ?? null,
      p_performed_by: auth.employeeNumber,
    });

    if (error) {
      console.info("[ASHE TOKUN inventory]", "Receiving RPC failed.", {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      });

      return {
        ok: false,
        error: error.message || "Inventory receiving failed.",
      };
    }

    const result = data as InventoryOperationRpcResult | null;

    if (!result?.success || result.inventory_item_id !== input.inventoryItemId) {
      return {
        ok: false,
        error: "Inventory receiving did not return a verified result.",
      };
    }

    const updatedItem = await readInventoryItem(input.inventoryItemId);

    return {
      ok: true,
      item: updatedItem ?? currentItem,
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
  if (launchContainment.inventoryReorderLevel) {
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
