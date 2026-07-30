import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentFY, getLastFY, getPrecedingFYs } from "@/lib/financialYear";

const MEMBERS = ["SANJITH", "NISHA", "NEHA", "NETRA"];

// GET /api/dashboard — returns all metrics for the dashboard
export async function GET() {
  try {
    const currentFY = getCurrentFY();
    const lastFY = getLastFY();
    const preceding4FYs = getPrecedingFYs(lastFY, 4);

    // All relevant FYs to fetch in one query
    const relevantFYs = [currentFY, lastFY, ...preceding4FYs];

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

    // Build response
    const currentFYDays: Record<string, number> = {};
    const lastFYDays: Record<string, number> = {};
    const preceding4Total: Record<string, number> = {};

    for (const m of MEMBERS) {
      currentFYDays[m] = aggregate[m][currentFY] ?? 0;
      lastFYDays[m] = aggregate[m][lastFY] ?? 0;
      preceding4Total[m] = preceding4FYs.reduce(
        (acc, fy) => acc + (aggregate[m][fy] ?? 0),
        0
      );
    }

    // Also fetch all distinct FYs in DB for the summary text
    const allFYsInDB = await prisma.trip.findMany({
      select: { financialYear: true },
      distinct: ["financialYear"],
      orderBy: { financialYear: "desc" },
    });

    const allFYs = allFYsInDB.map((r) => r.financialYear);

    // Full aggregation across all FYs (for copy-paste text)
    const allTrips = await prisma.trip.findMany({
      where: {
        member: { name: { in: ["SANJITH", "NISHA"] } },
        financialYear: { in: allFYs },
      },
      include: { member: { select: { name: true } } },
    });

    const fullAgg: Record<string, Record<string, number>> = {
      SANJITH: {},
      NISHA: {},
    };
    for (const trip of allTrips) {
      const name = trip.member.name;
      fullAgg[name][trip.financialYear] =
        (fullAgg[name][trip.financialYear] ?? 0) + trip.daysInIndia;
    }

    return NextResponse.json({
      currentFY,
      lastFY,
      preceding4FYs,
      currentFYDays,
      lastFYDays,
      preceding4Total,
      allFYs,
      fullAgg,
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}
