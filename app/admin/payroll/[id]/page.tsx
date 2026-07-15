import { notFound } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PayrollPeriodDetailManager from "@/components/admin/PayrollPeriodDetailManager";
import { getPayrollPeriodDetail, isUuidLike } from "@/lib/data/payrollRepository";
import { requirePermission } from "@/lib/staff/permissionGuard";

type PayrollPeriodPageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function PayrollPeriodPage({ params }: PayrollPeriodPageProps) {
  const { id } = await params;
  await requirePermission("payroll.view");

  if (!isUuidLike(id)) notFound();

  const detail = await getPayrollPeriodDetail(id);

  if (!detail) notFound();

  return (
    <AdminShell
      title="Payroll Period"
      description="Review payroll period snapshots, employee approvals, exports, and package generation."
    >
      <PayrollPeriodDetailManager detail={detail} />
    </AdminShell>
  );
}
