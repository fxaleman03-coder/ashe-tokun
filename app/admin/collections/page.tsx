import AdminShell from "@/components/admin/AdminShell";
import { ManagementCard } from "@/components/admin/CatalogViews";
import { getCollectionsResult } from "@/lib/data/collections";

export default async function AdminCollectionsPage() {
  const collectionReadResult = await getCollectionsResult();
  const collections = collectionReadResult.collections;
  const dataSource =
    collectionReadResult.source === "supabase"
      ? "Supabase"
      : "Local fallback";

  return (
    <AdminShell
      title="Collections"
      description="Manage customer-facing product collections used across ASHE TOKUN."
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
          {collections.map((collection) => (
            <ManagementCard
              key={collection.id}
              title={collection.name}
              description={collection.description ?? "Pending"}
              meta={collection.featured ? "Featured collection" : collection.slug}
              status={collection.active ? "Active" : "Inactive"}
              action="View"
            />
          ))}
        </section>
      </div>
    </AdminShell>
  );
}
