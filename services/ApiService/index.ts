import axios from "axios";

const apiService = axios.create({
  baseURL: process.env.API_URL,
});

export const createLeague = async ({ leagueName }) => {
  return apiService.post("/league", { leagueName });
};

export const joinLeague = async ({ leagueCode }) => {
  return apiService.post("/league/join", { leagueCode });
};

export const getLeagues = async () => {
  return apiService.get("/league");
};

export const getLeague = async ({ leagueId }) => {
  return apiService.get(`/league/${leagueId}`);
};
