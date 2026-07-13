import AdminShell from "@/components/admin/AdminShell";
import AdminSchedulingManager from "@/components/admin/AdminSchedulingManager";
import {
  getSchedulePeriods,
  getSchedulingMetrics,
  getShifts,
  getTimeOffRequests,
} from "@/lib/data/schedulingRepository";

export const dynamic = "force-dynamic";

export default async function AdminSchedulingPage() {
  const [periods, shifts, timeOffRequests, metrics] = await Promise.all([
    getSchedulePeriods(),
    getShifts(),
    getTimeOffRequests(),
    getSchedulingMetrics(),
  ]);

  return (
    <AdminShell
      title="Scheduling"
      description="Create, publish, and manage ASHE TOKUN employee schedules, availability, and time-off requests."
    >
      <AdminSchedulingManager
        periods={periods}
        shifts={shifts}
        timeOffRequests={timeOffRequests}
        metrics={metrics}
      />
    </AdminShell>
  );
}
