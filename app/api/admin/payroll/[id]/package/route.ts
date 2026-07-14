import { generateTimecardPdf } from "@/lib/pdf/timecardPdf";
import {
  getPayrollExportRows,
  getPayrollPackageTimecardIds,
  getPayrollPeriodDetail,
  isUuidLike,
  payrollPeriodFilename,
} from "@/lib/data/payrollRepository";
import { writePayrollEvent } from "@/lib/data/payrollMutations";
import { getExceptionsForTimecard, getPunchesForTimecard, getTimecardById } from "@/lib/data/timekeeperRepository";
import { requirePayrollRoutePermission, bytesResponse, textResponse } from "@/lib/payroll/payrollAuth";
import { payrollRowsToCsv, payrollRowsToXlsx } from "@/lib/payroll/payrollExport";
import { generatePayrollPeriodPdf } from "@/lib/pdf/payrollPeriodPdf";
import { createZip } from "@/lib/utils/zipBuilder";

type PayrollPackageRouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function safePart(value: string | null | undefined) {
  return (value || "timecard")
    .trim()
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
}

export async function GET(_request: Request, { params }: PayrollPackageRouteContext) {
  const auth = await requirePayrollRoutePermission("payroll.generate_package");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuidLike(id)) {
    return textResponse("Payroll period not found. A persisted payroll period UUID is required.", 404);
  }

  try {
    const [detail, exportData, packageData] = await Promise.all([
      getPayrollPeriodDetail(id),
      getPayrollExportRows(id),
      getPayrollPackageTimecardIds(id),
    ]);

    if (!detail) return textResponse("Payroll period not found.", 404);

    const periodPdf = await generatePayrollPeriodPdf(detail);
    const csv = payrollRowsToCsv(exportData.rows);
    const xlsx = payrollRowsToXlsx(exportData.rows);
    const files = [
      { name: payrollPeriodFilename(detail.period, "pdf"), data: periodPdf },
      { name: payrollPeriodFilename(detail.period, "csv"), data: csv },
      { name: payrollPeriodFilename(detail.period, "xlsx"), data: xlsx },
    ];

    for (const timecardId of packageData.timecardIds) {
      const timecard = await getTimecardById(timecardId);
      if (!timecard) continue;

      const [punches, exceptions] = await Promise.all([
        getPunchesForTimecard(timecard.id),
        getExceptionsForTimecard(timecard.id),
      ]);
      const pdf = await generateTimecardPdf({ timecard, punches, exceptions });
      const employee = safePart(timecard.staff_member?.employee_number);
      const workDate = safePart(timecard.work_date);

      files.push({
        name: `Timecards/ASHE-TOKUN-Timecard-${employee}-${workDate}.pdf`,
        data: pdf,
      });
    }

    const zip = createZip(files);

    await writePayrollEvent({
      payrollPeriodId: detail.period.id,
      actorStaffId: auth.staff.staffId,
      eventType: "package_generated",
      metadata: { fileCount: files.length },
    });

    return bytesResponse(zip, {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ASHE-TOKUN-Payroll-Package-${detail.period.start_date}-to-${detail.period.end_date}.zip"`,
    });
  } catch (error) {
    console.error("[Payroll Package] Package generation failed", {
      payrollPeriodId: id,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return textResponse("Unable to generate payroll package.", 500);
  }
}
