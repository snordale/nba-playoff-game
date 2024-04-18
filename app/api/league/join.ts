import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextAuthRequest } from "next-auth/lib";

export async function POST(request: NextAuthRequest) {
  const session = await auth();
  console.log("session");
  console.log(session);

  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return prisma.group.findMany();
}
