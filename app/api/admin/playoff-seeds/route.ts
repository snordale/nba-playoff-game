import { getAdminSession } from "@/lib/admin";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { seasonId: string; teamId: string; seed: number; conference: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { seasonId, teamId, seed, conference } = body;
  if (!seasonId || !teamId || !seed || !conference) {
    return NextResponse.json(
      { error: "seasonId, teamId, seed, and conference are required" },
      { status: 400 }
    );
  }

  if (!["EAST", "WEST"].includes(conference)) {
    return NextResponse.json(
      { error: "conference must be EAST or WEST" },
      { status: 400 }
    );
  }

  if (seed < 1 || seed > 8) {
    return NextResponse.json(
      { error: "seed must be 1-8" },
      { status: 400 }
    );
  }

  const playoffSeed = await prisma.playoffSeed.upsert({
    where: {
      seasonId_conference_seed: { seasonId, conference, seed },
    },
    update: { teamId },
    create: { seasonId, teamId, seed, conference },
  });

  return NextResponse.json(playoffSeed);
}
