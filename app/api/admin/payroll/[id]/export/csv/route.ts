import { getPayrollExportRows, isUuidLike, payrollPeriodFilename } from "@/lib/data/payrollRepository";
import { writePayrollEvent } from "@/lib/data/payrollMutations";
import { payrollRowsToCsv } from "@/lib/payroll/payrollExport";
import { requirePayrollRoutePermission, textResponse } from "@/lib/payroll/payrollAuth";

type PayrollExportRouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: PayrollExportRouteContext) {
  const auth = await requirePayrollRoutePermission("payroll.export");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuidLike(id)) {
    return textResponse("Payroll period not found. A persisted payroll period UUID is required.", 404);
  }

  try {
    const { period, rows } = await getPayrollExportRows(id);
    const csv = payrollRowsToCsv(rows);

    await writePayrollEvent({
      payrollPeriodId: period.id,
      actorStaffId: auth.staff.staffId,
      eventType: "csv_exported",
      metadata: { rowCount: rows.length },
    });

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${payrollPeriodFilename(period, "csv")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Payroll CSV Export] Export failed", {
      payrollPeriodId: id,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return textResponse("Unable to export payroll CSV.", 500);
  }
}
