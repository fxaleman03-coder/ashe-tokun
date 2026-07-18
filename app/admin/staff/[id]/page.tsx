import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import AdminUserAccessDetailPageContent from "@/components/admin/AdminUserAccessDetailPageContent";
import {
  getStaffEffectivePermissions,
  getStaffMemberById,
  getStaffSessions,
} from "@/lib/data/staffRepository";
import { requireStaffManagementAccess } from "@/lib/staff/staffAuthService";
import { hasPermission } from "@/lib/staff/permissionHelpers";

type StaffMemberDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StaffMemberDetailPage({
  params,
}: StaffMemberDetailPageProps) {
  const currentStaff = await requireStaffManagementAccess();
  const { id } = await params;
  const [member, sessions] = await Promise.all([
    getStaffMemberById(id),
    getStaffSessions(id),
  ]);

  if (!member) {
    notFound();
  }

  const currentPermissions = await getStaffEffectivePermissions(
    currentStaff.staffId,
    currentStaff.role,
  );

  return (
    <AdminShell title="">
      <AdminUserAccessDetailPageContent
        member={member}
        sessions={sessions}
        canEditProfile={hasPermission(currentPermissions, "staff.edit")}
      />
    </AdminShell>
  );
}
