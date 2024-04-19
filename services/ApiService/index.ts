import axios from "axios";

const apiService = axios.create({
  baseURL: process.env.API_URL,
});

export const createLeague = async ({ leagueName, password }) => {
  return apiService.post("/league", { leagueName, password });
};

export const joinLeague = async ({ leagueId, password }) => {
  return apiService.post("/league/join", { leagueId, password });
};

export const createSubmission = async ({
  leagueId,
  playerName,
  playerImage,
  teamName,
}) => {
  return apiService.post("/submission", {
    leagueId,
    playerName,
    playerImage,
    teamName,
  });
};

export const getLeagues = async () => {
  const res = await apiService.get("/league");
  return res.data;
};

export const getLeague = async ({ leagueId }) => {
  const res = await apiService.get(`/league?leagueId=${leagueId}`);
  return res.data;
};

export const getTodaysPlayers = async () => {
  const res = await apiService.get("/players");
  return res.data;
};
