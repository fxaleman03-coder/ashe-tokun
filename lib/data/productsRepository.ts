import { USE_SUPABASE } from "@/lib/config";
import { products as localProducts, type Product, type ProductVendor } from "@/lib/products";
import { supabase } from "@/lib/supabase";
import type { Language } from "@/lib/translations";

type ProductSourceStatus = "Supabase" | "Local fallback";

type ProductsResult = {
  products: Product[];
  source: ProductSourceStatus;
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
  image?: string | null;
  featured?: boolean | null;
  new_arrival?: boolean | null;
  active?: boolean | null;
  brand?: SupabaseRelation;
  category?: SupabaseRelation;
  tradition?: SupabaseRelation;
  product_type?: SupabaseRelation;
};

let cachedProductsResult: Promise<ProductsResult> | null = null;
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
  if (brandName?.toUpperCase().includes("ODIBERE")) {
    return "ODIBERE CREATIONS";
  }

  return "AJAKO ORIGINALS";
};

const mapSupabaseProduct = (row: SupabaseProductRow): Product => {
  const stock = row.stock ?? 0;
  const categoryName = row.category?.name ?? "Uncategorized";
  const traditionName = row.tradition?.name ?? "Unassigned";
  const productTypeName = row.product_type?.name;
  const price = toNumber(row.price) ?? 0;
  const compareAtPrice = toNumber(row.compare_at_price);
  const cost = toNumber(row.cost);
  const localProduct = localProductsBySku.get(row.sku);
  const image = row.image?.trim() ? row.image : localProduct?.image ?? null;

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
    return {
      products: localProducts,
      source: "Local fallback",
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
    .order("name");

  if (error || !data || data.length === 0) {
    console.info("[ASHE TOKUN product repository]", "Using local fallback.", {
      supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      productCount: data?.length ?? 0,
    });

    return {
      products: localProducts,
      source: "Local fallback",
    };
  }

  return {
    products: (data as SupabaseProductRow[]).map(mapSupabaseProduct),
    source: "Supabase",
  };
}

async function getProductsResult(): Promise<ProductsResult> {
  cachedProductsResult ??= readProducts();

  return cachedProductsResult;
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
