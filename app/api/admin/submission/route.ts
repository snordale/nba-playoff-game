import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';

const ADMIN_EMAIL = "snordale@gmail.com"; // Define the admin email
const TIMEZONE = "America/New_York";

export async function POST(req: NextRequest) {
  const session = await auth();

  // 1. Check Authentication & Authorization
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const adminUserId = session.user.id; // For logging purposes

  let targetUserId: string;
  let groupId: string;
  let date: string; // Expecting YYYY-MM-DD format (in NY Timezone)
  let playerId: string;

  // 2. Get and Validate Input
  try {
    const body = await req.json();
    targetUserId = body.userId;
    groupId = body.groupId;
    date = body.date;
    playerId = body.playerId;

    if (!targetUserId || !groupId || !date || !playerId) {
      throw new Error("Missing required fields: userId, groupId, date, playerId");
    }
    // Basic date format validation (could be more robust)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
         throw new Error("Invalid date format. Expected YYYY-MM-DD.");
    }

  } catch (error: any) {
    console.error("[ADMIN] Error validating request body:", error);
    return NextResponse.json({ error: `Invalid request body: ${error.message}` }, { status: 400 });
  }

  try {
    console.log(`[ADMIN] Attempting submission for user ${targetUserId} in group ${groupId} on ${date} for player ${playerId} by admin ${adminUserId}`);

    // 3. Find the Target GroupUser
    const groupUser = await prisma.groupUser.findFirst({
      where: { userId: targetUserId, groupId: groupId },
    });
    if (!groupUser) {
        return NextResponse.json({ error: "Target user is not in the specified group" }, { status: 404 });
    }
    const groupUserId = groupUser.id;

    // 4. Find the Correct Game for the Player on the Specified Date
    // Fetch player entries for the date that match the selected player ID
    // The date from the request IS the NY date string. We need games whose date falls on this NY day.
    const startOfNYDay = fromZonedTime(`${date}T00:00:00`, TIMEZONE);
    const endOfNYDay = fromZonedTime(`${date}T23:59:59.999`, TIMEZONE);

    // Find games occurring *on* the target date in NY
    const gamesOnDate = await prisma.game.findMany({
        where: {
            date: {
                gte: startOfNYDay, // Convert NY day start to UTC for DB query
                lte: endOfNYDay    // Convert NY day end to UTC for DB query
            }
        },
        select: { id: true, date: true, startsAt: true, status: true }
    });

    if (gamesOnDate.length === 0) {
        return NextResponse.json({ error: `No games found scheduled for ${date}` }, { status: 404 });
    }

    // Now find which of these games the *player* is actually playing in (via PlayerGameStats or a direct relation if available)
    // We'll use the PlayerGameStats record associated with the player *for one of the games on that day*.
    // This assumes the player only plays one game per day.
    const playerGameStatLink = await prisma.playerGameStats.findFirst({
        where: {
            playerId: playerId,
            gameId: {
                in: gamesOnDate.map(g => g.id)
            }
        },
        select: { gameId: true }
    });

    if (!playerGameStatLink || !playerGameStatLink.gameId) {
        const player = await prisma.player.findUnique({ where: {id: playerId}, select: { name: true }})
        return NextResponse.json({ error: `Player ${player?.name ?? playerId} is not scheduled to play in any game on ${date}` }, { status: 404 });
    }
    const gameId = playerGameStatLink.gameId;
    const game = gamesOnDate.find(g => g.id === gameId); // Get the full game details

    // Optional: Add validation for game status/time if needed for admin actions
    // e.g., if (!game.status === 'STATUS_SCHEDULED') { ... }
    // e.g., if (game.startsAt && new Date(game.startsAt) <= new Date()) { ... }

    // 5. Find if a submission already exists for this GroupUser on this date
    // The game.date directly from the DB should be used for finding existing submissions for that *specific game instance's day*.
    const gameDateActual = game.date;
    const startOfDayUTC = new Date(gameDateActual); // Use the actual game date from DB
    startOfDayUTC.setUTCHours(0, 0, 0, 0);
    const endOfDayUTC = new Date(startOfDayUTC);
    endOfDayUTC.setUTCHours(23, 59, 59, 999);

    const existingDailySubmission = await prisma.submission.findFirst({
      where: {
        groupUserId: groupUserId,
        game: {
          date: { // Check against the UTC day boundaries of the game
            gte: startOfDayUTC,
            lte: endOfDayUTC,
          },
        },
      },
    });

    // Optional: Add check for unique player pick across other days if desired for admin actions
    // const otherPlayerPick = await prisma.submission.findFirst({ where: { groupUserId, playerId, NOT: { id: existingDailySubmission?.id } } });
    // if (otherPlayerPick) { ... }


    // 6. Create or Update Submission
    let resultSubmission;
    if (existingDailySubmission) {
      // Update existing submission for the day
      resultSubmission = await prisma.submission.update({
        where: { id: existingDailySubmission.id },
        data: {
          gameId: gameId,       // Update to the correct game
          playerId: playerId,     // Update player
        },
      });
      console.log(`[ADMIN] Updated submission ${resultSubmission.id} for groupUser ${groupUserId} on date ${date}`);
      return NextResponse.json({ message: "Submission updated successfully", submission: resultSubmission }, { status: 200 });

    } else {
      // Create new submission
      resultSubmission = await prisma.submission.create({
        data: {
          userId: targetUserId, // Link directly to user
          groupUserId: groupUserId, // Link to the junction table record
          gameId: gameId,
          playerId: playerId,
        },
      });
      console.log(`[ADMIN] Created submission ${resultSubmission.id} for groupUser ${groupUserId} on date ${date}`);
      return NextResponse.json({ message: "Submission created successfully", submission: resultSubmission }, { status: 201 });
    }

  } catch (error: any) {
    console.error("[ADMIN] Error creating/updating submission:", error);
    return NextResponse.json({ error: `Failed to create or update submission: ${error.message}` }, { status: 500 });
  }
} 