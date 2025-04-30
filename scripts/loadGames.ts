import { loadGamesForDate, logGameStats } from "../services/DataLoaderService";

/**
 * Parses command line arguments for a date string.
 * Accepts formats like YYYY-MM-DD or --date=YYYY-MM-DD.
 * Defaults to today if no valid date is found.
 * Returns date set to midnight UTC for the target calendar day.
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
    const dateParts = dateArg.split('-').map(Number);
    if (dateParts.length === 3) {
      const [year, month, day] = dateParts;
      // Create a Date object representing midnight UTC for the given YYYY-MM-DD
      const utcTimestamp = Date.UTC(year, month - 1, day); // month is 0-based
      if (!isNaN(utcTimestamp)) {
        const parsedDate = new Date(utcTimestamp);
        console.log(`Using provided date (UTC midnight): ${parsedDate.toISOString().split('T')[0]}`);
        return parsedDate;
      }
    }
    console.warn(`Invalid date format provided: ${dateArg}. Defaulting to today (UTC midnight).`);
  }

  // Default to start of today in UTC
  const today = new Date();
  const todayUtcTimestamp = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const todayUtcMidnight = new Date(todayUtcTimestamp);
  console.log(`No date provided or invalid format. Defaulting to today (UTC midnight): ${todayUtcMidnight.toISOString().split('T')[0]}`);
  return todayUtcMidnight;
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