import {
  createLeague,
  getLeague,
  getLeagues,
  joinLeague,
} from "@/services/ApiService";
import { QueryClient, useMutation, useQuery } from "@tanstack/react-query";

export const queryClient = new QueryClient();

export const useCreateLeague = () =>
  useMutation({
    mutationFn: createLeague,
  });

export const useJoinLeague = () =>
  useMutation({
    mutationFn: joinLeague,
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
