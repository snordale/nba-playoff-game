/**
 * Syncs series outcomes and firstGameStartsAt from games, then advances bracket
 * in a loop until full bracket exists (Semifinals, Conference Finals, Finals).
 * Idempotent: safe to run multiple times.
 *
 * Usage: npx tsx scripts/syncSeriesOutcomes.ts [year]
 */

import { getSeasonByYear } from "../services/SeasonService";
import { syncAndAdvanceUntilComplete } from "../services/BracketService";

async function main() {
  const yearArg = process.argv[2];
  const year = yearArg ? parseInt(yearArg, 10) : new Date().getFullYear();

  if (isNaN(year)) {
    console.error("Invalid year. Usage: npx tsx scripts/syncSeriesOutcomes.ts [year]");
    process.exit(1);
  }

  const season = await getSeasonByYear(year);
  if (!season) {
    console.error(`Season ${year} not found.`);
    process.exit(1);
  }

  const result = await syncAndAdvanceUntilComplete(season.id);
  console.log(
    `Outcomes updated: ${result.outcomesUpdated}, firstGameStartsAt set: ${result.firstGameUpdated}, games linked: ${result.gamesLinked}`
  );
  if (result.gamesUnlinkedFromSeries > 0) {
    console.log(
      `Unlinked ${result.gamesUnlinkedFromSeries} game(s) from series (before playoff window).`
    );
  }
  if (result.advanceCreated > 0) {
    console.log(
      `Advance bracket: created ${result.advanceCreated} new series (${result.advanceRounds.map((r) => r.round).join(", ")})`
    );
  }
  console.log("Sync complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
