import type { StaffShift } from "@/lib/types/scheduling";
import type { StaffPunch, TimecardCalculationResult } from "@/lib/types/timekeeper";
import {
  calculateBreakMinutes,
  calculateScheduledMinutes,
  calculateWorkedMinutes,
  detectAttendanceExceptions,
  sortPunches,
} from "@/lib/timekeeper/timekeeperHelpers";

const clockInTypes = ["clock_in", "manual_in"];
const clockOutTypes = ["clock_out", "manual_out"];

export function calculateTimecard(input: {
  punches: StaffPunch[];
  shift?: StaffShift | null;
  approvedTimeOff?: boolean;
}): TimecardCalculationResult {
  const punches = sortPunches(input.punches);
  const firstClockIn =
    punches.find((punch) => clockInTypes.includes(punch.punch_type))?.punched_at ??
    null;
  const lastClockOut =
    [...punches]
      .reverse()
      .find((punch) => clockOutTypes.includes(punch.punch_type))?.punched_at ??
    null;
  const totalElapsedMinutes =
    firstClockIn && lastClockOut
      ? Math.max(
          0,
          Math.round(
            (new Date(lastClockOut).getTime() - new Date(firstClockIn).getTime()) /
              60000,
          ),
        )
      : 0;
  const unpaidBreakMinutes = calculateBreakMinutes(punches);
  const workedMinutes = calculateWorkedMinutes(punches);
  const scheduledMinutes = calculateScheduledMinutes(input.shift);
  const exceptions = detectAttendanceExceptions({
    shift: input.shift,
    punches,
    approvedTimeOff: input.approvedTimeOff,
  });

  return {
    firstClockIn,
    lastClockOut,
    totalElapsedMinutes,
    unpaidBreakMinutes,
    workedMinutes,
    scheduledMinutes,
    varianceMinutes: workedMinutes - scheduledMinutes,
    regularMinutes: workedMinutes,
    overtimeMinutes: 0,
    exceptionCount: exceptions.length,
    status:
      punches.length === 0
        ? "open"
        : firstClockIn && lastClockOut
          ? exceptions.some((exception) => exception.severity === "critical")
            ? "incomplete"
            : "pending_review"
          : "incomplete",
  };
}
