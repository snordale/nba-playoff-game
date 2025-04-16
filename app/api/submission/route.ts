import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  // 1. Check Authentication
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let gameId: string;
  let playerId: string;

  // 2. Get and Validate Input
  try {
    const body = await req.json();
    gameId = body.gameId;
    playerId = body.playerId;

    if (!gameId || !playerId) {
      throw new Error("Missing gameId or playerId");
    }
  } catch (error) {
    console.error("Error validating request body:", error);
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    // 3. Fetch Game and Player concurrently
    const [game, player] = await Promise.all([
      prisma.game.findUnique({ where: { id: gameId } }),
      prisma.player.findUnique({ where: { id: playerId } }),
    ]);

    // Validate existence
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }
    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // 4. Validate Game State
    const isScheduled = game.status === 'STATUS_SCHEDULED';
    if (!isScheduled) {
      return NextResponse.json(
        { error: `Cannot submit for this game because its status is ${game.status}.` },
        { status: 400 }
      );
    }

    // Ensure game has a start time
    if (!game.startsAt) {
      return NextResponse.json(
        { error: "Cannot submit for this game because its start time is not set." },
        { status: 400 }
      );
    }

    // Check if game time has passed (game.startsAt is stored in America/New_York timezone)
    const now = new Date();
    const gameStart = new Date(game.startsAt);
    if (gameStart <= now) {
      return NextResponse.json(
        { error: `Cannot submit for this game because its start time (${gameStart.toLocaleString('en-US', { timeZone: 'America/New_York' })}) has passed.` },
        { status: 400 }
      );
    }

    // Find if a submission already exists for this user on this date
    const gameDate = game.date;
    const startOfDay = new Date(gameDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingDailySubmission = await prisma.submission.findFirst({
      where: {
        userId,
        game: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      },
    });

    // 5. Validate Unique Player Pick (across all *other* submissions for this user)
    const existingPlayerSubmission = await prisma.submission.findFirst({
      where: {
        userId,
        playerId,
        // Ensure we are not looking at the submission for *today* if it exists
        NOT: {
          id: existingDailySubmission?.id // Exclude today's submission from this check
        }
      },
    });
    if (existingPlayerSubmission) {
      return NextResponse.json(
        { error: `Player ${player.name} already submitted previously on a different day.` },
        { status: 409 } // 409 Conflict
      );
    }

    // Find the GroupUser record (assuming user is only in one active group context)
    const groupUsers = await prisma.groupUser.findMany({ where: { userId } });
    if (groupUsers.length === 0) {
      return NextResponse.json({ error: "You are not a member of any groups" }, { status: 400 });
    }
    const groupUser = groupUsers[0]; // Use the first group found

    // 6. Create or Update Submission
    let resultSubmission;
    if (existingDailySubmission) {
      // Update existing submission for the day
      resultSubmission = await prisma.submission.update({
        where: { id: existingDailySubmission.id },
        data: {
          gameId: gameId,       // Update to the new game
          playerId: playerId,     // Update to the new player
          // groupUserId remains the same
        },
      });
      console.log(`Updated submission ${resultSubmission.id} for user ${userId} on ${startOfDay.toLocaleDateString()}`);
      return NextResponse.json(resultSubmission, { status: 200 }); // OK status for update

    } else {
      // Create new submission
      resultSubmission = await prisma.submission.create({
        data: {
          userId: userId,
          gameId: gameId,
          playerId: playerId,
          groupUserId: groupUser.id
        },
      });
      console.log(`Created submission ${resultSubmission.id} for user ${userId} on ${startOfDay.toLocaleDateString()}`);
      return NextResponse.json(resultSubmission, { status: 201 }); // Created status for new
    }

  } catch (error) {
    console.error("Error creating/updating submission:", error);
    // Add check for specific Prisma errors if needed, e.g., unique constraint violation
    return NextResponse.json({ error: "Failed to create or update submission" }, { status: 500 });
  }
}
