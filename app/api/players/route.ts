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
    // Get all games for the date
    const games = await prisma.game.findMany({
      where: {
        date: new Date(dateString)
      },
      include: {
        homeTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                currentTeamId: true
              }
            }
          }
        },
        awayTeam: {
          include: {
            players: {
              select: {
                id: true,
                name: true,
                currentTeamId: true
              }
            }
          }
        }
      }
    });

    // Flatten and transform into a simple list of players with their team info
    const players = games.flatMap(game => {
      const homePlayers = game.homeTeam.players
        .filter(p => p.currentTeamId === game.homeTeam.id)
        .map(p => ({
          id: p.id,
          name: p.name,
          teamName: game.homeTeam.name,
          teamAbbreviation: game.homeTeam.abbreviation,
          gameId: game.id
        }));

      const awayPlayers = game.awayTeam.players
        .filter(p => p.currentTeamId === game.awayTeam.id)
        .map(p => ({
          id: p.id,
          name: p.name,
          teamName: game.awayTeam.name,
          teamAbbreviation: game.awayTeam.abbreviation,
          gameId: game.id
        }));

      return [...homePlayers, ...awayPlayers];
    });

    return NextResponse.json(players);

  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json({ error: "Failed to fetch player data" }, { status: 500 });
  }
};

