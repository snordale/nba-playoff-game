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

    // 4. Validate Game State (Ensure game hasn't started or finished)
    const now = new Date();
    const isScheduled = game.status === 'STATUS_SCHEDULED'; // Check for specific scheduled status

    // Prevent submission if game status is not scheduled OR if the scheduled start time is in the past
    if (!isScheduled || game.date <= now) { 
        let reason = !isScheduled ? `status is ${game.status}` : `start time (${game.date.toLocaleString()}) has passed`;
        return NextResponse.json(
            { error: `Cannot submit for this game because its ${reason}.` }, 
            { status: 400 } // Bad Request status
        );
    }
    
    // It might also be useful to check game.status if available and reliable
    // e.g., if (game.status === 'STATUS_FINAL' || game.status === 'FINAL') { ... }

    // 5. Validate Unique Player Pick (across all games for this user)
    const existingPlayerSubmission = await prisma.submission.findFirst({
      where: { userId, playerId },
    });
    if (existingPlayerSubmission) {
      return NextResponse.json(
        { error: `Player ${player.name} already submitted previously.` },
        { status: 409 } // 409 Conflict
      );
    }

    // 6. Validate Unique Game Pick (only one submission per game per user)
    const existingGameSubmission = await prisma.submission.findFirst({
      where: { userId, gameId },
    });
    if (existingGameSubmission) {
      return NextResponse.json(
        { error: "Submission already exists for this game." },
        { status: 409 } // 409 Conflict
      );
    }

    // 7. Create Submission
    const newSubmission = await prisma.submission.create({
      data: {
        userId: userId,
        gameId: gameId,
        playerId: playerId,
        // groupUserId might be needed if submissions are tied to groups?
      },
    });

    // 8. Return Success
    return NextResponse.json(newSubmission, { status: 201 }); // 201 Created

  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
  }
}
