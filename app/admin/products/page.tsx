import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import AdminProductsTable from "@/components/admin/AdminProductsTable";
import {
  getProducts,
  getProductSourceStatus,
} from "@/lib/data/productsRepository";

export default async function AdminProductsPage() {
  const [products, productSourceStatus] = await Promise.all([
    getProducts(),
    getProductSourceStatus(),
  ]);

  return (
    <AdminShell
      title="Products"
      description="Review the current product catalog before database integration."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
            Data Source
          </p>
          <p className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
            {productSourceStatus}
          </p>
        </div>
        <div className="border border-[#f7ead2]/10 bg-[#120d08] p-4">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-[#d8a344]">
            Fallback
          </p>
          <p className="mt-3 font-serif text-2xl font-semibold text-[#f7ead2]">
            Available
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-12 items-center justify-center self-start bg-[#d8a344] px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.24)] lg:self-center"
        >
          Add Product
        </Link>
      </div>

      <AdminProductsTable products={products} />
    </AdminShell>
  );
}
