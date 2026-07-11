import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import EditProductForm from "@/components/admin/EditProductForm";
import {
  getProductBySlug,
  getProducts,
} from "@/lib/data/productsRepository";
import { getMediaAssets } from "@/lib/data/mediaRepository";
import { getProductMedia } from "@/lib/data/productMediaRepository";

type AdminEditProductPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const products = await getProducts();

  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function AdminEditProductPage({
  params,
}: AdminEditProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  const [mediaAssets, productMedia] = await Promise.all([
    getMediaAssets(),
    product ? getProductMedia(product.id) : Promise.resolve([]),
  ]);

  if (!product) {
    return (
      <AdminShell
        title="Product Not Found"
        description="This product is not available in the local catalog."
      >
        <Link
          href="/admin/products"
          className="inline-flex min-h-12 items-center justify-center border border-[#d8a344]/60 px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#d8a344] transition duration-500 ease-out hover:bg-[#d8a344] hover:text-[#0f0b07]"
        >
          Back to Products
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Product Studio"
      description={`Refine ${product.name.en} across catalog, media, pricing, inventory, SEO, and publishing.`}
    >
      <EditProductForm
        product={product}
        mediaAssets={mediaAssets}
        productMedia={productMedia}
      />
    </AdminShell>
  );
}
