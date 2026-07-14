"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requirePermission } from "@/lib/staff/permissionGuard";
import { getAuthenticatedStaffReadOnlyResult } from "@/lib/staff/staffAuthService";
import { timekeeperConfig } from "@/lib/config/timekeeper";
import {
  getExceptionsForTimecard,
  getPublishedShiftForStaffDate,
  getPunchesForTimecard,
  getTimecardById,
  normalizeStaffPunch,
} from "@/lib/data/timekeeperRepository";
import { calculateTimecard } from "@/lib/timekeeper/timecardCalculator";
import {
  detectAttendanceExceptions,
  validatePunchSequence,
} from "@/lib/timekeeper/timekeeperHelpers";
import { getBusinessTodayDate } from "@/lib/utils/dateTimeDisplay";
import type { PermissionKey } from "@/lib/staff/permissionTypes";
import type {
  ManualPunchInput,
  PunchInput,
  PunchType,
  StaffPunch,
  StaffTimecard,
  StaffTimecardException,
  TimecardExceptionType,
  TimecardApprovalInput,
  TimecardReviewInput,
  TimekeeperMutationResult,
} from "@/lib/types/timekeeper";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function unavailableResult(error = "Timekeeper requires Supabase configuration.") {
  return { ok: false, error } satisfies TimekeeperMutationResult;
}

