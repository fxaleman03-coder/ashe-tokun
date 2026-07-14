import "server-only";

import { payrollClientOrThrow } from "@/lib/data/payrollRepository";

export type PayrollEventType =
  | "payroll_generated"
  | "payroll_period_created"
  | "payroll_refreshed"
  | "employee_reviewed"
  | "employee_approved"
  | "employee_excluded"
  | "employee_included"
  | "period_reviewed"
  | "period_approved"
  | "period_closed"
  | "period_reopened"
  | "csv_exported"
  | "excel_exported"
  | "period_pdf_generated"
  | "package_generated";

export async function writePayrollEventRecord(input: {
  payrollPeriodId?: string | null;
  payrollPeriodEmployeeId?: string | null;
  actorStaffId?: string | null;
  eventType: PayrollEventType;
  metadata?: Record<string, unknown>;
}) {
  const supabase = payrollClientOrThrow();

  await supabase.from("payroll_events").insert({
    payroll_period_id: input.payrollPeriodId ?? null,
    payroll_period_employee_id: input.payrollPeriodEmployeeId ?? null,
    actor_staff_id: input.actorStaffId ?? null,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  });
}

export async function writePayrollAudit(input: {
  actorStaffId?: string | null;
  action: string;
  entityId?: string | null;
  details?: Record<string, unknown>;
}) {
  const supabase = payrollClientOrThrow();

  await supabase.from("audit_logs").insert({
    staff_user_id: input.actorStaffId ?? null,
    action: input.action,
    entity_type: "payroll",
    entity_id: input.entityId ?? null,
    details: input.details ?? {},
  });
}

