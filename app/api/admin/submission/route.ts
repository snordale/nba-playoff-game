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

    // 4. Find the Correct Game for the Player on the Specified Date (Alternative Approach)
    const startOfNYDay = fromZonedTime(`${date}T00:00:00`, TIMEZONE);
    const endOfNYDay = fromZonedTime(`${date}T23:59:59.999`, TIMEZONE);

    // Find the player and their current team ID
    const player = await prisma.player.findUnique({
        where: { id: playerId },
        select: { id: true, name: true, currentTeamId: true } // Ensure currentTeamId is selected
    });

    if (!player) {
        return NextResponse.json({ error: `Player with ID ${playerId} not found.` }, { status: 404 });
    }
    if (!player.currentTeamId) {
        return NextResponse.json({ error: `Player ${player.name} does not have a current team assigned.` }, { status: 400 });
    }
    const playerTeamId = player.currentTeamId;

    // Find games occurring *on* the target date in NY timezone involving the player's team
    const gamesOnDate = await prisma.game.findMany({
        where: {
            date: { // Compare game's UTC date against the NY day boundaries
                gte: startOfNYDay,
                lte: endOfNYDay
            },
            // Check if player's team is either home or away
            OR: [
                { homeTeamId: playerTeamId },
                { awayTeamId: playerTeamId }
            ]
        },
        // Select necessary fields
        select: { id: true, date: true, startsAt: true, status: true, homeTeamId: true, awayTeamId: true }
    });

    // Handle cases where the team might play twice (rare, but possible) or not at all
    if (gamesOnDate.length === 0) {
        return NextResponse.json({ error: `No game found for player ${player.name}'s team (${playerTeamId}) on ${date}` }, { status: 404 });
    }
    if (gamesOnDate.length > 1) {
        // Ambiguous situation - could log a warning or return an error
        console.warn(`[ADMIN] Found multiple games (${gamesOnDate.map(g => g.id).join(', ')}) for player ${player.name}'s team (${playerTeamId}) on ${date}. Using the first one found.`);
        // Or return NextResponse.json({ error: `Ambiguous: Found multiple games for player's team on ${date}` }, { status: 400 });
    }

    // Use the first game found (or implement logic to choose if multiple)
    const game = gamesOnDate[0];
    const gameId = game.id;

    // 5. Find if a submission already exists for this GroupUser on this date
    const gameDateActual = game.date; // Use the date from the specific game found
    const startOfDayUTC = new Date(gameDateActual);
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