import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import StaffMemberDetail from "@/components/admin/StaffMemberDetail";
import {
  getStaffAuthEvents,
  getStaffMembers,
  getStaffMemberById,
  getStaffPermissionSnapshot,
  getStaffSessions,
  staffMemberHasBusinessActivity,
} from "@/lib/data/staffRepository";
import { requireStaffManagementAccess } from "@/lib/staff/staffAuthService";

type StaffMemberDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StaffMemberDetailPage({
  params,
}: StaffMemberDetailPageProps) {
  await requireStaffManagementAccess();
  const { id } = await params;
  const [member, sessions, events, hasBusinessActivity, staffOptions] = await Promise.all([
    getStaffMemberById(id),
    getStaffSessions(id),
    getStaffAuthEvents(id),
    staffMemberHasBusinessActivity(id),
    getStaffMembers(),
  ]);

  if (!member) {
    notFound();
  }

  const permissionSnapshot = await getStaffPermissionSnapshot(
    member.id,
    member.role,
  );

  return (
    <AdminShell
      title={member.display_name || `${member.first_name} ${member.last_name}`}
      description="Review staff profile, security, lifecycle, sessions, and authentication events."
    >
      <StaffMemberDetail
        member={member}
        sessions={sessions}
        events={events}
        hasBusinessActivity={hasBusinessActivity}
        effectivePermissions={permissionSnapshot.effectivePermissions}
        staffOptions={staffOptions}
      />
    </AdminShell>
  );
}
