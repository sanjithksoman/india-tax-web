import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { splitTripByFY } from "@/lib/financialYear";

// GET /api/trips — list all trips (optionally filtered)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberName = searchParams.get("member");
    const fy = searchParams.get("fy");

    const trips = await prisma.trip.findMany({
      where: {
        ...(memberName && { member: { name: memberName } }),
        ...(fy && { financialYear: fy }),
      },
      include: { member: { select: { name: true } } },
      orderBy: [{ financialYear: "desc" }, { arrivalDate: "asc" }],
    });

    return NextResponse.json({ trips });
  } catch (error) {
    console.error("[GET /api/trips]", error);
    return NextResponse.json({ error: "Failed to fetch trips" }, { status: 500 });
  }
}

// POST /api/trips — create a trip (auto-calculates FY, days, splits if needed)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberName, arrivalDate, departureDate, notes } = body;

    if (!memberName || !arrivalDate || !departureDate) {
      return NextResponse.json(
        { error: "memberName, arrivalDate, and departureDate are required" },
        { status: 400 }
      );
    }

    const arrival = new Date(arrivalDate);
    const departure = new Date(departureDate);

    if (departure < arrival) {
      return NextResponse.json(
        { error: "Departure date cannot be before arrival date" },
        { status: 400 }
      );
    }

    // Find the member
    const member = await prisma.member.findUnique({ where: { name: memberName } });
    if (!member) {
      return NextResponse.json({ error: `Member "${memberName}" not found` }, { status: 404 });
    }

    // Split trip across FY if it spans April 1
    const segments = splitTripByFY(arrival, departure);

    const createdTrips = await prisma.$transaction(
      segments.map((seg) =>
        prisma.trip.create({
          data: {
            memberId: member.id,
            arrivalDate: seg.arrivalDate,
            departureDate: seg.departureDate,
            daysInIndia: seg.daysInIndia,
            financialYear: seg.financialYear,
            notes: notes ?? null,
          },
          include: { member: { select: { name: true } } },
        })
      )
    );

    return NextResponse.json({ trips: createdTrips }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/trips]", error);
    return NextResponse.json({ error: "Failed to create trip" }, { status: 500 });
  }
}
