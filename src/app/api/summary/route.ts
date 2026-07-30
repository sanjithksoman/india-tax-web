import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSummaryText } from "@/lib/financialYear";

// GET /api/summary — returns the SANJITH + NISHA copy-paste formatted text
export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      where: { member: { name: { in: ["SANJITH", "NISHA"] } } },
      include: { member: { select: { name: true } } },
      orderBy: { financialYear: "desc" },
    });

    // Aggregate
    const memberDays: Record<string, Record<string, number>> = {
      SANJITH: {},
      NISHA: {},
    };

    const fySet = new Set<string>();
    for (const trip of trips) {
      const name = trip.member.name;
      fySet.add(trip.financialYear);
      memberDays[name][trip.financialYear] =
        (memberDays[name][trip.financialYear] ?? 0) + trip.daysInIndia;
    }

    // Sort FYs descending
    const years = Array.from(fySet).sort((a, b) => (a > b ? -1 : 1));

    const text = generateSummaryText(memberDays, years);

    return NextResponse.json({ text, years, memberDays });
  } catch (error) {
    console.error("[GET /api/summary]", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
