import { USE_SUPABASE } from "@/lib/config";
import { products as localProducts } from "@/lib/products";
import { supabase } from "@/lib/supabase";

type InventorySource = "Supabase" | "Local fallback";

export type InventoryLocation = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  location_type: string;
  active: boolean;
};

export type InventoryProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  barcode: string;
  image: string | null;
  brand: string;
  category: string;
};

export type InventoryItem = {
  id: string;
  product_id: string;
  location_id: string;
  location_name: string;
  on_hand_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  incoming_quantity: number;
  reorder_level: number;
  inventory_value: number;
  updated_at: string | null;
  source: InventorySource;
  product: InventoryProduct;
};

export type InventoryTransaction = {
  id: string;
  inventory_item_id: string;
  transaction_type: string;
  reference_type: string;
  reference_id: string | null;
  quantity_change: number;
  balance_after: number;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
};

export type InventoryProductSummary = {
  product_id: string;
  total_on_hand: number;
  total_reserved: number;
  total_available: number;
  total_incoming: number;
  locations_count: number;
  first_inventory_item_id: string | null;
};

export type InventoryLocationSummary = {
  location_id: string;
  location_name: string;
  location_code: string;
  location_type: string;
  active: boolean;
  total_inventory_items: number;
  total_on_hand: number;
  total_available: number;
  inventory_value: number;
};

export type InventorySummary = {
  totalInventoryItems: number;
  totalOnHand: number;
  totalAvailable: number;
  reserved: number;
  incoming: number;
  lowStock: number;
  outOfStock: number;
  inventoryValue: number;
  source: InventorySource;
};

type SupabaseInventoryItemRow = {
  id: string;
  product_id: string;
  location_id: string;
  on_hand_quantity: number | null;
  reserved_quantity: number | null;
  available_quantity: number | null;
  incoming_quantity: number | null;
  reorder_level: number | null;
  inventory_value: number | string | null;
  updated_at: string | null;
  location?: {
    name?: string | null;
    code?: string | null;
    description?: string | null;
    location_type?: string | null;
    active?: boolean | null;
  } | null;
  product?: {
    id?: string | null;
    name?: string | null;
    slug?: string | null;
    sku?: string | null;
    barcode?: string | null;
    brand?: { name?: string | null } | null;
    category?: { name?: string | null } | null;
  } | null;
};

type ProductMediaRow = {
  product_id: string;
  media_asset?:
    | {
        public_url?: string | null;
        storage_path?: string | null;
        active?: boolean | null;
      }
    | Array<{
        public_url?: string | null;
        storage_path?: string | null;
        active?: boolean | null;
      }>
    | null;
};

const localProductsBySku = new Map(
  localProducts.map((product) => [product.sku, product]),
);

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getMediaUrl(row: ProductMediaRow) {
  const mediaAsset = Array.isArray(row.media_asset)
    ? row.media_asset[0]
    : row.media_asset;

  if (!mediaAsset?.active) {
    return null;
  }

  if (mediaAsset.public_url) {
    return mediaAsset.public_url;
  }

  if (mediaAsset.storage_path && supabase) {
    return supabase.storage
      .from("product-media")
      .getPublicUrl(mediaAsset.storage_path).data.publicUrl;
  }

  return null;
}

function getLocalFallbackInventoryItems(): InventoryItem[] {
  return localProducts.map((product) => ({
    id: `local-${product.id}`,
    product_id: product.id,
    location_id: "local-main-stockroom",
    location_name: product.inventoryLocation ?? "Local Inventory",
    on_hand_quantity: product.stock,
    reserved_quantity: 0,
    available_quantity: product.stock,
    incoming_quantity: 0,
    reorder_level: product.reorderLevel ?? 0,
    inventory_value: (product.cost ?? product.price) * product.stock,
    updated_at: null,
    source: "Local fallback",
    product: {
      id: product.id,
      name: product.name.en,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode,
      image: product.image,
      brand: product.vendor,
      category: product.category.en,
    },
  }));
}

