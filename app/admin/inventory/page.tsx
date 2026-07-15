import AdminShell from "@/components/admin/AdminShell";
import AdminInventoryTable from "@/components/admin/AdminInventoryTable";
import {
  getInventoryItems,
  getInventoryLocations,
  getInventorySummary,
} from "@/lib/data/inventoryRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export default async function AdminInventoryPage() {
  await requirePermission("inventory.read");

  const [items, locations, summary] = await Promise.all([
    getInventoryItems(),
    getInventoryLocations(),
    getInventorySummary(),
  ]);

  return (
    <AdminShell
      title="Inventory"
      description="Unified inventory foundation for future barcode scanning, POS, and stock controls."
    >
      <AdminInventoryTable
        items={items}
        locations={locations}
        summary={summary}
      />
    </AdminShell>
  );
}
