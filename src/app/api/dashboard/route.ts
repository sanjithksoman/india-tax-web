import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentFY, getLastFY, getPrecedingFYs } from "@/lib/financialYear";

const MEMBERS = ["SANJITH", "NISHA", "NEHA", "NETRA"];

// Helper to get previous FY before a given FY
function getPreviousFY(fy: string): string {
  const [startYear] = fy.split("-").map(Number);
  const prevStart = startYear - 1;
  return `${prevStart}-${prevStart + 1}`;
}

// GET /api/dashboard?fy=2025-2026
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const realCurrentFY = getCurrentFY();
    const realLastFY = getLastFY();

    // Selected FY comes from query param or defaults to realCurrentFY
    const selectedFY = searchParams.get("fy") || realCurrentFY;
    const prevFY = getPreviousFY(selectedFY);
    const preceding4FYs = getPrecedingFYs(selectedFY, 4);

    // All relevant FYs for calculation
    const relevantFYs = Array.from(
      new Set([selectedFY, prevFY, ...preceding4FYs])
    );

    const trips = await prisma.trip.findMany({
      where: { financialYear: { in: relevantFYs } },
      include: { member: { select: { name: true } } },
    });

    // Aggregate days per member per FY
    const aggregate: Record<string, Record<string, number>> = {};
    for (const m of MEMBERS) {
      aggregate[m] = {};
      for (const fy of relevantFYs) {
        aggregate[m][fy] = 0;
      }
    }

    for (const trip of trips) {
      const name = trip.member.name;
      if (aggregate[name]) {
        aggregate[name][trip.financialYear] =
          (aggregate[name][trip.financialYear] ?? 0) + trip.daysInIndia;
      }
    }

    // Build metric outputs
    const selectedFYDays: Record<string, number> = {};
    const prevFYDays: Record<string, number> = {};
    const preceding4Total: Record<string, number> = {};

    for (const m of MEMBERS) {
      selectedFYDays[m] = aggregate[m][selectedFY] ?? 0;
      prevFYDays[m] = aggregate[m][prevFY] ?? 0;
      preceding4Total[m] = preceding4FYs.reduce(
        (acc, fy) => acc + (aggregate[m][fy] ?? 0),
        0
      );
    }

    // Fetch all distinct FYs in DB
    const allFYsInDB = await prisma.trip.findMany({
      select: { financialYear: true },
      distinct: ["financialYear"],
      orderBy: { financialYear: "desc" },
    });

    const dbFYs = allFYsInDB.map((r) => r.financialYear);

    // Build comprehensive FY options list (current FY + past 5 FYs + DB FYs)
    const currentStartYear = parseInt(realCurrentFY.split("-")[0]);
    const defaultFYList: string[] = [];
    for (let i = 0; i < 6; i++) {
      const y = currentStartYear - i;
      defaultFYList.push(`${y}-${y + 1}`);
    }

    const allFYs = Array.from(new Set([...defaultFYList, ...dbFYs])).sort(
      (a, b) => parseInt(b.split("-")[0]) - parseInt(a.split("-")[0])
    );

    // Full aggregation across all FYs (for all members in breakdown)
    const allTrips = await prisma.trip.findMany({
      where: {
        member: { name: { in: MEMBERS } },
        financialYear: { in: allFYs },
      },
      include: { member: { select: { name: true } } },
    });

    const fullAgg: Record<string, Record<string, number>> = {};
    for (const m of MEMBERS) {
      fullAgg[m] = {};
    }
    for (const trip of allTrips) {
      const name = trip.member.name;
      if (fullAgg[name]) {
        fullAgg[name][trip.financialYear] =
          (fullAgg[name][trip.financialYear] ?? 0) + trip.daysInIndia;
      }
    }

    return NextResponse.json({
      selectedFY,
      prevFY,
      preceding4FYs,
      currentFY: realCurrentFY,
      lastFY: realLastFY,
      selectedFYDays,
      prevFYDays,
      currentFYDays: selectedFYDays, // backwards-compatibility alias
      lastFYDays: prevFYDays,       // backwards-compatibility alias
      preceding4Total,
      allFYs,
      fullAgg,
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
