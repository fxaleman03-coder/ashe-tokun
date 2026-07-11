import { USE_SUPABASE } from "@/lib/config";
import { products as localProducts, type Product, type ProductVendor } from "@/lib/products";
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
  public_url?: string | null;
  storage_path?: string | null;
  active?: boolean | null;
} | null;

type ProductMediaRelationRow = {
  product_id: string;
  media_asset?: ProductMediaAssetRelation | ProductMediaAssetRelation[];
};

const localProductsBySku = new Map(
  localProducts.map((product) => [product.sku, product]),
);

function getSupabaseProjectRef() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return "missing";
  }

  try {
    return new URL(supabaseUrl).hostname.split(".")[0] ?? "unknown";
  } catch {
    return "invalid-url";
  }
}

function logProductReadDiagnostic(
  message: string,
  details: Record<string, unknown>,
) {
  console.info("[ASHE TOKUN product repository]", message, {
    useSupabase: USE_SUPABASE,
    supabaseProjectRef: getSupabaseProjectRef(),
    ...details,
  });
}

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
  if (brandName?.toUpperCase().includes("ODIBERE")) {
    return "ODIBERE CREATIONS";
  }

  return "AJAKO ORIGINALS";
};

const getPrimaryImageUrl = (
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
  primaryImagesByProductId: Map<string, string>,
): Product => {
  const stock = row.stock ?? 0;
  const categoryName = row.category?.name ?? "Uncategorized";
  const traditionName = row.tradition?.name ?? "Unassigned";
  const productTypeName = row.product_type?.name;
  const price = toNumber(row.price) ?? 0;
  const compareAtPrice = toNumber(row.compare_at_price);
  const cost = toNumber(row.cost);
  const localProduct = localProductsBySku.get(row.sku);
  const image = primaryImagesByProductId.get(row.id) ?? localProduct?.image ?? null;

  return {
    id: row.id,
    slug: row.slug,
    vendor: normalizeVendor(row.brand?.name),
    sku: row.sku,
    barcode: row.barcode,
    vendorSku: row.vendor_sku ?? undefined,
    name: localized(row.name),
    category: localized(categoryName),
    productType: productTypeName ? localized(productTypeName) : undefined,
    tradition: localized(traditionName),
    price,
    compareAtPrice,
    cost,
    stock,
    reorderLevel: row.reorder_level ?? undefined,
    inventoryLocation: row.inventory_location ?? undefined,
    availableOnline: row.available_online ?? true,
    availableInStore: row.available_in_store ?? true,
    image,
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
    logProductReadDiagnostic("Using local fallback before Supabase query.", {
      supabaseClientExists: Boolean(supabase),
      supabaseProductCount: 0,
      finalRepositoryCount: localProducts.length,
      fallbackUsed: true,
    });

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

  logProductReadDiagnostic("Supabase product query completed.", {
    supabaseProductCount,
    errorCode: error?.code,
    errorMessage: error?.message,
    errorDetails: error?.details,
    errorHint: error?.hint,
    fallbackUsed: Boolean(error || !data || data.length === 0),
  });

  if (error || !data || data.length === 0) {
    logProductReadDiagnostic("Using local fallback after Supabase query.", {
      supabaseProductCount,
      finalRepositoryCount: localProducts.length,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      fallbackUsed: true,
    });

    return {
      products: localProducts,
      source: "Local fallback",
      supabaseProductCount,
      fallbackUsed: true,
    };
  }

  const products = data as SupabaseProductRow[];
  const productIds = products.map((product) => product.id);
  const primaryImagesByProductId = new Map<string, string>();

  if (productIds.length > 0) {
    const mediaResult = await supabase
      .from("product_media")
      .select(
        "product_id, media_asset:media_assets(public_url, storage_path, active)",
      )
      .in("product_id", productIds)
      .eq("is_primary", true);

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
        const imageUrl = getPrimaryImageUrl(row);

        if (imageUrl) {
          primaryImagesByProductId.set(row.product_id, imageUrl);
        }
      }
    }
  }

  return {
    products: products.map((product) =>
      mapSupabaseProduct(product, primaryImagesByProductId),
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
      product.sku.toLowerCase() === normalizedValue ||
      product.barcode.toLowerCase() === normalizedValue,
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
