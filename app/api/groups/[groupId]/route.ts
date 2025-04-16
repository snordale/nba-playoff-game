import { auth } from "@/auth";
import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from '@/constants';
import { prisma } from "@/prisma/client";
import {
    calculateScore,
    createSubmissionsByDate,
    processSubmission,
    type ScoredGroupUser
} from '@/utils/submission-utils';
import type { PlayerGameStats } from "@prisma/client";
import { format, parseISO, startOfDay } from 'date-fns';
import { NextResponse } from "next/server";

type Props = {
    params: Promise<{
      groupId: string
    }>
  }

export async function GET(request: Request, props: Props) {
    const params = await props.params;
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
                user: { select: { id: true, username: true } },
                submissions: {
                    select: {
                        id: true,
                        createdAt: true,
                        gameId: true,
                        playerId: true,
                        game: {
                            select: {
                                id: true,
                                date: true,
                                status: true,
                                startsAt: true,
                            }
                        },
                        player: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
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
        const statsMap = new Map<string, PlayerGameStats>();

        if (statLookupKeys.length > 0) {
            const statsData = await prisma.playerGameStats.findMany({
                where: { OR: statLookupKeys },
            });
            statsData.forEach(stat => {
                const key = `${stat.gameId}_${stat.playerId}`;
                calculatedScoresMap.set(key, calculateScore(stat));
                statsMap.set(key, stat);
            });
        }

        // --- Fetch Games for Game Counts --- 
        const playoffStartDate = startOfDay(parseISO(PLAYOFF_START_DATE));
        const playoffEndDate = startOfDay(parseISO(PLAYOFF_END_DATE));
        const gamesInRange = await prisma.game.findMany({
            where: {
                date: {
                    gte: playoffStartDate,
                    lte: playoffEndDate
                }
            },
            select: { date: true }
        });

        const gameCountsByDate: { [dateKey: string]: number } = {};
        gamesInRange.forEach(game => {
            const dateKey = format(startOfDay(game.date), 'yyyy-MM-dd');
            gameCountsByDate[dateKey] = (gameCountsByDate[dateKey] || 0) + 1;
        });

        const todayStart = startOfDay(new Date());

        // --- Process Users for Final Response --- 
        let previouslySubmittedPlayerIdsForCurrentUser: string[] = []; // Initialize for current user

        const leaderboardUsers: ScoredGroupUser[] = groupUsersWithData.map((groupUser) => {
            const isOwnUser = groupUser.userId === userId;

            const submissions = groupUser.submissions
                .map(sub => {
                    const statsKey = `${sub.gameId}_${sub.playerId}`;
                    const stats = statsMap.get(statsKey);
                    const score = calculatedScoresMap.get(statsKey);
                    const processedSub = processSubmission(sub, stats, score, isOwnUser);

                    // Collect previously submitted player IDs for the current user
                    if (isOwnUser && processedSub && processedSub.playerId) {
                        previouslySubmittedPlayerIdsForCurrentUser.push(processedSub.playerId);
                    }

                    return processedSub;
                })
                .filter((sub): sub is NonNullable<typeof sub> => sub !== null);

            // Calculate total score based on processed submissions
            const totalScore = submissions.reduce((acc, sub) => acc + (sub?.score ?? 0), 0);

            return {
                groupUserId: groupUser.id,
                userId: groupUser.userId,
                username: groupUser.user.username,
                isAdmin: groupUser.isAdmin,
                score: totalScore,
                submissions // These are now SubmissionView[]
            };
        }).sort((a, b) => b.score - a.score);

        // --- Generate Submission Views ---
        const submissionsByDate = createSubmissionsByDate(leaderboardUsers, gameCountsByDate, todayStart);

        // Remove duplicates from the collected IDs
        previouslySubmittedPlayerIdsForCurrentUser = Array.from(new Set(previouslySubmittedPlayerIdsForCurrentUser));

        return NextResponse.json({
            group,
            leaderboardUsers,
            gameCountsByDate,
            submissionsByDate,
            previouslySubmittedPlayerIdsForCurrentUser, // ADDED
        });

    } catch (error) {
        console.error(`Error fetching group ${groupId}:`, error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Remove the POST handler from this file, it was moved to app/api/groups/route.ts

// Remove the logic for handling GET /api/groups (all groups)
// That logic should be in app/api/groups/route.ts
