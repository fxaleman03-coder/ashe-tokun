import Footer from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import Navbar from "@/components/Navbar";
import ProductDetailPage from "@/components/shop/ProductDetailPage";
import {
  getProductBySlug,
  getProducts,
} from "@/lib/data/productsRepository";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await getProducts();

  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function Page({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = (await getProductBySlug(slug)) ?? null;

  return (
    <LanguageProvider>
      <Navbar />
      <ProductDetailPage product={product} />
      <Footer />
    </LanguageProvider>
  );
}
