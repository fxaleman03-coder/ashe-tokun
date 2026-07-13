import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localCollections, type Collection } from "./localCollections";

export type CollectionReadSource = "supabase" | "local-fallback";

export type CollectionReadResult = {
  collections: Collection[];
  source: CollectionReadSource;
};

export async function getCollectionsResult(): Promise<CollectionReadResult> {
  if (!USE_SUPABASE || !supabase) {
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
    return {
      collections: localCollections,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    return {
      collections: localCollections,
      source: "local-fallback",
    };
  }

  return {
    collections: data,
    source: "supabase",
  };
}

export async function getCollections(): Promise<Collection[]> {
  const result = await getCollectionsResult();

  return result.collections;
}
