"use server";

import {
  getPayrollEmployees,
  getPayrollPeriodById,
  getPayrollPeriodDetail,
  payrollClientOrThrow,
} from "@/lib/data/payrollRepository";
import { getTimecards } from "@/lib/data/timekeeperRepository";
import {
  type PayrollEventType,
  writePayrollAudit,
  writePayrollEventRecord,
} from "@/lib/payroll/mutations/audit";
import {
  buildPayrollEmployeePayload,
  nextPayrollEmployeeStatus,
  type PayrollTimecardSnapshotUpsert,
} from "@/lib/payroll/mutations/employeeAggregation";
import {
  type Actor,
  formatSupabaseError,
  getPayrollActor,
  isIsoDate,
  isValidPeriodType,
  loadPeriodOrError,
  normalizeText,
  revalidatePayrollPaths,
} from "@/lib/payroll/mutations/shared";
import type {
  CreatePayrollPeriodInput,
  PayrollApprovalResult,
  PayrollEmployeeStatus,
  PayrollGenerateResult,
  PayrollPeriod,
  PayrollPeriodEmployee,
  PayrollPeriodMutationResult,
  PayrollRefreshResult,
} from "@/lib/types/payroll";
import type { StaffTimecard } from "@/lib/types/timekeeper";
import type { PermissionKey } from "@/lib/staff/permissionTypes";

export async function writePayrollEvent(input: {
  payrollPeriodId?: string | null;
  payrollPeriodEmployeeId?: string | null;
  actorStaffId?: string | null;
  eventType: PayrollEventType;
  metadata?: Record<string, unknown>;
}) {
  await writePayrollEventRecord(input);
}

export async function createPayrollPeriod(
  input: CreatePayrollPeriodInput,
): Promise<PayrollPeriodMutationResult> {
  const actor = await getPayrollActor("payroll.manage");
  const supabase = payrollClientOrThrow();
  const periodName = normalizeText(input.period_name);
  const payDate = normalizeText(input.pay_date);
  const locationId = normalizeText(input.location_id);
  const notes = normalizeText(input.notes);

  if (!periodName) {
    return { success: false, error: "Period name is required." };
  }

  if (!isValidPeriodType(input.period_type)) {
    return { success: false, error: "Select a valid payroll period type." };
  }

  if (!isIsoDate(input.start_date) || !isIsoDate(input.end_date)) {
    return { success: false, error: "Start date and end date must be valid ISO dates." };
  }

  if (input.end_date < input.start_date) {
    return { success: false, error: "End date must be on or after start date." };
  }

  if (payDate && !isIsoDate(payDate)) {
    return { success: false, error: "Pay date must be a valid ISO date." };
  }

  const payload = {
    period_name: periodName,
    period_type: input.period_type,
    start_date: input.start_date,
    end_date: input.end_date,
    pay_date: payDate,
    location_id: locationId,
    status: "draft",
    created_by_staff_id: actor.staffId,
    notes,
  };

  const { data, error } = await supabase
    .from("payroll_periods")
    .insert(payload)
    .select("id, period_name, status")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: error
        ? formatSupabaseError("Unable to create payroll period", error)
        : "Unable to create payroll period.",
    };
  }

  await writePayrollEvent({
    payrollPeriodId: data.id,
    actorStaffId: actor.staffId,
    eventType: "payroll_period_created",
    metadata: {
      periodName,
      periodType: input.period_type,
      startDate: input.start_date,
      endDate: input.end_date,
      payDate,
      locationId,
    },
  });
  await writePayrollAudit({
    actorStaffId: actor.staffId,
    action: "payroll_period_created",
    entityId: data.id,
    details: {
      periodName,
      periodType: input.period_type,
      startDate: input.start_date,
      endDate: input.end_date,
      payDate,
      locationId,
    },
  });

  revalidatePayrollPaths(data.id);

  return { success: true, periodId: data.id };
}

