import { getSeasonByYear } from "@/services/SeasonService";
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
    return NextResponse.json(season);
  } catch (error) {
    console.error("Error fetching season:", error);
    return NextResponse.json(
      { error: "Failed to fetch season" },
      { status: 500 }
    );
  }
}
