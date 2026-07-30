import { differenceInDays, isAfter, isBefore, parseISO } from "date-fns";

/**
 * Indian Financial Year: April 1 (Year X) → March 31 (Year X+1)
 * e.g., "2023-2024" = Apr 1 2023 – Mar 31 2024
 */

export interface FYSegment {
  financialYear: string;
  daysInIndia: number;
  arrivalDate: Date;
  departureDate: Date;
}

/**
 * Returns the FY label for a given date.
 * e.g., Jan 15 2024 → "2023-2024"
 *       Aug 11 2023 → "2023-2024"
 *       Mar 31 2024 → "2023-2024"
 *       Apr 1  2024 → "2024-2025"
 */
export function getFY(date: Date): string {
  const month = date.getMonth(); // 0-indexed; March = 2, April = 3
  const year = date.getFullYear();
  const fyStartYear = month >= 3 ? year : year - 1;
  return `${fyStartYear}-${fyStartYear + 1}`;
}

/**
 * Formats a FY string "2023-2024" into short label "23-24"
 */
export function formatFYShort(fy: string): string {
  const [start, end] = fy.split("-");
  return `${start.slice(2)}-${end.slice(2)}`;
}

/**
 * Returns the FY boundary dates for a given FY string.
 */
export function getFYBounds(fy: string): { start: Date; end: Date } {
  const [startYear] = fy.split("-").map(Number);
  return {
    start: new Date(startYear, 3, 1),     // April 1
    end: new Date(startYear + 1, 2, 31),  // March 31
  };
}

/**
 * Returns the current Financial Year label.
 */
export function getCurrentFY(): string {
  return getFY(new Date());
}

/**
 * Returns the last (previous) Financial Year label.
 */
export function getLastFY(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const fyStartYear = (month >= 3 ? year : year - 1) - 1;
  return `${fyStartYear}-${fyStartYear + 1}`;
}

/**
 * Returns an array of the N financial years before the given FY (exclusive).
 * e.g., getPrecedingFYs("2024-2025", 4) → ["2023-2024","2022-2023","2021-2022","2020-2021"]
 */
export function getPrecedingFYs(fy: string, count: number): string[] {
  const [startYear] = fy.split("-").map(Number);
  const result: string[] = [];
  for (let i = 1; i <= count; i++) {
    const y = startYear - i;
    result.push(`${y}-${y + 1}`);
  }
  return result;
}

/**
 * Calculates the number of days in India.
 * Rule: arrival day counts, departure day does NOT.
 * e.g., Aug 11 → Aug 27 = 16 days
 */
export function calcDays(arrival: Date, departure: Date): number {
  const diff = differenceInDays(departure, arrival);
  if (
    diff === 0 &&
    arrival.getFullYear() === departure.getFullYear() &&
    arrival.getMonth() === departure.getMonth() &&
    arrival.getDate() === departure.getDate()
  ) {
    return 1;
  }
  return diff;
}

/**
 * Splits a trip across FY boundaries.
 * Returns one or two FYSegments depending on whether the trip spans April 1.
 *
 * Example: arrival=Mar 25 2024, departure=Apr 10 2024
 *   → Segment 1: "2023-2024", Mar 25 → Mar 31+1=Apr 1 (7 days)
 *   → Segment 2: "2024-2025", Apr 1 → Apr 10 (9 days)
 */
export function splitTripByFY(arrival: Date, departure: Date): FYSegment[] {
  const arrFY = getFY(arrival);
  const depFY = getFY(departure);

  // Simple case: entire trip within one FY
  if (arrFY === depFY) {
    return [
      {
        financialYear: arrFY,
        daysInIndia: calcDays(arrival, departure),
        arrivalDate: arrival,
        departureDate: departure,
      },
    ];
  }

  // Trip spans FY boundary — find April 1 of the new FY
  const [arrFYStart] = arrFY.split("-").map(Number);
  const fyBoundary = new Date(arrFYStart + 1, 3, 1); // April 1 of next year

  const daysInFirstFY = calcDays(arrival, fyBoundary);
  const daysInSecondFY = calcDays(fyBoundary, departure);

  const segments: FYSegment[] = [];

  if (daysInFirstFY > 0) {
    segments.push({
      financialYear: arrFY,
      daysInIndia: daysInFirstFY,
      arrivalDate: arrival,
      departureDate: fyBoundary,
    });
  }

  if (daysInSecondFY > 0) {
    segments.push({
      financialYear: depFY,
      daysInIndia: daysInSecondFY,
      arrivalDate: fyBoundary,
      departureDate: departure,
    });
  }

  return segments;
}

/**
 * Generates the formatted copy-paste summary text for SANJITH and NISHA.
 * memberDays: Record<memberName, Record<FY, days>>
 */
export function generateSummaryText(
  memberDays: Record<string, Record<string, number>>,
  years: string[]
): string {
  const members = ["SANJITH", "NISHA"];
  const lines: string[] = [];

  for (const member of members) {
    lines.push(member);
    const fyMap = memberDays[member] ?? {};

    for (const fy of years) {
      const days = fyMap[fy] ?? 0;
      lines.push(`${formatFYShort(fy)} - ${days}`);
    }

    lines.push(""); // blank line between members
  }

  return lines.join("\n").trimEnd();
}

/**
 * Flexibly parses date text copied from Excel, CSV, or clipboard into YYYY-MM-DD format.
 * Supports:
 *  - Excel serial numbers (e.g. 45514)
 *  - YYYY-MM-DD / YYYY/MM/DD
 *  - DD/MM/YYYY / DD-MM-YYYY / DD.MM.YYYY
 *  - DD-MMM-YYYY / 11 Aug 2024 / 11 August 2024
 */
export function parsePastedDate(text: string): string | null {
  if (!text) return null;
  const cleaned = text.trim();

  // 1. Excel serial number (e.g. 45514)
  if (/^\d{5}$/.test(cleaned)) {
    const serial = parseInt(cleaned, 10);
    const utcDays = serial - 25569;
    const date = new Date(utcDays * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split("T")[0];
    }
  }

  // 2. YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(cleaned)) {
    const d = new Date(cleaned.replace(/\./g, "-").replace(/\//g, "-"));
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmmyyyy = cleaned.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
  if (ddmmyyyy) {
    const p1 = parseInt(ddmmyyyy[1], 10);
    const p2 = parseInt(ddmmyyyy[2], 10);
    const year = parseInt(ddmmyyyy[3], 10);
    let day = p1;
    let month = p2;
    if (p1 <= 12 && p2 > 12) {
      day = p2;
      month = p1;
    }
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
  }

  // 4. Fallback JS Date parse (e.g. 11-Aug-2024, Aug 11 2024)
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

