import axios from "axios";

const apiService = axios.create({
  baseURL: process.env.API_URL,
});

export const createGroup = async ({ groupName }: { groupName: string }) => {
  return apiService.post("/group", { groupName });
};

export const joinGroup = async ({ groupId }: { groupId: string }) => {
  return apiService.post("/group/join", { groupId });
};

export const createSubmission = async ({ gameId, playerId }: { gameId: string; playerId: string; }) => {
  return apiService.post("/submission", { gameId, playerId });
};

export const getGroups = async () => {
  const res = await apiService.get("/group");
  return res.data;
};

export const getGroup = async ({ groupId }: { groupId: string }) => {
  const res = await apiService.get(`/group/${groupId}`);
  return res.data;
};

export const getTodaysPlayers = async ({ date }) => {
  const res = await apiService.get(`/players?date=${date}`);
  return res.data;
};
