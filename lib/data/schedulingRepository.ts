import "server-only";

import { USE_SUPABASE } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  normalizeTimeInputValue,
  timeInputValueToMinutes,
} from "@/lib/utils/schedulingTime";
import type {
  CreateShiftInput,
  ScheduleCoverageSummary,
  ScheduleFilters,
  ScheduleMetrics,
  ShiftConflict,
  ShiftFilters,
  StaffAvailability,
  StaffScheduleEmployee,
  StaffScheduleEvent,
  StaffSchedulePeriod,
  StaffShift,
  StaffTimeOffRequest,
} from "@/lib/types/scheduling";

type StaffJoin =
  | StaffScheduleEmployee
  | StaffScheduleEmployee[]
  | null
  | undefined;

type LocationJoin =
  | { name?: string | null }
  | { name?: string | null }[]
  | null
  | undefined;

type PeriodRow = Omit<StaffSchedulePeriod, "location_name"> & {
  location?: LocationJoin;
};

type ShiftRow = Omit<StaffShift, "location_name" | "staff_member"> & {
  location?: LocationJoin;
  staff_member?: StaffJoin;
};

type AvailabilityRow = StaffAvailability & {
  staff_member?: StaffJoin;
};

type TimeOffRow = StaffTimeOffRequest & {
  staff_member?: StaffJoin;
  reviewer?: StaffJoin;
};

const conflictBlockingShiftStatuses = new Set(["scheduled", "confirmed"]);

function isVisibleScheduleShift(shift: Pick<StaffShift, "status">) {
  return shift.status !== "cancelled";
}

type SchedulingReadResult<T> = {
  data: T[];
  error?: string;
  debug?: {
    rawCount: number;
    rawIds: string[];
    rawSchedulePeriodIds: string[];
    mappedCount: number;
    activeCount?: number;
  };
};

type AvailabilityReadResult = {
  data: StaffAvailability[];
  error?: string;
};

type TimeOffReadResult = {
  data: StaffTimeOffRequest[];
  error?: string;
};

