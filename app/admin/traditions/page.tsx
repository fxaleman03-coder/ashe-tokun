import AdminShell from "@/components/admin/AdminShell";
import { ManagementCard } from "@/components/admin/CatalogViews";
import { traditions } from "@/lib/catalog";

export default function AdminTraditionsPage() {
  return (
    <AdminShell
      title="Traditions"
      description="Manage devotional, cultural, and brand tradition groupings."
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {traditions.map((tradition) => (
          <ManagementCard
            key={tradition.id}
            title={tradition.name}
            description={tradition.description}
            meta={tradition.storefrontVisibility}
            status="Visible"
            action="View"
          />
        ))}
      </section>
    </AdminShell>
  );
}
