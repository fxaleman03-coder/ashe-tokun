import { USE_SUPABASE } from "@/lib/config";
import type {
  CommercialMediaAssetType,
  MediaAsset,
} from "@/lib/data/mediaRepository";
import { supabase } from "@/lib/supabase";

export const PRODUCT_MEDIA_BUCKET = "product-media";

const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
const maxFileSizeBytes = 20 * 1024 * 1024;

type UploadProductImageOptions = {
  brandSlug?: string;
  productSlug?: string;
};

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

function toMediaAsset(row: MediaAssetRow): MediaAsset {
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
    url: row.public_url ?? getPublicImageUrl(row.storage_path),
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

async function getImageDimensions(file: File) {
  if (typeof window === "undefined") {
    return null;
  }

  return new Promise<{ width: number; height: number } | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };

      URL.revokeObjectURL(objectUrl);
      resolve(
        dimensions.width > 0 && dimensions.height > 0 ? dimensions : null,
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };

    image.src = objectUrl;
  });
}

async function resolveBrandId(brandSlug?: string) {
  if (!brandSlug || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", brandSlug)
    .maybeSingle();

  if (error) {
    console.info("[ASHE TOKUN media storage]", "Brand lookup failed.", {
      brandSlug,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });
  }

  return data?.id ?? null;
}

export function getPublicImageUrl(storagePath: string) {
  if (!supabase) {
    return "";
  }

  const { data } = supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

export async function uploadProductImage(
  file: File,
  options: UploadProductImageOptions = {},
): Promise<MediaStorageResult> {
  if (!USE_SUPABASE || !supabase) {
    return {
      ok: false,
      error: "Supabase Storage is disabled. Local media fallback remains active.",
    };
  }

  if (!allowedMimeTypes.has(file.type)) {
    return {
      ok: false,
      error: "Only PNG, JPEG, and WEBP images are supported.",
    };
  }

  if (file.size > maxFileSizeBytes) {
    return {
      ok: false,
      error: "Image is larger than the 20 MB limit.",
    };
  }

  const brandSlug = options.brandSlug || "ajako-originals";
  const productSlug = options.productSlug || "uploads";
  const filename = sanitizeFilename(file.name);
  const storagePath = `brands/${brandSlug}/${productSlug}/${Date.now()}-${filename}`;

  const upload = await supabase.storage
    .from(PRODUCT_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (upload.error) {
    return {
      ok: false,
      error: upload.error.message,
    };
  }

  const publicUrl = getPublicImageUrl(storagePath);
  const brandId = await resolveBrandId(brandSlug);
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  const dimensions = await getImageDimensions(file);

  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      filename,
      original_filename: file.name,
      storage_path: storagePath,
      public_url: publicUrl,
      mime_type: file.type,
      file_extension: extension,
      file_size_bytes: file.size,
      width: dimensions?.width ?? null,
      height: dimensions?.height ?? null,
      brand_id: brandId,
      asset_type: "product_image",
      active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    const cleanup = await supabase.storage
      .from(PRODUCT_MEDIA_BUCKET)
      .remove([storagePath]);
    const cleanupMessage = cleanup.error
      ? ` Storage cleanup failed: ${cleanup.error.message}`
      : " Uploaded Storage object was removed.";
    const insertErrorMessage =
      error?.message ??
      "Image uploaded, but the media asset record was not created.";

    return {
      ok: false,
      error: `${insertErrorMessage}${cleanupMessage}`,
    };
  }

  return {
    ok: true,
    image: toMediaAsset(data as MediaAssetRow),
    storagePath,
    publicUrl,
  };
}

export async function deleteProductImage(storagePath: string) {
  if (!USE_SUPABASE || !supabase) {
    return {
      ok: false,
      error: "Supabase Storage is disabled. Local media fallback remains active.",
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
