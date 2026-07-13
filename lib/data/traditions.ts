import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localTraditions, type Tradition } from "./localTraditions";

export type TraditionReadSource = "supabase" | "local-fallback";

export type TraditionReadResult = {
  traditions: Tradition[];
  source: TraditionReadSource;
};

export async function getTraditionsResult(): Promise<TraditionReadResult> {
  if (!USE_SUPABASE || !supabase) {
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
    return {
      traditions: localTraditions,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    return {
      traditions: localTraditions,
      source: "local-fallback",
    };
  }

  return {
    traditions: data,
    source: "supabase",
  };
}

export async function getTraditions(): Promise<Tradition[]> {
  const result = await getTraditionsResult();

  return result.traditions;
}
