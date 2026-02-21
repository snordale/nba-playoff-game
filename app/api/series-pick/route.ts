import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

const VALID_GAMES_COUNTS = [4, 5, 6, 7];

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { seriesId: string; winnerTeamId: string; gamesCount: number; groupId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { seriesId, winnerTeamId, gamesCount, groupId } = body;

  if (!seriesId || !winnerTeamId || !groupId) {
    return NextResponse.json(
      { error: "seriesId, winnerTeamId, and groupId are required" },
      { status: 400 }
    );
  }

  if (
    typeof gamesCount !== "number" ||
    !VALID_GAMES_COUNTS.includes(gamesCount)
  ) {
    return NextResponse.json(
      { error: "gamesCount must be 4, 5, 6, or 7" },
      { status: 400 }
    );
  }

  try {
    const series = await prisma.playoffSeries.findUnique({
      where: { id: seriesId },
      include: {
        highSeedTeam: true,
        lowSeedTeam: true,
      },
    });

    if (!series) {
      return NextResponse.json({ error: "Series not found" }, { status: 404 });
    }

    if (winnerTeamId !== series.highSeedTeamId && winnerTeamId !== series.lowSeedTeamId) {
      return NextResponse.json(
        { error: "winnerTeamId must be one of the series teams" },
        { status: 400 }
      );
    }

    const groupUser = await prisma.groupUser.findFirst({
      where: { userId, groupId },
      select: { id: true },
    });

    if (!groupUser) {
      return NextResponse.json(
        { error: "User must be in the specified group to make picks" },
        { status: 403 }
      );
    }

    const now = new Date();
    const isLocked =
      series.firstGameStartsAt && series.firstGameStartsAt <= now;

    if (isLocked) {
      return NextResponse.json(
        { error: "Series is locked; picks cannot be changed" },
        { status: 403 }
      );
    }

    const pick = await prisma.seriesPick.upsert({
      where: {
        groupUserId_seriesId: {
          groupUserId: groupUser.id,
          seriesId,
        },
      },
      update: {
        winnerTeamId,
        gamesCount,
      },
      create: {
        groupUserId: groupUser.id,
        seriesId,
        winnerTeamId,
        gamesCount,
      },
    });

    return NextResponse.json(pick);
  } catch (error) {
    console.error("Error creating/updating series pick:", error);
    return NextResponse.json(
      { error: "Failed to save series pick" },
      { status: 500 }
    );
  }
}
