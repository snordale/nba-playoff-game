import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const dateString = searchParams.get("date"); // Expects YYYY-MM-DD

  if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return NextResponse.json({ error: "Invalid or missing date parameter. Use YYYY-MM-DD format." }, { status: 400 });
  }

  try {
    const games = await prisma.game.findMany({
      where: {
        date: new Date(dateString)
      },
      include: {
        homeTeam: true,
        awayTeam: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    const responseData = games.map(game => ({
      id: game.id,
      date: dateString,
      status: game.status,
      homeTeam: {
        id: game.homeTeam.id,
        name: game.homeTeam.name,
        abbreviation: game.homeTeam.abbreviation
      },
      awayTeam: {
        id: game.awayTeam.id,
        name: game.awayTeam.name,
        abbreviation: game.awayTeam.abbreviation
      },
      homeScore: game.homeScore,
      awayScore: game.awayScore
    }));

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json({ error: "Failed to fetch game data" }, { status: 500 });
  }
} 