import Footer from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import Navbar from "@/components/Navbar";
import ProductDetailPage from "@/components/shop/ProductDetailPage";
import { products } from "@/lib/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function Page({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug) ?? null;

  return (
    <LanguageProvider>
      <Navbar />
      <ProductDetailPage product={product} />
      <Footer />
    </LanguageProvider>
  );
}
