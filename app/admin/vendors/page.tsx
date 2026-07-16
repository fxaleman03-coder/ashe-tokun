import AdminShell from "@/components/admin/AdminShell";
import AdminVendorsPageContent from "@/components/admin/AdminVendorsPageContent";
import { getBrandsResult } from "@/lib/data/brands";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminVendorsPage() {
  await requirePermission("vendors.read");

  const brandReadResult = await getBrandsResult();
  return (
    <AdminShell title="">
      <AdminVendorsPageContent
        brands={brandReadResult.brands}
        source={brandReadResult.source}
      />
    </AdminShell>
  );
}