async function aggregatePayrollPeriod(
  period: PayrollPeriod,
  actor: Actor,
  eventType: "payroll_generated" | "payroll_refreshed",
): Promise<PayrollGenerateResult> {
  const supabase = payrollClientOrThrow();
  const timecards = await getTimecards({
    startDate: period.start_date,
    endDate: period.end_date,
    status: "all",
  });
  const approvedTimecards = timecards.filter(
    (timecard) => timecard.status === "approved",
  );

  if (approvedTimecards.length === 0) {
    return {
      success: false,
      error: "No approved timecards were found for this payroll period.",
      employeeCount: 0,
      approvedTimecardCount: 0,
      pendingTimecardCount: timecards.length,
      totalMinutes: 0,
    };
  }

  const existingEmployees = await getPayrollEmployees(period.id).catch(() => []);
  const existingByStaffId = new Map(
    existingEmployees.map((employee) => [employee.staff_member_id, employee]),
  );
  const byStaffId = new Map<string, StaffTimecard[]>();

  for (const timecard of timecards) {
    const rows = byStaffId.get(timecard.staff_member_id) ?? [];
    rows.push(timecard);
    byStaffId.set(timecard.staff_member_id, rows);
  }

  const employeePayloads = Array.from(byStaffId.entries())
    .filter(([, staffTimecards]) =>
      staffTimecards.some((timecard) => timecard.status === "approved"),
    )
    .map(([staffMemberId, staffTimecards]) =>
      buildPayrollEmployeePayload({
        periodId: period.id,
        staffMemberId,
        existing: existingByStaffId.get(staffMemberId),
        timecards: staffTimecards,
      }),
    );

  const { data: employeeRows, error: employeeError } = await supabase
    .from("payroll_period_employees")
    .upsert(employeePayloads, {
      onConflict: "payroll_period_id,staff_member_id",
    })
    .select("id, payroll_period_id, staff_member_id");

  if (employeeError || !employeeRows) {
    return {
      success: false,
      error: employeeError
        ? formatSupabaseError("Unable to save payroll employee rows", employeeError)
        : "Unable to save payroll employee rows.",
    };
  }

  const periodEmployeeByStaffId = new Map(
    employeeRows.map((row) => [row.staff_member_id as string, row.id as string]),
  );
  const snapshotPayloads: PayrollTimecardSnapshotUpsert[] = approvedTimecards
    .flatMap((timecard) => {
      const payrollPeriodEmployeeId = periodEmployeeByStaffId.get(
        timecard.staff_member_id,
      );

      if (!payrollPeriodEmployeeId) return [];

      return [{
        payroll_period_id: period.id,
        payroll_period_employee_id: payrollPeriodEmployeeId,
        timecard_id: timecard.id,
        work_date: timecard.work_date,
        regular_minutes: timecard.regular_minutes ?? 0,
        overtime_minutes: timecard.overtime_minutes ?? 0,
        total_minutes: (timecard.regular_minutes ?? 0) + (timecard.overtime_minutes ?? 0),
        included: true,
        exclusion_reason: null,
        captured_timecard_status: timecard.status,
        captured_approved_at: timecard.approved_at,
      }];
    });

  const { error: snapshotError } = await supabase
    .from("payroll_period_timecards")
    .upsert(snapshotPayloads, { onConflict: "payroll_period_id,timecard_id" });

  if (snapshotError) {
    return {
      success: false,
      error: formatSupabaseError("Unable to save payroll timecard snapshots", snapshotError),
    };
  }

  const { error: periodError } = await supabase
    .from("payroll_periods")
    .update({ status: "processing" })
    .eq("id", period.id);

  if (periodError) {
    return {
      success: false,
      error: formatSupabaseError("Unable to update payroll period status", periodError),
    };
  }

  const totalMinutes = approvedTimecards.reduce(
    (total, timecard) =>
      total + (timecard.regular_minutes ?? 0) + (timecard.overtime_minutes ?? 0),
    0,
  );

  await writePayrollEvent({
    payrollPeriodId: period.id,
    actorStaffId: actor.staffId,
    eventType,
    metadata: {
      employeeCount: employeeRows.length,
      approvedTimecardCount: approvedTimecards.length,
      totalMinutes,
    },
  });
  await writePayrollAudit({
    actorStaffId: actor.staffId,
    action: eventType,
    entityId: period.id,
    details: {
      employeeCount: employeeRows.length,
      approvedTimecardCount: approvedTimecards.length,
      totalMinutes,
    },
  });

  revalidatePayrollPaths(period.id);

  return {
    success: true,
    employeeCount: employeeRows.length,
    approvedTimecardCount: approvedTimecards.length,
    pendingTimecardCount: timecards.length - approvedTimecards.length,
    totalMinutes,
  };
}

export async function generatePayrollPeriod(
  periodId: string,
): Promise<PayrollGenerateResult> {
  const actor = await getPayrollActor("payroll.manage");
  const periodResult = await loadPeriodOrError(periodId);

  if (!periodResult.ok) return { success: false, error: periodResult.error };
  if (periodResult.period.status !== "draft") {
    return { success: false, error: "Generate Payroll is only available for draft periods." };
  }

  return aggregatePayrollPeriod(periodResult.period, actor, "payroll_generated");
}

