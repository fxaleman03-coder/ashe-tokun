import AdminShell from "@/components/admin/AdminShell";
import AdminTimeOffManager from "@/components/admin/AdminTimeOffManager";
import { getTimeOffRequestsResult } from "@/lib/data/schedulingRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export const dynamic = "force-dynamic";

export default async function AdminSchedulingTimeOffPage() {
  await requirePermission("schedule.approve_time_off");

  const requestsResult = await getTimeOffRequestsResult();

  return (
    <AdminShell
      title="Time-Off Requests"
      description="Review, approve, and deny ASHE TOKUN staff time-off requests."
    >
      <AdminTimeOffManager
        requests={requestsResult.data}
        requestsError={requestsResult.error}
      />
    </AdminShell>
  );
}
