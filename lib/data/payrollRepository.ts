import "server-only";

import { USE_SUPABASE } from "@/lib/config";
import {
  getPunchesForTimecard,
  getTimecardById,
  getTimecards,
} from "@/lib/data/timekeeperRepository";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { StaffScheduleEmployee } from "@/lib/types/scheduling";
import type {
  PayrollDashboardData,
  PayrollEmployeeDetail,
  PayrollEmployeeStatus,
  PayrollEvent,
  PayrollExportRow,
  PayrollPeriod,
  PayrollPeriodDetail,
  PayrollPeriodEmployee,
  PayrollPeriodMetrics,
  PayrollPeriodTimecard,
  PayrollPeriodType,
} from "@/lib/types/payroll";
import type { StaffTimecard } from "@/lib/types/timekeeper";
import {
  addDaysToDateString,
  formatDate,
  getBusinessTodayDate,
} from "@/lib/utils/dateTimeDisplay";

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type PayrollEmployeeRow = Omit<PayrollPeriodEmployee, "staff_member"> & {
  staff_member?: StaffScheduleEmployee | StaffScheduleEmployee[] | null;
};

type PayrollTimecardRow = Omit<PayrollPeriodTimecard, "timecard">;
type PayrollPeriodRow = PayrollPeriod & {
  location?: { name?: string | null } | { name?: string | null }[] | null;
};

const payrollEmployeeSelect = `
  *,
  staff_member:staff_members!payroll_period_employees_staff_member_id_fkey(
    id,
    employee_number,
    first_name,
    last_name,
    display_name,
    business_title,
    role,
    active,
    employment_status
  )
`;

export function formatPayrollReadError(context: string, error: SupabaseErrorLike) {
  const details = [
    error.code ? `Code: ${error.code}` : null,
    error.message ? `Message: ${error.message}` : null,
    error.details ? `Details: ${error.details}` : null,
    error.hint ? `Hint: ${error.hint}` : null,
  ].filter(Boolean);

  return details.length > 0 ? `${context}: ${details.join(" / ")}` : context;
}

export function payrollClientOrThrow() {
  const client = createSupabaseServiceClient();

  if (!USE_SUPABASE || !client) {
    throw new Error("Payroll requires Supabase service configuration.");
  }

  return client;
}

function firstJoin<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function weekStart(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - weekday);

  return date.toISOString().slice(0, 10);
}

function fallbackCurrentPeriod(): PayrollPeriod {
  const today = getBusinessTodayDate();
  const start = weekStart(today);

  return {
    id: "",
    period_name: "Payroll Period Required",
    period_type: "weekly",
    start_date: start,
    end_date: addDaysToDateString(start, 6),
    pay_date: null,
    location_id: null,
    location_name: null,
    status: "draft",
    created_at: new Date().toISOString(),
    updated_at: null,
    created_by_staff_id: null,
    approved_by_staff_id: null,
    approved_at: null,
    closed_by_staff_id: null,
    closed_at: null,
    notes: "Create or select a persisted payroll_periods row before generating payroll.",
  };
}

