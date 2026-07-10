import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localBrands, type Brand } from "./localBrands";

export type BrandReadSource = "supabase" | "local-fallback";

export type BrandReadResult = {
  brands: Brand[];
  source: BrandReadSource;
};

function logBrandReadDiagnostic(
  message: string,
  details?: Record<string, unknown>,
) {
  console.info("[ASHE TOKUN brand read]", message, {
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ...details,
  });
}

export async function getBrandsResult(): Promise<BrandReadResult> {
  if (!USE_SUPABASE || !supabase) {
    logBrandReadDiagnostic("Using local fallback before Supabase query.", {
      useSupabase: USE_SUPABASE,
      supabaseClientExists: Boolean(supabase),
      fallbackUsed: true,
    });

    return {
      brands: localBrands,
      source: "local-fallback",
    };
  }

  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error || !data) {
    logBrandReadDiagnostic("Supabase brands query failed. Using fallback.", {
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      errorHint: error?.hint,
      fallbackUsed: true,
    });

    return {
      brands: localBrands,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    logBrandReadDiagnostic(
      "Supabase brands query returned no active rows. Using fallback.",
      {
        brandCount: 0,
        fallbackUsed: true,
      },
    );

    return {
      brands: localBrands,
      source: "local-fallback",
    };
  }

  logBrandReadDiagnostic("Supabase brands query succeeded.", {
    brandCount: data.length,
    fallbackUsed: false,
  });

  return {
    brands: data,
    source: "supabase",
  };
}

export async function getBrands(): Promise<Brand[]> {
  const result = await getBrandsResult();

  return result.brands;
}
