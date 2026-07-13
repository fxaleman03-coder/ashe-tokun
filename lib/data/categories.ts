import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localCategories, type Category } from "./localCategories";

export type CategoryReadSource = "supabase" | "local-fallback";

export type CategoryReadResult = {
  categories: Category[];
  source: CategoryReadSource;
};

export async function getCategoriesResult(): Promise<CategoryReadResult> {
  if (!USE_SUPABASE || !supabase) {
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
    return {
      categories: localCategories,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    return {
      categories: localCategories,
      source: "local-fallback",
    };
  }

  return {
    categories: data,
    source: "supabase",
  };
}

export async function getCategories(): Promise<Category[]> {
  const result = await getCategoriesResult();

  return result.categories;
}
