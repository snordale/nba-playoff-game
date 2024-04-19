export const scoringKey = {
  points: 1,
  assists: 2,
  rebounds: 2,
  steals: 4,
  blocks: 4,
};

export const scoreSubmission = (submission) => {
  let totalScore = 0;
  for (const [key, value] of Object.entries(submission)) {
    const scoreValue = scoringKey[key] || 0;
    totalScore += scoreValue * value;
  }
  return totalScore;
};
