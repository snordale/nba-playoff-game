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
