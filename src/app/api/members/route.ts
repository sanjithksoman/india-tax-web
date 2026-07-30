import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/members — list all members
export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: { id: "asc" },
    });
    return NextResponse.json({ members });
  } catch (error) {
    console.error("[GET /api/members]", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}
