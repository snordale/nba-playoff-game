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
        const statsMap = new Map<string, PlayerGameStats | null>();

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
        // --- End Stats Fetch and Score Calculation --- 

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

        const todayUTCStart = startOfDay(new Date());
        const now = new Date();

        // --- Process Users for Final Response --- 
        const scoredGroupUsers = groupUsersWithData.map((groupUser) => {
            // Determine if the user being processed is the requesting user
            const isOwnUser = groupUser.userId === userId; 
            
            const submissions = groupUser.submissions.map(sub => {
                if (!sub.game || !sub.player) return null;

                const gameDate = new Date(sub.game.date);
                const isPickLocked = sub.game.status !== 'STATUS_SCHEDULED' || sub.game.startsAt <= now;
                const canShowDetails = isPickLocked || isOwnUser; // Show if locked OR it's the requester's pick

                // Get score/stats only if needed (locked)
                const rawScore = isPickLocked ? (calculatedScoresMap.get(`${sub.gameId}_${sub.playerId}`) ?? null) : null;
                const rawStats = isPickLocked ? (statsMap.get(`${sub.gameId}_${sub.playerId}`) ?? null) : null;
                
                return {
                    date: format(gameDate, 'yyyy-MM-dd'), 
                    gameId: sub.gameId,
                    playerId: sub.playerId,
                    playerName: canShowDetails ? sub.player.name : null, 
                    score: canShowDetails ? rawScore : null, 
                    stats: canShowDetails ? rawStats : null, 
                    gameStatus: sub.game.status, 
                    gameDate: sub.game.date,
                    gameStartsAt: sub.game.startsAt,
                };
            }).filter(sub => sub !== null); 

            // Recalculate total score based only on locked picks (rawScore is null if not locked)
            const totalScore = submissions.reduce((acc, cur) => {
                // Need to recalculate the rawScore here based on lock status for summation
                 const gameDate = cur?.gameDate ? new Date(cur.gameDate) : null;
                 const isPickLocked = cur?.gameStatus !== 'STATUS_SCHEDULED' || (gameDate && gameDate <= now);
                 const score = isPickLocked ? (calculatedScoresMap.get(`${cur!.gameId}_${cur!.playerId}`) ?? null) : null;
                 return acc + (score ?? 0);
            }, 0);

            return {
                groupUserId: groupUser.id,
                userId: groupUser.userId,
                username: groupUser.user.username,
                isAdmin: groupUser.isAdmin,
                score: totalScore, // Total score based on locked picks
                submissions: submissions as any 
            };
        }).sort((a, b) => b.score - a.score);

        // --- Regenerate submissionsByDate using the filtered scoredGroupUsers data --- 
        const submissionsByDate: { [dateKey: string]: { username: string; playerName: string | null; score: number | null; }[] } = {};
        Object.keys(gameCountsByDate || {}).forEach(dateKey => {
          const dateStart = startOfDay(parseISO(dateKey));
          const isFutureDate = dateStart > todayUTCStart; // Or maybe use !isLocked check?
          submissionsByDate[dateKey] = [];
          
          scoredGroupUsers.forEach(player => {
            // Find the submission *with potentially hidden data* for this player/date
            const submission = player.submissions.find(sub => sub.date === dateKey);
            
            if (isFutureDate) {
              // For future dates, show username but hide pick details (already done by submission mapping)
              submissionsByDate[dateKey].push({
                username: player.username,
                playerName: submission?.playerName || null, // Will be null if hidden
                score: null
              });
            } else if (submission) {
              // For past dates, use the data as is (playerName/score might be null if hidden)
              submissionsByDate[dateKey].push({
                username: player.username,
                playerName: submission.playerName, // Already potentially nulled
                score: submission.score // Already potentially nulled
              });
            } 
          });
        });

        // --- Regenerate currentUserSubmissionsMap using the filtered scoredGroupUsers data --- 
        const currentUserSubmissionsMap: { [k: string]: { playerName: string | null; score: number | null; isFuture: boolean; playerId?: string } } = {}; 
         scoredGroupUsers.find(p => p.userId === userId)?.submissions.forEach(sub => {
             if (!sub) return;
             const gameDate = new Date(sub.gameDate);
             const gameDateStart = startOfDay(gameDate);
             // Determine lock status for *this specific pick* for the map
             const isPickLocked = sub.gameStatus !== 'STATUS_SCHEDULED' || (sub.gameStartsAt && sub.gameStartsAt <= now);
             const dateKey = format(gameDateStart, 'yyyy-MM-dd');
              currentUserSubmissionsMap[dateKey] = {
                  // Use the potentially nulled playerName from the submission object
                  playerName: sub.playerName, 
                  score: sub.score, // Use potentially nulled score
                  // 'isFuture' might be less relevant now, consider using !isPickLocked?
                  isFuture: gameDateStart > todayUTCStart, 
                  playerId: sub.playerId
              };
         });

        return NextResponse.json({
            group,
            players: scoredGroupUsers,
            currentUserSubmissionsMap,
            gameCountsByDate,
            submissionsByDate,
        });

    } catch (error) {
        console.error(`Error fetching group ${groupId}:`, error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// Remove the POST handler from this file, it was moved to app/api/groups/route.ts

// Remove the logic for handling GET /api/groups (all groups)
// That logic should be in app/api/groups/route.ts
