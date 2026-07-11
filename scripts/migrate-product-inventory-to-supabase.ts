import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { products as localProducts } from "../lib/products";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  cost: number | string | null;
};

type InventoryLocationRow = {
  id: string;
  name: string;
};

type InventoryItemRow = {
  id: string;
  product_id: string;
  location_id: string;
  on_hand_quantity: number;
};

type MigrationStats = {
  totalActiveProducts: number;
  defaultLocation: string;
  inventoryItemsCreated: number;
  inventoryItemsReused: number;
  openingBalancesCreated: number;
  openingBalancesReused: number;
  skipped: number;
  warnings: string[];
  failed: number;
};

const CONFIRMATION_MESSAGE =
  "This migration will create live inventory items and opening balance transactions in Supabase. Re-run with --confirm to proceed.";
const DEFAULT_LOCATION_NAME = "Main Stockroom";
const MIGRATION_REFERENCE_TYPE = "Manual Adjustment";
const MIGRATION_REFERENCE_ID = "00000000-0000-0000-0000-000000008101";
const MIGRATION_REFERENCE_LABEL = "phase-8-1";
const OPENING_BALANCE_NOTES =
  "Initial inventory migration from legacy product stock (phase-8-1)";

const localProductsBySku = new Map(
  localProducts.map((product) => [product.sku, product]),
);

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");

  try {
    const envFile = readFileSync(envPath, "utf8");

    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^["']|["']$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    console.warn("Warning: .env.local could not be loaded.");
  }
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

async function getMainStockroom(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("inventory_locations")
    .select("id, name")
    .eq("name", DEFAULT_LOCATION_NAME)
    .maybeSingle<InventoryLocationRow>();

  if (error) {
    throw new Error(`Default inventory location lookup failed: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      `Default inventory location not found: ${DEFAULT_LOCATION_NAME}. Run the schema seed first.`,
    );
  }

  return data;
}

async function getActiveProducts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, sku, cost")
    .eq("active", true)
    .eq("status", "active")
    .order("name");

  if (error) {
    throw new Error(`Active product lookup failed: ${error.message}`);
  }

  return (data ?? []) as ProductRow[];
}

async function getExistingInventoryItem(
  supabase: SupabaseClient,
  productId: string,
  locationId: string,
) {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, product_id, location_id, on_hand_quantity")
    .eq("product_id", productId)
    .eq("location_id", locationId)
    .maybeSingle<InventoryItemRow>();

  if (error) {
    throw new Error(`Inventory item lookup failed: ${error.message}`);
  }

  return data ?? null;
}

async function createInventoryItem(
  supabase: SupabaseClient,
  product: ProductRow,
  locationId: string,
) {
  const localProduct = localProductsBySku.get(product.sku);
  const onHandQuantity = localProduct?.stock ?? 0;
  const reorderLevel = localProduct?.reorderLevel ?? 3;
  const inventoryValue = toNumber(product.cost) * onHandQuantity;
  const { data, error } = await supabase
    .from("inventory_items")
    .insert({
      product_id: product.id,
      location_id: locationId,
      on_hand_quantity: onHandQuantity,
      reserved_quantity: 0,
      available_quantity: onHandQuantity,
      incoming_quantity: 0,
      reorder_level: reorderLevel,
      inventory_value: inventoryValue,
    })
    .select("id, product_id, location_id, on_hand_quantity")
    .single<InventoryItemRow>();

  if (error) {
    throw new Error(`Inventory item create failed: ${error.message}`);
  }

  if (!data) {
    throw new Error("Inventory item create did not return a row.");
  }

  return data;
}

async function openingBalanceExists(
  supabase: SupabaseClient,
  inventoryItemId: string,
) {
  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("id")
    .eq("inventory_item_id", inventoryItemId)
    .eq("transaction_type", "opening_balance")
    .eq("reference_type", MIGRATION_REFERENCE_TYPE)
    .eq("reference_id", MIGRATION_REFERENCE_ID)
    .limit(1);

  if (error) {
    throw new Error(`Opening balance lookup failed: ${error.message}`);
  }

  return Boolean(data?.length);
}

async function createOpeningBalance(
  supabase: SupabaseClient,
  inventoryItem: InventoryItemRow,
) {
  const { error } = await supabase.from("inventory_transactions").insert({
    inventory_item_id: inventoryItem.id,
    transaction_type: "opening_balance",
    reference_type: MIGRATION_REFERENCE_TYPE,
    reference_id: MIGRATION_REFERENCE_ID,
    quantity_change: inventoryItem.on_hand_quantity,
    balance_after: inventoryItem.on_hand_quantity,
    notes: OPENING_BALANCE_NOTES,
    performed_by: "phase-8-1",
  });

  if (error) {
    throw new Error(`Opening balance insert failed: ${error.message}`);
  }
}

async function main() {
  if (!process.argv.includes("--confirm")) {
    console.log(CONFIRMATION_MESSAGE);
    return;
  }

  loadLocalEnv();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const location = await getMainStockroom(supabase);
  const products = await getActiveProducts(supabase);
  const stats: MigrationStats = {
    totalActiveProducts: products.length,
    defaultLocation: location.name,
    inventoryItemsCreated: 0,
    inventoryItemsReused: 0,
    openingBalancesCreated: 0,
    openingBalancesReused: 0,
    skipped: 0,
    warnings: [
      `Schema note: inventory_transactions.reference_id is UUID, so ${MIGRATION_REFERENCE_LABEL} is tracked with stable UUID ${MIGRATION_REFERENCE_ID} and notes.`,
    ],
    failed: 0,
  };

  for (const product of products) {
    try {
      let inventoryItem = await getExistingInventoryItem(
        supabase,
        product.id,
        location.id,
      );
      const wasExisting = Boolean(inventoryItem);

      if (!inventoryItem) {
        inventoryItem = await createInventoryItem(supabase, product, location.id);
        stats.inventoryItemsCreated += 1;
      } else {
        stats.inventoryItemsReused += 1;
      }

      const hasOpeningBalance = await openingBalanceExists(
        supabase,
        inventoryItem.id,
      );

      if (hasOpeningBalance || wasExisting) {
        stats.openingBalancesReused += hasOpeningBalance ? 1 : 0;
        continue;
      }

      await createOpeningBalance(supabase, inventoryItem);
      stats.openingBalancesCreated += 1;
    } catch (error) {
      stats.failed += 1;
      stats.skipped += 1;
      stats.warnings.push(
        `${product.sku}: ${
          error instanceof Error ? error.message : "Unknown migration error"
        }`,
      );
    }
  }

  console.log("\nInventory migration summary");
  console.log(`Total active products: ${stats.totalActiveProducts}`);
  console.log(`Default location: ${stats.defaultLocation}`);
  console.log(`Inventory items created: ${stats.inventoryItemsCreated}`);
  console.log(`Inventory items reused: ${stats.inventoryItemsReused}`);
  console.log(`Opening balances created: ${stats.openingBalancesCreated}`);
  console.log(`Opening balances reused: ${stats.openingBalancesReused}`);
  console.log(`Skipped: ${stats.skipped}`);
  console.log(`Warnings: ${stats.warnings.length}`);
  console.log(`Failed: ${stats.failed}`);

  if (stats.warnings.length > 0) {
    console.log("\nWarnings");
    for (const warning of stats.warnings) {
      console.log(`- ${warning}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
