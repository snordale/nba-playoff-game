import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const requestBody = await req.json();

  console.log("session");
  console.log(session);

  const newLeague = await prisma.league.create({
    data: {
      name: requestBody.leagueName,
      password: requestBody.password,
      players: {
        create: {
          user: {
            connect: {
              email: session.user.email,
            },
          },
          isAdmin: new Date(),
        },
      },
    },
  });

  return Response.json(newLeague);
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const leagueId = searchParams.get("leagueId");

  const session = await auth();

  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (leagueId) {
    const league = await prisma.league.findUnique({
      where: {
        id: leagueId,
      },
    });

    return Response.json(league);
  }

  const leagues = await prisma.league.findMany({
    where: {
      players: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  return Response.json(leagues);
}
