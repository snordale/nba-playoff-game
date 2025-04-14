import { PlayerGameStats } from "@prisma/client";

const scoring = {
  points: 1,
  rebounds: 1,
  assists: 2,
  steals: 2,
  blocks: 2,
  turnovers: -2,
}

export async function calculateScore({ points, rebounds, assists, steals, blocks, turnovers }: PlayerGameStats) {
  if (!points) return 0;
  const score = points * scoring.points
    + (rebounds) * scoring.rebounds
    + (assists) * scoring.assists
    + (steals) * scoring.steals
    + (blocks) * scoring.blocks
    + (turnovers) * scoring.turnovers;

  return score;
};