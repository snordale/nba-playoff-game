/**
 * Removes duplicate game rows that are linked to the same series on the same date.
 * Keeps one game per (playoff_series_id, date); deletes the rest (Submission and
 * PlayerGameStats cascade). Run findDuplicateGames.ts first to inspect.
 *
 * Usage: npx tsx scripts/dedupeSeriesGames.ts [year]
 *        npx tsx scripts/dedupeSeriesGames.ts [year] --dry-run  (only report, no deletes)
 */

import { prisma } from "../prisma/client";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const yearArg = args.find((a) => a !== "--dry-run");
  const year = yearArg ? parseInt(yearArg, 10) : new Date().getFullYear();

  if (isNaN(year)) {
    console.error("Usage: npx tsx scripts/dedupeSeriesGames.ts [year] [--dry-run]");
    process.exit(1);
  }

  const season = await prisma.season.findUnique({ where: { year } });
  if (!season) {
    console.error(`Season ${year} not found.`);
    process.exit(1);
  }

  const series = await prisma.playoffSeries.findMany({
    where: { seasonId: season.id },
    select: { id: true },
  });

  let totalDeleted = 0;

  for (const s of series) {
    const games = await prisma.game.findMany({
      where: { playoffSeriesId: s.id },
      select: { id: true, date: true },
      orderBy: { id: "asc" },
    });

    const byDate = new Map<string, typeof games>();
    for (const g of games) {
      const key = g.date.toISOString().slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(g);
    }

    const toDelete: string[] = [];
    for (const [, list] of byDate) {
      if (list.length <= 1) continue;
      // Keep first (by id), delete the rest
      for (let i = 1; i < list.length; i++) {
        toDelete.push(list[i].id);
      }
    }

    if (toDelete.length > 0) {
      console.log(`Series ${s.id}: removing ${toDelete.length} duplicate game(s), keeping 1 per date.`);
      if (!dryRun) {
        await prisma.game.deleteMany({ where: { id: { in: toDelete } } });
        totalDeleted += toDelete.length;
      }
    }
  }

  if (dryRun) {
    console.log("Dry run: no rows deleted. Run without --dry-run to apply.");
  } else {
    console.log(`Deleted ${totalDeleted} duplicate game(s). Re-run sync series outcomes to recalc win counts.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
