import AdminShell from "@/components/admin/AdminShell";
import { ManagementCard } from "@/components/admin/CatalogViews";
import { getProductTypesResult } from "@/lib/data/productTypes";

export default async function AdminProductTypesPage() {
  const productTypeReadResult = await getProductTypesResult();
  const productTypes = productTypeReadResult.productTypes;
  const dataSource =
    productTypeReadResult.source === "supabase"
      ? "Supabase"
      : "Local fallback";

  return (
    <AdminShell
      title="Product Types"
      description="Manage commerce behavior and handling types used across ASHE TOKUN."
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

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {productTypes.map((productType) => (
            <ManagementCard
              key={productType.id}
              title={productType.name}
              description={productType.description ?? "Pending"}
              meta={productType.slug}
              status={productType.active ? "Active" : "Inactive"}
              action="View"
            />
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