function getLocalFallbackLocations(): InventoryLocation[] {
  return [
    {
      id: "local-main-stockroom",
      name: "Local Inventory",
      code: "LOCAL",
      description: "Local fallback inventory from the seed catalog.",
      location_type: "local",
      active: true,
    },
  ];
}

async function getPrimaryImagesByProductId(productIds: string[]) {
  const imagesByProductId = new Map<string, string>();

  if (!USE_SUPABASE || !supabase || productIds.length === 0) {
    return imagesByProductId;
  }

  const { data, error } = await supabase
    .from("product_media")
    .select("product_id, media_asset:media_assets(public_url, storage_path, active)")
    .in("product_id", productIds)
    .eq("is_primary", true);

  if (error) {
    console.info(
      "[ASHE TOKUN inventory repository]",
      "Primary product image lookup failed.",
      {
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
      },
    );

    return imagesByProductId;
  }

  for (const row of (data ?? []) as ProductMediaRow[]) {
    const mediaUrl = getMediaUrl(row);

    if (mediaUrl) {
      imagesByProductId.set(row.product_id, mediaUrl);
    }
  }

  return imagesByProductId;
}

async function readInventoryItems(): Promise<InventoryItem[]> {
  if (!USE_SUPABASE || !supabase) {
    return getLocalFallbackInventoryItems();
  }

  const { data, error } = await supabase
    .from("inventory_items")
    .select(
      `
        id,
        product_id,
        location_id,
        on_hand_quantity,
        reserved_quantity,
        available_quantity,
        incoming_quantity,
        reorder_level,
        inventory_value,
        updated_at,
        location:inventory_locations(name, code, description, location_type, active),
        product:products(
          id,
          name,
          slug,
          sku,
          barcode,
          brand:brands(name),
          category:categories(name)
        )
      `,
    )
    .order("updated_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return getLocalFallbackInventoryItems();
  }

  const rows = data as SupabaseInventoryItemRow[];
  const primaryImagesByProductId = await getPrimaryImagesByProductId(
    rows.map((row) => row.product_id),
  );

  return rows.map((row) => {
    const onHand = row.on_hand_quantity ?? 0;
    const reserved = row.reserved_quantity ?? 0;
    const calculatedAvailable = onHand - reserved;
    const storedAvailable = row.available_quantity ?? calculatedAvailable;
    const localProduct = row.product?.sku
      ? localProductsBySku.get(row.product.sku)
      : undefined;

    return {
      id: row.id,
      product_id: row.product_id,
      location_id: row.location_id,
      location_name: row.location?.name ?? "Unassigned",
      on_hand_quantity: onHand,
      reserved_quantity: reserved,
      available_quantity:
        storedAvailable === calculatedAvailable
          ? storedAvailable
          : calculatedAvailable,
      incoming_quantity: row.incoming_quantity ?? 0,
      reorder_level: row.reorder_level ?? 0,
      inventory_value: toNumber(row.inventory_value),
      updated_at: row.updated_at,
      source: "Supabase",
      product: {
        id: row.product?.id ?? row.product_id,
        name: row.product?.name ?? "Unnamed Product",
        slug: row.product?.slug ?? "",
        sku: row.product?.sku ?? "",
        barcode: row.product?.barcode ?? "",
        image:
          primaryImagesByProductId.get(row.product_id) ??
          localProduct?.image ??
          null,
        brand: row.product?.brand?.name ?? localProduct?.vendor ?? "Unassigned",
        category:
          row.product?.category?.name ?? localProduct?.category.en ?? "Unassigned",
      },
    };
  });
}

export async function getInventoryLocations(): Promise<InventoryLocation[]> {
  if (!USE_SUPABASE || !supabase) {
    return getLocalFallbackLocations();
  }

  const { data, error } = await supabase
    .from("inventory_locations")
    .select("id, name, code, description, location_type, active")
    .eq("active", true)
    .order("name");

  if (error || !data || data.length === 0) {
    return getLocalFallbackLocations();
  }

  return data as InventoryLocation[];
}

