import AdminShell from "@/components/admin/AdminShell";
import AdminMediaPageContent from "@/components/admin/AdminMediaPageContent";
import { getAdminMediaAssets } from "@/lib/data/adminMediaRepository";
import { getBrands } from "@/lib/data/brands";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminMediaPage() {
  await requirePermission("products.read");

  const [mediaAssets, brands] = await Promise.all([
    getAdminMediaAssets(),
    getBrands(),
  ]);

  return (
    <AdminShell title="">
      <AdminMediaPageContent mediaAssets={mediaAssets} brands={brands} />
    </AdminShell>
  );
}
