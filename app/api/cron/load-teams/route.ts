import { loadTeamsAndPlayers } from "@/services/DataLoaderService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  console.log("Loading teams and players from ESPN API...");
  await loadTeamsAndPlayers();
  console.log("Teams and players loaded from ESPN API.");

  return NextResponse.json("Get some");
}
