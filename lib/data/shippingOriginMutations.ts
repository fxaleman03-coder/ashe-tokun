"use server";

import { revalidatePath } from "next/cache";
import { USE_SUPABASE } from "@/lib/config";
import {
  getShippingOriginById,
  validateShippingOrigin,
} from "@/lib/data/shippingOriginsRepository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireServerActionPermission } from "@/lib/staff/serverActionAuth";
import type {
  CreateShippingOriginInput,
  ShippingOriginMutationResult,
  UpdateShippingOriginInput,
} from "@/lib/types/shippingOrigin";

function getSupabaseClient() {
  return createSupabaseServiceClient();
}

async function requireShippingOriginPermission(): Promise<ShippingOriginMutationResult | null> {
  const auth = await requireServerActionPermission("shipping.origins.manage");

  return auth.ok ? null : { ok: false, error: auth.error };
}

function revalidateShippingOriginPaths(originId?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/settings/shipping-origins");
  revalidatePath("/admin/shipping");

  if (originId) {
    revalidatePath(`/admin/settings/shipping-origins/${originId}`);
  }
}

function disabledResult(): ShippingOriginMutationResult {
  return {
    ok: false,
    error: "Live shipping origin management requires Supabase mode.",
  };
}

function configError(): ShippingOriginMutationResult {
  return {
    ok: false,
    error:
      "Supabase is enabled, but the Supabase client is not configured. Check environment variables.",
  };
}

function slugifyCode(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeInput(input: CreateShippingOriginInput | UpdateShippingOriginInput) {
  return {
    ...input,
    code: input.code ? slugifyCode(input.code) : undefined,
    country: input.country || "US",
  };
}

function activationError(input: Partial<CreateShippingOriginInput>) {
  if (!input.active) {
    return null;
  }

  const validation = validateShippingOrigin(input);

  return validation.isValid
    ? null
    : `Cannot activate an incomplete origin. Missing: ${validation.missingFields.join(", ")}.`;
}

export async function createShippingOrigin(
  input: CreateShippingOriginInput,
): Promise<ShippingOriginMutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingOriginPermission();

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  const sanitizedInput = sanitizeInput(input);
  const error = activationError(sanitizedInput);

  if (error) {
    return { ok: false, error };
  }

  const { data: existing } = await supabase
    .from("shipping_origins")
    .select("id")
    .eq("code", sanitizedInput.code)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: "Shipping origin code already exists." };
  }

  if (sanitizedInput.is_default && !sanitizedInput.active) {
    return { ok: false, error: "Default origin must be active." };
  }

  if (sanitizedInput.is_default) {
    await supabase
      .from("shipping_origins")
      .update({ is_default: false })
      .eq("is_default", true);
  }

  const { data, error: insertError } = await supabase
    .from("shipping_origins")
    .insert(sanitizedInput)
    .select("id")
    .single();

  if (insertError || !data) {
    return {
      ok: false,
      error: insertError?.code === "23505"
        ? "Shipping origin code already exists."
        : "Shipping origin creation failed.",
    };
  }

  revalidateShippingOriginPaths(data.id);

  return {
    ok: true,
    message: "Shipping origin created.",
    originId: data.id,
  };
}

export async function updateShippingOrigin(
  id: string,
  updates: UpdateShippingOriginInput,
): Promise<ShippingOriginMutationResult> {
  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingOriginPermission();

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  const currentOrigin = await getShippingOriginById(id);

  if (!currentOrigin) {
    return { ok: false, error: "Shipping origin was not found." };
  }

  const nextOrigin = { ...currentOrigin, ...updates };
  const sanitizedUpdates = sanitizeInput(updates);
  const error = activationError(nextOrigin);

  if (error) {
    return { ok: false, error };
  }

  if (nextOrigin.is_default && !nextOrigin.active) {
    return { ok: false, error: "Default origin must be active." };
  }

  if (sanitizedUpdates.is_default) {
    await supabase
      .from("shipping_origins")
      .update({ is_default: false })
      .neq("id", id);
  }

  const { error: updateError } = await supabase
    .from("shipping_origins")
    .update(sanitizedUpdates)
    .eq("id", id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { ok: false, error: "Shipping origin code already exists." };
    }

    return { ok: false, error: "Shipping origin update failed." };
  }

  revalidateShippingOriginPaths(id);

  return { ok: true, message: "Shipping origin updated.", originId: id };
}

export async function activateShippingOrigin(id: string) {
  const origin = await getShippingOriginById(id);

  if (!origin) {
    return { ok: false, error: "Shipping origin was not found." };
  }

  const validation = validateShippingOrigin(origin);

  if (!validation.isValid) {
    return {
      ok: false,
      error: `Cannot activate an incomplete origin. Missing: ${validation.missingFields.join(", ")}.`,
    };
  }

  return updateShippingOrigin(id, { active: true });
}

export async function deactivateShippingOrigin(id: string) {
  const origin = await getShippingOriginById(id);

  if (!origin) {
    return { ok: false, error: "Shipping origin was not found." };
  }

  if (origin.is_default) {
    return {
      ok: false,
      error: "Select another default origin before deactivating this one.",
    };
  }

  return updateShippingOrigin(id, { active: false });
}

export async function setDefaultShippingOrigin(id: string) {
  const origin = await getShippingOriginById(id);

  if (!origin) {
    return { ok: false, error: "Shipping origin was not found." };
  }

  if (!origin.active) {
    return { ok: false, error: "Default origin must be active." };
  }

  if (!origin.is_complete) {
    return { ok: false, error: "Default origin must be complete." };
  }

  if (!USE_SUPABASE) {
    return disabledResult();
  }

  const authError = await requireShippingOriginPermission();

  if (authError) {
    return authError;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    return configError();
  }

  const clearResult = await supabase
    .from("shipping_origins")
    .update({ is_default: false })
    .eq("is_default", true);

  if (clearResult.error) {
    return { ok: false, error: clearResult.error.message };
  }

  const setResult = await supabase
    .from("shipping_origins")
    .update({ is_default: true })
    .eq("id", id);

  if (setResult.error) {
    return { ok: false, error: "Default shipping origin update failed." };
  }

  revalidateShippingOriginPaths(id);

  return { ok: true, message: "Default shipping origin updated.", originId: id };
}
