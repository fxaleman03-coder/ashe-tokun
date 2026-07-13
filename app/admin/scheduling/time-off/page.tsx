import AdminShell from "@/components/admin/AdminShell";
import AdminTimeOffManager from "@/components/admin/AdminTimeOffManager";
import { getTimeOffRequestsResult } from "@/lib/data/schedulingRepository";

export const dynamic = "force-dynamic";

export default async function AdminSchedulingTimeOffPage() {
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
