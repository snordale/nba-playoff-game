import { loadGamesForDate } from "@/services/GameLoaderService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', {
      status: 401,
    });
  }

  const qpString = request.url.split('?')[1];
  const queryParams = new URLSearchParams(qpString);
  const date = queryParams.get('date');
  const targetDate = date ? new Date(date) : new Date();

  console.log("Loading games for ", targetDate);
  await loadGamesForDate(targetDate);
  console.log("Games loaded for ", targetDate);

  return NextResponse.json("Get some");
}
