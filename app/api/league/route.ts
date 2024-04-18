import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  console.log("post leagues");
  const session = await auth();
  console.log("session");
  console.log(session);

  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const groups = await prisma.group.findMany();
  console.log("groups");
  console.log(groups);

  return Response.json({ groups });
}
