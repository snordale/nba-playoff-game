import { scoreSubmission } from "@/app/utils";
import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const requestBody = await req.json();

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

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Single League
  if (leagueId) {
    const league = await prisma.league.findUnique({
      where: {
        id: leagueId,
      },
    });

    const todaysSubmissions = await prisma.submission.findMany({
      where: {
        player: {
          leagueId: leagueId,
        },
        createdAt: {
          gte: startOfDay,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        player: true,
      },
    });

    const playersWithOldSubmissions = await prisma.player.findMany({
      where: {
        leagueId,
      },
      include: {
        user: true,
        submissions: {
          where: {
            createdAt: {
              lt: startOfDay,
            },
          },
        },
      },
    });

    const scoredPlayers = playersWithOldSubmissions.map((player) => {
      const scoredSubmissions = player.submissions.map((submission) => {
        return {
          ...submission,
          score: scoreSubmission(submission),
        };
      });

      const playerTotalScore = scoredSubmissions.reduce((acc, submission) => {
        return acc + submission.score;
      }, 0);

      return {
        ...player,
        score: playerTotalScore,
        submissions: scoredSubmissions,
      };
    });

    console.log(scoredPlayers);
    console.log(todaysSubmissions);

    return Response.json({ league, todaysSubmissions, players: scoredPlayers });
  }

  // All leagues
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
