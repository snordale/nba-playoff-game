import { auth } from "@/auth";
import { getPlayersByDate } from "@/services/EspnService";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const date = searchParams.get("date");

  const session = await auth();

  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const players = await getPlayersByDate({ date });

  return Response.json(players);
}
