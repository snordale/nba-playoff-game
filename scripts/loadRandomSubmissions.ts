import { PLAYOFF_START_DATE } from '@/constants';
import { Game, Player, PrismaClient } from '@prisma/client';
import { format, isBefore, parseISO, startOfDay, subDays } from 'date-fns';

const prisma = new PrismaClient();

// Helper function to get a random element from an array
function getRandomElement<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

async function populatePastSubmissions(groupId: string) {
  console.log(`Starting population for group ID: ${groupId}`);

  const groupUsers = await prisma.groupUser.findMany({
    where: { groupId },
    include: { user: true }, // Include user for logging purposes if needed
  });

  if (!groupUsers.length) {
    console.error(`No users found for group ID: ${groupId}`);
    return;
  }

  console.log(`Found ${groupUsers.length} users in group ${groupId}.`);

  const startDate = parseISO(PLAYOFF_START_DATE);
  const yesterday = subDays(new Date(), 1); // Go up to yesterday

  console.log(`Processing dates from ${format(startDate, 'yyyy-MM-dd')} to ${format(yesterday, 'yyyy-MM-dd')}`);

  let currentDate = startDate;
  while (isBefore(currentDate, yesterday) || format(currentDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    console.log(`\n--- ${dateStr} ---`);

    // Find games that occurred on this specific calendar date
    const gamesOnDate = await prisma.game.findMany({
      where: {
        date: {
          equals: new Date(dateStr),
        }
      },
      include: {
        playerStats: {
          include: {
            player: true,
            game: true,
          },
        },
      },
    });

    if (!gamesOnDate.length) {
      console.log(`No games found. Skipping.`);
      currentDate = subDays(currentDate, -1);
      continue;
    }

    const gameIdsOnDate = gamesOnDate.map((g) => g.id);

    // Get all player stats for games on this date
    const statsOnDate = await prisma.playerGameStats.findMany({
      where: {
        gameId: {
          in: gameIdsOnDate,
        },
      },
      include: {
        player: true,
        game: true,
      },
    });

    console.log(`Found ${gamesOnDate.length} games with ${statsOnDate.length} player performances`);

    if (!statsOnDate.length) {
      console.log(`No player stats found for games on ${dateStr}. Cannot create submissions.`);
      currentDate = subDays(currentDate, -1); // Move to the next day
      continue;
    }

    console.log(`Found stats for ${statsOnDate.length} player performances on ${dateStr}.`);

    // Get unique players who played on this date
    const playersWhoPlayedMap = new Map<string, { player: Player, game: Game }>();
    statsOnDate.forEach(stat => {
      if (stat.player && stat.game) {
        // Only add if not already present, favoring the first game stat found for simplicity
        if (!playersWhoPlayedMap.has(stat.playerId)) {
          playersWhoPlayedMap.set(stat.playerId, { player: stat.player, game: stat.game });
        }
      }
    });
    const playersWhoPlayedIds = Array.from(playersWhoPlayedMap.keys());

    if (!playersWhoPlayedIds.length) {
      console.log(`No players with stats found. Skipping.`);
      currentDate = subDays(currentDate, -1);
      continue;
    }

    console.log(`Unique players who played on ${dateStr}: ${playersWhoPlayedIds.length}`);

    for (const groupUser of groupUsers) {
      // 1. Check if user already has a submission for this date
      const existingSubmission = await prisma.submission.findFirst({
        where: {
          AND: [
            { userId: groupUser.userId },
            {
              game: {
                date: {
                  equals: new Date(dateStr)
                }
              }
            }
          ]
        },
      });

      // 2. Get players already picked by this user in this group
      const userSubmissions = await prisma.submission.findMany({
        where: { groupUserId: groupUser.id },
        select: { playerId: true },
      });
      const pickedPlayerIds = new Set(userSubmissions.map((sub) => sub.playerId));

      // 3. Find available players (played on date AND not picked yet by user)
      const availablePlayerIds = playersWhoPlayedIds.filter(
        (id) => !pickedPlayerIds.has(id)
      );

      if (!availablePlayerIds.length) {
        console.warn(`User ${groupUser.userId}: No available players found for ${dateStr} who haven't been picked already.`);
        continue;
      }

      // 4. Select a random available player
      const randomPlayerId = getRandomElement(availablePlayerIds);
      if (!randomPlayerId) {
        console.error(`User ${groupUser.userId}: Failed to select a random player for ${dateStr} (should not happen).`);
        continue;
      }

      const playerData = playersWhoPlayedMap.get(randomPlayerId);
      if (!playerData) {
        console.error(`User ${groupUser.userId}: Could not find player data for selected player ID ${randomPlayerId} on ${dateStr}. Skipping.`);
        continue;
      }

      // 5. Create or update the submission
      try {
        if (existingSubmission) {
          console.log(`Submission already exists for ${groupUser.user.username} on ${dateStr}. Skipping.`);
        } else {
          const newSubmission = await prisma.submission.create({
            data: {
              userId: groupUser.userId,
              groupUserId: groupUser.id,
              playerId: randomPlayerId,
              gameId: playerData.game.id,
            },
          });
          console.log(`${groupUser.user.username}: Picked ${playerData.player.name}`);
        }
      } catch (error) {
        console.error(`Failed to ${existingSubmission ? 'update' : 'create'} pick for ${groupUser.user.username}: ${error}`);
      }
    } // End loop through group users

    currentDate = subDays(currentDate, -1); // Move to the next day (Note: subDays with negative moves forward)
  } // End loop through dates

  console.log('\nPopulation script finished.');
}

async function main() {
  const args = process.argv.slice(2);
  const groupId = args[0];

  if (!groupId) {
    console.error('Error: Please provide a groupId as a command-line argument.');
    console.log('Usage: npx tsx scripts/populatePastSubmissions.ts <groupId>');
    process.exit(1);
  }

  try {
    await populatePastSubmissions(groupId);
  } catch (error) {
    console.error('An unexpected error occurred:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed.');
  }
}

main();