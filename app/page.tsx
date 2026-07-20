import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import TraditionsSection from "@/components/home/TraditionsSection";
import Navbar from "@/components/Navbar";
import StorefrontProviders from "@/components/storefront/StorefrontProviders";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <StorefrontProviders>
      <Navbar />
      <main>
        <Hero />
        <TraditionsSection />
      </main>
      <Footer />
    </StorefrontProviders>
  );
}
