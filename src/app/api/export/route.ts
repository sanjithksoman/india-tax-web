import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildExcelWorkbook } from "@/lib/excelExport";

// GET /api/export — streams an Excel file download
export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      include: { member: { select: { name: true } } },
      orderBy: [{ financialYear: "asc" }, { arrivalDate: "asc" }],
    });

    const rows = trips.map((t) => ({
      memberName: t.member.name,
      arrivalDate: t.arrivalDate,
      departureDate: t.departureDate,
      daysInIndia: t.daysInIndia,
      financialYear: t.financialYear,
    }));

    const buffer = await buildExcelWorkbook(rows);
    // Cast to Uint8Array — compatible with NextResponse BodyInit
    const bodyBuffer = new Uint8Array(buffer as ArrayBuffer);

    const today = new Date().toISOString().split("T")[0];
    const filename = `India_Travel_Dates_${today}.xlsx`;

    return new NextResponse(bodyBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[GET /api/export]", error);
    return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
  }
}
