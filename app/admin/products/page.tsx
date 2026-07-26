import AdminShell from "@/components/admin/AdminShell";
import AdminProductsPageContent from "@/components/admin/AdminProductsPageContent";
import {
  getAdminProducts,
  getAdminProductSourceStatus,
} from "@/lib/data/productsRepository";
import { hasPermission } from "@/lib/staff/permissionHelpers";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminProductsPage() {
  const { permissions } = await requirePermission("products.read");

  const [products, productSourceStatus] = await Promise.all([
    getAdminProducts(),
    getAdminProductSourceStatus(),
  ]);

  return (
    <AdminShell title="">
      <AdminProductsPageContent
        products={products}
        productSourceStatus={productSourceStatus}
        canPrintLabels={hasPermission(permissions, "products.edit")}
        canEditProducts={hasPermission(permissions, "products.edit")}
      />
    </AdminShell>
  );
}
