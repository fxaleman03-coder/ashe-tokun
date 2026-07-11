import StorefrontCategorySection from "@/components/shop/StorefrontCategorySection";
import { getStorefrontCategories } from "@/lib/data/storefrontCategories";

export default async function StorefrontCategoriesPreview() {
  const categories = await getStorefrontCategories();

  return (
    <StorefrontCategorySection
      categories={categories}
      variant="home"
    />
  );
}
