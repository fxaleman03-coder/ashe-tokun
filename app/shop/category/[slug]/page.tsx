import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CategoryPageContent from "@/components/shop/CategoryPageContent";
import StorefrontProviders from "@/components/storefront/StorefrontProviders";
import { getCategories } from "@/lib/data/categories";
import {
  getProductsForStorefrontCategory,
  getStorefrontCategoryBySlug,
} from "@/lib/data/storefrontCategories";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const categories = await getCategories();
  const seenSlugs = new Set<string>();

  return categories
    .filter((category) => {
      if (!category.active || seenSlugs.has(category.slug)) {
        return false;
      }

      seenSlugs.add(category.slug);
      return true;
    })
    .map((category) => ({
      slug: category.slug,
    }));
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [category, products] = await Promise.all([
    getStorefrontCategoryBySlug(slug),
    getProductsForStorefrontCategory(slug),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <StorefrontProviders>
      <Navbar />
      <CategoryPageContent category={category} products={products} />
      <Footer />
    </StorefrontProviders>
  );
}
