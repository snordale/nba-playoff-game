import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  try {
    const requestBody = await req.json();

    if (!requestBody.groupName) {
      return new Response("Missing groupName", { status: 400 });
    }

    // Create the group and the initial GroupUser (admin)
    const newGroup = await prisma.group.create({
      data: {
        name: requestBody.groupName,
        groupUsers: {
          create: {
            isAdmin: true,
            user: {
              connect: {
                id: userId,
              },
            },
          },
        },
      },
      include: {
        groupUsers: true,
      }
    });

    return Response.json(newGroup);

  } catch (error) {
    console.error("Error creating group:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return new Response("Group name already taken", { status: 409 });
      }
    }
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  // All groups for the current user
  const groups = await prisma.group.findMany({
    where: {
      groupUsers: {
        some: {
          userId: userId,
        },
      },
    },
    include: {
      _count: { select: { groupUsers: true } }
    }
  });

  return Response.json(groups);
}
