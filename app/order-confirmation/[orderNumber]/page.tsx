import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import OrderConfirmationPageContent from "@/components/storefront/OrderConfirmationPageContent";
import StorefrontProviders from "@/components/storefront/StorefrontProviders";
import { getPublicOrderConfirmation } from "@/lib/data/publicCheckoutRepository";

type OrderConfirmationPageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ key?: string }>;
};

export const dynamic = "force-dynamic";

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: OrderConfirmationPageProps) {
  const { orderNumber } = await params;
  const { key = "" } = await searchParams;
  const order = await getPublicOrderConfirmation(orderNumber, key);

  return (
    <StorefrontProviders>
      <Navbar />
      <OrderConfirmationPageContent order={order} />
      <Footer />
    </StorefrontProviders>
  );
}
