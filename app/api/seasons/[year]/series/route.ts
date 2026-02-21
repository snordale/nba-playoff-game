import { getSeasonByYear } from "@/services/SeasonService";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year } = await params;
  const yearNum = parseInt(year, 10);

  if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
    return NextResponse.json(
      { error: "Invalid year parameter" },
      { status: 400 }
    );
  }

  try {
    const season = await getSeasonByYear(yearNum);
    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    const series = await prisma.playoffSeries.findMany({
      where: { seasonId: season.id },
      include: {
        highSeedTeam: { select: { id: true, name: true, abbreviation: true } },
        lowSeedTeam: { select: { id: true, name: true, abbreviation: true } },
        winnerTeam: { select: { id: true, name: true, abbreviation: true } },
      },
      orderBy: [{ round: "asc" }, { sequence: "asc" }],
    });

    return NextResponse.json(series);
  } catch (error) {
    console.error("Error fetching series:", error);
    return NextResponse.json(
      { error: "Failed to fetch series" },
      { status: 500 }
    );
  }
}
