import AdminShell from "@/components/admin/AdminShell";
import { ManagementTable } from "@/components/admin/CatalogViews";
import { getBrandsResult } from "@/lib/data/brands";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminVendorsPage() {
  await requirePermission("vendors.read");

  const brandReadResult = await getBrandsResult();
  const brands = brandReadResult.brands;
  const dataSource =
    brandReadResult.source === "supabase" ? "Supabase" : "Local fallback";

  return (
    <AdminShell
      title="Brands"
      description="Manage customer-facing brands sold through ASHE TOKUN."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2">
          <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Data Source
            </p>
            <p className="mt-4 font-serif text-3xl font-semibold text-[#f7ead2]">
              {dataSource}
            </p>
          </article>
          <article className="border border-[#f7ead2]/10 bg-[#120d08] p-5 shadow-[0_22px_70px_rgba(0,0,0,0.22)]">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#d8a344]">
              Fallback
            </p>
            <p className="mt-4 font-serif text-3xl font-semibold text-[#f7ead2]">
              Available
            </p>
          </article>
        </section>

        <ManagementTable
          rows={brands}
          columns={[
            { label: "Brand", render: (brand) => brand.name },
            { label: "Slug", render: (brand) => brand.slug },
            {
              label: "Description",
              render: (brand) => brand.description ?? "Pending",
            },
            {
              label: "Status",
              render: (brand) => (brand.active ? "Active" : "Inactive"),
            },
          ]}
        />
      </div>
    </AdminShell>
  );
}
