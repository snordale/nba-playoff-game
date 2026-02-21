import { getCurrentSeason, listSeasons } from "@/services/SeasonService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const currentOnly = searchParams.get("current") === "true";

  try {
    if (currentOnly) {
      const season = await getCurrentSeason();
      if (!season) {
        return NextResponse.json({ error: "No season found" }, { status: 404 });
      }
      return NextResponse.json(season);
    }

    const seasons = await listSeasons();
    return NextResponse.json(seasons);
  } catch (error) {
    console.error("Error fetching seasons:", error);
    return NextResponse.json(
      { error: "Failed to fetch seasons" },
      { status: 500 }
    );
  }
}
