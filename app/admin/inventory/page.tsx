import AdminShell from "@/components/admin/AdminShell";
import AdminInventoryPageContent from "@/components/admin/AdminInventoryPageContent";
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
    <AdminShell title="">
      <AdminInventoryPageContent
        items={items}
        locations={locations}
        summary={summary}
      />
    </AdminShell>
  );
}
