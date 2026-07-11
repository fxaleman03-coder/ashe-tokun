import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import TraditionsSection from "@/components/home/TraditionsSection";
import { LanguageProvider } from "@/components/LanguageProvider";
import Navbar from "@/components/Navbar";
import StorefrontCategoriesPreview from "@/components/shop/StorefrontCategoriesPreview";

export default function Home() {
  return (
    <LanguageProvider>
      <Navbar />
      <main>
        <Hero />
        <TraditionsSection />
        <StorefrontCategoriesPreview />
      </main>
      <Footer />
    </LanguageProvider>
  );
}
