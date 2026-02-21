import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

const FIRST_ROUND_MATCHUPS = [
  [1, 8],
  [2, 7],
  [3, 6],
  [4, 5],
] as const;

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
  if (!year) {
    return NextResponse.json({ error: "year is required" }, { status: 400 });
  }

  const season = await prisma.season.findUnique({ where: { year } });
  if (!season) {
    return NextResponse.json({ error: `Season ${year} not found` }, { status: 404 });
  }

  const seeds = await prisma.playoffSeed.findMany({
    where: { seasonId: season.id },
    include: { team: true },
  });

  const seedsByConfAndSeed = new Map<string, { teamId: string }>();
  seeds.forEach((s) => {
    seedsByConfAndSeed.set(`${s.conference}-${s.seed}`, { teamId: s.teamId });
  });

  if (seeds.length < 16) {
    return NextResponse.json(
      {
        error: `Need 16 PlayoffSeed records (8 per conference). Found ${seeds.length}.`,
      },
      { status: 400 }
    );
  }

  const existing = await prisma.playoffSeries.findMany({
    where: { seasonId: season.id },
  });

  if (existing.length > 0) {
    return NextResponse.json({
      message: `Season ${year} already has ${existing.length} series. No changes made.`,
    });
  }

  let sequence = 0;
  for (const conf of ["EAST", "WEST"]) {
    for (const [high, low] of FIRST_ROUND_MATCHUPS) {
      const highSeed = seedsByConfAndSeed.get(`${conf}-${high}`);
      const lowSeed = seedsByConfAndSeed.get(`${conf}-${low}`);
      if (!highSeed || !lowSeed) continue;
      await prisma.playoffSeries.create({
        data: {
          seasonId: season.id,
          round: "FIRST_ROUND",
          conference: conf,
          highSeedTeamId: highSeed.teamId,
          lowSeedTeamId: lowSeed.teamId,
          sequence: ++sequence,
        },
      });
    }
  }

  return NextResponse.json({
    message: `Created ${sequence} first-round series for ${season.displayName}.`,
  });
}
