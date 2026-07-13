"use client";

import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import {
  saveProductOverride,
  type ProductOverride,
} from "@/lib/productStore";

type ProductStatus = "draft" | "active" | "archived";

type ProductLookupTable = "brands" | "categories" | "traditions" | "product_types";

type LookupRow = {
  id: string;
  name: string;
  slug?: string | null;
};

export type ProductUpdateInput = ProductOverride & {
  description?: string;
  status?: ProductStatus;
  active?: boolean;
};

export type ProductCreateInput = {
  vendor: string;
  category: string;
  tradition?: string;
  productType: string;
  name: string;
  shortDescription?: string;
  description?: string;
  sku: string;
  barcode: string;
  vendorSku?: string;
  price: number;
  compareAtPrice?: number | null;
  cost?: number | null;
  featured?: boolean;
  newArrival?: boolean;
  availableOnline: boolean;
  availableInStore: boolean;
  action: "draft" | "publish";
};

type UpdatedProductRow = {
  id?: string | null;
  slug?: string | null;
  name?: string | null;
  short_description?: string | null;
  description?: string | null;
  price?: number | string | null;
  compare_at_price?: number | string | null;
  cost?: number | string | null;
  sku?: string | null;
  barcode?: string | null;
  vendor_sku?: string | null;
  featured?: boolean | null;
  new_arrival?: boolean | null;
  available_online?: boolean | null;
  available_in_store?: boolean | null;
  status?: ProductStatus | null;
  active?: boolean | null;
  updated_at?: string | null;
};

type ProductUpdateResult =
  | {
      ok: true;
      source: "supabase";
      product: UpdatedProductRow;
      priceTrace: ProductPriceTrace;
    }
  | { ok: true; source: "local" }
  | { ok: false; source: "supabase"; error: string };

type ProductCreateResult =
  | { ok: true; source: "supabase"; product: UpdatedProductRow }
  | { ok: true; source: "local" }
  | { ok: false; source: "supabase"; error: string };

export type ProductPriceTrace = {
  requested: number;
  returned: number;
  verified: number;
};

function toNullableNumber(value: number | null | undefined) {
  return typeof value === "number" ? value : null;
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const parsedValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function pricesMatch(first: number, second: number) {
  return Math.abs(first - second) < 0.001;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase();
}

async function resolveLookupId(
  table: ProductLookupTable,
  name: string,
  label: string,
) {
  if (!supabase) {
    return {
      ok: false as const,
      error:
        "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
    };
  }

  const { data, error } = await supabase
    .from(table)
    .select("id, name, slug")
    .eq("active", true);

  if (error) {
    return {
      ok: false as const,
      error: `${label} lookup failed: ${error.message}`,
    };
  }

  const normalizedName = normalizeLookupValue(name);
  const lookup = ((data ?? []) as LookupRow[]).find(
    (row) =>
      normalizeLookupValue(row.name) === normalizedName ||
      normalizeLookupValue(row.slug ?? "") === normalizedName,
  );

  if (!lookup) {
    return {
      ok: false as const,
      error: `${label} not found in Supabase: ${name}`,
    };
  }

  return {
    ok: true as const,
    id: lookup.id,
  };
}

async function findDuplicateProduct(
  field: "slug" | "sku" | "barcode",
  value: string,
) {
  if (!supabase) {
    return {
      ok: false as const,
      error:
        "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
    };
  }

  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq(field, value)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      error: `Duplicate ${field} check failed: ${error.message}`,
    };
  }

  return {
    ok: true as const,
    exists: Boolean(data),
  };
}

