import {
  createLeague,
  createSubmission,
  getLeague,
  getLeagues,
  getTodaysPlayers,
  joinLeague,
} from "@/services/ApiService";
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";

export const queryClient = new QueryClient();

export const useCreateLeague = () =>
  useMutation({
    mutationFn: createLeague,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getLeagues"] });
    },
  });

export const useJoinLeague = () =>
  useMutation({
    mutationFn: joinLeague,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getLeague"] });
    },
  });

export const useCreateSubmission = () =>
  useMutation({
    mutationFn: createSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["getLeague"] });
    },
  });

export const useGetLeagues = () =>
  useQuery({
    queryKey: ["getLeagues"],
    queryFn: getLeagues,
  });

export const useGetLeague = ({ leagueId }) => {
  return useQuery({
    queryKey: ["getLeague", leagueId],
    queryFn: () => getLeague({ leagueId }),
  });
};

export const useGetTodaysPlayers = ({ date }) => {
  return useQuery({
    queryKey: ["getTodaysPlayers", date.toString()],
    queryFn: () => getTodaysPlayers({ date }),
  });
};
