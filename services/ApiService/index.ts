import axios from "axios";

const apiService = axios.create({
  baseURL: process.env.API_URL,
});

export const createGroup = async ({ groupName }: { groupName: string }) => {
  return apiService.post("/groups", { groupName });
};

export const joinGroup = async ({ groupId }: { groupId: string }) => {
  return apiService.post("/groups/join", { groupId });
};

export const createSubmission = async ({ gameId, playerId }: { gameId: string; playerId: string; }) => {
  return apiService.post("/submission", { gameId, playerId });
};

export const getGroups = async () => {
  const res = await apiService.get("/groups");
  return res.data;
};

export const getGroup = async ({ groupId }: { groupId: string }) => {
  const res = await apiService.get(`/groups/${groupId}`);
  return res.data;
};

export const getPlayers = async ({ date }) => {
  const res = await apiService.get(`/players?date=${date}`);
  return res.data;
};

export const getGames = async ({ date }: { date: string }) => {
  const res = await apiService.get(`/games?date=${date}`);
  return res.data;
};

export const getBlogPosts = async () => {
  const res = await apiService.get("/blog/posts");
  return res.data;
};

export const generateInviteLink = async ({ groupId }: { groupId: string }): Promise<{ inviteUrl: string }> => {
  const res = await apiService.post(`/groups/${groupId}/invites`);
  return res.data;
};
