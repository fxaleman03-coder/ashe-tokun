import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localCategories, type Category } from "./localCategories";

export type CategoryReadSource = "supabase" | "local-fallback";

export type CategoryReadResult = {
  categories: Category[];
  source: CategoryReadSource;
};

function logCategoryReadDiagnostic(
  message: string,
  details?: Record<string, unknown>,
) {
  console.info("[ASHE TOKUN category read]", message, {
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ...details,
  });
}

export async function getCategoriesResult(): Promise<CategoryReadResult> {
  if (!USE_SUPABASE || !supabase) {
    logCategoryReadDiagnostic("Using local fallback before Supabase query.", {
      useSupabase: USE_SUPABASE,
      supabaseClientExists: Boolean(supabase),
      fallbackUsed: true,
    });

    return {
      categories: localCategories,
      source: "local-fallback",
    };
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error || !data) {
    logCategoryReadDiagnostic(
      "Supabase categories query failed. Using fallback.",
      {
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        fallbackUsed: true,
      },
    );

    return {
      categories: localCategories,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    logCategoryReadDiagnostic(
      "Supabase categories query returned no active rows. Using fallback.",
      {
        categoryCount: 0,
        fallbackUsed: true,
      },
    );

    return {
      categories: localCategories,
      source: "local-fallback",
    };
  }

  logCategoryReadDiagnostic("Supabase categories query succeeded.", {
    categoryCount: data.length,
    fallbackUsed: false,
  });

  return {
    categories: data,
    source: "supabase",
  };
}

export async function getCategories(): Promise<Category[]> {
  const result = await getCategoriesResult();

  return result.categories;
}
