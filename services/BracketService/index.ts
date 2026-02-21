import { prisma } from "@/prisma/client";

/**
 * Matches a game to a series by team pair (order-agnostic).
 */
function gameMatchesSeries(
  game: { homeTeamId: string; awayTeamId: string },
  series: { highSeedTeamId: string; lowSeedTeamId: string }
): boolean {
  const a = game.homeTeamId;
  const b = game.awayTeamId;
  const h = series.highSeedTeamId;
  const l = series.lowSeedTeamId;
  return (a === h && b === l) || (a === l && b === h);
}

/**
 * Sets firstGameStartsAt on each series from the earliest matching game (by startsAt or date).
 */
export async function setSeriesFirstGameStartsAt(seasonId: string): Promise<number> {
  const [seriesList, games] = await Promise.all([
    prisma.playoffSeries.findMany({ where: { seasonId } }),
    prisma.game.findMany({
      where: { seasonId },
      select: { homeTeamId: true, awayTeamId: true, date: true, startsAt: true },
      orderBy: { date: "asc" },
    }),
  ]);

  let updated = 0;
  for (const series of seriesList) {
    const matchingGames = games.filter((g) => gameMatchesSeries(g, series));
    if (matchingGames.length === 0) continue;

    const earliest = matchingGames.reduce((best, g) => {
      const t = g.startsAt ?? new Date(new Date(g.date).setHours(12, 0, 0, 0));
      return !best || t < best ? t : best;
    }, null as Date | null);

    if (earliest) {
      await prisma.playoffSeries.update({
        where: { id: series.id },
        data: { firstGameStartsAt: earliest },
      });
      updated++;
    }
  }
  return updated;
}

/**
 * Syncs series outcomes (winner, wins) from completed games and sets firstGameStartsAt.
 */
export async function syncSeriesOutcomes(seasonId: string): Promise<{ outcomesUpdated: number; firstGameUpdated: number; gamesLinked: number }> {
  const games = await prisma.game.findMany({
    where: {
      seasonId,
      status: "STATUS_FINAL",
      homeScore: { not: null },
      awayScore: { not: null },
    },
    orderBy: { date: "asc" },
  });

  const series = await prisma.playoffSeries.findMany({
    where: { seasonId },
    include: { highSeedTeam: true, lowSeedTeam: true },
  });

  // Count wins per series across all completed games
  const winsBySeries = new Map<string, { [teamId: string]: number }>();
  // Track which games need their playoffSeriesId backfilled
  const gamesToLink: { gameId: string; seriesId: string }[] = [];

  for (const game of games) {
    const s = series.find((s) => gameMatchesSeries(game, s));
    if (!s) continue;

    // Backfill playoffSeriesId if not yet set on this game
    if (!game.playoffSeriesId) {
      gamesToLink.push({ gameId: game.id, seriesId: s.id });
    }

    const key = s.id;
    if (!winsBySeries.has(key)) {
      winsBySeries.set(key, { [s.highSeedTeamId]: 0, [s.lowSeedTeamId]: 0 });
    }
    const wins = winsBySeries.get(key)!;
    const homeScore = game.homeScore ?? 0;
    const awayScore = game.awayScore ?? 0;
    if (homeScore > awayScore) {
      wins[game.homeTeamId] = (wins[game.homeTeamId] ?? 0) + 1;
    } else {
      wins[game.awayTeamId] = (wins[game.awayTeamId] ?? 0) + 1;
    }
  }

  // Backfill game FKs in bulk
  for (const { gameId, seriesId } of gamesToLink) {
    await prisma.game.update({ where: { id: gameId }, data: { playoffSeriesId: seriesId } });
  }

  // Update all series with final win counts and outcomes
  let outcomesUpdated = 0;
  for (const s of series) {
    const wins = winsBySeries.get(s.id);
    if (!wins) continue; // no completed games for this series yet

    const highWins = wins[s.highSeedTeamId] ?? 0;
    const lowWins = wins[s.lowSeedTeamId] ?? 0;

    const [winnerId, winnerW] = Object.entries(wins).find(([, w]) => w >= 4) ?? [];

    if (winnerId && winnerW !== undefined && winnerW >= 4) {
      const loserId = s.highSeedTeamId === winnerId ? s.lowSeedTeamId : s.highSeedTeamId;
      const loserWins = wins[loserId] ?? 0;
      // Always write win counts; only set winnerTeamId once (idempotent)
      await prisma.playoffSeries.update({
        where: { id: s.id },
        data: {
          highSeedWins: highWins,
          lowSeedWins: lowWins,
          ...(!s.winnerTeamId && {
            winnerTeamId: winnerId,
            winnerWins: winnerW,
            loserWins,
          }),
        },
      });
      if (!s.winnerTeamId) outcomesUpdated++;
    } else {
      // Series in progress — keep live counts accurate for "OKC leads 3-1" UI
      await prisma.playoffSeries.update({
        where: { id: s.id },
        data: { highSeedWins: highWins, lowSeedWins: lowWins },
      });
    }
  }

  const firstGameUpdated = await setSeriesFirstGameStartsAt(seasonId);
  return { outcomesUpdated, firstGameUpdated, gamesLinked: gamesToLink.length };
}

