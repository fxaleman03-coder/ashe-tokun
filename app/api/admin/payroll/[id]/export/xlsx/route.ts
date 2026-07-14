import { getPayrollExportRows, isUuidLike, payrollPeriodFilename } from "@/lib/data/payrollRepository";
import { writePayrollEvent } from "@/lib/data/payrollMutations";
import { payrollRowsToXlsx } from "@/lib/payroll/payrollExport";
import { bytesResponse, requirePayrollRoutePermission, textResponse } from "@/lib/payroll/payrollAuth";

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
    const bytes = payrollRowsToXlsx(rows);

    await writePayrollEvent({
      payrollPeriodId: period.id,
      actorStaffId: auth.staff.staffId,
      eventType: "excel_exported",
      metadata: { rowCount: rows.length },
    });

    return bytesResponse(bytes, {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${payrollPeriodFilename(period, "xlsx")}"`,
    });
  } catch (error) {
    console.error("[Payroll Excel Export] Export failed", {
      payrollPeriodId: id,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return textResponse("Unable to export payroll Excel file.", 500);
  }
}
