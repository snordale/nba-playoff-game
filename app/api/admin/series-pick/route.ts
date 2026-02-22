import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

const VALID_GAMES_COUNTS = [4, 5, 6, 7];

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { groupId: string; userId: string; seriesId: string; winnerTeamId: string; gamesCount: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { groupId, userId, seriesId, winnerTeamId, gamesCount } = body;

  if (!groupId || !userId || !seriesId || !winnerTeamId) {
    return NextResponse.json(
      { error: "groupId, userId, seriesId, and winnerTeamId are required" },
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
        { error: "User is not in the specified group" },
        { status: 404 }
      );
    }

    // Admin can set pick regardless of lock
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

    return NextResponse.json({ message: "Series pick saved", pick });
  } catch (error) {
    console.error("[ADMIN] Error upserting series pick:", error);
    return NextResponse.json(
      { error: "Failed to save series pick" },
      { status: 500 }
    );
  }
}
