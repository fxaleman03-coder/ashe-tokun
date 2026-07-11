"use client";

import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";

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

async function readInventoryItem(inventoryItemId: string) {
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
  if (!USE_SUPABASE) {
    return disabledResult();
  }

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
  if (!USE_SUPABASE) {
    return disabledResult();
  }

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
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  if (!Number.isInteger(input.quantityReceived) || input.quantityReceived <= 0) {
    return {
      ok: false,
      error: "Quantity received must be greater than zero.",
    };
  }

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
  if (!USE_SUPABASE) {
    return disabledResult();
  }

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

    let destinationItem = await readInventoryItemForLocation(
      input.productId,
      input.toLocationId,
    );

    if (!destinationItem) {
      const createResult = await createInventoryItem({
        productId: input.productId,
        locationId: input.toLocationId,
      });

      if (!createResult.ok || !("item" in createResult)) {
        return {
          ok: false,
          error: "Destination inventory item could not be created.",
        };
      }

      destinationItem = createResult.item;
    }

    const nextSourceOnHand = sourceItem.on_hand_quantity - input.quantity;
    const nextDestinationOnHand =
      destinationItem.on_hand_quantity + input.quantity;

    const sourceUpdate = await supabase
      .from("inventory_items")
      .update({
        on_hand_quantity: nextSourceOnHand,
        available_quantity: availableQuantity(
          nextSourceOnHand,
          sourceItem.reserved_quantity,
        ),
      })
      .eq("id", sourceItem.id)
      .select("*")
      .single<InventoryItemRow>();

    if (sourceUpdate.error || !sourceUpdate.data) {
      return {
        ok: false,
        error:
          sourceUpdate.error?.message ??
          "Source inventory item update was not returned.",
      };
    }

    const destinationUpdate = await supabase
      .from("inventory_items")
      .update({
        on_hand_quantity: nextDestinationOnHand,
        available_quantity: availableQuantity(
          nextDestinationOnHand,
          destinationItem.reserved_quantity,
        ),
      })
      .eq("id", destinationItem.id)
      .select("*")
      .single<InventoryItemRow>();

    if (destinationUpdate.error || !destinationUpdate.data) {
      return {
        ok: false,
        critical: true,
        error:
          destinationUpdate.error?.message ??
          "Destination update failed after source stock changed. Future atomic RPC is required before production writes.",
      };
    }

    try {
      await insertTransaction({
        inventoryItemId: sourceItem.id,
        transactionType: "transfer_out",
        referenceType: "Inventory Transfer",
        quantityChange: -input.quantity,
        balanceAfter: nextSourceOnHand,
        notes: input.notes,
      });
      await insertTransaction({
        inventoryItemId: destinationItem.id,
        transactionType: "transfer_in",
        referenceType: "Inventory Transfer",
        quantityChange: input.quantity,
        balanceAfter: nextDestinationOnHand,
        notes: input.notes,
      });
    } catch (transactionError) {
      return {
        ok: false,
        critical: true,
        error: `Inventory transfer quantities changed, but ledger insert failed: ${
          transactionError instanceof Error
            ? transactionError.message
            : "Unknown error"
        }. Future atomic RPC is required before production writes.`,
      };
    }

    return {
      ok: true,
      item: destinationUpdate.data,
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
  if (!USE_SUPABASE) {
    return disabledResult();
  }

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
