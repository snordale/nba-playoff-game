import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "snordale@gmail.com"; // Ensure this matches your admin email

export async function GET(request: NextRequest) {
    const session = await auth();

    // 1. Check Authentication & Authorization
    if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Check for groupId query parameter
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    try {
        let users;
        if (groupId) {
            // Fetch non-deleted users belonging to the specified group
            const groupUsers = await prisma.groupUser.findMany({
                where: {
                    groupId: groupId,
                    user: { deletedAt: null } // Filter out deleted users
                 },
                include: {
                    user: {
                        select: { id: true, username: true, email: true }
                    }
                },
                orderBy: {
                    user: { username: 'asc' }
                }
            });
            // Filter out potential null users just in case relation is optional or error occurs
            users = groupUsers.map(gu => gu.user).filter(user => user != null);
        } else {
            // Fetch all non-deleted users if no groupId is provided
            users = await prisma.user.findMany({
                where: { deletedAt: null }, // Filter out deleted users
                select: { id: true, username: true, email: true },
                orderBy: {
                    username: 'asc'
                }
            });
        }

        return NextResponse.json(users);

    } catch (error: any) {
        console.error("[ADMIN] Error fetching users:", error);
        return NextResponse.json({ error: `Failed to fetch users: ${error.message}` }, { status: 500 });
    }
} 