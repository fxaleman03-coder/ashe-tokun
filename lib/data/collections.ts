import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localCollections, type Collection } from "./localCollections";

export type CollectionReadSource = "supabase" | "local-fallback";

export type CollectionReadResult = {
  collections: Collection[];
  source: CollectionReadSource;
};

function logCollectionReadDiagnostic(
  message: string,
  details?: Record<string, unknown>,
) {
  console.info("[ASHE TOKUN collection read]", message, {
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ...details,
  });
}

export async function getCollectionsResult(): Promise<CollectionReadResult> {
  if (!USE_SUPABASE || !supabase) {
    logCollectionReadDiagnostic("Using local fallback before Supabase query.", {
      useSupabase: USE_SUPABASE,
      supabaseClientExists: Boolean(supabase),
      fallbackUsed: true,
    });

    return {
      collections: localCollections,
      source: "local-fallback",
    };
  }

  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error || !data) {
    logCollectionReadDiagnostic(
      "Supabase collections query failed. Using fallback.",
      {
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        fallbackUsed: true,
      },
    );

    return {
      collections: localCollections,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    logCollectionReadDiagnostic(
      "Supabase collections query returned no active rows. Using fallback.",
      {
        collectionCount: 0,
        fallbackUsed: true,
      },
    );

    return {
      collections: localCollections,
      source: "local-fallback",
    };
  }

  logCollectionReadDiagnostic("Supabase collections query succeeded.", {
    collectionCount: data.length,
    fallbackUsed: false,
  });

  return {
    collections: data,
    source: "supabase",
  };
}

export async function getCollections(): Promise<Collection[]> {
  const result = await getCollectionsResult();

  return result.collections;
}
