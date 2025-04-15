import { loadGamesForDate, logGameStats } from "../services/DataLoaderService";

/**
 * Parses command line arguments for a date string.
 * Accepts formats like YYYY-MM-DD or --date=YYYY-MM-DD.
 * Defaults to today if no valid date is found.
 * Returns date set to midnight in local timezone.
 */
function getTargetDate(): Date {
  const args = process.argv.slice(2); // Skip 'node' and script path
  let dateArg: string | undefined;

  for (const arg of args) {
    if (arg.startsWith('--date=')) {
      dateArg = arg.split('=')[1];
      break;
    }
    // Basic check for YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      dateArg = arg;
      break;
    }
  }

  if (dateArg) {
    // Create date in local timezone at start of day
    const [year, month, day] = dateArg.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day); // month is 0-based
    parsedDate.setHours(0, 0, 0, 0); // Set to midnight
    
    if (!isNaN(parsedDate.getTime())) {
      console.log(`Using provided date: ${parsedDate.toLocaleDateString()}`);
      return parsedDate;
    }
    console.warn(`Invalid date format provided: ${dateArg}. Defaulting to today.`);
  }

  // Use start of today in local timezone
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  console.log("No date provided or invalid format. Defaulting to today:", today.toLocaleDateString());
  return today;
}

/**
 * Main function to load games for the target date.
 */
async function main() {
  const targetDate = getTargetDate();
  
  try {
    const result = await loadGamesForDate(targetDate, { verbose: true });
    
    if (result.errors.length > 0) {
      console.log("\nErrors encountered:");
      result.errors.forEach(error => console.error(`- ${error}`));
    }

    // Log each game's stats
    console.log("\nGame Results:");
    result.games.forEach(game => logGameStats(game));
    
    process.exit(result.gamesFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();