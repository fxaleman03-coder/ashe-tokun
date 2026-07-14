"use server";

import type {
  CommercialMediaAssetType,
  MediaAsset,
} from "@/lib/data/mediaRepository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireServerActionPermission } from "@/lib/staff/serverActionAuth";
import { PRODUCT_MEDIA_BUCKET } from "@/lib/storage/mediaStorage";

const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const maxFileSizeBytes = 20 * 1024 * 1024;

type MediaAssetRow = {
  id: string;
  filename: string;
  original_filename: string;
  storage_path: string;
  public_url: string | null;
  asset_type: CommercialMediaAssetType;
  mime_type: string | null;
  file_extension: string | null;
  file_size_bytes: number | null;
  width?: number | null;
  height?: number | null;
  brand_id?: string | null;
  active: boolean;
  created_at: string | null;
};

export type MediaStorageResult =
  | {
      ok: true;
      image: MediaAsset;
      storagePath: string;
      publicUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeFilename(filename: string) {
  const extensionMatch = filename.match(/\.[a-z0-9]+$/i);
  const extension = extensionMatch?.[0].toLowerCase() ?? "";
  const baseName = filename.slice(0, filename.length - extension.length);
  const safeBaseName = slugify(baseName) || "product-image";

  return `${safeBaseName}${extension}`;
}

function toFolder(storagePath: string) {
  const segments = storagePath.split("/");
  segments.pop();

  return segments.join("/");
}

function toMediaAsset(row: MediaAssetRow, publicUrl: string): MediaAsset {
  const extension =
    row.file_extension?.replace(/^\./, "").toLowerCase() ||
    row.filename.split(".").pop()?.toLowerCase() ||
    "";
  const folder = toFolder(row.storage_path);
  const categorySegment = row.storage_path.split("/").at(1) ?? "uploaded";
  const category = categorySegment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  return {
    id: row.id,
    filename: row.filename,
    relativePath: row.storage_path,
    category,
    folder,
    extension,
    url: row.public_url ?? publicUrl,
    dimensions:
      row.width && row.height
        ? {
            width: row.width,
            height: row.height,
          }
        : undefined,
    source: "supabase",
    original_filename: row.original_filename,
    storage_path: row.storage_path,
    public_url: row.public_url,
    asset_type: row.asset_type,
    mime_type: row.mime_type,
    file_extension: row.file_extension,
    file_size_bytes: row.file_size_bytes,
    width: row.width ?? null,
    height: row.height ?? null,
    brand_id: row.brand_id ?? null,
    active: row.active,
    created_at: row.created_at,
  };
}

function toNullableDimension(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

async function resolveBrandId(brandSlug: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase || !brandSlug) {
    return null;
  }

  const { data } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

export async function uploadProductImage(
  formData: FormData,
): Promise<MediaStorageResult> {
  const auth = await requireServerActionPermission("products.edit");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is enabled, but the Supabase service client is not configured.",
    };
  }

  const fileEntry = formData.get("file");

  if (!(fileEntry instanceof File)) {
    return {
      ok: false,
      error: "Image file is required.",
    };
  }

  if (!allowedMimeTypes.has(fileEntry.type)) {
    return {
      ok: false,
      error: "Only PNG, JPEG, and WEBP images are supported.",
    };
  }

  if (fileEntry.size > maxFileSizeBytes) {
    return {
      ok: false,
      error: "Image is larger than the 20 MB limit.",
    };
  }

  const brandSlug =
    typeof formData.get("brandSlug") === "string"
      ? String(formData.get("brandSlug"))
      : "ajako-originals";
  const productSlug =
    typeof formData.get("productSlug") === "string"
      ? String(formData.get("productSlug"))
      : "uploads";
  const filename = sanitizeFilename(fileEntry.name);
  const storagePath = `brands/${brandSlug || "ajako-originals"}/${productSlug || "uploads"}/${Date.now()}-${filename}`;

  const upload = await supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .upload(storagePath, fileEntry, {
      cacheControl: "3600",
      contentType: fileEntry.type,
      upsert: false,
    });

  if (upload.error) {
    return {
      ok: false,
      error: upload.error.message,
    };
  }

  const publicUrl = supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .getPublicUrl(storagePath).data.publicUrl;
  const brandId = await resolveBrandId(brandSlug);
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const width = toNullableDimension(formData.get("width"));
  const height = toNullableDimension(formData.get("height"));

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      filename,
      original_filename: fileEntry.name,
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: fileEntry.type,
      file_extension: extension,
      file_size_bytes: fileEntry.size,
      width,
      height,
      brand_id: brandId,
      asset_type: "product_image",
      active: true,
    })
    .select("*")
    .single<MediaAssetRow>();

  if (error || !data) {
    const cleanup = await supabase.storage
      .from(PRODUCT_MEDIA_BUCKET)
      .remove([storagePath]);
    const cleanupMessage = cleanup.error
      ? " Storage cleanup failed; manual review is required."
      : " Uploaded Storage object was removed.";

    return {
      ok: false,
      error: `${
        error?.message ??
        "Image uploaded, but the media asset record was not created."
      }${cleanupMessage}`,
    };
  }

  return {
    ok: true,
    image: toMediaAsset(data, publicUrl),
    storagePath,
    publicUrl,
  };
}

export async function deleteProductImage(storagePath: string) {
  const auth = await requireServerActionPermission("products.edit");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is enabled, but the Supabase service client is not configured.",
    };
  }

  const { error } = await supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .remove([storagePath]);

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
  };
}
