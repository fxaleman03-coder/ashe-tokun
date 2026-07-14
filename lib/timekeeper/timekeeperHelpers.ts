import { timekeeperConfig } from "@/lib/config/timekeeper";
import type { StaffShift } from "@/lib/types/scheduling";
import type {
  DailyPunchState,
  PunchSequenceValidation,
  PunchType,
  ScheduledVsActualSummary,
  StaffPunch,
  TimecardExceptionType,
  TimecardStatus,
} from "@/lib/types/timekeeper";
import {
  formatDateTime,
  formatTime,
  getBusinessTodayDate,
} from "@/lib/utils/dateTimeDisplay";

const clockInTypes: PunchType[] = ["clock_in", "manual_in"];
const breakOutTypes: PunchType[] = ["break_out", "manual_break_out"];
const breakInTypes: PunchType[] = ["break_in", "manual_break_in"];
const clockOutTypes: PunchType[] = ["clock_out", "manual_out"];

export function sortPunches(punches: StaffPunch[]) {
  return [...punches].sort(
    (first, second) =>
      new Date(first.punched_at).getTime() - new Date(second.punched_at).getTime(),
  );
}

export function getCurrentPunchState(punches: StaffPunch[]): DailyPunchState {
  const sorted = sortPunches(punches);
  const lastPunch = sorted.at(-1) ?? null;

  if (!lastPunch) {
    return {
      status: "clocked_out",
      expectedNextPunchType: "clock_in",
      lastPunch,
    };
  }

  if (clockOutTypes.includes(lastPunch.punch_type)) {
    return { status: "complete", expectedNextPunchType: null, lastPunch };
  }

  if (breakOutTypes.includes(lastPunch.punch_type)) {
    return { status: "on_break", expectedNextPunchType: "break_in", lastPunch };
  }

  if (clockInTypes.includes(lastPunch.punch_type) || breakInTypes.includes(lastPunch.punch_type)) {
    return {
      status: "clocked_in",
      expectedNextPunchType: "break_out",
      lastPunch,
    };
  }

  return { status: "clocked_out", expectedNextPunchType: "clock_in", lastPunch };
}

export function validatePunchSequence(
  punches: StaffPunch[],
  nextPunchType: PunchType,
  timecardStatus?: TimecardStatus,
): PunchSequenceValidation {
  if (timecardStatus === "approved") {
    return { valid: false, error: "Approved timecards cannot receive punches." };
  }

  const state = getCurrentPunchState(punches);

  if (clockInTypes.includes(nextPunchType)) {
    return punches.some((punch) => clockInTypes.includes(punch.punch_type))
      ? { valid: false, error: "This timecard already has a clock-in punch." }
      : { valid: true };
  }

  if (breakOutTypes.includes(nextPunchType)) {
    return state.status === "clocked_in"
      ? { valid: true }
      : { valid: false, error: "Break out requires an active clock-in." };
  }

  if (breakInTypes.includes(nextPunchType)) {
    return state.status === "on_break"
      ? { valid: true }
      : { valid: false, error: "Break in requires an active break." };
  }

  if (clockOutTypes.includes(nextPunchType)) {
    if (state.status === "on_break") {
      return { valid: false, error: "End the break before clocking out." };
    }

    return state.status === "clocked_in"
      ? { valid: true }
      : { valid: false, error: "Clock out requires an active clock-in." };
  }

  return { valid: false, error: "Unsupported punch type." };
}

function minutesBetween(start: string, end: string) {
  return Math.max(
    0,
    Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000),
  );
}

export function calculateBreakMinutes(punches: StaffPunch[]) {
  const sorted = sortPunches(punches);
  let breakStart: StaffPunch | null = null;
  let total = 0;

  for (const punch of sorted) {
    if (breakOutTypes.includes(punch.punch_type)) {
      breakStart = punch;
    }

    if (breakStart && breakInTypes.includes(punch.punch_type)) {
      total += minutesBetween(breakStart.punched_at, punch.punched_at);
      breakStart = null;
    }
  }

  return total;
}

export function calculateWorkedMinutes(punches: StaffPunch[]) {
  const sorted = sortPunches(punches);
  const firstIn = sorted.find((punch) => clockInTypes.includes(punch.punch_type));
  const lastOut = [...sorted]
    .reverse()
    .find((punch) => clockOutTypes.includes(punch.punch_type));

  if (!firstIn || !lastOut) {
    return 0;
  }

  return Math.max(
    0,
    minutesBetween(firstIn.punched_at, lastOut.punched_at) -
      calculateBreakMinutes(sorted),
  );
}

