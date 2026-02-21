import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";

interface InviteTokenPayload {
  groupId: string;
  iat?: number;
  exp?: number;
}

/**
 * POST /api/groups/[groupId]/join
 * Body: { token: string }
 * Joins the current user to the group using a valid invite token.
 * Used when user logs in via OAuth callback and needs to complete the join.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON. Provide { token: string }." },
      { status: 400 }
    );
  }

  const token = body.token;
  if (!token) {
    return NextResponse.json(
      { error: "token is required in request body" },
      { status: 400 }
    );
  }

  const jwtSecret = process.env.JWT_INVITE_SECRET;
  if (!jwtSecret) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let payload: InviteTokenPayload;
  try {
    payload = jwt.verify(token, jwtSecret) as InviteTokenPayload;
    if (payload.groupId !== groupId) {
      return NextResponse.json({ error: "Token does not match group" }, { status: 400 });
    }
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      return NextResponse.json({ error: "Invite link has expired" }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid invite token" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { id: true },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const existing = await prisma.groupUser.findFirst({
    where: { userId, groupId },
  });

  if (existing) {
    return NextResponse.json({ message: "Already a member" });
  }

  await prisma.groupUser.create({
    data: {
      userId,
      groupId,
      isAdmin: false,
    },
  });

  return NextResponse.json({ message: "Joined successfully" });
}
