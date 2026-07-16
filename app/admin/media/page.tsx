import AdminShell from "@/components/admin/AdminShell";
import AdminMediaPageContent from "@/components/admin/AdminMediaPageContent";
import { getMediaAssets } from "@/lib/data/mediaRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminMediaPage() {
  await requirePermission("products.read");

  const mediaAssets = await getMediaAssets();

  return (
    <AdminShell title="">
      <AdminMediaPageContent mediaAssets={mediaAssets} />
    </AdminShell>
  );
}
