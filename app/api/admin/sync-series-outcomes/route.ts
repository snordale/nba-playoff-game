import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/prisma/client";
import { advanceBracket, syncSeriesOutcomes } from "@/services/BracketService";
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

  const { outcomesUpdated, firstGameUpdated, gamesLinked } = await syncSeriesOutcomes(season.id);

  let advanceCreated = 0;
  if (advance) {
    const advanceResults = await advanceBracket(season.id);
    advanceCreated = advanceResults.reduce((sum, r) => sum + r.created, 0);
  }

  return NextResponse.json({
    message: `Synced ${season.displayName}: ${outcomesUpdated} outcomes, ${firstGameUpdated} firstGameStartsAt, ${gamesLinked} games linked to series, ${advanceCreated} new series created.`,
    outcomesUpdated,
    firstGameUpdated,
    gamesLinked,
    advanceCreated,
  });
}
