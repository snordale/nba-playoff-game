import { auth } from "@/auth";
import { getTodaysPlayers } from "@/services/EspnService";

import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const players = await getTodaysPlayers();

  return Response.json(players);
}
