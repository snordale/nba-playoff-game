import { auth } from "@/auth";
import { PLAYOFF_END_DATE, PLAYOFF_START_DATE } from "@/constants";
import { prisma } from "@/prisma/client";
import { calculateScore } from "@/services/ScoringService";
import {
  processSubmission,
  type ProcessedSubmission,
  type ScoredGroupUser,
  type SubmissionView,
} from "@/utils/submission-utils";
import type { PlayerGameStats } from "@prisma/client";
import { format, parseISO, startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { NextResponse } from "next/server";

type Params = Promise<{ groupId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!groupId)
    return NextResponse.json({ error: "Group ID missing" }, { status: 400 });

  const TIMEZONE = 'America/New_York';

  try {
    // --- 1. Fetch Group and Auth Check Concurrently ---
    const [group, userInGroup] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true, name: true },
      }),
      prisma.groupUser.findFirst({
        where: { groupId, userId },
        select: { userId: true },
      }),
    ]);

    if (!group)
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    if (!userInGroup)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // --- 2. Fetch Group Users (Basic Info) ---
    const groupUsers = await prisma.groupUser.findMany({
      where: { groupId },
      select: {
        id: true,
        userId: true,
        isAdmin: true,
        user: { select: { username: true } },
      },
      orderBy: { user: { username: "asc" } },
    });
    const groupUserMap = new Map(groupUsers.map((gu) => [gu.userId, gu]));

    // --- 3. Fetch Submissions + Game + Player ---
    const submissionsWithDetails = await prisma.submission.findMany({
      where: {
        groupUser: { groupId: groupId },
      },
      include: {
        game: {
          select: { id: true, date: true, status: true, startsAt: true },
        },
        player: { select: { id: true, name: true } },
        groupUser: { select: { userId: true } },
      },
      orderBy: { game: { date: "asc" } },
    });

    // --- 3.5 Collect Player/Game IDs and Fetch Stats ---
    const playerGamePairs = submissionsWithDetails
      .filter((sub) => sub.playerId && sub.gameId)
      .map((sub) => ({
        playerId: sub.playerId,
        gameId: sub.gameId,
      }));

    const uniquePlayerGameKeys = new Set(
      playerGamePairs.map((p) => `${p.playerId}_${p.gameId}`)
    );
    const uniquePlayerGamePairs = Array.from(uniquePlayerGameKeys).map(
      (key) => {
        const [playerId, gameId] = key.split("_");
        return { playerId, gameId };
      }
    );

    let statsMap = new Map<string, PlayerGameStats>();
    if (uniquePlayerGamePairs.length > 0) {
      const playerGameStats = await prisma.playerGameStats.findMany({
        where: {
          OR: uniquePlayerGamePairs,
        },
      });

      statsMap = new Map(
        playerGameStats.map((stat) => [`${stat.playerId}_${stat.gameId}`, stat])
      );
    }

    // --- 4. Fetch Game Counts (Optimized) ---
    const playoffStartDateUTC = new Date(`${PLAYOFF_START_DATE}T00:00:00Z`);
    const playoffEndDateUTC = new Date(`${PLAYOFF_END_DATE}T23:59:59Z`);

    const gamesInPlayoffs = await prisma.game.findMany({
        where: {
            date: { gte: playoffStartDateUTC, lte: playoffEndDateUTC },
        },
        select: { id: true, date: true },
        orderBy: { date: "asc" },
    });

    const gameCountsByDate: { [dateKey: string]: number } = {};
    gamesInPlayoffs.forEach((game) => {
        const dateKey = format(game.date, 'yyyy-MM-dd');
        gameCountsByDate[dateKey] = (gameCountsByDate[dateKey] || 0) + 1;
    });

    // --- 5. Process Submissions and Aggregate Data ---
    const userScores = new Map<string, number>();
    const processedSubmissionsByUser = new Map<
      string,
      Map<string, ProcessedSubmission>
    >();
    let previouslySubmittedPlayerIdsForCurrentUser = new Set<string>();
    const submissionsByDateMap = new Map<string, SubmissionView[]>();

    submissionsWithDetails.forEach((sub) => {
      if (
        !sub.groupUser?.userId ||
        !sub.game ||
        !sub.player ||
        !sub.playerId ||
        !sub.gameId
      )
        return;

      const currentSubmissionUserId = sub.groupUser.userId;
      const userDetails = groupUserMap.get(currentSubmissionUserId);
      if (!userDetails) return;

      const dateKey = formatInTimeZone(sub.game.date, TIMEZONE, 'yyyy-MM-dd');

      const statsKey = `${sub.playerId}_${sub.gameId}`;
      const stats = statsMap.get(statsKey) || null;

      const score = stats ? calculateScore(stats) : null;
      const isOwnUser = currentSubmissionUserId === userId;

      const processedSub: ProcessedSubmission | null = processSubmission(
        sub,
        stats,
        score,
        isOwnUser
      );

      if (processedSub) {
        if (!processedSubmissionsByUser.has(currentSubmissionUserId)) {
          processedSubmissionsByUser.set(currentSubmissionUserId, new Map());
        }
        processedSubmissionsByUser
          .get(currentSubmissionUserId)
          ?.set(dateKey, processedSub);

        userScores.set(
          currentSubmissionUserId,
          (userScores.get(currentSubmissionUserId) || 0) +
            (processedSub.score ?? 0)
        );

        if (isOwnUser) {
          previouslySubmittedPlayerIdsForCurrentUser.add(processedSub.playerId);
        }

        const submissionView: SubmissionView = {
          userId: currentSubmissionUserId,
          username: userDetails.user.username,
          playerName: processedSub.playerName,
          score: processedSub.score,
          stats: stats,
          gameStatus: processedSub.gameStatus,
          gameDate: processedSub.gameDate,
          gameStartsAt: processedSub.gameStartsAt,
        };

        if (!submissionsByDateMap.has(dateKey)) {
          submissionsByDateMap.set(dateKey, []);
        }
        submissionsByDateMap.get(dateKey)?.push(submissionView);
      }
    });

    Object.keys(gameCountsByDate).forEach((dateKey) => {
      if (!submissionsByDateMap.has(dateKey)) {
        submissionsByDateMap.set(dateKey, []);
      } else {
        submissionsByDateMap
          .get(dateKey)
          ?.sort((a, b) => a.username.localeCompare(b.username));
      }
    });
    const submissionsByDate = Object.fromEntries(submissionsByDateMap);

    // --- 6. Construct Final Response ---
    const leaderboardUsers: ScoredGroupUser[] = groupUsers
      .map((gu) => ({
        groupUserId: gu.id,
        userId: gu.userId,
        username: gu.user.username,
        isAdmin: gu.isAdmin,
        score: userScores.get(gu.userId) || 0,
        submissions: Array.from(
          processedSubmissionsByUser.get(gu.userId)?.values() || []
        ).sort(
          (a, b) =>
            new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime()
        ),
      }))
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      group,
      leaderboardUsers,
      gameCountsByDate,
      submissionsByDate,
      previouslySubmittedPlayerIdsForCurrentUser: Array.from(
        previouslySubmittedPlayerIdsForCurrentUser
      ),
    });
  } catch (error) {
    console.error(`Error fetching group ${groupId}:`, error);
    if (error instanceof Error) {
      console.error(error.message);
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