export async function refreshPayrollPeriod(
  periodId: string,
): Promise<PayrollRefreshResult> {
  const actor = await getPayrollActor("payroll.manage");
  const periodResult = await loadPeriodOrError(periodId);

  if (!periodResult.ok) return { success: false, error: periodResult.error };
  if (!["processing", "reopened"].includes(periodResult.period.status)) {
    return {
      success: false,
      error: "Refresh Payroll Data is only available for processing or reopened periods.",
    };
  }

  return aggregatePayrollPeriod(periodResult.period, actor, "payroll_refreshed");
}

async function updateEmployeeStatus(input: {
  periodEmployeeId: string;
  permission: PermissionKey;
  status: PayrollEmployeeStatus;
  notes?: string | null;
  reason?: string | null;
  eventType: PayrollEventType;
}) {
  const actor = await getPayrollActor(input.permission);
  const supabase = payrollClientOrThrow();
  const { data: current, error: currentError } = await supabase
    .from("payroll_period_employees")
    .select("*")
    .eq("id", input.periodEmployeeId)
    .maybeSingle();

  if (currentError) {
    return {
      success: false,
      error: formatSupabaseError("Unable to load payroll employee", currentError),
    } satisfies PayrollApprovalResult;
  }

  if (!current) {
    return { success: false, error: "Payroll employee row not found." };
  }

  const period = await getPayrollPeriodById(current.payroll_period_id);
  if (!period) return { success: false, error: "Payroll period not found." };
  if (period.status === "closed") {
    return { success: false, error: "Closed payroll periods are immutable." };
  }

  if (input.status === "approved" && current.incomplete_timecard_count > 0) {
    return {
      success: false,
      error: "Cannot approve employee payroll while incomplete timecards remain.",
    };
  }

  if (input.status === "excluded" && !normalizeText(input.reason)) {
    return { success: false, error: "Exclusion reason is required." };
  }

  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    status: input.status,
  };

  if (input.status === "reviewed") {
    update.payroll_notes = normalizeText(input.notes) ?? current.payroll_notes;
    update.reviewed_by_staff_id = actor.staffId;
    update.reviewed_at = now;
  }

  if (input.status === "approved") {
    update.payroll_notes = normalizeText(input.notes) ?? current.payroll_notes;
    update.approved_by_staff_id = actor.staffId;
    update.approved_at = now;
    update.reviewed_by_staff_id = current.reviewed_by_staff_id ?? actor.staffId;
    update.reviewed_at = current.reviewed_at ?? now;
  }

  if (input.status === "excluded") {
    update.payroll_notes = normalizeText(input.reason);
  }

  if (input.status === "ready") {
    update.approved_by_staff_id = null;
    update.approved_at = null;
  }

  const { error } = await supabase
    .from("payroll_period_employees")
    .update(update)
    .eq("id", input.periodEmployeeId);

  if (error) {
    return {
      success: false,
      error: formatSupabaseError("Unable to update payroll employee", error),
    };
  }

  await writePayrollEvent({
    payrollPeriodId: current.payroll_period_id,
    payrollPeriodEmployeeId: current.id,
    actorStaffId: actor.staffId,
    eventType: input.eventType,
    metadata: { status: input.status, notes: normalizeText(input.notes ?? input.reason) },
  });
  await writePayrollAudit({
    actorStaffId: actor.staffId,
    action: input.eventType,
    entityId: current.payroll_period_id,
    details: { payrollPeriodEmployeeId: current.id, status: input.status },
  });

  revalidatePayrollPaths(current.payroll_period_id, current.id);

  return { success: true, status: input.status } satisfies PayrollApprovalResult;
}

export async function reviewPayrollEmployee(periodEmployeeId: string, notes?: string | null) {
  return updateEmployeeStatus({
    periodEmployeeId,
    permission: "payroll.approve",
    status: "reviewed",
    notes,
    eventType: "employee_reviewed",
  });
}

export async function approvePayrollEmployee(periodEmployeeId: string, notes?: string | null) {
  return updateEmployeeStatus({
    periodEmployeeId,
    permission: "payroll.approve",
    status: "approved",
    notes,
    eventType: "employee_approved",
  });
}

export async function excludePayrollEmployee(periodEmployeeId: string, reason: string) {
  return updateEmployeeStatus({
    periodEmployeeId,
    permission: "payroll.manage",
    status: "excluded",
    reason,
    eventType: "employee_excluded",
  });
}

