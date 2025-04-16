import { prisma } from "../../prisma/client";
import { getGamesByDate, getEventBoxScore, getAllTeams, getTeamRoster, ESPNApiTeam } from "../EspnService";
import { Game, Player, PlayerGameStats, PrismaClient, Team } from '@prisma/client';
import { Prisma } from '@prisma/client';

// Define stat indices based on expected ESPN API keys
const STAT_INDICES = {
  points: 13,
  rebounds: 6,
  assists: 7,
  steals: 8,
  blocks: 9,
  turnovers: 10,
  minutes: 0,
};

interface ESPNTeamRef {
  id?: string;
  displayName: string;
  abbreviation?: string;
  logos?: Array<{ href: string }>;
}

/**
 * Finds or creates a Team record based on ESPN data. Handles potential conflicts and TBD teams.
 */
const getOrCreateTeam = async (teamData: { id?: string; displayName: string; abbreviation?: string; logos?: { href: string }[] }) => {
  const teamName = teamData.displayName;
  const teamEspnId = teamData.id;
  const teamImage = teamData.logos?.[0]?.href;

  // --- Handle TBD Teams --- 
  if (teamName === "TBD" || teamName.includes('/')) {
    const tbdTeam = await prisma.team.findUnique({ where: { name: "TBD" } });
    if (tbdTeam) {
      return tbdTeam;
    }
    try {
      return await prisma.team.create({
        data: {
          name: "TBD",
          abbreviation: "TBD",
          espnId: null,
          image: null
        }
      });
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        console.warn("Warn: Race condition creating TBD team, attempting to fetch again.");
        return await prisma.team.findUnique({ where: { name: "TBD" } });
      }
      console.error("CRITICAL: Failed to create or find TBD team:", error);
      return null;
    }
  }
  // --- End TBD Handling --- 

  // --- Handle Normal Teams (Existing Robust Logic) --- 
  const teamAbbreviation = teamData.abbreviation ?? teamName.substring(0, 3).toUpperCase();
  const updatePayload = {
    name: teamName,
    abbreviation: teamAbbreviation,
    ...(teamEspnId && { espnId: teamEspnId }),
    ...(teamImage && { image: teamImage })
  };
  const createPayload = {
    espnId: teamEspnId,
    name: teamName,
    abbreviation: teamAbbreviation,
    image: teamImage
  };

  let team = null;

  // 1. Try finding by ESPN ID if provided
  if (teamEspnId) {
    team = await prisma.team.findUnique({ where: { espnId: teamEspnId } });
    if (team) {
      try {
        return await prisma.team.update({ where: { id: team.id }, data: updatePayload });
      } catch (error: any) {
        console.warn(`Warn: Failed to update team ${team.id} found by espnId ${teamEspnId} (conflict?): ${error.message}. Using existing.`);
        return team;
      }
    }
  }

  // 2. If not found by espnId, try finding by Name
  team = await prisma.team.findUnique({ where: { name: teamName } });
  if (team) {
    try {
      return await prisma.team.update({ where: { id: team.id }, data: updatePayload });
    } catch (error: any) {
      console.warn(`Warn: Failed to update team ${team.id} found by name ${teamName} (conflict?): ${error.message}. Using existing.`);
      return team;
    }
  }

  // 3. If not found by espnId or Name, try to create
  try {
    return await prisma.team.create({ data: createPayload });
  } catch (error: any) {
    console.error(`Error: Failed to create team ${teamName} (espnId: ${teamEspnId}): ${error.message}`);
    team = await prisma.team.findUnique({ where: { name: teamName } });
    if (team) {
      console.warn(`Warn: Found team ${teamName} on fallback search after create failed.`);
      return team;
    }
    console.error(`CRITICAL: Could not find or create team: ${teamName}`);
    return null;
  }
};

/**
 * Finds or creates a Player record based on ESPN data.
 */
export const getOrCreatePlayer = async (playerData: { id?: string; displayName: string; headshot?: { href: string } }, teamId: string | null) => {
  if (!playerData.id) {
    console.warn(`Missing ESPN ID for player: ${playerData.displayName}. Skipping upsert based on ID.`);
    console.error(`Could not find or create player without ESPN ID: ${playerData.displayName}`);
    return null;
  }

  return prisma.player.upsert({
    where: { espnId: playerData.id },
    update: {
      name: playerData.displayName,
      currentTeamId: teamId,
      ...(playerData.headshot?.href && { image: playerData.headshot.href })
    },
    create: {
      espnId: playerData.id,
      name: playerData.displayName,
      currentTeamId: teamId,
      image: playerData.headshot?.href || null
    },
  });
};

