import ExcelJS from "exceljs";
import { format } from "date-fns";

export interface TripRow {
  memberName: string;
  arrivalDate: Date;
  departureDate: Date;
  daysInIndia: number;
  financialYear: string;
}

const MEMBERS = ["SANJITH", "NISHA", "NEHA", "NETRA"];

// Color palette
const COLORS = {
  headerBg: "FF1A1A2E",      // Deep navy
  memberHeader: "FF16213E",   // Dark blue
  accentGold: "FFE2B96E",    // Soft gold
  accentBlue: "FF4FC3F7",    // Sky blue
  totalRowBg: "FF0F3460",    // Deeper navy
  white: "FFFFFFFF",
  lightGray: "FFF5F5F5",
  subtleLine: "FFE0E0E0",
};

function fyToCalendarYear(fy: string): number {
  // "2023-2024" → key year is 2023 (the April start)
  return parseInt(fy.split("-")[0]);
}

export async function buildExcelWorkbook(trips: TripRow[]): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "India Tax Tracker";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Group trips by financial year
  const byFY: Record<string, TripRow[]> = {};
  for (const trip of trips) {
    if (!byFY[trip.financialYear]) byFY[trip.financialYear] = [];
    byFY[trip.financialYear].push(trip);
  }

  // Sort FYs ascending
  const sortedFYs = Object.keys(byFY).sort();

  for (const fy of sortedFYs) {
    const yearLabel = fyToCalendarYear(fy).toString();
    const sheet = workbook.addWorksheet(yearLabel, {
      views: [{ state: "frozen", ySplit: 3 }],
      properties: { tabColor: { argb: COLORS.headerBg.slice(2) } },
    });

    // ---------- Column widths ----------
    // S.No | Member columns (ARR, DEP, DAYS × 4 members) | Notes
    sheet.columns = [
      { key: "sno", width: 6 },
      // SANJITH
      { key: "s_arr", width: 14 },
      { key: "s_dep", width: 14 },
      { key: "s_days", width: 8 },
      // NISHA
      { key: "n_arr", width: 14 },
      { key: "n_dep", width: 14 },
      { key: "n_days", width: 8 },
      // NEHA
      { key: "nh_arr", width: 14 },
      { key: "nh_dep", width: 14 },
      { key: "nh_days", width: 8 },
      // NETRA
      { key: "ne_arr", width: 14 },
      { key: "ne_dep", width: 14 },
      { key: "ne_days", width: 8 },
    ];

    // ---------- Row 1: FY Title ----------
    const titleRow = sheet.addRow([`INDIA TRAVEL — Financial Year ${fy}`]);
    sheet.mergeCells(1, 1, 1, 13);
    const titleCell = sheet.getCell(1, 1);
    titleCell.font = { name: "Calibri", bold: true, size: 16, color: { argb: COLORS.accentGold.slice(2) } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerBg.slice(2) } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 30;

    // ---------- Row 2: Member headers ----------
    const memberRow = sheet.addRow(["#", ...MEMBERS.flatMap((m) => [m, "", ""])]);
    // Merge cells for each member name across ARR/DEP/DAYS
    const memberStartCols = [2, 5, 8, 11];
    memberStartCols.forEach((startCol) => {
      sheet.mergeCells(2, startCol, 2, startCol + 2);
    });
    memberRow.height = 22;
    memberRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", bold: true, size: 12, color: { argb: COLORS.white.slice(2) } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.memberHeader.slice(2) } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      if (colNumber > 1) {
        cell.border = {
          left: { style: "medium", color: { argb: COLORS.accentGold.slice(2) } },
          right: { style: "medium", color: { argb: COLORS.accentGold.slice(2) } },
        };
      }
    });

    // ---------- Row 3: Sub-headers (ARR / DEP / DAYS) ----------
    const subRow = sheet.addRow(["", ...MEMBERS.flatMap(() => ["ARRIVAL", "DEPARTURE", "DAYS"])]);
    subRow.height = 18;
    subRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", bold: true, size: 10, color: { argb: COLORS.accentBlue.slice(2) } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D2137" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        bottom: { style: "thin", color: { argb: COLORS.accentGold.slice(2) } },
      };
    });

    // ---------- Data rows ----------
    // Group trips by "trip number" — align by row across members
    const memberTrips: Record<string, TripRow[]> = {};
    for (const m of MEMBERS) {
      memberTrips[m] = byFY[fy].filter((t) => t.memberName === m);
    }
    const maxRows = Math.max(...MEMBERS.map((m) => memberTrips[m].length), 0);

    const dayTotals: Record<string, number> = {};
    for (const m of MEMBERS) {
      dayTotals[m] = memberTrips[m].reduce((acc, t) => acc + t.daysInIndia, 0);
    }

    for (let i = 0; i < maxRows; i++) {
      const rowData: (string | number)[] = [i + 1];
      for (const m of MEMBERS) {
        const trip = memberTrips[m][i];
        if (trip) {
          rowData.push(
            format(trip.arrivalDate, "dd-MMM-yyyy"),
            format(trip.departureDate, "dd-MMM-yyyy"),
            trip.daysInIndia
          );
        } else {
          rowData.push("", "", "");
        }
      }
      const dataRow = sheet.addRow(rowData);
      dataRow.height = 16;
      dataRow.eachCell((cell, colNumber) => {
        const isAlt = i % 2 === 1;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isAlt ? "FF12203A" : "FF0A1628" },
        };
        cell.font = { name: "Calibri", size: 10, color: { argb: COLORS.white.slice(2) } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        // Highlight DAYS columns
        if ((colNumber - 2) % 3 === 2 && colNumber > 1) {
          cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: COLORS.accentGold.slice(2) } };
        }
      });
    }

    // ---------- TOTAL DAYS row ----------
    const totalRowData: (string | number)[] = ["TOTAL"];
    for (const m of MEMBERS) {
      totalRowData.push("", "", dayTotals[m]);
    }
    const totalRow = sheet.addRow(totalRowData);
    totalRow.height = 20;
    totalRow.eachCell((cell, colNumber) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.totalRowBg.slice(2) } };
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: COLORS.accentGold.slice(2) } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "medium", color: { argb: COLORS.accentGold.slice(2) } },
        bottom: { style: "medium", color: { argb: COLORS.accentGold.slice(2) } },
      };
    });
    // Merge TOTAL label across first 4 cells (S.No + ARR/DEP for SANJITH)
    sheet.mergeCells(totalRow.number, 1, totalRow.number, 1);
  }

  return workbook.xlsx.writeBuffer();
}
