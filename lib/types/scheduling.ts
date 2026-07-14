import type { StaffRole } from "@/lib/staff/permissionTypes";

export type ScheduleStatus = "draft" | "published" | "archived";
export type ShiftStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";
export type TimeOffRequestType =
  | "vacation"
  | "sick"
  | "personal"
  | "unpaid"
  | "bereavement"
  | "jury_duty"
  | "other";
export type TimeOffStatus = "pending" | "approved" | "denied" | "cancelled";

export type StaffScheduleEmployee = {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  business_title?: string | null;
  role: StaffRole;
  active: boolean;
  employment_status: string;
};

export type StaffAvailability = {
  id: string;
  staff_member_id: string;
  weekday: number;
  available: boolean;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  effective_from: string | null;
  effective_until: string | null;
  created_at: string;
  updated_at: string | null;
  staff_member?: StaffScheduleEmployee | null;
};

export type StaffTimeOffRequest = {
  id: string;
  staff_member_id: string;
  request_type: TimeOffRequestType;
  start_date: string;
  end_date: string;
  partial_day: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  status: TimeOffStatus;
  reviewed_by_staff_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string | null;
  staff_member?: StaffScheduleEmployee | null;
  reviewer?: StaffScheduleEmployee | null;
};

export type StaffSchedulePeriod = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: ScheduleStatus;
  location_id: string | null;
  location_name: string | null;
  notes: string | null;
  published_at: string | null;
  published_by_staff_id: string | null;
  created_by_staff_id: string | null;
  updated_by_staff_id: string | null;
  created_at: string;
  updated_at: string | null;
};

export type StaffShift = {
  id: string;
  schedule_period_id: string;
  staff_member_id: string;
  location_id: string | null;
  location_name: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  unpaid_break_minutes: number;
  role_label: string | null;
  department_label: string | null;
  notes: string | null;
  status: ShiftStatus;
  created_by_staff_id: string | null;
  updated_by_staff_id: string | null;
  created_at: string;
  updated_at: string | null;
  staff_member?: StaffScheduleEmployee | null;
};

export type StaffScheduleEvent = {
  id: string;
  schedule_period_id: string | null;
  shift_id: string | null;
  staff_member_id: string | null;
  actor_staff_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ScheduleFilters = {
  status?: ScheduleStatus | "all";
  locationId?: string | "all";
  startDate?: string;
  endDate?: string;
};

export type ShiftFilters = {
  schedulePeriodId?: string;
  staffMemberId?: string;
  locationId?: string | "all";
  status?: ShiftStatus | "all";
  startDate?: string;
  endDate?: string;
};

export type CreateScheduleInput = {
  name: string;
  start_date: string;
  end_date: string;
  location_id?: string | null;
  notes?: string | null;
};

export type UpdateScheduleInput = Partial<CreateScheduleInput> & {
  status?: ScheduleStatus;
};

export type CreateShiftInput = {
  schedule_period_id: string;
  staff_member_id: string;
  location_id?: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  unpaid_break_minutes?: number;
  role_label?: string | null;
  department_label?: string | null;
  notes?: string | null;
  allowAvailabilityOverride?: boolean;
};

export type UpdateShiftInput = Partial<Omit<CreateShiftInput, "schedule_period_id">> & {
  status?: ShiftStatus;
};

export type TimeOffRequestInput = {
  staff_member_id: string;
  request_type: TimeOffRequestType;
  start_date: string;
  end_date: string;
  partial_day?: boolean;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
};

export type AvailabilityInput = {
  weekday: number;
  available: boolean;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  effective_from?: string | null;
  effective_until?: string | null;
};

export type ScheduleMetrics = {
  currentSchedule: string;
  draftSchedules: number;
  publishedSchedules: number;
  openShifts: number;
  pendingTimeOffRequests: number;
  employeesScheduledThisWeek: number;
  uncoveredDays: number;
};

export type ShiftConflict = {
  type:
    | "overlap"
    | "approved_time_off"
    | "outside_availability"
    | "inactive_employee"
    | "excessive_length"
    | "short_turnaround";
  message: string;
  blocking: boolean;
};

export type ScheduleCoverageSummary = {
  date: string;
  scheduledEmployees: number;
  activeShiftCount: number;
  uncovered: boolean;
};

export type SchedulingMutationResult<T = unknown> =
  | { ok: true; success?: true; data: T; warning?: string }
  | {
      ok: false;
      success?: false;
      error: string;
      fieldErrors?: Record<string, string>;
      conflicts?: ShiftConflict[];
    };
