/**
 * Seeds PlayoffSeries for a season from PlayoffSeed records.
 * Run after PlayoffSeed records exist (from admin or loadStandings script).
 * Usage: npx tsx scripts/seedPlayoffBracket.ts [year]
 */

import { prisma } from "../prisma/client";
import { getOrCreateSeason, getSeasonByYear } from "../services/SeasonService";

const FIRST_ROUND_MATCHUPS = [
  [1, 8],
  [2, 7],
  [3, 6],
  [4, 5],
] as const;

async function main() {
  const yearArg = process.argv[2];
  const year = yearArg ? parseInt(yearArg, 10) : new Date().getFullYear();

  if (isNaN(year)) {
    console.error("Invalid year. Usage: npx tsx scripts/seedPlayoffBracket.ts [year]");
    process.exit(1);
  }

  const season = await getSeasonByYear(year) ?? await getOrCreateSeason(year);
  const seeds = await prisma.playoffSeed.findMany({
    where: { seasonId: season.id },
    include: { team: true },
    orderBy: [{ conference: "asc" }, { seed: "asc" }],
  });

  const seedsByConfAndSeed = new Map<string, { teamId: string }>();
  seeds.forEach((s) => {
    seedsByConfAndSeed.set(`${s.conference}-${s.seed}`, { teamId: s.teamId });
  });

  if (seeds.length < 16) {
    console.error(
      `Need 16 PlayoffSeed records (8 per conference). Found ${seeds.length}. ` +
        "Run admin seeding or load standings first."
    );
    process.exit(1);
  }

  const existing = await prisma.playoffSeries.findMany({
    where: { seasonId: season.id },
  });

  if (existing.length > 0) {
    console.log(`Season ${year} already has ${existing.length} series. Skipping.`);
    process.exit(0);
  }

  let sequence = 0;

  for (const conf of ["EAST", "WEST"]) {
    for (const [high, low] of FIRST_ROUND_MATCHUPS) {
      const highSeed = seedsByConfAndSeed.get(`${conf}-${high}`);
      const lowSeed = seedsByConfAndSeed.get(`${conf}-${low}`);
      if (!highSeed || !lowSeed) {
        console.error(`Missing seed ${conf} ${high} or ${low}`);
        continue;
      }
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

  console.log(`Created ${sequence} first-round series for ${season.displayName}.`);
  console.log("Run syncSeriesOutcomes after games complete to auto-create Semifinals, Conference Finals, and Finals.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
