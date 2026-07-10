import AdminShell from "@/components/admin/AdminShell";
import { ManagementCard } from "@/components/admin/CatalogViews";
import { collections } from "@/lib/catalog";

export default function AdminCollectionsPage() {
  return (
    <AdminShell
      title="Collections"
      description="Curate product groupings for merchandising and storefront storytelling."
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection) => (
          <ManagementCard
            key={collection.id}
            title={collection.name}
            description={collection.description}
            meta="Product count placeholder"
            status={collection.status}
            action="View"
          />
        ))}
      </section>
    </AdminShell>
  );
}
