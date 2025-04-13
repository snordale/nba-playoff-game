// scripts/loadAllGames.ts
import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from "@/constants";
import { addDays, differenceInDays, format } from 'date-fns';
import { loadGamesForDate } from "../services/GameLoaderService";

// Helper to parse YYYY-MM-DD into a Date object (start of day UTC)
function parseDateUTC(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    // Month is 0-indexed for Date constructor
    return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Main function to iterate through playoff dates and load games.
 */
async function main() {
    console.log(`Starting to load playoff games from ${PLAYOFF_START_DATE} to ${PLAYOFF_END_DATE}...`);

    const startDate = parseDateUTC(PLAYOFF_START_DATE);
    const endDate = parseDateUTC(PLAYOFF_END_DATE);
    const totalDays = differenceInDays(endDate, startDate) + 1; // Include end date
    let currentDay = startDate;
    let daysProcessed = 0;
    let totalGamesLoaded = 0;
    let totalFailures = 0;

    for (let i = 0; i < totalDays; i++) {
        const formattedDate = format(currentDay, 'yyyy-MM-dd');
        console.log(`\n--- Processing Day ${i + 1}/${totalDays}: ${formattedDate} ---`);

        try {
            // Call the existing service function
            // Pass verbose: false if you don't want detailed logs from the service itself
            const result = await loadGamesForDate(currentDay, { verbose: false });

            console.log(`Result for ${formattedDate}: Processed ${result.gamesProcessed} games, Failed: ${result.gamesFailed}`);
            totalGamesLoaded += result.gamesProcessed;
            totalFailures += result.gamesFailed;

            if (result.errors.length > 0) {
                console.warn(`Errors for ${formattedDate}:`);
                result.errors.forEach(error => console.warn(`- ${error.substring(0, 200)}...`)); // Log snippet
            }

            daysProcessed++;
        } catch (error: any) {
            console.error(`FATAL ERROR processing ${formattedDate}:`, error.message);
            totalFailures++;
            // Decide if you want to stop on fatal error or continue
            // process.exit(1);
        }

        // Move to the next day
        currentDay = addDays(currentDay, 1);

        // Optional: Add a small delay to avoid rate-limiting issues
        // await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
    }

    console.log(`\n--- Finished Loading Playoff Games ---`);
    console.log(`Days Processed: ${daysProcessed}/${totalDays}`);
    console.log(`Total Games Loaded/Updated: ${totalGamesLoaded}`);
    console.log(`Total Failures / Errors: ${totalFailures}`);
    process.exit(totalFailures > 0 ? 1 : 0);
}

main();