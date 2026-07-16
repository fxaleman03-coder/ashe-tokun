import AdminShell from "@/components/admin/AdminShell";
import AdminCategoriesPageContent from "@/components/admin/AdminCategoriesPageContent";
import { getCategoriesResult } from "@/lib/data/categories";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminCategoriesPage() {
  await requirePermission("products.read");

  const categoryReadResult = await getCategoriesResult();
  return (
    <AdminShell title="">
      <AdminCategoriesPageContent
        categories={categoryReadResult.categories}
        source={categoryReadResult.source}
      />
    </AdminShell>
  );
}
