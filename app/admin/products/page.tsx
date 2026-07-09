import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import AdminProductsTable from "@/components/admin/AdminProductsTable";

export default function AdminProductsPage() {
  return (
    <AdminShell
      title="Products"
      description="Review the current local product catalog before database integration."
    >
      <div className="mb-6 flex justify-end">
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-12 items-center justify-center bg-[#d8a344] px-6 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#0f0b07] transition duration-500 ease-out hover:bg-[#f0c062] hover:shadow-[0_20px_48px_rgba(216,163,68,0.24)]"
        >
          Add Product
        </Link>
      </div>

      <AdminProductsTable />
    </AdminShell>
  );
}
