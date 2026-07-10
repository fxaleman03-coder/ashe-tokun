import AdminShell from "@/components/admin/AdminShell";
import AdminInventoryTable from "@/components/admin/AdminInventoryTable";

export default function AdminInventoryPage() {
  return (
    <AdminShell
      title="Inventory"
      description="Unified inventory foundation for future barcode scanning, POS, and stock controls."
    >
      <AdminInventoryTable />
    </AdminShell>
  );
}
