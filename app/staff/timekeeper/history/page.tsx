import StaffTimecardHistory from "@/components/staff/StaffTimecardHistory";
import { getTimecards } from "@/lib/data/timekeeperRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";
import type { StaffTimecard } from "@/lib/types/timekeeper";

export const dynamic = "force-dynamic";

export default async function StaffTimecardHistoryPage() {
  const { staff } = await requirePermission("timekeeper.view_own");
  let readError: string | null = null;
  let timecards: StaffTimecard[] = [];

  try {
    timecards = await getTimecards({ staffMemberId: staff.staffId });
  } catch (error) {
    readError = error instanceof Error ? error.message : "Timecard history could not be loaded.";
  }

  if (readError) {
    return (
      <div className="min-h-screen bg-[#0f0b07] px-5 py-8 text-[#f7ead2] sm:px-8">
        <main className="mx-auto max-w-4xl border border-[#d8a344]/30 bg-[#120d08] p-5">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#d8a344]">
            Timecard History Unavailable
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">Unable to load history</h1>
          <p className="mt-3 text-sm text-[#e8dcc8]/70">
            {readError}
          </p>
        </main>
      </div>
    );
  }

  return <StaffTimecardHistory session={staff} timecards={timecards} />;
}
