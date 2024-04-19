export const scoringKey = {
  points: 1,
  assists: 2,
  rebounds: 2,
  steals: 4,
  blocks: 4,
};

export const scoreSubmission = (submission) => {
  return Object.entries(submission).reduce((totalScore, [key, value]) => {
    const scoreValue = scoringKey[key] || 0;
    return totalScore + scoreValue * value;
  }, 0);
};
