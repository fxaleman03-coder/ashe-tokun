import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import TraditionsSection from "@/components/home/TraditionsSection";
import Navbar from "@/components/Navbar";
import StorefrontCategoriesPreview from "@/components/shop/StorefrontCategoriesPreview";
import StorefrontProviders from "@/components/storefront/StorefrontProviders";

export default function Home() {
  return (
    <StorefrontProviders>
      <Navbar />
      <main>
        <Hero />
        <TraditionsSection />
        <StorefrontCategoriesPreview />
      </main>
      <Footer />
    </StorefrontProviders>
  );
}
