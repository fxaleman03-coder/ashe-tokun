import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localProductTypes, type ProductType } from "./localProductTypes";

export type ProductTypeReadSource = "supabase" | "local-fallback";

export type ProductTypeReadResult = {
  productTypes: ProductType[];
  source: ProductTypeReadSource;
};

function logProductTypeReadDiagnostic(
  message: string,
  details?: Record<string, unknown>,
) {
  console.info("[ASHE TOKUN product type read]", message, {
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ...details,
  });
}

export async function getProductTypesResult(): Promise<ProductTypeReadResult> {
  if (!USE_SUPABASE || !supabase) {
    logProductTypeReadDiagnostic(
      "Using local fallback before Supabase query.",
      {
        useSupabase: USE_SUPABASE,
        supabaseClientExists: Boolean(supabase),
        fallbackUsed: true,
      },
    );

    return {
      productTypes: localProductTypes,
      source: "local-fallback",
    };
  }

  const { data, error } = await supabase
    .from("product_types")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error || !data) {
    logProductTypeReadDiagnostic(
      "Supabase product types query failed. Using fallback.",
      {
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        fallbackUsed: true,
      },
    );

    return {
      productTypes: localProductTypes,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    logProductTypeReadDiagnostic(
      "Supabase product types query returned no active rows. Using fallback.",
      {
        productTypeCount: 0,
        fallbackUsed: true,
      },
    );

    return {
      productTypes: localProductTypes,
      source: "local-fallback",
    };
  }

  logProductTypeReadDiagnostic("Supabase product types query succeeded.", {
    productTypeCount: data.length,
    fallbackUsed: false,
  });

  return {
    productTypes: data,
    source: "supabase",
  };
}

export async function getProductTypes(): Promise<ProductType[]> {
  const result = await getProductTypesResult();

  return result.productTypes;
}
