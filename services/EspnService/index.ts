import { rosterLinks } from "./rosters";

// Header URL w/ Date
// https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=basketball&league=nba&region=us&lang=en&contentorigin=espn&buyWindow=1m&showAirings=buy%2Clive%2Creplay&showZipLookup=true&tz=America%2FNew_York&dates=20240417

export const getGamesByDate = async ({ date }) => {
  // Format date as YYYYMMDD
  const formattedDate = new Date(date)
    .toISOString()
    .split("T")[0]
    .replace(/-/g, "");

  console.log(`Fetching games for: ${formattedDate}`);
  const espnHeaderDataUrl = `https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=basketball&league=nba&region=us&lang=en&contentorigin=espn&buyWindow=1m&showAirings=buy%2Clive%2Creplay&showZipLookup=true&tz=America%2FNew_York&dates=${formattedDate}`;

  const response = await fetch(espnHeaderDataUrl);

  const data = await response.json();

  const events = data.sports[0].leagues[0].events;

  if (!events) return [];

  return events;
};

export const getEventBoxScore = async ({ eventId }) => {
  const url = `https://site.web.api.espn.com/apis/site/v2/sports/basketball/nba/summary?region=us&lang=en&contentorigin=espn&event=${eventId}`;
  const response = await fetch(url);
  const data = await response.json();
  const boxScore = data.boxscore;
  return boxScore;
};

export const getBoxScoresByDate = async ({ date }) => {
  const todaysEvents = await getGamesByDate({ date });

  console.log(`Found ${todaysEvents.length} events for ${date}:`);

  if (!todaysEvents || todaysEvents.length === 0) return [];

  const boxScores = await Promise.all(
    todaysEvents.map(async (event) => {
      console.log(`${event.name} (${event.id})`);
      const boxScore = await getEventBoxScore({ eventId: event.id });
      return boxScore;
    })
  );

  return boxScores;
};

const jsdom = require("jsdom");
const { JSDOM } = jsdom;

function parsePlayerNamesFromHTML(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const images = document.querySelectorAll("figure.Image img");
  const playerNamesImages = Array.from(images).map((img) => {
    return {
      name: (img as any).title.trim(),
      image: (img as any).alt,
    };
  });
  return playerNamesImages;
}

export const getPlayersByDate = async ({ date }) => {
  try {
    // Get the box scores for today (pacific time)
    const todaysBoxScores = await getBoxScoresByDate({
      date: new Date(date).toISOString().split("T")[0],
    });

    const teamNames = todaysBoxScores.flatMap((boxScore) =>
      boxScore.teams.map((team) => team.team.displayName)
    );

    const filteredRosterLinks = rosterLinks.filter((rosterLink) =>
      teamNames.includes(rosterLink.team)
    );

    const htmlTeamObjects = await Promise.all(
      filteredRosterLinks.map(async (rosterLink) => {
        try {
          const response = await fetch(rosterLink.link);
          if (!response.ok)
            throw new Error(`Failed to fetch ${rosterLink.link}`);
          // this is a html page, so we need to use response.text() instead of response.json()
          const html = await response.text();
          return {
            html,
            team: rosterLink.team,
          };
        } catch (error) {
          console.error(`Error fetching team link: ${rosterLink.link}`, error);
          return null;
        }
      })
    ).then((responses) => responses.filter(Boolean));

    const teamPlayersObjects = htmlTeamObjects.flatMap((htmlTeamObject) => {
      const playerNamesImages = parsePlayerNamesFromHTML(htmlTeamObject.html);
      const filteredPlayerNames = playerNamesImages.filter(
        (player) => player.name !== ""
      );
      return {
        players: filteredPlayerNames,
        team: htmlTeamObject.team,
      };
    });

    return teamPlayersObjects;
  } catch (error) {
    console.error("Error fetching today's players", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
