import "server-only";

import type { PayrollExportRow } from "@/lib/types/payroll";
import { createZip } from "@/lib/utils/zipBuilder";

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function payrollRowsToCsv(rows: PayrollExportRow[]) {
  const headers = [
    "Employee Number",
    "Employee Name",
    "Business Title",
    "Period Start",
    "Period End",
    "Regular Hours",
    "Overtime Hours",
    "Total Hours",
    "Payroll Status",
    "Location",
  ];
  const lines = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.employeeNumber,
        row.employeeName,
        row.businessTitle,
        row.periodStart,
        row.periodEnd,
        row.regularHours,
        row.overtimeHours,
        row.totalHours,
        row.payrollStatus,
        row.location,
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function escapeXml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let value = "";
  let current = index;

  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }

  return value;
}

function cell(value: string | number, rowIndex: number, columnIndex: number) {
  const reference = `${columnName(columnIndex)}${rowIndex}`;

  if (typeof value === "number") {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }

  return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

export function payrollRowsToXlsx(rows: PayrollExportRow[]) {
  const headers = [
    "Employee Number",
    "Employee Name",
    "Business Title",
    "Location",
    "Period Start",
    "Period End",
    "Regular Hours",
    "Overtime Hours",
    "Total Hours",
    "Payroll Status",
  ];
  const dataRows = rows.map((row) => [
    row.employeeNumber,
    row.employeeName,
    row.businessTitle,
    row.location,
    row.periodStart,
    row.periodEnd,
    Number(row.regularHours),
    Number(row.overtimeHours),
    Number(row.totalHours),
    row.payrollStatus,
  ]);
  const sheetRows = [
    `<row r="1">${headers.map((value, index) => cell(value, 1, index + 1)).join("")}</row>`,
    ...dataRows.map(
      (values, rowOffset) =>
        `<row r="${rowOffset + 2}">${values
          .map((value, index) => cell(value, rowOffset + 2, index + 1))
          .join("")}</row>`,
    ),
  ];
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${headers.map((header, index) => `<col min="${index + 1}" max="${index + 1}" width="${Math.max(14, header.length + 4)}" customWidth="1"/>`).join("")}</cols>
  <sheetData>${sheetRows.join("")}</sheetData>
</worksheet>`;
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Payroll" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="1"><xf/></cellXfs></styleSheet>`;

  return createZip([
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: "xl/workbook.xml", data: workbook },
    { name: "xl/worksheets/sheet1.xml", data: worksheet },
    { name: "xl/styles.xml", data: styles },
  ]);
}
