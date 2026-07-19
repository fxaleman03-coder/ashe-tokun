import { USE_SUPABASE } from "@/lib/config";
import {
  products as localProducts,
  type Product,
  type ProductGalleryImage,
  type ProductVendor,
} from "@/lib/products";
import { supabase } from "@/lib/supabase";
import type { Language } from "@/lib/translations";

type ProductSourceStatus = "Supabase" | "Local fallback";

type ProductsResult = {
  products: Product[];
  source: ProductSourceStatus;
  supabaseProductCount: number;
  fallbackUsed: boolean;
};

export type ProductRepositoryDiagnostics = {
  source: ProductSourceStatus;
  supabaseProductCount: number;
  finalRepositoryCount: number;
  fallbackUsed: boolean;
};

type SupabaseRelation = {
  name?: string | null;
  slug?: string | null;
} | null;

type SupabaseProductRow = {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  description?: string | null;
  sku: string;
  barcode: string;
  barcode_value?: string | null;
  barcode_format?: "CODE128" | string | null;
  barcode_generated_at?: string | null;
  barcode_print_count?: number | null;
  barcode_last_printed_at?: string | null;
  vendor_sku?: string | null;
  price?: number | string | null;
  compare_at_price?: number | string | null;
  cost?: number | string | null;
  stock?: number | null;
  reorder_level?: number | null;
  inventory_location?: string | null;
  available_online?: boolean | null;
  available_in_store?: boolean | null;
  featured?: boolean | null;
  new_arrival?: boolean | null;
  active?: boolean | null;
  brand?: SupabaseRelation;
  category?: SupabaseRelation;
  tradition?: SupabaseRelation;
  product_type?: SupabaseRelation;
};

type ProductMediaAssetRelation = {
  id?: string | null;
  public_url?: string | null;
  storage_path?: string | null;
  active?: boolean | null;
} | null;

type ProductMediaRelationRow = {
  id: string;
  product_id: string;
  display_order?: number | null;
  is_primary?: boolean | null;
  alt_text?: string | null;
  media_asset?: ProductMediaAssetRelation | ProductMediaAssetRelation[];
};

type ProductInventoryRow = {
  product_id: string;
  on_hand_quantity?: number | null;
  reserved_quantity?: number | null;
  available_quantity?: number | null;
  reorder_level?: number | null;
};

type ProductInventorySummary = {
  stock: number;
  reorderLevel?: number;
};

const localProductsBySku = new Map(
  localProducts.map((product) => [product.sku, product]),
);

const localized = (value: string): Record<Language, string> => ({
  en: value,
  es: value,
  yo: value,
});

const toNumber = (value: number | string | null | undefined): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : undefined;
};

const normalizeVendor = (brandName?: string | null): ProductVendor => {
  if (brandName?.toUpperCase().includes("EDIBERE")) {
    return "EDIBERE CREATION";
  }

  return "AJAKO ORIGINALS";
};

const getMediaImageUrl = (
  row: ProductMediaRelationRow,
): string | undefined => {
  const relation = Array.isArray(row.media_asset)
    ? row.media_asset[0]
    : row.media_asset;

  if (!relation?.active) {
    return undefined;
  }

  if (relation.public_url) {
    return relation.public_url;
  }

  if (relation.storage_path && supabase) {
    const { data } = supabase.storage
      .from("product-media")
      .getPublicUrl(relation.storage_path);

    return data.publicUrl;
  }

  return undefined;
};

const mapSupabaseProduct = (
  row: SupabaseProductRow,
  mediaByProductId: Map<string, ProductGalleryImage[]>,
  inventoryByProductId: Map<string, ProductInventorySummary>,
): Product => {
  const inventorySummary = inventoryByProductId.get(row.id);
  const stock = inventorySummary?.stock ?? row.stock ?? 0;
  const categoryName = row.category?.name ?? "Uncategorized";
  const traditionName = row.tradition?.name ?? "Unassigned";
  const productTypeName = row.product_type?.name;
  const price = toNumber(row.price) ?? 0;
  const compareAtPrice = toNumber(row.compare_at_price);
  const cost = toNumber(row.cost);
  const localProduct = localProductsBySku.get(row.sku);
  const productMedia = mediaByProductId.get(row.id) ?? [];
  const primaryImage = productMedia[0]?.public_url;
  const image = primaryImage ?? localProduct?.image ?? null;

  return {
    id: row.id,
    slug: row.slug,
    vendor: normalizeVendor(row.brand?.name),
    sku: row.sku,
    barcode: row.barcode,
    barcodeValue: row.barcode_value ?? row.barcode,
    barcodeFormat:
      row.barcode_format === "CODE128" || row.barcode_value
        ? "CODE128"
        : undefined,
    barcodeGeneratedAt: row.barcode_generated_at ?? null,
    barcodePrintCount: row.barcode_print_count ?? 0,
    barcodeLastPrintedAt: row.barcode_last_printed_at ?? null,
    vendorSku: row.vendor_sku ?? undefined,
    name: localized(row.name),
    category: localized(categoryName),
    productType: productTypeName ? localized(productTypeName) : undefined,
    tradition: localized(traditionName),
    price,
    compareAtPrice,
    cost,
    stock,
    reorderLevel: inventorySummary?.reorderLevel ?? row.reorder_level ?? undefined,
    inventoryLocation: row.inventory_location ?? undefined,
    availableOnline: row.available_online ?? true,
    availableInStore: row.available_in_store ?? true,
    image,
    galleryImages: productMedia,
    inStock: stock > 0,
    isFeatured: row.featured ?? false,
    isNew: row.new_arrival ?? false,
    shortDescription: localized(
      row.short_description ?? row.description ?? "Product details pending.",
    ),
  };
};

