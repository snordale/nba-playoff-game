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

  // --- Calculate UTC date range --- 
  const [year, month, day] = dateString.split('-').map(Number);
  const targetDateUTC = new Date(Date.UTC(year, month - 1, day));
  const nextDayUTC = new Date(targetDateUTC);
  nextDayUTC.setUTCDate(targetDateUTC.getUTCDate() + 1);
  // --- End date range calculation ---

  try {
    const gamesForDate = await prisma.game.findMany({
      where: {
        date: {
          gte: targetDateUTC, 
          lt: nextDayUTC,     
        },
        // Optionally add status filters if needed (e.g., only scheduled/in-progress)
        // status: { notIn: ['FINAL', 'STATUS_FINAL'] }
      },
      include: {
        homeTeam: {
          include: {
            // Include players belonging to the home team
            players: {
              select: { id: true, name: true, espnId: true /* Add other needed player fields */ },
              orderBy: { name: 'asc' } 
            }
          }
        },
        awayTeam: {
          include: {
            // Include players belonging to the away team
            players: {
              select: { id: true, name: true, espnId: true /* Add other needed player fields */ },
              orderBy: { name: 'asc' }
            }
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Structure the response for the frontend
    // Group players by team within each game
    const responseData = gamesForDate.map(game => ({
      gameId: game.id,
      gameDate: game.date,
      status: game.status,
      teams: [
        {
          teamId: game.homeTeam.id,
          name: game.homeTeam.name,
          abbreviation: game.homeTeam.abbreviation,
          isHome: true,
          players: game.homeTeam.players.map(p => ({ 
            id: p.id, // This is the crucial playerId for submissions
            name: p.name,
            // TODO: Add player image URL if available on Player model
            // image: p.imageUrl || null 
          }))
        },
        {
          teamId: game.awayTeam.id,
          name: game.awayTeam.name,
          abbreviation: game.awayTeam.abbreviation,
          isHome: false,
          players: game.awayTeam.players.map(p => ({
            id: p.id, // Player database ID
            name: p.name,
            // image: p.imageUrl || null 
          }))
        }
      ]
    }));

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Error fetching games and players:", error);
    return NextResponse.json({ error: "Failed to fetch game/player data" }, { status: 500 });
  }
}
