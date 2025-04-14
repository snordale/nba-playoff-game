import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { format, parseISO, startOfDay } from 'date-fns'; // Import more date-fns
import { NextRequest, NextResponse } from "next/server"; // Use NextResponse
import { PLAYOFF_START_DATE, PLAYOFF_END_DATE } from '@/constants';

// Handler for GET /api/groups/[groupId]
export async function GET(req: NextRequest, { params }: { params: { groupId: string } }) {
    const groupId = params.groupId; // Get groupId from path parameters
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    if (!groupId) {
        return NextResponse.json({ error: "Group ID missing in URL" }, { status: 400 });
    }

    try {
        // Fetch the specific group details
        const group = await prisma.group.findUnique({
            where: { id: groupId },
        });

        if (!group) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        // Authorization check: Ensure the current user is part of this group
        const userInGroup = await prisma.groupUser.findFirst({
            where: {
                groupId: groupId,
                userId: userId,
            },
        });
        if (!userInGroup) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // --- Fetch necessary data concurrently --- 
        const playoffStartDate = startOfDay(parseISO(PLAYOFF_START_DATE));
        const playoffEndDate = startOfDay(parseISO(PLAYOFF_END_DATE));
        console.log(`API: Querying games between ${format(playoffStartDate, 'yyyy-MM-dd')} and ${format(playoffEndDate, 'yyyy-MM-dd')}`); // Log date range

        const [groupUsers, gamesInRange] = await Promise.all([
            // Fetch all group users with ALL submissions + relations needed
            prisma.groupUser.findMany({
                where: { groupId },
                include: {
                    user: { select: { id: true, username: true, email: true } },
                    submissions: {
                        include: {
                            game: { select: { id: true, date: true, status: true } },
                            player: { select: { id: true, name: true } },
                        },
                    },
                },
            }),
            // Fetch games in playoff range
            prisma.game.findMany({
                where: {
                    date: {
                        gte: playoffStartDate,
                        lte: playoffEndDate,
                    },
                },
                select: { date: true }
            })
        ]);
        // --- End concurrent fetching ---

        // --- Log fetched games --- 
        console.log(`API: Found ${gamesInRange.length} games in range.`);
        // --- End Log --- 

        // Calculate Game Counts
        const gameCountsByDate: { [dateKey: string]: number } = {};
        gamesInRange.forEach(game => {
            const dateKey = format(startOfDay(game.date), 'yyyy-MM-dd');
            gameCountsByDate[dateKey] = (gameCountsByDate[dateKey] || 0) + 1;
        });

        // --- Log calculated counts --- 
        console.log(`API: Calculated gameCountsByDate:`, gameCountsByDate);
        // --- End Log ---

        // Determine today's date (start of day UTC) for filtering submissions
        const todayUTCStart = startOfDay(new Date());

        // --- Create Map for CURRENT User's Submissions ---
        const currentUserSubmissionsMap: {
            [dateKey: string]: { playerName: string; score: number | null; isFuture: boolean }
        } = {};
        const currentUserData = groupUsers.find(gu => gu.userId === userId);
        currentUserData?.submissions.forEach(sub => {
            if (!sub.game?.date || !sub.player?.name) return;
            const gameDateStart = startOfDay(sub.game.date);
            const dateKey = format(gameDateStart, 'yyyy-MM-dd');
            const isFuture = gameDateStart > todayUTCStart;
            currentUserSubmissionsMap[dateKey] = {
                playerName: sub.player.name,
                score: !isFuture ? (sub.calculatedScore ?? null) : null,
                isFuture: isFuture
            };
        });
        // --- End Current User Submissions Map ---

        // Calculate scores
        const scoredGroupUsers = groupUsers.map((groupUser) => {
            let totalScore = 0;
            groupUser.submissions.forEach((sub) => {
                const gameDateStart = sub.game?.date ? startOfDay(sub.game.date) : null;
                if (gameDateStart && gameDateStart <= todayUTCStart) {
                    totalScore += sub.calculatedScore ?? 0;
                }
            });

            return {
                groupUserId: groupUser.id,
                userId: groupUser.userId,
                username: groupUser.user.username,
                isAdmin: groupUser.isAdmin,
                score: totalScore,
            };
        }).sort((a, b) => b.score - a.score);

        // Return all data including game counts
        return NextResponse.json({
            group,
            players: scoredGroupUsers,
            currentUserSubmissionsMap,
            gameCountsByDate,
        });

    } catch (error) {
        console.error(`Error fetching group ${groupId}:`, error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Remove the POST handler from this file, it was moved to app/api/groups/route.ts

// Remove the logic for handling GET /api/groups (all groups)
// That logic should be in app/api/groups/route.ts