/**
 * Parses raw stats array from ESPN based on predefined indices.
 */
const parsePlayerStats = (athlete: any) => {
  // Check if the athlete has stats
  if (!athlete.stats || !Array.isArray(athlete.stats)) {
    return {
      points: null,
      rebounds: null,
      assists: null,
      steals: null,
      blocks: null,
      turnovers: null,
      minutes: null,
    };
  }

  const rawStats = athlete.stats;
  const getStat = (index: number | undefined): number | null => {
    if (index === undefined || rawStats[index] === undefined || rawStats[index] === "" || rawStats[index] === null) {
      return null;
    }
    const parsed = parseInt(rawStats[index], 10);
    return isNaN(parsed) ? null : parsed;
  };

  return {
    points: getStat(STAT_INDICES.points),
    rebounds: getStat(STAT_INDICES.rebounds),
    assists: getStat(STAT_INDICES.assists),
    steals: getStat(STAT_INDICES.steals),
    blocks: getStat(STAT_INDICES.blocks),
    turnovers: getStat(STAT_INDICES.turnovers),
    minutes: rawStats[STAT_INDICES.minutes] ?? null,
  };
};

interface LoadGamesResult {
  gamesProcessed: number;
  gamesFailed: number;
  errors: string[];
  games: (Game & {
    homeTeam: Team;
    awayTeam: Team;
    playerStats: (PlayerGameStats & {
      player: Player;
    })[];
  })[];
}

/**
 * Logs stats for a single game.
 */
export const logGameStats = (game: Game & {
  homeTeam: Team;
  awayTeam: Team;
  playerStats: (PlayerGameStats & {
    player: Player;
  })[];
}) => {
  console.log("\n=================================");
  console.log(`${game.homeTeam.name} vs ${game.awayTeam.name} (${new Date(game.date).toLocaleDateString()})`);
  console.log(`Status: ${game.status}`);
  if (game.status === 'FINAL' || game.homeScore !== null || game.awayScore !== null) {
    console.log(`Score: ${game.homeTeam.abbreviation} ${game.homeScore ?? '-'} - ${game.awayTeam.abbreviation} ${game.awayScore ?? '-'}`);
  }
  if (!game.statsProcessed) {
    console.log("(Stats may not be fully processed yet)");
  }

  const homePlayers = game.playerStats.filter(ps => ps.player.currentTeamId === game.homeTeamId);
  const awayPlayers = game.playerStats.filter(ps => ps.player.currentTeamId === game.awayTeamId);

  [homePlayers, awayPlayers].forEach((teamPlayers, index) => {
    const team = index === 0 ? game.homeTeam : game.awayTeam;
    if (teamPlayers.length === 0) return;

    console.log(`\n--- ${team.name} ---`);

    // Sort players by points scored (handle nulls)
    const sortedPlayers = [...teamPlayers].sort((a, b) => (b.points ?? -1) - (a.points ?? -1));

    // Log top performers or all players
    sortedPlayers.slice(0, 5).forEach(player => {
      if (player.minutes === '0' || player.minutes === '00:00') return; // Skip DNP
      console.log(
        `  ${player.player.name}: ${player.points ?? '-'}pts, ${player.rebounds ?? '-'}reb, ${player.assists ?? '-'}ast ` +
        `(${player.steals ?? '-'}stl, ${player.blocks ?? '-'}blk, ${player.turnovers ?? '-'}to) ` +
        `in ${player.minutes ?? '-'} min`
      );
    });
  });
  console.log("=================================");
};

interface ESPNCompetitor {
  id: string;
  uid: string;
  type: string;
  order: number;
  homeAway: "home" | "away";
  team: ESPNTeamRef;
  score?: string;
  athletes?: Array<{
    id: string;
    displayName: string;
    headshot?: { href: string };
  }>;
}

/**
 * Loads all games and their associated data (teams, players, stats) for a given date.
 * @param date The date to load games for
 * @param options Optional configuration for the loading process
 * @returns Summary of the loading process
 */
