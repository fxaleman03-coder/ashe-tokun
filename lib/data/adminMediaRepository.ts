import "server-only";

import { USE_SUPABASE } from "@/lib/config";
import {
  getMediaAssets,
  mapSupabaseAsset,
  type MediaAsset,
  type MediaAssetRow,
} from "@/lib/data/mediaRepository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const commercialAssetTypes: MediaAsset["asset_type"][] = [
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

export async function getAdminMediaAssets(): Promise<MediaAsset[]> {
  const supabase = createSupabaseServiceClient();

  if (!USE_SUPABASE || !supabase) {
    return getMediaAssets();
  }

  const { data, error } = await supabase
    .from("media_assets")
    .select(
      "id, filename, original_filename, storage_path, public_url, asset_type, mime_type, file_extension, file_size_bytes, width, height, brand_id, active, created_at",
    )
    .in("asset_type", commercialAssetTypes)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    return getMediaAssets();
  }

  return (data as MediaAssetRow[]).map(mapSupabaseAsset);
}
