import { NextRequest, NextResponse } from "next/server";
import jwt from 'jsonwebtoken';
import { prisma } from "../../../../../prisma/client";
import { auth } from "../../../../../auth";

export async function POST(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await auth();
  const userId = session?.user?.id;
  const groupId = params.groupId;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!groupId) {
    return NextResponse.json({ error: "Group ID missing" }, { status: 400 });
  }

  const jwtSecret = process.env.JWT_INVITE_SECRET;
  if (!jwtSecret) {
    console.error("JWT_INVITE_SECRET is not set in environment variables.");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    // Verify user is part of the group (optional: check if admin)
    const membership = await prisma.groupUser.findFirst({
      where: {
        userId: userId,
        groupId: groupId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: You are not a member of this group." }, { status: 403 });
    }

    // Generate JWT token
    const expiresIn = '24h'; // Token expiration time
    const tokenPayload = { groupId };
    const token = jwt.sign(tokenPayload, jwtSecret, { expiresIn });

    // Construct the invite URL
    // Use NEXTAUTH_URL or a specific APP_URL if defined, otherwise fallback
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const inviteUrl = `${baseUrl}/invite?token=${token}`;

    return NextResponse.json({ inviteUrl });

  } catch (error) {
    console.error("Error generating invite token:", error);
    return NextResponse.json({ error: "Failed to generate invite link" }, { status: 500 });
  }
}