export const loadGamesForDate = async (
  date: Date,
  options: {
    verbose?: boolean;
  } = {}
): Promise<LoadGamesResult> => {
  const { verbose = false } = options;
  const log = verbose ? console.log : () => { };
  const errors: string[] = [];
  let gamesProcessed = 0;
  let gamesFailed = 0;
  const processedGames: LoadGamesResult['games'] = [];

  try {
    // 1. Fetch games for the date
    const events = await getGamesByDate({ date });

    if (events.length === 0) {
      log("No ESPN events found for the specified date.");
      return { gamesProcessed, gamesFailed, errors, games: [] };
    }

    log(`Found ${events.length} events. Processing...`);

    // 2. Process each game
    for (const event of events) {
      try {
        log(`\nProcessing game: ${event.id} (${event.name})`);
        const competition = event.competitions?.[0];
        if (!competition) {
          const error = `Event ${event.id} missing competition data. Skipping.`;
          log(error);
          errors.push(error);
          gamesFailed++;
          continue;
        }

        const homeComp = competition.competitors.find(c => c.homeAway === 'home');
        const awayComp = competition.competitors.find(c => c.homeAway === 'away');

        if (!homeComp?.team || !awayComp?.team) {
          const error = `Event ${event.id} missing team data. Skipping.`;
          log(error);
          errors.push(error);
          gamesFailed++;
          continue;
        }

        // Log competitor structure to understand player data
        log('\nHome competitor data:');
        log(JSON.stringify(homeComp, null, 2));
        log('\nAway competitor data:');
        log(JSON.stringify(awayComp, null, 2));
        // Log status object to check for TBD indicators
        log('\nEvent Status:');
        log(JSON.stringify(event.status, null, 2));

        // 3. Create/Update Teams
        const homeTeam = await getOrCreateTeam(homeComp.team);
        const awayTeam = await getOrCreateTeam(awayComp.team);

        if (!homeTeam || !awayTeam) {
          const error = `Could not process teams for event ${event.id}. Skipping.`;
          log(error);
          errors.push(error);
          gamesFailed++;
          continue;
        }

        // 4. Create/Update Game
        const gameDate = new Date(event.date); // This is the full timestamp, likely UTC

        // --- Determine Date and Start Time --- 

        // Calculate the date string specifically for the New York timezone
        const nyDateString = gameDate.toLocaleDateString('en-CA', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }); // Format: YYYY-MM-DD

        // Create a Date object representing midnight UTC on the calculated New York date
        // This ensures the correct DATE is stored by Prisma's @db.Date
        const dbDateForNY = new Date(nyDateString + 'T00:00:00.000Z');

        // Check the status details for TBD using type assertion for missing properties
        const statusType = event.status?.type as any; // Assert type here
        const isTBD = statusType?.detail?.toUpperCase().includes('TBD') || 
                      statusType?.shortDetail?.toUpperCase().includes('TBD') ||
                      false; // Default to false if no TBD found
                      
        const startsAtValue = isTBD ? null : gameDate;

        const game = await prisma.game.upsert({
          where: { espnId: event.id },
          update: {
            date: dbDateForNY,
            startsAt: startsAtValue,
            status: event.status.type.name,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeScore: homeComp.score ? parseInt(homeComp.score) : null,
            awayScore: awayComp.score ? parseInt(awayComp.score) : null,
          },
          create: {
            espnId: event.id,
            date: dbDateForNY,
            startsAt: startsAtValue,
            status: event.status.type.name,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeScore: homeComp.score ? parseInt(homeComp.score) : null,
            awayScore: awayComp.score ? parseInt(awayComp.score) : null,
            statsProcessed: false,
          },
        });

        // 5. Fetch Box Score and Process Player Stats if game is not scheduled (i.e., in progress or completed)
        if (event.status.type && (event.status.type as any).state !== 'pre') {
          log(`Fetching box score for game ${event.id} because status state is '${(event.status.type as any).state}'...`);
          const boxScore = await getEventBoxScore({ eventId: event.id });

          if (!boxScore) {
            const error = `Box score not available for game ${event.id}. Skipping stats.`;
            log(error);
            errors.push(error);
            // DO NOT 'continue' here, we still want to mark the game processed if possible
            // and add it to the results, even without stats.
          } else {
            // --- Process Box Score Teams/Stats (using data now populated correctly by EspnService) ---
            log(`  Processing box score stats for game ${event.id}...`);
            for (const teamBox of boxScore.teams) {
              const team = await getOrCreateTeam(teamBox.team);
              if (!team) continue;

              // Process each player's stats
              for (const athlete of teamBox.athletes || []) {
                // Skip players who didn't play or don't have stats
                if (athlete.didNotPlay || !athlete.stats || !Array.isArray(athlete.stats) || athlete.stats.length === 0) { // Added check for empty stats array
                  continue;
                }

                const player = await getOrCreatePlayer(athlete.athlete, team.id);
                if (!player) continue;

                const stats = parsePlayerStats(athlete);

                // Create/Update PlayerGameStats
                try {
                  await prisma.playerGameStats.upsert({
                    where: {
                      gameId_playerId: {
                        gameId: game.id,
                        playerId: player.id,
                      },
                    },
                    update: stats,
                    create: {
                      gameId: game.id,
                      playerId: player.id,
                      ...stats,
                    },
                  });
                } catch (upsertError: any) { // Added : any to catch error
                  log(`    ERROR upserting stats for ${player.name}:`, upsertError);
                  errors.push(`Error upserting stats for ${player.name} in game ${game.id}: ${upsertError.message}`);
                }
              }
            }
            // --- End Box Score Stats Processing ---

            // Mark game as processed ONLY if box score stats were successfully processed
            // This logic should still be valid as it checks the populated boxScore.teams[...].athletes[...].stats
            const statsWereProcessed = boxScore.teams.some(tb => tb.athletes?.some(a => a.stats && a.stats.length > 0));
            if (statsWereProcessed) {
              await prisma.game.update({
                where: { id: game.id },
                data: { statsProcessed: true },
              });
              log(`  Marked game ${game.id} as statsProcessed.`);
            }
          } // End else block for boxScore check
        }

        // Update the game object before pushing to processedGames
        const gameWithRelations = await prisma.game.findUnique({
          where: { id: game.id },
          include: {
            homeTeam: true,
            awayTeam: true,
            playerStats: {
              include: {
                player: true
              }
            }
          }
        });

        if (gameWithRelations) {
          processedGames.push(gameWithRelations);
        }

        gamesProcessed++;
      } catch (error: any) {
        log(`Error processing game ${event.id}:`, error);
        errors.push(`Error processing game ${event.id}: ${error.message}`);
        gamesFailed++;
      }
    }

    return { gamesProcessed, gamesFailed, errors, games: processedGames };
  } catch (error: any) {
    log(`Error loading games for date ${date}:`, error);
    errors.push(`Critical error fetching events for date ${date.toISOString()}: ${error.message}`); // Add critical error to list
    return { gamesProcessed, gamesFailed, errors, games: [] }; // Return empty results on critical failure
  }
};

