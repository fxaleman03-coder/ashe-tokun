import AdminShell from "@/components/admin/AdminShell";
import StaffMemberForm from "@/components/admin/StaffMemberForm";
import { getInventoryLocations } from "@/lib/data/inventoryRepository";
import { requireStaffManagementAccess } from "@/lib/staff/staffAuthService";

export default async function NewStaffMemberPage() {
  await requireStaffManagementAccess();
  const locations = await getInventoryLocations();

  return (
    <AdminShell
      title="New Employee"
      description="Create a staff record with a temporary PIN. The PIN is hashed server-side and must be changed by the employee."
    >
      <StaffMemberForm locations={locations} />
    </AdminShell>
  );
}
