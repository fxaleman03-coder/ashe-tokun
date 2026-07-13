import StaffScheduleView from "@/components/staff/StaffScheduleView";
import {
  getStaffSchedule,
  getTimeOffRequests,
} from "@/lib/data/schedulingRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

export const dynamic = "force-dynamic";

export default async function StaffSchedulePage() {
  const { staff } = await requirePermission("schedule.view_own");
  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const end = new Date(today);
  end.setDate(end.getDate() + 13);
  const endDate = end.toISOString().slice(0, 10);
  const [shifts, timeOffRequests] = await Promise.all([
    getStaffSchedule(staff.staffId, startDate, endDate),
    getTimeOffRequests({ staffMemberId: staff.staffId }),
  ]);

  return (
    <StaffScheduleView
      session={staff}
      shifts={shifts}
      timeOffRequests={timeOffRequests}
    />
  );
}
