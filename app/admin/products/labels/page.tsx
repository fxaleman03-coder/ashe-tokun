import AdminShell from "@/components/admin/AdminShell";
import AdminProductLabelsPageContent from "@/components/admin/AdminProductLabelsPageContent";
import { getProducts } from "@/lib/data/productsRepository";
import { hasPermission } from "@/lib/staff/permissionHelpers";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminProductLabelsPage() {
  const { permissions } = await requirePermission("products.read");
  const products = await getProducts();

  return (
    <AdminShell
      title=""
      description="Preview and print internal ASHE TOKUN Code 128 product labels."
    >
      <AdminProductLabelsPageContent
        products={products}
        canPrintLabels={hasPermission(permissions, "products.edit")}
      />
    </AdminShell>
  );
}
