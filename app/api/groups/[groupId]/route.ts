import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server"; // Use NextResponse
import { Prisma } from "@prisma/client";

// Handler for GET /api/groups/[groupId]
export async function GET(req: NextRequest, { params }: { params: { groupId: string } }) {
  const groupId = params.groupId; // Get groupId from path parameters
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  if (!groupId) {
    return NextResponse.json({ error: "Group ID missing in URL" }, { status: 400 });
  }

  try {
    // Fetch the specific group details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Authorization check: Ensure the current user is part of this group
    const userInGroup = await prisma.groupUser.findFirst({
      where: {
        groupId: groupId,
        userId: userId,
      },
    });
    if (!userInGroup) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch group users and their submissions for this specific group
    const groupUsers = await prisma.groupUser.findMany({
      where: {
        groupId: groupId,
      },
      include: {
        user: { select: { id: true, username: true, email: true } }, // Select needed fields
        submissions: {
          orderBy: {
            createdAt: "desc",
          },
          // Keep include simple for game/player context
          include: {
            game: { select: { id: true, date: true, status: true } }, 
            player: { select: { id: true, name: true } }, 
          }
          // Remove the incorrect select clause
        },
      },
    });

    // Calculate scores
    const scoredGroupUsers = groupUsers.map((groupUser) => {
      let totalScore = 0;
      // The `sub` object here includes `calculatedScore` from the Submission model
      // and the included `game` and `player` relations
      const processedSubmissions = groupUser.submissions.map((sub) => {
        const score = sub.calculatedScore ?? 0;
        totalScore += score;
        return {
          // Return necessary submission fields
          id: sub.id,
          createdAt: sub.createdAt,
          gameId: sub.game.id,
          gameDate: sub.game.date,
          gameStatus: sub.game.status,
          playerId: sub.player.id,
          playerName: sub.player.name,
          score: score, // The calculated score for this submission
        };
      });

      return {
        // Return necessary groupUser fields
        groupUserId: groupUser.id,
        userId: groupUser.userId,
        username: groupUser.user.username,
        isAdmin: groupUser.isAdmin,
        score: totalScore, // The user's total score
        submissions: processedSubmissions.sort((a, b) => b.gameDate.getTime() - a.gameDate.getTime()),
      };
    }).sort((a, b) => b.score - a.score);

    // Return the combined data structure
    return NextResponse.json({ group, players: scoredGroupUsers });

  } catch (error) {
    console.error(`Error fetching group ${groupId}:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Remove the POST handler from this file, it was moved to app/api/groups/route.ts

// Remove the logic for handling GET /api/groups (all groups)
// That logic should be in app/api/groups/route.ts
