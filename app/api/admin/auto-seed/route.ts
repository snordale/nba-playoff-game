import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/prisma/client";
import { getPlayoffStandings } from "@/services/EspnService";
import { getOrCreateSeason } from "@/services/SeasonService";
import { NextRequest, NextResponse } from "next/server";

const FIRST_ROUND_MATCHUPS = [
  [1, 8],
  [2, 7],
  [3, 6],
  [4, 5],
] as const;

/**
 * POST /api/admin/auto-seed
 * Body: { year: number }
 *
 * 1. Fetches playoff standings from ESPN for the given year.
 * 2. Upserts 16 PlayoffSeed records (8 East, 8 West) using ESPN's playoffSeed field.
 * 3. Creates first-round PlayoffSeries from those seeds (skipped if series already exist).
 *
 * Safe to re-run: seeds are upserted, bracket creation is skipped when series exist.
 * Useful to re-run after play-in games to update seeds 7 & 8.
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { year: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { year } = body;
  if (!year || isNaN(year)) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }

  // 1. Get or create the season
  const season = await getOrCreateSeason(year);

  // 2. Fetch ESPN standings
  let standings;
  try {
    standings = await getPlayoffStandings(year);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to fetch ESPN standings: ${err.message}` },
      { status: 502 }
    );
  }

  if (standings.length < 16) {
    return NextResponse.json(
      {
        error: `ESPN standings only returned ${standings.length} playoff seeds (need 16). Playoff seedings may not be finalized yet.`,
        standings,
      },
      { status: 422 }
    );
  }

  // 3. Upsert PlayoffSeed for each of the 16 teams
  const seedResults: { conference: string; seed: number; team: string; action: string }[] = [];
  for (const entry of standings) {
    // Find team in our DB by ESPN ID
    const team = await prisma.team.findUnique({ where: { espnId: entry.espnTeamId } });
    if (!team) {
      console.warn(`auto-seed: team not found in DB for ESPN ID ${entry.espnTeamId} (${entry.teamName}). Run load-teams first.`);
      return NextResponse.json(
        {
          error: `Team "${entry.teamName}" (ESPN ID ${entry.espnTeamId}) not found in database. Run "Load Teams" first, then retry.`,
        },
        { status: 422 }
      );
    }

    await prisma.playoffSeed.upsert({
      where: {
        seasonId_conference_seed: {
          seasonId: season.id,
          conference: entry.conference,
          seed: entry.seed,
        },
      },
      update: { teamId: team.id },
      create: {
        seasonId: season.id,
        teamId: team.id,
        seed: entry.seed,
        conference: entry.conference,
      },
    });

    seedResults.push({ conference: entry.conference, seed: entry.seed, team: entry.abbreviation, action: "upserted" });
  }

  // 4. Seed the first-round bracket (skip if series already exist)
  const existingSeries = await prisma.playoffSeries.findMany({
    where: { seasonId: season.id },
  });

  let bracketMessage: string;
  let seriesCreated = 0;

  if (existingSeries.length > 0) {
    bracketMessage = `Bracket already has ${existingSeries.length} series — skipped. Re-run "Seed Bracket" manually if you need to reset.`;
  } else {
    const seedsByConfAndSeed = new Map(
      standings.map((s) => [`${s.conference}-${s.seed}`, s.espnTeamId])
    );

    // Resolve teamId from espnTeamId for bracket creation
    const teamIdByEspnId = new Map<string, string>();
    for (const entry of standings) {
      const team = await prisma.team.findUnique({ where: { espnId: entry.espnTeamId } });
      if (team) teamIdByEspnId.set(entry.espnTeamId, team.id);
    }

    let sequence = 0;
    for (const conf of ["EAST", "WEST"] as const) {
      for (const [high, low] of FIRST_ROUND_MATCHUPS) {
        const highEspnId = seedsByConfAndSeed.get(`${conf}-${high}`) as string | undefined;
        const lowEspnId = seedsByConfAndSeed.get(`${conf}-${low}`) as string | undefined;
        const highTeamId = highEspnId ? teamIdByEspnId.get(highEspnId) : undefined;
        const lowTeamId = lowEspnId ? teamIdByEspnId.get(lowEspnId) : undefined;
        if (!highTeamId || !lowTeamId) continue;

        await prisma.playoffSeries.create({
          data: {
            seasonId: season.id,
            round: "FIRST_ROUND",
            conference: conf,
            highSeedTeamId: highTeamId,
            lowSeedTeamId: lowTeamId,
            sequence: ++sequence,
          },
        });
        seriesCreated++;
      }
    }

    bracketMessage = `Created ${seriesCreated} first-round series.`;
  }

  return NextResponse.json({
    message: `Auto-seeded ${season.displayName}: ${seedResults.length} seeds upserted. ${bracketMessage}`,
    season: { id: season.id, year: season.year, displayName: season.displayName },
    seeds: seedResults,
    seriesCreated,
  });
}
