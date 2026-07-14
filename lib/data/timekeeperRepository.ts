import "server-only";

import { USE_SUPABASE } from "@/lib/config";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { StaffScheduleEmployee, StaffShift } from "@/lib/types/scheduling";
import type {
  DailyPunchState,
  StaffPunch,
  StaffTimecard,
  StaffTimecardException,
  TimecardFilters,
  TimecardMetrics,
} from "@/lib/types/timekeeper";
import { getCurrentPunchState } from "@/lib/timekeeper/timekeeperHelpers";
import { getBusinessTodayDate } from "@/lib/utils/dateTimeDisplay";
import { normalizeTimeInputValue } from "@/lib/utils/schedulingTime";

type StaffJoin = StaffScheduleEmployee | StaffScheduleEmployee[] | null | undefined;
type LocationJoin = { name?: string | null } | { name?: string | null }[] | null | undefined;
type ShiftJoin = StaffShift | StaffShift[] | null | undefined;

type TimecardRow = Omit<StaffTimecard, "staff_member" | "shift" | "location_name" | "approved_by"> & {
  staff_member?: StaffJoin;
  shift?: ShiftJoin;
  location?: LocationJoin;
  approved_by?: StaffJoin;
};

type PunchRow = Omit<StaffPunch, "punchedAt">;

function clientOrThrow() {
  const client = createSupabaseServiceClient();

  if (!USE_SUPABASE || !client) {
    throw new Error("Timekeeper requires Supabase service configuration.");
  }

  return client;
}

function firstJoin<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function locationName(location: LocationJoin) {
  return firstJoin(location)?.name ?? null;
}

function staffMember(staff: StaffJoin) {
  return firstJoin(staff) ?? null;
}

function shiftJoin(shift: ShiftJoin) {
  return firstJoin(shift) ?? null;
}

