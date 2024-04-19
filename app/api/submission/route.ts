import { auth } from "@/auth";
import { prisma } from "@/prisma/client";

import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { playerName, playerImage, leagueId, teamName } = await req.json();

  const player = await prisma.player.findFirst({
    where: {
      leagueId,
      user: {
        email: session.user.email,
      },
    },
  });

  if (!player) {
    return new Response("Player not found", { status: 401 });
  }

  const existingSubmission = await prisma.submission.findFirst({
    where: {
      playerId: player.id,
      createdAt: {
        gte: new Date().setHours(0, 0, 0, 0).toString(),
        lt: new Date().setHours(23, 59, 59, 999).toString(),
      },
    },
  });

  if (existingSubmission) {
    await prisma.submission.update({
      where: {
        id: existingSubmission.id,
      },
      data: {
        playerName,
        playerImage,
        teamName,
      },
    });
  } else {
    await prisma.submission.create({
      data: {
        playerName,
        playerImage,
        teamName,
        playerId: player.id,
      },
    });
  }

  return Response.json("Submission created");
}
