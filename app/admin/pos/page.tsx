import AdminShell from "@/components/admin/AdminShell";
import AdminPOS from "@/components/admin/AdminPOS";

export default function AdminPOSPage() {
  return (
    <AdminShell
      title="Point of Sale"
      description="Scan, search, and prepare in-store sales using the local catalog foundation."
    >
      <AdminPOS />
    </AdminShell>
  );
}
