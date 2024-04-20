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

  const startOfDayPacific = new Date(new Date().setHours(0, 0, 0, 0));
  startOfDayPacific.setHours(startOfDayPacific.getHours() - 7);

  const existingSubmission = await prisma.submission.findFirst({
    where: {
      playerId: player.id,
      createdAt: {
        gte: startOfDayPacific,
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
