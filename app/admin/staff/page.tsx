import AdminShell from "@/components/admin/AdminShell";
import AdminStaffManager from "@/components/admin/AdminStaffManager";
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
    <AdminShell
      title="Staff Management"
      description="Manage employee access, PIN resets, sessions, lockouts, and employment lifecycle records."
    >
      <AdminStaffManager
        staff={staff}
        metrics={metrics}
        currentTime={currentTime}
      />
    </AdminShell>
  );
}