export function calculateScheduledMinutes(shift?: StaffShift | null) {
  if (!shift) {
    return 0;
  }

  const start = new Date(`2000-01-01T${shift.start_time}`);
  const end = new Date(`2000-01-01T${shift.end_time}`);

  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60000) -
      shift.unpaid_break_minutes,
  );
}

export function compareScheduledVsActual(input: {
  shift?: StaffShift | null;
  punches: StaffPunch[];
}): ScheduledVsActualSummary {
  const scheduledMinutes = calculateScheduledMinutes(input.shift);
  const breakMinutes = calculateBreakMinutes(input.punches);
  const workedMinutes = calculateWorkedMinutes(input.punches);

  return {
    scheduledMinutes,
    workedMinutes,
    breakMinutes,
    varianceMinutes: workedMinutes - scheduledMinutes,
  };
}

export function detectAttendanceExceptions(input: {
  shift?: StaffShift | null;
  punches: StaffPunch[];
  approvedTimeOff?: boolean;
}): Array<{
  type: TimecardExceptionType;
  severity: "info" | "warning" | "critical";
  description: string;
}> {
  const exceptions: Array<{
    type: TimecardExceptionType;
    severity: "info" | "warning" | "critical";
    description: string;
  }> = [];
  const sorted = sortPunches(input.punches);
  const firstIn = sorted.find((punch) => clockInTypes.includes(punch.punch_type));
  const lastOut = [...sorted]
    .reverse()
    .find((punch) => clockOutTypes.includes(punch.punch_type));

  if (!input.shift && firstIn) {
    exceptions.push({
      type: "no_scheduled_shift",
      severity: "warning",
      description: "Employee worked without a published scheduled shift.",
    });
  }

  if (input.approvedTimeOff && firstIn) {
    exceptions.push({
      type: "time_off_conflict",
      severity: "critical",
      description: "Employee punched during approved time off.",
    });
  }

  if (input.shift && firstIn) {
    const actualIn = new Date(firstIn.punched_at);
    const scheduledIn = new Date(`${input.shift.shift_date}T${input.shift.start_time}`);
    const variance = Math.round((actualIn.getTime() - scheduledIn.getTime()) / 60000);

    if (variance > timekeeperConfig.lateGraceMinutes) {
      exceptions.push({
        type: "late_arrival",
        severity: "warning",
        description: `Clock-in was ${variance} minutes after scheduled start.`,
      });
    }

    if (variance < -timekeeperConfig.earlyClockInMinutes) {
      exceptions.push({
        type: "early_arrival",
        severity: "info",
        description: `Clock-in was ${Math.abs(variance)} minutes before scheduled start.`,
      });
    }
  }

  if (input.shift && lastOut) {
    const actualOut = new Date(lastOut.punched_at);
    const scheduledOut = new Date(`${input.shift.shift_date}T${input.shift.end_time}`);
    const variance = Math.round((actualOut.getTime() - scheduledOut.getTime()) / 60000);

    if (variance < -timekeeperConfig.lateGraceMinutes) {
      exceptions.push({
        type: "early_departure",
        severity: "warning",
        description: `Clock-out was ${Math.abs(variance)} minutes before scheduled end.`,
      });
    }

    if (variance > timekeeperConfig.lateGraceMinutes) {
      exceptions.push({
        type: "late_departure",
        severity: "info",
        description: `Clock-out was ${variance} minutes after scheduled end.`,
      });
    }
  }

  if (firstIn && !lastOut) {
    exceptions.push({
      type: "missed_clock_out",
      severity: "critical",
      description: "Timecard has a clock-in without a clock-out.",
    });
  }

  if (calculateWorkedMinutes(sorted) > timekeeperConfig.maxShiftHours * 60) {
    exceptions.push({
      type: "excessive_shift_duration",
      severity: "critical",
      description: "Worked duration exceeds the configured maximum shift length.",
    });
  }

  return exceptions;
}

export function formatWorkedDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

export function formatPunchTime(value: string | null | undefined) {
  return value ? formatDateTime(value) : "Pending";
}

export function getWorkDateForPunch() {
  return getBusinessTodayDate();
}

export function getExpectedNextPunchType(punches: StaffPunch[]) {
  return getCurrentPunchState(punches).expectedNextPunchType;
}

export function isTimecardEditable(status: TimecardStatus) {
  return status !== "approved" && status !== "archived";
}

export function formatPunchType(type: PunchType) {
  return type
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function formatScheduledTime(time: string | null | undefined) {
  return formatTime(time);
}
