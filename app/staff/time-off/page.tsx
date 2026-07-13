import StaffTimeOffRequestForm from "@/components/staff/StaffTimeOffRequestForm";
import { getTimeOffRequestsResult } from "@/lib/data/schedulingRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export const dynamic = "force-dynamic";

export default async function StaffTimeOffPage() {
  const { staff } = await requirePermission("schedule.manage_time_off");
  const requestsResult = await getTimeOffRequestsResult({ staffMemberId: staff.staffId });

  return (
    <StaffTimeOffRequestForm
      staffMemberId={staff.staffId}
      requests={requestsResult.data}
      requestsError={requestsResult.error}
    />
  );
}
