"use server";

import { USE_SUPABASE } from "@/lib/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireServerActionPermission } from "@/lib/staff/serverActionAuth";

type ProductMediaRow = {
  id: string;
  product_id: string;
  media_asset_id: string;
  display_order: number;
  is_primary: boolean;
  alt_text: string | null;
};

type ProductMediaMutationResult =
  | { ok: true; row: ProductMediaRow }
  | { ok: true; rows: ProductMediaRow[] }
  | { ok: true; source: "local" }
  | { ok: false; error: string };

type AddProductMediaOptions = {
  isPrimary?: boolean;
  altText?: string | null;
};

function supabaseConfigError(): ProductMediaMutationResult {
  return {
    ok: false,
    error:
      "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
  };
}

async function getNextDisplayOrder(productId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return 0;
  }

  const { data } = await supabase
    .from("product_media")
    .select("display_order")
    .eq("product_id", productId)
    .order("display_order", { ascending: false })
    .limit(1);

  const maxOrder = data?.[0]?.display_order;

  return typeof maxOrder === "number" ? maxOrder + 1 : 0;
}

async function getExistingProductMedia(productId: string, mediaAssetId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("product_media")
    .select("*")
    .eq("product_id", productId)
    .eq("media_asset_id", mediaAssetId)
    .maybeSingle<ProductMediaRow>();

  if (error) {
    console.info("[ASHE TOKUN product media]", "Existing media lookup failed.", {
      productId,
      mediaAssetId,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });
  }

  return data ?? null;
}

async function getProductMediaRows(productId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("product_media")
    .select("*")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("display_order", { ascending: true });

  if (error) {
    console.info("[ASHE TOKUN product media]", "Product media row read failed.", {
      productId,
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorHint: error.hint,
    });

    return [];
  }

  return (data ?? []) as ProductMediaRow[];
}

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

  const auth = await requireServerActionPermission("products.edit");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return supabaseConfigError();
  }

  const demoteResult = await supabase
    .from("product_media")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .eq("is_primary", true);

  if (demoteResult.error) {
    return {
      ok: false,
      error: demoteResult.error.message,
    };
  }

  const existingRow = await getExistingProductMedia(productId, mediaAssetId);

  if (existingRow) {
    const { data, error } = await supabase
      .from("product_media")
      .update({
        is_primary: true,
        display_order: 0,
      })
      .eq("id", existingRow.id)
      .select("*")
      .single<ProductMediaRow>();

    if (error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    if (!data || !data.is_primary || data.media_asset_id !== mediaAssetId) {
      return {
        ok: false,
        error: "Primary product media relationship was not confirmed.",
      };
    }

    return {
      ok: true,
      row: data,
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

export async function addProductMedia(
  productId: string,
  mediaAssetId: string,
  options: AddProductMediaOptions = {},
): Promise<ProductMediaMutationResult> {
  if (!USE_SUPABASE) {
    return {
      ok: true,
      source: "local",
    };
  }

  const auth = await requireServerActionPermission("products.edit");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return supabaseConfigError();
  }

  const existingRow = await getExistingProductMedia(productId, mediaAssetId);

  if (existingRow) {
    return {
      ok: false,
      error: "This media asset is already linked to the product.",
    };
  }

  if (options.isPrimary) {
    return setPrimaryProductMedia(productId, mediaAssetId);
  }

  const displayOrder = await getNextDisplayOrder(productId);
  const { data, error } = await supabase
    .from("product_media")
    .insert({
      product_id: productId,
      media_asset_id: mediaAssetId,
      display_order: displayOrder,
      is_primary: false,
      alt_text: options.altText ?? null,
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
      error: "Product media relationship was not returned.",
    };
  }

  return {
    ok: true,
    row: data,
  };
}

export async function removeProductMedia(
  productId: string,
  productMediaId: string,
): Promise<ProductMediaMutationResult> {
  if (!USE_SUPABASE) {
    return {
      ok: true,
      source: "local",
    };
  }

  const auth = await requireServerActionPermission("products.edit");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return supabaseConfigError();
  }

  const { data: removedRow, error } = await supabase
    .from("product_media")
    .delete()
    .eq("product_id", productId)
    .eq("id", productMediaId)
    .select("*")
    .single<ProductMediaRow>();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  if (!removedRow) {
    return {
      ok: false,
      error: "Product media relationship was not removed.",
    };
  }

  if (removedRow.is_primary) {
    const remainingRows = (await getProductMediaRows(productId)).filter(
      (row) => row.id !== removedRow.id,
    );
    const nextPrimary = remainingRows[0];

    if (nextPrimary) {
      const primaryResult = await setPrimaryProductMedia(
        productId,
        nextPrimary.media_asset_id,
      );

      if (!primaryResult.ok) {
        return primaryResult;
      }
    }
  }

  return {
    ok: true,
    row: removedRow,
  };
}

export async function reorderProductMedia(
  productId: string,
  orderedProductMediaIds: string[],
): Promise<ProductMediaMutationResult> {
  if (!USE_SUPABASE) {
    return {
      ok: true,
      source: "local",
    };
  }

  const auth = await requireServerActionPermission("products.edit");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return supabaseConfigError();
  }

  const updatedRows: ProductMediaRow[] = [];

  for (const [index, productMediaId] of orderedProductMediaIds.entries()) {
    const { data, error } = await supabase
      .from("product_media")
      .update({ display_order: index })
      .eq("product_id", productId)
      .eq("id", productMediaId)
      .select("*")
      .single<ProductMediaRow>();

    if (error) {
      return {
        ok: false,
        error: error.message,
      };
    }

    if (!data) {
      return {
        ok: false,
        error: "Reordered product media row was not returned.",
      };
    }

    updatedRows.push(data);
  }

  const allRows = await getProductMediaRows(productId);
  const primaryRows = allRows.filter((row) => row.is_primary);

  if (allRows.length > 0 && primaryRows.length === 0) {
    const primaryResult = await setPrimaryProductMedia(
      productId,
      allRows[0].media_asset_id,
    );

    if (!primaryResult.ok) {
      return primaryResult;
    }
  }

  if (primaryRows.length > 1) {
    const preferredPrimary = primaryRows[0];
    const primaryResult = await setPrimaryProductMedia(
      productId,
      preferredPrimary.media_asset_id,
    );

    if (!primaryResult.ok) {
      return primaryResult;
    }
  }

  return {
    ok: true,
    rows: updatedRows,
  };
}

export async function updateProductMediaAltText(
  productMediaId: string,
  altText: string,
): Promise<ProductMediaMutationResult> {
  if (!USE_SUPABASE) {
    return {
      ok: true,
      source: "local",
    };
  }

  const auth = await requireServerActionPermission("products.edit");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return supabaseConfigError();
  }

  const { data, error } = await supabase
    .from("product_media")
    .update({ alt_text: altText.trim() || null })
    .eq("id", productMediaId)
    .select("*")
    .single<ProductMediaRow>();

  if (error) {
    return {
      ok: false,
      error: error.message,
    };
  }

  if (!data) {
    return {
      ok: false,
      error: "Updated product media row was not returned.",
    };
  }

  return {
    ok: true,
    row: data,
  };
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

  const auth = await requireServerActionPermission("products.edit");

  if (!auth.ok) {
    return {
      ok: false,
      error: auth.error,
    };
  }

  const primaryRows = (await getProductMediaRows(productId)).filter(
    (row) => row.is_primary,
  );

  if (primaryRows[0]) {
    return removeProductMedia(productId, primaryRows[0].id);
  }

  return {
    ok: true,
    rows: [],
  };
}
