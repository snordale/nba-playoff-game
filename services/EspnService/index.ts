export const getGames = async () => {
  const url =
    "https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=basketball&league=nba&region=us&lang=en&contentorigin=espn&buyWindow=1m&showAirings=buy%2Clive%2Creplay&showZipLookup=true";
  const response = await fetch(url);
  const data = await response.json();
  const events = data.sports[0].leagues[0].events;

  return events;
};

export const getBoxScore = async ({ eventId }) => {
  const url = `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?region=us&lang=en&contentorigin=espn&event=${eventId}`;
  const response = await fetch(url);
  const data = await response.json();
  const boxScore = data.boxscore;
  return boxScore;
};

export const getTodaysBoxScores = async () => {
  const todaysEvents = await getGames();

  const boxScores = await Promise.all(
    todaysEvents.map(async (event) => {
      const boxScore = await getBoxScore({ eventId: event.id });
      return boxScore;
    })
  );

  return boxScores;
};
