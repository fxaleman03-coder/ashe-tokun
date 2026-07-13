import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import StaffMemberForm from "@/components/admin/StaffMemberForm";
import { getInventoryLocations } from "@/lib/data/inventoryRepository";
import { getStaffMemberById } from "@/lib/data/staffRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type EditStaffMemberPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function EditStaffMemberPage({
  params,
}: EditStaffMemberPageProps) {
  await requirePermission("staff.edit");
  const { id } = await params;
  const [member, locations] = await Promise.all([
    getStaffMemberById(id),
    getInventoryLocations(),
  ]);

  if (!member) {
    notFound();
  }

  return (
    <AdminShell
      title={`Edit ${member.employee_number}`}
      description="Update editable employee profile fields. Employee number, PIN, sessions, and authentication history are protected."
    >
      <StaffMemberForm
        mode="edit"
        member={member}
        locations={locations}
      />
    </AdminShell>
  );
}
