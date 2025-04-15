// scripts/initDb.ts
import { PrismaClient } from '@prisma/client';
import { eachDayOfInterval, format, parseISO } from 'date-fns';
// Import functions and types needed
import { getGamesByDate, ESPNEvent, ESPNTeamRef, ESPNAthleteRef } from '../services/EspnService'; 
import { getOrCreatePlayer } from '../services/GameLoaderService'; // Import player creation function
import { PLAYOFF_START_DATE, PLAYOFF_END_DATE } from '../constants'; // Adjust path if necessary

const prisma = new PrismaClient();

async function initializeDatabase() {
    console.log('Starting Database Initialization (Games, Teams, and Initial Players)...'); // Updated log message

    if (!PLAYOFF_START_DATE || !PLAYOFF_END_DATE) {
        console.error('Error: PLAYOFF_START_DATE or PLAYOFF_END_DATE constants are not defined.');
        return;
    }

    const startDate = parseISO(PLAYOFF_START_DATE);
    const endDate = parseISO(PLAYOFF_END_DATE);
    const allPlayoffDates = eachDayOfInterval({ start: startDate, end: endDate });

    console.log(`Fetching game data for playoff range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    for (const date of allPlayoffDates) {
        const dateString = format(date, 'yyyy-MM-dd');
        console.log(`\n--- Processing Date: ${dateString} ---`);

        try {
            const games: ESPNEvent[] = await getGamesByDate({ date }); 
            console.log(`Found ${games.length} games`);

            for (const gameData of games) {
                console.log(`Processing Game ID: ${gameData.id} (${gameData.shortName})`);

                const competition = gameData.competitions?.[0];
                if (!competition || competition.competitors?.length !== 2) {
                    console.warn(`Skipping game ${gameData.id}: Invalid competition data.`);
                    continue;
                }

                const homeComp = competition.competitors.find(c => c.homeAway === 'home');
                const awayComp = competition.competitors.find(c => c.homeAway === 'away');

                const homeTeamData: ESPNTeamRef | undefined = homeComp?.team;
                const awayTeamData: ESPNTeamRef | undefined = awayComp?.team;

                if (!homeTeamData?.id || !awayTeamData?.id || !homeTeamData.displayName || !awayTeamData.displayName) {
                    console.warn(`Skipping game ${gameData.id}: Missing essential team data (id, displayName).`);
                    continue;
                }

                // 1. Upsert Teams
                const dbHomeTeam = await prisma.team.upsert({
                    where: { espnId: homeTeamData.id },
                    update: {
                        name: homeTeamData.displayName,
                        abbreviation: homeTeamData.abbreviation,
                    },
                    create: {
                        espnId: homeTeamData.id,
                        name: homeTeamData.displayName,
                        abbreviation: homeTeamData.abbreviation ?? homeTeamData.displayName.substring(0, 3).toUpperCase(),
                    },
                });
                console.log(`Upserted Home Team: ${dbHomeTeam.name} (ID: ${dbHomeTeam.id})`);

                const dbAwayTeam = await prisma.team.upsert({
                    where: { espnId: awayTeamData.id },
                    update: {
                        name: awayTeamData.displayName,
                        abbreviation: awayTeamData.abbreviation,
                    },
                    create: {
                        espnId: awayTeamData.id,
                        name: awayTeamData.displayName,
                        abbreviation: awayTeamData.abbreviation ?? awayTeamData.displayName.substring(0, 3).toUpperCase(),
                    },
                });
                console.log(`Upserted Away Team: ${dbAwayTeam.name} (ID: ${dbAwayTeam.id})`);

                // 2. Upsert Game
                const gameDate = new Date(gameData.date); 
                const newYorkGameDate = new Date(gameDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                
                const dbGame = await prisma.game.upsert({
                    where: { espnId: gameData.id },
                    update: {
                        date: newYorkGameDate,
                        status: gameData.status.type.name, // Update status if needed
                        homeTeamId: dbHomeTeam.id,
                        awayTeamId: dbAwayTeam.id,
                        // Score might not be available here, GameLoaderService will update it
                    },
                    create: {
                        espnId: gameData.id,
                        date: newYorkGameDate,
                        status: gameData.status.type.name,
                        homeTeamId: dbHomeTeam.id,
                        awayTeamId: dbAwayTeam.id,
                        statsProcessed: false, // Initialize as false
                    },
                });
                console.log(`Upserted Game: ${dbHomeTeam.abbreviation} vs ${dbAwayTeam.abbreviation} on ${format(newYorkGameDate, 'yyyy-MM-dd HH:mm')} (ID: ${dbGame.id})`);

                // 3. Attempt to Upsert Initial Players from Schedule Data
                console.log(`  Attempting to add players for game ${dbGame.id}...`);
                let playersAdded = 0;
                if (competition.competitors) {
                    for (const competitor of competition.competitors) {
                        // Type assertion needed as ESPNEvent doesn't guarantee athletes array
                        const competitorWithAthletes = competitor as (typeof competitor & { athletes?: ESPNAthleteRef[] });
                        
                        if (competitorWithAthletes.athletes && Array.isArray(competitorWithAthletes.athletes)) {
                            const dbTeam = competitor.homeAway === 'home' ? dbHomeTeam : dbAwayTeam;
                            if (!dbTeam) continue; // Should not happen based on earlier checks

                            for (const athlete of competitorWithAthletes.athletes) {
                                try {
                                    // Use the imported function to create/update player
                                    const player = await getOrCreatePlayer(athlete, dbTeam.id);
                                    if (player) playersAdded++;
                                } catch (playerError) {
                                    console.error(`    Error upserting player ${athlete.displayName} (ESPN ID: ${athlete.id}) for team ${dbTeam.name}:`, playerError);
                                }
                            }
                        } else {
                             console.log(`    No athletes array found for ${competitor.homeAway} team in schedule data.`);
                        }
                    }
                }
                if (playersAdded > 0) {
                     console.log(`  Upserted ${playersAdded} initial players for game ${dbGame.id}.`);
                }

            }
        } catch (error) {
            console.error(`Error processing date ${dateString}:`, error);
            // Decide if you want to continue to the next date or stop
            // continue;
        }
    }

    console.log('\nDatabase Initialization Finished.');
}

initializeDatabase()
    .catch((e) => {
        console.error('Unhandled error during initialization:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log('Prisma client disconnected.');
    });
