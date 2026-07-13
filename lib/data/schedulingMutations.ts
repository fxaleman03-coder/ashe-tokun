"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  detectShiftConflicts,
  getSchedulePeriodById,
  getShiftById,
  getShifts,
} from "@/lib/data/schedulingRepository";
import {
  getStaffAssignedPermissions,
  requirePermission,
} from "@/lib/staff/permissionGuard";
import { getEffectivePermissions, hasPermission } from "@/lib/staff/permissionHelpers";
import { getAuthenticatedStaffReadOnlyResult } from "@/lib/staff/staffAuthService";
import {
  isCanonicalTimeInputValue,
  normalizeTimeInputValue,
  timeInputValueToMinutes,
} from "@/lib/utils/schedulingTime";
import type {
  AvailabilityInput,
  CreateScheduleInput,
  CreateShiftInput,
  SchedulingMutationResult,
  StaffSchedulePeriod,
  StaffShift,
  StaffTimeOffRequest,
  TimeOffRequestInput,
  UpdateScheduleInput,
  UpdateShiftInput,
} from "@/lib/types/scheduling";
import type { PermissionKey } from "@/lib/staff/permissionTypes";

function unavailableResult<T = unknown>(
  error = "Scheduling requires Supabase configuration.",
): SchedulingMutationResult<T> {
  return { ok: false, success: false, error } satisfies SchedulingMutationResult;
}

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function formatSupabaseError(context: string, error: SupabaseErrorLike) {
  const details = [
    error.code ? `Code: ${error.code}` : null,
    error.message ? `Message: ${error.message}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
  ].filter(Boolean);

  return details.length > 0 ? `${context}: ${details.join(" / ")}` : context;
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

async function writeScheduleEvent(input: {
  schedulePeriodId?: string | null;
  shiftId?: string | null;
  staffMemberId?: string | null;
  actorStaffId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return;

  await supabase.from("staff_schedule_events").insert({
    schedule_period_id: input.schedulePeriodId ?? null,
    shift_id: input.shiftId ?? null,
    staff_member_id: input.staffMemberId ?? null,
    actor_staff_id: input.actorStaffId ?? null,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  });
}

function dateRangeValid(startDate: string, endDate: string) {
  return Boolean(startDate && endDate && endDate >= startDate);
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toDatabaseTime(value: string) {
  const normalized = normalizeTimeInputValue(value);

  return normalized ? `${normalized}:00` : "";
}

type TimeRangeValidation =
  | { ok: true; start: string; end: string }
  | { ok: false; error: string };

function validateTimeRange(startTime: string, endTime: string): TimeRangeValidation {
  const start = normalizeTimeInputValue(startTime);
  const end = normalizeTimeInputValue(endTime);
  const startMinutes = timeInputValueToMinutes(start);
  const endMinutes = timeInputValueToMinutes(end);

  if (!start || !end) return { ok: false, error: "Start time and end time are required." };
  if (!isCanonicalTimeInputValue(start) || !isCanonicalTimeInputValue(end)) {
    return { ok: false, error: "Times must use HH:mm format." };
  }
  if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
    return { ok: false, error: "End time must be after start time." };
  }

  return { ok: true, start, end };
}

async function ensureActiveStaff(staffMemberId: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return false;

  const { data, error } = await supabase
    .from("staff_members")
    .select("id, active, employment_status")
    .eq("id", staffMemberId)
    .maybeSingle();

  return !error && data?.active === true && data.employment_status === "active";
}

async function getSchedulingActor(required: PermissionKey | PermissionKey[]) {
  const result = await getAuthenticatedStaffReadOnlyResult();

  if (!result.ok) {
    return {
      ok: false as const,
      error:
        result.reason === "missing"
          ? "Access denied: staff login is required."
          : "Access denied: staff session is expired.",
    };
  }

  if (result.staff.mustChangePin) {
    return { ok: false as const, error: "Access denied: change your PIN before scheduling." };
  }

  const assignments = await getStaffAssignedPermissions(result.staff.staffId);
  const permissions = getEffectivePermissions(result.staff.role, assignments);

  if (!hasPermission(permissions, required)) {
    return { ok: false as const, error: "Access denied: missing scheduling permission." };
  }

  return { ok: true as const, staff: result.staff, permissions };
}

async function getSchedulePeriodForMutation(id: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return { data: null, error: null };

  return supabase
    .from("staff_schedule_periods")
    .select("id, name, start_date, end_date, status, location_id")
    .eq("id", id)
    .maybeSingle();
}

async function getActiveShiftCountForPeriod(id: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return { count: 0, error: null };

  const { count, error } = await supabase
    .from("staff_shifts")
    .select("id", { count: "exact", head: true })
    .eq("schedule_period_id", id)
    .in("status", ["scheduled", "confirmed"]);

  return { count: count ?? 0, error };
}

export async function createSchedulePeriod(
  input: CreateScheduleInput,
): Promise<SchedulingMutationResult<StaffSchedulePeriod>> {
  const { staff } = await requirePermission("schedule.create");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();
  if (!normalizeText(input.name) || !dateRangeValid(input.start_date, input.end_date)) {
    return { ok: false, error: "Schedule name and valid dates are required." };
  }

  const { data, error } = await supabase
    .from("staff_schedule_periods")
    .insert({
      name: normalizeText(input.name),
      start_date: input.start_date,
      end_date: input.end_date,
      location_id: input.location_id || null,
      notes: normalizeText(input.notes),
      status: "draft",
      created_by_staff_id: staff.staffId,
      updated_by_staff_id: staff.staffId,
    })
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Schedule could not be created." };

  await writeScheduleEvent({
    schedulePeriodId: data.id,
    actorStaffId: staff.staffId,
    eventType: "schedule_created",
    metadata: { name: data.name },
  });
  revalidatePath("/admin/scheduling");

  return { ok: true, data: data as StaffSchedulePeriod };
}

export async function updateSchedulePeriod(
  id: string,
  updates: UpdateScheduleInput,
): Promise<SchedulingMutationResult<StaffSchedulePeriod>> {
  const { staff } = await requirePermission("schedule.edit");
  const supabase = createSupabaseServiceClient();
  const period = await getSchedulePeriodById(id);

  if (!supabase) return unavailableResult();
  if (!period) return { ok: false, error: "Schedule not found." };
  if (period.status === "archived") return { ok: false, error: "Archived schedules are read-only." };
  if (updates.start_date && updates.end_date && !dateRangeValid(updates.start_date, updates.end_date)) {
    return { ok: false, error: "Schedule end date must be after start date." };
  }

  const { data, error } = await supabase
    .from("staff_schedule_periods")
    .update({
      name: updates.name ? normalizeText(updates.name) : undefined,
      start_date: updates.start_date,
      end_date: updates.end_date,
      location_id: updates.location_id,
      notes: updates.notes === undefined ? undefined : normalizeText(updates.notes),
      updated_by_staff_id: staff.staffId,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Schedule could not be updated." };

  await writeScheduleEvent({
    schedulePeriodId: id,
    actorStaffId: staff.staffId,
    eventType: "schedule_updated",
    metadata: updates,
  });
  revalidatePath("/admin/scheduling");
  revalidatePath(`/admin/scheduling/${id}`);

  return { ok: true, data: data as StaffSchedulePeriod };
}

export async function publishSchedulePeriod(id: string) {
  const actor = await getSchedulingActor("schedule.publish");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();
  if (!actor.ok) return { ok: false, success: false, error: actor.error };

  const { count, error: countError } = await getActiveShiftCountForPeriod(id);
  if (countError) {
    return {
      ok: false,
      success: false,
      error: formatSupabaseError("Unable to verify schedule shifts", countError),
    };
  }
  if (count === 0) {
    return {
      ok: false,
      success: false,
      error: "Add at least one shift before publishing.",
      fieldErrors: { shifts: "Add at least one active shift before publishing." },
    };
  }

  const { data, error } = await supabase
    .from("staff_schedule_periods")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      published_by_staff_id: actor.staff.staffId,
      updated_by_staff_id: actor.staff.staffId,
    })
    .eq("id", id)
    .neq("status", "archived")
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      success: false,
      error: error
        ? formatSupabaseError("Schedule could not be published", error)
        : "Schedule could not be published: no row was returned.",
    };
  }

  await writeScheduleEvent({
    schedulePeriodId: id,
    actorStaffId: actor.staff.staffId,
    eventType: "schedule_published",
  });
  revalidatePath("/admin/scheduling");
  revalidatePath(`/admin/scheduling/${id}`);

  return { ok: true, success: true, data };
}

export async function archiveSchedulePeriod(id: string) {
  const { staff } = await requirePermission("schedule.archive");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();

  const { data, error } = await supabase
    .from("staff_schedule_periods")
    .update({ status: "archived", updated_by_staff_id: staff.staffId })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Schedule could not be archived." };

  await writeScheduleEvent({
    schedulePeriodId: id,
    actorStaffId: staff.staffId,
    eventType: "schedule_archived",
  });
  revalidatePath("/admin/scheduling");
  revalidatePath(`/admin/scheduling/${id}`);

  return { ok: true, data };
}

export async function createShift(
  input: CreateShiftInput,
): Promise<SchedulingMutationResult<StaffShift>> {
  const actor = await getSchedulingActor("schedule.edit");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();
  if (!actor.ok) return { ok: false, success: false, error: actor.error };

  const fieldErrors: Record<string, string> = {};
  if (!input.schedule_period_id) {
    fieldErrors.schedule_period_id = "Unable to add shift: schedule period is missing.";
  }
  if (!input.staff_member_id) fieldErrors.staff_member_id = "Employee is required.";
  if (!input.shift_date || !isIsoDate(input.shift_date)) {
    fieldErrors.shift_date = "Shift date must use YYYY-MM-DD format.";
  }
  if (!input.start_time) fieldErrors.start_time = "Start time is required.";
  if (!input.end_time) fieldErrors.end_time = "End time is required.";
  if ((input.unpaid_break_minutes ?? 0) < 0) {
    fieldErrors.unpaid_break_minutes = "Break minutes cannot be negative.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      success: false,
      error: "Shift has missing or invalid fields.",
      fieldErrors,
    };
  }

  const { data: period, error: periodError } = await getSchedulePeriodForMutation(
    input.schedule_period_id,
  );
  if (periodError) {
    return {
      ok: false,
      success: false,
      error: formatSupabaseError("Unable to verify schedule period", periodError),
    };
  }
  if (!period) {
    return {
      ok: false,
      success: false,
      error: "Schedule not found.",
      fieldErrors: { schedule_period_id: "Unable to add shift: schedule period is missing." },
    };
  }
  if (period.status === "archived") return { ok: false, error: "Archived schedules are read-only." };
  if (!(await ensureActiveStaff(input.staff_member_id))) {
    return {
      ok: false,
      success: false,
      error: "Inactive or archived staff cannot receive new shifts.",
      fieldErrors: { staff_member_id: "Choose an active employee." },
    };
  }

  const timeRange = validateTimeRange(input.start_time, input.end_time);
  if (!timeRange.ok) {
    return {
      ok: false,
      success: false,
      error: timeRange.error,
      fieldErrors: {
        start_time: timeRange.error,
        end_time: timeRange.error,
      },
    };
  }

  const normalizedInput = {
    ...input,
    start_time: timeRange.start,
    end_time: timeRange.end,
  };
  const conflicts = await detectShiftConflicts(normalizedInput);
  const blockingConflicts = conflicts.filter(
    (conflict) =>
      conflict.blocking &&
      (conflict.type !== "outside_availability" ||
        !actor.permissions.includes("schedule.override_conflicts")),
  );

  if (blockingConflicts.length > 0) {
    return { ok: false, success: false, error: "Shift has blocking conflicts.", conflicts };
  }

  const payload = {
    schedule_period_id: input.schedule_period_id,
    staff_member_id: input.staff_member_id,
    location_id: input.location_id || period.location_id,
    shift_date: input.shift_date,
    start_time: toDatabaseTime(normalizedInput.start_time),
    end_time: toDatabaseTime(normalizedInput.end_time),
    unpaid_break_minutes: input.unpaid_break_minutes ?? 0,
    role_label: normalizeText(input.role_label),
    department_label: normalizeText(input.department_label),
    notes: normalizeText(input.notes),
    status: "scheduled",
    created_by_staff_id: actor.staff.staffId,
    updated_by_staff_id: actor.staff.staffId,
  };

  const { data, error } = await supabase
    .from("staff_shifts")
    .insert(payload)
    .select(
      "id, schedule_period_id, staff_member_id, location_id, shift_date, start_time, end_time, unpaid_break_minutes, status, role_label, department_label, notes, created_by_staff_id, updated_by_staff_id, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    return {
      ok: false,
      success: false,
      error: error
        ? formatSupabaseError("Shift could not be created", error)
        : "Shift could not be created: no row was returned.",
      conflicts,
    };
  }

  await writeScheduleEvent({
    schedulePeriodId: input.schedule_period_id,
    shiftId: data.id,
    staffMemberId: input.staff_member_id,
    actorStaffId: actor.staff.staffId,
    eventType: "shift_created",
    metadata: { conflicts },
  });
  revalidatePath("/admin/scheduling");
  revalidatePath(`/admin/scheduling/${input.schedule_period_id}`);

  return {
    ok: true,
    success: true,
    data: data as StaffShift,
    warning: conflicts.find((conflict) => !conflict.blocking)?.message,
  };
}

export async function updateShift(id: string, updates: UpdateShiftInput) {
  const { staff } = await requirePermission("schedule.edit");
  const supabase = createSupabaseServiceClient();
  const shift = await getShiftById(id);

  if (!supabase) return unavailableResult();
  if (!shift) return { ok: false, error: "Shift not found." };

  const period = await getSchedulePeriodById(shift.schedule_period_id);
  if (period?.status === "archived") return { ok: false, error: "Archived schedules are read-only." };

  const startTime = updates.start_time === undefined ? undefined : normalizeTimeInputValue(updates.start_time);
  const endTime = updates.end_time === undefined ? undefined : normalizeTimeInputValue(updates.end_time);
  if (startTime !== undefined || endTime !== undefined) {
    const timeRange = validateTimeRange(
      startTime ?? shift.start_time,
      endTime ?? shift.end_time,
    );
    if (!timeRange.ok) return { ok: false, error: timeRange.error };
  }

  const { data, error } = await supabase
    .from("staff_shifts")
    .update({
      staff_member_id: updates.staff_member_id,
      location_id: updates.location_id,
      shift_date: updates.shift_date,
      start_time: startTime,
      end_time: endTime,
      unpaid_break_minutes: updates.unpaid_break_minutes,
      role_label: updates.role_label === undefined ? undefined : normalizeText(updates.role_label),
      department_label:
        updates.department_label === undefined
          ? undefined
          : normalizeText(updates.department_label),
      notes: updates.notes === undefined ? undefined : normalizeText(updates.notes),
      status: updates.status,
      updated_by_staff_id: staff.staffId,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Shift could not be updated." };

  await writeScheduleEvent({
    schedulePeriodId: shift.schedule_period_id,
    shiftId: id,
    staffMemberId: data.staff_member_id,
    actorStaffId: staff.staffId,
    eventType: "shift_updated",
    metadata: updates,
  });
  revalidatePath(`/admin/scheduling/${shift.schedule_period_id}`);

  return { ok: true, data };
}

export async function cancelShift(id: string, reason: string) {
  const result = await updateShift(id, { status: "cancelled", notes: reason });

  if (result.ok) {
    await writeScheduleEvent({
      schedulePeriodId: result.data.schedule_period_id,
      shiftId: id,
      staffMemberId: result.data.staff_member_id,
      eventType: "shift_cancelled",
      metadata: { reason },
    });
  }

  return result;
}

export async function reassignShift(id: string, newStaffMemberId: string) {
  const result = await updateShift(id, { staff_member_id: newStaffMemberId });

  if (result.ok) {
    await writeScheduleEvent({
      schedulePeriodId: result.data.schedule_period_id,
      shiftId: id,
      staffMemberId: newStaffMemberId,
      eventType: "shift_reassigned",
    });
  }

  return result;
}

export async function setStaffAvailability(
  staffMemberId: string,
  availability: AvailabilityInput[],
) {
  const { staff, permissions } = await requirePermission("schedule.manage_availability");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();
  if (
    staff.staffId !== staffMemberId &&
    !permissions.includes("schedule.view_all") &&
    !permissions.includes("schedule.view_team")
  ) {
    return { ok: false, error: "You cannot edit another employee’s availability." };
  }

  await supabase.from("staff_availability").delete().eq("staff_member_id", staffMemberId);

  const rows = availability.map((item) => ({
    staff_member_id: staffMemberId,
    weekday: item.weekday,
    available: item.available,
    start_time: item.start_time ? normalizeTimeInputValue(item.start_time) : null,
    end_time: item.end_time ? normalizeTimeInputValue(item.end_time) : null,
    notes: normalizeText(item.notes),
    effective_from: item.effective_from || null,
    effective_until: item.effective_until || null,
  }));

  const { error } =
    rows.length > 0
      ? await supabase.from("staff_availability").insert(rows)
      : { error: null };

  if (error) return { ok: false, error: error.message };

  await writeScheduleEvent({
    staffMemberId,
    actorStaffId: staff.staffId,
    eventType: "availability_updated",
    metadata: { rows: rows.length },
  });
  revalidatePath("/admin/scheduling/availability");
  revalidatePath("/staff/availability");

  return { ok: true, data: rows };
}

export async function submitTimeOffRequest(
  input: TimeOffRequestInput,
): Promise<SchedulingMutationResult<StaffTimeOffRequest>> {
  const { staff, permissions } = await requirePermission("schedule.manage_time_off");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();
  if (
    input.staff_member_id !== staff.staffId &&
    !permissions.includes("schedule.approve_time_off")
  ) {
    return { ok: false, error: "You cannot submit time off for another employee." };
  }

  const fieldErrors: Record<string, string> = {};
  if (!input.start_date || !isIsoDate(input.start_date)) {
    fieldErrors.start_date = "Start date must use YYYY-MM-DD format.";
  }
  if (!input.end_date || !isIsoDate(input.end_date)) {
    fieldErrors.end_date = "End date must use YYYY-MM-DD format.";
  }
  if (input.start_date && input.end_date && !dateRangeValid(input.start_date, input.end_date)) {
    fieldErrors.end_date = "Time-off end date must be after start date.";
  }

  const partialDay = input.partial_day ?? false;
  let startTime: string | null = null;
  let endTime: string | null = null;

  if (partialDay) {
    if (input.start_date !== input.end_date) {
      fieldErrors.end_date = "Partial-day requests must start and end on the same date.";
    }

    startTime = normalizeTimeInputValue(input.start_time);
    endTime = normalizeTimeInputValue(input.end_time);

    if (!startTime) fieldErrors.start_time = "Start time is required for partial-day requests.";
    if (!endTime) fieldErrors.end_time = "End time is required for partial-day requests.";

    const startMinutes = timeInputValueToMinutes(startTime);
    const endMinutes = timeInputValueToMinutes(endTime);
    if (
      startTime &&
      endTime &&
      (startMinutes === null || endMinutes === null || endMinutes <= startMinutes)
    ) {
      fieldErrors.end_time = "End time must be after start time.";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      success: false,
      error: "Time-off request has missing or invalid fields.",
      fieldErrors,
    };
  }

  const payload = {
    staff_member_id: input.staff_member_id,
    request_type: input.request_type,
    start_date: input.start_date,
    end_date: input.end_date,
    partial_day: partialDay,
    start_time: partialDay && startTime ? toDatabaseTime(startTime) : null,
    end_time: partialDay && endTime ? toDatabaseTime(endTime) : null,
    reason: normalizeText(input.reason),
    status: "pending",
  };

  const { data, error } = await supabase
    .from("staff_time_off_requests")
    .insert(payload)
    .select(
      "id, staff_member_id, request_type, start_date, end_date, partial_day, start_time, end_time, reason, status, created_at, updated_at, reviewed_by_staff_id, reviewed_at, review_notes",
    )
    .single();

  if (error || !data) {
    return {
      ok: false,
      success: false,
      error: error
        ? formatSupabaseError("Time-off request could not be submitted", error)
        : "Time-off request could not be submitted: no row was returned.",
    };
  }

  await writeScheduleEvent({
    staffMemberId: input.staff_member_id,
    eventType: "time_off_requested",
    metadata: { request_type: input.request_type },
  });
  revalidatePath("/staff/time-off");
  revalidatePath("/admin/scheduling/time-off");

  return { ok: true, data: data as StaffTimeOffRequest };
}

export async function approveTimeOffRequest(id: string, notes?: string) {
  const { staff } = await requirePermission("schedule.approve_time_off");
  return reviewTimeOffRequest(id, "approved", staff.staffId, notes);
}

export async function denyTimeOffRequest(id: string, notes?: string) {
  const { staff } = await requirePermission("schedule.approve_time_off");
  return reviewTimeOffRequest(id, "denied", staff.staffId, notes);
}

async function reviewTimeOffRequest(
  id: string,
  status: "approved" | "denied",
  reviewerId: string,
  notes?: string,
) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();

  const { data, error } = await supabase
    .from("staff_time_off_requests")
    .update({
      status,
      reviewed_by_staff_id: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: normalizeText(notes),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Request could not be reviewed." };

  await writeScheduleEvent({
    staffMemberId: data.staff_member_id,
    actorStaffId: reviewerId,
    eventType: status === "approved" ? "time_off_approved" : "time_off_denied",
    metadata: { request_id: id, notes: normalizeText(notes) },
  });
  revalidatePath("/admin/scheduling/time-off");
  revalidatePath("/staff/time-off");

  return { ok: true, data };
}

export async function cancelTimeOffRequest(id: string) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();

  const { data, error } = await supabase
    .from("staff_time_off_requests")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Request could not be cancelled." };

  revalidatePath("/staff/time-off");
  return { ok: true, data };
}

export async function copyPreviousWeekSchedule(sourcePeriodId: string, targetStartDate: string) {
  return duplicateSchedulePeriod(sourcePeriodId, {
    start_date: targetStartDate,
    end_date: new Date(
      new Date(`${targetStartDate}T00:00:00`).getTime() + 6 * 86400000,
    )
      .toISOString()
      .slice(0, 10),
  });
}

export async function duplicateSchedulePeriod(
  sourcePeriodId: string,
  newDates: { start_date: string; end_date: string },
) {
  const source = await getSchedulePeriodById(sourcePeriodId);

  if (!source) return { ok: false, error: "Source schedule not found." };

  const created = await createSchedulePeriod({
    name: `${source.name} Copy`,
    start_date: newDates.start_date,
    end_date: newDates.end_date,
    location_id: source.location_id,
    notes: source.notes,
  });

  if (!created.ok) return created;

  const sourceShifts = (await getShifts({ schedulePeriodId: sourcePeriodId })).filter(
    (shift) => shift.status !== "cancelled",
  );
  const sourceStart = new Date(`${source.start_date}T00:00:00`).getTime();
  const targetStart = new Date(`${newDates.start_date}T00:00:00`).getTime();
  const dayOffset = Math.round((targetStart - sourceStart) / 86400000);
  let copied = 0;
  const warnings: string[] = [];

  for (const shift of sourceShifts) {
    const newShiftDate = new Date(`${shift.shift_date}T00:00:00`);
    newShiftDate.setDate(newShiftDate.getDate() + dayOffset);
    const result = await createShift({
      schedule_period_id: created.data.id,
      staff_member_id: shift.staff_member_id,
      location_id: shift.location_id,
      shift_date: newShiftDate.toISOString().slice(0, 10),
      start_time: shift.start_time,
      end_time: shift.end_time,
      unpaid_break_minutes: shift.unpaid_break_minutes,
      role_label: shift.role_label,
      department_label: shift.department_label,
      notes: shift.notes,
    });

    if (result.ok) {
      copied += 1;
    } else {
      warnings.push(`${shift.staff_member_id}: ${result.error}`);
    }
  }

  return {
    ...created,
    warning:
      warnings.length > 0
        ? `${copied} shifts copied. ${warnings.length} shifts need review.`
        : `${copied} shifts copied.`,
  };
}
