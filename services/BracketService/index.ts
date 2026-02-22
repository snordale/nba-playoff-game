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

    // Only count a game for this series if it's already linked here or not yet linked.
    // (Once linked to another series, don't count it here — avoids double-counting if
    // the same team pair ever appears in more than one series.)
    if (game.playoffSeriesId != null && game.playoffSeriesId !== s.id) continue;

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
      // Cap to valid best-of-7: at most 7 games, winner has 4, loser has 0–3
      const totalGames = Math.min(highWins + lowWins, 7);
      const winnerWinsCapped = 4;
      const loserWinsCapped = totalGames - 4;
      // Always write win counts (and capped winner/loser so display is valid); set winnerTeamId only once (idempotent)
      await prisma.playoffSeries.update({
        where: { id: s.id },
        data: {
          highSeedWins: highWins,
          lowSeedWins: lowWins,
          winnerWins: winnerWinsCapped,
          loserWins: loserWinsCapped,
          ...(!s.winnerTeamId && { winnerTeamId: winnerId }),
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

/** Bracket slots: 0=1v8, 1=2v7, 2=3v6, 3=4v5. SF: slot 0 vs 3, slot 1 vs 2 (by index). */
const SEMIFINAL_MATCHUP_INDICES: [number, number][] = [
  [0, 3], // 1v8 winner vs 4v5 winner
  [1, 2], // 2v7 winner vs 3v6 winner
];

/**
 * Creates next-round series from completed series. Idempotent: skips creating if already exists.
 * Order: Semifinals (per conference) → Conference Finals (per conference) → Finals.
 * Uses conference-relative slot order: first-round series are sorted by sequence, so East gets
 * sequence 1..4 and West 5..8; we use index 0..3 within each conference for matchup logic.
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

  // --- Semifinals: from FIRST_ROUND winners (per conference), using slot index not global sequence
  for (const conf of ["EAST", "WEST"] as const) {
    const r1 = byRound("FIRST_ROUND")
      .filter((s) => s.conference === conf)
      .sort((a, b) => a.sequence - b.sequence);
    if (r1.length !== 4) continue;
    const slotWinners = r1.map((s) => s.winnerTeamId);
    if (slotWinners.some((w) => !w)) continue;

    const existingSF = byRound("SEMIFINALS").filter((s) => s.conference === conf);
    if (existingSF.length >= 2) continue;

    let seqBase = allSeries.filter((s) => s.round === "SEMIFINALS").length;
    for (const [highIdx, lowIdx] of SEMIFINAL_MATCHUP_INDICES) {
      const highTeamId = slotWinners[highIdx] ?? null;
      const lowTeamId = slotWinners[lowIdx] ?? null;
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

/**
 * Runs syncSeriesOutcomes then advanceBracket in a loop until advance creates no new series.
 * One call completes the full bracket (SF → CF → Finals) and is idempotent on re-run.
 */
export async function syncAndAdvanceUntilComplete(seasonId: string): Promise<{
  outcomesUpdated: number;
  firstGameUpdated: number;
  gamesLinked: number;
  advanceCreated: number;
  advanceRounds: { created: number; round: string }[];
}> {
  const syncResult = await syncSeriesOutcomes(seasonId);
  let totalAdvanceCreated = 0;
  const allAdvanceRounds: { created: number; round: string }[] = [];

  for (;;) {
    const advanceResults = await advanceBracket(seasonId);
    const created = advanceResults.reduce((sum, r) => sum + r.created, 0);
    totalAdvanceCreated += created;
    allAdvanceRounds.push(...advanceResults);
    if (created === 0) break;
    // New series were created; sync again to fill their outcomes before next advance
    await syncSeriesOutcomes(seasonId);
  }

  return {
    ...syncResult,
    advanceCreated: totalAdvanceCreated,
    advanceRounds: allAdvanceRounds,
  };
}
