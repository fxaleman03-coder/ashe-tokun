import "server-only";

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { PayrollPeriodDetail, PayrollPeriodEmployee } from "@/lib/types/payroll";
import { formatDate } from "@/lib/utils/dateTimeDisplay";
import { minutesToDecimalHours } from "@/lib/data/payrollRepository";

type PdfContext = {
  doc: PDFDocument;
  page: PDFPage;
  regular: PDFFont;
  bold: PDFFont;
  y: number;
};

const pageWidth = 612;
const pageHeight = 792;
const margin = 42;
const contentWidth = pageWidth - margin * 2;
const black = rgb(0.08, 0.07, 0.06);
const gold = rgb(0.65, 0.42, 0.12);
const pale = rgb(0.96, 0.92, 0.86);
const border = rgb(0.78, 0.71, 0.62);

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function employeeName(employee: PayrollPeriodEmployee) {
  const staff = employee.staff_member;

  if (!staff) return `Employee ${employee.staff_member_id.slice(0, 8)}`;

  return (
    staff.display_name ||
    `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() ||
    staff.employee_number
  );
}

function drawText(
  context: PdfContext,
  text: string,
  x: number,
  y: number,
  options: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxWidth?: number } = {},
) {
  context.page.drawText(cleanText(text), {
    x,
    y,
    size: options.size ?? 9,
    font: options.font ?? context.regular,
    color: options.color ?? black,
    maxWidth: options.maxWidth,
  });
}

function addPage(context: PdfContext) {
  context.page = context.doc.addPage([pageWidth, pageHeight]);
  context.y = pageHeight - margin;
}

function ensureSpace(context: PdfContext, needed: number) {
  if (context.y - needed < margin) addPage(context);
}

function drawSectionTitle(context: PdfContext, title: string) {
  ensureSpace(context, 28);
  context.y -= 18;
  drawText(context, title, margin, context.y, {
    size: 12,
    font: context.bold,
    color: gold,
  });
  context.page.drawLine({
    start: { x: margin, y: context.y - 6 },
    end: { x: pageWidth - margin, y: context.y - 6 },
    thickness: 0.8,
    color: border,
  });
  context.y -= 18;
}

function drawKeyValues(context: PdfContext, rows: Array<[string, string]>) {
  const columnWidth = contentWidth / 2;

  for (let index = 0; index < rows.length; index += 2) {
    ensureSpace(context, 32);
    const row = rows.slice(index, index + 2);
    row.forEach(([label, value], columnIndex) => {
      const x = margin + columnIndex * columnWidth;
      drawText(context, label.toUpperCase(), x, context.y, {
        size: 7,
        font: context.bold,
        color: gold,
      });
      drawText(context, value, x, context.y - 12, {
        size: 9,
        maxWidth: columnWidth - 14,
      });
    });
    context.y -= 32;
  }
}

function drawEmployeeTable(context: PdfContext, employees: PayrollPeriodEmployee[]) {
  const widths = [68, 150, 70, 70, 70, 80];
  const headers = ["Employee #", "Employee", "Regular", "Overtime", "Total", "Status"];

  function drawHeader() {
    ensureSpace(context, 28);
    context.page.drawRectangle({
      x: margin,
      y: context.y - 18,
      width: contentWidth,
      height: 18,
      color: pale,
      borderColor: border,
      borderWidth: 0.5,
    });
    let x = margin;
    headers.forEach((header, index) => {
      drawText(context, header, x + 4, context.y - 12, {
        size: 7,
        font: context.bold,
        color: gold,
        maxWidth: widths[index] - 8,
      });
      x += widths[index];
    });
    context.y -= 22;
  }

  drawHeader();

  for (const employee of employees) {
    ensureSpace(context, 24);
    if (context.y < margin + 34) drawHeader();

    const values = [
      employee.staff_member?.employee_number ?? "Pending",
      employeeName(employee),
      minutesToDecimalHours(employee.regular_minutes),
      minutesToDecimalHours(employee.overtime_minutes),
      minutesToDecimalHours(employee.total_minutes),
      employee.status,
    ];
    let x = margin;

    values.forEach((value, index) => {
      drawText(context, value, x + 4, context.y, {
        size: 8,
        maxWidth: widths[index] - 8,
      });
      x += widths[index];
    });

    context.page.drawLine({
      start: { x: margin, y: context.y - 6 },
      end: { x: pageWidth - margin, y: context.y - 6 },
      thickness: 0.35,
      color: border,
    });
    context.y -= 18;
  }
}

export async function generatePayrollPeriodPdf(detail: PayrollPeriodDetail) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([pageWidth, pageHeight]);
  const context: PdfContext = {
    doc,
    page,
    regular,
    bold,
    y: pageHeight - margin,
  };

  drawText(context, "ASHE TOKUN", margin, context.y, {
    size: 18,
    font: bold,
    color: gold,
  });
  context.y -= 20;
  drawText(context, "Official Payroll Period Summary", margin, context.y, {
    size: 13,
    font: bold,
  });
  context.y -= 16;
  drawText(context, "Approved timecard aggregation only. No wages, taxes, deductions, or payments.", margin, context.y, {
    size: 8,
    color: black,
  });

  drawSectionTitle(context, "Period");
  drawKeyValues(context, [
    ["Name", detail.period.period_name],
    ["Type", detail.period.period_type.replaceAll("_", " ")],
    ["Start Date", formatDate(detail.period.start_date)],
    ["End Date", formatDate(detail.period.end_date)],
    ["Pay Date", formatDate(detail.period.pay_date)],
    ["Status", detail.period.status],
    ["Location", detail.period.location_name ?? "All locations"],
    ["Notes", detail.period.notes ?? "None"],
  ]);

  drawSectionTitle(context, "Totals");
  drawKeyValues(context, [
    ["Employees", String(detail.metrics.employee_count)],
    ["Total Regular Hours", minutesToDecimalHours(detail.metrics.regular_minutes)],
    ["Total Overtime Hours", minutesToDecimalHours(detail.metrics.overtime_minutes)],
    ["Total Payroll Hours", minutesToDecimalHours(detail.metrics.total_minutes)],
  ]);

  drawSectionTitle(context, "Employees");
  drawEmployeeTable(context, detail.employees);

  drawSectionTitle(context, "Approval");
  drawKeyValues(context, [
    ["Approved By", detail.period.approved_by_staff_id ? "Recorded in staff system" : "Pending"],
    ["Approved Date", formatDate(detail.period.approved_at)],
    ["Closed By", detail.period.closed_by_staff_id ? "Recorded in staff system" : "Pending"],
    ["Closed Date", formatDate(detail.period.closed_at)],
  ]);

  return doc.save();
}
