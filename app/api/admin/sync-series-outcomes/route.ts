import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/prisma/client";
import {
  syncAndAdvanceUntilComplete,
  syncSeriesOutcomes,
} from "@/services/BracketService";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { year: number; advance?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { year, advance = true } = body ?? {};
  if (!year) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }

  const season = await prisma.season.findUnique({ where: { year } });
  if (!season) {
    return NextResponse.json({ error: `Season ${year} not found` }, { status: 404 });
  }

  if (advance) {
    const result = await syncAndAdvanceUntilComplete(season.id);
    const extra: string[] = [];
    if (result.gamesUnlinkedFromSeries > 0) extra.push(`${result.gamesUnlinkedFromSeries} unlinked from series`);
    if (result.gamesSeasonCorrected > 0) extra.push(`${result.gamesSeasonCorrected} season_id corrected`);
    const extraMsg = extra.length ? ` ${extra.join(", ")}.` : "";
    return NextResponse.json({
      message: `Synced ${season.displayName}: ${result.outcomesUpdated} outcomes, ${result.firstGameUpdated} firstGameStartsAt, ${result.gamesLinked} games linked, ${result.advanceCreated} new series created (full bracket).${extraMsg}`,
      outcomesUpdated: result.outcomesUpdated,
      firstGameUpdated: result.firstGameUpdated,
      gamesLinked: result.gamesLinked,
      gamesUnlinkedFromSeries: result.gamesUnlinkedFromSeries,
      gamesSeasonCorrected: result.gamesSeasonCorrected,
      advanceCreated: result.advanceCreated,
    });
  }

  const syncResult = await syncSeriesOutcomes(season.id);
  const extra: string[] = [];
  if (syncResult.gamesUnlinkedFromSeries > 0) extra.push(`${syncResult.gamesUnlinkedFromSeries} unlinked from series`);
  if (syncResult.gamesSeasonCorrected > 0) extra.push(`${syncResult.gamesSeasonCorrected} season_id corrected`);
  const extraMsg = extra.length ? ` ${extra.join(", ")}.` : "";
  return NextResponse.json({
    message: `Synced ${season.displayName}: ${syncResult.outcomesUpdated} outcomes, ${syncResult.firstGameUpdated} firstGameStartsAt, ${syncResult.gamesLinked} games linked (no advance).${extraMsg}`,
    outcomesUpdated: syncResult.outcomesUpdated,
    firstGameUpdated: syncResult.firstGameUpdated,
    gamesLinked: syncResult.gamesLinked,
    gamesUnlinkedFromSeries: syncResult.gamesUnlinkedFromSeries,
    gamesSeasonCorrected: syncResult.gamesSeasonCorrected,
    advanceCreated: 0,
  });
}
