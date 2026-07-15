import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PrintableStaffSchedule from "@/components/admin/PrintableStaffSchedule";
import ShiftForm from "@/components/admin/ShiftForm";
import WeeklyScheduleBoard from "@/components/admin/WeeklyScheduleBoard";
import { getInventoryLocations } from "@/lib/data/inventoryRepository";
import { getStaffMembers } from "@/lib/data/staffRepository";
import {
  getScheduleEvents,
  getSchedulePeriodById,
  getShiftsResult,
} from "@/lib/data/schedulingRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type ScheduleDetailPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export default async function ScheduleDetailPage({ params }: ScheduleDetailPageProps) {
  const { id } = await params;
  await requirePermission("schedule.view_all");

  if (!id || !isUuidLike(id)) {
    return (
      <AdminShell
        title="Schedule Not Available"
        description="Unable to load this schedule because the route schedule period id is missing or invalid."
      >
        <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 text-sm text-[#e8dcc8]/62">
          Unable to load schedule: schedule period id is missing or invalid.
        </section>
      </AdminShell>
    );
  }

  const [period, shiftsResult, events, locations, staff] = await Promise.all([
    getSchedulePeriodById(id),
    getShiftsResult({ schedulePeriodId: id }),
    getScheduleEvents(id),
    getInventoryLocations(),
    getStaffMembers(),
  ]);
  const shifts = shiftsResult.data;

  if (!period) {
    notFound();
  }

  return (
    <div className="staff-schedule-page">
      <AdminShell
        title={period.name}
        description="Manage weekly shifts, publish schedules, review audit history, and print staff schedules."
      >
        <div className="space-y-6">
          {period.status !== "archived" ? (
            <ShiftForm
              schedulePeriodId={period.id}
              periodStart={period.start_date}
              periodEnd={period.end_date}
              locations={locations}
              staff={staff}
            />
          ) : (
            <section className="border border-[#f7ead2]/10 bg-[#120d08] p-5 text-sm text-[#e8dcc8]/62">
              Archived schedules are read-only.
            </section>
          )}
          {shiftsResult.error ? (
            <section className="border border-[#d8a344]/30 bg-[#120d08] p-5 text-sm leading-6 text-[#e8dcc8]/72">
              Schedule read warning: {shiftsResult.error}
            </section>
          ) : null}
          <WeeklyScheduleBoard period={period} shifts={shifts} events={events} />
          <PrintableStaffSchedule period={period} shifts={shifts} />
        </div>
      </AdminShell>
    </div>
  );
}
