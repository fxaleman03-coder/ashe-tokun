import AdminShell from "@/components/admin/AdminShell";
import AdminProductsPageContent from "@/components/admin/AdminProductsPageContent";
import {
  getProducts,
  getProductSourceStatus,
} from "@/lib/data/productsRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminProductsPage() {
  await requirePermission("products.read");

  const [products, productSourceStatus] = await Promise.all([
    getProducts(),
    getProductSourceStatus(),
  ]);

  return (
    <AdminShell title="">
      <AdminProductsPageContent
        products={products}
        productSourceStatus={productSourceStatus}
      />
    </AdminShell>
  );
}
