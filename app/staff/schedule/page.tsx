import StaffScheduleView from "@/components/staff/StaffScheduleView";
import {
  getStaffSchedule,
  getTimeOffRequests,
} from "@/lib/data/schedulingRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";
import {
  addDaysToDateString,
  getBusinessTodayDate,
} from "@/lib/utils/dateTimeDisplay";

export const dynamic = "force-dynamic";

export default async function StaffSchedulePage() {
  const { staff } = await requirePermission("schedule.view_own");
  const startDate = getBusinessTodayDate();
  const endDate = addDaysToDateString(startDate, 13);
  const [shifts, timeOffRequests] = await Promise.all([
    getStaffSchedule(staff.staffId, startDate, endDate),
    getTimeOffRequests({ staffMemberId: staff.staffId }),
  ]);

  return (
    <StaffScheduleView
      session={staff}
      shifts={shifts}
      timeOffRequests={timeOffRequests}
      today={startDate}
    />
  );
}
