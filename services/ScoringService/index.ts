import { prisma } from "@/prisma/client";
import { getBoxScoresByDate } from "../EspnService";

const gameBoxScoreFormat =
  "https://www.espn.com/nba/boxscore/_/gameId/401654659";

export const updateScores = async () => {
  const yesterdaySubmissions = await prisma.submission.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        lt: new Date(Date.now() - 60 * 60 * 1000),
      },
    },
    include: {
      player: true,
    },
  });

  console.log("Logs:");
  // ensure that you get the previous day's scores
  console.log(`Current Time: ${new Date()}`);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 24 * 60 * 60 * 1000 * 2);
  const threeDaysAgo = new Date(Date.now() - 24 * 60 * 60 * 1000 * 3);
  // console.log(yesterday);
  const yesterdaysBoxScores = await getBoxScoresByDate({
    date: yesterday,
  });

  console.log(`Found ${yesterdaysBoxScores.length} box scores yesterday`);

  const yesterdayPlayersWithStats = [];

  yesterdaysBoxScores.forEach((boxScore) => {
    if (!boxScore.players) {
      console.log("No players found in box score");
      return;
    }

    const keys = boxScore.players[0].statistics[0].keys;
    /*
      Keys should be: [
        'minutes', 0
        'fieldGoalsMade-fieldGoalsAttempted', 1
        'threePointFieldGoalsMade-threePointFieldGoalsAttempted', 2
        'freeThrowsMade-freeThrowsAttempted', 3
        'offensiveRebounds', 4
        'defensiveRebounds', 5
        'rebounds', 6
        'assists', 7
        'steals', 8
        'blocks', 9
        'turnovers', 10
        'fouls', 11
        'plusMinus', 12
        'points' 13
      ],
    */
    if (keys[13] !== "points") {
      throw new Error("Points is not the last key");
    }
    if (keys[10] !== "turnovers") {
      throw new Error("Turnovers is not the 4th to last key");
    }
    if (keys[9] !== "blocks") {
      throw new Error("Blocks is not the 5th to last key");
    }
    if (keys[8] !== "steals") {
      throw new Error("Steals is not the 6th to last key");
    }
    if (keys[7] !== "assists") {
      throw new Error("Assists is not the 7th to last key");
    }
    if (keys[6] !== "rebounds") {
      throw new Error("Rebounds is not the 8th to last key");
    }

    const teamName0 = boxScore.players[0].team.displayName;
    const teamName1 = boxScore.players[1].team.displayName;
    const players0 = boxScore.players[0].statistics[0].athletes;
    const players1 = boxScore.players[1].statistics[0].athletes;
    console.log(boxScore.players[0].team.displayName);
    console.log(players0);
    console.log(boxScore.players[1].team.displayName);
    console.log(players1);

    const processPlayer = (player, teamName) => {
      const playerStats = player.stats;
      const playerName = player.athlete.displayName;

      const playerScore = {
        playerName,
        teamName,
        points: playerStats[13],
        assists: playerStats[7],
        rebounds: playerStats[6],
        steals: playerStats[8],
        blocks: playerStats[9],
        turnovers: playerStats[10],
      };

      yesterdayPlayersWithStats.push(playerScore);
    };

    players0.forEach((player) => processPlayer(player, teamName0));
    players1.forEach((player) => processPlayer(player, teamName1));
  });

  console.log("yesterdayPlayersWithStats");
  console.log(yesterdayPlayersWithStats);

  const isPlayerMatch = (player, submission) => {
    const isTeamMatch =
      player.teamName.toLowerCase() === submission.teamName.toLowerCase();

    const isPlayerMatch =
      player.playerName.toLowerCase() === submission.playerName.toLowerCase();

    return isTeamMatch && isPlayerMatch;
  };

  const results = await Promise.allSettled(
    yesterdaySubmissions.map((submission) => {
      const playerWithStats = yesterdayPlayersWithStats.find((player) =>
        isPlayerMatch(player, submission)
      );

      if (!playerWithStats) {
        console.error(
          `Player ${submission.playerName} not found in yesterday's box scores`
        );
        return;
      }
      console.log(
        `Update submission ${submission.id} (${submission.playerName} - User ${submission.player.userId})`
      );
      console.log(playerWithStats);
      return prisma.submission.update({
        where: {
          id: submission.id,
        },
        data: {
          points: parseInt(playerWithStats.points),
          assists: parseInt(playerWithStats.assists),
          rebounds: parseInt(playerWithStats.rebounds),
          steals: parseInt(playerWithStats.steals),
          blocks: parseInt(playerWithStats.blocks),
          turnovers: parseInt(playerWithStats.turnovers),
        },
      });
    })
  );

  console.log("Results");
  console.log(results);

  console.log("Done updating scores ❄️");

  // console.log("two days ago");
  // const twoDaysAgo = await getBoxScoresByDate({
  //   date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 2),
  // });
};
