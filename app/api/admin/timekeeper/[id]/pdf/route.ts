import { generateTimecardPdf } from "@/lib/pdf/timecardPdf";
import { getStaffAssignedPermissions } from "@/lib/staff/permissionGuard";
import { getEffectivePermissions, hasPermission } from "@/lib/staff/permissionHelpers";
import { getAuthenticatedStaffReadOnlyResult } from "@/lib/staff/staffAuthService";
import {
  getExceptionsForTimecard,
  getPunchesForTimecard,
  getTimecardById,
} from "@/lib/data/timekeeperRepository";

type TimecardPdfRouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function safeFilenamePart(value: string | null | undefined) {
  return (value || "timecard")
    .trim()
    .replace(/[^a-z0-9-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
}

function textResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function canReadAllTimekeeper() {
  const result = await getAuthenticatedStaffReadOnlyResult();

  if (!result.ok) {
    return { ok: false as const, status: 401 };
  }

  const assignments = await getStaffAssignedPermissions(result.staff.staffId);
  const permissions = getEffectivePermissions(result.staff.role, assignments);

  if (!hasPermission(permissions, "timekeeper.view_all")) {
    return { ok: false as const, status: 403 };
  }

  return { ok: true as const };
}

export async function GET(_request: Request, { params }: TimecardPdfRouteContext) {
  const auth = await canReadAllTimekeeper();

  if (!auth.ok) {
    return textResponse(
      auth.status === 401 ? "Staff session required." : "Access denied.",
      auth.status,
    );
  }

  const { id } = await params;

  if (!id || !isUuidLike(id)) {
    return textResponse("Timecard not found.", 404);
  }

  try {
    const timecard = await getTimecardById(id);

    if (!timecard) {
      return textResponse("Timecard not found.", 404);
    }

    const [punches, exceptions] = await Promise.all([
      getPunchesForTimecard(timecard.id),
      getExceptionsForTimecard(timecard.id),
    ]);
    const pdfBytes = await generateTimecardPdf({ timecard, punches, exceptions });
    const pdfBody = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(pdfBody).set(pdfBytes);
    const employeeNumber = safeFilenamePart(timecard.staff_member?.employee_number);
    const workDate = safeFilenamePart(timecard.work_date);
    const filename = `ASHE-TOKUN-Timecard-${employeeNumber}-${workDate}.pdf`;

    return new Response(pdfBody, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Timekeeper PDF] PDF generation failed", {
      timecardId: id,
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return textResponse("Unable to generate timecard PDF.", 500);
  }
}
