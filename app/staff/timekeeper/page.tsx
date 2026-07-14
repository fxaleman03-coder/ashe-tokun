import StaffTimekeeper from "@/components/staff/StaffTimekeeper";
import { requirePermission } from "@/lib/staff/permissionGuard";
import {
  getCurrentTimecardForStaff,
  getExceptionsForTimecard,
  getPublishedShiftForStaffDate,
  getPunchesForTimecard,
} from "@/lib/data/timekeeperRepository";
import { getCurrentPunchState } from "@/lib/timekeeper/timekeeperHelpers";
import type { StaffShift } from "@/lib/types/scheduling";
import type {
  StaffPunch,
  StaffTimecard,
  StaffTimecardException,
} from "@/lib/types/timekeeper";
import { getBusinessTodayDate } from "@/lib/utils/dateTimeDisplay";

export const dynamic = "force-dynamic";

export default async function StaffTimekeeperPage() {
  const { staff } = await requirePermission("timekeeper.view_own");
  const today = getBusinessTodayDate();
  let readError: string | null = null;
  let timecard: StaffTimecard | null = null;
  let shift: StaffShift | null = null;
  let punches: StaffPunch[] = [];
  let exceptions: StaffTimecardException[] = [];

  try {
    [timecard, shift] = await Promise.all([
      getCurrentTimecardForStaff(staff.staffId),
      getPublishedShiftForStaffDate(staff.staffId, today),
    ]);
    [punches, exceptions] = timecard
      ? await Promise.all([
          getPunchesForTimecard(timecard.id),
          getExceptionsForTimecard(timecard.id),
        ])
      : [[], []];
  } catch (error) {
    readError = error instanceof Error ? error.message : "Timekeeper could not be loaded.";
  }

  if (readError) {
    return (
      <div className="min-h-screen bg-[#0f0b07] px-5 py-8 text-[#f7ead2] sm:px-8">
        <main className="mx-auto max-w-4xl border border-[#d8a344]/30 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Timekeeper Unavailable
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">Unable to load Timekeeper</h1>
          <p className="mt-3 text-sm text-[#e8dcc8]/70">
            {readError}
          </p>
        </main>
      </div>
    );
  }

  return (
    <StaffTimekeeper
      session={staff}
      today={today}
      timecard={timecard}
      punches={punches}
      exceptions={exceptions}
      shift={shift}
      punchState={getCurrentPunchState(punches)}
    />
  );
}
