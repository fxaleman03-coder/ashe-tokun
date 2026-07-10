import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localTraditions, type Tradition } from "./localTraditions";

export type TraditionReadSource = "supabase" | "local-fallback";

export type TraditionReadResult = {
  traditions: Tradition[];
  source: TraditionReadSource;
};

function logTraditionReadDiagnostic(
  message: string,
  details?: Record<string, unknown>,
) {
  console.info("[ASHE TOKUN tradition read]", message, {
    supabaseUrlExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKeyExists: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    ...details,
  });
}

export async function getTraditionsResult(): Promise<TraditionReadResult> {
  if (!USE_SUPABASE || !supabase) {
    logTraditionReadDiagnostic("Using local fallback before Supabase query.", {
      useSupabase: USE_SUPABASE,
      supabaseClientExists: Boolean(supabase),
      fallbackUsed: true,
    });

    return {
      traditions: localTraditions,
      source: "local-fallback",
    };
  }

  const { data, error } = await supabase
    .from("traditions")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error || !data) {
    logTraditionReadDiagnostic(
      "Supabase traditions query failed. Using fallback.",
      {
        errorMessage: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details,
        errorHint: error?.hint,
        fallbackUsed: true,
      },
    );

    return {
      traditions: localTraditions,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    logTraditionReadDiagnostic(
      "Supabase traditions query returned no active rows. Using fallback.",
      {
        traditionCount: 0,
        fallbackUsed: true,
      },
    );

    return {
      traditions: localTraditions,
      source: "local-fallback",
    };
  }

  logTraditionReadDiagnostic("Supabase traditions query succeeded.", {
    traditionCount: data.length,
    fallbackUsed: false,
  });

  return {
    traditions: data,
    source: "supabase",
  };
}

export async function getTraditions(): Promise<Tradition[]> {
  const result = await getTraditionsResult();

  return result.traditions;
}
