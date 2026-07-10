import FeaturedProductsPreviewClient from "@/components/shop/FeaturedProductsPreviewClient";
import { getFeaturedProducts } from "@/lib/data/productsRepository";

export default async function FeaturedProductsPreview() {
  // Homepage products are now repository-backed.
  const featuredProducts = await getFeaturedProducts();

  return <FeaturedProductsPreviewClient products={featuredProducts} />;
}
