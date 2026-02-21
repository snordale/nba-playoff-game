import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const seasons = await prisma.season.findMany({
    orderBy: { year: "desc" },
  });
  return NextResponse.json(seasons);
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { year: number; startDate: string; endDate: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { year, startDate, endDate, displayName } = body;
  if (!year || !startDate || !endDate) {
    return NextResponse.json(
      { error: "year, startDate, and endDate are required" },
      { status: 400 }
    );
  }

  const existing = await prisma.season.findUnique({ where: { year } });
  if (existing) {
    return NextResponse.json(
      { error: `Season ${year} already exists` },
      { status: 400 }
    );
  }

  const season = await prisma.season.create({
    data: {
      year,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      displayName: displayName ?? `${year - 1}-${String(year).slice(-2)}`,
    },
  });

  return NextResponse.json(season);
}
