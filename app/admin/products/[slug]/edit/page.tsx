import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import EditProductForm from "@/components/admin/EditProductForm";
import { products } from "@/lib/products";

type AdminEditProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({
    slug: product.slug,
  }));
}

export default async function AdminEditProductPage({
  params,
}: AdminEditProductPageProps) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);

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
      title={`Edit ${product.name.en}`}
      description="Update product pricing and catalog fields locally before database integration."
    >
      <EditProductForm product={product} />
    </AdminShell>
  );
}