/** NBA bracket: R1 sequence 1 = 1v8, 2 = 2v7, 3 = 3v6, 4 = 4v5. SF: (1v8 winner vs 4v5 winner), (2v7 winner vs 3v6 winner). */
const SEMIFINAL_MATCHUPS: [number, number][] = [
  [1, 4], // winner of series 1 vs winner of series 4
  [2, 3],
];

/**
 * Creates next-round series from completed series. Idempotent: skips creating if already exists.
 * Order: Semifinals (per conference) → Conference Finals (per conference) → Finals.
 */
export async function advanceBracket(seasonId: string): Promise<{ created: number; round: string }[]> {
  const results: { created: number; round: string }[] = [];
  const season = await prisma.season.findUnique({ where: { id: seasonId } });
  if (!season) return results;

  const allSeries = await prisma.playoffSeries.findMany({
    where: { seasonId },
    orderBy: [{ round: "asc" }, { sequence: "asc" }],
  });

  const byRound = (round: string) => allSeries.filter((s) => s.round === round);
  const withWinners = (round: string) => byRound(round).filter((s) => s.winnerTeamId);

  // --- Semifinals: from FIRST_ROUND winners (per conference)
  for (const conf of ["EAST", "WEST"] as const) {
    const r1 = byRound("FIRST_ROUND").filter((s) => s.conference === conf);
    if (r1.length !== 4) continue;
    const winners = r1.filter((s) => s.winnerTeamId);
    if (winners.length !== 4) continue;

    const existingSF = byRound("SEMIFINALS").filter((s) => s.conference === conf);
    if (existingSF.length >= 2) continue;

    const getWinner = (seq: number) => r1.find((s) => s.sequence === seq)?.winnerTeamId;
    let seqBase = allSeries.filter((s) => s.round === "SEMIFINALS").length;
    for (const [highSeq, lowSeq] of SEMIFINAL_MATCHUPS) {
      const highTeamId = getWinner(highSeq);
      const lowTeamId = getWinner(lowSeq);
      if (!highTeamId || !lowTeamId) continue;
      const already = await prisma.playoffSeries.findFirst({
        where: {
          seasonId,
          round: "SEMIFINALS",
          conference: conf,
          highSeedTeamId: highTeamId,
          lowSeedTeamId: lowTeamId,
        },
      });
      if (already) continue;
      await prisma.playoffSeries.create({
        data: {
          seasonId,
          round: "SEMIFINALS",
          conference: conf,
          highSeedTeamId: highTeamId,
          lowSeedTeamId: lowTeamId,
          sequence: ++seqBase,
        },
      });
      results.push({ created: 1, round: "SEMIFINALS" });
    }
  }

  // Re-fetch after creating SF
  const allSeries2 = await prisma.playoffSeries.findMany({
    where: { seasonId },
    orderBy: [{ round: "asc" }, { sequence: "asc" }],
  });
  const byRound2 = (round: string) => allSeries2.filter((s) => s.round === round);

  // --- Conference Finals: from SEMIFINALS winners (per conference); order by sequence for consistent high/low
  for (const conf of ["EAST", "WEST"] as const) {
    const sf = byRound2("SEMIFINALS").filter((s) => s.conference === conf).sort((a, b) => a.sequence - b.sequence);
    if (sf.length !== 2) continue;
    const winners = sf.filter((s) => s.winnerTeamId).map((s) => s.winnerTeamId!);
    if (winners.length !== 2) continue;

    const existingCF = byRound2("CONFERENCE_FINALS").filter((s) => s.conference === conf);
    if (existingCF.length >= 1) continue;

    const [highTeamId, lowTeamId] = winners; // first SF winner = higher bracket slot
    const seqCF = allSeries2.filter((s) => s.round === "CONFERENCE_FINALS").length + 1;
    await prisma.playoffSeries.create({
      data: {
        seasonId,
        round: "CONFERENCE_FINALS",
        conference: conf,
        highSeedTeamId: highTeamId,
        lowSeedTeamId: lowTeamId,
        sequence: seqCF,
      },
    });
    results.push({ created: 1, round: "CONFERENCE_FINALS" });
  }

  const allSeries3 = await prisma.playoffSeries.findMany({
    where: { seasonId },
    orderBy: [{ round: "asc" }, { sequence: "asc" }],
  });
  const cfAll = allSeries3.filter((s) => s.round === "CONFERENCE_FINALS");
  const cfWinners = cfAll.filter((s) => s.winnerTeamId).map((s) => s.winnerTeamId!);

  // --- Finals: from both Conference Finals winners
  if (cfWinners.length === 2) {
    const existingFinals = allSeries3.filter((s) => s.round === "FINALS");
    if (existingFinals.length === 0) {
      await prisma.playoffSeries.create({
        data: {
          seasonId,
          round: "FINALS",
          conference: null,
          highSeedTeamId: cfWinners[0],
          lowSeedTeamId: cfWinners[1],
          sequence: 1,
        },
      });
      results.push({ created: 1, round: "FINALS" });
    }
  }

  return results;
}
