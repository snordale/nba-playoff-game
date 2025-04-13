import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email) { 
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const requestBody = await req.json();

    if (!requestBody.groupName || !requestBody.password) {
      return new Response("Missing groupName or password", { status: 400 });
    }

    // Create the group and the initial GroupUser (admin)
    const newGroup = await prisma.group.create({
      data: {
        name: requestBody.groupName,
        password: requestBody.password,
        groupUsers: {
          create: {
            isAdmin: true,
            user: {
              connect: {
                email: session.user.email, 
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
  const searchParams = req.nextUrl.searchParams;
  const groupId = searchParams.get("groupId");

  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  // Single Group
  if (groupId) {
    // Fetch the group details
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return new Response("Group not found", { status: 404 });
    }
    
    // Authorization check: Ensure the current user is part of this group
    const userInGroup = await prisma.groupUser.findFirst({
      where: { 
        groupId: groupId,
        userId: userId
      }
    });
    if (!userInGroup) {
        return new Response("Forbidden", { status: 403 });
    }

    // Fetch group users and their submissions for this specific group
    const groupUsers = await prisma.groupUser.findMany({
        where: {
            groupId: groupId,
        },
        include: {
            user: true,
            submissions: { 
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    game: true, 
                    player: true 
                }
            }
        }
    });

    // Calculate scores
    const scoredGroupUsers = groupUsers.map((groupUser) => {
        let totalScore = 0;
        const processedSubmissions = groupUser.submissions.map(sub => {
            const score = sub.calculatedScore ?? 0;
            totalScore += score;
            return {
                ...sub,
                score: score 
            };
        });

        return {
            ...groupUser,
            score: totalScore,
            submissions: processedSubmissions,
        };
    }).sort((a, b) => b.score - a.score);

    return Response.json({ group, players: scoredGroupUsers });
  }

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
