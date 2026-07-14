import type { StaffScheduleEmployee, StaffShift } from "@/lib/types/scheduling";

export type TimecardStatus =
  | "open"
  | "incomplete"
  | "pending_review"
  | "approved"
  | "reopened"
  | "archived";

export type PunchType =
  | "clock_in"
  | "break_out"
  | "break_in"
  | "clock_out"
  | "manual_in"
  | "manual_break_out"
  | "manual_break_in"
  | "manual_out";

export type PunchSource = "staff_portal" | "admin" | "kiosk" | "system_correction";

export type TimecardExceptionType =
  | "late_arrival"
  | "early_arrival"
  | "early_departure"
  | "late_departure"
  | "missed_clock_in"
  | "missed_clock_out"
  | "missed_break_out"
  | "missed_break_in"
  | "excessive_break"
  | "short_break"
  | "unscheduled_work"
  | "outside_schedule"
  | "overlapping_punch"
  | "invalid_punch_sequence"
  | "time_off_conflict"
  | "no_scheduled_shift"
  | "excessive_shift_duration";

export type TimecardExceptionSeverity = "info" | "warning" | "critical";
export type TimecardExceptionStatus = "open" | "resolved" | "dismissed";

export type StaffTimecard = {
  id: string;
  staff_member_id: string;
  work_date: string;
  shift_id: string | null;
  location_id: string | null;
  status: TimecardStatus;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  scheduled_break_minutes: number;
  regular_minutes: number;
  overtime_minutes: number;
  unpaid_break_minutes: number;
  exception_count: number;
  employee_notes: string | null;
  manager_notes: string | null;
  submitted_at: string | null;
  submitted_by_staff_id: string | null;
  approved_at: string | null;
  approved_by_staff_id: string | null;
  reopened_at: string | null;
  reopened_by_staff_id: string | null;
  created_at: string;
  updated_at: string | null;
  staff_member?: StaffScheduleEmployee | null;
  shift?: StaffShift | null;
  location_name?: string | null;
  approved_by?: StaffScheduleEmployee | null;
};

export type StaffPunch = {
  id: string;
  timecard_id: string;
  staff_member_id: string;
  shift_id: string | null;
  location_id: string | null;
  punch_type: PunchType;
  punched_at: string;
  punchedAt: string;
  source: PunchSource;
  created_by_staff_id: string | null;
  corrected_from_punch_id: string | null;
  is_correction: boolean;
  correction_reason: string | null;
  device_name: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  notes: string | null;
  created_at: string;
};

export type StaffTimecardException = {
  id: string;
  timecard_id: string;
  staff_member_id: string;
  exception_type: TimecardExceptionType;
  severity: TimecardExceptionSeverity;
  status: TimecardExceptionStatus;
  related_punch_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  resolved_at: string | null;
  resolved_by_staff_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type StaffTimekeeperEvent = {
  id: string;
  timecard_id: string | null;
  punch_id: string | null;
  staff_member_id: string | null;
  actor_staff_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type TimekeeperFilters = {
  startDate?: string;
  endDate?: string;
  staffMemberId?: string;
  locationId?: string | "all";
};

export type TimecardFilters = TimekeeperFilters & {
  status?: TimecardStatus | "all";
  exceptionType?: TimecardExceptionType | "all";
  role?: string | "all";
};

export type PunchInput = {
  notes?: string | null;
};

export type ManualPunchInput = {
  staff_member_id: string;
  work_date: string;
  punch_type: PunchType;
  punched_at: string;
  location_id?: string | null;
  shift_id?: string | null;
  reason: string;
  notes?: string | null;
};

export type TimecardReviewInput = {
  timecardId: string;
  notes?: string | null;
};

export type TimecardApprovalInput = TimecardReviewInput;

export type TimecardMetrics = {
  clockedInNow: number;
  onBreak: number;
  missingClockOut: number;
  pendingReview: number;
  openExceptions: number;
  approvedToday: number;
  unscheduledWork: number;
  lateArrivals: number;
};

export type AttendanceSummary = {
  totalTimecards: number;
  approvedTimecards: number;
  pendingReview: number;
  openExceptions: number;
  regularMinutes: number;
  overtimeMinutes: number;
};

export type DailyPunchState = {
  status: "clocked_out" | "clocked_in" | "on_break" | "complete";
  expectedNextPunchType: PunchType | null;
  lastPunch?: StaffPunch | null;
};

export type PunchSequenceValidation = {
  valid: boolean;
  error?: string;
};

export type ScheduledVsActualSummary = {
  scheduledMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  varianceMinutes: number;
};

export type TimecardCalculationResult = {
  firstClockIn: string | null;
  lastClockOut: string | null;
  totalElapsedMinutes: number;
  unpaidBreakMinutes: number;
  workedMinutes: number;
  scheduledMinutes: number;
  varianceMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  exceptionCount: number;
  status: TimecardStatus;
};

export type TimekeeperMutationResult<T = unknown> =
  | { ok: true; data: T; message?: string; warning?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
