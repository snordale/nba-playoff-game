export const scoringKey = {
  points: 1,
  assists: 2,
  rebounds: 2,
  steals: 4,
  blocks: 4,
};

export const scoreSubmission = (submission) => {
  let score = 0;
  score += submission.points * scoringKey.points;
  score += submission.assists * scoringKey.assists;
  score += submission.rebounds * scoringKey.rebounds;
  score += submission.steals * scoringKey.steals;
  score += submission.blocks * scoringKey.blocks;
  return score;
};

export const statKeyToIndex = {
  minutes: 0,
  fieldGoalsMade: 1,
  fieldGoalsAttempted: 2,
  threePointFieldGoalsMade: 3,
  threePointFieldGoalsAttempted: 4,
  freeThrowsMade: 5,
  freeThrowsAttempted: 6,
  offensiveRebounds: 7,
  defensiveRebounds: 8,
  rebounds: 9,
  assists: 10,
  steals: 11,
  blocks: 12,
  turnovers: 13,
  fouls: 14,
  plusMinus: 15,
  points: 16,
};