function formatReadError(context: string, error: {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}) {
  const parts = [
    error.code ? `Code: ${error.code}` : null,
    error.message ? `Message: ${error.message}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? `${context}: ${parts.join(" / ")}` : context;
}

function toShift(row: StaffShift | null | undefined): StaffShift | null {
  if (!row) return null;

  return {
    ...row,
    start_time: normalizeTimeInputValue(row.start_time),
    end_time: normalizeTimeInputValue(row.end_time),
  };
}

function toTimecard(row: TimecardRow): StaffTimecard {
  return {
    id: row.id,
    staff_member_id: row.staff_member_id,
    work_date: row.work_date,
    shift_id: row.shift_id,
    location_id: row.location_id,
    status: row.status,
    scheduled_start_time: row.scheduled_start_time
      ? normalizeTimeInputValue(row.scheduled_start_time)
      : null,
    scheduled_end_time: row.scheduled_end_time
      ? normalizeTimeInputValue(row.scheduled_end_time)
      : null,
    scheduled_break_minutes: row.scheduled_break_minutes ?? 0,
    regular_minutes: row.regular_minutes ?? 0,
    overtime_minutes: row.overtime_minutes ?? 0,
    unpaid_break_minutes: row.unpaid_break_minutes ?? 0,
    exception_count: row.exception_count ?? 0,
    employee_notes: row.employee_notes,
    manager_notes: row.manager_notes,
    submitted_at: row.submitted_at,
    submitted_by_staff_id: row.submitted_by_staff_id,
    approved_at: row.approved_at,
    approved_by_staff_id: row.approved_by_staff_id,
    reopened_at: row.reopened_at,
    reopened_by_staff_id: row.reopened_by_staff_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    staff_member: staffMember(row.staff_member),
    shift: toShift(shiftJoin(row.shift)),
    location_name: locationName(row.location),
    approved_by: staffMember(row.approved_by),
  };
}

async function hydrateTimecardStaffProfiles(timecards: StaffTimecard[]) {
  const client = clientOrThrow();
  const staffIds = Array.from(
    new Set(
      timecards
        .flatMap((timecard) => [
          timecard.staff_member_id,
          timecard.approved_by_staff_id,
        ])
        .filter(Boolean) as string[],
    ),
  );

  if (staffIds.length === 0) {
    return timecards;
  }

  const { data, error } = await client
    .from("staff_members")
    .select(
      "id, employee_number, first_name, last_name, display_name, business_title, role, active, employment_status",
    )
    .in("id", staffIds);

  if (error || !data) {
    return timecards;
  }

  const staffById = new Map(
    data.map((staff) => [
      staff.id,
      {
        id: staff.id,
        employee_number: staff.employee_number,
        first_name: staff.first_name,
        last_name: staff.last_name,
        display_name: staff.display_name,
        business_title: staff.business_title,
        role: staff.role,
        active: staff.active,
        employment_status: staff.employment_status,
      } satisfies StaffScheduleEmployee,
    ]),
  );

  return timecards.map((timecard) => ({
    ...timecard,
    staff_member: staffById.get(timecard.staff_member_id) ?? timecard.staff_member,
    approved_by: timecard.approved_by_staff_id
      ? staffById.get(timecard.approved_by_staff_id) ?? timecard.approved_by
      : timecard.approved_by,
  }));
}

export function normalizeStaffPunch(row: PunchRow): StaffPunch {
  if (!row.punched_at) {
    console.error("[Timekeeper] Saved punch is missing punched_at", {
      punchId: row.id,
      timecardId: row.timecard_id,
      staffMemberId: row.staff_member_id,
    });
  }

  return {
    id: row.id,
    timecard_id: row.timecard_id,
    staff_member_id: row.staff_member_id,
    shift_id: row.shift_id,
    location_id: row.location_id,
    punch_type: row.punch_type,
    punched_at: row.punched_at,
    punchedAt: row.punched_at,
    source: row.source,
    created_by_staff_id: row.created_by_staff_id,
    corrected_from_punch_id: row.corrected_from_punch_id,
    is_correction: row.is_correction,
    correction_reason: row.correction_reason,
    device_name: row.device_name,
    notes: row.notes,
    created_at: row.created_at,
  };
}

const timecardSelect = `
  *,
  staff_member:staff_members!staff_timecards_staff_member_id_fkey(
    id,
    employee_number,
    first_name,
    last_name,
    display_name,
    business_title,
    role,
    active,
    employment_status
  ),
  approved_by:staff_members!staff_timecards_approved_by_staff_id_fkey(
    id,
    employee_number,
    first_name,
    last_name,
    display_name,
    business_title,
    role,
    active,
    employment_status
  ),
  location:inventory_locations(name),
  shift:staff_shifts(
    id,
    schedule_period_id,
    staff_member_id,
    location_id,
    shift_date,
    start_time,
    end_time,
    unpaid_break_minutes,
    role_label,
    department_label,
    notes,
    status,
    created_by_staff_id,
    updated_by_staff_id,
    created_at,
    updated_at
  )
`;

export async function getTimecards(filters: TimecardFilters = {}) {
  const client = clientOrThrow();
  let query = client
    .from("staff_timecards")
    .select(timecardSelect)
    .order("work_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.staffMemberId) query = query.eq("staff_member_id", filters.staffMemberId);
  if (filters.locationId && filters.locationId !== "all") query = query.eq("location_id", filters.locationId);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.startDate) query = query.gte("work_date", filters.startDate);
  if (filters.endDate) query = query.lte("work_date", filters.endDate);

  const { data, error } = await query;

  if (error) {
    throw new Error(formatReadError("Unable to load timecards", error));
  }

  return hydrateTimecardStaffProfiles(((data ?? []) as TimecardRow[]).map(toTimecard));
}

export async function getTimecardById(id: string) {
  const client = clientOrThrow();
  const { data, error } = await client
    .from("staff_timecards")
    .select(timecardSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(formatReadError("Unable to load timecard", error));
  }

  if (!data) return null;

  const [timecard] = await hydrateTimecardStaffProfiles([toTimecard(data as TimecardRow)]);

  return timecard ?? null;
}

export async function getCurrentTimecardForStaff(staffMemberId: string) {
  const today = getBusinessTodayDate();
  const client = clientOrThrow();
  const { data, error } = await client
    .from("staff_timecards")
    .select(timecardSelect)
    .eq("staff_member_id", staffMemberId)
    .eq("work_date", today)
    .maybeSingle();

  if (error) {
    throw new Error(formatReadError("Unable to load today's timecard", error));
  }

  if (!data) return null;

  const [timecard] = await hydrateTimecardStaffProfiles([toTimecard(data as TimecardRow)]);

  return timecard ?? null;
}

export async function getPunchesForTimecard(timecardId: string) {
  const client = clientOrThrow();
  const { data, error } = await client
    .from("staff_punches")
    .select(
      "id, timecard_id, staff_member_id, shift_id, location_id, punch_type, punched_at, source, created_by_staff_id, corrected_from_punch_id, is_correction, correction_reason, device_name, notes, created_at",
    )
    .eq("timecard_id", timecardId)
    .order("punched_at", { ascending: true });

  if (error) {
    throw new Error(formatReadError("Unable to load punches", error));
  }

  return ((data ?? []) as PunchRow[]).map(normalizeStaffPunch);
}

export async function getExceptionsForTimecard(timecardId: string) {
  const client = clientOrThrow();
  const { data, error } = await client
    .from("staff_timecard_exceptions")
    .select("*")
    .eq("timecard_id", timecardId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(formatReadError("Unable to load timecard exceptions", error));
  }

  return (data ?? []) as StaffTimecardException[];
}

export async function getOpenTimekeeperExceptions(filters: TimecardFilters = {}) {
  const client = clientOrThrow();
  let query = client
    .from("staff_timecard_exceptions")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (filters.staffMemberId) query = query.eq("staff_member_id", filters.staffMemberId);
  if (filters.exceptionType && filters.exceptionType !== "all") {
    query = query.eq("exception_type", filters.exceptionType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(formatReadError("Unable to load timekeeper exceptions", error));
  }

  return (data ?? []) as StaffTimecardException[];
}

export async function getCurrentPunchStateForStaff(staffMemberId: string): Promise<DailyPunchState> {
  const timecard = await getCurrentTimecardForStaff(staffMemberId);

  if (!timecard) {
    return { status: "clocked_out", expectedNextPunchType: "clock_in", lastPunch: null };
  }

  const punches = await getPunchesForTimecard(timecard.id);

  return getCurrentPunchState(punches);
}

export async function getPublishedShiftForStaffDate(
  staffMemberId: string,
  workDate: string,
): Promise<StaffShift | null> {
  const client = clientOrThrow();
  const { data, error } = await client
    .from("staff_shifts")
    .select(
      `
      *,
      period:staff_schedule_periods(status),
      location:inventory_locations(name)
    `,
    )
    .eq("staff_member_id", staffMemberId)
    .eq("shift_date", workDate)
    .in("status", ["scheduled", "confirmed"])
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(formatReadError("Unable to load scheduled shift", error));
  }

  const row = (data ?? []).find((shift) => {
    const period = Array.isArray(shift.period) ? shift.period[0] : shift.period;
    return period?.status === "published";
  });

  if (!row) return null;

  const shift = toShift(row as StaffShift);

  if (!shift) return null;

  return {
    ...shift,
    location_name: locationName((row as { location?: LocationJoin }).location),
  };
}

export async function getTimekeeperMetrics(): Promise<TimecardMetrics> {
  const [todayCards, exceptions] = await Promise.all([
    getTimecards({ startDate: getBusinessTodayDate(), endDate: getBusinessTodayDate() }),
    getOpenTimekeeperExceptions(),
  ]);

  const openOrReopened = todayCards.filter((timecard) =>
    ["open", "incomplete", "reopened"].includes(timecard.status),
  );

  return {
    clockedInNow: openOrReopened.length,
    onBreak: 0,
    missingClockOut: exceptions.filter((exception) => exception.exception_type === "missed_clock_out").length,
    pendingReview: todayCards.filter((timecard) => timecard.status === "pending_review").length,
    openExceptions: exceptions.length,
    approvedToday: todayCards.filter((timecard) => timecard.status === "approved").length,
    unscheduledWork: exceptions.filter((exception) => exception.exception_type === "no_scheduled_shift").length,
    lateArrivals: exceptions.filter((exception) => exception.exception_type === "late_arrival").length,
  };
}
