import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localBrands, type Brand } from "./localBrands";

export type BrandReadSource = "supabase" | "local-fallback";

export type BrandReadResult = {
  brands: Brand[];
  source: BrandReadSource;
};

export async function getBrandsResult(): Promise<BrandReadResult> {
  if (!USE_SUPABASE || !supabase) {
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
    return {
      brands: localBrands,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    return {
      brands: localBrands,
      source: "local-fallback",
    };
  }

  return {
    brands: data,
    source: "supabase",
  };
}

export async function getBrands(): Promise<Brand[]> {
  const result = await getBrandsResult();

  return result.brands;
}
