import "server-only";

import type { PayrollEmployeeStatus, PayrollPeriodEmployee } from "@/lib/types/payroll";
import type { StaffTimecard, TimecardStatus } from "@/lib/types/timekeeper";

export type PayrollEmployeeUpdate = {
  payroll_period_id: string;
  staff_member_id: string;
  status: PayrollEmployeeStatus;
  regular_minutes: number;
  overtime_minutes: number;
  total_minutes: number;
  approved_timecard_count: number;
  pending_timecard_count: number;
  incomplete_timecard_count: number;
  payroll_notes?: string | null;
  reviewed_by_staff_id?: string | null;
  reviewed_at?: string | null;
  approved_by_staff_id?: string | null;
  approved_at?: string | null;
};

export type PayrollTimecardSnapshotUpsert = {
  payroll_period_id: string;
  payroll_period_employee_id: string;
  timecard_id: string;
  work_date: string;
  regular_minutes: number;
  overtime_minutes: number;
  total_minutes: number;
  included: boolean;
  exclusion_reason: string | null;
  captured_timecard_status: string;
  captured_approved_at: string | null;
};

function countStatus(timecards: StaffTimecard[], status: TimecardStatus) {
  return timecards.filter((timecard) => timecard.status === status).length;
}

export function nextPayrollEmployeeStatus(input: {
  existing?: PayrollPeriodEmployee | null;
  approvedCount: number;
  pendingCount: number;
  incompleteCount: number;
}) {
  if (input.existing?.status === "excluded") return "excluded";
  if (input.approvedCount > 0 && input.pendingCount === 0 && input.incompleteCount === 0) {
    return "ready";
  }
  if (input.incompleteCount > 0 || input.pendingCount > 0) return "incomplete";

  return "pending";
}

export function buildPayrollEmployeePayload(input: {
  periodId: string;
  staffMemberId: string;
  existing?: PayrollPeriodEmployee | null;
  timecards: StaffTimecard[];
}): PayrollEmployeeUpdate {
  const approvedTimecards = input.timecards.filter(
    (timecard) => timecard.status === "approved",
  );
  const regular = approvedTimecards.reduce(
    (total, timecard) => total + (timecard.regular_minutes ?? 0),
    0,
  );
  const overtime = approvedTimecards.reduce(
    (total, timecard) => total + (timecard.overtime_minutes ?? 0),
    0,
  );
  const pendingCount =
    countStatus(input.timecards, "open") +
    countStatus(input.timecards, "pending_review") +
    countStatus(input.timecards, "reopened");
  const incompleteCount = countStatus(input.timecards, "incomplete");
  const status = nextPayrollEmployeeStatus({
    existing: input.existing,
    approvedCount: approvedTimecards.length,
    pendingCount,
    incompleteCount,
  });

  return {
    payroll_period_id: input.periodId,
    staff_member_id: input.staffMemberId,
    status,
    regular_minutes: regular,
    overtime_minutes: overtime,
    total_minutes: regular + overtime,
    approved_timecard_count: approvedTimecards.length,
    pending_timecard_count: pendingCount,
    incomplete_timecard_count: incompleteCount,
    payroll_notes: input.existing?.payroll_notes ?? null,
    reviewed_by_staff_id: status === "ready" ? null : input.existing?.reviewed_by_staff_id ?? null,
    reviewed_at: status === "ready" ? null : input.existing?.reviewed_at ?? null,
    approved_by_staff_id:
      status === "ready" || status === "incomplete"
        ? null
        : input.existing?.approved_by_staff_id ?? null,
    approved_at:
      status === "ready" || status === "incomplete"
        ? null
        : input.existing?.approved_at ?? null,
  };
}

