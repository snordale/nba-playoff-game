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
    return NextResponse.json({
      message: `Synced ${season.displayName}: ${result.outcomesUpdated} outcomes, ${result.firstGameUpdated} firstGameStartsAt, ${result.gamesLinked} games linked, ${result.advanceCreated} new series created (full bracket).`,
      outcomesUpdated: result.outcomesUpdated,
      firstGameUpdated: result.firstGameUpdated,
      gamesLinked: result.gamesLinked,
      advanceCreated: result.advanceCreated,
    });
  }

  const { outcomesUpdated, firstGameUpdated, gamesLinked } =
    await syncSeriesOutcomes(season.id);
  return NextResponse.json({
    message: `Synced ${season.displayName}: ${outcomesUpdated} outcomes, ${firstGameUpdated} firstGameStartsAt, ${gamesLinked} games linked (no advance).`,
    outcomesUpdated,
    firstGameUpdated,
    gamesLinked,
    advanceCreated: 0,
  });
}
