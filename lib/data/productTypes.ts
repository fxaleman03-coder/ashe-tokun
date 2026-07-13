import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { localProductTypes, type ProductType } from "./localProductTypes";

export type ProductTypeReadSource = "supabase" | "local-fallback";

export type ProductTypeReadResult = {
  productTypes: ProductType[];
  source: ProductTypeReadSource;
};

export async function getProductTypesResult(): Promise<ProductTypeReadResult> {
  if (!USE_SUPABASE || !supabase) {
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
    return {
      productTypes: localProductTypes,
      source: "local-fallback",
    };
  }

  if (data.length === 0) {
    return {
      productTypes: localProductTypes,
      source: "local-fallback",
    };
  }

  return {
    productTypes: data,
    source: "supabase",
  };
}

export async function getProductTypes(): Promise<ProductType[]> {
  const result = await getProductTypesResult();

  return result.productTypes;
}
