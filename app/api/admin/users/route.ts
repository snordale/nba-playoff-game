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
            // Fetch users belonging to the specified group
            const groupUsers = await prisma.groupUser.findMany({
                where: { groupId: groupId },
                include: {
                    user: {
                        select: { id: true, username: true, email: true } // Select desired user fields
                    }
                },
                orderBy: {
                    user: { username: 'asc' }
                }
            });
            users = groupUsers.map(gu => gu.user);
        } else {
            // Fetch all users if no groupId is provided
            users = await prisma.user.findMany({
                select: { id: true, username: true, email: true }, // Select desired user fields
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