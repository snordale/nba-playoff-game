import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { format, parseISO, startOfDay } from 'date-fns'; // Import more date-fns
import { NextRequest, NextResponse } from "next/server"; // Use NextResponse
import { PLAYOFF_START_DATE, PLAYOFF_END_DATE } from '@/constants';
import type { PlayerGameStats } from "@prisma/client"; // Import PlayerGameStats type

// --- Define Scoring Weights ---
const SCORE_WEIGHTS = {
    points: 1,
    rebounds: 1,
    assists: 2,
    steals: 2,
    blocks: 2,
    turnovers: -2,
};
// --- End Scoring Weights ---

// --- Define Score Calculation Function ---
function calculateScore(stats: PlayerGameStats | null | undefined): number | null {
    if (!stats) {
        return null; // Return null if stats are missing
    }
    const score =
        (stats.points ?? 0) * SCORE_WEIGHTS.points +
        (stats.rebounds ?? 0) * SCORE_WEIGHTS.rebounds +
        (stats.assists ?? 0) * SCORE_WEIGHTS.assists +
        (stats.steals ?? 0) * SCORE_WEIGHTS.steals +
        (stats.blocks ?? 0) * SCORE_WEIGHTS.blocks +
        (stats.turnovers ?? 0) * SCORE_WEIGHTS.turnovers;
    return score;
}
// --- End Score Calculation Function ---

// Handler for GET /api/groups/[groupId]
export async function GET(req: NextRequest, { params }: { params: { groupId: string } }) {
    const groupId = params.groupId;
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!groupId) return NextResponse.json({ error: "Group ID missing" }, { status: 400 });

    try {
        // --- Fetch Group and Auth Check Concurrently --- 
        const [group, userInGroup] = await Promise.all([
            prisma.group.findUnique({ where: { id: groupId } }),
            prisma.groupUser.findFirst({ where: { groupId, userId } })
        ]);

        if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
        if (!userInGroup) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        // --- Fetch Submissions and Necessary Related Data --- 
        const groupUsersWithData = await prisma.groupUser.findMany({
            where: { groupId },
            include: {
                user: { select: { id: true, username: true } }, // Only username needed now
                submissions: {
                    select: { // Select only needed fields
                        id: true, createdAt: true, gameId: true, playerId: true,
                        game: { select: { date: true, status: true } }, 
                        player: { select: { name: true } } 
                    },
                    orderBy: { game: { date: 'desc' } } 
                },
            },
        });

        // --- Fetch Required PlayerGameStats and Calculate Scores --- 
        const statLookupKeys = groupUsersWithData.flatMap(gu => 
            gu.submissions.map(sub => ({ gameId: sub.gameId, playerId: sub.playerId }))
        ).filter((value, index, self) => 
            index === self.findIndex((t) => (
                t.gameId === value.gameId && t.playerId === value.playerId
            ))
        );

        const calculatedScoresMap = new Map<string, number | null>();
        if (statLookupKeys.length > 0) {
            const statsData = await prisma.playerGameStats.findMany({
                where: { OR: statLookupKeys },
            });
            statsData.forEach(stat => {
                const key = `${stat.gameId}_${stat.playerId}`;
                calculatedScoresMap.set(key, calculateScore(stat)); // Calculate score here
            });
        }
        // --- End Stats Fetch and Score Calculation --- 

        // --- Fetch Games for Game Counts --- 
        const playoffStartDate = startOfDay(parseISO(PLAYOFF_START_DATE));
        const playoffEndDate = startOfDay(parseISO(PLAYOFF_END_DATE));
        const gamesInRange = await prisma.game.findMany({
             where: { date: { gte: playoffStartDate, lte: playoffEndDate } },
             select: { date: true }
        });
        const gameCountsByDate: { [dateKey: string]: number } = {};
        gamesInRange.forEach(game => {
            const dateKey = format(startOfDay(game.date), 'yyyy-MM-dd');
            gameCountsByDate[dateKey] = (gameCountsByDate[dateKey] || 0) + 1;
        });
        // --- End Game Counts --- 

        const todayUTCStart = startOfDay(new Date());
        const currentUserSubmissionsMap: { [k: string]: { playerName: string; score: number | null; isFuture: boolean } } = {};

        // --- Process Users for Final Response --- 
        const scoredGroupUsers = groupUsersWithData.map((groupUser) => {
            let totalScore = 0;

            groupUser.submissions.forEach((sub) => {
                if (!sub.game?.date || !sub.player?.name) return;

                const gameDateStart = startOfDay(sub.game.date);
                const isFuture = gameDateStart > todayUTCStart;
                let submissionScore: number | null = null;

                if (!isFuture) {
                    submissionScore = calculatedScoresMap.get(`${sub.gameId}_${sub.playerId}`) ?? null;
                    if (submissionScore !== null) {
                        totalScore += submissionScore;
                    }
                }

                // Populate map for the current user's calendar display
                if (groupUser.userId === userId) {
                    const dateKey = format(gameDateStart, 'yyyy-MM-dd');
                    currentUserSubmissionsMap[dateKey] = {
                        playerName: sub.player.name,
                        score: submissionScore, // Correctly null for future
                        isFuture: isFuture
                    };
                }
            });

            return {
                groupUserId: groupUser.id,
                userId: groupUser.userId,
                username: groupUser.user.username,
                isAdmin: groupUser.isAdmin,
                score: totalScore,
                // submissions array removed as it's not needed by current frontend
            };
        }).sort((a, b) => b.score - a.score);

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
