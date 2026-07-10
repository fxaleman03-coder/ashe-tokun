import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { products, type Product } from "../lib/products";

type LookupTable = "brands" | "categories" | "traditions" | "product_types";

type LookupRow = {
  id: string;
  name: string;
};

type MigrationWarning = {
  sku: string;
  message: string;
};

const CONFIRMATION_MESSAGE =
  "This migration will write products to Supabase. Re-run with --confirm to proceed.";

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

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function firstResolvedId(
  lookup: Map<string, string>,
  candidates: Array<string | undefined>,
) {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const id = lookup.get(normalize(candidate));

    if (id) {
      return id;
    }
  }

  return null;
}

function categoryCandidates(product: Product) {
  const category = product.category.en;
  const collection = product.collection?.en;
  const productType = product.productType?.en;

  return [
    category,
    collection,
    productType,
    category === "AJAKO Originals" && productType === "Opele"
      ? "Opele"
      : undefined,
    category === "AJAKO Originals" && collection === "Keychains"
      ? "Keychains"
      : undefined,
    category === "Ide Sets" ? "Sets" : undefined,
    product.sku.startsWith("ODI-SET") ? "Sets" : undefined,
    product.sku.startsWith("ODI-MAZ") ? "Mazos" : undefined,
  ];
}

function productTypeCandidates(product: Product) {
  return [
    product.productType?.en,
    product.slug === "custom-opele" ? "Made to Order" : undefined,
    product.vendor === "ODIBERE CREATIONS" ? "Handmade Product" : undefined,
    product.vendor === "AJAKO ORIGINALS" ? "Handmade Product" : undefined,
    "Physical Product",
  ];
}

async function fetchLookup(
  supabase: SupabaseClient,
  table: LookupTable,
) {
  const { data, error } = await supabase
    .from(table)
    .select("id, name")
    .eq("active", true);

  if (error) {
    throw new Error(`${table}: ${error.message}`);
  }

  return new Map(
    ((data ?? []) as LookupRow[]).map((row) => [normalize(row.name), row.id]),
  );
}

async function productImageColumnExists(
  supabase: SupabaseClient,
) {
  const { error } = await supabase.from("products").select("image").limit(1);

  return !error;
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
  const warnings: MigrationWarning[] = [];
  let migratedCount = 0;
  let skippedCount = 0;

  console.log("Loading Supabase catalog lookup maps...");

  const [brands, categories, traditions, productTypes] = await Promise.all([
    fetchLookup(supabase, "brands"),
    fetchLookup(supabase, "categories"),
    fetchLookup(supabase, "traditions"),
    fetchLookup(supabase, "product_types"),
  ]);
  const hasImageColumn = await productImageColumnExists(supabase);

  if (!hasImageColumn) {
    warnings.push({
      sku: "products.image",
      message:
        "products.image column was not detected; product image paths will be skipped.",
    });
  }

  for (const product of products) {
    const brandId = firstResolvedId(brands, [product.vendor]);
    const categoryId = firstResolvedId(categories, categoryCandidates(product));
    const traditionId = firstResolvedId(traditions, [product.tradition.en]);
    const productTypeId = firstResolvedId(
      productTypes,
      productTypeCandidates(product),
    );

    const missingLookups = [
      !brandId ? "brand" : null,
      !categoryId ? "category" : null,
      !traditionId ? "tradition" : null,
      !productTypeId ? "product type" : null,
    ].filter(Boolean);

    if (missingLookups.length > 0) {
      skippedCount += 1;
      warnings.push({
        sku: product.sku,
        message: `Skipped ${product.name.en}; missing ${missingLookups.join(
          ", ",
        )} lookup.`,
      });
      continue;
    }

    const payload = {
      brand_id: brandId,
      category_id: categoryId,
      tradition_id: traditionId,
      product_type_id: productTypeId,
      name: product.name.en,
      slug: product.slug,
      short_description: product.shortDescription.en,
      description: product.shortDescription.en,
      sku: product.sku,
      barcode: product.barcode,
      vendor_sku: product.vendorSku ?? null,
      price: product.price,
      compare_at_price: product.compareAtPrice ?? null,
      cost: product.cost ?? null,
      status: "active",
      featured: product.isFeatured,
      new_arrival: product.isNew,
      available_online: product.availableOnline,
      available_in_store: product.availableInStore,
      active: true,
      ...(hasImageColumn ? { image: product.image } : {}),
    };

    const { error } = await supabase
      .from("products")
      .upsert(payload, { onConflict: "sku" });

    if (error) {
      skippedCount += 1;
      warnings.push({
        sku: product.sku,
        message: `Skipped ${product.name.en}; Supabase upsert failed: ${error.message}`,
      });
      continue;
    }

    migratedCount += 1;
  }

  console.log("\nProduct migration summary");
  console.log(`Total local products: ${products.length}`);
  console.log(`Inserted / updated: ${migratedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log(`Warnings: ${warnings.length}`);

  if (warnings.length > 0) {
    console.log("\nWarnings");
    for (const warning of warnings) {
      console.log(`- ${warning.sku}: ${warning.message}`);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
