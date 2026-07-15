import AdminShell from "@/components/admin/AdminShell";
import AdminPOS from "@/components/admin/AdminPOS";
import {
  getNextOrderNumber,
  getNextReceiptNumber,
  getPosInventoryLocations,
  getPosCustomers,
  getPosProducts,
  getWalkInCustomer,
} from "@/lib/data/posRepository";
import { getInventorySummary } from "@/lib/data/inventoryRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminPOSPage() {
  await requirePermission("pos.access");

  const [
    products,
    locations,
    customer,
    customers,
    nextOrderNumber,
    nextReceiptNumber,
    summary,
  ] =
    await Promise.all([
      getPosProducts(),
      getPosInventoryLocations(),
      getWalkInCustomer(),
      getPosCustomers(),
      getNextOrderNumber(),
      getNextReceiptNumber(),
      getInventorySummary(),
    ]);

  return (
    <AdminShell
      title="Point of Sale"
      description="Scan, search, and complete in-store sales using the live catalog and inventory foundation."
    >
      <AdminPOS
        products={products}
        locations={locations}
        customer={customer}
        customers={customers}
        nextOrderNumber={nextOrderNumber}
        nextReceiptNumber={nextReceiptNumber}
        source={summary.source}
      />
    </AdminShell>
  );
}
