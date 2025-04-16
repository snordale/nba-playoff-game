// scripts/loadAllGames.ts
import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from "@/constants";
import { addDays, differenceInDays, format } from 'date-fns';
import { loadGamesForDate } from "../services/DataLoaderService";

// Helper to parse YYYY-MM-DD into a Date object (start of day UTC)
function parseDateUTC(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    // Month is 0-indexed for Date constructor
    return new Date(Date.UTC(year, month - 1, day));
}

// Define batch size for concurrent processing
const BATCH_SIZE = 10; // Process 10 days concurrently

/**
 * Main function to iterate through playoff dates and load games concurrently in batches.
 */
async function main() {
    console.log(`Starting to load playoff games from ${PLAYOFF_START_DATE} to ${PLAYOFF_END_DATE} using concurrent batches of ${BATCH_SIZE}...`);

    const startDate = parseDateUTC(PLAYOFF_START_DATE);
    const endDate = parseDateUTC(PLAYOFF_END_DATE);
    const totalDays = differenceInDays(endDate, startDate) + 1; // Include end date

    // Generate all dates
    const allDates: Date[] = [];
    let currentDateIterator = startDate;
    for (let i = 0; i < totalDays; i++) {
        allDates.push(currentDateIterator);
        currentDateIterator = addDays(currentDateIterator, 1);
    }

    let totalGamesLoaded = 0;
    let totalFailures = 0;
    const allErrors: string[] = [];
    let daysProcessed = 0;

    console.log(`Total days to process: ${totalDays}`);

    // Process dates in batches
    for (let i = 0; i < totalDays; i += BATCH_SIZE) {
        const batchDates = allDates.slice(i, i + BATCH_SIZE);
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(totalDays / BATCH_SIZE);

        console.log(`
--- Processing Batch ${batchNumber}/${totalBatches} (Dates ${i + 1} to ${Math.min(i + BATCH_SIZE, totalDays)}) ---`);

        const batchPromises = batchDates.map(currentDay => {
            const formattedDate = format(currentDay, 'yyyy-MM-dd');
            return loadGamesForDate(currentDay, { verbose: false })
                .then(result => ({ status: 'fulfilled', value: result, date: formattedDate }))
                .catch(error => ({ status: 'rejected', reason: error, date: formattedDate }));
        });

        // Use Promise.allSettled to wait for all promises in the batch
        const results = await Promise.allSettled(batchPromises);

        // Process results of the batch
        results.forEach(settledResult => {
            // Note: Our custom wrapper ensures settledResult.value exists even for rejections
            const result = settledResult.status === 'fulfilled' ? settledResult.value : settledResult.reason;
            const formattedDate = result.date; // Get date from our wrapper object

            if (result.status === 'fulfilled') {
                 console.log(`Result for ${formattedDate}: Processed ${result.value.gamesProcessed} games, Failed: ${result.value.gamesFailed}`);
                totalGamesLoaded += result.value.gamesProcessed;
                totalFailures += result.value.gamesFailed;
                daysProcessed++;
                if (result.value.errors.length > 0) {
                    console.warn(`Errors for ${formattedDate}:`);
                    result.value.errors.forEach((error: string) => {
                         const shortError = `- ${error.substring(0, 200)}${error.length > 200 ? '...' : ''}`;
                         console.warn(shortError);
                         allErrors.push(`[${formattedDate}] ${shortError}`);
                    });
                }
            } else { // status === 'rejected'
                const error = result.reason;
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(`FATAL ERROR processing ${formattedDate}:`, errorMessage);
                totalFailures++; // Count the whole day as a failure
                allErrors.push(`[${formattedDate}] FATAL: ${errorMessage.substring(0,200)}...`);
                // We don't increment daysProcessed here as the day failed critically
            }
        });
         // Optional: Add a small delay *between batches* if needed
        // await new Promise(resolve => setTimeout(resolve, 50));
    }

    console.log(`
--- Finished Loading Playoff Games ---`);
    console.log(`Days Attempted: ${totalDays}`);
    console.log(`Days Successfully Processed (at least partially): ${daysProcessed}`);
    console.log(`Total Games Loaded/Updated: ${totalGamesLoaded}`);
    console.log(`Total Failures / Errors (including game-level and day-level): ${totalFailures}`);

    if (allErrors.length > 0) {
        console.warn(`
--- Summary of Errors Encountered (${allErrors.length}) ---`);
        // Log first few errors for brevity in console
        allErrors.slice(0, 20).forEach(err => console.warn(err));
        if (allErrors.length > 20) {
            console.warn(`... and ${allErrors.length - 20} more errors.`);
        }
    }

    process.exit(totalFailures > 0 || daysProcessed < totalDays ? 1 : 0);
}

main();