import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const teams = await prisma.team.findMany({
    orderBy: { abbreviation: "asc" },
    select: { id: true, name: true, abbreviation: true },
  });

  return NextResponse.json(teams);
}
