/**
 * Series bracket game scoring.
 * Round-based points: winner + correct games bonus. 50% premium for underdog picks.
 */

export const ROUND_SCORING = {
  FIRST_ROUND: { winner: 3, games: 1.5 },
  SEMIFINALS: { winner: 4, games: 2 },
  CONFERENCE_FINALS: { winner: 6, games: 3 },
  FINALS: { winner: 8, games: 4 },
} as const;

export type RoundKey = keyof typeof ROUND_SCORING;

const UNDERDOG_PREMIUM = 1.5;

export interface SeriesForScoring {
  round: string;
  highSeedTeamId: string;
  lowSeedTeamId: string;
  winnerTeamId: string | null;
  winnerWins: number | null;
  loserWins: number | null;
}

export interface PickForScoring {
  winnerTeamId: string;
  gamesCount: number;
}

/**
 * Calculates points for a series pick.
 * Returns null if series is not yet complete or pick is invalid.
 */
export function calculateSeriesScore(
  pick: PickForScoring,
  series: SeriesForScoring
): number | null {
  if (!series.winnerTeamId || series.winnerWins == null || series.loserWins == null) {
    return null;
  }

  const config = ROUND_SCORING[series.round as RoundKey];
  if (!config) return null;

  const correctWinner = pick.winnerTeamId === series.winnerTeamId;
  const correctGames = pick.gamesCount === series.winnerWins + series.loserWins;

  if (!correctWinner) return 0;

  let points = config.winner;
  if (correctGames) {
    points += config.games;
  }

  const pickedUnderdog = pick.winnerTeamId === series.lowSeedTeamId;
  if (pickedUnderdog) {
    points *= UNDERDOG_PREMIUM;
  }

  return Math.round(points * 10) / 10;
}