function formatSupabaseError(context: string, error: SupabaseErrorLike) {
  const parts = [
    error.code ? `Code: ${error.code}` : null,
    error.message ? `Message: ${error.message}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
  ].filter(Boolean);

  return parts.length > 0 ? `${context}: ${parts.join(" / ")}` : context;
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

function toDatabaseTime(value: string | null | undefined) {
  if (!value) return null;

  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function getRequestMetadata() {
  const headerStore = await headers();

  return {
    ipAddress:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headerStore.get("x-real-ip"),
    userAgent: headerStore.get("user-agent"),
  };
}

async function writeTimekeeperEvent(input: {
  timecardId?: string | null;
  punchId?: string | null;
  staffMemberId?: string | null;
  actorStaffId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return;

  await supabase.from("staff_timekeeper_events").insert({
    timecard_id: input.timecardId ?? null,
    punch_id: input.punchId ?? null,
    staff_member_id: input.staffMemberId ?? null,
    actor_staff_id: input.actorStaffId ?? null,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  });
}

async function writeAuditLog(input: {
  actorStaffId?: string | null;
  action: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return;

  await supabase.from("audit_logs").insert({
    staff_user_id: input.actorStaffId ?? null,
    action: input.action,
    entity_type: "timekeeper",
    entity_id: input.entityId ?? null,
    details: input.details ?? {},
  });
}

async function getTimekeeperActor(required: PermissionKey | PermissionKey[]) {
  const { staff } = await requirePermission(required);

  return staff;
}

async function getSelfClockActor() {
  const result = await getAuthenticatedStaffReadOnlyResult();

  if (!result.ok) {
    return { ok: false as const, error: "Access denied: staff login is required." };
  }

  if (result.staff.mustChangePin) {
    return { ok: false as const, error: "Access denied: change your PIN before clocking in." };
  }

  await requirePermission("timekeeper.clock_self");

  return { ok: true as const, staff: result.staff };
}

async function ensureTimecard(input: {
  staffMemberId: string;
  workDate: string;
  shiftId?: string | null;
  locationId?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  scheduledBreakMinutes?: number;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return { data: null, error: null };

  const { data: existing, error: existingError } = await supabase
    .from("staff_timecards")
    .select("*")
    .eq("staff_member_id", input.staffMemberId)
    .eq("work_date", input.workDate)
    .maybeSingle();

  if (existingError) return { data: null, error: existingError };
  if (existing) return { data: existing as StaffTimecard, error: null };

  return supabase
    .from("staff_timecards")
    .insert({
      staff_member_id: input.staffMemberId,
      work_date: input.workDate,
      shift_id: input.shiftId ?? null,
      location_id: input.locationId ?? null,
      scheduled_start_time: toDatabaseTime(input.scheduledStartTime),
      scheduled_end_time: toDatabaseTime(input.scheduledEndTime),
      scheduled_break_minutes: input.scheduledBreakMinutes ?? 0,
      status: "open",
    })
    .select("*")
    .single();
}

async function ensureOpenException(input: {
  timecardId: string;
  staffMemberId: string;
  exceptionType: StaffTimecardException["exception_type"];
  severity: StaffTimecardException["severity"];
  description: string;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return;

  const { data } = await supabase
    .from("staff_timecard_exceptions")
    .select("id")
    .eq("timecard_id", input.timecardId)
    .eq("exception_type", input.exceptionType)
    .eq("status", "open")
    .limit(1);

  if (data && data.length > 0) return;

  await supabase.from("staff_timecard_exceptions").insert({
    timecard_id: input.timecardId,
    staff_member_id: input.staffMemberId,
    exception_type: input.exceptionType,
    severity: input.severity,
    status: "open",
    description: input.description,
    metadata: {},
  });
}

async function reconcileStaleOpenExceptions(input: {
  timecardId: string;
  validExceptionTypes: Set<TimecardExceptionType>;
  actorStaffId?: string | null;
}) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return;

  const { data } = await supabase
    .from("staff_timecard_exceptions")
    .select("id, exception_type")
    .eq("timecard_id", input.timecardId)
    .eq("status", "open");

  const staleExceptions = (data ?? []).filter(
    (exception) =>
      !input.validExceptionTypes.has(exception.exception_type as TimecardExceptionType),
  );

  for (const exception of staleExceptions) {
    await supabase
      .from("staff_timecard_exceptions")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolved_by_staff_id: input.actorStaffId ?? null,
        resolution_notes:
          "System reconciliation: the current punch sequence no longer supports this exception.",
      })
      .eq("id", exception.id);
  }
}

async function recalculateTimecard(timecardId: string, actorStaffId?: string | null) {
  const supabase = createSupabaseServiceClient();

  if (!supabase) return;

  const timecard = await getTimecardById(timecardId);
  if (!timecard) return;

  const punches = await getPunchesForTimecard(timecardId);
  const calculation = calculateTimecard({
    punches,
    shift: timecard.shift,
  });
  const detected = detectAttendanceExceptions({
    shift: timecard.shift,
    punches,
  });
  const detectedTypes = new Set(detected.map((exception) => exception.type));

  await reconcileStaleOpenExceptions({
    timecardId,
    validExceptionTypes: detectedTypes,
    actorStaffId,
  });

  for (const exception of detected) {
    await ensureOpenException({
      timecardId,
      staffMemberId: timecard.staff_member_id,
      exceptionType: exception.type,
      severity: exception.severity,
      description: exception.description,
    });
  }

  const exceptions = await getExceptionsForTimecard(timecardId);
  const openExceptionCount = exceptions.filter((exception) => exception.status === "open").length;

  await supabase
    .from("staff_timecards")
    .update({
      regular_minutes: calculation.regularMinutes,
      overtime_minutes: calculation.overtimeMinutes,
      unpaid_break_minutes: calculation.unpaidBreakMinutes,
      exception_count: openExceptionCount,
      status: timecard.status === "approved" ? "approved" : calculation.status,
    })
    .eq("id", timecardId);
}

function revalidateTimekeeperPaths(timecardId?: string | null) {
  revalidatePath("/staff/timekeeper");
  revalidatePath("/staff/timekeeper/history");
  revalidatePath("/admin/timekeeper");
  if (timecardId) revalidatePath(`/admin/timekeeper/${timecardId}`);
}

async function recordPunch(
  punchType: PunchType,
  input: PunchInput = {},
): Promise<TimekeeperMutationResult<StaffPunch>> {
  const actor = await getSelfClockActor();
  const supabase = createSupabaseServiceClient();

  if (!actor.ok) return { ok: false, error: actor.error };
  if (!supabase) return unavailableResult();

  const workDate = getBusinessTodayDate();
  const shift = await getPublishedShiftForStaffDate(actor.staff.staffId, workDate);

  if (timekeeperConfig.requirePublishedShift && !shift) {
    return { ok: false, error: "Unable to record punch: no published shift for today." };
  }

  const timecardResult = await ensureTimecard({
    staffMemberId: actor.staff.staffId,
    workDate,
    shiftId: shift?.id ?? null,
    locationId: shift?.location_id ?? actor.staff.location.id,
    scheduledStartTime: shift?.start_time ?? null,
    scheduledEndTime: shift?.end_time ?? null,
    scheduledBreakMinutes: shift?.unpaid_break_minutes ?? 0,
  });

  if (timecardResult.error || !timecardResult.data) {
    return {
      ok: false,
      error: timecardResult.error
        ? formatSupabaseError("Unable to create timecard", timecardResult.error)
        : "Unable to create timecard.",
    };
  }

  const timecard = timecardResult.data as StaffTimecard;
  const punches = await getPunchesForTimecard(timecard.id);
  const validation = validatePunchSequence(punches, punchType, timecard.status);

  if (!validation.valid) {
    return { ok: false, error: validation.error ?? "Punch sequence is not valid." };
  }

  const metadata = await getRequestMetadata();
  const { data, error } = await supabase
    .from("staff_punches")
    .insert({
      timecard_id: timecard.id,
      staff_member_id: actor.staff.staffId,
      shift_id: timecard.shift_id,
      location_id: timecard.location_id,
      punch_type: punchType,
      source: "staff_portal",
      created_by_staff_id: actor.staff.staffId,
      notes: normalizeText(input.notes),
      ip_address: metadata.ipAddress,
      user_agent: metadata.userAgent,
    })
    .select(
      "id, timecard_id, staff_member_id, shift_id, location_id, punch_type, punched_at, source, created_by_staff_id, corrected_from_punch_id, is_correction, correction_reason, device_name, notes, created_at",
    )
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error ? formatSupabaseError("Unable to record punch", error) : "Unable to record punch.",
    };
  }

  await recalculateTimecard(timecard.id, actor.staff.staffId);
  await writeTimekeeperEvent({
    timecardId: timecard.id,
    punchId: data.id,
    staffMemberId: actor.staff.staffId,
    actorStaffId: actor.staff.staffId,
    eventType: punchType,
  });
  await writeAuditLog({
    actorStaffId: actor.staff.staffId,
    action: "timekeeper_punch_recorded",
    entityId: timecard.id,
    details: { punch_type: punchType },
  });
  revalidateTimekeeperPaths(timecard.id);

  return {
    ok: true,
    data: normalizeStaffPunch(data as Omit<StaffPunch, "punchedAt">),
    message: "Punch recorded successfully.",
  };
}

export async function clockIn(input?: PunchInput) {
  return recordPunch("clock_in", input);
}

export async function startBreak(input?: PunchInput) {
  return recordPunch("break_out", input);
}

export async function endBreak(input?: PunchInput) {
  return recordPunch("break_in", input);
}

export async function clockOut(input?: PunchInput) {
  return recordPunch("clock_out", input);
}

export async function addManualPunch(
  input: ManualPunchInput,
): Promise<TimekeeperMutationResult<StaffPunch>> {
  const actor = await getTimekeeperActor("timekeeper.add_missed_punch");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();
  if (!input.staff_member_id) return { ok: false, error: "Employee is required." };
  if (!isIsoDate(input.work_date)) return { ok: false, error: "Work date must use YYYY-MM-DD." };
  if (!input.punched_at) return { ok: false, error: "Punch time is required." };
  if (!normalizeText(input.reason)) return { ok: false, error: "Correction reason is required." };

  const shift = input.shift_id
    ? null
    : await getPublishedShiftForStaffDate(input.staff_member_id, input.work_date);
  const timecardResult = await ensureTimecard({
    staffMemberId: input.staff_member_id,
    workDate: input.work_date,
    shiftId: input.shift_id ?? shift?.id ?? null,
    locationId: input.location_id ?? shift?.location_id ?? null,
    scheduledStartTime: shift?.start_time ?? null,
    scheduledEndTime: shift?.end_time ?? null,
    scheduledBreakMinutes: shift?.unpaid_break_minutes ?? 0,
  });

  if (timecardResult.error || !timecardResult.data) {
    return {
      ok: false,
      error: timecardResult.error
        ? formatSupabaseError("Unable to prepare timecard", timecardResult.error)
        : "Unable to prepare timecard.",
    };
  }

  const { data, error } = await supabase
    .from("staff_punches")
    .insert({
      timecard_id: timecardResult.data.id,
      staff_member_id: input.staff_member_id,
      shift_id: input.shift_id ?? shift?.id ?? null,
      location_id: input.location_id ?? shift?.location_id ?? null,
      punch_type: input.punch_type,
      punched_at: input.punched_at,
      source: "admin",
      created_by_staff_id: actor.staffId,
      is_correction: true,
      correction_reason: normalizeText(input.reason),
      notes: normalizeText(input.notes),
    })
    .select(
      "id, timecard_id, staff_member_id, shift_id, location_id, punch_type, punched_at, source, created_by_staff_id, corrected_from_punch_id, is_correction, correction_reason, device_name, notes, created_at",
    )
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error ? formatSupabaseError("Unable to add manual punch", error) : "Unable to add manual punch.",
    };
  }

  await recalculateTimecard(timecardResult.data.id, actor.staffId);
  await writeTimekeeperEvent({
    timecardId: timecardResult.data.id,
    punchId: data.id,
    staffMemberId: input.staff_member_id,
    actorStaffId: actor.staffId,
    eventType: "manual_punch_added",
    metadata: { reason: normalizeText(input.reason) },
  });
  await writeAuditLog({
    actorStaffId: actor.staffId,
    action: "timekeeper_manual_punch_added",
    entityId: timecardResult.data.id,
    details: { staff_member_id: input.staff_member_id, reason: normalizeText(input.reason) },
  });
  revalidateTimekeeperPaths(timecardResult.data.id);

  return {
    ok: true,
    data: normalizeStaffPunch(data as Omit<StaffPunch, "punchedAt">),
    message: "Manual punch added.",
  };
}

export async function submitTimecard(
  input: TimecardReviewInput,
): Promise<TimekeeperMutationResult<StaffTimecard>> {
  const actor = await getTimekeeperActor("timekeeper.view_own");
  const supabase = createSupabaseServiceClient();
  const timecard = await getTimecardById(input.timecardId);

  if (!supabase) return unavailableResult();
  if (!timecard) return { ok: false, error: "Timecard not found." };
  if (timecard.staff_member_id !== actor.staffId) {
    return { ok: false, error: "Access denied: this is not your timecard." };
  }

  const { data, error } = await supabase
    .from("staff_timecards")
    .update({
      status: "pending_review",
      submitted_at: new Date().toISOString(),
      submitted_by_staff_id: actor.staffId,
      employee_notes: normalizeText(input.notes),
    })
    .eq("id", input.timecardId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error ? formatSupabaseError("Unable to submit timecard", error) : "Unable to submit timecard.",
    };
  }

  await writeTimekeeperEvent({
    timecardId: input.timecardId,
    staffMemberId: actor.staffId,
    actorStaffId: actor.staffId,
    eventType: "timecard_submitted",
  });
  revalidateTimekeeperPaths(input.timecardId);

  return { ok: true, data: data as StaffTimecard, message: "Timecard submitted for review." };
}

export async function recalculateTimecardForReview(
  timecardId: string,
): Promise<TimekeeperMutationResult<StaffTimecard>> {
  const actor = await getTimekeeperActor("timekeeper.review_timecard");
  const timecard = await getTimecardById(timecardId);

  if (!timecard) return { ok: false, error: "Timecard not found." };

  await recalculateTimecard(timecardId, actor.staffId);

  const updatedTimecard = await getTimecardById(timecardId);

  if (!updatedTimecard) return { ok: false, error: "Timecard recalculation could not be verified." };

  await writeTimekeeperEvent({
    timecardId,
    staffMemberId: updatedTimecard.staff_member_id,
    actorStaffId: actor.staffId,
    eventType: "timecard_recalculated",
    metadata: {
      status_preserved: timecard.status === updatedTimecard.status,
      approved_at_preserved: timecard.approved_at === updatedTimecard.approved_at,
    },
  });
  await writeAuditLog({
    actorStaffId: actor.staffId,
    action: "timekeeper_timecard_recalculated",
    entityId: timecardId,
    details: {
      status: updatedTimecard.status,
      exception_count: updatedTimecard.exception_count,
    },
  });
  revalidateTimekeeperPaths(timecardId);

  return { ok: true, data: updatedTimecard, message: "Timecard recalculated." };
}

export async function approveTimecard(
  input: TimecardApprovalInput,
): Promise<TimekeeperMutationResult<StaffTimecard>> {
  const actor = await getTimekeeperActor("timekeeper.approve_timecard");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();

  await recalculateTimecard(input.timecardId, actor.staffId);

  const openExceptions = await getExceptionsForTimecard(input.timecardId);
  const openCriticalExceptions = openExceptions.filter(
    (exception) => exception.status === "open" && exception.severity === "critical",
  );

  if (openCriticalExceptions.length > 0) {
    return {
      ok: false,
      error: `Resolve or document override for ${openCriticalExceptions.length} critical timecard exception(s) before approval.`,
    };
  }

  const { data, error } = await supabase
    .from("staff_timecards")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by_staff_id: actor.staffId,
      manager_notes: normalizeText(input.notes),
    })
    .eq("id", input.timecardId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error ? formatSupabaseError("Unable to approve timecard", error) : "Unable to approve timecard.",
    };
  }

  await writeTimekeeperEvent({
    timecardId: input.timecardId,
    staffMemberId: data.staff_member_id,
    actorStaffId: actor.staffId,
    eventType: "timecard_approved",
  });
  await writeAuditLog({
    actorStaffId: actor.staffId,
    action: "timekeeper_timecard_approved",
    entityId: input.timecardId,
  });
  revalidateTimekeeperPaths(input.timecardId);

  return { ok: true, data: data as StaffTimecard, message: "Timecard approved." };
}

export async function reopenTimecard(
  input: TimecardReviewInput,
): Promise<TimekeeperMutationResult<StaffTimecard>> {
  const actor = await getTimekeeperActor("timekeeper.reopen_timecard");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();
  if (!normalizeText(input.notes)) return { ok: false, error: "Reopen notes are required." };

  const { data, error } = await supabase
    .from("staff_timecards")
    .update({
      status: "reopened",
      reopened_at: new Date().toISOString(),
      reopened_by_staff_id: actor.staffId,
      manager_notes: normalizeText(input.notes),
    })
    .eq("id", input.timecardId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error ? formatSupabaseError("Unable to reopen timecard", error) : "Unable to reopen timecard.",
    };
  }

  await writeTimekeeperEvent({
    timecardId: input.timecardId,
    staffMemberId: data.staff_member_id,
    actorStaffId: actor.staffId,
    eventType: "timecard_reopened",
    metadata: { notes: normalizeText(input.notes) },
  });
  await writeAuditLog({
    actorStaffId: actor.staffId,
    action: "timekeeper_timecard_reopened",
    entityId: input.timecardId,
  });
  revalidateTimekeeperPaths(input.timecardId);

  return { ok: true, data: data as StaffTimecard, message: "Timecard reopened." };
}

export async function resolveTimecardException(input: {
  exceptionId: string;
  status: "resolved" | "dismissed";
  notes?: string | null;
}): Promise<TimekeeperMutationResult<StaffTimecardException>> {
  const actor = await getTimekeeperActor("timekeeper.resolve_exception");
  const supabase = createSupabaseServiceClient();

  if (!supabase) return unavailableResult();

  const { data, error } = await supabase
    .from("staff_timecard_exceptions")
    .update({
      status: input.status,
      resolved_at: new Date().toISOString(),
      resolved_by_staff_id: actor.staffId,
      resolution_notes: normalizeText(input.notes),
    })
    .eq("id", input.exceptionId)
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: error
        ? formatSupabaseError("Unable to resolve exception", error)
        : "Unable to resolve exception.",
    };
  }

  await recalculateTimecard(data.timecard_id, actor.staffId);
  await writeTimekeeperEvent({
    timecardId: data.timecard_id,
    staffMemberId: data.staff_member_id,
    actorStaffId: actor.staffId,
    eventType: `exception_${input.status}`,
    metadata: { exception_type: data.exception_type },
  });
  revalidateTimekeeperPaths(data.timecard_id);

  return {
    ok: true,
    data: data as StaffTimecardException,
    message: input.status === "resolved" ? "Exception resolved." : "Exception dismissed.",
  };
}