export async function getInventoryItems() {
  return readInventoryItems();
}

export async function getInventoryItemByProduct(productId: string) {
  const items = await getInventoryForProduct(productId);

  return items[0] ?? null;
}

export async function getInventoryItemsByProduct(productId: string) {
  return getInventoryForProduct(productId);
}

export async function getInventoryForProduct(productId: string) {
  const items = await getInventoryItems();

  return items.filter((item) => item.product_id === productId);
}

export async function getInventoryItemsByLocation(locationId: string) {
  const items = await getInventoryItems();

  return items.filter((item) => item.location_id === locationId);
}

export async function getInventoryTransactions(inventoryItemId: string) {
  if (!USE_SUPABASE || !supabase || inventoryItemId.startsWith("local-")) {
    return [] satisfies InventoryTransaction[];
  }

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select(
      "id, inventory_item_id, transaction_type, reference_type, reference_id, quantity_change, balance_after, notes, performed_by, created_at",
    )
    .eq("inventory_item_id", inventoryItemId)
    .order("created_at", { ascending: false });

  if (error) {
    console.info(
      "[ASHE TOKUN inventory repository]",
      "Inventory transaction read failed.",
      {
        inventoryItemId,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
      },
    );

    return [];
  }

  return (data ?? []) as InventoryTransaction[];
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const items = await getInventoryItems();

  return {
    totalInventoryItems: items.length,
    totalOnHand: items.reduce((total, item) => total + item.on_hand_quantity, 0),
    totalAvailable: items.reduce(
      (total, item) => total + item.available_quantity,
      0,
    ),
    reserved: items.reduce((total, item) => total + item.reserved_quantity, 0),
    incoming: items.reduce((total, item) => total + item.incoming_quantity, 0),
    lowStock: items.filter(
      (item) =>
        item.available_quantity > 0 &&
        item.available_quantity <= item.reorder_level,
    ).length,
    outOfStock: items.filter((item) => item.available_quantity <= 0).length,
    inventoryValue: items.reduce(
      (total, item) => total + item.inventory_value,
      0,
    ),
    source: items[0]?.source ?? "Local fallback",
  };
}

export function summarizeInventoryForProduct(
  items: InventoryItem[],
): InventoryProductSummary {
  return {
    product_id: items[0]?.product_id ?? "",
    total_on_hand: items.reduce((total, item) => total + item.on_hand_quantity, 0),
    total_reserved: items.reduce(
      (total, item) => total + item.reserved_quantity,
      0,
    ),
    total_available: items.reduce(
      (total, item) => total + item.available_quantity,
      0,
    ),
    total_incoming: items.reduce(
      (total, item) => total + item.incoming_quantity,
      0,
    ),
    locations_count: items.length,
    first_inventory_item_id: items[0]?.id ?? null,
  };
}

export async function getProductInventorySummary(productId: string) {
  const items = await getInventoryItemsByProduct(productId);

  return summarizeInventoryForProduct(items);
}

export async function getInventoryLocationSummary(
  locationId: string,
): Promise<InventoryLocationSummary | null> {
  const [locations, items] = await Promise.all([
    getInventoryLocations(),
    getInventoryItemsByLocation(locationId),
  ]);
  const location = locations.find(
    (inventoryLocation) => inventoryLocation.id === locationId,
  );

  if (!location) {
    return null;
  }

  return summarizeInventoryForLocation(location, items);
}

export function summarizeInventoryForLocation(
  location: InventoryLocation,
  items: InventoryItem[],
): InventoryLocationSummary {
  return {
    location_id: location.id,
    location_name: location.name,
    location_code: location.code,
    location_type: location.location_type,
    active: location.active,
    total_inventory_items: items.length,
    total_on_hand: items.reduce(
      (total, item) => total + item.on_hand_quantity,
      0,
    ),
    total_available: items.reduce(
      (total, item) => total + item.available_quantity,
      0,
    ),
    inventory_value: items.reduce(
      (total, item) => total + item.inventory_value,
      0,
    ),
  };
}
