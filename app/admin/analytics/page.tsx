import AdminShell from "@/components/admin/AdminShell";
import { PlaceholderPage } from "@/components/admin/CatalogViews";

export default function AdminAnalyticsPage() {
  return (
    <AdminShell
      title="Analytics"
      description="Store analytics will connect after backend and order data are available."
    >
      <PlaceholderPage
        title="Analytics are visual-only."
        description="Revenue, product performance, customer behavior, and catalog insights will appear here later."
        href="/admin/catalog"
      />
    </AdminShell>
  );
}
