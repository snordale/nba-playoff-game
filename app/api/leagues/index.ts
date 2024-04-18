import { prisma } from "@/prisma/client";

export async function POST(request: Request) {
  const user = request.headers.get("x-user");
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  return prisma.group.findMany();
}
