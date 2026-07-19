import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CheckoutPageContent from "@/components/storefront/CheckoutPageContent";
import StorefrontProviders from "@/components/storefront/StorefrontProviders";
import { getProducts } from "@/lib/data/productsRepository";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const products = await getProducts();

  return (
    <StorefrontProviders>
      <Navbar />
      <CheckoutPageContent products={products} />
      <Footer />
    </StorefrontProviders>
  );
}
