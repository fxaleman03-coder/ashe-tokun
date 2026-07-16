import AdminShell from "@/components/admin/AdminShell";
import AdminProductTypesPageContent from "@/components/admin/AdminProductTypesPageContent";
import { getProductTypesResult } from "@/lib/data/productTypes";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminProductTypesPage() {
  await requirePermission("products.read");

  const productTypeReadResult = await getProductTypesResult();
  return (
    <AdminShell title="">
      <AdminProductTypesPageContent
        productTypes={productTypeReadResult.productTypes}
        source={productTypeReadResult.source}
      />
    </AdminShell>
  );
}
