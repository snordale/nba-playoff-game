import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

// TODO: Rename this route to reflect it fetches games and players (e.g., /api/games-for-date)
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
    // Since we're using @db.Date, we can just pass the date string directly
    const gamesForDate = await prisma.game.findMany({
      where: {
        date: dateString
      },
      include: {
        homeTeam: {
          include: {
            players: {
              select: { id: true, name: true, espnId: true },
              orderBy: { name: 'asc' }
            }
          }
        },
        awayTeam: {
          include: {
            players: {
              select: { id: true, name: true, espnId: true },
              orderBy: { name: 'asc' }
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    const responseData = gamesForDate.map(game => ({
      gameId: game.id,
      gameDate: dateString, // Since we queried for this exact date
      status: game.status,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      teams: [
        {
          teamId: game.homeTeam.id,
          name: game.homeTeam.name,
          abbreviation: game.homeTeam.abbreviation,
          isHome: true,
          players: game.homeTeam.players.map(p => ({
            id: p.id,
            name: p.name,
          }))
        },
        {
          teamId: game.awayTeam.id,
          name: game.awayTeam.name,
          abbreviation: game.awayTeam.abbreviation,
          isHome: false,
          players: game.awayTeam.players.map(p => ({
            id: p.id,
            name: p.name,
          }))
        }
      ]
    }));

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error fetching games and players:", error);
    return NextResponse.json({ error: "Failed to fetch game/player data" }, { status: 500 });
  }
};

