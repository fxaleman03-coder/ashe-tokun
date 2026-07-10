import AdminShell from "@/components/admin/AdminShell";
import { PlaceholderPage } from "@/components/admin/CatalogViews";

export default function AdminCustomersPage() {
  return (
    <AdminShell
      title="Customers"
      description="Customer management will be connected after authentication and checkout."
    >
      <PlaceholderPage
        title="Customer management is visual-only."
        description="Customer records, profiles, and purchase history will be available in a future phase."
        href="/admin/catalog"
      />
    </AdminShell>
  );
}
