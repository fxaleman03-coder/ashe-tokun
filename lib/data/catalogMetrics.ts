import { getBrands } from "@/lib/data/brands";
import { getCategories } from "@/lib/data/categories";
import { getCollections } from "@/lib/data/collections";
import { getProductTypes } from "@/lib/data/productTypes";
import {
  getProductSourceStatus,
  getProducts,
} from "@/lib/data/productsRepository";
import { getTraditions } from "@/lib/data/traditions";

export type CatalogMetrics = {
  totalProducts: number;
  featuredProducts: number;
  newArrivalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  availableOnlineProducts: number;
  availableInStoreProducts: number;
  brandsCount: number;
  categoriesCount: number;
  collectionsCount: number;
  productTypesCount: number;
  traditionsCount: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  productSourceStatus: "Supabase" | "Local fallback";
};

export async function getCatalogMetrics(): Promise<CatalogMetrics> {
  const [
    products,
    brands,
    categories,
    collections,
    productTypes,
    traditions,
    productSourceStatus,
  ] = await Promise.all([
    getProducts(),
    getBrands(),
    getCategories(),
    getCollections(),
    getProductTypes(),
    getTraditions(),
    getProductSourceStatus(),
  ]);

  const outOfStockProducts = products.filter(
    (product) => product.stock <= 0,
  ).length;
  const lowStockProducts = products.filter((product) => {
    const reorderLevel = product.reorderLevel ?? 3;

    return product.stock > 0 && product.stock <= reorderLevel;
  }).length;

  return {
    totalProducts: products.length,
    featuredProducts: products.filter((product) => product.isFeatured).length,
    newArrivalProducts: products.filter((product) => product.isNew).length,
    activeProducts: products.length,
    inactiveProducts: 0,
    availableOnlineProducts: products.filter(
      (product) => product.availableOnline,
    ).length,
    availableInStoreProducts: products.filter(
      (product) => product.availableInStore,
    ).length,
    brandsCount: brands.length,
    categoriesCount: categories.length,
    collectionsCount: collections.length,
    productTypesCount: productTypes.length,
    traditionsCount: traditions.length,
    lowStockProducts,
    outOfStockProducts,
    productSourceStatus,
  };
}
