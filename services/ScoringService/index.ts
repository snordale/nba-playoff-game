import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/prisma/client";
import { getEventBoxScore, ESPNBoxScore, ESPNEvent, getGamesByDate } from "../EspnService";

// Define stat indices based on expected ESPN API keys (Confirm these indices!)
const STAT_INDICES = {
  points: 13,
  rebounds: 6,
  assists: 7,
  steals: 8,
  blocks: 9,
  turnovers: 10,
  minutes: 0,
};

// --- Helper Functions --- 

/**
 * Finds or creates a Team record based on ESPN data.
 */
const getOrCreateTeam = async (teamData: { id?: string; displayName: string; abbreviation?: string }) => {
  if (!teamData.id) {
    console.warn(`Missing ESPN ID for team: ${teamData.displayName}. Skipping upsert based on ID.`);
    // Fallback: try finding by name if ID is missing (less reliable)
    const existingTeam = await prisma.team.findUnique({ where: { name: teamData.displayName } });
    if (existingTeam) return existingTeam;
    // Cannot reliably create without ID or unique name
    console.error(`Could not find or create team without ESPN ID: ${teamData.displayName}`);
    return null;
  }

  return prisma.team.upsert({
    where: { espnId: teamData.id },
    update: {
      name: teamData.displayName,
      abbreviation: teamData.abbreviation ?? teamData.displayName.substring(0, 3).toUpperCase(),
    },
    create: {
      espnId: teamData.id,
      name: teamData.displayName,
      abbreviation: teamData.abbreviation ?? teamData.displayName.substring(0, 3).toUpperCase(),
    },
  });
};

/**
 * Finds or creates a Player record based on ESPN data.
 */
const getOrCreatePlayer = async (playerData: { id?: string; displayName: string }, teamId: string | null) => {
  if (!playerData.id) {
    console.warn(`Missing ESPN ID for player: ${playerData.displayName}. Skipping upsert based on ID.`);
    // Fallback logic might be needed here if IDs are unreliable, but it gets complex.
    console.error(`Could not find or create player without ESPN ID: ${playerData.displayName}`);
    return null;
  }

  return prisma.player.upsert({
    where: { espnId: playerData.id },
    update: {
      name: playerData.displayName,
      currentTeamId: teamId, // Update current team association
    },
    create: {
      espnId: playerData.id,
      name: playerData.displayName,
      currentTeamId: teamId,
    },
  });
};

/**
 * Parses raw stats array from ESPN based on predefined indices.
 */
