import { prisma } from "../../prisma/client";
import { getGamesByDate, getEventBoxScore } from "../EspnService";
import { Game, Player, PlayerGameStats, Team } from '@prisma/client';
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
  if (teamName === "TBD") {
      const tbdTeam = await prisma.team.findUnique({ where: { name: "TBD" } });
      if (tbdTeam) {
          return tbdTeam;
      }
      try {
          console.log("Creating dedicated TBD team record...");
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
       if(team) {
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
const getOrCreatePlayer = async (playerData: { id?: string; displayName: string; headshot?: { href: string } }, teamId: string | null) => {
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
  const log = verbose ? console.log : () => {};
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

        // Log competition structure to understand available player data
        log('\nCompetition data structure:');
        log(JSON.stringify(competition, null, 2));

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

        // Initialize players from competition data if available
        if (competition.competitors) {
          for (const competitor of competition.competitors as ESPNCompetitor[]) {
            const team = competitor.homeAway === 'home' ? homeTeam : awayTeam;
            if (competitor.athletes) {
              log(`Processing ${competitor.homeAway} team athletes for ${team.name}...`);
              for (const athlete of competitor.athletes) {
                await getOrCreatePlayer(athlete, team.id);
              }
            }
          }
        }

        console.log('event.date', event.date);
        // 4. Create/Update Game
        const gameDate = new Date(event.date);
        // Convert date to New York time
        const newYorkDate = new Date(gameDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        
        const game = await prisma.game.upsert({
          where: { espnId: event.id },
          update: {
            date: newYorkDate,
            status: event.status.type.name,
            homeTeamId: homeTeam.id,
            awayTeamId: awayTeam.id,
            homeScore: homeComp.score ? parseInt(homeComp.score) : null,
            awayScore: awayComp.score ? parseInt(awayComp.score) : null,
          },
          create: {
            espnId: event.id,
            date: newYorkDate,
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
            continue;
          }

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
              } catch (upsertError) {
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
    return { gamesProcessed, gamesFailed, errors, games: [] };
  }
};