export async function includePayrollEmployee(periodEmployeeId: string) {
  const detail = await getPayrollEmployeeDetailByEmployeeId(periodEmployeeId);
  const status = detail
    ? nextPayrollEmployeeStatus({
        existing: { ...detail, status: "ready" },
        approvedCount: detail.approved_timecard_count,
        pendingCount: detail.pending_timecard_count,
        incompleteCount: detail.incomplete_timecard_count,
      })
    : "ready";

  return updateEmployeeStatus({
    periodEmployeeId,
    permission: "payroll.manage",
    status,
    eventType: "employee_included",
  });
}

async function getPayrollEmployeeDetailByEmployeeId(periodEmployeeId: string) {
  const supabase = payrollClientOrThrow();
  const { data } = await supabase
    .from("payroll_period_employees")
    .select("*")
    .eq("id", periodEmployeeId)
    .maybeSingle();

  return data as PayrollPeriodEmployee | null;
}

export async function approvePayrollPeriod(periodId: string): Promise<PayrollApprovalResult> {
  const actor = await getPayrollActor("payroll.approve");
  const detail = await getPayrollPeriodDetail(periodId);
  const supabase = payrollClientOrThrow();

  if (!detail) return { success: false, error: "Payroll period not found." };
  if (detail.period.status === "closed") {
    return { success: false, error: "Closed payroll periods are immutable." };
  }
  if (detail.employees.length === 0) {
    return { success: false, error: "Generate payroll before approving the period." };
  }
  if (
    detail.employees.some(
      (employee) => !["approved", "excluded"].includes(employee.status),
    )
  ) {
    return {
      success: false,
      error: "All employee payroll rows must be approved or excluded first.",
    };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payroll_periods")
    .update({
      status: "approved",
      approved_by_staff_id: actor.staffId,
      approved_at: now,
    })
    .eq("id", periodId);

  if (error) {
    return { success: false, error: formatSupabaseError("Unable to approve period", error) };
  }

  await writePayrollEvent({
    payrollPeriodId: periodId,
    actorStaffId: actor.staffId,
    eventType: "period_approved",
  });
  await writePayrollAudit({
    actorStaffId: actor.staffId,
    action: "period_approved",
    entityId: periodId,
  });
  revalidatePayrollPaths(periodId);

  return { success: true, status: "approved" };
}

export async function closePayrollPeriod(periodId: string): Promise<PayrollApprovalResult> {
  const actor = await getPayrollActor("payroll.close");
  const period = await getPayrollPeriodById(periodId);
  const supabase = payrollClientOrThrow();

  if (!period) return { success: false, error: "Payroll period not found." };
  if (period.status !== "approved") {
    return { success: false, error: "Only approved payroll periods can be closed." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("payroll_periods")
    .update({
      status: "closed",
      closed_by_staff_id: actor.staffId,
      closed_at: now,
    })
    .eq("id", periodId);

  if (error) {
    return { success: false, error: formatSupabaseError("Unable to close period", error) };
  }

  await writePayrollEvent({
    payrollPeriodId: periodId,
    actorStaffId: actor.staffId,
    eventType: "period_closed",
  });
  await writePayrollAudit({
    actorStaffId: actor.staffId,
    action: "period_closed",
    entityId: periodId,
  });
  revalidatePayrollPaths(periodId);

  return { success: true, status: "closed" };
}

export async function reopenPayrollPeriod(
  periodId: string,
  reason: string,
): Promise<PayrollApprovalResult> {
  const actor = await getPayrollActor("payroll.reopen");
  const period = await getPayrollPeriodById(periodId);
  const supabase = payrollClientOrThrow();
  const normalizedReason = normalizeText(reason);

  if (!period) return { success: false, error: "Payroll period not found." };
  if (!["approved", "closed"].includes(period.status)) {
    return { success: false, error: "Only approved or closed periods can be reopened." };
  }
  if (!normalizedReason) {
    return { success: false, error: "Reopen reason is required." };
  }

  const { error } = await supabase
    .from("payroll_periods")
    .update({ status: "reopened" })
    .eq("id", periodId);

  if (error) {
    return { success: false, error: formatSupabaseError("Unable to reopen period", error) };
  }

  await writePayrollEvent({
    payrollPeriodId: periodId,
    actorStaffId: actor.staffId,
    eventType: "period_reopened",
    metadata: { reason: normalizedReason },
  });
  await writePayrollAudit({
    actorStaffId: actor.staffId,
    action: "period_reopened",
    entityId: periodId,
    details: { reason: normalizedReason },
  });
  revalidatePayrollPaths(periodId);

  return { success: true, status: "reopened" };
}