function validateCreateInput(input: ProductCreateInput) {
  if (!input.name.trim()) return "Product name is required.";
  if (!input.vendor.trim()) return "Vendor is required.";
  if (!input.category.trim()) return "Category is required.";
  if (!input.productType.trim()) return "Product type is required.";
  if (!input.sku.trim()) return "SKU is required.";
  if (!input.barcode.trim()) return "Barcode is required.";
  if (!Number.isFinite(input.price) || input.price < 0) {
    return "Price must be a valid non-negative number.";
  }
  if (
    input.compareAtPrice !== null &&
    input.compareAtPrice !== undefined &&
    (!Number.isFinite(input.compareAtPrice) || input.compareAtPrice < 0)
  ) {
    return "Compare at price must be a valid non-negative number.";
  }
  if (
    input.cost !== null &&
    input.cost !== undefined &&
    (!Number.isFinite(input.cost) || input.cost < 0)
  ) {
    return "Cost must be a valid non-negative number.";
  }

  return null;
}

export async function updateProduct(
  productSlug: string,
  updates: ProductUpdateInput,
): Promise<ProductUpdateResult> {
  if (!USE_SUPABASE) {
    saveProductOverride(productSlug, updates);

    return {
      ok: true,
      source: "local",
    };
  }

  if (!supabase) {
    return {
      ok: false,
      source: "supabase",
      error:
        "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
    };
  }

  const safeUpdates = omitUndefined({
    name: updates.name,
    short_description: updates.shortDescription,
    description: updates.description,
    price: updates.price,
    compare_at_price: toNullableNumber(updates.compareAtPrice),
    cost: toNullableNumber(updates.cost),
    sku: updates.sku,
    barcode: updates.barcode,
    vendor_sku: updates.vendorSku,
    featured: updates.isFeatured,
    new_arrival: updates.isNew,
    available_online: updates.availableOnline,
    available_in_store: updates.availableInStore,
    status: updates.status,
    active: updates.active,
  });

  const { data, error } = await supabase
    .from("products")
    .update(safeUpdates)
    .eq("slug", productSlug)
    .select("*")
    .single<UpdatedProductRow>();

  if (error) {
    return {
      ok: false,
      source: "supabase",
      error: error.message,
    };
  }

  if (!data) {
    return {
      ok: false,
      source: "supabase",
      error: "No updated product row was returned.",
    };
  }

  if (data.slug !== productSlug) {
    return {
      ok: false,
      source: "supabase",
      error: `Updated product slug mismatch. Expected ${productSlug}, received ${data.slug ?? "no slug"}.`,
    };
  }

  const requestedPrice = toNumber(updates.price);
  const returnedPrice = toNumber(data.price);

  if (requestedPrice === undefined) {
    return {
      ok: false,
      source: "supabase",
      error: "Form sent stale price: requested price was not a valid number.",
    };
  }

  if (returnedPrice === undefined || !pricesMatch(requestedPrice, returnedPrice)) {
    return {
      ok: false,
      source: "supabase",
      error: `Supabase update returned different price. Requested ${requestedPrice.toFixed(2)}, returned ${returnedPrice === undefined ? "no price" : returnedPrice.toFixed(2)}.`,
    };
  }

  const { data: verificationRow, error: verificationError } = await supabase
    .from("products")
    .select("id, slug, price, status, updated_at")
    .eq("slug", productSlug)
    .single<UpdatedProductRow>();

  if (verificationError) {
    return {
      ok: false,
      source: "supabase",
      error: `Fresh database verification failed: ${verificationError.message}`,
    };
  }

  if (!verificationRow) {
    return {
      ok: false,
      source: "supabase",
      error: "Fresh database verification returned no product row.",
    };
  }

  if (verificationRow.slug !== productSlug) {
    return {
      ok: false,
      source: "supabase",
      error: `Fresh database verification slug mismatch. Expected ${productSlug}, received ${verificationRow.slug ?? "no slug"}.`,
    };
  }

  const verifiedPrice = toNumber(verificationRow.price);

  if (verifiedPrice === undefined || !pricesMatch(requestedPrice, verifiedPrice)) {
    return {
      ok: false,
      source: "supabase",
      error: `Fresh database verification returned different price. Requested ${requestedPrice.toFixed(2)}, verified ${verifiedPrice === undefined ? "no price" : verifiedPrice.toFixed(2)}.`,
    };
  }

  return {
    ok: true,
    source: "supabase",
    product: data,
    priceTrace: {
      requested: requestedPrice,
      returned: returnedPrice,
      verified: verifiedPrice,
    },
  };
}

