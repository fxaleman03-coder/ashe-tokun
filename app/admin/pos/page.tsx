import AdminShell from "@/components/admin/AdminShell";
import AdminPOS from "@/components/admin/AdminPOS";
import {
  getNextOrderNumber,
  getNextReceiptNumber,
  getPosInventoryLocations,
  getPosProducts,
  getWalkInCustomer,
} from "@/lib/data/posRepository";
import { getInventorySummary } from "@/lib/data/inventoryRepository";

export default async function AdminPOSPage() {
  const [products, locations, customer, nextOrderNumber, nextReceiptNumber, summary] =
    await Promise.all([
      getPosProducts(),
      getPosInventoryLocations(),
      getWalkInCustomer(),
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
        nextOrderNumber={nextOrderNumber}
        nextReceiptNumber={nextReceiptNumber}
        source={summary.source}
      />
    </AdminShell>
  );
}
