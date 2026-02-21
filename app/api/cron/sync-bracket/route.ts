import { getCurrentSeason } from "@/services/SeasonService";
import { syncAndAdvanceUntilComplete } from "@/services/BracketService";
import { NextResponse } from "next/server";

/**
 * Cron: sync series outcomes and firstGameStartsAt, then advance bracket in a loop until
 * full bracket exists for current season. Idempotent. Call after load-games (e.g. daily).
 * Auth: Bearer CRON_SECRET.
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

  const result = await syncAndAdvanceUntilComplete(season.id);

  const body = {
    season: season.displayName,
    outcomesUpdated: result.outcomesUpdated,
    firstGameUpdated: result.firstGameUpdated,
    gamesLinked: result.gamesLinked,
    advanceCreated: result.advanceCreated,
    advanceRounds: result.advanceRounds.filter((r) => r.created > 0).map((r) => r.round),
  };
  return NextResponse.json(body);
}
