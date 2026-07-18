import AdminShell from "@/components/admin/AdminShell";
import AdminUserAccessFormPageContent from "@/components/admin/AdminUserAccessFormPageContent";
import { getInventoryLocations } from "@/lib/data/inventoryRepository";
import { requireStaffManagementAccess } from "@/lib/staff/staffAuthService";

export default async function NewStaffMemberPage() {
  await requireStaffManagementAccess();
  const locations = await getInventoryLocations();

  return (
    <AdminShell title="">
      <AdminUserAccessFormPageContent locations={locations} mode="create" />
    </AdminShell>
  );
}
