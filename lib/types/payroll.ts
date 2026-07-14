import type { StaffScheduleEmployee } from "@/lib/types/scheduling";
import type { StaffTimecard } from "@/lib/types/timekeeper";

export type PayrollPeriodStatus =
  | "draft"
  | "processing"
  | "approved"
  | "closed"
  | "reopened";

export type PayrollPeriodType =
  | "weekly"
  | "bi_weekly"
  | "semi_monthly"
  | "monthly";

export type PayrollEmployeeStatus =
  | "pending"
  | "incomplete"
  | "ready"
  | "reviewed"
  | "approved"
  | "excluded";

export type PayrollPeriod = {
  id: string;
  period_name: string;
  period_type: PayrollPeriodType;
  start_date: string;
  end_date: string;
  pay_date?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  status: PayrollPeriodStatus;
  created_at: string;
  updated_at: string | null;
  created_by_staff_id: string | null;
  approved_by_staff_id: string | null;
  approved_at: string | null;
  closed_by_staff_id?: string | null;
  closed_at?: string | null;
  notes: string | null;
};

export type PayrollPeriodEmployee = {
  id: string;
  payroll_period_id: string;
  staff_member_id: string;
  status: PayrollEmployeeStatus;
  regular_minutes: number;
  overtime_minutes: number;
  total_minutes: number;
  approved_timecard_count: number;
  pending_timecard_count: number;
  incomplete_timecard_count: number;
  payroll_notes: string | null;
  reviewed_by_staff_id: string | null;
  reviewed_at: string | null;
  approved_by_staff_id: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string | null;
  staff_member?: StaffScheduleEmployee | null;
};

export type PayrollPeriodTimecard = {
  id: string;
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
  created_at: string;
  timecard?: StaffTimecard | null;
};

export type PayrollEvent = {
  id: string;
  payroll_period_id: string | null;
  payroll_period_employee_id: string | null;
  actor_staff_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PayrollFilters = {
  periodId?: string;
  employeeId?: string;
  locationId?: string | "all";
  department?: string | "all";
  approvalStatus?: "all" | "approved" | "pending";
};

export type PayrollEmployeeSummary = {
  staff_member_id: string;
  period_employee_id?: string | null;
  employee_number: string;
  employee_name: string;
  business_title: string | null;
  location_name: string | null;
  regular_minutes: number;
  overtime_minutes: number;
  total_minutes: number;
  approved_timecards: number;
  pending_timecards: number;
  incomplete_timecards?: number;
  approval_status: PayrollEmployeeStatus;
  timecards: StaffTimecard[];
  staff_member?: StaffScheduleEmployee | null;
};

export type PayrollDashboardMetrics = {
  employee_count: number;
  approved_timecards: number;
  pending_timecards: number;
  regular_minutes: number;
  overtime_minutes: number;
  total_minutes: number;
};

export type PayrollPeriodMetrics = PayrollDashboardMetrics & {
  ready_employees: number;
  incomplete_employees: number;
  reviewed_employees: number;
  approved_employees: number;
  excluded_employees: number;
};

export type PayrollDashboardData = {
  periods: PayrollPeriod[];
  currentPeriod: PayrollPeriod;
  hasPersistedPeriod: boolean;
  metrics: PayrollDashboardMetrics;
  employees: PayrollEmployeeSummary[];
  hasGeneratedRows: boolean;
  readWarning: string | null;
};

export type PayrollPeriodDetail = {
  period: PayrollPeriod;
  metrics: PayrollPeriodMetrics;
  employees: PayrollPeriodEmployee[];
  events: PayrollEvent[];
};

export type PayrollEmployeeDetail = {
  period: PayrollPeriod;
  employee: PayrollPeriodEmployee;
  timecards: PayrollPeriodTimecard[];
  events: PayrollEvent[];
};

export type PayrollExportRow = {
  employeeNumber: string;
  employeeName: string;
  businessTitle: string;
  location: string;
  periodStart: string;
  periodEnd: string;
  regularHours: string;
  overtimeHours: string;
  totalHours: string;
  payrollStatus: string;
};

export type PayrollExcelRow = PayrollExportRow;

export type PayrollGenerateResult = {
  success: boolean;
  error?: string;
  employeeCount?: number;
  approvedTimecardCount?: number;
  pendingTimecardCount?: number;
  totalMinutes?: number;
};

export type PayrollRefreshResult = PayrollGenerateResult;

export type PayrollApprovalResult = {
  success: boolean;
  error?: string;
  status?: PayrollPeriodStatus | PayrollEmployeeStatus;
};

export type PayrollPackageResult = {
  success: boolean;
  error?: string;
  fileCount?: number;
};

export type CreatePayrollPeriodInput = {
  period_name: string;
  period_type: PayrollPeriodType;
  start_date: string;
  end_date: string;
  pay_date?: string | null;
  location_id?: string | null;
  notes?: string | null;
};

export type PayrollPeriodMutationResult = {
  success: boolean;
  error?: string;
  periodId?: string;
};
