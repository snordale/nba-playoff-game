import { prisma } from "@/prisma/client";
import { getBoxScoresByDate } from "../EspnService";

const gameBoxScoreFormat =
  "https://www.espn.com/nba/boxscore/_/gameId/401654659";

export const updateScores = async () => {
  const yesterdaySubmissions = prisma.submission.findMany({
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
  // This will be run the morning after the games have been played, so if it's 9am on monday UTC, it needs to get the games for sunday
  const yesterdaysBoxScores = await getBoxScoresByDate({
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  console.log('yesterdaysBoxScores')
  console.log(yesterdaysBoxScores)
};
