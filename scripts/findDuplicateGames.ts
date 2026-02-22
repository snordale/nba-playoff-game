/**
 * Finds games that are logical duplicates: same season, date, and team pair
 * (can inflate series win counts). Use to inspect then fix data.
 *
 * Usage: npx tsx scripts/findDuplicateGames.ts [year]
 */

import { prisma } from "../prisma/client";

function teamPairKey(homeId: string, awayId: string): string {
  return [homeId, awayId].sort().join("|");
}

async function main() {
  const yearArg = process.argv[2];
  const year = yearArg ? parseInt(yearArg, 10) : new Date().getFullYear();

  if (isNaN(year)) {
    console.error("Invalid year. Usage: npx tsx scripts/findDuplicateGames.ts [year]");
    process.exit(1);
  }

  const season = await prisma.season.findUnique({ where: { year } });
  if (!season) {
    console.error(`Season ${year} not found.`);
    process.exit(1);
  }

  const games = await prisma.game.findMany({
    where: { seasonId: season.id },
    select: {
      id: true,
      espnId: true,
      date: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      playoffSeriesId: true,
    },
    orderBy: { date: "asc" },
  });

  const byKey = new Map<string, typeof games>();
  for (const g of games) {
    const key = `${g.date.toISOString().slice(0, 10)}|${teamPairKey(g.homeTeamId, g.awayTeamId)}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(g);
  }

  const duplicates = [...byKey.entries()].filter(([, list]) => list.length > 1);

  if (duplicates.length === 0) {
    console.log(`No duplicate games found for season ${year}.`);
    return;
  }

  console.log(`Found ${duplicates.length} duplicate group(s) for season ${year}:\n`);

  for (const [key, list] of duplicates) {
    const [datePart] = key.split("|");
    console.log(`Date ${datePart}, ${list.length} games (same team pair):`);
    for (const g of list) {
      console.log(
        `  id=${g.id} espnId=${g.espnId} playoffSeriesId=${g.playoffSeriesId ?? "null"} score ${g.homeScore}-${g.awayScore}`
      );
    }
    console.log("");
  }

  console.log("To fix: keep one row per group (e.g. the one with playoff_series_id set) and delete the others.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