const parsePlayerStats = (rawStats: string[]) => {
  const getStat = (index: number | undefined): number | null => {
    if (index === undefined || rawStats[index] === undefined || rawStats[index] === "" || rawStats[index] === null) {
      return null; // Return null if stat is missing or index is invalid
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
    minutes: rawStats[STAT_INDICES.minutes] ?? null, // Keep minutes as string or null
  };
};

/**
 * Calculates the score for a submission based on PlayerGameStats.
 * DEFINE YOUR SCORING LOGIC HERE.
 */
const calculateSubmissionScore = (stats: Prisma.PlayerGameStatsGetPayload<null>): number => {
  if (!stats) return 0;
  // Example scoring rule:
  const score = (stats.points ?? 0)
      + (stats.rebounds ?? 0) * 1.2
      + (stats.assists ?? 0) * 1.5
      + (stats.steals ?? 0) * 3
      + (stats.blocks ?? 0) * 3
      - (stats.turnovers ?? 0);
  return Math.round(score * 10) / 10; // Example: round to one decimal place
};

// --- Game Sync Function --- 

/**
 * Fetches games for a given date from ESPN and upserts them into the database.
 * Ensures associated teams are also created or found.
 * @param date - The date for which to sync games.
 */
export const syncGamesFromEspn = async (date: Date) => {
  console.log(`Starting ESPN game sync for ${date.toISOString().split("T")[0]}...`);
  let gamesUpserted = 0;
  let gamesFailed = 0;

  try {
    const events: ESPNEvent[] = await getGamesByDate({ date });

    if (events.length === 0) {
      console.log(`No ESPN events found for ${date.toISOString().split("T")[0]}.`);
      return;
    }

    console.log(`Found ${events.length} events. Syncing with database...`);

    for (const event of events) {
      try {
        const competition = event.competitions?.[0];
        if (!competition) {
          console.warn(`Event ${event.id} (${event.shortName}) missing competition data. Skipping.`);
          gamesFailed++;
          continue;
        }

        const homeComp = competition.competitors.find(c => c.homeAway === 'home');
        const awayComp = competition.competitors.find(c => c.homeAway === 'away');

        if (!homeComp || !awayComp || !homeComp.team || !awayComp.team) {
          console.warn(`Event ${event.id} (${event.shortName}) missing competitor team data. Skipping.`);
          gamesFailed++;
          continue;
        }

        // Ensure teams exist in DB first
        const homeTeam = await getOrCreateTeam(homeComp.team);
        const awayTeam = await getOrCreateTeam(awayComp.team);

        if (!homeTeam || !awayTeam) {
          console.error(`Could not get or create teams for event ${event.id}. Home: ${homeComp.team.displayName}, Away: ${awayComp.team.displayName}. Skipping game upsert.`);
          gamesFailed++;
          continue;
        }

        // Upsert the Game
        await prisma.game.upsert({
          where: { espnId: event.id },
          update: {
            date: new Date(event.date), // Ensure date is stored as DateTime
            status: event.status.type.name, // Update status
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            // Add score updates here if available directly in event data
            // homeScore: homeComp.score ? parseInt(homeComp.score) : null,
            // awayScore: awayComp.score ? parseInt(awayComp.score) : null,
          },
          create: {
            espnId: event.id,
            date: new Date(event.date), // Ensure date is stored as DateTime
            status: event.status.type.name,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            statsProcessed: false, // Default for new games
             // Add score updates here if available directly in event data
            // homeScore: homeComp.score ? parseInt(homeComp.score) : null,
            // awayScore: awayComp.score ? parseInt(awayComp.score) : null,
          },
        });
        gamesUpserted++;

      } catch (upsertError) {
        console.error(`Failed to upsert game ${event.id} (${event.shortName}):`, upsertError);
        gamesFailed++;
      }
    }

    console.log(`Game sync finished for ${date.toISOString().split("T")[0]}. Upserted: ${gamesUpserted}, Failed: ${gamesFailed}`);

  } catch (fetchError) {
      console.error(`Error fetching games from ESPN for sync on ${date.toISOString().split("T")[0]}:`, fetchError);
  }
};

// --- Main Stat/Score Update Function ---

/**
 * Ensures games from yesterday are synced, then fetches unprocessed games,
 * retrieves their box scores, updates game/player/team data, creates 
 * PlayerGameStats, and calculates scores for related submissions.
 */
export const updateGameStatsAndScores = async () => {
  const now = new Date();
  // Sync yesterday's games first to ensure they are in the DB
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  try {
    await syncGamesFromEspn(yesterday);
  } catch (syncError) {
    console.error(`Failed initial game sync for ${yesterday.toISOString().split("T")[0]}:`, syncError);
    // Decide if you want to proceed without sync or stop here
    // return; 
  }

  // Look for games from ~48 hours ago up to 1 hour ago to process stats
  const startTime = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const endTime = new Date(now.getTime() - 1 * 60 * 60 * 1000); 

  console.log(`Checking for games between ${startTime.toISOString()} and ${endTime.toISOString()} to process stats...`);

  // 1. Find Games in DB that might need processing
  const gamesToProcess = await prisma.game.findMany({
    where: {
      date: {
        gte: startTime,
        lt: endTime,
      },
      statsProcessed: false, // Only fetch games not yet processed
      status: { // Optionally only process games likely finished
        notIn: ['STATUS_SCHEDULED', 'STATUS_POSTPONED', 'STATUS_CANCELED'] 
      }
    },
    orderBy: {
        date: 'asc' // Process older games first
    }
  });

  if (gamesToProcess.length === 0) {
    console.log("No games found needing processing in the specified time range.");
    return;
  }

  console.log(`Found ${gamesToProcess.length} games potentially needing processing.`);

  let processedGames = 0;
  let updatedSubmissions = 0;

  // 2. Process each game
  for (const game of gamesToProcess) {
    console.log(`\nProcessing game: ${game.espnId} (${new Date(game.date).toLocaleDateString()})`);
    
    try {
      // 3. Fetch Box Score from ESPN
      const boxScore: ESPNBoxScore | null = await getEventBoxScore({ eventId: game.espnId });

      if (!boxScore) {
        console.log(` - Box score not available yet for game ${game.espnId}. Skipping.`);
        continue;
      }

      // Basic validation: Check if players data exists
      if (!boxScore.players || boxScore.players.length === 0) {
         console.warn(` - Box score for ${game.espnId} seems incomplete (missing players array). Skipping.`);
         continue;
      }
       
      // TODO: Add a check here based on game status from ESPN API if available in boxScore response
      // For now, assume if boxscore exists, game might be final
      // const isGameCompleted = boxScore.gameInfo?.status?.type?.completed ?? false;
      // if (!isGameCompleted) { console.log(` - Game ${game.espnId} not completed yet. Skipping.`); continue; }

      // Use a transaction for database updates for this game
      await prisma.$transaction(async (tx) => {
        // 4. Process Teams and Players
        for (const teamBox of boxScore.players) { // Iterate through teams in the box score
          const team = await getOrCreateTeam(teamBox.team);
          if (!team) continue; // Skip if team couldn't be resolved
          
          const statsData = teamBox.statistics?.[0]; // Assuming first entry has player stats
          if (!statsData || !statsData.keys || !statsData.athletes) {
            console.warn(` - Missing stats data for team ${team.name} in game ${game.espnId}`);
            continue;
          }

          // TODO: Validate keys array matches expected STAT_INDICES structure

          for (const playerBox of statsData.athletes) {
            const player = await getOrCreatePlayer(playerBox.athlete, team.id);
            if (!player) continue; // Skip if player couldn't be resolved
            
            const stats = parsePlayerStats(playerBox.stats);

            // 5. Create/Update PlayerGameStats
            await tx.playerGameStats.upsert({
              where: { gameId_playerId: { gameId: game.id, playerId: player.id } }, // Use the compound unique key
              update: { ...stats },
              create: {
                gameId: game.id,
                playerId: player.id,
                ...stats,
              },
            });
          }
        }

        // 6. Update Game record (scores, status)
        // TODO: Extract final scores from boxScore if available
        const homeScore = null; // Extract from boxScore.teams or competitions if possible
        const awayScore = null;
        await tx.game.update({
          where: { id: game.id },
          data: {
            statsProcessed: true,
            status: "FINAL", // Assuming processing means it's final
            homeScore: homeScore, // Update with actual scores
            awayScore: awayScore,
          },
        });
        
        console.log(` - Successfully processed stats for game ${game.espnId}`);
        processedGames++;

        // 7. Calculate scores for submissions related to this game
        const submissionsToScore = await tx.submission.findMany({
            where: { gameId: game.id, calculatedScore: null }, // Only score unprocessed submissions
            include: { player: { include: { stats: { where: { gameId: game.id } } } } } // Include needed stats
        });

        console.log(` - Found ${submissionsToScore.length} submissions to score for game ${game.id}`);

        for(const submission of submissionsToScore) {
            const playerStats = await tx.playerGameStats.findUnique({ // Fetch stats within transaction
                where: { gameId_playerId: { gameId: game.id, playerId: submission.playerId } }
            });

            if (playerStats) {
                const score = calculateSubmissionScore(playerStats);
                await tx.submission.update({
                    where: { id: submission.id },
                    data: { calculatedScore: score }
                });
                updatedSubmissions++;
            } else {
                console.warn(` - Could not find PlayerGameStats for submission ${submission.id} (Player: ${submission.playerId}, Game: ${game.id})`);
            }
        }
        console.log(` - Finished scoring submissions for game ${game.id}`);

      }); // End transaction

    } catch (error) {
      console.error(`\n--- Failed to process game ${game.espnId} ---`);
      console.error(error);
      // Optionally update game status to indicate processing error?
    }
  }

  console.log(`\nFinished stats processing cycle. 
Processed Games: ${processedGames}/${gamesToProcess.length}
Updated Submissions: ${updatedSubmissions}`);
};

// --- Remove Old Code ---
// Delete the old updateScores function, PlayerStats/BoxScorePlayer interfaces, 
// validateBoxScore, processPlayer, and retry functions.
