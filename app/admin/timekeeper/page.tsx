import AdminShell from "@/components/admin/AdminShell";
import AdminTimekeeperManager from "@/components/admin/AdminTimekeeperManager";
import { getInventoryLocations } from "@/lib/data/inventoryRepository";
import { getStaffMembers } from "@/lib/data/staffRepository";
import {
  getOpenTimekeeperExceptions,
  getTimecards,
  getTimekeeperMetrics,
} from "@/lib/data/timekeeperRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";
import type {
  StaffTimecard,
  StaffTimecardException,
  TimecardMetrics,
} from "@/lib/types/timekeeper";

export const dynamic = "force-dynamic";

export default async function AdminTimekeeperPage() {
  await requirePermission("timekeeper.view_all");

  let readError: string | null = null;
  let timecards: StaffTimecard[] = [];
  let exceptions: StaffTimecardException[] = [];
  let metrics: TimecardMetrics = {
    clockedInNow: 0,
    onBreak: 0,
    missingClockOut: 0,
    pendingReview: 0,
    openExceptions: 0,
    approvedToday: 0,
    unscheduledWork: 0,
    lateArrivals: 0,
  };

  try {
    [timecards, exceptions, metrics] = await Promise.all([
      getTimecards(),
      getOpenTimekeeperExceptions(),
      getTimekeeperMetrics(),
    ]);
  } catch (error) {
    readError = error instanceof Error ? error.message : "Timekeeper data could not be loaded.";
  }

  const [staff, locations] = await Promise.all([
    getStaffMembers(),
    getInventoryLocations(),
  ]);

  return (
    <AdminShell
      title="Timekeeper"
      description="Review attendance, exceptions, missed punches, and staff timecards."
    >
      <AdminTimekeeperManager
        timecards={timecards}
        exceptions={exceptions}
        metrics={metrics}
        staff={staff}
        locations={locations}
        readError={readError}
      />
    </AdminShell>
  );
}
