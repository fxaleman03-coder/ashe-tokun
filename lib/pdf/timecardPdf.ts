import "server-only";

import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import type {
  StaffPunch,
  StaffTimecard,
  StaffTimecardException,
} from "@/lib/types/timekeeper";
import {
  formatPunchType,
  formatWorkedDuration,
  sortPunches,
} from "@/lib/timekeeper/timekeeperHelpers";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils/dateTimeDisplay";

type TimecardPdfInput = {
  timecard: StaffTimecard;
  punches: StaffPunch[];
  exceptions: StaffTimecardException[];
};

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
const lineHeight = 12;
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

function titleCase(value: string | null | undefined) {
  return cleanText(value || "Not assigned")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function minutesToDecimalHours(minutes: number) {
  return (minutes / 60).toFixed(2);
}

function formatPayrollHours(minutes: number) {
  return `${formatWorkedDuration(minutes)} / ${minutesToDecimalHours(minutes)} hrs`;
}

function staffDisplayName(timecard: StaffTimecard) {
  const staff = timecard.staff_member;

  if (!staff) return `Employee ${timecard.staff_member_id.slice(0, 8)}`;

  return (
    staff.display_name ||
    `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() ||
    staff.employee_number
  );
}

function staffBusinessTitle(timecard: StaffTimecard) {
  return timecard.staff_member?.business_title?.trim() || "Not assigned";
}

function firstClockIn(punches: StaffPunch[]) {
  return sortPunches(punches).find((punch) =>
    ["clock_in", "manual_in"].includes(punch.punch_type),
  );
}

function lastClockOut(punches: StaffPunch[]) {
  return [...sortPunches(punches)]
    .reverse()
    .find((punch) => ["clock_out", "manual_out"].includes(punch.punch_type));
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = cleanText(text).split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);

  return lines.length > 0 ? lines : [""];
}

function addPage(context: PdfContext) {
  context.page = context.doc.addPage([pageWidth, pageHeight]);
  context.y = pageHeight - margin;
}

function ensureSpace(context: PdfContext, needed: number) {
  if (context.y - needed < margin) {
    addPage(context);
  }
}

function drawText(
  context: PdfContext,
  text: string,
  x: number,
  y: number,
  options: {
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
    maxWidth?: number;
  } = {},
) {
  context.page.drawText(cleanText(text), {
    x,
    y,
    size: options.size ?? 10,
    font: options.font ?? context.regular,
    color: options.color ?? black,
    maxWidth: options.maxWidth,
  });
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

function drawKeyValueGrid(context: PdfContext, rows: Array<[string, string]>, columns = 2) {
  const columnWidth = contentWidth / columns;

  for (let index = 0; index < rows.length; index += columns) {
    ensureSpace(context, 34);
    const rowItems = rows.slice(index, index + columns);
    const rowTop = context.y;

    rowItems.forEach(([label, value], columnIndex) => {
      const x = margin + columnIndex * columnWidth;
      drawText(context, label.toUpperCase(), x, rowTop, {
        size: 7,
        font: context.bold,
        color: gold,
      });
      const lines = wrapText(value, context.regular, 9, columnWidth - 14);
      lines.slice(0, 2).forEach((line, lineIndex) => {
        drawText(context, line, x, rowTop - 12 - lineIndex * lineHeight, {
          size: 9,
          maxWidth: columnWidth - 14,
        });
      });
    });

    context.y -= 34;
  }
}

function drawTable(
  context: PdfContext,
  headers: string[],
  rows: string[][],
  widths: number[],
) {
  const cellPadding = 5;
  const fontSize = 8;
  const headerHeight = 18;

  function drawHeader() {
    ensureSpace(context, headerHeight + 12);
    let x = margin;
    context.page.drawRectangle({
      x: margin,
      y: context.y - headerHeight + 4,
      width: contentWidth,
      height: headerHeight,
      color: pale,
      borderColor: border,
      borderWidth: 0.5,
    });

    headers.forEach((header, index) => {
      drawText(context, header, x + cellPadding, context.y - 8, {
        size: 7,
        font: context.bold,
        color: gold,
        maxWidth: widths[index] - cellPadding * 2,
      });
      x += widths[index];
    });

    context.y -= headerHeight;
  }

  drawHeader();

  if (rows.length === 0) {
    rows = [["None recorded.", ...headers.slice(1).map(() => "")]];
  }

  for (const row of rows) {
    const wrapped = row.map((cell, index) =>
      wrapText(cell, context.regular, fontSize, widths[index] - cellPadding * 2),
    );
    const rowHeight = Math.max(22, Math.max(...wrapped.map((lines) => lines.length)) * 10 + 10);

    if (context.y - rowHeight < margin) {
      addPage(context);
      drawHeader();
    }

    let x = margin;
    context.page.drawRectangle({
      x: margin,
      y: context.y - rowHeight + 4,
      width: contentWidth,
      height: rowHeight,
      borderColor: border,
      borderWidth: 0.4,
    });

    wrapped.forEach((lines, columnIndex) => {
      lines.forEach((line, lineIndex) => {
        drawText(context, line, x + cellPadding, context.y - 8 - lineIndex * 10, {
          size: fontSize,
          maxWidth: widths[columnIndex] - cellPadding * 2,
        });
      });
      x += widths[columnIndex];
    });

    context.y -= rowHeight;
  }
}

function drawFooter(context: PdfContext) {
  const pages = context.doc.getPages();

  pages.forEach((page, index) => {
    page.drawLine({
      start: { x: margin, y: 30 },
      end: { x: pageWidth - margin, y: 30 },
      thickness: 0.5,
      color: border,
    });
    page.drawText("ASHE TOKUN Timekeeper / Official Payroll Timecard", {
      x: margin,
      y: 18,
      size: 8,
      font: context.regular,
      color: black,
    });
    page.drawText("Generated automatically by the ASHE TOKUN Timekeeper System.", {
      x: margin,
      y: 8,
      size: 7,
      font: context.regular,
      color: black,
    });
    page.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: pageWidth - margin - 60,
      y: 18,
      size: 8,
      font: context.regular,
      color: black,
    });
  });
}

export async function generateTimecardPdf({
  timecard,
  punches,
}: TimecardPdfInput) {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const context: PdfContext = {
    doc,
    page: doc.addPage([pageWidth, pageHeight]),
    regular,
    bold,
    y: pageHeight - margin,
  };
  const sortedPunches = sortPunches(punches);
  const firstIn = firstClockIn(sortedPunches);
  const lastOut = lastClockOut(sortedPunches);

  drawText(context, "ASHE TOKUN", margin, context.y, {
    size: 13,
    font: bold,
    color: gold,
  });
  context.y -= 24;
  drawText(context, "Official Payroll Timecard", margin, context.y, {
    size: 26,
    font: bold,
  });
  context.y -= 18;
  drawText(context, "Payable hours record for payroll, accounting, employee records, and management approval.", margin, context.y, {
    size: 9,
    color: black,
  });

  drawSectionTitle(context, "Employee Information");
  drawKeyValueGrid(context, [
    ["Employee Number", timecard.staff_member?.employee_number ?? "Employee"],
    ["Employee Name", staffDisplayName(timecard)],
    ["Business Title", staffBusinessTitle(timecard)],
    ["Location / Jobsite", timecard.location_name ?? timecard.shift?.location_name ?? "Not assigned"],
    ["Work Date", formatDate(timecard.work_date)],
  ]);

  const isCompleteTimecard = Boolean(firstIn && lastOut);
  const incompleteLabel = "Incomplete Timecard";
  const totalWorkedMinutes = timecard.regular_minutes + timecard.overtime_minutes;

  drawSectionTitle(context, "Payroll Summary");
  drawKeyValueGrid(context, [
    [
      "Scheduled Shift",
      timecard.scheduled_start_time && timecard.scheduled_end_time
        ? `${formatTime(timecard.scheduled_start_time)} - ${formatTime(timecard.scheduled_end_time)}`
        : "Not scheduled",
    ],
    ["First Clock In", firstIn ? formatDateTime(firstIn.punched_at) : "Pending"],
    ["Last Clock Out", lastOut ? formatDateTime(lastOut.punched_at) : "Pending"],
    ["Regular Hours", isCompleteTimecard ? formatPayrollHours(timecard.regular_minutes) : incompleteLabel],
    ["Overtime Hours", isCompleteTimecard ? formatPayrollHours(timecard.overtime_minutes) : incompleteLabel],
    ["Total Hours Worked", isCompleteTimecard ? formatPayrollHours(totalWorkedMinutes) : incompleteLabel],
    ["Approval Status", timecard.approved_at ? "Approved" : "Pending Approval"],
  ]);

  drawSectionTitle(context, "Punch Timeline");
  drawTable(
    context,
    ["Punch Type", "Date", "Time", "Source", "Correction", "Notes"],
    sortedPunches.map((punch) => [
      formatPunchType(punch.punch_type),
      formatDate(punch.punched_at),
      formatDateTime(punch.punched_at).split(" at ")[1] ?? formatDateTime(punch.punched_at),
      titleCase(punch.source),
      punch.is_correction ? punch.correction_reason ?? "Correction" : "No",
      punch.notes ?? "",
    ]),
    [82, 82, 70, 76, 82, contentWidth - 392],
  );

  drawSectionTitle(context, "Approval");
  drawKeyValueGrid(context, [
    ["Approval Status", timecard.approved_at ? "Approved" : "Pending Approval"],
    ["Approved By", timecard.approved_by?.display_name ?? "Pending"],
    ["Approved Date", timecard.approved_at ? formatDateTime(timecard.approved_at) : "Pending"],
    ["Manager Notes", timecard.manager_notes ?? "None"],
  ]);

  drawFooter(context);

  return doc.save();
}
