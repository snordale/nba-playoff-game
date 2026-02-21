import { auth } from "@/auth";
import { prisma } from "@/prisma/client";
import { getCurrentSeason, getSeasonByYear } from "@/services/SeasonService";
import { calculateScore } from "@/services/ScoringService";
import { calculateSeriesScore } from "@/services/SeriesScoringService";
import {
  processSubmission,
  UserView,
  type ProcessedSubmission,
  type ScoredGroupUser,
  type SubmissionView,
} from "@/utils/submission-utils";
import type { PlayerGameStats } from "@prisma/client";
import { format } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { NextResponse } from "next/server";

type Params = Promise<{ groupId: string }>;

export async function GET(request: Request, { params }: { params: Params }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const url = new URL(request.url);
  const seasonParam = url.searchParams.get("season");
  const seasonYear = seasonParam ? parseInt(seasonParam, 10) : null;

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!groupId)
    return NextResponse.json({ error: "Group ID missing" }, { status: 400 });

  const TIMEZONE = "America/New_York";

  try {
    // --- 1. Fetch Group and Auth Check (including user deleted check) ---
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { deletedAt: true },
    });

    // Check if the requesting user is deleted
    if (currentUser?.deletedAt) {
      return NextResponse.json(
        { error: "User deleted, contact support for help" },
        { status: 403 }
      );
    }

    const [group, userInGroup] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: { id: true, name: true },
      }),
      prisma.groupUser.findFirst({
        where: {
          groupId,
          userId,
          user: { deletedAt: null }, // Ensure user in group isn't deleted
        },
        select: { userId: true },
      }),
    ]);

    if (!group)
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    // User might be authenticated but not in *this specific* group, or the user record linked to the group is deleted
    if (!userInGroup)
      return NextResponse.json(
        { error: "Forbidden or user not found in group" },
        { status: 403 }
      );

    const season =
      seasonYear && !isNaN(seasonYear)
        ? await getSeasonByYear(seasonYear)
        : await getCurrentSeason();

    // Pre-playoff: no season configured — return group + empty data so UI can show pre-playoff message
    if (!season) {
      const groupUsers = await prisma.groupUser.findMany({
        where: {
          groupId,
          user: { deletedAt: null },
        },
        select: {
          id: true,
          userId: true,
          isAdmin: true,
          user: { select: { username: true } },
        },
        orderBy: { user: { username: "asc" } },
      });
      const leaderboardUsers = groupUsers.map((gu) => ({
        groupUserId: gu.id,
        userId: gu.userId,
        username: gu.user.username,
        isAdmin: gu.isAdmin,
        score: 0,
        submissions: [],
      }));
      return NextResponse.json({
        group,
        season: null,
        leaderboardUsers,
        gameCountsByDate: {},
        submissionsByDate: {},
        previouslySubmittedPlayerIdsForCurrentUser: [],
        seriesLeaderboard: leaderboardUsers.map((gu) => ({
          groupUserId: gu.groupUserId,
          userId: gu.userId,
          username: gu.username,
          isAdmin: gu.isAdmin,
          score: 0,
        })),
        playoffSeries: [],
        seriesPicks: [],
      });
    }

    // --- 2. Fetch *Non-Deleted* Group Users (Basic Info) ---
    const groupUsers = await prisma.groupUser.findMany({
      where: {
        groupId,
        user: { deletedAt: null }, // Exclude deleted users
      },
      select: {
        id: true,
        userId: true,
        isAdmin: true,
        user: { select: { username: true } }, // Select only non-deleted user info
      },
      orderBy: { user: { username: "asc" } },
    });
    // Filter map to only include non-deleted users fetched above
    const groupUserMap = new Map(groupUsers.map((gu) => [gu.userId, gu]));

    // --- 3. Fetch Submissions + Game + Player (filter by season) ---
    const submissionsWithDetails = await prisma.submission.findMany({
      where: {
        groupUser: {
          groupId: groupId,
          user: { deletedAt: null },
        },
        game: { seasonId: season.id },
      },
      include: {
        game: {
          select: { id: true, date: true, status: true, startsAt: true },
        },
        player: { select: { id: true, name: true } },
        groupUser: { select: { userId: true } }, // We already know this user isn't deleted
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

    // --- 4. Fetch Game Counts (filter by season) ---
    const gamesInPlayoffs = await prisma.game.findMany({
      where: {
        seasonId: season.id,
        date: {
          gte: season.startDate,
          lte: season.endDate,
        },
      },
      select: { id: true, date: true },
      orderBy: { date: "asc" },
    });

    const gameCountsByDate: { [dateKey: string]: number } = {};
    gamesInPlayoffs.forEach((game) => {
      const key = game.date.toISOString().split("T")[0];
      gameCountsByDate[key] = (gameCountsByDate[key] || 0) + 1;
    });

    // --- 5. Process Submissions and Aggregate Data ---
    const userScores = new Map<string, number>();
    const processedSubmissionsByUser = new Map<
      string,
      Map<string, ProcessedSubmission>
    >();
    let previouslySubmittedPlayerIdsForCurrentUser = new Set<string>();
    const submissionsByDateMap = new Map<string, UserView[]>();

    submissionsWithDetails.forEach((sub) => {
      if (
        !sub.groupUser?.userId || // User should exist due to query filter
        !sub.game ||
        !sub.player ||
        !sub.playerId ||
        !sub.gameId
      )
        return;

      const currentSubmissionUserId = sub.groupUser.userId;
      const userDetails = groupUserMap.get(currentSubmissionUserId);
      // Double-check userDetails existence, though it should be guaranteed by the earlier fetch
      if (!userDetails) {
        console.warn(
          `Skipping submission for user ${currentSubmissionUserId} - user details not found in map.`
        );
        return;
      }

      // Use formatInTimeZone consistently
      const dateKey = new Date(sub.game.date).toISOString().split("T")[0];

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
          playerId: processedSub.playerId,
          score: processedSub.score,
          stats: stats,
          gameStatus: processedSub.gameStatus,
          gameDate: processedSub.gameDate,
          gameStartsAt: processedSub.gameStartsAt,
        };

        const userView: UserView = {
          userId: currentSubmissionUserId,
          username: userDetails.user.username,
          submission: submissionView,
        };

        if (!submissionsByDateMap.has(dateKey)) {
          submissionsByDateMap.set(dateKey, []);
        }
        submissionsByDateMap.get(dateKey)?.push(userView);
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

    // Sort submissions by score
    submissionsByDateMap.forEach((users) => {
      users.sort(
        (a, b) => (b.submission?.score ?? 0) - (a.submission?.score ?? 0)
      );
    });

    const submissionsByDate = Object.fromEntries(submissionsByDateMap);

    // --- 6. Construct Final Response ---
    // The groupUsers array used here is already filtered for non-deleted users
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

    // --- 7. Series Bracket Leaderboard ---
    const playoffSeries = await prisma.playoffSeries.findMany({
      where: { seasonId: season.id },
      include: {
        highSeedTeam: true,
        lowSeedTeam: true,
      },
    });

    const seriesPicks = await prisma.seriesPick.findMany({
      where: {
        groupUser: { groupId },
        series: { seasonId: season.id },
      },
      include: {
        series: true,
        groupUser: { select: { userId: true } },
      },
    });

    const seriesScoresByUser = new Map<string, number>();
    seriesPicks.forEach((pick) => {
      const userId = pick.groupUser.userId;
      const series = pick.series;
      const score =
        calculateSeriesScore(
          { winnerTeamId: pick.winnerTeamId, gamesCount: pick.gamesCount },
          {
            round: series.round,
            highSeedTeamId: series.highSeedTeamId,
            lowSeedTeamId: series.lowSeedTeamId,
            winnerTeamId: series.winnerTeamId,
            winnerWins: series.winnerWins,
            loserWins: series.loserWins,
          }
        ) ?? 0;
      seriesScoresByUser.set(
        userId,
        (seriesScoresByUser.get(userId) || 0) + score
      );
    });

    const seriesLeaderboard = groupUsers
      .map((gu) => ({
        groupUserId: gu.id,
        userId: gu.userId,
        username: gu.user.username,
        isAdmin: gu.isAdmin,
        score: seriesScoresByUser.get(gu.userId) || 0,
      }))
      .sort((a, b) => b.score - a.score);

    return NextResponse.json({
      group,
      season: {
        id: season.id,
        year: season.year,
        displayName: season.displayName,
        startDate: season.startDate,
        endDate: season.endDate,
      },
      leaderboardUsers,
      gameCountsByDate,
      submissionsByDate,
      previouslySubmittedPlayerIdsForCurrentUser: Array.from(
        previouslySubmittedPlayerIdsForCurrentUser
      ),
      seriesLeaderboard,
      playoffSeries: playoffSeries.map((s) => ({
        id: s.id,
        round: s.round,
        conference: s.conference,
        sequence: s.sequence,
        highSeedTeam: s.highSeedTeam,
        lowSeedTeam: s.lowSeedTeam,
        highSeedWins: s.highSeedWins,
        lowSeedWins: s.lowSeedWins,
        winnerTeamId: s.winnerTeamId,
        winnerWins: s.winnerWins,
        loserWins: s.loserWins,
        firstGameStartsAt: s.firstGameStartsAt,
      })),
      seriesPicks: seriesPicks.map((p) => ({
        seriesId: p.seriesId,
        groupUserId: p.groupUserId,
        winnerTeamId: p.winnerTeamId,
        gamesCount: p.gamesCount,
      })),
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