function getSchedulingSupabaseClient() {
  return createSupabaseServiceClient() ?? supabase;
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

function emptyIfUnavailable<T>() {
  return [] satisfies T[];
}

function toPeriod(row: PeriodRow): StaffSchedulePeriod {
  return {
    id: row.id,
    name: row.name,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    location_id: row.location_id,
    location_name: locationName(row.location),
    notes: row.notes,
    published_at: row.published_at,
    published_by_staff_id: row.published_by_staff_id,
    created_by_staff_id: row.created_by_staff_id,
    updated_by_staff_id: row.updated_by_staff_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function toShift(row: ShiftRow): StaffShift {
  return {
    id: row.id,
    schedule_period_id: row.schedule_period_id,
    staff_member_id: row.staff_member_id,
    location_id: row.location_id,
    location_name: locationName(row.location),
    shift_date: row.shift_date,
    start_time: normalizeTimeInputValue(row.start_time),
    end_time: normalizeTimeInputValue(row.end_time),
    unpaid_break_minutes: row.unpaid_break_minutes ?? 0,
    role_label: row.role_label,
    department_label: row.department_label,
    notes: row.notes,
    status: row.status,
    created_by_staff_id: row.created_by_staff_id,
    updated_by_staff_id: row.updated_by_staff_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    staff_member: staffMember(row.staff_member),
  };
}

function toShiftWithEnrichment(
  row: ShiftRow,
  staffById: Map<string, StaffScheduleEmployee>,
  locationById: Map<string, string>,
): StaffShift {
  return {
    ...toShift(row),
    location_name: row.location_id ? locationById.get(row.location_id) ?? null : null,
    staff_member: staffById.get(row.staff_member_id) ?? null,
  };
}

function toAvailability(row: AvailabilityRow): StaffAvailability {
  return {
    id: row.id,
    staff_member_id: row.staff_member_id,
    weekday: row.weekday,
    available: row.available,
    start_time: row.start_time ? normalizeTimeInputValue(row.start_time) : null,
    end_time: row.end_time ? normalizeTimeInputValue(row.end_time) : null,
    notes: row.notes,
    effective_from: row.effective_from,
    effective_until: row.effective_until,
    created_at: row.created_at,
    updated_at: row.updated_at,
    staff_member: staffMember(row.staff_member),
  };
}

function toTimeOff(row: TimeOffRow): StaffTimeOffRequest {
  return {
    id: row.id,
    staff_member_id: row.staff_member_id,
    request_type: row.request_type,
    start_date: row.start_date,
    end_date: row.end_date,
    partial_day: row.partial_day,
    start_time: row.start_time ? normalizeTimeInputValue(row.start_time) : null,
    end_time: row.end_time ? normalizeTimeInputValue(row.end_time) : null,
    reason: row.reason,
    status: row.status,
    reviewed_by_staff_id: row.reviewed_by_staff_id,
    reviewed_at: row.reviewed_at,
    review_notes: row.review_notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    staff_member: staffMember(row.staff_member),
    reviewer: staffMember(row.reviewer),
  };
}

export async function getSchedulePeriods(filters?: ScheduleFilters) {
  const client = getSchedulingSupabaseClient();

  if (!USE_SUPABASE || !client) {
    return emptyIfUnavailable<StaffSchedulePeriod>();
  }

  let query = client
    .from("staff_schedule_periods")
    .select("*, location:inventory_locations(name)")
    .order("start_date", { ascending: false });

  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.locationId && filters.locationId !== "all") {
    query = query.eq("location_id", filters.locationId);
  }
  if (filters?.startDate) {
    query = query.gte("end_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("start_date", filters.endDate);
  }

  const { data, error } = await query;

  return error || !data ? [] : (data as PeriodRow[]).map(toPeriod);
}

export async function getSchedulePeriodById(id: string) {
  const periods = await getSchedulePeriods();

  return periods.find((period) => period.id === id) ?? null;
}

export async function getCurrentSchedulePeriod(locationId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const periods = await getSchedulePeriods({
    status: "published",
    locationId: locationId ?? "all",
    startDate: today,
    endDate: today,
  });

  return periods
    .filter((period) => period.start_date <= today && period.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0] ?? null;
}

export async function getUpcomingSchedulePeriods(locationId?: string) {
  const today = new Date().toISOString().slice(0, 10);

  return getSchedulePeriods({
    locationId: locationId ?? "all",
    startDate: today,
  });
}

export async function getShiftsResult(filters?: ShiftFilters): Promise<SchedulingReadResult<StaffShift>> {
  const client = getSchedulingSupabaseClient();

  if (!USE_SUPABASE || !client) {
    return { data: emptyIfUnavailable<StaffShift>(), error: "Scheduling Supabase client unavailable." };
  }

  let query = client
    .from("staff_shifts")
    .select("*")
    .order("shift_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (filters?.schedulePeriodId) {
    query = query.eq("schedule_period_id", filters.schedulePeriodId);
  }
  if (filters?.staffMemberId) {
    query = query.eq("staff_member_id", filters.staffMemberId);
  }
  if (filters?.locationId && filters.locationId !== "all") {
    query = query.eq("location_id", filters.locationId);
  }
  if (filters?.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters?.startDate) {
    query = query.gte("shift_date", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("shift_date", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: formatReadError("Unable to read staff shifts", error),
      debug: {
        rawCount: 0,
        rawIds: [],
        rawSchedulePeriodIds: [],
        mappedCount: 0,
        activeCount: 0,
      },
    };
  }

  const rows = (data ?? []) as ShiftRow[];
  const staffIds = Array.from(new Set(rows.map((row) => row.staff_member_id).filter(Boolean)));
  const locationIds = Array.from(new Set(rows.map((row) => row.location_id).filter(Boolean))) as string[];
  const [staffResult, locationResult] = await Promise.all([
    staffIds.length > 0
      ? client
          .from("staff_members")
          .select("id, employee_number, first_name, last_name, display_name, role, active, employment_status")
          .in("id", staffIds)
      : Promise.resolve({ data: [], error: null }),
    locationIds.length > 0
      ? client
          .from("inventory_locations")
          .select("id, name")
          .in("id", locationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const staffById = new Map(
    ((staffResult.data ?? []) as StaffScheduleEmployee[]).map((staff) => [staff.id, staff]),
  );
  const locationById = new Map(
    ((locationResult.data ?? []) as { id: string; name: string | null }[]).map((location) => [
      location.id,
      location.name ?? "Location pending",
    ]),
  );
  const mapped = rows.map((row) => toShiftWithEnrichment(row, staffById, locationById));
  const enrichmentErrors = [
    staffResult.error ? formatReadError("Unable to enrich shift staff", staffResult.error) : null,
    locationResult.error
      ? formatReadError("Unable to enrich shift locations", locationResult.error)
      : null,
  ].filter(Boolean);
  const activeCount = mapped.filter(isVisibleScheduleShift).length;

  return {
    data: mapped,
    error: enrichmentErrors.length > 0 ? enrichmentErrors.join(" / ") : undefined,
    debug: {
      rawCount: rows.length,
      rawIds: rows.map((row) => row.id),
      rawSchedulePeriodIds: rows.map((row) => row.schedule_period_id),
      mappedCount: mapped.length,
      activeCount,
    },
  };
}

export async function getShifts(filters?: ShiftFilters) {
  return (await getShiftsResult(filters)).data;
}

export async function getShiftById(id: string) {
  return (await getShifts()).find((shift) => shift.id === id) ?? null;
}

export async function getStaffSchedule(
  staffMemberId: string,
  startDate: string,
  endDate: string,
) {
  return getShifts({ staffMemberId, startDate, endDate });
}

export async function getTeamSchedule(
  startDate: string,
  endDate: string,
  locationId?: string,
) {
  return getShifts({ startDate, endDate, locationId: locationId ?? "all" });
}

export async function getStaffAvailability(staffMemberId: string) {
  return (await getStaffAvailabilityResult(staffMemberId)).data;
}

export async function getStaffAvailabilityResult(
  staffMemberId: string,
): Promise<AvailabilityReadResult> {
  const client = getSchedulingSupabaseClient();

  if (!USE_SUPABASE || !client) {
    return {
      data: emptyIfUnavailable<StaffAvailability>(),
      error: "Scheduling Supabase client unavailable.",
    };
  }

  const { data, error } = await client
    .from("staff_availability")
    .select(
      "*, staff_member:staff_members(id, employee_number, first_name, last_name, display_name, role, active, employment_status)",
    )
    .eq("staff_member_id", staffMemberId)
    .order("weekday", { ascending: true });

  if (error) {
    return {
      data: [],
      error: formatReadError("Unable to load staff availability", error),
    };
  }

  return { data: ((data ?? []) as AvailabilityRow[]).map(toAvailability) };
}

export async function getTimeOffRequests(filters?: {
  staffMemberId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}) {
  return (await getTimeOffRequestsResult(filters)).data;
}

export async function getTimeOffRequestsResult(filters?: {
  staffMemberId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TimeOffReadResult> {
  const client = getSchedulingSupabaseClient();

  if (!USE_SUPABASE || !client) {
    return {
      data: emptyIfUnavailable<StaffTimeOffRequest>(),
      error: "Scheduling Supabase client unavailable.",
    };
  }

  let query = client
    .from("staff_time_off_requests")
    .select(
      "*, staff_member:staff_members!staff_time_off_requests_staff_member_id_fkey(id, employee_number, first_name, last_name, display_name, role, active, employment_status), reviewer:staff_members!staff_time_off_requests_reviewed_by_staff_id_fkey(id, employee_number, first_name, last_name, display_name, role, active, employment_status)",
    )
    .order("created_at", { ascending: false });

  if (filters?.staffMemberId) query = query.eq("staff_member_id", filters.staffMemberId);
  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.startDate) query = query.gte("end_date", filters.startDate);
  if (filters?.endDate) query = query.lte("start_date", filters.endDate);

  const { data, error } = await query;

  if (error) {
    return {
      data: [],
      error: formatReadError("Unable to load time-off requests", error),
    };
  }

  return { data: ((data ?? []) as TimeOffRow[]).map(toTimeOff) };
}

export async function getScheduleEvents(schedulePeriodId: string) {
  const client = getSchedulingSupabaseClient();

  if (!USE_SUPABASE || !client) {
    return emptyIfUnavailable<StaffScheduleEvent>();
  }

  const { data, error } = await client
    .from("staff_schedule_events")
    .select("*")
    .eq("schedule_period_id", schedulePeriodId)
    .order("created_at", { ascending: false });

  return error || !data ? [] : (data as StaffScheduleEvent[]);
}

export async function detectShiftConflicts(input: CreateShiftInput) {
  const conflicts: ShiftConflict[] = [];
  const [existingShifts, availability, timeOffRequests] = await Promise.all([
    getStaffSchedule(input.staff_member_id, input.shift_date, input.shift_date),
    getStaffAvailability(input.staff_member_id),
    getTimeOffRequests({
      staffMemberId: input.staff_member_id,
      status: "approved",
      startDate: input.shift_date,
      endDate: input.shift_date,
    }),
  ]);

  const activeOverlap = existingShifts.some(
    (shift) =>
      conflictBlockingShiftStatuses.has(shift.status) &&
      normalizeTimeInputValue(input.start_time) < shift.end_time &&
      normalizeTimeInputValue(input.end_time) > shift.start_time,
  );

  if (activeOverlap) {
    conflicts.push({
      type: "overlap",
      message: "This employee already has an overlapping active shift.",
      blocking: true,
    });
  }

  if (timeOffRequests.length > 0) {
    conflicts.push({
      type: "approved_time_off",
      message: "Approved time off blocks this shift.",
      blocking: true,
    });
  }

  const weekday = new Date(`${input.shift_date}T00:00:00`).getDay();
  const matchingAvailability = availability.filter(
    (item) =>
      item.weekday === weekday &&
      (!item.effective_from || item.effective_from <= input.shift_date) &&
      (!item.effective_until || item.effective_until >= input.shift_date),
  );
  const availableWindow = matchingAvailability.find(
    (item) =>
      item.available &&
      (!item.start_time || normalizeTimeInputValue(input.start_time) >= item.start_time) &&
      (!item.end_time || normalizeTimeInputValue(input.end_time) <= item.end_time),
  );

  if (matchingAvailability.length > 0 && !availableWindow) {
    conflicts.push({
      type: "outside_availability",
      message: "Shift is outside the employee availability window.",
      blocking: !input.allowAvailabilityOverride,
    });
  }

  const startMinutes = timeInputValueToMinutes(input.start_time);
  const endMinutes = timeInputValueToMinutes(input.end_time);
  const hours =
    startMinutes === null || endMinutes === null
      ? 0
      : (endMinutes - startMinutes) / 60;

  if (hours > 12) {
    conflicts.push({
      type: "excessive_length",
      message: "Shift exceeds 12 hours. Review before saving.",
      blocking: false,
    });
  }

  return conflicts;
}

export async function getCoverageSummary(
  startDate: string,
  endDate: string,
  locationId?: string,
) {
  const shifts = await getTeamSchedule(startDate, endDate, locationId);
  const byDate = new Map<string, StaffShift[]>();

  for (const shift of shifts.filter(isVisibleScheduleShift)) {
    byDate.set(shift.shift_date, [...(byDate.get(shift.shift_date) ?? []), shift]);
  }

  const summaries: ScheduleCoverageSummary[] = [];
  const cursor = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  while (cursor <= end) {
    const date = cursor.toISOString().slice(0, 10);
    const dayShifts = byDate.get(date) ?? [];

    summaries.push({
      date,
      scheduledEmployees: new Set(dayShifts.map((shift) => shift.staff_member_id)).size,
      activeShiftCount: dayShifts.length,
      uncovered: dayShifts.length === 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return summaries;
}

export async function getSchedulingMetrics(): Promise<ScheduleMetrics> {
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 6);
  const endDate = weekEnd.toISOString().slice(0, 10);
  const [periods, shifts, timeOff, coverage] = await Promise.all([
    getSchedulePeriods(),
    getTeamSchedule(today, endDate),
    getTimeOffRequests({ status: "pending" }),
    getCoverageSummary(today, endDate),
  ]);
  const current = periods.find(
    (period) =>
      period.start_date <= today &&
      period.end_date >= today &&
      period.status === "published",
  );

  return {
    currentSchedule: current?.name ?? "None",
    draftSchedules: periods.filter((period) => period.status === "draft").length,
    publishedSchedules: periods.filter((period) => period.status === "published").length,
    openShifts: shifts.filter(isVisibleScheduleShift).length,
    pendingTimeOffRequests: timeOff.length,
    employeesScheduledThisWeek: new Set(shifts.map((shift) => shift.staff_member_id)).size,
    uncoveredDays: coverage.filter((day) => day.uncovered).length,
  };
}
