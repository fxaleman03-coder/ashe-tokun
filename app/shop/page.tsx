import Footer from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import Navbar from "@/components/Navbar";
import StorefrontCategorySection from "@/components/shop/StorefrontCategorySection";
import { getStorefrontCategories } from "@/lib/data/storefrontCategories";

export default async function ShopPage() {
  const categories = await getStorefrontCategories();

  return (
    <LanguageProvider>
      <Navbar />
      <main className="bg-[#0f0b07] pt-24">
        <StorefrontCategorySection
          categories={categories}
          variant="shop"
          compact
        />
      </main>
      <Footer />
    </LanguageProvider>
  );
}
