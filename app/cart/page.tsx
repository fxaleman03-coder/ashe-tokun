import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import CartPageContent from "@/components/storefront/CartPageContent";
import StorefrontProviders from "@/components/storefront/StorefrontProviders";
import { getProducts } from "@/lib/data/productsRepository";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const products = await getProducts();

  return (
    <StorefrontProviders>
      <Navbar />
      <CartPageContent products={products} />
      <Footer />
    </StorefrontProviders>
  );
}
