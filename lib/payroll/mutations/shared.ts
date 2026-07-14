import "server-only";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/staff/permissionGuard";
import { formatPayrollReadError, getPayrollPeriodById } from "@/lib/data/payrollRepository";
import type { CreatePayrollPeriodInput } from "@/lib/types/payroll";
import type { PermissionKey } from "@/lib/staff/permissionTypes";

export type Actor = Awaited<ReturnType<typeof requirePermission>>["staff"];

export type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

export function formatSupabaseError(context: string, error: SupabaseErrorLike) {
  return formatPayrollReadError(context, error);
}

export function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();

  return trimmed ? trimmed : null;
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidPeriodType(
  value: string,
): value is CreatePayrollPeriodInput["period_type"] {
  return ["weekly", "bi_weekly", "semi_monthly", "monthly"].includes(value);
}

export function revalidatePayrollPaths(
  periodId?: string | null,
  periodEmployeeId?: string | null,
) {
  revalidatePath("/admin/payroll");
  if (periodId) revalidatePath(`/admin/payroll/${periodId}`);
  if (periodId && periodEmployeeId) {
    revalidatePath(`/admin/payroll/${periodId}/employees/${periodEmployeeId}`);
  }
}

export async function getPayrollActor(permission: PermissionKey | PermissionKey[]) {
  const { staff } = await requirePermission(permission);

  return staff;
}

export async function loadPeriodOrError(periodId: string) {
  const period = await getPayrollPeriodById(periodId);

  if (!period) return { ok: false as const, error: "Payroll period not found." };
  if (period.status === "closed") {
    return { ok: false as const, error: "Closed payroll periods are immutable." };
  }

  return { ok: true as const, period };
}

