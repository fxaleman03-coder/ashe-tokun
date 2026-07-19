import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StorefrontCategorySection from "@/components/shop/StorefrontCategorySection";
import StorefrontProviders from "@/components/storefront/StorefrontProviders";
import { getStorefrontCategories } from "@/lib/data/storefrontCategories";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const categories = await getStorefrontCategories();

  return (
    <StorefrontProviders>
      <Navbar />
      <main className="bg-[#0f0b07] pt-24">
        <StorefrontCategorySection
          categories={categories}
          variant="shop"
          compact
        />
      </main>
      <Footer />
    </StorefrontProviders>
  );
}