async function readProducts(): Promise<ProductsResult> {
  if (!USE_SUPABASE || !supabase) {
    return {
      products: localProducts,
      source: "Local fallback",
      supabaseProductCount: 0,
      fallbackUsed: true,
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        *,
        brand:brands(name, slug),
        category:categories(name, slug),
        tradition:traditions(name, slug),
        product_type:product_types(name, slug)
      `,
    )
    .eq("active", true)
    .eq("status", "active")
    .eq("available_online", true)
    .order("name");

  const supabaseProductCount = data?.length ?? 0;

  if (error || !data || data.length === 0) {
    return {
      products: localProducts,
      source: "Local fallback",
      supabaseProductCount,
      fallbackUsed: true,
    };
  }

  const products = data as SupabaseProductRow[];
  const productIds = products.map((product) => product.id);
  const mediaByProductId = new Map<string, ProductGalleryImage[]>();
  const inventoryByProductId = new Map<string, ProductInventorySummary>();

  if (productIds.length > 0) {
    const mediaResult = await supabase
      .from("product_media")
      .select(
        "id, product_id, display_order, is_primary, alt_text, media_asset:media_assets(id, public_url, storage_path, active)",
      )
      .in("product_id", productIds)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true });

    if (mediaResult.error) {
      console.info(
        "[ASHE TOKUN product repository]",
        "Primary product media query failed. Using local image fallback where needed.",
        {
          errorMessage: mediaResult.error.message,
          errorCode: mediaResult.error.code,
          errorDetails: mediaResult.error.details,
          errorHint: mediaResult.error.hint,
        },
      );
    } else {
      for (const row of (mediaResult.data ?? []) as ProductMediaRelationRow[]) {
        const imageUrl = getMediaImageUrl(row);
        const mediaAsset = Array.isArray(row.media_asset)
          ? row.media_asset[0]
          : row.media_asset;

        if (imageUrl && mediaAsset?.id) {
          const productMedia = mediaByProductId.get(row.product_id) ?? [];

          productMedia.push({
            id: row.id,
            public_url: imageUrl,
            alt_text: row.alt_text ?? null,
            display_order: row.display_order ?? 0,
          });
          mediaByProductId.set(row.product_id, productMedia);
        }
      }
    }

    const inventoryResult = await supabase
      .from("inventory_items")
      .select(
        "product_id, on_hand_quantity, reserved_quantity, available_quantity, reorder_level",
      )
      .in("product_id", productIds);

    if (inventoryResult.error) {
      console.info(
        "[ASHE TOKUN product repository]",
        "Inventory item query failed. Product stock will use product fallback values.",
        {
          errorMessage: inventoryResult.error.message,
          errorCode: inventoryResult.error.code,
          errorDetails: inventoryResult.error.details,
          errorHint: inventoryResult.error.hint,
        },
      );
    } else {
      for (const row of (inventoryResult.data ?? []) as ProductInventoryRow[]) {
        const currentSummary = inventoryByProductId.get(row.product_id) ?? {
          stock: 0,
          reorderLevel: undefined,
        };
        const onHand = row.on_hand_quantity ?? 0;
        const reserved = row.reserved_quantity ?? 0;
        const calculatedAvailable = onHand - reserved;
        const available =
          row.available_quantity === calculatedAvailable
            ? row.available_quantity
            : calculatedAvailable;
        const reorderLevel = row.reorder_level ?? undefined;

        inventoryByProductId.set(row.product_id, {
          stock: currentSummary.stock + available,
          reorderLevel:
            currentSummary.reorderLevel === undefined
              ? reorderLevel
              : reorderLevel === undefined
                ? currentSummary.reorderLevel
                : Math.min(currentSummary.reorderLevel, reorderLevel),
        });
      }
    }
  }

  return {
    products: products.map((product) =>
      mapSupabaseProduct(product, mediaByProductId, inventoryByProductId),
    ),
    source: "Supabase",
    supabaseProductCount,
    fallbackUsed: false,
  };
}

async function getProductsResult(): Promise<ProductsResult> {
  return readProducts();
}

export async function getProducts(): Promise<Product[]> {
  const result = await getProductsResult();

  return result.products;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getProducts();

  return products.filter((product) => product.isFeatured);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProducts();

  return products.find((product) => product.slug === slug);
}

export async function getProductBySkuOrBarcode(
  value: string,
): Promise<Product | undefined> {
  const products = await getProducts();
  const normalizedValue = value.trim().toLowerCase();

  return products.find(
    (product) =>
      product.barcodeValue?.toLowerCase() === normalizedValue ||
      product.barcode.toLowerCase() === normalizedValue ||
      product.sku.toLowerCase() === normalizedValue,
  );
}

export async function getProductSourceStatus(): Promise<ProductSourceStatus> {
  const result = await getProductsResult();

  return result.source;
}

export async function getProductRepositoryDiagnostics(): Promise<ProductRepositoryDiagnostics> {
  const result = await getProductsResult();

  return {
    source: result.source,
    supabaseProductCount: result.supabaseProductCount,
    finalRepositoryCount: result.products.length,
    fallbackUsed: result.fallbackUsed,
  };
}