/**
 * Fetches all NBA teams and their rosters from the ESPN API and upserts them into the database.
 * Processes teams in batches to manage load and concurrency.
 */
export async function loadTeamsAndPlayers() {
  console.log("Starting to load teams and players from ESPN API...");

  try {
    const allApiTeams = await getAllTeams(); // Fetch all teams initially

    if (!allApiTeams || allApiTeams.length === 0) {
      console.warn("No teams fetched from ESPN API. Aborting database load.");
      return;
    }

    console.log(`Fetched ${allApiTeams.length} teams. Processing in batches...`);

    const batchSize = 10; // Define batch size

    // Create chunks of teams
    const teamChunks: ESPNApiTeam[][] = [];
    for (let i = 0; i < allApiTeams.length; i += batchSize) {
      teamChunks.push(allApiTeams.slice(i, i + batchSize));
    }

    // Process each chunk sequentially
    for (let i = 0; i < teamChunks.length; i++) {
      const chunk = teamChunks[i];
      console.log(`--- Processing Batch ${i + 1} of ${teamChunks.length} (Teams ${i * batchSize + 1} to ${Math.min((i + 1) * batchSize, allApiTeams.length)}) ---`);

      // Process teams within the current chunk in parallel
      const batchPromises = chunk.map(async (apiTeam) => {
        // Encapsulate the logic for processing a single team
        if (!apiTeam.abbreviation || !apiTeam.id) {
          console.warn(`Team with name "${apiTeam.displayName}" is missing abbreviation or ID. Skipping.`);
          return; // Skip this team in the batch
        }

        console.log(`Processing team: ${apiTeam.displayName} (${apiTeam.abbreviation})`);

        // --- Database Team Upsert ---
        const primaryLogo = apiTeam.logos?.find(logo => logo.rel.includes("default"));
        let upsertedTeam: Team | null = null;
        try {
          upsertedTeam = await prisma.team.upsert({
            where: { espnId: apiTeam.id },
            update: {
              name: apiTeam.displayName,
              abbreviation: apiTeam.abbreviation,
              image: primaryLogo?.href,
            },
            create: {
              espnId: apiTeam.id,
              name: apiTeam.displayName,
              abbreviation: apiTeam.abbreviation,
              image: primaryLogo?.href,
            },
          });
          console.log(`Upserted team ${upsertedTeam.abbreviation} with DB ID ${upsertedTeam.id}`);
        } catch (dbError: any) { // Added :any
          console.error(`Failed to upsert team ${apiTeam.abbreviation} (ESPN ID: ${apiTeam.id}) into DB:`, dbError);
          throw new Error(`Team upsert failed for ${apiTeam.abbreviation}: ${dbError.message}`); // Re-throw to be caught by Promise.allSettled
        }

        // --- Fetch Roster ---
        let rosterData;
        try {
          rosterData = await getTeamRoster(apiTeam.abbreviation);
        } catch (fetchError: any) { // Added :any
          console.error(`Failed to fetch roster for ${apiTeam.abbreviation}:`, fetchError);
          throw new Error(`Roster fetch failed for ${apiTeam.abbreviation}: ${fetchError.message}`); // Re-throw
        }


        if (!rosterData || !rosterData.athletes || rosterData.athletes.length === 0) {
          console.warn(`No roster data found for ${apiTeam.abbreviation}. Skipping player processing.`);
          return; // Stop processing this team if no roster data
        }

        console.log(`Fetched ${rosterData.athletes.length} players for ${apiTeam.abbreviation}. Processing players...`);

        // --- Database Player Upsert (can also be batched per team if needed, but upserting one-by-one is often fine) ---
        for (const apiPlayer of rosterData.athletes) {
          if (!apiPlayer.id) {
            console.warn(`Player data missing ID for team ${apiTeam.abbreviation}. Player name: ${apiPlayer.fullName}. Skipping.`);
            continue; // Skip this player
          }

          try {
            // *** Adding currentTeamId to update block as discussed previously ***
            await prisma.player.upsert({
              where: { espnId: apiPlayer.id },
              update: {
                name: apiPlayer.fullName,
                image: apiPlayer.headshot?.href,
                currentTeamId: upsertedTeam.id, // Keep player associated with the current team
                // Consider adding other fields here if needed (firstName, lastName, etc.)
              },
              create: {
                espnId: apiPlayer.id,
                name: apiPlayer.fullName,
                image: apiPlayer.headshot?.href,
                currentTeamId: upsertedTeam.id,
                // Consider adding other fields here if needed
              },
            });
            // console.log(`Upserted player ${apiPlayer.fullName} (ESPN ID: ${apiPlayer.id}) for team ${apiTeam.abbreviation}`);
          } catch (dbError: any) { // Added :any
            console.error(`Failed to upsert player ${apiPlayer.fullName} (ESPN ID: ${apiPlayer.id}) for team ${apiTeam.abbreviation}:`, dbError);
            // Log error but continue with the next player
          }
        }
        console.log(`Finished processing players for ${apiTeam.abbreviation}.`);
      }); // End of async function for map

      // Wait for all promises in the current batch to settle
      const results = await Promise.allSettled(batchPromises);
      // Log any rejected promises within the batch
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          // Getting the team name requires the original chunk array index
          const teamName = chunk[index]?.displayName || `Team at index ${index} in batch`;
          console.error(`Error processing ${teamName} in batch ${i + 1}:`, result.reason);
        }
      });


      console.log(`--- Finished Batch ${i + 1} ---`);
      // Optional: Add a delay between batches if needed to further rate limit
      // await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    } // End of loop through chunks

    console.log("Finished loading all teams and players.");

  } catch (error) {
    console.error("A critical error occurred during the overall loadTeamsAndPlayers process:", error);
    // Depending on requirements, you might want to re-throw the error
    // throw new Error(`Failed to complete team and player load: ${error.message}`);
  }
};