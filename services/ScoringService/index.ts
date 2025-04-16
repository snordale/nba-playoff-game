import { PlayerGameStats } from "@prisma/client";

// Define Scoring Weights
export const SCORE_WEIGHTS = {
  points: 1,
  rebounds: 1,
  assists: 2,
  steals: 2,
  blocks: 2,
  turnovers: -2,
}

/**
 * Calculates the fantasy score based on player game stats and defined weights.
 * Returns null if stats are null or undefined.
 */
export function calculateScore(stats: PlayerGameStats | null | undefined): number | null {
  if (!stats) {
    return null;
  }

  // Use nullish coalescing (??) to treat null stats as 0 for calculation
  return (stats.points ?? 0) * SCORE_WEIGHTS.points +
         (stats.rebounds ?? 0) * SCORE_WEIGHTS.rebounds +
         (stats.assists ?? 0) * SCORE_WEIGHTS.assists +
         (stats.steals ?? 0) * SCORE_WEIGHTS.steals +
         (stats.blocks ?? 0) * SCORE_WEIGHTS.blocks +
         (stats.turnovers ?? 0) * SCORE_WEIGHTS.turnovers;
};