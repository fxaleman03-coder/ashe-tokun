import AdminShell from "@/components/admin/AdminShell";
import AdminCollectionsPageContent from "@/components/admin/AdminCollectionsPageContent";
import { getCollectionsResult } from "@/lib/data/collections";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminCollectionsPage() {
  await requirePermission("products.read");

  const collectionReadResult = await getCollectionsResult();
  return (
    <AdminShell title="">
      <AdminCollectionsPageContent
        collections={collectionReadResult.collections}
        source={collectionReadResult.source}
      />
    </AdminShell>
  );
}
