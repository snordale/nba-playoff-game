import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextAuthRequest } from "next-auth/lib";

export async function POST(request: NextAuthRequest) {
  const session = await auth();

  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const requestBody = await request.json();

  const league = await prisma.league.findUnique({
    where: {
      id: requestBody.leagueId,
    },
  });

  if (!league) {
    return new Response("League not found", { status: 404 });
  }

  if (league.password !== requestBody.password) {
    return new Response("Incorrect password", { status: 401 });
  }

  const player = await prisma.player.findFirst({
    where: {
      userId: session.user.id,
      leagueId: requestBody.leagueId,
    },
  });

  if (player) {
    return new Response("Player already in league", { status: 400 });
  }

  await prisma.player.create({
    data: {
      userId: session.user.id,
      leagueId: requestBody.leagueId,
    },
  });

  return new Response("Player added to league", { status: 201 });
}
