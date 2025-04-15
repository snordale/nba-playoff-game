import { loadGamesForDate } from "@/services/GameLoaderService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  console.log("Loading games for today");
  const targetDate = new Date();
  await loadGamesForDate(targetDate);
  console.log("Games loaded for today");
  return NextResponse.json("Get some");
}
