import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import { LanguageProvider } from "@/components/LanguageProvider";
import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <LanguageProvider>
      <Navbar />
      <main>
        <Hero />
      </main>
      <Footer />
    </LanguageProvider>
  );
}