export async function createProduct(
  input: ProductCreateInput,
): Promise<ProductCreateResult> {
  if (!USE_SUPABASE) {
    return {
      ok: true,
      source: "local",
    };
  }

  if (!supabase) {
    return {
      ok: false,
      source: "supabase",
      error:
        "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
    };
  }

  const validationError = validateCreateInput(input);

  if (validationError) {
    return {
      ok: false,
      source: "supabase",
      error: validationError,
    };
  }

  const slug = slugify(input.name);

  if (!slug) {
    return {
      ok: false,
      source: "supabase",
      error: "Product slug could not be generated from the product name.",
    };
  }

  const duplicateChecks = [
    ["slug", slug, "Product slug already exists"] as const,
    ["sku", input.sku, "SKU already exists"] as const,
    ["barcode", input.barcode, "Barcode already exists"] as const,
  ];

  for (const [field, value, errorMessage] of duplicateChecks) {
    const duplicateResult = await findDuplicateProduct(field, value);

    if (!duplicateResult.ok) {
      return {
        ok: false,
        source: "supabase",
        error: duplicateResult.error,
      };
    }

    if (duplicateResult.exists) {
      return {
        ok: false,
        source: "supabase",
        error: errorMessage,
      };
    }
  }

  const [brandResult, categoryResult, traditionResult, productTypeResult] =
    await Promise.all([
      resolveLookupId("brands", input.vendor, "Brand"),
      resolveLookupId("categories", input.category, "Category"),
      input.tradition?.trim()
        ? resolveLookupId("traditions", input.tradition, "Tradition")
        : Promise.resolve({ ok: true as const, id: null }),
      resolveLookupId("product_types", input.productType, "Product type"),
    ]);

  for (const result of [
    brandResult,
    categoryResult,
    traditionResult,
    productTypeResult,
  ]) {
    if (!result.ok) {
      return {
        ok: false,
        source: "supabase",
        error: result.error,
      };
    }
  }

  const status: ProductStatus = input.action === "publish" ? "active" : "draft";
  const active = input.action === "publish";
  const insertPayload = {
    brand_id: brandResult.id,
    category_id: categoryResult.id,
    tradition_id: traditionResult.id,
    product_type_id: productTypeResult.id,
    name: input.name.trim(),
    slug,
    short_description: input.shortDescription?.trim() || null,
    description:
      input.description?.trim() || input.shortDescription?.trim() || null,
    sku: input.sku.trim(),
    barcode: input.barcode.trim(),
    vendor_sku: input.vendorSku?.trim() || null,
    price: input.price,
    compare_at_price: toNullableNumber(input.compareAtPrice),
    cost: toNullableNumber(input.cost),
    status,
    featured: input.featured ?? false,
    new_arrival: input.newArrival ?? false,
    available_online: input.availableOnline,
    available_in_store: input.availableInStore,
    active,
  };

  const { data, error } = await supabase
    .from("products")
    .insert(insertPayload)
    .select("*")
    .single<UpdatedProductRow>();

  if (error) {
    return {
      ok: false,
      source: "supabase",
      error: error.message,
    };
  }

  if (!data) {
    return {
      ok: false,
      source: "supabase",
      error: "No inserted product row was returned.",
    };
  }

  if (data.slug !== slug) {
    return {
      ok: false,
      source: "supabase",
      error: `Inserted product slug mismatch. Expected ${slug}, received ${data.slug ?? "no slug"}.`,
    };
  }

  return {
    ok: true,
    source: "supabase",
    product: data,
  };
}
