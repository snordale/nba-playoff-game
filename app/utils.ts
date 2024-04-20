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

export function isAfter8PacificUsingUTC() {
  // Create a new Date object for the current time in UTC
  const nowUTC = new Date();

  // Convert to UTC hours
  const hourUTC = nowUTC.getUTCHours();

  // Pacific Standard Time (PST) is UTC-8, and Pacific Daylight Time (PDT) is UTC-7.
  // Assuming Daylight Saving Time is not in effect (PST), 8 PM PST is 4 AM UTC the next day.
  // If DST is in effect (PDT), 8 PM PDT is 3 AM UTC the next day.
  // These calculations might need adjustment around the DST transitions.

  // Check if current UTC hour is after 4 AM (not accounting for DST)
  // This is a simplification and may not accurately handle the DST transition.
  const isAfter8PM = hourUTC >= 4; // This is a very rough approximation

  return isAfter8PM;
}
