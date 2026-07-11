import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";

export type ProductMediaAsset = {
  id: string;
  filename: string;
  public_url: string | null;
  storage_path: string | null;
  asset_type: string | null;
  width: number | null;
  height: number | null;
  active: boolean | null;
};

export type ProductMediaRecord = {
  id: string;
  product_id: string;
  media_asset_id: string;
  display_order: number;
  is_primary: boolean;
  alt_text: string | null;
  media_asset: ProductMediaAsset;
};

type ProductMediaRow = {
  id: string;
  product_id: string;
  media_asset_id: string;
  display_order: number | null;
  is_primary: boolean | null;
  alt_text: string | null;
  media_asset?: ProductMediaAsset | ProductMediaAsset[] | null;
};

function getPublicImageUrl(storagePath: string | null) {
  if (!storagePath || !supabase) {
    return null;
  }

  const { data } = supabase.storage
    .from("product-media")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

function normalizeMediaAsset(
  asset: ProductMediaAsset | ProductMediaAsset[] | null | undefined,
) {
  const resolvedAsset = Array.isArray(asset) ? asset[0] : asset;

  if (!resolvedAsset?.active) {
    return null;
  }

  return {
    ...resolvedAsset,
    public_url:
      resolvedAsset.public_url ?? getPublicImageUrl(resolvedAsset.storage_path),
  };
}

function normalizeProductMediaRow(row: ProductMediaRow) {
  const mediaAsset = normalizeMediaAsset(row.media_asset);

  if (!mediaAsset?.public_url) {
    return null;
  }

  return {
    id: row.id,
    product_id: row.product_id,
    media_asset_id: row.media_asset_id,
    display_order: row.display_order ?? 0,
    is_primary: row.is_primary ?? false,
    alt_text: row.alt_text,
    media_asset: mediaAsset,
  } satisfies ProductMediaRecord;
}

function sortProductMedia(
  first: ProductMediaRecord,
  second: ProductMediaRecord,
) {
  if (first.is_primary !== second.is_primary) {
    return first.is_primary ? -1 : 1;
  }

  return first.display_order - second.display_order;
}

export async function getProductMedia(
  productId: string,
): Promise<ProductMediaRecord[]> {
  if (!USE_SUPABASE || !supabase || !productId) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_media")
    .select(
      `
        id,
        product_id,
        media_asset_id,
        display_order,
        is_primary,
        alt_text,
        media_asset:media_assets(
          id,
          filename,
          public_url,
          storage_path,
          asset_type,
          width,
          height,
          active
        )
      `,
    )
    .eq("product_id", productId);

  if (error) {
    console.info("[ASHE TOKUN product media repository]", "Read failed.", {
      productId,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return [];
  }

  return ((data ?? []) as ProductMediaRow[])
    .map(normalizeProductMediaRow)
    .filter((record): record is ProductMediaRecord => Boolean(record))
    .sort(sortProductMedia);
}

export async function getPrimaryProductMedia(productId: string) {
  const records = await getProductMedia(productId);

  return records.find((record) => record.is_primary) ?? null;
}

export async function getProductGallery(productId: string) {
  const records = await getProductMedia(productId);

  return records.filter((record) => !record.is_primary);
}
