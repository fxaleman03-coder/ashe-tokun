"use client";

import { USE_SUPABASE } from "@/lib/config";
import type { MediaAsset } from "@/lib/data/mediaRepository";
import { supabase } from "@/lib/supabase";

type ProductMediaRow = {
  id?: string | null;
  product_id: string;
  media_asset_id: string;
  display_order: number;
  is_primary: boolean;
  alt_text: string | null;
  media_asset?: MediaAsset | null;
};

type ProductMediaMutationResult =
  | { ok: true; row: ProductMediaRow }
  | { ok: true; source: "local" }
  | { ok: false; error: string };

export async function setPrimaryProductMedia(
  productId: string,
  mediaAssetId: string,
): Promise<ProductMediaMutationResult> {
  if (!USE_SUPABASE) {
    return {
      ok: true,
      source: "local",
    };
  }

  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
    };
  }

  const deleteResult = await supabase
    .from("product_media")
    .delete()
    .eq("product_id", productId)
    .eq("is_primary", true);

  if (deleteResult.error) {
    return {
      ok: false,
      error: deleteResult.error.message,
    };
  }

  const { data, error } = await supabase
    .from("product_media")
    .insert({
      product_id: productId,
      media_asset_id: mediaAssetId,
      display_order: 0,
      is_primary: true,
      alt_text: null,
    })
    .select("*")
    .single<ProductMediaRow>();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  if (!data || data.product_id !== productId || data.media_asset_id !== mediaAssetId) {
    return {
      ok: false,
      error: "Primary product media relationship was not returned.",
    };
  }

  return {
    ok: true,
    row: data,
  };
}

export async function getPrimaryProductMedia(
  productId: string,
): Promise<ProductMediaRow | null> {
  if (!USE_SUPABASE || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("product_media")
    .select("*, media_asset:media_assets(*)")
    .eq("product_id", productId)
    .eq("is_primary", true)
    .maybeSingle<ProductMediaRow>();

  if (error) {
    console.info("[ASHE TOKUN product media]", "Primary media read failed.", {
      productId,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });
  }

  return data ?? null;
}

export async function removePrimaryProductMedia(
  productId: string,
): Promise<ProductMediaMutationResult> {
  if (!USE_SUPABASE) {
    return {
      ok: true,
      source: "local",
    };
  }

  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
    };
  }

  const { data, error } = await supabase
    .from("product_media")
    .delete()
    .eq("product_id", productId)
    .eq("is_primary", true)
    .select("*")
    .maybeSingle<ProductMediaRow>();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  return {
    ok: true,
    row:
      data ?? {
        product_id: productId,
        media_asset_id: "",
        display_order: 0,
        is_primary: true,
        alt_text: null,
      },
  };
}
