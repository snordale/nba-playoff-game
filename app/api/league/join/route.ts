import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json({ message: "Unauthorized" });
  }

  const { leagueId, password } = await req.json();

  const league = await prisma.league.findUnique({
    where: {
      id: leagueId,
    },
  });

  if (!league) {
    return Response.json({ message: "League not found" });
  }

  if (league.password !== password) {
    return Response.json({ message: "Incorrect password" });
  }

  const playerExists = await prisma.player.findFirst({
    where: {
      userId: session.user.id,
      leagueId,
    },
  });

  if (playerExists) {
    return Response.json({ message: "Player already in league" });
  }

  await prisma.player.create({
    data: {
      userId: session.user.id,
      leagueId,
    },
  });

  return Response.json({ message: "Player added to league" });
}
