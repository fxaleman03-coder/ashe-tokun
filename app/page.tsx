import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import TraditionsSection from "@/components/home/TraditionsSection";
import { LanguageProvider } from "@/components/LanguageProvider";
import Navbar from "@/components/Navbar";
import FeaturedProductsPreview from "@/components/shop/FeaturedProductsPreview";

export default function Home() {
  return (
    <LanguageProvider>
      <Navbar />
      <main>
        <Hero />
        <TraditionsSection />
        <FeaturedProductsPreview />
      </main>
      <Footer />
    </LanguageProvider>
  );
}
