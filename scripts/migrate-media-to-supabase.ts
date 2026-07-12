import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type BrandLookup = {
  ajakoOriginals: string | null;
  edibereCreation: string | null;
};

type MediaAssetRow = {
  id: string;
  storage_path: string;
};

type MigrationStats = {
  total: number;
  uploaded: number;
  reusedStorage: number;
  inserted: number;
  updated: number;
  skipped: number;
  warnings: string[];
  failed: number;
};

const CONFIRMATION_MESSAGE =
  "This migration will upload local commercial images to Supabase Storage and create media_assets records. Re-run with --confirm to proceed.";
const PRODUCTS_ROOT = resolve(process.cwd(), "public", "products");
const BUCKET = "product-media";
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const mimeTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

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

function isHiddenPath(pathname: string) {
  return pathname.split(sep).some((segment) => segment.startsWith("."));
}

function walkImages(directory: string): string[] {
  return readdirSync(directory)
    .flatMap((entry) => {
      const fullPath = join(directory, entry);

      if (isHiddenPath(relative(PRODUCTS_ROOT, fullPath))) {
        return [];
      }

      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        return walkImages(fullPath);
      }

      if (!stats.isFile()) {
        return [];
      }

      const extension = extname(entry).toLowerCase();

      return allowedExtensions.has(extension) ? [fullPath] : [];
    })
    .sort();
}

function toStoragePath(filePath: string) {
  const relativePath = relative(PRODUCTS_ROOT, filePath).split(sep).join("/");

  return `legacy-products/${relativePath}`;
}

function readPngDimensions(buffer: Buffer) {
  if (
    buffer.length < 24 ||
    buffer.readUInt32BE(0) !== 0x89504e47 ||
    buffer.toString("ascii", 12, 16) !== "IHDR"
  ) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readJpegDimensions(buffer: Buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);

    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function readWebpDimensions(buffer: Buffer) {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunkType = buffer.toString("ascii", 12, 16);

  if (chunkType === "VP8X" && buffer.length >= 30) {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }

  if (chunkType === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  if (chunkType === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);

    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }

  return null;
}

function readImageDimensions(buffer: Buffer, extension: string) {
  try {
    if (extension === ".png") {
      return readPngDimensions(buffer);
    }

    if (extension === ".jpg" || extension === ".jpeg") {
      return readJpegDimensions(buffer);
    }

    if (extension === ".webp") {
      return readWebpDimensions(buffer);
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchBrandLookup(supabase: SupabaseClient): Promise<BrandLookup> {
  const { data, error } = await supabase
    .from("brands")
    .select("id, slug")
    .in("slug", ["ajako-originals", "edibere-creation"]);

  if (error) {
    throw new Error(`Brand lookup failed: ${error.message}`);
  }

  const lookup = new Map(
    ((data ?? []) as Array<{ id: string; slug: string }>).map((row) => [
      row.slug,
      row.id,
    ]),
  );

  return {
    ajakoOriginals: lookup.get("ajako-originals") ?? null,
    edibereCreation: lookup.get("edibere-creation") ?? null,
  };
}

function detectBrandId(relativePath: string, brands: BrandLookup) {
  const normalizedPath = relativePath.toLowerCase();

  if (normalizedPath.includes("ajako-originals")) {
    return brands.ajakoOriginals;
  }

  if (
    normalizedPath.includes("ide/") ||
    normalizedPath.includes("ide\\") ||
    normalizedPath.includes("tools/irofa") ||
    normalizedPath.includes("tools\\irofa")
  ) {
    return brands.edibereCreation;
  }

  return null;
}

async function findMediaAssetByStoragePath(
  supabase: SupabaseClient,
  storagePath: string,
) {
  const { data, error } = await supabase
    .from("media_assets")
    .select("id, storage_path")
    .eq("storage_path", storagePath)
    .limit(1);

  if (error) {
    throw new Error(`media_assets lookup failed: ${error.message}`);
  }

  return ((data ?? []) as MediaAssetRow[])[0] ?? null;
}

async function storageObjectExists(
  supabase: SupabaseClient,
  storagePath: string,
) {
  const folder = dirname(storagePath);
  const filename = basename(storagePath);
  const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
    limit: 1000,
  });

  if (error) {
    return false;
  }

  return Boolean(data?.some((item) => item.name === filename));
}

async function migrateImage(
  supabase: SupabaseClient,
  filePath: string,
  brands: BrandLookup,
  stats: MigrationStats,
) {
  const relativePath = relative(PRODUCTS_ROOT, filePath).split(sep).join("/");
  const storagePath = toStoragePath(filePath);
  const filename = basename(filePath);
  const extension = extname(filename).toLowerCase();
  const mimeType = mimeTypes.get(extension);

  if (!mimeType) {
    stats.skipped += 1;
    stats.warnings.push(`Skipped unsupported file type: ${relativePath}`);
    return;
  }

  const fileBuffer = readFileSync(filePath);
  const fileStats = statSync(filePath);
  const dimensions = readImageDimensions(fileBuffer, extension);
  const brandId = detectBrandId(relativePath, brands);
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(storagePath).data
    .publicUrl;
  const existingMediaAsset = await findMediaAssetByStoragePath(
    supabase,
    storagePath,
  );
  const payload = {
    filename,
    original_filename: filename,
    storage_path: storagePath,
    public_url: publicUrl,
    asset_type: "product_image",
    mime_type: mimeType,
    file_extension: extension.replace(/^\./, ""),
    file_size_bytes: fileStats.size,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    brand_id: brandId,
    active: true,
  };

  if (existingMediaAsset) {
    const { error } = await supabase
      .from("media_assets")
      .update(payload)
      .eq("id", existingMediaAsset.id);

    if (error) {
      stats.failed += 1;
      stats.warnings.push(
        `Failed to update media row for ${relativePath}: ${error.message}`,
      );
      return;
    }

    stats.updated += 1;
    stats.reusedStorage += 1;
    return;
  }

  const objectExists = await storageObjectExists(supabase, storagePath);

  if (objectExists) {
    stats.reusedStorage += 1;
  } else {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      stats.failed += 1;
      stats.warnings.push(
        `Failed to upload ${relativePath}: ${error.message}`,
      );
      return;
    }

    stats.uploaded += 1;
  }

  const { error } = await supabase.from("media_assets").insert(payload);

  if (error) {
    stats.failed += 1;
    stats.warnings.push(
      `Failed to insert media row for ${relativePath}: ${error.message}`,
    );
    return;
  }

  stats.inserted += 1;
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
  const images = walkImages(PRODUCTS_ROOT);
  const stats: MigrationStats = {
    total: images.length,
    uploaded: 0,
    reusedStorage: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    warnings: [],
    failed: 0,
  };
  const brands = await fetchBrandLookup(supabase);

  if (!brands.ajakoOriginals) {
    stats.warnings.push("AJAKO ORIGINALS brand id was not found.");
  }

  if (!brands.edibereCreation) {
    stats.warnings.push("EDIBERE CREATION brand id was not found.");
  }

  for (const imagePath of images) {
    await migrateImage(supabase, imagePath, brands, stats);
  }

  console.log("\nCommercial media migration summary");
  console.log(`Total local images found: ${stats.total}`);
  console.log(`Uploaded: ${stats.uploaded}`);
  console.log(`Reused existing Storage objects: ${stats.reusedStorage}`);
  console.log(`Media rows inserted: ${stats.inserted}`);
  console.log(`Media rows updated: ${stats.updated}`);
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
