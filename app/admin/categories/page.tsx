import AdminShell from "@/components/admin/AdminShell";
import { ManagementTable } from "@/components/admin/CatalogViews";
import { categories } from "@/lib/catalog";

export default function AdminCategoriesPage() {
  return (
    <AdminShell
      title="Categories"
      description="Organize products by product family, vendor line, and tradition."
    >
      <ManagementTable
        rows={categories}
        columns={[
          { label: "Category", render: (category) => category.name },
          { label: "Type", render: (category) => category.type },
          {
            label: "Parent",
            render: (category) => category.parent ?? "Parent placeholder",
          },
          { label: "Product Count", render: () => "Product count placeholder" },
          { label: "Status", render: (category) => category.status },
        ]}
      />
    </AdminShell>
  );
}
