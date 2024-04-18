import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { getSession } from "next-auth/react";

export async function POST(req: Request) {
  const session = await auth();
  console.log("session");
  console.log(session);
  
  if (!session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return prisma.group.findMany();
}
