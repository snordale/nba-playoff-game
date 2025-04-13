import { prisma } from "../prisma/client";
import { Game, Player, PlayerGameStats, Team } from '@prisma/client';

// Type combining Game with its related data needed for logging
type GameWithStats = Game & {
  homeTeam: Team;
  awayTeam: Team;
  playerStats: (PlayerGameStats & {
    player: Player;
  })[];
};

/**
 * Parses command line arguments for a date string.
 * Accepts formats like YYYY-MM-DD or --date=YYYY-MM-DD.
 * Defaults to today if no valid date is found.
 */
const getTargetDate = (): Date => {
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
    // const parsedDate = new Date(dateArg + 'T00:00:00'); // Assume local timezone midnight
    const [year, month, day] = dateArg.split('-').map(Number);
    // Create Date object representing midnight UTC on the target day
    const parsedDate = new Date(Date.UTC(year, month - 1, day)); 
    if (!isNaN(parsedDate.getTime())) {
      console.log(`Using provided date: ${dateArg}`);
      return parsedDate;
    }
    console.warn(`Invalid date format provided: ${dateArg}. Defaulting to today.`);
  }

  console.log("No date provided or invalid format. Defaulting to today.");
  return new Date();
};

/**
 * Logs stats for a single game based on data fetched from the database.
 */
const logGameStats = (game: GameWithStats) => {
  console.log("\n=================================");
  console.log(`${game.homeTeam.name} vs ${game.awayTeam.name} (${new Date(game.date).toLocaleDateString()})`);
  console.log(`Status: ${game.status}`);
  if (game.status === 'FINAL' || game.homeScore !== null || game.awayScore !== null) {
    console.log(`Score: ${game.homeTeam.abbreviation} ${game.homeScore ?? '-'} - ${game.awayTeam.abbreviation} ${game.awayScore ?? '-'}`);
  }
  if (!game.statsProcessed) {
    console.log("(Stats may not be fully processed yet)");
  }

  const formattedPlayers = game.playerStats.map(ps => ({
    name: ps.player.name,
    points: ps.points,
    rebounds: ps.rebounds,
    assists: ps.assists,
    steals: ps.steals,
    blocks: ps.blocks,
    turnovers: ps.turnovers,
    minutes: ps.minutes,
    // Add team association if needed (requires joining through Player)
    // teamName: game.homeTeamId === ps.player.currentTeamId ? game.homeTeam.name : game.awayTeam.name 
  }));

  const homePlayers = formattedPlayers.filter(fp =>
    game.playerStats.some(ps => ps.player.name === fp.name && ps.player.currentTeamId === game.homeTeamId)
  );
  const awayPlayers = formattedPlayers.filter(fp =>
    game.playerStats.some(ps => ps.player.name === fp.name && ps.player.currentTeamId === game.awayTeamId)
  );

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
        `  ${player.name}: ${player.points ?? '-'}pts, ${player.rebounds ?? '-'}reb, ${player.assists ?? '-'}ast ` +
        `(${player.steals ?? '-'}stl, ${player.blocks ?? '-'}blk, ${player.turnovers ?? '-'}to) ` +
        `in ${player.minutes ?? '-'} min`
      );
    });
  });
  console.log("=================================");
};

/**
 * Main function to fetch and log stats for the target date.
 */
async function main() {
  const targetDateUTC = getTargetDate(); // e.g., 2025-04-13T00:00:00.000Z

  // Calculate the start of the next day in UTC
  const nextDayUTC = new Date(targetDateUTC);
  nextDayUTC.setUTCDate(targetDateUTC.getUTCDate() + 1);
  // Example: nextDayUTC becomes 2025-04-14T00:00:00.000Z

  // Use the correct date range for the query
  const startDateStr = targetDateUTC.toISOString();
  const endDateStr = nextDayUTC.toISOString();
  // Update log message to show the actual query range
  console.log(`\nFetching processed game stats from DB for date ${targetDateUTC.toISOString().split('T')[0]} (UTC Range: ${startDateStr} to ${endDateStr})...`);

  try {
    const games: GameWithStats[] = await prisma.game.findMany({
      where: {
        // Remove exact match query
        // date: targetDateUTC, 
        // Use the correct date range query
        date: {
          gte: targetDateUTC, // Greater than or equal to the start of the day (UTC midnight)
          lt: nextDayUTC,     // Less than the start of the next day (UTC midnight)
        },
      },
      include: {
        homeTeam: true,
        awayTeam: true,
        playerStats: {
          include: {
            player: true,
          },
          orderBy: { // Optional: order player stats, e.g., by points
            points: 'desc'
          }
        },
      },
      orderBy: {
        date: 'asc', // Order games by date
      }
    });

    if (games.length === 0) {
      console.log("No games found in the database for the specified date.");
      return;
    }

    console.log(`Found ${games.length} games in DB for ${targetDateUTC.toLocaleDateString()}.`);

    games.forEach(logGameStats);

    // --- League-wide Leaders for the Date ---
    console.log("\n=== Notable Stats Across Games ===");

    const allPlayerStats = games.flatMap(game =>
      game.playerStats.map(ps => ({ ...ps, playerName: ps.player.name })) // Add name for easier logging
    );

    if (allPlayerStats.length === 0) {
      console.log("No player stats available to calculate leaders.");
      return;
    }

    const findLeader = (stat: keyof PlayerGameStats) => {
      return allPlayerStats.reduce((max, p) => {
        const pValue = p[stat];
        const maxValue = max ? max[stat] : null;
        // Check for nulls and compare numbers
        if (typeof pValue === 'number' && (max === null || typeof maxValue !== 'number' || pValue > maxValue)) {
          return p;
        }
        return max;
      }, null as (PlayerGameStats & { playerName: string }) | null);
    };

    const topScorer = findLeader('points');
    const topRebounder = findLeader('rebounds');
    const topAssister = findLeader('assists');
    const topStealer = findLeader('steals');
    const topBlocker = findLeader('blocks');

    if (topScorer) console.log(`Top Scorer:     ${topScorer.playerName} (${topScorer.points} pts)`);
    if (topRebounder) console.log(`Top Rebounder:  ${topRebounder.playerName} (${topRebounder.rebounds} reb)`);
    if (topAssister) console.log(`Top Assister:   ${topAssister.playerName} (${topAssister.assists} ast)`);
    if (topStealer) console.log(`Top Stealer:    ${topStealer.playerName} (${topStealer.steals} stl)`);
    if (topBlocker) console.log(`Top Blocker:    ${topBlocker.playerName} (${topBlocker.blocks} blk)`);

  } catch (error) {
    console.error("Error fetching or processing game stats from database:", error);
  }
};

// Execute the script
main();