function employeeName(staff: StaffScheduleEmployee | null | undefined, fallbackId: string) {
  if (!staff) return `Employee ${fallbackId.slice(0, 8)}`;

  return (
    staff.display_name ||
    `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() ||
    staff.employee_number
  );
}

function periodMatchesType(period: PayrollPeriod, type?: PayrollPeriodType) {
  return !type || period.period_type === type;
}

function toPayrollEmployee(row: PayrollEmployeeRow): PayrollPeriodEmployee {
  return {
    ...row,
    status: row.status as PayrollEmployeeStatus,
    staff_member: firstJoin(row.staff_member) ?? null,
  };
}

function locationName(value: PayrollPeriodRow["location"]) {
  return firstJoin(value)?.name ?? null;
}

async function enrichPayrollPeriods(periods: PayrollPeriodRow[]) {
  const locationIds = Array.from(
    new Set(periods.map((period) => period.location_id).filter(Boolean) as string[]),
  );

  if (locationIds.length === 0) {
    return periods.map((period) => ({ ...period, location_name: locationName(period.location) }));
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return periods;

  const { data, error } = await supabase
    .from("inventory_locations")
    .select("id, name")
    .in("id", locationIds);

  if (error || !data) {
    return periods.map((period) => ({ ...period, location_name: locationName(period.location) }));
  }

  const names = new Map(data.map((location) => [location.id as string, location.name as string]));

  return periods.map((period) => ({
    ...period,
    location_name: period.location_id ? names.get(period.location_id) ?? null : null,
  }));
}

function buildMetrics(employees: PayrollPeriodEmployee[]): PayrollPeriodMetrics {
  return employees.reduce(
    (totals, employee) => ({
      employee_count: totals.employee_count + 1,
      approved_timecards:
        totals.approved_timecards + employee.approved_timecard_count,
      pending_timecards: totals.pending_timecards + employee.pending_timecard_count,
      regular_minutes: totals.regular_minutes + employee.regular_minutes,
      overtime_minutes: totals.overtime_minutes + employee.overtime_minutes,
      total_minutes: totals.total_minutes + employee.total_minutes,
      ready_employees: totals.ready_employees + (employee.status === "ready" ? 1 : 0),
      incomplete_employees:
        totals.incomplete_employees + (employee.status === "incomplete" ? 1 : 0),
      reviewed_employees:
        totals.reviewed_employees + (employee.status === "reviewed" ? 1 : 0),
      approved_employees:
        totals.approved_employees + (employee.status === "approved" ? 1 : 0),
      excluded_employees:
        totals.excluded_employees + (employee.status === "excluded" ? 1 : 0),
    }),
    {
      employee_count: 0,
      approved_timecards: 0,
      pending_timecards: 0,
      regular_minutes: 0,
      overtime_minutes: 0,
      total_minutes: 0,
      ready_employees: 0,
      incomplete_employees: 0,
      reviewed_employees: 0,
      approved_employees: 0,
      excluded_employees: 0,
    },
  );
}

export function minutesToDecimalHours(minutes: number) {
  return (minutes / 60).toFixed(2);
}

export function payrollPeriodFilename(period: PayrollPeriod, extension: string) {
  return `ASHE-TOKUN-Payroll-${period.start_date}-to-${period.end_date}.${extension}`;
}

export async function getPayrollPeriods() {
  const supabase = createSupabaseServiceClient();

  if (!USE_SUPABASE || !supabase) {
    return {
      periods: [] as PayrollPeriod[],
      warning: "Supabase service client is not configured for payroll periods.",
    };
  }

  const { data, error } = await supabase
    .from("payroll_periods")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    return {
      periods: [] as PayrollPeriod[],
      warning: formatPayrollReadError("Payroll periods are not active yet", error),
    };
  }

  return {
    periods: await enrichPayrollPeriods((data ?? []) as PayrollPeriodRow[]),
    warning: null,
  };
}

export async function getPayrollPeriodById(periodId: string) {
  if (!isUuidLike(periodId)) {
    return null;
  }

  const supabase = payrollClientOrThrow();
  const { data, error } = await supabase
    .from("payroll_periods")
    .select("*")
    .eq("id", periodId)
    .maybeSingle();

  if (error) {
    throw new Error(formatPayrollReadError("Unable to load payroll period", error));
  }

  const [period] = await enrichPayrollPeriods(data ? [data as PayrollPeriodRow] : []);

  return period ?? null;
}

export async function getPayrollEmployees(periodId: string) {
  const supabase = payrollClientOrThrow();
  const { data, error } = await supabase
    .from("payroll_period_employees")
    .select(payrollEmployeeSelect)
    .eq("payroll_period_id", periodId)
    .order("status", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(formatPayrollReadError("Unable to load payroll employees", error));
  }

  return ((data ?? []) as PayrollEmployeeRow[]).map(toPayrollEmployee);
}

export async function getPayrollEvents(periodId: string) {
  const supabase = payrollClientOrThrow();
  const { data, error } = await supabase
    .from("payroll_events")
    .select("*")
    .eq("payroll_period_id", periodId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(formatPayrollReadError("Unable to load payroll events", error));
  }

  return (data ?? []) as PayrollEvent[];
}

export async function getPayrollPeriodDetail(periodId: string): Promise<PayrollPeriodDetail | null> {
  const period = await getPayrollPeriodById(periodId);

  if (!period) return null;

  const [employees, events] = await Promise.all([
    getPayrollEmployees(period.id),
    getPayrollEvents(period.id),
  ]);

  return {
    period,
    metrics: buildMetrics(employees),
    employees,
    events,
  };
}

export async function getPayrollEmployeeDetail(
  periodId: string,
  periodEmployeeId: string,
): Promise<PayrollEmployeeDetail | null> {
  const supabase = payrollClientOrThrow();
  const period = await getPayrollPeriodById(periodId);

  if (!period) return null;

  const { data: employeeRow, error: employeeError } = await supabase
    .from("payroll_period_employees")
    .select(payrollEmployeeSelect)
    .eq("payroll_period_id", periodId)
    .eq("id", periodEmployeeId)
    .maybeSingle();

  if (employeeError) {
    throw new Error(formatPayrollReadError("Unable to load payroll employee", employeeError));
  }

  if (!employeeRow) return null;

  const { data: timecardRows, error: timecardError } = await supabase
    .from("payroll_period_timecards")
    .select("*")
    .eq("payroll_period_employee_id", periodEmployeeId)
    .order("work_date", { ascending: true });

  if (timecardError) {
    throw new Error(formatPayrollReadError("Unable to load payroll timecards", timecardError));
  }

  const timecards = await Promise.all(
    ((timecardRows ?? []) as PayrollTimecardRow[]).map(async (row) => ({
      ...row,
      timecard: await getTimecardById(row.timecard_id),
    })),
  );
  const events = (await getPayrollEvents(periodId)).filter(
    (event) =>
      !event.payroll_period_employee_id ||
      event.payroll_period_employee_id === periodEmployeeId,
  );

  return {
    period,
    employee: toPayrollEmployee(employeeRow as PayrollEmployeeRow),
    timecards,
    events,
  };
}

export async function getPayrollDashboardData(): Promise<PayrollDashboardData> {
  const { periods, warning } = await getPayrollPeriods();
  const fallbackPeriod = fallbackCurrentPeriod();
  const today = getBusinessTodayDate();
  const selectedPeriod =
    periods.find((period) => period.status === "processing") ??
    periods.find((period) => period.status === "reopened") ??
    periods.find(
      (period) =>
        period.status === "draft" &&
        period.start_date <= today &&
        period.end_date >= today,
    ) ??
    periods.find((period) => periodMatchesType(period, "weekly")) ??
    fallbackPeriod;
  const hasPersistedPeriod = Boolean(selectedPeriod.id);
  let readWarning = warning;
  let employees: PayrollPeriodEmployee[] = [];
  let hasGeneratedRows = false;

  if (hasPersistedPeriod) {
    try {
      employees = await getPayrollEmployees(selectedPeriod.id);
      hasGeneratedRows = employees.length > 0;
    } catch (error) {
      readWarning =
        error instanceof Error ? error.message : "Unable to load payroll employee rows.";
    }
  }

  if (!hasGeneratedRows) {
    try {
      const timecards = await getTimecards({
        startDate: selectedPeriod.start_date,
        endDate: selectedPeriod.end_date,
        status: "approved",
      });

      employees = aggregateTimecardsForPreview(timecards);
    } catch (error) {
      readWarning =
        error instanceof Error ? error.message : "Unable to load payroll timecards.";
    }
  }

  const metrics = buildMetrics(employees);

  return {
    periods,
    currentPeriod: selectedPeriod,
    hasPersistedPeriod,
    metrics,
    employees: employees.map((employee) => ({
      staff_member_id: employee.staff_member_id,
      period_employee_id: employee.id,
      employee_number: employee.staff_member?.employee_number ?? employee.staff_member_id,
      employee_name: employeeName(employee.staff_member, employee.staff_member_id),
      business_title: employee.staff_member?.business_title ?? null,
      location_name: null,
      regular_minutes: employee.regular_minutes,
      overtime_minutes: employee.overtime_minutes,
      total_minutes: employee.total_minutes,
      approved_timecards: employee.approved_timecard_count,
      pending_timecards: employee.pending_timecard_count,
      incomplete_timecards: employee.incomplete_timecard_count,
      approval_status: employee.status,
      timecards: [],
      staff_member: employee.staff_member,
    })),
    hasGeneratedRows,
    readWarning,
  };
}

export function isUuidLike(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function aggregateTimecardsForPreview(timecards: StaffTimecard[]): PayrollPeriodEmployee[] {
  const rows = new Map<string, PayrollPeriodEmployee>();

  for (const timecard of timecards) {
    const existing = rows.get(timecard.staff_member_id);
    const regular = timecard.regular_minutes ?? 0;
    const overtime = timecard.overtime_minutes ?? 0;

    if (!existing) {
      rows.set(timecard.staff_member_id, {
        id: `preview-${timecard.staff_member_id}`,
        payroll_period_id: "preview",
        staff_member_id: timecard.staff_member_id,
        status: "ready",
        regular_minutes: regular,
        overtime_minutes: overtime,
        total_minutes: regular + overtime,
        approved_timecard_count: 1,
        pending_timecard_count: 0,
        incomplete_timecard_count: 0,
        payroll_notes: null,
        reviewed_by_staff_id: null,
        reviewed_at: null,
        approved_by_staff_id: null,
        approved_at: null,
        created_at: timecard.created_at,
        updated_at: timecard.updated_at,
        staff_member: timecard.staff_member,
      });
      continue;
    }

    existing.regular_minutes += regular;
    existing.overtime_minutes += overtime;
    existing.total_minutes += regular + overtime;
    existing.approved_timecard_count += 1;
  }

  return Array.from(rows.values());
}

export async function getPayrollExportRows(periodId: string): Promise<{
  period: PayrollPeriod;
  employees: PayrollPeriodEmployee[];
  rows: PayrollExportRow[];
}> {
  const detail = await getPayrollPeriodDetail(periodId);

  if (!detail) {
    throw new Error("Payroll period not found.");
  }

  const rows = detail.employees.map((employee) => ({
    employeeNumber: employee.staff_member?.employee_number ?? "Pending",
    employeeName: employeeName(employee.staff_member, employee.staff_member_id),
    businessTitle: employee.staff_member?.business_title ?? "Not assigned",
    location: detail.period.location_name ?? "All locations",
    periodStart: detail.period.start_date,
    periodEnd: detail.period.end_date,
    regularHours: minutesToDecimalHours(employee.regular_minutes),
    overtimeHours: minutesToDecimalHours(employee.overtime_minutes),
    totalHours: minutesToDecimalHours(employee.total_minutes),
    payrollStatus: employee.status,
  }));

  return {
    period: detail.period,
    employees: detail.employees,
    rows,
  };
}

export async function getPayrollPackageTimecardIds(periodId: string) {
  const detail = await getPayrollPeriodDetail(periodId);

  if (!detail) throw new Error("Payroll period not found.");

  const supabase = payrollClientOrThrow();
  const includedEmployeeIds = detail.employees
    .filter((employee) => employee.status !== "excluded")
    .map((employee) => employee.id);

  if (includedEmployeeIds.length === 0) {
    return { period: detail.period, timecardIds: [] as string[] };
  }

  const { data, error } = await supabase
    .from("payroll_period_timecards")
    .select("timecard_id")
    .eq("payroll_period_id", periodId)
    .eq("included", true)
    .in("payroll_period_employee_id", includedEmployeeIds);

  if (error) {
    throw new Error(formatPayrollReadError("Unable to load payroll package timecards", error));
  }

  return {
    period: detail.period,
    timecardIds: (data ?? []).map((row) => row.timecard_id as string),
  };
}

export async function getDailyTimecardDisplay(timecardId: string) {
  const [timecard, punches] = await Promise.all([
    getTimecardById(timecardId),
    getPunchesForTimecard(timecardId),
  ]);

  const firstIn = punches.find((punch) =>
    ["clock_in", "manual_in"].includes(punch.punch_type),
  );
  const lastOut = [...punches]
    .reverse()
    .find((punch) => ["clock_out", "manual_out"].includes(punch.punch_type));

  return {
    timecard,
    firstClockIn: firstIn?.punchedAt ?? null,
    lastClockOut: lastOut?.punchedAt ?? null,
  };
}

export function payrollPeriodLabel(period: PayrollPeriod) {
  return `${period.period_name} (${formatDate(period.start_date)} - ${formatDate(period.end_date)})`;
}
