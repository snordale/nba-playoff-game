import { getCurrentSeason } from "@/services/SeasonService";
import { advanceBracket, syncSeriesOutcomes } from "@/services/BracketService";
import { NextResponse } from "next/server";

/**
 * Cron: sync series outcomes and firstGameStartsAt, then advance bracket for current season.
 * Call after load-games (e.g. daily). Auth: Bearer CRON_SECRET.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const season = await getCurrentSeason();
  if (!season) {
    return NextResponse.json({ error: "No current season" }, { status: 404 });
  }

  const { outcomesUpdated, firstGameUpdated } = await syncSeriesOutcomes(season.id);
  const advanceResults = await advanceBracket(season.id);
  const advanceCreated = advanceResults.reduce((sum, r) => sum + r.created, 0);

  const body: {
    season: string;
    outcomesUpdated: number;
    firstGameUpdated: number;
    advanceCreated: number;
    advanceRounds: string[];
  } = {
    season: season.displayName,
    outcomesUpdated,
    firstGameUpdated,
    advanceCreated,
    advanceRounds: advanceResults.filter((r) => r.created > 0).map((r) => r.round),
  };
  return NextResponse.json(body);
}
