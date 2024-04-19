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

  await prisma.submission.create({
    data: {
      playerName,
      playerImage,
      teamName,
      playerId: player.id,
    },
  });

  return Response.json("Submission created");
}
