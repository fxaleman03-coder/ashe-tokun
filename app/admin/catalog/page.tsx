import AdminShell from "@/components/admin/AdminShell";
import AdminCatalogPageContent from "@/components/admin/AdminCatalogPageContent";
import { getCatalogMetrics } from "@/lib/data/catalogMetrics";
import { getMediaAssets } from "@/lib/data/mediaRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminCatalogPage() {
  await requirePermission("products.read");

  const metrics = await getCatalogMetrics();
  const mediaCount = (await getMediaAssets()).length;

  return (
    <AdminShell title="">
      <AdminCatalogPageContent metrics={metrics} mediaCount={mediaCount} />
    </AdminShell>
  );
}
