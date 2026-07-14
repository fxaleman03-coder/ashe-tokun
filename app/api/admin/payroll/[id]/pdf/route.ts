import { getPayrollPeriodDetail, isUuidLike, payrollPeriodFilename } from "@/lib/data/payrollRepository";
import { writePayrollEvent } from "@/lib/data/payrollMutations";
import { requirePayrollRoutePermission, bytesResponse, textResponse } from "@/lib/payroll/payrollAuth";
import { generatePayrollPeriodPdf } from "@/lib/pdf/payrollPeriodPdf";

type PayrollPdfRouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: PayrollPdfRouteContext) {
  const auth = await requirePayrollRoutePermission("payroll.export");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isUuidLike(id)) {
    return textResponse("Payroll period not found. A persisted payroll period UUID is required.", 404);
  }

  try {
    const detail = await getPayrollPeriodDetail(id);
    if (!detail) return textResponse("Payroll period not found.", 404);

    const pdfBytes = await generatePayrollPeriodPdf(detail);

    await writePayrollEvent({
      payrollPeriodId: detail.period.id,
      actorStaffId: auth.staff.staffId,
      eventType: "period_pdf_generated",
      metadata: { employeeCount: detail.employees.length },
    });

    return bytesResponse(pdfBytes, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${payrollPeriodFilename(detail.period, "pdf")}"`,
    });
  } catch (error) {
    console.error("[Payroll Period PDF] PDF generation failed", {
      payrollPeriodId: id,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return textResponse("Unable to generate payroll period PDF.", 500);
  }
}
