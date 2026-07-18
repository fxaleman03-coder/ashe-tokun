import AdminShell from "@/components/admin/AdminShell";
import AdminUserAccessPageContent from "@/components/admin/AdminUserAccessPageContent";
import {
  getStaffMembers,
  getStaffMetrics,
} from "@/lib/data/staffRepository";
import { requireStaffManagementAccess } from "@/lib/staff/staffAuthService";

export default async function AdminStaffPage() {
  await requireStaffManagementAccess();
  const [staff, metrics] = await Promise.all([
    getStaffMembers(),
    getStaffMetrics(),
  ]);
  const currentTime = new Date().getTime();

  return (
    <AdminShell title="">
      <AdminUserAccessPageContent
        staff={staff}
        metrics={metrics}
        currentTime={currentTime}
      />
    </AdminShell>
  );
}
