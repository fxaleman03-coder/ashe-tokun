import { USE_SUPABASE } from "@/lib/config";
import { getProductMedia, type MediaImage } from "@/lib/media";
import { supabase } from "@/lib/supabase";

export type MediaAssetSource = "supabase" | "local-fallback";
export type CommercialMediaAssetType =
  | "product_image"
  | "gallery_image"
  | "thumbnail"
  | "brand_logo"
  | "banner"
  | "icon"
  | "marketing"
  | "pdf"
  | "manual"
  | "certificate"
  | "video"
  | "other";

const productMediaBucket = "product-media";
const commercialAssetTypes: CommercialMediaAssetType[] = [
  "product_image",
  "gallery_image",
  "thumbnail",
  "brand_logo",
  "banner",
  "icon",
  "marketing",
  "pdf",
  "manual",
  "certificate",
  "video",
  "other",
];

export type MediaAsset = MediaImage & {
  source: MediaAssetSource;
  original_filename: string | null;
  storage_path: string;
  public_url: string | null;
  asset_type: CommercialMediaAssetType;
  mime_type: string | null;
  file_extension: string | null;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  brand_id: string | null;
  active: boolean;
  created_at: string | null;
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
  width: number | null;
  height: number | null;
  brand_id: string | null;
  active: boolean;
  created_at: string | null;
};

function toDisplayName(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPublicImageUrl(storagePath: string) {
  if (!supabase) {
    return "";
  }

  const { data } = supabase.storage
    .from(productMediaBucket)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

function getFolder(storagePath: string) {
  const segments = storagePath.split("/");
  segments.pop();

  return segments.join("/");
}

function mapSupabaseAsset(row: MediaAssetRow): MediaAsset {
  const extension =
    row.file_extension?.replace(/^\./, "").toLowerCase() ||
    row.filename.split(".").pop()?.toLowerCase() ||
    "";
  const folder = getFolder(row.storage_path);
  const categorySegment = row.storage_path.split("/").at(1) ?? "uploaded";

  return {
    id: row.id,
    filename: row.filename,
    relativePath: row.storage_path,
    category: toDisplayName(categorySegment),
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
    width: row.width,
    height: row.height,
    brand_id: row.brand_id,
    active: row.active,
    created_at: row.created_at,
  };
}

function mapLocalAsset(image: MediaImage): MediaAsset {
  return {
    ...image,
    source: "local-fallback",
    original_filename: image.filename,
    storage_path: image.relativePath,
    public_url: image.url,
    asset_type: "product_image",
    mime_type: image.extension ? `image/${image.extension}` : null,
    file_extension: image.extension,
    file_size_bytes: null,
    width: image.dimensions?.width ?? null,
    height: image.dimensions?.height ?? null,
    brand_id: null,
    active: true,
    created_at: null,
  };
}

function getLocalFallbackMediaAssets() {
  return getProductMedia().map(mapLocalAsset);
}

export async function getMediaAssets(): Promise<MediaAsset[]> {
  if (!USE_SUPABASE || !supabase) {
    return getLocalFallbackMediaAssets();
  }

  const { data, error } = await supabase
    .from("media_assets")
    .select(
      "id, filename, original_filename, storage_path, public_url, asset_type, mime_type, file_extension, file_size_bytes, width, height, brand_id, active, created_at",
    )
    .eq("active", true)
    .in("asset_type", commercialAssetTypes)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    console.info("[ASHE TOKUN media repository]", "Using local fallback.", {
      supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      mediaCount: data?.length ?? 0,
    });

    return getLocalFallbackMediaAssets();
  }

  return (data as MediaAssetRow[]).map(mapSupabaseAsset);
}

export async function getMediaAsset(id: string): Promise<MediaAsset | undefined> {
  const assets = await getMediaAssets();

  return assets.find((asset) => asset.id === id);
}

export async function getMediaAssetByPath(
  path: string,
): Promise<MediaAsset | undefined> {
  const assets = await getMediaAssets();

  return assets.find(
    (asset) =>
      asset.storage_path === path ||
      asset.relativePath === path ||
      asset.public_url === path ||
      asset.url === path,
  );
}
