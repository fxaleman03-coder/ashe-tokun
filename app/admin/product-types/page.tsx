import AdminShell from "@/components/admin/AdminShell";
import { ManagementCard } from "@/components/admin/CatalogViews";
import { productTypes } from "@/lib/catalog";

export default function AdminProductTypesPage() {
  return (
    <AdminShell
      title="Product Types"
      description="Define how each product should behave across catalog, inventory, and future checkout."
    >
      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {productTypes.map((productType) => (
          <ManagementCard
            key={productType.id}
            title={productType.name}
            description={productType.description}
            meta={productType.useCase}
            status="Visual"
            action="View"
          />
        ))}
      </section>
    </AdminShell>
  );
}
