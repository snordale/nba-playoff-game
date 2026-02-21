/**
 * Syncs series outcomes and firstGameStartsAt from games, then advances bracket
 * (creates Semifinals, Conference Finals, Finals from winners).
 *
 * Usage: npx tsx scripts/syncSeriesOutcomes.ts [year]
 */

import { getSeasonByYear } from "../services/SeasonService";
import { advanceBracket, syncSeriesOutcomes } from "../services/BracketService";

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

  const { outcomesUpdated, firstGameUpdated } = await syncSeriesOutcomes(season.id);
  console.log(`Outcomes updated: ${outcomesUpdated}, firstGameStartsAt set: ${firstGameUpdated}`);

  const advanceResults = await advanceBracket(season.id);
  const advanceCreated = advanceResults.reduce((sum, r) => sum + r.created, 0);
  if (advanceCreated > 0) {
    console.log(
      `Advance bracket: created ${advanceCreated} new series (${advanceResults.map((r) => r.round).join(", ")})`
    );
  }

  console.log("Sync complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
